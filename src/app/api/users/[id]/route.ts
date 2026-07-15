import { NextRequest } from 'next/server'
import { z } from 'zod'
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

const DELETE_REASON_SCHEMA = z.object({
  reason: z.enum(['Bertukar Pejabat', 'Bersara', 'Lain-lain']),
  note: z.string().max(200).optional().nullable(),
})

// DELETE /api/users/[id] — admin permanently deletes a user account.
// The admin must supply a reason: Bertukar Pejabat, Bersara, or Lain-lain.
// Tickets issued by / assigned to this user are preserved (the foreign-key
// columns are nullable or we null out the assignment to avoid breaking history).
export async function DELETE(req: NextRequest, { params }: Params) {
  const admin = await requireRole('admin')
  if (admin instanceof Response) return admin
  const { id } = await params

  const body = await req.json().catch(() => ({}))
  const parsed = DELETE_REASON_SCHEMA.safeParse(body)
  if (!parsed.success) {
    return fail('A valid reason is required: Bertukar Pejabat, Bersara, or Lain-lain.', 400)
  }

  const target = await db.profile.findUnique({ where: { id } })
  if (!target) return fail('User not found', 404)

  // Guard: cannot delete the last active admin
  if (target.role === 'admin' && target.isActive) {
    const activeAdmins = await db.profile.count({ where: { role: 'admin', isActive: true } })
    if (activeAdmins <= 1) {
      return fail('Cannot delete the last active admin account.', 400)
    }
  }

  // Prevent self-deletion
  if (target.id === admin.id) {
    return fail('You cannot delete your own account.', 400)
  }

  // Null out assignments on tickets this user was assigned to (preserve ticket + history)
  await db.ticket.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } })
  await db.ticket.updateMany({ where: { assignedById: id }, data: { assignedById: null } })

  // Re-assign ownership of tickets issued by this user to the admin (issuedById is non-nullable)
  await db.ticket.updateMany({ where: { issuedById: id }, data: { issuedById: admin.id } })

  // Re-assign status-history actor records to the admin (actorId is non-nullable)
  // This preserves the full audit trail while removing the deleted user's account.
  await db.ticketStatusHistory.updateMany({ where: { actorId: id }, data: { actorId: admin.id } })

  await db.profile.delete({ where: { id } })

  return ok({
    success: true,
    message: `User ${target.fullName} (${target.email}) deleted. Reason: ${parsed.data.reason}.`,
    reason: parsed.data.reason,
    deletedUser: { id: target.id, fullName: target.fullName, email: target.email, role: target.role },
  })
}

