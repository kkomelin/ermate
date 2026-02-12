# AI-Powered Schema Management via Chat

## Overview

Add a prompt field to ERMate that lets users design and modify database schemas through natural language. The AI interprets user requests and translates them into schema operations (create table, add column, etc.) that are applied to the canvas in real time. Each prompt is stateless - the current schema and selected element provide all the context the AI needs.

## Architecture

```
+---------------------------+       +----------------------------+
|  Vite Frontend (React)    |       |  /api (Hono on Vercel)     |
|                           |       |                            |
|  Zustand Store            |  HTTP |  Vercel AI SDK             |
|  React Flow Canvas    <---+-------+  Vercel AI Gateway         |
|  AI Elements PromptInput  |stream |  (Gemini 2.5 Flash)        |
|  Clerk Auth (provider)    |       |  Clerk Auth (middleware)   |
+---------------------------+       +----------------------------+
        Same Vercel project, single deployment
```

**Key design decisions:**

1. **Server returns actions, not state.** The AI does not mutate the schema server-side. It returns tool call results (action descriptors) via the stream, and the frontend applies them to the Zustand store. This preserves client-side ownership of state, keeps undo/redo working, and avoids sending the full schema back over the wire.

2. **Stateless prompts, no chat history.** Each request sends only a system prompt (with current schema + selected element) and the user's single message. No conversation history is stored or sent. The schema itself is the context - after each operation the AI sees the updated state via the system prompt. This means fewer tokens per request (cheaper, faster), no message state to manage, and a simpler UI (just a prompt field, no chat thread).

## Tech Choices

| Concern         | Choice                | Rationale                                                                                     |
| --------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| API framework   | Hono                  | Lightweight, Web Standards, zero-config on Vercel, built-in streaming support                 |
| Auth            | Clerk                 | Drop-in React SDK, Hono middleware available, handles sessions/JWT without managing a DB       |
| AI model        | `gemini-2.5-flash`    | Available on Vercel AI Gateway. Thinking model with strong tool-calling, fast, cost-effective  |
| AI SDK          | Vercel AI SDK (`ai`)  | First-class `streamText` + tools, UI message streaming protocol                               |
| AI gateway      | Vercel AI Gateway     | Unified model access, built-in observability, no separate API key management for Google        |
| Chat UI         | Vercel AI Elements    | shadcn registry (source code, not npm dep). Only need `PromptInput` component                 |

### Model selection notes

Both `gemini-2.5-flash` and `gemini-2-flash` are available on Vercel AI Gateway. Recommendation: **`gemini-2.5-flash`** because it is a thinking model that reasons through multi-step schema operations more reliably (e.g. "create a users table with email, then a posts table with a foreign key to users"). `gemini-3-flash` is also available and newer, but gemini-2.5-flash is the safer, well-established option for structured tool calling.

### Vercel AI Elements assessment

AI Elements is a **shadcn/ui registry**, not an npm package. Components install as source code into `@/components/ai-elements/` via `pnpm dlx ai-elements@latest`. This means:

- No runtime dependency or bundle bloat
- Full customization (they're just React + Tailwind files in your repo)
- Compatible with our existing shadcn/ui setup (New York style, CSS variables)

We only need the `PromptInput` component (auto-resizing textarea with submit handling). The `Conversation` and `Message` components are not needed since we don't display chat history.

## Project Structure Changes

```
ermate/
  api/
    index.ts              # Hono app entry (Vercel Functions catch-all)
    middleware/
      auth.ts             # Clerk auth middleware for Hono
    routes/
      chat.ts             # POST /api/chat - streaming prompt endpoint
    tools/
      tables.ts           # AI tools: createTable, renameTable, deleteTable
      columns.ts          # AI tools: addColumn, updateColumn, deleteColumn
      relationships.ts    # AI tools: addRelationship, deleteRelationship, etc.
      schema.ts           # AI tools: getSchema, validateSchema
      history.ts          # AI tools: undo, redo
      index.ts            # Tool registry (combines all tools)
    lib/
      system-prompt.ts    # System prompt builder (schema + selection context)
  src/
    components/
      ai-elements/        # Installed by AI Elements CLI (source code)
        prompt-input.tsx   # Only component needed
      chat/
        PromptBar.tsx      # Floating prompt bar (positioned over canvas)
    services/
      schema.ts            # Existing schema service (unchanged)
      dal.ts               # Existing DAL service (unchanged)
      export-import.ts     # Existing export/import service (unchanged)
      sharing.ts           # Existing sharing service (unchanged)
      ai.ts                # NEW: AI service - applyAction, action types, prompt submission
    hooks/
      useSchemaStore.ts    # Existing (unchanged)
      useSchemaPrompt.ts   # Hook wiring prompt submission to ai service + schema store
  vercel.json              # Rewrites: /api/* -> Hono, /* -> Vite SPA
```

## Deployment Configuration

### vercel.json

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/index.ts" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

The first rule sends all `/api/*` requests to the Hono serverless function. The second rule handles SPA client-side routing by falling back to `index.html`.

### Hono entry point (`api/index.ts`)

```typescript
import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { chatRoute } from './routes/chat'
import { authMiddleware } from './middleware/auth'

const app = new Hono().basePath('/api')

app.use('*', authMiddleware())
app.route('/chat', chatRoute)

export const GET = handle(app)
export const POST = handle(app)
```

## AI Tools Definition

Each tool maps to an existing schema service function or Zundo temporal action. The tools return action descriptors that the client applies to the Zustand store.

### Table tools

| Tool                     | Parameters                                           | Description                                        |
| ------------------------ | ---------------------------------------------------- | -------------------------------------------------- |
| `createTable`            | `name: string`                                       | Create a table with default columns (id, timestamps)|
| `createTableWithColumns` | `name: string, columns: {name, type, constraints}[]` | Create a table with specified columns               |
| `renameTable`            | `tableId: string, newName: string`                   | Rename an existing table                            |
| `deleteTable`            | `tableId: string`                                    | Delete a table and all its relationships            |

### Column tools

| Tool             | Parameters                                                   | Description                          |
| ---------------- | ------------------------------------------------------------ | ------------------------------------ |
| `addColumn`      | `tableId: string, name: string, type: ColumnType, constraints: ColumnConstraint[]` | Add a column to a table  |
| `updateColumn`   | `tableId: string, columnId: string, updates: {name?, type?, constraints?}` | Modify a column          |
| `deleteColumn`   | `tableId: string, columnId: string`                          | Remove a column and its relationships|

### Relationship tools

| Tool                    | Parameters                                                                     | Description                           |
| ----------------------- | ------------------------------------------------------------------------------ | ------------------------------------- |
| `addRelationship`       | `sourceTableId, sourceColumnId, targetTableId, targetColumnId, type`           | Create a relationship between tables  |
| `updateRelationship`    | `relationshipId: string, updates: {type?, source?, target?}`                   | Modify a relationship                 |
| `deleteRelationship`    | `relationshipId: string`                                                       | Remove a relationship                 |
| `generateJunctionTable` | `sourceTableId: string, targetTableId: string`                                 | Create a junction table for N:M       |

### History tools (undo/redo)

The schema store uses Zundo for temporal state tracking. The AI can navigate this history.

| Tool   | Parameters                                                      | Description                                             |
| ------ | --------------------------------------------------------------- | ------------------------------------------------------- |
| `undo` | `steps: number` (optional, default 1)                           | Undo the last N schema operations                       |
| `redo` | `steps: number` (optional, default 1)                           | Redo the last N undone operations                       |

These map directly to the Zundo temporal store's `undo(steps)` and `redo(steps)` methods already exposed via `useSchemaStore.temporal`. This allows prompts like:

- "Undo that last change"
- "Go back 3 steps"
- "Redo what you just undid"
- "That table was wrong, undo it and make a different one"

### Schema tools (read-only, for AI context)

| Tool              | Parameters | Description                                    |
| ----------------- | ---------- | ---------------------------------------------- |
| `getSchema`       | none       | Returns the current schema (tables, columns, relationships) for AI to reason about |
| `validateSchema`  | none       | Runs validation and returns errors/warnings    |

### Tool implementation pattern

```typescript
// api/tools/tables.ts
import { tool } from 'ai'
import { z } from 'zod'

export const createTable = tool({
  description: 'Create a new database table with default columns (id, created_at, updated_at)',
  inputSchema: z.object({
    name: z.string().describe('Table name in snake_case'),
  }),
  execute: async ({ name }) => {
    return {
      action: 'createTable',
      params: { name },
      message: `Created table "${name}"`,
    }
  },
})

// api/tools/history.ts
import { tool } from 'ai'
import { z } from 'zod'

export const undo = tool({
  description: 'Undo the last schema operation(s). Use when the user wants to revert recent changes.',
  inputSchema: z.object({
    steps: z.number().int().min(1).max(50).default(1)
      .describe('Number of steps to undo (default: 1)'),
  }),
  execute: async ({ steps }) => {
    return {
      action: 'undo',
      params: { steps },
      message: `Undid ${steps} operation${steps > 1 ? 's' : ''}`,
    }
  },
})

export const redo = tool({
  description: 'Redo previously undone schema operation(s). Use when the user wants to restore reverted changes.',
  inputSchema: z.object({
    steps: z.number().int().min(1).max(50).default(1)
      .describe('Number of steps to redo (default: 1)'),
  }),
  execute: async ({ steps }) => {
    return {
      action: 'redo',
      params: { steps },
      message: `Redid ${steps} operation${steps > 1 ? 's' : ''}`,
    }
  },
})
```

## API Endpoint (`api/routes/chat.ts`)

Each request is stateless: system prompt + single user message. No conversation history.

```typescript
import { Hono } from 'hono'
import { generateText } from 'ai'
import { tools } from '../tools'
import { buildSystemPrompt } from '../lib/system-prompt'
import type { Schema } from '../../src/types/schema'

const chat = new Hono()

chat.post('/', async (c) => {
  const { prompt, schema, selectedTableId, selectedRelationshipId } =
    await c.req.json<{
      prompt: string
      schema: Schema
      selectedTableId: string | null
      selectedRelationshipId: string | null
    }>()

  const result = await generateText({
    model: 'google/gemini-2.5-flash',
    system: buildSystemPrompt(schema, selectedTableId, selectedRelationshipId),
    prompt,              // single user message, no history
    tools,
    maxSteps: 10,
  })

  return c.json({
    actions: result.toolResults,   // array of action descriptors
    text: result.text,             // optional AI commentary
  })
})

export { chat as chatRoute }
```

### System prompt structure

```typescript
// api/lib/system-prompt.ts

export function buildSystemPrompt(
  schema: Schema,
  selectedTableId: string | null,
  selectedRelationshipId: string | null
): string {
  return `You are a database schema design assistant for ERMate.
You modify schemas by calling the provided tools. Do not describe what you would do - just call the tools.

## Current Schema
${serializeSchema(schema)}

## Currently Selected
${selectedTableId ? `Table: ${findTable(schema, selectedTableId)}` : 'None'}
${selectedRelationshipId ? `Relationship: ${findRelationship(schema, selectedRelationshipId)}` : ''}

## Column Types
VARCHAR, INTEGER, BOOLEAN, TEXT, TIMESTAMP

## Constraints
PRIMARY KEY, FOREIGN KEY, NOT NULL, UNIQUE

## Rules
- Use snake_case for table and column names
- Every table should have a primary key
- When the user says "this table" or "this", refer to the currently selected element
- You can call multiple tools in sequence for complex operations
- Use undo/redo when the user wants to revert or restore changes`
}
```

Since each request is stateless, the system prompt carries all context. When the user says "rename this table", the AI sees the selected table in the prompt and knows exactly what to act on.

## Frontend Integration

### AI Service (`src/services/ai.ts`)

All AI-related logic lives in a dedicated service, following the same pattern as the existing `schema.ts`, `dal.ts`, `sharing.ts`, and `export-import.ts` services. This keeps the hook and component layers thin, and makes AI operations testable in isolation.

The service is responsible for:
- **Action type definitions** - TypeScript discriminated union of all possible AI actions
- **`applyAction()`** - Maps action descriptors from the API to Zustand store mutations
- **`submitPrompt()`** - Sends the prompt + schema context to the API, returns actions
- **Position calculation** - Determines where new tables should appear on the canvas
- **Schema serialization** - Formats the current schema for inclusion in API requests

```typescript
// src/services/ai.ts
import type { Schema, Column, ColumnType, ColumnConstraint } from '@/types/schema'

// Discriminated union of all AI action descriptors
export type AiAction =
  | { action: 'createTable'; params: { name: string }; message: string }
  | { action: 'createTableWithColumns'; params: { name: string; columns: Omit<Column, 'id'>[] }; message: string }
  | { action: 'renameTable'; params: { tableId: string; newName: string }; message: string }
  | { action: 'deleteTable'; params: { tableId: string }; message: string }
  | { action: 'addColumn'; params: { tableId: string; name: string; type: ColumnType; constraints: ColumnConstraint[] }; message: string }
  | { action: 'updateColumn'; params: { tableId: string; columnId: string; updates: Partial<Pick<Column, 'name' | 'type' | 'constraints'>> }; message: string }
  | { action: 'deleteColumn'; params: { tableId: string; columnId: string }; message: string }
  | { action: 'addRelationship'; params: { sourceTableId: string; sourceColumnId: string; targetTableId: string; targetColumnId: string; type: string }; message: string }
  | { action: 'updateRelationship'; params: { relationshipId: string; updates: object }; message: string }
  | { action: 'deleteRelationship'; params: { relationshipId: string }; message: string }
  | { action: 'generateJunctionTable'; params: { sourceTableId: string; targetTableId: string }; message: string }
  | { action: 'undo'; params: { steps: number }; message: string }
  | { action: 'redo'; params: { steps: number }; message: string }

// Sends a stateless prompt to the API
export async function submitPrompt(
  prompt: string,
  schema: Schema,
  selectedTableId: string | null,
  selectedRelationshipId: string | null
): Promise<{ actions: AiAction[]; text: string }> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, schema, selectedTableId, selectedRelationshipId }),
  })
  if (!res.ok) throw new Error(`AI request failed: ${res.status}`)
  return res.json()
}

// Applies an AI action descriptor to the Zustand store
export function applyAction(
  store: SchemaStore,
  temporal: { undo: (steps?: number) => void; redo: (steps?: number) => void },
  action: AiAction
): void {
  switch (action.action) {
    case 'createTable':
      store.addTable(action.params.name, nextPosition(store.schema))
      break
    case 'renameTable':
      store.updateTable(action.params.tableId, { name: action.params.newName })
      break
    case 'undo':
      temporal.undo(action.params.steps)
      break
    case 'redo':
      temporal.redo(action.params.steps)
      break
    // ... all other cases
  }
}

// Calculates a non-overlapping position for a new table
export function nextPosition(schema: Schema): Position { ... }
```

### PromptBar component

A floating prompt bar at the bottom of the canvas. Uses AI Elements' `PromptInput` for the auto-resizing textarea. No chat thread, no message history - just the input and a brief status indicator (loading spinner while processing, toast for result/error).

```
+------------------------------------------------------+
|                    Schema Canvas                      |
|                                                       |
|                   [Tables & Relations]                 |
|                                                       |
|                                                       |
|  +--------------------------------------------------+|
|  | [PromptInput: "create a users table with email"] >||
|  +--------------------------------------------------+|
+------------------------------------------------------+
```

After submission, the input clears, actions are applied to the canvas, and a toast shows the AI's summary (e.g. "Created table users with 5 columns").

### useSchemaPrompt hook

Thin hook that wires prompt submission to the AI service and schema store. No message state, no history.

```typescript
// src/hooks/useSchemaPrompt.ts
import { useState } from 'react'
import { useSchemaStore, useTemporalStore } from './useSchemaStore'
import { submitPrompt, applyAction } from '@/services/ai'

export function useSchemaPrompt() {
  const store = useSchemaStore()
  const { undo, redo } = useTemporalStore((s) => ({ undo: s.undo, redo: s.redo }))
  const [isLoading, setIsLoading] = useState(false)
  const [lastMessage, setLastMessage] = useState<string | null>(null)

  async function submit(prompt: string) {
    setIsLoading(true)
    try {
      const { actions, text } = await submitPrompt(
        prompt,
        store.schema,
        store.selectedTableId,
        store.selectedRelationshipId
      )
      for (const action of actions) {
        applyAction(store, { undo, redo }, action)
      }
      setLastMessage(text || actions.map(a => a.message).join('. '))
    } catch (err) {
      setLastMessage('Something went wrong. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return { submit, isLoading, lastMessage }
}
```

## Authentication (Clerk)

### Frontend

```typescript
// main.tsx
import { ClerkProvider } from '@clerk/clerk-react'

<ClerkProvider publishableKey={CLERK_KEY}>
  <App />
</ClerkProvider>
```

Sign-in required only for the prompt feature. The canvas/schema designer remains usable without auth (preserving current behavior).

### API middleware

```typescript
// api/middleware/auth.ts
import { clerkMiddleware } from '@clerk/hono'

export const authMiddleware = () => clerkMiddleware()
```

## Dependencies to Add

### Production

```
ai                    # Vercel AI SDK
hono                  # API framework
@hono/vercel          # Vercel adapter (if using handle() pattern)
@clerk/clerk-react    # Clerk React SDK
@clerk/hono           # Clerk Hono middleware
zod                   # Schema validation for AI tools
```

### Dev

```
@types/node           # If not already present
```

AI Elements `PromptInput` is installed as source code (no package dependency).

## Implementation Phases

### Phase 1: API scaffold

1. Create `api/` directory structure
2. Set up Hono app with Vercel adapter
3. Add `vercel.json` with rewrites
4. Verify deployment works (health check endpoint)

### Phase 2: AI prompt endpoint

1. Install `ai` and `zod`
2. Define all schema tools with Zod input schemas (tables, columns, relationships, history)
3. Build system prompt with schema + selection context injection
4. Implement `/api/chat` endpoint (stateless: system prompt + single user message)
5. Test tool calling with curl/Postman

### Phase 3: Prompt UI

1. Install AI Elements `PromptInput` (`pnpm dlx ai-elements@latest`)
2. Create `src/services/ai.ts` with action types, `submitPrompt`, and `applyAction`
3. Create `useSchemaPrompt` hook
4. Build `PromptBar` as a floating input bar at the bottom of the canvas
5. Wire up action results to store mutations (including undo/redo)
6. Show result/error via toast (Sonner, already in the project)
7. Test end-to-end: prompt -> API -> tool calls -> canvas update

### Phase 4: Authentication

1. Set up Clerk project and get API keys
2. Add `ClerkProvider` to the frontend
3. Add Clerk middleware to Hono routes
4. Gate the prompt feature behind auth (show sign-in prompt if unauthenticated)
5. Keep schema designer usable without auth

### Phase 5: Polish

1. Add loading indicator on the prompt bar while processing
2. Handle errors gracefully (rate limits, tool failures)
3. Position newly created tables intelligently (avoid overlaps)
4. Test multi-step operations ("create a blog schema with users, posts, and comments")

## Resolved Questions

1. **Table positioning:** Use the same positioning logic already used by the frontend's "Add Table" action. No new algorithm needed.
2. **Rate limiting:** Not needed for now. Can revisit later if abuse becomes a concern.
3. **Schema context window:** Not a concern since we're not storing chat history. Each request sends only the current schema (single snapshot), keeping token usage bounded.
4. **Offline mode:** Disable the prompt input field when offline, with a message indicating network is required.
