/**
 * 第三人称角色控制器：键盘、触屏方向盘、相机相对移动、碰撞边界与步行动画。
 */
import * as THREE from 'three';
import { createExplorer } from './assets/character.js';

const KEY_DIRECTION = {
  w: 'up',
  a: 'left',
  s: 'down',
  d: 'right',
  ArrowUp: 'up',
  ArrowLeft: 'left',
  ArrowDown: 'down',
  ArrowRight: 'right'
};

const MOVE_SPEED = 3.25;
const RUN_SPEED = 4.8;
const PLAYER_RADIUS = 0.28;

function shortestAngle(from, to) {
  let diff = (to - from + Math.PI) % (Math.PI * 2) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export function createPlayerController({ scene, factory, reducedMotion = false, onInteract, onFootstep, onProximityDirty }) {
  const character = createExplorer(factory);
  const root = character.root;
  root.position.set(0, 0, 6.8);
  scene.add(root);

  const state = {
    up: false,
    left: false,
    down: false,
    right: false,
    run: false
  };
  const velocity = new THREE.Vector2();
  let heading = Math.PI;
  let zone = null;
  let enabled = true;
  let currentSpeed = 0;
  let footstepClock = 0;
  let reduced = reducedMotion;
  let touchPointers = new Map();
  const buttonBindings = [];

  function setEnabled(value) {
    enabled = Boolean(value);
    if (!enabled) {
      state.up = state.left = state.down = state.right = false;
      onProximityDirty?.();
    }
  }

  function isTypingTarget(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  function setDirection(direction, pressed) {
    if (!(direction in state)) return;
    state[direction] = pressed;
  }

  function handleKeyDown(event) {
    if (!enabled || isTypingTarget(event.target)) return;
    const direction = KEY_DIRECTION[event.key];
    if (direction) {
      setDirection(direction, true);
      event.preventDefault();
      return;
    }
    if (event.key === 'Shift') {
      state.run = true;
    }
    if ((event.key === 'e' || event.key === 'E') && !event.repeat) {
      event.preventDefault();
      onInteract?.();
    }
  }

  function handleKeyUp(event) {
    const direction = KEY_DIRECTION[event.key];
    if (direction) {
      setDirection(direction, false);
    }
    if (event.key === 'Shift') state.run = false;
  }

  window.addEventListener('keydown', handleKeyDown, { passive: false });
  window.addEventListener('keyup', handleKeyUp);

  function clearTouchDirection(direction) {
    if (!direction) return;
    const active = Array.from(touchPointers.values()).some((item) => item.direction === direction);
    if (!active) setDirection(direction, false);
  }

  document.querySelectorAll('[data-move]').forEach((button) => {
    const direction = button.getAttribute('data-move');
    function press(event) {
      if (!enabled) return;
      event.preventDefault();
      touchPointers.set(event.pointerId, { direction, button });
      button.classList.add('is-pressed');
      button.setPointerCapture?.(event.pointerId);
      setDirection(direction, true);
    }
    function release(event) {
      const item = touchPointers.get(event.pointerId);
      touchPointers.delete(event.pointerId);
      button.classList.remove('is-pressed');
      if (item) clearTouchDirection(item.direction);
    }
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    buttonBindings.push({ button, direction });
  });

  const mobileInteract = document.getElementById('btn-mobile-interact');
  function handleMobileInteract(event) {
    event.preventDefault();
    if (enabled) onInteract?.();
  }
  mobileInteract?.addEventListener('pointerdown', handleMobileInteract);

  function setZone(zoneConfig, spawn) {
    zone = zoneConfig;
    const point = spawn || zone.spawn;
    root.position.set(point.x, point.y ?? 0, point.z);
    heading = point.heading ?? Math.PI;
    root.rotation.y = heading;
    velocity.set(0, 0);
    currentSpeed = 0;
  }

  function collidesAt(x, z) {
    if (!zone) return true;
    const bounds = zone.bounds;
    if (x - PLAYER_RADIUS < bounds.minX || x + PLAYER_RADIUS > bounds.maxX) return true;
    if (z - PLAYER_RADIUS < bounds.minZ || z + PLAYER_RADIUS > bounds.maxZ) return true;
    for (const collider of zone.colliders) {
      if (collider.type === 'circle') {
        const dx = x - collider.x;
        const dz = z - collider.z;
        if (dx * dx + dz * dz < (collider.radius + PLAYER_RADIUS) ** 2) return true;
      } else {
        const minX = collider.minX - PLAYER_RADIUS;
        const maxX = collider.maxX + PLAYER_RADIUS;
        const minZ = collider.minZ - PLAYER_RADIUS;
        const maxZ = collider.maxZ + PLAYER_RADIUS;
        if (x > minX && x < maxX && z > minZ && z < maxZ) return true;
      }
    }
    return false;
  }

  function moveWithCollision(dx, dz) {
    let movedX = 0;
    let movedZ = 0;
    const nextX = root.position.x + dx;
    if (!collidesAt(nextX, root.position.z)) {
      root.position.x = nextX;
      movedX = dx;
    } else {
      velocity.x = 0;
    }
    const nextZ = root.position.z + dz;
    if (!collidesAt(root.position.x, nextZ)) {
      root.position.z = nextZ;
      movedZ = dz;
    } else {
      velocity.y = 0;
    }
    return { movedX, movedZ };
  }

  function update(dt, elapsed, cameraAzimuth) {
    let ix = (state.right ? 1 : 0) - (state.left ? 1 : 0);
    let iy = (state.up ? 1 : 0) - (state.down ? 1 : 0);
    if (!enabled) {
      ix = 0;
      iy = 0;
    }
    const magnitude = Math.min(1, Math.hypot(ix, iy));
    if (magnitude > 0) {
      ix /= magnitude;
      iy /= magnitude;
    }

    const speed = state.run ? RUN_SPEED : MOVE_SPEED;
    const forwardX = -Math.sin(cameraAzimuth);
    const forwardZ = -Math.cos(cameraAzimuth);
    const rightX = Math.cos(cameraAzimuth);
    const rightZ = -Math.sin(cameraAzimuth);
    const worldX = (forwardX * iy + rightX * ix) * speed;
    const worldZ = (forwardZ * iy + rightZ * ix) * speed;
    const ease = 1 - Math.exp(-(magnitude > 0 ? 13 : 16) * dt);
    velocity.x += (worldX - velocity.x) * ease;
    velocity.y += (worldZ - velocity.y) * ease;
    if (Math.abs(velocity.x) < 0.006) velocity.x = 0;
    if (Math.abs(velocity.y) < 0.006) velocity.y = 0;

    const move = moveWithCollision(velocity.x * dt, velocity.y * dt);
    currentSpeed = Math.hypot(move.movedX, move.movedZ) / Math.max(0.0001, dt);
    if (magnitude > 0 && currentSpeed > 0.05) {
      const targetHeading = Math.atan2(velocity.x, velocity.y);
      heading += shortestAngle(heading, targetHeading) * Math.min(1, dt * 14);
      root.rotation.y = heading;
    }

    character.update(dt, elapsed, currentSpeed, reduced);
    root.position.y = 0;

    if (currentSpeed > 0.3) {
      footstepClock += dt * (state.run ? 1.7 : 1);
      if (footstepClock > 0.34) {
        footstepClock = 0;
        onFootstep?.();
      }
    } else {
      footstepClock = 0;
    }
  }

  function placeAt(x, z, newHeading) {
    root.position.set(x, 0, z);
    if (typeof newHeading === 'number') {
      heading = newHeading;
      root.rotation.y = heading;
    }
    velocity.set(0, 0);
  }

  function getPosition() {
    return root.position;
  }

  function getHeading() {
    return heading;
  }

  function getSpeed() {
    return currentSpeed;
  }

  function setReducedMotion(value) {
    reduced = value;
  }

  function dispose() {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    mobileInteract?.removeEventListener('pointerdown', handleMobileInteract);
    scene.remove(root);
  }

  return {
    character,
    root,
    state,
    setZone,
    setEnabled,
    update,
    placeAt,
    getPosition,
    getHeading,
    getSpeed,
    setReducedMotion,
    collisionAt: collidesAt,
    dispose
  };
}
