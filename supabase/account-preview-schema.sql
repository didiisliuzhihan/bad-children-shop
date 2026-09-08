-- Additive account preview only. Existing toys/user_capsules and policies are unchanged.
-- These tables are backend-only: RLS enabled and no anon/authenticated grants or policies.
create table public.bc_account_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 canonical_name text not null unique check(length(canonical_name) between 2 and 32),
 nickname text not null check(length(nickname) between 2 and 32),
 created_at timestamptz not null default now()
);
create table public.bc_account_security (
 user_id uuid primary key references public.bc_account_profiles(user_id) on delete cascade,
 recovery_digest text not null check(length(recovery_digest)=64),
 session_epoch uuid not null,
 recovery_claim uuid,
 claimed_at timestamptz
);
create table public.bc_account_documents (
 user_id uuid not null references public.bc_account_profiles(user_id) on delete cascade,
 key text not null check(key in ('nest','quests','postcards')),
 value jsonb not null check(octet_length(value::text)<=300000),
 revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default now(), primary key(user_id,key)
);
create table public.bc_account_capsules (
 id uuid primary key,
 user_id uuid not null references public.bc_account_profiles(user_id) on delete cascade,
 toy_id text not null references public.toys(id), obtained_at timestamptz not null,
 imported_at timestamptz not null default now()
);
create index bc_account_capsules_owner on public.bc_account_capsules(user_id,obtained_at desc);
create index bc_account_capsules_toy on public.bc_account_capsules(toy_id);
create table public.bc_account_rates (bucket text primary key,hits integer not null,expires_at timestamptz not null);
create index bc_account_rates_expiry on public.bc_account_rates(expires_at);
create table public.bc_account_revoked_sessions (session_id uuid primary key,user_id uuid not null references public.bc_account_profiles(user_id) on delete cascade,expires_at timestamptz not null);
create index bc_account_revoked_owner on public.bc_account_revoked_sessions(user_id);
alter table public.bc_account_profiles enable row level security;
alter table public.bc_account_security enable row level security;
alter table public.bc_account_documents enable row level security;
alter table public.bc_account_capsules enable row level security;
alter table public.bc_account_rates enable row level security;
alter table public.bc_account_revoked_sessions enable row level security;
revoke all on public.bc_account_profiles,public.bc_account_security,public.bc_account_documents,public.bc_account_capsules,public.bc_account_rates,public.bc_account_revoked_sessions from public,anon,authenticated;
grant all on public.bc_account_profiles,public.bc_account_security,public.bc_account_documents,public.bc_account_capsules,public.bc_account_rates,public.bc_account_revoked_sessions to service_role;

create function public.bc_account_rate(p_bucket text,p_limit integer,p_seconds integer) returns boolean
language plpgsql security invoker set search_path='' as $$
declare v_hits integer; v_bucket text;
begin
 delete from public.bc_account_rates where expires_at<now();
 delete from public.bc_account_revoked_sessions where expires_at<now();
 v_bucket:=p_bucket||':'||floor(extract(epoch from now())/p_seconds)::text;
 insert into public.bc_account_rates(bucket,hits,expires_at) values(v_bucket,1,now()+make_interval(secs=>p_seconds))
 on conflict(bucket) do update set hits=public.bc_account_rates.hits+1 returning hits into v_hits;
 return v_hits<=p_limit;
end $$;

create function public.bc_account_initialize(p_user uuid,p_name text,p_nickname text,p_digest text,p_epoch uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
 insert into public.bc_account_profiles(user_id,canonical_name,nickname) values(p_user,p_name,p_nickname);
 insert into public.bc_account_security(user_id,recovery_digest,session_epoch) values(p_user,p_digest,p_epoch);
end $$;

create function public.bc_account_write(p_user uuid,p_key text,p_value jsonb,p_revision integer)
returns setof public.bc_account_documents language plpgsql security invoker set search_path='' as $$
begin
 if p_revision=0 then
  return query insert into public.bc_account_documents(user_id,key,value) values(p_user,p_key,p_value) on conflict do nothing returning *;
 else
  return query update public.bc_account_documents set value=p_value,revision=revision+1,updated_at=now() where user_id=p_user and key=p_key and revision=p_revision returning *;
 end if;
end $$;

create function public.bc_account_import(p_user uuid,p_items jsonb,p_legacy uuid) returns integer
language plpgsql security invoker set search_path='' as $$
declare v_item jsonb;v_owner uuid;v_total integer:=0;v_count integer;
begin
 if jsonb_array_length(p_items)>2000 then raise exception 'too many capsules';end if;
 for v_item in select * from jsonb_array_elements(p_items) loop
  select user_id into v_owner from public.user_capsules where id=(v_item->>'id')::uuid;
  if v_owner is not null and v_owner is distinct from p_legacy and v_owner<>p_user then continue;end if;
  insert into public.bc_account_capsules(id,user_id,toy_id,obtained_at) values((v_item->>'id')::uuid,p_user,v_item->>'toy_id',(v_item->>'obtained_at')::timestamptz) on conflict(id) do nothing;
  get diagnostics v_count=row_count;v_total:=v_total+v_count;
 end loop;
 return v_total;
end $$;

create function public.bc_account_quest(p_user uuid,p_toy text,p_action text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v_value jsonb;v_now bigint:=floor(extract(epoch from clock_timestamp())*1000);v_record jsonb;
begin
 if not exists(select 1 from public.bc_account_capsules where user_id=p_user and toy_id=p_toy) then raise exception 'not owned';end if;
 insert into public.bc_account_documents(user_id,key,value) values(p_user,'quests','{}') on conflict do nothing;
 select value into v_value from public.bc_account_documents where user_id=p_user and key='quests' for update;
 v_record:=v_value->p_toy;
 if p_action='save' then v_record:=coalesce(v_record,jsonb_build_object('savedAt',v_now));
 elsif p_action='unlock' then
  if v_record is null or (v_record->>'savedAt')::bigint+600000>v_now then raise exception 'not ready';end if;
  v_record:=v_record||jsonb_build_object('unlockedAt',coalesce((v_record->>'unlockedAt')::bigint,v_now));
 else raise exception 'invalid action';end if;
 update public.bc_account_documents set value=jsonb_set(v_value,array[p_toy],v_record),revision=revision+1,updated_at=now() where user_id=p_user and key='quests';
 return v_record;
end $$;

revoke all on function public.bc_account_rate(text,integer,integer),public.bc_account_initialize(uuid,text,text,text,uuid),public.bc_account_write(uuid,text,jsonb,integer),public.bc_account_import(uuid,jsonb,uuid),public.bc_account_quest(uuid,text,text) from public,anon,authenticated;
grant execute on function public.bc_account_rate(text,integer,integer),public.bc_account_initialize(uuid,text,text,text,uuid),public.bc_account_write(uuid,text,jsonb,integer),public.bc_account_import(uuid,jsonb,uuid),public.bc_account_quest(uuid,text,text) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('bc-account-preview-media','bc-account-preview-media',false,20971520,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']);
-- No client Storage policies: media access requires the authenticated Edge Function.
