import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { schemas, validateBody, ok, fail } from '@/lib/security'

// POST /api/auth/forgot-password — request a reset link (PRD FR-1.5)
// In production this would email a Supabase-Auth reset link. Here we simply
// acknowledge the request and reset must_change_password guidance, without
// leaking whether the email exists (anti-enumeration).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = await validateBody(schemas.forgotPassword, body)
  if ('error' in parsed) return parsed.error

  const { email } = parsed.data
  const user = await db.profile.findUnique({ where: { email: email.toLowerCase() } })
  if (user && user.isActive) {
    // In production: trigger Supabase Auth reset email here.
    // For this demo we log it so the admin can see the request.
    console.log(`[forgot-password] reset requested for ${user.email}`)
  }
  // Always return the same message to avoid account enumeration
  return ok({
    success: true,
    message: 'If that email exists, a password reset link has been sent.',
  })
}
