/* Original decorative 3D model, not a research simulation or a hardware CAD model. */
import * as T from 'three';
import {RoomEnvironment} from './vendor/three/examples/jsm/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from './vendor/three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const timing={width:1440,height:640,fps:60,duration:10,contact:.70,pickup_start:.85,pickup_end:1.45,
  explosion_start:1.70,explosion_peak:2.70,orbit_start:2.75,orbit_end:7.50,camera_sweep_degrees:-68,
  assembly_start:6.35,assembled:7.30,release:7.43,settled:9.88,movement_end:9.80,name_duration:1.70};
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=(a,b,t)=>{const x=clamp((t-a)/(b-a));return x*x*x*(10+x*(-15+6*x));};
const cruise=(a,b,t,r=.12)=>{
  const x=clamp((t-a)/(b-a));
  const enter=n=>{const q=n/r;return r*(q*q*q-.5*q*q*q*q)/(1-r);};
  return x<r?enter(x):x>1-r?1-enter(1-x):(x-r*.5)/(1-r);
};
const vec=(x,y,z=0)=>new T.Vector3(x,y,z),Y=vec(0,1,0);
export function motion(t){
  const contact=ease(0,timing.contact,t),lift=ease(timing.pickup_start,timing.pickup_end,t);
  const carry=ease(timing.assembled-.28,timing.movement_end,t),rise=ease(timing.assembled-.28,9.58,t);
  const wrist=vec(1.50-.55*carry,2.10+.65*(1-contact)+.44*lift+.32*rise);
  const shoulder=vec(-1.45,.82),delta=wrist.clone().sub(shoulder),d=delta.length();
  const lengthA=2.05,lengthB=2.28,along=(d*d+lengthA**2-lengthB**2)/(2*d);
  const normal=vec(-delta.y,delta.x).normalize();
  const elbow=shoulder.clone().addScaledVector(delta,along/d)
    .addScaledVector(normal,Math.sqrt(Math.max(0,lengthA**2-along**2)));
  const part=vec(1.50-.55*carry,1.39+.44*lift+.32*rise);
  const opened=cruise(timing.explosion_start,timing.explosion_peak,t)*(1-ease(timing.assembly_start,timing.assembled,t));
  const orbit=cruise(timing.orbit_start,timing.orbit_end,t,.22)*timing.camera_sweep_degrees*Math.PI/180;
  return {shoulder,elbow,wrist,part,opened,orbit,gap:.26+.16*(1-contact),carry};
}

export async function createArmFilm({live=false}={}){
  const {width,height}=timing;
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:!live,alpha:live});
  renderer.setSize(width,height);renderer.setPixelRatio(1);
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  if(!live)document.body.appendChild(renderer.domElement);
  const scene=new T.Scene();scene.background=live?null:new T.Color('white');
  const camera=new T.PerspectiveCamera(30,width/height,.1,80);
  camera.setViewOffset(width,height,-100,0,width,height);
  const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);
  scene.environment=pmrem.fromScene(room,.05).texture;scene.environmentIntensity=.75;
  room.dispose();pmrem.dispose();
  scene.add(new T.HemisphereLight(0xeaf5ff,0xc6bba8,1.0));
  const key=new T.DirectionalLight(0xfff4e9,3.2);key.position.set(-3,9,5);key.castShadow=true;
  key.shadow.mapSize.set(live?1024:2048,live?1024:2048);Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:20});
  key.shadow.bias=-.0005;key.shadow.normalBias=.025;key.shadow.radius=3;scene.add(key);
  const rim=new T.DirectionalLight(0xc4e9f2,2.8);rim.position.set(4,4,-4);scene.add(rim);
  const fill=new T.DirectionalLight(0xffffff,.75);fill.position.set(1,2,6);scene.add(fill);
  // Subpixel, object-bound machining grain: mipmaps keep it stable in motion.
  const grainBytes=new Uint8Array(128*128*4);
  let seed=423;
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const value=Math.round(205+20*Math.sin(x*2.7)+((seed>>>24)/255-.5)*12),i=(y*128+x)*4;
    grainBytes[i]=grainBytes[i+1]=grainBytes[i+2]=value;grainBytes[i+3]=255;
  }
  const brushed=new T.DataTexture(grainBytes,128,128);brushed.wrapS=brushed.wrapT=T.RepeatWrapping;
  brushed.generateMipmaps=true;brushed.minFilter=T.LinearMipmapLinearFilter;brushed.magFilter=T.LinearFilter;
  brushed.repeat.set(3,1);brushed.needsUpdate=true;
  const materials={
    shell:new T.MeshPhysicalMaterial({color:0x8c9f98,metalness:.82,roughness:.32,clearcoat:.20,clearcoatRoughness:.25}),
    panel:new T.MeshPhysicalMaterial({color:0xb8c8be,metalness:.72,roughness:.28,clearcoat:.30,clearcoatRoughness:.22}),
    core:new T.MeshStandardMaterial({color:0x203333,metalness:.78,roughness:.38,roughnessMap:brushed}),
    rubber:new T.MeshStandardMaterial({color:0x162325,metalness:.05,roughness:.7}),
    steel:new T.MeshPhysicalMaterial({color:0xaebdc3,metalness:.95,roughness:.34,roughnessMap:brushed,bumpMap:brushed,bumpScale:.002,anisotropy:.55}),
    copper:new T.MeshPhysicalMaterial({color:0xae7248,metalness:.88,roughness:.30,roughnessMap:brushed,clearcoat:.18}),
  };
  const pieces=[],staticMeshes=[];
  const box=(x,y,z,r=.03)=>new RoundedBoxGeometry(x,y,z,3,r);
  const cylinder=(r,h,segments=64)=>new T.CylinderGeometry(r,r,h,segments);
  const ring=(r,inner,depth)=>{
    const s=new T.Shape();s.absarc(0,0,r,0,Math.PI*2,false);
    const hole=new T.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);s.holes.push(hole);
    const g=new T.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.008,bevelThickness:.008,curveSegments:48});
    g.translate(0,0,-depth/2);return g;
  };
  function mesh(geometry,material){const m=new T.Mesh(geometry,materials[material]);m.castShadow=true;m.receiveShadow=true;return m;}
  function part(name,geometry,material,place,offset,rotation=vec()){
    const m=mesh(geometry,material);scene.add(m);
    pieces.push({name,mesh:m,place,offset:vec(...offset).multiply(vec(1.12,1.08,1.40)),rotation});return m;
  }
  const at=(position,rotation)=>m=>{m.position.copy(position);m.rotation.set(...(rotation||[0,0,0]));};
  const fixed=(name,geometry,material,position,rotation)=>{const m=mesh(geometry,material);at(position,rotation)(m);scene.add(m);staticMeshes.push(m);return m;};
  const foot=vec(-1.45,.12);
  part('base plate',box(1.16,.18,.95,.06),'core',at(foot),[-.32,-.02,0]);
  part('turntable',cylinder(.40,.22),'steel',at(vec(-1.45,.32)),[-.32,.20,0]);
  part('base motor',cylinder(.33,.42),'shell',at(vec(-1.45,.62)),[-.32,.46,0]);
  part('base trim',cylinder(.345,.045),'copper',at(vec(-1.45,.41)),[-.32,.30,0]);
  for(const x of [-.43,.43])for(const z of [-.34,.34])
    part('mounting bolt',cylinder(.045,.07,6),'steel',at(vec(-1.45+x,.24,z)),[-.32+x*.4,.06,z*.6]);

  function joint(name,get,r,shift){
    part(name+' drive',cylinder(r,.40),'core',(m,s)=>{m.position.copy(get(s));m.rotation.set(Math.PI/2,0,0);},shift);
    for(const side of [-1,1]){
      const place=(z,rotate=false)=>(m,s)=>{m.position.copy(get(s)).add(vec(0,0,side*z));m.rotation.set(rotate?Math.PI/2:0,0,0);};
      const spread=z=>[shift[0],shift[1],side*z];
      part(name+' bearing',ring(r*.85,r*.57,.075),'steel',place(.245),spread(.56));
      part(name+' casing',cylinder(r*.72,.09),'shell',place(.30,true),spread(.86));
      part(name+' hub',cylinder(r*.43,.06),'copper',place(.36,true),spread(1.06));
      part(name+' shaft',cylinder(r*.20,.08),'core',place(.40,true),spread(1.25));
      for(let i=0;i<4;i++){
        const angle=(i+.5)*Math.PI/2,radial=vec(Math.cos(angle)*r*.58,Math.sin(angle)*r*.58,side*.36);
        part(name+' screw '+side+' '+i,cylinder(.025,.05,6),'steel',(m,s)=>{
          m.position.copy(get(s)).add(radial);m.rotation.set(Math.PI/2,0,0);
        },[shift[0]+radial.x*.5,shift[1]+radial.y*.5,side*1.12]);
      }
    }
  }
  joint('shoulder',s=>s.shoulder,.34,[-.60,.42,0]);
  joint('elbow',s=>s.elbow,.29,[-.35,.65,0]);
  joint('wrist',s=>s.wrist,.23,[.65,.35,0]);

  function link(name,getA,getB,length,width,offset){
    const place=z=>(m,s)=>{
      const a=getA(s),b=getB(s);m.position.copy(a).lerp(b,.5);m.position.z=z;
      m.quaternion.setFromUnitVectors(Y,b.clone().sub(a).normalize());
    };
    part(name+' chassis',box(width*.70,length-.14,.22,.08),'core',place(0),offset);
    for(const side of [-1,1]){
      part(name+' shell '+side,box(width,length-.18,.10,.07),'shell',place(side*.17),[offset[0],offset[1],side*.64]);
      part(name+' inset '+side,box(width*.60,length-.55,.035,.025),'panel',place(side*.23),[offset[0],offset[1],side*.85]);
      part(name+' rail '+side,box(.028,length-.62,.025,.01),'copper',(m,s)=>{
        place(side*.255)(m,s);m.translateX(width*.32);
      },[offset[0],offset[1],side*1.04]);
    }
  }
  link('upper arm',s=>s.shoulder,s=>s.elbow,2.05,.40,[-.70,.45,0]);
  link('forearm',s=>s.elbow,s=>s.wrist,2.28,.34,[.30,.75,0]);
  // Flexible service loops retain depth and are grouped with their housing.
  for(const [name,start,end,offset] of [
    ['upper service loom',s=>s.shoulder,s=>s.elbow,[-.55,.42,-.60]],
    ['forearm service loom',s=>s.elbow,s=>s.wrist,[.20,.62,-.60]]
  ]){
    const unit=new T.CubicBezierCurve3(vec(0,0),vec(-.25,.25),vec(-.25,.75),vec(0,1));
    part(name,new T.TubeGeometry(unit,48,.035,10,false),'rubber',(m,s)=>{
      const a=start(s),b=end(s);m.position.copy(a).add(vec(0,0,-.28));
      m.scale.set(1,a.distanceTo(b),1);m.quaternion.setFromUnitVectors(Y,b.clone().sub(a).normalize());
    },offset);
  }
  const wristAt=(offset,rot)=>(m,s)=>{m.position.copy(s.wrist).add(offset);m.rotation.set(...(rot||[0,0,0]));};
  part('gripper flange',box(.40,.23,.38),'steel',wristAt(vec(0,-.12)),[.70,.04,0]);
  part('gripper body',box(.84,.25,.39,.05),'core',wristAt(vec(0,-.29)),[.90,-.20,0]);
  part('gripper cover',box(.73,.17,.05),'shell',wristAt(vec(0,-.30,.23)),[.90,-.20,.60]);
  part('linear guide',box(.76,.06,.20,.015),'steel',wristAt(vec(0,-.45)),[.90,-.50,0]);
  for(const side of [-1,1]){
    const jaw=(x,y,z=0)=>(m,s)=>{m.position.copy(s.wrist).add(vec(side*(s.gap+x),y,z));m.rotation.set(0,0,0);};
    part('jaw carriage '+side,box(.18,.12,.29),'shell',jaw(.04,-.45),[side*.70+.65,-.55,side*.20]);
    part('jaw finger '+side,box(.105,.36,.21,.016),'steel',jaw(.05,-.63),[side*.85+.65,-.85,side*.30]);
    part('gripping pad '+side,box(.035,.15,.15,.009),'rubber',jaw(-.015,-.72),[side*.98+.65,-.85,side*.45]);
  }
  const workpiece=fixed('bushing',ring(.25,.115,.20),'copper',vec(1.5,1.39));
  const collar=fixed('bushing rim',ring(.255,.12,.025),'steel',vec(1.5,1.39,.11));
  // The V cradle is stationary; it remains visible below the lifted load.
  fixed('fixture plate',box(.85,.10,.66),'shell',vec(1.5,.08));
  fixed('fixture pedestal',box(.30,.84,.32),'core',vec(1.5,.54));
  for(const side of [-1,1])fixed('fixture face',box(.30,.21,.42),'steel',vec(1.5+side*.14,1.06),[0,0,side*Math.PI/6]);
  const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({opacity:.055}));
  floor.rotation.x=-Math.PI/2;floor.position.y=.015;floor.receiveShadow=true;scene.add(floor);

  const tempQuat=new T.Quaternion();
  const output=document.createElement('canvas');output.width=width;output.height=height;
  const pen=output.getContext('2d');
  function render(t,encode=false){
    const s=motion(t);
    for(const p of pieces){
      p.place(p.mesh,s);p.mesh.position.addScaledVector(p.offset,s.opened);
      tempQuat.setFromEuler(new T.Euler(p.rotation.x*s.opened,p.rotation.y*s.opened,p.rotation.z*s.opened));
      p.mesh.quaternion.multiply(tempQuat);
    }
    workpiece.position.copy(s.part);collar.position.copy(s.part).add(vec(0,0,.115));
    const wide=ease(1.45,2.70,t)*(1-ease(timing.assembly_start-.20,timing.release+.10,t));
    const closing=ease(6.90,9.80,t);
    const turn=cruise(timing.orbit_start,timing.orbit_end,t,.22);
    // Follow the nearer base as the viewpoint changes, keeping the larger
    // model fully framed instead of cropping its feet during the handoff.
    const target=vec(.05+.22*closing,1.68+.12*closing-.60*turn);
    const radius=7.5+3.4*wide+.25*closing+.32*turn,azimuth=.34+s.orbit;
    const elevation=.22+.045*Math.sin(Math.PI*turn)**2;
    camera.position.copy(target).add(vec(Math.sin(azimuth)*radius,Math.sin(elevation)*radius,Math.cos(azimuth)*radius));
    camera.lookAt(target);camera.updateMatrixWorld();renderer.render(scene,camera);
    // Keep the name legible without flattening the dimensional model early.
    const retreat=ease(timing.release,timing.settled-.20,t)*.48;
    if(live)renderer.domElement.style.opacity=1-retreat;
    else{
      pen.fillStyle='#fff';pen.fillRect(0,0,width,height);pen.drawImage(renderer.domElement,0,0);
      pen.fillStyle=`rgba(255,255,255,${retreat})`;pen.fillRect(0,0,width,height);
    }
    const screen=s.part.clone().project(camera);
    const tangent=s.part.clone().add(vec(.25,0,0)).project(camera);
    const pose=[(screen.x+1)*width/2,(1-screen.y)*height/2,
      Math.hypot((tangent.x-screen.x)*width/2,(tangent.y-screen.y)*height/2)];
    return {pose,opened:s.opened,orbit:s.orbit,pieces:pieces.length,
      image:encode?output.toDataURL('image/png'):undefined};
  }
  await renderer.compileAsync(scene,camera);
  render(0);
  function inkMarks(){
    const {pose:[x,y,r]}=render(timing.release),data=pen.getImageData(0,0,width,height).data,cuts=[];
    for(let py=Math.max(0,Math.floor(y-r*1.89));py<Math.min(height,y+r*1.04);py+=2)
      for(let px=Math.max(0,Math.floor(x-r*1.4));px<Math.min(width,x+r*1.4);px+=2){
        if(data[(py*width+px)*4+1]<215)cuts.push([Math.round((px-x)/r*1000),Math.round((py-y)/r*1000)]);
      }
    if(cuts.length<384)throw Error('Not enough tool-surface samples for the signature');
    return Array.from({length:384},(_,i)=>cuts[Math.floor(i*cuts.length/384)]);
  }
  function bounds(){
    let left=Infinity,right=-Infinity,top=-Infinity,bottom=Infinity;
    for(const {mesh} of pieces){
      mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;
      for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
        const v=vec(x,y,z).applyMatrix4(mesh.matrixWorld).project(camera);
        left=Math.min(left,v.x);right=Math.max(right,v.x);top=Math.max(top,v.y);bottom=Math.min(bottom,v.y);
      }
    }
    return {left,right,top,bottom};
  }
  function theme(dark){
    // The model keeps its materials in dark mode; only the studio light changes.
    scene.environmentIntensity=dark?.65:.75;key.intensity=dark?2.6:3.2;fill.intensity=dark?.5:.75;
  }
  return {render,timing,inkMarks,bounds,theme,canvas:output,renderer,scene,camera,pieces};
}
