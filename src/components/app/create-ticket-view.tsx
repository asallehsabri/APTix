'use client'

import { useEffect, useState } from 'react'
import { api, type Category } from '@/lib/api-client'
import { useUIStore } from '@/stores/ui-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Send, Loader2, Tag, MapPin, CalendarDays, FileText, CheckCircle2, ArrowLeft } from 'lucide-react'

// ADTEC Pedas locations (alphabetical order)
const LOCATIONS = [
  'Asrama',
  'Auditorium',
  'Bahagian CADD Mekanikal',
  'Bahagian CADD Seni Bina',
  'Bahagian Fabrikasi',
  'Bahagian Kimpalan',
  'Bahagian Mekatronik',
  'Bahagian Pembuatan (Pemesinan)',
  'Bahagian Telekomunikasi',
  'Dewan Serbaguna',
  'Pejabat Pengarah',
  'Pusat Sumber',
  'Surau',
  'Zon Eksekutif',
]

export function CreateTicketView() {
  const { setView, openTicket } = useUIStore()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [categoryId, setCategoryId] = useState<string>('')
  const [summary, setSummary] = useState('')
  const [location, setLocation] = useState<string>('')
  const [reportedDate, setReportedDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    api.listCategories().then((r) => setCategories(r.categories)).catch(() => {})
  }, [])

  const valid = categoryId && summary.length >= 5 && location && reportedDate

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setLoading(true)
    try {
      const { ticket } = await api.createTicket({
        categoryId: parseInt(categoryId, 10),
        summary: summary.trim(),
        location,
        reportedDate,
      })
      toast.success('Ticket created', { description: `${ticket.ticketNo} — ${ticket.category.name}` })
      openTicket(ticket.id)
    } catch (err) {
      toast.error('Failed to create ticket', { description: err instanceof Error ? err.message : '' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setView('dashboard')} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
      </Button>

      <Card className="glass-strong border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-primary" /> Report an ICT Issue
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Fill in the details below. Your ticket will be assigned a unique reference number and queued for the Admin to triage.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Category / Type *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="bg-background/40"><SelectValue placeholder="Select issue type" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            <div className="space-y-1.5">
              <Label htmlFor="sum" className="text-xs font-medium flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Summary of Issue *</Label>
              <Textarea id="sum" value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Describe the problem in detail (e.g. Projector in Bilik Latihan 2 shows no image when connected via HDMI)"
                className="bg-background/40 min-h-[100px]" required maxLength={1000}
                disabled={loading} />
              <div className="text-[10px] text-muted-foreground text-right">{summary.length}/1000</div>
            </div>

            {/* Location + Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Location *</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="bg-background/40"><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-xs font-medium flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Reported Date *</Label>
                <Input id="date" type="date" value={reportedDate}
                  onChange={(e) => setReportedDate(e.target.value)}
                  className="bg-background/40" required disabled={loading} />
              </div>
            </div>

            {/* Info box */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>
                Once submitted, your ticket receives a reference number (e.g. <span className="font-mono">APTIX-2026-000123</span>) and enters the <strong>Issued</strong> state (red). An Admin will assign it to a technician, and you'll be notified by email.
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setView('dashboard')} disabled={loading} className="flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !valid} className="flex-1">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                {loading ? 'Submitting…' : 'Submit Ticket'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
