-- V5.6.8: owner-approved residents. Publish and verify Pages assets first.
-- Catalog insert + narrow function-list update only. No player rows or grants.
begin;
set local statement_timeout='10s';
insert into public.toys (id,name_zh,name_en,tagline_zh,tagline_en,icon_url,model_url,audio_url,story_image_url,story_text,story_en,color) values
 ('matcha_clown','卖火的小抹茶','Little Matcha','火气有点大，心是冰淇淋做的——今天把一句气话，换成一句好好说。','A little fiery. A little melty. A whole lot of heart.','https://didiisliuzhihan.github.io/bad-children-shop/assets/delivery/matcha-card-original.png','https://didiisliuzhihan.github.io/bad-children-shop/assets/delivery/toy_matcha_clown.glb','https://didiisliuzhihan.github.io/bad-children-shop/assets/delivery/toy7-matcha-voice.mp3','https://didiisliuzhihan.github.io/bad-children-shop/assets/delivery/toy7-matcha-story.jpg','送你一团火。等等，我先吹凉。','','#bdcc88'),
 ('stock_gourd','炒股葫芦','Office Hulu','终于当上大人了，先正经一秒——今天找葫芦碰个杯，庆祝他正经了一秒。','A very serious grown-up. For approximately one second.','https://didiisliuzhihan.github.io/bad-children-shop/assets/delivery/gourd-office-card-original.png','https://didiisliuzhihan.github.io/bad-children-shop/assets/delivery/toy_stock_gourd.glb','https://didiisliuzhihan.github.io/bad-children-shop/assets/delivery/toy6-hulu-voice.mp3','https://didiisliuzhihan.github.io/bad-children-shop/assets/delivery/toy6-hulu-story.jpg','今日大盘：屁股决定脑袋。','','#efd276')
on conflict (id) do nothing;
insert into public.bc_nest_catalog (kind,actors,speaker,prop,line,story) values
 ('matcha_crow_warm',array['matcha_clown','tired_crow'],'tired_crow','cup','“你能不能有点热情？”“可以，别烫。”','抹茶嫌鸦冷淡，鸦嫌抹茶烫手。拌了半天嘴，最后一起等那杯茶凉下来。'),
 ('gourd_jimao_promotion',array['stock_gourd','jimao'],'jimao','memo','经理升职了：从坐着上班，升到站起来乱讲。','葫芦宣布升职，鸡毛第一个鼓掌。新职位没记住，庆功奶茶已经安排了。'),
 ('gourd_stressed_close',array['stock_gourd','stressed_jimao'],'stressed_jimao','book','今天的压力已经收盘，不接受盘后加班。','葫芦把抗压鸡毛的雷阵雨宣布为“休市”。两个人认真决定，先让脑袋下班。'),
 ('gourd_kuku_water',array['stock_gourd','kuku_sunflower'],'kuku_sunflower','cups','这支葵，不用上涨也值得被浇水。','葫芦说长期看好葵。葵没听懂股市，只看见他端来了一杯水。'),
 ('gourd_crow_pitch',array['stock_gourd','tired_crow'],'tired_crow','memo','鸦唯一的投资意向：继续躺着。','葫芦向鸦汇报了今天的大盘。鸦没搭话，葫芦决定把这算作“非常稳定的合作关系”。'),
 ('matcha_popcorn_cool',array['matcha_clown','miss_popcorn'],'miss_popcorn','cup','火先放旁边。手给我，别逞强。','小抹茶又先烫到了自己。爆米花嘴上嫌麻烦，手里已经把凉杯子递过来了。'),
 ('solo_matcha',array['matcha_clown'],'matcha_clown','gift','这次的礼物，已经吹凉了。','小抹茶练习了一下午，终于把一句气话吹成了一句“想你了”。这次没有烫到谁。'),
 ('solo_gourd',array['stock_gourd'],'stock_gourd','memo','今日业绩：把领带系正了一秒。','葫芦对着小窝练习了一遍经理致辞。刚说“各位同事”，就被自己的屁股打断了。')
on conflict (kind) do nothing;
do $release$
declare definition text;
 old_list text := $$where id in ('jimao','kuku_sunflower','stressed_jimao','miss_popcorn','tired_crow') order by random()$$;
 new_list text := $$where id in ('jimao','kuku_sunflower','stressed_jimao','miss_popcorn','tired_crow','stock_gourd','matcha_clown') order by random()$$;
begin
 definition := pg_get_functiondef('public.bc_nest_step(uuid,text,uuid,integer,uuid)'::regprocedure);
 if strpos(definition,old_list)>0 then
  if md5(definition)<>'39a7475b25d11f0ec634aff1aeea61d7' then raise exception 'Draw function changed since release check';end if;
  execute replace(definition,old_list,new_list);
 elsif strpos(definition,new_list)=0 then
  raise exception 'Unexpected draw function; release aborted without catalog changes';
 end if;
 if (select count(*) from public.toys where id in ('stock_gourd','matcha_clown'))<>2 then raise exception 'Missing residents';end if;
end $release$;
commit;
