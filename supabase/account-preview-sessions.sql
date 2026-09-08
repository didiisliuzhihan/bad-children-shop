-- Require a password-proven account session as well as a verified Supabase JWT.
-- Old sessions cannot regain access by refreshing a token after recovery changes metadata.
create table public.bc_account_sessions (
 session_id uuid primary key,
 user_id uuid not null references public.bc_account_profiles(user_id) on delete cascade,
 session_epoch uuid not null,
 created_at timestamptz not null default now()
);
create index bc_account_sessions_owner on public.bc_account_sessions(user_id);
alter table public.bc_account_sessions enable row level security;
revoke all on public.bc_account_sessions from public,anon,authenticated;
grant all on public.bc_account_sessions to service_role;
