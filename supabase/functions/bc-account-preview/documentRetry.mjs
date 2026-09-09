const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
/** A lost response may be retried at the old revision, but may never overwrite a newer edit. */
export function isConfirmedDocumentRetry(current,key,value,revision){
 return !!current&&current.key===key&&current.revision===revision+1&&JSON.stringify(canonical(current.value))===JSON.stringify(canonical(value));
}
