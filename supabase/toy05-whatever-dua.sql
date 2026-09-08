-- Approved Toy 05 only; no schema, RLS, existing toys or collection changes.
-- Run only after verifying all five public assets and publishing V5.5 HTML.
insert into public.toys
 (id,name_zh,name_en,tagline_zh,tagline_en,icon_url,model_url,audio_url,story_image_url,story_text,story_en,color)
values (
 'tired_crow','我没招了鸦','Whatever Dua',
 '你问肥宅鸦怎么办，鸦也想问你——今天陪鸦理直气壮地歇一会儿',
 'You ask Dua what to do. Dua was about to ask you.',
 'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy_tired_crow.png',
 'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy_tired_crow.glb',
 'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy5_whatever_dua_voice.mp3',
 'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy5_whatever_dua_story.jpg',
 '办法还没想好，坐姿已经摆好了。','','#cadfdf'
) on conflict (id) do nothing;
select id,name_zh,name_en,model_url from public.toys where id='tired_crow';
