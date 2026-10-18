/**
 * 世界构建：暖色低多边形庭院 + 可进入的工作室。
 * 所有互动热点、碰撞体、出生点和动画句柄都在这里集中声明。
 */
import * as THREE from 'three';
import {
  createDeskStation,
  createErgonomicChair,
  createPegboard,
  createBookshelf,
  createCoffeeBar,
  createLounge,
  createToolChest,
  createNoticeBoard,
  createDoor,
  createPendantLamp,
  createFloorPlant
} from './assets/furniture.js';
import { createServerRack, createPortal, createCoffeeCart } from './assets/devices.js';
import { createCat } from './assets/cat.js';
import {
  createTree,
  createShrub,
  createGrassTuft,
  createFlowerPatch,
  createFlowerBed,
  createMushrooms,
  createBalconyPlants
} from './assets/plants.js';
import {
  createFacadeSign,
  createHangingSign,
  createNeonSign,
  createWallArt,
  createWayfindingSign,
  createPlaque
} from './assets/signs.js';
import {
  createFence,
  createGate,
  createSteppingPath,
  createPond,
  createBench,
  createMailbox,
  createStringLights,
  createStoneLantern,
  createBicycle,
  createBirdhouse,
  createGardenArch
} from './assets/props.js';
import { createEnvironment } from './environment.js';

function makeAnchor(parent, position) {
  const anchor = new THREE.Object3D();
  anchor.position.set(position[0], position[1], position[2]);
  parent.add(anchor);
  return anchor;
}

function pointLight(factory, zoneRoot, { color, intensity, distance, position, quality }) {
  const light = new THREE.PointLight(color, intensity, distance, 2);
  light.position.set(position[0], position[1], position[2]);
  light.castShadow = false;
  light.visible = quality.tier === 'high' || (quality.tier === 'medium' && distance > 6) || distance >= 9;
  zoneRoot.add(light);
  return light;
}

function makeWindow(factory, parent, {
  position,
  rotationY = 0,
  width = 1.45,
  height = 1.2,
  frameColor = 0x5b4a3d,
  warm = true
}) {
  const f = factory;
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;
  const frame = f.rounded(width + 0.18, height + 0.18, 0.1, 0.02, f.material(frameColor, { roughness: 0.62 }), [0, 0, 0]);
  group.add(frame);
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: warm ? 0xffdba4 : 0x89b4d8,
    emissive: warm ? 0x8e622e : 0x1d3859,
    emissiveIntensity: warm ? 0.55 : 0.4,
    roughness: 0.18,
    metalness: 0.08,
    transparent: true,
    opacity: 0.82
  });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width, height), glassMaterial);
  glass.position.z = 0.061;
  group.add(glass);
  // 十字窗棂
  group.add(f.box(0.045, height, 0.04, f.material(frameColor), [0, 0, 0.09]));
  group.add(f.box(width, 0.045, 0.04, f.material(frameColor), [0, 0, 0.09]));
  // 窗台
  group.add(f.rounded(width + 0.35, 0.09, 0.24, 0.02, f.material('wood', { roughness: 0.6 }), [0, -height / 2 - 0.12, 0.08]));
  // 窗帘
  const curtainMat = f.material(warm ? 0xd3a87c : 0x6a7f9b, { roughness: 0.92 });
  [-1, 1].forEach((side) => {
    const curtain = f.rounded(0.19, height + 0.24, 0.1, 0.05, curtainMat, [side * (width / 2 + 0.16), 0.02, 0.13]);
    curtain.rotation.z = side * 0.02;
    group.add(curtain);
    group.add(f.cylinder(0.022, 0.022, width + 0.7, f.material('woodDark'), [0, height / 2 + 0.2, 0.13], 6, { rotation: [0, 0, Math.PI / 2] }));
  });
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });
  parent.add(group);
  return { group, glassMaterial };
}

function addBaseboard(factory, parent, width, position, rotationY = 0) {
  const f = factory;
  const board = f.rounded(width, 0.16, 0.07, 0.015, f.material('woodDark', { roughness: 0.65 }), position);
  board.rotation.y = rotationY;
  parent.add(board);
}

function buildStudio({ scene, f, quality, hotspots }) {
  const root = f.group('zone-studio');
  root.visible = false;
  const lights = new THREE.Group();
  root.add(lights);

  const floorMat = new THREE.MeshStandardMaterial({ map: f.textures.wood, roughness: 0.67, metalness: 0.02 });
  const wallMat = f.material(0xcbbca9, { roughness: 0.82 });
  const wallShade = f.material(0xb7a68f, { roughness: 0.85 });
  const trim = f.material('woodDark', { roughness: 0.66 });
  const plaster = f.material(0xddcfbb, { roughness: 0.87 });

  // 底座与木地板
  const base = f.rounded(11.3, 0.62, 9.7, 0.26, f.material(0x192334, { roughness: 0.78 }), [0, -0.38, 0.15]);
  root.add(base);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(10.65, 0.14, 8.85), floorMat);
  floor.position.set(0, -0.06, 0.15);
  floor.receiveShadow = true;
  root.add(floor);
  root.add(f.rounded(10.8, 0.1, 8.95, 0.08, trim, [0, -0.16, 0.15]));
  root.add(f.rounded(10.95, 0.12, 9.08, 0.09, f.material(0x1c2a3e, { roughness: 0.82 }), [0, -0.26, 0.15]));

  // 三面墙 + 腰线、踢脚线，正面开放
  const backWall = f.rounded(10.45, 3.85, 0.25, 0.08, wallMat, [0, 1.92, -4.16]);
  const leftWall = f.rounded(0.25, 3.85, 8.65, 0.08, wallShade, [-5.18, 1.92, 0.15]);
  const rightWall = f.rounded(0.25, 3.85, 8.65, 0.08, wallShade, [5.18, 1.92, 0.15]);
  root.add(backWall, leftWall, rightWall);
  addBaseboard(f, root, 10.3, [0, 0.12, -4.01]);
  addBaseboard(f, root, 8.6, [-5.02, 0.12, 0.15], Math.PI / 2);
  addBaseboard(f, root, 8.6, [5.02, 0.12, 0.15], Math.PI / 2);
  // 背墙下半墙裙与木框
  root.add(f.rounded(10.2, 0.95, 0.08, 0.025, f.material(0x7d604b, { roughness: 0.76 }), [0, 0.55, -4.01]));
  root.add(f.rounded(10.25, 0.07, 0.1, 0.02, trim, [0, 1.02, -4.0]));
  root.add(f.rounded(0.12, 3.9, 0.14, 0.02, trim, [0, 1.95, -4.0]));
  // 墙板分隔
  for (let i = 0; i < 5; i++) {
    root.add(f.rounded(0.055, 0.86, 0.03, 0.012, trim, [-3.8 + i * 1.9, 0.56, -3.96]));
  }
  // 顶部梁与墙沿
  root.add(f.rounded(10.5, 0.16, 0.32, 0.04, trim, [0, 3.82, -4.05]));
  root.add(f.rounded(0.36, 0.16, 8.6, 0.04, trim, [-5.05, 3.82, 0.15]));
  root.add(f.rounded(0.36, 0.16, 8.6, 0.04, trim, [5.05, 3.82, 0.15]));

  // 左右墙上的窗（有温暖的窗光）
  const leftWindow = makeWindow(f, root, { position: [-5.06, 2.4, -1.4], rotationY: Math.PI / 2, width: 1.35, height: 1.35, warm: false });
  const rightWindow = makeWindow(f, root, { position: [5.06, 2.4, -1.9], rotationY: -Math.PI / 2, width: 1.5, height: 1.25, warm: true });
  const rightWindow2 = makeWindow(f, root, { position: [5.06, 2.4, 2.6], rotationY: -Math.PI / 2, width: 1.1, height: 1.25, warm: true });
  // 窗外的几颗小星（贴在窗玻璃上，制造夜色）
  for (const [x, y, z] of [[-5.04, 2.72, -1.15], [-5.04, 2.18, -1.62], [5.04, 2.72, -2.18]]) {
    root.add(f.sphere(0.014, f.basic(0xe9f2ff), [x, y, z], 5));
  }

  // 横梁和悬挂灯，增加剖切房间的层次
  root.add(f.rounded(10.6, 0.18, 0.28, 0.04, trim, [0, 4.4, 0.75]));
  root.add(f.rounded(0.18, 0.24, 8.6, 0.03, trim, [-3.2, 4.33, 0.15]));
  root.add(f.rounded(0.18, 0.24, 8.6, 0.03, trim, [3.2, 4.33, 0.15]));
  const pendant = createPendantLamp(f);
  pendant.root.position.set(0, 4.05, 0.75);
  root.add(pendant.root);

  // 墙面艺术与霓虹
  const neon = createNeonSign(f, { title: 'SHIP IT', color: '#f4a6c1', width: 1.5 });
  neon.root.position.set(3.5, 3.25, -4.04);
  root.add(neon.root);
  const art = createWallArt(f, { kind: 0, width: 0.8, height: 1.0, frameColor: 'wood' });
  art.root.position.set(5.02, 2.5, 0.7);
  art.root.rotation.y = -Math.PI / 2;
  root.add(art.root);
  const art2 = createWallArt(f, { kind: 2, width: 0.62, height: 0.78, frameColor: 'cream' });
  art2.root.position.set(-5.02, 2.7, 0.55);
  art2.root.rotation.y = Math.PI / 2;
  root.add(art2.root);
  const plaque = createPlaque(f, 'M1GHTY');
  plaque.root.position.set(-1.4, 2.8, -4.03);
  root.add(plaque.root);

  // 时钟
  const clock = new THREE.Group();
  clock.position.set(1.75, 3.5, -4.0);
  clock.add(f.cylinder(0.26, 0.26, 0.055, f.material(0x16233a, { roughness: 0.5 }), [0, 0, 0], 24, { rotation: [Math.PI / 2, 0, 0] }));
  clock.add(f.cylinder(0.22, 0.22, 0.06, f.material('cream', { roughness: 0.6 }), [0, 0, 0.012], 24, { rotation: [Math.PI / 2, 0, 0] }));
  clock.add(f.box(0.012, 0.13, 0.01, f.material(0x25334b), [0, 0.04, 0.05], { rotation: [0, 0, 0.3] }));
  clock.add(f.box(0.012, 0.09, 0.01, f.material(0x25334b), [0.03, -0.02, 0.05], { rotation: [0, 0, 1.25] }));
  clock.add(f.sphere(0.014, f.basic(0xf5b942), [0, 0, 0.06], 6));
  root.add(clock);

  // 工作台
  const desk = createDeskStation(f);
  desk.root.position.set(-0.55, 0, -2.98);
  root.add(desk.root);
  const chair = createErgonomicChair(f);
  chair.root.position.set(-0.55, 0, -1.78);
  root.add(chair.root);
  const pegboard = createPegboard(f);
  pegboard.root.position.set(-0.55, 3.16, -4.02);
  root.add(pegboard.root);

  // 咖啡角
  const coffeeBar = createCoffeeBar(f);
  coffeeBar.root.position.set(-3.7, 0, -3.1);
  root.add(coffeeBar.root);

  // 书架
  const bookshelf = createBookshelf(f);
  bookshelf.root.position.set(3.5, 0, -3.82);
  root.add(bookshelf.root);

  // 休息区与猫
  const lounge = createLounge(f);
  lounge.root.position.set(2.65, 0, 0.65);
  root.add(lounge.root);
  const cat = createCat(f);
  cat.root.position.set(2.96, 0.78, 0.84);
  root.add(cat.root);

  // 工具柜、留言板
  const toolChest = createToolChest(f);
  toolChest.root.position.set(1.4, 0, -1.98);
  toolChest.root.rotation.y = -0.08;
  root.add(toolChest.root);
  const noticeBoard = createNoticeBoard(f);
  noticeBoard.root.position.set(-1.9, 0, 1.85);
  root.add(noticeBoard.root);

  // 传送门
  const portal = createPortal(f, { variant: 'indoor' });
  portal.root.position.set(3.9, 0, 3.08);
  root.add(portal.root);

  // 左墙上的庭院门
  const door = createDoor(f, { label: 'GARDEN', sub: 'OUTSIDE →' });
  door.root.position.set(-5.04, 0, 2.9);
  door.root.rotation.y = Math.PI / 2;
  root.add(door.root);

  // 门边植物与侧边小物
  const plant = createFloorPlant(f, { scale: 0.9 });
  plant.root.position.set(-3.75, 0, 3.55);
  root.add(plant.root);
  root.add(f.rounded(1.25, 0.55, 0.38, 0.06, f.material('wood', { roughness: 0.66 }), [4.15, 0.3, 3.85]));
  root.add(f.cylinder(0.13, 0.11, 0.22, f.material('cream'), [3.9, 0.69, 3.85], 10));
  root.add(f.cylinder(0.1, 0.1, 0.02, f.material(0x6b3f27), [3.9, 0.81, 3.85], 10));
  const sidePlant = createFloorPlant(f, { scale: 0.52 });
  sidePlant.root.position.set(4.45, 0.56, 3.85);
  root.add(sidePlant.root);

  // 入口门垫
  root.add(f.rounded(2.1, 0.025, 0.68, 0.06, f.material('mint', { roughness: 0.9 }), [0, 0.026, 3.95]));

  // 室内漂浮尘埃
  const dustCount = quality.tier === 'low' ? 16 : 38;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 7;
    dustPositions[i * 3 + 1] = 0.7 + Math.random() * 2.8;
    dustPositions[i * 3 + 2] = -2.8 + Math.random() * 6;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMaterial = new THREE.PointsMaterial({ color: 0xffe4b3, size: 0.035, transparent: true, opacity: 0.35, depthWrite: false, map: f.textures.star });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  root.add(dust);

  // 灯光
  const pendantLight = pointLight(f, lights, { color: 0xffca87, intensity: 24, distance: 12, position: [0, 3.2, 0.75], quality });
  const deskLight = pointLight(f, lights, { color: 0x7ec8ff, intensity: 12, distance: 7, position: [-0.5, 2.25, -2.4], quality });
  const portalLight = pointLight(f, lights, { color: 0x5fc8ff, intensity: 14, distance: 7, position: [3.9, 1.5, 3.0], quality });
  const coffeeLight = pointLight(f, lights, { color: 0xffae63, intensity: 9, distance: 5, position: [-3.55, 1.8, -2.7], quality });
  const lampLight = pointLight(f, lights, { color: 0xffc276, intensity: 8, distance: 5, position: [0.85, 1.75, 1.25], quality });
  pendantLight.visible = true;
  deskLight.visible = true;
  portalLight.visible = quality.tier !== 'low';
  coffeeLight.visible = quality.tier === 'high';
  lampLight.visible = quality.tier === 'high';
  if (quality.tier === 'medium') coffeeLight.visible = false;
  if (quality.tier === 'low') lampLight.visible = false;

  // 灯光微弱闪烁
  const flicker = { pendant: 0, portal: 0 };

  // 交互热点锚点
  const anchors = {
    desk: makeAnchor(desk.root, [-0.15, 1.82, -0.35]),
    coffee: makeAnchor(coffeeBar.root, [0.95, 1.42, 0.35]),
    cat: cat.head,
    server: null,
    portal: makeAnchor(portal.root, [0, 1.42, 0]),
    toolbox: makeAnchor(toolChest.root, [0, 0.82, 0]),
    bookshelf: makeAnchor(bookshelf.root, [0, 1.3, 0.08]),
    notes: makeAnchor(noticeBoard.root, [0, 1.26, 0.02]),
    door: makeAnchor(door.root, [0, 1.37, 0.18])
  };

  // 服务器
  const server = createServerRack(f);
  server.root.position.set(-4.36, 0, 0.15);
  server.root.rotation.y = Math.PI / 2;
  root.add(server.root);
  anchors.server = makeAnchor(server.root, [0, 2.65, 0.5]);

  // 碰撞体（世界坐标轴对齐盒）
  const colliders = [
    { minX: -2.5, maxX: 1.3, minZ: -3.95, maxZ: -2.25 },
    { minX: -1.15, maxX: -0.05, minZ: -2.25, maxZ: -1.35 },
    { minX: 2.5, maxX: 4.6, minZ: -4.15, maxZ: -3.35 },
    { minX: -5.0, maxX: -2.35, minZ: -3.9, maxZ: -2.48 },
    { minX: 0.86, maxX: 2.0, minZ: -2.42, maxZ: -1.52 },
    { minX: -2.72, maxX: -1.08, minZ: 1.45, maxZ: 2.25 },
    { minX: 1.15, maxX: 4.18, minZ: -0.2, maxZ: 1.35 },
    { minX: 1.9, maxX: 3.7, minZ: 1.65, maxZ: 2.7 },
    { type: 'circle', x: 3.9, z: 3.08, radius: 1.25 },
    { minX: -4.95, maxX: -3.65, minZ: -0.55, maxZ: 0.85 },
    { minX: -4.5, maxX: -3.95, minZ: 3.2, maxZ: 3.9 },
    { minX: 3.35, maxX: 4.6, minZ: 3.5, maxZ: 4.15 }
  ];

  const zone = {
    id: 'studio',
    root,
    bounds: { minX: -4.88, maxX: 4.88, minZ: -3.5, maxZ: 4.35 },
    colliders,
    spawn: { x: 0.2, z: 3.95, heading: Math.PI },
    label: '室内工作室',
    subtitle: 'STUDIO · 工作台 / 休息区 / 咖啡角 / HomeLab',
    lights,
    hotspots: [],
    animated: { desk, coffeeBar, cat, server, portal, pendant, neon, dust },
    effects: { coder: 0, coffee: 0, cat: 0, server: 0, portal: 0 }
  };

  // 注册用热点定义（在根节点加入场景后统一注册）
  hotspots.push(
    {
      id: 'studio-computer',
      label: '项目电脑',
      icon: '💻',
      object: desk.root,
      anchor: anchors.desk,
      zone: 'studio',
      prompt: '查看项目与代码',
      radius: 2.2,
      priority: 4,
      interaction: { kind: 'modal', tab: 'projects', egg: 'coder', focus: '工作台三联屏' }
    },
    {
      id: 'studio-coffee',
      label: '咖啡角',
      icon: '☕',
      object: coffeeBar.root,
      anchor: anchors.coffee,
      zone: 'studio',
      prompt: '接一杯续命冰美式',
      radius: 2.0,
      interaction: { kind: 'egg', egg: 'coffee', focus: '手冲咖啡角' }
    },
    {
      id: 'studio-cat',
      label: '橘猫 NullPointer',
      icon: '🐱',
      object: cat.root,
      anchor: anchors.cat,
      zone: 'studio',
      prompt: '摸摸猫，听它呼噜',
      radius: 1.8,
      interaction: { kind: 'egg', egg: 'cat', focus: '沙发上的橘猫' }
    },
    {
      id: 'studio-server',
      label: 'HomeLab 服务器',
      icon: '🖥️',
      object: server.root,
      anchor: anchors.server,
      zone: 'studio',
      prompt: '检查部署与全息状态',
      radius: 2.1,
      interaction: { kind: 'egg', egg: 'server', focus: '深夜 HomeLab' }
    },
    {
      id: 'studio-portal',
      label: '空间传送门',
      icon: '🌀',
      object: portal.root,
      anchor: anchors.portal,
      zone: 'studio',
      prompt: '进入个人空间',
      radius: 2.1,
      interaction: { kind: 'modal', tab: 'about', egg: 'portal', focus: '传送门' }
    },
    {
      id: 'studio-toolbox',
      label: '工具箱',
      icon: '🧰',
      object: toolChest.root,
      anchor: anchors.toolbox,
      zone: 'studio',
      prompt: '打开常用工具',
      radius: 1.8,
      interaction: { kind: 'modal', tab: 'toolbox' }
    },
    {
      id: 'studio-bookshelf',
      label: '书架与素材',
      icon: '📚',
      object: bookshelf.root,
      anchor: anchors.bookshelf,
      zone: 'studio',
      prompt: '翻翻收藏与灵感',
      radius: 2.0,
      interaction: { kind: 'modal', tab: 'library' }
    },
    {
      id: 'studio-notes',
      label: '随记留言板',
      icon: '📌',
      object: noticeBoard.root,
      anchor: anchors.notes,
      zone: 'studio',
      prompt: '读随记、写留言',
      radius: 1.9,
      interaction: { kind: 'modal', tab: 'notes' }
    },
    {
      id: 'studio-door',
      label: '通往庭院',
      icon: '🚪',
      object: door.root,
      anchor: anchors.door,
      zone: 'studio',
      prompt: '推门去院子',
      radius: 2.0,
      interaction: { kind: 'switch-zone', zone: 'courtyard', focus: '庭院门' }
    }
  );

  zone.update = (dt, elapsed, reducedMotion) => {
    const fx = zone.effects;
    desk.update(dt, elapsed, fx.coder > 0, reducedMotion);
    coffeeBar.update(dt, elapsed, fx.coffee > 0, reducedMotion);
    cat.update(dt, elapsed, fx.cat > 0, reducedMotion);
    server.update(dt, elapsed, fx.server > 0, reducedMotion);
    portal.update(dt, elapsed, fx.portal > 0, reducedMotion);
    pendant.bulb.material.color.setHex(fx.coder > 0 ? 0xfff1c5 : 0xffdf9e);
    flicker.pendant += dt;
    flicker.portal += dt;
    const flickerAmount = reducedMotion ? 0 : Math.sin(flicker.pendant * 2.1) * 0.5 + Math.sin(flicker.pendant * 4.7) * 0.2;
    pendantLight.intensity = 24 + flickerAmount;
    portalLight.intensity = 14 + (fx.portal > 0 ? Math.sin(elapsed * 8) * 5 : Math.sin(elapsed * 2.4) * 1.5);
    neon.material.emissiveIntensity = reducedMotion ? 0.78 : 0.75 + Math.sin(elapsed * 1.5) * 0.08;
    dust.rotation.y = reducedMotion ? 0 : elapsed * 0.018;
    dust.position.y = Math.sin(elapsed * 0.3) * 0.06 * (reducedMotion ? 0 : 1);
    window_flicker(leftWindow, rightWindow, rightWindow2, elapsed, reducedMotion);
  };

  function window_flicker(...args) {
    const elapsed = args[3];
    const reducedMotion = args[4];
    args.slice(0, 3).forEach((win, index) => {
      win.glassMaterial.emissiveIntensity = 0.5 + (reducedMotion ? 0 : Math.sin(elapsed * 0.8 + index) * 0.04);
    });
  }

  return zone;
}

function buildCourtyard({ scene, f, quality, hotspots }) {
  const root = f.group('zone-courtyard');
  const lights = new THREE.Group();
  root.add(lights);

  const grass = f.material(0x2e5b42, { roughness: 0.97 });
  const grassLight = f.material(0x396e4f, { roughness: 0.97 });
  const grassDark = f.material(0x214934, { roughness: 0.97 });
  const soil = f.material(0x6c4d38, { roughness: 1 });
  const rock = f.material(0x3e4a50, { roughness: 0.95 });
  const stone = f.material(0x7d8983, { roughness: 0.94 });
  const trim = f.material('woodDark', { roughness: 0.8 });

  // 漂浮岛的层次：草皮、土壤、岩层
  const islandTop = f.rounded(22.6, 0.42, 16.4, 0.7, grass, [0, -0.21, 0.4]);
  islandTop.receiveShadow = true;
  root.add(islandTop);
  root.add(f.rounded(22.9, 0.55, 16.7, 0.8, soil, [0, -0.65, 0.4]));
  root.add(f.rounded(22.1, 0.62, 15.9, 0.75, rock, [0, -1.2, 0.4]));
  root.add(f.rounded(20.8, 0.55, 14.7, 0.7, f.material(0x2d373d, { roughness: 0.98 }), [0, -1.72, 0.4]));
  // 草皮色块
  for (let i = 0; i < 26; i++) {
    const patch = f.rounded(0.8 + (i % 4) * 0.5, 0.02, 0.45 + (i % 3) * 0.3, 0.2, i % 2 ? grassLight : grassDark, [
      -9.5 + (i * 1.77) % 19,
      0.01,
      -6.2 + (i * 2.31) % 13
    ]);
    patch.receiveShadow = true;
    root.add(patch);
  }
  // 岛边缘石块
  for (let i = 0; i < 18; i++) {
    const t = i / 18;
    const angle = t * Math.PI * 2;
    const x = Math.cos(angle) * 11.1;
    const z = Math.sin(angle) * 7.9 + 0.4;
    const edge = f.sphere(0.32, i % 2 ? stone : f.material(0x66736d, { roughness: 0.98 }), [x, 0.01, z], 7);
    edge.scale.set(1.6, 0.55, 1.0);
    edge.rotation.y = angle;
    root.add(edge);
  }

  // 前院石径与小径
  const path = createSteppingPath(f, {
    points: [[0, 7.6], [0.4, 6.4], [0.1, 5.1], [-0.6, 4.0], [-0.2, 2.9], [0, 1.55], [0, 0.4]],
    count: quality.tier === 'low' ? 11 : 17
  });
  root.add(path.root);
  const sidePath = createSteppingPath(f, {
    points: [[-0.1, 5.2], [-1.8, 5.4], [-3.6, 6.1], [-4.9, 6.25]],
    count: quality.tier === 'low' ? 6 : 9
  });
  root.add(sidePath.root);
  const pondPath = createSteppingPath(f, {
    points: [[0.4, 4.5], [2.2, 4.2], [4.0, 4.2], [5.6, 4.3]],
    count: quality.tier === 'low' ? 6 : 9
  });
  root.add(pondPath.root);

  // 院门与围栏
  const gate = createGate(f);
  gate.root.position.set(0, 0, 8.1);
  root.add(gate.root);
  const fenceLeft = createFence(f, 8.2);
  fenceLeft.root.position.set(-6.35, 0, 8.1);
  root.add(fenceLeft.root);
  const fenceRight = createFence(f, 8.2);
  fenceRight.root.position.set(6.35, 0, 8.1);
  root.add(fenceRight.root);
  const fenceWest = createFence(f, 15.7);
  fenceWest.root.position.set(-10.45, 0, 0.2);
  fenceWest.root.rotation.y = Math.PI / 2;
  root.add(fenceWest.root);
  const fenceEast = createFence(f, 15.7);
  fenceEast.root.position.set(10.45, 0, 0.2);
  fenceEast.root.rotation.y = Math.PI / 2;
  root.add(fenceEast.root);
  const wayfinding = createWayfindingSign(f);
  wayfinding.root.position.set(2.2, 0, 7.2);
  wayfinding.root.rotation.y = -0.3;
  root.add(wayfinding.root);

  // 住宅 / 工作室外观
  const house = new THREE.Group();
  house.name = 'courtyard-house';
  root.add(house);
  const houseWall = f.material(0xd4c0a3, { roughness: 0.84 });
  const houseWallShade = f.material(0xc3ae8f, { roughness: 0.87 });
  const roofMat = f.material(0x4b4356, { roughness: 0.8 });
  const roofEdge = f.material(0x2e3442, { roughness: 0.75 });
  const houseTrim = f.material(0x6a4c38, { roughness: 0.72 });
  const warmGlass = new THREE.MeshStandardMaterial({ color: 0xffdca3, emissive: 0xb87932, emissiveIntensity: 0.65, roughness: 0.25 });
  const windowFrame = f.material(0x5b4a3d, { roughness: 0.65 });

  house.add(f.rounded(9.15, 0.36, 6.15, 0.12, f.material(0x6c6259, { roughness: 0.96 }), [0, 0.16, -3.8]));
  const houseBody = f.rounded(8.8, 3.0, 5.8, 0.12, houseWall, [0, 1.72, -3.75]);
  house.add(houseBody);
  house.add(f.rounded(9.0, 0.22, 6.0, 0.05, houseWallShade, [0, 3.2, -3.75]));
  house.add(f.rounded(9.2, 0.55, 6.2, 0.06, houseWallShade, [0, 3.45, -3.75]));

  // 背面和侧面简单墙面，避免从侧面看到空心
  house.add(f.rounded(0.16, 3.0, 5.8, 0.04, houseWallShade, [-4.4, 1.72, -3.75]));
  house.add(f.rounded(0.16, 3.0, 5.8, 0.04, houseWallShade, [4.4, 1.72, -3.75]));

  // 山墙 / 屋顶作为可切换的剖切组
  const roofGroup = new THREE.Group();
  roofGroup.name = 'house-roof';
  house.add(roofGroup);
  function gable(zPos, depth = 0.18) {
    const shape = new THREE.Shape();
    const half = 4.55;
    const h = 1.6;
    shape.moveTo(-half, 0);
    shape.lineTo(half, 0);
    shape.lineTo(0, h);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    const mesh = new THREE.Mesh(geometry, houseWall);
    mesh.position.set(0, 3.28, zPos);
    mesh.castShadow = f.quality.shadows;
    mesh.receiveShadow = true;
    roofGroup.add(mesh);
    return mesh;
  }
  gable(-1.14);
  gable(-6.52, 0.15);
  // 山墙木框
  roofGroup.add(f.box(0.12, 1.35, 0.06, houseTrim, [0, 3.86, -1.08]));
  roofGroup.add(f.box(4.2, 0.1, 0.06, houseTrim, [0, 3.35, -1.07]));

  // 大屋顶两坡
  const roofAngle = 0.31;
  const roofLeft = f.rounded(5.4, 0.22, 7.25, 0.04, roofMat, [-2.35, 4.0, -3.85], { rotation: [0, 0, roofAngle] });
  const roofRight = f.rounded(5.4, 0.22, 7.25, 0.04, roofMat, [2.35, 4.0, -3.85], { rotation: [0, 0, -roofAngle] });
  roofGroup.add(roofLeft, roofRight);
  roofGroup.add(f.rounded(0.36, 0.18, 7.35, 0.06, roofEdge, [0, 4.82, -3.85]));
  // 瓦片线条
  for (let i = 0; i < 6; i++) {
    const offset = -(i + 1) * 0.62;
    const y = 4.74 + offset * Math.tan(roofAngle) * 1.35;
    const xL = -Math.abs(offset);
    const xR = Math.abs(offset);
    roofGroup.add(f.box(0.06, 0.045, 7.1, roofEdge, [xL, y, -3.85], { rotation: [0, 0, roofAngle] }));
    roofGroup.add(f.box(0.06, 0.045, 7.1, roofEdge, [xR, y, -3.85], { rotation: [0, 0, -roofAngle] }));
  }
  // 屋脊端头与烟囱
  roofGroup.add(f.rounded(0.62, 1.25, 0.62, 0.07, f.material(0x7b5d4a, { roughness: 0.9 }), [2.8, 4.75, -4.45]));
  roofGroup.add(f.rounded(0.82, 0.16, 0.82, 0.03, f.material(0x5c4440, { roughness: 0.85 }), [2.8, 5.4, -4.45]));
  // 烟囱烟
  const smoke = new THREE.Group();
  smoke.position.set(2.8, 5.55, -4.45);
  const smokePuffs = [];
  for (let i = 0; i < 5; i++) {
    const puff = f.sphere(0.16 + i * 0.035, f.basic(0xd8dfe5, { transparent: true, opacity: 0.15, depthWrite: false }), [0, i * 0.3, 0], 8);
    puff.userData.offset = i * 0.19;
    smoke.add(puff);
    smokePuffs.push(puff);
  }
  roofGroup.add(smoke);

  // 阁楼圆窗
  roofGroup.add(f.cylinder(0.3, 0.3, 0.05, windowFrame, [0, 4.05, -1.04], 16, { rotation: [Math.PI / 2, 0, 0] }));
  roofGroup.add(f.cylinder(0.23, 0.23, 0.06, warmGlass, [0, 4.05, -1.01], 16, { rotation: [Math.PI / 2, 0, 0] }));
  roofGroup.add(f.box(0.06, 0.46, 0.04, windowFrame, [0, 4.05, -0.98]));

  // 前墙木梁
  house.add(f.box(0.09, 2.85, 0.06, houseTrim, [-3.55, 1.7, -0.83]));
  house.add(f.box(0.09, 2.85, 0.06, houseTrim, [3.55, 1.7, -0.83]));
  house.add(f.box(8.4, 0.08, 0.06, houseTrim, [0, 2.65, -0.83]));
  house.add(f.box(8.4, 0.08, 0.06, houseTrim, [0, 1.0, -0.83]));

  // 门、门阶、门灯
  const door = createDoor(f, { label: 'STUDIO', sub: 'WELCOME IN' });
  door.root.position.set(0, 0.18, -0.91);
  door.root.scale.setScalar(1.04);
  house.add(door.root);
  house.add(f.rounded(2.2, 0.2, 0.9, 0.06, stone, [0, 0.1, 0.1]));
  house.add(f.rounded(1.75, 0.12, 0.62, 0.05, f.material(0x99a19a, { roughness: 0.9 }), [0, 0.22, 0.18]));
  // 门垫
  house.add(f.rounded(1.5, 0.025, 0.65, 0.05, f.material('mint', { roughness: 0.95 }), [0, 0.31, 0.35]));
  house.add(f.rounded(1.18, 0.01, 0.4, 0.02, f.material(0x315e4d), [0, 0.33, 0.35]));

  // 雨棚 / 门廊
  house.add(f.rounded(6.25, 0.16, 2.0, 0.05, roofEdge, [0, 2.98, 0.15]));
  house.add(f.rounded(6.4, 0.1, 0.22, 0.03, houseTrim, [0, 2.94, 1.13]));
  [-3.0, 3.0].forEach((x) => {
    house.add(f.cylinder(0.09, 0.1, 2.85, houseTrim, [x, 1.48, 1.0], 8));
    house.add(f.rounded(0.38, 0.3, 0.38, 0.03, stone, [x, 0.2, 1.0]));
  });
  // 雨棚上的招牌
  const facadeSign = createFacadeSign(f, { title: 'M1GHTY_2WY', subtitle: 'CODE STUDIO · OPEN 24/7', accent: '#ffd48a', bg: '#243b56', width: 4.0, height: 0.66 });
  facadeSign.root.position.set(0, 2.95, 1.22);
  house.add(facadeSign.root);
  // 雨棚下的串灯
  for (let i = 0; i < 7; i++) {
    house.add(f.sphere(0.03, f.basic(0xffd48a), [-2.7 + i * 0.9, 2.53 + Math.sin(i * 1.4) * 0.07, 0.75], 6));
  }

  // 两侧窗户与花箱
  const windowPositions = [-2.65, 2.65];
  windowPositions.forEach((x, index) => {
    const win = new THREE.Group();
    win.position.set(x, 1.95, -0.86);
    win.add(f.rounded(1.55, 1.45, 0.08, 0.03, windowFrame, [0, 0, 0]));
    win.add(f.rounded(1.3, 1.2, 0.04, 0.02, warmGlass, [0, 0, 0.06]));
    win.add(f.box(0.045, 1.2, 0.03, windowFrame, [0, 0, 0.1]));
    win.add(f.box(1.3, 0.045, 0.03, windowFrame, [0, 0, 0.1]));
    win.add(f.rounded(1.62, 0.09, 0.28, 0.02, houseTrim, [0, -0.78, 0.09]));
    // 窗帘/屋内剪影
    win.add(f.rounded(0.16, 1.24, 0.06, 0.03, f.material(index ? 0xc89a87 : 0x89a0b5, { roughness: 0.9 }), [-0.64, 0, 0.06]));
    win.add(f.rounded(0.16, 1.24, 0.06, 0.03, f.material(index ? 0xc89a87 : 0x89a0b5, { roughness: 0.9 }), [0.64, 0, 0.06]));
    // 花箱
    win.add(f.rounded(1.72, 0.28, 0.34, 0.04, houseTrim, [0, -0.96, 0.17]));
    for (let i = 0; i < 5; i++) {
      win.add(f.sphere(0.075, f.material(i % 2 ? 'pink' : 'amber'), [-0.6 + i * 0.3, -0.79, 0.2], 6));
      win.add(f.sphere(0.08, f.material('leaf'), [-0.67 + i * 0.3, -0.85, 0.2], 6));
    }
    house.add(win);
    const glow = f.glowSprite('#ffd48a', 1.5, 0.09);
    glow.position.set(x, 1.95, -0.64);
    house.add(glow);
  });

  // 门两侧壁灯
  [-1.8, 1.8].forEach((x) => {
    house.add(f.rounded(0.22, 0.36, 0.16, 0.03, f.material(0x2c3442, { roughness: 0.55 }), [x, 2.2, -0.78]));
    house.add(f.sphere(0.075, f.basic(0xffd48a), [x, 2.2, -0.68], 8));
    const glow = f.glowSprite('#ffd48a', 1.05, 0.18);
    glow.position.set(x, 2.2, -0.66);
    house.add(glow);
  });

  // 铜制落水管、爬藤与门牌
  house.add(f.cylinder(0.055, 0.055, 3.0, f.material(0x8d6f56, { roughness: 0.5, metalness: 0.3 }), [-4.25, 1.7, -0.8], 8));
  house.add(f.cylinder(0.055, 0.055, 0.85, f.material(0x8d6f56, { roughness: 0.5, metalness: 0.3 }), [-4.0, 3.1, -0.8], 8, { rotation: [0, 0, Math.PI / 2] }));
  const houseNumber = createPlaque(f, '24 / 7');
  houseNumber.root.position.set(-1.35, 2.62, -0.8);
  houseNumber.root.scale.setScalar(0.7);
  house.add(houseNumber.root);
  // 窗台下方小花箱的暖光
  house.add(f.rounded(6.6, 0.1, 0.16, 0.03, f.basic(0xffd48a, { transparent: true, opacity: 0.28 }), [0, 3.06, 1.18]));

  // 花园：樱花树、树木、池塘、长椅、咖啡车、工具箱、信箱、公告板、传送门
  const trees = [];
  const sakura = createTree(f, { variant: 'sakura', scale: 1.35 });
  sakura.root.position.set(-8.05, 0, -2.15);
  root.add(sakura.root);
  trees.push(sakura);
  const leafy = createTree(f, { variant: 'leafy', scale: 1.05 });
  leafy.root.position.set(8.55, 0, -1.7);
  root.add(leafy.root);
  trees.push(leafy);
  const pine = createTree(f, { variant: 'pine', scale: 0.86 });
  pine.root.position.set(-9.1, 0, 3.7);
  root.add(pine.root);
  trees.push(pine);

  const pond = createPond(f, { radius: 1.4 });
  pond.root.position.set(7.1, 0, 4.25);
  root.add(pond.root);
  const bench = createBench(f);
  bench.root.position.set(-4.75, 0, 6.1);
  bench.root.rotation.y = 0.24;
  root.add(bench.root);
  const cat = createCat(f);
  cat.root.position.set(-4.7, 0.58, 6.18);
  cat.root.rotation.y = 0.24;
  root.add(cat.root);

  const coffeeCart = createCoffeeCart(f);
  coffeeCart.root.position.set(6.15, 0, 2.5);
  coffeeCart.root.rotation.y = -0.38;
  root.add(coffeeCart.root);

  const toolChest = createToolChest(f);
  toolChest.root.position.set(4.1, 0, 0.25);
  toolChest.root.rotation.y = -0.22;
  root.add(toolChest.root);

  const noticeBoard = createNoticeBoard(f);
  noticeBoard.root.position.set(4.9, 0, 6.45);
  noticeBoard.root.rotation.y = -0.18;
  root.add(noticeBoard.root);

  const mailbox = createMailbox(f);
  mailbox.root.position.set(2.7, 0, 6.7);
  root.add(mailbox.root);

  const portal = createPortal(f, { variant: 'garden' });
  portal.root.position.set(-8.15, 0, 5.15);
  root.add(portal.root);

  const arch = createGardenArch(f);
  arch.root.position.set(0, 0, 4.55);
  root.add(arch.root);

  const birdhouse = createBirdhouse(f);
  birdhouse.root.position.set(9.1, 0, 1.3);
  root.add(birdhouse.root);
  const lantern = createStoneLantern(f);
  lantern.root.position.set(5.1, 0, 5.55);
  lantern.root.scale.setScalar(0.9);
  root.add(lantern.root);
  const bike = createBicycle(f);
  bike.root.position.set(-6.1, 0, 1.2);
  bike.root.rotation.y = 0.18;
  root.add(bike.root);

  // 花坛、灌木、草与蘑菇
  const bedL = createFlowerBed(f, { width: 2.4, depth: 0.8 });
  bedL.root.position.set(-3.15, 0, 0.85);
  root.add(bedL.root);
  const bedR = createFlowerBed(f, { width: 2.4, depth: 0.8 });
  bedR.root.position.set(3.2, 0, 0.85);
  root.add(bedR.root);
  const shrubs = [
    [-7.0, 2.0, 0.65], [7.8, 2.0, 0.6], [-5.8, -0.2, 0.55], [6.1, -0.4, 0.5],
    [-9.6, 6.7, 0.7], [9.6, 6.7, 0.75], [-2.9, 7.2, 0.42], [8.3, 6.8, 0.5]
  ];
  shrubs.forEach(([x, z, r], i) => {
    const shrub = createShrub(f, { radius: r, flowers: i % 2 === 0 });
    shrub.root.position.set(x, 0, z);
    root.add(shrub.root);
  });
  const flowerPatches = [
    [-6.4, 4.6, 0.8], [2.9, 5.5, 0.55], [-2.0, 7.0, 0.5], [5.7, 7.4, 0.6],
    [8.5, 3.0, 0.5], [-9.4, 1.4, 0.7], [1.2, 2.1, 0.4]
  ];
  flowerPatches.forEach(([x, z, r]) => {
    const patch = createFlowerPatch(f, { count: quality.tier === 'low' ? 7 : 15, radius: r });
    patch.root.position.set(x, 0, z);
    root.add(patch.root);
  });
  const grassCount = quality.tier === 'low' ? 18 : 38;
  for (let i = 0; i < grassCount; i++) {
    const tuft = createGrassTuft(f, 0.7 + (i % 4) * 0.16);
    tuft.root.position.set(-9.8 + (i * 3.71) % 19.6, 0, -5.9 + (i * 2.37) % 13.4);
    root.add(tuft.root);
  }
  const mushrooms = createMushrooms(f);
  mushrooms.root.position.set(-6.55, 0, -0.95);
  root.add(mushrooms.root);
  const balconyPlants = createBalconyPlants(f);
  balconyPlants.root.position.set(0.3, 3.12, -0.55);
  house.add(balconyPlants.root);

  // 灯串
  const lightsA = createStringLights(f, { start: [-4.3, 3.1, 0.0], end: [4.3, 3.1, 0.0], count: quality.tier === 'low' ? 5 : 16, sag: 0.55 });
  root.add(lightsA.root);
  const lightsB = createStringLights(f, { start: [-10.0, 2.8, 6.2], end: [-4.3, 3.1, 0.0], count: quality.tier === 'low' ? 6 : 10, sag: 0.7 });
  root.add(lightsB.root);
  const lightsC = createStringLights(f, { start: [10.0, 2.7, 6.1], end: [4.3, 3.1, 0.0], count: quality.tier === 'low' ? 6 : 10, sag: 0.65 });
  root.add(lightsC.root);

  // 萤火虫
  const fireflyCount = quality.tier === 'low' ? 14 : 30;
  const fireflyPositions = new Float32Array(fireflyCount * 3);
  for (let i = 0; i < fireflyCount; i++) {
    fireflyPositions[i * 3] = -9 + Math.random() * 18;
    fireflyPositions[i * 3 + 1] = 0.5 + Math.random() * 3.6;
    fireflyPositions[i * 3 + 2] = -5 + Math.random() * 12;
  }
  const fireflyGeometry = new THREE.BufferGeometry();
  fireflyGeometry.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));
  const fireflyMaterial = new THREE.PointsMaterial({
    color: 0xffe39c,
    size: 0.12,
    map: f.textures.star,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const fireflies = new THREE.Points(fireflyGeometry, fireflyMaterial);
  root.add(fireflies);

  // 庭院灯光
  const porchLight = pointLight(f, lights, { color: 0xffb45f, intensity: 12, distance: 8, position: [0, 2.5, 1.3], quality });
  const stringLight = pointLight(f, lights, { color: 0xffb45f, intensity: 4, distance: 10, position: [0, 3.4, 4.2], quality });
  const portalLight = pointLight(f, lights, { color: 0x6fe0bd, intensity: 7, distance: 6, position: [-8.1, 1.8, 5.2], quality });
  const cartLight = pointLight(f, lights, { color: 0xffa45b, intensity: 5, distance: 4.6, position: [6.1, 2.0, 2.5], quality });
  const lanternLight = pointLight(f, lights, { color: 0xffa45b, intensity: 3.5, distance: 3.4, position: [5.1, 1.1, 5.55], quality });
  porchLight.visible = true;
  stringLight.visible = quality.tier !== 'low';
  portalLight.visible = quality.tier !== 'low';
  cartLight.visible = quality.tier === 'high';
  lanternLight.visible = quality.tier === 'high';

  // 碰撞体
  const colliders = [
    { minX: -4.7, maxX: 4.7, minZ: -7.0, maxZ: -0.82 },
    { minX: -5.8, maxX: -3.7, minZ: 5.75, maxZ: 6.6 },
    { minX: 5.0, maxX: 7.4, minZ: 1.45, maxZ: 3.4 },
    { minX: 3.15, maxX: 5.05, minZ: -0.45, maxZ: 0.95 },
    { minX: 3.85, maxX: 5.95, minZ: 5.95, maxZ: 6.85 },
    { type: 'circle', x: -8.05, z: -2.15, radius: 1.0 },
    { type: 'circle', x: 8.55, z: -1.7, radius: 0.85 },
    { type: 'circle', x: -9.1, z: 3.7, radius: 0.65 },
    { type: 'circle', x: 7.1, z: 4.25, radius: 1.55 },
    { type: 'circle', x: -8.15, z: 5.15, radius: 1.35 },
    { type: 'circle', x: 2.7, z: 6.7, radius: 0.35 },
    { type: 'circle', x: 5.1, z: 5.55, radius: 0.45 },
    { type: 'circle', x: 9.1, z: 1.3, radius: 0.22 },
    { type: 'circle', x: -1.05, z: 4.55, radius: 0.2 },
    { type: 'circle', x: 1.05, z: 4.55, radius: 0.2 },
    { minX: -6.9, maxX: -5.3, minZ: 0.8, maxZ: 1.75 },
    { minX: 1.7, maxX: 3.2, minZ: 7.0, maxZ: 7.8 }
  ];

  const zone = {
    id: 'courtyard',
    root,
    bounds: { minX: -9.9, maxX: 9.9, minZ: -7.15, maxZ: 7.75 },
    colliders,
    spawn: { x: 0, z: 6.65, heading: Math.PI },
    label: '庭院入口',
    subtitle: 'COURTYARD · 花园 / 门廊 / 咖啡车',
    lights,
    hotspots: [],
    roofGroup,
    toggleRoof() {
      roofGroup.visible = !roofGroup.visible;
      return roofGroup.visible;
    },
    animated: { desk: null, trees, pond, coffeeCart, cat, portal, smokePuffs, fireflies, lantern, benches: [bench] },
    effects: { coder: 0, coffee: 0, cat: 0, server: 0, portal: 0 }
  };

  const anchors = {
    door: makeAnchor(door.root, [0, 1.42, 0.2]),
    coffee: makeAnchor(coffeeCart.root, [0, 1.5, 0]),
    cat: cat.head,
    notes: makeAnchor(mailbox.root, [0, 1.3, 0]),
    articles: makeAnchor(noticeBoard.root, [0, 1.3, 0.05]),
    toolbox: makeAnchor(toolChest.root, [0, 0.85, 0]),
    portal: makeAnchor(portal.root, [0, 1.45, 0])
  };

  hotspots.push(
    {
      id: 'yard-door',
      label: '工作室正门',
      icon: '🚪',
      object: door.root,
      anchor: anchors.door,
      zone: 'courtyard',
      prompt: '推开工作室的门',
      radius: 2.2,
      interaction: { kind: 'switch-zone', zone: 'studio', focus: '工作室门廊' }
    },
    {
      id: 'yard-coffee',
      label: '转角咖啡车',
      icon: '☕',
      object: coffeeCart.root,
      anchor: anchors.coffee,
      zone: 'courtyard',
      prompt: '点一杯冰美式',
      radius: 2.1,
      interaction: { kind: 'egg', egg: 'coffee', focus: '庭院咖啡车' }
    },
    {
      id: 'yard-cat',
      label: '晒太阳的橘猫',
      icon: '🐱',
      object: cat.root,
      anchor: anchors.cat,
      zone: 'courtyard',
      prompt: '摸摸猫，听它呼噜',
      radius: 1.8,
      interaction: { kind: 'egg', egg: 'cat', focus: '长椅上的橘猫' }
    },
    {
      id: 'yard-notes',
      label: '信箱留言',
      icon: '📮',
      object: mailbox.root,
      anchor: anchors.notes,
      zone: 'courtyard',
      prompt: '打开随记与留言板',
      radius: 1.7,
      interaction: { kind: 'modal', tab: 'notes' }
    },
    {
      id: 'yard-articles',
      label: '庭院公告板',
      icon: '📝',
      object: noticeBoard.root,
      anchor: anchors.articles,
      zone: 'courtyard',
      prompt: '读读最新文章',
      radius: 1.8,
      interaction: { kind: 'modal', tab: 'articles' }
    },
    {
      id: 'yard-toolbox',
      label: '庭院工具箱',
      icon: '🧰',
      object: toolChest.root,
      anchor: anchors.toolbox,
      zone: 'courtyard',
      prompt: '翻开常用工具',
      radius: 1.7,
      interaction: { kind: 'modal', tab: 'toolbox' }
    },
    {
      id: 'yard-portal',
      label: '花园传送门',
      icon: '🌀',
      object: portal.root,
      anchor: anchors.portal,
      zone: 'courtyard',
      prompt: '穿过光环进入个人空间',
      radius: 2.1,
      interaction: { kind: 'modal', tab: 'about', egg: 'portal', focus: '花园传送门' }
    }
  );

  // 更新函数
  let smokeClock = 0;
  zone.update = (dt, elapsed, reducedMotion) => {
    trees.forEach((tree) => tree.update(dt, elapsed, reducedMotion));
    pond.update(dt, elapsed, reducedMotion);
    coffeeCart.update(dt, elapsed, zone.effects.coffee > 0, reducedMotion);
    cat.update(dt, elapsed, zone.effects.cat > 0, reducedMotion);
    portal.update(dt, elapsed, zone.effects.portal > 0, reducedMotion);
    smokeClock += dt;
    smokePuffs.forEach((puff, i) => {
      const phase = (smokeClock * 0.13 + puff.userData.offset) % 1;
      puff.position.y = i * 0.3 + phase * 1.1;
      puff.position.x = Math.sin(elapsed * 0.4 + i * 1.7) * 0.15 * phase;
      puff.position.z = Math.cos(elapsed * 0.3 + i) * 0.1 * phase;
      puff.scale.setScalar(0.6 + phase * 1.7);
      puff.material.opacity = 0.16 * (1 - phase);
    });
    fireflies.rotation.y = reducedMotion ? 0 : elapsed * 0.055;
    fireflies.position.y = reducedMotion ? 0 : Math.sin(elapsed * 0.6) * 0.12;
    fireflyMaterial.opacity = 0.48 + (reducedMotion ? 0 : Math.sin(elapsed * 2.2) * 0.2);
    lanternLight.intensity = 3.5 + Math.sin(elapsed * 2.7) * 0.4;
    porchLight.intensity = 12 + Math.sin(elapsed * 1.2) * 0.5;
    stringLight.intensity = 4 + Math.sin(elapsed * 0.9) * 0.2;
  };

  return zone;
}

export function buildWorld({ scene, factory, quality, registry }) {
  const environment = createEnvironment(scene, factory, quality);
  const worldRoot = new THREE.Group();
  worldRoot.name = 'm1ghty-world';
  scene.add(worldRoot);

  const hotspots = [];
  const studio = buildStudio({ scene, f: factory, quality, hotspots });
  const courtyard = buildCourtyard({ scene, f: factory, quality, hotspots });
  worldRoot.add(studio.root, courtyard.root);
  const zones = { studio, courtyard };
  // 在加入场景后计算世界坐标，再注册到统一交互注册表。
  worldRoot.updateMatrixWorld(true);
  // 阴影预算：只有中大件、非透明物件进入 shadow pass。
  // 键帽、书脊、花瓣、栅栏条等小物件的阴影肉眼不可辨，却会显著拖慢移动设备。
  if (quality.shadows) {
    for (const zone of [studio, courtyard]) {
      zone.root.traverse((object) => {
        if (!object.isMesh) return;
        if (object.isInstancedMesh) {
          object.castShadow = false;
          return;
        }
        const material = Array.isArray(object.material) ? object.material[0] : object.material;
        if (material && material.transparent) {
          object.castShadow = false;
          return;
        }
        const geometry = object.geometry;
        if (!geometry) return;
        if (!geometry.boundingSphere) geometry.computeBoundingSphere();
        const radius = geometry.boundingSphere ? geometry.boundingSphere.radius : 0;
        const scale = Math.max(Math.abs(object.scale.x), Math.abs(object.scale.y), Math.abs(object.scale.z));
        if (radius * scale < 0.3) object.castShadow = false;
      });
    }
  }
  const registered = [];
  for (const def of hotspots) {
    const target = def.anchor.getWorldPosition(new THREE.Vector3());
    target.y += 0.25;
    const entry = registry.register({
      id: def.id,
      label: def.label,
      icon: def.icon,
      object: def.object,
      anchorObject: def.anchor,
      interaction: def.interaction,
      cameraTarget: target,
      zone: def.zone,
      radius: def.radius,
      prompt: def.prompt
    });
    registered.push(entry);
    zones[def.zone].hotspots.push(entry);
  }

  const effects = { coder: 0, coffee: 0, cat: 0, server: 0, portal: 0 };
  let activeZone = 'courtyard';
  let reducedMotion = false;

  function setActiveZone(zoneId, { applyCamera = true } = {}) {
    if (!zones[zoneId]) return;
    activeZone = zoneId;
    studio.root.visible = zoneId === 'studio';
    courtyard.root.visible = zoneId === 'courtyard';
    registry.setActiveZone(zoneId);
    environment.setActiveZone(zoneId);
  }

  function triggerEgg(name, duration = 4.2) {
    if (!(name in effects)) return 0;
    effects[name] = Math.max(effects[name], duration);
    return effects[name];
  }

  function toggleRoof() {
    const zone = zones[activeZone];
    if (!zone.toggleRoof) return true;
    return zone.toggleRoof();
  }

  function update(dt, elapsed) {
    for (const key of Object.keys(effects)) {
      if (effects[key] > 0) effects[key] = Math.max(0, effects[key] - dt);
    }
    // 让休息区里触发的手冲咖啡也能分享给另一个场景的计时器
    const zone = zones[activeZone];
    zone.effects.coder = effects.coder;
    zone.effects.coffee = effects.coffee;
    zone.effects.cat = effects.cat;
    zone.effects.server = effects.server;
    zone.effects.portal = effects.portal;
    if (zone.update) zone.update(dt, elapsed, reducedMotion);
    environment.update(dt, elapsed);
  }

  function setReducedMotion(value) {
    reducedMotion = value;
    environment.setReducedMotion(value);
  }

  setActiveZone('courtyard', { applyCamera: false });

  return {
    worldRoot,
    zones,
    environment,
    setActiveZone,
    getActiveZone: () => activeZone,
    triggerEgg,
    toggleRoof,
    getEffects: () => ({ ...effects }),
    update,
    setReducedMotion,
    getZone: (id) => zones[id] || null,
    getSpawn: (id) => zones[id]?.spawn || zones.courtyard.spawn,
    getHotspots: () => registered
  };
}
