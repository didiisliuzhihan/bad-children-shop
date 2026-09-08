// The clay actors barely move during idle. Preserve full-quality shadows but
// reuse the shadow maps between small movements instead of redrawing 3 maps/frame.
export function createNestShadowSchedule(interval=120){
 let last=-Infinity,dirty=true;
 return {invalidate(){dirty=true;},update(now){if(!dirty&&now-last<interval)return false;last=now;dirty=false;return true;}};
}
