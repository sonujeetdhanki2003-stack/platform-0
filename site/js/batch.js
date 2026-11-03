// PLATFORM 0 v3.1.1 — static batching for phones (Low). Static meshes that share a material are merged into one mesh per ~20 m slice
// of the chapter, so the platform draws in ~100 calls instead of ~280. The originals stay where they are in the scene graph (every
// anomaly, feature and test keeps using them) but move to layer 1, which the camera does not draw. Before each frame the batcher checks
// that none of its sources (or their parents) moved, hid, changed material, changed geometry or left; a batch with a changed source is
// dissolved on the spot (originals back on layer 0 in the same frame, so nothing is ever seen out of place) and that source is never
// batched again. Dissolved slices are re-merged from the sources that stayed still at the next loop.
import * as THREE from './three.module.min.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

const OK_MATS = new Set(['MeshStandardMaterial', 'MeshBasicMaterial', 'MeshLambertMaterial', 'MeshPhongMaterial']);
const DEF_OBC = THREE.Material.prototype.onBeforeCompile, DEF_OBR = THREE.Object3D.prototype.onBeforeRender;
const CELL = 20;
// meshes built with their own copy of the same material (most procedural boxes / cylinders) still merge: the key is what the material
// looks like, not which object it is. The same values are re-read every frame so a material changed on one mesh dissolves its batch.
const MAPS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'lightMap', 'bumpMap'];
function texv(t, out) { if (!t) { out.push(null); return; } out.push(t.source, t.repeat.x, t.repeat.y, t.offset.x, t.offset.y, t.rotation, t.wrapS, t.wrapT); }
function matv(m) {
  const out = [m.type, m.side, m.vertexColors, m.flatShading, m.fog, m.toneMapped, m.visible, m.opacity, m.colorWrite, m.polygonOffset, m.polygonOffsetFactor, m.userData.wet || null, m.customProgramCacheKey === THREE.Material.prototype.customProgramCacheKey ? null : m.customProgramCacheKey()];
  if (m.color) out.push(m.color.r, m.color.g, m.color.b); if (m.emissive) out.push(m.emissive.r, m.emissive.g, m.emissive.b, m.emissiveIntensity);
  if (m.roughness !== undefined) out.push(m.roughness, m.metalness, m.envMapIntensity, m.aoMapIntensity, m.normalScale ? m.normalScale.x : 0);
  if (m.envMap) out.push(m.envMap);
  for (const k of MAPS) texv(m[k], out);
  return out;
}
const same = (a, b) => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };
let _ids = new Map(), _nid = 1; const idOf = (x) => { if (x === null || typeof x !== 'object') return String(x); if (!_ids.has(x)) _ids.set(x, 'o' + (_nid++)); return _ids.get(x); };
const matKey = (v) => v.map(idOf).join(',');
function sig(geo) {
  if (geo.morphAttributes && Object.keys(geo.morphAttributes).length) return null;
  const names = Object.keys(geo.attributes).sort(); if (!names.includes('position') || !names.includes('normal')) return null;
  for (const n of names) { const a = geo.attributes[n]; if (a.isInterleavedBufferAttribute || a.isInstancedBufferAttribute || !(a.array instanceof Float32Array) || a.normalized) return null; }
  return names.map(n => n + geo.attributes[n].itemSize).join(',') + (geo.index ? '|i' : '|n');
}
export class Batcher {
  constructor(root, renderer) { this.root = root; this.renderer = renderer; this.batches = []; this.nodes = new Map(); this.dirtyKeys = new Set(); this.stats = { sources: 0, batches: 0, dissolved: 0 }; }
  eligible(o) {
    if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || o.userData.batch || o.userData.noBatch || o.userData.isCone || o.userData.handProp) return false;
    if (!o.frustumCulled || o.renderOrder !== 0 || o.onBeforeRender !== DEF_OBR || o.layers.mask !== 1) return false;
    const m = o.material; if (!m || Array.isArray(m) || !OK_MATS.has(m.type) || m.transparent || m.blending !== THREE.NormalBlending || !m.depthWrite || m.alphaTest > 0 || m.wireframe) return false;
    if (m.onBeforeCompile !== DEF_OBC && !m.userData.batchOK) return false;
    if (!sig(o.geometry)) return false;
    for (let p = o; p && p !== this.root; p = p.parent) { if (!p.visible) return false; const u = p.userData; if (u && (u.rig || u.real || u.noBatch)) return false; if (p.isSkinnedMesh || p.isBone) return false; }
    return true;
  }
  snap(n) { if (this.nodes.has(n)) return; const s = new Float32Array(10); this.fill(n, s); this.nodes.set(n, { s, vis: n.visible, parent: n.parent, users: new Set() }); }
  fill(n, s) { const p = n.position, q = n.quaternion, c = n.scale; s[0] = p.x; s[1] = p.y; s[2] = p.z; s[3] = q.x; s[4] = q.y; s[5] = q.z; s[6] = q.w; s[7] = c.x; s[8] = c.y; s[9] = c.z; }
  build(onlyKeys) {
    const root = this.root; root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), groups = new Map(), v = new THREE.Vector3();
    root.traverse(o => {
      if (!this.eligible(o)) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      v.copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld);
      const key = matKey(matv(o.material)) + '|' + sig(o.geometry) + '|' + Math.floor(v.x / CELL) + ',' + Math.floor(v.z / CELL) + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0);
      if (onlyKeys && !onlyKeys.has(key)) return;
      if (!groups.has(key)) groups.set(key, []); groups.get(key).push(o);
    });
    const rel = new THREE.Matrix4();
    for (const [key, list] of groups) {
      if (list.length < 2) continue;
      const geos = [];
      for (const o of list) { const g = o.geometry.clone(); g.clearGroups(); for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'uv1', 'uv2', 'color'].includes(n)) g.deleteAttribute(n); rel.multiplyMatrices(inv, o.matrixWorld); g.applyMatrix4(rel); if (rel.determinant() < 0 && g.index) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } } geos.push(g); }
      let merged = null; try { merged = mergeGeometries(geos, false); } catch (e) { merged = null; }
      geos.forEach(g => g.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, list[0].material); mesh.userData.batch = true; mesh.castShadow = list[0].castShadow; mesh.receiveShadow = list[0].receiveShadow;
      mesh.matrixAutoUpdate = false; root.add(mesh); mesh.updateMatrixWorld(true);
      const b = { key, mesh, srcs: list.map(o => ({ o, mat: o.material, mv: matv(o.material), geo: o.geometry, ver: o.geometry.attributes.position.version, mask: o.layers.mask })) };
      if (this.renderer) for (const o of list) for (const k of MAPS) { const t = o.material[k]; if (t && t.image) try { this.renderer.initTexture(t); } catch (e) {} } // upload now, so a later dissolve never stalls on a texture upload mid-game
      for (const o of list) { for (let p = o; p && p !== root; p = p.parent) { this.snap(p); this.nodes.get(p).users.add(b); } o.layers.set(1); }
      this.batches.push(b); this.stats.sources += list.length;
    }
    this.stats.batches = this.batches.length;
  }
  dissolve(b, culprits) {
    const i = this.batches.indexOf(b); if (i < 0) return; this.batches.splice(i, 1);
    b.mesh.removeFromParent(); b.mesh.geometry.dispose();
    for (const s of b.srcs) { s.o.layers.mask = s.mask; }
    for (const o of culprits) o.userData.noBatch = true;
    for (const [n, rec] of this.nodes) { rec.users.delete(b); if (!rec.users.size) this.nodes.delete(n); }
    this.dirtyKeys.add(b.key); this.stats.dissolved++; this.stats.sources -= b.srcs.length; this.stats.batches = this.batches.length;
  }
  check() { // before every frame
    if (!this.batches.length) return;
    const tmp = this._t || (this._t = new Float32Array(10)); let bad = null;
    for (const [n, rec] of this.nodes) {
      let changed = n.visible !== rec.vis || n.parent !== rec.parent;
      if (!changed) { this.fill(n, tmp); const s = rec.s; for (let k = 0; k < 10; k++) if (tmp[k] !== s[k]) { changed = true; break; } }
      if (changed) { (bad || (bad = new Map())); for (const b of rec.users) { if (!bad.has(b)) bad.set(b, new Set()); b.srcs.forEach(s => { for (let p = s.o; p && p !== this.root; p = p.parent) if (p === n) bad.get(b).add(s.o); }); } }
    }
    for (const b of this.batches) for (const s of b.srcs) if (s.o.material !== s.mat || !same(matv(s.o.material), s.mv) || s.o.geometry !== s.geo || s.o.geometry.attributes.position.version !== s.ver || !s.o.parent) { (bad || (bad = new Map())); if (!bad.has(b)) bad.set(b, new Set()); bad.get(b).add(s.o); }
    if (bad) for (const [b, culprits] of bad) this.dissolve(b, culprits);
  }
  rebuild() { if (!this.dirtyKeys.size) return; const keys = this.dirtyKeys; this.dirtyKeys = new Set(); this.build(keys); }
  clear() { for (const b of this.batches.slice()) this.dissolve(b, []); this.dirtyKeys.clear(); }
}
