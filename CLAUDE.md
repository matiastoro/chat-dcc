# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Scratch/experimental repo with two standalone AI API scripts — no build system, no tests, no shared code between them.

## Scripts

- **foo.py** — Google Gemini API call using the `google-genai` Python SDK. Reads `GEMINI_API_KEY` from environment.
- **foo.mts** — OpenCode-compatible API call using Vercel AI SDK (`ai` + `@ai-sdk/openai-compatible`). Reads `OPENCODE_API_KEY` from environment.

## Running

```bash
# Python script (requires google-genai installed, GEMINI_API_KEY set)
python foo.py

# TypeScript script (requires node_modules installed, OPENCODE_API_KEY set)
npx tsx foo.mts
```

## Dependencies

- Python: `google-genai` (install via `pip install google-genai`)
- Node: managed via `package.json` — install with `npm install`

## Notes

- API keys are loaded from environment variables (`.env` file exists but should not be committed).
