'use client'

import { create } from 'zustand'
import { api, type User } from '@/lib/api-client'

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
  init: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  setUser: (u: User | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  init: async () => {
    set({ loading: true })
    try {
      const { user } = await api.me()
      set({ user, loading: false, initialized: true })
    } catch {
      set({ user: null, loading: false, initialized: true })
    }
  },

  login: async (email, password) => {
    set({ loading: true })
    try {
      const { user } = await api.login(email, password)
      set({ user, loading: false, initialized: true })
    } catch (e) {
      set({ loading: false })
      throw e
    }
  },

  logout: async () => {
    try { await api.logout() } catch {}
    set({ user: null })
  },

  refresh: async () => {
    try {
      const { user } = await api.me()
      set({ user })
    } catch {
      set({ user: null })
    }
  },

  setUser: (u) => set({ user: u }),
}))
