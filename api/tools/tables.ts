import { tool } from 'ai'
import { z } from 'zod'

export const createTable = tool({
  description:
    'Create a new database table with default columns (id, created_at, updated_at).',
  inputSchema: z.object({
    name: z.string().describe('Table name in snake_case'),
  }),
  execute: async ({ name }) => ({
    action: 'createTable' as const,
    params: { name },
    message: `Created table "${name}"`,
  }),
})

const columnSchema = z.object({
  name: z.string().describe('Column name in snake_case'),
  type: z
    .enum(['VARCHAR', 'INTEGER', 'BOOLEAN', 'TEXT', 'TIMESTAMP'])
    .describe('Column data type'),
  constraints: z
    .array(z.enum(['PRIMARY KEY', 'FOREIGN KEY', 'NOT NULL', 'UNIQUE']))
    .describe('Column constraints'),
})

export const createTableWithColumns = tool({
  description:
    'Create a new table with specified columns. Default columns (id, created_at, updated_at) are always added automatically, so do NOT include them.',
  inputSchema: z.object({
    name: z.string().describe('Table name in snake_case'),
    columns: z
      .array(columnSchema)
      .describe('Additional columns beyond the defaults'),
  }),
  execute: async ({ name, columns }) => ({
    action: 'createTableWithColumns' as const,
    params: { name, columns },
    message: `Created table "${name}" with ${columns.length} custom column${columns.length === 1 ? '' : 's'}`,
  }),
})

export const createMultipleTables = tool({
  description:
    'Create multiple tables at once, each with specified columns. Default columns (id, created_at, updated_at) are always added automatically, so do NOT include them. Prefer this over calling createTableWithColumns multiple times.',
  inputSchema: z.object({
    tables: z
      .array(
        z.object({
          name: z.string().describe('Table name in snake_case'),
          columns: z
            .array(columnSchema)
            .describe('Additional columns beyond the defaults'),
        })
      )
      .describe('List of tables to create'),
  }),
  execute: async ({ tables }) => ({
    action: 'createMultipleTables' as const,
    params: { tables },
    message: `Created ${tables.length} tables: ${tables.map((t) => t.name).join(', ')}`,
  }),
})

export const renameTable = tool({
  description: 'Rename an existing table. Use table NAME (not ID).',
  inputSchema: z.object({
    tableName: z.string().describe('Current name of the table to rename'),
    newName: z.string().describe('New table name in snake_case'),
  }),
  execute: async ({ tableName, newName }) => ({
    action: 'renameTable' as const,
    params: { tableName, newName },
    message: `Renamed table "${tableName}" to "${newName}"`,
  }),
})

export const deleteTable = tool({
  description:
    'Delete a table and all its relationships. Use table NAME (not ID).',
  inputSchema: z.object({
    tableName: z.string().describe('Name of the table to delete'),
  }),
  execute: async ({ tableName }) => ({
    action: 'deleteTable' as const,
    params: { tableName },
    message: `Deleted table "${tableName}"`,
  }),
})
