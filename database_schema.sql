-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS TABLE
create table users (
  id uuid primary key default uuid_generate_v4(),
  username text unique not null,
  password text not null, -- Stored as plain text for prototype (should be hashed in production)
  name text not null,
  role text not null check (role in ('GESTOR', 'PROJETISTA', 'CEO', 'QUALIDADE', 'PROCESSOS')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PROJECTS TABLE
create table projects (
  id uuid primary key default uuid_generate_v4(),
  ns text not null,
  client_name text,
  flooring_type text,
  project_code text,
  type text not null,
  implement_type text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  total_active_seconds numeric default 0,
  pauses jsonb default '[]'::jsonb,
  variations jsonb default '[]'::jsonb,
  status text check (status in ('COMPLETED', 'IN_PROGRESS')),
  notes text,
  user_id uuid references users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ISSUES TABLE
create table issues (
  id uuid primary key default uuid_generate_v4(),
  project_ns text not null,
  type text not null,
  description text not null,
  date timestamp with time zone not null,
  reported_by uuid references users(id),
  
  -- Cost & Quality Control Fields
  time_spent numeric default 0,
  hourly_rate numeric default 0,
  material_cost numeric default 0,
  total_cost numeric default 0,
  photos text[] default array[]::text[],
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- INNOVATIONS TABLE
create table innovations (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  type text not null,
  
  -- Calculation Fields
  calculation_type text not null,
  unit_savings numeric default 0,
  quantity numeric default 0,
  total_annual_savings numeric default 0,
  investment_cost numeric default 0,
  
  status text check (status in ('PENDING', 'APPROVED', 'REJECTED', 'IMPLEMENTED')),
  author_id uuid references users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES (Optional - Enable if you want row level security)
-- alter table users enable row level security;
-- alter table projects enable row level security;
-- alter table issues enable row level security;
-- alter table innovations enable row level security;

-- create policy "Public Access" on users for all using (true);
-- create policy "Public Access" on projects for all using (true);
-- create policy "Public Access" on issues for all using (true);
-- create policy "Public Access" on innovations for all using (true);
