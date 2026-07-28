alter table public.plans
add column if not exists time_zone text not null default 'UTC';

grant all privileges on table public.plans to service_role;
