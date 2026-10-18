/**
 * 庭院植物：樱花树、阔叶树、灌木、花丛、草丛、蘑菇与小花坛。
 * 树冠是可轻微摆动的 Group，prefers-reduced-motion 时会收敛幅度。
 */
import * as THREE from 'three';

const BLOOM_COLORS = ['pink', 'rose', 'amber', 'lavender', 'cream', 'coral'];

export function createTree(factory, { variant = 'sakura', scale = 1 } = {}) {
  const f = factory;
  const root = f.group(`tree-${variant}`);
  root.scale.setScalar(scale);
  const sway = new THREE.Group();
  root.add(sway);

  const bark = f.material(0x5e4430, { roughness: 0.94 });
  const barkLight = f.material(0x76563a, { roughness: 0.9 });
  const leafColors = variant === 'sakura'
    ? ['#f6b2cf', '#f49ac1', '#ffd4e3', '#e987ac']
    : variant === 'pine'
      ? ['#3f7d56', '#4f9665', '#2f6347', '#65a978']
      : ['#5fae72', '#76c083', '#3f8a58', '#8fd18e'];

  const trunk = f.cylinder(0.16, 0.26, 2.7, bark, [0, 1.35, 0], 9);
  trunk.castShadow = f.quality.shadows;
  root.add(trunk);
  root.add(f.cylinder(0.12, 0.15, 1.1, barkLight, [0, 0.55, 0], 8));

  if (variant === 'pine') {
    for (let i = 0; i < 4; i++) {
      const radius = 1.25 - i * 0.16;
      const cone = f.cone(radius, 1.25, f.material(leafColors[i % leafColors.length], { roughness: 0.86, flat: true }), [0, 1.85 + i * 0.52, 0], 7);
      sway.add(cone);
    }
    const top = f.cone(0.44, 0.85, f.material(leafColors[2], { roughness: 0.86, flat: true }), [0, 4.05, 0], 7);
    sway.add(top);
    root.add(f.cylinder(0.22, 0.3, 0.2, f.material('soil'), [0, 0.08, 0], 10));
    return {
      root,
      sway,
      variant,
      update(dt, elapsed, reducedMotion) {
        const amp = reducedMotion ? 0.002 : 0.012;
        sway.rotation.z = Math.sin(elapsed * 0.4 + scale) * amp;
        sway.rotation.x = Math.cos(elapsed * 0.34 + scale * 2) * amp * 0.7;
      }
    };
  }

  // 树枝
  const branchDefs = [
    [[-0.12, 2.2, 0], [-0.82, 3.15, 0.18], 0.075],
    [[0.12, 2.35, 0], [0.86, 3.3, -0.2], 0.07],
    [[0.02, 2.0, 0], [0.2, 3.25, 0.6], 0.06],
    [[-0.05, 1.85, 0], [-0.35, 2.9, -0.55], 0.055]
  ];
  branchDefs.forEach(([start, end]) => {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.075, a.distanceTo(b), 7), bark);
    branch.position.copy(a.clone().add(b).multiplyScalar(0.5));
    branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    branch.castShadow = f.quality.shadows;
    sway.add(branch);
  });

  // 树冠由多组低多边形球体组成
  const canopyCount = f.quality.tier === 'low' ? 7 : 12;
  const canopy = [
    [0, 3.6, 0, 1.05],
    [-0.7, 3.35, 0.2, 0.78],
    [0.72, 3.42, -0.2, 0.82],
    [0.22, 4.1, 0.5, 0.72],
    [-0.35, 4.02, -0.48, 0.76],
    [0.72, 3.9, 0.53, 0.65],
    [-0.85, 3.75, -0.35, 0.66],
    [0.08, 3.2, 0.9, 0.62],
    [-0.22, 3.26, -0.9, 0.6],
    [1.0, 3.45, 0.15, 0.56],
    [-0.3, 4.42, 0.1, 0.58],
    [0.42, 4.35, -0.38, 0.52]
  ];
  canopy.slice(0, canopyCount).forEach((node, index) => {
    const material = f.material(leafColors[index % leafColors.length], { roughness: 0.78, flat: true });
    const puff = f.sphere(node[3], material, [node[0], node[1], node[2]], f.quality.sphereSegments);
    puff.scale.set(1.06, 0.86, 1.02);
    puff.castShadow = f.quality.shadows;
    sway.add(puff);
  });

  // 樱花：飘落的小花瓣点 + 树上的小果实/花簇
  if (variant === 'sakura') {
    for (let i = 0; i < (f.quality.tier === 'low' ? 8 : 22); i++) {
      const blossom = f.sphere(0.06, f.material(i % 3 === 0 ? 'cream' : 'pink', { roughness: 0.6 }), [
        Math.sin(i * 2.4) * (1.15 + (i % 3) * 0.25),
        3.1 + ((i * 0.53) % 1.5),
        Math.cos(i * 2.4) * (1.15 + (i % 3) * 0.25)
      ], 7);
      sway.add(blossom);
    }
  }

  root.add(f.cylinder(0.68, 0.72, 0.09, f.material('soil'), [0, 0.045, 0], 14));
  for (let i = 0; i < 6; i++) {
    const x = Math.cos((i / 6) * Math.PI * 2) * 0.62;
    const z = Math.sin((i / 6) * Math.PI * 2) * 0.62;
    const stone = f.rounded(0.28, 0.08, 0.2, 0.04, f.material(0x7f8b86, { roughness: 0.95 }), [x, 0.04, z], { rotation: [0, -i, 0] });
    root.add(stone);
  }

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });

  return {
    root,
    sway,
    variant,
    update(dt, elapsed, reducedMotion) {
      const amp = reducedMotion ? 0.002 : 0.015;
      sway.rotation.z = Math.sin(elapsed * 0.45 + scale) * amp;
      sway.rotation.x = Math.cos(elapsed * 0.38 + scale * 2) * amp * 0.75;
    }
  };
}

export function createShrub(factory, { radius = 0.6, flowers = true } = {}) {
  const f = factory;
  const root = f.group('shrub');
  const colors = ['leafDeep', 'leaf', 'leafLight'];
  const count = f.quality.tier === 'low' ? 4 : 7;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const rr = radius * (0.45 + (i % 3) * 0.16);
    const puff = f.sphere(rr, f.material(colors[i % 3], { roughness: 0.9, flat: true }), [
      Math.cos(angle) * radius * 0.5,
      radius * (0.4 + (i % 2) * 0.13),
      Math.sin(angle) * radius * 0.45
    ], 9);
    puff.scale.set(1.15, 0.8, 1.05);
    root.add(puff);
  }
  if (flowers) {
    for (let i = 0; i < (f.quality.tier === 'low' ? 3 : 7); i++) {
      const bloom = f.sphere(0.045, f.material(BLOOM_COLORS[i % BLOOM_COLORS.length], { roughness: 0.6 }), [
        Math.cos(i * 2.1) * radius * 0.62,
        radius * (0.62 + (i % 3) * 0.12),
        Math.sin(i * 2.1) * radius * 0.6
      ], 6);
      root.add(bloom);
    }
  }
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });
  return { root };
}

export function createGrassTuft(factory, scale = 1) {
  const f = factory;
  const root = f.group('grass-tuft');
  const blade = f.cone(0.12, 0.38, f.material('leafDeep', { roughness: 0.9 }), [0, 0.19, 0], 4);
  blade.scale.set(1.6, 1, 0.85);
  blade.rotation.z = 0.12;
  blade.castShadow = false;
  root.add(blade);
  const tip = f.cone(0.07, 0.26, f.material('leaf', { roughness: 0.9 }), [0.12, 0.14, 0.02], 4);
  tip.rotation.z = -0.3;
  tip.castShadow = false;
  root.add(tip);
  root.scale.setScalar(scale);
  return { root };
}

export function createFlowerPatch(factory, { count = 12, radius = 0.8 } = {}) {
  const f = factory;
  const root = f.group('flower-patch');
  const stems = f.material('leafDeep', { roughness: 0.9 });
  const colors = [0xf4a6c1, 0xe86f93, 0xf5b942, 0xb6a4f4, 0xfff4df, 0xf08a72];
  const actualCount = f.quality.tier === 'low' ? Math.ceil(count * 0.55) : count;
  const dummy = new THREE.Object3D();

  // 茎：一个 InstancedMesh
  const stemGeometry = new THREE.CylinderGeometry(1, 1, 1, 4);
  const stemInstances = new THREE.InstancedMesh(stemGeometry, stems, actualCount);
  const flowerData = [];
  for (let i = 0; i < actualCount; i++) {
    const angle = i * 2.399;
    const r = Math.sqrt((i + 0.5) / actualCount) * radius;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const h = 0.18 + (i % 4) * 0.06;
    flowerData.push({ x, z, h, color: colors[i % colors.length] });
    dummy.position.set(x, h / 2, z);
    dummy.scale.set(0.012, h, 0.014);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    stemInstances.setMatrixAt(i, dummy.matrix);
  }
  stemInstances.castShadow = false;
  stemInstances.receiveShadow = true;
  root.add(stemInstances);

  // 花瓣：一个带 per-instance color 的 InstancedMesh，保持丰富颜色但只占一次绘制。
  const petalMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62 });
  const petalGeometry = new THREE.SphereGeometry(0.042, 5, 4);
  const petals = new THREE.InstancedMesh(petalGeometry, petalMaterial, actualCount * 5);
  const centers = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.018, 5, 4),
    f.material('amber', { roughness: 0.5 }),
    actualCount
  );
  const color = new THREE.Color();
  let petalIndex = 0;
  flowerData.forEach((flower, index) => {
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      dummy.position.set(
        flower.x + Math.cos(a) * 0.045,
        flower.h + 0.015,
        flower.z + Math.sin(a) * 0.045
      );
      dummy.scale.set(1, 0.34, 0.74);
      dummy.rotation.set(0, a, 0);
      dummy.updateMatrix();
      petals.setMatrixAt(petalIndex, dummy.matrix);
      petals.setColorAt(petalIndex, color.setHex(flower.color));
      petalIndex += 1;
    }
    dummy.position.set(flower.x, flower.h + 0.025, flower.z);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    centers.setMatrixAt(index, dummy.matrix);
  });
  petals.instanceColor.needsUpdate = true;
  petals.castShadow = false;
  petals.receiveShadow = true;
  centers.castShadow = false;
  root.add(petals, centers);
  return { root };
}

export function createFlowerBed(factory, { width = 2.6, depth = 0.9 } = {}) {
  const f = factory;
  const root = f.group('flower-bed');
  const border = f.material(0x6c5240, { roughness: 0.9 });
  const soil = f.material('soil', { roughness: 1 });
  root.add(f.rounded(width, 0.24, depth, 0.08, border, [0, 0.12, 0]));
  root.add(f.rounded(width - 0.25, 0.08, depth - 0.22, 0.04, soil, [0, 0.25, 0]));
  const patch = createFlowerPatch(f, { count: f.quality.tier === 'low' ? 8 : 18, radius: Math.min(width * 0.36, 1.0) });
  patch.root.position.set(0, 0.26, 0);
  patch.root.scale.set(1, 1, depth / width * 1.6);
  root.add(patch.root);
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = true;
    }
  });
  return { root };
}

export function createMushrooms(factory) {
  const f = factory;
  const root = f.group('mushrooms');
  const stemMat = f.material('cream', { roughness: 0.8 });
  const capMat = f.material('coral', { roughness: 0.7 });
  const dotMat = f.basic(0xfff3df);
  const data = [
    [0, 0, 0.18, 0.07],
    [0.2, 0.05, 0.12, 0.05],
    [-0.16, -0.08, 0.1, 0.045]
  ];
  data.forEach(([x, z, h, r]) => {
    root.add(f.cylinder(r * 0.75, r, h, stemMat, [x, h / 2, z], 8));
    const cap = f.sphere(r * 1.8, capMat, [x, h + r * 0.18, z], 8);
    cap.scale.set(1, 0.5, 1);
    root.add(cap);
    for (let i = 0; i < 3; i++) {
      root.add(f.sphere(r * 0.22, dotMat, [x + Math.cos(i * 2) * r * 0.75, h + r * 0.34, z + Math.sin(i * 2) * r * 0.5], 5));
    }
  });
  return { root };
}

export function createHedge(factory, length = 3.2) {
  const f = factory;
  const root = f.group('hedge');
  const count = f.quality.tier === 'low' ? Math.ceil(length / 1.1) : Math.ceil(length / 0.7);
  for (let i = 0; i < count; i++) {
    const puff = f.sphere(0.55, f.material(i % 2 ? 'leafDeep' : 'leaf', { roughness: 0.92, flat: true }), [-length / 2 + (i / Math.max(1, count - 1)) * length, 0.48, 0], 9);
    puff.scale.set(0.82, 0.92, 0.68);
    puff.castShadow = f.quality.shadows;
    root.add(puff);
  }
  return { root };
}

export function createBalconyPlants(factory) {
  const f = factory;
  const root = f.group('balcony-plants');
  const potMat = f.material('coral', { roughness: 0.72 });
  const leaf = f.material('leaf', { roughness: 0.8 });
  const bloom = f.material('pink', { roughness: 0.6 });
  for (let i = 0; i < 3; i++) {
    const pot = f.cylinder(0.12, 0.09, 0.22, potMat, [-0.55 + i * 0.55, 0.11, 0], 10);
    root.add(pot);
    for (let l = 0; l < 4; l++) {
      const leafMesh = f.sphere(0.08, leaf, [-0.55 + i * 0.55 + Math.cos(l * 1.8) * 0.07, 0.26 + (l % 2) * 0.06, Math.sin(l * 1.8) * 0.06], 6);
      leafMesh.scale.set(0.7, 0.5, 1.2);
      root.add(leafMesh);
    }
    root.add(f.sphere(0.05, bloom, [-0.55 + i * 0.55, 0.34, 0], 6));
  }
  return { root };
}
