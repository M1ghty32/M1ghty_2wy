/**
 * 橘猫 NullPointer：可跳、可摇尾巴、会眯眼的程序化小猫。
 */
import * as THREE from 'three';

export function createCat(factory) {
  const f = factory;
  const root = f.group('cat-nullpointer');
  const visual = new THREE.Group();
  root.add(visual);

  const orange = f.material(0xf39a55, { roughness: 0.72 });
  const orangeDeep = f.material(0xd97738, { roughness: 0.72 });
  const cream = f.material(0xfff2d9, { roughness: 0.76 });
  const pink = f.material(0xf4a6b8, { roughness: 0.7 });
  const dark = f.basic(0x2a2630);
  const white = f.basic(0xfff8ea);
  const collar = f.material('emerald', { roughness: 0.48 });
  const bell = f.material('amber', { roughness: 0.3, metalness: 0.55 });

  // 身体和胸部
  const body = f.sphere(0.34, orange, [0, 0.31, 0], 16);
  body.scale.set(1, 0.86, 1.15);
  visual.add(body);
  const chest = f.sphere(0.22, cream, [0, 0.28, 0.19], 14);
  chest.scale.set(0.9, 0.92, 0.55);
  visual.add(chest);
  const haunchL = f.sphere(0.17, orangeDeep, [-0.16, 0.25, -0.18], 12);
  const haunchR = f.sphere(0.17, orangeDeep, [0.16, 0.25, -0.18], 12);
  visual.add(haunchL, haunchR);

  // 前爪
  const pawL = f.rounded(0.12, 0.1, 0.2, 0.045, cream, [-0.13, 0.07, 0.22]);
  const pawR = f.rounded(0.12, 0.1, 0.2, 0.045, cream, [0.13, 0.07, 0.22]);
  visual.add(pawL, pawR);
  [-0.13, 0.13].forEach((x) => {
    for (let i = 0; i < 2; i++) {
      const toe = f.box(0.012, 0.012, 0.07, orangeDeep, [x - 0.028 + i * 0.056, 0.068, 0.3]);
      visual.add(toe);
    }
  });

  // 头部
  const head = new THREE.Group();
  head.position.set(0, 0.63, 0.08);
  visual.add(head);
  const headMesh = f.sphere(0.26, orange, [0, 0, 0], 18);
  headMesh.scale.set(1, 0.9, 0.95);
  head.add(headMesh);
  const muzzle = f.sphere(0.13, cream, [0, -0.06, 0.19], 14);
  muzzle.scale.set(1.1, 0.72, 0.7);
  head.add(muzzle);
  const nose = f.cone(0.033, 0.05, pink, [0, -0.015, 0.29], 4, { rotation: [Math.PI / 2, 0, 0] });
  head.add(nose);

  // 耳朵，内耳用粉色
  function ear(side) {
    const earGroup = new THREE.Group();
    earGroup.position.set(side * 0.16, 0.2, -0.01);
    earGroup.rotation.z = side * -0.18;
    const outer = f.cone(0.11, 0.22, orange, [0, 0, 0], 4, { rotation: [0, Math.PI / 4, 0] });
    const inner = f.cone(0.06, 0.14, pink, [0, 0.005, 0.035], 4, { rotation: [0, Math.PI / 4, 0] });
    earGroup.add(outer, inner);
    head.add(earGroup);
    return earGroup;
  }
  const earL = ear(-1);
  const earR = ear(1);

  // 眼睛、高光、腮红
  const eyeL = f.sphere(0.052, dark, [-0.1, 0.035, 0.225], 12);
  const eyeR = f.sphere(0.052, dark, [0.1, 0.035, 0.225], 12);
  eyeL.scale.set(0.82, 1.15, 0.5);
  eyeR.scale.set(0.82, 1.15, 0.5);
  const glintL = f.sphere(0.017, white, [-0.085, 0.06, 0.26], 7);
  const glintR = f.sphere(0.017, white, [0.115, 0.06, 0.26], 7);
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xf28f87, transparent: true, opacity: 0.45, depthWrite: false });
  const blushL = f.sphere(0.055, blushMat, [-0.19, -0.06, 0.18], 8);
  const blushR = f.sphere(0.055, blushMat, [0.19, -0.06, 0.18], 8);
  blushL.scale.z = 0.3;
  blushR.scale.z = 0.3;
  head.add(eyeL, eyeR, glintL, glintR, blushL, blushR);

  // 胡须
  const whiskerMat = f.basic(0xfff8ea, { transparent: true, opacity: 0.72 });
  [-1, 1].forEach((side) => {
    for (let i = 0; i < 3; i++) {
      const whisker = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.28, 4), whiskerMat);
      whisker.position.set(side * 0.2, -0.035 + i * 0.045, 0.25);
      whisker.rotation.set(Math.PI / 2, 0, side * (0.16 + i * 0.12));
      head.add(whisker);
    }
  });

  // 额头和背部条纹
  const stripeMat = orangeDeep;
  [-0.09, 0, 0.09].forEach((x, i) => {
    const stripe = f.box(0.035, 0.06, 0.03, stripeMat, [x, 0.2 - Math.abs(i - 1) * 0.02, 0.2]);
    head.add(stripe);
  });
  for (let i = 0; i < 3; i++) {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.31 - i * 0.02, 0.018, 5, 12, Math.PI * 0.7),
      stripeMat
    );
    band.position.set(0, 0.42 - i * 0.07, -0.02);
    band.rotation.set(Math.PI / 2, 0, Math.PI * 0.15 + i * 0.12);
    visual.add(band);
  }

  // 项圈 + 小铃铛
  const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.032, 6, 20), collar);
  collarRing.position.set(0, 0.48, 0.02);
  collarRing.rotation.x = Math.PI / 2.55;
  visual.add(collarRing);
  const bellMesh = f.sphere(0.055, bell, [0, 0.42, 0.22], 10);
  visual.add(bellMesh);

  // 可动画尾巴（曲线管道）
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.3, -0.3);
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.1, 0.12, -0.18),
    new THREE.Vector3(0.26, 0.35, -0.22),
    new THREE.Vector3(0.18, 0.58, -0.14),
    new THREE.Vector3(0.05, 0.7, -0.02)
  ]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 14, 0.055, 6, false), orange);
  const tailTip = f.sphere(0.058, cream, [0.05, 0.7, -0.02], 10);
  tailPivot.add(tail, tailTip);
  visual.add(tailPivot);

  // 软垫和投影
  const shadow = f.blobShadow(0.44, 0.42);
  shadow.position.y = 0.012;
  root.add(shadow);

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = f.quality.shadows;
      child.receiveShadow = true;
    }
  });
  shadow.castShadow = false;

  let blinkTimer = 2.4;
  let blink = 0;
  let tailPhase = 0;

  function update(dt, elapsed, excited, reducedMotion) {
    const motion = reducedMotion ? 0.25 : 1;
    tailPhase += dt * (excited ? 5.6 : 1.5);
    tailPivot.rotation.y = Math.sin(tailPhase) * (excited ? 0.55 : 0.22) * motion;
    tailPivot.rotation.x = Math.sin(tailPhase * 0.7) * 0.08 * motion;
    earL.rotation.x = Math.sin(elapsed * 1.7) * 0.04 * motion;
    earR.rotation.x = Math.cos(elapsed * 1.9) * 0.04 * motion;

    const breath = 1 + Math.sin(elapsed * 2.1) * 0.012 * motion;
    body.scale.set(1, 0.86 * breath, 1.15);
    head.position.y = 0.63 + Math.sin(elapsed * 2.1) * 0.007 * motion;

    if (excited) {
      visual.position.y = Math.abs(Math.sin(elapsed * 7.5)) * 0.46;
      visual.rotation.y = Math.sin(elapsed * 4.2) * 0.32;
      visual.rotation.z = Math.sin(elapsed * 8.8) * 0.05;
    } else {
      visual.position.y += (0 - visual.position.y) * Math.min(1, dt * 10);
      visual.rotation.y += (0 - visual.rotation.y) * Math.min(1, dt * 10);
      visual.rotation.z += (0 - visual.rotation.z) * Math.min(1, dt * 10);
    }

    blinkTimer -= dt;
    if (blinkTimer <= 0 && !reducedMotion) {
      blink = 0.12;
      blinkTimer = 2.8 + Math.random() * 3;
    }
    if (blink > 0) {
      blink -= dt;
      const scale = blink > 0.06 ? 0.14 : 1;
      eyeL.scale.y = 1.15 * scale;
      eyeR.scale.y = 1.15 * scale;
      glintL.visible = scale > 0.5;
      glintR.visible = scale > 0.5;
    } else {
      eyeL.scale.y = 1.15;
      eyeR.scale.y = 1.15;
      glintL.visible = true;
      glintR.visible = true;
    }
  }

  return { root, visual, head, tailPivot, update };
}
