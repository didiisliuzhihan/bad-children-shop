import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assetRoot=path.join(root,'assets','delivery');
const port=Number(process.env.PORT||4173);
const mime={'.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);res.end();return}
 if(pathname==='/__bc/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({app:'bad-children-shop',root,port,localAssets:true}));return}
 if(pathname==='/'||pathname==='/index.html'){
  try{const html=fs.readFileSync(path.join(root,'dist','index.html'),'utf8').replace('<head>','<head><meta name="bc-local-preview" content="true"><meta name="bc-asset-base" content="/assets/delivery/">');
   res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Content-Length',Buffer.byteLength(html));res.end(req.method==='HEAD'?undefined:html);
  }catch{res.writeHead(503);res.end('Please build the project first: npm run build')}
  return;
 }
 if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return}
 if(!pathname.startsWith('/assets/delivery/')){res.writeHead(404);res.end('Not found');return}
 const target=path.resolve(assetRoot,pathname.slice('/assets/delivery/'.length));
 if(!target.startsWith(assetRoot+path.sep)){res.writeHead(403);res.end();return}
 let stat;try{stat=fs.statSync(target);if(!stat.isFile())throw Error()}catch{res.writeHead(404);res.end('Asset not found');return}
 res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');
 res.setHeader('Accept-Ranges','bytes');
 const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
 if(req.headers.range&&!range){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return}
 const start=range?Number(range[1]):0,end=range&&range[2]?Math.min(Number(range[2]),stat.size-1):stat.size-1;
 if(start>end){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return}
 res.setHeader('Content-Length',end-start+1);
 if(range)res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${stat.size}`});
 if(req.method==='HEAD'){res.end();return}
 const stream=fs.createReadStream(target,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);
});
server.on('error',error=>{console.error(error.message);process.exitCode=1});
server.listen(port,'127.0.0.1',()=>console.log(`Bad Children Shop: http://127.0.0.1:${port}`));
