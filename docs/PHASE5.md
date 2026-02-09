# Phase 5 — Persistence & Sharing

## Context

All persistence and sharing services are implemented and tested (`dal.ts`, `sharing.ts`, `export-import.ts`) along with hooks (`useAutoSave`, `useShareUrl`), but none are wired into the UI. The Toolbar only has "Add Table" and "Sample" buttons. Phase 5 connects everything: save/load to localStorage, URL sharing, JSON/SQL export, and JSON import.

## Plan

### 1. Install shadcn components
- `pnpm dlx shadcn@latest add dropdown-menu` — for Export menu (JSON/SQL)
- `pnpm dlx shadcn@latest add sonner` — toast notifications for feedback (Copied!, Saved!, etc.)

### 2. Extend Zustand store with schema identity (`src/hooks/useSchemaStore.ts`)
Add state + actions for tracking the current schema:
- `schemaId: string | null` — null = unsaved new schema
- `schemaName: string` — defaults to "Untitled"
- `setSchemaIdentity(id, name)` — sets both
- `setSchemaName(name)` — updates name only
- `loadSchema(id, name, schema)` — replaces everything, clears selections
- `newSchema()` — resets to empty schema with null id
- Update `resetSchema` to also clear identity

### 3. Create `SaveDialog` component (`src/components/panels/SaveDialog.tsx`)
- Controlled dialog for naming a schema on first save
- Input for schema name, Cancel/Save buttons
- On save: generates `crypto.randomUUID()`, calls `DalService.saveSchema()`, calls `setSchemaIdentity()`, shows `toast.success()`
- Props: `open`, `onOpenChange`

### 4. Create `LoadDialog` component (`src/components/panels/LoadDialog.tsx`)
- Controlled dialog listing saved schemas from `DalService.listSchemas()`
- Each row: schema name, relative time ("2m ago"), delete button (using `ConfirmDelete`)
- Click row → loads schema via `DalService.getSchema()` + `loadSchema()` + toast
- "New Schema" button at bottom → `newSchema()` + close
- Empty state when no schemas saved

### 5. Update Toolbar (`src/components/canvas/Toolbar.tsx`)
Add buttons in logical groups with dividers:

```
[ERMate / schema_name] | [Save] [Load] | [Add Table] [Sample] | [Share] [Export ▾] [Import]
```

- **Save** — if `schemaId` is null, opens SaveDialog; if already saved, forces immediate save + toast
- **Load** — opens LoadDialog
- **Share** — calls `copyShareUrl()` from `useShareUrl`, shows toast
- **Export** — DropdownMenu with "Export JSON" and "Export SQL" items, calls `downloadAsJSON`/`downloadAsSQL`
- **Import** — hidden `<input type="file" accept=".json">`, calls `importFromFile()`, loads as new unsaved schema
- **Schema name display** — show "ERMate / name" when schema has a name other than "Untitled"

### 6. Wire hooks into App.tsx (`src/App.tsx`)
- Call `useAutoSave(schemaId, schemaName)` — auto-saves when schema has an ID
- Call `useShareUrl()` — reads schema from URL hash on mount
- Add `<Toaster position="bottom-center" richColors />` from sonner

## Files to create
- `src/components/ui/dropdown-menu.tsx` — via shadcn CLI
- `src/components/ui/sonner.tsx` — via shadcn CLI
- `src/components/panels/SaveDialog.tsx` — save-as dialog with name input
- `src/components/panels/LoadDialog.tsx` — schema list with load/delete

## Files to modify
- `src/hooks/useSchemaStore.ts` — add schema identity state + actions
- `src/components/canvas/Toolbar.tsx` — add Save, Load, Share, Export, Import buttons + schema name display
- `src/App.tsx` — wire useAutoSave, useShareUrl, add Toaster

## Existing code to reuse
- `src/services/dal.ts` — `listSchemas()`, `getSchema()`, `saveSchema()`, `deleteSchema()`
- `src/services/sharing.ts` — `copyShareUrl()`, `getSchemaFromUrl()`
- `src/services/export-import.ts` — `downloadAsJSON()`, `downloadAsSQL()`, `importFromFile()`
- `src/hooks/useAutoSave.ts` — already takes `(schemaId, schemaName)`, no changes needed
- `src/hooks/useShareUrl.ts` — already works, no changes needed
- `src/components/panels/ConfirmDelete.tsx` — reuse in LoadDialog for deleting saved schemas

## Verification
- `pnpm typecheck` — no errors
- `pnpm build` — clean build
- Save new schema → dialog appears → enter name → saves to localStorage
- Auto-save fires after changes (check DevTools > Application > Local Storage)
- Load dialog lists saved schemas → click to load → canvas updates
- Delete saved schema from load dialog → removed from list + storage
- "New Schema" in load dialog → canvas clears
- Share → toast "Share URL copied" → URL contains compressed schema
- Open shared URL in new tab → schema loads
- Export JSON / Export SQL → file downloads
- Import valid JSON → schema loads as new unsaved schema
- Import invalid file → error toast
