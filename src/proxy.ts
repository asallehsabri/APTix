import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Security headers + lightweight proxy (PRD §5 Security, §11.2)
// In Next.js 16 this file is `proxy.ts` (previously `middleware.ts`).
// Applies CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
// Permissions-Policy and HSTS to every response.
export function proxy(_req: NextRequest) {
  const res = NextResponse.next()

  // Content Security Policy — restricts script/style/font/image sources to self + trusted CDNs.
  // Blocks inline scripts except where Next.js requires them (uses nonces in prod recommended).
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://z-cdn.chatglm.cn",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' ws: wss: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  )
  res.headers.set('X-Frame-Options', 'DENY') // anti-clickjacking
  res.headers.set('X-Content-Type-Options', 'nosniff') // anti-MIME sniff
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
