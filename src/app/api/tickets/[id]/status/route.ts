import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePasswordChanged, canUpdateTicketStatus, canConfirmResolution,
  schemas, validateBody, ok, fail,
} from '@/lib/security'
import {
  emitTicketChange, logNotification, buildResolutionEmail, buildConfirmationEmail,
} from '@/lib/ticket-utils'

type Params = { params: Promise<{ id: string }> }

// POST /api/tickets/[id]/status — status transitions
//   - technician/admin: issued -> in_progress -> resolved   (PRD FR-4.1, FR-4.2, AC-4)
//   - issuer/admin:     resolved -> confirmed               (Issuer confirms resolution)
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

  const newStatus = parsed.data.status

  // ===== Issuer confirms resolution =====
  if (newStatus === 'confirmed') {
    if (!canConfirmResolution(user, ticket)) {
      return fail(
        'Only the issuer who created this ticket (or an admin) can confirm the resolution, and only when the ticket is Resolved.',
        403
      )
    }
    const updated = await db.ticket.update({
      where: { id },
      data: { currentStatus: 'confirmed' },
      include: {
        category: true,
        issuedBy: { select: { id: true, fullName: true, email: true } },
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
    })
    await db.ticketStatusHistory.create({
      data: {
        ticketId: ticket.id,
        status: 'confirmed',
        remarks: parsed.data.remarks || 'Resolution confirmed by issuer',
        actorId: user.id,
      },
    })
    // Email the assigned technician + all active admins that the ticket is confirmed/closed
    const admins = await db.profile.findMany({
      where: { role: 'admin', isActive: true },
      select: { email: true },
    })
    const recipients = [
      ...(ticket.assignedTo?.email ? [ticket.assignedTo.email] : []),
      ...admins.map((a) => a.email),
    ]
    const email = buildConfirmationEmail({
      ticketNo: ticket.ticketNo,
      summary: ticket.summary,
      location: ticket.location,
      categoryName: ticket.category.name,
      confirmedAt: new Date(),
      issuerName: ticket.issuedBy.fullName,
    })
    await logNotification({
      ticketId: ticket.id,
      type: 'confirmation',
      recipients,
      subject: email.subject,
      body: email.body,
    })
    await emitTicketChange('ticket_status_changed', ticket.id)
    return ok({ ticket: updated, message: 'Resolution confirmed. Ticket is now closed.' })
  }

  // ===== Technician/admin status update (issued -> in_progress -> resolved) =====
  if (!canUpdateTicketStatus(user, ticket)) {
    return fail('Only the assigned technician or an admin can update this ticket.', 403)
  }
  if (!ticket.assignedToId) {
    return fail('Ticket must be assigned before the status can be updated.', 400)
  }

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
