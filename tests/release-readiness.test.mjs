import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {readAllCapsules} from '../src/lib/readAllCapsules.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('release uses account-aware entry without demo inventory or unlock shortcuts',()=>{
 const main=read('src/main.tsx'),shop=read('src/components/CommunityShop.tsx');
 assert(main.includes('<AccountProvider><CommunityShop/></AccountProvider>'));
 assert(shop.includes('initialBag:false'));assert(shop.includes('useState<Capsule[]>(readLocal)'));
 assert(!/community-demo|demoUnlock|加入测试收藏|示例解锁/.test(shop));
 assert(shop.includes('if(!writeLocal(next))throw Error'));
 assert(read('src/components/TicketStudio.tsx').includes('投进公共扭蛋池、让别人抽到的功能暂未开放'));
});
test('read all pages without silently cutting off large collections',async()=>{
 const data=Array.from({length:1203},(_,i)=>({id:String(i).padStart(5,'0')}));let calls=0;
 const result=await readAllCapsules(async(after,size)=>{calls++;return {data:data.filter(r=>!after||r.id>after).slice(0,size)}});
 assert.deepEqual(result,data);assert.equal(calls,3);
 await assert.rejects(readAllCapsules(async()=>({error:Error('offline')})),/offline/);
 await assert.rejects(readAllCapsules(async()=>({data:[{id:'same'}]}),1),/分页/);
});
test('backend and legacy import retain ownership predicates, sessions and originals',()=>{
 const api=read('supabase/functions/bc-account-preview/index.ts'),menu=read('src/components/AccountMenu.tsx'),legacy=read('src/lib/collection.ts');
 assert(api.includes("'https://didiisliuzhihan.github.io'"));assert(api.includes("if(origin&&!origins.has(origin))return reply(403"));
 assert(api.includes(".eq('user_id',uid).order('id').limit(size)"));
 assert(api.includes(".eq('user_id',auth.uid).order('id').limit(size)"));
 assert(menu.includes('readLegacyImport()'));assert(menu.includes('items.slice(offset,offset+1000),token'));
 assert(!menu.includes('localStorage.removeItem'));assert(legacy.includes('session.user.is_anonymous'));
 assert.equal(read('src/lib/readAllCapsules.mjs'),read('supabase/functions/bc-account-preview/readAllCapsules.mjs'));
});
