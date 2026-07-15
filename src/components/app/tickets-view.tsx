'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, type Ticket, type Category, type User } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { useRealtimeTicketChanges } from '@/hooks/use-realtime'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from './status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Search, MapPin, Wrench, PlusCircle, Filter, X, Inbox, Calendar } from 'lucide-react'

interface Props {
  mode?: 'all' | 'mine' | 'unassigned'
}

export function TicketsView({ mode = 'all' }: Props) {
  const user = useAuthStore((s) => s.user)!
  const { openTicket, setView } = useUIStore()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [category, setCategory] = useState<string>('all')
  const [location, setLocation] = useState<string>('all')
  const [issuerFilter, setIssuerFilter] = useState<string>('all')
  const [technicianFilter, setTechnicianFilter] = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (q) params.q = q
      if (status !== 'all') params.status = status
      if (category !== 'all') params.categoryId = category
      if (location !== 'all') params.location = location
      if (mode === 'mine') {
        // My Tickets is role-aware:
        //  - Issuer / Admin: tickets they issued
        //  - Technician: tickets assigned to them
        params.scope = user.role === 'technician' ? 'assigned' : 'mine'
      }
      if (mode === 'unassigned') params.unassigned = 'true'
      if (mode === 'all' && issuerFilter !== 'all') params.issuedById = issuerFilter
      if (mode === 'all' && technicianFilter !== 'all') params.assignedToId = technicianFilter
      const fetches: Promise<unknown>[] = [
        api.listTickets(params),
        categories.length ? Promise.resolve({ categories }) : api.listCategories(),
      ]
      if (mode === 'all' && user.role === 'admin' && allUsers.length === 0) {
        fetches.push(api.listUsers())
      }
      const [tRes, cRes, uRes] = await Promise.all(fetches) as [{ tickets: Ticket[] }, { categories: Category[] }, { users: User[] } | undefined]
      setTickets(tRes.tickets)
      if (!categories.length) setCategories(cRes.categories)
      if (uRes && allUsers.length === 0) setAllUsers(uRes.users)
    } catch (e) {
      toast.error('Failed to load tickets', { description: e instanceof Error ? e.message : '' })
    } finally {
      setLoading(false)
    }
  }, [q, status, category, location, mode, categories.length, user.role, issuerFilter, technicianFilter, allUsers.length])

  useEffect(() => { load() }, [load])

  useRealtimeTicketChanges(() => { load() })

  const locations = useMemo(() => Array.from(new Set(tickets.map((t) => t.location))).sort(), [tickets])

  const clearFilters = () => { setQ(''); setStatus('all'); setCategory('all'); setLocation('all'); setIssuerFilter('all'); setTechnicianFilter('all') }
  const hasFilters = q || status !== 'all' || category !== 'all' || location !== 'all' || issuerFilter !== 'all' || technicianFilter !== 'all'
  const issuers = allUsers.filter((u) => u.role === 'issuer')
  const technicians = allUsers.filter((u) => u.role === 'technician')
  const showAdminFilters = mode === 'all' && user.role === 'admin'

  const title = mode === 'mine'
    ? (user.role === 'technician' ? 'My Assigned Tickets' : 'My Issued Tickets')
    : mode === 'unassigned' ? 'Unassigned Queue' : 'All Tickets'

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card className="glass border-0">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="h-4 w-4 text-primary" />
              {title}
              <span className="text-muted-foreground">({tickets.length})</span>
            </div>
            <Button size="sm" onClick={() => setView('create-ticket')}>
              <PlusCircle className="h-4 w-4 mr-1.5" /> New
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search ticket no, summary…" value={q}
                onChange={(e) => setQ(e.target.value)} className="pl-8 bg-background/40 h-9" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 bg-background/40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 bg-background/40"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="h-9 bg-background/40"><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Admin-only filters: Issuer + Technician (All Tickets view) */}
          {showAdminFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/30">
              <Select value={issuerFilter} onValueChange={setIssuerFilter}>
                <SelectTrigger className="h-9 bg-background/40"><SelectValue placeholder="All Issuers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Issuers</SelectItem>
                  {issuers.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName} ({u.email})</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
                <SelectTrigger className="h-9 bg-background/40"><SelectValue placeholder="All Technicians" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Technicians</SelectItem>
                  {technicians.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName} ({u.email})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
              <X className="h-3 w-3 mr-1" /> Clear filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : tickets.length === 0 ? (
        <Card className="glass border-0">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
            No tickets found.
            <div className="mt-2">
              <Button variant="link" className="h-auto p-0" onClick={() => setView('create-ticket')}>Report a new issue</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <button key={t.id} onClick={() => openTicket(t.id)}
              className="w-full text-left rounded-xl glass p-3 sm:p-4 hover:glow transition-all">
              <div className="flex items-start gap-3">
                <StatusBadge status={t.currentStatus} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-primary">{t.ticketNo}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/60">{t.category.name}</span>
                  </div>
                  <div className="text-sm font-medium mt-1 line-clamp-1">{t.summary}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{t.location}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(t.reportedDate).toLocaleDateString()}</span>
                    {t.assignedTo ? (
                      <span className="flex items-center gap-1"><Wrench className="h-3 w-3" />{t.assignedTo.fullName}</span>
                    ) : (
                      <span className="text-red-500 font-medium">Unassigned</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
