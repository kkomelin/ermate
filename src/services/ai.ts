import { useSchemaStore } from '@/hooks/useSchemaStore'
import { createEmptySchema } from '@/services/schema'
import type {
  Column,
  ColumnConstraint,
  ColumnType,
  Position,
  RelationshipType,
  Schema,
} from '@/types/schema'

// ---------------------------------------------------------------------------
// Action types - all use NAMES (not IDs) for entity references
// ---------------------------------------------------------------------------

export type AiAction =
  | {
      action: 'createTable'
      params: { name: string }
      message: string
    }
  | {
      action: 'createTableWithColumns'
      params: {
        name: string
        columns: {
          name: string
          type: ColumnType
          constraints: ColumnConstraint[]
        }[]
      }
      message: string
    }
  | {
      action: 'createMultipleTables'
      params: {
        tables: {
          name: string
          columns: {
            name: string
            type: ColumnType
            constraints: ColumnConstraint[]
          }[]
        }[]
      }
      message: string
    }
  | {
      action: 'renameTable'
      params: { tableName: string; newName: string }
      message: string
    }
  | {
      action: 'deleteTable'
      params: { tableName: string }
      message: string
    }
  | {
      action: 'addColumn'
      params: {
        tableName: string
        name: string
        type: ColumnType
        constraints: ColumnConstraint[]
      }
      message: string
    }
  | {
      action: 'updateColumn'
      params: {
        tableName: string
        columnName: string
        updates: Partial<Pick<Column, 'name' | 'type' | 'constraints'>>
      }
      message: string
    }
  | {
      action: 'deleteColumn'
      params: { tableName: string; columnName: string }
      message: string
    }
  | {
      action: 'addRelationship'
      params: {
        sourceTable: string
        sourceColumn: string
        targetTable: string
        targetColumn: string
        type: RelationshipType
      }
      message: string
    }
  | {
      action: 'addMultipleRelationships'
      params: {
        relationships: {
          sourceTable: string
          sourceColumn: string
          targetTable: string
          targetColumn: string
          type: RelationshipType
        }[]
      }
      message: string
    }
  | {
      action: 'updateRelationship'
      params: {
        relationshipId: string
        updates: { type?: RelationshipType }
      }
      message: string
    }
  | {
      action: 'deleteRelationship'
      params: { relationshipId: string }
      message: string
    }
  | {
      action: 'generateJunctionTable'
      params: { sourceTable: string; targetTable: string }
      message: string
    }
  | {
      action: 'resetSchema'
      params: Record<string, never>
      message: string
    }
  | {
      action: 'undo'
      params: { steps: number }
      message: string
    }
  | {
      action: 'redo'
      params: { steps: number }
      message: string
    }

// ---------------------------------------------------------------------------
// Store interface (subset of SchemaState used by applyAction)
// ---------------------------------------------------------------------------

interface SchemaStore {
  schema: Schema
  setSchema: (schema: Schema) => void
  addTable: (name: string, position: Position) => void
  addTableWithColumns: (
    name: string,
    position: Position,
    extraColumns: Omit<Column, 'id'>[]
  ) => void
  updateTable: (
    tableId: string,
    updates: Partial<{ name: string; position: Position }>
  ) => void
  removeTable: (tableId: string) => void
  addColumn: (tableId: string, column: Omit<Column, 'id'>) => void
  updateColumn: (
    tableId: string,
    columnId: string,
    updates: Partial<Pick<Column, 'name' | 'type' | 'constraints'>>
  ) => void
  removeColumn: (tableId: string, columnId: string) => void
  addRelationship: (rel: {
    source: { tableId: string; columnId: string }
    target: { tableId: string; columnId: string }
    type: RelationshipType
  }) => void
  updateRelationship: (
    relId: string,
    updates: Partial<{ type: RelationshipType }>
  ) => void
  removeRelationship: (relId: string) => void
  generateJunctionTable: (sourceTableId: string, targetTableId: string) => void
}

interface TemporalActions {
  undo: (steps?: number) => void
  redo: (steps?: number) => void
}

// ---------------------------------------------------------------------------
// Name-to-ID resolution
// ---------------------------------------------------------------------------

function resolveTable(schema: Schema, name: string) {
  return schema.tables.find((t) => t.name.toLowerCase() === name.toLowerCase())
}

function resolveColumn(schema: Schema, tableName: string, columnName: string) {
  const table = resolveTable(schema, tableName)
  if (!table) return null
  const column = table.columns.find(
    (c) => c.name.toLowerCase() === columnName.toLowerCase()
  )
  if (!column) return null
  return { tableId: table.id, columnId: column.id }
}

// ---------------------------------------------------------------------------
// Submit prompt to API
// ---------------------------------------------------------------------------

export async function submitPrompt(
  prompt: string,
  schema: Schema,
  selectedTableId: string | null,
  selectedRelationshipId: string | null
): Promise<{ actions: AiAction[]; text: string }> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      schema,
      selectedTableId,
      selectedRelationshipId,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error || `AI request failed (${res.status})`)
  }

  return res.json()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyAddRelationship(
  store: SchemaStore,
  params: {
    sourceTable: string
    sourceColumn: string
    targetTable: string
    targetColumn: string
    type: RelationshipType
  }
): void {
  const target = resolveColumn(
    store.schema,
    params.targetTable,
    params.targetColumn
  )
  if (!target) {
    console.warn('[applyAction] Could not resolve target column:', params)
    return
  }

  let source = resolveColumn(
    store.schema,
    params.sourceTable,
    params.sourceColumn
  )
  if (!source) {
    const sourceTable = resolveTable(store.schema, params.sourceTable)
    if (!sourceTable) {
      console.warn('[applyAction] Source table not found:', params.sourceTable)
      return
    }
    const targetTable = resolveTable(store.schema, params.targetTable)
    const targetCol = targetTable?.columns.find((c) => c.id === target.columnId)
    store.addColumn(sourceTable.id, {
      name: params.sourceColumn,
      type: targetCol?.type ?? ('INTEGER' as ColumnType),
      constraints: [
        'FOREIGN KEY' as ColumnConstraint,
        'NOT NULL' as ColumnConstraint,
      ],
    })
    // Re-resolve after creation (must use fresh state since store.schema is stale)
    source = resolveColumn(
      useSchemaStore.getState().schema,
      params.sourceTable,
      params.sourceColumn
    )
    if (!source) {
      console.warn('[applyAction] Failed to create FK column:', params)
      return
    }
  } else {
    // Column exists but may lack FOREIGN KEY constraint - add it
    const sourceTable = resolveTable(store.schema, params.sourceTable)
    const col = sourceTable?.columns.find((c) => c.id === source!.columnId)
    if (col && !col.constraints.includes('FOREIGN KEY' as ColumnConstraint)) {
      store.updateColumn(source.tableId, source.columnId, {
        constraints: [...col.constraints, 'FOREIGN KEY' as ColumnConstraint],
      })
    }
  }

  store.addRelationship({ source, target, type: params.type })
}

// ---------------------------------------------------------------------------
// Apply action to store (resolves names to IDs at apply time)
// ---------------------------------------------------------------------------

export function applyAction(
  store: SchemaStore,
  temporal: TemporalActions,
  action: AiAction,
  getPosition: () => Position
): void {
  switch (action.action) {
    case 'createTable':
      store.addTable(action.params.name, getPosition())
      break

    case 'createTableWithColumns':
      store.addTableWithColumns(
        action.params.name,
        getPosition(),
        action.params.columns
      )
      break

    case 'createMultipleTables':
      for (const t of action.params.tables) {
        store.addTableWithColumns(t.name, getPosition(), t.columns)
      }
      break

    case 'renameTable': {
      const table = resolveTable(store.schema, action.params.tableName)
      if (!table) {
        console.warn('[applyAction] Table not found:', action.params.tableName)
        break
      }
      store.updateTable(table.id, { name: action.params.newName })
      break
    }

    case 'deleteTable': {
      const table = resolveTable(store.schema, action.params.tableName)
      if (!table) {
        console.warn('[applyAction] Table not found:', action.params.tableName)
        break
      }
      store.removeTable(table.id)
      break
    }

    case 'addColumn': {
      const table = resolveTable(store.schema, action.params.tableName)
      if (!table) {
        console.warn('[applyAction] Table not found:', action.params.tableName)
        break
      }
      store.addColumn(table.id, {
        name: action.params.name,
        type: action.params.type,
        constraints: action.params.constraints,
      })
      break
    }

    case 'updateColumn': {
      const resolved = resolveColumn(
        store.schema,
        action.params.tableName,
        action.params.columnName
      )
      if (!resolved) {
        console.warn('[applyAction] Column not found:', action.params)
        break
      }
      store.updateColumn(
        resolved.tableId,
        resolved.columnId,
        action.params.updates
      )
      break
    }

    case 'deleteColumn': {
      const resolved = resolveColumn(
        store.schema,
        action.params.tableName,
        action.params.columnName
      )
      if (!resolved) {
        console.warn('[applyAction] Column not found:', action.params)
        break
      }
      store.removeColumn(resolved.tableId, resolved.columnId)
      break
    }

    case 'addRelationship':
      applyAddRelationship(store, action.params)
      break

    case 'addMultipleRelationships':
      for (const rel of action.params.relationships) {
        applyAddRelationship(store, rel)
      }
      break

    case 'updateRelationship':
      store.updateRelationship(
        action.params.relationshipId,
        action.params.updates
      )
      break

    case 'deleteRelationship':
      store.removeRelationship(action.params.relationshipId)
      break

    case 'generateJunctionTable': {
      const srcTable = resolveTable(store.schema, action.params.sourceTable)
      const tgtTable = resolveTable(store.schema, action.params.targetTable)
      if (!srcTable || !tgtTable) {
        console.warn(
          '[applyAction] Tables not found for junction:',
          action.params
        )
        break
      }
      store.generateJunctionTable(srcTable.id, tgtTable.id)
      break
    }

    case 'resetSchema':
      store.setSchema(createEmptySchema())
      break

    case 'undo':
      temporal.undo(action.params.steps)
      break

    case 'redo':
      temporal.redo(action.params.steps)
      break
  }
}
