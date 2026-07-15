'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, type Ticket, type User } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { useRealtimeTicketChanges } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { StatusBadge } from './status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'
import {
  ArrowLeft, MapPin, Calendar, User as UserIcon, Wrench, Clock, Tag,
  History, UserPlus, Play, CheckCircle2, Mail, Loader2, Building2, ShieldCheck,
} from 'lucide-react'

export function TicketDetailView() {
  const user = useAuthStore((s) => s.user)!
  const { selectedTicketId, setView } = useUIStore()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [assignOpen, setAssignOpen] = useState(false)
  const [technicians, setTechnicians] = useState<User[]>([])
  const [assignTo, setAssignTo] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [statusRemarks, setStatusRemarks] = useState('')
  const [updating, setUpdating] = useState(false)

  const load = useCallback(async () => {
    if (!selectedTicketId) return
    setLoading(true)
    try {
      const { ticket } = await api.getTicket(selectedTicketId)
      setTicket(ticket)
    } catch (e) {
      toast.error('Failed to load ticket', { description: e instanceof Error ? e.message : '' })
      setView('tickets')
    } finally {
      setLoading(false)
    }
  }, [selectedTicketId, setView])

  useEffect(() => { load() }, [load])
  useRealtimeTicketChanges(() => { if (selectedTicketId) load() })

  const openAssignDialog = async () => {
    setAssignOpen(true)
    if (technicians.length === 0) {
      try {
        const dash = await api.dashboard()
        if (dash.technicians) {
          setTechnicians(dash.technicians.map((t) => ({ id: t.id, fullName: t.fullName, email: t.email, role: 'technician', mustChangePassword: false })))
        }
      } catch {}
    }
  }

  const doAssign = async () => {
    if (!ticket || !assignTo) return
    setAssigning(true)
    try {
      const { message } = await api.assignTicket(ticket.id, assignTo)
      toast.success('Ticket assigned', { description: message })
      setAssignOpen(false)
      setAssignTo('')
      load()
    } catch (e) {
      toast.error('Assignment failed', { description: e instanceof Error ? e.message : '' })
    } finally {
      setAssigning(false)
    }
  }

  const updateStatus = async (status: 'in_progress' | 'resolved' | 'confirmed') => {
    if (!ticket) return
    setUpdating(true)
    try {
      const { message } = await api.updateStatus(ticket.id, status, statusRemarks || undefined)
      toast.success('Status updated', { description: message })
      setStatusRemarks('')
      load()
    } catch (e) {
      toast.error('Update failed', { description: e instanceof Error ? e.message : '' })
    } finally {
      setUpdating(false)
    }
  }

  if (loading || !ticket) {
    return (
      <div className="max-w-3xl mx-auto space-y-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  const isAdmin = user.role === 'admin'
  const isAssignedTech = ticket.assignedToId === user.id
  const isIssuer = ticket.issuedById === user.id
  const canUpdateStatus = (isAssignedTech || isAdmin) && !!ticket.assignedToId
  const canAssign = isAdmin
  // Issuer confirms resolution: only when status is 'resolved' and user is the issuer or admin
  const canConfirmResolution = ticket.currentStatus === 'resolved' && (isIssuer || isAdmin)

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setView(user.role === 'issuer' ? 'my-tickets' : 'tickets')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
      </Button>

      {/* Header card */}
      <Card className="glass-strong border-0">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-semibold text-primary">{ticket.ticketNo}</span>
                <StatusBadge status={ticket.currentStatus} />
              </div>
              <h2 className="text-lg font-semibold mt-1.5">{ticket.summary}</h2>
            </div>
            {canAssign && (
              <Button onClick={openAssignDialog} size="sm">
                <UserPlus className="h-4 w-4 mr-1.5" />
                {ticket.assignedTo ? 'Re-assign' : 'Assign'}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <Info icon={Tag} label="Category" value={ticket.category.name} />
            <Info icon={MapPin} label="Location" value={ticket.location} />
            <Info icon={Calendar} label="Reported" value={format(new Date(ticket.reportedDate), 'dd MMM yyyy')} />
            <Info icon={Clock} label="Created" value={formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
            <Info icon={UserIcon} label="Issued By" value={`${ticket.issuedBy.fullName}`} sub={ticket.issuedBy.email} />
            <Info icon={Wrench} label="Assigned To" value={ticket.assignedTo?.fullName || '— Unassigned —'} sub={ticket.assignedTo?.email} />
            <Info icon={Building2} label="Assigned By" value={ticket.assignedBy?.fullName || '—'} sub={ticket.assignedBy?.email} />
          </div>
        </CardContent>
      </Card>

      {/* Status actions — technician/admin update OR issuer confirm resolution */}
      {(canUpdateStatus || canConfirmResolution) && (
        <Card className="glass border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {canConfirmResolution ? (
                <><ShieldCheck className="h-4 w-4 text-cyan-500" /> Confirm Resolution</>
              ) : (
                <><Wrench className="h-4 w-4 text-primary" /> Update Status</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Issuer confirmation prompt when technician marked resolved */}
            {canConfirmResolution && (
              <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 p-3 text-sm text-cyan-700 dark:text-cyan-300">
                <div className="flex items-center gap-1.5 font-medium mb-1">
                  <ShieldCheck className="h-4 w-4" /> Awaiting your confirmation
                </div>
                The technician has marked this ticket as <strong>Resolved</strong>. Please verify the fix and confirm to close the ticket.
              </div>
            )}

            {canUpdateStatus && (
              <div className="space-y-1.5">
                <Label htmlFor="remarks" className="text-xs">Remarks (optional)</Label>
                <Textarea id="remarks" value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  placeholder={canConfirmResolution ? "e.g. Issue confirmed fixed, thank you" : "e.g. Awaiting replacement RAM module"}
                  className="bg-background/40 min-h-[60px]" maxLength={500}
                  disabled={updating} />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {/* Technician actions */}
              {canUpdateStatus && ticket.currentStatus === 'issued' && (
                <Button onClick={() => updateStatus('in_progress')} disabled={updating} variant="secondary">
                  {updating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Play className="h-4 w-4 mr-1.5" />}
                  Start Work (In Progress)
                </Button>
              )}
              {canUpdateStatus && ticket.currentStatus === 'in_progress' && (
                <Button onClick={() => updateStatus('resolved')} disabled={updating} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {updating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                  Mark as Resolved
                </Button>
              )}
              {/* Issuer confirms resolution */}
              {canConfirmResolution && (
                <Button onClick={() => updateStatus('confirmed')} disabled={updating} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  {updating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <ShieldCheck className="h-4 w-4 mr-1.5" />}
                  Confirm Resolution & Close
                </Button>
              )}
              {ticket.currentStatus === 'confirmed' && (
                <div className="text-sm text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> Resolution confirmed by issuer. Ticket is closed.
                </div>
              )}
              {ticket.currentStatus === 'resolved' && !canConfirmResolution && (
                <div className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Resolved — awaiting issuer confirmation.
                </div>
              )}
            </div>
            {!canUpdateStatus && !canConfirmResolution && ticket.assignedToId && !isAssignedTech && !isAdmin && (
              <p className="text-xs text-muted-foreground">Only the assigned technician or an admin can update the status.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status history (PRD §10.2) */}
      <Card className="glass border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" /> Status History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
            {(ticket.history || []).map((h) => (
              <div key={h.id} className="relative">
                <span className={`absolute -left-[18px] top-1 h-3 w-3 rounded-full border-2 border-background ${
                  h.status === 'issued' ? 'bg-red-500' :
                  h.status === 'in_progress' ? 'bg-yellow-500' :
                  h.status === 'resolved' ? 'bg-emerald-500' :
                  'bg-primary'
                }`} />
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={h.status} />
                  <span className="text-xs text-muted-foreground">{format(new Date(h.changedAt), 'dd MMM yyyy, HH:mm')}</span>
                </div>
                <div className="text-xs mt-1 text-muted-foreground">
                  by <span className="font-medium text-foreground">{h.actor.fullName}</span> ({h.actor.role})
                </div>
                {h.remarks && <div className="text-sm mt-1 glass rounded-lg p-2 bg-background/30">{h.remarks}</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications on this ticket (visible to admin/issuer) */}
      {ticket.notifications && ticket.notifications.length > 0 && (isAdmin || ticket.issuedById === user.id) && (
        <Card className="glass border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> Email Notifications ({ticket.notifications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ticket.notifications.map((n) => (
              <div key={n.id} className="glass rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{n.subject}</span>
                  <span className="text-muted-foreground">{format(new Date(n.sentAt), 'dd MMM, HH:mm')}</span>
                </div>
                <div className="text-muted-foreground mt-1">To: {(Array.isArray(n.recipients) ? n.recipients : [n.recipients]).join(', ')}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 text-[10px] font-semibold uppercase">{n.type}</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 text-[10px]">{n.status}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" /> Assign Ticket to Technician</DialogTitle>
            <DialogDescription>Select an active technician to handle {ticket.ticketNo}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={assignTo} onValueChange={setAssignTo}>
              <SelectTrigger className="bg-background/40"><SelectValue placeholder="Choose technician" /></SelectTrigger>
              <SelectContent>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.fullName} — {t.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ticket.assignedTo && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Currently assigned to <strong>{ticket.assignedTo.fullName}</strong>. Re-assigning will be logged in the history.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignOpen(false)} disabled={assigning}>Cancel</Button>
            <Button onClick={doAssign} disabled={assigning || !assignTo}>
              {assigning ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <UserPlus className="h-4 w-4 mr-1.5" />}
              Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Info({ icon: Icon, label, value, sub }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string
}) {
  return (
    <div className="glass rounded-lg p-2.5">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        <Icon className="h-3 w-3" />{label}
      </div>
      <div className="text-sm font-medium mt-0.5 truncate">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground truncate">{sub}</div>}
    </div>
  )
}
