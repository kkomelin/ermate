import type { SavedSchema, Schema, SchemaMeta } from "@/types/schema";

const STORAGE_KEY = "ermate:schemas";

export interface DalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function readAll(storage: DalStorage): Record<string, SavedSchema> {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeAll(
  storage: DalStorage,
  data: Record<string, SavedSchema>,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function listSchemas(
  storage: DalStorage = localStorage,
): SchemaMeta[] {
  const all = readAll(storage);
  return Object.values(all)
    .map((s) => s.meta)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getSchema(
  id: string,
  storage: DalStorage = localStorage,
): Schema | null {
  const all = readAll(storage);
  return all[id]?.schema ?? null;
}

export function getSavedSchema(
  id: string,
  storage: DalStorage = localStorage,
): SavedSchema | null {
  const all = readAll(storage);
  return all[id] ?? null;
}

export function saveSchema(
  id: string,
  name: string,
  schema: Schema,
  storage: DalStorage = localStorage,
): SchemaMeta {
  const all = readAll(storage);
  const meta: SchemaMeta = { id, name, updatedAt: Date.now() };
  all[id] = { meta, schema };
  writeAll(storage, all);
  return meta;
}

export function nextUntitledName(
  storage: DalStorage = localStorage,
): string {
  const existing = listSchemas(storage);
  const used = new Set(existing.map((s) => s.name));
  let n = 1;
  while (used.has(`Untitled ${n}`)) n++;
  return `Untitled ${n}`;
}

export function deleteSchema(
  id: string,
  storage: DalStorage = localStorage,
): void {
  const all = readAll(storage);
  delete all[id];
  writeAll(storage, all);
}
