# Phase 4 — Relationships + Delete Dialog Refactor

## Context

The relationship CRUD services and Zustand store actions are fully implemented. Basic connection creation works (drag handle-to-handle), but it silently defaults to ONE_TO_MANY with no UI for choosing type, editing, or deleting relationships. Phase 4 adds the interactive layer. Additionally, delete confirmation dialogs are duplicated across ColumnRow and TableEditor — these should be extracted into a reusable component.

## Plan

### 1. Extract reusable `ConfirmDelete` dialog (`src/components/panels/ConfirmDelete.tsx`)
- Wraps AlertDialog with standard destructive confirmation pattern
- Props: `trigger` (ReactNode), `title`, `description`, `onConfirm`
- Replace inline AlertDialogs in `ColumnRow.tsx` and `TableEditor.tsx` with `<ConfirmDelete>`
- Will also be reused for relationship deletion

### 2. Add shadcn Dialog component
- `pnpm dlx shadcn@latest add dialog`
- Dialog (not AlertDialog) for the relationship editor — it's a form, not a destructive action

### 3. Add pending connection state to Zustand store (`src/hooks/useSchemaStore.ts`)
- Add `pendingConnection: { source: RelationshipEndpoint; target: RelationshipEndpoint } | null`
- Add `setPendingConnection(conn | null)` action
- `onConnect` in SchemaCanvas sets pendingConnection instead of directly calling addRelationship

### 4. Create `src/components/panels/RelationshipEditor.tsx`
A modal dialog for creating and editing relationships:
- **On new connection** (`pendingConnection` is set): Opens with source/target pre-filled, user picks type (1:1, 1:M, M:M)
- **On edge click** (`selectedRelationshipId` is set): Opens with current values, allows changing type or deleting
- **M:M flow**: When M:M is selected, show a checkbox "Generate junction table" that calls `generateJunctionTable`
- Uses `Select` for relationship type, shows source→target table.column as read-only labels
- Delete button uses `<ConfirmDelete>` from step 1

### 5. Update `src/components/canvas/SchemaCanvas.tsx`
- `onConnect` → calls `setPendingConnection(...)` instead of `addRelationship(...)`
- Add `onEdgeClick` handler → calls `selectRelationship(edgeId)`
- Add selected edge styling (thicker stroke, primary color) based on `selectedRelationshipId`

### 6. Wire `RelationshipEditor` into `src/App.tsx`

## Files to modify
- `src/components/panels/ColumnRow.tsx` — replace inline AlertDialog with ConfirmDelete
- `src/components/panels/TableEditor.tsx` — replace inline AlertDialog with ConfirmDelete
- `src/hooks/useSchemaStore.ts` — add pendingConnection state + action
- `src/components/canvas/SchemaCanvas.tsx` — change onConnect, add onEdgeClick + selected edge style
- `src/App.tsx` — add RelationshipEditor import

## Files to create
- `src/components/panels/ConfirmDelete.tsx` — reusable delete confirmation dialog
- `src/components/ui/dialog.tsx` — via shadcn CLI
- `src/components/panels/RelationshipEditor.tsx` — relationship type picker / editor

## Verification
- `pnpm typecheck` — no type errors
- `pnpm build` — clean build
- Confirm delete dialogs still work for columns and tables (same UX, refactored internals)
- Drag handle-to-handle → dialog opens with type picker → confirm creates edge
- Click existing edge → dialog opens with current type → can change or delete
- Select M:M + "Generate junction table" → junction table appears on canvas
