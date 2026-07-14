'use client'

import { create } from 'zustand'

export type View =
  | 'dashboard'
  | 'tickets'
  | 'ticket-detail'
  | 'create-ticket'
  | 'my-tickets'
  | 'unassigned'
  | 'users'
  | 'notifications'
  | 'profile'

interface UIState {
  view: View
  selectedTicketId: string | null
  setView: (v: View) => void
  openTicket: (id: string) => void
  // mobile sidebar
  sidebarOpen: boolean
  setSidebarOpen: (b: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  view: 'dashboard',
  selectedTicketId: null,
  setView: (v) => set({ view: v, selectedTicketId: v === 'ticket-detail' ? null : null }),
  openTicket: (id) => set({ view: 'ticket-detail', selectedTicketId: id }),
  sidebarOpen: false,
  setSidebarOpen: (b) => set({ sidebarOpen: b }),
}))
