-- Enable extensions needed for UUID generation if they are not already installed
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Businesses represent the automation account for a single customer
create table if not exists public.businesses (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    created_at timestamptz not null default timezone('utc', now())
);

-- Users mirror Clerk accounts and link to a single business
create table if not exists public.users (
    id uuid primary key default gen_random_uuid(),
    clerk_user_id text not null unique,
    email text,
    first_name text,
    last_name text,
    business_id uuid not null references public.businesses(id) on delete cascade,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists users_business_id_idx on public.users (business_id);

-- Workflow definitions stored as React Flow state per business
create table if not exists public.workflows (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses(id) on delete cascade,
    name text not null,
    description text,
    react_flow_state jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists workflows_business_id_idx on public.workflows (business_id);

-- Trigger to keep updated_at in sync
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create trigger workflows_set_updated_at
before update on public.workflows
for each row
execute function public.set_updated_at();
