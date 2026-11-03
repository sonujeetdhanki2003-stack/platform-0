// PLATFORM 0 v3.3.2 — first-person hands: a modelled hand + forearm (palm, four fingers in three segments, thumb, wrist) built once as
// merged, smooth low-poly geometry (tapered capsules), in two poses: a GRIP (fingers wrapped round a rod / the torch barrel) and OPEN
// (palm out, for the shove). Arjun's skin (0x7a4e33) and his cream sleeve with a cuff. Matcap-shaded (the torch at the lens can't blow
// them out to white). One material each, geometry shared between all hands, no per-frame allocation.
// Hand frame (right hand): origin = wrist, +Y towards the fingers, +X the thumb side, +Z out of the palm. A left hand is the same mesh
// mirrored (scale.x = -1). In the GRIP pose the rod runs along X through GRIP_C.
import * as THREE from './three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

export const GRIP_C = new THREE.Vector3(0, 0.101, 0.0262); // the rod's axis in the hand frame (parallel to X)
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _UP = new THREE.Vector3(0, 1, 0);

// a capsule from p0 to p1, radius r0 at p0 tapering to r1 at p1
function seg(p0, p1, r0, r1, rs = 7, cs = 2) {
  const L = _d.subVectors(p1, p0).length(), rm = Math.max(r0, r1); const g = new THREE.CapsuleGeometry(rm, Math.max(1e-4, L), cs, rs); g.deleteAttribute('uv');
  const P = g.attributes.position; for (let i = 0; i < P.count; i++) { let x = P.getX(i), y = P.getY(i), z = P.getZ(i); const t = Math.max(0, Math.min(1, (y + L / 2) / L)); const s = (r0 + (r1 - r0) * t) / rm;
    x *= s; z *= s; if (y > L / 2) y = L / 2 + (y - L / 2) * s; else if (y < -L / 2) y = -L / 2 + (y + L / 2) * s; P.setXYZ(i, x, y + L / 2, z); }
  _q.setFromUnitVectors(_UP, _d.normalize()); _m.compose(p0, _q, _s.set(1, 1, 1)); g.applyMatrix4(_m); return g;
}
function mergeAll(list) { // indexed position+normal geometries -> one
  let nv = 0, ni = 0; for (const g of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = new (nv > 65535 ? Uint32Array : Uint16Array)(ni); let ov = 0, oi = 0;
  for (const g of list) { const P = g.attributes.position, N = g.attributes.normal, c = P.count; pos.set(P.array, ov * 3); nor.set(N.array, ov * 3);
    if (g.index) { const I = g.index.array; for (let i = 0; i < I.length; i++) idx[oi + i] = I[i] + ov; oi += I.length; } else { for (let i = 0; i < c; i++) idx[oi + i] = i + ov; oi += c; }
    ov += c; g.dispose(); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setIndex(new THREE.BufferAttribute(idx, 1)); out.computeBoundingSphere(); return out;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// fingers: [MCP x, MCP y, segment lengths, radius]  (right hand: index on +X)
const FING = [[0.0272, 0.091, [0.04, 0.024, 0.02], 0.0104], [0.0092, 0.095, [0.044, 0.027, 0.021], 0.0107], [-0.0092, 0.092, [0.041, 0.026, 0.02], 0.0101], [-0.0268, 0.084, [0.032, 0.02, 0.018], 0.0091]];
function buildHand(pose) {
  const parts = [];
  // palm: a rounded slab, narrower at the wrist, a thenar pad under the thumb, a slight dorsal arch
  const palm = new RoundedBoxGeometry(0.08, 0.088, 0.03, 2, 0.0135); palm.deleteAttribute('uv');
  { const P = palm.attributes.position; for (let i = 0; i < P.count; i++) { let x = P.getX(i), y = P.getY(i) + 0.049, z = P.getZ(i); const ty = (y - 0.005) / 0.088;
      x *= 0.8 + 0.2 * Math.min(1, ty * 1.5); const xr = x / 0.042;
      z *= 0.82 + 0.18 * Math.cos(Math.min(1, Math.abs(xr)) * 1.3); // a rounded cross-section, thinner at the edges
      if (z < 0) z -= 0.0045 * Math.cos(Math.min(1, Math.abs(xr)) * 1.4); // back of the hand arches
      if (z > 0 && y < 0.075) z += 0.008 * Math.max(0, 1 - Math.hypot((x - 0.024) / 0.026, (y - 0.03) / 0.04)); // thenar pad
      if (z > 0 && y < 0.075) z += 0.005 * Math.max(0, 1 - Math.hypot((x + 0.026) / 0.022, (y - 0.035) / 0.04)); // hypothenar
      P.setXYZ(i, x, y, z); } palm.computeVertexNormals(); }
  parts.push(palm);
  // wrist (oval) running back into the cuff
  { const w = seg(V(0, -0.02, 0), V(0, 0.014, 0), 0.022, 0.024, 9, 2); w.scale(1.3, 1, 0.62); w.translate(0, 0, -0.001); parts.push(w); }
  // knuckle ridge on the back of the hand
  for (const f of FING) parts.push(seg(V(f[0] * 0.92, f[1] - 0.012, -0.004), V(f[0], f[1] - 0.001, -0.002), f[3] * 0.85, f[3] * 1.05, 7, 2));
  if (pose === 'grip') {
    const C = GRIP_C;
    for (const f of FING) { // wrap each finger round the rod: joints on a circle about the rod's axis
      const m = V(f[0], f[1], -0.001), R = Math.hypot(m.y - C.y, m.z - C.z) * 1.0; let ang = Math.atan2(m.z - C.z, m.y - C.y); const pts = [m.clone()];
      const Rk = [R, R * 0.98, R * 0.9];
      for (let k = 0; k < 3; k++) { const L = f[2][k], r = Rk[k]; ang += 2 * Math.asin(Math.min(0.99, L / (2 * r))); pts.push(V(f[0] - k * 0.0012 * Math.sign(f[0] || 1), C.y + Math.cos(ang) * r, C.z + Math.sin(ang) * r)); }
      // keep the segment lengths exact
      for (let k = 0; k < 3; k++) { _a.subVectors(pts[k + 1], pts[k]).setLength(f[2][k]); pts[k + 1].copy(pts[k]).add(_a); }
      const r = f[3]; parts.push(seg(pts[0], pts[1], r * 1.06, r * 0.98), seg(pts[1], pts[2], r * 1.0, r * 0.92), seg(pts[2], pts[3], r * 0.93, r * 0.8)); }
    // thumb: from the base of the palm, over the curled index and middle fingers
    const t0 = V(0.026, 0.022, 0.008), t1 = V(0.044, 0.05, 0.03), t2 = V(0.036, 0.077, 0.053), t3 = V(0.016, 0.093, 0.064);
    parts.push(seg(t0, t1, 0.016, 0.0135), seg(t1, t2, 0.013, 0.0118), seg(t2, t3, 0.0118, 0.0095));
  } else { // open: palm out, fingers long with a soft curl, a little spread; thumb out to the side
    const fl = [[0.14, 0.2, 0.12], [0.1, 0.16, 0.1], [0.13, 0.18, 0.12], [0.18, 0.24, 0.16]], sp = [0.06, 0.012, -0.035, -0.09];
    FING.forEach((f, i) => { let a = 0; const pts = [V(f[0], f[1], -0.001)]; for (let k = 0; k < 3; k++) { a += fl[i][k]; const L = f[2][k]; pts.push(pts[k].clone().add(V(-Math.sin(sp[i]) * Math.cos(a) * L * -1, Math.cos(sp[i]) * Math.cos(a) * L, Math.sin(a) * L))); }
      const r = f[3]; parts.push(seg(pts[0], pts[1], r * 1.06, r * 0.98), seg(pts[1], pts[2], r * 1.0, r * 0.92), seg(pts[2], pts[3], r * 0.93, r * 0.8)); });
    const t0 = V(0.028, 0.028, 0.008), t1 = V(0.05, 0.05, 0.02), t2 = V(0.066, 0.068, 0.028), t3 = V(0.076, 0.09, 0.03);
    parts.push(seg(t0, t1, 0.016, 0.0135), seg(t1, t2, 0.013, 0.0118), seg(t2, t3, 0.0118, 0.0095));
  }
  return mergeAll(parts);
}
// the sleeve: a cuff ring at the wrist and the forearm in the cream sweater, along +Y (0 = the wrist end), long enough to leave the screen
function buildSleeve() {
  const pts = [[0.0, 0.0], [0.031, 0.0], [0.0335, 0.004], [0.0335, 0.024], [0.031, 0.029], [0.0305, 0.04], [0.035, 0.2], [0.04, 0.45], [0.044, 0.8], [0.0, 0.8]].map(([r, y]) => new THREE.Vector2(r, y - 0.012));
  const g = new THREE.LatheGeometry(pts, 14); g.deleteAttribute('uv'); g.computeVertexNormals(); return g;
}
function matcap(stops) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = stops[stops.length - 1][1]; x.fillRect(0, 0, 128, 128);
  const g = x.createRadialGradient(50, 42, 4, 64, 64, 64); for (const [o, col] of stops) g.addColorStop(o, col); x.fillStyle = g; x.beginPath(); x.arc(64, 64, 64, 0, Math.PI * 2); x.fill();
  // a faint warm rim (light through skin / fabric at the edge)
  const r = x.createRadialGradient(64, 64, 52, 64, 64, 64); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, stops.rim || 'rgba(0,0,0,0)'); x.fillStyle = r; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
let SHARED = null;
export function handAssets() {
  if (SHARED) return SHARED;
  const skinStops = [[0, '#a2704f'], [0.35, '#7f5235'], [0.7, '#57331f'], [1, '#1e1009']]; skinStops.rim = 'rgba(120,55,30,.5)';
  const slvStops = [[0, '#a59877'], [0.45, '#73674f'], [0.8, '#3e362a'], [1, '#14110d']];
  const toolStops = [[0, '#f4f4f4'], [0.4, '#a8a8a8'], [0.8, '#3c3c3c'], [1, '#121212']];
  SHARED = { grip: buildHand('grip'), open: buildHand('open'), sleeve: buildSleeve(),
    skin: new THREE.MeshMatcapMaterial({ matcap: matcap(skinStops), color: 0xffffff }), cloth: new THREE.MeshMatcapMaterial({ matcap: matcap(slvStops), color: 0xffffff }),
    tool: new THREE.MeshMatcapMaterial({ matcap: matcap(toolStops), vertexColors: true }) };
  SHARED.torch = buildTorch(); SHARED.lensM = new THREE.MeshBasicMaterial({ color: 0xfff1d0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  return SHARED;
}
// a first-person torch: rubber barrel with grip rings, chrome head, lens; one mesh (vertex colours), along -Z (the head at -0.13)
function buildTorch() {
  const prof = [[0, 0.075], [0.013, 0.075], [0.016, 0.07], [0.016, 0.045], [0.0172, 0.04], [0.016, 0.035], [0.0172, 0.03], [0.016, 0.025], [0.016, -0.07], [0.026, -0.11], [0.0275, -0.118], [0.0275, -0.13], [0.022, -0.131], [0, -0.131]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 14); g.deleteAttribute('uv'); g.computeVertexNormals(); g.rotateX(Math.PI / 2); // lathe y -> -z... (y=-0.13 -> z=-0.13 after the turn)
  const P = g.attributes.position, col = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) { const z = P.getZ(i), r = Math.hypot(P.getX(i), P.getY(i)); let c;
    if (z < -0.1295 && r < 0.0225) c = [1.0, 0.95, 0.8]; else if (z < -0.068) c = [0.62, 0.64, 0.68]; else c = [0.13, 0.13, 0.14]; col.set(c, i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
// one first-person arm: the hand (a child you place: in the weapon holder or on the camera) and its sleeve (on the camera, aimed at an elbow)
export class FPArm {
  constructor(cam, side = 1, pose = 'grip') {
    const A = handAssets(); this.cam = cam; this.side = side;
    this.hand = new THREE.Group(); this.mesh = new THREE.Mesh(pose === 'open' ? A.open : A.grip, A.skin); this.mesh.scale.x = side; this.hand.add(this.mesh);
    this.sleeve = new THREE.Mesh(A.sleeve, A.cloth); cam.add(this.sleeve);
    for (const o of [this.mesh, this.sleeve]) { o.renderOrder = 3; o.frustumCulled = false; }
    this.elbow = new THREE.Vector3(0.3 * side, -1, 0.3); this._w = new THREE.Vector3(); // the forearm's direction from the wrist (camera space)
    this.visible = false; this.hand.visible = false; this.sleeve.visible = false; // v3.7 bug fix: this line sat inside the comment above, so a new arm's sleeve started visible
  }
  setPose(p) { const A = handAssets(); this.mesh.geometry = p === 'open' ? A.open : A.grip; }
  show(on) { this.visible = on; this.hand.visible = on; this.sleeve.visible = on; }
  // the wrist in camera space from the hand's local transforms (no world matrices: the camera is placed after this runs)
  update() { if (!this.visible) return; let o = this.hand; const w = this._w.set(0, -0.006, 0); _q.identity();
    while (o && o !== this.cam) { o.updateMatrix(); w.applyMatrix4(o.matrix); _q.premultiply(o.quaternion); o = o.parent; }
    // the sleeve leaves the wrist along the forearm (the hand's -Y), bent towards an elbow below the screen so it never meets the lens
    _a.set(0, -1, 0).applyQuaternion(_q); if (this.side < 0 && this.mesh.scale.x < 0) { /* mirrored mesh: same frame */ }
    _b.copy(this.elbow).normalize(); _a.multiplyScalar(0.55).addScaledVector(_b, 0.45).normalize(); if (_a.y > -0.35) { _a.y = -0.35; _a.normalize(); }
    this.sleeve.position.copy(w); this.sleeve.quaternion.setFromUnitVectors(_UP, _a); }
}
// orient a hand group so its frame axes land on the given directions in its parent's space: X (thumb side / grip axis) and Y (knuckles)
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
export function aimHand(group, xDir, yDir) { _x.copy(xDir).normalize(); _y.copy(yDir); _y.addScaledVector(_x, -_y.dot(_x)).normalize(); _z.crossVectors(_x, _y); _m.makeBasis(_x, _y, _z); group.quaternion.setFromRotationMatrix(_m); }
// put the hand so that the grip centre (GRIP_C, in the hand frame) sits at `at` (parent space); call after aimHand
export function gripAt(group, at, side = 1) { _a.set(GRIP_C.x * side, GRIP_C.y, GRIP_C.z).applyQuaternion(group.quaternion); group.position.copy(at).sub(_a); }
