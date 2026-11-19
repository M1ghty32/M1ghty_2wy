import * as T from 'three';
import { OrbitControls } from '../vendor/three-addons/controls/OrbitControls.js';

const stage = document.querySelector('#stage');
const status = document.querySelector('#status');
const walk = document.body.hasAttribute('data-walk');
try { buildStreet(); } catch (error) {
  console.error(error);
  status.textContent = '三维场景加载失败，请使用支持 WebGL 的浏览器。';
}

function buildStreet() {
  const renderer = new T.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.19;
  stage.append(renderer.domElement);
  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0x414c67, .0045);
  scene.background = new T.Color(0x414c67);
  const camera = new T.PerspectiveCamera(39,1,.08,160);
  const orbit = new OrbitControls(camera,renderer.domElement);
  orbit.enabled = !walk;
  orbit.enablePan = false;
  orbit.minDistance = 7;
  orbit.maxDistance = 60;
  orbit.maxPolarAngle = Math.PI * .475;
  scene.add(new T.HemisphereLight(0xb6ccff,0x64647d,1.0));
  const key = new T.DirectionalLight(0xffcd97,1.45);
  key.position.set(-13,19,13);
  key.castShadow = true;
  Object.assign(key.shadow.camera,{left:-18,right:18,top:18,bottom:-18});
  key.shadow.mapSize.set(1024,1024);
  key.shadow.bias = -.001;
  scene.add(key);
  const mats = new Map();
  function material(color) {
    if (!mats.has(color)) mats.set(color,new T.MeshStandardMaterial({color,roughness:.74}));
    return mats.get(color);
  }
  function mesh(geo,mat,x,y,z) {
    const item = new T.Mesh(geo,typeof mat === 'object' ? mat : material(mat));
    item.position.set(x,y,z);
    item.castShadow = item.receiveShadow = true;
    scene.add(item);
    return item;
  }
  const cube = new T.BoxGeometry();
  function box(x,y,z,w,h,d,c) {
    const item = mesh(cube,c,x,y,z);
    item.scale.set(w,h,d);
    return item;
  }
  function post(x,y,z,r,h,c) {return mesh(new T.CylinderGeometry(r,r*1.08,h,10),c,x,y,z);}
  function luminous(color) {return new T.MeshBasicMaterial({color});}
  const ink=0x273e46, teal=0x347c78, ivory=0xead8ab, wood=0x9a6849;
  const amber=luminous(0xffcf7c), cream=luminous(0xffecc5);
  let seed=731;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  function texture(width,height,paint) {
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    paint(canvas.getContext('2d'),width,height);
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
    return map;
  }
  function facade(x,y,z,w,h,map) {
    return mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map}),x,y,z);
  }
  function sign(x,y,z,w,h,title,sub,bg='#f6e6bf',fg='#214b49') {
    const map=texture(768,192,(ctx,W,H)=>{
      ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.strokeStyle=fg;ctx.lineWidth=5;ctx.strokeRect(9,9,W-18,H-18);
      ctx.fillStyle=fg;ctx.textAlign='center';ctx.font='bold 82px Microsoft YaHei, sans-serif';ctx.fillText(title,W/2,109);
      ctx.font='24px monospace';ctx.fillText(sub,W/2,153);
    });
    facade(x,y,z,w,h,map);
  }
  const masonry=texture(256,256,(c,w,h)=>{
    c.fillStyle='#c9bda9';c.fillRect(0,0,w,h);
    for(let row=0;row<16;row++)for(let col=-1;col<8;col++){
      const tone=184+Math.floor(random()*33);
      c.fillStyle='rgb('+tone+','+(tone-8)+','+(tone-24)+')';
      c.fillRect(col*40+(row%2)*20,row*16,39,15);
    }
  });
  const wall=new T.MeshStandardMaterial({map:masonry,roughness:.88});
  const windowMap=texture(512,320,(c,w,h)=>{
    const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#ffdf99');g.addColorStop(1,'#a36a48');c.fillStyle=g;c.fillRect(0,0,w,h);
    for(let row=0;row<3;row++) {
      const y=82+row*92;c.fillStyle='#805840';c.fillRect(12,y,w-24,9);
      for(let x=22;x<w-25;){const bw=6+random()*14,bh=18+random()*39;c.fillStyle=['#c77b55','#e4b86c','#6b9d86','#edd3ac','#677e88'][Math.floor(random()*5)];c.fillRect(x,y-bh,bw,bh);x+=bw+2;}
    }
    c.fillStyle='#fff5cc35';c.beginPath();c.moveTo(64,0);c.lineTo(142,0);c.lineTo(9,260);c.lineTo(0,250);c.fill();
  });
  box(0,-.62,0,24,1.2,17,ink);box(0,-.09,0,24.1,.16,17.1,0x829d99);
  box(0,-1.4,0,1000,.2,1000,0x424661);
  box(0,.1,-2.6,23.8,.26,11.4,0xc2b59c);
  const asphalt=texture(512,256,(c,w,h)=>{
    c.fillStyle='#253644';c.fillRect(0,0,w,h);
    for(let i=0;i<9500;i++){c.fillStyle=random()>.5?'#d5e7dd19':'#061a2633';c.fillRect(random()*w,random()*h,1+random()*4,1);}
  });
  box(0,.1,5.65,23.8,.12,4.95,new T.MeshStandardMaterial({map:asphalt,roughness:.32}));
  box(0,.3,3.05,23.8,.24,.23,0xd9d3b9);
  for(let x=-10;x<12;x+=2.6)box(x,.175,5.6,1.3,.02,.1,ivory);
  for(let z=3.65;z<8;z+=.6)box(6,.18,z,2.7,.025,.28,0xdcd7c6);
  // Recessed shop windows, projecting awnings and a tall civic clock tower.
  const shops=[[-6.7,6,3.1,'潮汐书局','TIDE BOOKS'],[-1.0,4.8,2.8,'深夜邮局','NIGHT POST'],[4.0,4.45,4.75,'建筑工坊','DESIGN ATELIER']];
  for(const [x,w,h,title,sub] of shops){
    box(x,h/2+.25,-1.65,w,h,5,wall);
    box(x,h+.32,-1.65,w+.27,.18,5.25,teal);
    box(x,h+.56,-2.45,w*.42,.37,1.35,0x9ca99c);
    for(let i=0;i<3;i++){
      const wx=x-w*.45+(i+.5)*w*.3;
      box(wx,1.44,.88,w*.29,1.88,.13,ink);
      facade(wx,1.43,.956,w*.255,1.57,windowMap);
      box(wx,1.44,.98,.048,1.67,.05,wood);
    }
    // Shop entrance under a striped canopy, with a brass pull and tiled doorstep.
    const entry=x+w*.31;
    box(entry,1.37,1.005,.83,2.17,.11,wood);
    box(entry,1.56,1.075,.66,1.52,.035,0x547879);
    box(entry+.25,1.2,1.12,.035,.27,.055,ivory);
    box(entry,.31,1.34,1.1,.15,.58,0x8c9892);
    for(let j=0;j<8;j++)box(entry-.48+j*.137,2.47,1.5,.14,.18,.4,j%2?ivory:teal);
    for(let j=0;j<7;j++)box(x+j*.16-.48,h+.63,-1.76,.08,.28,.036,ink);
    const localLight=new T.PointLight(0xffbd72,24,7,2);
    localLight.position.set(x,2.7,1.85);scene.add(localLight);
    box(x,2.55,1.12,w+.22,.12,.86,teal);
    box(x,2.51,1.55,w+.2,.065,.065,amber);
    sign(x,h-.18,.91,w*.88,.67,title,sub);
    if(h>4)for(let i=-1;i<=1;i++)box(x+i*1.13,3.39,.88,.89,.77,.1,0x678a8c);
  }
  box(8.55,3.6,-3.2,2.2,6.8,2.4,0xc88968);
  box(8.55,7.17,-3.2,2.57,.24,2.76,ivory);
  for(let i=0;i<5;i++)box(8.55,1.1+i*.89,-1.97,1.82,.1,.16,ivory);
  for(const x of [7.65,9.45])box(x,3.6,-1.95,.12,6.79,.15,ivory);
  post(8.55,7.62,-3.2,.11,.87,ink);
  const clock=texture(256,256,(c)=>{c.fillStyle='#294949';c.fillRect(0,0,256,256);c.fillStyle='#ffdf9e';c.beginPath();c.arc(128,128,115,0,Math.PI*2);c.fill();c.strokeStyle='#254448';c.lineWidth=8;for(let i=0;i<12;i++){c.save();c.translate(128,128);c.rotate(i*Math.PI/6);c.beginPath();c.moveTo(0,85);c.lineTo(0,102);c.stroke();c.restore();}c.beginPath();c.moveTo(83,104);c.lineTo(128,128);c.lineTo(161,61);c.stroke();});
  facade(8.55,6.06,-1.98,1.63,1.63,clock);
  // Behind the shops, stepped teaching blocks form the skyline.
  for(const [x,z,w,h] of [[-7,-6,5,4.3],[-1,-6.3,4,5.7],[4,-6.25,4.8,3.6]]){
    box(x,h/2+.24,z,w,h,2.6,0xb7bba8);box(x,h+.29,z,w+.2,.17,2.85,ink);
    for(let y=1;y<h-.3;y+=1.18)for(let dx=-w*.34;dx<w*.48;dx+=1.03)box(x+dx,y,z+1.32,.65,.58,.07,random()>.44?amber:0x4d6a74);
  }
  const glowMap=texture(128,128,(c)=>{const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,211,133,.82)');g.addColorStop(.3,'rgba(255,183,99,.34)');g.addColorStop(1,'rgba(255,170,72,0)');c.fillStyle=g;c.fillRect(0,0,128,128);});
  const glow=new T.MeshBasicMaterial({map:glowMap,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
  for(const x of [-9,-3,3,9]){
    post(x,1.98,2.68,.075,3.45,ink);box(x,3.7,2.88,.12,.12,.62,ink);
    box(x,3.64,3.18,.35,.15,.44,cream);
    const pool=mesh(new T.PlaneGeometry(1.7,4.6),glow,x,.205,5.45);pool.rotation.x=-Math.PI/2;pool.castShadow=false;
    for(let i=0;i<2;i++)box(x+.78,.69+i*.17,2.16,1.05,.1,.36,wood);
    for(const offset of [.38,1.16])box(x+offset,.43,2.16,.085,.43,.31,ink);
  }
  // Paving joints, railing and a signal mark the pedestrian crossing.
  for(let x=-11.6;x<12;x+=.84)box(x,.237,2.12,.019,.006,1.72,0x8a908a);
  for(const x of [-10.5,-8.5,-6.5,8.2,10.2])post(x,.69,3.03,.04,.83,ink);
  for(const x of [-9.5,-7.5,9.2])box(x,1,3.03,2.02,.055,.06,teal);
  post(8.1,2.12,2.88,.075,3.75,ink);
  box(7.57,3.92,2.88,1.14,.12,.11,ink);
  box(7.12,3.69,2.88,.82,.34,.28,ink);
  for(let i=0;i<3;i++)mesh(new T.SphereGeometry(.096,10,8),i===2?luminous(0x8bffb2):0x8f6459,6.87+i*.25,3.69,3.026);
  function cable(a,b,sag){
    const mid=a.clone().lerp(b,.5);mid.y-=sag;
    const curve=new T.QuadraticBezierCurve3(a,mid,b);
    scene.add(new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(30)),new T.LineBasicMaterial({color:0x273843})));
  }
  for(const x of [-10.7,0,10.7]){post(x,2.93,1.75,.1,5.4,wood);box(x,5.48,1.75,.22,.14,1.25,ink);}
  for(const z of [1.29,1.75,2.22])for(const x of [-10.7,0])cable(new T.Vector3(x,5.53,z),new T.Vector3(x+10.7,5.53,z),1.15);
  for(const [x,z] of [[-10.6,-4],[7,1.1],[10.6,-5],[-10.7,1.2]]){
    post(x,1.27,z,.16,2.1,wood);
    for(let i=0;i<4;i++){const crown=mesh(new T.IcosahedronGeometry(.85,1),[0x468676,0x5e917b,0x759979,0x4b786a][i],x+Math.cos(i*2)*.35,2.28+i*.28,z+Math.sin(i*2)*.3);crown.scale.set(1.18,.79,1);}
  }
  // Vending kiosks and bicycle racks give the shopfront a human scale.
  for(const x of [-3.5,6.55]){box(x,1.07,1.14,.67,1.62,.52,teal);facade(x,1.23,1.412,.51,.87,windowMap);box(x,.61,1.42,.34,.12,.026,ink);}
  for(const x of [-8,-6.9]) {
    for(const dx of [-.36,.36])mesh(new T.TorusGeometry(.27,.032,7,22),ink,x+dx,.53,1.7);
    for(const [dx,tilt] of [[-.17,-.67],[.16,.68]]){const bar=box(x+dx,.73,1.7,.05,.56,.05,teal);bar.rotation.z=tilt;}
    box(x,.98,1.7,.24,.07,.12,wood);
  }
  const shots=[[16,14,26,0,1.7,0],[-8,5.6,13,-4,1.9,0],[12,7,10,6,3,-2]];
  let shot=innerWidth < 650 ? 1 : 0;
  function frame(){
    const [x,y,z,a,b,c]=shots[shot];
    const scale=Math.max(1,(shot === 0 ? 1.45 : 1.05)/camera.aspect);
    orbit.maxDistance=Math.max(60,45*scale);
    orbit.target.set(a,b,c);camera.position.set(a+(x-a)*scale,b+(y-b)*scale,c+(z-c)*scale);orbit.update();
  }
  function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);if(!walk)frame();}
  addEventListener('resize',resize);resize();
  const keys=new Set();
  let yaw=.08,pitch=0,drag=null,elapsed=0,last=performance.now();
  const stops=[[-6.7,2.25,'书局橱窗'],[-1,2.2,'深夜邮局'],[7.7,1.9,'钟楼街角']];
  const found=new Set();
  const hint=document.querySelector('#hint'),button=document.querySelector('#shot');
  if(walk){
    const mode=document.querySelector('#mode');mode.href='./';mode.textContent='返回全景';
    camera.position.set(-3,1.86,7.45);camera.fov=64;camera.updateProjectionMatrix();
    hint.textContent='WASD / 方向键移动 · 拖动环顾 · 寻找三处取景点';
    button.textContent='拍摄街景 0/3';
    document.querySelector('#pad').hidden=!matchMedia('(pointer:coarse)').matches;
    button.onclick=()=>{
      const place=stops.find(([x,z])=>Math.hypot(camera.position.x-x,camera.position.z-z)<3.5);
      if(place){
        found.add(place[2]);
        renderer.render(scene,camera);
        const photo=document.createElement('a');
        photo.href=renderer.domElement.toDataURL('image/png');
        photo.download='潮汐书街-'+place[2]+'.png';
        photo.textContent='保存照片 ↓';
        document.querySelector('#photo-link')?.remove();
        photo.id='photo-link';document.querySelector('.controls').prepend(photo);
      }
      status.hidden=false;
      status.textContent=place?(found.size===3?'夜游完成 · 三处街景已收集':'已收集 · '+place[2]):'靠近书局、邮局或钟楼后拍摄';
      button.textContent='拍摄街景 '+found.size+'/3';
    };
    const bindings={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
    for(const type of ['keydown','keyup'])addEventListener(type,e=>{if(bindings[e.code]){e.preventDefault();if(type==='keydown')keys.add(bindings[e.code]);else keys.delete(bindings[e.code]);}});
    for(const el of document.querySelectorAll('[data-dir]')){
      el.onpointerdown=e=>{el.setPointerCapture(e.pointerId);keys.add(el.dataset.dir);};
      el.onlostpointercapture=()=>keys.delete(el.dataset.dir);
    }
    addEventListener('blur',()=>keys.clear());
    const canvas=renderer.domElement;
    canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);drag=[e.clientX,e.clientY];};
    canvas.onpointermove=e=>{if(drag){yaw-=(e.clientX-drag[0])*.005;pitch=T.MathUtils.clamp(pitch-(e.clientY-drag[1])*.004,-.85,.95);drag=[e.clientX,e.clientY];}};
    canvas.onlostpointercapture=()=>{drag=null;};
  } else button.onclick=()=>{shot=(shot+1)%shots.length;frame();};
  status.hidden=true;
  renderer.setAnimationLoop(now=>{
    const dt=Math.min(.05,(now-last)/1000);last=now;
    if(walk){
      const f=Number(keys.has('forward'))-Number(keys.has('back')),r=Number(keys.has('right'))-Number(keys.has('left'));
      const step=dt*3.5/Math.max(1,Math.hypot(f,r));
      camera.position.x=T.MathUtils.clamp(camera.position.x+(r*Math.cos(yaw)-f*Math.sin(yaw))*step,-11.4,11.4);
      camera.position.z=T.MathUtils.clamp(camera.position.z-(f*Math.cos(yaw)+r*Math.sin(yaw))*step,1.98,8);
      if(f||r)elapsed+=dt*8;
      camera.position.y=1.85+Math.sin(elapsed)*.027;
      camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0,'YXZ');
    }
    renderer.render(scene,camera);
  });
}
