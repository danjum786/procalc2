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

alter table installs enable row level security;