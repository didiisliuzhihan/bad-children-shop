-- Run inside BEGIN ... ROLLBACK, using two already verified QA account IDs.
do $$
declare u uuid:=current_setting('bc.test_owner')::uuid; other_user uuid:=current_setting('bc.test_other')::uuid;
 lease uuid:=gen_random_uuid(); other_lease uuid:=gen_random_uuid(); event uuid; req uuid:=gen_random_uuid(); v jsonb; again jsonb; n int; i int; found_story boolean:=false;
 layout jsonb:='{"version":1,"roomId":"furnished-nest-v2","placements":[{"toyId":"miss_popcorn","x":0,"z":1,"rotation":0},{"toyId":"tired_crow","x":1.7,"z":1,"rotation":0}]}';
begin
 if not exists(select 1 from public.bc_account_profiles where user_id=u and canonical_name like 'qa\_%' escape '\') or
    not exists(select 1 from public.bc_account_profiles where user_id=other_user and canonical_name like 'qa\_%' escape '\') then raise exception 'QA scope required';end if;
 insert into public.bc_account_capsules(id,user_id,toy_id,obtained_at) values(gen_random_uuid(),u,'miss_popcorn',now()),(gen_random_uuid(),u,'tired_crow',now());
 insert into public.bc_account_documents(user_id,key,value) values(u,'quests','{}') on conflict(user_id,key) do update set value='{}';
 if exists(select 1 from public.bc_nest_eligible(u,layout)) then raise exception 'locked toys eligible';end if;
 update public.bc_account_documents set value='{"miss_popcorn":{"unlockedAt":1},"tired_crow":{"unlockedAt":1}}' where user_id=u and key='quests';
 if not exists(select 1 from public.bc_nest_eligible(u,layout) where kind='soup') then raise exception 'placed pair not eligible';end if;
 if exists(select 1 from public.bc_nest_eligible(u,jsonb_set(layout,'{placements,1,x}','7')) where kind='soup') then raise exception 'distant pair eligible';end if;
 if exists(select 1 from public.bc_nest_eligible(u,jsonb_set(layout,'{placements}','[{"toyId":"miss_popcorn","x":0,"z":1,"rotation":0}]')) where kind='soup') then raise exception 'ownership mistaken for placement';end if;
 if exists(select 1 from public.bc_nest_eligible(other_user,layout)) then raise exception 'another account borrowed ownership';end if;
 insert into public.bc_account_documents(user_id,key,value,revision) values(u,'nest',layout,1) on conflict(user_id,key) do update set value=excluded.value,revision=1;
 perform public.bc_nest_step(u,'visit',null,1,lease);
 v:=public.bc_nest_step(u,'start',null,1,lease);if v?'event' then raise exception 'early start';end if;
 update public.bc_nest_life set entered_at=now()-interval '40 seconds' where user_id=u;
 v:=public.bc_nest_step(u,'start',null,1,other_lease);if v?'event' then raise exception 'second tab stole lease';end if;
 v:=public.bc_nest_step(u,'start',null,1,lease);event:=(v->'event'->>'id')::uuid;if event is null then raise exception 'start failed';end if;
 if v::text like '%精神上帮忙的报酬%' then raise exception 'pending summary leaked';end if;
 perform public.bc_nest_step(u,'complete',event,1,lease);if exists(select 1 from public.bc_nest_stories where user_id=u) then raise exception 'early completion minted reward';end if;
 update public.bc_nest_life set started_at=now()-interval '14 seconds' where user_id=u;
 v:=public.bc_nest_step(u,'complete',event,1,lease);if not coalesce((v->>'ok')::boolean,false) then raise exception 'completion failed';end if;
 perform public.bc_nest_step(u,'complete',event,1,lease);
 select count(*) into n from public.bc_nest_stories where user_id=u;if n<>1 then raise exception 'completion not exactly once';end if;
 v:=public.bc_nest_step(u,'start',null,1,lease);if v?'event' then raise exception 'cooldown bypass';end if;
 if exists(select 1 from public.bc_nest_stories where user_id=u and collected_at is not null) then raise exception 'unrevealed story in collection';end if;
 -- Only one return trace, deduped per authored story; repeated visits do not mint.
 update public.bc_nest_life set last_seen=now()-interval '31 minutes',lease=null where user_id=u;
 v:=public.bc_nest_step(u,'visit',null,1,lease);if v->'trace' is null then raise exception 'return trace missing';end if;
 select count(*) into n from public.bc_nest_stories where user_id=u;
 perform public.bc_nest_step(u,'visit',null,1,lease);
 if (select count(*) from public.bc_nest_stories where user_id=u)<>n then raise exception 'return duplicated';end if;
 v:=public.bc_nest_step(u,'draw',req);again:=public.bc_nest_step(u,'draw',req);if v<>again then raise exception 'draw retry changed result';end if;
 if v<>public.bc_nest_step(u,'draw',gen_random_uuid()) then raise exception 'double click created second offer';end if;
 begin perform public.bc_nest_step(other_user,'keep',req);raise exception 'cross-account keep accepted';exception when raise_exception then if sqlerrm<>'draw not found' then raise;end if;end;
 perform public.bc_nest_step(u,'keep',req);perform public.bc_nest_step(u,'keep',req);
 if (select count(*) from public.bc_account_draws where id=req and kept)<>1 then raise exception 'keep not idempotent';end if;
 perform setseed(.12345);
 -- Missing photos are not drawable, including return-generated stories.
 for i in 1..20 loop
  req:=gen_random_uuid();v:=public.bc_nest_step(u,'draw',req);
  if v->>'type'='story' then raise exception 'blank story became drawable';end if;
  perform public.bc_nest_step(u,'reject',req);
 end loop;
 -- Replay an existing story with a missing photo; deduplication must return its original target.
 update public.bc_nest_life set entered_at=now()-interval '40 seconds',last_event=now()-interval '4 minutes' where user_id=u;
 v:=public.bc_nest_step(u,'start',null,1,lease);event:=(v->'event'->>'id')::uuid;
 update public.bc_nest_life set started_at=now()-interval '14 seconds' where user_id=u;
 v:=public.bc_nest_step(u,'complete',event,1,lease);
 if v->>'capture'<>'true' or v->>'captureRepeated'<>'true' or v->>'captureEventId' is null then raise exception 'old missing photo was not repairable';end if;
 if not exists(select 1 from public.bc_nest_stories where user_id=u and event_id=(v->>'captureEventId')::uuid and media is null) then raise exception 'wrong repair target';end if;
 -- Transaction-only metadata fixture, never committed or uploaded to a user's account.
 update public.bc_nest_stories set media='{"fixture":"rollback-only"}' where user_id=u;
 for i in 1..30 loop
  req:=gen_random_uuid();v:=public.bc_nest_step(u,'draw',req);
  if v->>'type'='story' then
   found_story:=true;
   if v->'story'->>'source'<>'nest' or v->'story'?'stamp' or v->'story'?'signature' then raise exception 'system postcard became player submission';end if;
   if exists(select 1 from public.bc_nest_stories where id=(v->'story'->>'id')::uuid and collected_at is not null) then raise exception 'offer collected prematurely';end if;
   perform public.bc_nest_step(u,'keep',req);
   if not exists(select 1 from public.bc_nest_stories where id=(v->'story'->>'id')::uuid and user_id=u and collected_at is not null) then raise exception 'story collection failed';end if;
   exit;
  end if;
  perform public.bc_nest_step(u,'reject',req);
 end loop;
 if not found_story then raise exception 'story draw path not exercised';end if;
 -- Empty room cannot develop a pair even with all toys in the card bag.
 update public.bc_account_documents set value=jsonb_set(value,'{placements}','[]'),revision=2 where user_id=u and key='nest';
 v:=public.bc_nest_step(u,'start',null,1,lease);if v?'event' then raise exception 'stale layout accepted';end if;
 perform public.bc_nest_step(u,'visit',null,2,lease);
 update public.bc_nest_life set entered_at=now()-interval '40 seconds',last_event=now()-interval '4 minutes' where user_id=u;
 v:=public.bc_nest_step(u,'start',null,2,lease);if v?'event' then raise exception 'empty room performed';end if;
end $$;

