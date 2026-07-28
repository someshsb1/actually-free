alter table public.plans
add column if not exists expected_guest_count integer not null default 0,
add column if not exists response_deadline timestamptz;

alter table public.participants
add column if not exists area_preferences text[] not null default '{}',
add column if not exists response_token text not null default encode(gen_random_bytes(16), 'hex');

create unique index if not exists participants_response_token_idx on public.participants(response_token);

grant all privileges on table public.plans to service_role;
grant all privileges on table public.participants to service_role;

notify pgrst, 'reload schema';
