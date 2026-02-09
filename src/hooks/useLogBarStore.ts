import { create } from 'zustand'

interface LogBarState {
  expanded: boolean
  activeTab: 'errors' | 'history'
  setExpanded: (expanded: boolean) => void
  setActiveTab: (tab: 'errors' | 'history') => void
  toggle: () => void
}

export const useLogBarStore = create<LogBarState>()((set) => ({
  expanded: false,
  activeTab: 'history',
  setExpanded: (expanded) => set({ expanded }),
  setActiveTab: (activeTab) => set({ activeTab }),
  toggle: () => set((s) => ({ expanded: !s.expanded })),
}))
