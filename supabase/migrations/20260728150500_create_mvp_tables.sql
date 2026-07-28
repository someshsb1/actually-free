create extension if not exists pgcrypto;

do $$
begin
  create type public.activity_type as enum ('dinner', 'brunch', 'drinks', 'coffee', 'activity');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.plan_status as enum ('collecting', 'voting', 'confirmed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.vote_value as enum ('first', 'acceptable', 'no');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  activity_type public.activity_type not null default 'dinner',
  start_date date not null,
  end_date date not null,
  budget_max integer not null check (budget_max > 0),
  city text not null default 'New York City',
  preferred_area text not null,
  organizer_name text not null check (char_length(trim(organizer_name)) > 0),
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  status public.plan_status not null default 'collecting',
  max_travel_minutes integer not null check (max_travel_minutes > 0),
  preferred_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_date_range_valid check (start_date <= end_date),
  constraint plans_preferred_date_in_range check (
    preferred_date is null or (preferred_date >= start_date and preferred_date <= end_date)
  )
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  starting_location text not null check (char_length(trim(starting_location)) > 0),
  budget_max integer not null check (budget_max > 0),
  dietary_preferences text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint availability_time_range_valid check (start_time < end_time)
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  external_place_id text,
  name text not null check (char_length(trim(name)) > 0),
  address text not null check (char_length(trim(address)) > 0),
  category text not null,
  price_level integer check (price_level between 1 and 4),
  price_per_person integer check (price_per_person > 0),
  rating numeric(2, 1) check (rating >= 0 and rating <= 5),
  booking_url text,
  dietary_tags text[] not null default '{}',
  travel_times jsonb not null default '{}'::jsonb,
  average_travel_minutes integer,
  worst_travel_minutes integer,
  group_travel_score numeric(5, 2),
  recommendation_score numeric(5, 2),
  booking_confidence numeric(3, 2) check (booking_confidence >= 0 and booking_confidence <= 1),
  why_it_matches text,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  vote public.vote_value not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, venue_id)
);

create table if not exists public.final_plans (
  plan_id uuid primary key references public.plans(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete restrict,
  final_date date not null,
  final_start_time time not null,
  final_end_time time not null,
  confirmed_by text not null,
  confirmed_at timestamptz not null default now(),
  constraint final_plans_time_range_valid check (final_start_time < final_end_time)
);

create index if not exists plans_invite_code_idx on public.plans(invite_code);
create index if not exists participants_plan_id_idx on public.participants(plan_id);
create index if not exists availability_participant_id_idx on public.availability(participant_id);
create index if not exists venues_plan_id_score_idx on public.venues(plan_id, recommendation_score desc nulls last);
create index if not exists votes_venue_id_idx on public.votes(venue_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

drop trigger if exists participants_set_updated_at on public.participants;
create trigger participants_set_updated_at
before update on public.participants
for each row execute function public.set_updated_at();

drop trigger if exists votes_set_updated_at on public.votes;
create trigger votes_set_updated_at
before update on public.votes
for each row execute function public.set_updated_at();

alter table public.plans enable row level security;
alter table public.participants enable row level security;
alter table public.availability enable row level security;
alter table public.venues enable row level security;
alter table public.votes enable row level security;
alter table public.final_plans enable row level security;

-- MVP note:
-- RLS is enabled, but no public anon policies are granted here. Use Next.js API routes
-- with SUPABASE_SERVICE_ROLE_KEY for invite-code scoped reads/writes, or add dedicated
-- security-definer RPCs before exposing direct client-side Supabase writes.
