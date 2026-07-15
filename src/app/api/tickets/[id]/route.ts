import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePasswordChanged, requireRole, canAccessTicket, ok, fail } from '@/lib/security'
import { emitTicketChange } from '@/lib/ticket-utils'

type Params = { params: Promise<{ id: string }> }

// GET /api/tickets/[id] — ticket detail with history (PRD FR-6.3, §10.2)
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await requirePasswordChanged()
  if (user instanceof Response) return user
  const { id } = await params

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      category: true,
      issuedBy: { select: { id: true, fullName: true, email: true } },
      assignedTo: { select: { id: true, fullName: true, email: true } },
      assignedBy: { select: { id: true, fullName: true, email: true } },
      history: {
        orderBy: { changedAt: 'asc' },
        include: { actor: { select: { id: true, fullName: true, email: true, role: true } } },
      },
      notifications: { orderBy: { sentAt: 'desc' } },
    },
  })

  if (!ticket) return fail('Ticket not found', 404)

  if (!canAccessTicket(user, ticket)) {
    return fail('You do not have access to this ticket.', 403)
  }

  // SQLite stores recipients as a JSON string; parse to array for the client.
  const ticketWithParsedNotifications = {
    ...ticket,
    notifications: ticket.notifications.map((n) => ({
      ...n,
      recipients: safeParseRecipients(n.recipients),
    })),
  }

  return ok({ ticket: ticketWithParsedNotifications })
}

// DELETE /api/tickets/[id] — admin deletes a ticket and all its history + notifications.
// Cascading deletes are configured in the Prisma schema (ticket_status_history
// and notification_log both use onDelete: Cascade), so deleting the ticket row
// automatically removes its child records.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const admin = await requireRole('admin')
  if (admin instanceof Response) return admin
  const { id } = await params

  const ticket = await db.ticket.findUnique({
    where: { id },
    select: { id: true, ticketNo: true, summary: true },
  })
  if (!ticket) return fail('Ticket not found', 404)

  await db.ticket.delete({ where: { id } })

  await emitTicketChange('ticket_updated', ticket.id)

  return ok({ success: true, message: `Ticket ${ticket.ticketNo} deleted.`, ticketNo: ticket.ticketNo })
}

function safeParseRecipients(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : [String(parsed)]
  } catch {
    return [String(raw)]
  }
}
