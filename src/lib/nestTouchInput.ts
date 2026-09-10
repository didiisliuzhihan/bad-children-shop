type TouchPoint=Pick<Touch,'identifier'|'clientX'|'clientY'>;
type TouchActions={start:(point:TouchPoint)=>boolean;move:(point:TouchPoint)=>void;end:(point:TouchPoint)=>void;cancel:()=>void};

/** The canvas stays scrollable. Claim a touch only if its first contact hits a
 * resident in arrangement mode; a scroll that crosses a toy stays a scroll.
 * Pointer-event preventDefault / changing touch-action after contact cannot
 * make this distinction, so touch arbitration happens on native touchstart. */
export function installNestTouchInput(canvas:HTMLElement,actions:TouchActions){
 let active:number|null=null;
 const reset=()=>{active=null};
 const cancel=()=>{if(active===null)return;reset();actions.cancel()};
 const start=(event:TouchEvent)=>{
  if(event.touches.length!==1){cancel();return;}
  if(active!==null||!event.cancelable)return;
  const point=event.changedTouches[0];
  if(!point||!actions.start(point))return;
  event.preventDefault();
  if(!event.defaultPrevented){actions.cancel();return;}
  active=point.identifier;
 };
 const move=(event:TouchEvent)=>{
  if(active===null)return;
  if(event.touches.length!==1||!event.cancelable){cancel();return;}
  const point=Array.from(event.changedTouches).find(t=>t.identifier===active);
  if(!point)return;
  event.preventDefault();actions.move(point);
 };
 const end=(event:TouchEvent)=>{
  if(active===null)return;
  const point=Array.from(event.changedTouches).find(t=>t.identifier===active);
  if(!point)return;
  reset();if(event.cancelable)event.preventDefault();actions.end(point);
 };
 // Only the small canvas listener is non-passive, not the page / scroll pane.
 canvas.addEventListener('touchstart',start,{passive:false});
 canvas.addEventListener('touchmove',move,{passive:false});
 canvas.addEventListener('touchend',end,{passive:false});
 canvas.addEventListener('touchcancel',cancel,{passive:true});
 return {reset,dispose(){cancel();canvas.removeEventListener('touchstart',start);canvas.removeEventListener('touchmove',move);canvas.removeEventListener('touchend',end);canvas.removeEventListener('touchcancel',cancel)}};
}
