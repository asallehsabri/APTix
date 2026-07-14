'use client'

import { useUIStore } from '@/stores/ui-store'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { DashboardView } from './dashboard-view'
import { TicketsView } from './tickets-view'
import { TicketDetailView } from './ticket-detail-view'
import { CreateTicketView } from './create-ticket-view'
import { UserManagementView } from './user-management-view'
import { NotificationsView } from './notifications-view'
import { ProfileView } from './profile-view'

export function AppShell() {
  const { view } = useUIStore()

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          {view === 'dashboard' && <DashboardView />}
          {view === 'tickets' && <TicketsView mode="all" />}
          {view === 'my-tickets' && <TicketsView mode="mine" />}
          {view === 'unassigned' && <TicketsView mode="unassigned" />}
          {view === 'ticket-detail' && <TicketDetailView />}
          {view === 'create-ticket' && <CreateTicketView />}
          {view === 'users' && <UserManagementView />}
          {view === 'notifications' && <NotificationsView />}
          {view === 'profile' && <ProfileView />}
        </main>
        <footer className="mt-auto px-4 sm:px-6 py-3 text-center text-[10px] text-muted-foreground glass border-t border-border/40">
          APTix · ADTEC Pedas ICT Ticketing System · i-Aduan ICT · Jabatan Tenaga Manusia ·{' '}
          Built per JTM PRD · {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  )
}
