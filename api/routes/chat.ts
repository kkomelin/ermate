import type { Schema } from '@/types/schema'
import { buildSystemPrompt } from '@api/lib/system-prompt'
import { tools } from '@api/tools/index'
import { generateText, stepCountIs } from 'ai'
import { Hono } from 'hono'

const chat = new Hono()

chat.post('/', async (c) => {
  const { prompt, schema, selectedTableId, selectedRelationshipId } =
    await c.req.json<{
      prompt: string
      schema: Schema
      selectedTableId: string | null
      selectedRelationshipId: string | null
    }>()

  if (!prompt?.trim()) {
    return c.json({ error: 'Prompt is required' }, 400)
  }

  try {
    const systemPrompt = buildSystemPrompt(
      schema,
      selectedTableId,
      selectedRelationshipId
    )
    console.log('[chat] system prompt:\n', systemPrompt)
    console.log('[chat] user prompt:', prompt)

    const result = await generateText({
      model: 'deepseek/deepseek-v3.2',
      system: systemPrompt,
      prompt,
      tools,
      stopWhen: stepCountIs(10),
    })

    console.log('[chat] steps:', result.steps.length)
    for (const [i, step] of result.steps.entries()) {
      console.log(
        `[chat] step ${i}: toolCalls=`,
        JSON.stringify(step.toolCalls, null, 2)
      )
      console.log(
        `[chat] step ${i}: toolResults=`,
        JSON.stringify(step.toolResults, null, 2)
      )
    }
    console.log('[chat] final text:', result.text)

    // Each step may contain tool results; collect all action descriptors
    // across all steps. The SDK wraps execute() return values in
    // { toolCallId, toolName, result: <our object> }.
    const actions = result.steps.flatMap((step) =>
      step.toolResults.map((tr) => tr.output)
    )

    console.log('[chat] actions:', JSON.stringify(actions, null, 2))

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
