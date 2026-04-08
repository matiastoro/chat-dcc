# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Chat DCC — AI chatbot for the DCC (Departamento de Ciencias de la Computación, Universidad de Chile). Professors authenticate via university SSO (VTI) and interact with a streaming chatbot that can check room availability, manage reservations, list students, register meetings, and query DCC services.

## Commands

```bash
npm run dev              # Start dev server on port 3005
npm run build            # Production build (SKIP_TYPE_CHECK=true to skip types)
npm run prisma:generate  # Regenerate Prisma client after schema changes
npm run prisma:push      # Sync schema to database (no migrations, dev only)
npm run prisma:studio    # Open Prisma Studio GUI
npm test                 # Jest unit tests
npm run test:e2e         # Playwright E2E tests
```

After cloning: `npm install && npx prisma generate && npx prisma db push`

## Architecture

### Stack
Next.js 16 (App Router) · React 19 · TypeScript · MUI 7 · PostgreSQL + Prisma 7 (pg adapter) · NextAuth 4 (JWT) · Vercel AI SDK 6

### Auth — two methods
1. **VTI SSO**: Button redirects to university portal → callback at `/api/plogin?jwt=` verifies JWT (jose, HS256), upserts user by RUT, sets NextAuth session cookie, redirects to `/dashboard`
2. **Local credentials**: email/password with bcryptjs via NextAuth credentials provider

The RUT (without dígito verificador) is the core user identifier across all tool calls.

### Chat flow
```
Frontend (useChat + DefaultChatTransport)
  → POST /api/chat
    → getServerSession → extract RUT
    → streamText (OpenAI-compatible provider, e.g. Ollama)
      → model wrapped with extractReasoningMiddleware (handles <think> tags from qwen)
      → tools: rooms, academic, services
      → stopWhen: stepCountIs(5)
    → toUIMessageStreamResponse()
  → Frontend renders text parts + reasoning parts (collapsible accordion)
```

### Tools (src/lib/tools/)
Each tool factory receives the user's RUT and returns tool definitions with Zod inputSchemas.

- **rooms.ts** — SAR Bot API (`/api/bot/`). Bearer token auth (`SAR_API_KEY`). Tools: `listRooms`, `checkRoomAvailability`, `listMyReservations`, `createReservation`, `deleteReservation`
- **academic.ts** — A-Track API (`/api/professors/{rut}/`). Tools: `listStudents`, `registerMeeting`
- **services.ts** — DCC services endpoint. Tool: `listServices`

### Key files
- `src/app/api/chat/route.ts` — Chat endpoint: auth, model config, tools, streaming
- `src/app/api/plogin/route.ts` — VTI SSO callback: JWT verification, user upsert, session creation
- `src/lib/auth.ts` — NextAuth config with credentials provider and JWT callbacks (rut, roles in token)
- `src/lib/prisma.ts` — Prisma singleton with PrismaPg adapter and connection pooling
- `src/app/dashboard/components/ChatInterface.tsx` — Chat UI: useChat, markdown rendering, reasoning accordion, stick-to-bottom scroll
- `prisma.config.ts` — Prisma 7 config (imports `dotenv/config` for env loading)
- `BOT_API.md` — SAR Bot API documentation (endpoints, auth model, payloads)

### Prisma
- Uses `prisma db push` (no migrations) for development
- `prisma.config.ts` must `import "dotenv/config"` before accessing env vars
- After schema changes: `npx prisma generate` to regenerate client
- Models: User (with rut, roles), Profile, Account, Session

### Environment variables
See `.env.example`. Key ones: `DATABASE_URL`, `NEXTAUTH_SECRET`, `VTI_JWT_SECRET`, `AI_PROVIDER_BASE_URL`, `AI_MODEL_NAME`, `ATRACK_URL`, `ROOMS_API_URL`, `SAR_API_KEY`

## Conventions

- All pages are `"use client"` and use DashboardLayout
- i18n: custom I18nProvider with JSON translations (src/lib/i18n/), not next-intl
- API routes verify session with `getServerSession(authOptions)`
- AI SDK v6: `useChat` from `@ai-sdk/react`, `streamText`/`convertToModelMessages` from `ai`, tools use `inputSchema` (not `parameters`)
- Dev server runs on port 3005 to avoid conflicts
- Theme uses UChile blue (#003D7C) as primary color
