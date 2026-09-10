import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {RESIDENT_EXPANSION,RESIDENT_DIRECTIONS,RESIDENT_RELEASE_FILES,residentExpansionToys} from '../src/lib/residentExpansion.mjs';
import {LIFE_PAIRS,LIFE_SOLOS,eligibleMoments,registerReviewDirections} from '../src/lib/nestLifeRules.mjs';
import {draftDirections} from '../review/new-residents-content.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('approved live expansion keeps stable IDs, approved names and all eight durable media files',()=>{
 const toys=residentExpansionToys(f=>'/assets/delivery/'+f);
 assert.deepEqual(toys.map(t=>[t.id,t.number,t.name_en]),[['stock_gourd','06','Office Hulu'],['matcha_clown','07','Little Matcha']]);
 assert.equal(RESIDENT_RELEASE_FILES.length,8);assert.equal(new Set(RESIDENT_RELEASE_FILES).size,8);
 for(const file of RESIDENT_RELEASE_FILES)assert(fs.statSync(new URL('../assets/delivery/'+file,import.meta.url)).size>1000);
 const runtime=read('src/lib/residentExpansion.mjs');for(const d of draftDirections)assert(!runtime.includes(d.story),'private reward copy must stay out of the production bundle');
 assert(read('src/assets.ts').includes('...residentExpansionToys(asset)'));assert(read('scripts/prepare-pages.mjs').includes('...RESIDENT_RELEASE_FILES'));
});
test('nine pair scenes and seven solos are unique, production-active and not duplicated by review',()=>{
 assert.equal(LIFE_PAIRS.length,9);assert.equal(LIFE_SOLOS.length,7);assert.equal(new Set([...LIFE_PAIRS,...LIFE_SOLOS].map(d=>d.id)).size,16);
 for(const d of RESIDENT_DIRECTIONS){
  const placed=d.actors.map((toyId,i)=>({toyId,x:3*i,z:0}));const before=eligibleMoments(placed);
  assert(before.some(e=>e.id===d.id));registerReviewDirections(RESIDENT_DIRECTIONS);
  try{assert.deepEqual(eligibleMoments(placed),before)}finally{registerReviewDirections([])}
 }
});
test('release backend only adds approved catalog rows and changes the guarded toy allowlist',()=>{
 const sql=read('supabase/toy06-07-hulu-matcha.sql');
 for(const d of draftDirections)assert(sql.includes(d.story));
 for(const t of RESIDENT_EXPANSION)assert(sql.includes(t.id)&&sql.includes(t.name_en));
 assert(sql.includes('begin;'));assert(sql.includes('commit;'));assert(sql.includes('pg_get_functiondef'));assert(sql.includes('Unexpected draw function'));
 assert(!/delete from|truncate|update public.bc_account|grant |revoke |disable row level security/i.test(sql));
 assert(sql.includes("'tired_crow','stock_gourd','matcha_clown') order by random()"));
});
