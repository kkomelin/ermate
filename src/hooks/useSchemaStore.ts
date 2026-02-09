import { create } from "zustand";

import type {
  Column,
  Position,
  Relationship,
  RelationshipEndpoint,
  Schema,
  ValidationError,
} from "@/types/schema";
import * as SchemaService from "@/services/schema";

interface SchemaState {
  schema: Schema;
  selectedTableId: string | null;
  selectedRelationshipId: string | null;
  pendingConnection: {
    source: RelationshipEndpoint;
    target: RelationshipEndpoint;
  } | null;

  // Schema-level
  setSchema: (schema: Schema) => void;
  resetSchema: () => void;

  // Tables
  addTable: (name: string, position: Position) => void;
  updateTable: (
    tableId: string,
    updates: Partial<Pick<import("../types/schema").Table, "name" | "position">>,
  ) => void;
  removeTable: (tableId: string) => void;

  // Columns
  addColumn: (tableId: string, column: Omit<Column, "id">) => void;
  updateColumn: (
    tableId: string,
    columnId: string,
    updates: Partial<Pick<Column, "name" | "type" | "constraints">>,
  ) => void;
  removeColumn: (tableId: string, columnId: string) => void;

  // Relationships
  addRelationship: (rel: Omit<Relationship, "id">) => void;
  updateRelationship: (
    relId: string,
    updates: Partial<Pick<Relationship, "type" | "source" | "target">>,
  ) => void;
  removeRelationship: (relId: string) => void;
  generateJunctionTable: (
    sourceTableId: string,
    targetTableId: string,
  ) => void;

  // Pending connection
  setPendingConnection: (
    conn: { source: RelationshipEndpoint; target: RelationshipEndpoint } | null,
  ) => void;

  // Selection
  selectTable: (tableId: string | null) => void;
  selectRelationship: (relId: string | null) => void;

  // Validation
  validate: () => ValidationError[];
}

export const useSchemaStore = create<SchemaState>((set, get) => ({
  schema: SchemaService.createEmptySchema(),
  selectedTableId: null,
  selectedRelationshipId: null,
  pendingConnection: null,

  setSchema: (schema) => set({ schema }),
  resetSchema: () =>
    set({
      schema: SchemaService.createEmptySchema(),
      selectedTableId: null,
      selectedRelationshipId: null,
      pendingConnection: null,
    }),

  // Tables
  addTable: (name, position) =>
    set((s) => ({ schema: SchemaService.addTable(s.schema, name, position) })),
  updateTable: (tableId, updates) =>
    set((s) => ({
      schema: SchemaService.updateTable(s.schema, tableId, updates),
    })),
  removeTable: (tableId) =>
    set((s) => ({
      schema: SchemaService.removeTable(s.schema, tableId),
      selectedTableId:
        s.selectedTableId === tableId ? null : s.selectedTableId,
    })),

  // Columns
  addColumn: (tableId, column) =>
    set((s) => ({
      schema: SchemaService.addColumn(s.schema, tableId, column),
    })),
  updateColumn: (tableId, columnId, updates) =>
    set((s) => ({
      schema: SchemaService.updateColumn(s.schema, tableId, columnId, updates),
    })),
  removeColumn: (tableId, columnId) =>
    set((s) => ({
      schema: SchemaService.removeColumn(s.schema, tableId, columnId),
    })),

  // Relationships
  addRelationship: (rel) =>
    set((s) => ({ schema: SchemaService.addRelationship(s.schema, rel) })),
  updateRelationship: (relId, updates) =>
    set((s) => ({
      schema: SchemaService.updateRelationship(s.schema, relId, updates),
    })),
  removeRelationship: (relId) =>
    set((s) => ({
      schema: SchemaService.removeRelationship(s.schema, relId),
      selectedRelationshipId:
        s.selectedRelationshipId === relId ? null : s.selectedRelationshipId,
    })),
  generateJunctionTable: (sourceTableId, targetTableId) =>
    set((s) => ({
      schema: SchemaService.generateJunctionTable(
        s.schema,
        sourceTableId,
        targetTableId,
      ),
    })),

  // Pending connection
  setPendingConnection: (conn) => set({ pendingConnection: conn }),

  // Selection
  selectTable: (tableId) =>
    set({ selectedTableId: tableId, selectedRelationshipId: null }),
  selectRelationship: (relId) =>
    set({ selectedRelationshipId: relId, selectedTableId: null }),

  // Validation
  validate: () => SchemaService.validate(get().schema),
}));
