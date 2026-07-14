import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePasswordChanged, ok } from '@/lib/security'

// GET /api/dashboard — role-scoped summary stats + charts (PRD §10.1, FR-6.1, FR-6.5)
export async function GET(req: NextRequest) {
  const user = await requirePasswordChanged()
  if (user instanceof Response) return user

  const url = new URL(req.url)
  const scope = url.searchParams.get('scope') // 'mine' | 'assigned' | undefined(all)

  // Build visibility where (RLS-equivalent)
  let where: Record<string, unknown> = {}
  if (scope === 'mine') {
    where = { issuedById: user.id }
  } else if (scope === 'assigned') {
    where = { assignedToId: user.id }
  } else if (user.role === 'technician') {
    where = { OR: [{ issuedById: user.id }, { assignedToId: user.id }] }
  } else if (user.role === 'issuer') {
    where = { issuedById: user.id }
  }

  // Status counts (colour-coded Red/Yellow/Green — PRD §8, FR-6.1)
  const statusCounts = {
    issued: await db.ticket.count({ where: { ...where, currentStatus: 'issued' } }),
    in_progress: await db.ticket.count({ where: { ...where, currentStatus: 'in_progress' } }),
    resolved: await db.ticket.count({ where: { ...where, currentStatus: 'resolved' } }),
  }

  // Category breakdown (FR-6.5)
  const byCategoryRaw = await db.ticket.groupBy({
    by: ['categoryId'],
    where,
    _count: { _all: true },
  })
  const categories = await db.category.findMany()
  const byCategory = byCategoryRaw.map((r) => ({
    category: categories.find((c) => c.id === r.categoryId)?.name ?? 'Unknown',
    count: r._count._all,
  }))

  // Location breakdown
  const byLocationRaw = await db.ticket.groupBy({
    by: ['location'],
    where,
    _count: { _all: true },
  })
  const byLocation = byLocationRaw.map((r) => ({ location: r.location, count: r._count._all }))

  // Recent tickets (latest 10)
  const recent = await db.ticket.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      category: true,
      issuedBy: { select: { id: true, fullName: true, email: true } },
      assignedTo: { select: { id: true, fullName: true, email: true } },
    },
  })

  // Admin-only: unassigned queue + technicians + avg resolution time
  let adminExtras: Record<string, unknown> = {}
  if (user.role === 'admin' && !scope) {
    const unassigned = await db.ticket.findMany({
      where: { assignedToId: null, currentStatus: 'issued' },
      orderBy: { createdAt: 'asc' },
      take: 20,
      include: {
        category: true,
        issuedBy: { select: { id: true, fullName: true, email: true } },
      },
    })
    const technicians = await db.profile.findMany({
      where: { role: 'technician', isActive: true },
      select: {
        id: true, fullName: true, email: true,
        assignedTickets: { where: { currentStatus: { in: ['issued', 'in_progress'] } }, select: { id: true, currentStatus: true } },
      },
    })
    // Average resolution time (hours) for resolved tickets
    const resolvedTickets = await db.ticket.findMany({
      where: { ...where, currentStatus: 'resolved' },
      select: { createdAt: true, updatedAt: true },
    })
    const avgResolutionHours =
      resolvedTickets.length > 0
        ? resolvedTickets.reduce((sum, t) => sum + (t.updatedAt.getTime() - t.createdAt.getTime()) / 3600000, 0) /
          resolvedTickets.length
        : 0

    adminExtras = { unassigned, technicians, avgResolutionHours: Math.round(avgResolutionHours * 10) / 10 }
  }

  return ok({
    scope: scope || (user.role === 'admin' ? 'all' : user.role === 'technician' ? 'assigned+mine' : 'mine'),
    statusCounts,
    byCategory,
    byLocation,
    recent,
    total: statusCounts.issued + statusCounts.in_progress + statusCounts.resolved,
    ...adminExtras,
  })
}
