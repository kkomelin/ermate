# ERMate — Visual Database Schema Designer

## Overview

A client-side-only visual ER diagram tool built with React Flow. Users design database schemas by dragging tables onto a canvas, defining columns with types and constraints, and drawing relationships between tables. Schemas are persisted locally and can be shared via URL containing a compressed JSON payload.

## Tech Stack

| Layer | Choice | Rationale |
| --- | --- | --- |
| Framework | React 19 + TypeScript | Already scaffolded |
| Canvas | @xyflow/react (React Flow v12) | Already installed; purpose-built for node/edge diagrams |
| UI Components | shadcn/ui | Per project rules; polished, accessible primitives |
| Styling | Tailwind CSS 4 | Per project rules |
| Compression | lz-string | Tiny (~5 KB), battle-tested, produces URL-safe output via `compressToEncodedURIComponent` |
| Local Storage | localStorage | Sufficient for schema JSON (typically < 100 KB); simple API, no async overhead |
| Routing | React Router (hash mode) | Reads `#schema=<compressed>` from URL for sharing |

## Data Model

### Schema JSON Structure

```jsonc
{
  "version": 1,
  "tables": [
    {
      "id": "t_uuid",
      "name": "users",
      "position": { "x": 100, "y": 200 },
      "columns": [
        {
          "id": "c_uuid",
          "name": "id",
          "type": "INTEGER",
          "constraints": ["PRIMARY KEY", "NOT NULL"]
        },
        {
          "id": "c_uuid2",
          "name": "email",
          "type": "VARCHAR",
          "constraints": ["NOT NULL", "UNIQUE"]
        }
      ]
    }
  ],
  "relationships": [
    {
      "id": "r_uuid",
      "source": { "tableId": "t1", "columnId": "c1" },
      "target": { "tableId": "t2", "columnId": "c2" },
      "type": "one-to-many"
    }
  ]
}
```

### Column Types

`VARCHAR` | `INTEGER` | `BOOLEAN` | `TEXT` | `TIMESTAMP`

### Column Constraints

`PRIMARY KEY` | `NOT NULL` | `UNIQUE`

### Relationship Types

`one-to-one` | `one-to-many` | `many-to-many`

> **Primary key rule**: Exactly one column per table may have the `PRIMARY KEY` constraint. The UI enforces this — selecting PK on a column automatically removes it from any other column in the same table.

## Storage & Sharing Strategy

### Local Persistence

- Schemas are saved to `localStorage` under a key like `ermate:schemas`.
- Users can maintain multiple saved schemas (list view).
- Auto-save on every change (debounced ~1 s).

### URL Sharing (no backend)

```
https://ermate.app/#schema=<lz-string-compressed-base64url>
```

**Flow:**

1. **Export**: `JSON.stringify(schema)` → `lzString.compressToEncodedURIComponent(json)` → append to URL hash.
2. **Import**: On app load, check `window.location.hash` → `lzString.decompressFromEncodedURIComponent(hash)` → `JSON.parse(json)` → render.

**Size budget**: Most browsers support URL lengths of ~2 MB. A schema with 50 tables and 500 columns compresses to roughly 5–15 KB, well within limits.

**Fallback for very large schemas**: Offer a "Copy JSON to clipboard" / "Import from clipboard" option.

## Service Architecture

The business logic is extracted into **framework-agnostic services** — plain TypeScript classes/modules with no React dependency. This makes them independently testable with simple unit tests and swappable without touching the UI layer.

```
┌─────────────────────────────────────────────────────────┐
│                     React UI Layer                       │
│  Components, Hooks, React Flow                          │
│                                                         │
│  useSchema hook ←──── bridges services to React state   │
└────────┬──────────┬──────────┬──────────┬───────────────┘
         │          │          │          │
    ┌────▼───┐ ┌────▼────┐ ┌──▼───┐ ┌───▼────────┐
    │  DAL   │ │ Export/  │ │Schema│ │ Sharing    │
    │Service │ │ Import  │ │Service│ │ Service    │
    └────┬───┘ └────┬────┘ └──┬───┘ └───┬────────┘
         │          │         │         │
    ┌────▼──────────▼─────────▼─────────▼─────────┐
    │              Types (schema.ts)                │
    └──────────────────────────────────────────────┘
```

### Services

#### 1. DAL Service (`services/dal.ts`)
Storage abstraction over localStorage. All persistence goes through this layer — if we ever swap to IndexedDB or a remote API, only this file changes.

```ts
interface DalService {
  listSchemas(): SchemaMeta[]           // list saved schemas (id, name, updatedAt)
  getSchema(id: string): Schema | null  // load a full schema by id
  saveSchema(schema: Schema): void      // create or update
  deleteSchema(id: string): void        // remove from storage
}
```

- Manages the `ermate:schemas` localStorage key
- Handles serialization/deserialization
- Testable by injecting a mock `Storage` object

#### 2. Schema Service (`services/schema.ts`)
Pure business logic for schema manipulation. No side effects — takes a schema in, returns a new schema out.

```ts
interface SchemaService {
  // Tables
  addTable(schema: Schema, name: string, position: Position): Schema
  updateTable(schema: Schema, tableId: string, updates: Partial<Table>): Schema
  removeTable(schema: Schema, tableId: string): Schema

  // Columns
  addColumn(schema: Schema, tableId: string, column: Omit<Column, 'id'>): Schema
  updateColumn(schema: Schema, tableId: string, columnId: string, updates: Partial<Column>): Schema
  removeColumn(schema: Schema, tableId: string, columnId: string): Schema

  // Relationships
  addRelationship(schema: Schema, rel: Omit<Relationship, 'id'>): Schema
  removeRelationship(schema: Schema, relId: string): Schema

  // Validation
  validate(schema: Schema): ValidationError[]
}
```

- Enforces single-PK rule (adding PK to one column removes it from others)
- Validates table names uniqueness, orphaned FK references, missing PKs
- Immutable — always returns a new schema object (works naturally with React state)
- Zero dependencies, pure functions — trivially testable

#### 3. Export / Import Service (`services/export-import.ts`)
Handles all serialization formats. Each format is a pair of encode/decode functions.

```ts
interface ExportImportService {
  // JSON file
  toJSON(schema: Schema): string
  fromJSON(json: string): Schema       // validates + migrates schema version

  // SQL DDL
  toSQL(schema: Schema): string        // generates CREATE TABLE statements

  // File operations
  downloadAsJSON(schema: Schema, filename?: string): void
  importFromFile(file: File): Promise<Schema>
}
```

- JSON export includes schema version for forward compatibility
- `fromJSON` validates the structure and applies version migrations if needed
- SQL generation handles FK constraints, data types, NOT NULL, UNIQUE
- Testable with string assertions (no DOM needed except for download trigger)

#### 4. Sharing Service (`services/sharing.ts`)
Handles URL-based schema sharing via lz-string compression.

```ts
interface SharingService {
  encodeToUrl(schema: Schema): string            // schema → compressed URL hash
  decodeFromUrl(hash: string): Schema | null     // URL hash → schema (null if invalid)
  copyShareUrl(schema: Schema): Promise<void>    // encode + copy to clipboard
  getSchemaFromCurrentUrl(): Schema | null        // check window.location.hash on load
}
```

- Wraps lz-string `compressToEncodedURIComponent` / `decompressFromEncodedURIComponent`
- Validates decoded JSON before returning (defense against tampered URLs)
- Returns `null` (not throws) on invalid input — the UI decides how to handle it
- Compression logic is testable without a browser (only clipboard/URL parts need mocking)

### Hooks (thin React bridges)

Hooks are **thin adapters** that connect services to React state. They contain no business logic themselves.

```ts
// useSchemaStore.ts — Zustand store
//   Wraps SchemaService calls, exposes actions + selectors to components
//   Example:
//     addTable: (name, pos) => set(s => ({
//       schema: SchemaService.addTable(s.schema, name, pos)
//     }))

// useAutoSave.ts — persistence
//   Watches schema state, debounces writes through DalService

// useShareUrl.ts — URL sharing
//   On mount: reads URL via SharingService, hydrates schema
//   Exposes: generateShareUrl() via SharingService
```

## File Structure

```
src/
├── services/                         # Framework-agnostic business logic
│   ├── dal.ts                        # Storage abstraction (localStorage CRUD)
│   ├── dal.test.ts                   # Unit tests with mock Storage
│   ├── schema.ts                     # Schema manipulation + validation (pure functions)
│   ├── schema.test.ts                # Unit tests for add/remove/validate
│   ├── export-import.ts              # JSON/SQL serialization
│   ├── export-import.test.ts         # Unit tests with string assertions
│   ├── sharing.ts                    # URL compression + encode/decode
│   └── sharing.test.ts              # Unit tests for round-trip encode/decode
├── types/
│   └── schema.ts                     # TypeScript interfaces (Schema, Table, Column, Relationship)
├── components/
│   ├── canvas/
│   │   ├── SchemaCanvas.tsx          # React Flow wrapper, nodes/edges state
│   │   ├── TableNode.tsx             # Custom node: table with columns + handles
│   │   ├── RelationshipEdge.tsx      # Custom edge: crow's foot cardinality
│   │   └── Toolbar.tsx               # Top bar: add table, save, load, share
│   ├── panels/
│   │   ├── TableEditor.tsx           # Side panel: edit table name + columns
│   │   ├── ColumnRow.tsx             # Single column editor row
│   │   └── RelationshipEditor.tsx    # Relationship type + FK mapping dialog
│   └── ui/                           # shadcn components
├── hooks/
│   ├── useSchemaStore.ts             # Zustand store: bridges SchemaService → React state
│   ├── useAutoSave.ts                # Debounced auto-save via DalService
│   └── useShareUrl.ts               # URL encode/decode via SharingService
├── lib/
│   └── utils.ts                      # cn() helper (already exists)
├── App.tsx
├── main.tsx
└── index.css
```

## Implementation Plan

### Phase 1 — Types & Services (no React)

1. **Define TypeScript types** (`types/schema.ts`): `Schema`, `Table`, `Column`, `Relationship`, enums for column types/constraints/relationship types.
2. **Schema Service** (`services/schema.ts`): Pure functions for table/column/relationship CRUD + validation. Write unit tests — this is the core logic.
3. **DAL Service** (`services/dal.ts`): localStorage abstraction with `listSchemas`, `getSchema`, `saveSchema`, `deleteSchema`. Accepts `Storage` interface for testability.
4. **Sharing Service** (`services/sharing.ts`): lz-string encode/decode. Unit test round-trip compression.
5. **Export/Import Service** (`services/export-import.ts`): JSON serialization + SQL DDL generation.

> At this point, all business logic is implemented and tested with zero React code.

### Phase 2 — Canvas & Table Rendering

6. **Zustand store + hooks** (`useSchemaStore.ts`, `useAutoSave.ts`, `useShareUrl.ts`): Thin bridges from services to React state.
7. **React Flow canvas** (`SchemaCanvas.tsx`): Render tables as custom nodes, relationships as custom edges. Wire up drag-and-drop positioning.
8. **Custom TableNode** (`TableNode.tsx`): Displays table name, column list with types/constraints, connection handles on each column row.

### Phase 3 — Table & Column Editing

9. **TableEditor panel** (`TableEditor.tsx`): Opens on table click/double-click. Fields for table name. List of columns with add/remove.
10. **ColumnRow editor** (`ColumnRow.tsx`): Column name input, type dropdown, constraint checkboxes. Primary key toggle enforces single-PK rule via SchemaService.
11. **Add table via toolbar**: "Add Table" button creates a new table node at canvas center or click position.

### Phase 4 — Relationships

12. **Connection handling**: Use React Flow's `onConnect` to create relationships. User drags from a column handle on one table to a column handle on another.
13. **RelationshipEditor**: After connecting, a dialog lets the user pick cardinality (1:1, 1:M, M:M). For M:M, optionally auto-generate a junction table via SchemaService.
14. **Custom edge rendering** (`RelationshipEdge.tsx`): Show crow's foot or other notation for cardinality. Display FK column name on the edge.

### Phase 5 — Persistence & Sharing

15. **Auto-save** (`useAutoSave.ts`): Debounced writes through DalService on every schema change.
16. **Save/Load UI**: Toolbar buttons for "Save As" / "Load" with schema list dialog. All operations go through DalService.
17. **URL sharing** (`useShareUrl.ts`): "Share" button encodes schema via SharingService → copies URL. On app load, decodes hash param → hydrates state.
18. **JSON file export/import**: Download `.json` via ExportImportService. File picker / drag-and-drop for import.

### Phase 6 — Polish & Stretch Goals

19. **Validation warnings**: Surface `SchemaService.validate()` results in the UI — duplicate table names, missing PKs, orphaned FKs.
20. **SQL export**: "Export SQL" button calls `ExportImportService.toSQL()`, copies or downloads the DDL.
21. **Minimap & controls**: React Flow's built-in minimap, zoom controls, fit-view.
22. **Dark mode**: Tailwind dark mode support.
23. **Undo/redo**: Track state history for undo/redo support.

## UI Wireframe (Text)

```
┌─────────────────────────────────────────────────────────────────┐
│  ERMate    [+ Add Table]  [Save]  [Load]  [Share]  [Export SQL] │
├──────────────────────────────────────┬──────────────────────────┤
│                                      │  Table: users            │
│   ┌──────────────┐                   │  ─────────────────────── │
│   │ users        │                   │  Name: [users        ]   │
│   │──────────────│    ┌────────────┐ │                          │
│   │🔑 id  INT    │───→│ posts      │ │  Columns:                │
│   │ email VARCHAR│    │────────────│ │  ┌─────┬───────┬──────┐  │
│   │ name  VARCHAR│    │🔑 id  INT  │ │  │Name │Type   │Constr│  │
│   └──────────────┘    │ user_id INT│ │  ├─────┼───────┼──────┤  │
│                       │ title TEXT │ │  │id   │INTEGER│PK, NN│  │
│                       └────────────┘ │  │email│VARCHAR│NN, UQ│  │
│                                      │  │name │VARCHAR│      │  │
│                                      │  └─────┴───────┴──────┘  │
│          (React Flow Canvas)         │  [+ Add Column]          │
│                                      │                          │
│                                      │  Relationships:          │
│                                      │  users.id → posts.user_id│
│                                      │  Type: one-to-many       │
├──────────────────────────────────────┴──────────────────────────┤
│  [Minimap]                                        Zoom: 100%    │
└─────────────────────────────────────────────────────────────────┘
```

## Key Dependencies to Add

| Package | Purpose |
| --- | --- |
| `lz-string` | URL-safe compression for schema sharing |
| `zustand` | Lightweight state management (~1.1 KB), pairs naturally with immutable services |
| `react-router` | Hash-based routing for schema URLs |
| `shadcn/ui` components | button, input, select, dialog, sheet, checkbox, dropdown-menu, tooltip |

## Constraints & Decisions

- **No backend**: All data lives in the browser. No accounts, no database. Trade-off: schemas are lost if localStorage is cleared (mitigated by JSON export and URL sharing).
- **URL size**: lz-string keeps encoded schemas small. If a schema exceeds ~64 KB compressed (extremely large), the app warns and suggests JSON export instead.
- **Single PK enforcement**: UI-level only. The JSON format technically allows multiple PK constraints, but the editor prevents it.
- **Many-to-many**: Represented as two one-to-many relationships through a junction table. The UI can auto-generate the junction table when M:M is selected.
