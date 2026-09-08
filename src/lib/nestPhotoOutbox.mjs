// A device-local retry buffer, never the authoritative story store.
export function createNestPhotoOutbox(storage){
 const pending=new Map(),running=new Map();
 const key=item=>item.owner+':'+item.eventId;
 return {
  async put(item){
   pending.set(key(item),item);
   try{await storage.put(item)}catch{/* Still attempt the real upload if browser storage is unavailable. */}
  },
  flush(owner,isCurrent,upload){
   if(running.has(owner))return running.get(owner);
   const work=(async()=>{
    try{for(const item of await storage.list(owner))if(!pending.has(key(item)))pending.set(key(item),item)}catch{}
    let ok=true;
    for(const item of [...pending.values()].filter(item=>item.owner===owner)){
     if(!isCurrent(owner))return false;
     try{await upload(item);await storage.remove(item).catch(()=>{});pending.delete(key(item))}catch{ok=false;break}
    }
    return ok;
   })().finally(()=>running.delete(owner));
   running.set(owner,work);return work;
  },
 };
}

