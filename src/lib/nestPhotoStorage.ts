import {createNestPhotoOutbox} from './nestPhotoOutbox.mjs';
export type PendingNestPhoto={owner:string;eventId:string;blob:Blob;repeated:boolean};
async function transact<T>(mode:IDBTransactionMode,run:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open('bc-nest-photo-outbox',1);let expired=false;
  const timer=setTimeout(()=>{expired=true;reject(Error('照片暂存未就绪'))},3000);
  request.onupgradeneeded=()=>{const store=request.result.createObjectStore('photos',{keyPath:['owner','eventId']});store.createIndex('owner','owner')};
  request.onerror=()=>{clearTimeout(timer);reject(request.error)};
  request.onsuccess=()=>{
   const db=request.result;if(expired){db.close();return}clearTimeout(timer);
   const tx=db.transaction('photos',mode),result=run(tx.objectStore('photos'));
   tx.oncomplete=()=>{db.close();resolve(result.result)};tx.onabort=tx.onerror=()=>{db.close();reject(tx.error)};
  };
 });
}
export const nestPhotoOutbox=createNestPhotoOutbox({
 put:(item:PendingNestPhoto)=>transact('readwrite',s=>s.put(item)),
 list:(owner:string)=>transact('readonly',s=>s.index('owner').getAll(owner)),
 remove:(item:PendingNestPhoto)=>transact('readwrite',s=>s.delete([item.owner,item.eventId])),
});
