import {createClient} from '@supabase/supabase-js';
import type {Capsule,Toy} from '../types';
import {fallbackToys,localPreview} from '../assets';
import {mergeCapsules} from '../flow.mjs';
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase=key?createClient(import.meta.env.VITE_SUPABASE_URL,key):null;
const CACHE='bc-shop:collection:v1';let userId:string|null=null;let writable=false;
type CloudState={toys:Toy[];items:Capsule[];mode:'cloud'|'local'};
let initializing:Promise<CloudState>|null=null;
export function readLocal():Capsule[]{try{const a=JSON.parse(localStorage.getItem(CACHE)||'[]');return Array.isArray(a)?a.filter(x=>x.id&&x.toy_id&&x.obtained_at):[]}catch{return []}}
export function writeLocal(items:Capsule[]){try{localStorage.setItem(CACHE,JSON.stringify(items));return true}catch{return false}}
export function initializeCloud():Promise<CloudState>{
  initializing??=hydrateCloud().finally(()=>{initializing=null});
  return initializing;
}
async function hydrateCloud():Promise<CloudState>{
  let toys=fallbackToys;const local=readLocal();if(!supabase)return {toys,items:local,mode:'local'};
  try{
    const catalog=await supabase.from('toys').select('*');
    if(catalog.data?.length)toys=catalog.data.map((t,i)=>{const fallback=fallbackToys.find(f=>f.id===t.id);return {...fallback,...t,card_image_url:t.card_image_url||fallback?.card_image_url,...(localPreview&&fallback?{model_url:fallback.model_url,icon_url:fallback.icon_url,card_image_url:fallback.card_image_url,audio_url:fallback.audio_url,story_image_url:fallback.story_image_url}:{}),color:t.color||'#c8e0f4',number:fallback?.number||String(i+1).padStart(2,'0')}}).filter(t=>t.id&&t.model_url).sort((a,b)=>a.number.localeCompare(b.number));
    if(!toys.length)toys=fallbackToys;
    const session=await supabase.auth.getSession();
    const auth=session.data.session?{data:{user:session.data.session.user},error:null}:await supabase.auth.signInAnonymously();
    if(auth.error||!auth.data.user)return {toys,items:local,mode:'local'};
    userId=auth.data.user.id;
    const remote=await supabase.from('user_capsules').select('id,toy_id,obtained_at').eq('user_id',userId).order('obtained_at',{ascending:false});
    if(remote.error)return {toys,items:local,mode:'local'};
    writable=true;const merged=mergeCapsules(readLocal(),(remote.data||[]).map(x=>({...x,synced:true}))) as Capsule[];
    for(const item of merged.filter(x=>!x.synced)){item.synced=await syncCapsule(item)}
    writeLocal(merged);return {toys,items:merged,mode:'cloud'};
  }catch{return {toys,items:local,mode:'local'}}
}
export async function syncCapsule(item:Capsule){
  if(!supabase||!userId||!writable)return false;
  try{const {error}=await supabase.from('user_capsules').insert({id:item.id,user_id:userId,toy_id:item.toy_id,obtained_at:item.obtained_at});return !error||error.code==='23505'}catch{return false}
}
