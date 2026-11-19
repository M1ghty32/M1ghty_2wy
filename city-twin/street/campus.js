import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'label-layer';
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.position = 'fixed';
labelRenderer.domElement.style.inset = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
labelRenderer.domElement.style.zIndex = '4';
document.body.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5f3ed);
scene.fog = new THREE.FogExp2(0xf5f3ed, 0.00055);

const camera = new THREE.OrthographicCamera(-innerWidth / 2, innerWidth / 2, innerHeight / 2, -innerHeight / 2, -4000, 8000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
  controls.maxPolarAngle = Math.PI * 0.44;

controls.minDistance = 40;
controls.maxDistance = 5000;

const hemi = new THREE.HemisphereLight(0xffffff, 0x79866d, 1.25);
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d8, 1.55);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 2600;
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

const [data, surfaces] = await Promise.all([
  fetch('./data/campus-v2.json').then((r) => r.json()),
  fetch('./data/campus-surfaces.json').then((r) => r.json())
]);
// Display heights in metres; every footprint stays in the source coordinate system.
for (const b of data.buildings) {
  if (/明德楼|立德楼/.test(b.n)) b.h = 20;
  else if (b.k === 'library') b.h = 31;
  else if (b.k === 'student_bedroom') b.h = 21;
}
data.sports ||= [];
data.parking ||= [];
document.getElementById('stat-b').textContent = data.buildings.length;
document.getElementById('stat-r').textContent = data.roads.length;
document.getElementById('stat-w').textContent = data.water.length;
document.getElementById('stat-pa').textContent = surfaces.parkingAreas.length;
document.getElementById('stat-pb').textContent = surfaces.parkingBays.length;
document.getElementById('stat-s').textContent = data.sports.length;

/* ---------------- 世界边界与总览范围 ---------------- */
const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
function includePoint(p) {
  bounds.minX = Math.min(bounds.minX, p[0]); bounds.maxX = Math.max(bounds.maxX, p[0]);
  bounds.minZ = Math.min(bounds.minZ, p[1]); bounds.maxZ = Math.max(bounds.maxZ, p[1]);
}
for (const building of data.buildings) for (const ring of building.r) for (const p of ring) includePoint(p);
for (const ring of data.water) for (const p of ring) includePoint(p);
for (const feature of data.sports) for (const ring of feature.r || []) for (const p of ring) includePoint(p);
for (const collection of [surfaces.campusBoundary, surfaces.blocks, surfaces.green, surfaces.paving, surfaces.parkingAreas, surfaces.parkingBays]) {
  for (const feature of collection) for (const ring of feature.r || []) for (const p of ring) includePoint(p);
}
for (const p of data.parking) includePoint(p);
for (const p of data.trees || []) includePoint(p);
const framePadding = 38;
const siteBounds = { minX: bounds.minX - framePadding, maxX: bounds.maxX + framePadding, minZ: bounds.minZ - framePadding, maxZ: bounds.maxZ + framePadding };
const siteMid = { x: (siteBounds.minX + siteBounds.maxX) / 2, z: (siteBounds.minZ + siteBounds.maxZ) / 2 };
const siteSpan = Math.max(siteBounds.maxX - siteBounds.minX, siteBounds.maxZ - siteBounds.minZ);
const BUILDING_HEIGHT_OVERRIDES = new Map([
  ['5号楼（明德楼）', 20],
  ['6号楼（立德楼）', 20]
]);
const buildingHeight = (building) => BUILDING_HEIGHT_OVERRIDES.get(building.n) || Math.max(4, Number(building.h) || 12);
const MAP_BEARING = Math.PI / 4;
const MAP_ELEVATION = THREE.MathUtils.degToRad(35);
const mapRight = new THREE.Vector3(Math.cos(MAP_BEARING), 0, -Math.sin(MAP_BEARING));
const mapUp = new THREE.Vector3(-Math.sin(MAP_BEARING) * Math.sin(MAP_ELEVATION), Math.cos(MAP_ELEVATION), -Math.cos(MAP_BEARING) * Math.sin(MAP_ELEVATION));
const mapDirection = new THREE.Vector3(Math.sin(MAP_BEARING) * Math.cos(MAP_ELEVATION), Math.sin(MAP_ELEVATION), Math.cos(MAP_BEARING) * Math.cos(MAP_ELEVATION));
const framePoints = [];
for (const building of data.buildings) {
  for (const ring of building.r) for (const p of ring) {
    framePoints.push([p[0], 0, p[1]], [p[0], buildingHeight(building) + 3, p[1]]);
  }
}
for (const road of data.roads) for (const line of road.l) for (const p of line) framePoints.push([p[0], 0, p[1]]);
for (const collection of [data.water.map((r) => ({ r: [r] })), data.sports, data.parking.map((p) => ({ r: [[p]] })), surfaces.campusBoundary, surfaces.blocks, surfaces.green, surfaces.paving, surfaces.parkingAreas, surfaces.parkingBays]) {
  for (const feature of collection) for (const ring of feature.r || []) for (const p of ring) framePoints.push([p[0], 0, p[1]]);
}
const mapBounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
for (const [x, y, z] of framePoints) {
  const horizontal = new THREE.Vector3(x, 0, z);
  const right = horizontal.dot(mapRight);
  const up = horizontal.dot(mapUp) + y * Math.cos(MAP_ELEVATION);
  mapBounds.minX = Math.min(mapBounds.minX, right); mapBounds.maxX = Math.max(mapBounds.maxX, right);
  mapBounds.minY = Math.min(mapBounds.minY, up); mapBounds.maxY = Math.max(mapBounds.maxY, up);
}
const mapProjectedCenterX = (mapBounds.minX + mapBounds.maxX) / 2;
const mapProjectedCenterY = (mapBounds.minY + mapBounds.maxY) / 2;
const horizontalDepth = -mapProjectedCenterY / Math.sin(MAP_ELEVATION);
const mapCenter = new THREE.Vector3(
  Math.cos(MAP_BEARING) * mapProjectedCenterX + Math.sin(MAP_BEARING) * horizontalDepth,
  0,
  -Math.sin(MAP_BEARING) * mapProjectedCenterX + Math.cos(MAP_BEARING) * horizontalDepth
);
const homeHeight = () => Math.max(mapBounds.maxY - mapBounds.minY, (mapBounds.maxX - mapBounds.minX) / (innerWidth / innerHeight)) * 1.12;
let mapViewHeight = homeHeight();
function applyMapProjection() {
  const aspect = innerWidth / innerHeight;
  camera.left = -mapViewHeight * aspect / 2;
  camera.right = mapViewHeight * aspect / 2;
  camera.top = mapViewHeight / 2;
  camera.bottom = -mapViewHeight / 2;
  camera.updateProjectionMatrix();
}
applyMapProjection();

/* ---------------- 地面 ---------------- */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(siteBounds.maxX - siteBounds.minX + 80, siteBounds.maxZ - siteBounds.minZ + 80),
  new THREE.MeshStandardMaterial({ color: 0xb4bba7, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(siteMid.x, -0.12, siteMid.z);
ground.receiveShadow = true;
scene.add(ground);
const plinth = new THREE.Mesh(new THREE.BoxGeometry(siteBounds.maxX - siteBounds.minX + 80, 9, siteBounds.maxZ - siteBounds.minZ + 80), new THREE.MeshStandardMaterial({ color: 0x526c61, roughness: 0.86 }));
plinth.position.set(siteMid.x, -4.7, siteMid.z);
scene.add(plinth);

function polygonGeometries(features) {
  return features.flatMap((feature) => ringShapes(feature.r).map((shape) => {
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }));
}
function flatSurface(features, color, height) {
  const geos = polygonGeometries(features);
  if (!geos.length) return null;
  const mesh = new THREE.Mesh(mergeGeos(geos), new THREE.MeshStandardMaterial({ color, roughness: 0.96, side: THREE.DoubleSide }));
  mesh.receiveShadow = true;
  mesh.position.y = height;
  scene.add(mesh);
  return mesh;
}
flatSurface(surfaces.blocks, 0xe3d7cb, -0.04);
flatSurface(surfaces.green, 0x9fb567, -0.025);
flatSurface(surfaces.paving, 0xe3d7cb, -0.01);

/* ---------------- 水系 ---------------- */
const waterMat = new THREE.MeshBasicMaterial({ color: 0x7aa5e1, side: THREE.DoubleSide });
for (const ring of data.water) {
  const shape = new THREE.Shape();
  shape.moveTo(ring[0][0], -ring[0][1]);
  for (let i = 1; i < ring.length; i++) shape.lineTo(ring[i][0], -ring[i][1]);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, waterMat);
  mesh.position.y = 0.09;
  scene.add(mesh);
}

/* ---------------- 道路 ---------------- */
const ROAD_W = { primary: 11, primary_link: 8, secondary: 9, secondary_link: 7, tertiary: 8, living_street: 6, service: 5, path: 3, pedestrian: 3, steps: 2.4, track: 3 };
const roadMat = new THREE.MeshStandardMaterial({ color: 0x36444d, roughness: 0.46, metalness: 0 });
const pathMat = new THREE.MeshStandardMaterial({ color: 0xe4ddc8, roughness: 1 });
const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
const roadGeoms = [];
const sidewalkGeoms = [];
const pathGeoms = [];
const edgeGeoms = [];
function ribbon(points, width, list) {
  const curve = [];
  for (const p of points) {
    const v = new THREE.Vector3(p[0], 0, p[1]);
    if (!curve.length || curve[curve.length - 1].distanceTo(v) > 0.6) curve.push(v);
  }
  if (curve.length < 2) return;
  const positions = [];
  const indices = [];
  const normals = [];
  for (let i = 0; i < curve.length; i++) {
    const prev = curve[Math.max(0, i - 1)];
    const next = curve[Math.min(curve.length - 1, i + 1)];
    const dir = new THREE.Vector3().subVectors(next, prev).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width / 2);
    positions.push(curve[i].x - side.x, 0, curve[i].z - side.z);
    positions.push(curve[i].x + side.x, 0, curve[i].z + side.z);
    normals.push(0, 1, 0, 0, 1, 0);
    if (i < curve.length - 1) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setIndex(indices);
  list.push(g);
}
for (const road of data.roads) {
  const w = ROAD_W[road.w] || 4;
  const target = ['path', 'pedestrian', 'steps'].includes(road.w) ? pathGeoms : roadGeoms;
  for (const line of road.l) {
    ribbon(line, w + 2.2, sidewalkGeoms);
    ribbon(line, w, target);
  }
}
const sidewalkMesh = new THREE.Mesh(mergeGeos(sidewalkGeoms), new THREE.MeshStandardMaterial({ color: 0xc5c2b6, roughness: 1 }));
sidewalkMesh.position.y = 0.025;
sidewalkMesh.receiveShadow = true;
scene.add(sidewalkMesh);
const roadMesh = new THREE.Mesh(mergeGeos(roadGeoms), roadMat);
roadMesh.position.y = 0.05;
roadMesh.receiveShadow = true;
scene.add(roadMesh);
const pathMesh = new THREE.Mesh(mergeGeos(pathGeoms), pathMat);
pathMesh.position.y = 0.065;
pathMesh.receiveShadow = true;
scene.add(pathMesh);

/* 主干路的细虚线 */
for (const road of data.roads) {
  if (!['primary', 'primary_link', 'secondary', 'secondary_link'].includes(road.w)) continue;
  for (const line of road.l) {
    if (line.length < 2) continue;
    const curve = new THREE.CatmullRomCurve3(line.map((p) => new THREE.Vector3(p[0], 0.082, p[1])));
    const length = curve.getLength();
    const dash = new THREE.LineDashedMaterial({ color: 0xe7d18b, dashSize: 3.2, gapSize: 3.2, transparent: true, opacity: 0.72 });
    const markingGeometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(Math.max(8, Math.ceil(length / 5))));
    const marking = new THREE.Line(markingGeometry, dash);
    marking.computeLineDistances();
    scene.add(marking);
  }
}

/* ---------------- 路灯与行道树 ---------------- */
const lampPoles = [];
const lampHeads = [];
const avenue = [];
for (const road of data.roads) {
  if (!['primary', 'secondary', 'tertiary'].includes(road.w)) continue;
  for (const line of road.l) {
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i], b = line[i + 1];
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const len = Math.hypot(dx, dz);
      if (len < 12) continue;
      const nx = -dz / len, nz = dx / len;
      const steps = Math.floor(len / 34);
      for (let k = 0; k < steps; k++) {
        const t = (k + 0.5) / Math.max(1, steps);
        const x = a[0] + dx * t, z = a[1] + dz * t;
        const side = (k % 2 === 0) ? 1 : -1;
        lampPoles.push([x + nx * 6 * side, z + nz * 6 * side]);
        avenue.push([x + nx * 9 * side, z + nz * 9 * side]);
      }
    }
  }
}
if (lampPoles.length) {
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7, 6);
  poleGeo.translate(0, 3.5, 0);
  const headGeo = new THREE.SphereGeometry(0.34, 8, 8);
  headGeo.translate(0, 7.1, 0);
  const poleMesh = new THREE.InstancedMesh(poleGeo, new THREE.MeshStandardMaterial({ color: 0x3a444d, roughness: 0.8 }), lampPoles.length);
  const headMesh = new THREE.InstancedMesh(headGeo, new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), lampPoles.length);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < lampPoles.length; i++) {
    m4.makeTranslation(lampPoles[i][0], 0, lampPoles[i][1]);
    poleMesh.setMatrixAt(i, m4);
    headMesh.setMatrixAt(i, m4);
  }
  scene.add(poleMesh, headMesh);
}

// A single instanced pass paints the amber pools under mapped avenue lights.
const glowCanvas = document.createElement('canvas');
glowCanvas.width = glowCanvas.height = 96;
const glowCtx = glowCanvas.getContext('2d');
const glowGradient = glowCtx.createRadialGradient(48,48,1,48,48,48);
glowGradient.addColorStop(0,'rgba(255,220,152,.82)');
glowGradient.addColorStop(.42,'rgba(255,193,99,.4)');
glowGradient.addColorStop(1,'rgba(255,182,80,0)');
glowCtx.fillStyle = glowGradient;
glowCtx.fillRect(0,0,96,96);
const glowGeometry = new THREE.PlaneGeometry(13,17).rotateX(-Math.PI/2);
const pools = new THREE.InstancedMesh(glowGeometry,new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}),lampPoles.length);
lampPoles.forEach(([x,z],i)=>pools.setMatrixAt(i,new THREE.Matrix4().makeTranslation(x,.18,z)));
scene.add(pools);
/* ---------------- 树木（真实点位） ---------------- */
const treeData = (data.trees || []).concat(avenue);
if (treeData.length) {
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 3.2, 6);
  trunkGeo.translate(0, 1.6, 0);
    const crownGeo = new THREE.IcosahedronGeometry(2.2, 1);
    crownGeo.translate(0, 5.4, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x665340, roughness: 0.95 });
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x638447, roughness: 0.9, flatShading: true });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeData.length);
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, treeData.length);
  const m4 = new THREE.Matrix4();
  const color = new THREE.Color();
  for (let i = 0; i < treeData.length; i++) {
    const t = treeData[i];
    const sc = 0.8 + (i % 7) * 0.06;
    m4.makeScale(sc, sc * (0.9 + (i % 5) * 0.05), sc);
    m4.setPosition(t[0], 0, t[1]);
    trunks.setMatrixAt(i, m4);
    crowns.setMatrixAt(i, m4);
    color.setHSL(0.26 + (i % 5) * 0.01, 0.32, 0.32 + (i % 4) * 0.03);
    crowns.setColorAt(i, color);
  }
  trunks.castShadow = true;
  crowns.castShadow = true;
  scene.add(trunks, crowns);
}

/* ---------------- 建筑 ---------------- */
const WINDOW_UNIFORMS = { uNight: { value: 0 } };
function makeBuildingMaterial(baseColor) {
  const mat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.72, metalness: 0.12 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = WINDOW_UNIFORMS.uNight;
    shader.vertexShader = 'varying vec3 vWPos;\nvarying vec3 vWN;\n' + shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
       vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
       vWN = normalize(mat3(modelMatrix) * objectNormal);`
    );
    shader.fragmentShader = 'varying vec3 vWPos;\nvarying vec3 vWN;\nuniform float uNight;\n' + shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
       float wall = 1.0 - smoothstep(0.45, 0.62, abs(vWN.y));
       float fy = fract((vWPos.y - 1.2) / 3.6);
       float fx = fract((vWPos.x + vWPos.z) / 4.2);
       float win = step(0.52, fx) * step(fx, 0.88) * step(0.30, fy) * step(fy, 0.78);
       float bay = floor((vWPos.x + vWPos.z) / 4.2);
       float storey = floor((vWPos.y - 1.2) / 3.6);
       float lit = step(0.39, fract(sin(bay * 7.31 + storey * 13.17) * 4375.18));
       vec3 reflectedSky = mix(vec3(0.19, 0.32, 0.36), vec3(0.45, 0.59, 0.61), fy);
       vec3 winCol = mix(reflectedSky, mix(vec3(0.13, 0.19, 0.24), vec3(1.0, 0.8, 0.5), lit), uNight);
       gl_FragColor.rgb = mix(gl_FragColor.rgb, winCol, win * wall * (0.88 - 0.52 * (1.0 - smoothstep(0.009,0.025,abs(fx-0.70)))));
       float band = smoothstep(0.86, 1.0, fract(vWPos.y / 3.6));
       gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.86, 0.88, 0.9), band * wall * 0.55);`
    );
  };
  return mat;
}
const palette = [0xe3e4df, 0xe8e7e1, 0xd9ddd8, 0xf0eee8, 0xd1d8d4];
const KIND_COLOR = { library: 0xf0eee7, teaching: 0xe7e7e1, student_bedroom: 0xe4dfd3, gymnasium: 0xe6e9e4, canteen: 0xe5ded1, experiment_building: 0xe0e6e3, administration: 0xe8e3d8, service_building: 0xe2ded5, hospital: 0xe9eae5 };
function ringArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area / 2;
}
function polygonCenter(ring) {
  let area = 0, x = 0, z = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const cross = a[0] * b[1] - b[0] * a[1];
    area += cross;
    x += (a[0] + b[0]) * cross;
    z += (a[1] + b[1]) * cross;
  }
  if (Math.abs(area) < 1e-6) return ring.reduce((center, p) => [center[0] + p[0] / ring.length, center[1] + p[1] / ring.length], [0, 0]);
  return [x / (3 * area), z / (3 * area)];
}
function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
function appendRing(path, ring) {
  ring.forEach((p, i) => i ? path.lineTo(p[0], -p[1]) : path.moveTo(p[0], -p[1]));
  path.closePath();
}
function ringShapes(rings) {
  const ordered = rings.filter((ring) => ring && ring.length >= 4).map((ring) => ({ ring, area: Math.abs(ringArea(ring)), parent: null, depth: 0 })).sort((a, b) => b.area - a.area);
  for (let i = 0; i < ordered.length; i++) {
    const item = ordered[i];
    for (let j = 0; j < i; j++) {
      if (pointInRing(item.ring[0], ordered[j].ring) && (!item.parent || ordered[j].area < item.parent.area)) item.parent = ordered[j];
    }
    item.depth = item.parent ? item.parent.depth + 1 : 0;
  }
  const shapes = [];
  for (const item of ordered) {
    if (item.depth % 2 !== 0) continue;
    const shape = new THREE.Shape();
    appendRing(shape, item.ring);
    for (const hole of ordered) {
      if (hole.parent !== item || hole.depth !== item.depth + 1) continue;
      const path = new THREE.Path();
      appendRing(path, hole.ring);
      shape.holes.push(path);
    }
    shapes.push(shape);
  }
  return shapes;
}
function ringShape(rings) {
  return ringShapes(rings)[0] || null;
}
function extrudedFeature(rings, height = 0.1) {
  return ringShapes(rings).map((shape) => {
    const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 1 });
    geo.rotateX(-Math.PI / 2);
    return geo;
  });
}
const buildingGeoms = [];
let idx = 0;
for (const b of data.buildings) {
  if (b.n === '运动场') continue;
  const h = Math.max(4, b.h || 12);
  const geos = extrudedFeature(b.r, h);
  if (!geos.length) continue;
  // 颜色写入顶点色
  const color = new THREE.Color(KIND_COLOR[b.k] || palette[idx % palette.length]);
  for (const geo of geos) {
    const count = geo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    buildingGeoms.push(geo);
  }
  idx++;
}
const bMat = makeBuildingMaterial(0xffffff);
bMat.vertexColors = true;
const buildingMesh = new THREE.Mesh(mergeGeos(buildingGeoms), bMat);
buildingMesh.castShadow = true;
buildingMesh.receiveShadow = true;
scene.add(buildingMesh);

/* 屋顶（深色薄板） */
const roofGeos = [];
const parapetEdges = [];
for (const b of data.buildings) {
  if (b.n === '运动场') continue;
  const shape = ringShape(b.r);
  if (!shape) continue;
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, Math.max(4, b.h || 12) + 0.06, 0);
  roofGeos.push(geo);
  const elevation = Math.max(4, b.h || 12) + 0.18;
  for (const ring of b.r) {
    for (let i = 1; i < ring.length; i++) {
      parapetEdges.push(ring[i - 1][0], elevation, ring[i - 1][1], ring[i][0], elevation, ring[i][1]);
    }
  }
}
const roofMesh = new THREE.Mesh(mergeGeos(roofGeos), new THREE.MeshStandardMaterial({ color: 0x7c9992, roughness: 0.92 }));
scene.add(roofMesh);
const inkLines = new THREE.EdgesGeometry(buildingMesh.geometry, 35);
scene.add(new THREE.LineSegments(inkLines, new THREE.LineBasicMaterial({color:0x343e42, transparent:true,opacity:.74})));

const roofOutline = new THREE.BufferGeometry();
roofOutline.setAttribute('position', new THREE.Float32BufferAttribute(parapetEdges, 3));
scene.add(new THREE.LineSegments(roofOutline, new THREE.LineBasicMaterial({ color: 0x88968c })));

/* ---------------- 官方运动、停车设施 ---------------- */
const sportsByCategory = (category) => data.sports.filter((feature) => feature.cat === category);
const sportsOuter = flatSurface(sportsByCategory('outermost'), 0xbd6f5b, 0.12);
const sportsInner = flatSurface(sportsByCategory('inner'), 0x728a68, 0.145);
const sportLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
for (const feature of [...sportsByCategory('outermost'), ...sportsByCategory('secondary')]) {
  for (const ring of feature.r || []) {
    if (ring.length < 4) continue;
    const line = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(ring.map((p) => new THREE.Vector3(p[0], 0.18, p[1]))),
      sportLineMaterial
    );
    scene.add(line);
  }
}

const parkingAreaMesh = flatSurface(surfaces.parkingAreas, 0xd8e7ec, 0.035);
const parkingBayGeometries = polygonGeometries(surfaces.parkingBays);
if (parkingBayGeometries.length) {
  const parkingBays = new THREE.Mesh(mergeGeos(parkingBayGeometries), new THREE.MeshBasicMaterial({ color: 0xf8faf8, side: THREE.DoubleSide }));
  parkingBays.position.y = 0.052;
  scene.add(parkingBays);
}

/* ---------------- 校门与运动场 ---------------- */
function makeSignTexture(text) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 192;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#f6f2e8';
  ctx.font = 'bold 96px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}
const gateDefs = [
  { name: '南门', x: 204.7, z: 442.1, rot: 0, main: true },
  { name: '西南门', x: -294.7, z: 254.4, rot: Math.PI / 2, main: false },
  { name: '北门', x: -62, z: -830, rot: Math.PI, main: false },
  { name: '东门', x: 688, z: 322, rot: -Math.PI / 2, main: false }
];
const gateMat = new THREE.MeshStandardMaterial({ color: 0xcfd6dc, roughness: 0.6, metalness: 0.2 });
const gateDark = new THREE.MeshStandardMaterial({ color: 0x2b343c, roughness: 0.7 });
for (const g of gateDefs) {
  const group = new THREE.Group();
  group.position.set(g.x, 0, g.z);
  group.rotation.y = g.rot;
  const spanW = g.main ? 22 : 13;
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 9, 2.4), g.main ? gateMat : gateDark);
    pillar.position.set(side * spanW / 2, 4.5, 0);
    pillar.castShadow = true;
    group.add(pillar);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(spanW + 2.4, 1.4, 2.8), gateMat);
  beam.position.set(0, 9.2, 0);
  beam.castShadow = true;
  group.add(beam);
  if (g.main) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(spanW * 0.78, 2.6), new THREE.MeshBasicMaterial({ map: makeSignTexture('四川吉利学院'), transparent: true, alphaTest: 0.05 }));
    sign.position.set(0, 6.4, 1.45);
    group.add(sign);
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.4), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
      lamp.position.set(side * spanW * 0.35, 8.3, 1.5);
      group.add(lamp);
    }
  }
  scene.add(group);
  if (g.name === '南门') continue;
  const el = document.createElement('div');
  el.className = 'label';
  el.textContent = g.name;
  const obj = new CSS2DObject(el);
  obj.position.set(g.x, 12, g.z);
  scene.add(obj);
}

/* 运动标签：位置沿用矢量设施中心，不再重复绘制固定椭圆 */
for (const [text, x, z] of [['运动场', -75, -143], ['运动场', 567, 327], ['篮球场', 559, 307], ['网球场', 41, -231]]) {
  const el = document.createElement('div');
  el.className = 'label';
  el.textContent = text;
  const obj = new CSS2DObject(el);
  obj.position.set(x, 10, z);
  scene.add(obj);
}

/* ---------------- 重点立面 ---------------- */
function signTexture(text) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 192;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e7d9b5'; ctx.fillRect(0,0,1024,192); ctx.fillStyle='#274e4e';
  ctx.font = 'bold 96px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 512, 96);
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4; return tex;
}
// Fit the entrance to an existing exterior edge, including rotated footprints.
const trimBatches = new Map();
function detailBox(color,w,h,d,x,y,z,angle) {
  const geo = new THREE.BoxGeometry(w,h,d).rotateY(angle).translate(x,y,z);
  if (!trimBatches.has(color)) trimBatches.set(color,[]);
  trimBatches.get(color).push(geo);
}
for (const building of data.buildings) {
  if (!building.n || building.k === 'part_entrance' || building.n === '运动场') continue;
  const ring = building.r[0];
  const center=polygonCenter(ring);
  // Keep rooftop service details inside the actual outline, away from courtyards.
  for(const offset of [-6,6]){
    const x=center[0]+offset,z=center[1];
    const corners=[[-3,-2],[3,-2],[-3,2],[3,2]];
    if(!corners.every(([dx,dz])=>pointInRing([x+dx,z+dz],ring)&&!building.r.slice(1).some(hole=>pointInRing([x+dx,z+dz],hole))))continue;
    detailBox(0x9ba7a1,5.8,1.45,3.6,x,building.h+.74,z,0);
    for(let i=-2;i<=2;i++)detailBox(0x45575a,.25,.12,2.6,x+i,building.h+1.53,z,0);
  }
  let edge, longest = 0;
  for (let i=1;i<ring.length;i++) {
    const length = Math.hypot(ring[i][0]-ring[i-1][0],ring[i][1]-ring[i-1][1]);
    if (length>longest) {longest=length;edge=[ring[i-1],ring[i]];}
  }
  if (longest<8) continue;
  const [a,b]=edge, x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
  let nx=-(b[1]-a[1])/longest,nz=(b[0]-a[0])/longest;
  if(pointInRing([x+nx*.1,z+nz*.1],ring)){nx=-nx;nz=-nz;}
  const angle=Math.atan2(nx,nz),width=Math.min(longest*.58,20),height=Math.min(4,building.h*.8);
  const part=(color,w,h,d,side,y,out)=>detailBox(color,w,h,d,x+nx*out+nz*side,y,z+nz*out-nx*side,angle);
  part(0x35575c,width,height,.32,0,height/2,.17);
  for(let i=0;i<5;i++){
    const side=width*((i+.5)/5-.5);
    part(i===2?0x597779:0xe7b978,width*.17,height*.67,.07,side,height*.46,.37);
  }
  part(0x377c74,width+1,.34,2.4,0,height,1.05);
  part(0xffde9a,width+.7,.13,.12,0,height-.2,2.18);
  for(const side of [-1,1])part(0x695a49,.24,height,.24,side*width*.47,height/2,1.95);
  part(0xcabfa5,width+1,.18,2.9,0,.09,1.2);
  const name=building.n.match(/（(.+)）/)?.[1] || building.n;
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(width,12),1.65),new THREE.MeshBasicMaterial({map:signTexture(name),transparent:true}));
  panel.rotation.y=angle; panel.position.set(x+nx*.41,height-.64,z+nz*.41);scene.add(panel);
}
for(const [color,geometries] of trimBatches){
  const trim=new THREE.Mesh(mergeGeos(geometries),new THREE.MeshStandardMaterial({color,roughness:.68}));
  trim.castShadow=trim.receiveShadow=true;scene.add(trim);
}
for (const name of ['体育馆', '游泳馆']) {
  const b = data.buildings.find((x) => x.n === name);
  if (!b) continue;
  const ring = b.r[0];
  const xs = ring.map((p) => p[0]), zs = ring.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const r = Math.min((Math.max(...xs) - Math.min(...xs)) / 2, (Math.max(...zs) - Math.min(...zs)) / 2) * 0.55;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe5e3dc, roughness: 0.72, metalness: 0.06 }));
  dome.scale.y = 0.3;
  dome.position.set(cx, b.h * 0.8, cz);
  dome.castShadow = true;
  scene.add(dome);
}

/* ---------------- 广场铺装 ---------------- */
const pavingMat = new THREE.MeshStandardMaterial({ color: 0xcac4b5, roughness: 0.96 });
const plazaDefs = [
  { x: 205, z: 300, w: 96, d: 150, rot: 0.02 },
  { x: 208, z: -18, w: 104, d: 62, rot: 0.02 },
  { x: 205, z: 455, w: 60, d: 26, rot: 0.02 }
];
for (const p of plazaDefs) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), pavingMat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = p.rot;
  mesh.position.set(p.x, 0.055, p.z);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

/* ---------------- 湖岸线 ---------------- */
const bankMat = new THREE.MeshStandardMaterial({ color: 0xc9c7b6, roughness: 1 });
for (const ring of data.water) {
  const cx = ring.reduce((a, p) => a + p[0], 0) / ring.length;
  const cz = ring.reduce((a, p) => a + p[1], 0) / ring.length;
  const shape = new THREE.Shape();
  ring.forEach((p, i) => {
    const x = cx + (p[0] - cx) * 1.045;
    const z = cz + (p[1] - cz) * 1.045;
    if (i === 0) shape.moveTo(x, -z); else shape.lineTo(x, -z);
  });
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, bankMat);
  mesh.position.y = 0.045;
  scene.add(mesh);
}

/* ---------------- 道路名称 ---------------- */
const ROAD_LABELS = ['中环南路', '博雅大道', '明德西路', '明德东路', '外环西路', '俊园南路', '成简快速路'];
for (const label of ROAD_LABELS) {
  const road = data.roads.find((r) => r.n === label && r.l.length && r.l[0].length > 3);
  if (!road) continue;
  const line = [...road.l].sort((a, b) => b.length - a.length)[0];
  const mid = line[Math.floor(line.length / 2)];
  const el = document.createElement('div');
  el.className = 'label';
  el.style.opacity = '0.85';
  el.textContent = label;
  const obj = new CSS2DObject(el);
  obj.position.set(mid[0], 2, mid[1]);
  scene.add(obj);
}

/* ---------------- 标签 ---------------- */
const LANDMARKS = /图书馆|体育馆|行政楼|学生活动中心|主运动场/;
const MAJOR = /图书馆|行政楼|体育馆|游泳馆|运动场|双创|食堂|医院|国际交流|学生活动中心|南门|北门|东门|西南门/;
for (const b of data.buildings) {
  if (!b.n) continue;
  if (b.n === '南门' || b.n === '西南门' || b.n === '北门' || b.n === '东门') continue;
  if (/^\d+号楼/.test(b.n) && !MAJOR.test(b.n)) continue;
  if (b.h < 18 && !MAJOR.test(b.n)) continue;
  const el = document.createElement('div');
  el.className = 'label';
  el.classList.toggle('landmark', LANDMARKS.test(b.n));
  el.textContent = b.n;
  const center = polygonCenter(b.r[0]);
  const obj = new CSS2DObject(el);
  obj.position.set(center[0], Math.max(4, b.h || 12) + 3, center[1]);
  scene.add(obj);
}

/* ---------------- 灯光/空间 ---------------- */
sun.position.set(siteMid.x + siteSpan * 0.42, siteSpan * 0.78, siteMid.z + siteSpan * 0.34);
sun.target.position.set(siteMid.x, 0, siteMid.z);
sun.target.updateMatrixWorld();
sun.shadow.camera.left = -siteSpan * 0.9;
sun.shadow.camera.right = siteSpan * 0.9;
sun.shadow.camera.top = siteSpan * 0.9;
sun.shadow.camera.bottom = -siteSpan * 0.9;
sun.shadow.camera.updateProjectionMatrix();

const viewpoint = document.getElementById('viewpoint');
const landmarks = new Map();
for (const name of ['图书馆', '体育馆', '学生活动中心', '明德楼','立德楼','国际交流中心','游泳馆','行政楼']) {
  const building = data.buildings.find(item => item.n?.includes(name));
  if (!building) continue;
  const center = polygonCenter(building.r[0]);
  const radius = Math.max(...building.r[0].map(([x, z]) => Math.hypot(x - center[0], z - center[1])));
  landmarks.set(name, {
    target: new THREE.Vector3(center[0], buildingHeight(building) * 0.35, center[1]),
    width: Math.max(130, radius * 2.6)
  });
  viewpoint.add(new Option(name, name));
}
const walking = document.body.hasAttribute('data-walk');
const skyCanvas=document.createElement('canvas');
skyCanvas.width=512;skyCanvas.height=256;
const skyContext=skyCanvas.getContext('2d');
const skyGradient=skyContext.createLinearGradient(0,0,0,256);
for(const [stop,color] of [[0,'#1f324f'],[.33,'#596889'],[.49,'#c5978a'],[.53,'#b89c92'],[1,'#445362']]) skyGradient.addColorStop(stop,color);
skyContext.fillStyle=skyGradient;skyContext.fillRect(0,0,512,256);
const eveningSky=new THREE.CanvasTexture(skyCanvas);
eveningSky.mapping=THREE.EquirectangularReflectionMapping;eveningSky.colorSpace=THREE.SRGBColorSpace;
const eye = new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.15,4000);
controls.enabled = !walking;
const keys = new Set();
let heading=0, pitch=.05;
const paths = data.roads.flatMap(road=>road.l.flatMap(line=>line.slice(1).map((end,i)=>[line[i],end,Math.max(3,(ROAD_W[road.w]||4)/2+1)])));
function nearestPath(x,z){
  let best=Infinity, result;
  for(const [a,b,width] of paths){
    const dx=b[0]-a[0],dz=b[1]-a[1],t=THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);
    const px=a[0]+t*dx,pz=a[1]+t*dz,dist=(px-x)**2+(pz-z)**2;
    if(dist<best){best=dist;result={x:px,z:pz,width,distance:Math.sqrt(dist)};}
  }
  return result;
}
function walkFrame(dt){
  const forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),right=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
  if(forward||right){
    const step=dt*12/Math.hypot(forward,right);
    const x=eye.position.x+(right*Math.cos(heading)-forward*Math.sin(heading))*step;
    const z=eye.position.z-(right*Math.sin(heading)+forward*Math.cos(heading))*step;
    const road=nearestPath(x,z), amount=Math.min(1,road.width/(road.distance||1));
    eye.position.set(road.x+(x-road.x)*amount,2.5,road.z+(z-road.z)*amount);
  }
  eye.rotation.set(pitch,heading,0,'YXZ');
}
if(walking){
  const canvas=renderer.domElement;
  canvas.style.touchAction='none';
  let drag;
  canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);drag=[e.clientX,e.clientY];};
  canvas.onlostpointercapture=()=>{drag=null;};
  canvas.onpointermove=e=>{if(drag){heading-=(e.clientX-drag[0])*.005;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-drag[1])*.004,-1,1);drag=[e.clientX,e.clientY];}};
  for(const type of ['keydown','keyup'])addEventListener(type,e=>{
    if(e.target.matches('select,input'))return;
    const key=({ArrowUp:'KeyW',ArrowDown:'KeyS',ArrowLeft:'KeyA',ArrowRight:'KeyD'})[e.code]||e.code;
    if(['KeyW','KeyA','KeyS','KeyD'].includes(key)){e.preventDefault();if(type==='keydown')keys.add(key);else keys.delete(key);}
  });
  addEventListener('blur',()=>keys.clear());
  document.querySelector('#walkpad').hidden=!matchMedia('(pointer:coarse)').matches;
  for(const button of document.querySelectorAll('#walkpad button')){
    button.onpointerdown=e=>{button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);};
    button.onlostpointercapture=()=>keys.delete(button.dataset.key);
  }
}
const labelToggle=document.querySelector('#labels');
labelToggle.onclick=()=>labelToggle.setAttribute('aria-pressed',document.body.classList.toggle('show-labels'));
function frameView() {
  const landmark = landmarks.get(viewpoint.value);
  const target = landmark?.target || mapCenter;
  if(walking){
    const focus=(landmark||landmarks.get('图书馆')).target;
    const span=(landmark||landmarks.get('图书馆')).width;
    const road=nearestPath(focus.x+span*.23,focus.z+span*.52);
    eye.position.set(road.x,2.5,road.z);
    heading=Math.atan2(road.x-focus.x,road.z-focus.z);pitch=.10;return;
  }
  controls.target.copy(target);
  camera.position.copy(target).addScaledVector(mapDirection, siteSpan * 1.45);
  camera.zoom = landmark ? homeHeight() * Math.min(1, innerWidth / innerHeight) / landmark.width : 1;
  mapViewHeight = homeHeight();
  applyMapProjection();
  controls.update();
}
function resetView() {
  viewpoint.value = walking ? '图书馆' : '';
  frameView();
}
viewpoint.addEventListener('change', frameView);
viewpoint.disabled = false;
resetView();

/* ---------------- 交互 ---------------- */
let night = true;
function applyTime() {
  const isNight = night;
  pools.visible = isNight;
  WINDOW_UNIFORMS.uNight.value = isNight ? 1 : 0.15;
  scene.background = new THREE.Color(isNight ? 0x4d526a : 0xf5f3ed);
  if(walking && isNight)scene.background=eveningSky;
  scene.fog.color = new THREE.Color(isNight ? 0x4d526a : 0xf5f3ed);
  scene.fog.density = isNight ? 0.00034 : 0.00012;
  hemi.intensity = isNight ? 0.8 : 1.25;
  sun.intensity = isNight ? 1.6 : 1.55;
  sun.color = new THREE.Color(isNight ? 0xffc598 : 0xfff2d8);
  waterMat.color.setHex(isNight ? 0x428389 : 0x72afa9);
  ground.material.color.setHex(isNight ? 0x405952 : 0xb4bba7);
  document.getElementById('btn-time').textContent = isNight ? '☀ 日间' : '☾ 夜间';
}
applyTime();
const timeButton = document.getElementById('btn-time');
const resetButton = document.getElementById('btn-reset');
timeButton.addEventListener('click', () => { night = !night; applyTime(); });
resetButton.addEventListener('click', resetView);
timeButton.disabled = false;
resetButton.disabled = false;
controls.addEventListener('start', () => { controls.autoRotate = false; });
controls.addEventListener('change', () => {
  labelRenderer.domElement.classList.toggle('zoomed', camera.zoom >= 1.6);
});

/* ---------------- 渲染 ---------------- */
function mergeGeos(list) {
  let total = 0;
  const nonIndexed = list.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of nonIndexed) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  let i = 0;
  let hasColor = nonIndexed.every((g) => g.attributes.color);
  for (const g of nonIndexed) {
    pos.set(g.attributes.position.array, i * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, i * 3);
    if (hasColor) col.set(g.attributes.color.array, i * 3);
    i += g.attributes.position.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (hasColor) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

addEventListener('resize', () => {
  mapViewHeight = homeHeight();
  applyMapProjection();
  eye.aspect=innerWidth/innerHeight;eye.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  if(walking)walkFrame(Math.min(.08,dt));else controls.update(dt);
  const activeCamera=walking?eye:camera;
  renderer.render(scene,activeCamera);
  if(document.body.classList.contains('show-labels'))labelRenderer.render(scene,activeCamera);
}
animate();
document.getElementById('loading').classList.add('hide');
window.__CAMPUS_V2__ = { scene, camera:walking?eye:camera, renderer, controls, data, bounds, mid: siteMid, span: siteSpan };
