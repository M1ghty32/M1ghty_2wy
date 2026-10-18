/**
 * 统一交互注册表。
 * 每个热点都遵循 { id, label, object, interaction, cameraTarget } 的结构，
 * 追加 icon / zone / radius / anchorObject 等展示信息。
 */
import * as THREE from 'three';

const tempWorld = new THREE.Vector3();
const tempProject = new THREE.Vector3();
const tempAnchor = new THREE.Vector3();
const tempRing = new THREE.Vector3();

export function createInteractionRegistry({ scene, camera, onTrigger } = {}) {
  const entries = new Map();
  const zones = new Map();
  let activeZone = 'courtyard';
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const ringGroup = new THREE.Group();
  ringGroup.name = 'interaction-ring';
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x7bd6b1,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.46, 32), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.035;
  const ringInner = new THREE.Mesh(
    new THREE.RingGeometry(0.23, 0.245, 28),
    new THREE.MeshBasicMaterial({ color: 0x9be8ff, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide })
  );
  ringInner.rotation.x = -Math.PI / 2;
  ringInner.position.y = 0.04;
  ringGroup.add(ring, ringInner);
  ringGroup.visible = false;
  ringGroup.renderOrder = 3;
  if (scene) scene.add(ringGroup);

  function register(def) {
    if (!def || !def.id) throw new Error('交互热点必须包含 id');
    if (!def.object) throw new Error(`交互热点 ${def.id} 缺少 object`);
    if (!def.zone) throw new Error(`交互热点 ${def.id} 缺少 zone`);
    const entry = {
      id: def.id,
      label: def.label || def.id,
      icon: def.icon || '✦',
      object: def.object,
      anchorObject: def.anchorObject || def.object,
      interaction: def.interaction || { kind: 'toast' },
      cameraTarget: def.cameraTarget || null,
      zone: def.zone,
      radius: def.radius ?? 2.0,
      prompt: def.prompt || '按 E 互动',
      priority: def.priority || 0,
      aria: def.aria || `${def.label || def.id}，${def.prompt || '按 E 互动'}`
    };
    entry.object.traverse((child) => {
      child.userData.hotspotId = entry.id;
    });
    entries.set(entry.id, entry);
    if (!zones.has(entry.zone)) zones.set(entry.zone, []);
    zones.get(entry.zone).push(entry);
    return entry;
  }

  function unregister(id) {
    const entry = entries.get(id);
    if (!entry) return;
    entries.delete(id);
    const list = zones.get(entry.zone);
    if (list) zones.set(entry.zone, list.filter((item) => item.id !== id));
  }

  function setActiveZone(zone) {
    activeZone = zone;
    ringGroup.visible = false;
  }

  function getActiveEntries() {
    return (zones.get(activeZone) || []).slice();
  }

  function getEntry(id) {
    return entries.get(id) || null;
  }

  function getAllEntries() {
    return Array.from(entries.values());
  }

  function getZoneEntries(zone) {
    return (zones.get(zone) || []).slice();
  }

  function getWorldPosition(entry, target = tempWorld) {
    return entry.anchorObject.getWorldPosition(target);
  }

  function getCameraTarget(entry) {
    if (entry.cameraTarget) {
      if (entry.cameraTarget.isVector3) return entry.cameraTarget.clone();
      if (typeof entry.cameraTarget === 'function') return entry.cameraTarget();
    }
    const target = getWorldPosition(entry, new THREE.Vector3());
    target.y += 0.2;
    return target;
  }

  function findNearby(playerPosition) {
    const list = getActiveEntries();
    let best = null;
    let bestScore = Infinity;
    for (const entry of list) {
      if (entry.interaction && entry.interaction.disabled) continue;
      const pos = getWorldPosition(entry, tempWorld);
      const distance = Math.hypot(pos.x - playerPosition.x, pos.z - playerPosition.z);
      if (distance > entry.radius) continue;
      const score = distance - entry.priority * 0.18;
      if (score < bestScore) {
        bestScore = score;
        best = { entry, distance };
      }
    }
    return best;
  }

  function updateNearby(entry, elapsed) {
    if (!entry) {
      ringGroup.visible = false;
      return;
    }
    const pos = getWorldPosition(entry, tempRing);
    ringGroup.visible = true;
    ringGroup.position.set(pos.x, 0, pos.z);
    const isIndoor = activeZone === 'studio';
    ringMat.color.setHex(isIndoor ? 0x6bc5f8 : 0x7bd6b1);
    const pulse = 1 + Math.sin(elapsed * 4) * 0.06;
    ring.scale.setScalar(pulse);
    ringInner.scale.setScalar(pulse * 1.08);
    ringMat.opacity = 0.62 + Math.sin(elapsed * 4) * 0.16;
  }

  function pick(clientX, clientY, domElement) {
    if (!camera || !domElement) return null;
    const rect = domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const objects = getActiveEntries().map((entry) => entry.object);
    const hits = raycaster.intersectObjects(objects, true);
    for (const hit of hits) {
      let object = hit.object;
      while (object) {
        if (object.userData && object.userData.hotspotId) {
          const entry = entries.get(object.userData.hotspotId);
          if (entry) return entry;
        }
        object = object.parent;
      }
    }
    return null;
  }

  function getScreenAnchors(width, height) {
    if (!camera) return [];
    const result = [];
    for (const entry of getActiveEntries()) {
      const pos = getWorldPosition(entry, tempAnchor);
      const project = tempProject.copy(pos).project(camera);
      const visible = project.z > -1 && project.z < 1 && project.x > -1.25 && project.x < 1.25 && project.y > -1.25 && project.y < 1.25;
      if (!visible) continue;
      result.push({
        entry,
        x: (project.x * 0.5 + 0.5) * width,
        y: (-(project.y * 0.5) + 0.5) * height,
        depth: project.z
      });
    }
    result.sort((a, b) => a.depth - b.depth);
    return result;
  }

  function trigger(id) {
    const entry = entries.get(id);
    if (!entry) return null;
    onTrigger?.(entry);
    return entry;
  }

  function getGuide() {
    const guide = [];
    for (const [zone, list] of zones.entries()) {
      guide.push({
        zone,
        title: zone === 'studio' ? '室内 · 工作台与休息区' : '庭院 · 入口与花园',
        entries: list.map((entry) => ({
          id: entry.id,
          label: entry.label,
          icon: entry.icon,
          prompt: entry.prompt,
          kind: entry.interaction.kind,
          tab: entry.interaction.tab || null
        }))
      });
    }
    return guide;
  }

  return {
    register,
    unregister,
    setActiveZone,
    getActiveZone: () => activeZone,
    getActiveEntries,
    getEntry,
    getZoneEntries,
    getAllEntries,
    getGuide,
    getCameraTarget,
    findNearby,
    updateNearby,
    pick,
    getScreenAnchors,
    trigger,
    ringGroup
  };
}
