import { toSQL } from '@/services/export-import'
import { fromSQL } from '@/services/sql-parser'
import { ColumnConstraint, ColumnType } from '@/types/schema'
import { describe, expect, it } from 'vitest'
import exportedSQL from './fixtures/test-schema-large-exported.sql?raw'
import importSQL from './fixtures/test-schema-large-for-import.sql?raw'

describe('SQL Round Trip - Schema Comparison', () => {
  it('parses both import and exported SQL files', () => {
    const importSchema = fromSQL(importSQL)
    const exportSchema = fromSQL(exportedSQL)

    // Both should parse the same number of tables and relationships
    expect(importSchema.tables).toHaveLength(42)
    expect(exportSchema.tables).toHaveLength(42)
    expect(importSchema.relationships).toHaveLength(58)
    expect(exportSchema.relationships).toHaveLength(58)
  })

  it('exports and re-imports produce same internal representation', () => {
    const importSchema = fromSQL(importSQL)

    // Export to SQL
    const exported = toSQL(importSchema, 'PostgreSQL')

    // Re-import
    const roundTripSchema = fromSQL(exported, 'PostgreSQL')

    // Compare table count
    expect(roundTripSchema.tables).toHaveLength(importSchema.tables.length)

    // Compare tables
    for (const originalTable of importSchema.tables) {
      const roundTripTable = roundTripSchema.tables.find(
        (t) => t.name === originalTable.name
      )
      expect(roundTripTable).toBeDefined()

      if (roundTripTable) {
        // Compare column count
        expect(roundTripTable.columns).toHaveLength(
          originalTable.columns.length
        )

        // Compare columns
        for (const originalCol of originalTable.columns) {
          const roundTripCol = roundTripTable.columns.find(
            (c) => c.name === originalCol.name
          )
          expect(roundTripCol).toBeDefined()

          if (roundTripCol) {
            // Compare types
            expect(roundTripCol.type).toBe(originalCol.type)

            // Compare constraints
            expect(roundTripCol.constraints.sort()).toEqual(
              originalCol.constraints.sort()
            )
          }
        }
      }
    }

    // Compare relationship count
    expect(roundTripSchema.relationships).toHaveLength(
      importSchema.relationships.length
    )
  })

  it('identifies specific data type losses', () => {
    const importSchema = fromSQL(importSQL)

    // Find columns with specific PostgreSQL types
    const originalImport = importSQL

    // UUID columns - should be mapped to VARCHAR (not ideal but current behavior)
    expect(originalImport).toContain('uuid')

    // Numeric columns - should be mapped to VARCHAR (not ideal but current behavior)
    expect(originalImport).toContain('numeric')

    // JSONB columns - should be mapped to VARCHAR (not ideal but current behavior)
    expect(originalImport).toContain('jsonb')

    // Check that exported SQL has VARCHAR for these
    const exported = toSQL(importSchema, 'PostgreSQL')
    expect(exported).toContain('VARCHAR(255)')
  })

  it('shows that DEFAULT values are not preserved', () => {
    const importSchema = fromSQL(importSQL)

    // The original SQL has DEFAULT values
    expect(importSQL).toContain('DEFAULT gen_random_uuid()')
    expect(importSQL).toContain('DEFAULT now()')
    expect(importSQL).toContain("DEFAULT 'pending'")
    expect(importSQL).toContain('DEFAULT false')

    // After export, DEFAULT values are lost
    const exported = toSQL(importSchema, 'PostgreSQL')
    expect(exported).not.toContain('DEFAULT gen_random_uuid()')
    expect(exported).not.toContain('DEFAULT now()')
    expect(exported).not.toContain("DEFAULT 'pending'")
    expect(exported).not.toContain('DEFAULT false')
  })

  it('shows that CHECK constraints are not preserved', () => {
    const importSchema = fromSQL(importSQL)

    // The original has a CHECK constraint
    expect(importSQL).toContain('CHECK (rating >= 1 AND rating <= 5)')

    // After export, CHECK constraint is lost
    const exported = toSQL(importSchema, 'PostgreSQL')
    expect(exported).not.toContain('CHECK')
  })

  it('shows that schema prefixes are not preserved in export', () => {
    const importSchema = fromSQL(importSQL)

    // The original uses public.* prefix
    expect(importSQL).toContain('public.users')
    expect(importSQL).toContain('public.categories')

    // After export, schema prefixes are lost
    const exported = toSQL(importSchema, 'PostgreSQL')
    expect(exported).not.toContain('public.')
  })

  it('shows precision/scale loss for numeric types', () => {
    const importSchema = fromSQL(importSQL)

    // Original has specific numeric types
    expect(importSQL).toMatch(/numeric/i)

    // After round-trip, all numeric become VARCHAR(255)
    // const exported = toSQL(importSchema, 'PostgreSQL')
    const priceCol = importSchema.tables
      .find((t) => t.name === 'products')
      ?.columns.find((c) => c.name === 'price')

    expect(priceCol?.type).toBe(ColumnType.VARCHAR) // Should ideally be something else
  })

  it('detailed comparison of a sample table', () => {
    const importSchema = fromSQL(importSQL)
    const originalUsers = importSchema.tables.find((t) => t.name === 'users')
    expect(originalUsers).toBeDefined()

    // Expected columns based on original SQL
    const expectedColumns = ['id', 'email', 'full_name', 'created_at']

    expect(originalUsers!.columns).toHaveLength(expectedColumns.length)
    expect(originalUsers!.columns.map((c) => c.name)).toEqual(expectedColumns)

    // Check constraints
    const idCol = originalUsers!.columns.find((c) => c.name === 'id')
    const emailCol = originalUsers!.columns.find((c) => c.name === 'email')

    expect(idCol?.constraints).toContain(ColumnConstraint.PRIMARY_KEY)
    expect(idCol?.constraints).toContain(ColumnConstraint.NOT_NULL)
    expect(emailCol?.constraints).toContain(ColumnConstraint.NOT_NULL)
    expect(emailCol?.constraints).toContain(ColumnConstraint.UNIQUE)
  })

  it('shows that timestamp with time zone is simplified to TIMESTAMP', () => {
    const importSchema = fromSQL(importSQL)

    // Original uses "timestamp with time zone"
    expect(importSQL).toContain('timestamp with time zone')

    // After parsing, it becomes TIMESTAMP type
    const usersTable = importSchema.tables.find((t) => t.name === 'users')
    const createdAtCol = usersTable?.columns.find(
      (c) => c.name === 'created_at'
    )
    expect(createdAtCol?.type).toBe(ColumnType.TIMESTAMP)
  })

  it('shows that boolean columns are correctly preserved', () => {
    const importSchema = fromSQL(importSQL)
    const exported = toSQL(importSchema, 'PostgreSQL')

    // Check boolean type preservation
    const addressesTable = importSchema.tables.find(
      (t) => t.name === 'addresses'
    )
    const isDefaultCol = addressesTable?.columns.find(
      (c) => c.name === 'is_default'
    )

    expect(isDefaultCol?.type).toBe(ColumnType.BOOLEAN)
    expect(exported).toContain('BOOLEAN')
  })

  it('relationship preservation check', () => {
    const importSchema = fromSQL(importSQL)

    // Check that all FK relationships are captured
    const expectedRelationships = [
      'products.category_id -> categories.id',
      'orders.user_id -> users.id',
      'order_items.order_id -> orders.id',
      'order_items.product_id -> products.id',
    ]

    for (const expected of expectedRelationships) {
      const [sourcePart, targetPart] = expected.split(' -> ')
      const [sourceTable, sourceCol] = sourcePart.split('.')
      const [targetTable, targetCol] = targetPart.split('.')

      const rel = importSchema.relationships.find((r) => {
        const srcTable = importSchema.tables.find(
          (t) => t.id === r.source.tableId
        )
        const tgtTable = importSchema.tables.find(
          (t) => t.id === r.target.tableId
        )
        const srcCol = srcTable?.columns.find((c) => c.id === r.source.columnId)
        const tgtCol = tgtTable?.columns.find((c) => c.id === r.target.columnId)

        return (
          srcTable?.name === sourceTable &&
          tgtTable?.name === targetTable &&
          srcCol?.name === sourceCol &&
          tgtCol?.name === targetCol
        )
      })

      expect(rel).toBeDefined()
    }
  })
})

// Summary of findings
describe('SQL Round Trip - Loss of Information Report', () => {
  it('reports: Data type precision loss', () => {
    /**
     * ISSUES:
     * 1. UUID -> VARCHAR(255): Postgres UUID is lost, becomes generic VARCHAR
     * 2. NUMERIC -> VARCHAR(255): Precision/scale info lost (e.g., NUMERIC(10,2))
     * 3. JSONB -> VARCHAR(255): Postgres JSONB becomes generic VARCHAR
     * 4. TIMESTAMP WITH TIME ZONE -> TIMESTAMP: Timezone info lost
     *
     * RECOMMENDATIONS:
     * - Add UUID type to ColumnType enum
     * - Add NUMERIC type with optional precision/scale
     * - Add JSON/JSONB type to ColumnType enum
     * - Preserve timezone information in TIMESTAMP type
     */
    expect(true).toBe(true)
  })

  it('reports: DEFAULT values not preserved', () => {
    /**
     * ISSUES:
     * - All DEFAULT expressions are lost during round-trip
     * - Examples lost: DEFAULT gen_random_uuid(), DEFAULT now(), DEFAULT 'pending'
     *
     * RECOMMENDATIONS:
     * - Add 'defaultValue' field to Column interface
     * - Store raw SQL expression for DEFAULT
     * - Include DEFAULT in SQL export
     */
    expect(true).toBe(true)
  })

  it('reports: CHECK constraints not preserved', () => {
    /**
     * ISSUES:
     * - CHECK constraints are completely lost
     * - Example: CHECK (rating >= 1 AND rating <= 5)
     *
     * RECOMMENDATIONS:
     * - Add CHECK constraint type to ColumnConstraint enum
     * - Add checkExpression field to Column interface
     * - Include CHECK in SQL export
     */
    expect(true).toBe(true)
  })

  it('reports: Schema qualifiers not preserved', () => {
    /**
     * ISSUES:
     * - Schema prefixes (public., auth., etc.) are dropped during export
     * - This can cause issues when re-importing to multi-schema databases
     *
     * RECOMMENDATIONS:
     * - Add 'schema' field to Table interface
     * - Include schema in SQL export when present
     * - Preserve schema info during parsing
     */
    expect(true).toBe(true)
  })

  it('reports: Column-level FK references lost during export', () => {
    /**
     * ISSUES:
     * - Import supports inline REFERENCES (col_name type REFERENCES table(col))
     * - Export always uses ALTER TABLE for FKs
     * - This is semantically correct but different style
     *
     * RECOMMENDATIONS:
     * - This is acceptable - ALTER TABLE is more standard for FKs
     * - Consider making it optional for backwards compatibility
     */
    expect(true).toBe(true)
  })
})
