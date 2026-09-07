import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.BC_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});const report=[];
try{
 for(const viewport of [{width:1440,height:1100},{width:390,height:844}]){
  const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4174/');await page.waitForFunction(()=>window.__toyReview?.ready&&window.__toyReview.triangles>0);
  await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>document.querySelector('.quest')?.textContent.includes('你好漂亮'));
  const model=await page.evaluate(()=>window.__toyReview);assert.equal(model.meshCount,10);assert.equal(model.materials.length,10);
  assert.equal(model.materials.filter(m=>m.vertexColors).length,1,'Popcorn retains its cream/butter vertex colors');
  assert(new Set(model.materials.map(m=>JSON.stringify(m.color))).size>=8,'Separate material colors survive GLB export');
  await page.getByRole('button',{name:'正面',exact:true}).click();await page.waitForTimeout(200);
  await page.screenshot({path:`previews/toy04/review-${viewport.width}.png`,fullPage:true});
  await page.locator('.card').screenshot({path:`previews/toy04/card-preview-${viewport.width}.png`});
  for(const name of ['侧面','背面','斜侧']){await page.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(100);assert.equal(await page.getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'true')}
  await page.getByRole('button',{name:'读故事预览',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.story-photo').complete&&document.querySelector('.story-photo').naturalWidth>0);
  await page.waitForFunction(()=>document.querySelector('audio').duration>0);
  const audio=await page.evaluate(()=>({duration:document.querySelector('audio').duration,readyState:document.querySelector('audio').readyState}));
  await page.locator('.story').screenshot({path:`previews/toy04/story-preview-${viewport.width}.png`});
  assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));assert.deepEqual(errors,[]);report.push({viewport,model,audio,errors,passed:true});
  await context.close();
 }
 await fs.writeFile('assets/drafts/toy04/browser-check.json',JSON.stringify(report,null,2));console.log('Toy 04 model, card, story and audio metadata verified',report.map(r=>({viewport:r.viewport,meshes:r.model.meshCount,triangles:r.model.triangles,audio:r.audio})));
}finally{await browser.close()}
