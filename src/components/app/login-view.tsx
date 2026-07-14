'use client'

import { useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Ticket, Shield, Lock, Mail, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'

export function LoginView() {
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.forgotPassword(forgotEmail.trim())
      setForgotSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Ambient floating orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl animate-float-slower" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl animate-float-slow" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl glass-strong glow mb-4">
            <Ticket className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gradient">APTix</h1>
          <p className="text-sm text-muted-foreground mt-1">ADTEC Pedas ICT Ticketing System</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">i-Aduan ICT · Jabatan Tenaga Manusia</p>
        </div>

        <Card className="glass-strong border-0">
          <CardHeader className="space-y-1 pb-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              {mode === 'login' ? 'Secure Sign In' : 'Reset Password'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {mode === 'login'
                ? 'Access is restricted to registered JTM staff only.'
                : 'Enter your registered email to receive a reset link.'}
            </p>
          </CardHeader>
          <CardContent>
            {mode === 'login' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="username"
                      placeholder="name@jtm.gov.my"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 bg-background/40"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-9 bg-background/40"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading || !email || !password}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                  {loading ? 'Authenticating…' : 'Sign In Securely'}
                </Button>

                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError('') }}
                  className="w-full text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot your password?
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                {forgotSent ? (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-3 text-sm text-emerald-700 dark:text-emerald-400 text-center">
                    If that email exists, a reset link has been sent.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="forgot-email" className="text-xs font-medium">Registered Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="name@jtm.gov.my"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="pl-9 bg-background/40"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}
                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading || !forgotEmail}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send Reset Link
                </Button>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setForgotSent(false) }}
                  className="w-full text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  ← Back to sign in
                </button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Demo credentials hint */}
        <div className="mt-4 glass rounded-xl p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground/80 mb-1">Demo accounts</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <span>Admin (must change):</span><span className="font-mono">asallehsabri@jtm.gov.my</span>
            <span>Admin:</span><span className="font-mono">norliza@jtm.gov.my / Pedas@2026</span>
            <span>Technician:</span><span className="font-mono">firdaus@jtm.gov.my / Pedas@2026</span>
            <span>Issuer:</span><span className="font-mono">aminah@jtm.gov.my / Pedas@2026</span>
          </div>
          <p className="mt-1.5 text-[10px]">Admin temp password: <span className="font-mono">Password@123</span></p>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/60 mt-4">
          🔒 Protected by Row-Level-Security · HTTPS · bcrypt password hashing
        </p>
      </div>
    </div>
  )
}
