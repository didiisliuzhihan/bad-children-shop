import * as THREE from 'three';

export type NestTime = 'day' | 'night';
// Local to the home: never change the lighting/materials in a toy's own viewer.
export const nestLightPresets = {
 day: {environment:.28, hemisphere:.18, key:.62, fill:.27, sun:3.1, sunColor:'#ffe0a3', lamp:13, lampSpot:48, oven:2.8, hob:2, shade:.65, diffuser:3.5, window:.85, windowColor:'#ffe4a0', halo:.15},
 night: {environment:.07, hemisphere:.12, key:.15, fill:.18, sun:.45, sunColor:'#9cbdff', lamp:18, lampSpot:65, oven:4, hob:2.5, shade:1.1, diffuser:5, window:.55, windowColor:'#8bade3', halo:.27},
} as const;

/** Geometry/textures stay cached; all mutable room materials belong to this scene. */
export function cloneNestRoom(source:THREE.Object3D) {
 const model=source.clone(true),copies=new Map<THREE.Material,THREE.Material>();
 const copy=(material:THREE.Material)=>{let result=copies.get(material);if(!result){result=material.clone();copies.set(material,result);}return result;};
 model.traverse(o=>{const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;mesh.castShadow=mesh.userData.noShadow!==true;mesh.receiveShadow=true;mesh.material=Array.isArray(mesh.material)?mesh.material.map(copy):copy(mesh.material);});
 return {model,materials:[...copies.values()]};
}

export function createNestLighting(scene:THREE.Scene) {
 const group=new THREE.Group();group.name='Nest day-night lighting';scene.add(group);
 const hemisphere=new THREE.HemisphereLight('#fff4dd','#91a2ac',.18);group.add(hemisphere);
 const key=new THREE.DirectionalLight('#fff1da',.62);key.position.set(3,12,8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.1,far:40});key.shadow.camera.updateProjectionMatrix();key.shadow.bias=-.0002;key.shadow.normalBias=.025;group.add(key);
 const fill=new THREE.DirectionalLight('#d9ecff',.27);fill.position.set(7,8,2);group.add(fill);
 // Aligned through the real arch. Its visible pane is explicitly non-shadowing.
 const windowSun=new THREE.DirectionalLight('#ffe0a3',3.1);windowSun.position.set(2.48,17,-10.83);windowSun.target.position.set(1.1,0,-.2);windowSun.castShadow=true;windowSun.shadow.mapSize.set(2048,2048);Object.assign(windowSun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.1,far:50});windowSun.shadow.camera.updateProjectionMatrix();windowSun.shadow.bias=-.00008;windowSun.shadow.normalBias=.018;group.add(windowSun,windowSun.target);
 const lampGlow=new THREE.PointLight('#ffca76',13,7,2);lampGlow.position.set(-2.66,4.22,-2.55);group.add(lampGlow);
 const lampSpot=new THREE.SpotLight('#ffcf87',48,8,Math.PI/3,.7,2);lampSpot.position.copy(lampGlow.position);lampSpot.target.position.set(-3.5,1.05,-.5);lampSpot.castShadow=true;lampSpot.shadow.mapSize.set(512,512);lampSpot.shadow.bias=-.0001;lampSpot.shadow.normalBias=.02;group.add(lampSpot,lampSpot.target);
 const ovenGlow=new THREE.PointLight('#ff962b',2.8,3,2);ovenGlow.position.set(-2.44,1.05,3.6);group.add(ovenGlow);
 const hobGlow=new THREE.PointLight('#ffd24f',2,2.5,2);hobGlow.position.set(-3.52,2.4,3.6);group.add(hobGlow);
 // A small analytic halo, not a white opaque disc or a full-screen bloom pass.
 // Depth-testing keeps it behind the furnishings; idle scenes need no RAF loop.
 const haloGeometry=new THREE.PlaneGeometry(1.75,1.75);
 const haloMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,toneMapped:false,
  uniforms:{tint:{value:new THREE.Color('#ffc873')},strength:{value:.15}},
  vertexShader:'varying vec2 vUv; void main(){ vUv=uv; vec4 p=modelViewMatrix*vec4(0.0,0.0,0.0,1.0); p.xy+=position.xy; gl_Position=projectionMatrix*p; }',
  fragmentShader:'varying vec2 vUv; uniform vec3 tint; uniform float strength; void main(){ float r=length(vUv-0.5)*2.0; float a=pow(max(0.0,1.0-r),3.0)*strength; gl_FragColor=vec4(tint,a); }'});
 const halo=new THREE.Mesh(haloGeometry,haloMaterial);halo.position.set(-2.61,4.33,-2.46);halo.frustumCulled=false;group.add(halo);
 // A faint, feathered shaft makes the window's direction legible in a clay
 // miniature. It lives in world space and depth-tests against toys/furniture;
 // the actual lit/shadowed floor remains the directional light's responsibility.
 const shaftGeometry=new THREE.BufferGeometry();
 shaftGeometry.setAttribute('position',new THREE.Float32BufferAttribute([.72,6.95,-4.40,2.26,6.95,-4.40,.23,.045,-.17,1.97,.045,-.17],3));
 shaftGeometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));shaftGeometry.setIndex([0,2,1,1,2,3]);
 const shaftMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false,
  uniforms:{tint:{value:new THREE.Color('#ffd47a')},strength:{value:.13}},
  vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader:'varying vec2 vUv; uniform vec3 tint; uniform float strength; void main(){ float edge=pow(sin(vUv.x*3.14159265),2.0); float ends=smoothstep(0.0,0.08,vUv.y)*(1.0-smoothstep(0.80,1.0,vUv.y)); gl_FragColor=vec4(tint,strength*edge*ends); }'});
 const shaft=new THREE.Mesh(shaftGeometry,shaftMaterial);shaft.name='Feathered window light shaft';group.add(shaft);
 let materials:THREE.Material[]=[],current:NestTime='day';
 function apply(mode:NestTime){
  current=mode;const p=nestLightPresets[mode];scene.environmentIntensity=p.environment;
  hemisphere.intensity=p.hemisphere;hemisphere.color.set(mode==='day'?'#fff4dd':'#a9c2ef');
  key.intensity=p.key;key.color.set(mode==='day'?'#fff1da':'#a5bbdf');fill.intensity=p.fill;
  windowSun.color.set(p.sunColor);windowSun.intensity=p.sun;lampGlow.intensity=p.lamp;lampSpot.intensity=p.lampSpot;ovenGlow.intensity=p.oven;hobGlow.intensity=p.hob;haloMaterial.uniforms.strength.value=p.halo;
  shaftMaterial.uniforms.tint.value.set(p.sunColor);shaftMaterial.uniforms.strength.value=mode==='day'?.13:.045;
  for(const material of materials){const m=material as THREE.MeshStandardMaterial;if(!m.isMeshStandardMaterial)continue;
   // GLTFLoader can sanitize spaces; test the same canonical spelling in both forms.
   const name=m.name.replaceAll('_',' ');
   if(name==='Window warm sky'){m.color.set(p.windowColor);m.emissive.set(p.windowColor);m.emissiveIntensity=p.window;}
   if(name==='Warm lamp shade'){m.emissive.set('#ffdf99');m.emissiveIntensity=p.shade;}
   if(name==='Lamp diffuser glow')m.emissiveIntensity=p.diffuser;
  }
 }
 apply(current);
 return {lights:{hemisphere,key,fill,windowSun,lampGlow,lampSpot,ovenGlow,hobGlow},setMode:apply,
  simmer:(strength:number)=>{ovenGlow.intensity=nestLightPresets[current].oven*strength;hobGlow.intensity=nestLightPresets[current].hob*strength;},
  bindMaterials:(owned:THREE.Material[])=>{materials=owned;apply(current);},
  dispose:()=>{key.shadow.map?.dispose();windowSun.shadow.map?.dispose();lampSpot.shadow.map?.dispose();haloGeometry.dispose();haloMaterial.dispose();shaftGeometry.dispose();shaftMaterial.dispose();scene.remove(group);},
 };
}
