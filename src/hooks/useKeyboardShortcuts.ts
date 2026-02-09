import { useEffect } from 'react'
import { useSchemaStore } from './useSchemaStore'

export function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      // Undo: Ctrl/Cmd+Z (without shift)
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        useSchemaStore.temporal.getState().undo()
      }

      // Redo: Ctrl/Cmd+Shift+Z
      if (e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        useSchemaStore.temporal.getState().redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [])
}
