import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('.'),out=path.join(root,'assets/delivery'),source=path.join(root,'assets/source/audio');await fs.mkdir(source,{recursive:true});
for(const [family,name] of [['Fredoka:wght@300..700','fredoka'],['Inter:wght@100..900','inter']]){
 const css=await (await fetch(`https://fonts.googleapis.com/css2?family=${family}&display=swap`,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'}})).text();
 const blocks=css.match(/@font-face[\s\S]*?}/g)||[];const match=blocks.at(-1)?.match(/url\(([^)]+)\)/);
 if(!match)throw Error(`Font download failed: ${name}`);await fs.writeFile(path.join(out,`${name}.woff2`),Buffer.from(await (await fetch(match[1])).arrayBuffer()));
}
// An original, seamless 24-second ambient music-box loop. PCM master is retained.
const sr=24000,seconds=24,N=sr*seconds,samples=new Float32Array(N);const notes=[261.626,329.628,391.995,493.883,293.665,349.228,440,523.251];
for(let bar=0;bar<8;bar++)for(let j=0;j<4;j++){
 const start=(bar*3+j*.75);const f=notes[(bar+j*2)%notes.length];
 for(let k=0;k<sr*3;k++){const t=k/sr,env=(1-Math.exp(-t*80))*Math.exp(-t*2.4);const signal=Math.sin(Math.PI*2*f*t)*.085+Math.sin(Math.PI*2*f*2*t)*.017+Math.sin(Math.PI*2*f*3*t)*.006;samples[(Math.floor(start*sr)+k)%N]+=signal*env;}
}
const buf=Buffer.alloc(44+N*2);buf.write('RIFF');buf.writeUInt32LE(buf.length-8,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(1,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*2,28);buf.writeUInt16LE(2,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(N*2,40);for(let i=0;i<N;i++)buf.writeInt16LE(Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),44+i*2);
await fs.writeFile(path.join(source,'studio-loop-master.wav'),buf);await fs.writeFile(path.join(out,'studio-loop.wav'),buf);
for(const n of ['toy1 jimao.jpg','toy1 jimao.mp3','toy2 emok.jpg','toy2 emok.mp3'])await fs.copyFile(path.join(root,'assets/source/references',n),path.join(out,n));
console.log('Original music loop, local originals, and external font files prepared.');
