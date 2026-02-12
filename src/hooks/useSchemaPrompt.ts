import { useCallback, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useSchemaStore, useTemporalStore } from './useSchemaStore'
import { submitPrompt, applyAction } from '@/services/ai'
import type { Position } from '@/types/schema'

export function useSchemaPrompt() {
  const undo = useTemporalStore((s) => s.undo)
  const redo = useTemporalStore((s) => s.redo)
  const { getViewport } = useReactFlow()

  const [isLoading, setIsLoading] = useState(false)
  const [lastMessage, setLastMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

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

        for (const action of actions) {
          if (!action) continue
          // Get fresh store state for each action so name resolution
          // sees tables/columns created by prior actions in this batch
          const freshStore = useSchemaStore.getState()
          applyAction(freshStore, { undo, redo }, action, getPosition)
        }

        const msg = text || actions.map((a) => a.message).join('. ') || 'Done'
        setLastMessage(msg)
        setIsError(false)
        return true
      } catch (err) {
        console.error('[useSchemaPrompt] error:', err)
        setLastMessage(
          err instanceof Error
            ? err.message
            : 'Something went wrong. Try again.'
        )
        setIsError(true)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [undo, redo, getPosition]
  )

  return { submit, isLoading, lastMessage, isError }
}
