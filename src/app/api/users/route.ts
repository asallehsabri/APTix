import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import {
  schemas, validateBody, requireRole, ok, fail,
} from '@/lib/security'

// GET /api/users — list all users (Admin only, PRD FR-1.2, §11.1 profiles policy)
export async function GET() {
  const user = await requireRole('admin')
  if (user instanceof Response) return user
  const users = await db.profile.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, fullName: true, email: true, role: true,
      mustChangePassword: true, isActive: true, emailVerified: true, createdAt: true,
      createdBy: true,
    },
  })
  return ok({ users })
}

// POST /api/users — admin creates a new user (PRD FR-1.2)
// Generates a temporary password; the new user is forced to change it on first login.
export async function POST(req: NextRequest) {
  const admin = await requireRole('admin')
  if (admin instanceof Response) return admin

  const body = await req.json().catch(() => null)
  const parsed = await validateBody(schemas.createUser, body)
  if ('error' in parsed) return parsed.error

  const { fullName, email, role } = parsed.data
  const lower = email.toLowerCase()

  const existing = await db.profile.findUnique({ where: { email: lower } })
  if (existing) return fail('A user with this email already exists.', 409)

  // Generate a strong temporary password
  const tempPassword = 'Temp' + Math.random().toString(36).slice(2, 8).toUpperCase() + '@' + Math.floor(1000 + Math.random() * 8999)
  const hash = await hashPassword(tempPassword)

  const created = await db.profile.create({
    data: {
      fullName,
      email: lower,
      passwordHash: hash,
      role,
      mustChangePassword: true,
      isActive: true,
      emailVerified: false,
      createdBy: admin.id,
    },
    select: {
      id: true, fullName: true, email: true, role: true,
      mustChangePassword: true, isActive: true, createdAt: true,
    },
  })

  // In production a welcome/verify email would be sent via Supabase Auth.
  // Here we return the temp password ONCE to the admin for handoff.
  return ok({ user: created, temporaryPassword: tempPassword }, 201)
}
