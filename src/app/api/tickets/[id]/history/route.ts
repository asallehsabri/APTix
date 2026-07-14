import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePasswordChanged, canAccessTicket, ok, fail } from '@/lib/security'

type Params = { params: Promise<{ id: string }> }

// GET /api/tickets/[id]/history — full timestamped status history (PRD FR-6.3, §10.2)
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await requirePasswordChanged()
  if (user instanceof Response) return user
  const { id } = await params

  const ticket = await db.ticket.findUnique({
    where: { id },
    select: { id: true, issuedById: true, assignedToId: true },
  })
  if (!ticket) return fail('Ticket not found', 404)
  if (!canAccessTicket(user, ticket)) {
    return fail('You do not have access to this ticket.', 403)
  }

  const history = await db.ticketStatusHistory.findMany({
    where: { ticketId: id },
    orderBy: { changedAt: 'asc' },
    include: { actor: { select: { id: true, fullName: true, email: true, role: true } } },
  })

  return ok({ history })
}
