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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Users, UserPlus, ShieldCheck, ShieldAlert, Power, Copy, Check, Loader2,
  Mail, Search, KeyRound, Upload, FileSpreadsheet, Download, AlertTriangle, Trash2,
} from 'lucide-react'

const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-primary/15 text-primary',
  technician: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  issuer: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
}

export function UserManagementView() {
  const me = useAuthStore((s) => s.user)!
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<Role>('issuer')
  const [creating, setCreating] = useState(false)
  const [tempPwd, setTempPwd] = useState<{ user: User; pwd: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Delete-user state
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleteReason, setDeleteReason] = useState<'Bertukar Pejabat' | 'Bersara' | 'Lain-lain' | ''>('')
  const [deleteNote, setDeleteNote] = useState('')
  const [deletingUser, setDeletingUser] = useState(false)

  // Bulk upload state
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkRows, setBulkRows] = useState<{ email: string; fullName: string; role: Role }[]>([])
  const [bulkFileName, setBulkFileName] = useState('')
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkResults, setBulkResults] = useState<{
    success: { user: User; temporaryPassword: string }[]
    failures: { row: number; email: string; error: string }[]
    summary: { total: number; success: number; failures: number }
  } | null>(null)

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
      setNewName(''); setNewEmail(''); setNewRole('issuer')
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

  const handleDeleteUser = async () => {
    if (!deleteTarget || !deleteReason) return
    setDeletingUser(true)
    try {
      const { message } = await api.deleteUser(deleteTarget.id, deleteReason, deleteNote || undefined)
      toast.success('User deleted', { description: message })
      setDeleteTarget(null)
      setDeleteReason('')
      setDeleteNote('')
      load()
    } catch (e) {
      toast.error('Delete failed', { description: e instanceof Error ? e.message : '' })
    } finally {
      setDeletingUser(false)
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

  // ===== Bulk upload helpers =====
  const downloadTemplate = () => {
    const csv = 'Email,Name,Role\njohn@jtm.gov.my,John Doe,Issuer\njane@jtm.gov.my,Jane Smith,Technician\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'aptix-bulk-users-template.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Template downloaded')
  }

  const parseCSV = (text: string): { email: string; fullName: string; role: Role }[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length === 0) return []
    // Detect header
    const first = lines[0].toLowerCase()
    const hasHeader = first.includes('email') && first.includes('name') && first.includes('role')
    const dataLines = hasHeader ? lines.slice(1) : lines
    const validRoles = ['issuer', 'technician', 'admin']
    const rows: { email: string; fullName: string; role: Role }[] = []
    for (const line of dataLines) {
      // Simple CSV parse (handles quoted fields minimally)
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
      if (cols.length < 3) continue
      const [email, fullName, roleRaw] = cols
      const role = roleRaw.toLowerCase()
      if (!email || !fullName || !role) continue
      rows.push({
        email,
        fullName,
        role: validRoles.includes(role) ? (role as Role) : 'issuer',
      })
    }
    return rows
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBulkFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '')
      const rows = parseCSV(text)
      if (rows.length === 0) {
        toast.error('No valid rows found. Use columns: Email, Name, Role')
        setBulkRows([])
        return
      }
      setBulkRows(rows)
      toast.info(`${rows.length} row(s) parsed from ${file.name}`)
    }
    reader.onerror = () => toast.error('Failed to read file')
    reader.readAsText(file)
  }

  const handleBulkSubmit = async () => {
    if (bulkRows.length === 0) return
    setBulkSubmitting(true)
    try {
      const { results, summary } = await api.bulkCreateUsers(bulkRows)
      setBulkResults({ ...results, summary })
      if (summary.success > 0) {
        toast.success(`${summary.success} user(s) created`, {
          description: summary.failures > 0 ? `${summary.failures} row(s) failed — see details` : undefined,
        })
        load()
      } else {
        toast.error('No users created — all rows failed validation')
      }
    } catch (e) {
      toast.error('Bulk upload failed', { description: e instanceof Error ? e.message : '' })
    } finally {
      setBulkSubmitting(false)
    }
  }

  const copyAllCredentials = () => {
    if (!bulkResults) return
    const text = bulkResults.success
      .map((s) => `${s.user.fullName}\t${s.user.email}\t${s.user.role}\t${s.temporaryPassword}`)
      .join('\n')
    navigator.clipboard.writeText(`Name\tEmail\tRole\tTemporary Password\n${text}`)
    toast.success('Credentials copied to clipboard')
  }

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
            <Button onClick={() => { setBulkOpen(true); setBulkResults(null); setBulkRows([]); setBulkFileName('') }} size="sm" variant="outline">
              <Upload className="h-4 w-4 mr-1.5" /> Bulk Upload
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
                          <SelectItem value="issuer">Issuer</SelectItem>
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
                      <Button size="sm" variant="outline"
                        onClick={() => { setDeleteTarget(u); setDeleteReason(''); setDeleteNote('') }}
                        disabled={updatingId === u.id}
                        className="h-7 px-2 text-destructive border-destructive/40 hover:bg-destructive/10" title="Delete user">
                        <Trash2 className="h-3.5 w-3.5" />
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
                  <SelectItem value="issuer">Issuer</SelectItem>
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

      {/* ===== Bulk Upload Dialog ===== */}
      <Dialog open={bulkOpen} onOpenChange={(o) => { setBulkOpen(o); if (!o) { setBulkResults(null); setBulkRows([]); setBulkFileName('') } }}>
        <DialogContent className="glass-strong max-w-3xl max-h-[85vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="h-4 w-4 text-primary" /> Bulk User Upload</DialogTitle>
            <DialogDescription>
              Upload a CSV sheet with columns <strong>Email, Name, Role</strong>. Role must be Issuer, Technician, or Admin.
              Each user gets a temporary password and must change it on first login.
            </DialogDescription>
          </DialogHeader>

          {!bulkResults ? (
            <div className="space-y-4 py-2">
              {/* Template download + file upload */}
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-1.5" /> Download Template
                </Button>
                <label className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium border border-input bg-background/40 hover:bg-background/60 h-9 px-3 cursor-pointer transition-colors">
                  <FileSpreadsheet className="h-4 w-4" /> Choose CSV file
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
                </label>
                {bulkFileName && <span className="text-xs text-muted-foreground">Selected: {bulkFileName}</span>}
              </div>

              {/* Preview table */}
              {bulkRows.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Preview — {bulkRows.length} row(s) ready to upload:</div>
                  <div className="rounded-lg glass overflow-hidden max-h-64 overflow-y-auto scrollbar-thin">
                    <table className="w-full text-xs">
                      <thead className="bg-background/40 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-semibold">#</th>
                          <th className="text-left p-2 font-semibold">Email</th>
                          <th className="text-left p-2 font-semibold">Name</th>
                          <th className="text-left p-2 font-semibold">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkRows.map((r, i) => (
                          <tr key={i} className="border-t border-border/40">
                            <td className="p-2 text-muted-foreground">{i + 1}</td>
                            <td className="p-2 font-mono">{r.email}</td>
                            <td className="p-2">{r.fullName}</td>
                            <td className="p-2"><Badge className={`${ROLE_COLORS[r.role]} border-0`} variant="secondary">{r.role}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>
                  Each new user receives a unique temporary password (shown after upload). Invalid emails, duplicate emails, or invalid roles will be skipped and reported in the results. Max 200 rows per upload.
                </span>
              </div>
            </div>
          ) : (
            // ===== Results view =====
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="glass rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{bulkResults.summary.total}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Total Rows</div>
                </div>
                <div className="rounded-lg p-3 text-center bg-emerald-500/15">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{bulkResults.summary.success}</div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase">Created</div>
                </div>
                <div className="rounded-lg p-3 text-center bg-red-500/15">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{bulkResults.summary.failures}</div>
                  <div className="text-[10px] text-red-700 dark:text-red-400 uppercase">Failed</div>
                </div>
              </div>

              {/* Success — credentials table */}
              {bulkResults.success.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Created Users — Temporary Passwords</div>
                    <Button size="sm" variant="outline" onClick={copyAllCredentials}><Copy className="h-3.5 w-3.5 mr-1" /> Copy all</Button>
                  </div>
                  <div className="rounded-lg glass overflow-hidden max-h-56 overflow-y-auto scrollbar-thin">
                    <table className="w-full text-xs">
                      <thead className="bg-background/40 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-semibold">Name</th>
                          <th className="text-left p-2 font-semibold">Email</th>
                          <th className="text-left p-2 font-semibold">Role</th>
                          <th className="text-left p-2 font-semibold">Temp Password</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkResults.success.map((s) => (
                          <tr key={s.user.id} className="border-t border-border/40">
                            <td className="p-2">{s.user.fullName}</td>
                            <td className="p-2 font-mono">{s.user.email}</td>
                            <td className="p-2"><Badge className={`${ROLE_COLORS[s.user.role as Role]} border-0`} variant="secondary">{s.user.role}</Badge></td>
                            <td className="p-2 font-mono text-primary">{s.temporaryPassword}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Failures */}
              {bulkResults.failures.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Failed Rows ({bulkResults.failures.length})</div>
                  <div className="rounded-lg bg-red-500/5 border border-red-500/20 overflow-hidden max-h-40 overflow-y-auto scrollbar-thin">
                    <table className="w-full text-xs">
                      <thead className="bg-background/40 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-semibold">Row</th>
                          <th className="text-left p-2 font-semibold">Email</th>
                          <th className="text-left p-2 font-semibold">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkResults.failures.map((f, i) => (
                          <tr key={i} className="border-t border-border/40">
                            <td className="p-2 text-muted-foreground">{f.row}</td>
                            <td className="p-2 font-mono">{f.email || '—'}</td>
                            <td className="p-2 text-red-600 dark:text-red-400">{f.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {!bulkResults ? (
              <>
                <Button variant="ghost" onClick={() => setBulkOpen(false)} disabled={bulkSubmitting}>Cancel</Button>
                <Button onClick={handleBulkSubmit} disabled={bulkSubmitting || bulkRows.length === 0}>
                  {bulkSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Upload className="h-4 w-4 mr-1.5" />}
                  {bulkSubmitting ? 'Creating…' : `Create ${bulkRows.length} User(s)`}
                </Button>
              </>
            ) : (
              <Button onClick={() => { setBulkOpen(false); setBulkResults(null); setBulkRows([]); setBulkFileName('') }}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Delete User with reason dialog ===== */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setDeleteReason(''); setDeleteNote('') } }}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-4 w-4" /> Delete User Account</DialogTitle>
            <DialogDescription>
              You are about to permanently delete <strong>{deleteTarget?.fullName}</strong> ({deleteTarget?.email}).
              Please select a reason for this deletion. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Reason for deletion *</Label>
              <Select value={deleteReason} onValueChange={(v) => setDeleteReason(v as 'Bertukar Pejabat' | 'Bersara' | 'Lain-lain')}>
                <SelectTrigger className="bg-background/40"><SelectValue placeholder="Select a reason" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bertukar Pejabat">Bertukar Pejabat</SelectItem>
                  <SelectItem value="Bersara">Bersara</SelectItem>
                  <SelectItem value="Lain-lain">Lain-lain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {deleteReason === 'Lain-lain' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Please specify (optional)</Label>
                <Input value={deleteNote} onChange={(e) => setDeleteNote(e.target.value)}
                  placeholder="e.g. Tamat kontrak"
                  className="bg-background/40" maxLength={200} disabled={deletingUser} />
              </div>
            )}
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-2.5 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Tickets issued by this user will be transferred to your account. Tickets assigned to them will become unassigned. Historical ticket data is preserved.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setDeleteTarget(null); setDeleteReason(''); setDeleteNote('') }} disabled={deletingUser}>Cancel</Button>
            <Button onClick={handleDeleteUser} disabled={deletingUser || !deleteReason} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingUser ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              {deletingUser ? 'Deleting…' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
