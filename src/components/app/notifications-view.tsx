'use client'

import { useEffect, useState } from 'react'
import { api, type NotificationEntry } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Mail, Bell, CheckCircle2, AlertCircle, Inbox } from 'lucide-react'

export function NotificationsView() {
  const [logs, setLogs] = useState<NotificationEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listNotifications()
      .then((r) => setLogs(r.notifications))
      .catch((e) => toast.error('Failed to load notifications', { description: e instanceof Error ? e.message : '' }))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <Card className="glass border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Email Notification Audit Log
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Every assignment and resolution email is logged here for delivery review (PRD FR-5.5, §11.1).
          </p>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : logs.length === 0 ? (
        <Card className="glass border-0">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
            No notifications sent yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((n) => (
            <Card key={n.id} className="glass border-0">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg p-2 ${n.status === 'sent' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-500'}`}>
                    {n.status === 'sent' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-primary/15 text-primary">
                        {n.type}
                      </span>
                      <span className="text-xs text-muted-foreground">{format(new Date(n.sentAt), 'dd MMM yyyy, HH:mm')}</span>
                      {n.ticket && (
                        <span className="font-mono text-xs text-primary">{n.ticket.ticketNo}</span>
                      )}
                    </div>
                    <div className="text-sm font-medium mt-1">{n.subject}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">To: {n.recipients.join(', ')}</div>
                    <div className="text-xs text-muted-foreground mt-1 glass rounded p-2 bg-background/30 whitespace-pre-wrap">
                      {n.body}
                    </div>
                  </div>
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
