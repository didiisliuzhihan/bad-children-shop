import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID,randomBytes} from 'node:crypto';
const env=Object.fromEntries(fs.readFileSync(new URL('../.env.local',import.meta.url),'utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).replace(/^['"]|['"]$/g,'')]));
const base=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_ANON_KEY;
const endpoint=base+'/functions/v1/bc-account-preview',checks=[],created=[];
async function call(data,token){const response=await fetch(endpoint,{method:'POST',headers:{apikey:key,'content-type':'application/json',Origin:'http://127.0.0.1:4177',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});return {status:response.status,body:await response.json()}}
function pass(label,result,status=200){assert.equal(result.status,status,label+': '+(result.body.error||'unexpected status'));checks.push(label);return result.body}
const suffix=randomBytes(4).toString('hex'),name='QA_'+suffix,password=randomBytes(18).toString('base64url'),nextPassword=randomBytes(18).toString('base64url');
try{
 pass('unauthenticated private load rejected',await call({action:'load'}),401);
 const deniedOrigin=await fetch(endpoint,{method:'POST',headers:{apikey:key,'content-type':'application/json',Origin:'https://unapproved.example'},body:JSON.stringify({action:'load'})});assert.equal(deniedOrigin.status,403);checks.push('unapproved browser origin denied');
 const a=pass('real username registration',await call({action:'register',name,password}));let token=a.session.access_token;
 let profile=pass('authenticated profile load',await call({action:'load'},token));created.push(profile.profile.user_id);assert.equal(profile.profile.nickname,name);assert.equal(profile.capsules.length,0);
 const b=pass('second isolated account',await call({action:'register',name:name+'b',password}));const tokenB=b.session.access_token;const other=pass('second profile load',await call({action:'load'},tokenB));created.push(other.profile.user_id);
 pass('normalized duplicate name rejected',await call({action:'register',name:name.toLowerCase(),password}),409);
 pass('wrong password rejected',await call({action:'login',name,password:nextPassword}),401);
 pass('password login works across a new client',await call({action:'login',name,password}));
 const layout={version:1,roomId:'furnished-nest-v2',placements:[]};
 pass('owner saves room',await call({action:'save',key:'nest',value:layout,revision:0},token));
 pass('stale room revision cannot overwrite',await call({action:'save',key:'nest',value:layout,revision:0},token),409);
 const second=pass('other account cannot see room',await call({action:'load'},tokenB));assert.equal(second.documents.nest,undefined);
 const items=['miss_popcorn','tired_crow'].map(toy_id=>({id:randomUUID(),toy_id,obtained_at:new Date().toISOString()}));
 const imported=pass('capsule migration',await call({action:'import',items},token));assert.equal(imported.added,2);
 const repeat=pass('migration is idempotent',await call({action:'import',items},token));assert.equal(repeat.added,0);assert.equal(repeat.capsules.length,2);
 const stolen=pass('same capsule cannot be claimed by another account',await call({action:'import',items},tokenB));assert.equal(stolen.added,0);assert.equal(stolen.capsules.length,0);
 pass('server starts task',await call({action:'quest',toyId:'miss_popcorn',operation:'save'},token));
 pass('server prevents early model unlock',await call({action:'quest',toyId:'miss_popcorn',operation:'unlock'},token),409);
 pass('server rejects unowned task',await call({action:'quest',toyId:'jimao',operation:'save'},token),409);
 const form=new FormData();form.set('file',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9pUAAAAASUVORK5CYII=','base64')],{type:'image/png'}),'qa.png');form.set('width','1');form.set('height','1');
 const uploadedResponse=await fetch(endpoint,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,Origin:'http://127.0.0.1:4177'},body:form});const uploaded=pass('private photo upload',{status:uploadedResponse.status,body:await uploadedResponse.json()});
 const draft={id:randomUUID(),source:'player',text:'QA 测试草稿',signature:name,media:uploaded.media,createdAt:new Date().toISOString()};
 pass('photo postcard saved to account',await call({action:'save',key:'postcards',value:{drafts:[draft]},revision:0},token));
 pass('other account cannot attach private photo',await call({action:'save',key:'postcards',value:{drafts:[draft]},revision:0},tokenB),403);
 const traversal={...draft,media:{...draft.media,storagePath:created[0]+'/../'+created[1]+'/fake.png'}};
 pass('media path traversal rejected',await call({action:'save',key:'postcards',value:{drafts:[traversal]},revision:1},token),403);
 pass('player cannot create a system story reward',await call({action:'save',key:'postcards',value:{drafts:[{...draft,source:'nest'}]},revision:1},token),400);
 pass('client cannot overwrite task timestamps',await call({action:'save',key:'quests',value:{miss_popcorn:{savedAt:1,unlockedAt:2}},revision:1},token),400);
 const restored=pass('fresh client restores draft and room',await call({action:'load'},token));assert.equal(restored.documents.postcards.value.drafts[0].text,draft.text);assert(restored.documents.postcards.value.drafts[0].media.url.startsWith(base+'/storage/'));
 assert.deepEqual(restored.stories,[]);checks.push('load exposes collected stories only, never a pending inbox');
 const lease=randomUUID();
 pass('empty room visit accepted without inventing events',await call({action:'life',operation:'visit',revision:1,lease},token));
 const empty=pass('empty room cannot start a performance',await call({action:'life',operation:'start',revision:1,lease},token));assert(!empty.event);
 const forged=pass('forged story completion cannot mint a reward',await call({action:'life',operation:'complete',revision:1,lease,requestId:randomUUID(),text:'forged',user_id:created[1]},token));assert(!forged.ok);
 const requestId=randomUUID(),draw=pass('account draws through its private machine',await call({action:'life',operation:'draw',requestId},token));assert.equal(draw.type,'toy');
 const retryDraw=pass('retrying draw reuses the original result',await call({action:'life',operation:'draw',requestId},token));assert.deepEqual(retryDraw,draw);
 const simultaneous=pass('second machine click reuses outstanding capsule',await call({action:'life',operation:'draw',requestId:randomUUID()},token));assert.deepEqual(simultaneous,draw);
 pass('another account cannot collect this capsule',await call({action:'life',operation:'keep',requestId},tokenB),404);
 pass('owner collects capsule',await call({action:'life',operation:'keep',requestId},token));
 pass('repeated keep is idempotent',await call({action:'life',operation:'keep',requestId},token));
 const afterKeep=pass('kept capsule restored on another load',await call({action:'load'},token));assert.equal(afterKeep.capsules.filter(c=>c.id===requestId).length,1);assert.deepEqual(afterKeep.stories,[]);
 for(const table of ['bc_nest_stories','bc_nest_life','bc_nest_catalog','bc_account_draws']){const response=await fetch(base+'/rest/v1/'+table+'?select=*',{headers:{apikey:key,Authorization:'Bearer '+token}});assert.equal(response.status,403);checks.push(table+' cannot be directly read by a player');}
 const rpc=await fetch(base+'/rest/v1/rpc/bc_nest_step',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({p_user:created[1],p_action:'draw',p_request:randomUUID()})});assert.equal(rpc.status,403);checks.push('direct RPC cannot bypass account verification');
 const direct=await fetch(base+'/rest/v1/bc_account_documents?select=*',{headers:{apikey:key,Authorization:'Bearer '+token}});assert.equal(direct.status,403);checks.push('direct database reads denied even for signed-in users');
 pass('wrong recovery code rejected',await call({action:'recover',name,password:nextPassword,code:'0'.repeat(64)}),401);
 const recovered=pass('recovery changes password and rotates code',await call({action:'recover',name,password:nextPassword,code:a.recoveryCode}));assert.notEqual(recovered.recoveryCode,a.recoveryCode);
 pass('recovery invalidates old access token',await call({action:'load'},token),401);token=recovered.session.access_token;
 const refreshed=await fetch(base+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:key,'content-type':'application/json'},body:JSON.stringify({refresh_token:a.session.refresh_token})});const refreshedBody=await refreshed.json();
 if(refreshed.ok)pass('old refresh session still cannot regain account access',await call({action:'load'},refreshedBody.access_token),401);else{assert([400,401,403].includes(refreshed.status));checks.push('recovery revokes old refresh session')}
 pass('recovered session can restore account',await call({action:'load'},token));
 pass('used recovery code cannot be reused',await call({action:'recover',name,password,code:a.recoveryCode}),401);
 pass('logout',await call({action:'logout'},token));pass('logged-out token cannot read account',await call({action:'load'},token),401);
 const report={ok:true,testedAt:new Date().toISOString(),checks,createdUserIds:created,testMediaPath:uploaded.media.storagePath};
 fs.writeFileSync(new URL('../previews/community/account-api-check.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(error){console.log(JSON.stringify({ok:false,error:error.message,checks,createdUserIds:created}));process.exitCode=1}
