import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';
import {RESIDENT_RELEASE_FILES} from '../src/lib/residentExpansion.mjs';
import {NEST_TAP_FILES} from '../src/lib/nestTapCatalog.mjs';
const api='https://api.github.com/repos/didiisliuzhihan/bad-children-shop';
async function get(part){const r=await fetch(api+part);if(!r.ok)throw Error('Repository read '+r.status);return r.json()}
const ref=await get('/git/ref/heads/main'),head=ref.object.sha;
if(head!=='07a8f39a3a8dee113a8efe2bdc9178e86693f20a')throw Error('Main changed; compare before publishing.');
const commit=await get('/git/commits/'+head),remote=await get('/git/trees/'+commit.tree.sha+'?recursive=1');
if(remote.truncated)throw Error('Incomplete repository tree');
const old=new Map(remote.tree.map(x=>[x.path,x.sha]));
async function files(dir){return (await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?files(dir+'/'+e.name):dir+'/'+e.name))).flat()}
const candidates=[...await files('src'),'index.html','package.json','scripts/prepare-pages.mjs','scripts/prepare-resident-release.mjs','scripts/resident-publish-manifest.mjs','assets/resident-release-manifest.json','supabase/toy06-07-hulu-matcha.sql','review/new-residents-content.mjs','tests/resident-release.test.mjs','tests/nest-tap.test.mjs','tests/audio.test.mjs','docs/index.html',...RESIDENT_RELEASE_FILES.flatMap(n=>['assets/delivery/'+n,'docs/assets/delivery/'+n]),...NEST_TAP_FILES.flatMap(n=>['assets/delivery/'+n,'docs/assets/delivery/'+n])];
candidates.push('tests/matcha-night-light.test.mjs','tests/helpers/gltf-ray-meshes.mjs');
const changed=[];for(const file of new Set(candidates)){if(file==='src/signed-assets.json')continue;const b=await fs.readFile(file),sha=crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');if(old.get(file)!==sha)changed.push({file,sha,bytes:b.length,prior:old.get(file)||null})}
console.log(JSON.stringify({head,baseTree:commit.tree.sha,changed}));
