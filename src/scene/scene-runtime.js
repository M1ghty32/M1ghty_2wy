/**
 * Three.js 渲染运行时：renderer / camera / resize / visibility / loop / pause-resume。
 * 交互、角色、世界内容都通过回调进入主循环。
 */
import * as THREE from 'three';

const ZONE_CAMERA = {
  courtyard: {
    azimuth: 0.16,
    elevation: 0.66,
    distance: 18.5,
    minDistance: 9,
    maxDistance: 26,
    targetHeight: 1.2,
    lookAhead: 2.2,
    fov: 42
  },
  studio: {
    azimuth: 0.02,
    elevation: 0.7,
    distance: 13.2,
    minDistance: 7.5,
    maxDistance: 18,
    targetHeight: 1.05,
    lookAhead: 1.15,
    fov: 39,
    minAzimuth: -1.28,
    maxAzimuth: 1.28
  }
};

export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.zone = 'courtyard';
    this.preset = ZONE_CAMERA.courtyard;
    this.azimuth = this.preset.azimuth;
    this.elevation = this.preset.elevation;
    this.distance = this.preset.distance;
    this.target = new THREE.Vector3();
    this.desiredTarget = new THREE.Vector3();
    this.focusTarget = null;
    this.focusTimer = 0;
    this.freeLook = false;
    this.initialized = false;
    this._desiredPosition = new THREE.Vector3();
    this._lookAt = new THREE.Vector3();
    this.reducedMotion = false;
  }

  setZone(zone, playerPosition, heading = Math.PI, { immediate = false } = {}) {
    this.zone = zone;
    const base = ZONE_CAMERA[zone] || ZONE_CAMERA.courtyard;
    const portrait = window.innerWidth < 820 && window.innerHeight > window.innerWidth;
    this.preset = portrait
      ? {
          ...base,
          distance: base.distance * 1.32,
          maxDistance: base.maxDistance * 1.3,
          elevation: Math.min(1.15, base.elevation + 0.035),
          lookAhead: base.lookAhead * 0.65,
          fov: base.fov + 12
        }
      : { ...base };
    this.freeLook = false;
    this.focusTarget = null;
    this.focusTimer = 0;
    this.azimuth = heading + Math.PI + this.preset.azimuth;
    this.elevation = this.preset.elevation;
    this.distance = this.preset.distance;
    this.camera.fov = this.preset.fov;
    this.camera.updateProjectionMatrix();
    this.updateDesiredTarget(playerPosition);
    if (immediate || !this.initialized) {
      this.target.copy(this.desiredTarget);
      this.snapToTarget(playerPosition);
      this.initialized = true;
    }
  }

  updateDesiredTarget(playerPosition) {
    this.desiredTarget.set(playerPosition.x, playerPosition.y + this.preset.targetHeight, playerPosition.z);
    if (!this.freeLook && this.preset.lookAhead) {
      const forwardX = -Math.sin(this.azimuth);
      const forwardZ = -Math.cos(this.azimuth);
      this.desiredTarget.x += forwardX * this.preset.lookAhead;
      this.desiredTarget.z += forwardZ * this.preset.lookAhead;
    }
    if (this.focusTarget && this.focusTimer > 0) {
      this.desiredTarget.lerp(this.focusTarget, 0.75);
    }
    if (this.freeLook) {
      this.desiredTarget.copy(this.target);
    }
  }

  snapToTarget(playerPosition) {
    this.updateDesiredTarget(playerPosition);
    this.target.copy(this.desiredTarget);
    const cos = Math.cos(this.elevation);
    this.camera.position.set(
      this.target.x + Math.sin(this.azimuth) * cos * this.distance,
      this.target.y + Math.sin(this.elevation) * this.distance,
      this.target.z + Math.cos(this.azimuth) * cos * this.distance
    );
    this.camera.lookAt(this.target);
  }

  rotate(dx, dy) {
    this.azimuth -= dx * 0.006;
    if (typeof this.preset.minAzimuth === 'number') {
      this.azimuth = Math.max(this.preset.minAzimuth, Math.min(this.preset.maxAzimuth, this.azimuth));
    }
    this.elevation = Math.max(0.32, Math.min(1.32, this.elevation + dy * 0.005));
  }

  zoom(delta) {
    this.distance = Math.max(this.preset.minDistance, Math.min(this.preset.maxDistance, this.distance + delta * 0.012));
  }

  pinchZoom(delta) {
    this.distance = Math.max(this.preset.minDistance, Math.min(this.preset.maxDistance, this.distance + delta * 0.5));
  }

  focusOn(target, seconds = 2.4) {
    this.focusTarget = target.clone();
    this.focusTimer = seconds;
  }

  clearFocus() {
    this.focusTarget = null;
    this.focusTimer = 0;
  }

  setFreeLook(enabled) {
    this.freeLook = Boolean(enabled);
    if (!this.freeLook) {
      this.focusTimer = 0;
      this.focusTarget = null;
    }
  }

  reset(playerPosition, heading = Math.PI) {
    this.freeLook = false;
    this.focusTarget = null;
    this.focusTimer = 0;
    this.azimuth = heading + Math.PI + this.preset.azimuth;
    this.elevation = this.preset.elevation;
    this.distance = this.preset.distance;
    this.updateDesiredTarget(playerPosition);
    this.snapToTarget(playerPosition);
  }

  update(dt, playerPosition, reducedMotion = false) {
    this.reducedMotion = reducedMotion;
    if (this.focusTimer > 0) {
      this.focusTimer = Math.max(0, this.focusTimer - dt);
      if (this.focusTimer === 0) this.focusTarget = null;
    }
    this.updateDesiredTarget(playerPosition);
    const targetEase = reducedMotion ? 1 : 1 - Math.exp(-8 * dt);
    this.target.lerp(this.desiredTarget, targetEase);

    const cos = Math.cos(this.elevation);
    this._desiredPosition.set(
      this.target.x + Math.sin(this.azimuth) * cos * this.distance,
      this.target.y + Math.sin(this.elevation) * this.distance,
      this.target.z + Math.cos(this.azimuth) * cos * this.distance
    );
    const posEase = reducedMotion ? 1 : 1 - Math.exp(-6.5 * dt);
    this.camera.position.lerp(this._desiredPosition, posEase);
    this._lookAt.copy(this.target);
    this.camera.lookAt(this._lookAt);
  }

  getAzimuth() {
    return this.azimuth;
  }
}

export function createSceneRuntime({ container, quality, onFrame, onContextLost }) {
  const renderer = new THREE.WebGLRenderer({
    antialias: quality.antialias,
    powerPreference: quality.tier === 'high' ? 'high-performance' : 'default',
    alpha: false,
    stencil: false
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(quality.pixelRatio);
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 220);
  const cameraRig = new ThirdPersonCamera(camera);
  const clock = new THREE.Clock();
  const pauseReasons = new Set();
  let rafId = null;
  let lastTime = 0;
  let elapsed = 0;
  let lastRender = 0;
  let started = false;
  let destroyed = false;
  let frameCount = 0;

  function renderOnce() {
    renderer.render(scene, camera);
    frameCount += 1;
  }

  function frameLoop(now) {
    if (destroyed) return;
    rafId = requestAnimationFrame(frameLoop);
    if (pauseReasons.size) return;
    if (!lastTime) lastTime = now;
    if (quality.maxFPS && now - lastRender < 1000 / quality.maxFPS - 1) {
      // 不更新 lastTime：把跳过的帧时间累积到下一帧，避免低帧率模式下动作变慢。
      return;
    }
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (!Number.isFinite(dt) || dt < 0) dt = 0;
    if (dt > 0.08) dt = 0.08;
    lastRender = now;
    elapsed += dt;
    try {
      onFrame(dt, elapsed);
    } catch (error) {
      console.error('[scene] frame error', error);
    }
    renderOnce();
  }

  function start() {
    if (destroyed || rafId !== null) return;
    started = true;
    const now = performance.now();
    lastTime = now;
    lastRender = 0;
    // 立即画一帧，避免暂停期间 resize 后出现空画布
    if (pauseReasons.size) renderOnce();
    rafId = requestAnimationFrame(frameLoop);
  }

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    started = false;
  }

  function pause(reason = 'manual') {
    pauseReasons.add(reason);
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function resume(reason = 'manual') {
    pauseReasons.delete(reason);
    if (!pauseReasons.size && !document.hidden) {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      lastTime = performance.now();
      start();
    }
  }

  function resize() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(quality.pixelRatio);
    renderer.setSize(width, height);
    if (!started || pauseReasons.size) renderOnce();
  }

  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => resize())
    : null;
  if (resizeObserver) resizeObserver.observe(container);
  window.addEventListener('resize', resize);

  function onVisibilityChange() {
    if (document.hidden) {
      pause('hidden');
    } else {
      clock.getDelta();
      resume('hidden');
      lastTime = performance.now();
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  function handleContextLost(event) {
    event.preventDefault();
    pause('context-lost');
    if (typeof onContextLost === 'function') onContextLost();
  }
  renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);

  start();

  return {
    renderer,
    scene,
    camera,
    cameraRig,
    quality,
    start,
    stop,
    pause,
    resume,
    resize,
    renderOnce,
    isPaused: () => pauseReasons.size > 0,
    getPauseReasons: () => Array.from(pauseReasons),
    getStats: () => ({ frameCount, elapsed, paused: pauseReasons.size > 0, reasons: Array.from(pauseReasons) }),
    dispose() {
      destroyed = true;
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', resize);
      if (resizeObserver) resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  };
}
