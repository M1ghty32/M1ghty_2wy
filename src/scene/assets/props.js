/**
 * 庭院道具：栅栏、院门、步道、池塘、长椅、信箱、灯串、石灯、单车与鸟屋。
 */
import * as THREE from 'three';
import { makeSignTexture } from './materials.js';

function cylinderBetween(factory, a, b, radius, material, parent, segments = 6) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const length = start.distanceTo(end);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), material);
  mesh.position.copy(start.clone().add(end).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
  mesh.castShadow = factory.quality.shadows;
  parent.add(mesh);
  return mesh;
}

export function createFence(factory, length = 5.4, { color = 'cream' } = {}) {
  const f = factory;
  const root = f.group('fence');
  const mat = f.material(color, { roughness: 0.8 });
  const postMat = f.material('woodDark', { roughness: 0.82 });
  const posts = Math.max(2, Math.round(length / 1.2));
  for (let i = 0; i < posts; i++) {
    const x = -length / 2 + (i / (posts - 1)) * length;
    root.add(f.rounded(0.12, 0.8, 0.12, 0.025, postMat, [x, 0.4, 0]));
    root.add(f.sphere(0.08, mat, [x, 0.83, 0], 8));
  }
  root.add(f.box(length, 0.08, 0.08, mat, [0, 0.58, 0]));
  root.add(f.box(length, 0.06, 0.06, mat, [0, 0.28, 0]));
  const pickets = Math.floor(length / (f.quality.tier === 'low' ? 0.42 : 0.24));
  for (let i = 0; i < pickets; i++) {
    const x = -length / 2 + 0.12 + i * (f.quality.tier === 'low' ? 0.42 : 0.24);
    root.add(f.box(0.07, 0.55, 0.035, mat, [x, 0.48, 0.045]));
  }
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });
  return { root };
}

export function createGate(factory) {
  const f = factory;
  const root = f.group('garden-gate');
  const wood = f.material('wood', { roughness: 0.74 });
  const dark = f.material('woodDark', { roughness: 0.8 });
  const stone = f.material(0x7b837e, { roughness: 0.95 });
  const lampMat = f.basic(0xffd48a);
  const signTex = makeSignTexture({ title: "M1GHTY'S GARDEN", subtitle: 'WELCOME · MIND THE CAT', accent: '#ffd48a', bg: '#263c4a', width: 768 });
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissive: 0x2c2017, emissiveMap: signTex, emissiveIntensity: 0.45, roughness: 0.5 });

  [-1.85, 1.85].forEach((x) => {
    root.add(f.rounded(0.4, 2.1, 0.4, 0.06, stone, [x, 1.05, 0]));
    root.add(f.rounded(0.52, 0.14, 0.52, 0.04, f.material(0x969e97, { roughness: 0.9 }), [x, 2.14, 0]));
    const lamp = f.rounded(0.16, 0.22, 0.16, 0.04, dark, [x, 1.75, 0.17]);
    root.add(lamp);
    root.add(f.sphere(0.06, lampMat, [x, 1.75, 0.27], 8));
    const glow = f.glowSprite('#ffd48a', 0.8, 0.18);
    glow.position.set(x, 1.75, 0.28);
    root.add(glow);
  });
  root.add(f.rounded(4.45, 0.5, 0.16, 0.04, wood, [0, 1.85, 0]));
  root.add(f.mesh(new THREE.PlaneGeometry(2.5, 0.36), signMat, [0, 1.84, 0.09]));
  root.add(f.box(4.4, 0.08, 0.22, dark, [0, 1.55, 0]));
  // 打开的院门：两扇，向外打开
  [-1, 1].forEach((side) => {
    const gateLeaf = new THREE.Group();
    gateLeaf.position.set(side * 1.62, 0, 0.05);
    gateLeaf.rotation.y = side * 0.72;
    for (let i = 0; i < 5; i++) {
      gateLeaf.add(f.box(0.075, 1.35 - i * 0.08, 0.06, wood, [side * (0.08 + i * 0.18), 0.76, 0], { rotation: [0, 0, 0] }));
    }
    gateLeaf.add(f.box(0.84, 0.07, 0.07, dark, [side * 0.43, 1.25, 0.02]));
    gateLeaf.add(f.box(0.84, 0.07, 0.07, dark, [side * 0.43, 0.42, 0.02]));
    const hinge = f.cylinder(0.04, 0.04, 0.12, f.material(0x2b3340, { metalness: 0.6, roughness: 0.4 }), [0, 0.9, 0], 8);
    gateLeaf.add(hinge);
    root.add(gateLeaf);
  });
  // 门前的 welcome mat 与小石子
  root.add(f.rounded(1.8, 0.025, 0.62, 0.06, f.material('mint', { roughness: 0.9 }), [0, 0.025, 0.45]));
  root.add(f.rounded(1.5, 0.01, 0.38, 0.03, f.material(0x315e4d, { roughness: 0.95 }), [0, 0.045, 0.45]));
  for (let i = 0; i < 8; i++) {
    root.add(f.sphere(0.04 + (i % 3) * 0.02, f.material(0x8b948d, { roughness: 0.92 }), [Math.sin(i * 2.1) * 2.3, 0.05, 0.45 + Math.cos(i * 1.7) * 0.3], 6));
  }
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows && !child.material.transparent;
      child.receiveShadow = true;
    }
  });
  return { root };
}

export function createSteppingPath(factory, { points = [], count = 12 } = {}) {
  const f = factory;
  const root = f.group('stepping-path');
  const stoneMats = [
    f.material(0x9aa39a, { roughness: 0.95 }),
    f.material(0x879288, { roughness: 0.95 }),
    f.material(0xaab0a5, { roughness: 0.95 })
  ];
  if (points.length < 2) return { root };
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], 0, p[1])));
  const actualCount = f.quality.tier === 'low' ? Math.ceil(count * 0.7) : count;
  for (let i = 0; i < actualCount; i++) {
    const t = (i + 0.5) / actualCount;
    const pos = curve.getPoint(t);
    const width = 0.62 + (i % 4) * 0.1;
    const depth = 0.46 + (i % 3) * 0.1;
    const tile = f.rounded(width, 0.06, depth, 0.09, stoneMats[i % 3], [pos.x, 0.045, pos.z], { rotation: [0, (i * 1.3) % 1.2 - 0.6, 0] });
    root.add(tile);
    if (i % 3 === 0) {
      root.add(f.sphere(0.035, f.material('mint', { roughness: 0.8 }), [pos.x + 0.34, 0.05, pos.z + 0.1], 5));
    }
  }
  root.traverse((child) => {
    if (child.isMesh) child.receiveShadow = true;
  });
  return { root };
}

export function createPond(factory, { radius = 1.45 } = {}) {
  const f = factory;
  const root = f.group('garden-pond');
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x4f9bb4,
    roughness: 0.18,
    metalness: 0.1,
    transparent: true,
    opacity: 0.82
  });
  const water = new THREE.Mesh(new THREE.CircleGeometry(radius, 36), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.03;
  root.add(water);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const stone = f.sphere(0.16 + (i % 3) * 0.04, f.material(i % 2 ? 0x77837c : 0x8e9890, { roughness: 0.96 }), [Math.cos(a) * (radius + 0.1), 0.1, Math.sin(a) * (radius + 0.1)], 7);
    stone.scale.set(1.3, 0.55, 0.9);
    stone.rotation.y = a;
    root.add(stone);
  }
  const padMat = f.material('leaf', { roughness: 0.7 });
  const pads = [];
  for (let i = 0; i < 5; i++) {
    const a = i * 1.7;
    const pad = f.cylinder(0.18 + (i % 2) * 0.08, 0.18 + (i % 2) * 0.08, 0.02, padMat, [Math.cos(a) * radius * 0.55, 0.045, Math.sin(a) * radius * 0.55], 12);
    pad.scale.z = 0.8;
    root.add(pad);
    if (i % 2 === 0) {
      root.add(f.sphere(0.045, f.material('pink'), [pad.position.x + 0.04, 0.08, pad.position.z], 6));
    }
    pads.push(pad);
  }
  // 睡莲一朵
  const lilyPads = new THREE.Group();
  lilyPads.position.set(-radius * 0.3, 0.06, radius * 0.25);
  const lily = f.group('lily');
  for (let i = 0; i < 6; i++) {
    const petal = f.sphere(0.09, f.material(i % 2 ? 'pink' : 'cream', { roughness: 0.6 }), [Math.cos(i) * 0.06, 0.04 + (i % 3) * 0.03, Math.sin(i) * 0.06], 7);
    petal.scale.set(0.6, 0.35, 1.2);
    petal.rotation.y = i;
    lily.add(petal);
  }
  lilyPads.add(lily);
  root.add(lilyPads);

  // 小鱼
  const fish = f.group('koi');
  fish.position.set(radius * 0.2, 0.06, -radius * 0.1);
  fish.add(f.sphere(0.08, f.material('coral'), [0, 0, 0], 8));
  fish.scale.set(1.8, 0.55, 0.9);
  root.add(fish);

  // 芦苇
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const reed = f.cylinder(0.015, 0.018, 0.6 + (i % 3) * 0.18, f.material('leafDeep'), [Math.cos(a) * (radius - 0.1), 0.33, Math.sin(a) * (radius - 0.1)], 5);
    root.add(reed);
    root.add(f.sphere(0.035, f.material('woodDark'), [reed.position.x, 0.66 + (i % 3) * 0.16, reed.position.z], 6));
  }

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = true;
    }
  });

  return {
    root,
    update(dt, elapsed, reducedMotion) {
      waterMat.roughness = 0.18 + Math.sin(elapsed * 0.6) * 0.02;
      water.position.y = 0.03 + (reducedMotion ? 0 : Math.sin(elapsed * 0.7) * 0.004);
      lilyPads.position.y = 0.06 + (reducedMotion ? 0 : Math.sin(elapsed * 1.3) * 0.008);
      fish.position.x = Math.cos(elapsed * 0.3) * radius * 0.42;
      fish.position.z = Math.sin(elapsed * 0.23) * radius * 0.3;
      fish.rotation.y = -Math.atan2(Math.cos(elapsed * 0.23) * radius * 0.3, -Math.sin(elapsed * 0.3) * radius * 0.42);
      pads.forEach((pad, i) => {
        pad.rotation.y += dt * 0.02 * (i % 2 ? 1 : -1);
      });
    }
  };
}

export function createBench(factory) {
  const f = factory;
  const root = f.group('garden-bench');
  const wood = f.material('wood', { roughness: 0.72 });
  const metal = f.material(0x39465b, { roughness: 0.4, metalness: 0.55 });
  for (let i = 0; i < 4; i++) {
    root.add(f.rounded(1.7, 0.07, 0.16, 0.025, wood, [0, 0.48, -0.26 + i * 0.17]));
  }
  for (let i = 0; i < 3; i++) {
    root.add(f.rounded(1.7, 0.07, 0.16, 0.025, wood, [0, 0.66 + i * 0.16, -0.35], { rotation: [-0.16, 0, 0] }));
  }
  [-0.72, 0.72].forEach((x) => {
    root.add(f.rounded(0.07, 0.48, 0.52, 0.025, metal, [x, 0.24, -0.05]));
    root.add(f.rounded(0.07, 0.68, 0.06, 0.02, metal, [x, 0.72, -0.36], { rotation: [-0.16, 0, 0] }));
    root.add(f.rounded(0.32, 0.05, 0.06, 0.015, metal, [x, 0.24, 0.02]));
  });
  root.add(f.rounded(0.4, 0.06, 0.3, 0.02, f.material('amber'), [0.4, 0.54, 0.05], { rotation: [0, 0.2, 0] }));
  root.add(f.rounded(0.22, 0.2, 0.22, 0.06, f.material('cream'), [-0.4, 0.64, 0.02]));
  root.add(f.sphere(0.12, f.material('leaf'), [-0.4, 0.78, 0.02], 9));
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });
  return { root };
}

export function createMailbox(factory) {
  const f = factory;
  const root = f.group('mailbox');
  const wood = f.material('woodDark', { roughness: 0.76 });
  const blue = f.material('sky', { roughness: 0.45, metalness: 0.12 });
  const red = f.material('coral', { roughness: 0.55 });
  root.add(f.cylinder(0.075, 0.1, 1.15, wood, [0, 0.58, 0], 8));
  root.add(f.rounded(0.46, 0.38, 0.68, 0.16, blue, [0, 1.18, 0]));
  root.add(f.rounded(0.02, 0.3, 0.5, 0.01, f.material(0xd8e6eb, { roughness: 0.5 }), [0.23, 1.18, 0], { rotation: [0, 0, 0] }));
  root.add(f.rounded(0.3, 0.08, 0.02, 0.01, f.material(0x2c4057), [0, 1.08, 0.35]));
  root.add(f.cylinder(0.018, 0.018, 0.34, f.material(0x59677a), [0, 1.43, -0.18], 6, { rotation: [0, 0, Math.PI / 2] }));
  root.add(f.box(0.035, 0.2, 0.02, red, [0.25, 1.5, 0], { rotation: [0, 0, 0.3] }));
  root.add(f.box(0.02, 0.12, 0.18, f.material(0xfff8ea), [0.23, 1.3, 0.02], { rotation: [0, 0, 0.2] }));
  // 旁边的小花
  for (let i = 0; i < 4; i++) {
    root.add(f.cylinder(0.01, 0.01, 0.25, f.material('leafDeep'), [0.3 + i * 0.09, 0.13, 0.2], 4));
    root.add(f.sphere(0.04, f.material(i % 2 ? 'pink' : 'amber'), [0.3 + i * 0.09, 0.27, 0.2], 6));
  }
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });
  return { root };
}

export function createStringLights(factory, { start = [-4, 3.1, 2.6], end = [4, 3.4, 2.6], count = 14, sag = 0.8 } = {}) {
  const f = factory;
  const root = f.group('string-lights');
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const points = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const point = a.clone().lerp(b, t);
    point.y -= Math.sin(t * Math.PI) * sag;
    points.push(point);
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const cable = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 30, 0.008, 4, false),
    f.material(0x213042, { roughness: 0.8 })
  );
  root.add(cable);
  for (let i = 0; i < count; i++) {
    const t = (i + 1) / (count + 1);
    const pos = curve.getPoint(t);
    const bulb = f.sphere(0.055, f.basic(0xffd48a), [pos.x, pos.y - 0.08, pos.z], 8);
    root.add(bulb);
    const cap = f.cylinder(0.035, 0.035, 0.035, f.material(0x26354b), [pos.x, pos.y - 0.03, pos.z], 6);
    root.add(cap);
    if (f.quality.tier !== 'low') {
      const glow = f.glowSprite('#ffd48a', 0.52, 0.14);
      glow.position.set(pos.x, pos.y - 0.08, pos.z);
      root.add(glow);
    }
  }
  return { root, curve };
}

export function createStoneLantern(factory) {
  const f = factory;
  const root = f.group('stone-lantern');
  const stone = f.material(0x77827c, { roughness: 0.96 });
  root.add(f.cylinder(0.3, 0.36, 0.14, stone, [0, 0.07, 0], 8));
  root.add(f.cylinder(0.12, 0.15, 0.62, stone, [0, 0.45, 0], 8));
  root.add(f.rounded(0.48, 0.32, 0.48, 0.04, stone, [0, 0.88, 0]));
  const warm = f.box(0.24, 0.2, 0.24, f.basic(0xffd48a), [0, 0.9, 0.14]);
  root.add(warm);
  root.add(f.cone(0.42, 0.3, stone, [0, 1.18, 0], 8));
  root.add(f.sphere(0.06, stone, [0, 1.36, 0], 7));
  const glow = f.glowSprite('#ffd48a', 1.2, 0.18);
  glow.position.set(0, 0.9, 0.2);
  root.add(glow);
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = child.material !== warm.material;
      child.receiveShadow = true;
    }
  });
  return { root };
}

export function createBicycle(factory) {
  const f = factory;
  const root = f.group('bicycle');
  const frameMat = f.material('mint', { roughness: 0.4, metalness: 0.4 });
  const dark = f.material(0x1b2534, { roughness: 0.54, metalness: 0.35 });
  const metal = f.material(0x9aa7b5, { roughness: 0.3, metalness: 0.7 });
  const wheelPositions = [[-0.62, 0.38], [0.62, 0.38]];
  wheelPositions.forEach(([x, y]) => {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.035, 6, 24), dark);
    wheel.position.set(x, y, 0);
    root.add(wheel);
    for (let i = 0; i < 8; i++) {
      const spoke = f.cylinder(0.008, 0.008, 0.72, metal, [x, y, 0], 4, { rotation: [0, 0, (i / 8) * Math.PI] });
      root.add(spoke);
    }
    root.add(f.cylinder(0.035, 0.035, 0.08, metal, [x, y, 0], 8, { rotation: [0, 0, Math.PI / 2] }));
  });
  cylinderBetween(f, [-0.62, 0.38, 0], [0.0, 0.75, 0], 0.03, frameMat, root);
  cylinderBetween(f, [0.0, 0.75, 0], [0.62, 0.38, 0], 0.03, frameMat, root);
  cylinderBetween(f, [-0.62, 0.38, 0], [-0.05, 0.38, 0], 0.025, frameMat, root);
  cylinderBetween(f, [-0.05, 0.38, 0], [0.0, 0.75, 0], 0.025, frameMat, root);
  cylinderBetween(f, [0.0, 0.75, 0], [-0.05, 0.38, 0], 0.025, frameMat, root);
  cylinderBetween(f, [0.0, 0.75, 0], [0.62, 0.38, 0], 0.025, frameMat, root);
  cylinderBetween(f, [-0.05, 0.38, 0], [0.15, 0.34, 0], 0.022, frameMat, root);
  cylinderBetween(f, [0.0, 0.75, 0], [0.16, 0.9, 0], 0.025, metal, root);
  root.add(f.cylinder(0.04, 0.04, 0.42, metal, [0.16, 0.95, 0], 8, { rotation: [0, 0, Math.PI / 2] }));
  root.add(f.rounded(0.28, 0.07, 0.16, 0.03, dark, [-0.16, 0.82, 0]));
  cylinderBetween(f, [-0.05, 0.38, 0], [-0.46, 0.38, 0], 0.022, frameMat, root);
  root.add(f.box(0.28, 0.25, 0.18, f.material(0x91806a, { roughness: 0.8 }), [0.45, 0.86, 0.1], { rotation: [0, 0, -0.08] }));
  root.add(f.cylinder(0.03, 0.03, 0.4, metal, [-0.62, 0.18, 0.16], 6, { rotation: [0.6, 0, 0] }));
  root.add(f.cylinder(0.03, 0.03, 0.4, metal, [-0.62, 0.18, -0.16], 6, { rotation: [-0.6, 0, 0] }));
  root.rotation.z = 0.02;
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });
  return { root };
}

export function createBirdhouse(factory) {
  const f = factory;
  const root = f.group('birdhouse');
  const wood = f.material('wood', { roughness: 0.8 });
  const dark = f.material('woodDark', { roughness: 0.8 });
  root.add(f.cylinder(0.05, 0.075, 1.55, dark, [0, 0.78, 0], 7));
  root.add(f.rounded(0.45, 0.38, 0.36, 0.05, wood, [0, 1.62, 0]));
  root.add(f.cone(0.36, 0.26, f.material('coral', { roughness: 0.7 }), [0, 1.92, 0], 4));
  root.add(f.cylinder(0.075, 0.075, 0.02, dark, [0, 1.65, 0.19], 10, { rotation: [Math.PI / 2, 0, 0] }));
  root.add(f.cylinder(0.012, 0.012, 0.16, metalOrWood(f), [0, 1.58, 0.25], 6, { rotation: [Math.PI / 2, 0, 0] }));
  // 小鸟
  const bird = f.group('bird');
  bird.position.set(0.18, 1.96, 0.04);
  bird.add(f.sphere(0.08, f.material('sky'), [0, 0, 0], 8));
  bird.add(f.sphere(0.055, f.material('sky'), [0.08, 0.03, 0], 7));
  bird.add(f.cone(0.025, 0.07, f.material('amber'), [0.14, 0.03, 0], 4, { rotation: [0, 0, -Math.PI / 2] }));
  root.add(bird);
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });
  return { root };
}

function metalOrWood(f) {
  return f.material(0x5b6878, { roughness: 0.4, metalness: 0.5 });
}

export function createGardenArch(factory) {
  const f = factory;
  const root = f.group('garden-arch');
  const wood = f.material('wood', { roughness: 0.78 });
  const leaf = f.material('leaf', { roughness: 0.82 });
  const leafLight = f.material('leafLight', { roughness: 0.82 });
  const flower = f.material('pink', { roughness: 0.65 });
  const flowerAmber = f.material('amber', { roughness: 0.65 });
  [-1.05, 1.05].forEach((x) => {
    root.add(f.rounded(0.13, 2.3, 0.13, 0.03, wood, [x, 1.15, 0]));
    root.add(f.rounded(0.2, 0.12, 0.2, 0.03, f.material('woodDark'), [x, 0.06, 0]));
  });
  // 弧形顶梁：一条真正连续的拱，不再用漂浮的方块拼。
  const archPoints = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    archPoints.push(new THREE.Vector3(-1.05 + t * 2.1, 2.28 + Math.sin(t * Math.PI) * 0.5, 0));
  }
  const archCurve = new THREE.CatmullRomCurve3(archPoints);
  const arch = new THREE.Mesh(new THREE.TubeGeometry(archCurve, 28, 0.075, 6, false), wood);
  arch.castShadow = f.quality.shadows;
  root.add(arch);
  // 弧形上的短木肋
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const point = archCurve.getPoint(t);
    const tangent = archCurve.getTangent(t);
    const rib = f.box(0.06, 0.16, 0.14, f.material('woodDark'), [point.x, point.y, 0.02]);
    rib.rotation.z = -Math.atan2(tangent.y, tangent.x);
    root.add(rib);
  }
  // 藤蔓与花朵攀在拱门两侧
  for (let i = 0; i < 20; i++) {
    const side = i % 2 ? 1 : -1;
    const t = (i % 10) / 10;
    const x = side * (1.02 + Math.sin(t * Math.PI) * 0.12);
    const y = 0.4 + t * 1.9 + Math.sin(i) * 0.08;
    const puff = f.sphere(0.09, i % 4 === 0 ? leafLight : leaf, [x, y, Math.sin(i * 1.4) * 0.12], 7);
    puff.scale.set(0.7, 1.25, 0.55);
    root.add(puff);
    if (i % 3 === 0) {
      root.add(f.sphere(0.055, i % 2 ? flower : flowerAmber, [x + side * 0.06, y + 0.04, 0.16], 6));
    }
  }
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const point = archCurve.getPoint(t);
    root.add(f.sphere(0.075, i % 3 === 0 ? flowerAmber : leaf, [point.x, point.y + 0.06, 0.06], 7));
    if (i % 2 === 0) root.add(f.sphere(0.04, flower, [point.x + 0.07, point.y + 0.02, 0.1], 6));
  }
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });
  return { root };
}

export function createPorchStep(factory) {
  const f = factory;
  const root = f.group('porch');
  const stone = f.material(0x8a928d, { roughness: 0.94 });
  root.add(f.rounded(2.5, 0.16, 0.8, 0.04, stone, [0, 0.08, 0]));
  root.add(f.rounded(2.1, 0.12, 0.55, 0.03, f.material(0x9ba39d, { roughness: 0.9 }), [0, 0.22, 0.1]));
  root.add(f.rounded(1.7, 0.1, 0.35, 0.03, f.material(0xaab1aa, { roughness: 0.9 }), [0, 0.33, 0.16]));
  for (let i = 0; i < 2; i++) {
    root.add(f.cylinder(0.16, 0.12, 0.36, f.material('coral'), [-1.0 + i * 2.0, 0.4, 0.05], 10));
    for (let l = 0; l < 4; l++) {
      root.add(f.sphere(0.1, f.material('leaf'), [-1.0 + i * 2.0 + Math.cos(l * 1.7) * 0.08, 0.55 + (l % 2) * 0.08, 0.05 + Math.sin(l * 1.7) * 0.05], 7));
    }
  }
  return { root };
}
