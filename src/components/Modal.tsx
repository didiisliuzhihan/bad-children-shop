import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import type {ReactNode} from 'react';
import {Icon} from './Icon';
export function Modal({children,onClose,label,className=''}:{children:ReactNode;onClose:()=>void;label:string;className?:string}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement;const shop=document.querySelector<HTMLElement>('.shop'),wasInert=shop?.inert??false;if(shop)shop.inert=true;ref.current?.focus();const listener=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();onClose()}if(e.key==='Tab'){const els=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input,[tabindex="0"]')||[]).filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');if(!els.length){e.preventDefault();return}if(e.shiftKey&&(document.activeElement===els[0]||document.activeElement===ref.current)){e.preventDefault();els.at(-1)?.focus()}else if(!e.shiftKey&&(document.activeElement===els.at(-1)||document.activeElement===ref.current)){e.preventDefault();els[0].focus()}}};document.addEventListener('keydown',listener);return()=>{document.removeEventListener('keydown',listener);if(shop)shop.inert=wasInert;previous?.focus()}},[onClose]);
 // Escape the collection's backdrop-filter stacking/containing block on short screens.
 return createPortal(<div className={`modal-backdrop ${className}`} onPointerDown={e=>{if(e.target===e.currentTarget)onClose()}}><div ref={ref} className="modal-panel" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}><button className="icon-button modal-close" onClick={onClose} aria-label="关闭"><Icon name="close"/></button>{children}</div></div>,document.body)
}
