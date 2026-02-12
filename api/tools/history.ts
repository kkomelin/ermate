import { tool } from 'ai'
import { z } from 'zod'

export const undo = tool({
  description:
    'Undo the last schema operation(s). Use when the user wants to revert recent changes.',
  inputSchema: z.object({
    steps: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(1)
      .describe('Number of steps to undo (default: 1)'),
  }),
  execute: async ({ steps }) => ({
    action: 'undo' as const,
    params: { steps },
    message: `Undid ${steps} operation${steps > 1 ? 's' : ''}`,
  }),
})

export const redo = tool({
  description:
    'Redo previously undone schema operation(s). Use when the user wants to restore reverted changes.',
  inputSchema: z.object({
    steps: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(1)
      .describe('Number of steps to redo (default: 1)'),
  }),
  execute: async ({ steps }) => ({
    action: 'redo' as const,
    params: { steps },
    message: `Redid ${steps} operation${steps > 1 ? 's' : ''}`,
  }),
})
