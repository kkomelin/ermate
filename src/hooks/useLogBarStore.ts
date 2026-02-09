import { create } from 'zustand'

interface LogBarState {
  expanded: boolean
  setExpanded: (expanded: boolean) => void
  toggle: () => void
}

export const useLogBarStore = create<LogBarState>()((set) => ({
  expanded: false,
  setExpanded: (expanded) => set({ expanded }),
  toggle: () => set((s) => ({ expanded: !s.expanded })),
}))
