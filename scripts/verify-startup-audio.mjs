const {chromium}=await import(process.env.BC_PLAYWRIGHT_MODULE||'playwright');
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const online=process.argv.includes('--online'),baseline=process.argv.includes('--baseline'),root=fileURLToPath(new URL('../',import.meta.url));
const release=process.env.BC_TEST_RELEASE||'5.2';
const url=baseline?'https://didiisliuzhihan.github.io/bad-children-shop/?v=5.1':online?`https://didiisliuzhihan.github.io/bad-children-shop/?v=${release}`:'http://127.0.0.1:4173/';
const modes=baseline?['baseline']:['tap-slider','tap-knob','swipe-then-open','native-touchstart','pending-resume','permanent-denial','speaker-one-tap'];
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=user-gesture-required']});const reports=[];
try{for(const mode of modes){
 if(process.env.BC_AUDIO_CASE&&mode!==process.env.BC_AUDIO_CASE)continue;
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(!online&&!baseline)await page.route('https://**/*',r=>r.abort());await page.route('**/auth/v1/**',r=>r.abort());
 await page.addInitScript(({mode})=>{
  const s=window.__startup={allowed:false,mode,events:[],notes:[],gains:[],rms:[[],[],[],[]],volumeWrites:0,resumes:0,media:[]};
  Object.defineProperty(navigator,'audioSession',{configurable:true,value:{type:'auto'}});
  Object.defineProperty(HTMLMediaElement.prototype,'volume',{configurable:true,get(){return 1},set(){s.volumeWrites++}});
  for(const name of ['touchstart','touchmove','touchend','click','pointerup','keydown'])document.addEventListener(name,event=>{
   if(!event.isTrusted)return;s.events.push({type:event.type,at:performance.now(),target:event.target.closest?.('button')?.getAttribute('aria-label')});
   if(mode!=='permanent-denial'&&(event.type==='click'||event.type==='keydown'||mode==='native-touchstart'&&event.type==='touchstart'))s.allowed=true;
  },true);
  const Native=window.AudioContext,connect=AudioNode.prototype.connect,play=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){s.media.push({url:this.src,allowed:s.allowed});return s.allowed?play.call(this):Promise.reject(new DOMException('Tap required','NotAllowedError'))};
  window.AudioContext=class extends Native{
   get state(){return s.allowed?super.state:'suspended'}
   constructor(...args){super(...args);window.__ctx=this;const cg=this.createGain.bind(this),co=this.createOscillator.bind(this);this.createGain=()=>{const g=cg(),index=s.gains.length;s.gains.push(g);if(index<4){const a=this.createAnalyser();a.fftSize=1024;connect.call(g,a);const data=new Float32Array(1024);setInterval(()=>{a.getFloatTimeDomainData(data);s.rms[index].push(Math.sqrt(data.reduce((x,v)=>x+v*v,0)/data.length))},20)}return g};this.createOscillator=()=>{const o=co(),start=o.start.bind(o);o.start=(...args)=>{s.notes.push({at:performance.now(),state:this.state,allowed:s.allowed});return start(...args)};return o};}
   resume(){s.resumes++;if(!s.allowed)return new Promise(()=>{});const result=super.resume();if(mode==='pending-resume'){result.then(()=>setTimeout(()=>this.dispatchEvent(new Event('statechange')),30));return new Promise(()=>{})}return result}
  };
 },{mode});
 const response=await page.goto(url);const htmlHash=crypto.createHash('sha256').update(await response.body()).digest('hex');if(online)assert.equal(htmlHash,crypto.createHash('sha256').update(await fs.readFile(`${root}/docs/index.html`)).digest('hex'));
 await page.waitForFunction(()=>!document.querySelector('.turn-control')?.disabled,{timeout:45000});
 if(!baseline)assert((await page.locator('.turn-copy').innerText()).includes('轻点'));
 const box=await page.locator('.turn-control').boundingBox(),x=box.x+20,y=box.y+box.height/2;const cdp=await context.newCDPSession(page);
 const swipe=async()=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+150,y}]});await page.waitForTimeout(120);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})};
 if(baseline){for(let i=0;i<2;i++){await swipe();await page.waitForTimeout(1450);assert.equal(await page.locator('main').getAttribute('data-phase'),'IDLE');assert((await page.locator('.toast').innerText()).includes('声音还没准备好'))}reports.push({mode,reproducedRepeatedGate:true,attempts:2});await context.close();continue}
 if(mode==='tap-knob'){
  await page.waitForFunction(()=>document.querySelector('.canvas-wrap canvas')?.getBoundingClientRect().height>400);await page.waitForTimeout(300);const b=await page.locator('.canvas-wrap canvas').boundingBox(),aspect=b.width/b.height,span=Math.max(7.05,3.25/aspect);const c=new THREE.PerspectiveCamera(32,aspect,.1,1000);c.position.set(.16,3.45,span/(2*Math.tan(16*Math.PI/180)));c.lookAt(0,3.25,0);c.updateMatrixWorld();const p=new THREE.Vector3(.66,1.15,1.17).project(c);await page.touchscreen.tap(b.x+(p.x+1)*b.width/2,b.y+(1-p.y)*b.height/2);
 }else if(mode==='swipe-then-open'||mode==='native-touchstart')await swipe();
 else if(mode==='speaker-one-tap'){await page.getByRole('button',{name:'开启声音',exact:true}).tap();await page.waitForTimeout(150);assert.equal(await page.locator('.top-actions .icon-button').nth(1).getAttribute('aria-pressed'),'true','First speaker tap enables instead of muting');await page.locator('.turn-control').tap();}
 else await page.locator('.turn-control').tap();
 await page.waitForSelector('[data-phase="SPINNING"]',{timeout:5000});assert(!(await page.locator('.toast').innerText()).includes('声音还没准备好'));
 if(!['permanent-denial','swipe-then-open'].includes(mode)){await page.waitForFunction(()=>window.__startup.notes.length>=26,{timeout:5000});await page.waitForFunction(()=>window.__startup.rms[1].some(v=>v>.001)&&window.__startup.rms[2].some(v=>v>.00005),{timeout:20000});}
 const first=await page.evaluate(()=>({notes:window.__startup.notes.length,allowed:window.__startup.allowed,levels:window.__startup.gains.slice(0,4).map(g=>g.gain.value)}));
 if(mode==='swipe-then-open'||mode==='permanent-denial'){assert.equal(first.allowed,false);assert.equal(first.notes,0)}
 await page.waitForSelector('.phase-sealed',{timeout:15000});await page.getByRole('button',{name:'打开扭蛋',exact:true}).tap();await page.waitForSelector('.phase-decision',{timeout:45000});
 if(mode==='swipe-then-open'){const notes=await page.evaluate(()=>window.__startup.notes.length);assert.equal(notes,3,'Next plain tap recovers open sound without replaying stale roll/lock/drop');}
 if(mode==='permanent-denial')assert.equal(await page.evaluate(()=>window.__startup.notes.length),0);
 await page.getByRole('button',{name:'赶出去',exact:true}).tap();await page.waitForSelector('[data-phase="IDLE"]');
 const final=await page.evaluate(()=>{const s=window.__startup;return {notes:s.notes,levels:s.gains.slice(0,4).map(g=>g.gain.value),rmsPeak:s.rms.map(a=>Math.max(0,...a)),volumeWrites:s.volumeWrites,events:s.events}});
 assert(final.notes.every(n=>n.state==='running'&&n.allowed));assert.equal(final.volumeWrites,0);assert(Math.abs(final.levels[1]-.55)<.001);assert(Math.abs(final.levels[2]-.08)<.001);assert.deepEqual(errors,[]);
 reports.push({mode,htmlHash,completedCycle:true,noAudioGate:true,first,...final,errors});console.log('PASS',mode,{firstNotes:first.notes,finalNotes:final.notes.length,peak:final.rmsPeak});
 await context.close();
 }
 await fs.writeFile(`${root}/v${release}-${baseline?'baseline':online?'online':'local'}-startup-check.json`,JSON.stringify({passed:true,reports,scope:'Windows Chrome trusted touch events with strict tap-only, native-touchstart, pending-resume and permanent-denial policies simulated; no physical iPhone claim'},null,2));
}finally{await browser.close()}
