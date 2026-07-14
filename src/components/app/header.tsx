'use client'

import { useUIStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import { Menu, Sun, Moon, Wifi, Activity } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { useRealtimeTicketChanges } from '@/hooks/use-realtime'

const TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Real-time overview of ICT tickets' },
  'create-ticket': { title: 'Report an Issue', subtitle: 'Submit a new ICT problem report' },
  'my-tickets': { title: 'My Tickets', subtitle: 'Tickets you have submitted' },
  tickets: { title: 'All Tickets', subtitle: 'Search and filter all visible tickets' },
  'ticket-detail': { title: 'Ticket Details', subtitle: 'Full status history and actions' },
  unassigned: { title: 'Unassigned Queue', subtitle: 'Tickets awaiting technician assignment' },
  users: { title: 'User Management', subtitle: 'Create and manage staff accounts' },
  notifications: { title: 'Notification Log', subtitle: 'Email delivery audit trail' },
  profile: { title: 'My Profile', subtitle: 'Account settings and security' },
}

export function Header() {
  const { view, setSidebarOpen } = useUIStore()
  const { theme, toggle } = useTheme()
  const { connected } = useRealtimeTicketChanges()
  const meta = TITLES[view] || { title: 'APTix', subtitle: '' }

  return (
    <header className="glass sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-border/40">
      <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={() => setSidebarOpen(true)}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1 min-w-0">
        <h1 className="text-base sm:text-lg font-semibold truncate">{meta.title}</h1>
        <p className="text-xs text-muted-foreground truncate hidden sm:block">{meta.subtitle}</p>
      </div>

      {/* Realtime indicator */}
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full glass text-xs">
        {connected ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Activity className="h-3 w-3 text-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Live</span>
          </>
        ) : (
          <>
            <Wifi className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Connecting…</span>
          </>
        )}
      </div>

      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggle} title="Toggle theme">
        {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </Button>
    </header>
  )
}
