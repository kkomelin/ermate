import { tool } from 'ai'
import { z } from 'zod'

export const addRelationship = tool({
  description:
    'Create a foreign key relationship between two tables. Source is the FK side, target is the PK side. Use table and column NAMES (not IDs).',
  inputSchema: z.object({
    sourceTable: z.string().describe('Name of the table with the foreign key'),
    sourceColumn: z.string().describe('Name of the FK column'),
    targetTable: z
      .string()
      .describe('Name of the table being referenced (PK side)'),
    targetColumn: z.string().describe('Name of the referenced PK column'),
    type: z.enum(['1:1', '1:N', 'N:M']).describe('Relationship cardinality'),
  }),
  execute: async ({
    sourceTable,
    sourceColumn,
    targetTable,
    targetColumn,
    type,
  }) => ({
    action: 'addRelationship' as const,
    params: {
      sourceTable,
      sourceColumn,
      targetTable,
      targetColumn,
      type,
    },
    message: `Created ${type} relationship: ${sourceTable}.${sourceColumn} -> ${targetTable}.${targetColumn}`,
  }),
})

export const addMultipleRelationships = tool({
  description:
    'Create multiple foreign key relationships at once. Source is the FK side, target is the PK side. Use table and column NAMES (not IDs). Prefer this over calling addRelationship multiple times.',
  inputSchema: z.object({
    relationships: z
      .array(
        z.object({
          sourceTable: z
            .string()
            .describe('Name of the table with the foreign key'),
          sourceColumn: z.string().describe('Name of the FK column'),
          targetTable: z
            .string()
            .describe('Name of the table being referenced (PK side)'),
          targetColumn: z.string().describe('Name of the referenced PK column'),
          type: z
            .enum(['1:1', '1:N', 'N:M'])
            .describe('Relationship cardinality'),
        })
      )
      .describe('List of relationships to create'),
  }),
  execute: async ({ relationships }) => ({
    action: 'addMultipleRelationships' as const,
    params: { relationships },
    message: `Created ${relationships.length} relationships`,
  }),
})

export const updateRelationship = tool({
  description: 'Modify an existing relationship.',
  inputSchema: z.object({
    relationshipId: z.string().describe('ID of the relationship'),
    updates: z.object({
      type: z.enum(['1:1', '1:N', 'N:M']).optional(),
    }),
  }),
  execute: async ({ relationshipId, updates }) => ({
    action: 'updateRelationship' as const,
    params: { relationshipId, updates },
    message: `Updated relationship`,
  }),
})

export const deleteRelationship = tool({
  description: 'Remove a relationship.',
  inputSchema: z.object({
    relationshipId: z.string().describe('ID of the relationship to remove'),
  }),
  execute: async ({ relationshipId }) => ({
    action: 'deleteRelationship' as const,
    params: { relationshipId },
    message: `Deleted relationship`,
  }),
})

export const generateJunctionTable = tool({
  description:
    'Create a junction table for a many-to-many (N:M) relationship between two tables. Use table NAMES (not IDs).',
  inputSchema: z.object({
    sourceTable: z.string().describe('Name of the first table'),
    targetTable: z.string().describe('Name of the second table'),
  }),
  execute: async ({ sourceTable, targetTable }) => ({
    action: 'generateJunctionTable' as const,
    params: { sourceTable, targetTable },
    message: `Created junction table for ${sourceTable} and ${targetTable}`,
  }),
})
