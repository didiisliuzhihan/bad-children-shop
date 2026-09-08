import * as THREE from 'three';
import {frameNestCamera} from './nestSceneGeometry.ts';
import {canvasBlob} from './postcardMedia.ts';
import {frameNestStoryCamera} from './nestStoryCamera.ts';
export type CapturedNestPhoto={blob:Blob;createdAt:string;timeOfDay:'day'|'night';residentIds:string[]};

/** One square render, synchronously copied before the WebGL drawing buffer clears.
 * Neither preserveDrawingBuffer nor a second WebGL context is needed. The camera,
 * pixel ratio, live canvas size and selection always return to their prior state.
 */
export async function captureNestPhoto(renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.OrthographicCamera,selection:THREE.Object3D,timeOfDay:'day'|'night',options:{focus?:THREE.Box3;format?:'image/png'|'image/jpeg'}={}){
 const output=document.createElement('canvas');output.width=960;output.height=960;
 const ctx=output.getContext('2d');if(!ctx)throw Error('暂时无法拍照，请再试一次。');
 const size=renderer.getSize(new THREE.Vector2()),ratio=renderer.getPixelRatio(),photoCamera=camera.clone(),selected=selection.visible;
 try{
  selection.visible=false;renderer.setPixelRatio(1);renderer.setSize(960,960,false);if(options.focus)frameNestStoryCamera(photoCamera,options.focus);else frameNestCamera(photoCamera,960,960);scene.updateMatrixWorld(true);if(renderer.shadowMap)renderer.shadowMap.needsUpdate=true;renderer.render(scene,photoCamera);
  ctx.fillStyle=timeOfDay==='night'?'#263447':'#d6e4e6';ctx.fillRect(0,0,960,960);ctx.drawImage(renderer.domElement,0,0,960,960);
 }finally{
  selection.visible=selected;renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);renderer.render(scene,camera);
 }
 return canvasBlob(output,options.format||'image/jpeg');
}
