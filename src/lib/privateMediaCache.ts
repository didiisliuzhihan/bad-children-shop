type BatchReply={expiresAt:number;urls:{path:string;url:string|null}[]};
type Loader=(paths:string[])=>Promise<BatchReply>;
type Ticket={owner:string;path:string;loader:Loader;resolve:(url:string)=>void;reject:(error:Error)=>void;promise:Promise<string>};

export function createPrivateMediaCache(now=()=>Date.now()){
 const cache=new Map<string,{url:string;expiresAt:number}>(),pending=new Map<string,Ticket>();let scheduled=false,flushing=false,generation=0;
 const key=(owner:string,path:string)=>owner+':'+path;
 const schedule=()=>{if(!scheduled&&!flushing){scheduled=true;queueMicrotask(()=>void flush())}};
 const flush=async()=>{
  scheduled=false;if(flushing)return;flushing=true;const turn=generation,waiting=[...pending.values()],owners=new Set(waiting.map(t=>t.owner));
  try{
  // Each owner/batch has independent authority, including on a shared browser.
  for(const owner of owners){const rows=waiting.filter(t=>t.owner===owner);
   for(let offset=0;offset<rows.length;offset+=24){const batch=rows.slice(offset,offset+24);
    if(turn!==generation)return;
    try{
     const reply=await batch[0].loader(batch.map(t=>t.path));if(turn!==generation)return;
     for(const item of batch){const url=reply.urls.find(row=>row.path===item.path)?.url,k=key(owner,item.path);pending.delete(k);
      if(url){cache.set(k,{url,expiresAt:reply.expiresAt});while(cache.size>128)cache.delete(cache.keys().next().value!);item.resolve(url)}
      else item.reject(Error('照片暂时没能打开。'));
     }
    }catch(error){if(turn!==generation)return;for(const item of batch){pending.delete(key(owner,item.path));item.reject(error as Error)}}
   }
  }}finally{flushing=false;if(pending.size)schedule()}
 };
 return {
  get(owner:string,path:string,loader:Loader){
   const k=key(owner,path),saved=cache.get(k);if(saved&&saved.expiresAt-now()>60000){cache.delete(k);cache.set(k,saved);return Promise.resolve(saved.url)}
   if(pending.has(k))return pending.get(k)!.promise;
   let resolve!:(url:string)=>void,reject!:(error:Error)=>void;const promise=new Promise<string>((yes,no)=>{resolve=yes;reject=no});
   pending.set(k,{owner,path,loader,resolve,reject,promise});schedule();return promise;
  },
  invalidate(owner:string,paths:string[]){for(const path of paths)cache.delete(key(owner,path))},
  clear(){generation++;cache.clear();for(const item of pending.values())item.reject(Error('账户已切换。'));pending.clear();scheduled=false},
 };
}
export const privateMediaCache=createPrivateMediaCache();
