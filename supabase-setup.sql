-- ============================================================================
-- APTix — ADTEC Pedas ICT Ticketing System
-- Supabase Database Setup Script (Schema + Seed Data)
-- ============================================================================
-- HOW TO RUN:
--   1. Open your Supabase project: https://supabase.com/dashboard/project/fdweaayvwjnbiofurrqg
--   2. Click "SQL Editor" in the left sidebar
--   3. Click "+ New query"
--   4. Paste this ENTIRE file contents
--   5. Click "Run" (or press Ctrl+Enter)
--
-- This creates all tables, indexes, constraints, and seed data (dummy tickets,
-- users, categories) in one go. Safe to re-run (uses IF NOT EXISTS / ON CONFLICT).
-- ============================================================================

-- ===== 1. SCHEMA =====

-- Profiles (users)
CREATE TABLE IF NOT EXISTS "profiles" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'issuer',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_email_key" ON "profiles"("email");

-- Categories
CREATE TABLE IF NOT EXISTS "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_key" ON "categories"("name");

-- Tickets
CREATE TABLE IF NOT EXISTS "tickets" (
    "id" TEXT NOT NULL,
    "ticketNo" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "reportedDate" TIMESTAMP(3) NOT NULL,
    "issuedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "assignedById" TEXT,
    "currentStatus" TEXT NOT NULL DEFAULT 'issued',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "tickets_ticketNo_key" ON "tickets"("ticketNo");
CREATE INDEX IF NOT EXISTS "tickets_currentStatus_idx" ON "tickets"("currentStatus");
CREATE INDEX IF NOT EXISTS "tickets_assignedToId_idx" ON "tickets"("assignedToId");
CREATE INDEX IF NOT EXISTS "tickets_issuedById_idx" ON "tickets"("issuedById");

-- Ticket status history (audit log)
CREATE TABLE IF NOT EXISTS "ticket_status_history" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "remarks" TEXT,
    "actorId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_status_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ticket_status_history_ticketId_idx" ON "ticket_status_history"("ticketId");

-- Notification log
CREATE TABLE IF NOT EXISTS "notification_log" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recipients" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "notification_log_ticketId_idx" ON "notification_log"("ticketId");

-- Foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_categoryId_fkey') THEN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_issuedById_fkey') THEN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_issuedById_fkey"
      FOREIGN KEY ("issuedById") REFERENCES "profiles"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_assignedToId_fkey') THEN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignedToId_fkey"
      FOREIGN KEY ("assignedToId") REFERENCES "profiles"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_assignedById_fkey') THEN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignedById_fkey"
      FOREIGN KEY ("assignedById") REFERENCES "profiles"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_status_history_ticketId_fkey') THEN
    ALTER TABLE "ticket_status_history" ADD CONSTRAINT "ticket_status_history_ticketId_fkey"
      FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_status_history_actorId_fkey') THEN
    ALTER TABLE "ticket_status_history" ADD CONSTRAINT "ticket_status_history_actorId_fkey"
      FOREIGN KEY ("actorId") REFERENCES "profiles"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_log_ticketId_fkey') THEN
    ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_ticketId_fkey"
      FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- ===== 2. SEED DATA =====

-- Password hashes (bcrypt, cost 10):
--   'Password@123' → admin temp password (must change on first login)
--   'Pedas@2026'   → all other users (already changed)

-- Categories (PRD §7.2 / §16.3)
INSERT INTO "categories" ("name") VALUES
  ('WiFi/Network'),
  ('Software'),
  ('Computer'),
  ('PA System'),
  ('Media')
ON CONFLICT ("name") DO NOTHING;

-- Users (PRD §3.2 personas + extra dummy users)
-- IDs are fixed cuid-like strings so the ticket seed can reference them.
INSERT INTO "profiles" ("id", "fullName", "email", "passwordHash", "role", "mustChangePassword", "isActive", "emailVerified", "createdAt") VALUES
  ('u_admin_salleh',  'A. Salleh Sabri',     'asallehsabri@jtm.gov.my', '$2b$10$qAsLksuXLTTFYmgYECIL.uNeCgclKpxPRqia/tDp72F77Mt8WasAy', 'admin',      true,  true,  true, NOW() - INTERVAL '30 days'),
  ('u_admin_norliza', 'Norliza Hashim',      'norliza@jtm.gov.my',      '$2b$10$GbJw/HnKJl86rre7.j16D.IjEU9RWqImmf313saNn5yniqPNrJ2Nq', 'admin',      false, true,  true, NOW() - INTERVAL '25 days'),
  ('u_tech_firdaus',  'Firdaus Rahman',      'firdaus@jtm.gov.my',      '$2b$10$GbJw/HnKJl86rre7.j16D.IjEU9RWqImmf313saNn5yniqPNrJ2Nq', 'technician', false, true,  true, NOW() - INTERVAL '20 days'),
  ('u_tech_ganesh',   'Ganesh Kumaran',      'ganesh@jtm.gov.my',       '$2b$10$GbJw/HnKJl86rre7.j16D.IjEU9RWqImmf313saNn5yniqPNrJ2Nq', 'technician', false, true,  true, NOW() - INTERVAL '20 days'),
  ('u_tech_wong',     'Wong Mei Ling',       'wongml@jtm.gov.my',       '$2b$10$GbJw/HnKJl86rre7.j16D.IjEU9RWqImmf313saNn5yniqPNrJ2Nq', 'technician', false, true,  true, NOW() - INTERVAL '20 days'),
  ('u_issuer_aminah', 'Cikgu Aminah Yusof',  'aminah@jtm.gov.my',       '$2b$10$GbJw/HnKJl86rre7.j16D.IjEU9RWqImmf313saNn5yniqPNrJ2Nq', 'issuer',     false, true,  true, NOW() - INTERVAL '15 days'),
  ('u_issuer_rajesh', 'Cikgu Rajesh Pillai', 'rajesh@jtm.gov.my',       '$2b$10$GbJw/HnKJl86rre7.j16D.IjEU9RWqImmf313saNn5yniqPNrJ2Nq', 'issuer',     false, true,  true, NOW() - INTERVAL '15 days'),
  ('u_issuer_siti',   'Cikgu Siti Khadijah', 'siti.k@jtm.gov.my',       '$2b$10$GbJw/HnKJl86rre7.j16D.IjEU9RWqImmf313saNn5yniqPNrJ2Nq', 'issuer',     false, true,  true, NOW() - INTERVAL '15 days'),
  ('u_issuer_tan',    'Encik Tan Chee Keong','tanchee@jtm.gov.my',      '$2b$10$GbJw/HnKJl86rre7.j16D.IjEU9RWqImmf313saNn5yniqPNrJ2Nq', 'issuer',     false, true,  true, NOW() - INTERVAL '15 days'),
  ('u_issuer_faridah','Puan Faridah Omar',   'faridah@jtm.gov.my',      '$2b$10$GbJw/HnKJl86rre7.j16D.IjEU9RWqImmf313saNn5yniqPNrJ2Nq', 'issuer',     false, false, true, NOW() - INTERVAL '15 days')
ON CONFLICT ("email") DO NOTHING;

-- Tickets (15 dummy tickets across all statuses)
-- Category IDs: 1=WiFi/Network, 2=Software, 3=Computer, 4=PA System, 5=Media
INSERT INTO "tickets" ("id", "ticketNo", "categoryId", "summary", "location", "reportedDate", "issuedById", "assignedToId", "assignedById", "currentStatus", "createdAt", "updatedAt") VALUES
  ('t_001', 'APTIX-2026-000001', 3, 'Projector does not display image from laptop', 'Bahagian CADD Seni Bina', NOW() - INTERVAL '0 days', 'u_issuer_aminah', NULL, NULL, 'issued', NOW() - INTERVAL '0 days', NOW() - INTERVAL '0 days'),
  ('t_002', 'APTIX-2026-000002', 1, 'WiFi signal very weak in classroom', 'Bahagian Telekomunikasi', NOW() - INTERVAL '1 days', 'u_issuer_rajesh', 'u_tech_firdaus', 'u_admin_salleh', 'in_progress', NOW() - INTERVAL '1 days', NOW() - INTERVAL '0 days'),
  ('t_003', 'APTIX-2026-000003', 4, 'PA system no sound during announcement', 'Auditorium', NOW() - INTERVAL '2 days', 'u_issuer_siti', 'u_tech_ganesh', 'u_admin_salleh', 'in_progress', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 days'),
  ('t_004', 'APTIX-2026-000004', 2, 'Microsoft Office license activation failed', 'Bahagian CADD Seni Bina', NOW() - INTERVAL '0 days', 'u_issuer_tan', NULL, NULL, 'issued', NOW() - INTERVAL '0 days', NOW() - INTERVAL '0 days'),
  ('t_005', 'APTIX-2026-000005', 3, 'Desktop PC does not power on', 'Bahagian CADD Seni Bina', NOW() - INTERVAL '5 days', 'u_issuer_aminah', 'u_tech_firdaus', 'u_admin_salleh', 'resolved', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),
  ('t_006', 'APTIX-2026-000006', 5, 'Audiovisual media player stuck', 'Pusat Sumber', NOW() - INTERVAL '7 days', 'u_issuer_rajesh', 'u_tech_wong', 'u_admin_salleh', 'resolved', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days'),
  ('t_007', 'APTIX-2026-000007', 1, 'Network cable port loose at workstation', 'Bahagian Mekatronik', NOW() - INTERVAL '3 days', 'u_issuer_siti', 'u_tech_ganesh', 'u_admin_salleh', 'in_progress', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
  ('t_008', 'APTIX-2026-000008', 3, 'Monitor flickering continuously', 'Pusat Sumber', NOW() - INTERVAL '0 days', 'u_issuer_tan', NULL, NULL, 'issued', NOW() - INTERVAL '0 days', NOW() - INTERVAL '0 days'),
  ('t_009', 'APTIX-2026-000009', 2, 'Software installation request - AutoCAD', 'Dewan Serbaguna', NOW() - INTERVAL '10 days', 'u_issuer_aminah', 'u_tech_firdaus', 'u_admin_salleh', 'resolved', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days'),
  ('t_010', 'APTIX-2026-000010', 3, 'Computer lab PCs running very slow', 'Bahagian CADD Mekanikal', NOW() - INTERVAL '4 days', 'u_issuer_rajesh', 'u_tech_wong', 'u_admin_salleh', 'in_progress', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'),
  ('t_011', 'APTIX-2026-000011', 1, 'WiFi access point blinking red', 'Pejabat Pengarah', NOW() - INTERVAL '0 days', 'u_issuer_siti', NULL, NULL, 'issued', NOW() - INTERVAL '0 days', NOW() - INTERVAL '0 days'),
  ('t_012', 'APTIX-2026-000012', 4, 'Microphone for PA system not working', 'Auditorium', NOW() - INTERVAL '8 days', 'u_issuer_tan', 'u_tech_ganesh', 'u_admin_salleh', 'resolved', NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days'),
  ('t_013', 'APTIX-2026-000013', 5, 'HDMI cable missing for presentation', 'Pusat Sumber', NOW() - INTERVAL '2 days', 'u_issuer_aminah', 'u_tech_wong', 'u_admin_salleh', 'in_progress', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 days'),
  ('t_014', 'APTIX-2026-000014', 3, 'Printer cannot connect to network', 'Bahagian Kimpalan', NOW() - INTERVAL '12 days', 'u_issuer_rajesh', 'u_tech_firdaus', 'u_admin_salleh', 'resolved', NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days'),
  ('t_015', 'APTIX-2026-000015', 2, 'Smartboard touch not responding', 'Bahagian CADD Seni Bina', NOW() - INTERVAL '1 days', 'u_issuer_siti', NULL, NULL, 'issued', NOW() - INTERVAL '1 days', NOW() - INTERVAL '1 days')
ON CONFLICT ("ticketNo") DO NOTHING;

-- Status history (audit trail for each ticket)
INSERT INTO "ticket_status_history" ("id", "ticketId", "status", "remarks", "actorId", "changedAt") VALUES
  -- t_001 (issued)
  ('h_001a', 't_001', 'issued', 'Ticket created by issuer', 'u_issuer_aminah', NOW() - INTERVAL '0 days'),
  -- t_002 (issued → assigned → in_progress)
  ('h_002a', 't_002', 'issued', 'Ticket created by issuer', 'u_issuer_rajesh', NOW() - INTERVAL '1 days'),
  ('h_002b', 't_002', 'assigned', 'Assigned to Firdaus Rahman by Admin', 'u_admin_salleh', NOW() - INTERVAL '1 days' + INTERVAL '1 hour'),
  ('h_002c', 't_002', 'in_progress', 'Technician started working on the issue', 'u_tech_firdaus', NOW() - INTERVAL '1 days' + INTERVAL '2 hours'),
  -- t_003 (issued → assigned → in_progress)
  ('h_003a', 't_003', 'issued', 'Ticket created by issuer', 'u_issuer_siti', NOW() - INTERVAL '2 days'),
  ('h_003b', 't_003', 'assigned', 'Assigned to Ganesh Kumaran by Admin', 'u_admin_salleh', NOW() - INTERVAL '2 days' + INTERVAL '1 hour'),
  ('h_003c', 't_003', 'in_progress', 'Technician started working on the issue', 'u_tech_ganesh', NOW() - INTERVAL '2 days' + INTERVAL '2 hours'),
  -- t_004 (issued)
  ('h_004a', 't_004', 'issued', 'Ticket created by issuer', 'u_issuer_tan', NOW() - INTERVAL '0 days'),
  -- t_005 (issued → assigned → in_progress → resolved)
  ('h_005a', 't_005', 'issued', 'Ticket created by issuer', 'u_issuer_aminah', NOW() - INTERVAL '5 days'),
  ('h_005b', 't_005', 'assigned', 'Assigned to Firdaus Rahman by Admin', 'u_admin_salleh', NOW() - INTERVAL '5 days' + INTERVAL '1 hour'),
  ('h_005c', 't_005', 'in_progress', 'Technician started working on the issue', 'u_tech_firdaus', NOW() - INTERVAL '5 days' + INTERVAL '2 hours'),
  ('h_005d', 't_005', 'resolved', 'Issue resolved and verified working', 'u_tech_firdaus', NOW() - INTERVAL '4 days'),
  -- t_006 (issued → assigned → in_progress → resolved)
  ('h_006a', 't_006', 'issued', 'Ticket created by issuer', 'u_issuer_rajesh', NOW() - INTERVAL '7 days'),
  ('h_006b', 't_006', 'assigned', 'Assigned to Wong Mei Ling by Admin', 'u_admin_salleh', NOW() - INTERVAL '7 days' + INTERVAL '1 hour'),
  ('h_006c', 't_006', 'in_progress', 'Technician started working on the issue', 'u_tech_wong', NOW() - INTERVAL '7 days' + INTERVAL '2 hours'),
  ('h_006d', 't_006', 'resolved', 'Issue resolved and verified working', 'u_tech_wong', NOW() - INTERVAL '6 days'),
  -- t_007 (issued → assigned → in_progress)
  ('h_007a', 't_007', 'issued', 'Ticket created by issuer', 'u_issuer_siti', NOW() - INTERVAL '3 days'),
  ('h_007b', 't_007', 'assigned', 'Assigned to Ganesh Kumaran by Admin', 'u_admin_salleh', NOW() - INTERVAL '3 days' + INTERVAL '1 hour'),
  ('h_007c', 't_007', 'in_progress', 'Technician started working on the issue', 'u_tech_ganesh', NOW() - INTERVAL '3 days' + INTERVAL '2 hours'),
  -- t_008 (issued)
  ('h_008a', 't_008', 'issued', 'Ticket created by issuer', 'u_issuer_tan', NOW() - INTERVAL '0 days'),
  -- t_009 (issued → assigned → in_progress → resolved)
  ('h_009a', 't_009', 'issued', 'Ticket created by issuer', 'u_issuer_aminah', NOW() - INTERVAL '10 days'),
  ('h_009b', 't_009', 'assigned', 'Assigned to Firdaus Rahman by Admin', 'u_admin_salleh', NOW() - INTERVAL '10 days' + INTERVAL '1 hour'),
  ('h_009c', 't_009', 'in_progress', 'Technician started working on the issue', 'u_tech_firdaus', NOW() - INTERVAL '10 days' + INTERVAL '2 hours'),
  ('h_009d', 't_009', 'resolved', 'Issue resolved and verified working', 'u_tech_firdaus', NOW() - INTERVAL '9 days'),
  -- t_010 (issued → assigned → in_progress)
  ('h_010a', 't_010', 'issued', 'Ticket created by issuer', 'u_issuer_rajesh', NOW() - INTERVAL '4 days'),
  ('h_010b', 't_010', 'assigned', 'Assigned to Wong Mei Ling by Admin', 'u_admin_salleh', NOW() - INTERVAL '4 days' + INTERVAL '1 hour'),
  ('h_010c', 't_010', 'in_progress', 'Technician started working on the issue', 'u_tech_wong', NOW() - INTERVAL '4 days' + INTERVAL '2 hours'),
  -- t_011 (issued)
  ('h_011a', 't_011', 'issued', 'Ticket created by issuer', 'u_issuer_siti', NOW() - INTERVAL '0 days'),
  -- t_012 (issued → assigned → in_progress → resolved)
  ('h_012a', 't_012', 'issued', 'Ticket created by issuer', 'u_issuer_tan', NOW() - INTERVAL '8 days'),
  ('h_012b', 't_012', 'assigned', 'Assigned to Ganesh Kumaran by Admin', 'u_admin_salleh', NOW() - INTERVAL '8 days' + INTERVAL '1 hour'),
  ('h_012c', 't_012', 'in_progress', 'Technician started working on the issue', 'u_tech_ganesh', NOW() - INTERVAL '8 days' + INTERVAL '2 hours'),
  ('h_012d', 't_012', 'resolved', 'Issue resolved and verified working', 'u_tech_ganesh', NOW() - INTERVAL '7 days'),
  -- t_013 (issued → assigned → in_progress)
  ('h_013a', 't_013', 'issued', 'Ticket created by issuer', 'u_issuer_aminah', NOW() - INTERVAL '2 days'),
  ('h_013b', 't_013', 'assigned', 'Assigned to Wong Mei Ling by Admin', 'u_admin_salleh', NOW() - INTERVAL '2 days' + INTERVAL '1 hour'),
  ('h_013c', 't_013', 'in_progress', 'Technician started working on the issue', 'u_tech_wong', NOW() - INTERVAL '2 days' + INTERVAL '2 hours'),
  -- t_014 (issued → assigned → in_progress → resolved)
  ('h_014a', 't_014', 'issued', 'Ticket created by issuer', 'u_issuer_rajesh', NOW() - INTERVAL '12 days'),
  ('h_014b', 't_014', 'assigned', 'Assigned to Firdaus Rahman by Admin', 'u_admin_salleh', NOW() - INTERVAL '12 days' + INTERVAL '1 hour'),
  ('h_014c', 't_014', 'in_progress', 'Technician started working on the issue', 'u_tech_firdaus', NOW() - INTERVAL '12 days' + INTERVAL '2 hours'),
  ('h_014d', 't_014', 'resolved', 'Issue resolved and verified working', 'u_tech_firdaus', NOW() - INTERVAL '11 days'),
  -- t_015 (issued)
  ('h_015a', 't_015', 'issued', 'Ticket created by issuer', 'u_issuer_siti', NOW() - INTERVAL '1 days')
ON CONFLICT DO NOTHING;

-- Notification log (assignment + resolution emails for assigned/resolved tickets)
INSERT INTO "notification_log" ("id", "ticketId", "type", "recipients", "status", "subject", "body", "sentAt") VALUES
  ('n_002', 't_002', 'assignment', '["firdaus@jtm.gov.my","rajesh@jtm.gov.my"]', 'sent', '[APTix] Ticket APTIX-2026-000002 Assigned to You — WiFi/Network Issue at Bahagian Telekomunikasi', 'A new ICT ticket has been assigned to you.', NOW() - INTERVAL '1 days' + INTERVAL '1 hour'),
  ('n_003', 't_003', 'assignment', '["ganesh@jtm.gov.my","siti.k@jtm.gov.my"]', 'sent', '[APTix] Ticket APTIX-2026-000003 Assigned to You — PA System Issue at Auditorium', 'A new ICT ticket has been assigned to you.', NOW() - INTERVAL '2 days' + INTERVAL '1 hour'),
  ('n_005a', 't_005', 'assignment', '["firdaus@jtm.gov.my","aminah@jtm.gov.my"]', 'sent', '[APTix] Ticket APTIX-2026-000005 Assigned to You — Computer Issue at Bahagian CADD Seni Bina', 'A new ICT ticket has been assigned to you.', NOW() - INTERVAL '5 days' + INTERVAL '1 hour'),
  ('n_005b', 't_005', 'resolution', '["aminah@jtm.gov.my","asallehsabri@jtm.gov.my","norliza@jtm.gov.my"]', 'sent', '[APTix] Ticket APTIX-2026-000005 Resolved — Computer Issue at Bahagian CADD Seni Bina', 'Your ICT ticket has been resolved.', NOW() - INTERVAL '4 days'),
  ('n_006a', 't_006', 'assignment', '["wongml@jtm.gov.my","rajesh@jtm.gov.my"]', 'sent', '[APTix] Ticket APTIX-2026-000006 Assigned to You — Media Issue at Pusat Sumber', 'A new ICT ticket has been assigned to you.', NOW() - INTERVAL '7 days' + INTERVAL '1 hour'),
  ('n_006b', 't_006', 'resolution', '["rajesh@jtm.gov.my","asallehsabri@jtm.gov.my","norliza@jtm.gov.my"]', 'sent', '[APTix] Ticket APTIX-2026-000006 Resolved — Media Issue at Pusat Sumber', 'Your ICT ticket has been resolved.', NOW() - INTERVAL '6 days'),
  ('n_007', 't_007', 'assignment', '["ganesh@jtm.gov.my","siti.k@jtm.gov.my"]', 'sent', '[APTix] Ticket APTIX-2026-000007 Assigned to You — WiFi/Network Issue at Bahagian Mekatronik', 'A new ICT ticket has been assigned to you.', NOW() - INTERVAL '3 days' + INTERVAL '1 hour'),
  ('n_009a', 't_009', 'assignment', '["firdaus@jtm.gov.my","aminah@jtm.gov.my"]', 'sent', '[APTix] Ticket APTIX-2026-000009 Assigned to You — Software Issue at Dewan Serbaguna', 'A new ICT ticket has been assigned to you.', NOW() - INTERVAL '10 days' + INTERVAL '1 hour'),
  ('n_009b', 't_009', 'resolution', '["aminah@jtm.gov.my","asallehsabri@jtm.gov.my","norliza@jtm.gov.my"]', 'sent', '[APTix] Ticket APTIX-2026-000009 Resolved — Software Issue at Dewan Serbaguna', 'Your ICT ticket has been resolved.', NOW() - INTERVAL '9 days'),
  ('n_010', 't_010', 'assignment', '["wongml@jtm.gov.my","rajesh@jtm.gov.my"]', 'sent', '[APTix] Ticket APTIX-2026-000010 Assigned to You — Computer Issue at Bahagian CADD Mekanikal', 'A new ICT ticket has been assigned to you.', NOW() - INTERVAL '4 days' + INTERVAL '1 hour'),
  ('n_012a', 't_012', 'assignment', '["ganesh@jtm.gov.my","tanchee@jtm.gov.my"]', 'sent', '[APTix] Ticket APTIX-2026-000012 Assigned to You — PA System Issue at Auditorium', 'A new ICT ticket has been assigned to you.', NOW() - INTERVAL '8 days' + INTERVAL '1 hour'),
  ('n_012b', 't_012', 'resolution', '["tanchee@jtm.gov.my","asallehsabri@jtm.gov.my","norliza@jtm.gov.my"]', 'sent', '[APTix] Ticket APTIX-2026-000012 Resolved — PA System Issue at Auditorium', 'Your ICT ticket has been resolved.', NOW() - INTERVAL '7 days'),
  ('n_013', 't_013', 'assignment', '["wongml@jtm.gov.my","aminah@jtm.gov.my"]', 'sent', '[APTix] Ticket APTIX-2026-000013 Assigned to You — Media Issue at Pusat Sumber', 'A new ICT ticket has been assigned to you.', NOW() - INTERVAL '2 days' + INTERVAL '1 hour'),
  ('n_014a', 't_014', 'assignment', '["firdaus@jtm.gov.my","rajesh@jtm.gov.my"]', 'sent', '[APTix] Ticket APTIX-2026-000014 Assigned to You — Computer Issue at Bahagian Kimpalan', 'A new ICT ticket has been assigned to you.', NOW() - INTERVAL '12 days' + INTERVAL '1 hour'),
  ('n_014b', 't_014', 'resolution', '["rajesh@jtm.gov.my","asallehsabri@jtm.gov.my","norliza@jtm.gov.my"]', 'sent', '[APTix] Ticket APTIX-2026-000014 Resolved — Computer Issue at Bahagian Kimpalan', 'Your ICT ticket has been resolved.', NOW() - INTERVAL '11 days')
ON CONFLICT DO NOTHING;

-- ===== 3. VERIFICATION =====
SELECT 'Setup complete!' AS status,
       (SELECT COUNT(*) FROM "categories") AS categories,
       (SELECT COUNT(*) FROM "profiles") AS users,
       (SELECT COUNT(*) FROM "tickets") AS tickets,
       (SELECT COUNT(*) FROM "ticket_status_history") AS history_entries,
       (SELECT COUNT(*) FROM "notification_log") AS notifications;

-- ===== Demo Credentials =====
--   Admin (must change pw on first login):
--     asallehsabri@jtm.gov.my  /  Password@123
--   Admin:           norliza@jtm.gov.my  /  Pedas@2026
--   Technician:      firdaus@jtm.gov.my  /  Pedas@2026
--   Issuer:          aminah@jtm.gov.my   /  Pedas@2026
