import bcrypt from 'bcryptjs'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { db } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'aptix-dev-secret-change-in-production-please-use-a-long-random-string'
const COOKIE_NAME = 'aptix_session'
const SESSION_MAX_AGE = 60 * 60 * 8 // 8 hours of inactivity (PRD FR-1.7)

export interface SessionPayload extends JwtPayload {
  userId: string
  email: string
  role: 'teacher' | 'technician' | 'admin'
}

/** Hash a plaintext password using bcrypt (PRD §5 Security) */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

/** Verify a plaintext password against a hash */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/** Sign a JWT session token */
export function signSession(payload: Omit<SessionPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_MAX_AGE })
}

/** Verify and decode a JWT session token */
export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload
  } catch {
    return null
  }
}

/** Read the current session from the httpOnly cookie (server-side) */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySession(token)
}

/** Get the full profile of the currently authenticated user */
export async function getCurrentUser() {
  const session = await getSession()
  if (!session) return null
  const user = await db.profile.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      mustChangePassword: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
    },
  })
  if (!user || !user.isActive) return null
  return user
}

/** Set the session cookie on the response (httpOnly, SameSite=Strict, Secure in prod) */
export async function setSessionCookie(token: string) {
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

/** Clear the session cookie (logout) */
export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export const AUTH_COOKIE = COOKIE_NAME
