import { clearSessionCookie, getSession } from '@/lib/auth'
import { ok } from '@/lib/security'

// POST /api/auth/logout — destroy the session (PRD FR-1.7)
export async function POST() {
  const session = await getSession()
  await clearSessionCookie()
  return ok({ success: true, hadSession: !!session })
}
