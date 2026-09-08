// Uses only a dedicated QA account supplied through environment variables.
import assert from 'node:assert/strict';
const env=process.env,name=env.BC_PHOTO_QA_NAME,password=env.BC_PHOTO_QA_PASSWORD,target=env.BC_PHOTO_STORY_ID;
assert(/^(QA_|发布验收_)/.test(name||''));assert(password&&target);
const base=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_ANON_KEY,endpoint=base+'/functions/v1/bc-account-preview';
async function call(body,token){const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',apikey:key,...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)}),data=await r.json();assert.equal(r.status,200,data.error);return data}
const login=await call({action:'login',name,password}),token=login.session.access_token;
const before=await call({action:'load'},token);assert.equal(before.profile.nickname,name);
let found=before.stories.find(s=>s.id===target),drawCount=0;
while(!found&&drawCount++<20){
 const draw=await call({action:'life',operation:'draw',requestId:crypto.randomUUID()},token);
 const retry=await call({action:'life',operation:'draw',requestId:draw.id},token);assert.equal(retry.id,draw.id);assert.equal(retry.type,draw.type);
 if(draw.type==='story'){
  assert(draw.story.media?.storagePath,'No blank story should enter a new draw');assert.equal(draw.story.source,'nest');assert(!draw.story.stamp&&!draw.story.signature);
  await call({action:'life',operation:'keep',requestId:draw.id},token);if(draw.story.id===target)found=draw.story;
 }else await call({action:'life',operation:'reject',requestId:draw.id},token);
}
assert(found,'Target story not drawn within the bounded QA attempt count');
const relogin=await call({action:'login',name,password}),restored=await call({action:'load'},relogin.session.access_token),story=restored.stories.find(s=>s.id===target);
assert.equal(restored.capsules.length,before.capsules.length);assert.deepEqual(restored.documents.nest,before.documents.nest);
assert(story.media?.url);assert.equal(story.media.sceneMoment,'repeat');assert(story.media.capturedAt);
const response=await fetch(story.media.url);assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.toString('ascii',1,4),'PNG');assert.equal(bytes.readUInt32BE(16),960);assert.equal(bytes.readUInt32BE(20),960);
const unsigned=await fetch(base+'/storage/v1/object/public/bc-account-preview-media/'+story.media.storagePath);assert(!unsigned.ok,'Private story media must not be public');
console.log(JSON.stringify({ok:true,drawCount,restoredAfterFreshLogin:true,actualPNG:true,width:960,height:960,bytes:bytes.length,private:true,originalCollectionAndLayoutPreserved:true}));

