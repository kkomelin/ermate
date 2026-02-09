import type {
  Column,
  Position,
  Relationship,
  Schema,
  Table,
  ValidationError,
} from '@/types/schema'
import { ColumnConstraint, ColumnType, RelationshipType } from '@/types/schema'

let counter = 0

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${++counter}`
}

export function createEmptySchema(): Schema {
  return { version: 1, tables: [], relationships: [] }
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export function addTable(
  schema: Schema,
  name: string,
  position: Position
): Schema {
  const table: Table = {
    id: uid('t'),
    name,
    position,
    columns: [
      {
        id: uid('c'),
        name: 'id',
        type: ColumnType.INTEGER,
        constraints: [ColumnConstraint.PRIMARY_KEY, ColumnConstraint.NOT_NULL],
      },
      {
        id: uid('c'),
        name: 'created_at',
        type: ColumnType.TIMESTAMP,
        constraints: [ColumnConstraint.NOT_NULL],
      },
      {
        id: uid('c'),
        name: 'updated_at',
        type: ColumnType.TIMESTAMP,
        constraints: [ColumnConstraint.NOT_NULL],
      },
    ],
  }
  return { ...schema, tables: [...schema.tables, table] }
}

export function addTableWithColumns(
  schema: Schema,
  name: string,
  position: Position,
  extraColumns: Omit<Column, 'id'>[]
): Schema {
  const table: Table = {
    id: uid('t'),
    name,
    position,
    columns: [
      {
        id: uid('c'),
        name: 'id',
        type: ColumnType.INTEGER,
        constraints: [ColumnConstraint.PRIMARY_KEY, ColumnConstraint.NOT_NULL],
      },
      ...extraColumns.map((col) => ({ ...col, id: uid('c') })),
      {
        id: uid('c'),
        name: 'created_at',
        type: ColumnType.TIMESTAMP,
        constraints: [ColumnConstraint.NOT_NULL],
      },
      {
        id: uid('c'),
        name: 'updated_at',
        type: ColumnType.TIMESTAMP,
        constraints: [ColumnConstraint.NOT_NULL],
      },
    ],
  }
  return { ...schema, tables: [...schema.tables, table] }
}

export function updateTable(
  schema: Schema,
  tableId: string,
  updates: Partial<Pick<Table, 'name' | 'position'>>
): Schema {
  return {
    ...schema,
    tables: schema.tables.map((t) =>
      t.id === tableId ? { ...t, ...updates } : t
    ),
  }
}

export function removeTable(schema: Schema, tableId: string): Schema {
  return {
    ...schema,
    tables: schema.tables.filter((t) => t.id !== tableId),
    relationships: schema.relationships.filter(
      (r) => r.source.tableId !== tableId && r.target.tableId !== tableId
    ),
  }
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

export function addColumn(
  schema: Schema,
  tableId: string,
  column: Omit<Column, 'id'>
): Schema {
  const newColumn: Column = { ...column, id: uid('c') }

  return {
    ...schema,
    tables: schema.tables.map((t) => {
      if (t.id !== tableId) return t

      let columns = [...t.columns, newColumn]

      // Enforce single PK: if new column is PK, strip PK from others
      if (newColumn.constraints.includes(ColumnConstraint.PRIMARY_KEY)) {
        columns = columns.map((c) =>
          c.id !== newColumn.id
            ? {
                ...c,
                constraints: c.constraints.filter(
                  (con) => con !== ColumnConstraint.PRIMARY_KEY
                ),
              }
            : c
        )
      }

      return { ...t, columns }
    }),
  }
}

export function updateColumn(
  schema: Schema,
  tableId: string,
  columnId: string,
  updates: Partial<Pick<Column, 'name' | 'type' | 'constraints'>>
): Schema {
  return {
    ...schema,
    tables: schema.tables.map((t) => {
      if (t.id !== tableId) return t

      let columns = t.columns.map((c) =>
        c.id === columnId ? { ...c, ...updates } : c
      )

      // Enforce single PK: if updated column now has PK, strip PK from others
      if (updates.constraints?.includes(ColumnConstraint.PRIMARY_KEY)) {
        columns = columns.map((c) =>
          c.id !== columnId
            ? {
                ...c,
                constraints: c.constraints.filter(
                  (con) => con !== ColumnConstraint.PRIMARY_KEY
                ),
              }
            : c
        )
      }

      return { ...t, columns }
    }),
  }
}

export function removeColumn(
  schema: Schema,
  tableId: string,
  columnId: string
): Schema {
  return {
    ...schema,
    tables: schema.tables.map((t) =>
      t.id === tableId
        ? { ...t, columns: t.columns.filter((c) => c.id !== columnId) }
        : t
    ),
    // Remove any relationships referencing this column
    relationships: schema.relationships.filter(
      (r) =>
        !(r.source.tableId === tableId && r.source.columnId === columnId) &&
        !(r.target.tableId === tableId && r.target.columnId === columnId)
    ),
  }
}

export function reorderColumns(
  schema: Schema,
  tableId: string,
  oldIndex: number,
  newIndex: number
): Schema {
  return {
    ...schema,
    tables: schema.tables.map((t) => {
      if (t.id !== tableId) return t

      const columns = [...t.columns]
      const [movedColumn] = columns.splice(oldIndex, 1)
      columns.splice(newIndex, 0, movedColumn)

      return { ...t, columns }
    }),
  }
}

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------

export function addRelationship(
  schema: Schema,
  rel: Omit<Relationship, 'id'>
): Schema {
  const relationship: Relationship = { ...rel, id: uid('r') }
  return {
    ...schema,
    relationships: [...schema.relationships, relationship],
  }
}

export function updateRelationship(
  schema: Schema,
  relId: string,
  updates: Partial<Pick<Relationship, 'type' | 'source' | 'target'>>
): Schema {
  return {
    ...schema,
    relationships: schema.relationships.map((r) =>
      r.id === relId ? { ...r, ...updates } : r
    ),
  }
}

export function removeRelationship(schema: Schema, relId: string): Schema {
  return {
    ...schema,
    relationships: schema.relationships.filter((r) => r.id !== relId),
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validate(schema: Schema): ValidationError[] {
  const errors: ValidationError[] = []
  const tableNames = new Set<string>()

  for (const table of schema.tables) {
    // Duplicate table names
    if (tableNames.has(table.name.toLowerCase())) {
      errors.push({
        type: 'error',
        tableId: table.id,
        message: `Duplicate table name: "${table.name}"`,
      })
    }
    tableNames.add(table.name.toLowerCase())

    // Missing primary key
    const pkColumns = table.columns.filter((c) =>
      c.constraints.includes(ColumnConstraint.PRIMARY_KEY)
    )
    if (pkColumns.length === 0 && table.columns.length > 0) {
      errors.push({
        type: 'warning',
        tableId: table.id,
        message: `Table "${table.name}" has no primary key`,
      })
    }

    // Duplicate column names within table
    const colNames = new Set<string>()
    for (const col of table.columns) {
      if (colNames.has(col.name.toLowerCase())) {
        errors.push({
          type: 'error',
          tableId: table.id,
          columnId: col.id,
          message: `Duplicate column name "${col.name}" in table "${table.name}"`,
        })
      }
      colNames.add(col.name.toLowerCase())
    }
  }

  // Orphaned relationship references
  for (const rel of schema.relationships) {
    const sourceTable = schema.tables.find((t) => t.id === rel.source.tableId)
    const targetTable = schema.tables.find((t) => t.id === rel.target.tableId)

    if (!sourceTable) {
      errors.push({
        type: 'error',
        relationshipId: rel.id,
        message: `Relationship references non-existent source table`,
      })
    } else if (!sourceTable.columns.find((c) => c.id === rel.source.columnId)) {
      errors.push({
        type: 'error',
        relationshipId: rel.id,
        message: `Relationship references non-existent source column in "${sourceTable.name}"`,
      })
    }

    if (!targetTable) {
      errors.push({
        type: 'error',
        relationshipId: rel.id,
        message: `Relationship references non-existent target table`,
      })
    } else if (!targetTable.columns.find((c) => c.id === rel.target.columnId)) {
      errors.push({
        type: 'error',
        relationshipId: rel.id,
        message: `Relationship references non-existent target column in "${targetTable.name}"`,
      })
    }
  }

  return errors
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getTable(schema: Schema, tableId: string): Table | undefined {
  return schema.tables.find((t) => t.id === tableId)
}

export function generateJunctionTable(
  schema: Schema,
  sourceTableId: string,
  targetTableId: string
): Schema {
  const sourceTable = getTable(schema, sourceTableId)
  const targetTable = getTable(schema, targetTableId)
  if (!sourceTable || !targetTable) return schema

  const sourcePk = sourceTable.columns.find((c) =>
    c.constraints.includes(ColumnConstraint.PRIMARY_KEY)
  )
  const targetPk = targetTable.columns.find((c) =>
    c.constraints.includes(ColumnConstraint.PRIMARY_KEY)
  )
  if (!sourcePk || !targetPk) return schema

  const junctionName = `${sourceTable.name}_${targetTable.name}`
  const midX = (sourceTable.position.x + targetTable.position.x) / 2
  const midY = (sourceTable.position.y + targetTable.position.y) / 2

  let result = addTable(schema, junctionName, { x: midX, y: midY + 100 })
  const junctionTable = result.tables[result.tables.length - 1]

  // Add FK columns to junction table
  const fkCol1: Omit<Column, 'id'> = {
    name: `${sourceTable.name}_id`,
    type: sourcePk.type,
    constraints: [ColumnConstraint.NOT_NULL],
  }
  result = addColumn(result, junctionTable.id, fkCol1)

  // Grab the just-added FK column (last in the list)
  const afterFk1 = getTable(result, junctionTable.id)!
  const jCol1 = afterFk1.columns[afterFk1.columns.length - 1]

  const fkCol2: Omit<Column, 'id'> = {
    name: `${targetTable.name}_id`,
    type: targetPk.type,
    constraints: [ColumnConstraint.NOT_NULL],
  }
  result = addColumn(result, junctionTable.id, fkCol2)

  const afterFk2 = getTable(result, junctionTable.id)!
  const jCol2 = afterFk2.columns[afterFk2.columns.length - 1]

  // Add relationships from junction to both tables
  result = addRelationship(result, {
    source: { tableId: junctionTable.id, columnId: jCol1.id },
    target: { tableId: sourceTableId, columnId: sourcePk.id },
    type: RelationshipType.ONE_TO_MANY,
  })

  result = addRelationship(result, {
    source: { tableId: junctionTable.id, columnId: jCol2.id },
    target: { tableId: targetTableId, columnId: targetPk.id },
    type: RelationshipType.ONE_TO_MANY,
  })

  return result
}
