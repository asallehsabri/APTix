import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding APTix database...')

  // --- Categories (PRD §7.2 / §16.3) ---
  const categories = await Promise.all(
    ['WiFi/Network', 'Software', 'Computer', 'PA System', 'Media'].map((name) =>
      prisma.category.upsert({ where: { name }, update: {}, create: { name } })
    )
  )
  console.log(`  ✓ ${categories.length} categories seeded`)

  // --- Password hashing ---
  const tempPass = await bcrypt.hash('Password@123', 10)
  const changedPass = await bcrypt.hash('Pedas@2026', 10)

  // --- Users (PRD §3.2 personas + extra dummy users) ---
  // Admin: must_change_password=true on first admin (asallehsabri) per PRD §2.4 / §11.2
  const usersData = [
    { fullName: 'A. Salleh Sabri', email: 'asallehsabri@jtm.gov.my', role: 'admin', mustChange: true, active: true, pass: tempPass },
    { fullName: 'Norliza Hashim', email: 'norliza@jtm.gov.my', role: 'admin', mustChange: false, active: true, pass: changedPass },
    { fullName: 'Firdaus Rahman', email: 'firdaus@jtm.gov.my', role: 'technician', mustChange: false, active: true, pass: changedPass },
    { fullName: 'Ganesh Kumaran', email: 'ganesh@jtm.gov.my', role: 'technician', mustChange: false, active: true, pass: changedPass },
    { fullName: 'Wong Mei Ling', email: 'wongml@jtm.gov.my', role: 'technician', mustChange: false, active: true, pass: changedPass },
    { fullName: 'Cikgu Aminah Yusof', email: 'aminah@jtm.gov.my', role: 'teacher', mustChange: false, active: true, pass: changedPass },
    { fullName: 'Cikgu Rajesh Pillai', email: 'rajesh@jtm.gov.my', role: 'teacher', mustChange: false, active: true, pass: changedPass },
    { fullName: 'Cikgu Siti Khadijah', email: 'siti.k@jtm.gov.my', role: 'teacher', mustChange: false, active: true, pass: changedPass },
    { fullName: 'Encik Tan Chee Keong', email: 'tanchee@jtm.gov.my', role: 'teacher', mustChange: false, active: true, pass: changedPass },
    { fullName: 'Puan Faridah Omar', email: 'faridah@jtm.gov.my', role: 'teacher', mustChange: false, active: false, pass: changedPass },
  ]

  const users: Record<string, string> = {}
  for (const u of usersData) {
    const created = await prisma.profile.upsert({
      where: { email: u.email },
      update: {},
      create: {
        fullName: u.fullName,
        email: u.email,
        passwordHash: u.pass,
        role: u.role,
        mustChangePassword: u.mustChange,
        isActive: u.active,
        emailVerified: true,
        createdBy: u.role === 'admin' ? null : null,
      },
    })
    users[u.email] = created.id
  }
  console.log(`  ✓ ${usersData.length} users seeded`)

  // --- Tickets (PRD §4.2, §7.3, §8) ---
  const catMap = Object.fromEntries(categories.map((c) => [c.name, c.id]))
  const locations = [
    'Bilik Latihan 1', 'Bilik Latihan 2', 'Bilik Latihan 3',
    'Makmal Komputer 1', 'Makmal Komputer 2', 'Dewan Utama',
    'Bengkel Elektrik', 'Pusat Sumber', 'Pejabat Pentadbiran', 'Bilik Kuliah A',
  ]
  const summaries = [
    'Projector does not display image from laptop',
    'Desktop PC does not power on',
    'WiFi signal very weak in classroom',
    'Microsoft Office license activation failed',
    'PA system no sound during announcement',
    'Printer cannot connect to network',
    'Monitor flickering continuously',
    'Smartboard touch not responding',
    'Network cable port loose at workstation',
    'Audiovisual media player stuck',
    'Computer lab PCs running very slow',
    'Software installation request - AutoCAD',
    'WiFi access point blinking red',
    'Microphone for PA system not working',
    'HDMI cable missing for presentation',
  ]

  const ticketsData = [
    { issuer: 'aminah@jtm.gov.my', cat: 'Computer', loc: locations[1], summ: summaries[0], status: 'issued', assignee: null, daysAgo: 0 },
    { issuer: 'rajesh@jtm.gov.my', cat: 'WiFi/Network', loc: locations[2], summ: summaries[2], status: 'in_progress', assignee: 'firdaus@jtm.gov.my', daysAgo: 1 },
    { issuer: 'siti.k@jtm.gov.my', cat: 'PA System', loc: locations[5], summ: summaries[4], status: 'in_progress', assignee: 'ganesh@jtm.gov.my', daysAgo: 2 },
    { issuer: 'tanchee@jtm.gov.my', cat: 'Software', loc: locations[8], summ: summaries[3], status: 'issued', assignee: null, daysAgo: 0 },
    { issuer: 'aminah@jtm.gov.my', cat: 'Computer', loc: locations[1], summ: summaries[1], status: 'resolved', assignee: 'firdaus@jtm.gov.my', daysAgo: 5 },
    { issuer: 'rajesh@jtm.gov.my', cat: 'Media', loc: locations[4], summ: summaries[9], status: 'resolved', assignee: 'wongml@jtm.gov.my', daysAgo: 7 },
    { issuer: 'siti.k@jtm.gov.my', cat: 'WiFi/Network', loc: locations[6], summ: summaries[8], status: 'in_progress', assignee: 'ganesh@jtm.gov.my', daysAgo: 3 },
    { issuer: 'tanchee@jtm.gov.my', cat: 'Computer', loc: locations[3], summ: summaries[6], status: 'issued', assignee: null, daysAgo: 0 },
    { issuer: 'aminah@jtm.gov.my', cat: 'Software', loc: locations[9], summ: summaries[11], status: 'resolved', assignee: 'firdaus@jtm.gov.my', daysAgo: 10 },
    { issuer: 'rajesh@jtm.gov.my', cat: 'Computer', loc: locations[3], summ: summaries[10], status: 'in_progress', assignee: 'wongml@jtm.gov.my', daysAgo: 4 },
    { issuer: 'siti.k@jtm.gov.my', cat: 'WiFi/Network', loc: locations[0], summ: summaries[12], status: 'issued', assignee: null, daysAgo: 0 },
    { issuer: 'tanchee@jtm.gov.my', cat: 'PA System', loc: locations[5], summ: summaries[13], status: 'resolved', assignee: 'ganesh@jtm.gov.my', daysAgo: 8 },
    { issuer: 'aminah@jtm.gov.my', cat: 'Media', loc: locations[7], summ: summaries[14], status: 'in_progress', assignee: 'wongml@jtm.gov.my', daysAgo: 2 },
    { issuer: 'rajesh@jtm.gov.my', cat: 'Computer', loc: locations[4], summ: summaries[5], status: 'resolved', assignee: 'firdaus@jtm.gov.my', daysAgo: 12 },
    { issuer: 'siti.k@jtm.gov.my', cat: 'Software', loc: locations[8], summ: summaries[7], status: 'issued', assignee: null, daysAgo: 1 },
  ]

  let ticketCounter = 0
  for (const t of ticketsData) {
    ticketCounter++
    const ticketNo = `APTIX-2026-${String(ticketCounter).padStart(6, '0')}`
    const reportedDate = new Date(Date.now() - t.daysAgo * 86400000)
    const created = await prisma.ticket.create({
      data: {
        ticketNo,
        categoryId: catMap[t.cat],
        summary: t.summ,
        location: t.loc,
        reportedDate,
        issuedById: users[t.issuer],
        assignedToId: t.assignee ? users[t.assignee] : null,
        assignedById: t.assignee ? users['asallehsabri@jtm.gov.my'] : null,
        currentStatus: t.status,
        createdAt: reportedDate,
      },
    })

    // Status history
    await prisma.ticketStatusHistory.create({
      data: {
        ticketId: created.id,
        status: 'issued',
        remarks: 'Ticket created by issuer',
        actorId: users[t.issuer],
        changedAt: reportedDate,
      },
    })
    if (t.assignee) {
      const assignedAt = new Date(reportedDate.getTime() + 3600000)
      await prisma.ticketStatusHistory.create({
        data: {
          ticketId: created.id,
          status: 'assigned',
          remarks: `Assigned to technician by Admin`,
          actorId: users['asallehsabri@jtm.gov.my'],
          changedAt: assignedAt,
        },
      })
    }
    if (t.status === 'in_progress' || t.status === 'resolved') {
      const inProgressAt = new Date(reportedDate.getTime() + 7200000)
      await prisma.ticketStatusHistory.create({
        data: {
          ticketId: created.id,
          status: 'in_progress',
          remarks: 'Technician started working on the issue',
          actorId: users[t.assignee!],
          changedAt: inProgressAt,
        },
      })
    }
    if (t.status === 'resolved') {
      const resolvedAt = new Date(reportedDate.getTime() + 86400000)
      await prisma.ticketStatusHistory.create({
        data: {
          ticketId: created.id,
          status: 'resolved',
          remarks: 'Issue resolved and verified working',
          actorId: users[t.assignee!],
          changedAt: resolvedAt,
        },
      })
      // Notification log for resolution
      await prisma.notificationLog.create({
        data: {
          ticketId: created.id,
          type: 'resolution',
          recipients: JSON.stringify([t.issuer, 'asallehsabri@jtm.gov.my', 'norliza@jtm.gov.my']),
          status: 'sent',
          subject: `[APTix] Ticket ${ticketNo} Resolved`,
          body: `Ticket ${ticketNo} has been resolved. Category: ${t.cat}. Location: ${t.loc}.`,
          sentAt: resolvedAt,
        },
      })
    }
    if (t.assignee) {
      await prisma.notificationLog.create({
        data: {
          ticketId: created.id,
          type: 'assignment',
          recipients: JSON.stringify([t.assignee, t.issuer]),
          status: 'sent',
          subject: `[APTix] Ticket ${ticketNo} Assigned to You`,
          body: `Ticket ${ticketNo} has been assigned. Category: ${t.cat}. Summary: ${t.summ}.`,
          sentAt: new Date(reportedDate.getTime() + 3600000),
        },
      })
    }
  }
  console.log(`  ✓ ${ticketsData.length} tickets seeded with history + notifications`)

  console.log('\n✅ Seed complete. Demo credentials:')
  console.log('   Admin (must change pw):  asallehsabri@jtm.gov.my / Password@123')
  console.log('   Admin:                   norliza@jtm.gov.my / Pedas@2026')
  console.log('   Technician:              firdaus@jtm.gov.my / Pedas@2026')
  console.log('   Teacher:                 aminah@jtm.gov.my / Pedas@2026')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
