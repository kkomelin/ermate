[![Tests](https://github.com/kkomelin/ermate/actions/workflows/test.yml/badge.svg)](https://github.com/kkomelin/ermate/actions/workflows/test.yml)
[![Deployment Status](https://img.shields.io/badge/deployment-live-brightgreen)](https://ermate.app)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

# ERMate - AI-powered Visual Database Schema Designer

[![ermate-app](https://github.com/user-attachments/assets/76e8ad3e-75da-4ca7-8a20-6a4d4c87ff1e)](https://ermate.app)

Design ER diagrams, define tables and relationships manually or via prompts, and share via URL.

**[🚀 Try it live](https://ermate.app)**

## Features

- **Visual canvas** - drag-and-drop tables on an interactive grid with zoom, pan, and fit-to-view
- **Tables & columns** - create tables with default columns (id, created_at, updated_at); add columns with types (VARCHAR, INTEGER, BOOLEAN, TEXT, TIMESTAMP) and constraints (PRIMARY KEY, NOT NULL, UNIQUE)
- **Relationships** - connect columns visually to define one-to-one, one-to-many, and many-to-many relationships
- **Junction tables** - auto-generate junction tables with foreign keys for many-to-many relationships
- **AI-powered design** - create tables, columns, and relationships using natural language; includes batch operations, smart auto-layout, and LLM safety features
- **SQL export/import** - export schemas as SQL DDL or import from SQL dumps with dialect selection (PostgreSQL, MySQL, SQLite)
- **JSON export/import** - download or load schemas as JSON files for backup and transfer
- **Load schemas** - open previously saved schemas from local storage
- **Share via URL** - generate compressed shareable links with the full schema embedded in the URL hash
- **Auto-save** - changes are automatically saved to localStorage after 1 second of inactivity
- **Restore on startup** - automatically loads the last opened schema when you return
- **Undo/redo** - full undo history for schema changes (Ctrl+Z / Ctrl+Shift+Z)
- **Validation** - validate schemas for errors and warnings
- **Dark mode** - toggle between light and dark themes, persisted across sessions
- **PWA** - installable as a standalone app with offline support via service worker

## Tech Stack

- [React](https://react.dev/) 19 + [TypeScript](https://www.typescriptlang.org/) 5.9
- [Vite](https://vite.dev/) 8 (build tool)
- [Hono](https://hono.dev/) + [AI SDK](https://sdk.vercel.ai/) for AI-powered schema design API
- [node-sql-parser](https://github.com/taozhi8833998/node-sql-parser) for SQL parsing
- [React Flow](https://reactflow.dev/) (@xyflow/react) for the interactive canvas
- [Dagre](https://github.com/dagrejs/dagre) for auto-layout
- [Zustand](https://zustand.docs.pmnd.rs/) + [Zundo](https://github.com/charkour/zundo) for state management and undo/redo
- [Tailwind CSS](https://tailwindcss.com/) 4 + [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) for styling and components
- [Lucide](https://lucide.dev/) for icons
- [LZ-String](https://github.com/pieroxy/lz-string) for URL compression
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) + Workbox for PWA support
- [Vitest](https://vitest.dev/) for testing

## Getting Started

```bash
pnpm install
pnpm dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm dev:api` | Start AI API server (requires API keys; see `.env.sample`) |
| `pnpm build` | Type-check and build for production |
| `pnpm preview` | Preview production build locally |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Lint with ESLint |
| `pnpm format` | Format with Prettier |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm check` | Run typecheck, lint, and tests |

## Data Storage

The app includes an AI API (Hono + AI SDK) for natural language schema generation, but has no backend database. All schema data lives in the browser.

- **Schemas** are stored in `localStorage` under the key `ermate:schemas`
- **Active schema ID** is stored under `ermate:activeSchemaId`
- **Theme preference** is stored under `ermate:theme`
- **Shared schemas** are encoded in the URL hash (`#schema=...`) using LZ-String compression
- **PWA cache** is managed by Workbox for offline access
