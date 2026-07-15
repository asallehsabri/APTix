'use client'

import { cn } from '@/lib/utils'
import type { TicketStatus } from '@/lib/api-client'

const LABELS: Record<string, string> = {
  issued: 'Issued',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  confirmed: 'Confirmed',
  assigned: 'Assigned',
}

const STATUS_CLASSES = ['issued', 'in_progress', 'resolved', 'confirmed']

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const cls = STATUS_CLASSES.includes(status)
    ? `status-${status}`
    : 'bg-muted text-muted-foreground border-border'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        cls,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', `status-dot-${status}`)} />
      {LABELS[status] || status}
    </span>
  )
}

export function StatusDot({ status, className }: { status: TicketStatus; className?: string }) {
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 rounded-full', `status-dot-${status}`, className)}
      title={LABELS[status]}
    />
  )
}
