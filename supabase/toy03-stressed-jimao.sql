-- Approved Toy 03 catalog entry. Existing toys, collections and RLS are untouched.
-- Run only after its five assets have been verified in bad-children-assets.
-- Card artwork and story_note currently live in the versioned frontend catalog.
insert into public.toys
 (id,name_zh,name_en,tagline_zh,tagline_en,icon_url,model_url,audio_url,story_image_url,story_text,story_en,color)
values (
 'stressed_jimao','抗压鸡毛','Stressed Jimao',
 '嘴上说着没事，头顶已经打雷——这周帮小鸡毛做一件小事叭',
 'Says it''s fine. Forecast: thunderstorms — do one little thing for Jimao this week.',
 'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy_stressed_jimao.png',
 'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy_stressed_jimao.glb',
 'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy3_stressed_jimao_voice.mp3',
 'https://kbyobdydythovyagrfgv.supabase.co/storage/v1/object/public/bad-children-assets/toy3_stressed_jimao_story.jpg',
 '你看我还好吗？','','#d5deea'
) on conflict (id) do nothing;
select id,name_zh from public.toys order by id;
