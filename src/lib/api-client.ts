// Lightweight typed API client for the APTix frontend.
// All requests are relative (Caddy routes them). Throws on non-2xx with the
// server-provided error message.

export type Role = 'issuer' | 'technician' | 'admin'
export type TicketStatus = 'issued' | 'in_progress' | 'resolved'

export interface User {
  id: string
  fullName: string
  email: string
  role: Role
  mustChangePassword: boolean
  isActive?: boolean
  emailVerified?: boolean
  createdAt?: string
}

export interface Category { id: number; name: string }

export interface Ticket {
  id: string
  ticketNo: string
  categoryId: number
  category: Category
  summary: string
  location: string
  reportedDate: string
  issuedById: string
  issuedBy: { id: string; fullName: string; email: string }
  assignedToId: string | null
  assignedTo: { id: string; fullName: string; email: string } | null
  assignedById: string | null
  assignedBy: { id: string; fullName: string; email: string } | null
  currentStatus: TicketStatus
  createdAt: string
  updatedAt: string
  history?: HistoryEntry[]
  notifications?: NotificationEntry[]
}

export interface HistoryEntry {
  id: string
  ticketId: string
  status: string
  remarks: string | null
  actorId: string
  actor: { id: string; fullName: string; email: string; role: Role }
  changedAt: string
}

export interface NotificationEntry {
  id: string
  ticketId: string
  type: 'assignment' | 'resolution'
  recipients: string[]
  status: string
  subject: string
  body: string
  sentAt: string
  ticket?: { ticketNo: string; summary: string; location: string; category: { name: string } }
}

export interface DashboardData {
  scope: string
  statusCounts: { issued: number; in_progress: number; resolved: number }
  byCategory: { category: string; count: number }[]
  byLocation: { location: string; count: number }[]
  recent: Ticket[]
  total: number
  unassigned?: Ticket[]
  technicians?: { id: string; fullName: string; email: string; assignedTickets: { id: string; currentStatus: string }[] }[]
  avgResolutionHours?: number
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    credentials: 'include',
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`
    const err = new Error(msg) as Error & { status?: number; code?: string }
    err.status = res.status
    err.code = data?.code
    throw err
  }
  return data as T
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ user: User }>('/api/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST', body: JSON.stringify({ currentPassword, newPassword }),
    }),
  forgotPassword: (email: string) =>
    request<{ success: boolean; message: string }>('/api/auth/forgot-password', {
      method: 'POST', body: JSON.stringify({ email }),
    }),

  // Users (admin)
  listUsers: () => request<{ users: User[] }>('/api/users'),
  createUser: (fullName: string, email: string, role: Role) =>
    request<{ user: User; temporaryPassword: string }>('/api/users', {
      method: 'POST', body: JSON.stringify({ fullName, email, role }),
    }),
  updateUser: (id: string, data: { fullName?: string; role?: Role; isActive?: boolean }) =>
    request<{ user: User }>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Categories
  listCategories: () => request<{ categories: Category[] }>('/api/categories'),
  createCategory: (name: string) =>
    request<{ category: Category }>('/api/categories', { method: 'POST', body: JSON.stringify({ name }) }),

  // Tickets
  listTickets: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ tickets: Ticket[] }>(`/api/tickets${qs}`)
  },
  getTicket: (id: string) => request<{ ticket: Ticket }>(`/api/tickets/${id}`),
  createTicket: (data: { categoryId: number; summary: string; location: string; reportedDate: string }) =>
    request<{ ticket: Ticket }>('/api/tickets', { method: 'POST', body: JSON.stringify(data) }),
  assignTicket: (id: string, assignedToId: string) =>
    request<{ ticket: Ticket; message: string }>(`/api/tickets/${id}/assign`, {
      method: 'POST', body: JSON.stringify({ assignedToId }),
    }),
  updateStatus: (id: string, status: 'in_progress' | 'resolved', remarks?: string) =>
    request<{ ticket: Ticket; message: string }>(`/api/tickets/${id}/status`, {
      method: 'POST', body: JSON.stringify({ status, remarks }),
    }),

  // Dashboard
  dashboard: (scope?: 'mine' | 'assigned') =>
    request<DashboardData>(`/api/dashboard${scope ? `?scope=${scope}` : ''}`),

  // Notifications (admin)
  listNotifications: () => request<{ notifications: NotificationEntry[] }>('/api/notifications'),
}
