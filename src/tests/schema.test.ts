import { describe, it, expect } from 'vitest'
import {
  createEmptySchema,
  addTable,
  updateTable,
  removeTable,
  addColumn,
  updateColumn,
  removeColumn,
  reorderColumns,
  addRelationship,
  updateRelationship,
  removeRelationship,
  validate,
  getTable,
  generateJunctionTable,
} from '@/services/schema'
import type { Schema } from '@/types/schema'
import { ColumnConstraint, ColumnType, RelationshipType } from '@/types/schema'

function schemaWithTable() {
  return addTable(createEmptySchema(), 'users', { x: 0, y: 0 })
}

function schemaWithTableAndColumn() {
  // addTable already creates default columns (id, created_at, updated_at),
  // so the table already has a PK column out of the box.
  return schemaWithTable()
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

describe('tables', () => {
  it('creates an empty schema', () => {
    const s = createEmptySchema()
    expect(s.version).toBe(1)
    expect(s.tables).toEqual([])
    expect(s.relationships).toEqual([])
  })

  it('adds a table', () => {
    const s = schemaWithTable()
    expect(s.tables).toHaveLength(1)
    expect(s.tables[0].name).toBe('users')
    expect(s.tables[0].position).toEqual({ x: 0, y: 0 })
    // addTable creates default columns: id (PK), created_at, updated_at
    expect(s.tables[0].columns).toHaveLength(3)
    expect(s.tables[0].columns[0].name).toBe('id')
    expect(s.tables[0].columns[0].constraints).toContain(
      ColumnConstraint.PRIMARY_KEY
    )
    expect(s.tables[0].columns[1].name).toBe('created_at')
    expect(s.tables[0].columns[2].name).toBe('updated_at')
  })

  it('does not mutate the original schema', () => {
    const original = createEmptySchema()
    const updated = addTable(original, 'users', { x: 0, y: 0 })
    expect(original.tables).toHaveLength(0)
    expect(updated.tables).toHaveLength(1)
  })

  it('updates a table name', () => {
    const s = schemaWithTable()
    const tableId = s.tables[0].id
    const updated = updateTable(s, tableId, { name: 'accounts' })
    expect(updated.tables[0].name).toBe('accounts')
  })

  it('updates a table position', () => {
    const s = schemaWithTable()
    const tableId = s.tables[0].id
    const updated = updateTable(s, tableId, { position: { x: 100, y: 200 } })
    expect(updated.tables[0].position).toEqual({ x: 100, y: 200 })
  })

  it('removes a table', () => {
    const s = schemaWithTable()
    const tableId = s.tables[0].id
    const updated = removeTable(s, tableId)
    expect(updated.tables).toHaveLength(0)
  })

  it('removes related relationships when table is removed', () => {
    let s = schemaWithTable()
    s = addTable(s, 'posts', { x: 100, y: 0 })
    const t1 = s.tables[0]
    const t2 = s.tables[1]

    s = addColumn(s, t1.id, {
      name: 'id',
      type: ColumnType.INTEGER,
      constraints: [ColumnConstraint.PRIMARY_KEY],
    })
    s = addColumn(s, t2.id, {
      name: 'user_id',
      type: ColumnType.INTEGER,
      constraints: [],
    })

    const col1 = s.tables[0].columns[0]
    const col2 = s.tables[1].columns[0]

    s = addRelationship(s, {
      source: { tableId: t2.id, columnId: col2.id },
      target: { tableId: t1.id, columnId: col1.id },
      type: RelationshipType.ONE_TO_MANY,
    })

    expect(s.relationships).toHaveLength(1)
    const removed = removeTable(s, t1.id)
    expect(removed.relationships).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

describe('columns', () => {
  it('adds a column to a table', () => {
    const s = schemaWithTable()
    const tableId = s.tables[0].id
    const updated = addColumn(s, tableId, {
      name: 'email',
      type: ColumnType.VARCHAR,
      constraints: [ColumnConstraint.NOT_NULL],
    })
    const table = updated.tables[0]
    // 3 default columns + 1 added
    expect(table.columns).toHaveLength(4)
    expect(table.columns[3].name).toBe('email')
    expect(table.columns[3].type).toBe(ColumnType.VARCHAR)
    expect(table.columns[3].constraints).toContain(ColumnConstraint.NOT_NULL)
  })

  it('enforces single primary key on add', () => {
    let s = schemaWithTable()
    const tableId = s.tables[0].id

    s = addColumn(s, tableId, {
      name: 'uuid',
      type: ColumnType.VARCHAR,
      constraints: [ColumnConstraint.PRIMARY_KEY],
    })

    const table = s.tables[0]
    // 3 default + 1 added
    expect(table.columns).toHaveLength(4)
    // Default id column should have PK stripped
    expect(table.columns[0].constraints).not.toContain(
      ColumnConstraint.PRIMARY_KEY
    )
    // New uuid column should have PK
    expect(table.columns[3].constraints).toContain(ColumnConstraint.PRIMARY_KEY)
  })

  it('updates a column', () => {
    const s = schemaWithTableAndColumn()
    const tableId = s.tables[0].id
    const colId = s.tables[0].columns[0].id

    const updated = updateColumn(s, tableId, colId, {
      name: 'user_id',
      type: ColumnType.VARCHAR,
    })

    expect(updated.tables[0].columns[0].name).toBe('user_id')
    expect(updated.tables[0].columns[0].type).toBe(ColumnType.VARCHAR)
  })

  it('enforces single primary key on update', () => {
    let s = schemaWithTable()
    const tableId = s.tables[0].id

    // Add an email column without PK
    s = addColumn(s, tableId, {
      name: 'email',
      type: ColumnType.VARCHAR,
      constraints: [ColumnConstraint.NOT_NULL],
    })

    // Email is the last column (after 3 defaults)
    const emailColId = s.tables[0].columns[3].id

    // Update email to be PK
    s = updateColumn(s, tableId, emailColId, {
      constraints: [ColumnConstraint.PRIMARY_KEY, ColumnConstraint.NOT_NULL],
    })

    const table = s.tables[0]
    // Default id column should lose PK
    expect(table.columns[0].constraints).not.toContain(
      ColumnConstraint.PRIMARY_KEY
    )
    // Email column should have PK
    expect(table.columns[3].constraints).toContain(ColumnConstraint.PRIMARY_KEY)
  })

  it('removes a column', () => {
    const s = schemaWithTable()
    const tableId = s.tables[0].id
    const colId = s.tables[0].columns[0].id

    const updated = removeColumn(s, tableId, colId)
    // 3 default columns - 1 removed = 2
    expect(updated.tables[0].columns).toHaveLength(2)
  })

  it('removes relationships referencing a deleted column', () => {
    let s = schemaWithTable()
    s = addTable(s, 'posts', { x: 100, y: 0 })
    const t1 = s.tables[0]
    const t2 = s.tables[1]

    s = addColumn(s, t1.id, {
      name: 'id',
      type: ColumnType.INTEGER,
      constraints: [ColumnConstraint.PRIMARY_KEY],
    })
    s = addColumn(s, t2.id, {
      name: 'user_id',
      type: ColumnType.INTEGER,
      constraints: [],
    })

    const col1 = s.tables[0].columns[0]
    const col2 = s.tables[1].columns[0]

    s = addRelationship(s, {
      source: { tableId: t2.id, columnId: col2.id },
      target: { tableId: t1.id, columnId: col1.id },
      type: RelationshipType.ONE_TO_MANY,
    })

    expect(s.relationships).toHaveLength(1)
    s = removeColumn(s, t1.id, col1.id)
    expect(s.relationships).toHaveLength(0)
  })

  it('reorders columns within a table', () => {
    let s = schemaWithTable()
    const tableId = s.tables[0].id

    // Add two more columns for a total of 5
    s = addColumn(s, tableId, {
      name: 'email',
      type: ColumnType.VARCHAR,
      constraints: [],
    })
    s = addColumn(s, tableId, {
      name: 'name',
      type: ColumnType.VARCHAR,
      constraints: [],
    })

    const table = s.tables[0]
    expect(table.columns).toHaveLength(5)
    // Original order: id, created_at, updated_at, email, name

    // Move email (index 3) to position 1
    const updated = reorderColumns(s, tableId, 3, 1)
    const updatedTable = updated.tables[0]

    expect(updatedTable.columns[0].name).toBe('id')
    expect(updatedTable.columns[1].name).toBe('email') // Moved here
    expect(updatedTable.columns[2].name).toBe('created_at')
    expect(updatedTable.columns[3].name).toBe('updated_at')
    expect(updatedTable.columns[4].name).toBe('name')
  })

  it('reorders columns forward (lower to higher index)', () => {
    let s = schemaWithTable()
    const tableId = s.tables[0].id

    // Add email and name
    s = addColumn(s, tableId, {
      name: 'email',
      type: ColumnType.VARCHAR,
      constraints: [],
    })
    s = addColumn(s, tableId, {
      name: 'name',
      type: ColumnType.VARCHAR,
      constraints: [],
    })

    // Original: id, created_at, updated_at, email, name
    // Move id (index 0) to position 2
    const updated = reorderColumns(s, tableId, 0, 2)
    const updatedTable = updated.tables[0]

    expect(updatedTable.columns[0].name).toBe('created_at')
    expect(updatedTable.columns[1].name).toBe('updated_at')
    expect(updatedTable.columns[2].name).toBe('id') // Moved here
    expect(updatedTable.columns[3].name).toBe('email')
    expect(updatedTable.columns[4].name).toBe('name')
  })

  it('reorders columns does not affect other tables', () => {
    let s = schemaWithTable()
    s = addTable(s, 'posts', { x: 100, y: 0 })

    const table1Id = s.tables[0].id

    s = addColumn(s, table1Id, {
      name: 'email',
      type: ColumnType.VARCHAR,
      constraints: [],
    })

    // Original table1: id, created_at, updated_at, email
    const updated = reorderColumns(s, table1Id, 3, 1)

    // Table 1 should be reordered
    expect(updated.tables[0].columns[1].name).toBe('email')

    // Table 2 should remain unchanged
    expect(updated.tables[1].columns).toHaveLength(3)
    expect(updated.tables[1].columns[0].name).toBe('id')
  })

  it('reorders columns preserves column properties', () => {
    let s = schemaWithTable()
    const tableId = s.tables[0].id

    s = addColumn(s, tableId, {
      name: 'email',
      type: ColumnType.VARCHAR,
      constraints: [ColumnConstraint.UNIQUE, ColumnConstraint.NOT_NULL],
    })

    const emailCol = s.tables[0].columns[3]
    const updated = reorderColumns(s, tableId, 3, 0)

    const movedCol = updated.tables[0].columns[0]
    expect(movedCol.id).toBe(emailCol.id)
    expect(movedCol.name).toBe('email')
    expect(movedCol.type).toBe(ColumnType.VARCHAR)
    expect(movedCol.constraints).toContain(ColumnConstraint.UNIQUE)
    expect(movedCol.constraints).toContain(ColumnConstraint.NOT_NULL)
  })
})

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------

describe('relationships', () => {
  function schemaWithRelationship() {
    let s = schemaWithTable()
    s = addTable(s, 'posts', { x: 100, y: 0 })

    s = addColumn(s, s.tables[0].id, {
      name: 'id',
      type: ColumnType.INTEGER,
      constraints: [ColumnConstraint.PRIMARY_KEY],
    })
    s = addColumn(s, s.tables[1].id, {
      name: 'user_id',
      type: ColumnType.INTEGER,
      constraints: [],
    })

    const col1 = s.tables[0].columns[0]
    const col2 = s.tables[1].columns[0]

    s = addRelationship(s, {
      source: { tableId: s.tables[1].id, columnId: col2.id },
      target: { tableId: s.tables[0].id, columnId: col1.id },
      type: RelationshipType.ONE_TO_MANY,
    })

    return s
  }

  it('adds a relationship', () => {
    const s = schemaWithRelationship()
    expect(s.relationships).toHaveLength(1)
    expect(s.relationships[0].type).toBe(RelationshipType.ONE_TO_MANY)
  })

  it('updates a relationship type', () => {
    const s = schemaWithRelationship()
    const relId = s.relationships[0].id

    const updated = updateRelationship(s, relId, {
      type: RelationshipType.ONE_TO_ONE,
    })

    expect(updated.relationships[0].type).toBe(RelationshipType.ONE_TO_ONE)
  })

  it('removes a relationship', () => {
    const s = schemaWithRelationship()
    const relId = s.relationships[0].id

    const updated = removeRelationship(s, relId)
    expect(updated.relationships).toHaveLength(0)
    // Tables should remain
    expect(updated.tables).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('validate', () => {
  it('returns no errors for a valid schema', () => {
    const s = schemaWithTableAndColumn()
    const errors = validate(s)
    expect(errors).toHaveLength(0)
  })

  it('warns about tables without a primary key', () => {
    // Construct a table manually without a PK column
    const s: Schema = {
      version: 1,
      tables: [
        {
          id: 't1',
          name: 'users',
          position: { x: 0, y: 0 },
          columns: [
            {
              id: 'c1',
              name: 'email',
              type: ColumnType.VARCHAR,
              constraints: [],
            },
          ],
        },
      ],
      relationships: [],
    }

    const errors = validate(s)
    expect(errors).toHaveLength(1)
    expect(errors[0].type).toBe('warning')
    expect(errors[0].message).toContain('no primary key')
  })

  it('does not warn about empty tables (no columns)', () => {
    const s = schemaWithTable()
    const errors = validate(s)
    expect(errors).toHaveLength(0)
  })

  it('detects duplicate table names', () => {
    let s = schemaWithTable()
    s = addTable(s, 'users', { x: 100, y: 0 })

    const errors = validate(s)
    const dupes = errors.filter((e) => e.message.includes('Duplicate table'))
    expect(dupes).toHaveLength(1)
    expect(dupes[0].type).toBe('error')
  })

  it('detects duplicate table names case-insensitively', () => {
    let s = schemaWithTable()
    s = addTable(s, 'Users', { x: 100, y: 0 })

    const errors = validate(s)
    const dupes = errors.filter((e) => e.message.includes('Duplicate table'))
    expect(dupes).toHaveLength(1)
  })

  it('detects duplicate column names within a table', () => {
    let s = schemaWithTable()
    const tableId = s.tables[0].id

    // Add a duplicate "id" column (default already has one)
    s = addColumn(s, tableId, {
      name: 'id',
      type: ColumnType.VARCHAR,
      constraints: [],
    })

    const errors = validate(s)
    const dupes = errors.filter((e) => e.message.includes('Duplicate column'))
    expect(dupes).toHaveLength(1)
  })

  it('detects orphaned relationship references', () => {
    const s: Schema = {
      version: 1,
      tables: [],
      relationships: [
        {
          id: 'r1',
          source: { tableId: 'nonexistent', columnId: 'c1' },
          target: { tableId: 'nonexistent2', columnId: 'c2' },
          type: RelationshipType.ONE_TO_MANY,
        },
      ],
    }

    const errors = validate(s)
    expect(errors.length).toBeGreaterThanOrEqual(2)
    expect(errors.some((e) => e.message.includes('non-existent source'))).toBe(
      true
    )
    expect(errors.some((e) => e.message.includes('non-existent target'))).toBe(
      true
    )
  })
})

// ---------------------------------------------------------------------------
// Junction table generation
// ---------------------------------------------------------------------------

describe('generateJunctionTable', () => {
  it('creates a junction table with FK columns and relationships', () => {
    // Both tables already have default id PK from addTable
    let s = schemaWithTable()
    s = addTable(s, 'tags', { x: 200, y: 0 })

    const result = generateJunctionTable(s, s.tables[0].id, s.tables[1].id)

    // Should have 3 tables now
    expect(result.tables).toHaveLength(3)

    const junction = result.tables[2]
    expect(junction.name).toBe('users_tags')
    // 3 default columns + 2 FK columns
    expect(junction.columns).toHaveLength(5)
    expect(junction.columns[3].name).toBe('users_id')
    expect(junction.columns[4].name).toBe('tags_id')

    // Should have 2 relationships
    expect(result.relationships).toHaveLength(2)
  })

  it('returns schema unchanged if source table has no PK', () => {
    // Construct tables manually so source has no PK
    const s: Schema = {
      version: 1,
      tables: [
        {
          id: 't1',
          name: 'users',
          position: { x: 0, y: 0 },
          columns: [
            {
              id: 'c1',
              name: 'name',
              type: ColumnType.VARCHAR,
              constraints: [],
            },
          ],
        },
        {
          id: 't2',
          name: 'tags',
          position: { x: 200, y: 0 },
          columns: [
            {
              id: 'c2',
              name: 'id',
              type: ColumnType.INTEGER,
              constraints: [ColumnConstraint.PRIMARY_KEY],
            },
          ],
        },
      ],
      relationships: [],
    }

    const result = generateJunctionTable(s, 't1', 't2')
    expect(result.tables).toHaveLength(2)
  })

  it('returns schema unchanged for non-existent tables', () => {
    const s = createEmptySchema()
    const result = generateJunctionTable(s, 'fake1', 'fake2')
    expect(result).toEqual(s)
  })
})

// ---------------------------------------------------------------------------
// getTable helper
// ---------------------------------------------------------------------------

describe('getTable', () => {
  it('returns the table by id', () => {
    const s = schemaWithTable()
    const table = getTable(s, s.tables[0].id)
    expect(table).toBeDefined()
    expect(table!.name).toBe('users')
  })

  it('returns undefined for non-existent id', () => {
    const s = schemaWithTable()
    expect(getTable(s, 'nonexistent')).toBeUndefined()
  })
})
