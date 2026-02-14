import { Parser } from 'node-sql-parser'
import type { Alter, Create } from 'node-sql-parser'
import { computeDagreLayout } from '@/lib/layout'
import type { Column, Relationship, Schema, Table } from '@/types/schema'
import { ColumnConstraint, ColumnType, RelationshipType } from '@/types/schema'

const SCHEMA_VERSION = 1

type AST = Create | Alter | { type: string; [k: string]: unknown }

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function normalizeAST(ast: AST[] | AST): AST[] {
  return Array.isArray(ast) ? ast : [ast]
}

function getTableName(createTable: Create): string | null {
  const t = createTable.table
  if (!t) return null
  if (Array.isArray(t)) {
    const first = t[0]
    return first && 'table' in first ? first.table : null
  }
  return typeof t === 'object' && t !== null && 'table' in t ? t.table : null
}

/** Schema-qualified name (schema.table or db.table) when present, else table name. */
function getTableFullName(createTable: Create): string | null {
  const t = createTable.table
  if (!t) return null
  const first = Array.isArray(t) ? t[0] : t
  if (!first || typeof first !== 'object' || !('table' in first)) return null
  const row = first as { db?: string | null; table?: string; schema?: string }
  const table = row.table
  const schema = row.db ?? row.schema
  if (!table) return null
  return schema ? `${schema}.${table}` : table
}

function getColumnName(col: {
  column?:
    | string
    | { expr?: { column?: string; value?: string }; value?: string }
  table?: string | null
}): string {
  if (!col) return ''
  const c = col.column
  if (typeof c === 'string') return c
  if (c && typeof c === 'object') {
    const ex =
      (c as { expr?: { column?: string; value?: string }; value?: string })
        .expr ?? (c as { value?: string })
    // @ts-expect-error - type narrowing issue with union types
    if (ex && typeof ex.column === 'string') return ex.column
    if (ex && typeof ex === 'object' && 'value' in ex)
      return String((ex as { value?: string }).value ?? '')
  }
  return ''
}

function sqlTypeToColumnType(dataType: string): ColumnType {
  const upper = (dataType || '').toUpperCase()
  if (/^INT(EGER)?$|^BIGINT$|^SMALLINT$|^SERIAL$/i.test(upper))
    return ColumnType.INTEGER
  if (/^BOOL(EAN)?$/i.test(upper)) return ColumnType.BOOLEAN
  if (/^TEXT$|^CLOB$/i.test(upper)) return ColumnType.TEXT
  if (/^TIMESTAMP|^DATETIME|^DATE$|^TIME$/i.test(upper))
    return ColumnType.TIMESTAMP
  return ColumnType.VARCHAR
}

interface ParsedTable {
  name: string
  /** Schema-qualified name (e.g. public.users) when CREATE TABLE had schema/db; used to avoid linking to external refs like auth.users */
  fullName?: string
  columns: Array<{
    name: string
    type: ColumnType
    constraints: ColumnConstraint[]
    hasRef?: { table: string; column: string }
  }>
}

interface PendingFK {
  sourceTable: string
  sourceColumn: string
  targetTable: string
  targetColumn: string
  /** Normalized schema-qualified target (e.g. auth.users) for lookup; only add relationship if this exists in parsed tables */
  targetTableKey: string
  unique?: boolean
}

function extractCreateTables(statements: AST[]): ParsedTable[] {
  const tables: ParsedTable[] = []
  for (const stmt of statements) {
    if (stmt.type !== 'create') continue
    const create = stmt as Create
    if (create.keyword !== 'table') continue
    const tableName = getTableName(create)
    if (!tableName) continue
    const defs = create.create_definitions ?? []
    const columns: ParsedTable['columns'] = []
    for (const def of defs) {
      const d = def as {
        resource?: string
        column?: {
          column?:
            | string
            | { expr?: { column?: string; value?: string }; value?: string }
          table?: string | null
        }
        definition?: { dataType?: string }
        primary?: string
        primary_key?: string
        unique?: string
        unique_key?: string
        nullable?: { type?: string; value?: string }
        reference_definition?: {
          table?: string | { table?: string } | Array<{ table?: string }>
          definition?: Array<{
            column?: string | { expr?: { value?: string }; value?: string }
          }>
        }
      }
      if (d.resource === 'column') {
        const colName = getColumnName(
          d.column as Parameters<typeof getColumnName>[0]
        )
        if (!colName) continue
        const dataType = d.definition?.dataType ?? 'varchar'
        const constraints: ColumnConstraint[] = []
        if (d.primary ?? d.primary_key)
          constraints.push(ColumnConstraint.PRIMARY_KEY)
        if (d.unique ?? d.unique_key) constraints.push(ColumnConstraint.UNIQUE)
        const nullable = d.nullable
        if (
          nullable &&
          (nullable.value === 'not null' || nullable.type === 'not null')
        ) {
          constraints.push(ColumnConstraint.NOT_NULL)
        }
        let hasRef: { table: string; column: string } | undefined
        const ref = d.reference_definition
        if (ref) {
          const refTableArr = Array.isArray(ref.table)
            ? ref.table
            : ref.table
              ? [ref.table]
              : []
          const refTable =
            refTableArr[0] &&
            typeof refTableArr[0] === 'object' &&
            'table' in refTableArr[0]
              ? (refTableArr[0] as { table?: string }).table
              : undefined
          const refDef = ref.definition
          const firstRefCol =
            Array.isArray(refDef) && refDef[0] ? refDef[0].column : undefined
          const refColName =
            typeof firstRefCol === 'string'
              ? firstRefCol
              : firstRefCol &&
                  typeof firstRefCol === 'object' &&
                  'expr' in firstRefCol
                ? (firstRefCol as { expr?: { value?: string } }).expr?.value
                : firstRefCol &&
                    typeof firstRefCol === 'object' &&
                    'value' in firstRefCol
                  ? (firstRefCol as { value?: string }).value
                  : undefined
          if (refTable && refColName) {
            hasRef = { table: refTable, column: String(refColName) }
          }
        }
        columns.push({
          name: colName,
          type: sqlTypeToColumnType(dataType),
          constraints,
          hasRef,
        })
      }
    }
    // Apply table-level CONSTRAINT PRIMARY KEY and UNIQUE to columns
    for (const def of defs) {
      const d = def as {
        resource?: string
        constraint_type?: string
        definition?: Array<{ column?: unknown }>
      }
      if (d.resource !== 'constraint') continue
      const ctype = String(d.constraint_type ?? '').toUpperCase()
      if (
        ctype !== 'PRIMARY KEY' &&
        ctype !== 'UNIQUE' &&
        ctype !== 'UNIQUE KEY' &&
        ctype !== 'UNIQUE INDEX'
      )
        continue
      const defList = Array.isArray(d.definition) ? d.definition : []
      const constraintToAdd =
        ctype === 'PRIMARY KEY'
          ? ColumnConstraint.PRIMARY_KEY
          : ColumnConstraint.UNIQUE
      for (const item of defList) {
        const colName = getRefColumnName((item as { column?: unknown }).column)
        if (!colName) continue
        const col = columns.find((c) => c.name === colName)
        if (col && !col.constraints.includes(constraintToAdd))
          col.constraints.push(constraintToAdd)
      }
    }
    const fullName = getTableFullName(create)
    tables.push({
      name: tableName,
      fullName: fullName ?? undefined,
      columns,
    })
  }
  return tables
}

/** Extract FOREIGN KEY constraints from CREATE TABLE create_definitions (pg_dump style). */
function extractCreateTableFKs(statements: AST[]): PendingFK[] {
  const fks: PendingFK[] = []
  for (const stmt of statements) {
    if (stmt.type !== 'create') continue
    const create = stmt as Create
    if (create.keyword !== 'table') continue
    const sourceTable = getTableName(create)
    if (!sourceTable) continue
    const defs = create.create_definitions ?? []
    for (const def of defs) {
      const d = def as {
        resource?: string
        constraint_type?: string
        definition?: Array<{ column?: unknown }>
        reference_definition?: {
          table?: unknown
          definition?: Array<{ column?: unknown }>
        }
      }
      if (d.resource !== 'constraint') continue
      if (String(d.constraint_type ?? '').toUpperCase() !== 'FOREIGN KEY')
        continue
      const ref = d.reference_definition
      const srcDef = d.definition
      if (!ref || !srcDef?.length) continue
      const targetTable = getRefTable(ref)
      const targetDef = Array.isArray(ref.definition) ? ref.definition : []
      const targetColName = getRefColumnName(targetDef[0]?.column)
      const sourceColName = getRefColumnName(srcDef[0]?.column)
      if (targetTable && sourceColName && targetColName) {
        const targetTableKey = normalizeIdentifier(
          getRefTableFull(ref) ?? targetTable
        )
        fks.push({
          sourceTable,
          sourceColumn: sourceColName,
          targetTable,
          targetColumn: targetColName,
          targetTableKey,
          unique: false,
        })
      }
    }
  }
  return fks
}

function extractAlterFKs(statements: AST[]): PendingFK[] {
  const fks: PendingFK[] = []
  for (const stmt of statements) {
    if (stmt.type !== 'alter') continue
    const alter = stmt as Alter
    const tableList = alter.table
    if (!tableList || !tableList.length) continue
    const sourceTable =
      tableList[0] && 'table' in tableList[0] ? tableList[0].table : null
    if (!sourceTable) continue
    const expr = alter.expr
    const exprList = Array.isArray(expr) ? expr : expr ? [expr] : []
    for (const e of exprList) {
      const ex = e as {
        resource?: string
        create_definitions?:
          | {
              constraint_type?: string
              definition?: Array<{ column?: unknown }>
              reference_definition?: {
                table?: unknown
                definition?: Array<{ column?: unknown }>
              }
            }
          | Array<{
              constraint_type?: string
              definition?: Array<{ column?: unknown }>
              reference_definition?: {
                table?: unknown
                definition?: Array<{ column?: unknown }>
              }
            }>
      }
      if (ex.resource?.toLowerCase() !== 'constraint') continue
      const rawDef = ex.create_definitions
      const defList = Array.isArray(rawDef) ? rawDef : rawDef ? [rawDef] : []
      for (const def of defList) {
        if (
          String(
            (def as { constraint_type?: string }).constraint_type ?? ''
          ).toUpperCase() !== 'FOREIGN KEY'
        )
          continue
        const constraint = def as {
          definition?: Array<{ column?: unknown }>
          reference_definition?: {
            table?: unknown
            definition?: Array<{ column?: unknown }>
          }
        }
        const ref = constraint.reference_definition
        const srcDef = constraint.definition
        if (!ref || !srcDef?.length) continue
        const targetTable = getRefTable(ref)
        const targetDef = Array.isArray(ref.definition) ? ref.definition : []
        const targetColName = getRefColumnName(targetDef[0]?.column)
        const sourceColName = getRefColumnName(srcDef[0]?.column)
        if (targetTable && sourceColName && targetColName) {
          const targetTableKey = normalizeIdentifier(
            getRefTableFull(ref) ?? targetTable
          )
          fks.push({
            sourceTable,
            sourceColumn: sourceColName,
            targetTable,
            targetColumn: targetColName,
            targetTableKey,
            unique: false,
          })
        }
      }
    }
  }
  return fks
}

function buildSchema(
  parsedTables: ParsedTable[],
  alterFKs: PendingFK[]
): Schema {
  const tableNameToId = new Map<string, string>()
  const tableIdToTable = new Map<string, Table>()
  const columnKeyToId = new Map<string, string>()

  for (const pt of parsedTables) {
    const tableId = uid('t')
    const tableKey = normalizeIdentifier(pt.fullName ?? pt.name)
    tableNameToId.set(tableKey, tableId)
    if (pt.fullName) tableNameToId.set(normalizeIdentifier(pt.name), tableId)
    const columns: Column[] = pt.columns.map((col) => {
      const colId = uid('c')
      const key = `${pt.name}.${col.name}`
      columnKeyToId.set(normalizeIdentifier(key), colId)
      return {
        id: colId,
        name: col.name,
        type: col.type,
        constraints: col.hasRef
          ? [...col.constraints, ColumnConstraint.FOREIGN_KEY]
          : col.constraints,
      }
    })
    const table: Table = {
      id: tableId,
      name: pt.name,
      position: { x: 0, y: 0 },
      columns,
    }
    tableIdToTable.set(tableId, table)
  }

  const relationships: Relationship[] = []
  const seenRels = new Set<string>()

  function addRelationship(
    sourceTableId: string,
    sourceColumnId: string,
    targetTableId: string,
    targetColumnId: string,
    unique: boolean
  ) {
    const key = `${sourceTableId}:${sourceColumnId}->${targetTableId}:${targetColumnId}`
    if (seenRels.has(key)) return
    seenRels.add(key)
    relationships.push({
      id: uid('r'),
      source: { tableId: sourceTableId, columnId: sourceColumnId },
      target: { tableId: targetTableId, columnId: targetColumnId },
      type: unique ? RelationshipType.ONE_TO_ONE : RelationshipType.ONE_TO_MANY,
    })
  }

  for (const pt of parsedTables) {
    const sourceTableId = tableNameToId.get(
      normalizeIdentifier(pt.fullName ?? pt.name)
    )
    if (!sourceTableId) continue
    const table = tableIdToTable.get(sourceTableId)!
    for (const col of pt.columns) {
      if (!col.hasRef) continue
      const targetTableId = tableNameToId.get(
        normalizeIdentifier(col.hasRef.table)
      )
      if (!targetTableId) continue
      const sourceCol = table.columns.find((c) => c.name === col.name)
      const targetTable = tableIdToTable.get(targetTableId)
      const targetCol = targetTable?.columns.find(
        (c) => c.name === col.hasRef!.column
      )
      if (sourceCol && targetCol) {
        addRelationship(
          sourceTableId,
          sourceCol.id,
          targetTableId,
          targetCol.id,
          col.constraints.includes(ColumnConstraint.UNIQUE)
        )
      }
    }
  }

  for (const fk of alterFKs) {
    const sourceTableId = tableNameToId.get(normalizeIdentifier(fk.sourceTable))
    const targetTableId = tableNameToId.get(fk.targetTableKey)
    if (!sourceTableId || !targetTableId) continue
    const sourceTable = tableIdToTable.get(sourceTableId)
    const targetTable = tableIdToTable.get(targetTableId)
    const sourceCol = sourceTable?.columns.find(
      (c) => c.name === fk.sourceColumn
    )
    const targetCol = targetTable?.columns.find(
      (c) => c.name === fk.targetColumn
    )
    if (sourceCol && targetCol) {
      if (!sourceCol.constraints.includes(ColumnConstraint.FOREIGN_KEY)) {
        sourceCol.constraints.push(ColumnConstraint.FOREIGN_KEY)
      }
      const isUnique =
        fk.unique === true ||
        sourceCol.constraints.includes(ColumnConstraint.UNIQUE)
      addRelationship(
        sourceTableId,
        sourceCol.id,
        targetTableId,
        targetCol.id,
        isUnique
      )
    }
  }

  const tables = Array.from(tableIdToTable.values())
  const positions = computeDagreLayout(tables, relationships)
  for (const t of tables) {
    const pos = positions.get(t.id)
    if (pos) t.position = pos
  }

  return {
    version: SCHEMA_VERSION,
    tables,
    relationships,
  }
}

function normalizeIdentifier(name: string): string {
  return name.replace(/^["`']|["`']$/g, '').toLowerCase()
}

/** Extract referenced table name (short) from ref.table. */
function getRefTable(
  ref: { table?: unknown } | null | undefined
): string | undefined {
  if (!ref || ref.table == null) return undefined
  const arr = Array.isArray(ref.table) ? ref.table : [ref.table]
  const first = arr[0]
  if (first && typeof first === 'object' && 'table' in first)
    return (first as { table?: string }).table
  return undefined
}

/** Schema-qualified ref table (e.g. auth.users) when ref has db/schema; else short name. Used to skip external tables. */
function getRefTableFull(
  ref: { table?: unknown } | null | undefined
): string | undefined {
  if (!ref || ref.table == null) return undefined
  const arr = Array.isArray(ref.table) ? ref.table : [ref.table]
  const first = arr[0]
  if (!first || typeof first !== 'object' || !('table' in first))
    return undefined
  const row = first as { db?: string | null; table?: string; schema?: string }
  const table = row.table
  const schema = row.db ?? row.schema
  if (!table) return undefined
  return schema ? `${schema}.${table}` : table
}

/** Extract column name from a column_ref (string or { expr?: { value?: string }, value?: string }) */
function getRefColumnName(col: unknown): string | undefined {
  if (col == null) return undefined
  if (typeof col === 'string') return col
  if (typeof col === 'object') {
    const o = col as { expr?: { value?: string }; value?: string }
    if (o.expr && typeof o.expr.value === 'string') return o.expr.value
    if (typeof o.value === 'string') return o.value
  }
  return undefined
}

const DIALECTS = ['PostgreSQL', 'MySQL', 'SQLite'] as const
export type SQLDialect = (typeof DIALECTS)[number]
export const SQL_DIALECTS: readonly SQLDialect[] = DIALECTS

/**
 * Parse a SQL string (DDL) and return an ERMate Schema.
 * Only CREATE TABLE and ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY are used;
 * INSERT, UPDATE, DELETE, CREATE INDEX, etc. are ignored.
 * @param sql - SQL DDL string
 * @param dialect - If set, use this dialect only; otherwise try PostgreSQL, then MySQL, then SQLite.
 */
export function fromSQL(sql: string, dialect?: SQLDialect): Schema {
  const trimmed = sql.trim()
  if (!trimmed) {
    return { version: SCHEMA_VERSION, tables: [], relationships: [] }
  }

  const toTry = dialect ? [dialect] : [...DIALECTS]
  let ast: AST[] | AST | null = null
  let lastError: Error | null = null
  for (const database of toTry) {
    try {
      const parser = new Parser()
      ast = parser.astify(trimmed, { database }) as AST[] | AST
      break
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
    }
  }
  if (ast === null) {
    throw lastError ?? new Error('Failed to parse SQL')
  }

  const statements = normalizeAST(ast)
  const parsedTables = extractCreateTables(statements)
  const createTableFKs = extractCreateTableFKs(statements)
  const alterFKs = extractAlterFKs(statements)
  const allFKs = [...createTableFKs, ...alterFKs]

  return buildSchema(parsedTables, allFKs)
}
