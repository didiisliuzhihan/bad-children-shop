-- Preview-only home life. All access passes the existing verified account Edge.
create table public.bc_nest_catalog (
 kind text primary key, actors text[] not null, speaker text not null,
 prop text not null, line text not null, story text not null
);
insert into public.bc_nest_catalog values
 ('soup',array['miss_popcorn','tired_crow'],'tired_crow','cup','鸦已经在精神上帮忙了。','爆米花说今天不管了。锅里还是给鸦留了一份，算它精神上帮忙的报酬。'),
 ('tea',array['jimao','kuku_sunflower'],'kuku_sunflower','cups','没有聊出什么解决办法，不过一起坐了会儿。','鸡毛陪葵坐到茶不烫了。问题没有变小，好像也没有刚才那么大了。'),
 ('book',array['stressed_jimao','tired_crow'],'stressed_jimao','book','翻了三页，决定明天再努力。','抗压鸡毛和鸦翻了三页书。今天的进度：一起允许自己停在第三页。'),
 ('solo_jimao',array['jimao'],'jimao','cup','这一杯，给好好待着的自己。','鸡毛给自己留了一杯热的。没人夸它，它也觉得今天还行。'),
 ('solo_kuku',array['kuku_sunflower'],'kuku_sunflower','cup','今天先不急着开花。','葵在暖光里发了一会儿呆。今天没有努力开花，也被好好照到了。'),
 ('solo_stressed',array['stressed_jimao'],'stressed_jimao','book','这页先夹着，雷也歇一会儿。','抗压鸡毛把书停在了这一页。头顶的小雷，今天也提早下班了。'),
 ('solo_popcorn',array['miss_popcorn'],'miss_popcorn','cup','这次真的只煮自己的份。','爆米花煮了一点热的，嘴上说只管自己，手却又多拿了一只杯子。'),
 ('solo_crow',array['tired_crow'],'tired_crow','book','休息这件事，鸦很认真。','鸦翻开书，又靠回了沙发。今天最认真完成的事，是理直气壮地歇一会儿。');
create table public.bc_nest_life (
 user_id uuid primary key references public.bc_account_profiles(user_id) on delete cascade,
 lease uuid, entered_at timestamptz, last_seen timestamptz, revision integer,
 last_event timestamptz, event_id uuid, kind text references public.bc_nest_catalog(kind), started_at timestamptz,
 trace jsonb
);
create table public.bc_nest_stories (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.bc_account_profiles(user_id) on delete cascade,
 kind text not null references public.bc_nest_catalog(kind), event_id uuid not null unique,
 text text not null, created_at timestamptz not null default now(), media jsonb,
 collected_at timestamptz, unique(user_id,kind)
);
create index bc_nest_stories_owner_pending on public.bc_nest_stories(user_id,created_at) where collected_at is null;
create index bc_nest_life_kind on public.bc_nest_life(kind);
create index bc_nest_stories_kind on public.bc_nest_stories(kind);
create table public.bc_account_draws (
 id uuid primary key, user_id uuid not null references public.bc_account_profiles(user_id) on delete cascade,
 result jsonb not null, resolved boolean not null default false, kept boolean not null default false,
 created_at timestamptz not null default now()
);
create index bc_account_draws_owner on public.bc_account_draws(user_id,created_at desc);
create unique index bc_account_draws_one_open on public.bc_account_draws(user_id) where not resolved;
alter table public.bc_nest_catalog enable row level security;
alter table public.bc_nest_life enable row level security;
alter table public.bc_nest_stories enable row level security;
alter table public.bc_account_draws enable row level security;
revoke all on public.bc_nest_catalog,public.bc_nest_life,public.bc_nest_stories,public.bc_account_draws from public,anon,authenticated;
grant all on public.bc_nest_catalog,public.bc_nest_life,public.bc_nest_stories,public.bc_account_draws to service_role;

create function public.bc_nest_eligible(p_user uuid,p_layout jsonb)
returns setof public.bc_nest_catalog language sql stable security invoker set search_path='' as $$
 select c.* from public.bc_nest_catalog c
 where not exists(select 1 from unnest(c.actors) as actor(toy_id) where
   not exists(select 1 from jsonb_array_elements(coalesce(p_layout->'placements','[]')) p where p->>'toyId'=actor.toy_id)
   or not exists(select 1 from public.bc_account_capsules t where t.user_id=p_user and t.toy_id=actor.toy_id)
   or not exists(select 1 from public.bc_account_documents d where d.user_id=p_user and d.key='quests' and d.value->actor.toy_id->>'unlockedAt' is not null))
 and (cardinality(c.actors)=1 or exists (
  select 1 from jsonb_array_elements(p_layout->'placements') a,jsonb_array_elements(p_layout->'placements') b
  where a->>'toyId'=c.actors[1] and b->>'toyId'=c.actors[2]
  and power((a->>'x')::numeric-(b->>'x')::numeric,2)+power((a->>'z')::numeric-(b->>'z')::numeric,2)<=21.16
 ));
$$;

create function public.bc_nest_step(p_user uuid,p_action text,p_request uuid,p_revision integer default 0,p_lease uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.bc_nest_life; c public.bc_nest_catalog; r public.bc_nest_stories; d public.bc_account_draws;
 v_layout jsonb; v_revision integer; v_now timestamptz:=clock_timestamp(); v_id uuid; v_result jsonb; v_toy text; v_inserted integer;
begin
 insert into public.bc_nest_life(user_id) values(p_user) on conflict do nothing;
 select * into s from public.bc_nest_life where user_id=p_user for update;
 if p_action in ('draw','keep','reject') then
  if p_request is null then raise exception 'request required';end if;
  select * into d from public.bc_account_draws where id=p_request and user_id=p_user;
  if p_action='draw' then
   if d.id is not null then return d.result;end if;
   -- Reopening/retrying the machine reuses the same outstanding capsule.
   select * into d from public.bc_account_draws where user_id=p_user and not resolved;
   if d.id is not null then return d.result;end if;
   select * into r from public.bc_nest_stories where user_id=p_user and collected_at is null order by created_at limit 1;
   if r.id is not null and random()<.4 then
    v_result:=jsonb_build_object('id',p_request,'type','story','story',jsonb_build_object('id',r.id,'source','nest','text',r.text,'createdAt',r.created_at,'media',r.media));
   else
    select id into v_toy from public.toys where id in ('jimao','kuku_sunflower','stressed_jimao','miss_popcorn','tired_crow') order by random() limit 1;
    v_result:=jsonb_build_object('id',p_request,'type','toy','toyId',v_toy);
   end if;
   insert into public.bc_account_draws(id,user_id,result) values(p_request,p_user,v_result);
   return v_result;
  end if;
  if d.id is null then raise exception 'draw not found';end if;
  if d.resolved then return jsonb_build_object('ok',true);end if;
  if p_action='keep' then
   if d.result->>'type'='toy' then
    insert into public.bc_account_capsules(id,user_id,toy_id,obtained_at) values(d.id,p_user,d.result->>'toyId',v_now) on conflict do nothing;
   else
    update public.bc_nest_stories set collected_at=v_now where id=(d.result->'story'->>'id')::uuid and user_id=p_user and collected_at is null;
   end if;
  end if;
  update public.bc_account_draws set resolved=true,kept=p_action='keep' where id=d.id and user_id=p_user;
  return jsonb_build_object('ok',true);
 end if;

 select value,revision into v_layout,v_revision from public.bc_account_documents where user_id=p_user and key='nest' for share;
 if v_revision is null or v_revision<>p_revision or p_lease is null then return '{}'::jsonb;end if;
 if s.revision is distinct from v_revision then s.event_id:=null;s.kind:=null;s.trace:=null;s.entered_at:=v_now;end if;
 if p_action='leave' then
  if s.lease=p_lease then update public.bc_nest_life set event_id=null,kind=null,lease=null where user_id=p_user;end if;
  return '{}'::jsonb;
 end if;
 if p_action='visit' then
  if s.last_seen is not null and s.last_seen<v_now-interval '30 minutes' and s.revision=v_revision then
   -- One bounded catch-up, never a claim that the closed browser kept running.
   select e.* into c from public.bc_nest_eligible(p_user,v_layout) e
    order by exists(select 1 from public.bc_nest_stories st where st.user_id=p_user and st.kind=e.kind),cardinality(e.actors) desc,random() limit 1;
   if c.kind is not null then
    s.trace:=jsonb_build_object('kind',c.prop,'toyId',c.speaker,'until',v_now+interval '20 minutes');
    insert into public.bc_nest_stories(user_id,kind,event_id,text) values(p_user,c.kind,gen_random_uuid(),c.story) on conflict(user_id,kind) do nothing;
   end if;
  end if;
  if s.lease is null or s.lease=p_lease or s.last_seen<v_now-interval '90 seconds' then
   if s.lease is distinct from p_lease or s.last_seen<v_now-interval '90 seconds' then s.entered_at:=v_now;s.event_id:=null;s.kind:=null;end if;
   update public.bc_nest_life set lease=p_lease,entered_at=s.entered_at,last_seen=v_now,revision=v_revision,event_id=s.event_id,kind=s.kind,trace=s.trace where user_id=p_user;
  end if;
  return jsonb_build_object('trace',s.trace);
 end if;
 if s.lease is distinct from p_lease or s.last_seen<v_now-interval '60 seconds' then return '{}'::jsonb;end if;
 if p_action='start' then
  if s.entered_at>v_now-interval '25 seconds' or s.last_event>v_now-interval '3 minutes' then return '{}'::jsonb;end if;
  if s.event_id is not null and s.started_at>v_now-interval '60 seconds' then return '{}'::jsonb;end if;
  select e.* into c from public.bc_nest_eligible(p_user,v_layout) e
   order by exists(select 1 from public.bc_nest_stories st where st.user_id=p_user and st.kind=e.kind),cardinality(e.actors) desc,random() limit 1;
  if c.kind is null then return '{}'::jsonb;end if;
  v_id:=gen_random_uuid();
  update public.bc_nest_life set event_id=v_id,kind=c.kind,started_at=v_now,last_event=v_now where user_id=p_user;
  return jsonb_build_object('event',jsonb_build_object('id',v_id,'kind',c.kind,'startedAt',v_now,'actors',c.actors,'speaker',c.speaker,'line',c.line,'prop',c.prop));
 elsif p_action='complete' then
  if s.event_id is distinct from p_request or s.started_at>v_now-interval '12 seconds' or s.started_at<v_now-interval '60 seconds' then return '{}'::jsonb;end if;
  select * into c from public.bc_nest_eligible(p_user,v_layout) where kind=s.kind;
  if c.kind is null then return '{}'::jsonb;end if;
  insert into public.bc_nest_stories(user_id,kind,event_id,text) values(p_user,c.kind,p_request,c.story) on conflict(user_id,kind) do nothing;
  get diagnostics v_inserted=row_count;
  s.trace:=jsonb_build_object('kind',c.prop,'toyId',c.speaker,'until',v_now+interval '10 minutes');
  update public.bc_nest_life set event_id=null,kind=null,trace=s.trace where user_id=p_user;
  return jsonb_build_object('ok',true,'trace',s.trace,'capture',v_inserted=1);
 end if;
 raise exception 'invalid life action';
end $$;
revoke all on function public.bc_nest_eligible(uuid,jsonb),public.bc_nest_step(uuid,text,uuid,integer,uuid) from public,anon,authenticated;
grant execute on function public.bc_nest_eligible(uuid,jsonb),public.bc_nest_step(uuid,text,uuid,integer,uuid) to service_role;
