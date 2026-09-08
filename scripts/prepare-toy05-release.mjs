import fs from 'node:fs/promises';import crypto from 'node:crypto';
const rows=[];
for(const [source,name] of [
 ['assets/drafts/toy05/toy_tired_crow.glb','toy_tired_crow.glb'],
 ['previews/toy05/toy05-front.png','toy_tired_crow.png'],
 ['assets/source/references/toy5-crow-card-original.png','toy_tired_crow_card.png'],
 ['assets/source/references/toy5-whatever-dua-story.jpg','toy5_whatever_dua_story.jpg'],
 ['assets/source/references/toy5-whatever-dua-voice.mp3','toy5_whatever_dua_voice.mp3']
]){
 const bytes=await fs.readFile(source),destination='assets/delivery/'+name;
 try{const existing=await fs.readFile(destination);if(!existing.equals(bytes))throw Error('Refusing to overwrite different release asset: '+destination)}catch(e){if(e.code!=='ENOENT')throw e;await fs.copyFile(source,destination)}
 rows.push({source,path:destination,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
await fs.writeFile('assets/toy05-release-manifest.json',JSON.stringify(rows,null,2));console.log(rows);
