import { tool } from 'ai'
import { z } from 'zod'

export const addColumn = tool({
  description: 'Add a column to an existing table. Use table NAME (not ID).',
  inputSchema: z.object({
    tableName: z.string().describe('Name of the table'),
    name: z.string().describe('Column name in snake_case'),
    type: z
      .enum(['VARCHAR', 'INTEGER', 'BOOLEAN', 'TEXT', 'TIMESTAMP'])
      .describe('Column data type'),
    constraints: z
      .array(z.enum(['PRIMARY KEY', 'FOREIGN KEY', 'NOT NULL', 'UNIQUE']))
      .describe('Column constraints'),
  }),
  execute: async ({ tableName, name, type, constraints }) => ({
    action: 'addColumn' as const,
    params: { tableName, name, type, constraints },
    message: `Added column "${name}" to ${tableName}`,
  }),
})

export const updateColumn = tool({
  description:
    'Modify an existing column (rename, change type, or update constraints). Use table and column NAMES (not IDs).',
  inputSchema: z.object({
    tableName: z.string().describe('Name of the table'),
    columnName: z.string().describe('Current name of the column to update'),
    updates: z.object({
      name: z.string().optional().describe('New column name'),
      type: z
        .enum(['VARCHAR', 'INTEGER', 'BOOLEAN', 'TEXT', 'TIMESTAMP'])
        .optional()
        .describe('New data type'),
      constraints: z
        .array(z.enum(['PRIMARY KEY', 'FOREIGN KEY', 'NOT NULL', 'UNIQUE']))
        .optional()
        .describe('New constraints (replaces existing)'),
    }),
  }),
  execute: async ({ tableName, columnName, updates }) => ({
    action: 'updateColumn' as const,
    params: { tableName, columnName, updates },
    message: `Updated column "${columnName}" in ${tableName}`,
  }),
})

export const deleteColumn = tool({
  description:
    'Remove a column and any relationships referencing it. Use table and column NAMES (not IDs).',
  inputSchema: z.object({
    tableName: z.string().describe('Name of the table'),
    columnName: z.string().describe('Name of the column to remove'),
  }),
  execute: async ({ tableName, columnName }) => ({
    action: 'deleteColumn' as const,
    params: { tableName, columnName },
    message: `Deleted column "${columnName}" from ${tableName}`,
  }),
})
