/**
 * 天空、昼夜、天气、雾、星空和粒子。
 * 世界光源由 world-builder 的室内/庭院灯光补充，这里负责全局氛围。
 */
import * as THREE from 'three';

const PRESETS = {
  night: {
    skyTop: 0x050d1c,
    skyBottom: 0x1b2f49,
    fog: 0x0b1626,
    fogDensity: 0.0095,
    sunColor: 0x84a9e8,
    sunIntensity: 0.58,
    ambient: 0.3,
    hemi: 0.34,
    stars: 0.95,
    moon: 1,
    exposure: 1.02
  },
  dusk: {
    skyTop: 0x241a38,
    skyBottom: 0xb87058,
    fog: 0x302534,
    fogDensity: 0.0085,
    sunColor: 0xffa46b,
    sunIntensity: 1.45,
    ambient: 0.42,
    hemi: 0.54,
    stars: 0.25,
    moon: 0.75,
    exposure: 1.08
  },
  day: {
    skyTop: 0x2c6e9d,
    skyBottom: 0xb8d6d6,
    fog: 0x7193a3,
    fogDensity: 0.007,
    sunColor: 0xfff2d6,
    sunIntensity: 2.35,
    ambient: 0.7,
    hemi: 0.8,
    stars: 0,
    moon: 0,
    exposure: 1.14
  }
};

const WEATHER_MOOD = {
  clear: { fog: 1, ambient: 1, sun: 1, tint: 0x000000, tintAmount: 0 },
  rain: { fog: 1.7, ambient: 0.72, sun: 0.45, tint: 0x163c5c, tintAmount: 0.22 },
  snow: { fog: 1.35, ambient: 0.92, sun: 0.75, tint: 0x6f8aa5, tintAmount: 0.12 }
};

function makeSkyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(PRESETS.night.skyTop) },
      bottomColor: { value: new THREE.Color(PRESETS.night.skyBottom) },
      offset: { value: 0.0 }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        float t = pow(max(h, 0.0), 0.48);
        gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false
  });
}

function makeRain(factory, quality) {
  const count = quality.tier === 'low' ? 150 : 380;
  const positions = new Float32Array(count * 6);
  const speeds = new Float32Array(count);
  const origin = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 26;
    const y = Math.random() * 14;
    const z = (Math.random() - 0.5) * 22;
    origin[i * 3] = x;
    origin[i * 3 + 1] = y;
    origin[i * 3 + 2] = z;
    speeds[i] = 8 + Math.random() * 7;
    positions[i * 6] = x;
    positions[i * 6 + 1] = y;
    positions[i * 6 + 2] = z;
    positions[i * 6 + 3] = x - 0.06;
    positions[i * 6 + 4] = y - 0.45;
    positions[i * 6 + 5] = z;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: 0x9cd8f6, transparent: true, opacity: 0.38, depthWrite: false });
  const mesh = new THREE.LineSegments(geometry, material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return { mesh, geometry, positions, speeds, origin, count, type: 'rain' };
}

function makeSnow(factory, quality) {
  const count = quality.tier === 'low' ? 200 : 520;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 24;
    positions[i * 3 + 1] = Math.random() * 13;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    speeds[i] = 0.7 + Math.random() * 1.4;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xeaf7ff,
    size: 0.12,
    map: factory.textures.star,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    sizeAttenuation: true
  });
  const mesh = new THREE.Points(geometry, material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return { mesh, geometry, positions, speeds, count, type: 'snow' };
}

function makePetals(factory, quality) {
  const count = quality.tier === 'low' ? 55 : 130;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 22;
    positions[i * 3 + 1] = 0.6 + Math.random() * 9;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 17;
    seeds[i] = Math.random() * Math.PI * 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xf6b2cf,
    size: 0.13,
    map: factory.textures.star,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    sizeAttenuation: true
  });
  const mesh = new THREE.Points(geometry, material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return { mesh, geometry, positions, seeds, count, type: 'petals' };
}

export function createEnvironment(scene, factory, quality) {
  const f = factory;
  scene.background = new THREE.Color(0x0b1322);
  scene.fog = new THREE.FogExp2(PRESETS.night.fog, PRESETS.night.fogDensity);

  const ambient = new THREE.AmbientLight(0x99b7dd, 0.3);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0xffd9b0, 0x17243b, 0.34);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0x84a9e8, 0.58);
  sun.position.set(9, 17, 11);
  sun.castShadow = quality.shadows;
  sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 58;
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  sun.shadow.bias = -0.0007;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x7fb6ff, 0.3);
  rim.position.set(-12, 7, -10);
  scene.add(rim);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(75, 32, 18), makeSkyMaterial());
  sky.renderOrder = -10;
  scene.add(sky);

  // 星点
  const starCount = quality.tier === 'low' ? 180 : 420;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const radius = 48 + Math.random() * 12;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.48;
    starPositions[i * 3] = Math.cos(theta) * Math.sin(phi) * radius;
    starPositions[i * 3 + 1] = Math.cos(phi) * radius + 5;
    starPositions[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * radius;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMaterial = new THREE.PointsMaterial({
    color: 0xdcecff,
    size: 0.36,
    map: f.textures.star,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    sizeAttenuation: true,
    fog: false
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.renderOrder = -5;
  scene.add(stars);

  // 月亮与太阳共用一组天体
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 20, 14),
    new THREE.MeshBasicMaterial({ color: 0xffefce, fog: false })
  );
  moon.position.set(-21, 24, -35);
  scene.add(moon);
  const moonGlow = f.glowSprite('#cfe4ff', 10, 0.22);
  moonGlow.position.copy(moon.position);
  moonGlow.material.depthWrite = false;
  scene.add(moonGlow);
  const sunDisc = f.glowSprite('#ffcf9a', 13, 0.18);
  sunDisc.position.set(24, 19, -32);
  scene.add(sunDisc);

  // 远处的云：几组扁圆球，带很低的透明度
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xdde9f5, transparent: true, opacity: 0.08, depthWrite: false, fog: false });
  for (let i = 0; i < 5; i++) {
    const cloud = new THREE.Group();
    cloud.position.set(-28 + i * 14, 15 + (i % 3) * 2, -32 - (i % 2) * 6);
    for (let p = 0; p < 5; p++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1.1 + (p % 3) * 0.6, 10, 7), cloudMat);
      puff.position.set((p - 2) * 1.7, Math.sin(p * 1.4) * 0.5, (p % 2) * 0.8);
      puff.scale.y = 0.6;
      cloud.add(puff);
    }
    clouds.add(cloud);
  }
  scene.add(clouds);

  const rain = makeRain(f, quality);
  const snow = makeSnow(f, quality);
  const petals = makePetals(f, quality);
  scene.add(rain.mesh, snow.mesh, petals.mesh);

  let time = 'night';
  let weather = 'clear';
  let zone = 'courtyard';
  let zoneArea = { x: 12, z: 10, y: 12 };
  let reducedMotion = false;

  const current = {
    skyTop: new THREE.Color(PRESETS.night.skyTop),
    skyBottom: new THREE.Color(PRESETS.night.skyBottom),
    fog: new THREE.Color(PRESETS.night.fog),
    fogDensity: PRESETS.night.fogDensity,
    sunColor: new THREE.Color(PRESETS.night.sunColor),
    sunIntensity: PRESETS.night.sunIntensity,
    ambient: PRESETS.night.ambient,
    hemi: PRESETS.night.hemi,
    stars: PRESETS.night.stars,
    moon: PRESETS.night.moon,
    exposure: PRESETS.night.exposure
  };
  const target = { ...current, skyTop: current.skyTop.clone(), skyBottom: current.skyBottom.clone(), fog: current.fog.clone(), sunColor: current.sunColor.clone() };
  let weatherMood = { ...WEATHER_MOOD.clear };
  let weatherMix = 0;

  function applyPreset(mode) {
    const preset = PRESETS[mode] || PRESETS.night;
    target.skyTop.setHex(preset.skyTop);
    target.skyBottom.setHex(preset.skyBottom);
    target.fog.setHex(preset.fog);
    target.fogDensity = preset.fogDensity;
    target.sunColor.setHex(preset.sunColor);
    target.sunIntensity = preset.sunIntensity;
    target.ambient = preset.ambient;
    target.hemi = preset.hemi;
    target.stars = preset.stars;
    target.moon = preset.moon;
    target.exposure = preset.exposure;
    weatherMood = WEATHER_MOOD[weather] || WEATHER_MOOD.clear;
  }

  function setTimeOfDay(mode) {
    if (!PRESETS[mode]) return;
    time = mode;
    applyPreset(mode);
  }

  function setWeather(mode) {
    if (!WEATHER_MOOD[mode]) return;
    weather = mode;
    weatherMood = WEATHER_MOOD[mode];
    weatherMix = 1;
    rain.mesh.visible = mode === 'rain';
    snow.mesh.visible = mode === 'snow';
    petals.mesh.visible = false;
  }

  function setActiveZone(nextZone) {
    zone = nextZone;
    zoneArea = nextZone === 'studio'
      ? { x: 6.8, z: 5.6, y: 5.4 }
      : { x: 13, z: 11, y: 12 };
    petals.mesh.visible = weather === 'clear' && nextZone === 'courtyard';
    rain.mesh.visible = weather === 'rain' && nextZone === 'courtyard';
    snow.mesh.visible = weather === 'snow' && nextZone === 'courtyard';
  }

  function resetParticle(type, mesh, i) {
    if (type === 'rain') {
      const x = (Math.random() - 0.5) * zoneArea.x * 2;
      const z = (Math.random() - 0.5) * zoneArea.z * 2;
      const y = zoneArea.y + Math.random() * 3;
      const p = mesh.geometry.attributes.position.array;
      p[i * 6] = x;
      p[i * 6 + 1] = y;
      p[i * 6 + 2] = z;
      p[i * 6 + 3] = x - 0.05;
      p[i * 6 + 4] = y - 0.42;
      p[i * 6 + 5] = z;
    } else {
      const p = mesh.geometry.attributes.position.array;
      p[i * 3] = (Math.random() - 0.5) * zoneArea.x * 2;
      p[i * 3 + 1] = zoneArea.y + Math.random() * 2;
      p[i * 3 + 2] = (Math.random() - 0.5) * zoneArea.z * 2;
    }
  }

  function updateParticles(dt, elapsed) {
    if (weather === 'rain' && !rain.mesh.visible) rain.mesh.visible = zone === 'courtyard';
    if (weather !== 'rain' || zone !== 'courtyard') rain.mesh.visible = false;
    if (weather !== 'snow' || zone !== 'courtyard') snow.mesh.visible = false;

    if (rain.mesh.visible) {
      const p = rain.geometry.attributes.position.array;
      for (let i = 0; i < rain.count; i++) {
        const fall = rain.speeds[i] * dt;
        p[i * 6 + 1] -= fall;
        p[i * 6 + 4] -= fall;
        p[i * 6] += dt * 0.6;
        p[i * 6 + 3] += dt * 0.6;
        if (p[i * 6 + 1] < -0.5) resetParticle('rain', rain, i);
      }
      rain.geometry.attributes.position.needsUpdate = true;
    }

    if (snow.mesh.visible) {
      const p = snow.geometry.attributes.position.array;
      for (let i = 0; i < snow.count; i++) {
        p[i * 3 + 1] -= snow.speeds[i] * dt;
        p[i * 3] += Math.sin(elapsed * 0.8 + i) * dt * 0.22;
        if (p[i * 3 + 1] < -0.2) resetParticle('snow', snow, i);
      }
      snow.geometry.attributes.position.needsUpdate = true;
    }

    const showPetals = weather === 'clear' && zone === 'courtyard' && !reducedMotion;
    if (showPetals) {
      petals.mesh.visible = true;
      const p = petals.geometry.attributes.position.array;
      for (let i = 0; i < petals.count; i++) {
        const fell = (0.25 + (i % 5) * 0.08) * dt;
        p[i * 3 + 1] -= fell;
        p[i * 3] += Math.sin(elapsed * 0.6 + petals.seeds[i]) * dt * 0.28;
        p[i * 3 + 2] += Math.cos(elapsed * 0.4 + petals.seeds[i]) * dt * 0.16;
        if (p[i * 3 + 1] < 0.15) {
          p[i * 3 + 1] = 8 + Math.random() * 3;
          p[i * 3] = (Math.random() - 0.5) * 20;
          p[i * 3 + 2] = (Math.random() - 0.5) * 16;
        }
      }
      petals.geometry.attributes.position.needsUpdate = true;
    } else {
      petals.mesh.visible = false;
    }

    clouds.children.forEach((cloud, i) => {
      if (!reducedMotion) cloud.position.x += dt * (0.04 + i * 0.008);
      if (cloud.position.x > 36) cloud.position.x = -38;
    });
  }

  function update(dt, elapsed) {
    const lerp = Math.min(1, dt * 1.5);
    current.skyTop.lerp(target.skyTop, lerp);
    current.skyBottom.lerp(target.skyBottom, lerp);
    current.fog.lerp(target.fog, lerp);
    current.sunColor.lerp(target.sunColor, lerp);
    current.sunIntensity += (target.sunIntensity - current.sunIntensity) * lerp;
    current.ambient += (target.ambient - current.ambient) * lerp;
    current.hemi += (target.hemi - current.hemi) * lerp;
    current.stars += (target.stars - current.stars) * lerp;
    current.moon += (target.moon - current.moon) * lerp;
    current.fogDensity += (target.fogDensity - current.fogDensity) * lerp;
    weatherMix += (1 - weatherMix) * Math.min(1, dt * 0.7);

    const tint = new THREE.Color(weatherMood.tint);
    const skyTop = current.skyTop.clone().lerp(tint, weatherMood.tintAmount * weatherMix);
    const skyBottom = current.skyBottom.clone().lerp(tint, weatherMood.tintAmount * weatherMix * 0.6);
    const fogColor = current.fog.clone().lerp(tint, weatherMood.tintAmount * weatherMix);
    sky.material.uniforms.topColor.value.copy(skyTop);
    sky.material.uniforms.bottomColor.value.copy(skyBottom);
    scene.fog.color.copy(fogColor);
    scene.fog.density = current.fogDensity * weatherMood.fog;
    scene.background.copy(fogColor);
    ambient.intensity = current.ambient * weatherMood.ambient;
    hemi.intensity = current.hemi * weatherMood.ambient;
    sun.intensity = current.sunIntensity * weatherMood.sun;
    sun.color.copy(current.sunColor);
    starMaterial.opacity = current.stars * (1 - weatherMix * 0.7);
    stars.visible = starMaterial.opacity > 0.015;
    moon.visible = current.moon > 0.03;
    moonGlow.visible = moon.visible;
    moonGlow.material.opacity = 0.2 * current.moon;
    sunDisc.visible = time !== 'night';
    sunDisc.material.opacity = time === 'day' ? 0.13 : 0.2;
    clouds.visible = time !== 'night';
    clouds.children.forEach((cloud) => {
      cloud.traverse((child) => {
        if (child.isMesh) child.material.opacity = time === 'day' ? 0.13 : 0.06;
      });
    });

    // 让星空/天穹跟随相机，避免走到边缘穿出背景
    stars.rotation.y = elapsed * 0.003;
    updateParticles(dt, elapsed);
  }

  setTimeOfDay('night');
  setWeather('clear');
  setActiveZone('courtyard');

  return {
    ambient,
    hemi,
    sun,
    rim,
    setTimeOfDay,
    setWeather,
    setActiveZone,
    update,
    setReducedMotion(value) { reducedMotion = value; },
    getState() { return { time, weather, zone, reducedMotion }; },
    get sky() { return sky; }
  };
}
