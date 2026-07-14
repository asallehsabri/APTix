import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, schemas, validateBody, ok, fail } from '@/lib/security'
import { emitTicketChange, logNotification, buildAssignmentEmail } from '@/lib/ticket-utils'

type Params = { params: Promise<{ id: string }> }

// POST /api/tickets/[id]/assign — Admin assigns (or re-assigns) a ticket to a technician
// (PRD FR-3.2, FR-3.3, FR-3.4, FR-5.1, FR-5.2, AC-3)
export async function POST(req: NextRequest, { params }: Params) {
  const admin = await requireRole('admin')
  if (admin instanceof Response) return admin
  const { id } = await params

  const body = await req.json().catch(() => null)
  const parsed = await validateBody(schemas.assignTicket, body)
  if ('error' in parsed) return parsed.error

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      category: true,
      issuedBy: { select: { id: true, fullName: true, email: true } },
    },
  })
  if (!ticket) return fail('Ticket not found', 404)

  const technician = await db.profile.findUnique({
    where: { id: parsed.data.assignedToId },
    select: { id: true, fullName: true, email: true, role: true, isActive: true },
  })
  if (!technician) return fail('Technician not found', 404)
  if (technician.role !== 'technician') return fail('Target user is not a technician', 400)
  if (!technician.isActive) return fail('Target technician is inactive', 400)

  const previousAssigneeId = ticket.assignedToId
  const updated = await db.ticket.update({
    where: { id },
    data: {
      assignedToId: technician.id,
      assignedById: admin.id,
    },
    include: {
      category: true,
      issuedBy: { select: { id: true, fullName: true, email: true } },
      assignedTo: { select: { id: true, fullName: true, email: true } },
      assignedBy: { select: { id: true, fullName: true, email: true } },
    },
  })

  // Audit log entry (PRD FR-3.3, FR-4.3)
  await db.ticketStatusHistory.create({
    data: {
      ticketId: ticket.id,
      status: 'assigned',
      remarks: previousAssigneeId
        ? `Re-assigned from previous technician to ${technician.fullName} by Admin`
        : `Assigned to ${technician.fullName} by Admin`,
      actorId: admin.id,
    },
  })

  // Email notification to technician (To) + issuer (CC) (PRD FR-5.1, FR-5.2, §9.1, AC-3)
  const email = buildAssignmentEmail({
    ticketNo: ticket.ticketNo,
    summary: ticket.summary,
    location: ticket.location,
    categoryName: ticket.category.name,
    reportedDate: ticket.reportedDate,
    issuerName: ticket.issuedBy.fullName,
  })
  await logNotification({
    ticketId: ticket.id,
    type: 'assignment',
    recipients: [technician.email, ticket.issuedBy.email],
    subject: email.subject,
    body: email.body,
  })

  await emitTicketChange('ticket_assigned', ticket.id)

  return ok({ ticket: updated, message: `Ticket assigned to ${technician.fullName}.` })
}
