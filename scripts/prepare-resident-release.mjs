import fs from 'node:fs/promises';import crypto from 'node:crypto';
import {RESIDENT_RELEASE_FILES} from '../src/lib/residentExpansion.mjs';
const rows=[];
for(const file of RESIDENT_RELEASE_FILES){
 const source=['.glb','.png'].some(ext=>file.endsWith(ext))?'assets/drafts/new-residents/'+file:'assets/drafts/new-residents/references/'+file;
 const bytes=await fs.readFile(source),target='assets/delivery/'+file;
 try{if(!(await fs.readFile(target)).equals(bytes))throw Error('Different release asset: '+file)}catch(e){if(e.code!=='ENOENT')throw e;await fs.copyFile(source,target)}
 rows.push({source,path:target,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
await fs.writeFile('assets/resident-release-manifest.json',JSON.stringify(rows,null,2)+'\n');console.log(rows.map(r=>({path:r.path,bytes:r.bytes})));
