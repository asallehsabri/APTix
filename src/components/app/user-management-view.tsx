'use client'

import { useEffect, useState } from 'react'
import { api, type User, type Role } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Users, UserPlus, ShieldCheck, ShieldAlert, Power, Copy, Check, Loader2,
  Mail, Search, KeyRound,
} from 'lucide-react'

const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-primary/15 text-primary',
  technician: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  teacher: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
}

export function UserManagementView() {
  const me = useAuthStore((s) => s.user)!
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<Role>('teacher')
  const [creating, setCreating] = useState(false)
  const [tempPwd, setTempPwd] = useState<{ user: User; pwd: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const { users } = await api.listUsers()
      setUsers(users)
    } catch (e) {
      toast.error('Failed to load users', { description: e instanceof Error ? e.message : '' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = users.filter((u) =>
    !q || u.fullName.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase())
  )

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const { user, temporaryPassword } = await api.createUser(newName.trim(), newEmail.trim().toLowerCase(), newRole)
      toast.success('User created', { description: `${user.email} — share the temporary password securely.` })
      setTempPwd({ user, pwd: temporaryPassword })
      setCreateOpen(false)
      setNewName(''); setNewEmail(''); setNewRole('teacher')
      load()
    } catch (e) {
      toast.error('Failed to create user', { description: e instanceof Error ? e.message : '' })
    } finally {
      setCreating(false)
    }
  }

  const toggleActive = async (u: User) => {
    setUpdatingId(u.id)
    try {
      await api.updateUser(u.id, { isActive: !u.isActive })
      toast.success(`${u.fullName} ${u.isActive ? 'deactivated' : 'reactivated'}`)
      load()
    } catch (e) {
      toast.error('Update failed', { description: e instanceof Error ? e.message : '' })
    } finally {
      setUpdatingId(null)
    }
  }

  const changeRole = async (u: User, role: Role) => {
    setUpdatingId(u.id)
    try {
      await api.updateUser(u.id, { role })
      toast.success(`${u.fullName} is now ${role}`)
      load()
    } catch (e) {
      toast.error('Update failed', { description: e instanceof Error ? e.message : '' })
    } finally {
      setUpdatingId(null)
    }
  }

  const copyPwd = () => {
    if (tempPwd) {
      navigator.clipboard.writeText(tempPwd.pwd)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const initials = (name: string) => name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  return (
    <div className="space-y-4">
      <Card className="glass border-0">
        <CardContent className="p-3 sm:p-4 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-semibold">{users.length} users</span>
            <span className="text-xs text-muted-foreground">({users.filter((u) => u.isActive).length} active)</span>
          </div>
          <div className="flex items-center gap-2 flex-1 sm:flex-none sm:w-64">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 bg-background/40 h-9" />
            </div>
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <UserPlus className="h-4 w-4 mr-1.5" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((u) => (
            <Card key={u.id} className={`glass border-0 ${!u.isActive ? 'opacity-60' : ''}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarFallback className={`text-xs font-semibold ${ROLE_COLORS[u.role]}`}>
                      {initials(u.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{u.fullName}</div>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="h-3 w-3" />{u.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${ROLE_COLORS[u.role]} border-0`} variant="secondary">{u.role}</Badge>
                  {u.mustChangePassword && (
                    <Badge variant="outline" className="text-amber-600 border-amber-500/40">
                      <KeyRound className="h-3 w-3 mr-1" />Must change pw
                    </Badge>
                  )}
                  {!u.isActive && (
                    <Badge variant="outline" className="text-red-500 border-red-500/40">Inactive</Badge>
                  )}
                </div>

                <div className="text-[10px] text-muted-foreground">
                  Created {u.createdAt ? format(new Date(u.createdAt), 'dd MMM yyyy') : '—'}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                  {u.id !== me.id && (
                    <>
                      <Select value={u.role} onValueChange={(v) => changeRole(u, v as Role)} disabled={updatingId === u.id}>
                        <SelectTrigger className="h-7 text-xs bg-background/40 flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="teacher">Teacher</SelectItem>
                          <SelectItem value="technician">Technician</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant={u.isActive ? 'outline' : 'default'}
                        onClick={() => toggleActive(u)} disabled={updatingId === u.id}
                        className="h-7 px-2" title={u.isActive ? 'Deactivate' : 'Reactivate'}>
                        {updatingId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                          u.isActive ? <Power className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      </Button>
                    </>
                  )}
                  {u.id === me.id && (
                    <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> This is you
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" /> Create New User</DialogTitle>
            <DialogDescription>
              A temporary password will be generated. The new user must change it on first login (PRD FR-1.3).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createUser} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Full Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-background/40" required disabled={creating} placeholder="Cikgu Aminah Yusof" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email Address</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="bg-background/40" required disabled={creating} placeholder="name@jtm.gov.my" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
                <SelectTrigger className="bg-background/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
              <Button type="submit" disabled={creating || !newName || !newEmail}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <UserPlus className="h-4 w-4 mr-1.5" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Temp password reveal dialog */}
      <Dialog open={!!tempPwd} onOpenChange={(o) => !o && setTempPwd(null)}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600"><ShieldCheck className="h-4 w-4" /> User Created Successfully</DialogTitle>
            <DialogDescription>
              Share these credentials securely with <strong>{tempPwd?.user.fullName}</strong>. The password is shown only once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="glass rounded-lg p-3 space-y-1">
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="font-mono text-sm">{tempPwd?.user.email}</div>
            </div>
            <div className="glass rounded-lg p-3 space-y-1">
              <div className="text-xs text-muted-foreground flex items-center gap-1"><KeyRound className="h-3 w-3" /> Temporary Password</div>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm flex-1 bg-background/40 px-2 py-1 rounded">{tempPwd?.pwd}</code>
                <Button size="sm" variant="outline" onClick={copyPwd}>
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-700 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>The user must change this password at first login. In production, a verification email would also be sent via Supabase Auth.</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setTempPwd(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
