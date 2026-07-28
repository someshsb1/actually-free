grant usage on schema public to service_role;

grant all privileges on table public.plans to service_role;
grant all privileges on table public.participants to service_role;
grant all privileges on table public.availability to service_role;
grant all privileges on table public.venues to service_role;
grant all privileges on table public.votes to service_role;
grant all privileges on table public.final_plans to service_role;

grant usage on type public.activity_type to service_role;
grant usage on type public.plan_status to service_role;
grant usage on type public.vote_value to service_role;

grant execute on function public.set_updated_at() to service_role;
