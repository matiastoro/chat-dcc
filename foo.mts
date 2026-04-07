import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, tool, stepCountIs, type ModelMessage } from 'ai';
import { z } from 'zod';

const DEBUG = process.env.DEBUG === '1';

// --- Config ---
const PROFESSOR_ID = process.env.PROFESSOR_ID ?? 'cmkfh6um60000uoijgoh4sk27';
const ATRACK_BASE = process.env.ATRACK_URL ?? 'http://127.0.0.1:3000';

// --- Provider setup ---
const ollama = createOpenAICompatible({
  name: 'ollama',
  baseURL: 'http://172.17.69.228:11434/v1',
});
const model = ollama('qwen3.5:9b');

// --- Tools ---
// Tools are functions the model can call. Define as many as you want.
// Each needs: description, inputSchema (zod), and execute (your code).

// --- Helper ---
async function atrackFetch(path: string, options?: RequestInit) {
  const url = `${ATRACK_BASE}/api/professors/${PROFESSOR_ID}${path}`;
  if (DEBUG) console.log(`  [fetch] ${options?.method ?? 'GET'} ${url}`);
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const data = await res.json();
  if (!res.ok) return { error: true, status: res.status, ...data };
  return data;
}

// --- Tools ---
const tools = {
  listStudents: tool({
    description: 'List all students of the professor, including their last meeting date and pending deadlines',
    inputSchema: z.object({}),
    execute: async () => atrackFetch('/students'),
  }),

  registerMeeting: tool({
    description: 'Register a meeting with a student. Use the student name (or partial name). If ambiguous, returns candidates to ask the user.',
    inputSchema: z.object({
      studentName: z.string().describe('Name (or partial name) of the student'),
      notes: z.string().optional().describe('Optional notes about the meeting'),
    }),
    execute: async ({ studentName, notes }) => {
      return atrackFetch('/students/meetings', {
        method: 'POST',
        body: JSON.stringify({ studentName, notes }),
      });
    },
  }),

  calculate: tool({
    description: 'Evaluate a math expression',
    inputSchema: z.object({
      expression: z.string().describe('A math expression like "2 + 2" or "Math.sqrt(9)"'),
    }),
    execute: async ({ expression }) => {
      const result = new Function(`return (${expression})`)() as number;
      return { expression, result };
    },
  }),
};

// --- Conversation loop ---
const messages: ModelMessage[] = [];

const rl = createInterface({ input: process.stdin, output: process.stdout });

console.log('Chat with the agent (type "exit" to quit)\n');

while (true) {
  const input = await rl.question('You: ');
  if (input.trim().toLowerCase() === 'exit') break;

  messages.push({ role: 'user', content: input });

  const { text, steps, response } = await generateText({
    model,
    system: `You are an academic assistant for a professor using Academic Track (a-track.dcc.uchile.cl). You help manage students, meetings, and deadlines. Use tools when appropriate. Today is ${new Date().toISOString()}. When the user mentions meeting a student, register it. When asked about students or deadlines, list them. If a student name is ambiguous, ask the user to clarify. Respond in the same language the user writes in.`,
    tools,
    messages,
    // Keep looping until the model produces a text response (up to 5 steps)
    stopWhen: stepCountIs(5),
    onStepFinish({ stepNumber, text, toolCalls, toolResults, finishReason, usage }) {
      if (!DEBUG) return;
      console.log(`\n  [step ${stepNumber}] finish=${finishReason} tokens=${JSON.stringify(usage)}`);
      if (toolCalls.length > 0) {
        for (const tc of toolCalls) {
          console.log(`    → tool-call: ${tc.toolName}(${JSON.stringify(tc.input)})`);
        }
      }
      if (toolResults.length > 0) {
        for (const tr of toolResults) {
          console.log(`    ← tool-result: ${tr.toolName} =`, JSON.stringify(tr.output));
        }
      }
      if (text) {
        console.log(`    text: ${text.slice(0, 120)}${text.length > 120 ? '...' : ''}`);
      }
    },
  });

  if (DEBUG) {
    console.log(`  [done] ${steps.length} step(s), finishReason=${steps.at(-1)?.finishReason}`);
  }

  // Append the full response messages (including any tool-call / tool-result pairs)
  messages.push(...response.messages);

  // If the model used tools but never produced final text, show the tool results
  if (text) {
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
    const cleanText = text.replace(/<think>[\s\S]*?<\/think>\s*/, '').trim();
    if (thinkMatch) {
      console.log(`\n💭 Thinking: ${thinkMatch[1].trim()}`);
    }
    console.log(`\nAssistant: ${cleanText}\n`);
  } else {
    for (const step of steps) {
      for (const result of step.toolResults) {
        console.log(`\n[${result.toolName}] →`, JSON.stringify(result.output));
      }
    }
    console.log();
  }
}

rl.close();
