/*
# Create transactions and events tables (multi-user, owner-scoped)

## Overview
LifeHub is a personal command center with Google OAuth sign-in. Each user
owns their transactions and calendar events. This migration creates two
owner-scoped tables with full RLS so a user can only see and modify their
own data.

## 1. New Tables

### transactions
- `id` (uuid, primary key)
- `user_id` (uuid, not null, defaults to auth.uid() — the signed-in owner)
- `amount` (numeric, not null) — transaction amount in dollars
- `payee` (text, not null) — who the payment went to
- `category` (text, not null) — one of: Food, Rent, Shopping, Clothes, Utilities, Entertainment, Misc
- `date` (date, not null) — when the transaction occurred (ISO YYYY-MM-DD)
- `is_subscription` (boolean, default false) — flags recurring bills
- `billing_cycle` (text, nullable) — Weekly, Monthly, or Annual (only when is_subscription)
- `renewal_date` (date, nullable) — next renewal date (only when is_subscription)
- `note` (text, nullable) — optional note
- `created_at` (timestamptz, default now())

### events
- `id` (uuid, primary key)
- `user_id` (uuid, not null, defaults to auth.uid() — the signed-in owner)
- `title` (text, not null) — event name
- `date` (date, not null) — the event date (ISO YYYY-MM-DD)
- `time` (text, nullable) — HH:MM format
- `location` (text, nullable)
- `description` (text, nullable)
- `type` (text, not null) — Meeting, Birthday, Anniversary, or Custom
- `is_annual` (boolean, default false) — whether it repeats yearly
- `original_date` (date, nullable) — for annual events, the original date used for yearly recurrence calc
- `source` (text, default 'manual') — 'manual' or 'google' (for synced events)
- `google_event_id` (text, nullable) — Google Calendar event ID for dedup on re-sync
- `created_at` (timestamptz, default now())

## 2. Security (RLS)
Both tables have RLS enabled with 4 owner-scoped policies each (SELECT,
INSERT, UPDATE, DELETE), restricted to `authenticated` users where
`auth.uid() = user_id`. The `user_id` column defaults to `auth.uid()` so
inserts that omit it still succeed.

## 3. Indexes
- `transactions(user_id)` — fast per-user transaction listing
- `transactions(date)` — date-range analytics queries
- `events(user_id)` — fast per-user event listing
- `events(date)` — calendar queries by date
- `events(google_event_id)` — dedup lookups during Google sync
*/

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payee text NOT NULL,
  category text NOT NULL CHECK (category IN ('Food','Rent','Shopping','Clothes','Utilities','Entertainment','Misc')),
  date date NOT NULL,
  is_subscription boolean NOT NULL DEFAULT false,
  billing_cycle text CHECK (billing_cycle IS NULL OR billing_cycle IN ('Weekly','Monthly','Annual')),
  renewal_date date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  date date NOT NULL,
  time text,
  location text,
  description text,
  type text NOT NULL CHECK (type IN ('Meeting','Birthday','Anniversary','Custom')),
  is_annual boolean NOT NULL DEFAULT false,
  original_date date,
  source text NOT NULL DEFAULT 'manual',
  google_event_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Transactions: owner-scoped CRUD
DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
CREATE POLICY "insert_own_transactions" ON transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_transactions" ON transactions;
CREATE POLICY "update_own_transactions" ON transactions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_transactions" ON transactions;
CREATE POLICY "delete_own_transactions" ON transactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Events: owner-scoped CRUD
DROP POLICY IF EXISTS "select_own_events" ON events;
CREATE POLICY "select_own_events" ON events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_events" ON events;
CREATE POLICY "insert_own_events" ON events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_events" ON events;
CREATE POLICY "update_own_events" ON events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_events" ON events;
CREATE POLICY "delete_own_events" ON events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_google_event_id ON events(google_event_id);
