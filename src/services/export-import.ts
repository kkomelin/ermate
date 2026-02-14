import type { Schema, Table } from '@/types/schema'
import { ColumnConstraint, ColumnType } from '@/types/schema'
import { fromSQL, type SQLDialect } from './sql-parser'

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

export function toJSON(schema: Schema): string {
  return JSON.stringify(schema, null, 2)
}

export function fromJSON(json: string): Schema {
  const parsed = JSON.parse(json)

  if (!parsed || typeof parsed.version !== 'number') {
    throw new Error('Invalid schema: missing version')
  }
  if (!Array.isArray(parsed.tables)) {
    throw new Error('Invalid schema: missing tables array')
  }
  if (!Array.isArray(parsed.relationships)) {
    throw new Error('Invalid schema: missing relationships array')
  }

  return parsed as Schema
}

// ---------------------------------------------------------------------------
// SQL DDL
// ---------------------------------------------------------------------------

function sqlType(type: ColumnType): string {
  switch (type) {
    case ColumnType.VARCHAR:
      return 'VARCHAR(255)'
    case ColumnType.INTEGER:
      return 'INTEGER'
    case ColumnType.BOOLEAN:
      return 'BOOLEAN'
    case ColumnType.TEXT:
      return 'TEXT'
    case ColumnType.TIMESTAMP:
      return 'TIMESTAMP'
    default:
      return type
  }
}

function sqlConstraints(constraints: ColumnConstraint[]): string {
  const parts: string[] = []
  if (constraints.includes(ColumnConstraint.PRIMARY_KEY))
    parts.push('PRIMARY KEY')
  if (constraints.includes(ColumnConstraint.NOT_NULL)) parts.push('NOT NULL')
  if (constraints.includes(ColumnConstraint.UNIQUE)) parts.push('UNIQUE')
  return parts.join(' ')
}

function tableToSQL(table: Table): string {
  const lines = table.columns.map((col) => {
    const parts = [`  "${col.name}"`, sqlType(col.type)]
    const cons = sqlConstraints(col.constraints)
    if (cons) parts.push(cons)
    return parts.join(' ')
  })

  return `CREATE TABLE "${table.name}" (\n${lines.join(',\n')}\n);`
}

export function toSQL(schema: Schema): string {
  const statements: string[] = []

  // CREATE TABLE statements
  for (const table of schema.tables) {
    statements.push(tableToSQL(table))
  }

  // ALTER TABLE for foreign keys
  for (const rel of schema.relationships) {
    const sourceTable = schema.tables.find((t) => t.id === rel.source.tableId)
    const targetTable = schema.tables.find((t) => t.id === rel.target.tableId)
    const sourceCol = sourceTable?.columns.find(
      (c) => c.id === rel.source.columnId
    )
    const targetCol = targetTable?.columns.find(
      (c) => c.id === rel.target.columnId
    )

    if (sourceTable && targetTable && sourceCol && targetCol) {
      statements.push(
        `ALTER TABLE "${sourceTable.name}" ADD CONSTRAINT "fk_${sourceTable.name}_${sourceCol.name}" ` +
          `FOREIGN KEY ("${sourceCol.name}") REFERENCES "${targetTable.name}" ("${targetCol.name}");`
      )
    }
  }

  return statements.join('\n\n')
}

// ---------------------------------------------------------------------------
// File operations
// ---------------------------------------------------------------------------

export function downloadAsJSON(schema: Schema, filename?: string): void {
  const json = toJSON(schema)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? 'schema.json'
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadAsSQL(schema: Schema, filename?: string): void {
  const sql = toSQL(schema)
  const blob = new Blob([sql], { type: 'text/sql' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? 'schema.sql'
  a.click()
  URL.revokeObjectURL(url)
}

export async function importFromJSON(file: File): Promise<Schema> {
  const text = await file.text()
  return fromJSON(text)
}

export async function importFromSQL(
  file: File,
  dialect?: SQLDialect
): Promise<Schema> {
  const text = await file.text()
  return fromSQL(text, dialect)
}
