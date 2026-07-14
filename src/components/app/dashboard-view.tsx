'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, type DashboardData } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { useRealtimeTicketChanges } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend,
} from 'recharts'
import {
  AlertOctagon, Clock, CheckCircle2, Inbox, TrendingUp, Users, Activity,
  PlusCircle, ArrowRight, Timer, MapPin, Wrench,
} from 'lucide-react'

const STATUS_COLORS_HEX = {
  issued: '#ef4444',
  in_progress: '#eab308',
  resolved: '#22c55e',
}

export function DashboardView() {
  const user = useAuthStore((s) => s.user)!
  const { openTicket, setView } = useUIStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState<'all' | 'mine' | 'assigned'>(
    user.role === 'admin' ? 'all' : user.role === 'technician' ? 'assigned' : 'mine'
  )

  const load = useCallback(async () => {
    try {
      const d = await api.dashboard(scope === 'all' ? undefined : scope)
      setData(d)
    } catch (e) {
      toast.error('Failed to load dashboard', { description: e instanceof Error ? e.message : '' })
    } finally {
      setLoading(false)
    }
  }, [scope])

  useEffect(() => { load() }, [load])

  // Realtime refresh
  useRealtimeTicketChanges(() => {
    load()
  })

  if (loading || !data) return <DashboardSkeleton />

  const isAdmin = user.role === 'admin'
  const pieData = [
    { name: 'Issued', value: data.statusCounts.issued, color: STATUS_COLORS_HEX.issued },
    { name: 'In Progress', value: data.statusCounts.in_progress, color: STATUS_COLORS_HEX.in_progress },
    { name: 'Resolved', value: data.statusCounts.resolved, color: STATUS_COLORS_HEX.resolved },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-5">
      {/* Scope switcher (admin/technician) */}
      {(isAdmin || user.role === 'technician') && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">View:</span>
          {isAdmin && (
            <>
              <ScopeChip active={scope === 'all'} onClick={() => setScope('all')}>All Tickets</ScopeChip>
              <ScopeChip active={scope === 'mine'} onClick={() => setScope('mine')}>My Issued</ScopeChip>
              <ScopeChip active={scope === 'assigned'} onClick={() => setScope('assigned')}>Assigned to Me</ScopeChip>
            </>
          )}
          {user.role === 'technician' && (
            <>
              <ScopeChip active={scope === 'assigned'} onClick={() => setScope('assigned')}>Assigned to Me</ScopeChip>
              <ScopeChip active={scope === 'mine'} onClick={() => setScope('mine')}>My Issued</ScopeChip>
            </>
          )}
        </div>
      )}

      {/* Stat tiles (PRD §10.1 — colour-coded Red/Yellow/Green) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile
          label="Total Tickets" value={data.total} icon={Inbox}
          color="text-foreground" bg="glass"
        />
        <StatTile
          label="Issued" value={data.statusCounts.issued} icon={AlertOctagon}
          color="text-red-500" bg="status-issued" subtitle="Awaiting action"
        />
        <StatTile
          label="In Progress" value={data.statusCounts.in_progress} icon={Clock}
          color="text-yellow-600 dark:text-yellow-400" bg="status-in_progress" subtitle="Being worked on"
        />
        <StatTile
          label="Resolved" value={data.statusCounts.resolved} icon={CheckCircle2}
          color="text-emerald-500" bg="status-resolved" subtitle="Completed"
        />
      </div>

      {/* Admin extras */}
      {isAdmin && !scope.includes('mine') && data.avgResolutionHours !== undefined && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <MiniStat icon={Timer} label="Avg Resolution" value={`${data.avgResolutionHours}h`} />
          <MiniStat icon={Users} label="Active Technicians" value={data.technicians?.length ?? 0} />
          <MiniStat icon={AlertOctagon} label="Unassigned" value={data.unassigned?.length ?? 0} />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status pie */}
        <Card className="glass border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <EmptyChart text="No tickets in this scope" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80} paddingAngle={3} label={(e) => `${e.name}: ${e.value}`}>
                    {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #ccc', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category bar */}
        <Card className="glass border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Tickets by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.byCategory.length === 0 ? (
              <EmptyChart text="No data" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byCategory} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #ccc', borderRadius: 8 }} />
                  <Bar dataKey="count" name="Tickets" fill="oklch(0.55 0.12 180)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin: Unassigned queue */}
      {isAdmin && data.unassigned && data.unassigned.length > 0 && (
        <Card className="glass border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-red-500" /> Unassigned Queue ({data.unassigned.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
            {data.unassigned.map((t) => (
              <button key={t.id} onClick={() => openTicket(t.id)}
                className="w-full text-left rounded-lg glass p-3 hover:glow transition-all flex items-center gap-3">
                <StatusBadge status={t.currentStatus} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.summary}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span className="font-mono">{t.ticketNo}</span>·<MapPin className="h-3 w-3" />{t.location}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent tickets */}
      <Card className="glass border-0">
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Recent Tickets
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setView(user.role === 'issuer' ? 'my-tickets' : 'tickets')}>
            View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.recent.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No tickets yet. <Button variant="link" className="h-auto p-0" onClick={() => setView('create-ticket')}>Report your first issue</Button>
            </div>
          ) : (
            data.recent.map((t) => (
              <button key={t.id} onClick={() => openTicket(t.id)}
                className="w-full text-left rounded-lg glass p-3 hover:glow transition-all">
                <div className="flex items-start gap-3">
                  <StatusBadge status={t.currentStatus} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.summary}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      <span className="font-mono">{t.ticketNo}</span>
                      <span>·</span><span>{t.category.name}</span>
                      <span>·</span><MapPin className="h-3 w-3" />{t.location}
                      {t.assignedTo && (<><span>·</span><Wrench className="h-3 w-3" />{t.assignedTo.fullName}</>)}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ScopeChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
        active ? 'bg-primary text-primary-foreground shadow' : 'glass text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function StatTile({ label, value, icon: Icon, color, bg, subtitle }: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>;
  color: string; bg: string; subtitle?: string
}) {
  return (
    <Card className={`${bg} border-0 overflow-hidden relative`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium">{label}</div>
            <div className={`text-2xl sm:text-3xl font-bold mt-1 ${color}`}>{value}</div>
            {subtitle && <div className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</div>}
          </div>
          <div className={`rounded-lg p-2 ${color} bg-background/30`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <Card className="glass border-0">
      <CardContent className="p-3 sm:p-4 flex items-center gap-3">
        <div className="rounded-lg p-2 bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">{text}</div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
