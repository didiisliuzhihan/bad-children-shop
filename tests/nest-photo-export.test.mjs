import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {stripTypeScriptTypes} from 'node:module';
const source=fs.readFileSync(new URL('../src/lib/nestPhotoExport.ts',import.meta.url),'utf8');
function harness({blank=false,decodeError=false,encodeError=false}={}){
 const ops=[],revoked=[],canvases=[];
 const pixels=new Uint8ClampedArray(16*16*4);for(let i=0;i<pixels.length;i+=4){pixels[i]=blank?220:(i%28?220:40);pixels[i+1]=210;pixels[i+2]=190;pixels[i+3]=255}
 const context={Uint8ClampedArray,Array,Math,Date,Promise,Error,Blob,setTimeout,clearTimeout,QUEST_FONT_FAMILY:'"BC Quest",sans-serif',ensureQuestFont:async()=>ops.push('font'),
  URL:{createObjectURL:()=> 'blob:scene-only',revokeObjectURL:url=>revoked.push(url)},
  Image:class {naturalWidth=960;naturalHeight=960;async decode(){ops.push('decode');if(decodeError)throw Error('decode failed')}},
  document:{createElement:()=>{const canvas={width:0,height:0},ctx={font:'14px sans-serif',drawImage(...args){ops.push({draw:args,canvas})},getImageData:()=>({data:pixels}),measureText(text){return {width:Array.from(text).length*(parseFloat(this.font.match(/(\d+)px/)?.[1]||'14'))*.7}},scale(){},fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(text,x,y){ops.push({text,x,y,canvas})}};canvas.getContext=()=>ctx;canvases.push(canvas);return canvas}},
  canvasBlob:async(canvas,type)=>{ops.push({encode:canvas,type});if(encodeError)throw Error('encode failed');return new Blob(['PNG-result'],{type})},
 };
 vm.runInNewContext(stripTypeScriptTypes(source).replace(/^import .*;\s*$/gm,'').replace(/export /g,'')+'\nglobalThis.render=renderNestKeepsake;globalThis.detail=hasNestPhotoDetail;',context);
 return {run:input=>context.render({photo:new Blob(['real-scene'],{type:'image/jpeg'}),nickname:'小火龙',text:'今天没有大事，大家在这里待了一会儿。',date:'2026-09-08',...input}),ops,revoked,canvases,context};
}
test('portrait and landscape both explicitly draw decoded scene pixels before encoding',async()=>{
 for(const layout of ['portrait','landscape']){const h=harness(),blob=await h.run({layout});assert.equal(blob.type,'image/png');
  const output=h.canvases[1],picture=h.ops.find(op=>op.draw&&op.canvas===output),encoded=h.ops.find(op=>op.encode===output);
  assert(picture);assert(h.ops.indexOf(picture)<h.ops.indexOf(encoded));assert.equal(picture.draw[0].src,'blob:scene-only');assert.equal(picture.draw[3],layout==='portrait'?476:400);
  assert(h.ops.some(op=>op.text==='小火龙'));assert(h.ops.some(op=>op.text==='来自你的小窝'));assert.equal(output.width,layout==='portrait'?1080:1800);assert.equal(h.revoked.length,1);
 }
});
test('blank input, image decode and PNG encoding failures never report a finished postcard',async()=>{
 for(const options of [{blank:true},{decodeError:true},{encodeError:true}]){const h=harness(options);await assert.rejects(h.run());assert.equal(h.revoked.length,1);if(!options.encodeError)assert(!h.ops.some(op=>op.encode));}
 const empty=harness();await assert.rejects(empty.run({photo:new Blob([],{type:'image/jpeg'})}));assert.equal(empty.canvases.length,0);
});
test('long nicknames wrap without clipping the footer, and no account nickname uses the guest fallback',async()=>{
 for(const nickname of ['坏小孩很长很长很长很长的名字','', '<img onerror=alert(1)>']){const h=harness();await h.run({nickname});const output=h.canvases[1];
  assert(h.ops.filter(op=>op.canvas===output&&op.text).every(op=>op.y<output.height/2));
  if(!nickname)assert(h.ops.some(op=>op.text==='一个坏小孩'));
 }
});
test('manual keepsake does not rasterize a DOM/SVG subtree and shares the same final PNG it previews',()=>{
 assert(!source.includes("from 'html-to-image'"));assert(!source.includes('toBlob(node'));assert(!source.includes('fetch('));
 const dialog=fs.readFileSync(new URL('../src/components/NestPhotoDialog.tsx',import.meta.url),'utf8');
 assert(dialog.includes('photo:photo.blob'));assert(dialog.includes('src={ready.url}'));assert(dialog.includes('files:[ready.file]'));assert(dialog.includes('link.href=ready.url'));
 assert(dialog.includes('<div ref={card} className="nest-photo-preview"'));assert(!dialog.includes('firstElementChild'));
});

