-- Approved Toy 04 only. Existing toys, collections, schema and RLS stay unchanged.
-- Run after verifying all five public assets. Never replace an existing row.
insert into public.toys
 (id,name_zh,name_en,tagline_zh,tagline_en,icon_url,model_url,audio_url,story_image_url,story_text,story_en,color)
values (
 'miss_popcorn','爆米花· 幽怨女仆','Miss Popcorn',
 '今天又惹爆米花小姐不得劲了——惹怒她记得说“别急，你好漂亮”',
 'Miss Popcorn is displeased again. If you upset her, say, “Don''t fret. You look so pretty.”',
 'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy_popcorn_maid.png',
 'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy_popcorn_maid.glb',
 'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy4_popcorn_voice.mp3',
 'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy4_popcorn_story.jpg',
 '今天的家务额度已经用完了。','','#f4dc8e'
) on conflict (id) do nothing;
select id,name_zh,name_en,model_url from public.toys where id='miss_popcorn';
