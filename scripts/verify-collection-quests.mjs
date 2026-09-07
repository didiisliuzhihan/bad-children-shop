import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {chromium}=await import(process.env.BC_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const out='previews/collection-quests';await fs.mkdir(out,{recursive:true});const report=[];
const assertTaskOnlyCopy=async page=>assert(!/分钟|倒计时|计时|时间到啦|跳过等待/.test(await page.locator('body').innerText()),'Player copy must not expose the internal wait rule');
try{
 for(const viewport of [{width:1440,height:1080},{width:390,height:844}]){
  const context=await browser.newContext({viewport,isMobile:viewport.width<700,hasTouch:viewport.width<700,acceptDownloads:true});
  const page=await context.newPage(),errors=[],modelRequests=[],cloudRequests=[];
  await page.addInitScript(()=>{navigator.canShare=()=>false}); // Native sharing is covered separately below; assert real download bytes here.
  page.on('pageerror',e=>errors.push(e.message));page.on('request',req=>{if(req.url().includes('.glb'))modelRequests.push(req.url());if(req.url().includes('supabase.co'))cloudRequests.push(req.url())});
  await page.goto('http://127.0.0.1:4175/');
  await page.waitForFunction(()=>document.querySelector('.export-preview img')?.naturalWidth===1080);
  await page.evaluate(()=>document.fonts.ready);
  await assertTaskOnlyCopy(page);
  assert.equal(await page.getByRole('tab',{name:'卡片',exact:true}).getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('.viewer-angles').count(),0);assert.equal(modelRequests.length,0,'No GLB requested through the locked gallery');
  await page.screenshot({path:`${out}/desktop-or-mobile-card-${viewport.width}.png`,fullPage:true});
  const png=await page.locator('.export-preview img').evaluate(async img=>Array.from(new Uint8Array(await (await fetch(img.src)).arrayBuffer())));
  const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'保存卡片',exact:true}).click();const download=await downloadEvent;
  await download.saveAs(`${out}/miss-popcorn-card-${viewport.width}.png`);
  assert.deepEqual(await fs.readFile(`${out}/miss-popcorn-card-${viewport.width}.png`),Buffer.from(png),'Preview and saved PNG are byte-identical');
  assert.equal(await page.evaluate(()=>localStorage.getItem('bc-shop:toy-quests:v1:preview')),null,'Download alone never starts clock');
  await page.getByRole('button',{name:'已保存，去做任务',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-confirm-state]')?.dataset.confirmState==='waiting');
  await assertTaskOnlyCopy(page);
  const started=await page.evaluate(()=>JSON.parse(localStorage.getItem('bc-shop:toy-quests:v1:preview')).miss_popcorn.savedAt);
  assert.equal(await page.evaluate(()=>localStorage.getItem('bc-shop:toy-quests:v1')),null,'Real progress untouched');
  assert.equal(await page.evaluate(()=>localStorage.getItem('bc-shop:collection:v1')),null,'Real collection untouched');
  await page.reload();await page.waitForFunction(()=>document.querySelector('[data-confirm-state]')?.dataset.confirmState==='waiting');await page.waitForFunction(()=>document.querySelector('.export-preview img')?.naturalWidth===1080);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('bc-shop:toy-quests:v1:preview')).miss_popcorn.savedAt),started);
  if(viewport.width<700)await page.getByRole('tab',{name:'模型'}).click();
  await assertTaskOnlyCopy(page);
  await page.screenshot({path:`${out}/locked-model-${viewport.width}.png`,fullPage:true});
  await page.getByRole('button',{name:'预览：体验解锁',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.fog-stage')?.dataset.questStage==='ready');
  await assertTaskOnlyCopy(page);
  await page.getByRole('button',{name:'敲敲玻璃',exact:true}).click();
  await page.waitForTimeout(200);
  const bounds=await page.locator('.fog-stage').boundingBox();assert(bounds);
  const cdp=viewport.width<700?await context.newCDPSession(page):null;
  const sweep=async y=>{
   if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:bounds.x+bounds.width*.08,y:bounds.y+bounds.height*y}]});for(let p=.08;p<=.92;p+=.035)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:bounds.x+bounds.width*p,y:bounds.y+bounds.height*y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else{await page.mouse.move(bounds.x+bounds.width*.08,bounds.y+bounds.height*y);await page.mouse.down();for(let p=.08;p<=.92;p+=.035)await page.mouse.move(bounds.x+bounds.width*p,bounds.y+bounds.height*y);await page.mouse.up();}
  };
  await sweep(.2);if(await page.locator('.fog-stage').count())await sweep(.8);
  await page.waitForSelector('[data-viewer-ready="true"]',{timeout:30000});
  assert(modelRequests.some(url=>url.endsWith('/preview/toy4.glb')));
  for(const name of ['正面','侧面','背面','斜侧']){await page.getByRole('button',{name,exact:true}).click();assert.equal(await page.getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'true')}
  await page.waitForTimeout(600);await page.screenshot({path:`${out}/unlocked-model-${viewport.width}.png`,fullPage:true});
  await page.getByRole('tab',{name:'故事',exact:true}).click();await page.locator('.room-story-photo').evaluate(img=>img.decode());
  await page.screenshot({path:`${out}/story-${viewport.width}.png`,fullPage:true});
  await page.getByRole('button',{name:'扭蛋包',exact:true}).click();
  await page.getByRole('button',{name:'查看 哭哭葵的收藏卡片',exact:true}).click();
  assert.equal(await page.locator('[data-confirm-state]').getAttribute('data-confirm-state'),'unsaved','Other toys remain locked');
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'查看 爆米花· 幽怨女仆的收藏卡片',exact:true}).click();
  assert.equal(await page.getByRole('tab',{name:'卡片',exact:true}).getAttribute('aria-selected'),'true','Each open defaults to card');
  assert.equal(await page.locator('[data-confirm-state]').getAttribute('data-confirm-state'),'unlocked');
  const modal=page.getByRole('dialog');await modal.focus();await page.keyboard.press('Shift+Tab');assert(await modal.evaluate(el=>el.contains(document.activeElement)));
  assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
  await assertTaskOnlyCopy(page);
  assert.deepEqual(errors,[]);assert.deepEqual(cloudRequests,[]);report.push({viewport,passed:true,errors,cloudRequests,modelRequests,pngByteIdentical:true,taskOnlyCopy:true});await context.close();
 }
 // Failed / cancelled native save never confirms for the player.
 const context=await browser.newContext({viewport:{width:320,height:740},isMobile:true,hasTouch:true});
 const page=await context.newPage();await page.addInitScript(()=>{navigator.canShare=()=>true;navigator.share=()=>Promise.reject(new DOMException('Cancelled','AbortError'))});
 await page.goto('http://127.0.0.1:4175/');await page.waitForFunction(()=>document.querySelector('.export-preview img')?.naturalWidth===1080);
 await page.getByRole('button',{name:'保存卡片',exact:true}).click();await page.getByText('已取消；保存后再确认就好。',{exact:true}).waitFor();
 assert.equal(await page.locator('[data-confirm-state]').getAttribute('data-confirm-state'),'unsaved');
 assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
 await context.close();report.push({case:'cancelled share at 320px',passed:true});
 await fs.writeFile(`${out}/verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
