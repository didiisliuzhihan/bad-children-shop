import * as THREE from 'three';
import {eligibleMoments,eventEnvelope,idlePose} from './nestLifeRules.mjs';
import type {HomePlacement} from './communityTypes';
import type {NestMoment,NestTrace} from './nestLifeTypes';

export function createNestLifeVisuals(scene:THREE.Scene){
 const group=new THREE.Group();group.name='Small moments at home';scene.add(group);
 const geometry:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[];
 const clay=(color:string)=>{const m=new THREE.MeshStandardMaterial({color,roughness:.52,metalness:0});materials.push(m);return m;};
 const ceramic=clay('#d7b99b'),tea=clay('#8d543a'),paper=clay('#fff0d1'),cover=clay('#628e87');
 function mesh(g:THREE.BufferGeometry,m:THREE.Material,parent:THREE.Object3D){geometry.push(g);const o=new THREE.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function cup(parent:THREE.Object3D,x=0){
  const g=new THREE.Group();parent.add(g);g.position.x=x;
  mesh(new THREE.LatheGeometry([new THREE.Vector2(.09,.025),new THREE.Vector2(.14,.045),new THREE.Vector2(.145,.23),new THREE.Vector2(.12,.24),new THREE.Vector2(.115,.07)],20),ceramic,g);
  const liquid=mesh(new THREE.CircleGeometry(.114,24),tea,g);liquid.rotation.x=-Math.PI/2;liquid.position.y=.21;
  const handle=mesh(new THREE.TorusGeometry(.067,.024,8,18),ceramic,g);handle.position.set(.16,.14,0);
 }
 const props=new THREE.Group();group.add(props);let propKey='';
 const steamMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
  uniforms:{opacity:{value:.13}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(0.,0.,0.,1.);p.xy+=position.xy;gl_Position=projectionMatrix*p;}',
  fragmentShader:'varying vec2 vUv;uniform float opacity;void main(){vec2 p=(vUv-.5)*2.;float a=pow(max(0.,1.-dot(p,p)),2.);gl_FragColor=vec4(.96,.95,.90,a*opacity);}' });materials.push(steamMaterial);
 const steamGeometry=new THREE.PlaneGeometry(.48,.75);geometry.push(steamGeometry);
 const steam=Array.from({length:8},()=>{const s=new THREE.Mesh(steamGeometry,steamMaterial);group.add(s);s.castShadow=false;return s;});
 const drinkSteam=Array.from({length:3},()=>{const s=new THREE.Mesh(steamGeometry,steamMaterial);group.add(s);return s;});
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let start=0,momentId='',lastTime=0;
 function update(time:number,actors:Map<string,THREE.Group>,placements:HomePlacement[],editing:boolean,moment?:NestMoment|null,trace?:NestTrace|null){
  lastTime=time;const direction=moment&&eligibleMoments(placements).find(e=>e.id===moment.kind);
  if(momentId!==(moment?.id||'')){momentId=moment?.id||'';start=time;}
  const elapsed=(time-start)/1000,t=time/1000,amount=!editing&&!reduced.matches&&direction?eventEnvelope(elapsed):0;
  for(const p of placements){const actor=actors.get(p.toyId);if(!actor)continue;const pose=idlePose(p.toyId,t,reduced.matches||editing);
   actor.position.set(p.x,pose.y,p.z);actor.rotation.set(0,p.rotation+pose.turn,pose.roll);
   if(!editing&&direction&&direction.actors.includes(p.toyId)){
    const behavior=(direction as {response?:string}).response;
    const other=placements.find(v=>v.toyId!==p.toyId&&direction.actors.includes(v.toyId));if(other){const target=Math.atan2(other.x-p.x,other.z-p.z),delta=Math.atan2(Math.sin(target-p.rotation),Math.cos(target-p.rotation)),crowReply=(direction.id==='soup'||behavior==='ignore'||behavior==='bicker')&&p.toyId==='tired_crow';const response=crowReply&&!reduced.matches?(behavior==='bicker'&&elapsed>6?amount*.3:-eventEnvelope(elapsed-1.4)*.45):amount;actor.rotation.y+=THREE.MathUtils.clamp(delta,-.45,.45)*response;}
    if(!reduced.matches&&behavior==='celebrate'){actor.rotation.z+=Math.sin(elapsed*3)*amount*.035;actor.position.y+=Math.max(0,Math.sin(elapsed*3))*amount*.026;}
    if(behavior==='soften'){actor.rotation.z*=1-amount*.75;actor.rotation.y-=pose.turn*amount*.75;}
   }
  }
  const simmer=!editing&&(Math.sin(t*.21)>.05||(direction?.id==='soup'&&elapsed<5));
  steam.forEach((s,i)=>{const q=(t*.16+i/8)%1;s.visible=simmer&&!reduced.matches;s.position.set(-3.5+Math.sin(q*5+i)*.12+(i%2)*.62,2.65+q*1.15,3.55);s.scale.setScalar(.35+q*.9);});
  const validTrace=trace&&placements.some(p=>p.toyId===trace.toyId)&&Date.parse(trace.until)>Date.now()?trace:null;
  const prop=direction&&elapsed>4?{kind:direction.prop,toyId:direction.speaker}:validTrace;
  const key=!editing&&prop?prop.kind+':'+prop.toyId:'';
  if(key!==propKey){propKey=key;props.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const index=geometry.indexOf(o.geometry);if(index>=0)geometry.splice(index,1);}});props.clear();if(prop&&key){
   if(prop.kind==='book'){const binding=mesh(new THREE.BoxGeometry(.52,.045,.34),cover,props);binding.position.y=.035;for(const x of [-.125,.125]){const page=mesh(new THREE.BoxGeometry(.24,.036,.30),paper,props);page.position.set(x,.072,0);page.rotation.z=x<0?.12:-.12;}}
   else if(prop.kind==='memo'){const note=mesh(new THREE.BoxGeometry(.40,.018,.29),paper,props);note.position.y=.025;note.rotation.y=-.18;}
   else if(prop.kind==='gift'){const parcel=mesh(new THREE.BoxGeometry(.31,.20,.28),paper,props);parcel.position.y=.11;const ribbon=mesh(new THREE.BoxGeometry(.045,.205,.285),cover,props);ribbon.position.y=.11;const band=mesh(new THREE.BoxGeometry(.315,.207,.045),cover,props);band.position.y=.11;}
   else {cup(props,prop.kind==='cups'?-.21:0);if(prop.kind==='cups')cup(props,.21);}
  }}
  if(prop&&key){const owner=placements.find(p=>p.toyId===prop.toyId);if(owner)props.position.set(owner.x,.025,owner.z+.67);}props.visible=!!key;
  drinkSteam.forEach((s,i)=>{const q=(t*.25+i/3)%1;s.visible=!!key&&['cup','cups'].includes(prop?.kind||'')&&!reduced.matches;s.position.copy(props.position).add(new THREE.Vector3(Math.sin(q*4)*.025,.25+q*.4,0));s.scale.setScalar(.12+q*.25);});
  return {elapsed,speaker:!editing&&direction&&elapsed>=6?direction.speaker:null,line:direction?.line||'',pulse:editing||reduced.matches?1:1+Math.sin(t*2.1)*.035+Math.sin(t*5.7)*.015};
 }
 return {update,photoProps:()=>props.visible?props:undefined,elapsed:()=>momentId?(lastTime-start)/1000:0,dispose(){scene.remove(group);geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
