import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files={
 '/':['previews/toy04/viewer/index.html','text/html; charset=utf-8'],
 '/model.glb':['assets/drafts/toy04/toy_popcorn_maid.glb','model/gltf-binary'],
 '/card.png':['assets/source/references/toy4-popcorn-maid-card-original.png','image/png'],
 '/story.jpg':['assets/drafts/toy04/toy4-popcorn-story.jpg','image/jpeg'],
 '/voice.mp3':['assets/drafts/toy04/toy4-popcorn-voice.mp3','audio/mpeg'],
 '/draft.json':['assets/drafts/toy04/catalog-preview.json','application/json; charset=utf-8'],
 '/fredoka.woff2':['assets/delivery/fredoka.woff2','font/woff2'],
 '/quest.woff2':['assets/delivery/zcool-kuaile.woff2','font/woff2'],
};
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return}
 const item=files[new URL(req.url,'http://localhost').pathname];if(!item){res.writeHead(404).end();return}
 const file=path.join(root,item[0]);let size;try{size=fs.statSync(file).size}catch{res.writeHead(503).end('Preview asset not ready');return}
 const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/),start=range?Number(range[1]):0,end=range?.[2]?Math.min(Number(range[2]),size-1):size-1;
 if(req.headers.range&&!range||start>end){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return}
 res.setHeader('Content-Type',item[1]);res.setHeader('Cache-Control','no-store');res.setHeader('Accept-Ranges','bytes');res.setHeader('Content-Length',end-start+1);
 if(range)res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${size}`});
 if(req.method==='HEAD'){res.end();return}fs.createReadStream(file,{start,end}).pipe(res);
});
server.listen(4174,'127.0.0.1',()=>console.log('Miss Popcorn local review: http://127.0.0.1:4174/'));
