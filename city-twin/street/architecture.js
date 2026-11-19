import * as THREE from 'three';

// Each atlas holds four bays across two floors. Mipmaps average out the fine
// frames in the campus overview while keeping them visible from the street.
const families = {
  library: {width:4.4,floor:4.8,wall:'#a59980',frame:'#615341',opening:.91,sill:.11},
  teaching: {width:4.0,floor:3.9,wall:'#c3b9a4',frame:'#566565',opening:.83,sill:.22},
  residence: {width:3.5,floor:3.35,wall:'#b28e79',frame:'#504d48',opening:.65,sill:.27},
  sports: {width:5.1,floor:6.2,wall:'#9ba8a7',frame:'#45585c',opening:.77,sill:.36},
  workshop: {width:4.2,floor:4.0,wall:'#b5b5a8',frame:'#48595b',opening:.78,sill:.24}
};
function facadeAtlas(family, kind) {
  const canvas=document.createElement('canvas');
  canvas.width=1024; canvas.height=512;
  const c=canvas.getContext('2d');
  let seed=819;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  c.fillStyle=family.wall;c.fillRect(0,0,1024,512);
  for(let i=0;i<17500;i++){
    c.fillStyle=random()>.5?'#fff6df18':'#25272313';
    c.fillRect(random()*1024,random()*512,1+random()*2,1);
  }
  for(let row=0;row<2;row++)for(let col=0;col<4;col++){
    const x=col*256,y=row*256;
    c.fillStyle='#393c382f';c.fillRect(x,y,2,256);c.fillRect(x,y+251,256,3);
    if(kind==='residence'){
      c.fillStyle='#66574c25';
      for(let k=0;k<256;k+=8){c.fillRect(x,y+k,256,1);for(let j=k%16?8:0;j<256;j+=20)c.fillRect(x+j,y+k,1,8);}
    }
    const w=256*family.opening,h=256*(.9-family.sill),a=x+(256-w)/2,b=y+20;
    c.fillStyle='#414541';c.fillRect(a-3,b-4,w+6,h+10);
    const lit=(col+row*3)%5!==1;
    const pane=c.createLinearGradient(0,b,0,b+h);
    pane.addColorStop(0,lit?'#957e64':'#465b69');pane.addColorStop(.31,lit?'#e2c79a':'#839399');
    pane.addColorStop(1,lit?'#826f5c':'#374e54');
    c.fillStyle=pane;c.fillRect(a,b,w,h);
    // Visible ceiling, side reveal, furnishings and interior light strip.
    c.fillStyle=lit?'#8d7961':'#495963';
    c.beginPath();c.moveTo(a,b);c.lineTo(a+w,b);c.lineTo(a+w*.83,b+h*.19);c.lineTo(a+w*.16,b+h*.19);c.fill();
    c.fillStyle=lit?'#ffe4ad':'#86969b';c.fillRect(a+w*.24,b+h*.11,w*.51,2);
    c.fillStyle='#393c385e';c.fillRect(a+w*.77,b+h*.2,4,h*.8);
    c.fillStyle='#514b48';c.fillRect(a+w*.12,b+h*.78,w*.71,4);
    for(let k=0;k<8;k++){c.fillStyle=['#606e69','#8e7564','#a49476'][k%3];c.fillRect(a+w*.16+k*5,b+h*.78-9-k%3*3,4,9+k%3*3);}
    const reflection=c.createLinearGradient(a,b,a+w,b+h);
    reflection.addColorStop(0,'#abc7d581');reflection.addColorStop(.55,'#93a8b329');reflection.addColorStop(1,'#35495648');
    c.fillStyle=reflection;c.fillRect(a,b,w,h);
    const shade=col%3===0?.29:.09;
    for(let k=0;k<h*shade;k+=4){c.fillStyle='#d1ccba99';c.fillRect(a,b+k,w,2);}
    c.fillStyle=family.frame;
    for(let k=1;k<3;k++)c.fillRect(a+w*k/3-2,b,3,h);
    c.fillRect(a,b+h*.25,w,3);
    c.fillStyle='#e1d6c0';c.fillRect(a-4,b+h+3,w+8,3);
  }
  const tex=new THREE.CanvasTexture(canvas);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  return tex;
}

export function addArchitecture(scene,buildings,inside) {
  const frameMetal=new THREE.MeshStandardMaterial({color:0x687475,metalness:.45,roughness:.42});
  const layers=new Map(), pieces=new Map(), transform=new THREE.Object3D();
  function solid(color,w,h,d,x,y,z,angle){
    if(!pieces.has(color))pieces.set(color,[]);
    transform.position.set(x,y,z);transform.rotation.set(0,angle,0);transform.scale.set(w,h,d);
    transform.updateMatrix();pieces.get(color).push(transform.matrix.clone());
  }
  for(const b of buildings){
    if(b.k==='part_entrance'||b.n==='运动场')continue;
    const kind=({student_bedroom:'residence',gymnasium:'sports',library:'library',teaching:'teaching'})[b.k]||'workshop';
    const f=families[kind],floors=Math.max(1,Math.round(b.h/f.floor)),storey=b.h/floors;
    if(!layers.has(kind))layers.set(kind,{positions:[],uv:[],indices:[]});
    const layer=layers.get(kind);
    if(kind==='library'){
      const xs=b.r[0].map(p=>p[0]),zs=b.r[0].map(p=>p[1]);
      const cx=(Math.min(...xs)+Math.max(...xs))/2,cz=(Math.min(...zs)+Math.max(...zs))/2;
      const width=(Math.max(...xs)-Math.min(...xs))*.60,depth=(Math.max(...zs)-Math.min(...zs))*.42;
      // A set-back reading pavilion and north-light glazing break up the roof mass.
      solid(0xc1b49a,width+3,.6,depth+3,cx,b.h+.35,cz,0);
      solid(0x486573,width,3.4,depth,cx,b.h+2.1,cz,0);
      solid(0xa28b6d,width+1.6,.42,depth+1.6,cx,b.h+4,cz,0);
      for(const side of [-1,1])for(let x=-width/2;x<=width/2;x+=2.7){
        solid(0xa99478,.17,3.5,.46,cx+x,b.h+2.12,cz+side*depth/2,0);
      }
      for(let row=0;row<3;row++){
        const glass=new THREE.Mesh(new THREE.BoxGeometry(width*.90,.16,depth*.21),
          new THREE.MeshStandardMaterial({color:0x72959e,metalness:.48,roughness:.26}));
        glass.position.set(cx,b.h+4.75,cz+(row-1)*depth*.30);glass.rotation.x=-.19;
        glass.castShadow=glass.receiveShadow=true;scene.add(glass);
        for(let x=-width*.42;x<width*.45;x+=3.4){
          const rib=new THREE.Mesh(new THREE.BoxGeometry(.12,.22,depth*.21),frameMetal);
          rib.position.copy(glass.position);rib.position.x+=x;rib.rotation.x=glass.rotation.x;scene.add(rib);
        }
      }
      // The colonnade opens towards the central plaza.
      const front=Math.max(...zs),span=width*.83;
      solid(0xb8aa8d,span+2,.5,5.9,cx,6.9,front+2.8,0);
      solid(0x705c48,span+1,.26,5.4,cx,6.52,front+2.8,0);
      for(let i=0;i<6;i++)solid(0xd2c6ab,.55,6.5,.68,cx-span*.45+i*span*.18,3.25,front+5.05,0);
      for(let i=0;i<3;i++)solid(0xc4bcaa,span+2+i*.9,.18*(3-i),1.05,cx,.09*(3-i),front+5.8+i*.9,0);
    }
    for(const ring of b.r){
      for(let i=1;i<ring.length;i++){
        const [ax,az]=ring[i-1],[bx,bz]=ring[i],dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);
        if(len<1.8)continue;
        const x=(ax+bx)/2,z=(az+bz)/2;
        let nx=-dz/len,nz=dx/len;
        if(b.r.reduce((parity,r)=>parity!==inside([x+nx*.08,z+nz*.08],r),false)){nx=-nx;nz=-nz;}
        const angle=Math.atan2(nx,nz), bays=Math.max(1,Math.round(len/f.width)),pitch=len/bays;
        const part=(color,width,height,depth,side,y,out)=>solid(color,width,height,depth,x+side*nz+out*nx,y,z-side*nx+out*nz,angle);
        const index=layer.positions.length/3;
        for(const [side,y] of [[-len/2,.12],[len/2,.12],[len/2,b.h],[-len/2,b.h]]){
          layer.positions.push(x+side*nz+.045*nx,y,z-side*nx+.045*nz);
        }
        layer.uv.push(0,0,bays/4,0,bays/4,floors/2,0,floors/2);
        layer.indices.push(index,index+1,index+2,index,index+2,index+3);
        // Raised parapets cast a shadow onto the roof instead of ending flush.
        part(0xadb0a5,len,.56,.42,0,b.h+.24,0);
        part(0x666e69,len+.14,.12,.56,0,b.h+.56,0);
        if(len<5)continue;
        for(let floor=1;floor<floors;floor++){
          const depth=kind==='library'?.95:kind==='teaching'?.68:.34;
          part(kind==='residence'?0xa58b79:0xc2bcae,len,.22,depth,0,storey*floor,depth*.43);
        }
        if(kind==='library'||kind==='sports'||kind==='teaching'){
          for(let bay=0;bay<=bays;bay++){
            const pos=-len/2+bay*pitch;
            part(kind==='library'?0x94765b:0x9aaba8,.24,b.h-.35,kind==='library'?.99:.56,pos,b.h/2,.30);
          }
        }else if(kind==='residence'&&len>15){
          for(let bay=1;bay<bays;bay+=3){
            for(let floor=1;floor<floors;floor++){
              const pos=-len/2+(bay+.5)*pitch,y=storey*floor;
              part(0xb5aa99,pitch*.86,.19,1.06,pos,y+.12,.51);
              part(0x656f6c,pitch*.86,.09,.07,pos,y+1.10,1.0);
              for(const offset of [-.38,0,.38])part(0x66716e,.055,.95,.055,pos+pitch*offset,y+.62,1.0);
            }
          }
        }
      }
    }
  }
  for(const [kind,l] of layers){
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(l.positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(l.uv,2));geo.setIndex(l.indices);geo.computeVertexNormals();
    const map=facadeAtlas(families[kind],kind);
    const mat=new THREE.MeshStandardMaterial({map,emissiveMap:map,emissive:0xffe6c9,emissiveIntensity:.14,roughness:.59});
    const mesh=new THREE.Mesh(geo,mat);mesh.receiveShadow=true;scene.add(mesh);
  }
  const cube=new THREE.BoxGeometry();
  for(const [color,matrices] of pieces){
    const batch=new THREE.InstancedMesh(cube,new THREE.MeshStandardMaterial({color,roughness:.7}),matrices.length);
    matrices.forEach((matrix,i)=>batch.setMatrixAt(i,matrix));
    batch.castShadow=batch.receiveShadow=true;scene.add(batch);
  }
}
