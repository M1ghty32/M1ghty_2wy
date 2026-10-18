/**
 * 静态场景合批：把不在交互/动画子树里的同材质小网格合并成少量 Mesh。
 *
 * draw call 是程序化场景的主要开销之一。这里只处理“叶子 Mesh + 不透明材质 +
 * 非交互 + 非动画”的子集：角色、猫、屏幕、传送门、可点击家具的原有层级与引用不变。
 */
import * as THREE from 'three';

function hasAttribute(geometry, name) {
  return Boolean(geometry && geometry.getAttribute && geometry.getAttribute(name));
}

function canBatchMesh(mesh) {
  if (!mesh.isMesh || mesh.isInstancedMesh || mesh.isSkinnedMesh) return false;
  if (!mesh.visible || mesh.children.length > 0) return false;
  if (mesh.userData.dynamic || mesh.userData.noBatch) return false;
  const material = mesh.material;
  if (Array.isArray(material) || !material) return false;
  if (material.transparent || (material.opacity !== undefined && material.opacity < 1)) return false;
  if (material.vertexColors) return false;
  const geometry = mesh.geometry;
  if (!geometry || !hasAttribute(geometry, 'position')) return false;
  if (geometry.morphAttributes && Object.keys(geometry.morphAttributes).length) return false;
  if (material.map && !hasAttribute(geometry, 'uv')) return false;
  return true;
}

function mergeGroup(root, group, index) {
  const positions = [];
  const normals = [];
  const uvs = [];
  let hasNormals = true;
  for (const entry of group.entries) {
    const source = entry.geometry.index ? entry.geometry.toNonIndexed() : entry.geometry.clone();
    source.applyMatrix4(entry.matrix);
    const position = source.getAttribute('position');
    if (!position) {
      source.dispose();
      continue;
    }
    for (let i = 0; i < position.array.length; i++) positions.push(position.array[i]);
    const normal = source.getAttribute('normal');
    if (normal) {
      for (let i = 0; i < normal.array.length; i++) normals.push(normal.array[i]);
    } else {
      hasNormals = false;
    }
    const uv = source.getAttribute('uv');
    if (uv) {
      for (let i = 0; i < uv.array.length; i++) uvs.push(uv.array[i]);
    }
    source.dispose();
  }
  if (!positions.length) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (hasNormals && normals.length === positions.length) {
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  } else {
    geometry.computeVertexNormals();
  }
  if (uvs.length === (positions.length / 3) * 2) {
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  }
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();

  const mesh = new THREE.Mesh(geometry, group.material);
  mesh.castShadow = group.castShadow;
  mesh.receiveShadow = group.receiveShadow;
  mesh.renderOrder = group.renderOrder;
  mesh.name = `static-batch-${index}`;
  mesh.userData.staticBatch = true;
  root.add(mesh);
  return mesh;
}

export function batchStaticMeshes(root) {
  if (!root) return { mergedMeshes: 0, mergedDraws: 0, batches: 0 };
  root.updateMatrixWorld(true);
  const inverseRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map();
  let candidates = 0;

  function collect(object) {
    if (object !== root) {
      if (object.userData && object.userData.dynamic) return;
      // 交互注册表会在热点对象及其所有后代上写 hotspotId。
      if (object.userData && object.userData.hotspotId) return;
    }
    if (object.isMesh && canBatchMesh(object)) {
      const material = object.material;
      const geometry = object.geometry;
      const key = [
        material.uuid,
        object.castShadow ? 1 : 0,
        object.receiveShadow ? 1 : 0,
        hasAttribute(geometry, 'uv') ? 1 : 0,
        object.renderOrder || 0
      ].join('|');
      let group = groups.get(key);
      if (!group) {
        group = {
          material,
          castShadow: object.castShadow,
          receiveShadow: object.receiveShadow,
          renderOrder: object.renderOrder || 0,
          entries: []
        };
        groups.set(key, group);
      }
      group.entries.push({
        object,
        geometry,
        matrix: new THREE.Matrix4().multiplyMatrices(inverseRoot, object.matrixWorld)
      });
      candidates += 1;
      return;
    }
    for (const child of object.children) collect(child);
  }

  collect(root);

  let mergedMeshes = 0;
  let batches = 0;
  for (const group of groups.values()) {
    if (group.entries.length < 2) continue;
    const mesh = mergeGroup(root, group, batches);
    if (!mesh) continue;
    mergedMeshes += group.entries.length;
    batches += 1;
    for (const entry of group.entries) {
      if (entry.object.parent) entry.object.parent.remove(entry.object);
    }
  }
  root.updateMatrixWorld(true);
  return { mergedMeshes, mergedDraws: candidates, batches };
}
