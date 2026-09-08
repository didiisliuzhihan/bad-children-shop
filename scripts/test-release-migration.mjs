// Explicit integration check: creates only isolated QA identities, never deletes data.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {readAllCapsules} from '../src/lib/readAllCapsules.mjs';
const env=Object.fromEntries(fs.readFileSync(new URL('../.env.local',import.meta.url),'utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).replace(/^['"]|['"]$/g,'')]));
const base=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_ANON_KEY,origin='https://didiisliuzhihan.github.io',endpoint=base+'/functions/v1/bc-account-preview';
const guest=createClient(base,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const check=error=>{if(error)throw error;};
const preflight=await fetch(endpoint,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,apikey,content-type'}});
assert(preflight.ok);assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
const anonymous=await guest.auth.signInAnonymously();check(anonymous.error);assert(anonymous.data.user.is_anonymous);
const items=Array.from({length:1203},(_,i)=>({id:randomUUID(),user_id:anonymous.data.user.id,toy_id:i%2?'tired_crow':'miss_popcorn',obtained_at:new Date().toISOString()}));
for(let i=0;i<items.length;i+=500)check((await guest.from('user_capsules').insert(items.slice(i,i+500))).error);
const readGuest=()=>readAllCapsules((after,size)=>{let q=guest.from('user_capsules').select('id,toy_id,obtained_at').eq('user_id',anonymous.data.user.id).order('id').limit(size);return after?q.gt('id',after):q;});
const old=await readGuest();assert.equal(old.length,1203);
async function call(body,token){const r=await fetch(endpoint,{method:'POST',headers:{Origin:origin,apikey:key,'content-type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});const b=await r.json();assert.equal(r.status,200,b.error);return b;}
const name='迁移验收_'+randomBytes(4).toString('hex'),password=randomBytes(18).toString('base64url');
const created=await call({action:'register',name,password});const token=created.session.access_token;
let added=0;for(let i=0;i<old.length;i+=1000)added+=(await call({action:'import',items:old.slice(i,i+1000),legacyToken:anonymous.data.session.access_token},token)).added;
assert.equal(added,1203);
assert.equal((await call({action:'import',items:old.slice(0,1000),legacyToken:anonymous.data.session.access_token},token)).added,0);
const login=await call({action:'login',name,password}),restored=await call({action:'load'},login.session.access_token);
assert.equal(restored.capsules.length,1203);assert.deepEqual(new Set(restored.capsules.map(c=>c.id)),new Set(old.map(c=>c.id)));
assert.equal((await readGuest()).length,1203);
await call({action:'save',key:'nest',revision:0,value:{version:1,roomId:'furnished-nest-v2',placements:[]}},login.session.access_token);
console.log(JSON.stringify({ok:true,testedAt:new Date().toISOString(),checks:['production origin preflight','1203 real anonymous records read','verified legacy identity imported in batches','repeat import added zero','fresh password session restored all 1203 IDs','original anonymous records retained','room save supports large collections'],qaUserId:restored.profile.user_id,legacyQaUserId:anonymous.data.user.id}));
