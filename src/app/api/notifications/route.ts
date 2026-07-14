import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, ok } from '@/lib/security'

// GET /api/notifications — admin reviews email notification log (PRD §11.1, FR-5.5)
export async function GET(req: NextRequest) {
  const user = await requireRole('admin')
  if (user instanceof Response) return user

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200)

  const logs = await db.notificationLog.findMany({
    orderBy: { sentAt: 'desc' },
    take: limit,
    include: {
      ticket: {
        select: {
          id: true, ticketNo: true, summary: true, location: true,
          category: { select: { name: true } },
        },
      },
    },
  })

  return ok({
    notifications: logs.map((l) => ({
      ...l,
      recipients: JSON.parse(l.recipients),
    })),
  })
}
