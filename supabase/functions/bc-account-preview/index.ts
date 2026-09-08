import {createClient} from 'npm:@supabase/supabase-js@2.115.0';
import {accountName,accountPassword,recoveryToken,validCapsules,safeDocument} from './accountContract.mjs';
import {validateLayout,NEST_ROOM_ID} from './nestPlacement.mjs';
import {readAllCapsules} from './readAllCapsules.mjs';

const url=Deno.env.get('SUPABASE_URL')!;
const secrets=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const publishables=JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}');
const secret=secrets.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publicKey=publishables.default||Deno.env.get('SUPABASE_ANON_KEY')!;
const publicKeys=new Set([...Object.values(publishables),Deno.env.get('SUPABASE_ANON_KEY')]);
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const admin=createClient(url,secret,options);
const origins=new Set(['http://127.0.0.1:4177','http://localhost:4177','https://didiisliuzhihan.github.io']);
const bucket='bc-account-preview-media';
const ownMediaPath=(path:unknown,uid:string)=>typeof path==='string'&&path.startsWith(uid+'/')&&/^[a-f0-9-]{36}\.(jpg|png|webp|gif|mp4|webm)$/.test(path.slice(uid.length+1));
const sha=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');
const randomCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n=>n.toString(16).padStart(2,'0')).join('');
class ApiError extends Error{constructor(public status:number,message:string){super(message)}}
function check(error:unknown){if(error)throw new ApiError(503,'暂时没能连上小窝，请稍后重试。')}
async function limited(key:string,max:number,seconds=900){const {data,error}=await admin.rpc('bc_account_rate',{p_bucket:key,p_limit:max,p_seconds:seconds});check(error);if(!data)throw new ApiError(429,'敲门有点频繁，过一会儿再试吧。')}
async function bodyBytes(req:Request,limit:number){
 const reader=req.body?.getReader();if(!reader)throw new ApiError(400,'没有收到内容。');
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new ApiError(413,'内容太大了，请缩小后再试。')}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}return bytes;
}
async function verified(req:Request){
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');if(!token)throw new ApiError(401,'先登录，再把生活留在这里。');
 const {data,error}=await admin.auth.getUser(token);if(error||!data.user||data.user.is_anonymous)throw new ApiError(401,'请重新登录。');
 // Only parse claims AFTER Auth has verified the token. user_metadata is never authority.
 let claims;try{claims=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))}catch{throw new ApiError(401,'请重新登录。')}
 const uid=data.user.id;
 const [security,revoked,registered]=await Promise.all([admin.from('bc_account_security').select('session_epoch').eq('user_id',uid).single(),admin.from('bc_account_revoked_sessions').select('session_id').eq('session_id',claims.session_id).maybeSingle(),admin.from('bc_account_sessions').select('session_epoch').eq('session_id',claims.session_id).eq('user_id',uid).maybeSingle()]);
 if(security.error||revoked.error||registered.error||!registered.data||registered.data.session_epoch!==security.data?.session_epoch||revoked.data||!claims.app_metadata?.bc_epoch||claims.app_metadata.bc_epoch!==security.data.session_epoch)throw new ApiError(401,'这把旧钥匙已收回，请重新登录。');
 return {uid,token,claims,user:data.user};
}
async function issue(name:{canonical:string;display:string},password:string,create:boolean){
 const email='u.'+await sha(name.canonical)+'@account.badchildren.invalid';
 let code:string|undefined;
 if(create){
  const epoch=crypto.randomUUID();code=randomCode();
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{bc_account:true,bc_epoch:epoch},user_metadata:{nickname:name.display}});
  if(created.error){if(['email_exists','user_already_exists'].includes(created.error.code||''))throw new ApiError(409,'这个名字已经有人住下了，换一个试试。');check(created.error)}
  if(!created.data.user)throw new ApiError(503,'账户暂时没有准备好。');
  const initialized=await admin.rpc('bc_account_initialize',{p_user:created.data.user.id,p_name:name.canonical,p_nickname:name.display,p_digest:await sha(code),p_epoch:epoch});check(initialized.error);
 }
 const login=await createClient(url,publicKey,options).auth.signInWithPassword({email,password});
 if(login.error||!login.data.session)throw new ApiError(401,'名字或密码不正确。');
 const user=login.data.user;
 if(!user.app_metadata.bc_account)throw new ApiError(401,'这个账户还没有完成创建。');
 const profile=await admin.from('bc_account_profiles').select('user_id,nickname,created_at').eq('user_id',user.id).maybeSingle();check(profile.error);
 // A completed password proof can repair an interrupted signup, without claiming another name.
 if(!profile.data){code=randomCode();const fixed=await admin.rpc('bc_account_initialize',{p_user:user.id,p_name:name.canonical,p_nickname:name.display,p_digest:await sha(code),p_epoch:user.app_metadata.bc_epoch});check(fixed.error)}
 const security=await admin.from('bc_account_security').select('session_epoch,recovery_claim').eq('user_id',user.id).single();check(security.error);
 if(security.data.session_epoch!==user.app_metadata.bc_epoch){
  if(!security.data.recovery_claim)throw new ApiError(401,'账户状态发生变化，请稍后重试。');
  code=randomCode();const fixed=await admin.from('bc_account_security').update({session_epoch:user.app_metadata.bc_epoch,recovery_digest:await sha(code),recovery_claim:null,claimed_at:null}).eq('user_id',user.id).eq('recovery_claim',security.data.recovery_claim);check(fixed.error);
 }
 const claims=JSON.parse(atob(login.data.session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
 const registered=await admin.from('bc_account_sessions').upsert({session_id:claims.session_id,user_id:user.id,session_epoch:user.app_metadata.bc_epoch},{onConflict:'session_id'});check(registered.error);
 return {session:{access_token:login.data.session.access_token,refresh_token:login.data.session.refresh_token},recoveryCode:code};
}
async function recover(name:{canonical:string;display:string},password:string,code:string){
 const profile=await admin.from('bc_account_profiles').select('user_id').eq('canonical_name',name.canonical).maybeSingle();check(profile.error);
 if(!profile.data)throw new ApiError(401,'名字或找回码不正确。');
 const claim=crypto.randomUUID(),uid=profile.data.user_id;
 const claimed=await admin.from('bc_account_security').update({recovery_claim:claim,claimed_at:new Date().toISOString()}).eq('user_id',uid).eq('recovery_digest',await sha(code)).or('recovery_claim.is.null,claimed_at.lt.'+new Date(Date.now()-600000).toISOString()).select('session_epoch').maybeSingle();check(claimed.error);
 if(!claimed.data)throw new ApiError(401,'名字或找回码不正确，或正在处理找回。');
 const epoch=crypto.randomUUID(),nextCode=randomCode();
 const changed=await admin.auth.admin.updateUserById(uid,{password,app_metadata:{bc_account:true,bc_epoch:epoch}});
 if(changed.error){await admin.from('bc_account_security').update({recovery_claim:null,claimed_at:null}).eq('user_id',uid).eq('recovery_claim',claim);check(changed.error)}
 const finished=await admin.from('bc_account_security').update({session_epoch:epoch,recovery_digest:await sha(nextCode),recovery_claim:null,claimed_at:null}).eq('user_id',uid).eq('recovery_claim',claim).select('user_id').single();check(finished.error);
 const result=await issue(name,password,false);
 // Remove other refresh sessions too; the epoch-bound registry blocks them even if this call fails.
 await admin.auth.admin.signOut(result.session.access_token,'others');
 return {...result,recoveryCode:nextCode};
}
async function load(uid:string){
 const [profile,capsules,documents]=await Promise.all([admin.from('bc_account_profiles').select('user_id,nickname,created_at').eq('user_id',uid).single(),readAllCapsules((after:string|undefined,size:number)=>{let q=admin.from('bc_account_capsules').select('id,toy_id,obtained_at').eq('user_id',uid).order('id').limit(size);if(after)q=q.gt('id',after);return q}),admin.from('bc_account_documents').select('key,value,revision,updated_at').eq('user_id',uid)]);
 check(profile.error||documents.error);
 capsules.sort((a:any,b:any)=>b.obtained_at.localeCompare(a.obtained_at)||a.id.localeCompare(b.id));
 const docs=Object.fromEntries((documents.data||[]).map(d=>[d.key,d]));
 if(docs.postcards)for(const card of docs.postcards.value.drafts||[]){if(card.media?.storagePath){const path=card.media.storagePath;if(!ownMediaPath(path,uid))throw new ApiError(500,'明信片记录需要检查。');const signed=await admin.storage.from(bucket).createSignedUrl(path,3600);check(signed.error);card.media.url=signed.data!.signedUrl;if(card.media.posterStoragePath){if(!ownMediaPath(card.media.posterStoragePath,uid))throw new ApiError(500,'封面记录需要检查。');const poster=await admin.storage.from(bucket).createSignedUrl(card.media.posterStoragePath,3600);check(poster.error);card.media.posterUrl=poster.data!.signedUrl}}}
 const stories=await admin.from('bc_nest_stories').select('id,text,created_at,media').eq('user_id',uid).not('collected_at','is',null).order('collected_at',{ascending:false});check(stories.error);
 const privateStories=[];for(const row of stories.data||[]){privateStories.push({id:row.id,source:'nest',text:row.text,createdAt:row.created_at,media:await signStoryMedia(row.media,uid)});}
 return {profile:profile.data,capsules,documents:docs,stories:privateStories};
}
async function signStoryMedia(media:any,uid:string){
 if(!media)return null;if(!ownMediaPath(media.storagePath,uid))throw new ApiError(500,'小窝照片记录需要检查。');
 const signed=await admin.storage.from(bucket).createSignedUrl(media.storagePath,3600);check(signed.error);return {...media,url:signed.data!.signedUrl};
}
async function upload(req:Request,uid:string){
 await limited('upload:'+uid,40,3600);
 const bytes=await bodyBytes(req,22*1024*1024),form=await new Response(bytes,{headers:{'content-type':req.headers.get('content-type')!}}).formData(),file=form.get('file');
 if(!(file instanceof File)||!file.size)throw new ApiError(400,'请选择一份影像。');
 const nestEvent=form.get('nestEvent');
 if(nestEvent){
  if(typeof nestEvent!=='string'||!/^[a-f0-9-]{36}$/.test(nestEvent)||file.type!=='image/png')throw new ApiError(400,'小窝照片格式不正确。');
  const event=await admin.from('bc_nest_stories').select('id,media').eq('user_id',uid).eq('event_id',nestEvent).maybeSingle();check(event.error);
  if(!event.data)throw new ApiError(409,'这个小片段还没有完成。');
  if(event.data.media)return await signStoryMedia(event.data.media,uid);
 }
 const types:Record<string,[string,string,number]>={'image/jpeg':['jpg','photo',12],'image/png':['png','photo',12],'image/webp':['webp','photo',12],'image/gif':['gif','gif',8],'video/mp4':['mp4','video',20],'video/webm':['webm','video',20]};
 const spec=types[file.type];if(!spec||file.size>spec[2]*1024*1024)throw new ApiError(400,'这份影像的格式或大小不符合要求。');
 const head=new Uint8Array(await file.slice(0,16).arrayBuffer()),ascii=String.fromCharCode(...head);
 const valid=spec[0]==='jpg'?head[0]===255&&head[1]===216:spec[0]==='png'?head[0]===137&&ascii.slice(1,4)==='PNG':spec[0]==='webp'?ascii.startsWith('RIFF')&&ascii.slice(8,12)==='WEBP':spec[0]==='gif'?/^GIF8[79]a/.test(ascii):spec[0]==='mp4'?ascii.slice(4,8)==='ftyp':head[0]===0x1a&&head[1]===0x45&&head[2]===0xdf&&head[3]===0xa3;
 if(!valid)throw new ApiError(400,'影像内容与格式不一致。');
 const width=Number(form.get('width')),height=Number(form.get('height')),duration=Number(form.get('duration'));
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>24000000||(spec[1]==='video'&&(!Number.isFinite(duration)||duration<=0||duration>15)))throw new ApiError(400,'影像尺寸或时长不符合要求。');
 const id=crypto.randomUUID(),path=uid+'/'+id+'.'+spec[0];
 const saved=await admin.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});check(saved.error);
 if(nestEvent){
  const media={id,kind:'photo',width,height,label:'小窝当时的模样',origin:'account-file',storagePath:path};
  const attached=await admin.from('bc_nest_stories').update({media}).eq('user_id',uid).eq('event_id',nestEvent).is('media',null);check(attached.error);
 }
 const signed=await admin.storage.from(bucket).createSignedUrl(path,3600);check(signed.error);
 return {id,kind:spec[1],url:signed.data!.signedUrl,width,height,...(spec[1]==='video'?{duration}:{}),label:'我的明信片影像',origin:'account-file',storagePath:path};
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin'),headers:Record<string,string>={'content-type':'application/json; charset=utf-8','cache-control':'no-store','vary':'Origin'};
 if(origin&&origins.has(origin)){headers['access-control-allow-origin']=origin;headers['access-control-allow-headers']='authorization,apikey,content-type,x-client-info';headers['access-control-allow-methods']='POST, OPTIONS'}
 const reply=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers});
 if(origin&&!origins.has(origin))return reply(403,{error:'这个入口暂未开放。'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'请求方式不正确。'});
 if(!publicKeys.has(req.headers.get('apikey')||''))return reply(401,{error:'入口校验失败。'});
 try{
  if(req.headers.get('content-type')?.startsWith('multipart/form-data')){const auth=await verified(req);return reply(200,{media:await upload(req,auth.uid)})}
  let data;try{data=JSON.parse(new TextDecoder().decode(await bodyBytes(req,512000)))}catch(error){if(error instanceof ApiError)throw error;throw new ApiError(400,'请求内容无法读取。')}
  if(!data||typeof data!=='object')throw new ApiError(400,'请求内容无法读取。');
  const action=data.action;
  if(['register','login','recover'].includes(action)){
   await limited('auth:global',500,3600);if(action==='register')await limited('register:preview-global',30,86400);
   const name=accountName(data.name);await limited('auth:'+action+':'+await sha(name.canonical),action==='login'?20:6);
   const password=accountPassword(data.password);
   return reply(200,action==='recover'?await recover(name,password,recoveryToken(data.code)):await issue(name,password,action==='register'));
  }
  const auth=await verified(req);await limited('api:'+auth.uid,500);
  if(action==='load')return reply(200,await load(auth.uid));
  if(action==='life'){
   if(!['visit','start','complete','leave','draw','keep','reject'].includes(data.operation)||!Number.isInteger(data.revision??0))throw new ApiError(400,'小窝操作不正确。');
   const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
   if((data.requestId&&!uuid(data.requestId))||(data.lease&&!uuid(data.lease)))throw new ApiError(400,'小窝记录无法识别。');
   const result=await admin.rpc('bc_nest_step',{p_user:auth.uid,p_action:data.operation,p_request:data.requestId||null,p_revision:data.revision??0,p_lease:data.lease||null});if(result.error?.message==='draw not found')throw new ApiError(404,'没有找到这枚扭蛋。');check(result.error);
   const value=result.data||{};if(value.story?.media)value.story.media=await signStoryMedia(value.story.media,auth.uid);
   return reply(200,value);
  }
  if(action==='logout'){
   const revoked=await admin.from('bc_account_revoked_sessions').upsert({session_id:auth.claims.session_id,user_id:auth.uid,expires_at:new Date((auth.claims.exp+3600)*1000).toISOString()});check(revoked.error);
   await admin.auth.admin.signOut(auth.token,'local');return reply(200,{ok:true});
  }
  if(action==='import'){
   const known=await admin.from('toys').select('id');check(known.error);
   const items=validCapsules(data.items,(known.data||[]).map(t=>t.id));let legacy:string|null=null;
   if(data.legacyToken){const old=await admin.auth.getUser(data.legacyToken);if(old.error||!old.data.user?.is_anonymous)throw new ApiError(403,'旧收藏的身份没有验证通过。');legacy=old.data.user.id}
   const imported=await admin.rpc('bc_account_import',{p_user:auth.uid,p_items:items,p_legacy:legacy});check(imported.error);return reply(200,{added:imported.data,...await load(auth.uid)});
  }
  if(action==='quest'){
   if(typeof data.toyId!=='string'||!['save','unlock'].includes(data.operation))throw new ApiError(400,'任务操作不正确。');
   const result=await admin.rpc('bc_account_quest',{p_user:auth.uid,p_toy:data.toyId,p_action:data.operation});if(result.error)throw new ApiError(409,'做完小任务，再回来看看它吧。');return reply(200,await load(auth.uid));
  }
  if(action==='save'){
   let value=safeDocument(data.key,data.value);if(!Number.isInteger(data.revision)||data.revision<0)throw new ApiError(400,'保存版本无法识别。');
   if(data.key==='nest'){
    const [owned,quests]=await Promise.all([readAllCapsules((after:string|undefined,size:number)=>{let q=admin.from('bc_account_capsules').select('id,toy_id').eq('user_id',auth.uid).order('id').limit(size);if(after)q=q.gt('id',after);return q}),admin.from('bc_account_documents').select('value').eq('user_id',auth.uid).eq('key','quests').maybeSingle()]);check(quests.error);
    const eligible=owned.filter(c=>quests.data?.value?.[c.toy_id]?.unlockedAt).map(c=>c.toy_id),layout=validateLayout(value,eligible);
    if(!layout||layout.length!==value.placements?.length)throw new ApiError(400,'有小住客还不能入住，或位置需要调整。');value={version:1,roomId:NEST_ROOM_ID,placements:layout};
   }else{
    if(!Array.isArray(value.drafts)||value.drafts.length>12)throw new ApiError(400,'草稿夹最多保留 12 张。');
    const seen=new Set();value={drafts:value.drafts.map((d:any)=>{
     if(!d||typeof d.id!=='string'||seen.has(d.id)||d.source!=='player'||typeof d.text!=='string'||!d.text.trim()||Array.from(d.text).length>80||typeof d.signature!=='string'||Array.from(d.signature).length>16||!Number.isFinite(Date.parse(d.createdAt)))throw new ApiError(400,'草稿内容需要检查。');seen.add(d.id);
     let media=null;if(d.media){if(d.media.origin==='example'){media={id:'postcard-layout-example',kind:'photo',origin:'example',width:1024,height:1024,label:'官方卡面示例'}}else{
      if(!ownMediaPath(d.media.storagePath,auth.uid)||!['photo','gif','video'].includes(d.media.kind))throw new ApiError(403,'只能保存自己的影像。');
      if(d.media.posterStoragePath&&!ownMediaPath(d.media.posterStoragePath,auth.uid))throw new ApiError(403,'只能保存自己的封面。');
      if(d.media.kind==='gif'&&!d.media.posterStoragePath)throw new ApiError(400,'动态影像需要一张静止封面。');
      media={posterStoragePath:d.media.posterStoragePath,id:d.media.id,kind:d.media.kind,origin:'account-file',storagePath:d.media.storagePath,width:d.media.width,height:d.media.height,label:'我的明信片影像',duration:d.media.duration};
     }}
     return {id:d.id,source:'player',text:d.text.trim(),signature:d.signature.trim(),stampId:'shop-default',media,createdAt:new Date(d.createdAt).toISOString(),status:'local-draft'};
    })};
   }
   const saved=await admin.rpc('bc_account_write',{p_user:auth.uid,p_key:data.key,p_value:value,p_revision:data.revision});check(saved.error);if(!saved.data?.length)throw new ApiError(409,'另一处刚保存了更新，这份修改没有覆盖它。请先重新载入再修改。');return reply(200,await load(auth.uid));
  }
  throw new ApiError(400,'没有这个操作。');
 }catch(error){return reply(error instanceof ApiError?error.status:error instanceof Error&&!(error instanceof TypeError)?400:500,{error:error instanceof ApiError?error.message:error instanceof Error&&!(error instanceof TypeError)?error.message:'暂时没有处理成功，请稍后重试。'})}
});
