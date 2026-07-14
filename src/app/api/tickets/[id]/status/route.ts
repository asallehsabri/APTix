import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePasswordChanged, canUpdateTicketStatus, schemas, validateBody, ok, fail,
} from '@/lib/security'
import { emitTicketChange, logNotification, buildResolutionEmail } from '@/lib/ticket-utils'

type Params = { params: Promise<{ id: string }> }

// POST /api/tickets/[id]/status — assigned technician (or admin) updates status
// (PRD FR-4.1, FR-4.2, FR-4.3, FR-4.4, FR-4.5, FR-5.3, AC-4, AC-5)
export async function POST(req: NextRequest, { params }: Params) {
  const user = await requirePasswordChanged()
  if (user instanceof Response) return user
  const { id } = await params

  const body = await req.json().catch(() => null)
  const parsed = await validateBody(schemas.updateStatus, body)
  if ('error' in parsed) return parsed.error

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      category: true,
      issuedBy: { select: { id: true, fullName: true, email: true } },
      assignedTo: { select: { id: true, fullName: true, email: true } },
    },
  })
  if (!ticket) return fail('Ticket not found', 404)

  if (!canUpdateTicketStatus(user, ticket)) {
    return fail('Only the assigned technician or an admin can update this ticket.', 403)
  }
  if (!ticket.assignedToId) {
    return fail('Ticket must be assigned before the status can be updated.', 400)
  }

  const newStatus = parsed.data.status
  // State transition rules (PRD §8.1): issued -> in_progress -> resolved
  if (newStatus === 'resolved' && ticket.currentStatus === 'issued') {
    return fail('A ticket must be In Progress before it can be Resolved.', 400)
  }
  if (newStatus === ticket.currentStatus) {
    return fail('Ticket is already in this status.', 400)
  }

  const updated = await db.ticket.update({
    where: { id },
    data: { currentStatus: newStatus },
    include: {
      category: true,
      issuedBy: { select: { id: true, fullName: true, email: true } },
      assignedTo: { select: { id: true, fullName: true, email: true } },
    },
  })

  // Immutable audit log entry (PRD FR-4.3, §5 Auditability)
  await db.ticketStatusHistory.create({
    data: {
      ticketId: ticket.id,
      status: newStatus,
      remarks: parsed.data.remarks || null,
      actorId: user.id,
    },
  })

  // Resolution email to issuer + all active admins (PRD FR-5.3, §9.2, AC-5)
  if (newStatus === 'resolved') {
    const admins = await db.profile.findMany({
      where: { role: 'admin', isActive: true },
      select: { email: true },
    })
    const recipients = [ticket.issuedBy.email, ...admins.map((a) => a.email)]
    const email = buildResolutionEmail({
      ticketNo: ticket.ticketNo,
      summary: ticket.summary,
      location: ticket.location,
      categoryName: ticket.category.name,
      resolvedAt: new Date(),
      technicianName: ticket.assignedTo?.fullName || user.fullName,
    })
    await logNotification({
      ticketId: ticket.id,
      type: 'resolution',
      recipients,
      subject: email.subject,
      body: email.body,
    })
  }

  await emitTicketChange('ticket_status_changed', ticket.id)

  return ok({
    ticket: updated,
    message: `Status updated to ${newStatus === 'in_progress' ? 'In Progress' : 'Resolved'}.`,
  })
}
