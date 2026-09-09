import assert from 'node:assert/strict';
import {randomUUID,randomInt} from 'node:crypto';
import {loadEnv} from 'vite';

// Explicit opt-in: creates ONE empty QA account, never touches a player account.
// Credentials and sessions exist only in memory and are never logged.
if(!process.argv.includes('--live'))throw Error('Pass --live only when this isolated account check is authorized.');
const env=loadEnv('production',process.cwd(),'VITE_');
const key=env.VITE_SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_ANON_KEY;
const endpoint=env.VITE_SUPABASE_URL+'/functions/v1/bc-account-preview';
assert.equal(new URL(endpoint).hostname,'kbyobdydythovyagrfgv.supabase.co');
const name='六位验收_'+randomUUID().slice(0,8),password=String(randomInt(100000,1000000)),tokens=[];
const call=async(data,token)=>{
 const response=await fetch(endpoint,{method:'POST',signal:AbortSignal.timeout(45000),headers:{apikey:key,'content-type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});
 return {status:response.status,body:await response.json()};
};
try{
 const five=await call({action:'register',name,password:password.slice(0,5)});
 assert.equal(five.status,400);assert.match(five.body.error,/至少 6 个字符/);
 const created=await call({action:'register',name,password});
 assert.equal(created.status,200,created.body.error);assert(created.body.session?.access_token);tokens.push(created.body.session.access_token);
 const login=await call({action:'login',name,password});
 assert.equal(login.status,200,login.body.error);assert(login.body.session?.access_token);tokens.push(login.body.session.access_token);
 const snapshot=await call({action:'load'},login.body.session.access_token);
 assert.equal(snapshot.status,200,snapshot.body.error);assert.equal(snapshot.body.profile.nickname,name);assert.equal(snapshot.body.capsules.length,0);
 console.log(JSON.stringify({qaAccount:name,fiveRejected:true,sixDigitRegistration:true,sixDigitLogin:true,emptyAccountRead:true}));
}finally{
 for(const token of tokens){const result=await call({action:'logout'},token);assert.equal(result.status,200,'QA session logout failed');}
 console.log('All successful QA sessions signed out; no player account changed.');
}
