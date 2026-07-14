'use client'

import { useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  UserCog, Mail, Shield, Lock, Eye, EyeOff, Loader2, CheckCircle2, KeyRound, ShieldCheck, Calendar,
} from 'lucide-react'

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-primary/15 text-primary',
  technician: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  issuer: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
}

export function ProfileView() {
  const user = useAuthStore((s) => s.user)!
  const refresh = useAuthStore((s) => s.refresh)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  const valid = newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && /[0-9]/.test(newPassword) && newPassword === confirmPassword

  const initials = user.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setLoading(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      toast.success('Password updated successfully')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      refresh()
    } catch (err) {
      toast.error('Failed to update password', { description: err instanceof Error ? err.message : '' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Profile card */}
      <Card className="glass-strong border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><UserCog className="h-5 w-5 text-primary" /> My Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-border">
              <AvatarFallback className={`text-lg font-bold ${ROLE_COLORS[user.role]}`}>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-lg font-semibold">{user.fullName}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{user.email}</div>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge className={`${ROLE_COLORS[user.role]} border-0`} variant="secondary">{user.role}</Badge>
                {user.mustChangePassword && (
                  <Badge variant="outline" className="text-amber-600 border-amber-500/40">
                    <KeyRound className="h-3 w-3 mr-1" />Password change required
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
            <Info icon={ShieldCheck} label="Account Status" value={user.isActive === false ? 'Inactive' : 'Active'} />
            <Info icon={Calendar} label="Member Since" value={user.createdAt ? format(new Date(user.createdAt), 'dd MMM yyyy') : '—'} />
          </div>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card className="glass border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm"><Lock className="h-4 w-4 text-primary" /> Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cur" className="text-xs font-medium">Current Password</Label>
              <div className="relative">
                <Input id="cur" type={showPwd ? 'text' : 'password'} value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-background/40 pr-9" required disabled={loading} />
                <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="new" className="text-xs font-medium">New Password</Label>
                <Input id="new" type={showPwd ? 'text' : 'password'} value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-background/40" required disabled={loading} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="conf" className="text-xs font-medium">Confirm</Label>
                <Input id="conf" type={showPwd ? 'text' : 'password'} value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-background/40" required disabled={loading} />
              </div>
            </div>
            {newPassword && (
              <div className="flex flex-wrap gap-2 text-[10px]">
                <Req met={newPassword.length >= 8}>8+ chars</Req>
                <Req met={/[A-Z]/.test(newPassword)}>Uppercase</Req>
                <Req met={/[a-z]/.test(newPassword)}>Lowercase</Req>
                <Req met={/[0-9]/.test(newPassword)}>Number</Req>
                <Req met={!!newPassword && newPassword === confirmPassword}>Match</Req>
              </div>
            )}
            <Button type="submit" disabled={loading || !valid || !currentPassword}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Shield className="h-4 w-4 mr-1.5" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security info */}
      <Card className="glass border-0">
        <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
          <div className="font-semibold text-foreground flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" /> Your Security</div>
          <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5" /> Passwords are hashed with bcrypt — never stored in plain text.</div>
          <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5" /> Your session auto-expires after 8 hours of inactivity.</div>
          <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5" /> Row-Level-Security ensures you only see data permitted by your role.</div>
          <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5" /> All traffic is served over HTTPS with security headers enforced.</div>
        </CardContent>
      </Card>
    </div>
  )
}

function Info({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="glass rounded-lg p-2.5">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Icon className="h-3 w-3" />{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  )
}

function Req({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <span className={`px-1.5 py-0.5 rounded ${met ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
      {met ? '✓' : '○'} {children}
    </span>
  )
}
