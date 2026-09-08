import fs from 'node:fs/promises';
await fs.mkdir('docs',{recursive:true});
await fs.copyFile('dist/index.html','docs/index.html');
await fs.writeFile('docs/.nojekyll','');
await fs.mkdir('docs/assets/delivery',{recursive:true});
for(const name of ['room_furnished_nest.glb','nest-fireplace-asmr.mp3','default-stamp-white.png'])await fs.copyFile('assets/delivery/'+name,'docs/assets/delivery/'+name);
console.log('GitHub Pages entry ready: docs/index.html');
