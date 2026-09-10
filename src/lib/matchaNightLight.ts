import * as THREE from 'three';
import type {NestTime} from './nestLighting';

/** A resident-owned night light: no shared GLTF mutation, bloom pass or shadows. */
export function createMatchaNightLight(actor:THREE.Object3D){
 if(actor.userData.toyId!=='matcha_clown')return null;
 const changed:{mesh:THREE.Mesh;original:THREE.Material|THREE.Material[]}[]=[],copies=new Map<THREE.Material,THREE.MeshStandardMaterial>();
 const bounds=new THREE.Box3();
 actor.updateMatrixWorld(true);
 actor.traverse(o=>{const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;
  const original=mesh.material,materials=Array.isArray(original)?original:[original];let touched=false;
  const next=materials.map(material=>{
   if(!(material as THREE.MeshStandardMaterial).isMeshStandardMaterial||!material.name.replaceAll('_',' ').includes('golden flame core'))return material;
   touched=true;let copy=copies.get(material);if(!copy){copy=(material as THREE.MeshStandardMaterial).clone();copy.emissive.set('#ffcf72');copies.set(material,copy)}return copy;
  });
  if(touched){bounds.expandByObject(mesh);changed.push({mesh,original});mesh.material=Array.isArray(original)?next:next[0];}
 });
 if(bounds.isEmpty())return null;
 const center=actor.worldToLocal(bounds.getCenter(new THREE.Vector3())),size=bounds.getSize(new THREE.Vector3());
 const group=new THREE.Group();group.name='Matcha flame night light';group.position.copy(center);actor.add(group);
 const light=new THREE.PointLight('#ffbe64',0,2.4,2);light.castShadow=false;group.add(light);
 const geometry=new THREE.PlaneGeometry(Math.max(.65,size.x*1.25),Math.max(.8,size.y*1.25));
 const material=new THREE.ShaderMaterial({transparent:true,depthTest:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
  uniforms:{tint:{value:new THREE.Color('#ffbc58')},strength:{value:0}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(0.,0.,0.,1.);p.xy+=position.xy;gl_Position=projectionMatrix*p;}',
  fragmentShader:'varying vec2 vUv;uniform vec3 tint;uniform float strength;void main(){float r=length((vUv-.5)*2.);gl_FragColor=vec4(tint,pow(max(0.,1.-r),2.5)*strength);}'
 });
 const halo=new THREE.Mesh(geometry,material);halo.name='Soft local flame halo';halo.userData.nestOverhead=true;halo.raycast=()=>{};group.add(halo);
 function setMode(mode:NestTime){const night=mode==='night';for(const copy of copies.values())copy.emissiveIntensity=night?1.55:.38;light.intensity=night?2.1:.3;material.uniforms.strength.value=night?.20:.055;}
 setMode('day');let disposed=false;
 return {setMode,light,halo,dispose(){if(disposed)return;disposed=true;actor.remove(group);for(const {mesh,original} of changed)mesh.material=original;for(const copy of copies.values())copy.dispose();geometry.dispose();material.dispose();}};
}
