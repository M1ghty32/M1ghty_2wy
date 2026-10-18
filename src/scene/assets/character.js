/**
 * 低多边形 Q 版探索者角色。
 * 角色朝向本地 +Z，面部、背包和四肢都是可动画的独立枢轴。
 */
import * as THREE from 'three';

export function createExplorer(factory) {
  const f = factory;
  const root = f.group('M1ghty-explorer');
  const visual = new THREE.Group();
  visual.name = 'character-visual';
  root.add(visual);

  const shadow = f.blobShadow(0.52, 0.36);
  shadow.position.y = 0.018;
  root.add(shadow);

  const hoodie = f.material('sky', { roughness: 0.8 });
  const hoodieDark = f.material(0x477fb8, { roughness: 0.82 });
  const pants = f.material(0x23324c, { roughness: 0.86 });
  const shoe = f.material('cream', { roughness: 0.7 });
  const skin = f.material(0xf1c9a4, { roughness: 0.72 });
  const hair = f.material(0x1b2233, { roughness: 0.78 });
  const glasses = f.material(0xf6c96b, { roughness: 0.35, metalness: 0.5 });
  const accent = f.material('pink', { roughness: 0.66 });
  const bagMat = f.material(0x3d5a80, { roughness: 0.78 });
  const eyeMat = f.basic(0x172033);
  const whiteMat = f.basic(0xfffbef);

  // 腿与鞋：以髋部为枢轴摆动
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.14, 0.62, 0);
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.14, 0.62, 0);
  [leftLeg, rightLeg].forEach((leg) => {
    const thigh = f.rounded(0.2, 0.46, 0.22, 0.08, pants, [0, -0.2, 0]);
    const shoeMesh = f.rounded(0.23, 0.14, 0.34, 0.06, shoe, [0, -0.46, 0.07]);
    leg.add(thigh, shoeMesh);
    visual.add(leg);
  });

  // 躯干和斜挎带
  const torso = f.rounded(0.56, 0.56, 0.36, 0.13, hoodie, [0, 0.94, 0]);
  visual.add(torso);
  const hood = f.rounded(0.48, 0.18, 0.32, 0.09, hoodieDark, [0, 1.22, -0.04]);
  visual.add(hood);
  const strap = f.box(0.08, 0.54, 0.03, accent, [0.09, 0.96, 0.19], { rotation: [0, 0, -0.42] });
  visual.add(strap);
  const zip = f.box(0.025, 0.42, 0.02, f.material('cream'), [0, 0.97, 0.185]);
  visual.add(zip);

  // 背包（从默认相机方向看是最显眼的剪影）
  const bag = f.rounded(0.38, 0.48, 0.2, 0.08, bagMat, [0, 1.02, -0.28]);
  visual.add(bag);
  const pocket = f.rounded(0.26, 0.2, 0.08, 0.04, hoodieDark, [0, 0.94, -0.4]);
  visual.add(pocket);
  const badge = f.sphere(0.05, f.material('amber', { roughness: 0.5 }), [0.1, 1.06, -0.42]);
  visual.add(badge);
  const bagLight = f.sphere(0.035, f.basic(0x7bd6b1), [-0.1, 1.05, -0.42]);
  visual.add(bagLight);

  // 手臂
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.34, 1.12, 0);
    const sleeve = f.rounded(0.16, 0.4, 0.18, 0.065, hoodie, [0, -0.16, 0]);
    const hand = f.sphere(0.085, skin, [0, -0.4, 0.015]);
    pivot.add(sleeve, hand);
    pivot.rotation.z = side * 0.08;
    visual.add(pivot);
    return pivot;
  }
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // 头部
  const head = new THREE.Group();
  head.position.set(0, 1.45, 0.01);
  visual.add(head);
  const headMesh = f.sphere(0.3, skin, [0, 0, 0], 20);
  headMesh.scale.set(1, 0.98, 0.94);
  head.add(headMesh);

  const hairCap = f.sphere(0.315, hair, [0, 0.07, -0.025], 20);
  hairCap.scale.set(1.01, 0.72, 1.02);
  head.add(hairCap);
  const fringe = f.rounded(0.44, 0.12, 0.1, 0.04, hair, [0, 0.16, 0.235], { rotation: [-0.14, 0, 0] });
  head.add(fringe);
  const tuft = f.cone(0.08, 0.18, hair, [0.12, 0.32, -0.02], 7, { rotation: [0.2, 0, -0.35] });
  head.add(tuft);

  // 五官（在 +Z 面前）
  const leftEye = f.sphere(0.038, eyeMat, [-0.105, 0.015, 0.27], 10);
  const rightEye = f.sphere(0.038, eyeMat, [0.105, 0.015, 0.27], 10);
  leftEye.scale.y = 1.15;
  rightEye.scale.y = 1.15;
  head.add(leftEye, rightEye);
  const leftGlint = f.sphere(0.012, whiteMat, [-0.092, 0.032, 0.298], 7);
  const rightGlint = f.sphere(0.012, whiteMat, [0.118, 0.032, 0.298], 7);
  head.add(leftGlint, rightGlint);
  const nose = f.sphere(0.022, f.material(0xe8a87f), [0, -0.04, 0.29], 8);
  head.add(nose);
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.045, 0.009, 5, 12, Math.PI),
    f.material(0x8d4e42, { roughness: 0.6 })
  );
  smile.position.set(0, -0.1, 0.274);
  smile.rotation.set(Math.PI, 0, 0);
  head.add(smile);
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xf08a93, transparent: true, opacity: 0.5, depthWrite: false });
  const blushL = f.sphere(0.055, blushMat, [-0.19, -0.06, 0.245], 9);
  const blushR = f.sphere(0.055, blushMat, [0.19, -0.06, 0.245], 9);
  blushL.scale.z = 0.35;
  blushR.scale.z = 0.35;
  head.add(blushL, blushR);

  // 圆框眼镜和耳机
  const ringGeo = new THREE.TorusGeometry(0.072, 0.011, 6, 18);
  const glassesL = new THREE.Mesh(ringGeo, glasses);
  glassesL.position.set(-0.105, 0.015, 0.292);
  const glassesR = new THREE.Mesh(ringGeo, glasses);
  glassesR.position.set(0.105, 0.015, 0.292);
  const bridge = f.box(0.06, 0.014, 0.014, glasses, [0, 0.02, 0.292]);
  head.add(glassesL, glassesR, bridge);
  const headband = new THREE.Mesh(
    new THREE.TorusGeometry(0.29, 0.02, 6, 20, Math.PI),
    f.material(0x27364b, { roughness: 0.55 })
  );
  headband.position.set(0, 0.02, -0.01);
  headband.rotation.set(0, 0, 0);
  head.add(headband);
  const earCupL = f.cylinder(0.075, 0.075, 0.05, f.material(0x27364b), [-0.295, -0.01, 0], 12, { rotation: [0, 0, Math.PI / 2] });
  const earCupR = f.cylinder(0.075, 0.075, 0.05, f.material(0x27364b), [0.295, -0.01, 0], 12, { rotation: [0, 0, Math.PI / 2] });
  head.add(earCupL, earCupR);

  // 小围巾让角色在俯视镜头里更醒目
  const scarf = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.055, 7, 18),
    f.material('amber', { roughness: 0.72 })
  );
  scarf.position.set(0, 1.24, 0);
  scarf.rotation.x = Math.PI / 2;
  scarf.scale.z = 0.8;
  visual.add(scarf);

  root.traverse((child) => {
    if (child.isMesh) {
      // 角色使用脚下的 blob shadow；实时阴影由低频 shadow map 负责静态陈设，
      // 避免移动时角色阴影滞后或产生拖影。
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });
  shadow.castShadow = false;

  let walkPhase = 0;
  let blinkTimer = 1.7 + Math.random() * 2;
  let blinking = 0;

  function update(dt, elapsed, speed, reducedMotion) {
    const moving = speed > 0.08;
    if (moving) {
      walkPhase += dt * Math.min(12, 4.6 + speed * 2.6);
    } else {
      walkPhase += dt * 2.2;
    }

    const amplitude = moving ? Math.min(0.72, 0.28 + speed * 0.1) : 0;
    const swing = Math.sin(walkPhase) * amplitude;
    leftLeg.rotation.x = swing;
    rightLeg.rotation.x = -swing;
    leftArm.rotation.x = -swing * 0.7;
    rightArm.rotation.x = swing * 0.7;

    if (reducedMotion) {
      leftLeg.rotation.x *= 0.5;
      rightLeg.rotation.x *= 0.5;
      leftArm.rotation.x *= 0.35;
      rightArm.rotation.x *= 0.35;
    }

    const bob = moving ? Math.abs(Math.sin(walkPhase * 2)) * 0.035 : Math.sin(elapsed * 1.6) * 0.008;
    visual.position.y = bob;
    visual.rotation.z = moving ? Math.sin(walkPhase) * 0.018 : 0;
    torso.rotation.x = moving ? 0.06 : 0;
    head.rotation.x = moving ? 0.04 : Math.sin(elapsed * 1.1) * 0.015;
    head.rotation.y = moving ? Math.sin(walkPhase * 0.5) * 0.03 : Math.sin(elapsed * 0.6) * 0.08;

    // 眨眼，减少对动作敏感用户的影响
    blinkTimer -= dt;
    if (blinkTimer <= 0 && !reducedMotion) {
      blinking = 0.13;
      blinkTimer = 2.2 + Math.random() * 3.4;
    }
    if (blinking > 0) {
      blinking -= dt;
      const scale = blinking > 0.06 ? 0.18 : 1;
      leftEye.scale.y = 1.15 * scale;
      rightEye.scale.y = 1.15 * scale;
    } else {
      leftEye.scale.y = 1.15;
      rightEye.scale.y = 1.15;
    }

    const idleArm = reducedMotion ? 0 : Math.sin(elapsed * 1.4) * 0.035;
    leftArm.rotation.z = -0.08 - idleArm;
    rightArm.rotation.z = 0.08 + idleArm;
  }

  return {
    root,
    visual,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    shadow,
    update
  };
}
