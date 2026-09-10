// Approval-only content. Never imported from the production entry or server catalog.
export const NEW_RESIDENT_IDS=['matcha_clown','stock_gourd'];
export const characterDrafts=[{
 id:'matcha_clown',number:'07',name_zh:'卖火的小抹茶',name_en:'Little Matcha',series:'抹茶系列',
 tagline_zh:'火气有点大，心是冰淇淋做的——今天把一句气话，换成一句好好说。',
 tagline_en:'A little fiery. A little melty. A whole lot of heart.',story_text:'送你一团火。等等，我先吹凉。',
 story_note:'小抹茶总想像游乐园里送礼物的小丑，把开心塞进朋友手里。可她一着急，递出去的礼物就成了一团火。她不是故意的；每次烫到别人以前，自己的手心已经先红了。她正在练习，把“我没有生气”换成“我有点难过”。别只看见她冒火的那一面，再等一等，你会看见抹茶与奶油慢慢融在一起的温柔。',
 story_en:'',color:'#bdcc88',model:'toy_matcha_clown.glb',art:'matcha-card-original.png',storyArt:'toy7-matcha-story.jpg',voice:'toy7-matcha-voice.mp3',
 notes:'中文名与原图卡面按你提供的内容保留；英文名、标语、任务和小故事均为待确认初稿。'
},{
 id:'stock_gourd',number:'06',name_zh:'炒股葫芦',name_en:'Office Hulu',series:'系列待定',
 tagline_zh:'终于当上大人了，先正经一秒——今天找葫芦碰个杯，庆祝他正经了一秒。',
 tagline_en:'A very serious grown-up. For approximately one second.',story_text:'今日大盘：屁股决定脑袋。',
 story_note:'葫芦终于戴上领带，当上了白领炒股经理。每天最期待上班，最擅长在办公室里大闹一场。别人研究股市，他顺便研究怎么把屁股炒热；别人等行情，他宣布自己已经“臀部上涨”。终于当一回大人了，他把领带扶正——正经了一秒，又笑出了声。',
 story_en:'',color:'#efd276',model:'toy_stock_gourd.glb',art:'gourd-office-card-original.png',storyArt:'toy6-hulu-story.jpg',voice:'toy6-hulu-voice.mp3',
 notes:'卡面使用你提供的《白领葫芦》办公室原图；碰杯社交任务已确认。建模仍以原暖黄色角色图为材质参考。系列、英文名与模型定稿待确认。'
}];
export const draftPairs=[
 {id:'matcha_crow_warm',actors:['matcha_clown','tired_crow'],speaker:'tired_crow',prop:'cup',response:'bicker',line:'“你能不能有点热情？”“可以，别烫。”',title:'你倒是热情一点',story:'抹茶嫌鸦冷淡，鸦嫌抹茶烫手。拌了半天嘴，最后一起等那杯茶凉下来。',beats:['抹茶微微转向鸦，火焰气球晃一下。','鸦稍稍转开，过一会儿又看回来。','两个人之间留下了一杯温的。']},
 {id:'gourd_jimao_promotion',actors:['stock_gourd','jimao'],speaker:'jimao',prop:'memo',response:'celebrate',line:'经理升职了：从坐着上班，升到站起来乱讲。',title:'最捧场的同事',story:'葫芦宣布升职，鸡毛第一个鼓掌。新职位没记住，庆功奶茶已经安排了。',beats:['葫芦左右摇摆，努力摆出经理的架势。','张鸡毛轻轻一跳，热情捧场。','地板上留下一张没有字的“任命书”。']},
 {id:'gourd_stressed_close',actors:['stock_gourd','stressed_jimao'],speaker:'stressed_jimao',prop:'book',response:'soften',line:'今天的压力已经收盘，不接受盘后加班。',title:'给小雷雨收盘',story:'葫芦把抗压鸡毛的雷阵雨宣布为“休市”。两个人认真决定，先让脑袋下班。',beats:['葫芦朝抗压鸡毛转过去。','两个人一起缓缓停下摇晃。','一本小册子停在身边。']},
 {id:'gourd_kuku_water',actors:['stock_gourd','kuku_sunflower'],speaker:'kuku_sunflower',prop:'cups',response:'soften',line:'这支葵，不用上涨也值得被浇水。',title:'长期看好哭哭葵',story:'葫芦说长期看好葵。葵没听懂股市，只看见他端来了一杯水。',beats:['葫芦收起夸张的摆动，转向葵。','葵向他轻轻歪了一下。','地毯边多了两只小杯子。']},
 {id:'gourd_crow_pitch',actors:['stock_gourd','tired_crow'],speaker:'tired_crow',prop:'memo',response:'ignore',line:'鸦唯一的投资意向：继续躺着。',title:'无人认购的演讲',story:'葫芦向鸦汇报了今天的大盘。鸦没搭话，葫芦决定把这算作“非常稳定的合作关系”。',beats:['葫芦向鸦左右晃着讲了几句。','鸦把视线轻轻挪开，不转回来接话。','一张小小的演讲提纲留在地上。']},
 {id:'matcha_popcorn_cool',actors:['matcha_clown','miss_popcorn'],speaker:'miss_popcorn',prop:'cup',response:'soften',line:'火先放旁边。手给我，别逞强。',title:'给火气降温',story:'小抹茶又先烫到了自己。爆米花嘴上嫌麻烦，手里已经把凉杯子递过来了。',beats:['抹茶轻轻缩一下，再朝爆米花转过去。','爆米花停下自己的小动作，靠视线回应她。','留下一只盛了凉水的杯子。']},
];
export const draftSolos=[
 {id:'solo_matcha',actors:['matcha_clown'],speaker:'matcha_clown',prop:'gift',response:'soften',line:'这次的礼物，已经吹凉了。',title:'练习把礼物吹凉',story:'小抹茶练习了一下午，终于把一句气话吹成了一句“想你了”。这次没有烫到谁。',beats:['轻轻晃一下气球，再慢慢站稳。','脚边留下一份小小的礼物。']},
 {id:'solo_gourd',actors:['stock_gourd'],speaker:'stock_gourd',prop:'memo',response:'celebrate',line:'今日业绩：把领带系正了一秒。',title:'经理的一秒钟',story:'葫芦对着小窝练习了一遍经理致辞。刚说“各位同事”，就被自己的屁股打断了。',beats:['正经站好一小会儿。','忽然轻轻左右晃一下，又若无其事地站好。']},
];
export const draftDirections=[...draftPairs,...draftSolos];
export const draftStoryCopy=Object.fromEntries(draftDirections.map(({id,story})=>[id,story]));
export const draftPerformances=draftDirections.map(({story,title,beats,...direction})=>direction);
export function createDraftToys(base='/drafts/',mediaBase='/assets/delivery/'){
 return characterDrafts.map(({model,art,storyArt,voice,notes,series,...toy})=>({...toy,model_url:base+model,icon_url:base+art,card_image_url:base+art,story_image_url:mediaBase+storyArt,audio_url:mediaBase+voice}));
}
