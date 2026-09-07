-- Bad Children Shop: additive, repeatable schema setup.
-- Run as the project owner in the Supabase SQL Editor.
begin;
create table if not exists public.toys (
 id text primary key,
 name_zh text not null,
 name_en text not null,
 tagline_zh text not null default '',
 tagline_en text not null default '',
 icon_url text not null default '',
 model_url text not null default '',
 audio_url text not null default '',
 story_image_url text not null default '',
 story_text text not null default '',
 story_en text not null default '',
 color text not null default '#C8E0F4'
);
create table if not exists public.user_capsules (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 toy_id text not null references public.toys(id),
 obtained_at timestamptz not null default now()
);
create index if not exists bc_capsules_owner_date on public.user_capsules(user_id, obtained_at desc);
alter table public.toys enable row level security;
alter table public.user_capsules enable row level security;
grant usage on schema public to anon, authenticated;
grant select on public.toys to anon, authenticated;
grant select,insert on public.user_capsules to authenticated;
revoke insert,update,delete on public.toys from anon,authenticated;
revoke all on public.user_capsules from anon;
revoke update,delete on public.user_capsules from authenticated;
drop policy if exists bc_toys_read on public.toys;
create policy bc_toys_read on public.toys for select to anon,authenticated using(true);
drop policy if exists bc_capsules_read_own on public.user_capsules;
create policy bc_capsules_read_own on public.user_capsules for select to authenticated using((select auth.uid())=user_id);
drop policy if exists bc_capsules_insert_own on public.user_capsules;
create policy bc_capsules_insert_own on public.user_capsules for insert to authenticated with check((select auth.uid())=user_id);
-- A dedicated public bucket holds only the public-facing assets created for this app.
-- Players have no upload/update/delete policy. The existing private shop bucket is untouched.
insert into storage.buckets(id,name,public,file_size_limit)
values('bad-children-assets','bad-children-assets',true,26214400)
on conflict(id) do nothing;
insert into public.toys(id,name_zh,name_en,tagline_zh,tagline_en,icon_url,model_url,audio_url,story_image_url,story_text,story_en,color)
values
('jimao','张鸡毛 · 驯服100%','Zhang Jimao','开心开心，我太有面子了——今天给你买一杯奶茶。','A tiny ego. A huge heart.',
'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy_jimao.png',
'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy_jimao.glb',
'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy1%20jimao.mp3',
'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy1%20jimao.jpg',
E'我是你们的皇后。\n\n张鸡毛的尾巴翘得很高，心却软得一塌糊涂。它说自己已经被驯服100%，但只愿意听喜欢的人的话。今天的任务：给那个让你开心的人，买一杯奶茶。',
'100% tamed. 200% pleased with itself. A little creature with a very big opinion of you.','#e9c28b'),
('kuku_sunflower','哭哭葵','Kuku Sunflower','你忘了给葵浇水，葵emo了——这周记得摸摸葵的脑袋。','Big feelings. Little flower.',
'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy_kuku_sunflower.png',
'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy_kuku_sunflower.glb',
'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy2%20emok.mp3',
'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy2%20emok.jpg',
E'不枯不枯。\n\n下雨的时候，它穿着绿色雨靴等你。天晴了，它还是会掉一点眼泪。不是所有的眼泪都因为难过，也可能是想你。今天的任务：摸摸它的脑袋，告诉它，慢慢长大也没关系。',
'A little sunshine with a chance of tears. Remember to water the things you love.','#d6deb7')
on conflict(id) do nothing;
notify pgrst,'reload schema';
commit;
