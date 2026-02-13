import { useCallback, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useSchemaStore, useTemporalStore } from './useSchemaStore'
import { submitPrompt, applyAction } from '@/services/ai'
import { computeDagreLayout } from '@/lib/layout'
import type { Position } from '@/types/schema'

export function useSchemaPrompt() {
  const undo = useTemporalStore((s) => s.undo)
  const redo = useTemporalStore((s) => s.redo)
  const { getViewport, fitView } = useReactFlow()

  const [isLoading, setIsLoading] = useState(false)
  const [lastMessage, setLastMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [msgKey, setMsgKey] = useState(0)

  // Same positioning logic as Toolbar's handleAddTable
  const getPosition = useCallback((): Position => {
    const { x, y, zoom } = getViewport()
    const centerX = (-x + window.innerWidth / 2) / zoom
    const centerY = (-y + window.innerHeight / 2) / zoom
    const offsetX = (Math.random() - 0.5) * 100
    const offsetY = (Math.random() - 0.5) * 100
    return {
      x: Math.round(centerX + offsetX),
      y: Math.round(centerY + offsetY),
    }
  }, [getViewport])

  const submit = useCallback(
    async (prompt: string): Promise<boolean> => {
      // Read fresh state at submission time
      const { schema, selectedTableId, selectedRelationshipId } =
        useSchemaStore.getState()

      setIsLoading(true)
      setLastMessage(null)
      try {
        const { actions, text } = await submitPrompt(
          prompt,
          schema,
          selectedTableId,
          selectedRelationshipId
        )

        const hasCreateActions = actions.some(
          (a) =>
            a &&
            (a.action === 'createTable' ||
              a.action === 'createTableWithColumns' ||
              a.action === 'createMultipleTables')
        )

        for (const action of actions) {
          if (!action) continue
          // Get fresh store state for each action so name resolution
          // sees tables/columns created by prior actions in this batch
          const freshStore = useSchemaStore.getState()
          applyAction(freshStore, { undo, redo }, action, getPosition)
        }

        // Auto-layout after AI creates tables
        if (hasCreateActions) {
          const { schema: freshSchema, updateTable } = useSchemaStore.getState()
          const positions = computeDagreLayout(
            freshSchema.tables,
            freshSchema.relationships
          )
          for (const [id, pos] of positions) {
            updateTable(id, { position: pos })
          }
          // Delay fitView so React Flow can process the position updates
          requestAnimationFrame(() => fitView({ padding: 0.1, maxZoom: 1 }))
        }

        const msg = text || actions.map((a) => a.message).join('. ') || 'Done'
        setLastMessage(msg)
        setIsError(false)
        setMsgKey((k) => k + 1)
        return true
      } catch (err) {
        console.error('[useSchemaPrompt] error:', err)
        setLastMessage(
          err instanceof Error
            ? err.message
            : 'Something went wrong. Try again.'
        )
        setIsError(true)
        setMsgKey((k) => k + 1)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [undo, redo, getPosition, fitView]
  )

  return { submit, isLoading, lastMessage, isError, msgKey }
}
