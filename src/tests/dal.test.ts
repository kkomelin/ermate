import { describe, it, expect, beforeEach } from "vitest";
import type { DalStorage } from "@/services/dal";
import {
  listSchemas,
  getSchema,
  getSavedSchema,
  saveSchema,
  deleteSchema,
} from "@/services/dal";
import type { Schema } from "@/types/schema";
import { testSchema } from "./fixtures";

function createMockStorage(): DalStorage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
}

describe("DAL service", () => {
  let storage: DalStorage;

  beforeEach(() => {
    storage = createMockStorage();
  });

  it("returns empty list when no schemas saved", () => {
    expect(listSchemas(storage)).toEqual([]);
  });

  it("saves and retrieves a schema", () => {
    saveSchema("s1", "My Schema", testSchema, storage);

    const schema = getSchema("s1", storage);
    expect(schema).toEqual(testSchema);
  });

  it("returns null for non-existent schema", () => {
    expect(getSchema("nonexistent", storage)).toBeNull();
  });

  it("lists saved schemas sorted by updatedAt descending", async () => {
    saveSchema("s1", "First", testSchema, storage);

    // Ensure different timestamps
    await new Promise((r) => setTimeout(r, 5));

    const schema2: Schema = { ...testSchema, version: 2 };
    saveSchema("s2", "Second", schema2, storage);

    const list = listSchemas(storage);
    expect(list).toHaveLength(2);
    // Most recent first
    expect(list[0].name).toBe("Second");
    expect(list[1].name).toBe("First");
  });

  it("updates an existing schema", () => {
    saveSchema("s1", "Original", testSchema, storage);

    const updated: Schema = {
      ...testSchema,
      tables: [
        ...testSchema.tables,
        {
          id: "t99",
          name: "comments",
          position: { x: 100, y: 0 },
          columns: [],
        },
      ],
    };

    saveSchema("s1", "Updated", updated, storage);

    const schema = getSchema("s1", storage);
    expect(schema!.tables).toHaveLength(testSchema.tables.length + 1);

    const list = listSchemas(storage);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Updated");
  });

  it("deletes a schema", () => {
    saveSchema("s1", "To Delete", testSchema, storage);
    expect(getSchema("s1", storage)).not.toBeNull();

    deleteSchema("s1", storage);
    expect(getSchema("s1", storage)).toBeNull();
    expect(listSchemas(storage)).toHaveLength(0);
  });

  it("deleting non-existent schema does not error", () => {
    expect(() => deleteSchema("nonexistent", storage)).not.toThrow();
  });

  it("getSavedSchema returns full saved schema with meta", () => {
    saveSchema("s1", "Test", testSchema, storage);

    const saved = getSavedSchema("s1", storage);
    expect(saved).not.toBeNull();
    expect(saved!.meta.id).toBe("s1");
    expect(saved!.meta.name).toBe("Test");
    expect(saved!.meta.updatedAt).toBeGreaterThan(0);
    expect(saved!.schema).toEqual(testSchema);
  });

  it("getSavedSchema returns null for non-existent id", () => {
    expect(getSavedSchema("nonexistent", storage)).toBeNull();
  });

  it("handles corrupted storage gracefully", () => {
    storage.setItem("ermate:schemas", "not-valid-json");
    expect(listSchemas(storage)).toEqual([]);
    expect(getSchema("s1", storage)).toBeNull();
  });
});
