import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { schemas, validateBody, requireRole, ok, fail } from '@/lib/security'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/users/[id] — admin updates a user (role, active status, name) (PRD FR-1.6)
export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await requireRole('admin')
  if (admin instanceof Response) return admin
  const { id } = await params

  const body = await req.json().catch(() => null)
  const parsed = await validateBody(schemas.updateUser, body)
  if ('error' in parsed) return parsed.error

  const target = await db.profile.findUnique({ where: { id } })
  if (!target) return fail('User not found', 404)

  // Guard: cannot deactivate/role-down the last active admin (PRD §11.2 risk)
  if (parsed.data.role !== undefined && parsed.data.role !== 'admin' && target.role === 'admin') {
    const activeAdmins = await db.profile.count({ where: { role: 'admin', isActive: true } })
    if (activeAdmins <= 1) {
      return fail('Cannot change the role of the last active admin.', 400)
    }
  }
  if (parsed.data.isActive === false && target.role === 'admin') {
    const activeAdmins = await db.profile.count({ where: { role: 'admin', isActive: true } })
    if (activeAdmins <= 1) {
      return fail('Cannot deactivate the last active admin.', 400)
    }
  }

  const updated = await db.profile.update({
    where: { id },
    data: {
      ...(parsed.data.fullName !== undefined ? { fullName: parsed.data.fullName } : {}),
      ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    },
    select: {
      id: true, fullName: true, email: true, role: true,
      mustChangePassword: true, isActive: true, createdAt: true,
    },
  })

  return ok({ user: updated })
}
