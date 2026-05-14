import { create } from 'zustand'

export const useUiStore = create((set) => ({
  sidebarOpen: false,
  selectedBusinessId: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setSelectedBusinessId: (id) => set({ selectedBusinessId: id }),
}))