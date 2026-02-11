import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Manages a local input value that syncs to a store callback after a delay.
 * Returns [localValue, setLocalValue] where typing updates local state
 * immediately and the store update is debounced.
 */
export function useDebouncedValue(
  storeValue: string,
  onCommit: (value: string) => void,
  delay = 300
): [string, (value: string) => void] {
  const [local, setLocal] = useState(storeValue)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const isEditingRef = useRef(false)

  // Sync from store when not actively editing (e.g. undo/redo, external change)
  // Local state needed to decouple typing from debounced store commits
  useEffect(() => {
    if (!isEditingRef.current) {
      setLocal(storeValue) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [storeValue])

  const setValue = useCallback(
    (value: string) => {
      isEditingRef.current = true
      setLocal(value)
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        onCommit(value)
        isEditingRef.current = false
      }, delay)
    },
    [onCommit, delay]
  )

  // Flush on unmount
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  return [local, setValue]
}
