import { db } from './db'

/**
 * Generate the next human-readable ticket reference, e.g. APTIX-2026-000124 (PRD §7.3, FR-2.3).
 * Uses the current year and a zero-padded 6-digit sequence scoped to that year.
 */
export async function generateTicketNo(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `APTIX-${year}-`
  // Find the highest existing number for this year
  const latest = await db.ticket.findFirst({
    where: { ticketNo: { startsWith: prefix } },
    orderBy: { ticketNo: 'desc' },
    select: { ticketNo: true },
  })
  let next = 1
  if (latest) {
    const num = parseInt(latest.ticketNo.slice(prefix.length), 10)
    if (!isNaN(num)) next = num + 1
  }
  return `${prefix}${String(next).padStart(6, '0')}`
}

export type TicketStatus = 'issued' | 'in_progress' | 'resolved'

/** Colour mapping per PRD §8 (Issued=Red, In Progress=Yellow, Resolved=Green). */
export const STATUS_COLORS: Record<TicketStatus, { label: string; color: 'red' | 'yellow' | 'green' }> = {
  issued: { label: 'Issued', color: 'red' },
  in_progress: { label: 'In Progress', color: 'yellow' },
  resolved: { label: 'Resolved', color: 'green' },
}

/**
 * Notify the realtime mini-service that a ticket changed, so connected
 * dashboards refresh. Falls back silently if the service is unavailable.
 * The mini-service listens on port 3031. Uses a 2s timeout so a down
 * realtime service never delays the API response.
 */
export async function emitTicketChange(event: 'ticket_created' | 'ticket_updated' | 'ticket_assigned' | 'ticket_status_changed', ticketId: string) {
  try {
    await fetch('http://127.0.0.1:3031/internal/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ticketId, ts: Date.now() }),
      signal: AbortSignal.timeout(2000),
    })
  } catch {
    // Realtime service is optional; fail silently.
  }
}

/**
 * Record a notification in notification_log and (in production) would trigger a
 * transactional email via Supabase Edge Function (PRD §4.5, §9). Here we log
 * the email content so admins can review delivery in the Notifications view.
 */
export async function logNotification(params: {
  ticketId: string
  type: 'assignment' | 'resolution'
  recipients: string[]
  subject: string
  body: string
}) {
  return db.notificationLog.create({
    data: {
      ticketId: params.ticketId,
      type: params.type,
      recipients: JSON.stringify(params.recipients),
      status: 'sent',
      subject: params.subject,
      body: params.body,
    },
  })
}

/** Build the assignment email subject/body per PRD §9.1. */
export function buildAssignmentEmail(ticket: {
  ticketNo: string
  summary: string
  location: string
  categoryName: string
  reportedDate: Date
  issuerName: string
}) {
  return {
    subject: `[APTix] Ticket ${ticket.ticketNo} Assigned to You — ${ticket.categoryName} Issue at ${ticket.location}`,
    body: `A new ICT ticket has been assigned to you.\n\nTicket No: ${ticket.ticketNo}\nCategory: ${ticket.categoryName}\nSummary: ${ticket.summary}\nLocation: ${ticket.location}\nReported Date: ${ticket.reportedDate.toLocaleDateString()}\nIssued By: ${ticket.issuerName}\n\nPlease log in to APTix to view full details and update the status.\n\n— APTix System, ADTEC Pedas ICT Unit`,
  }
}

/** Build the resolution email subject/body per PRD §9.2. */
export function buildResolutionEmail(ticket: {
  ticketNo: string
  summary: string
  location: string
  categoryName: string
  resolvedAt: Date
  technicianName: string
}) {
  return {
    subject: `[APTix] Ticket ${ticket.ticketNo} Resolved — ${ticket.categoryName} Issue at ${ticket.location}`,
    body: `Your ICT ticket has been resolved.\n\nTicket No: ${ticket.ticketNo}\nCategory: ${ticket.categoryName}\nSummary: ${ticket.summary}\nLocation: ${ticket.location}\nResolved By: ${ticket.technicianName}\nResolved At: ${ticket.resolvedAt.toLocaleString()}\n\nPlease log in to APTix to view the full status history.\n\n— APTix System, ADTEC Pedas ICT Unit`,
  }
}
