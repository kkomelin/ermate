import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'ermate:theme'
type Theme = 'light' | 'dark'

const listeners = new Set<() => void>()

function getSnapshot(): Theme {
  return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'dark'
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

// Apply on load
applyTheme(getSnapshot())

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot)

  const toggleTheme = useCallback(() => {
    const next: Theme = getSnapshot() === 'dark' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
    listeners.forEach((l) => l())
  }, [])

  return { theme, toggleTheme } as const
}
