import * as THREE from 'three';
import {lifeDirection} from './nestLifeRules.mjs';

/** Bounds of the actual actors/props in this event, not the entire room. */
export function nestStoryBounds(kind:string,actors:Map<string,THREE.Object3D>,prop?:THREE.Object3D){
 const direction=lifeDirection(kind);if(!direction)throw Error('这个故事暂时没有可拍摄的角色。');
 const bounds=new THREE.Box3();
 for(const id of direction.actors){
  const actor=actors.get(id);if(!actor||!actor.visible)throw Error('故事里的小住客还没到齐。');
  const box=new THREE.Box3().setFromObject(actor);if(box.isEmpty())throw Error('小住客的模型还没准备好。');bounds.union(box);
 }
 if(prop?.visible)bounds.union(new THREE.Box3().setFromObject(prop));
 if(![...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite))throw Error('这一刻暂时无法取景。');
 return bounds;
}

/** Keep the familiar viewing direction, but frame the participating characters.
 * The caller gives us a cloned camera; no live camera or actor is repositioned.
 */
export function frameNestStoryCamera(camera:THREE.OrthographicCamera,bounds:THREE.Box3){
 if(bounds.isEmpty())throw Error('这一刻暂时无法取景。');
 camera.updateMatrixWorld(true);const projected=new THREE.Box3();
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])projected.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
 const center=projected.getCenter(new THREE.Vector3()),size=projected.getSize(new THREE.Vector3());
 const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
 camera.position.addScaledVector(right,center.x).addScaledVector(up,center.y);
 const half=Math.max(1.55,size.x/2,size.y/2)*1.18;
 camera.left=-half;camera.right=half;camera.top=half;camera.bottom=-half;camera.zoom=1;
 camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
}
