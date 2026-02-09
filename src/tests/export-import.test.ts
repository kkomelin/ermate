import { describe, it, expect } from 'vitest'
import { toJSON, fromJSON, toSQL } from '@/services/export-import'
import type { Schema } from '@/types/schema'
import { testSchema } from './fixtures'

// ---------------------------------------------------------------------------
// JSON round-trip
// ---------------------------------------------------------------------------

describe('JSON export/import', () => {
  it('exports schema to formatted JSON', () => {
    const json = toJSON(testSchema)
    expect(typeof json).toBe('string')
    const parsed = JSON.parse(json)
    expect(parsed).toEqual(testSchema)
  })

  it('round-trips a schema through JSON', () => {
    const json = toJSON(testSchema)
    const imported = fromJSON(json)
    expect(imported).toEqual(testSchema)
  })

  it('round-trips an empty schema', () => {
    const empty: Schema = { version: 1, tables: [], relationships: [] }
    const json = toJSON(empty)
    const imported = fromJSON(json)
    expect(imported).toEqual(empty)
  })

  it('throws on invalid JSON', () => {
    expect(() => fromJSON('not json')).toThrow()
  })

  it('throws on missing version', () => {
    expect(() =>
      fromJSON(JSON.stringify({ tables: [], relationships: [] }))
    ).toThrow('missing version')
  })

  it('throws on missing tables', () => {
    expect(() =>
      fromJSON(JSON.stringify({ version: 1, relationships: [] }))
    ).toThrow('missing tables')
  })

  it('throws on missing relationships', () => {
    expect(() => fromJSON(JSON.stringify({ version: 1, tables: [] }))).toThrow(
      'missing relationships'
    )
  })
})

// ---------------------------------------------------------------------------
// SQL DDL generation
// ---------------------------------------------------------------------------

describe('SQL export', () => {
  it('generates CREATE TABLE statements', () => {
    const sql = toSQL(testSchema)

    expect(sql).toContain('CREATE TABLE "users"')
    expect(sql).toContain('CREATE TABLE "posts"')
  })

  it('maps column types correctly', () => {
    const sql = toSQL(testSchema)

    expect(sql).toContain('INTEGER')
    expect(sql).toContain('VARCHAR(255)')
    expect(sql).toContain('BOOLEAN')
    expect(sql).toContain('TEXT')
    expect(sql).toContain('TIMESTAMP')
  })

  it('includes column constraints', () => {
    const sql = toSQL(testSchema)

    expect(sql).toContain('PRIMARY KEY')
    expect(sql).toContain('NOT NULL')
    expect(sql).toContain('UNIQUE')
  })

  it('generates ALTER TABLE for foreign keys', () => {
    const sql = toSQL(testSchema)

    expect(sql).toContain('ALTER TABLE "posts"')
    expect(sql).toContain('ADD CONSTRAINT')
    expect(sql).toContain('FOREIGN KEY ("user_id")')
    expect(sql).toContain('REFERENCES "users" ("id")')
  })

  it('generates valid constraint names', () => {
    const sql = toSQL(testSchema)
    expect(sql).toContain('"fk_posts_user_id"')
  })

  it('handles schema with no relationships', () => {
    const noRels: Schema = { ...testSchema, relationships: [] }
    const sql = toSQL(noRels)

    expect(sql).toContain('CREATE TABLE "users"')
    expect(sql).not.toContain('ALTER TABLE')
    expect(sql).not.toContain('FOREIGN KEY')
  })

  it('handles empty schema', () => {
    const empty: Schema = { version: 1, tables: [], relationships: [] }
    const sql = toSQL(empty)
    expect(sql).toBe('')
  })

  it('generates correct full SQL for users table', () => {
    const sql = toSQL(testSchema)

    // Check the users table has all columns
    expect(sql).toContain('"id" INTEGER PRIMARY KEY NOT NULL')
    expect(sql).toContain('"email" VARCHAR(255) NOT NULL UNIQUE')
    expect(sql).toContain('"name" VARCHAR(255)')
    expect(sql).toContain('"active" BOOLEAN NOT NULL')
    expect(sql).toContain('"bio" TEXT')
    expect(sql).toContain('"created_at" TIMESTAMP NOT NULL')
  })
})
