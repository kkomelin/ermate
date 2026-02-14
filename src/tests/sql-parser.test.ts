import { describe, it, expect } from 'vitest'
import { fromSQL } from '@/services/sql-parser'
import type { Table } from '@/types/schema'
import { ColumnConstraint, ColumnType, RelationshipType } from '@/types/schema'

function tableByName(schema: ReturnType<typeof fromSQL>, name: string) {
  return schema.tables.find((t) => t.name === name)
}

function columnByName(table: Table | undefined, name: string) {
  return table?.columns.find((c) => c.name === name)
}

describe('sql-parser', () => {
  describe('fromSQL', () => {
    it('returns empty schema for empty input', () => {
      const schema = fromSQL('')
      expect(schema.version).toBe(1)
      expect(schema.tables).toEqual([])
      expect(schema.relationships).toEqual([])
    })

    it('returns empty schema for whitespace-only input', () => {
      const schema = fromSQL('   \n\t  ')
      expect(schema.tables).toEqual([])
      expect(schema.relationships).toEqual([])
    })

    it('parses single CREATE TABLE with columns', () => {
      const sql = `
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          name TEXT
        );
      `
      const schema = fromSQL(sql)
      expect(schema.tables).toHaveLength(1)
      const users = tableByName(schema, 'users')
      expect(users).toBeDefined()
      expect(users!.columns).toHaveLength(3)
      expect(users!.columns.map((c) => c.name)).toEqual(['id', 'email', 'name'])
      expect(columnByName(users, 'id')?.type).toBe(ColumnType.INTEGER)
      expect(columnByName(users, 'id')?.constraints).toContain(
        ColumnConstraint.PRIMARY_KEY
      )
      expect(columnByName(users, 'email')?.type).toBe(ColumnType.VARCHAR)
      expect(columnByName(users, 'email')?.constraints).toContain(
        ColumnConstraint.NOT_NULL
      )
      expect(columnByName(users, 'name')?.type).toBe(ColumnType.TEXT)
    })

    it('maps SQL types to ColumnType', () => {
      const sql = `
        CREATE TABLE types (
          a INTEGER,
          b BIGINT,
          c BOOLEAN,
          d TEXT,
          e TIMESTAMP,
          f VARCHAR(100),
          g SERIAL,
          h DATE
        );
      `
      const schema = fromSQL(sql)
      const t = tableByName(schema, 'types')!
      expect(columnByName(t, 'a')?.type).toBe(ColumnType.INTEGER)
      expect(columnByName(t, 'b')?.type).toBe(ColumnType.INTEGER)
      expect(columnByName(t, 'c')?.type).toBe(ColumnType.BOOLEAN)
      expect(columnByName(t, 'd')?.type).toBe(ColumnType.TEXT)
      expect(columnByName(t, 'e')?.type).toBe(ColumnType.TIMESTAMP)
      expect(columnByName(t, 'f')?.type).toBe(ColumnType.VARCHAR)
      expect(columnByName(t, 'g')?.type).toBe(ColumnType.INTEGER)
      expect(columnByName(t, 'h')?.type).toBe(ColumnType.TIMESTAMP)
    })

    it('parses PRIMARY KEY, NOT NULL, UNIQUE constraints', () => {
      const sql = `
        CREATE TABLE items (
          id INT PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE
        );
      `
      const schema = fromSQL(sql)
      const items = tableByName(schema, 'items')!
      expect(columnByName(items, 'id')?.constraints).toContain(
        ColumnConstraint.PRIMARY_KEY
      )
      expect(columnByName(items, 'code')?.constraints).toContain(
        ColumnConstraint.NOT_NULL
      )
      expect(columnByName(items, 'code')?.constraints).toContain(
        ColumnConstraint.UNIQUE
      )
    })

    it('parses multiple tables with ALTER TABLE FOREIGN KEY', () => {
      const sql = `
        CREATE TABLE users (id INTEGER PRIMARY KEY, name VARCHAR(255));
        CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL);
        ALTER TABLE posts ADD CONSTRAINT fk_posts_user
          FOREIGN KEY (user_id) REFERENCES users (id);
      `
      const schema = fromSQL(sql)
      expect(schema.tables).toHaveLength(2)
      expect(schema.relationships).toHaveLength(1)
      const rel = schema.relationships[0]
      const users = tableByName(schema, 'users')!
      const posts = tableByName(schema, 'posts')!
      expect(rel.source.tableId).toBe(posts.id)
      expect(rel.target.tableId).toBe(users.id)
      expect(rel.type).toBe(RelationshipType.ONE_TO_MANY)
      const sourceCol = posts.columns.find((c) => c.id === rel.source.columnId)
      const targetCol = users.columns.find((c) => c.id === rel.target.columnId)
      expect(sourceCol?.name).toBe('user_id')
      expect(targetCol?.name).toBe('id')
    })

    it('parses CONSTRAINT PRIMARY KEY and FOREIGN KEY inside CREATE TABLE (pg_dump style)', () => {
      const sql = `
        CREATE TABLE public.users (
          id INT NOT NULL,
          CONSTRAINT users_pkey PRIMARY KEY (id)
        );
        CREATE TABLE public.posts (
          id INT NOT NULL,
          user_id INT NOT NULL,
          CONSTRAINT posts_pkey PRIMARY KEY (id),
          CONSTRAINT posts_user_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
        );
      `
      const schema = fromSQL(sql)
      expect(schema.tables).toHaveLength(2)
      const users = tableByName(schema, 'users')!
      const posts = tableByName(schema, 'posts')!
      expect(columnByName(users, 'id')?.constraints).toContain(
        ColumnConstraint.PRIMARY_KEY
      )
      expect(columnByName(posts, 'id')?.constraints).toContain(
        ColumnConstraint.PRIMARY_KEY
      )
      expect(columnByName(posts, 'user_id')?.constraints).toContain(
        ColumnConstraint.FOREIGN_KEY
      )
      expect(schema.relationships).toHaveLength(1)
      const rel = schema.relationships[0]
      expect(rel.source.tableId).toBe(posts.id)
      expect(rel.target.tableId).toBe(users.id)
      expect(
        posts.columns.find((c) => c.id === rel.source.columnId)?.name
      ).toBe('user_id')
    })

    it('parses inline REFERENCES as relationship', () => {
      const sql = `
        CREATE TABLE parent (id INT PRIMARY KEY);
        CREATE TABLE child (
          id INT PRIMARY KEY,
          parent_id INT REFERENCES parent(id)
        );
      `
      const schema = fromSQL(sql)
      expect(schema.tables).toHaveLength(2)
      expect(schema.relationships).toHaveLength(1)
      const rel = schema.relationships[0]
      const child = tableByName(schema, 'child')!
      const parent = tableByName(schema, 'parent')!
      expect(rel.source.tableId).toBe(child.id)
      expect(rel.target.tableId).toBe(parent.id)
      const fkCol = child.columns.find((c) => c.name === 'parent_id')
      expect(fkCol?.constraints).toContain(ColumnConstraint.FOREIGN_KEY)
    })

    it('applies table-level CONSTRAINT PRIMARY KEY to columns', () => {
      const sql = `
        CREATE TABLE public.users (
          id uuid NOT NULL,
          email text NOT NULL,
          CONSTRAINT users_pkey PRIMARY KEY (id)
        );
      `
      const schema = fromSQL(sql)
      const users = tableByName(schema, 'users')!
      const idCol = columnByName(users, 'id')
      expect(idCol?.constraints).toContain(ColumnConstraint.PRIMARY_KEY)
    })

    it('infers 1:1 when FK column is UNIQUE', () => {
      const sql = `
        CREATE TABLE users (id INT PRIMARY KEY);
        CREATE TABLE profiles (id INT PRIMARY KEY, user_id INT UNIQUE NOT NULL);
        ALTER TABLE profiles ADD CONSTRAINT fk_profiles_user
          FOREIGN KEY (user_id) REFERENCES users (id);
      `
      const schema = fromSQL(sql)
      expect(schema.relationships).toHaveLength(1)
      expect(schema.relationships[0].type).toBe(RelationshipType.ONE_TO_ONE)
    })

    it('ignores INSERT and other DML', () => {
      const sql = `
        CREATE TABLE t (id INT PRIMARY KEY);
        INSERT INTO t (id) VALUES (1);
        UPDATE t SET id = 2;
        DELETE FROM t;
      `
      const schema = fromSQL(sql)
      expect(schema.tables).toHaveLength(1)
      expect(tableByName(schema, 't')?.columns).toHaveLength(1)
    })

    it('handles IF NOT EXISTS', () => {
      const sql = 'CREATE TABLE IF NOT EXISTS foo (id INTEGER PRIMARY KEY);'
      const schema = fromSQL(sql)
      expect(tableByName(schema, 'foo')).toBeDefined()
      expect(tableByName(schema, 'foo')!.columns).toHaveLength(1)
    })

    it('handles quoted identifiers', () => {
      const sql = 'CREATE TABLE "my-table" ("col-name" INTEGER);'
      const schema = fromSQL(sql)
      expect(tableByName(schema, 'my-table')).toBeDefined()
      expect(
        columnByName(tableByName(schema, 'my-table'), 'col-name')
      ).toBeDefined()
    })

    it('assigns positions to tables (auto-layout)', () => {
      const sql = `
        CREATE TABLE a (id INT PRIMARY KEY);
        CREATE TABLE b (id INT PRIMARY KEY);
      `
      const schema = fromSQL(sql)
      for (const t of schema.tables) {
        expect(typeof t.position.x).toBe('number')
        expect(typeof t.position.y).toBe('number')
      }
    })

    it('throws on invalid SQL', () => {
      expect(() => fromSQL('NOT VALID SQL {{{')).toThrow()
    })

    it('does not add relationships to external schema tables (e.g. auth.users)', () => {
      const sql = `
        CREATE TABLE public.users (id INT NOT NULL, CONSTRAINT users_pkey PRIMARY KEY (id));
        CREATE TABLE public.api_keys (
          id INT NOT NULL,
          user_id INT NOT NULL,
          CONSTRAINT api_keys_pkey PRIMARY KEY (id),
          CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
        );
      `
      const schema = fromSQL(sql)
      expect(schema.tables).toHaveLength(2)
      expect(schema.relationships).toHaveLength(0)
    })

    it('adds relationships when target is in same schema (public)', () => {
      const sql = `
        CREATE TABLE public.users (id INT NOT NULL, CONSTRAINT users_pkey PRIMARY KEY (id));
        CREATE TABLE public.posts (
          id INT NOT NULL,
          user_id INT NOT NULL,
          CONSTRAINT posts_pkey PRIMARY KEY (id),
          CONSTRAINT posts_user_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
        );
      `
      const schema = fromSQL(sql)
      expect(schema.tables).toHaveLength(2)
      expect(schema.relationships).toHaveLength(1)
      expect(tableByName(schema, 'posts')).toBeDefined()
      expect(tableByName(schema, 'users')).toBeDefined()
    })

    it('produces valid schema shape (ids, version)', () => {
      const sql = `
        CREATE TABLE users (id INT PRIMARY KEY);
        CREATE TABLE posts (id INT, user_id INT REFERENCES users(id));
      `
      const schema = fromSQL(sql)
      expect(schema.version).toBe(1)
      for (const t of schema.tables) {
        expect(t.id).toBeTruthy()
        expect(t.name).toBeTruthy()
        expect(Array.isArray(t.columns)).toBe(true)
        for (const c of t.columns) {
          expect(c.id).toBeTruthy()
          expect(c.name).toBeTruthy()
          expect([
            'VARCHAR',
            'INTEGER',
            'BOOLEAN',
            'TEXT',
            'TIMESTAMP',
          ]).toContain(c.type)
          expect(Array.isArray(c.constraints)).toBe(true)
        }
      }
      for (const r of schema.relationships) {
        expect(r.id).toBeTruthy()
        expect(r.source.tableId).toBeTruthy()
        expect(r.source.columnId).toBeTruthy()
        expect(r.target.tableId).toBeTruthy()
        expect(r.target.columnId).toBeTruthy()
        expect([
          RelationshipType.ONE_TO_ONE,
          RelationshipType.ONE_TO_MANY,
        ]).toContain(r.type)
      }
    })

    it('previbe schema - skips external FK references to auth.users', () => {
      const sql = `
        CREATE TABLE public.api_keys (
          id uuid NOT NULL,
          user_id uuid NOT NULL,
          key_hash text NOT NULL UNIQUE,
          key_prefix text NOT NULL,
          CONSTRAINT api_keys_pkey PRIMARY KEY (id),
          CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
        );
        CREATE TABLE public.users (
          id uuid NOT NULL,
          email text NOT NULL,
          CONSTRAINT users_pkey PRIMARY KEY (id)
        );
      `
      const schema = fromSQL(sql)
      // Should have both tables
      expect(schema.tables).toHaveLength(2)
      expect(tableByName(schema, 'api_keys')).toBeDefined()
      expect(tableByName(schema, 'users')).toBeDefined()
      // Should have NO relationships since auth.users doesn't exist in the schema
      expect(schema.relationships).toHaveLength(0)
    })

    it('previbe schema - creates relationships for FKs within same schema', () => {
      const sql = `
        CREATE TABLE public.users (
          id uuid NOT NULL,
          email text NOT NULL,
          CONSTRAINT users_pkey PRIMARY KEY (id)
        );
        CREATE TABLE public.api_keys (
          id uuid NOT NULL,
          user_id uuid NOT NULL,
          key_hash text NOT NULL UNIQUE,
          CONSTRAINT api_keys_pkey PRIMARY KEY (id),
          CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
        );
      `
      const schema = fromSQL(sql)
      // Should have both tables
      expect(schema.tables).toHaveLength(2)
      expect(tableByName(schema, 'api_keys')).toBeDefined()
      expect(tableByName(schema, 'users')).toBeDefined()
      // Should have ONE relationship - api_keys.user_id -> users.id
      expect(schema.relationships).toHaveLength(1)
      const rel = schema.relationships[0]
      const apiKeys = tableByName(schema, 'api_keys')!
      const users = tableByName(schema, 'users')!
      expect(rel.source.tableId).toBe(apiKeys.id)
      expect(rel.target.tableId).toBe(users.id)
      expect(
        apiKeys.columns.find((c) => c.id === rel.source.columnId)?.name
      ).toBe('user_id')
      expect(
        users.columns.find((c) => c.id === rel.target.columnId)?.name
      ).toBe('id')
    })
  })
})
