import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePasswordChanged, schemas, validateBody, ok, fail, type SafeUser,
} from '@/lib/security'
import { generateTicketNo, emitTicketChange, logNotification, buildAssignmentEmail } from '@/lib/ticket-utils'

// GET /api/tickets — list tickets per RLS visibility (PRD §11.1, FR-3.1, FR-6.3)
// Admin: all tickets; Technician: assigned + own issued; Issuer: own issued.
// Supports filters: status, category, location, assignedTo, q (search), since, limit
export async function GET(req: NextRequest) {
  const user = await requirePasswordChanged()
  if (user instanceof Response) return user

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const categoryId = url.searchParams.get('categoryId')
  const location = url.searchParams.get('location')
  const assignedToId = url.searchParams.get('assignedToId')
  const unassigned = url.searchParams.get('unassigned') === 'true'
  const q = url.searchParams.get('q')
  const scope = url.searchParams.get('scope') // 'mine' for "my tickets"
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 500)

  // Build RLS-equivalent where clause
  let visibility: Record<string, unknown> = {}
  if (user.role === 'admin') {
    // all tickets
  } else if (user.role === 'technician') {
    visibility = {
      OR: [{ issuedById: user.id }, { assignedToId: user.id }],
    }
  } else {
    visibility = { issuedById: user.id }
  }

  if (scope === 'mine') {
    visibility = { issuedById: user.id }
  }

  const where: Record<string, unknown> = { ...visibility }
  if (status) where.currentStatus = status
  if (categoryId) where.categoryId = parseInt(categoryId, 10)
  if (location) where.location = { contains: location }
  if (assignedToId) where.assignedToId = assignedToId
  if (unassigned) where.assignedToId = null
  if (q) {
    where.OR = [
      ...(Array.isArray(visibility.OR) ? visibility.OR : []),
      { ticketNo: { contains: q } },
      { summary: { contains: q } },
      { location: { contains: q } },
    ]
  }

  const tickets = await db.ticket.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      category: true,
      issuedBy: { select: { id: true, fullName: true, email: true } },
      assignedTo: { select: { id: true, fullName: true, email: true } },
      assignedBy: { select: { id: true, fullName: true, email: true } },
    },
  })

  return ok({ tickets })
}

// POST /api/tickets — create a new ticket (PRD FR-2.1, FR-2.2, FR-2.3, AC-1)
export async function POST(req: NextRequest) {
  const user = await requirePasswordChanged()
  if (user instanceof Response) return user

  const body = await req.json().catch(() => null)
  const parsed = await validateBody(schemas.createTicket, body)
  if ('error' in parsed) return parsed.error

  const { categoryId, summary, location, reportedDate } = parsed.data

  const category = await db.category.findUnique({ where: { id: categoryId } })
  if (!category) return fail('Invalid category', 400)

  const ticketNo = await generateTicketNo()
  const ticket = await db.ticket.create({
    data: {
      ticketNo,
      categoryId,
      summary,
      location,
      reportedDate: new Date(reportedDate),
      issuedById: user.id,
      currentStatus: 'issued',
    },
    include: {
      category: true,
      issuedBy: { select: { id: true, fullName: true, email: true } },
      assignedTo: { select: { id: true, fullName: true, email: true } },
    },
  })

  // Append initial status history entry (PRD FR-4.3)
  await db.ticketStatusHistory.create({
    data: {
      ticketId: ticket.id,
      status: 'issued',
      remarks: 'Ticket created',
      actorId: user.id,
    },
  })

  await emitTicketChange('ticket_created', ticket.id)

  return ok({ ticket }, 201)
}

// Helper exported for assignment + status routes
export async function loadTicketForUpdate(ticketId: string, user: SafeUser) {
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: {
      category: true,
      issuedBy: { select: { id: true, fullName: true, email: true } },
      assignedTo: { select: { id: true, fullName: true, email: true } },
    },
  })
  if (!ticket) return { error: fail('Ticket not found', 404) }
  return { ticket }
}

// Re-export notification helpers used by other routes
export { logNotification, buildAssignmentEmail, emitTicketChange }
