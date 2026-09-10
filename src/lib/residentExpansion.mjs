// Approved resident expansion. Only visible character copy and stage directions;
// private reward prose stays in the backend catalog.
export const RESIDENT_EXPANSION=[
  {
    "id": "stock_gourd",
    "number": "06",
    "name_zh": "炒股葫芦",
    "name_en": "Office Hulu",
    "tagline_zh": "终于当上大人了，先正经一秒——今天找葫芦碰个杯，庆祝他正经了一秒。",
    "tagline_en": "A very serious grown-up. For approximately one second.",
    "story_text": "今日大盘：屁股决定脑袋。",
    "story_note": "葫芦终于戴上领带，当上了白领炒股经理。每天最期待上班，最擅长在办公室里大闹一场。别人研究股市，他顺便研究怎么把屁股炒热；别人等行情，他宣布自己已经“臀部上涨”。终于当一回大人了，他把领带扶正——正经了一秒，又笑出了声。",
    "story_en": "",
    "color": "#efd276",
    "model": "toy_stock_gourd.glb",
    "art": "gourd-office-card-original.png",
    "storyArt": "toy6-hulu-story.jpg",
    "voice": "toy6-hulu-voice.mp3"
  },
  {
    "id": "matcha_clown",
    "number": "07",
    "name_zh": "卖火的小抹茶",
    "name_en": "Little Matcha",
    "tagline_zh": "火气有点大，心是冰淇淋做的——今天把一句气话，换成一句好好说。",
    "tagline_en": "A little fiery. A little melty. A whole lot of heart.",
    "story_text": "送你一团火。等等，我先吹凉。",
    "story_note": "小抹茶总想像游乐园里送礼物的小丑，把开心塞进朋友手里。可她一着急，递出去的礼物就成了一团火。她不是故意的；每次烫到别人以前，自己的手心已经先红了。她正在练习，把“我没有生气”换成“我有点难过”。别只看见她冒火的那一面，再等一等，你会看见抹茶与奶油慢慢融在一起的温柔。",
    "story_en": "",
    "color": "#bdcc88",
    "model": "toy_matcha_clown.glb",
    "art": "matcha-card-original.png",
    "storyArt": "toy7-matcha-story.jpg",
    "voice": "toy7-matcha-voice.mp3"
  }
];
export const RESIDENT_DIRECTIONS=[
  {
    "id": "matcha_crow_warm",
    "actors": [
      "matcha_clown",
      "tired_crow"
    ],
    "speaker": "tired_crow",
    "prop": "cup",
    "response": "bicker",
    "line": "“你能不能有点热情？”“可以，别烫。”"
  },
  {
    "id": "gourd_jimao_promotion",
    "actors": [
      "stock_gourd",
      "jimao"
    ],
    "speaker": "jimao",
    "prop": "memo",
    "response": "celebrate",
    "line": "经理升职了：从坐着上班，升到站起来乱讲。"
  },
  {
    "id": "gourd_stressed_close",
    "actors": [
      "stock_gourd",
      "stressed_jimao"
    ],
    "speaker": "stressed_jimao",
    "prop": "book",
    "response": "soften",
    "line": "今天的压力已经收盘，不接受盘后加班。"
  },
  {
    "id": "gourd_kuku_water",
    "actors": [
      "stock_gourd",
      "kuku_sunflower"
    ],
    "speaker": "kuku_sunflower",
    "prop": "cups",
    "response": "soften",
    "line": "这支葵，不用上涨也值得被浇水。"
  },
  {
    "id": "gourd_crow_pitch",
    "actors": [
      "stock_gourd",
      "tired_crow"
    ],
    "speaker": "tired_crow",
    "prop": "memo",
    "response": "ignore",
    "line": "鸦唯一的投资意向：继续躺着。"
  },
  {
    "id": "matcha_popcorn_cool",
    "actors": [
      "matcha_clown",
      "miss_popcorn"
    ],
    "speaker": "miss_popcorn",
    "prop": "cup",
    "response": "soften",
    "line": "火先放旁边。手给我，别逞强。"
  },
  {
    "id": "solo_matcha",
    "actors": [
      "matcha_clown"
    ],
    "speaker": "matcha_clown",
    "prop": "gift",
    "response": "soften",
    "line": "这次的礼物，已经吹凉了。"
  },
  {
    "id": "solo_gourd",
    "actors": [
      "stock_gourd"
    ],
    "speaker": "stock_gourd",
    "prop": "memo",
    "response": "celebrate",
    "line": "今日业绩：把领带系正了一秒。"
  }
];
export const RESIDENT_RELEASE_FILES=RESIDENT_EXPANSION.flatMap(t=>[t.model,t.art,t.storyArt,t.voice]);
export function residentExpansionToys(asset){return RESIDENT_EXPANSION.map(({model,art,storyArt,voice,...toy})=>({...toy,model_url:asset(model),icon_url:asset(art),card_image_url:asset(art),story_image_url:asset(storyArt),audio_url:asset(voice)}));}
