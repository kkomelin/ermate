import { create } from 'zustand'
import { temporal } from 'zundo'
import { useStoreWithEqualityFn } from 'zustand/traditional'
import type { TemporalState } from 'zundo'

import type {
  Column,
  Position,
  Relationship,
  RelationshipEndpoint,
  Schema,
  ValidationError,
} from '@/types/schema'
import * as SchemaService from '@/services/schema'
import * as DalService from '@/services/dal'

interface SchemaState {
  schema: Schema
  schemaId: string | null
  schemaName: string
  selectedTableId: string | null
  selectedRelationshipId: string | null
  pendingConnection: {
    source: RelationshipEndpoint
    target: RelationshipEndpoint
  } | null

  // Schema-level
  setSchema: (schema: Schema) => void
  resetSchema: () => void
  setSchemaIdentity: (id: string, name: string) => void
  setSchemaName: (name: string) => void
  loadSchema: (id: string, name: string, schema: Schema) => void
  newSchema: () => void

  // Tables
  addTable: (name: string, position: Position) => void
  addTableWithColumns: (
    name: string,
    position: Position,
    extraColumns: Omit<Column, 'id'>[]
  ) => void
  updateTable: (
    tableId: string,
    updates: Partial<Pick<import('../types/schema').Table, 'name' | 'position'>>
  ) => void
  removeTable: (tableId: string) => void

  // Columns
  addColumn: (tableId: string, column: Omit<Column, 'id'>) => void
  updateColumn: (
    tableId: string,
    columnId: string,
    updates: Partial<Pick<Column, 'name' | 'type' | 'constraints'>>
  ) => void
  removeColumn: (tableId: string, columnId: string) => void

  // Relationships
  addRelationship: (rel: Omit<Relationship, 'id'>) => void
  updateRelationship: (
    relId: string,
    updates: Partial<Pick<Relationship, 'type' | 'source' | 'target'>>
  ) => void
  removeRelationship: (relId: string) => void
  generateJunctionTable: (sourceTableId: string, targetTableId: string) => void

  // Pending connection
  setPendingConnection: (
    conn: { source: RelationshipEndpoint; target: RelationshipEndpoint } | null
  ) => void

  // Selection
  selectTable: (tableId: string | null) => void
  selectRelationship: (relId: string | null) => void

  // Validation
  validate: () => ValidationError[]
}

type PartializedState = Pick<SchemaState, 'schema'>

export const useSchemaStore = create<SchemaState>()(
  temporal(
    (set, get) => ({
      schema: SchemaService.createEmptySchema(),
      schemaId: crypto.randomUUID(),
      schemaName: DalService.nextUntitledName(),
      selectedTableId: null,
      selectedRelationshipId: null,
      pendingConnection: null,

      setSchema: (schema) => set({ schema }),
      resetSchema: () => {
        const name = DalService.nextUntitledName()
        set({
          schema: SchemaService.createEmptySchema(),
          schemaId: crypto.randomUUID(),
          schemaName: name,
          selectedTableId: null,
          selectedRelationshipId: null,
          pendingConnection: null,
        })
      },
      setSchemaIdentity: (id, name) => set({ schemaId: id, schemaName: name }),
      setSchemaName: (name) => set({ schemaName: name }),
      loadSchema: (id, name, schema) =>
        set({
          schema,
          schemaId: id,
          schemaName: name,
          selectedTableId: null,
          selectedRelationshipId: null,
          pendingConnection: null,
        }),
      newSchema: () => {
        const name = DalService.nextUntitledName()
        set({
          schema: SchemaService.createEmptySchema(),
          schemaId: crypto.randomUUID(),
          schemaName: name,
          selectedTableId: null,
          selectedRelationshipId: null,
          pendingConnection: null,
        })
      },

      // Tables
      addTable: (name, position) =>
        set((s) => ({
          schema: SchemaService.addTable(s.schema, name, position),
        })),
      addTableWithColumns: (name, position, extraColumns) =>
        set((s) => ({
          schema: SchemaService.addTableWithColumns(
            s.schema,
            name,
            position,
            extraColumns
          ),
        })),
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
          schema: SchemaService.updateColumn(
            s.schema,
            tableId,
            columnId,
            updates
          ),
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
            s.selectedRelationshipId === relId
              ? null
              : s.selectedRelationshipId,
        })),
      generateJunctionTable: (sourceTableId, targetTableId) =>
        set((s) => ({
          schema: SchemaService.generateJunctionTable(
            s.schema,
            sourceTableId,
            targetTableId
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
    }),
    {
      partialize: (state) => ({ schema: state.schema }) as PartializedState,
      equality: (pastState, currentState) => {
        const past = pastState.schema
        const curr = currentState.schema
        // Compare everything except table positions
        if (past.tables.length !== curr.tables.length) return false
        if (past.relationships !== curr.relationships) return false
        for (let i = 0; i < past.tables.length; i++) {
          const pt = past.tables[i]
          const ct = curr.tables[i]
          if (
            pt.id !== ct.id ||
            pt.name !== ct.name ||
            pt.columns !== ct.columns
          )
            return false
        }
        return true
      },
    }
  )
)

export function useTemporalStore<T>(
  selector: (state: TemporalState<PartializedState>) => T
) {
  return useStoreWithEqualityFn(useSchemaStore.temporal, selector)
}
