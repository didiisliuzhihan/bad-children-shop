import test from 'node:test';import assert from 'node:assert/strict';
import {createNestPhotoOutbox} from '../src/lib/nestPhotoOutbox.mjs';
function storage(){const rows=new Map();return {rows,put:async i=>rows.set(i.owner+':'+i.eventId,i),list:async owner=>[...rows.values()].filter(i=>i.owner===owner),remove:async i=>rows.delete(i.owner+':'+i.eventId)}}
const item=(owner='a',eventId='event')=>({owner,eventId,blob:new Blob(['real captured bytes'],{type:'image/png'}),repeated:true});
test('failed upload survives a new queue instance (reload) and retries the identical photo',async()=>{
 const disk=storage(),photo=item();let q=createNestPhotoOutbox(disk);await q.put(photo);
 assert.equal(await q.flush('a',()=>true,async()=>{throw Error('offline')}),false);assert.equal(disk.rows.size,1);
 q=createNestPhotoOutbox(disk);const received=[];assert.equal(await q.flush('a',()=>true,async row=>received.push(row)),true);
 assert.equal(received[0].blob,photo.blob);assert.equal(received[0].repeated,true);assert.equal(disk.rows.size,0);
});
test('account switch never uploads another account photo; already successful requests are deduplicated',async()=>{
 const disk=storage(),q=createNestPhotoOutbox(disk),received=[];await q.put(item('a'));await q.put(item('b'));
 await q.flush('a',()=>false,async row=>received.push(row));assert.equal(received.length,0);
 await Promise.all([q.flush('b',()=>true,async row=>received.push(row)),q.flush('b',()=>true,async row=>received.push(row))]);
 assert.equal(received.length,1);assert.equal(received[0].owner,'b');assert.equal(disk.rows.size,1);
 await q.flush('b',()=>true,async row=>received.push(row));assert.equal(received.length,1);
});
test('blocked browser storage does not prevent immediate cloud upload',async()=>{
 const q=createNestPhotoOutbox({put:async()=>{throw Error('blocked')},list:async()=>{throw Error('blocked')},remove:async()=>{throw Error('blocked')}});
 await q.put(item());let uploads=0;assert.equal(await q.flush('a',()=>true,async()=>uploads++),true);assert.equal(uploads,1);
});

