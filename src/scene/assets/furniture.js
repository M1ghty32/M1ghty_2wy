/**
 * 家具、工作台与房间陈设。
 * 每个工厂函数都返回一个带动画句柄的 Group，位置由 world-builder 安排。
 */
import * as THREE from 'three';
import { makeSignTexture, makeBulletinTexture, makePaintingTexture, makeRugTexture, PALETTE } from './materials.js';

function addTube(factory, points, radius, material, parent) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 5, false), material);
  mesh.castShadow = factory.quality.shadows;
  parent.add(mesh);
  return mesh;
}

function makeScreenMaterial(texture, intensity = 1.0) {
  return new THREE.MeshStandardMaterial({
    map: texture,
    emissive: 0xffffff,
    emissiveMap: texture,
    emissiveIntensity: intensity,
    roughness: 0.28,
    metalness: 0.05
  });
}

function addFrontScreen(factory, parent, texture, width, height, position, rotation = [0, 0, 0], intensity = 1) {
  const material = makeScreenMaterial(texture, intensity);
  const display = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  display.position.set(...position);
  display.rotation.set(...rotation);
  parent.add(display);
  return { display, material };
}

export function createDeskStation(factory) {
  const f = factory;
  const root = f.group('desk-station');
  const detail = f.quality.detail;

  const wood = f.material('wood', { roughness: 0.58 });
  const woodEdge = f.material('woodDark', { roughness: 0.62 });
  const metal = f.material(0x394863, { roughness: 0.32, metalness: 0.72 });
  const dark = f.material(0x1a2436, { roughness: 0.5 });
  const mat = f.material(0x111b2d, { roughness: 0.9 });
  const accent = f.material('sky', { roughness: 0.55, emissive: 0x2d8bd4, emissiveIntensity: 0.12 });

  // 升降桌
  const deskTop = f.rounded(3.5, 0.13, 1.32, 0.075, wood, [0, 1.03, 0]);
  root.add(deskTop);
  const edge = f.rounded(3.56, 0.045, 1.38, 0.02, woodEdge, [0, 0.965, 0]);
  root.add(edge);
  [-1.47, 1.47].forEach((x) => {
    root.add(f.rounded(0.11, 0.92, 0.11, 0.025, metal, [x, 0.52, -0.04]));
    root.add(f.rounded(0.58, 0.09, 0.16, 0.025, dark, [x, 0.06, -0.04]));
    root.add(f.rounded(0.9, 0.06, 0.1, 0.02, metal, [x, 0.92, -0.04]));
  });
  root.add(f.rounded(2.8, 0.07, 0.09, 0.02, metal, [0, 0.21, -0.04]));
  root.add(f.rounded(2.8, 0.05, 0.32, 0.025, dark, [0, 0.82, -0.1]));

  // 桌垫和 RGB 底边
  const deskMat = f.rounded(2.12, 0.025, 0.66, 0.035, mat, [-0.18, 1.107, 0.16]);
  root.add(deskMat);
  const rgbEdge = f.box(2.14, 0.012, 0.02, f.basic(0x6bc5f8), [-0.18, 1.12, 0.49]);
  root.add(rgbEdge);
  const underGlow = f.box(3.2, 0.015, 0.025, f.basic(0x5d8cff, { transparent: true, opacity: 0.75 }), [0, 0.95, 0.62]);
  root.add(underGlow);

  // 键盘：底座 + 单独键帽
  const keyboard = new THREE.Group();
  keyboard.position.set(-0.45, 1.15, 0.22);
  keyboard.rotation.x = -0.02;
  keyboard.add(f.rounded(0.82, 0.04, 0.3, 0.025, f.material(0xe6dfd2, { roughness: 0.6 }), [0, 0, 0]));
  keyboard.add(f.box(0.72, 0.012, 0.22, f.material(0x1a2538), [0, 0.026, -0.01]));
  const keyMaterials = [
    f.material(0xd8d2c8, { roughness: 0.52 }),
    f.material(0x94a3b8, { roughness: 0.5 }),
    f.material('sky', { roughness: 0.42, emissive: 0x1684c7, emissiveIntensity: 0.16 }),
    f.material('pink', { roughness: 0.45 })
  ];
  const rows = [
    [13, 0],
    [12, 0],
    [12, 1],
    [11, 2]
  ];
  const keyPalette = [0xd8d2c8, 0x94a3b8, 0x6bc5f8, 0xf4a6c1];
  const keyData = [];
  let keyCount = 0;
  rows.forEach(([count], row) => {
    for (let col = 0; col < count; col++) {
      if (f.quality.tier === 'low' && keyCount % 2 === 1) {
        keyCount += 1;
        continue;
      }
      const matIndex = (row + col) % 17 === 0 ? 2 : (row === 0 && col === 12 ? 3 : (row + col) % 11 === 0 ? 1 : 0);
      keyData.push({
        position: [-0.315 + col * 0.051, 0.038, -0.075 + row * 0.051],
        color: keyPalette[matIndex]
      });
      keyCount += 1;
    }
  });
  // 所有独立键帽合并为一个 InstancedMesh；配色仍逐颗不同。
  const keycapGeometry = new THREE.BoxGeometry(0.041, 0.02, 0.041);
  const keycapMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.05 });
  const keycaps = new THREE.InstancedMesh(keycapGeometry, keycapMaterial, keyData.length);
  const keyDummy = new THREE.Object3D();
  const keyColor = new THREE.Color();
  keyData.forEach((key, index) => {
    keyDummy.position.set(...key.position);
    keyDummy.updateMatrix();
    keycaps.setMatrixAt(index, keyDummy.matrix);
    keycaps.setColorAt(index, keyColor.setHex(key.color));
  });
  keycaps.instanceColor.needsUpdate = true;
  keycaps.castShadow = false;
  keycaps.receiveShadow = true;
  keyboard.add(keycaps);
  const keyMeshes = [keycaps];
  keyboard.add(f.box(0.2, 0.018, 0.045, keyMaterials[1], [-0.06, 0.04, 0.125]));
  keyboard.add(f.box(0.06, 0.016, 0.045, keyMaterials[2], [0.25, 0.04, 0.125]));
  root.add(keyboard);

  // 鼠标和鼠标垫
  root.add(f.rounded(0.38, 0.018, 0.3, 0.02, f.material(0x243149, { roughness: 0.8 }), [0.47, 1.12, 0.2]));
  const mouse = f.rounded(0.14, 0.07, 0.22, 0.06, f.material(0xf4efe6, { roughness: 0.55 }), [0.47, 1.16, 0.2]);
  mouse.scale.set(1, 1, 1.1);
  root.add(mouse);
  root.add(f.cylinder(0.015, 0.015, 0.045, f.material('amber', { metalness: 0.4 }), [0.47, 1.21, 0.15], 8, { rotation: [Math.PI / 2, 0, 0] }));

  // 显示器与支架
  const monitors = [];
  const screens = [];
  const monitorBackMat = f.material(0x1d293b, { roughness: 0.45, metalness: 0.2 });
  const monitorFrameMat = f.material(0x0d1420, { roughness: 0.4 });

  function buildMonitor(width, height, texture, x, y, z, rotY, intensity) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;
    const bezel = f.rounded(width + 0.06, height + 0.06, 0.07, 0.025, monitorFrameMat, [0, 0, 0]);
    group.add(bezel);
    const back = f.rounded(width + 0.02, height + 0.02, 0.12, 0.03, monitorBackMat, [0, 0, -0.06]);
    group.add(back);
    const screen = addFrontScreen(f, group, texture, width, height, [0, 0, 0.043], [0, 0, 0], intensity);
    screens.push(screen);
    root.add(group);
    monitors.push(group);
    return group;
  }

  buildMonitor(1.28, 0.72, f.textures.code[0], -0.15, 1.82, -0.35, 0, 1.0);
  buildMonitor(0.56, 0.9, f.textures.code[1], -1.05, 1.86, -0.2, 0.28, 0.82);
  buildMonitor(0.84, 0.56, f.textures.terminal, 0.86, 1.73, -0.26, -0.22, 0.88);

  // 显示器支架：桌面底座 + 立柱 + 双臂
  root.add(f.rounded(0.36, 0.04, 0.24, 0.02, metal, [-0.15, 1.12, -0.5]));
  root.add(f.cylinder(0.035, 0.045, 0.72, metal, [-0.15, 1.48, -0.5], 10));
  root.add(f.box(0.62, 0.035, 0.045, metal, [0.1, 1.77, -0.47], { rotation: [0, 0, 0.38] }));
  root.add(f.box(0.58, 0.03, 0.04, metal, [0.5, 1.72, -0.4], { rotation: [0, 0, -0.45] }));
  root.add(f.box(0.03, 0.36, 0.03, metal, [-0.15, 1.94, -0.39]));
  [-0.15, 0.86].forEach((x, i) => {
    root.add(f.box(0.28, 0.03, 0.03, metal, [x, 1.73 + i * 0.03, -0.3], { rotation: [0, 0, 0] }));
  });

  // 桌面小物：杯子、笔记本、笔筒、耳机、外置硬盘、便利贴
  const mug = f.cylinder(0.095, 0.085, 0.18, f.material('cream', { roughness: 0.5 }), [-1.23, 1.2, 0.3], 16);
  root.add(mug);
  root.add(f.cylinder(0.08, 0.08, 0.012, f.material(0x6f442b), [-1.23, 1.285, 0.3], 16));
  const mugHandle = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.018, 5, 12), f.material('cream'));
  mugHandle.position.set(-1.13, 1.2, 0.3);
  mugHandle.rotation.y = Math.PI / 2;
  root.add(mugHandle);

  root.add(f.rounded(0.32, 0.035, 0.4, 0.015, f.material('amber', { roughness: 0.7 }), [0.33, 1.12, 0.15], { rotation: [0, -0.2, 0] }));
  root.add(f.box(0.24, 0.012, 0.3, f.material(0xfff8ea), [0.33, 1.14, 0.15], { rotation: [0, -0.2, 0] }));
  for (let i = 0; i < 3; i++) {
    root.add(f.box(0.18, 0.006, 0.012, f.material(0x6b7a91), [0.33, 1.15, 0.02 + i * 0.06], { rotation: [0, -0.2, 0] }));
  }

  const cupMat = f.material(0x31445f, { roughness: 0.5 });
  root.add(f.cylinder(0.07, 0.06, 0.12, cupMat, [1.3, 1.16, 0.22], 12));
  [-0.035, 0, 0.035].forEach((x) => {
    root.add(f.box(0.012, 0.24, 0.012, f.material('amber'), [1.3 + x, 1.33, 0.22], { rotation: [0, 0, x * 6] }));
  });

  // 桌面盆栽
  root.add(f.cylinder(0.075, 0.06, 0.13, f.material('coral'), [1.18, 1.14, 0.38], 12));
  for (let i = 0; i < 5; i++) {
    const leaf = f.sphere(0.055, f.material('leaf'), [1.18 + Math.cos(i * 1.9) * 0.06, 1.25 + (i % 3) * 0.05, 0.38 + Math.sin(i * 1.9) * 0.05], 8);
    leaf.scale.set(0.65, 1.4, 0.5);
    leaf.rotation.z = (i - 2) * 0.3;
    root.add(leaf);
  }

  // 耳机支架
  root.add(f.cylinder(0.022, 0.022, 0.24, metal, [-1.58, 1.2, 0.3], 8));
  const headphones = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 6, 18, Math.PI * 1.25), f.material(0x26354b, { roughness: 0.5 }));
  headphones.position.set(-1.58, 1.36, 0.3);
  headphones.rotation.set(Math.PI / 2, 0, 0.3);
  root.add(headphones);

  // 便利贴与笔
  root.add(f.rounded(0.2, 0.006, 0.16, 0.008, f.material('amber'), [0.9, 1.14, 0.41], { rotation: [0, 0.18, 0] }));
  root.add(f.box(0.012, 0.012, 0.22, f.material('pink'), [-0.0, 1.15, 0.45], { rotation: [0, 0.6, 0] }));

  // 机箱在桌右侧
  const pc = new THREE.Group();
  pc.position.set(1.86, 0.68, -0.15);
  pc.add(f.rounded(0.58, 1.16, 0.78, 0.05, f.material(0x151f2d, { roughness: 0.34, metalness: 0.45 }), [0, 0, 0]));
  pc.add(f.rounded(0.47, 0.92, 0.025, 0.03, f.material('glass', { transparent: true, opacity: 0.34, roughness: 0.12, metalness: 0.2 }), [0, 0, 0.4]));
  const pcFans = [];
  for (let i = 0; i < 3; i++) {
    const fan = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.018, 5, 14), f.basic(i === 1 ? 0xf4a6c1 : 0x6bc5f8));
    fan.position.set(0, 0.34 - i * 0.3, 0.42);
    pc.add(fan);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.015), f.basic(0xdce9ff, { transparent: true, opacity: 0.55 }));
    blade.position.copy(fan.position);
    blade.rotation.z = i * 0.9;
    pc.add(blade);
    pcFans.push({ fan, blade });
  }
  root.add(pc);

  // 桌下走线槽、插座和线缆
  root.add(f.rounded(2.8, 0.07, 0.24, 0.025, f.material(0x2a3548, { roughness: 0.55 }), [0, 0.78, -0.28]));
  const cableMat = f.material(0x121b29, { roughness: 0.95 });
  addTube(f, [
    [0.86, 1.68, -0.3],
    [1.1, 1.35, -0.2],
    [1.35, 1.08, -0.02],
    [1.62, 0.92, 0.12]
  ], 0.012, cableMat, root);
  addTube(f, [
    [-0.15, 1.44, -0.5],
    [0.05, 1.1, -0.55],
    [0.5, 0.85, -0.45],
    [0.8, 0.78, -0.3]
  ], 0.014, cableMat, root);
  addTube(f, [
    [-0.45, 1.13, 0.26],
    [0.1, 1.05, 0.4],
    [0.7, 1.02, 0.48],
    [1.1, 1.04, 0.34]
  ], 0.008, f.material(0x0d1520), root);

  // 桌灯：暖色小灯，世界构建器会在附近加柔光
  const lamp = new THREE.Group();
  lamp.position.set(-1.62, 1.12, -0.22);
  lamp.add(f.cylinder(0.09, 0.11, 0.035, metal, [0, 0, 0], 12));
  lamp.add(f.cylinder(0.018, 0.018, 0.72, metal, [0, 0.37, 0], 8, { rotation: [0, 0, -0.18] }));
  lamp.add(f.cylinder(0.018, 0.018, 0.42, metal, [0.17, 0.7, 0.02], 8, { rotation: [0, 0, 1.12] }));
  const lampShade = f.cone(0.14, 0.18, f.material('amber', { roughness: 0.5 }), [0.36, 0.58, 0.03], 12, { rotation: [0, 0, Math.PI] });
  lamp.add(lampShade);
  const lampBulb = f.sphere(0.055, f.basic(0xffe1a1), [0.36, 0.51, 0.03], 10);
  lamp.add(lampBulb);
  root.add(lamp);

  // 插座、线槽与墙面延伸线
  const wallKit = new THREE.Group();
  wallKit.position.set(0.2, 2.2, -1.27);
  const outletPlate = f.rounded(0.18, 0.26, 0.035, 0.025, f.material(0xf0e8db, { roughness: 0.6 }), [0, 0, 0]);
  wallKit.add(outletPlate);
  wallKit.add(f.box(0.055, 0.075, 0.02, f.material(0x253046), [-0.04, 0.055, 0.025]));
  wallKit.add(f.box(0.055, 0.075, 0.02, f.material(0x253046), [0.04, 0.055, 0.025]));
  wallKit.add(f.box(0.03, 0.03, 0.02, f.material(0x253046), [0, -0.06, 0.025]));
  root.add(wallKit);
  root.add(f.rounded(0.045, 1.15, 0.035, 0.012, f.material(0xe8dfd1, { roughness: 0.7 }), [-1.65, 2.82, -1.28]));
  root.add(f.rounded(2.0, 0.045, 0.035, 0.012, f.material(0xe8dfd1, { roughness: 0.7 }), [-0.65, 3.37, -1.28]));

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });

  return {
    root,
    screens,
    keyMeshes,
    monitors,
    pc,
    lampBulb,
    deskTop,
    update(dt, elapsed, overdrive, reducedMotion = false) {
      const pulse = overdrive ? 1.24 + Math.sin(elapsed * 10) * 0.2 : 1;
      for (const screen of screens) {
        screen.material.emissiveIntensity = (overdrive ? 1.25 : 0.9) * pulse;
      }
      if (!reducedMotion) {
        pcFans.forEach(({ fan, blade }) => {
          fan.rotation.z += dt * (overdrive ? 8 : 2.4);
          blade.rotation.z += dt * (overdrive ? 10 : 3);
        });
      }
      lampBulb.material.color.setHex(overdrive ? 0x9be8ff : 0xffe1a1);
    }
  };
}

export function createErgonomicChair(factory) {
  const f = factory;
  const root = f.group('ergonomic-chair');
  const metal = f.material(0x65758e, { roughness: 0.32, metalness: 0.65 });
  const dark = f.material(0x1b2638, { roughness: 0.55 });
  const fabric = f.material('blue', { roughness: 0.75 });
  const edge = f.material('sky', { roughness: 0.52 });

  const base = f.group('chair-base');
  base.position.y = 0;
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const arm = f.box(0.62, 0.05, 0.09, metal, [Math.cos(angle) * 0.31, 0.08, Math.sin(angle) * 0.31], { rotation: [0, -angle, 0] });
    base.add(arm);
    base.add(f.sphere(0.055, dark, [Math.cos(angle) * 0.64, 0.06, Math.sin(angle) * 0.64], 8));
  }
  base.add(f.cylinder(0.055, 0.07, 0.54, metal, [0, 0.36, 0], 10));
  root.add(base);

  const seat = f.rounded(0.78, 0.14, 0.72, 0.08, fabric, [0, 0.68, 0.08]);
  const back = f.rounded(0.72, 1.02, 0.12, 0.08, dark, [0, 1.22, 0.4], { rotation: [-0.1, 0, 0] });
  const backAccent = f.rounded(0.5, 0.28, 0.03, 0.05, edge, [0, 1.16, 0.475], { rotation: [-0.1, 0, 0] });
  const headrest = f.rounded(0.44, 0.2, 0.13, 0.06, dark, [0, 1.78, 0.38], { rotation: [-0.14, 0, 0] });
  const armL = f.rounded(0.1, 0.3, 0.4, 0.04, dark, [-0.46, 0.94, 0.1]);
  const armR = f.rounded(0.1, 0.3, 0.4, 0.04, dark, [0.46, 0.94, 0.1]);
  root.add(seat, back, backAccent, headrest, armL, armR);
  root.add(f.cylinder(0.05, 0.05, 0.22, metal, [0, 0.52, 0.12], 8, { rotation: [0.25, 0, 0] }));
  root.add(f.box(0.7, 0.04, 0.04, metal, [0, 0.52, 0.35]));
  root.add(f.box(0.42, 0.05, 0.16, metal, [0, 0.04, 0.05]));

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });
  return { root };
}

export function createPegboard(factory) {
  const f = factory;
  const root = f.group('geek-pegboard');
  const board = f.rounded(3.35, 1.52, 0.08, 0.04, f.material(0x27344b, { roughness: 0.68 }), [0, 0, 0]);
  root.add(board);
  const pegMat = f.material(0x0d1520, { roughness: 0.9 });
  const cols = f.quality.tier === 'low' ? 10 : 16;
  const rows = f.quality.tier === 'low' ? 5 : 7;
  const pegGeometry = new THREE.CylinderGeometry(0.017, 0.017, 0.022, 6);
  const pegs = new THREE.InstancedMesh(pegGeometry, pegMat, cols * rows);
  const pegDummy = new THREE.Object3D();
  let pegIndex = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      pegDummy.position.set(-1.46 + x * 0.194, -0.61 + y * 0.203, 0.055);
      pegDummy.rotation.set(Math.PI / 2, 0, 0);
      pegDummy.updateMatrix();
      pegs.setMatrixAt(pegIndex, pegDummy.matrix);
      pegIndex += 1;
    }
  }
  pegs.castShadow = false;
  pegs.receiveShadow = true;
  root.add(pegs);
  // 洞洞板配件：键盘、手柄、耳机、便签、工具
  root.add(f.rounded(0.58, 0.18, 0.06, 0.02, f.material('cream', { roughness: 0.65 }), [-1.03, 0.43, 0.09], { rotation: [0, 0.06, 0.08] }));
  for (let i = 0; i < 9; i++) {
    root.add(f.box(0.035, 0.018, 0.028, i === 4 ? f.material('pink') : f.material(0x8fa1b8), [-1.25 + i * 0.052, 0.43, 0.13], { rotation: [0, 0.06, 0.08] }));
  }
  const controller = f.rounded(0.36, 0.16, 0.08, 0.07, f.material(0x2a3549), [-0.15, 0.49, 0.1], { rotation: [0, -0.06, -0.12] });
  root.add(controller);
  root.add(f.cylinder(0.055, 0.055, 0.025, f.material(0x52647d), [-0.32, 0.48, 0.145], 10, { rotation: [Math.PI / 2, 0, 0] }));
  root.add(f.cylinder(0.055, 0.055, 0.025, f.material(0x52647d), [0.02, 0.48, 0.145], 10, { rotation: [Math.PI / 2, 0, 0] }));
  const headset = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 18, Math.PI), f.material(0xe0e7f0));
  headset.position.set(1.0, 0.48, 0.1);
  root.add(headset);
  root.add(f.cylinder(0.07, 0.07, 0.05, f.material(0x26354b), [0.8, 0.48, 0.1], 12, { rotation: [0, 0, Math.PI / 2] }));
  root.add(f.cylinder(0.07, 0.07, 0.05, f.material(0x26354b), [1.2, 0.48, 0.1], 12, { rotation: [0, 0, Math.PI / 2] }));

  const stickyColors = ['amber', 'pink', 'mint', 'sky'];
  for (let i = 0; i < 6; i++) {
    const sticky = f.box(0.18, 0.14, 0.012, f.material(stickyColors[i % 4]), [0.45 + (i % 3) * 0.22, 0.16 - Math.floor(i / 3) * 0.21, 0.06], { rotation: [0, 0, (i % 2 ? -1 : 1) * 0.05] });
    root.add(sticky);
    root.add(f.box(0.12, 0.008, 0.014, f.material(0x27344b), [0.45 + (i % 3) * 0.22, 0.18 - Math.floor(i / 3) * 0.21, 0.07]));
  }

  // GitHub 贡献格
  const commitGroup = new THREE.Group();
  commitGroup.position.set(-0.15, -0.4, 0.075);
  const commitBg = f.rounded(0.95, 0.36, 0.025, 0.02, f.material(0x172235, { roughness: 0.75 }), [0, 0, 0]);
  commitGroup.add(commitBg);
  const green = f.material(0x3dbb8b);
  const greenDim = f.material(0x235a4b);
  const greenBright = f.material(0x7bd6b1);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 12; x++) {
      const active = (x * 7 + y * 3) % 5;
      const tile = f.box(0.055, 0.055, 0.012, active === 0 ? greenDim : active === 1 ? green : greenBright, [-0.4 + x * 0.073, -0.1 + y * 0.073, 0.025]);
      commitGroup.add(tile);
    }
  }
  commitGroup.add(f.box(0.26, 0.012, 0.014, f.material(0x8fa1b8), [-0.25, -0.2, 0.05]));
  root.add(commitGroup);

  // 小搁板、小盆栽和照片
  root.add(f.rounded(0.9, 0.045, 0.22, 0.02, f.material('wood'), [0.98, -0.55, 0.14]));
  root.add(f.cylinder(0.075, 0.055, 0.14, f.material('coral'), [1.22, -0.45, 0.14], 10));
  for (let i = 0; i < 4; i++) {
    const leaf = f.sphere(0.06, f.material('leaf'), [1.22 + Math.cos(i * 1.6) * 0.06, -0.35 + (i % 2) * 0.06, 0.14 + Math.sin(i * 1.6) * 0.05], 8);
    leaf.scale.set(0.6, 1.3, 0.5);
    root.add(leaf);
  }
  const photo = f.box(0.34, 0.26, 0.02, f.material('cream'), [0.72, -0.43, 0.14], { rotation: [0, 0.06, 0.05] });
  root.add(photo);
  root.add(f.box(0.27, 0.19, 0.022, f.material('sky'), [0.72, -0.43, 0.155], { rotation: [0, 0.06, 0.05] }));

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = true;
    }
  });
  return { root };
}

export function createBookshelf(factory) {
  const f = factory;
  const root = f.group('bookshelf');
  const wood = f.material('wood', { roughness: 0.62 });
  const woodDark = f.material('woodDark', { roughness: 0.65 });
  const paper = f.material('paper', { roughness: 0.7 });
  const colors = ['coral', 'sky', 'mint', 'amber', 'lavender', 'rose', 'cream', 'blue'];
  const width = 1.9;
  const height = 2.25;
  const depth = 0.44;
  root.add(f.rounded(width, height, 0.08, 0.03, woodDark, [0, height / 2, -depth / 2]));
  root.add(f.rounded(0.1, height, depth, 0.025, wood, [-width / 2 + 0.05, height / 2, 0]));
  root.add(f.rounded(0.1, height, depth, 0.025, wood, [width / 2 - 0.05, height / 2, 0]));
  root.add(f.rounded(width, 0.1, depth, 0.025, wood, [0, height - 0.05, 0]));
  root.add(f.rounded(width, 0.07, depth, 0.02, woodDark, [0, 0.06, 0]));
  for (let i = 0; i < 5; i++) {
    const y = 0.4 + i * 0.42;
    root.add(f.rounded(width - 0.16, 0.055, depth - 0.03, 0.02, wood, [0, y, 0.01]));
  }

  // 书：逐本配色，但用一个 InstancedMesh 承载，避免 40+ 个独立 draw call。
  let bookIndex = 0;
  const bookRows = [0.48, 0.9, 1.32, 1.74, 2.02];
  const bookData = [];
  bookRows.forEach((baseY, row) => {
    const count = f.quality.tier === 'low' ? 5 : 8;
    let x = -width / 2 + 0.18;
    for (let i = 0; i < count; i++) {
      const w = 0.075 + ((bookIndex * 7) % 5) * 0.014;
      const h = 0.21 + ((bookIndex * 3) % 6) * 0.026;
      const d = 0.25 + ((bookIndex * 5) % 4) * 0.012;
      bookData.push({
        x: x + w / 2,
        y: baseY + h / 2,
        z: 0.03,
        w,
        h,
        d,
        tilt: bookIndex % 9 === 0 ? -0.12 : 0,
        color: PALETTE[colors[bookIndex % colors.length]] || 0x999999
      });
      x += w + 0.018;
      bookIndex += 1;
    }
  });
  const bookGeometry = new THREE.BoxGeometry(1, 1, 1);
  const bookMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
  const books = new THREE.InstancedMesh(bookGeometry, bookMaterial, bookData.length);
  const pageGeometry = new THREE.BoxGeometry(1, 1, 1);
  const pageMaterial = f.material(0xfff8ea, { roughness: 0.7 });
  const pages = new THREE.InstancedMesh(pageGeometry, pageMaterial, bookData.length);
  const bookDummy = new THREE.Object3D();
  const bookColor = new THREE.Color();
  bookData.forEach((book, index) => {
    bookDummy.position.set(book.x, book.y, book.z);
    bookDummy.scale.set(book.w, book.h, book.d);
    bookDummy.rotation.set(0, 0, book.tilt);
    bookDummy.updateMatrix();
    books.setMatrixAt(index, bookDummy.matrix);
    books.setColorAt(index, bookColor.setHex(book.color));
    // 薄薄的书口/书签细节，仍合并为一次 draw call。
    bookDummy.position.set(book.x, book.y - book.h * 0.1, 0.17);
    bookDummy.scale.set(book.w * 0.82, 0.012, 0.018);
    bookDummy.rotation.set(0, 0, book.tilt);
    bookDummy.updateMatrix();
    pages.setMatrixAt(index, bookDummy.matrix);
  });
  books.instanceColor.needsUpdate = true;
  books.castShadow = false;
  books.receiveShadow = true;
  pages.castShadow = false;
  pages.receiveShadow = true;
  root.add(books, pages);
  bookRows.forEach((baseY, row) => {
    if (row < 3) {
      // 横放书堆
      for (let i = 0; i < 2; i++) {
        root.add(f.rounded(0.38 - i * 0.03, 0.055, 0.24, 0.01, f.material(colors[(row + i + 2) % colors.length]), [width / 2 - 0.37, baseY + 0.05 + i * 0.06, 0.04], { rotation: [0, 0.06, 0] }));
      }
    }
  });

  // 装饰：小相机、植物、收纳盒、奖杯
  const shelfY = 2.02;
  root.add(f.rounded(0.36, 0.24, 0.27, 0.035, f.material(0x26354b), [-width / 2 + 0.35, shelfY + 0.13, 0.03]));
  root.add(f.cylinder(0.09, 0.09, 0.1, f.material(0x111b2d), [-width / 2 + 0.35, shelfY + 0.13, 0.18], 14, { rotation: [Math.PI / 2, 0, 0] }));
  root.add(f.cylinder(0.055, 0.055, 0.02, f.material('sky'), [-width / 2 + 0.35, shelfY + 0.13, 0.235], 14, { rotation: [Math.PI / 2, 0, 0] }));
  root.add(f.sphere(0.08, f.material('amber', { metalness: 0.45 }), [width / 2 - 0.24, shelfY + 0.22, 0.02], 10));
  root.add(f.cylinder(0.12, 0.14, 0.08, f.material('amber', { metalness: 0.45 }), [width / 2 - 0.24, shelfY + 0.09, 0.02], 10));
  root.add(f.cylinder(0.075, 0.07, 0.16, f.material('cream'), [width / 2 - 0.6, shelfY + 0.08, 0.02], 12));
  for (let i = 0; i < 5; i++) {
    const leaf = f.sphere(0.07, f.material('leaf'), [width / 2 - 0.6 + Math.cos(i * 1.7) * 0.07, shelfY + 0.2 + (i % 2) * 0.06, 0.02 + Math.sin(i * 1.7) * 0.05], 8);
    leaf.scale.set(0.65, 1.4, 0.5);
    leaf.rotation.z = (i - 2) * 0.2;
    root.add(leaf);
  }

  // 侧边小书堆
  root.add(f.box(0.5, 0.04, 0.34, paper, [width / 2 + 0.18, 0.1, 0.1], { rotation: [0, 0.16, 0.02] }));
  root.add(f.box(0.42, 0.035, 0.3, f.material('pink'), [width / 2 + 0.18, 0.15, 0.12], { rotation: [0, -0.12, -0.03] }));

  // 书架顶端温暖灯带
  root.add(f.box(width - 0.25, 0.018, 0.02, f.basic(0xffd48a, { transparent: true, opacity: 0.65 }), [0, height + 0.01, 0.19]));

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });
  return { root };
}

export function createCoffeeBar(factory) {
  const f = factory;
  const root = f.group('coffee-bar');
  const wood = f.material('wood', { roughness: 0.58 });
  const woodDark = f.material('woodDark', { roughness: 0.65 });
  const metal = f.material(0x8d9aab, { roughness: 0.3, metalness: 0.68 });
  const dark = f.material(0x263246, { roughness: 0.5 });
  const red = f.material('coral', { roughness: 0.38, metalness: 0.28 });
  const cream = f.material('cream', { roughness: 0.55 });

  const counter = f.group();
  counter.add(f.rounded(2.3, 1.04, 1.08, 0.07, f.material(0x39465c, { roughness: 0.6 }), [0, 0.56, 0]));
  counter.add(f.rounded(2.42, 0.12, 1.18, 0.04, wood, [0, 1.12, 0]));
  counter.add(f.rounded(2.24, 0.06, 1.0, 0.03, woodDark, [0, 0.07, 0]));
  for (const x of [-0.57, 0.57]) {
    counter.add(f.rounded(0.97, 0.65, 0.035, 0.02, f.material(0x334158, { roughness: 0.66 }), [x, 0.6, 0.55]));
    counter.add(f.cylinder(0.045, 0.045, 0.1, metal, [x + (x < 0 ? 0.4 : -0.4), 0.64, 0.58], 8, { rotation: [Math.PI / 2, 0, 0] }));
  }
  counter.add(f.box(2.25, 0.055, 0.06, woodDark, [0, 1.02, 0.55]));
  root.add(counter);

  // 咖啡机
  const machine = f.group();
  machine.position.set(-0.58, 1.18, -0.12);
  machine.add(f.rounded(0.84, 0.66, 0.6, 0.06, red, [0, 0.35, 0]));
  machine.add(f.rounded(0.9, 0.08, 0.66, 0.03, f.material(0xa84f43, { roughness: 0.4 }), [0, 0.71, 0]));
  machine.add(f.rounded(0.54, 0.16, 0.04, 0.02, f.material(0x121b2a, { roughness: 0.4 }), [0, 0.5, 0.31]));
  machine.add(f.cylinder(0.075, 0.075, 0.04, f.material('cream'), [0.17, 0.51, 0.34], 16, { rotation: [Math.PI / 2, 0, 0] }));
  machine.add(f.cylinder(0.045, 0.045, 0.045, f.material('amber'), [0.17, 0.51, 0.36], 12, { rotation: [Math.PI / 2, 0, 0] }));
  machine.add(f.cylinder(0.042, 0.042, 0.24, metal, [-0.24, 0.24, 0.34], 10, { rotation: [0, 0, 0.2] }));
  machine.add(f.cylinder(0.065, 0.05, 0.08, dark, [-0.24, 0.1, 0.34], 12));
  machine.add(f.cylinder(0.02, 0.02, 0.25, metal, [0.38, 0.3, 0.28], 8, { rotation: [Math.PI / 2, 0, 0] }));
  machine.add(f.rounded(0.56, 0.05, 0.3, 0.02, dark, [0, 0.03, 0.3]));
  for (let i = 0; i < 4; i++) {
    machine.add(f.cylinder(0.035, 0.035, 0.06, cream, [-0.18 + i * 0.12, 0.69, 0.26], 10));
  }
  root.add(machine);

  // 磨豆机
  const grinder = f.group();
  grinder.position.set(0.35, 1.18, -0.16);
  grinder.add(f.cylinder(0.16, 0.2, 0.46, dark, [0, 0.23, 0], 14));
  grinder.add(f.cylinder(0.12, 0.15, 0.2, f.material('glass', { transparent: true, opacity: 0.5 }), [0, 0.56, 0], 12));
  grinder.add(f.cylinder(0.13, 0.13, 0.05, f.material('amber'), [0, 0.67, 0], 12));
  grinder.add(f.cylinder(0.09, 0.09, 0.02, metal, [0, 0.7, 0], 12));
  grinder.add(f.cylinder(0.055, 0.055, 0.22, dark, [0, 0.17, 0.18], 10, { rotation: [Math.PI / 2, 0, 0] }));
  root.add(grinder);

  // 手冲壶、滤杯、杯子
  const kettle = f.group();
  kettle.position.set(0.95, 1.18, 0.08);
  kettle.add(f.sphere(0.16, f.material('cream', { metalness: 0.25, roughness: 0.38 }), [0, 0.17, 0], 14));
  kettle.add(f.cylinder(0.03, 0.04, 0.22, metal, [0.15, 0.22, 0], 8, { rotation: [0, 0, -0.65] }));
  kettle.add(f.cylinder(0.09, 0.06, 0.025, dark, [0, 0.34, 0], 10));
  root.add(kettle);

  const dripper = f.group();
  dripper.position.set(0.93, 1.18, -0.26);
  dripper.add(f.cylinder(0.15, 0.1, 0.2, f.material('paper'), [0, 0.16, 0], 8));
  dripper.add(f.cylinder(0.07, 0.07, 0.02, dark, [0, 0.27, 0], 12));
  root.add(dripper);

  const cup = f.group();
  cup.position.set(0.95, 1.18, 0.35);
  cup.add(f.cylinder(0.1, 0.085, 0.18, cream, [0, 0.09, 0], 16));
  cup.add(f.cylinder(0.075, 0.075, 0.012, f.material(0x6b3f27), [0, 0.181, 0], 16));
  const cupHandle = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.018, 5, 12), cream);
  cupHandle.position.set(0.1, 0.1, 0);
  cupHandle.rotation.y = Math.PI / 2;
  cup.add(cupHandle);
  root.add(cup);

  // 小杯架和豆罐
  root.add(f.rounded(0.34, 0.03, 0.18, 0.015, woodDark, [-1.0, 1.68, 0.2]));
  for (let i = 0; i < 3; i++) {
    root.add(f.cylinder(0.055, 0.045, 0.1, [cream, f.material('pink'), f.material('mint')][i], [-1.13 + i * 0.13, 1.75, 0.2], 12));
  }
  root.add(f.cylinder(0.11, 0.11, 0.2, f.material('glass', { transparent: true, opacity: 0.45 }), [-0.93, 1.33, -0.32], 12));
  root.add(f.cylinder(0.08, 0.08, 0.11, f.material('woodDark'), [-0.93, 1.24, -0.32], 12));

  // 蒸汽：用半透明环，更新时上升
  const steamParts = [];
  for (let i = 0; i < 4; i++) {
    const steam = new THREE.Mesh(
      new THREE.TorusGeometry(0.04 + i * 0.008, 0.009, 5, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false })
    );
    steam.rotation.x = Math.PI / 2;
    steam.position.set(0.95 + (i - 1.5) * 0.03, 1.42 + i * 0.1, 0.35);
    root.add(steam);
    steamParts.push(steam);
  }

  // 咖啡角招牌
  const signTex = makeSignTexture({ title: 'COFFEE', subtitle: 'BUG REPELLENT · 24H', accent: '#ffd48a', bg: '#3b2a2e' });
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissive: 0x332014, emissiveMap: signTex, emissiveIntensity: 0.5, roughness: 0.55 });
  const sign = f.mesh(new THREE.PlaneGeometry(1.1, 0.32), signMat, [0, 2.05, -0.03]);
  root.add(sign);
  root.add(f.box(1.2, 0.42, 0.04, woodDark, [0, 2.05, -0.07]));

  // 小灯串
  for (let i = 0; i < 7; i++) {
    const bulb = f.sphere(0.025, f.basic(0xffd48a), [-1.05 + i * 0.35, 2.21 - Math.sin(i * 2.2) * 0.05, 0.02], 7);
    root.add(bulb);
  }

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });

  return {
    root,
    cup,
    steamParts,
    machine,
    update(dt, elapsed, boosted, reducedMotion) {
      const active = boosted || !reducedMotion;
      steamParts.forEach((steam, i) => {
        steam.visible = active;
        steam.position.y = 1.38 + ((elapsed * 0.16 + i * 0.22) % 0.7);
        steam.position.x = 0.95 + Math.sin(elapsed * 1.2 + i) * 0.06;
        steam.material.opacity = active ? 0.32 * (1 - ((elapsed * 0.16 + i * 0.22) % 0.7) / 0.7) : 0.18;
        steam.rotation.z += dt * 0.35;
      });
      cup.position.y = 1.18 + (boosted ? Math.abs(Math.sin(elapsed * 8)) * 0.24 : 0);
      cup.rotation.y = boosted ? elapsed * 3 : 0;
      machine.rotation.z = boosted ? Math.sin(elapsed * 12) * 0.012 : 0;
    }
  };
}

export function createLounge(factory) {
  const f = factory;
  const root = f.group('lounge');
  const fabric = f.material(0x30425f, { roughness: 0.86 });
  const fabricLight = f.material(0x3d5271, { roughness: 0.86 });
  const cushionA = f.material('amber', { roughness: 0.78 });
  const cushionB = f.material('pink', { roughness: 0.78 });
  const wood = f.material('wood', { roughness: 0.62 });
  const metal = f.material(0x59697f, { roughness: 0.35, metalness: 0.6 });

  // 地毯
  const rugMat = new THREE.MeshStandardMaterial({ map: makeRugTexture(), roughness: 0.95 });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.1), rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.012;
  rug.receiveShadow = true;
  root.add(rug);

  // 双人沙发，面向本地 +Z
  const sofa = f.group('sofa');
  sofa.position.set(0, 0, -0.25);
  sofa.add(f.rounded(2.6, 0.52, 1.1, 0.14, fabric, [0, 0.4, 0]));
  sofa.add(f.rounded(2.22, 0.2, 0.88, 0.08, fabricLight, [-0.02, 0.59, 0.06]));
  sofa.add(f.rounded(2.5, 0.84, 0.28, 0.13, fabric, [0, 0.8, -0.43]));
  sofa.add(f.rounded(0.32, 0.72, 1.1, 0.12, fabric, [-1.23, 0.52, 0]));
  sofa.add(f.rounded(0.32, 0.72, 1.1, 0.12, fabric, [1.23, 0.52, 0]));
  for (const x of [-1.08, 1.08]) {
    sofa.add(f.rounded(0.12, 0.22, 0.12, 0.03, wood, [x, 0.08, 0]));
  }
  const pillowL = f.rounded(0.52, 0.52, 0.2, 0.13, cushionA, [-0.72, 0.84, -0.12], { rotation: [0.1, 0.2, -0.08] });
  const pillowR = f.rounded(0.44, 0.44, 0.18, 0.11, cushionB, [0.66, 0.8, -0.1], { rotation: [0.08, -0.22, 0.08] });
  sofa.add(pillowL, pillowR);
  root.add(sofa);

  // 沙发上的猫垫
  const catCushion = f.rounded(0.68, 0.12, 0.58, 0.14, f.material('cream', { roughness: 0.92 }), [0.28, 0.7, 0.18]);
  root.add(catCushion);

  // 茶几
  const table = f.group('coffee-table');
  table.position.set(0.1, 0, 1.55);
  table.add(f.rounded(1.6, 0.09, 0.82, 0.12, wood, [0, 0.53, 0]));
  for (const x of [-0.65, 0.65]) {
    for (const z of [-0.3, 0.3]) {
      table.add(f.cylinder(0.035, 0.035, 0.5, metal, [x, 0.27, z], 8));
    }
  }
  table.add(f.rounded(1.34, 0.04, 0.56, 0.02, f.material('woodDark'), [0, 0.22, 0]));
  table.add(f.rounded(0.3, 0.035, 0.24, 0.015, f.material('pink'), [-0.32, 0.59, 0.04], { rotation: [0, 0.2, 0] }));
  table.add(f.cylinder(0.075, 0.06, 0.12, f.material('cream'), [0.35, 0.63, -0.1], 12));
  table.add(f.cylinder(0.06, 0.06, 0.01, f.material(0x6b3f27), [0.35, 0.695, -0.1], 12));
  table.add(f.cylinder(0.055, 0.04, 0.1, f.material('glass', { transparent: true, opacity: 0.6 }), [0.55, 0.61, 0.18], 10));
  table.add(f.sphere(0.06, f.material('mint'), [0.55, 0.68, 0.18], 8));
  root.add(table);

  // 落地灯
  const floorLamp = f.group('floor-lamp');
  floorLamp.position.set(-1.78, 0, 0.6);
  floorLamp.add(f.cylinder(0.24, 0.3, 0.05, metal, [0, 0.03, 0], 16));
  floorLamp.add(f.cylinder(0.028, 0.028, 1.65, metal, [0, 0.86, 0], 8));
  const lampShade = f.cone(0.36, 0.32, f.material('amber', { roughness: 0.62 }), [0, 1.74, 0], 18);
  lampShade.rotation.x = Math.PI;
  floorLamp.add(lampShade);
  const lampBulb = f.sphere(0.11, f.basic(0xffe1a1), [0, 1.62, 0], 12);
  floorLamp.add(lampBulb);
  root.add(floorLamp);

  // 边桌和绿植
  root.add(f.rounded(0.55, 0.06, 0.55, 0.1, wood, [1.75, 0.5, 0.9]));
  root.add(f.cylinder(0.06, 0.08, 0.46, metal, [1.75, 0.25, 0.9], 8));
  root.add(f.rounded(0.3, 0.05, 0.3, 0.02, metal, [1.75, 0.03, 0.9]));

  // 小毯子搭在沙发扶手
  const blanket = f.rounded(0.55, 0.5, 0.06, 0.05, cushionB, [1.23, 0.8, 0.26], { rotation: [0.1, 0.1, 0.3] });
  root.add(blanket);

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });

  return { root, lampBulb, catCushion, sofa, table };
}

export function createToolChest(factory) {
  const f = factory;
  const root = f.group('tool-chest');
  const red = f.material('coral', { roughness: 0.46, metalness: 0.2 });
  const dark = f.material(0x243044, { roughness: 0.5, metalness: 0.35 });
  const metal = f.material(0x9ba8b6, { roughness: 0.3, metalness: 0.76 });

  root.add(f.rounded(1.05, 0.7, 0.6, 0.06, red, [0, 0.44, 0]));
  const lid = f.group('lid');
  lid.position.set(0, 0.81, -0.25);
  lid.add(f.rounded(1.05, 0.18, 0.6, 0.06, red, [0, 0.04, 0.25]));
  lid.add(f.box(0.3, 0.06, 0.1, dark, [0, 0.02, 0.57]));
  lid.rotation.x = -0.18;
  root.add(lid);
  for (let i = 0; i < 3; i++) {
    root.add(f.rounded(0.92, 0.14, 0.035, 0.02, dark, [0, 0.22 + i * 0.19, 0.31]));
    root.add(f.box(0.18, 0.025, 0.03, metal, [0, 0.22 + i * 0.19, 0.335]));
  }
  root.add(f.box(0.7, 0.035, 0.035, metal, [0, 0.42, 0.35]));
  for (const x of [-0.4, 0.4]) {
    for (const z of [-0.19, 0.25]) {
      root.add(f.cylinder(0.06, 0.06, 0.06, dark, [x, 0.04, z], 10, { rotation: [0, 0, Math.PI / 2] }));
    }
  }
  const stickerColors = ['sky', 'amber', 'mint', 'pink'];
  for (let i = 0; i < 5; i++) {
    const sticker = f.rounded(0.16, 0.11, 0.01, 0.02, f.material(stickerColors[i % 4]), [-0.4 + (i % 3) * 0.2, 0.52 - Math.floor(i / 3) * 0.16, 0.312], { rotation: [0, 0, (i % 2 ? -1 : 1) * 0.04] });
    root.add(sticker);
  }
  // 露出一截扳手
  root.add(f.box(0.06, 0.26, 0.04, metal, [0.3, 0.85, 0.14], { rotation: [0, 0.2, -0.3] }));
  root.add(f.cylinder(0.08, 0.05, 0.05, metal, [0.37, 0.98, 0.14], 8));

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });
  return { root, lid };
}

export function createNoticeBoard(factory) {
  const f = factory;
  const root = f.group('notice-board');
  const wood = f.material('wood', { roughness: 0.65 });
  const dark = f.material(0x1e2b3e, { roughness: 0.58 });
  const corkMat = new THREE.MeshStandardMaterial({ map: makeBulletinTexture(), roughness: 0.94 });
  const board = new THREE.Group();
  board.position.y = 1.24;
  board.rotation.x = -0.08;
  board.add(f.rounded(1.5, 1.1, 0.08, 0.04, wood, [0, 0, 0]));
  const cork = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.96), corkMat);
  cork.position.set(0, 0, 0.05);
  board.add(cork);
  board.add(f.box(1.5, 0.03, 0.04, dark, [0, 0.56, 0.02]));
  // 几枚图钉
  ['pink', 'sky', 'amber'].forEach((color, i) => {
    board.add(f.sphere(0.025, f.material(color), [-0.45 + i * 0.45, 0.32, 0.09], 8));
  });
  root.add(board);
  const legs = f.group();
  legs.position.y = 0.65;
  root.add(legs);
  [-0.62, 0.62].forEach((x) => {
    const leg = f.box(0.08, 1.3, 0.08, wood, [x, 0, 0]);
    leg.rotation.x = -0.18;
    legs.add(leg);
  });
  legs.add(f.box(1.28, 0.06, 0.06, wood, [0, -0.2, 0.03]));
  root.add(f.rounded(0.36, 0.06, 0.2, 0.01, wood, [0.72, 0.55, 0.28], { rotation: [0, 0, -0.2] }));
  root.add(f.box(0.12, 0.3, 0.012, f.material('amber'), [0.73, 0.69, 0.28], { rotation: [0, 0, -0.2] }));

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });
  return { root };
}

export function createDoor(factory, { label = 'STUDIO', sub = 'M1GHTY_2WY' } = {}) {
  const f = factory;
  const root = f.group('door');
  const frame = f.material('woodDark', { roughness: 0.62 });
  const doorMat = f.material('wood', { roughness: 0.6 });
  const brass = f.material('amber', { roughness: 0.28, metalness: 0.7 });
  const glass = f.material('glass', { transparent: true, opacity: 0.34, roughness: 0.12, metalness: 0.2 });

  root.add(f.rounded(0.13, 2.25, 0.16, 0.025, frame, [-0.58, 1.12, 0]));
  root.add(f.rounded(0.13, 2.25, 0.16, 0.025, frame, [0.58, 1.12, 0]));
  root.add(f.rounded(1.3, 0.14, 0.18, 0.03, frame, [0, 2.2, 0]));
  root.add(f.rounded(1.06, 2.02, 0.1, 0.06, doorMat, [0, 1.04, 0.01]));
  root.add(f.rounded(0.34, 0.74, 0.03, 0.06, glass, [0, 1.55, 0.075]));
  root.add(f.rounded(0.38, 0.06, 0.04, 0.02, brass, [0, 1.97, 0.075]));
  root.add(f.rounded(0.38, 0.06, 0.04, 0.02, brass, [0, 1.13, 0.075]));
  root.add(f.sphere(0.055, brass, [0.33, 1.05, 0.1], 12));
  root.add(f.cylinder(0.018, 0.018, 0.1, brass, [0.33, 1.05, 0.15], 8, { rotation: [Math.PI / 2, 0, 0] }));
  root.add(f.box(0.5, 0.025, 0.5, f.material('stoneDark', { roughness: 0.92 }), [0, 0.015, 0.35]));
  // 门牌
  const signTex = makeSignTexture({ title: label, subtitle: sub, accent: '#ffd48a', bg: '#2f2a3c' });
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissive: 0x2a2118, emissiveMap: signTex, emissiveIntensity: 0.4, roughness: 0.5 });
  const sign = f.mesh(new THREE.PlaneGeometry(1.0, 0.28), signMat, [0, 2.55, 0.02]);
  root.add(sign);
  root.add(f.rounded(1.1, 0.35, 0.05, 0.02, frame, [0, 2.55, -0.015]));

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });
  return { root };
}

export function createPendantLamp(factory) {
  const f = factory;
  const root = f.group('pendant-lamp');
  const cord = f.material(0x1b2535, { roughness: 0.8 });
  root.add(f.cylinder(0.012, 0.012, 2.5, cord, [0, 1.25, 0], 6));
  const shade = f.cone(0.68, 0.42, f.material('navySoft', { roughness: 0.62 }), [0, 0.12, 0], 20);
  shade.rotation.x = Math.PI;
  root.add(shade);
  root.add(f.cylinder(0.12, 0.12, 0.06, f.material('amber', { metalness: 0.4 }), [0, -0.1, 0], 14));
  const bulb = f.sphere(0.13, f.basic(0xffdf9e), [0, -0.22, 0], 12);
  root.add(bulb);
  const glow = f.glowSprite('#ffd48a', 2.4, 0.28);
  glow.position.set(0, -0.2, 0);
  root.add(glow);
  return { root, bulb, glow };
}

export function createFloorPlant(factory, { scale = 1 } = {}) {
  const f = factory;
  const root = f.group('floor-plant');
  root.scale.setScalar(scale);
  root.add(f.cylinder(0.26, 0.2, 0.46, f.material('coral', { roughness: 0.68 }), [0, 0.23, 0], 16));
  root.add(f.cylinder(0.22, 0.22, 0.03, f.material('soil'), [0, 0.46, 0], 16));
  const stemMat = f.material('leafDeep', { roughness: 0.8 });
  root.add(f.cylinder(0.028, 0.04, 1.0, stemMat, [0, 0.95, 0], 7));
  const leafCount = f.quality.tier === 'low' ? 5 : 9;
  for (let i = 0; i < leafCount; i++) {
    const angle = (i / leafCount) * Math.PI * 2;
    const leaf = f.sphere(0.18, f.material(i % 3 === 0 ? 'leafLight' : 'leaf'), [Math.cos(angle) * 0.24, 1.1 + (i % 4) * 0.16, Math.sin(angle) * 0.24], 10);
    leaf.scale.set(0.55, 0.14, 1.2);
    leaf.rotation.set(0.2, -angle, Math.cos(angle) * 0.35);
    root.add(leaf);
  }
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });
  return { root };
}

export { makePaintingTexture };
