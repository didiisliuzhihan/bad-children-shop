// Test-only GLB geometry decoder. No textures, browser, renderer or account access.
import fs from 'node:fs';
import draco from 'draco3dgltf';
import * as THREE from 'three';
export async function gltfRayMeshes(file){
 const bytes=fs.readFileSync(file),jsonLength=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+jsonLength)),binary=bytes.subarray(28+jsonLength);
 const module=await draco.createDecoderModule({}),geometries=[];
 for(const mesh of gltf.meshes){const primitives=[];for(const primitive of mesh.primitives){
  const extension=primitive.extensions.KHR_draco_mesh_compression,view=gltf.bufferViews[extension.bufferView],compressed=binary.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
  const decoder=new module.Decoder(),input=new module.DecoderBuffer(),decoded=new module.Mesh();input.Init(new Int8Array(compressed),compressed.length);
  const status=decoder.DecodeBufferToMesh(input,decoded);if(!status.ok())throw Error(status.error_msg());
  const attribute=decoder.GetAttributeByUniqueId(decoded,extension.attributes.POSITION),values=new module.DracoFloat32Array();decoder.GetAttributeFloatForAllPoints(decoded,attribute,values);
  const vertices=new Float32Array(decoded.num_points()*3);for(let i=0;i<vertices.length;i++)vertices[i]=values.GetValue(i);
  const faces=new Uint32Array(decoded.num_faces()*3),face=new module.DracoInt32Array();for(let i=0;i<decoded.num_faces();i++){decoder.GetFaceFromMesh(decoded,i,face);for(let j=0;j<3;j++)faces[i*3+j]=face.GetValue(j);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(vertices,3));geometry.setIndex(new THREE.BufferAttribute(faces,1));
  primitives.push({geometry,side:gltf.materials?.[primitive.material]?.doubleSided?THREE.DoubleSide:THREE.FrontSide});
  for(const object of [face,values,decoded,input,decoder])module.destroy(object);
 }geometries.push(primitives);}
 const nodes=gltf.nodes.map(node=>{
  const group=new THREE.Group();group.name=node.name||'';group.userData={...node.extras};
  if(node.matrix)group.applyMatrix4(new THREE.Matrix4().fromArray(node.matrix));else{if(node.translation)group.position.fromArray(node.translation);if(node.rotation)group.quaternion.fromArray(node.rotation);if(node.scale)group.scale.fromArray(node.scale);}
  if(node.mesh!==undefined)for(const primitive of geometries[node.mesh]){const mesh=new THREE.Mesh(primitive.geometry,new THREE.MeshBasicMaterial({side:primitive.side}));mesh.name=group.name.replaceAll(' ','_');mesh.userData={...node.extras};group.add(mesh);}return group;
 });
 gltf.nodes.forEach((node,i)=>{for(const child of node.children||[])nodes[i].add(nodes[child]);});
 const scene=new THREE.Group();for(const root of gltf.scenes[gltf.scene||0].nodes)scene.add(nodes[root]);scene.updateMatrixWorld(true);return scene;
}
