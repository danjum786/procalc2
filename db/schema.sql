-- Run this in Supabase: Project -> SQL Editor -> New query -> paste -> Run

create table if not exists installs (
  id bigint generated always as identity primary key,
  location_id text unique not null,
  company_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,

  name text,
  email text,
  phone text,
  website text,

  status text not null default 'none' check (status in ('none','pending','approved','rejected')),
  approve_token text,

  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security is on by default for new Supabase tables.
-- We access this table only via the backend using the service role key,
-- which bypasses RLS entirely, so no policies are required for this app to work.
-- Leaving RLS enabled (with no public policies) means the anon/public key
-- can never read or write this table even if it were ever exposed by mistake.
alter table installs enable row level security;
