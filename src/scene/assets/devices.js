/**
 * 设备类程序化资产：HomeLab 机柜、传送门、庭院咖啡车。
 */
import * as THREE from 'three';
import { makeSignTexture } from './materials.js';

function tubeBetween(factory, start, end, radius, material, parent) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const length = a.distanceTo(b);
  const geo = new THREE.CylinderGeometry(radius, radius, length, 6);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(a.clone().add(b).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  mesh.castShadow = factory.quality.shadows;
  parent.add(mesh);
  return mesh;
}

export function createServerRack(factory) {
  const f = factory;
  const root = f.group('homelab-rack');
  const metal = f.material(0x1a2638, { roughness: 0.36, metalness: 0.58 });
  const dark = f.material(0x0d1522, { roughness: 0.5 });
  const silver = f.material(0x718197, { roughness: 0.3, metalness: 0.72 });
  const green = f.basic(0x7bd6b1);
  const sky = f.basic(0x6bc5f8);
  const amber = f.basic(0xf5b942);
  const glassMat = f.material('glass', { transparent: true, opacity: 0.18, roughness: 0.1, metalness: 0.2 });

  // 底盘与机柜框架
  root.add(f.rounded(1.32, 0.12, 1.02, 0.04, dark, [0, 0.1, 0]));
  root.add(f.rounded(1.24, 2.25, 0.07, 0.03, metal, [0, 1.22, -0.46]));
  root.add(f.rounded(0.08, 2.3, 0.95, 0.025, metal, [-0.6, 1.22, 0]));
  root.add(f.rounded(0.08, 2.3, 0.95, 0.025, metal, [0.6, 1.22, 0]));
  root.add(f.rounded(1.28, 0.1, 0.95, 0.025, metal, [0, 2.34, 0]));
  root.add(f.rounded(1.28, 0.1, 0.95, 0.025, metal, [0, 0.22, 0]));
  root.add(f.rounded(1.1, 2.0, 0.02, 0.02, glassMat, [0, 1.25, 0.53]));
  root.add(f.rounded(0.05, 2.1, 0.05, 0.015, silver, [-0.53, 1.24, 0.48]));
  root.add(f.rounded(0.05, 2.1, 0.05, 0.015, silver, [0.53, 1.24, 0.48]));

  // 服务器刀片
  const ledMats = [green, sky, amber];
  const leds = [];
  const blades = [];
  for (let i = 0; i < 7; i++) {
    const y = 0.45 + i * 0.26;
    const blade = f.group(`blade-${i}`);
    blade.add(f.rounded(1.0, 0.21, 0.08, 0.02, f.material(i % 2 === 0 ? 0x22324a : 0x1d2b41, { roughness: 0.45 }), [0, 0, 0]));
    blade.add(f.rounded(0.08, 0.06, 0.02, 0.01, silver, [-0.38, 0.02, 0.05]));
    blade.add(f.rounded(0.08, 0.06, 0.02, 0.01, silver, [0.38, 0.02, 0.05]));
    for (let v = 0; v < 6; v++) {
      blade.add(f.box(0.1, 0.008, 0.015, dark, [-0.2 + v * 0.075, -0.055, 0.047]));
    }
    for (let l = 0; l < 4; l++) {
      const led = f.sphere(0.014, l === 3 ? ledMats[i % 3] : (l === 0 ? green : ledMats[(i + l) % 3]), [0.2 + l * 0.055, 0.035, 0.052], 6);
      led.userData.blinkOffset = (i * 0.7 + l * 1.3) % 2;
      leds.push(led);
      blade.add(led);
    }
    blade.position.set(0, y, 0.02);
    root.add(blade);
    blades.push(blade);
  }

  // 顶部网络交换机、风扇与线束
  root.add(f.rounded(1.02, 0.12, 0.32, 0.02, dark, [0, 2.27, 0.15]));
  for (let i = 0; i < 8; i++) {
    root.add(f.box(0.055, 0.035, 0.035, i % 3 === 0 ? amber : dark, [-0.38 + i * 0.11, 2.27, 0.33]));
  }
  const fans = [];
  for (let i = 0; i < 3; i++) {
    const fan = new THREE.Group();
    fan.position.set(0.35 - i * 0.3, 2.28, -0.12);
    const guard = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 5, 16), silver);
    const blade = f.box(0.14, 0.045, 0.012, f.material(0x9ca8b6, { transparent: true, opacity: 0.4 }), [0, 0, 0]);
    fan.add(guard, blade);
    fan.rotation.x = Math.PI / 2;
    root.add(fan);
    fans.push(blade);
  }

  const cableMat = f.material(0x111a27, { roughness: 0.95 });
  for (let i = 0; i < 5; i++) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.42 + i * 0.5 * 0.1, 0.38, 0.55),
      new THREE.Vector3(-0.6 + i * 0.1, 0.65, 0.68),
      new THREE.Vector3(-0.7 + i * 0.12, 1.2, 0.62),
      new THREE.Vector3(-0.58 + i * 0.1, 1.7, 0.5),
      new THREE.Vector3(-0.52 + i * 0.08, 2.2, 0.35)
    ]);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.012, 5, false), cableMat);
    root.add(cable);
  }
  for (let i = 0; i < 4; i++) {
    const cable = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.012, 5, 18, Math.PI * 0.9),
      i % 2 ? amber : sky
    );
    cable.position.set(0.3 + i * 0.03, 0.55 + i * 0.1, 0.58);
    cable.rotation.set(0.2, 0, 0.4);
    root.add(cable);
  }

  // 顶部状态屏和铭牌
  const signTex = makeSignTexture({ title: 'M1-LAB', subtitle: 'HOMELAB · UPTIME 24D', accent: '#7bd6b1', bg: '#152b2a' });
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissive: 0x1d4b40, emissiveMap: signTex, emissiveIntensity: 0.55, roughness: 0.45 });
  const sign = f.mesh(new THREE.PlaneGeometry(1.12, 0.32), signMat, [0, 2.58, 0.56]);
  root.add(sign);
  const statusDot = f.sphere(0.035, green, [0.48, 2.58, 0.58], 8);
  root.add(statusDot);
  root.add(f.rounded(1.2, 0.07, 0.1, 0.02, dark, [0, 2.58, 0.53]));

  // 可展开的全息投影
  const holo = new THREE.Group();
  holo.position.set(0, 3.18, 0);
  const holoWire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.46, 1),
    new THREE.MeshBasicMaterial({ color: 0x7bd6b1, wireframe: true, transparent: true, opacity: 0.24, depthWrite: false })
  );
  const holoCore = f.sphere(0.2, f.basic(0x7bd6b1, { transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }), [0, 0, 0], 12);
  const holoRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.015, 5, 36),
    f.basic(0x6bc5f8, { transparent: true, opacity: 0.35, depthWrite: false })
  );
  holoRing.rotation.x = Math.PI / 2.3;
  const holoRing2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.012, 5, 30),
    f.basic(0x7bd6b1, { transparent: true, opacity: 0.3, depthWrite: false })
  );
  holoRing2.rotation.set(0.8, 0.2, 0.5);
  const glow = f.glowSprite('#7bd6b1', 1.8, 0.16);
  holo.add(holoWire, holoCore, holoRing, holoRing2, glow);
  root.add(holo);

  // 地面上的机架线和排插
  root.add(f.rounded(0.5, 0.06, 0.26, 0.02, f.material(0xd8d0c2, { roughness: 0.8 }), [-0.8, 0.06, 0.35]));
  for (let i = 0; i < 4; i++) {
    root.add(f.box(0.04, 0.02, 0.04, dark, [-0.94 + i * 0.09, 0.09, 0.35]));
  }

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });

  return {
    root,
    holo,
    holoWire,
    leds,
    fans,
    sign,
    update(dt, elapsed, boosted, reducedMotion) {
      fans.forEach((fan) => {
        fan.rotation.z += dt * (boosted ? 10 : 3.2);
      });
      leds.forEach((led, index) => {
        const phase = (elapsed * (boosted ? 4.2 : 1.4) + index * 0.37) % 1;
        led.scale.setScalar(phase > 0.7 ? 1.25 : 0.9);
      });
      const spin = boosted ? 1 : 0.28;
      holoWire.rotation.y += dt * (0.5 + spin * 1.8);
      holoWire.rotation.x += dt * (0.1 + spin * 0.6);
      holoRing.rotation.z += dt * spin * 0.8;
      holoRing2.rotation.y -= dt * spin * 1.2;
      const targetOpacity = boosted ? 0.8 : 0.24;
      holoWire.material.opacity += (targetOpacity - holoWire.material.opacity) * Math.min(1, dt * 3);
      holoCore.material.opacity += ((boosted ? 0.5 : 0.16) - holoCore.material.opacity) * Math.min(1, dt * 3);
      holoRing.material.opacity += ((boosted ? 0.72 : 0.3) - holoRing.material.opacity) * Math.min(1, dt * 3);
      holo.visible = !reducedMotion || boosted;
    }
  };
}

export function createPortal(factory, { variant = 'indoor' } = {}) {
  const f = factory;
  const root = f.group(`portal-${variant}`);
  const garden = variant === 'garden';
  const stone = f.material(garden ? 0x89928c : 0x223048, { roughness: garden ? 0.9 : 0.35, metalness: garden ? 0.05 : 0.62 });
  const accent = garden ? f.material('mint', { roughness: 0.55 }) : f.material('sky', { roughness: 0.35, metalness: 0.4 });

  const base = f.group();
  base.position.y = 0;
  if (garden) {
    base.add(f.cylinder(1.35, 1.48, 0.16, f.material(0x586660, { roughness: 0.94 }), [0, 0.08, 0], 16));
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const stoneBlock = f.rounded(0.3, 0.18, 0.22, 0.05, stone, [Math.cos(angle) * 1.18, 0.2, Math.sin(angle) * 1.18], { rotation: [0, -angle, 0] });
      base.add(stoneBlock);
      if (i % 2 === 0) {
        base.add(f.sphere(0.09, f.material('leaf'), [Math.cos(angle + 0.2) * 1.29, 0.25, Math.sin(angle + 0.2) * 1.29], 8));
      }
    }
    base.add(f.rounded(0.27, 1.5, 0.27, 0.08, stone, [-0.9, 1.0, 0]));
    base.add(f.rounded(0.27, 1.5, 0.27, 0.08, stone, [0.9, 1.0, 0]));
    base.add(f.rounded(2.08, 0.24, 0.28, 0.08, stone, [0, 1.8, 0]));
  } else {
    base.add(f.cylinder(1.25, 1.38, 0.18, f.material(0x1a2638, { roughness: 0.4, metalness: 0.5 }), [0, 0.09, 0], 28));
    base.add(f.cylinder(1.1, 1.18, 0.12, accent, [0, 0.25, 0], 32));
    const frame = new THREE.Group();
    frame.position.y = 0.25;
    const outerArch = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.1, 10, 46), stone);
    outerArch.position.y = 1.04;
    const innerArch = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.045, 8, 40), accent);
    innerArch.position.y = 1.04;
    frame.add(outerArch, innerArch);
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const rune = f.box(0.09, 0.16, 0.03, f.basic(i % 3 === 0 ? 0x7bd6b1 : 0x6bc5f8), [Math.cos(angle) * 0.92, 1.04 + Math.sin(angle) * 0.92, 0.06], { rotation: [0, 0, angle] });
      frame.add(rune);
    }
    base.add(frame);
    base.add(f.box(0.18, 0.2, 0.5, stone, [-0.94, 1.14, 0], { rotation: [0, 0, 0.05] }));
    base.add(f.box(0.18, 0.2, 0.5, stone, [0.94, 1.14, 0], { rotation: [0, 0, -0.05] }));
  }
  root.add(base);

  const ringGroup = new THREE.Group();
  ringGroup.position.y = garden ? 1.42 : 1.29;
  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(garden ? 0.82 : 0.74, garden ? 0.045 : 0.035, 8, 40),
    garden ? f.basic(0x7bd6b1, { transparent: true, opacity: 0.7 }) : accent
  );
  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(garden ? 0.62 : 0.55, 0.022, 6, 34),
    garden ? f.basic(0xa8ffe1, { transparent: true, opacity: 0.7 }) : f.basic(0x9be8ff)
  );
  outerRing.rotation.y = -0.06;
  innerRing.rotation.y = 0.08;
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: garden ? 0x6fe8c1 : 0x5cc9ff,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const core = new THREE.Mesh(new THREE.CircleGeometry(garden ? 0.78 : 0.7, 48), coreMaterial);
  const core2 = new THREE.Mesh(
    new THREE.RingGeometry(garden ? 0.28 : 0.22, garden ? 0.61 : 0.52, 40),
    new THREE.MeshBasicMaterial({ color: garden ? 0xb1ffe8 : 0x9be8ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  ringGroup.add(core, core2, outerRing, innerRing);
  root.add(ringGroup);

  const particles = [];
  for (let i = 0; i < 10; i++) {
    const particle = f.sphere(0.018 + (i % 3) * 0.006, f.basic(garden ? 0xa8ffe1 : 0x9be8ff, { transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending }), [0, 0, 0], 6);
    particle.userData.angle = (i / 10) * Math.PI * 2;
    particle.userData.radius = 0.8 + (i % 4) * 0.12;
    root.add(particle);
    particles.push(particle);
  }

  const glow = f.glowSprite(garden ? '#7bd6b1' : '#6bc5f8', garden ? 3.4 : 3.0, 0.22);
  glow.position.y = garden ? 1.45 : 1.3;
  root.add(glow);

  if (garden) {
    for (let i = 0; i < 4; i++) {
      const vine = new THREE.Mesh(new THREE.TorusGeometry(0.98 + i * 0.02, 0.016, 4, 22, Math.PI * 0.7), f.material('leafDeep'));
      vine.position.set(-0.3 + i * 0.18, 0.7 + i * 0.22, 0.1);
      vine.rotation.set(0.1, 0, -0.8 + i * 0.2);
      root.add(vine);
    }
  }

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows && !child.material.transparent;
      child.receiveShadow = true;
    }
  });

  return {
    root,
    ringGroup,
    outerRing,
    innerRing,
    core,
    core2,
    particles,
    glow,
    update(dt, elapsed, active, reducedMotion = false) {
      const motion = reducedMotion ? 0 : 1;
      ringGroup.rotation.z = Math.sin(elapsed * 0.35) * 0.08 * motion;
      outerRing.rotation.z += dt * (active ? 1.6 : 0.35) * motion;
      innerRing.rotation.z -= dt * (active ? 2.4 : 0.55) * motion;
      core.material.opacity = (active ? 0.38 : 0.17) + (reducedMotion ? 0 : Math.sin(elapsed * 2.2) * 0.05);
      core2.rotation.z -= dt * 0.3 * motion;
      glow.material.opacity = active ? 0.4 : 0.2;
      glow.scale.setScalar((garden ? 3.4 : 3.0) + (reducedMotion ? 0 : Math.sin(elapsed * 2) * 0.2));
      particles.forEach((particle, i) => {
        particle.userData.angle += dt * (active ? 1.2 : 0.35) * motion;
        const a = particle.userData.angle + i;
        particle.position.set(
          Math.cos(a) * particle.userData.radius,
          (garden ? 1.42 : 1.3) + (reducedMotion ? 0 : Math.sin(elapsed * 1.2 + i) * 0.5),
          Math.sin(a) * particle.userData.radius * 0.25
        );
        particle.material.opacity = reducedMotion ? 0.55 : 0.45 + Math.sin(elapsed * 2 + i) * 0.3;
      });
    }
  };
}

export function createCoffeeCart(factory) {
  const f = factory;
  const root = f.group('courtyard-coffee-cart');
  const wood = f.material('wood', { roughness: 0.65 });
  const cream = f.material('cream', { roughness: 0.72 });
  const coral = f.material('coral', { roughness: 0.6 });
  const metal = f.material(0x738297, { roughness: 0.35, metalness: 0.6 });
  const dark = f.material(0x1f2a3b, { roughness: 0.55 });

  // 车轮与底盘
  [(-0.65), 0.65].forEach((x) => {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 6, 16), dark);
    wheel.position.set(x, 0.28, -0.25);
    wheel.rotation.y = Math.PI / 2;
    root.add(wheel);
    root.add(f.cylinder(0.07, 0.07, 0.06, metal, [x, 0.28, -0.25], 10, { rotation: [0, 0, Math.PI / 2] }));
  });
  root.add(f.rounded(1.72, 0.76, 0.82, 0.07, cream, [0, 0.72, 0]));
  root.add(f.rounded(1.82, 0.1, 0.92, 0.04, wood, [0, 1.15, 0]));
  root.add(f.box(1.7, 0.06, 0.06, coral, [0, 0.86, 0.43]));
  root.add(f.box(1.7, 0.06, 0.06, coral, [0, 0.58, 0.43]));
  root.add(f.cylinder(0.16, 0.2, 0.34, f.material('mint'), [-0.72, 1.36, 0.12], 14));
  for (let i = 0; i < 4; i++) {
    root.add(f.sphere(0.08, f.material('leafLight'), [-0.72 + Math.cos(i * 1.8) * 0.08, 1.58 + (i % 2) * 0.06, 0.12 + Math.sin(i * 1.8) * 0.08], 8));
  }

  // 咖啡机与杯子
  root.add(f.rounded(0.46, 0.4, 0.38, 0.04, f.material('coral', { metalness: 0.25, roughness: 0.4 }), [-0.35, 1.4, 0.05]));
  root.add(f.cylinder(0.055, 0.055, 0.05, f.material('cream'), [-0.35, 1.44, 0.26], 12, { rotation: [Math.PI / 2, 0, 0] }));
  root.add(f.cylinder(0.032, 0.032, 0.2, metal, [-0.35, 1.27, 0.27], 8));
  for (let i = 0; i < 4; i++) {
    root.add(f.cylinder(0.045, 0.045, 0.012, f.material('amber'), [-0.52 + i * 0.11, 1.205, 0.28], 10));
  }
  const cup = f.cylinder(0.065, 0.055, 0.12, cream, [0.28, 1.28, 0.18], 12);
  root.add(cup);
  root.add(f.cylinder(0.05, 0.05, 0.008, f.material(0x6b3f27), [0.28, 1.34, 0.18], 12));
  root.add(f.cylinder(0.08, 0.08, 0.18, f.material('glass', { transparent: true, opacity: 0.45 }), [0.62, 1.28, 0.18], 12));
  root.add(f.rounded(0.34, 0.025, 0.24, 0.01, wood, [0.52, 1.26, -0.15], { rotation: [0, 0.1, 0] }));

  // 条纹雨棚
  const awning = new THREE.Group();
  awning.position.set(0, 1.72, 0);
  awning.rotation.x = -0.16;
  for (let i = 0; i < 7; i++) {
    const stripe = f.box(0.27, 0.035, 1.05, i % 2 === 0 ? coral : cream, [-0.81 + i * 0.27, 0, 0]);
    awning.add(stripe);
  }
  awning.add(f.box(1.9, 0.04, 0.04, metal, [0, 0.04, -0.5]));
  awning.add(f.box(1.9, 0.04, 0.04, metal, [0, 0.04, 0.5]));
  root.add(awning);
  [(-0.78), 0.78].forEach((x) => {
    root.add(f.cylinder(0.025, 0.025, 1.0, metal, [x, 1.66, 0.44], 8));
    root.add(f.cylinder(0.025, 0.025, 1.0, metal, [x, 1.66, -0.44], 8));
  });

  // 招牌、灯串、菜单板
  const signTex = makeSignTexture({ title: 'CORNER', subtitle: 'COFFEE · BUG REPELLENT', accent: '#ffd48a', bg: '#6b3f3f' });
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissive: 0x3a2017, emissiveMap: signTex, emissiveIntensity: 0.5, roughness: 0.5 });
  const sign = f.mesh(new THREE.PlaneGeometry(1.2, 0.34), signMat, [0, 1.46, 0.46]);
  root.add(sign);
  root.add(f.box(1.3, 0.44, 0.03, wood, [0, 1.46, 0.44]));
  const menuTex = makeSignTexture({ title: 'MENU', subtitle: 'ICED AMERICANO  ¥12', accent: '#7bd6b1', bg: '#243c3a' });
  const menuMat = new THREE.MeshStandardMaterial({ map: menuTex, roughness: 0.6 });
  root.add(f.mesh(new THREE.PlaneGeometry(0.55, 0.72), menuMat, [1.0, 0.9, 0.27], [0, -0.28, 0]));
  root.add(f.box(0.56, 0.76, 0.025, wood, [1.04, 0.9, 0.25], { rotation: [0, -0.28, 0] }));

  for (let i = 0; i < 5; i++) {
    root.add(f.sphere(0.028, f.basic(0xffd48a), [-0.62 + i * 0.31, 1.77 + Math.sin(i) * 0.04, 0.5], 6));
  }
  const steamParts = [];
  for (let i = 0; i < 3; i++) {
    const steam = new THREE.Mesh(
      new THREE.TorusGeometry(0.035, 0.008, 5, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false })
    );
    steam.position.set(0.28, 1.44 + i * 0.1, 0.18);
    steam.rotation.x = Math.PI / 2;
    root.add(steam);
    steamParts.push(steam);
  }

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows && !child.material.transparent;
      child.receiveShadow = true;
    }
  });

  return {
    root,
    cup,
    steamParts,
    update(dt, elapsed, boosted, reducedMotion) {
      steamParts.forEach((steam, i) => {
        steam.visible = !reducedMotion || boosted;
        steam.position.y = 1.4 + ((elapsed * 0.12 + i * 0.24) % 0.55);
        steam.material.opacity = reducedMotion ? 0.16 : 0.28 * (1 - ((elapsed * 0.12 + i * 0.24) % 0.55) / 0.55);
      });
      cup.position.y = 1.28 + (boosted ? Math.abs(Math.sin(elapsed * 9)) * 0.2 : 0);
    }
  };
}
