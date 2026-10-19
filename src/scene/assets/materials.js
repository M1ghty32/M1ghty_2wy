/**
 * 程序化资产的统一材质、几何与纹理工厂。
 * 这里只使用 Three.js 内置几何与 Canvas 纹理，不引入外部模型或贴图。
 */
import * as THREE from 'three';

export const PALETTE = {
  ink: 0x0b1322,
  navy: 0x162238,
  navySoft: 0x223350,
  slate: 0x34445f,
  cream: 0xf2e7d5,
  paper: 0xfff8ea,
  warmWhite: 0xfff4df,
  wood: 0xb47a4a,
  woodLight: 0xd29a63,
  woodDark: 0x72452b,
  amber: 0xf5b942,
  orange: 0xf08a4b,
  coral: 0xef7d6b,
  pink: 0xf4a6c1,
  rose: 0xe86f93,
  mint: 0x7bd6b1,
  emerald: 0x3dbb8b,
  teal: 0x3fa9a0,
  sky: 0x6bc5f8,
  blue: 0x4e8cff,
  indigo: 0x5d6dd8,
  lavender: 0xb6a4f4,
  purple: 0x8b6fd6,
  leaf: 0x5fae72,
  leafDeep: 0x39794e,
  leafLight: 0x91d48f,
  soil: 0x6b4b38,
  stone: 0xa9b1b8,
  stoneDark: 0x6d7883,
  glass: 0xa9e3f8,
  glow: 0xffd48a
};

const textureCache = new Map();
const geometryCache = new Map();

function canvasTexture(key, draw, options = {}) {
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement('canvas');
  const width = options.width || 512;
  const height = options.height || 512;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (options.repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(options.repeat[0], options.repeat[1]);
  }
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

export function makeWoodTexture() {
  return canvasTexture('wood-floor', (ctx, w, h) => {
    ctx.fillStyle = '#a97145';
    ctx.fillRect(0, 0, w, h);
    const tones = ['#9b643c', '#b57c4d', '#c18958', '#8f5b37', '#a86f45'];
    const plankH = 42;
    for (let row = 0; row < Math.ceil(h / plankH); row++) {
      const offset = row % 2 ? -90 : 0;
      for (let col = 0; col < 4; col++) {
        ctx.fillStyle = tones[(row * 3 + col) % tones.length];
        ctx.fillRect(offset + col * 160, row * plankH, 156, plankH - 3);
        ctx.fillStyle = 'rgba(255,255,255,.07)';
        ctx.fillRect(offset + col * 160 + 4, row * plankH + 3, 146, 2);
        ctx.strokeStyle = 'rgba(53,30,15,.23)';
        ctx.lineWidth = 2;
        for (let grain = 0; grain < 4; grain++) {
          ctx.beginPath();
          const yy = row * plankH + 9 + grain * 8;
          ctx.moveTo(offset + col * 160 + 12, yy);
          ctx.bezierCurveTo(offset + col * 160 + 55, yy - 4, offset + col * 160 + 100, yy + 4, offset + col * 160 + 146, yy);
          ctx.stroke();
        }
      }
    }
  }, { repeat: [3, 3], width: 640, height: 512 });
}

export function makeTileTexture() {
  return canvasTexture('stone-tiles', (ctx, w, h) => {
    ctx.fillStyle = '#8d969b';
    ctx.fillRect(0, 0, w, h);
    const size = 128;
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        const shift = (y / size) % 2 ? size / 2 : 0;
        ctx.fillStyle = (x / size + y / size) % 2 ? '#9ca5a8' : '#858f95';
        ctx.fillRect(x + shift + 3, y + 3, size - 6, size - 6);
        ctx.strokeStyle = 'rgba(236,244,242,.25)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + shift + 6, y + 6, size - 12, size - 12);
      }
    }
  }, { repeat: [2, 2], width: 640, height: 640 });
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function roundedPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** 庭院草坪：低对比噪点 + 草叶短笔触，避免大面积纯色块。 */
export function makeGrassTexture() {
  return canvasTexture('grass-lawn', (ctx, w, h) => {
    const rand = createRandom(7);
    ctx.fillStyle = '#2c5238';
    ctx.fillRect(0, 0, w, h);
    const tones = ['#2f5a3d', '#27503a', '#356346', '#234a34', '#39694a', '#315c40'];
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < 2400; i++) {
      ctx.fillStyle = tones[i % tones.length];
      const r = 2 + rand() * 9;
      ctx.beginPath();
      ctx.ellipse(rand() * w, rand() * h, r, r * 0.5, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    for (let i = 0; i < 2600; i++) {
      const x = rand() * w;
      const y = rand() * h;
      ctx.strokeStyle = tones[(i * 2 + 1) % tones.length];
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 5, y - 3 - rand() * 6);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = ['#e6d69a', '#f2ecd9', '#cfe6b8'][i % 3];
      ctx.beginPath();
      ctx.arc(rand() * w, rand() * h, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, { repeat: [0.34, 0.34], width: 512, height: 512 });
}

/** 入口铺装：规整石板 + 深色勾缝，用于门廊前的正式铺地。 */
export function makeFlagstoneTexture() {
  return canvasTexture('flagstone-patio', (ctx, w, h) => {
    const rand = createRandom(23);
    ctx.fillStyle = '#3f4741';
    ctx.fillRect(0, 0, w, h);
    const cell = w / 4;
    const tones = ['#8f9791', '#9aa29a', '#848d86', '#a3a99f', '#969e94', '#8b948c'];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const inset = 7;
        const jx = (rand() - 0.5) * 4;
        const jy = (rand() - 0.5) * 4;
        const x = col * cell + inset + jx;
        const y = row * cell + inset + jy;
        const pw = cell - inset * 2 + (rand() - 0.5) * 6;
        const ph = cell - inset * 2 + (rand() - 0.5) * 6;
        ctx.fillStyle = tones[(row * 4 + col + (row % 2)) % tones.length];
        roundedPath(ctx, x, y, pw, ph, 9);
        ctx.fill();
        // 石面颗粒
        for (let s = 0; s < 26; s++) {
          ctx.fillStyle = s % 3 ? 'rgba(52,62,54,.10)' : 'rgba(238,244,235,.10)';
          ctx.beginPath();
          ctx.arc(x + rand() * pw, y + rand() * ph, 0.8 + rand() * 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
        // 受光边
        ctx.strokeStyle = 'rgba(240,247,238,.15)';
        ctx.lineWidth = 2;
        roundedPath(ctx, x + 1, y + 1, pw - 2, ph - 2, 8);
        ctx.stroke();
      }
    }
    // 勾缝里的苔藓
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = '#6f8f5c';
      ctx.beginPath();
      ctx.arc(rand() * w, rand() * h, 0.6 + rand() * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, { repeat: [2.4, 1.3], width: 512, height: 512 });
}

export function makeCodeScreenTexture(variant = 0) {
  const key = `code-screen-${variant}`;
  return canvasTexture(key, (ctx, w, h) => {
    const themes = [
      { bg: '#111b2e', sidebar: '#0d1524', top: '#16243b', accent: '#6bc5f8' },
      { bg: '#171426', sidebar: '#100f1c', top: '#211b38', accent: '#f4a6c1' },
      { bg: '#10201d', sidebar: '#0b1714', top: '#172d27', accent: '#7bd6b1' }
    ];
    const t = themes[variant % themes.length];
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = t.top;
    ctx.fillRect(0, 0, w, 54);
    ['#ff7b72', '#f5b942', '#7bd6b1'].forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(24 + i * 22, 27, 7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#0d1522';
    ctx.fillRect(98, 12, 180, 30);
    ctx.fillStyle = t.accent;
    ctx.font = '600 17px "JetBrains Mono", monospace';
    ctx.fillText(variant === 2 ? 'server.log' : 'M1ghty_2wy.java', 114, 33);
    ctx.fillStyle = t.sidebar;
    ctx.fillRect(0, 54, 135, h - 54);
    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.fillStyle = '#7b8da8';
    ['src', '  app.js', '  world', '  room.js', 'data', '  site.json'].forEach((line, i) => {
      ctx.fillText(line, 18, 92 + i * 29);
    });
    const code = [
      'package dev.m1ghty.room;',
      '',
      'public class Studio {',
      '  Desk desk = new Desk();',
      '  Cat cat = new Cat("NullPointer");',
      '',
      '  void enter(Player you) {',
      '    welcome(you);',
      '    brewCoffee(999);',
      '    cat.jump();',
      '  }',
      '',
      '  // TODO: keep the door open',
      '}'
    ];
    ctx.font = '17px "JetBrains Mono", monospace';
    code.forEach((line, i) => {
      const y = 92 + i * 27;
      ctx.fillStyle = '#4f6077';
      ctx.fillText(String(i + 1).padStart(2, ' '), 150, y);
      let color = '#d8e2f2';
      if (line.includes('package')) color = '#f5b942';
      if (line.includes('public') || line.includes('void')) color = '#ff9d7a';
      if (line.includes('//')) color = '#6d7f97';
      if (line.includes('"')) color = '#9fe3a8';
      if (line.includes('Cat') || line.includes('Player') || line.includes('Studio')) color = '#6bc5f8';
      ctx.fillStyle = color;
      ctx.fillText(line, 200, y);
    });
    ctx.fillStyle = t.accent;
    ctx.globalAlpha = 0.65 + Math.sin(variant) * 0.1;
    ctx.fillRect(200, 418, 130, 3);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0a111d';
    ctx.fillRect(0, h - 26, w, 26);
    ctx.fillStyle = '#7bd6b1';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText('main*  ✓ build passing   0 errors   1 cat on keyboard', 16, h - 8);
  }, { width: 768, height: 448 });
}

export function makeTerminalScreenTexture() {
  return canvasTexture('terminal-screen', (ctx, w, h) => {
    ctx.fillStyle = '#07101a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0d1a26';
    ctx.fillRect(0, 0, w, 48);
    ctx.fillStyle = '#ffe1a8';
    ctx.font = '600 19px "JetBrains Mono", monospace';
    ctx.fillText('m1ghty@homelab  —  zsh', 22, 31);
    const lines = [
      ['$', 'ssh m1ghty@studio.local', '#8be9fd'],
      ['', 'Welcome back. Coffee level: 87%', '#7bd6b1'],
      ['$', 'docker compose up -d', '#f5b942'],
      ['✓', 'desk-api     healthy', '#7bd6b1'],
      ['✓', 'cat-service  purring', '#7bd6b1'],
      ['✓', 'portal       listening', '#6bc5f8'],
      ['$', 'cat ~/.plan', '#8be9fd'],
      ['', 'ship something small today.', '#f2e7d5'],
      ['$', '█', '#d8e2f2']
    ];
    ctx.font = '20px "JetBrains Mono", monospace';
    lines.forEach((line, i) => {
      ctx.fillStyle = line[2];
      ctx.fillText(`${line[0]} ${line[1]}`, 28, 92 + i * 34);
    });
  }, { width: 680, height: 420 });
}

export function makeDashboardScreenTexture() {
  return canvasTexture('dashboard-screen', (ctx, w, h) => {
    ctx.fillStyle = '#101827';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#162238';
    ctx.fillRect(0, 0, w, 58);
    ctx.fillStyle = '#e8eefb';
    ctx.font = '700 22px Inter, "Noto Sans SC", sans-serif';
    ctx.fillText('studio telemetry', 24, 37);
    ctx.fillStyle = '#7bd6b1';
    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.fillText('● all systems nominal', 420, 35);
    const cards = [
      ['COFFEE', '87%', '#f5b942'],
      ['BUILD', '42s', '#6bc5f8'],
      ['CAT', 'zzz', '#f4a6c1'],
      ['UPTIME', '24d', '#7bd6b1']
    ];
    cards.forEach((card, i) => {
      const x = 22 + (i % 2) * 330;
      const y = 82 + Math.floor(i / 2) * 118;
      ctx.fillStyle = '#17253a';
      roundRect(ctx, x, y, 306, 98, 16);
      ctx.fill();
      ctx.fillStyle = '#7d90ab';
      ctx.font = '13px "JetBrains Mono", monospace';
      ctx.fillText(card[0], x + 20, y + 29);
      ctx.fillStyle = card[2];
      ctx.font = '700 36px "JetBrains Mono", monospace';
      ctx.fillText(card[1], x + 20, y + 73);
      ctx.fillStyle = '#223550';
      ctx.fillRect(x + 175, y + 35, 105, 8);
      ctx.fillStyle = card[2];
      ctx.fillRect(x + 175, y + 35, 55 + i * 12, 8);
      ctx.fillStyle = '#223550';
      ctx.fillRect(x + 175, y + 55, 105, 8);
      ctx.fillStyle = '#6bc5f8';
      ctx.fillRect(x + 175, y + 55, 70, 8);
    });
    ctx.strokeStyle = '#243a57';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 18; i++) {
      const x = 28 + i * 40;
      const y = 370 + Math.sin(i * 0.8) * 22 + Math.cos(i * 1.7) * 10;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#6bc5f8';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText('requests / minute', 28, 412);
  }, { width: 680, height: 440 });
}

export function makeSignTexture({ title, subtitle, accent = '#6bc5f8', bg = '#16335a', vertical = false } = {}) {
  const key = `sign-${title}-${subtitle}-${accent}-${bg}-${vertical}`;
  return canvasTexture(key, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 20, w, 6);
    ctx.fillRect(0, h - 26, w, 6);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff7e8';
    ctx.font = `${vertical ? 700 : 800} ${vertical ? 58 : 54}px Inter, "Noto Sans SC", sans-serif`;
    ctx.fillText(title, w / 2, h * 0.45);
    ctx.fillStyle = accent;
    ctx.font = '600 20px "JetBrains Mono", monospace';
    ctx.fillText(subtitle || '', w / 2, h * 0.73);
    ctx.fillStyle = 'rgba(255,255,255,.26)';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText('M1GHTY_2WY · OPEN 24/7', w / 2, h - 42);
  }, { width: vertical ? 340 : 768, height: vertical ? 512 : 220 });
}

export function makeBulletinTexture() {
  return canvasTexture('bulletin', (ctx, w, h) => {
    ctx.fillStyle = '#8a5a39';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c49a6c';
    for (let y = 0; y < h; y += 26) {
      ctx.fillRect(0, y, w, 2);
    }
    const notes = [
      ['#ffcf67', 44, 48, 150, 110, 'SHIP', 'small steps'],
      ['#f4a6c1', 232, 36, 170, 136, 'read', 'one page'],
      ['#9fd8c3', 438, 62, 146, 112, 'cat', 'is typing'],
      ['#9ec9ff', 86, 210, 180, 140, 'idea', 'explorable site'],
      ['#f5e6b8', 320, 200, 160, 128, 'todo', 'brew coffee'],
      ['#d5b9f4', 500, 244, 130, 100, 'note', 'stay curious']
    ];
    notes.forEach(([color, x, y, nw, nh, label, text]) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((Math.random() - 0.5) * 0.04);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, nw, nh);
      ctx.fillStyle = 'rgba(47,36,25,.76)';
      ctx.font = '700 14px "JetBrains Mono", monospace';
      ctx.fillText(label, 12, 25);
      ctx.font = '13px Inter, "Noto Sans SC", sans-serif';
      ctx.fillText(text, 12, 51);
      ctx.fillStyle = 'rgba(47,36,25,.34)';
      ctx.fillRect(12, 64, nw - 24, 3);
      ctx.fillRect(12, 75, nw - 48, 3);
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.beginPath();
      ctx.arc(nw / 2, 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }, { width: 680, height: 400 });
}

export function makePaintingTexture(kind = 0) {
  const kinds = [
    ['sunset', '#f6a35c', '#e86f6f', '#4d4f8d'],
    ['mountain', '#7bd6b1', '#356a72', '#1a3145'],
    ['cat', '#f4a6c1', '#8b6fd6', '#2c2547']
  ];
  const [name, a, b, c] = kinds[kind % kinds.length];
  return canvasTexture(`painting-${name}`, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, c);
    gradient.addColorStop(0.55, b);
    gradient.addColorStop(1, a);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,248,230,.9)';
    ctx.beginPath();
    ctx.arc(w * 0.7, h * 0.28, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(25,29,50,.7)';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.72);
    ctx.lineTo(w * 0.28, h * 0.38);
    ctx.lineTo(w * 0.53, h * 0.7);
    ctx.lineTo(w * 0.72, h * 0.48);
    ctx.lineTo(w, h * 0.78);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,248,230,.35)';
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h * 0.5, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { width: 420, height: 520 });
}

export function makeRugTexture() {
  return canvasTexture('rug', (ctx, w, h) => {
    ctx.fillStyle = '#1d3b69';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(107,197,248,.75)';
    ctx.lineWidth = 12;
    ctx.strokeRect(24, 24, w - 48, h - 48);
    ctx.strokeStyle = 'rgba(244,166,193,.65)';
    ctx.lineWidth = 5;
    ctx.strokeRect(52, 52, w - 104, h - 104);
    ctx.fillStyle = 'rgba(123,214,177,.28)';
    for (let y = 80; y < h - 70; y += 48) {
      for (let x = 80; x < w - 70; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x + 10, y);
        ctx.lineTo(x, y + 10);
        ctx.lineTo(x - 10, y);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(255,244,223,.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(74, 74, w - 148, h - 148);
  }, { width: 512, height: 512 });
}

export function makeGlowTexture(color = '#ffd48a') {
  return canvasTexture(`glow-${color}`, (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.22, color);
    gradient.addColorStop(0.55, 'rgba(255,212,138,.18)');
    gradient.addColorStop(1, 'rgba(255,212,138,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }, { width: 256, height: 256 });
}

export function makeShadowTexture() {
  return canvasTexture('soft-shadow', (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, 'rgba(0,0,0,.68)');
    gradient.addColorStop(0.45, 'rgba(0,0,0,.32)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }, { width: 256, height: 256 });
}

export function makeStarTexture() {
  return canvasTexture('star', (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(220,235,255,.75)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }, { width: 128, height: 128 });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function roundedRectShape(width, height, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, Math.min(width, height) / 2);
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

/**
 * 圆角盒：用 ExtrudeGeometry 构造，带有实际的圆角边和倒角。
 * 大件家具使用它，小件继续用 BoxGeometry 控制面数。
 */
export function roundedBoxGeometry(width, height, depth, radius = 0.06, quality = 1) {
  const key = `rounded:${width}:${height}:${depth}:${radius}:${quality}`;
  if (geometryCache.has(key)) return geometryCache.get(key);
  // 让最终包围盒严格等于请求尺寸：shape 与 extrusion 都先减去 bevel。
  const bevel = Math.max(0.001, Math.min(radius * 0.5, width * 0.12, height * 0.12, depth * 0.12));
  const innerWidth = Math.max(0.002, width - bevel * 2);
  const innerHeight = Math.max(0.002, height - bevel * 2);
  const innerDepth = Math.max(0.002, depth - bevel * 2);
  const innerRadius = Math.max(0.001, Math.min(radius - bevel, innerWidth / 2, innerHeight / 2));
  const shape = roundedRectShape(innerWidth, innerHeight, innerRadius);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: innerDepth,
    bevelEnabled: true,
    bevelSegments: quality > 1 ? 3 : 1,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: quality > 1 ? 6 : 3,
    steps: 1
  });
  geometry.center();
  geometryCache.set(key, geometry);
  return geometry;
}

export function createAssetFactory(quality) {
  const matCache = new Map();
  const glowMaterials = new Map();

  function material(name, options = {}) {
    const key = `${name}:${JSON.stringify({
      roughness: options.roughness,
      metalness: options.metalness,
      flat: options.flat,
      emissive: options.emissive,
      emissiveIntensity: options.emissiveIntensity,
      transparent: options.transparent,
      opacity: options.opacity,
      side: options.side,
      depthWrite: options.depthWrite,
      map: options.map ? options.map.uuid : null,
      emissiveMap: options.emissiveMap ? options.emissiveMap.uuid : null
    })}`;
    if (matCache.has(key)) return matCache.get(key);
    const mat = new THREE.MeshStandardMaterial({
      color: PALETTE[name] ?? name,
      roughness: options.roughness ?? 0.62,
      metalness: options.metalness ?? 0.02,
      flatShading: options.flat ?? false,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 1,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      side: options.side ?? THREE.FrontSide,
      map: options.map ?? null,
      emissiveMap: options.emissiveMap ?? null,
      depthWrite: options.depthWrite ?? true
    });
    mat.name = name;
    matCache.set(key, mat);
    return mat;
  }

  function basic(name, options = {}) {
    const key = `basic:${name}:${JSON.stringify({ ...options, map: undefined })}`;
    if (matCache.has(key)) return matCache.get(key);
    const mat = new THREE.MeshBasicMaterial({
      color: PALETTE[name] ?? name,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      side: options.side ?? THREE.FrontSide,
      map: options.map ?? null,
      wireframe: options.wireframe ?? false,
      depthWrite: options.depthWrite ?? true,
      blending: options.blending ?? THREE.NormalBlending
    });
    matCache.set(key, mat);
    return mat;
  }

  function mesh(geometry, mat, position = [0, 0, 0], options = {}) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(position[0], position[1], position[2]);
    if (options.rotation) object.rotation.set(...options.rotation);
    object.castShadow = options.castShadow ?? quality.shadows;
    object.receiveShadow = options.receiveShadow ?? true;
    if (options.name) object.name = options.name;
    return object;
  }

  function box(w, h, d, mat, position = [0, 0, 0], options = {}) {
    return mesh(new THREE.BoxGeometry(w, h, d), mat, position, options);
  }

  function rounded(w, h, d, r, mat, position = [0, 0, 0], options = {}) {
    return mesh(roundedBoxGeometry(w, h, d, r, quality.roundedSegments), mat, position, options);
  }

  function cylinder(rTop, rBottom, h, mat, position = [0, 0, 0], segments = quality.cylinderSegments, options = {}) {
    return mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), mat, position, options);
  }

  function sphere(r, mat, position = [0, 0, 0], segments = quality.sphereSegments, options = {}) {
    return mesh(new THREE.SphereGeometry(r, segments, Math.max(6, Math.round(segments * 0.7))), mat, position, options);
  }

  function cone(r, h, mat, position = [0, 0, 0], segments = quality.cylinderSegments, options = {}) {
    return mesh(new THREE.ConeGeometry(r, h, segments), mat, position, options);
  }

  function plane(w, h, mat, position = [0, 0, 0], options = {}) {
    return mesh(new THREE.PlaneGeometry(w, h), mat, position, options);
  }

  function glowSprite(color, size = 1, opacity = 0.45) {
    const key = `${color}:${opacity}`;
    if (!glowMaterials.has(key)) {
      glowMaterials.set(key, new THREE.SpriteMaterial({
        map: makeGlowTexture(color),
        color: 0xffffff,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      }));
    }
    const sprite = new THREE.Sprite(glowMaterials.get(key));
    sprite.scale.set(size, size, 1);
    return sprite;
  }

  function blobShadow(radius = 0.5, opacity = 0.38) {
    const mat = new THREE.MeshBasicMaterial({
      map: makeShadowTexture(),
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    shadow.renderOrder = 2;
    return shadow;
  }

  function labelPlane(texture, width, height, position = [0, 0, 0], options = {}) {
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      emissive: options.emissive ?? 0xffffff,
      emissiveMap: options.emissive ? texture : null,
      emissiveIntensity: options.emissiveIntensity ?? 0,
      roughness: 0.48,
      metalness: 0,
      transparent: Boolean(options.transparent),
      side: options.doubleSide ? THREE.DoubleSide : THREE.FrontSide
    });
    return mesh(new THREE.PlaneGeometry(width, height), mat, position, options);
  }

  function group(name, position = [0, 0, 0]) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(...position);
    return g;
  }

  function setShadow(object, cast = true, receive = true) {
    object.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = cast && quality.shadows;
        child.receiveShadow = receive;
      }
    });
    return object;
  }

  return {
    quality,
    material,
    basic,
    mesh,
    box,
    rounded,
    cylinder,
    sphere,
    cone,
    plane,
    glowSprite,
    blobShadow,
    labelPlane,
    group,
    setShadow,
    textures: {
      wood: makeWoodTexture(),
      tile: makeTileTexture(),
      grass: makeGrassTexture(),
      flagstone: makeFlagstoneTexture(),
      code: [makeCodeScreenTexture(0), makeCodeScreenTexture(1), makeCodeScreenTexture(2)],
      terminal: makeTerminalScreenTexture(),
      dashboard: makeDashboardScreenTexture(),
      bulletin: makeBulletinTexture(),
      rug: makeRugTexture(),
      shadow: makeShadowTexture(),
      star: makeStarTexture()
    }
  };
}
