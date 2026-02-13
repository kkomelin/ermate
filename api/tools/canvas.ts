import { tool } from 'ai'
import { z } from 'zod'

export const resetSchema = tool({
  description:
    'Remove all tables and relationships from the canvas at once. Use when the user wants to start fresh or clear everything.',
  inputSchema: z.object({}),
  execute: async () => ({
    action: 'resetSchema' as const,
    params: {},
    message: 'Cleared all tables and relationships from the canvas',
  }),
})
