'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { LoginView } from '@/components/app/login-view'
import { ChangePasswordView } from '@/components/app/change-password-view'
import { AppShell } from '@/components/app/app-shell'

export default function HomePage() {
  const { user, initialized, init } = useAuthStore()

  useEffect(() => {
    init()
  }, [init])

  // Initial bootstrap — show branded loader
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl glass-strong mb-4 animate-pulse overflow-hidden p-1">
            <img src="/logo-adtec.png" alt="ADTEC JTM Kampus Pedas" className="h-full w-full object-contain" />
          </div>
          <div className="text-gradient text-2xl font-bold">APTix</div>
          <div className="text-xs text-muted-foreground mt-1">Loading ADTEC Pedas ICT Ticketing…</div>
        </div>
      </div>
    )
  }

  // Not authenticated → login
  if (!user) return <LoginView />

  // Authenticated but must change password → forced change screen (PRD FR-1.3, AC-2)
  if (user.mustChangePassword) return <ChangePasswordView />

  // Fully authenticated → main app
  return <AppShell />
}
