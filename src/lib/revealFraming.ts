import * as THREE from 'three';

/** All new GLBs use the established reveal height, including hats/held props.
 * The first two original assets were authored directly in reveal coordinates. */
export function normalizeRevealModel(source:THREE.Object3D,toyId:string){
 const clone=source.clone(true);
 if(toyId==='jimao'||toyId==='kuku_sunflower')return clone;
 clone.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(clone),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 if(bounds.isEmpty()||!Number.isFinite(size.y)||size.y<=0)return clone;
 const fitted=new THREE.Group(),scale=2.12/size.y;
 // A wrapper preserves any source root transforms and the shared GLTF cache.
 fitted.add(clone);fitted.scale.setScalar(scale);
 fitted.position.set(-center.x*scale,1-center.y*scale,-center.z*scale);
 fitted.updateMatrixWorld(true);return fitted;
}

/** Covers the full opening spin, bob and growth, without fitting on every frame. */
export function revealMotionBounds(model:THREE.Object3D,toyId:string){
 const bounds=new THREE.Box3().setFromObject(model);
 if(bounds.isEmpty())return new THREE.Box3(new THREE.Vector3(-1.1,-.65,-1.1),new THREE.Vector3(1.1,1.7,1.1));
 const boost=toyId==='jimao'?1.25:1;
 const r=Math.hypot(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x)),Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z)))*boost;
 return new THREE.Box3(new THREE.Vector3(-r,Math.min(0,bounds.min.y*boost)-.576,-r),new THREE.Vector3(r,Math.max(0,bounds.max.y*boost)-.404,r));
}

export function frameRevealCamera(camera:THREE.PerspectiveCamera,width:number,height:number,bounds?:THREE.Box3){
 camera.aspect=Math.max(.01,width/Math.max(1,height));camera.fov=32;
 const target=new THREE.Vector3(0,.45,0),direction=new THREE.Vector3(.1,.65,5.7).normalize();
 const right=new THREE.Vector3(0,1,0).cross(direction).normalize(),up=direction.clone().cross(right);
 const vertical=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),horizontal=vertical*camera.aspect;
 // Keep the established distance wherever it fits. Only narrow viewports or
 // unusually wide silhouettes pull back; sealed shells retain their framing.
 let distance=new THREE.Vector3(.1,.65,5.7).length();
 if(bounds)for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
  const p=new THREE.Vector3(x,y,z).sub(target),depth=p.dot(direction);
  distance=Math.max(distance,depth+Math.abs(p.dot(right))/(horizontal*.89),depth+Math.abs(p.dot(up))/(vertical*.89));
 }
 camera.position.copy(target).addScaledVector(direction,distance);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}
