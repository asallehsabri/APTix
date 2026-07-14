import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { schemas, validateBody, requireAuth, ok, fail } from '@/lib/security'

// POST /api/auth/change-password — forced first-login change + voluntary change (PRD FR-1.3, AC-2)
export async function POST(req: NextRequest) {
  const user = await requireAuth()
  if (user instanceof Response) return user

  const body = await req.json().catch(() => null)
  const parsed = await validateBody(schemas.changePassword, body)
  if ('error' in parsed) return parsed.error

  const { currentPassword, newPassword } = parsed.data
  const record = await db.profile.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
  if (!record) return fail('User not found', 404)

  const { verifyPassword } = await import('@/lib/auth')
  const valid = await verifyPassword(currentPassword, record.passwordHash)
  if (!valid) return fail('Current password is incorrect.', 400)

  if (currentPassword === newPassword) {
    return fail('New password must be different from the current password.', 400)
  }

  const hash = await hashPassword(newPassword)
  await db.profile.update({
    where: { id: user.id },
    data: { passwordHash: hash, mustChangePassword: false },
  })

  return ok({ success: true, message: 'Password updated successfully.' })
}
