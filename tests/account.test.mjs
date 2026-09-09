import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {transformWithOxc} from 'vite';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import {accountName,accountPassword,recoveryToken,validCapsules,safeDocument,ACCOUNT_PREVIEW_SESSION} from '../src/lib/accountContract.mjs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('account names are normalized for uniqueness but preserve display spelling',()=>{
 assert.deepEqual(accountName('  Ｄｕａ   小鸦  '),{display:'Dua 小鸦',canonical:'dua 小鸦'});
 assert.equal(accountName('Whatever Dua').canonical,accountName('whatever dua').canonical);
 for(const value of ['',null,'鸦','字'.repeat(17),'admin','ＡＤＭＩＮ','官方','<b>鸦</b>','小鸦\n来吧','鸦😀'])assert.throws(()=>accountName(value));
 assert.equal(accountName('鸦_5-号').display,'鸦_5-号');
});
test('password checks never trim or truncate and enforce bcrypt byte limit',()=>{
 const phrase=' 给小鸦留一盏暖暖的灯 ';
 assert.equal(accountPassword(phrase),phrase);assert.equal(accountPassword('密'.repeat(24)),'密'.repeat(24));
 for(const value of [undefined,'short','密'.repeat(25),'a'.repeat(73)])assert.throws(()=>accountPassword(value));
});
test('six-character passwords need no character mixture and match the Edge validator',()=>{
 for(const value of ['abcxyz','123456','只要六个字符','😀'.repeat(6),' abcde'])assert.equal(accountPassword(value),value);
 for(const value of ['12345','😀'.repeat(5)])assert.throws(()=>accountPassword(value),/至少 6 个字符/);
 const passwordFunction=path=>read(path).match(/export function accountPassword\(input\)\{[\s\S]*?\n\}/)[0];
 assert.equal(passwordFunction('src/lib/accountContract.mjs'),passwordFunction('supabase/functions/bc-account-preview/accountContract.mjs'));
});
test('one-time backup key can be pasted directly from the displayed or downloaded groups',()=>{
 const code='a0123456'.repeat(8);assert.equal(recoveryToken(code.toUpperCase().match(/.{8}/g).join(' - ')),code);
 for(const value of ['123','g'.repeat(64),null])assert.throws(()=>recoveryToken(value));
 assert(!read('src/components/AccountMenu.tsx').includes("join(' – ')"));
});
test('capsule migration validates IDs, catalog membership and time; is append-safe and deduplicated',()=>{
 const now=Date.now(),item={id:randomUUID(),toy_id:'tired_crow',obtained_at:new Date(now).toISOString(),user_id:'untrusted',synced:true};
 assert.deepEqual(validCapsules([item,item],['tired_crow'],now),[{id:item.id,toy_id:item.toy_id,obtained_at:item.obtained_at}]);
 for(const bad of [{...item,id:'demo1'},{...item,toy_id:'fake'},{...item,obtained_at:'bad'},{...item,obtained_at:new Date(now+120000).toISOString()}])assert.throws(()=>validCapsules([bad],['tired_crow'],now));
 assert.throws(()=>validCapsules(Array(2001).fill(item),['tired_crow'],now));
});
test('client documents cannot overwrite quest authority or arbitrary keys',()=>{
 assert.deepEqual(safeDocument('nest',{placements:[]}),{placements:[]});
 for(const key of ['quests','profile','__proto__'])assert.throws(()=>safeDocument(key,{}));
 assert.throws(()=>safeDocument('postcards',{text:'x'.repeat(250001)}));
});
test('private media path validator accepts only one file belonging to the verified owner',()=>{
 const source=read('supabase/functions/bc-account-preview/index.ts'),line=source.split('\n').find(l=>l.startsWith('const ownMediaPath='));
 const check=vm.runInNewContext(line.replace(':unknown','').replace(':string','')+'\nownMediaPath;');
 const owner=randomUUID(),other=randomUUID(),file=randomUUID()+'.png';
 assert(check(owner+'/'+file,owner));
 for(const path of [other+'/'+file,owner+'/../'+other+'/'+file,owner+'/%2e%2e/'+file,owner+'/'+file+'.html',owner+'//'+file,null])assert(!check(path,owner));
});
test('Edge entrypoint parses, verifies JWT before claims, and requires epoch-bound password session',async()=>{
 const source=read('supabase/functions/bc-account-preview/index.ts');await transformWithOxc(source,'index.ts');
 assert.equal((source.match(/Deno\.serve\(/g)||[]).length,1);
 assert(source.indexOf('admin.auth.getUser(token)')<source.indexOf('JSON.parse(atob(token'));
 assert(source.includes("admin.from('bc_account_sessions').select('session_epoch')"));
 assert(source.includes('registered.data.session_epoch!==security.data?.session_epoch'));
 assert(source.includes("admin.auth.admin.signOut(result.session.access_token,'others')"));
 assert(source.includes("if(d.media.kind==='gif'&&!d.media.posterStoragePath)"));
 assert(source.includes("d.source!=='player'"));
});
test('account tables and functions are backend-only and preserve original production tables',()=>{
 const sql=read('supabase/account-preview-schema.sql'),sessions=read('supabase/account-preview-sessions.sql');
 for(const name of ['profiles','security','documents','capsules','rates','revoked_sessions'])assert(sql.includes('alter table public.bc_account_'+name+' enable row level security;'));
 assert(sql.includes('from public,anon,authenticated'));assert(sessions.includes('from public,anon,authenticated'));
 assert(!/security definer/i.test(sql));assert(!/(?:alter|drop) table public\.(?:toys|user_capsules)/i.test(sql));
 assert(sql.includes("'bc-account-preview-media',false"));assert(sql.includes('revision=p_revision'));
 assert(sql.includes('+600000>v_now'));assert(sql.includes('v_owner is distinct from p_legacy'));
});
test('account provider is preview-scoped, uses separate auth storage and guards cross-account responses',()=>{
 const provider=read('src/components/AccountProvider.tsx'),app=read('src/App.tsx'),review=read('review/community.tsx');
 assert(!app.includes('AccountProvider'));assert(review.includes('<AccountProvider>'));assert(ACCOUNT_PREVIEW_SESSION.includes(':preview:'));
 assert(provider.indexOf('const client=')<provider.indexOf('export function AccountProvider'));
 assert(provider.includes('turn!==generation.current'));assert(provider.includes('auth.session.user.id!==expectedOwner'));
 assert(!provider.includes('signInAnonymously'));assert(review.includes('Date.now()-index*60000'));assert(review.includes('seedLock.current'));
});
async function menuMarkup({profile=null,mode='register',rescue=''}={}){
 const result=await transformWithOxc(read('src/components/AccountMenu.tsx'),'AccountMenu.tsx',{jsx:{runtime:'automatic'}});
 const source=result.code.replace(/^import[^\n]*\n/gm,'').replace(/^export function /gm,'function ').replaceAll('import.meta.env.VITE_SUPABASE_URL',JSON.stringify('https://qa.invalid'))+'\nglobalThis.AccountMenu=AccountMenu;';
 let index=0;const context={...React,localPreview:false,_jsx:jsxRuntime.jsx,_jsxs:jsxRuntime.jsxs,_Fragment:React.Fragment,
  useState:initial=>{const i=index++;return [i===0?true:i===1?mode:i===5?rescue:initial,()=>{}]},useCallback:fn=>fn,
  useAccount:()=>({profile,status:'ready',capsules:[],error:''}),Icon:()=>null,Modal:({children})=>React.createElement('section',null,children)};
 vm.runInNewContext(source,context);return renderToStaticMarkup(React.createElement(context.AccountMenu));
}
test('rendered account forms ask for username/password, never an email, and expose accessible recovery',async()=>{
 for(const mode of ['register','login','recover']){const markup=await menuMarkup({mode});assert(markup.includes('autoComplete="username"'));assert(markup.includes('type="password"'));assert(markup.includes('minLength="6"'));assert(markup.includes('placeholder="至少 6 个字符"'));assert(!markup.includes('type="email"'));if(mode==='recover')assert(markup.includes('找回码'));}
});
test('rendered account nickname is escaped and backup key is shown as copyable ASCII groups',async()=>{
 const profile={nickname:'<script>alert(1)</script>',created_at:'2026-09-08T11:00:00Z'};
 const markup=await menuMarkup({profile});assert(!markup.includes('<script>'));assert(markup.includes('&lt;script&gt;'));
 const code='a0123456'.repeat(8),backup=await menuMarkup({rescue:code});assert(backup.includes(code.match(/.{8}/g).join('-')));assert(backup.includes('我已妥善保存备用钥匙'));
});
