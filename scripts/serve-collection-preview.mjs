import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files={
 '/preview/toy4.glb':['assets/drafts/toy04/toy_popcorn_maid.glb','model/gltf-binary'],
 '/preview/toy4-front.png':['previews/toy04/toy04-front.png','image/png'],
 '/preview/toy4-card.png':['assets/source/references/toy4-popcorn-maid-card-original.png','image/png'],
 '/preview/toy4-story.jpg':['assets/drafts/toy04/toy4-popcorn-story.jpg','image/jpeg'],
 '/preview/toy4-voice.mp3':['assets/drafts/toy04/toy4-popcorn-voice.mp3','audio/mpeg'],
};
const mime={'.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return}
 res.setHeader('Cache-Control','no-store');
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
 if(pathname==='/'){
  const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8').replace('<head>','<head><meta name="bc-local-preview" content="true"><meta name="bc-quest-preview" content="true"><meta name="bc-asset-base" content="/assets/delivery/">');
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(req.method==='HEAD'?undefined:html);return;
 }
 if(pathname==='/favicon.ico'){res.writeHead(204).end();return}
 let entry=files[pathname];
 if(!entry&&pathname.startsWith('/assets/delivery/')){
  const relative=pathname.slice('/assets/delivery/'.length),candidate=path.resolve(root,'assets/delivery',relative);
  if(!candidate.startsWith(path.join(root,'assets/delivery')+path.sep)){res.writeHead(403).end();return}
  entry=[path.relative(root,candidate),mime[path.extname(candidate)]||'application/octet-stream'];
 }
 if(!entry){res.writeHead(404).end();return}
 const file=path.join(root,entry[0]);let stat;try{stat=fs.statSync(file);if(!stat.isFile())throw Error()}catch{res.writeHead(404).end();return}
 const size=stat.size,range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/),start=range?Number(range[1]):0,end=range?.[2]?Math.min(Number(range[2]),size-1):size-1;
 if(req.headers.range&&!range||start>end){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return}
 res.setHeader('Content-Type',entry[1]);res.setHeader('Accept-Ranges','bytes');res.setHeader('Content-Length',end-start+1);
 if(range)res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${size}`});if(req.method==='HEAD'){res.end();return}fs.createReadStream(file,{start,end}).pipe(res);
});
server.listen(4175,'127.0.0.1',()=>console.log('Collection quest preview: http://127.0.0.1:4175/'));
