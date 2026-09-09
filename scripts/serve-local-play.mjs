import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),base=path.join(root,'assets/delivery');
const mime={'.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return}
 if(!['127.0.0.1:4178','localhost:4178'].includes(req.headers.host)){res.writeHead(403).end();return}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1:4178').pathname)}catch{res.writeHead(400).end();return}
 let file,type;
 if(pathname==='/'){file=path.join(root,'previews/local-play/local-play.html');type='text/html; charset=utf-8'}
 else if(pathname.startsWith('/assets/delivery/')){file=path.resolve(base,pathname.slice('/assets/delivery/'.length));if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return}type=mime[path.extname(file)]||'application/octet-stream'}
 else if(pathname==='/favicon.ico'){res.writeHead(204).end();return}else{res.writeHead(404).end();return}
 let size;try{const stat=fs.statSync(file);if(!stat.isFile())throw Error();size=stat.size}catch{res.writeHead(404).end();return}
 let start=0,end=size-1;const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
 if(req.headers.range){if(!range){res.writeHead(416).end();return}start=Number(range[1]);if(range[2])end=Math.min(Number(range[2]),end);if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end){res.writeHead(416).end();return}}
 const headers={'Content-Type':type,'Content-Length':end-start+1,'Cache-Control':pathname==='/'?'no-store':'public,max-age=3600','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff',
  'Content-Security-Policy':"default-src 'self' blob: data:; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' blob:; img-src 'self' blob: data:; media-src 'self' blob:; frame-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"};
 if(range)headers['Content-Range']=`bytes ${start}-${end}/${size}`;
 res.writeHead(range?206:200,headers);if(req.method==='HEAD'){res.end();return}fs.createReadStream(file,{start,end}).pipe(res);
});
server.listen(4178,'127.0.0.1',()=>console.log('Local-only playground: http://127.0.0.1:4178/'));
