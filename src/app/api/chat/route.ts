import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  wrapLanguageModel,
  extractReasoningMiddleware,
} from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listServices } from "@/lib/tools/services";
import { createRoomTools } from "@/lib/tools/rooms";
import { createAcademicTools } from "@/lib/tools/academic";

const provider = createOpenAICompatible({
  name: "ai-provider",
  baseURL: process.env.AI_PROVIDER_BASE_URL ?? "http://127.0.0.1:11434/v1",
});

const baseModel = provider(process.env.AI_MODEL_NAME ?? "qwen3.5:9b");

// Wrap the model to extract <think> tags as reasoning parts
const model = wrapLanguageModel({
  model: baseModel,
  middleware: extractReasoningMiddleware({
    tagName: "think",
  }),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rut = session.user.rut;
  if (!rut) {
    return new Response("User has no RUT", { status: 400 });
  }

  const { messages } = await request.json();

  const roomTools = createRoomTools(rut);
  const academicTools = createAcademicTools(rut);

  const result = streamText({
    model,
    system: `Eres un asistente inteligente del DCC (Departamento de Ciencias de la Computación) de la Universidad de Chile.
Ayudas a los usuarios con:
- Información sobre servicios disponibles en el DCC
- Reserva de salas (consultar disponibilidad y crear reservas)
- Gestión académica (listar estudiantes, registrar reuniones) vía Academic Track

El usuario autenticado tiene RUT ${rut}. Hoy es ${new Date().toISOString().split("T")[0]}.

Reglas:
- Usa las herramientas cuando sea apropiado para obtener datos reales.
- Responde en el mismo idioma que usa el usuario.
- Sé conciso y útil.
- Si un nombre de estudiante es ambiguo, muestra las opciones y pide al usuario que elija.
- Para reservas, confirma los detalles antes de crear la reserva.
- SIEMPRE responde con texto visible al usuario después de usar herramientas. Nunca termines sin dar una respuesta.`,
    tools: {
      listServices,
      ...roomTools,
      ...academicTools,
    },
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    onStepFinish({ stepNumber, text, reasoning, toolCalls, toolResults, finishReason }) {
      console.log(`[step ${stepNumber}] finish=${finishReason}`);
      for (const tc of toolCalls) {
        console.log(`  → tool-call: ${tc.toolName}(${JSON.stringify(tc.input).slice(0, 200)})`);
      }
      for (const tr of toolResults) {
        console.log(`  ← tool-result: ${tr.toolName} = ${JSON.stringify(tr.output).slice(0, 300)}`);
      }
      if (reasoning) console.log(`  reasoning (${reasoning.length} chars): ${reasoning.slice(0, 200)}`);
      console.log(`  text (${text.length} chars): ${text.slice(0, 300)}`);
    },
  });

  return result.toUIMessageStreamResponse();
}
