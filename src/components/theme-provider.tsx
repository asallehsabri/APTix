'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type Theme = 'light' | 'dark'
type ThemeCtx = { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }

const Ctx = createContext<ThemeCtx>({ theme: 'light', toggle: () => {}, setTheme: () => {} })

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem('aptix-theme') as Theme | null
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy init: returns 'light' during SSR, reads actual preference on client hydration.
  const [theme, setThemeState] = useState<Theme>('light')

  // On mount, sync state + DOM class with the stored/preferred theme.
  // This is a legitimate "subscribe to external system (localStorage + matchMedia)" case.
  useEffect(() => {
    const initial = readStoredTheme()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(initial)
    document.documentElement.classList.toggle('dark', initial === 'dark')
  }, [])

  // Keep DOM class in sync whenever theme changes (e.g. on toggle).
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    if (typeof localStorage !== 'undefined') localStorage.setItem('aptix-theme', t)
  }, [])

  const toggle = useCallback(() => setThemeState((t) => (t === 'light' ? 'dark' : 'light')), [])

  return <Ctx.Provider value={{ theme, toggle, setTheme }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
