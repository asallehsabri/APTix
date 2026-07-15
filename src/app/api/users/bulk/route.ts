import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { requireRole, ok, fail } from '@/lib/security'

interface BulkRow {
  email: string
  fullName: string
  role: 'issuer' | 'technician' | 'admin'
}

interface BulkResult {
  success: { user: { id: string; fullName: string; email: string; role: string }; temporaryPassword: string }[]
  failures: { row: number; email: string; error: string }[]
}

// POST /api/users/bulk — admin creates multiple users from a parsed sheet
// Body: { users: [{ email, fullName, role }, ...] }
// Returns: { results: { success: [...], failures: [...] }, summary: {...} }
export async function POST(req: NextRequest) {
  const admin = await requireRole('admin')
  if (admin instanceof Response) return admin

  const body = await req.json().catch(() => null)
  const rows = body?.users

  if (!Array.isArray(rows) || rows.length === 0) {
    return fail('No users provided. Attach a sheet with at least one row.', 400)
  }
  if (rows.length > 200) {
    return fail('Too many rows. Maximum 200 users per bulk upload.', 400)
  }

  const validRoles = ['issuer', 'technician', 'admin']
  const results: BulkResult = { success: [], failures: [] }

  // First pass: validate all rows and collect emails to check for duplicates
  const seenEmails = new Set<string>()
  const existingEmails = new Set<string>()
  const existingUsers = await db.profile.findMany({
    where: { email: { in: rows.map((r: BulkRow) => String(r.email || '').toLowerCase()).filter(Boolean) } },
    select: { email: true },
  })
  existingUsers.forEach((u) => existingEmails.add(u.email))

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // +2 because row 1 is the header in the sheet
    const email = String(row?.email || '').trim().toLowerCase()
    const fullName = String(row?.fullName || row?.name || '').trim()
    const role = String(row?.role || '').trim().toLowerCase()

    // Validate email
    if (!email) {
      results.failures.push({ row: rowNum, email: '', error: 'Missing email' })
      continue
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      results.failures.push({ row: rowNum, email, error: 'Invalid email format' })
      continue
    }
    // Validate name
    if (!fullName || fullName.length < 2) {
      results.failures.push({ row: rowNum, email, error: 'Missing or too-short name' })
      continue
    }
    // Validate role
    if (!validRoles.includes(role)) {
      results.failures.push({ row: rowNum, email, error: `Invalid role "${role}". Must be Issuer, Technician, or Admin.` })
      continue
    }
    // Check duplicate within the sheet itself
    if (seenEmails.has(email)) {
      results.failures.push({ row: rowNum, email, error: 'Duplicate email within this sheet' })
      continue
    }
    // Check duplicate in database
    if (existingEmails.has(email)) {
      results.failures.push({ row: rowNum, email, error: 'A user with this email already exists' })
      continue
    }
    seenEmails.add(email)
  }

  // Second pass: create the valid users
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const email = String(row?.email || '').trim().toLowerCase()
    const fullName = String(row?.fullName || row?.name || '').trim()
    const role = String(row?.role || '').trim().toLowerCase() as 'issuer' | 'technician' | 'admin'
    const rowNum = i + 2

    // Skip rows that failed validation
    if (results.failures.some((f) => f.row === rowNum)) continue

    try {
      // Generate a strong temporary password
      const tempPassword = 'Temp' + Math.random().toString(36).slice(2, 8).toUpperCase() + '@' + Math.floor(1000 + Math.random() * 8999)
      const hash = await hashPassword(tempPassword)
      const created = await db.profile.create({
        data: {
          fullName,
          email,
          passwordHash: hash,
          role,
          mustChangePassword: true,
          isActive: true,
          emailVerified: false,
          createdBy: admin.id,
        },
        select: { id: true, fullName: true, email: true, role: true },
      })
      results.success.push({ user: created, temporaryPassword: tempPassword })
    } catch (e) {
      results.failures.push({
        row: rowNum,
        email,
        error: e instanceof Error ? e.message : 'Failed to create user',
      })
    }
  }

  return ok({
    results,
    summary: {
      total: rows.length,
      success: results.success.length,
      failures: results.failures.length,
    },
  }, 201)
}
