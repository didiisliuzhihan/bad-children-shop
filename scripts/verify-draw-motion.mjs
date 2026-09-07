import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.BC_PLAYWRIGHT_MODULE||'playwright');
const url=process.env.BC_TEST_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try {
 for(const config of [
  {name:'desktop',width:1440,height:1000},
  {name:'phone',width:390,height:844,touch:true},
  {name:'narrow-phone',width:320,height:700,touch:true},
  {name:'landscape',width:844,height:390,touch:true},
  {name:'reduced-motion',width:390,height:844,touch:true,reduced:true},
 ]) {
  const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:!!config.touch,hasTouch:!!config.touch,reducedMotion:config.reduced?'reduce':'no-preference'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:config.reduced?'reduce':'no-preference'});
  if(url.startsWith('http://127.0.0.1'))await page.route('https://**/*',r=>r.abort());
  await page.route('**/auth/v1/**',r=>r.abort());
  await page.goto(url);await page.waitForFunction(()=>!document.querySelector('.turn-control')?.disabled,{timeout:45000});
  const initial=await page.locator('.dial-mini').boundingBox();
  if(config.touch)await page.locator('.turn-control').tap();else await page.locator('.turn-control').click();
  await page.waitForSelector('[data-phase="SPINNING"]');
  await page.waitForFunction(reduced=>matchMedia('(prefers-reduced-motion: reduce)').matches===reduced,!!config.reduced);
  await page.waitForFunction(reduced=>getComputedStyle(document.querySelector('.dial-travel')).animationName===(reduced?'none':'draw-travel'),!!config.reduced);
  const result=await page.evaluate(()=>{
   const track=document.querySelector('.turn-control'),traveler=document.querySelector('.dial-travel'),dial=document.querySelector('.dial-mini');
   const animations=[...traveler.getAnimations(),...dial.getAnimations()];
   animations.forEach(a=>a.pause());
   const bounds=track.getBoundingClientRect();
   const times=[0,287.5,575,862.5,1120,1150,1180,1437.5,1725,2012.5,2270,2300,2330,4600];
   const samples=times.map(t=>{animations.forEach(a=>a.currentTime=t);const b=dial.getBoundingClientRect();const style=getComputedStyle(traveler);return {t,x:b.x,w:b.width,travelerTransform:style.transform,rotation:getComputedStyle(dial).transform}});
   return {animations:animations.map(a=>({name:a.animationName,direction:a.effect.getTiming().direction,duration:a.effect.getTiming().duration})),track:{left:bounds.left,right:bounds.right,width:bounds.width},samples,copy:getComputedStyle(document.querySelector('.turn-copy')).opacity};
  });
  if(config.reduced){assert.equal(result.animations.length,0);assert(result.samples.every(p=>Math.abs(p.x-result.samples[0].x)<.01));}
  else{
   assert.deepEqual(result.animations.map(a=>a.name),['draw-travel','draw-roll']);
   assert(result.animations.every(a=>a.direction==='alternate'));
   const xs=result.samples.map(s=>s.x);
   assert(xs[0]>xs[2]&&xs[2]>xs[5],'Moves right to left');
   assert(xs[5]<xs[8]&&xs[8]<xs[11],'Then left to right');
   assert(Math.abs(xs[0]-xs[11])<.1&&Math.abs(xs[11]-xs[13])<.1,'Round trips have matching endpoints, no reset jump');
   assert(Math.abs(xs[4]-xs[5])<2&&Math.abs(xs[6]-xs[5])<2,'Left turnaround is continuous');
   assert(Math.abs(xs[10]-xs[11])<2&&Math.abs(xs[12]-xs[11])<2,'Right turnaround is continuous');
   assert(Math.abs(initial.x-xs[5])<.5,'Busy animation returns to the original idle position');
   assert.equal(result.copy,'0','No copy/knob collision during travel');
  }
  // Rotation changes the bounding box; test the unrotated endpoints for clipping.
  for(const i of [0,5,11,13]){const s=result.samples[i];assert(s.x>=result.track.left+3&&s.x+s.w<=result.track.right-3,'Knob stays within the rail');}
  assert.deepEqual(errors,[]);
  await page.screenshot({path:`previews/toy04/slider-${config.name}.png`});
  results.push({name:config.name,passed:true,...result,errors});console.log('PASS',config.name);
  await context.close();
 }
 await fs.writeFile(process.env.BC_MOTION_REPORT||'draw-motion-check.json',JSON.stringify({url,passed:true,results},null,2));
}finally{await browser.close()}
