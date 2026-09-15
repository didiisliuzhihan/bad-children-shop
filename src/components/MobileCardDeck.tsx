import {Children,isValidElement,useEffect,useId,useRef,useState,useSyncExternalStore,type ReactNode,type PointerEvent} from 'react';
import {Icon} from './Icon';
import {tx,useLanguage} from '../lib/i18n';
import {deckAxis,deckStep,deckIndex,deckWindow,type DeckAxis} from '../lib/cardDeckInput';
import '../mobile-card-deck.css';

const PHONE_QUERY='(max-width: 767px)';
const subscribePhone=(notify:()=>void)=>{
 const query=window.matchMedia(PHONE_QUERY);query.addEventListener('change',notify);
 return()=>query.removeEventListener('change',notify);
};
const phoneSnapshot=()=>typeof window!=='undefined'&&window.matchMedia(PHONE_QUERY).matches;
const desktopSnapshot=()=>false;
const DURATION=360;
type Contact={id:number;x:number;y:number;dx:number;axis:DeckAxis};

/** Desktop keeps its original DOM grid; mobile mounts at most three real cards. */
export function ResponsiveCardDeck({children,gridClassName,label,hint,active=true}:{children:ReactNode;gridClassName:string;label:string;hint:string;active?:boolean}){
 const phone=useSyncExternalStore(subscribePhone,phoneSnapshot,desktopSnapshot);
 return phone?<MobileCardDeck label={label} hint={hint} active={active}>{children}</MobileCardDeck>:<div className={gridClassName}>{children}</div>;
}

export function MobileCardDeck({children,label,hint,active=true}:{children:ReactNode;label:string;hint:string;active?:boolean}){
 useLanguage();
 const cards=Children.toArray(children),keys=cards.map((card,i)=>isValidElement(card)?String(card.key):String(i));
 const [selected,setSelected]=useState(keys[0]),[direction,setDirection]=useState(1);
 const index=Math.max(0,keys.indexOf(selected)),count=cards.length,signature=JSON.stringify(keys),hintId=useId();
 const stage=useRef<HTMLDivElement>(null),contact=useRef<Contact|null>(null),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const frame=useRef(0),busy=useRef(false),suppressClick=useRef(false),focusAfter=useRef(false);

 function clearWork(){cancelAnimationFrame(frame.current);clearTimeout(timer.current);frame.current=0;busy.current=false;contact.current=null;}
 function paint(dx:number,progress:number){
  const el=stage.current;if(!el)return;
  el.style.setProperty('--deck-x',`${dx}px`);
  el.style.setProperty('--deck-turn',`${Math.max(-16,Math.min(16,dx/22))}deg`);
  el.style.setProperty('--deck-progress',String(progress));
 }
 function reset(){clearWork();if(stage.current)stage.current.dataset.phase='idle';paint(0,0);}
 useEffect(()=>{reset();if(!keys.includes(selected))setSelected(keys[0]);return clearWork},[signature,active]);
 useEffect(()=>{if(focusAfter.current){focusAfter.current=false;stage.current?.querySelector<HTMLButtonElement>('[data-depth="0"] button')?.focus({preventScroll:true})}},[selected]);

 function finish(step:number){
  const nextKey=keys[deckIndex(index,step,count)];
  reset();if(step)setSelected(nextKey);
 }
 function settle(step:number){
  if(busy.current)return;
  contact.current=null;
  if(count<2){reset();return}
  busy.current=true;
  cancelAnimationFrame(frame.current);
  if(step)setDirection(step);
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){finish(step);return}
  const el=stage.current;if(!el){reset();return}
  el.dataset.phase=step?'leaving':'returning';
  // One shared transition drives the outgoing card and the card rising behind it.
  frame.current=requestAnimationFrame(()=>{
   paint(step?-step*Math.max(360,el.clientWidth*1.4):0,step?1:0);
   timer.current=setTimeout(()=>finish(step),DURATION);
  });
 }
 function start(event:PointerEvent<HTMLDivElement>){
  if(!active||busy.current||event.button!==0)return;
  if(!event.isPrimary){suppressClick.current=true;reset();return}
  if(!(event.target as Element).closest('[data-depth="0"]'))return;
  suppressClick.current=false;
  contact.current={id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,axis:'pending'};
 }
 function move(event:PointerEvent<HTMLDivElement>){
  const input=contact.current;if(!input||input.id!==event.pointerId)return;
  const dx=event.clientX-input.x,dy=event.clientY-input.y;
  input.axis=deckAxis(dx,dy,input.axis);input.dx=dx;
  if(input.axis!=='pending')suppressClick.current=true;
  if(input.axis!=='horizontal'||count<2)return;
  if(!event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.setPointerCapture(event.pointerId);
  event.currentTarget.dataset.phase='dragging';
  const next=dx<0?1:-1;if(next!==direction)setDirection(next);
  const width=event.currentTarget.clientWidth;
  cancelAnimationFrame(frame.current);
  frame.current=requestAnimationFrame(()=>paint(dx,Math.min(.92,Math.abs(dx)/Math.max(1,width))));
 }
 function end(event:PointerEvent<HTMLDivElement>,cancelled=false){
  const input=contact.current;if(!input||input.id!==event.pointerId)return;
  contact.current=null;
  if(cancelled){suppressClick.current=true;settle(0)}
  else if(input.axis==='horizontal')settle(deckStep(input.dx,event.currentTarget.clientWidth));
  else reset();
  if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
 }
 function lostCapture(event:PointerEvent<HTMLDivElement>){
  // Touch implicitly captures the inner image button. Its bubbled loss during
  // transfer to our stage is not a cancelled gesture; only the stage's own is.
  if(event.target===event.currentTarget)end(event,true);
 }
 function navigate(step:number){
  if(!active||count<2||busy.current)return;
  suppressClick.current=true;
  focusAfter.current=!!stage.current?.contains(document.activeElement);
  settle(step);
 }
 if(!count)return null;
 return <div className="mobile-card-deck" role="region" aria-roledescription={tx('翻卡区')} aria-label={label} aria-describedby={hintId}
  onKeyDown={event=>{if(event.altKey||event.ctrlKey||event.metaKey)return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();navigate(event.key==='ArrowRight'?1:-1)}}}>
  <div className="mobile-deck-stage" ref={stage} onPointerDown={start} onPointerMove={move} onPointerUp={event=>end(event)} onPointerCancel={event=>end(event,true)} onLostPointerCapture={lostCapture} onDragStart={event=>event.preventDefault()}
   onClickCapture={event=>{if(busy.current||(suppressClick.current&&event.detail!==0)){event.preventDefault();event.stopPropagation()}else if(event.detail===0)suppressClick.current=false}}>
   {deckWindow(index,count,direction).map((cardIndex,depth)=><div key={keys[cardIndex]} className="mobile-deck-card" data-depth={depth} aria-hidden={depth?true:undefined} inert={depth>0} style={{zIndex:3-depth}}
    onClick={event=>{if(!depth&&!(event.target as Element).closest('button,a'))event.currentTarget.querySelector<HTMLButtonElement>('button')?.click()}}>{cards[cardIndex]}</div>)}
  </div>
  <div className="mobile-deck-navigation">
   <button type="button" aria-label={tx('上一张卡片')} disabled={count<2} onClick={()=>navigate(-1)}><Icon name="back" size={18}/></button>
   <span role="status" aria-live={active?'polite':'off'} aria-atomic="true">{index+1} / {count}</span>
   <button type="button" aria-label={tx('下一张卡片')} disabled={count<2} onClick={()=>navigate(1)}><Icon name="arrow" size={18}/></button>
  </div>
  <p className="mobile-deck-hint" id={hintId}>{tx(count>1?hint:'点中间的卡片查看详情')}</p>
 </div>;
}
