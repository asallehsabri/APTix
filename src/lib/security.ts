import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from './auth'
import type { Profile } from '@prisma/client'

// ============================================================================
// RLS-equivalent access control (PRD §11.1)
// In Supabase these would be PostgreSQL RLS policies; here we enforce the same
// rules in the API layer so the security model is identical regardless of the
// persistence backend.
// ============================================================================

export type Role = 'issuer' | 'technician' | 'admin'

export type SafeUser = Pick<
  Profile,
  'id' | 'fullName' | 'email' | 'role' | 'mustChangePassword' | 'isActive' | 'emailVerified' | 'createdAt'
>

/** Require an authenticated, active user. Returns 401 if not. */
export async function requireAuth(): Promise<SafeUser | NextResponse> {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
  }
  return user
}

/** Require a user with one of the allowed roles. Returns 403 if role not permitted. */
export async function requireRole(...roles: Role[]): Promise<SafeUser | NextResponse> {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  if (!roles.includes(user.role as Role)) {
    return NextResponse.json(
      { error: 'Forbidden. You do not have permission to perform this action.' },
      { status: 403 }
    )
  }
  return user
}

/** Require an active user who has already completed the forced password change (PRD FR-1.3, AC-2). */
export async function requirePasswordChanged(): Promise<SafeUser | NextResponse> {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  if (user.mustChangePassword) {
    return NextResponse.json(
      { error: 'Password change required.', code: 'MUST_CHANGE_PASSWORD' },
      { status: 403 }
    )
  }
  return user
}

/**
 * Ticket access check mirroring PRD §11.1 RLS policy on `tickets`:
 *  - admin: SELECT/UPDATE all tickets
 *  - technician: SELECT/UPDATE tickets assigned_to them
 *  - issuer: SELECT tickets they issued (no UPDATE)
 */
export function canAccessTicket(
  user: SafeUser,
  ticket: { issuedById: string; assignedToId: string | null }
): boolean {
  if (user.role === 'admin') return true
  if (user.role === 'technician') return ticket.assignedToId === user.id || ticket.issuedById === user.id
  return ticket.issuedById === user.id
}

/** Can the user UPDATE a ticket's status? (PRD FR-4.1) */
export function canUpdateTicketStatus(
  user: SafeUser,
  ticket: { issuedById: string; assignedToId: string | null }
): boolean {
  if (user.role === 'admin') return true
  if (user.role === 'technician') return ticket.assignedToId === user.id
  return false
}

/**
 * Can the user CONFIRM a ticket's resolution? (Issuer confirms resolution flow)
 * Only the issuer who created the ticket (or an admin) may confirm resolution.
 * The ticket must currently be in 'resolved' status.
 */
export function canConfirmResolution(
  user: SafeUser,
  ticket: { issuedById: string; assignedToId: string | null; currentStatus: string }
): boolean {
  if (ticket.currentStatus !== 'resolved') return false
  if (user.role === 'admin') return true
  // The issuer who created the ticket may confirm
  return ticket.issuedById === user.id
}

// ============================================================================
// Input validation (PRD §5 Security — defense against injection / malformed input)
// ============================================================================

export const schemas = {
  login: z.object({
    email: z.string().email('Valid email required').max(254),
    password: z.string().min(1, 'Password required').max(128),
  }),
  changePassword: z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
  }),
  forgotPassword: z.object({
    email: z.string().email().max(254),
  }),
  createUser: z.object({
    fullName: z.string().min(2, 'Name too short').max(100),
    email: z.string().email().max(254),
    role: z.enum(['issuer', 'technician', 'admin']),
  }),
  updateUser: z.object({
    fullName: z.string().min(2).max(100).optional(),
    role: z.enum(['issuer', 'technician', 'admin']).optional(),
    isActive: z.boolean().optional(),
  }),
  createTicket: z.object({
    categoryId: z.number().int().positive(),
    summary: z.string().min(5, 'Please describe the issue (min 5 chars)').max(1000),
    location: z.string().min(2, 'Location required').max(200),
    reportedDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'Valid date required'),
  }),
  assignTicket: z.object({
    assignedToId: z.string().min(1),
  }),
  updateStatus: z.object({
    status: z.enum(['in_progress', 'resolved', 'confirmed']),
    remarks: z.string().max(500).optional().nullable(),
  }),
  createCategory: z.object({
    name: z.string().min(2).max(50),
  }),
}

/** Validate `body` against a zod schema; returns either {data} or {error: NextResponse}. */
export async function validateBody<T>(
  schema: z.ZodType<T>,
  body: unknown
): Promise<{ data: T } | { error: NextResponse }> {
  const result = schema.safeParse(body)
  if (!result.success) {
    const firstError = result.error.issues[0]
    return {
      error: NextResponse.json(
        { error: firstError?.message ?? 'Invalid input', details: result.error.issues },
        { status: 400 }
      ),
    }
  }
  return { data: result.data }
}

// ============================================================================
// Rate limiting (in-memory, per-IP) — basic brute-force protection for login
// ============================================================================

const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_LOGIN_ATTEMPTS = 8
const LOGIN_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

export function checkRateLimit(ip: string): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (entry && now < entry.resetAt) {
    if (entry.count >= MAX_LOGIN_ATTEMPTS) {
      return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) }
    }
    entry.count++
    return { ok: true }
  }
  loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
  return { ok: true }
}

export function resetRateLimit(ip: string) {
  loginAttempts.delete(ip)
}

/** Extract client IP from request headers (behind Caddy/gateway). */
export function getClientIP(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const xri = req.headers.get('x-real-ip')
  if (xri) return xri
  return 'unknown'
}

// ============================================================================
// Standardised JSON helpers
// ============================================================================

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status })
}
