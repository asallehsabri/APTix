import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole, schemas, validateBody, ok, fail } from '@/lib/security'

// GET /api/categories — list categories (any authenticated user, PRD §11.1)
export async function GET() {
  const user = await requireAuth()
  if (user instanceof Response) return user
  const categories = await db.category.findMany({ orderBy: { id: 'asc' } })
  return ok({ categories })
}

// POST /api/categories — admin creates a new category
export async function POST(req: NextRequest) {
  const admin = await requireRole('admin')
  if (admin instanceof Response) return admin
  const body = await req.json().catch(() => null)
  const parsed = await validateBody(schemas.createCategory, body)
  if ('error' in parsed) return parsed.error

  const existing = await db.category.findUnique({ where: { name: parsed.data.name } })
  if (existing) return fail('Category already exists', 409)

  const created = await db.category.create({ data: { name: parsed.data.name } })
  return ok({ category: created }, 201)
}
