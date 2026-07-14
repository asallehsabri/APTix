import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, signSession, setSessionCookie } from '@/lib/auth'
import { schemas, validateBody, checkRateLimit, getClientIP, ok, fail } from '@/lib/security'

// POST /api/auth/login — email/password authentication (PRD FR-1.1)
export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  const limit = checkRateLimit(ip)
  if (!limit.ok) {
    return fail(`Too many attempts. Try again in ${limit.retryAfterSec}s.`, 429)
  }

  const body = await req.json().catch(() => null)
  const parsed = await validateBody(schemas.login, body)
  if ('error' in parsed) return parsed.error

  const { email, password } = parsed.data
  const user = await db.profile.findUnique({ where: { email: email.toLowerCase() } })
  // Always run a hash compare to avoid user-enumeration timing attacks
  const valid = user ? await verifyPassword(password, user.passwordHash) : false
  if (!user || !valid) {
    return fail('Invalid email or password.', 401)
  }
  if (!user.isActive) {
    return fail('This account has been deactivated. Contact the ICT Unit.', 403)
  }

  const token = signSession({ userId: user.id, email: user.email, role: user.role as 'teacher' | 'technician' | 'admin' })
  await setSessionCookie(token)

  return ok({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  })
}
