/**
 * 标识、灯牌和墙画。文字通过 Canvas 生成，避免依赖外部字体图片。
 */
import * as THREE from 'three';
import { makeSignTexture, makePaintingTexture } from './materials.js';

function signMaterial(texture, emissiveColor = 0x000000, emissiveIntensity = 0) {
  return new THREE.MeshStandardMaterial({
    map: texture,
    emissive: emissiveColor,
    emissiveMap: texture,
    emissiveIntensity,
    roughness: 0.5,
    metalness: 0.05
  });
}

export function createFacadeSign(factory, {
  title = 'M1GHTY_2WY',
  subtitle = 'CODE STUDIO · OPEN 24/7',
  accent = '#ffd48a',
  bg = '#1e3b5c',
  width = 4.4,
  height = 0.78
} = {}) {
  const f = factory;
  const root = f.group('facade-sign');
  const texture = makeSignTexture({ title, subtitle, accent, bg });
  const boardMat = f.material(0x1c2a42, { roughness: 0.45 });
  root.add(f.rounded(width + 0.1, height + 0.1, 0.14, 0.06, boardMat, [0, 0, 0]));
  const plane = f.mesh(new THREE.PlaneGeometry(width, height), signMaterial(texture, 0xffffff, 0.55), [0, 0, 0.08]);
  root.add(plane);
  const glow = f.glowSprite(accent, width * 0.7, 0.08);
  glow.position.set(0, 0, 0.18);
  root.add(glow);
  return { root, plane, texture };
}

export function createHangingSign(factory, {
  title = 'OPEN',
  subtitle = 'COME IN',
  accent = '#7bd6b1',
  bg = '#17362f'
} = {}) {
  const f = factory;
  const root = f.group('hanging-sign');
  const frame = f.material('woodDark', { roughness: 0.7 });
  const chain = f.material(0x7a8591, { roughness: 0.4, metalness: 0.7 });
  root.add(f.cylinder(0.014, 0.014, 0.58, chain, [-0.42, 0.78, 0], 5));
  root.add(f.cylinder(0.014, 0.014, 0.58, chain, [0.42, 0.78, 0], 5));
  root.add(f.rounded(1.12, 0.64, 0.08, 0.04, frame, [0, 0.45, 0]));
  const tex = makeSignTexture({ title, subtitle, accent, bg, vertical: true });
  root.add(f.mesh(new THREE.PlaneGeometry(0.98, 0.52), signMaterial(tex, 0xffffff, 0.32), [0, 0.45, 0.05]));
  return { root };
}

export function createWallArt(factory, { kind = 0, width = 0.7, height = 0.86, frameColor = 'wood' } = {}) {
  const f = factory;
  const root = f.group('wall-art');
  const frame = f.material(frameColor, { roughness: 0.6 });
  const texture = makePaintingTexture(kind);
  root.add(f.rounded(width + 0.1, height + 0.1, 0.06, 0.025, frame, [0, 0, 0]));
  const artMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.72 });
  root.add(f.mesh(new THREE.PlaneGeometry(width, height), artMat, [0, 0, 0.04]));
  return { root };
}

export function createNeonSign(factory, { title = 'SHIP IT', color = '#6bc5f8', width = 1.5 } = {}) {
  const f = factory;
  const root = f.group('neon-sign');
  const texture = makeSignTexture({ title, subtitle: 'KEEP SHIPPING', accent: color, bg: '#101a29' });
  const mat = signMaterial(texture, 0xffffff, 0.85);
  const board = f.rounded(width, width * 0.29, 0.05, 0.04, f.material(0x121c2c, { roughness: 0.6 }), [0, 0, 0]);
  root.add(board);
  root.add(f.mesh(new THREE.PlaneGeometry(width - 0.08, width * 0.29 - 0.08), mat, [0, 0, 0.04]));
  const glow = f.glowSprite(color, width * 0.85, 0.16);
  glow.position.set(0, 0, 0.1);
  root.add(glow);
  return { root, material: mat, glow };
}

export function createWayfindingSign(factory) {
  const f = factory;
  const root = f.group('wayfinding-sign');
  const wood = f.material('wood', { roughness: 0.72 });
  root.add(f.cylinder(0.045, 0.055, 1.45, wood, [0, 0.72, 0], 8));
  for (let i = 0; i < 2; i++) {
    const board = f.group();
    board.position.set(0.15, 1.28 - i * 0.38, 0);
    board.rotation.y = i ? -0.15 : 0.12;
    const tex = makeSignTexture({
      title: i ? 'STUDIO' : 'GARDEN',
      subtitle: i ? 'PUSH THE DOOR' : 'TAKE A WALK',
      accent: i ? '#ffd48a' : '#7bd6b1',
      bg: '#2a2a3c'
    });
    board.add(f.rounded(0.92, 0.32, 0.06, 0.03, f.material('woodDark', { roughness: 0.7 }), [0, 0, 0]));
    board.add(f.mesh(new THREE.PlaneGeometry(0.82, 0.26), signMaterial(tex), [0, 0, 0.04]));
    root.add(board);
  }
  root.add(f.cone(0.1, 0.2, wood, [0, 1.5, 0], 8));
  return { root };
}

export function createPlaque(factory, text = 'M1GHTY') {
  const f = factory;
  const root = f.group('plaque');
  const tex = makeSignTexture({ title: text, subtitle: 'SINCE 2026', accent: '#ffd48a', bg: '#253249' });
  root.add(f.rounded(0.8, 0.3, 0.04, 0.02, f.material('woodDark'), [0, 0, 0]));
  root.add(f.mesh(new THREE.PlaneGeometry(0.72, 0.24), signMaterial(tex, 0xffffff, 0.2), [0, 0, 0.03]));
  return { root };
}

export function createMessageBoard(factory) {
  const f = factory;
  const root = f.group('message-board');
  const boardTex = makeSignTexture({ title: 'HELLO', subtitle: 'LEAVE A NOTE INSIDE', accent: '#f4a6c1', bg: '#3c2b3e' });
  root.add(f.rounded(1.0, 0.7, 0.06, 0.04, f.material('woodDark'), [0, 0, 0]));
  root.add(f.mesh(new THREE.PlaneGeometry(0.9, 0.6), signMaterial(boardTex, 0xffffff, 0.15), [0, 0, 0.04]));
  root.add(f.sphere(0.03, f.material('amber'), [-0.38, 0.26, 0.08], 6));
  root.add(f.sphere(0.03, f.material('sky'), [0.38, 0.26, 0.08], 6));
  return { root };
}
