import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {stripTypeScriptTypes} from 'node:module';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
function harness(){
 const requests=[],fonts=new Set();
 class FontFace{status='unloaded';constructor(family,source,options){Object.assign(this,{family,source,options})}load(){requests.push(this.family);this.status='loaded';return Promise.resolve(this)}}
 const english=new FontFace('Fredoka','existing-font',{weight:'300 700'});fonts.add(english);
 const interfaceFonts=new Map([['Fredoka',english]]),context={FontFace,interfaceFonts,asset:name=>'/assets/delivery/'+name,document:{fonts},setTimeout,clearTimeout};
 vm.runInNewContext(stripTypeScriptTypes(read('src/lib/questFont.ts')).replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'')+'\nglobalThis.api={ensureQuestFont,QUEST_FONT_FAMILY,EN_QUEST_FONT_FAMILY};',context);
 return {requests,fonts,english,interfaceFonts,api:context.api};
}
test('locale font loading reuses the existing Fredoka file; Chinese remains BC Quest',async()=>{
 const h=harness();assert.deepEqual(h.requests,[]);await h.api.ensureQuestFont(50,'en');await h.api.ensureQuestFont(50,'en');assert.deepEqual(h.requests,['Fredoka']);assert.equal(h.interfaceFonts.get('Fredoka'),h.english);
 await h.api.ensureQuestFont(50,'zh');assert.deepEqual(h.requests,['Fredoka','BC Quest']);assert(h.api.QUEST_FONT_FAMILY.startsWith('"BC Quest"'));assert(h.api.EN_QUEST_FONT_FAMILY.startsWith('"Fredoka","BC Quest"'));
});
test('a failed English font can retry and a stalled font always respects its deadline',async()=>{
 const h=harness();h.english.status='error';await h.api.ensureQuestFont(50,'en');assert(!h.fonts.has(h.english));assert.notEqual(h.interfaceFonts.get('Fredoka'),h.english);
 const face=h.interfaceFonts.get('Fredoka');face.status='unloaded';face.load=()=>new Promise(()=>{});await assert.rejects(h.api.ensureQuestFont(5,'en'),/font could not load/);
});
test('all seven BC Quest roles have an English playful counterpart, without changing general UI type',()=>{
 const files=['src/v4.css','src/collection-room.css','src/community.css','src/collection-shelf.css','src/postcard.css'];
 const selectors=new Set(files.flatMap(file=>[...read(file).matchAll(/([^{}]+)\{[^{}]*["']BC Quest["'][^{}]*\}/g)].map(m=>m[1].trim().split(' ').at(-1))));
 assert.equal(selectors.size,7);
 const css=read('src/language.css'),rule=css.match(/([^{}]+)\{font-family:"Fredoka","BC Quest"[^{}]*\}/)[1];
 for(const selector of selectors)assert(rule.includes('html[lang=en] '+selector),selector);
 assert(!rule.includes('.pill-button'));assert(!rule.includes('.language-switch'));assert(read('src/styles.css').startsWith(':root{font-family:Inter'));
});
