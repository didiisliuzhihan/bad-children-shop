import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {viewerLighting} from '../src/lib/viewerLighting.ts';
test('collection studio keeps neutral colour and restrained exposure/fill',()=>{
 assert.equal(viewerLighting.tone,'neutral');assert.equal(viewerLighting.id,'soft-color-v1');
 assert(viewerLighting.exposure<=1.05&&viewerLighting.exposure>=.9);
 assert(viewerLighting.environment<.75);assert(viewerLighting.hemisphere<.65);
 assert(viewerLighting.key>viewerLighting.fill);assert(Object.isFrozen(viewerLighting));
});
test('soft colour finish is scoped only to the unlocked model canvas',()=>{
 const css=fs.readFileSync(new URL('../src/collection-room.css',import.meta.url),'utf8');
 assert(css.includes('.toy-viewer[data-viewer-look="soft-color-v1"] .toy-viewer-canvas{filter:saturate(.88)}'));
 assert(!/\.room-model-panel[^{}]*\{[^}]*filter:/.test(css));
});
test('colour fix preserves GLB materials and explicitly outputs sRGB',()=>{
 const source=fs.readFileSync(new URL('../src/components/ToyViewer.tsx',import.meta.url),'utf8');
 assert(source.includes('renderer.outputColorSpace=THREE.SRGBColorSpace'));
 assert(source.includes('const model=g.scene.clone(true);scene.add(model)'));
 assert(!/\.material\s*=|\.color\.(set|multiply|offsetHSL)\(/.test(source));
});
