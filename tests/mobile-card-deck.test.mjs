import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import React from 'react';import * as jsx from 'react/jsx-runtime';import {renderToStaticMarkup} from 'react-dom/server';import {transformWithOxc} from 'vite';
import * as policy from '../src/lib/cardDeckInput.ts';
import {localeMocks} from './helpers/locale.mjs';
import {translateText} from '../src/lib/locale/en.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
async function load(extra={}){
 const source=(await transformWithOxc(read('src/components/MobileCardDeck.tsx'),'MobileCardDeck.tsx',{jsx:{runtime:'automatic'}})).code.replace(/^import[^\n]*\n/gm,'').replace(/^export function /gm,'function ');
 const context={...React,...localeMocks,...policy,_jsx:jsx.jsx,_jsxs:jsx.jsxs,Icon:()=>null,...extra};
 vm.runInNewContext(source+'\nglobalThis.Deck=MobileCardDeck;globalThis.Responsive=ResponsiveCardDeck;',context);return context;
}
test('deck only claims intentional horizontal movement; scrolling and diagonals stay native',()=>{
 assert.equal(policy.deckAxis(8,2),'pending');assert.equal(policy.deckAxis(30,4),'horizontal');
 for(const [x,y] of [[0,50],[20,40],[25,25],[0,-50]])assert.equal(policy.deckAxis(x,y),'vertical');
 assert.equal(policy.deckAxis(90,4,'vertical'),'vertical');assert.equal(policy.deckAxis(8,99,'horizontal'),'horizontal');
});
test('short drags return, directional swipes turn one card, indices wrap without duplicates',()=>{
 assert.equal(policy.deckStep(30,300),0);assert.equal(policy.deckStep(-90,300),1);assert.equal(policy.deckStep(90,300),-1);
 assert.equal(policy.deckIndex(0,-1,7),6);assert.equal(policy.deckIndex(6,1,7),0);assert.equal(policy.deckIndex(0,1,0),0);
 for(const count of [0,1,2,7,1000]){const window=policy.deckWindow(0,count,-1);assert.equal(window.length,Math.min(3,count));assert.equal(new Set(window).size,window.length);assert(window.every(i=>i>=0&&i<count))}
});
test('phone renders at most three real cards, only the front is accessible, single/empty collections work',async()=>{
 const {Deck}=await load();const cards=Array.from({length:20},(_,n)=>React.createElement('button',{key:'receipt-'+n},'Toy '+n));
 const html=renderToStaticMarkup(React.createElement(Deck,{label:'玩具卡片',hint:'左右轻滑 · 点中间查看玩具'},cards));
 assert.equal((html.match(/class="mobile-deck-card"/g)||[]).length,3);assert.equal((html.match(/inert=""/g)||[]).length,2);
 assert(html.includes('1 / 20'));assert(!html.includes('Toy 3'));assert(html.includes('aria-live="polite"'));
 const single=renderToStaticMarkup(React.createElement(Deck,{label:'test',hint:'Swipe'},cards.slice(0,1)));assert.equal((single.match(/disabled=""/g)||[]).length,2);assert(single.includes('点中间的卡片查看详情'));
 assert.equal(renderToStaticMarkup(React.createElement(Deck,{label:'empty',hint:'Swipe'},[])),'');
});
test('desktop branch preserves original full grid; phone branch uses the same card objects',async()=>{
 const cards=Array.from({length:7},(_,n)=>React.createElement('button',{key:n},'Toy '+n));
 const desktop=await load(),desktopHtml=renderToStaticMarkup(React.createElement(desktop.Responsive,{gridClassName:'collection-grid',label:'toys',hint:'swipe'},cards));
 assert(desktopHtml.includes('class="collection-grid"'));assert(desktopHtml.includes('Toy 6'));assert(!desktopHtml.includes('mobile-card-deck'));
 const phone=await load({useSyncExternalStore:()=>true}),phoneHtml=renderToStaticMarkup(React.createElement(phone.Responsive,{gridClassName:'collection-grid',label:'toys',hint:'swipe'},cards));
 assert(phoneHtml.includes('mobile-card-deck'));assert(!phoneHtml.includes('Toy 6'));
});
test('deck labels and guidance are translated; touch/animation constraints are local to the deck',()=>{
 for(const text of ['翻卡区','玩具卡片','上一张卡片','下一张卡片','左右轻滑 · 点中间查看玩具','左右轻滑 · 点中间展开明信片','点中间的卡片查看详情'])assert.notEqual(translateText(text,'en'),text);
 const css=read('src/mobile-card-deck.css'),source=read('src/components/MobileCardDeck.tsx');
 assert(css.includes('touch-action:pan-y pinch-zoom'));assert(!css.includes('touch-action:none'));assert(css.includes('prefers-reduced-motion:reduce'));assert(css.includes('360ms ease-out'));
 assert(source.includes('onPointerCancel'));assert(source.includes('onLostPointerCapture'));assert(source.includes('suppressClick.current&&event.detail!==0'));assert(source.includes('cancelAnimationFrame'));assert(source.includes('clearTimeout'));
 assert(source.includes('if(event.target===event.currentTarget)end(event,true)'),'implicit inner-button capture transfer is not a cancellation');
 assert(css.includes('border:1px solid transparent'));assert(!css.includes('#a4bfc1'));
 assert(css.includes('.mobile-deck-card .card-image.has-artwork{aspect-ratio:1;'));
 assert(!css.includes('aspect-ratio:1.12'),'square artwork must not acquire side letterboxing');
});
