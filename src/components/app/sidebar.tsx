'use client'

import { useAuthStore } from '@/stores/auth-store'
import { useUIStore, type View } from '@/stores/ui-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LayoutDashboard, Ticket as TicketIcon, PlusCircle, ListChecks, AlertOctagon,
  Users, Bell, UserCog, LogOut, X, ShieldCheck,
} from 'lucide-react'

interface NavItem {
  id: View
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: ('issuer' | 'technician' | 'admin')[]
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'create-ticket', label: 'Report Issue', icon: PlusCircle },
  { id: 'my-tickets', label: 'My Tickets', icon: ListChecks },
  { id: 'tickets', label: 'All Tickets', icon: TicketIcon, roles: ['technician', 'admin'] },
  { id: 'unassigned', label: 'Unassigned Queue', icon: AlertOctagon, roles: ['admin'] },
  { id: 'users', label: 'User Management', icon: Users, roles: ['admin'] },
  { id: 'notifications', label: 'Notification Log', icon: Bell, roles: ['admin'] },
  { id: 'profile', label: 'My Profile', icon: UserCog },
]

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { view, setView, sidebarOpen, setSidebarOpen } = useUIStore()

  if (!user) return null
  const items = NAV.filter((n) => !n.roles || n.roles.includes(user.role))

  const initials = user.fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'glass-sidebar fixed lg:sticky top-0 left-0 z-50 h-screen w-72 flex flex-col transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center">
              <TicketIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-bold text-gradient text-lg leading-none">APTix</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">ADTEC Pedas ICT</div>
            </div>
          </div>
          <Button
            variant="ghost" size="icon" className="lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1">
          {items.map((item) => {
            const active = view === item.id || (item.id === 'tickets' && view === 'ticket-detail')
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => { setView(item.id); setSidebarOpen(false) }}
                className={cn(
                  'glass-nav-item w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                  active ? 'active text-primary' : 'text-sidebar-foreground hover:text-primary'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* User card */}
        <div className="px-3 pb-3">
          <div className="glass rounded-xl p-3 flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user.fullName}</div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-2.5 w-2.5" />
                {user.role}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
