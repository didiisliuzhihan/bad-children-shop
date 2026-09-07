import fs from 'node:fs/promises';import path from 'node:path';
import {createClient} from '@supabase/supabase-js';
const url=process.env.SUPABASE_URL||'https://kbyobdydythovyagrfgv.supabase.co';
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw Error('Set SUPABASE_SERVICE_ROLE_KEY in the local process environment. Never expose it as VITE_ or commit it. Alternatively upload assets/delivery through the Supabase Dashboard.');
const bucket=process.env.SUPABASE_ASSET_BUCKET||'bad-children-assets';const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const mime={'.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2'};
for(const name of await fs.readdir('assets/delivery')){const body=await fs.readFile(path.join('assets/delivery',name));const {error}=await client.storage.from(bucket).upload(name,body,{contentType:mime[path.extname(name)]||'application/octet-stream',cacheControl:'3600',upsert:false});if(error&&!/already exists|Duplicate/i.test(error.message))throw error;const {data}=client.storage.from(bucket).getPublicUrl(name);const check=await fetch(data.publicUrl,{method:'HEAD'});if(!check.ok)throw Error(`${name}: public URL returned ${check.status}`);console.log(`Verified ${name} (${body.length} bytes)`)}
console.log(`Assets published. Set VITE_ASSET_BASE_URL=${url}/storage/v1/object/public/${bucket} and rebuild.`);
