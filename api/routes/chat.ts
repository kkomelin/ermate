import { Hono } from 'hono'
import { generateText, stepCountIs } from 'ai'
import { getAuth } from '@clerk/hono'
import { tools } from '../tools/index.js'
import { buildSystemPrompt } from '../lib/system-prompt.js'
import { validatePrompt, checkRateLimit } from '../lib/guard.js'
import type { Schema } from '@/types/schema'

const chat = new Hono()

chat.post('/', async (c) => {
  const { prompt, schema, selectedTableId, selectedRelationshipId } =
    await c.req.json<{
      prompt: string
      schema: Schema
      selectedTableId: string | null
      selectedRelationshipId: string | null
    }>()

  const auth = getAuth(c)
  const userId = auth?.userId
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const rateCheck = checkRateLimit(userId)
  if (!rateCheck.ok) {
    return c.json({ error: rateCheck.error }, 429)
  }

  const validation = validatePrompt(prompt)
  if (!validation.ok) {
    return c.json({ error: validation.error }, 400)
  }

  try {
    const systemPrompt = buildSystemPrompt(
      schema,
      selectedTableId,
      selectedRelationshipId
    )
    const result = await generateText({
      model: 'deepseek/deepseek-v3.2',
      system: systemPrompt,
      prompt,
      tools,
      stopWhen: stepCountIs(10),
    })

    // Each step may contain tool results; collect all action descriptors
    // across all steps. The SDK wraps execute() return values in
    // { toolCallId, toolName, result: <our object> }.
    const actions = result.steps.flatMap((step) =>
      step.toolResults.map((tr) => tr.output)
    )

    return c.json({
      actions,
      text: result.text,
    })
  } catch (err) {
    console.error('[chat] error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

export { chat as chatRoute }
