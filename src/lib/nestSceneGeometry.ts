import * as THREE from 'three';
import {RESIDENT_BASE_RADIUS,RESIDENT_SCALE} from './nestPlacement.mjs';
/** Shared world; source geometry/materials remain unchanged. */
export function normalizeResident(source:THREE.Object3D,toyId:string){
 const clone=source.clone(true),group=new THREE.Group();group.name='resident-'+toyId;group.userData.toyId=toyId;group.add(clone);
 clone.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(clone),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 if(box.isEmpty()||!Number.isFinite(size.length())||size.y<=0)throw Error('Empty model bounds');
 const heights:Record<string,number>={jimao:1.6,kuku_sunflower:1.95,stressed_jimao:2.1,miss_popcorn:2,tired_crow:1.9};
 // Apply 1.5× after the original fit, including wide toys whose footprint is the limit.
 const scale=Math.min((heights[toyId]||1.9)/size.y,(RESIDENT_BASE_RADIUS*2-.08)/Math.hypot(size.x,size.z))*RESIDENT_SCALE;
 clone.scale.multiplyScalar(scale);clone.position.multiplyScalar(scale);clone.position.sub(new THREE.Vector3(center.x*scale,box.min.y*scale,center.z*scale));
 clone.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.isMesh){mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.toyId=toyId;}});
 group.updateMatrixWorld(true);return group;
}
export const roomBounds=new THREE.Box3(new THREE.Vector3(-5.25,-1.8,-5.25),new THREE.Vector3(5.25,8.65,5.25));
export function frameNestCamera(camera:THREE.OrthographicCamera,width:number,height:number){
 const center=roomBounds.getCenter(new THREE.Vector3());camera.position.copy(center).add(new THREE.Vector3(12,9,12));camera.lookAt(center);camera.updateMatrixWorld(true);
 let maxX=0,maxY=0;for(const x of [roomBounds.min.x,roomBounds.max.x])for(const y of [roomBounds.min.y,roomBounds.max.y])for(const z of [roomBounds.min.z,roomBounds.max.z]){const p=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);maxX=Math.max(maxX,Math.abs(p.x));maxY=Math.max(maxY,Math.abs(p.y));}
 const aspect=Math.max(.1,width/Math.max(1,height)),halfHeight=Math.max(maxY,maxX/aspect)*1.065;
 camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.near=.1;camera.far=100;camera.updateProjectionMatrix();
}
export function floorPoint(raycaster:THREE.Raycaster,camera:THREE.Camera,rect:{left:number;top:number;width:number;height:number},clientX:number,clientY:number){
 if(!rect.width||!rect.height)return null;const pointer=new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());
}
