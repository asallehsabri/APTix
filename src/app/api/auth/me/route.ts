import { getCurrentUser } from '@/lib/auth'
import { ok, fail } from '@/lib/security'

// GET /api/auth/me — current authenticated user (used by the SPA to bootstrap)
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return fail('Not authenticated', 401)
  return ok({ user })
}
