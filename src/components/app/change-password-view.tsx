'use client'

import { useState } from 'react'
import { api } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ShieldAlert, Lock, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, LogOut } from 'lucide-react'

export function ChangePasswordView() {
  const user = useAuthStore((s) => s.user)
  const refresh = useAuthStore((s) => s.refresh)
  const logout = useAuthStore((s) => s.logout)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const requirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'An uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'A lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'A number', met: /[0-9]/.test(newPassword) },
    { label: 'Passwords match', met: !!newPassword && newPassword === confirmPassword },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-amber-400/20 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-float-slower" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl glass-strong mb-4">
            <ShieldAlert className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold">Set a New Password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome, {user?.fullName}. For security, you must set a new password before continuing.
          </p>
        </div>

        <Card className="glass-strong border-0">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4" />
              <span>First-login password rotation required (PRD §2.4)</span>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cur" className="text-xs font-medium">Current / Temporary Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cur" type={showPwd ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-9 pr-9 bg-background/40"
                    required disabled={loading}
                  />
                  <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new" className="text-xs font-medium">New Password</Label>
                <Input id="new" type={showPwd ? 'text' : 'password'} value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-background/40" required disabled={loading} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="conf" className="text-xs font-medium">Confirm New Password</Label>
                <Input id="conf" type={showPwd ? 'text' : 'password'} value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-background/40" required disabled={loading} />
              </div>

              {/* Password requirements */}
              <div className="rounded-lg bg-background/30 border border-border/50 p-3 space-y-1">
                {requirements.map((r) => (
                  <div key={r.label} className="flex items-center gap-2 text-xs">
                    {r.met ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40" />}
                    <span className={r.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>{r.label}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading || !requirements.every((r) => r.met)}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldAlert className="h-4 w-4 mr-2" />}
                Update Password & Continue
              </Button>

              <button type="button" onClick={logout} className="w-full text-xs text-muted-foreground hover:text-destructive flex items-center justify-center gap-1.5">
                <LogOut className="h-3 w-3" /> Sign out instead
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
