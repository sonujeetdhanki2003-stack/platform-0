// PLATFORM 0 v3.6 — every platform REBUILT, not just re-lit (Chapter 1).
// His words (Nov 1, 3:38 PM): "I want you change all the platforms each looking different from the other not just the lights".
// Per platform PF 0..8: its own roof (structure + underside, some with holes to the night sky), pillar style, floor, back wall and
// dado, platform-edge strip, bench style, wall fittings and ONE large set piece. All nine are built once as merged vertex-coloured
// meshes (one draw call each) plus 4 small canvas textures; only the current platform's set is visible (switched in PFVariety.set).
// Rules kept: the walking lane (x > -2.45, y < 2.4) stays clear; pillars keep the old footprint (same solids), the pillar signs sit on a
// sign plate and the CCTV on a collar at the same place on every style; every roof keeps a cross beam with its bottom flange at
// y 3.95..3.97 every 4 m (the pigeon herring walks the one at z -12) and a ceiling at 4.2 or drop rods to every hanging fitting;
// set pieces stay out of the train's envelope (x 3.9..6.7, y < 3.6) and off the pit by the platform (vendor / hands anomalies);
// nothing changes or covers an object an anomaly changes (test/pfvariety.cjs + test/pfstruct36.cjs).
import * as THREE from './three.module.min.js';
import * as M from './mats.js';
import { Kit, rngOf } from './pfvariety.js';
import { wallTex, dadoTex, floorTex, roofTex, farTex } from './pftex.js';
import { viewFar, viewNear, FAR_TINT, FAR_GAIN, thinFog, bake, skyMesh, paintSky } from './pfview.js'; // v3.6.1: tell them apart from spawn

const ZP = [-6, -14, -22, -30], PX = 0.6;
const ZB = []; for (let z = 0; z >= -42; z -= 4) ZB.push(z);
// every fitting that hangs from the roof at y 4.2 (lamps, fans, the dead bulb, the clock, the board, the station sign)
const HANG = [[-1.9, -9], [-1.9, -19], [-1.9, -31], [-2.72, -27.7], [0.6, -10.5], [-0.2, -25], [1.4, -25], [-1.9, 0.3], [-0.1, 0.3]];
for (let z = -1; z > -38; z -= 5) HANG.push([-0.9, z]);
const RX0 = -3.5, RX1 = 3.5, RZ0 = 8.5, RZ1 = -44.5, RLEN = RZ0 - RZ1, RZC = (RZ0 + RZ1) / 2;
// a cheap leaf clump (20 tris; 80 with detail 1) for the vines, moss and scrub of the dead garden
const leaf = (K, r, c, x, y, z, sx = 1, sy = 1, sz = 1, det = 0) => K.put(new THREE.IcosahedronGeometry(r, det), c, x, y, z, 0, 0, 0, sx, sy, sz);
const NOVINE = [[-0.6, 1.8, -25.5, -24.5], [0.1, 1.1, -11.0, -10.0], [-2.4, 0.4, -0.2, 0.8], [-3.0, -0.6, -10.2, -7.8], [-3.0, -0.6, -20.2, -17.8], [-3.0, -0.6, -32.2, -29.8], [-3.2, -2.2, -28.4, -27.0]]; // the board, the clock, the sign, the fans, the dead bulb
const _v = new THREE.Vector3(), _u = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _Y = new THREE.Vector3(0, 1, 0);

// a straight member between two points (box of section t x t, or a round bar)
function line(K, x0, y0, z0, x1, y1, z1, t, c, round = false) {
  _v.set(x1 - x0, y1 - y0, z1 - z0); const L = _v.length(); if (L < 1e-4) return;
  _q.setFromUnitVectors(_Y, _u.copy(_v).normalize()); _e.setFromQuaternion(_q);
  const g = round ? new THREE.CylinderGeometry(t / 2, t / 2, L, 6) : new THREE.BoxGeometry(t, L, t);
  K.put(g, c, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, _e.x, _e.y, _e.z);
}
// an arc as a polyline in the plane x = const (axis 'x') or z = const (axis 'z'); angles from +horizontal, CCW up
function arc(K, axis, k, ca, cy, r, a0, a1, n, t, c) {
  let px, py; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, h = ca + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i) { if (axis === 'x') line(K, k, py, px, k, y, h, t, c); else line(K, px, py, k, h, y, k, t, c); } px = h; py = y; }
}
function fluted(rb, rt, h, seg = 24, flutes = 12, depth = 0.08) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1); const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), r = Math.hypot(x, z); if (r < 1e-4) continue; const a = Math.atan2(z, x), k = 1 - depth * (0.5 + 0.5 * Math.cos(a * flutes)); P.setX(i, x * k); P.setZ(i, z * k); }
  g.computeVertexNormals(); return g;
}

// ---------- pillars (x 0.6, z -6/-14/-22/-30): 9 styles, each with the sign plate (y 2.2) and the camera collar (y 3.3) ----------
function pillars(K, n) {
  const plate = (z, c) => { K.box(0.66, 0.2, 0.33, c, PX, 2.2, z); };
  const collar = (z, c, w = 0.36) => { K.box(w, 0.32, w, c, PX, 3.3, z); };
  for (const z of ZP) {
    switch (n) {
      case 0: { const c = 0x6c706a, st = 0x2c3a30; K.cyl(0.2, 0.2, 4.2, c, PX, 2.1, z, 8); K.cyl(0.205, 0.215, 1.3, st, PX, 0.65, z, 8); K.cyl(0.24, 0.24, 0.12, 0x3a3e38, PX, 0.06, z, 8); plate(z, 0x26302a); collar(z, 0x4e544e, 0.37); break; }
      case 1: { const c = 0x2a2420, g2 = 0x3a2c22; K.box(0.36, 0.6, 0.36, g2, PX, 0.3, z); K.cyl(0.12, 0.12, 3.1, c, PX, 2.15, z, 12); for (const y of [0.62, 1.4, 3.62]) K.put(new THREE.TorusGeometry(0.125, 0.025, 4, 12), c, PX, y, z, Math.PI / 2);
        K.cyl(0.24, 0.13, 0.32, c, PX, 3.78, z, 12); K.box(0.46, 0.08, 0.46, g2, PX, 3.97, z); plate(z, 0x20160e); collar(z, c, 0.36); break; }
      case 2: { const c = 0x6e6c66; K.box(0.36, 4.2, 0.36, c, PX, 2.1, z); K.box(0.38, 0.55, 0.38, 0x4a4844, PX, 0.27, z); K.box(0.5, 0.3, 0.5, 0x5a5854, PX, 4.05, z);
        for (const [dx, dz] of [[-0.12, 0.19], [0.0, 0.19], [0.12, 0.19]]) line(K, PX + dx, 1.05, z + dz, PX + dx * 1.3, 1.45, z + dz + 0.05, 0.016, 0x4a2a18, true); // spalled corner, rebar showing
        K.box(0.2, 0.36, 0.04, 0x2e2c28, PX, 1.25, z + 0.17); plate(z, 0x3a3a36); collar(z, 0x5e5c58, 0.37); break; }
      case 3: { const c = 0x5a3a22; for (const dx of [-0.15, 0.15]) K.box(0.05, 4.2, 0.32, c, PX + dx, 2.1, z);
        for (const fz of [-0.15, 0.15]) for (let y = 0.1; y < 4.0; y += 0.32) line(K, PX - 0.14, y, z + fz, PX + 0.14, y + 0.32, z + fz, 0.035, 0x4a3018);
        K.box(0.44, 0.04, 0.44, 0x3a2a1a, PX, 0.02, z); plate(z, 0x2a2018); collar(z, c, 0.37); break; }
      case 4: { const c = 0x5e3420; for (const dx of [-0.16, 0.16]) K.box(0.03, 4.2, 0.34, c, PX + dx, 2.1, z); K.box(0.3, 4.2, 0.03, c, PX, 2.1, z); K.box(0.5, 0.04, 0.5, 0x3e2414, PX, 0.02, z);
        for (const dx of [-0.175, 0.175]) for (let y = 0.3; y < 4.0; y += 0.25) K.box(0.012, 0.02, 0.02, 0x2a160c, PX + dx, y, z + 0.13), K.box(0.012, 0.02, 0.02, 0x2a160c, PX + dx, y, z - 0.13);
        plate(z, 0x2e1a10); collar(z, c, 0.37); break; }
      case 5: { K.box(0.4, 4.2, 0.4, 0x8a8270, PX, 2.1, z); K.box(0.41, 1.1, 0.41, 0x4c1e24, PX, 0.55, z); K.box(0.415, 0.06, 0.415, 0xa89c7c, PX, 1.13, z); K.box(0.415, 0.06, 0.415, 0x4c1e24, PX, 3.85, z);
        plate(z, 0x2a1418); collar(z, 0x7a7262, 0.41); break; }
      case 6: { for (let y = 0, i = 0; y < 4.2; y += 0.09, i++) K.box(i % 2 ? 0.42 : 0.405, 0.085, i % 2 ? 0.405 : 0.42, i % 3 ? 0x6a3a2a : 0x5e3424, PX, y + 0.045, z);
        for (let i = 0; i < 6; i++) leaf(K, 0.06 + (i % 3) * 0.015, 0x2e4020, PX + (i % 2 ? 0.17 : -0.17), 0.1 + i * 0.12, z + (i % 3 - 1) * 0.12, 0.5, 0.6, 1);
        plate(z, 0x2a1810); collar(z, 0x5a3424, 0.43); break; }
      case 7: { const c = 0x3e4246; for (const dz of [-0.1, 0.1]) K.cyl(0.085, 0.085, 4.2, c, PX, 2.1, z + dz, 10); for (let y = 0.5; y < 4.1; y += 1.0) K.box(0.2, 0.03, 0.36, 0x2c2e30, PX, y, z);
        K.box(0.46, 0.03, 0.46, 0x26282a, PX, 0.015, z); plate(z, 0x1e2022); collar(z, c, 0.36); break; }
      case 8: { const c = 0x2c3034; K.box(0.48, 0.18, 0.48, 0x24282a, PX, 0.09, z); K.box(0.38, 0.3, 0.38, c, PX, 0.33, z); K.put(fluted(0.15, 0.13, 3.1, 24, 12, 0.1), c, PX, 2.03, z);
        K.cyl(0.24, 0.14, 0.34, c, PX, 3.75, z, 16); for (const [dx, dz] of [[0.17, 0.17], [-0.17, 0.17], [0.17, -0.17], [-0.17, -0.17]]) K.put(new THREE.TorusGeometry(0.05, 0.016, 4, 10), c, PX + dx, 3.86, z + dz, 0, Math.PI / 4);
        K.box(0.5, 0.08, 0.5, 0x24282a, PX, 3.96, z);
        for (const s of [1, -1]) { arc(K, 'x', PX, z + s * 0.62, 3.4, 0.6, s > 0 ? Math.PI : 0, s > 0 ? Math.PI * 1.5 : -Math.PI * 0.5, 6, 0.035, c); arc(K, 'x', PX, z + s * 0.4, 3.62, 0.35, s > 0 ? Math.PI : 0, s > 0 ? Math.PI * 1.5 : -Math.PI * 0.5, 4, 0.025, c);
          K.put(new THREE.TorusGeometry(0.09, 0.015, 4, 12), c, PX, 3.78, z + s * 0.3, 0, Math.PI / 2); }
        plate(z, 0x181a1c); collar(z, c, 0.36); break; }
    }
  }
}
// drop rods from a raised roof down to every fitting's hanging point (y 4.2)
function drops(K, topAt, c) { for (const [x, z] of HANG) { const t = topAt(x); if (t > 4.25) K.box(0.03, t - 4.18, 0.03, c, x, (t + 4.18) / 2, z); } }

// ---------- roofs ----------
function roof(K, n) {
  const flange = (z, c, w = 0.16) => K.box(RX1 - RX0, 0.03, w, c, (RX0 + RX1) / 2, 3.95, z); // the pigeon's ledge: top at y 3.965
  switch (n) {
    case 0: for (const z of ZB) { K.box(7.0, 0.22, 0.035, 0x4a2c1a, 0, 4.08, z); flange(z, 0x4a2c1a); } // rusted I-beams; the sheet has holes
      for (const [x, z, r] of [[-1.5, -5, 0.4], [1.2, -17.5, 0.3], [-2.2, -24, 0.35], [0.5, -33, 0.45]]) K.box(0.9, 0.012, 0.6, 0x3e2a1c, x, 4.05, z, 0.5, r, 0.3); // torn sheet flaps hanging from the holes
      break;
    case 1: for (const z of ZB) K.box(7.0, 0.26, 0.2, 0x3e2a1a, 0, 4.08, z); for (const x of [-2.6, -1.0, 0.6, 2.2]) K.box(0.14, 0.1, RLEN, 0x352418, x, 4.15, RZC);
      for (const z of ZB) for (const s of [-1, 1]) line(K, PX + s * 0.2, 3.95, z, PX + s * 1.2, 4.12, z, 0.1, 0x3e2a1a); break;
    case 2: for (const z of ZB) K.box(7.0, 0.45, 0.32, 0x5a5854, 0, 3.975, z); for (const x of [-1.4, 1.4]) K.box(0.25, 0.3, RLEN, 0x52504c, x, 4.05, RZC); break;
    case 3: for (const z of ZB) { K.box(7.0, 0.04, 0.08, 0x4a4a46, 0, 3.95, z); K.box(7.0, 0.04, 0.06, 0x4a4a46, 0, 4.17, z); for (let x = RX0 + 0.1; x < RX1 - 0.3; x += 0.6) line(K, x, 3.97, z, x + 0.3, 4.16, z, 0.025, 0x44443e); }
      for (const [x, z, a] of [[-0.8, -7.5, 0.9], [1.6, -15, -0.7], [-2.0, -26, 0.6], [0.9, -35.5, -1.0]]) K.box(1.1, 0.014, 0.8, 0x7a7a70, x, 3.85, z, a, 0.2, 0.15); // broken sheets hanging into the gaps
      break;
    case 4: { // triangular steel trusses carrying a pitched tin roof (the flat ceiling is gone)
      const ax = -0.3, ay = 5.3, at = (x) => x < ax ? 4.06 + (ay - 4.06) * (x - (RX0 - 0.6)) / (ax - (RX0 - 0.6)) : 4.06 + (ay - 4.06) * ((RX1 + 0.1) - x) / ((RX1 + 0.1) - ax);
      for (const z of ZB) { const c = 0x4a3020; K.box(7.4, 0.12, 0.12, c, -0.3, 4.0, z); line(K, RX0 - 0.6, 4.06, z, ax, ay, z, 0.12, c); line(K, ax, ay, z, RX1 + 0.1, 4.06, z, 0.12, c);
        for (const f of [0.25, 0.5, 0.75]) { const xl = (RX0 - 0.6) + (ax - (RX0 - 0.6)) * f, xr = ax + ((RX1 + 0.1) - ax) * (1 - f); line(K, xl, 4.06, z, xl, at(xl), z, 0.06, c); line(K, xr, 4.06, z, xr, at(xr), z, 0.06, c); line(K, xl, 4.06, z, ax + (xl - ax) * 0.6, at(ax + (xl - ax) * 0.6), z, 0.05, c); line(K, xr, 4.06, z, ax + (xr - ax) * 0.6, at(ax + (xr - ax) * 0.6), z, 0.05, c); }
        K.box(7.4, 0.03, 0.16, c, -0.3, 3.94, z); }
      const sl = Math.atan2(ay - 4.06, ax - (RX0 - 0.6)), sr = Math.atan2(ay - 4.06, (RX1 + 0.1) - ax), Ll = Math.hypot(ay - 4.06, ax - (RX0 - 0.6)), Lr = Math.hypot(ay - 4.06, (RX1 + 0.1) - ax);
      K.box(Ll + 0.2, 0.03, RLEN, 0x55524c, ((RX0 - 0.6) + ax) / 2, (4.06 + ay) / 2 + 0.09, RZC, 0, 0, sl); K.box(Lr + 0.2, 0.03, RLEN, 0x55524c, ((RX1 + 0.1) + ax) / 2, (4.06 + ay) / 2 + 0.09, RZC, 0, 0, -sr);
      for (let f = 0.1; f < 1; f += 0.18) { K.box(0.07, 0.07, RLEN, 0x3a2a1e, (RX0 - 0.6) + (ax - (RX0 - 0.6)) * f, 4.06 + (ay - 4.06) * f + 0.04, RZC); K.box(0.07, 0.07, RLEN, 0x3a2a1e, (RX1 + 0.1) - ((RX1 + 0.1) - ax) * f, 4.06 + (ay - 4.06) * f + 0.04, RZC); }
      drops(K, (x) => at(x) + 0.0, 0x2a2a2a); break; }
    case 5: { // a barrel vault of curved sheets on arched ribs with tie rods
      const span = RX1 - (RX0 - 0.6), rise = 1.25, r = (span * span / 4 + rise * rise) / (2 * rise), cx = ((RX0 - 0.6) + RX1) / 2, cy = 4.15 + rise - r, th = Math.asin(span / 2 / r);
      const vault = new THREE.CylinderGeometry(r, r, RLEN, 20, 1, true, -th, 2 * th); // around Y: rotate so the axis runs along z
      K.put(vault, 0x4e463e, cx, cy, RZC, -Math.PI / 2, 0, 0, -1, 1, 1);
      for (const z of ZB) { arc(K, 'z', z, cx, cy, r - 0.06, Math.PI / 2 - th, Math.PI / 2 + th, 10, 0.1, 0x3a2e26); K.box(span, 0.04, 0.05, 0x2e2620, cx, 3.95, z); K.box(span, 0.03, 0.12, 0x2e2620, cx, 3.93, z); }
      const at = (x) => cy + Math.sqrt(Math.max(0, r * r - (x - cx) * (x - cx))); drops(K, at, 0x2a2420); break; }
    case 6: for (const [i, z] of ZB.entries()) { const sag = z === -12 ? 0 : (i % 3 === 1 ? 0.07 : i % 3 === 2 ? -0.05 : 0); K.box(7.0, 0.24, 0.18, 0x3a2e20, 0, 4.07, z, 0, 0, sag); if (z === -12) K.box(7.0, 0.03, 0.18, 0x3a2e20, 0, 3.95, z); }
      line(K, 1.2, 4.05, -18.3, 3.0, 2.75, -18.0, 0.2, 0x3a2e20); line(K, -0.8, 4.1, -35.2, 1.4, 3.0, -34.6, 0.18, 0x3a2e20); // two beams broken loose, one end hanging
      { const R = rngOf(66); for (let i = 0; i < 46; i++) { const x = RX0 + 0.2 + R() * 6.6, z = 6 - R() * 46; if (Math.abs(x - PX) < 0.4 && ZP.some(p => Math.abs(p - z) < 0.4)) continue; if (NOVINE.some(([a0, a1, b0, b1]) => x > a0 && x < a1 && z > b0 && z < b1)) continue; const L = 0.4 + R() * 0.9; K.cyl(0.008, 0.008, L, 0x2a3a1c, x, 4.2 - L / 2, z, 4); for (let k = 0; k < 3; k++) leaf(K, 0.035 + R() * 0.03, R() < 0.5 ? 0x2a3e1e : 0x4a4228, x + (R() - 0.5) * 0.06, 4.2 - L * (k + 1) / 3.5, z + (R() - 0.5) * 0.06, 1, 0.6, 1); } }
      break;
    case 7: for (const z of ZB) { K.box(7.0, 0.2, 0.25, 0x302e2c, 0, 4.1, z); }
      K.box(0.42, 0.08, RLEN, 0x26282a, -2.75, 4.0, RZC); for (const dx of [-0.15, 0, 0.15]) K.cyl(0.025, 0.025, RLEN, 0x1a1a1a, -2.75 + dx, 4.06, RZC, 5, Math.PI / 2);
      K.cyl(0.04, 0.04, RLEN, 0x3a3c3e, 1.9, 4.12, RZC, 6, Math.PI / 2); K.cyl(0.03, 0.03, RLEN, 0x3a3c3e, 2.05, 4.12, RZC, 6, Math.PI / 2);
      for (let z = 5; z > -44; z -= 3.1) { const x0 = -2.0, x1 = 1.85, lo = 3.55 + ((z * 7) % 3 + 3) % 3 * 0.08; let px = x0, py = 4.0; for (let i = 1; i <= 8; i++) { const t = i / 8, x = x0 + (x1 - x0) * t, y = 4.0 - (4.0 - lo) * 4 * t * (1 - t); line(K, px, py, z, x, y, z, 0.022, 0x111111, true); px = x; py = y; } }
      break;
    case 8: for (const z of ZB) { K.box(7.0, 0.03, 0.16, 0x24282c, 0, 3.95, z); K.box(7.0, 0.16, 0.05, 0x24282c, 0, 4.06, z); arc(K, 'z', z, 0, 2.0, 3.6, Math.PI * 0.2, Math.PI * 0.8, 10, 0.05, 0x24282c);
        for (const x of [-2.5, -1.5, 1.5, 2.5]) K.put(new THREE.TorusGeometry(0.16, 0.014, 4, 14), 0x24282c, x, 3.95 + 0.0 + (Math.sqrt(Math.max(0, 3.6 * 3.6 - x * x)) + 2.0 - 3.95) / 2 + 0.02, z); }
      K.box(0.2, 0.18, RLEN, 0x24282c, PX, 4.06, RZC); break;
  }
}
// ---------- wall fittings (flush on the back wall, clear of posters, the name board and the clusters) ----------
function wallFx(K, n) {
  const W = -3.47, freeHigh = (z) => !(z < -9.9 && z > -13.1);
  switch (n) {
    case 0: for (const z of [-3.6, -27.6]) { K.cyl(0.05, 0.05, 4.1, 0x2c2e2a, W + 0.05, 2.05, z, 8); K.cyl(0.07, 0.07, 0.1, 0x2c2e2a, W + 0.05, 0.05, z, 8); } K.box(0.14, 0.1, 40, 0x2c2e2a, W + 0.05, 4.12, -18); break;
    case 2: for (const z of [-2.2, -6.2, -15.2, -19.6, -23.0, -28.4, -36.0]) { K.box(0.03, 0.95, 1.2, 0x0a0c10, W, 3.45, z); K.box(0.06, 0.08, 1.36, 0x2a3240, W + 0.02, 3.97, z); K.box(0.06, 0.08, 1.36, 0x2a3240, W + 0.02, 2.93, z); for (let k = -2; k <= 2; k++) K.box(0.03, 0.95, 0.025, 0x1e2430, W + 0.04, 3.45, z + k * 0.25); } break;
    case 4: for (const z of [-4.5, -16.5, -35.5]) { K.box(0.05, 0.6, 0.45, 0x2c2a20, W + 0.02, 3.3, z); K.cyl(0.02, 0.02, 0.9, 0x1e1e1e, W + 0.05, 3.9, z, 5); } break;
    case 5: for (const [z, w] of [[1.15, 1.1], [-6.4, 0.75], [-21.9, 1.1]]) { K.box(0.05, 2.3, w, 0x4a4e52, W + 0.02, 1.15, z); for (let y = 0.1; y < 2.3; y += 0.09) K.box(0.025, 0.02, w, 0x2c3034, W + 0.05, y, z); K.box(0.1, 0.24, w + 0.12, 0x3a3e42, W + 0.05, 2.4, z); K.box(0.04, 0.06, 0.16, 0x9a8a50, W + 0.07, 0.12, z); } break;
    case 6: { const R = rngOf(616); for (let z = 6; z > -44; z -= 0.5) { if (!freeHigh(z)) continue; const L = 0.4 + R() * 1.0; K.cyl(0.01, 0.01, L, 0x2a3a1c, W + 0.03, 4.2 - L / 2, z, 4); leaf(K, 0.05 + R() * 0.04, R() < 0.6 ? 0x24361a : 0x4a4428, W + 0.04, 4.2 - L, z, 1, 1.4, 1); } break; }
    case 7: K.box(0.14, 0.1, 47, 0x26282a, W + 0.05, 3.5, -18); for (const y of [3.65, 3.75, 3.85]) K.cyl(0.025, 0.025, 47, 0x1a1c1e, W + 0.04, y, -18, 5, Math.PI / 2);
      for (const z of [-3.0, -16.0, -27.8, -36.5]) { K.box(0.12, 0.55, 0.42, 0x34383a, W + 0.06, 3.0, z); K.box(0.13, 0.08, 0.1, 0x6a2010, W + 0.07, 3.2, z + 0.12); } break;
    case 8: K.box(0.14, 0.16, 47, 0x2a1e14, W + 0.05, 3.95, -18); for (const [z0, z1] of [[6, -10.0], [-13.0, -44]]) K.box(0.05, 0.05, z0 - z1, 0x3a2a1a, W + 0.025, 2.65, (z0 + z1) / 2); break;
  }
}
// ---------- the large set pieces ----------
function setPiece(K, n) {
  switch (n) {
    case 0: { // the far end of the roof has caved in: a broken truss and sheets hang down to head height by the back wall, water falls
      const c = 0x4a3020, s = 0x5a4434; line(K, -3.4, 2.75, -35.6, 0.4, 4.15, -36.0, 0.2, c); line(K, -3.2, 2.7, -36.6, -0.6, 4.1, -37.3, 0.16, c);
      for (const [x, y, z, a, b] of [[-2.6, 3.3, -35.2, 0.5, 0.3], [-1.6, 3.6, -36.4, -0.3, 0.36], [-3.0, 3.2, -37.3, 0.2, 0.45], [-0.5, 3.8, -35.0, 0.1, 0.25]]) K.box(1.6, 0.02, 1.1, s, x, y, z, a, 0.2, b);
      for (const [x, z] of [[-3.1, -35.3], [-2.95, -36.8], [-3.25, -36.1]]) { K.box(0.4, 0.02, 0.35, s, x, 0.03, z, 0, 0.6, 0.12); K.box(0.3, 0.15, 0.25, 0x3c3a36, x - 0.02, 0.075, z + 0.2, 0, 0.3, 0); }
      K.solid(-3.42, -2.5, -37.6, -34.9, 0.25); break; }
    case 1: { // across the tracks: a mountain of overturned parcel carts, trunks and sacks
      const R = rngOf(111); for (let i = 0; i < 22; i++) { const x = 7.55 + R() * 1.6, z = -9.5 - R() * 8, y = -1.2 + 0.25 + Math.min(2.6, (1 - Math.abs(z + 13.5) / 4.5) * 2.4 * R() + R() * 0.4), k = R();
        if (k < 0.4) { K.box(0.62, 0.05, 1.1, 0x4e3626, x, y, z, R() * 1.2, R() * 3, R() * 1.2); K.cyl(0.15, 0.15, 0.05, 0x2a221c, x + 0.3, y - 0.1, z, 10, 0, 0, Math.PI / 2 + R()); }
        else if (k < 0.75) K.box(0.8 + R() * 0.3, 0.45, 0.5, R() < 0.5 ? 0x2e3a44 : 0x4a2e1e, x, y, z, R() * 0.5, R() * 3, R() * 0.5); else K.ball(0.35, 0x6e603e, x, y, z, 1.2, 0.7, 1, R(), R(), 0); }
      K.box(2.4, 0.3, 9, 0x2a2420, 8.15, -1.05, -13.5); break; }
    case 2: { // a steel footbridge crosses high over the tracks, its stair dropping behind the far wall
      const c = 0x2e3638, y = 4.75, z0 = -18.2, z1 = -20.4, zc = (z0 + z1) / 2;
      K.box(7.6, 0.25, 2.2, c, 6.7, y, zc); for (const zz of [z0, z1]) { K.box(7.6, 0.06, 0.06, c, 6.7, y + 1.1, zz); K.box(7.6, 0.06, 0.06, c, 6.7, y + 0.55, zz); for (let x = 3.0; x <= 10.4; x += 0.6) K.box(0.05, 1.1, 0.05, c, x, y + 0.55, zz); for (let x = 3.0; x < 10.2; x += 1.2) line(K, x, y + 0.1, zz, x + 0.6, y + 1.1, zz, 0.04, c); }
      K.box(0.4, 0.25, 2.2, c, 3.2, y - 0.25, zc); for (const zz of [z0 + 0.1, z1 - 0.1]) { K.box(0.25, y + 1.2, 0.25, c, 10.6, (y - 1.2) / 2, zz); K.box(0.25, y - 4.2, 0.25, c, 3.3, (y + 4.2) / 2, zz); }
      for (let i = 0; i < 18; i++) K.box(1.0, 0.06, 0.32, 0x262c2e, 11.1, y - i * 0.36, zc - 1.2 - i * 0.3); line(K, 10.6, y + 1.0, zc - 1.1, 11.6, y - 6.4 + 1.0, zc - 6.5, 0.06, c); break; }
    case 3: { // a banyan right behind the torn fence: its trunk, a low canopy over the far track, aerial roots hanging to the ground
      const R = rngOf(333); K.cyl(0.9, 1.3, 8, 0x3a3228, 10.6, 2.8, -14, 10); for (let i = 0; i < 6; i++) line(K, 10.6, 3.5 + i * 0.4, -14, 7.2 + R() * 2.5, 4.4 + R() * 1.0, -7 - R() * 14, 0.3, 0x3a3228);
      for (let i = 0; i < 18; i++) K.ball(1.3 + R() * 1.0, R() < 0.5 ? 0x1c2a18 : 0x24301c, 7.4 + R() * 4.5, 5.0 + R() * 1.8, -5 - R() * 19, 1.3, 0.6, 1.2);
      for (let i = 0; i < 46; i++) { const x = 6.9 + R() * 2.5, z = -6 - R() * 17, top = 4.6 + R() * 0.6, bot = -1.2 + R() * 2.6; K.cyl(0.02 + R() * 0.03, 0.018, top - bot, 0x4a3c2c, x, (top + bot) / 2, z, 5); }
      for (let i = 0; i < 9; i++) { const z = -7 - R() * 15; line(K, 9.6, 3.05, z, 9.1, 0.4 + R(), z + (R() - 0.5), 0.09, 0x3c3226); line(K, 9.6, 3.05, z, 10.4, 3.2, z + (R() - 0.5) * 0.6, 0.12, 0x3c3226); } break; }
    case 4: { // a rusted water-tank tower standing in the gravel between the track and the far wall
      const c = 0x4a3426, x = 8.15, z = -27; for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) K.cyl(0.08, 0.11, 4.9, c, x + dx, 1.25, z + dz, 8);
      for (const y of [0.4, 2.2]) { K.box(1.9, 0.08, 0.08, c, x, y, z - 0.9); K.box(1.9, 0.08, 0.08, c, x, y, z + 0.9); K.box(0.08, 0.08, 1.9, c, x - 0.9, y, z); K.box(0.08, 0.08, 1.9, c, x + 0.9, y, z); }
      for (const s of [-1, 1]) { line(K, x - 0.9, 0.4, z + s * 0.9, x + 0.9, 2.2, z + s * 0.9, 0.05, c); line(K, x - 0.9, 0.4 + 0 * s, z + s * 0.9, x - 0.9, 0.4, z - s * 0.9, 0.05, c); }
      K.cyl(1.2, 1.2, 2.0, 0x5a4232, x, 4.7, z, 16); K.cyl(0.3, 1.25, 0.6, 0x4a3628, x, 6.0, z, 16); K.put(new THREE.TorusGeometry(1.21, 0.04, 4, 24), 0x3a2a1e, x, 3.95, z, Math.PI / 2); K.put(new THREE.TorusGeometry(1.21, 0.04, 4, 24), 0x3a2a1e, x, 5.0, z, Math.PI / 2);
      for (let y = -1.1; y < 5.6; y += 0.32) K.box(0.04, 0.04, 0.45, c, x + 1.28, y, z + 0.5); K.box(0.04, 6.7, 0.04, c, x + 1.28, 2.2, z + 0.27); K.box(0.04, 6.7, 0.04, c, x + 1.28, 2.2, z + 0.73);
      K.cyl(0.13, 0.13, 4.6, 0x3a2c22, x + 0.5, 1.1, z - 0.3, 8); for (let k = 0; k < 4; k++) K.box(0.03, 0.5 + k * 0.3, 0.02, 0x2a1e14, x - 1.2, 4.3 - k * 0.3, z - 0.4 + k * 0.3); break; }
    case 5: { // across the tracks: a dead island platform with a row of shuttered food stalls under a sagging canopy
      K.box(2.5, 1.2, 28, 0x5a5650, 8.2, -0.6, -16); K.box(0.1, 0.02, 28, 0x6a5a30, 7.02, 0.01, -16);
      for (let i = 0; i < 6; i++) { const z = -4.5 - i * 4.4; K.box(1.8, 2.3, 3.6, 0x4e4a44, 8.6, 1.15, z); K.box(0.05, 1.9, 3.2, 0x5a5e62, 7.68, 1.0, z); for (let y = 0.1; y < 1.95; y += 0.1) K.box(0.03, 0.02, 3.2, 0x34383c, 7.65, y, z); K.box(0.06, 0.5, 3.4, i % 2 ? 0x3a2622 : 0x24323a, 7.66, 2.25, z); }
      K.box(2.6, 0.06, 28, 0x4a463e, 8.2, 3.05, -16, 0, 0, -0.12); for (let z = -2.2; z > -30.5; z -= 4.4) K.cyl(0.05, 0.05, 3.15, 0x3a3630, 6.98, 1.5, z, 6); break; }
    case 6: { // the far side has gone back to the jungle: an earth bank up the far wall, scrub, a dead tree
      const R = rngOf(666); K.put(new THREE.BoxGeometry(3.0, 0.3, 46), 0x2e2a20, 8.75, 0.95, -18, 0, 0, 0.92);
      for (let i = 0; i < 90; i++) { const x = 7.7 + R() * 1.7, z = 4 - R() * 44, y = -1.2 + (x - 7.3) * 1.6 + 0.2; leaf(K, 0.25 + R() * 0.45, R() < 0.5 ? 0x1e2a16 : R() < 0.5 ? 0x34301c : 0x26341a, x, y, z, 1, 0.7 + R() * 0.6, 1); }
      for (const z of [-9, -27]) { K.cyl(0.18, 0.3, 6.5, 0x2e2822, 9.0, 3.0, z, 7); for (let i = 0; i < 7; i++) line(K, 9.0, 3.6 + i * 0.5, z, 9.0 + (R() - 0.7) * 3.4, 5 + i * 0.5 + R(), z + (R() - 0.5) * 3, 0.07, 0x2e2822); } break; }
    case 7: { // a burnt-out carriage lies on its side between the track and the far wall
      const c = 0x3e2a20, x = 8.15, z = -19.5, L = 14;
      K.box(2.45, 3.0, L, c, x, 0.3, z); K.box(2.5, 0.12, L + 0.1, 0x2a1e18, x, 1.85, z); for (let k = 0; k < 9; k++) { const zz = z - L / 2 + 1.0 + k * 1.5; K.box(0.06, 0.62, 0.9, 0x07080a, x - 1.24, 0.6, zz); K.box(0.06, 0.62, 0.9, 0x07080a, x - 1.24, -0.45, zz); }
      for (const s of [-1, 1]) K.box(2.3, 2.9, 0.1, 0x2e2018, x, 0.3, z + s * (L / 2 + 0.03)); K.box(0.06, 1.7, 0.75, 0x2a1c14, x + 1.32, 0.2, z + 4.0, 0, 0.3, 0);
      for (let k = 0; k < 4; k++) { K.cyl(0.42, 0.42, 0.12, 0x1e1a18, x + 1.45, 0.3 + (k % 2) * 1.6 - 0.8, z - 5 + Math.floor(k / 2) * 10, 12, 0, 0, Math.PI / 2); }
      K.box(2.4, 0.02, L + 3, 0x141210, x + 0.05, -1.18, z); break; }
    case 8: { // an old signal cabin on stilts in front of the far wall, its windows dark, its stair rotten
      const c = 0x2e2a26, x = 8.2, z = -24, y0 = 2.3; for (const [dx, dz] of [[-1.0, -1.8], [1.0, -1.8], [-1.0, 1.8], [1.0, 1.8]]) K.box(0.18, y0 + 1.2, 0.18, c, x + dx, (y0 - 1.2) / 2, z + dz);
      for (const s of [-1, 1]) line(K, x - 1.0, -1.1, z + s * 1.8, x - 1.0, y0, z - s * 1.8, 0.06, c);
      K.box(2.3, 2.3, 4.0, 0x3a3430, x, y0 + 1.15, z); K.box(0.06, 0.95, 3.4, 0x060708, x - 1.16, y0 + 1.45, z); for (let k = -3; k <= 3; k++) K.box(0.08, 1.0, 0.05, c, x - 1.18, y0 + 1.45, z + k * 0.5);
      K.box(2.8, 0.1, 4.6, 0x24201c, x, y0 + 2.4, z, 0, 0, 0.14); K.box(0.8, 0.06, 1.0, c, x + 0.4, y0 - 0.05, z - 2.5); for (let i = 0; i < 9; i++) K.box(0.8, 0.05, 0.26, c, x + 0.4, y0 - 0.3 - i * 0.36, z - 3.1 - i * 0.25);
      K.box(0.08, 0.5, 1.6, 0x6a6a64, x - 1.2, y0 + 0.4, z + 0.8); K.box(1.0, 0.03, 0.8, 0x8a8a84, x - 1.2, y0 + 2.0, z - 1.6, 0.8, 0, 0.4); break; }
  }
}
// ---------- bench styles (seat top at 0.65 like the old bench, depth x -3.24..-2.7, length 1.8; local to the bench group) ----------
function bench(K, n) {
  const S = 0.65, L = 1.8;
  switch (n) {
    case 0: K.box(0.5, 0.1, L, 0x6a6a62, -0.02, S - 0.05, 0); for (const z of [-0.65, 0.65]) K.box(0.36, S - 0.1, 0.24, 0x5a5a54, -0.02, (S - 0.1) / 2, z); K.box(0.52, 0.02, L + 0.02, 0x3a4038, -0.02, S - 0.11, 0); break;
    case 1: for (let k = 0; k < 4; k++) K.box(0.128, 0.035, L, 0x5a3a20, -0.2 + k * 0.13, S - 0.018, 0); for (let k = 0; k < 3; k++) K.box(0.03, 0.09, L, 0x5a3a20, -0.27, S + 0.14 + k * 0.12, 0, 0, 0, 0.18);
      for (const z of [-0.75, 0, 0.75]) { line(K, 0.18, 0, z, 0.1, S - 0.04, z, 0.05, 0x1e1a18); line(K, -0.22, 0, z, -0.18, S - 0.04, z, 0.05, 0x1e1a18); line(K, -0.24, S - 0.04, z, -0.3, S + 0.42, z, 0.05, 0x1e1a18); K.box(0.46, 0.04, 0.05, 0x1e1a18, -0.02, S - 0.06, z); } break;
    case 2: K.box(0.5, 0.025, L, 0x5c6266, -0.02, S - 0.012, 0); K.box(0.025, 0.45, L, 0x5c6266, -0.27, S + 0.25, 0, 0, 0, 0.12); for (let z = -0.85; z <= 0.86; z += 0.07) for (let x = -0.2; x < 0.21; x += 0.07) K.box(0.02, 0.03, 0.02, 0x22262a, x, S - 0.005, z);
      for (const z of [-0.8, 0.8]) { K.cyl(0.025, 0.025, S, 0x3a3e42, 0.15, S / 2, z, 6); K.cyl(0.025, 0.025, S, 0x3a3e42, -0.2, S / 2, z, 6); } K.cyl(0.03, 0.03, L, 0x3a3e42, -0.02, S - 0.06, 0, 6, Math.PI / 2); break;
    case 3: K.box(0.54, 0.16, L + 0.1, 0x55534e, -0.02, S - 0.08, 0); for (const z of [-0.62, 0.62]) K.box(0.42, S - 0.16, 0.36, 0x4a4844, -0.02, (S - 0.16) / 2, z); break;
    case 4: for (let k = 0; k < 3; k++) K.box(0.15, 0.04, L, 0x4a3420, -0.18 + k * 0.17, S - 0.02, 0); K.box(0.04, 0.16, L, 0x4a3420, -0.27, S + 0.3, 0);
      for (const z of [-0.8, 0.8]) { line(K, 0.2, 0, z, 0.2, S - 0.04, z, 0.04, 0x6a6e70, true); line(K, -0.22, 0, z, -0.22, S + 0.38, z, 0.04, 0x6a6e70, true); line(K, 0.2, S - 0.05, z, -0.22, S - 0.05, z, 0.04, 0x6a6e70, true); } line(K, 0.2, 0.15, -0.8, 0.2, 0.15, 0.8, 0.035, 0x6a6e70, true); break;
    case 5: K.box(0.52, 0.06, L, 0x3a2418, -0.02, S - 0.03, 0); K.box(0.06, 0.75, L, 0x3a2418, -0.27, S + 0.38, 0); K.box(0.08, 0.06, L + 0.04, 0x2a180e, -0.27, S + 0.78, 0);
      for (const z of [-0.92, 0.92]) { K.box(0.52, S + 0.2, 0.06, 0x2e1c12, -0.02, (S + 0.2) / 2, z); K.box(0.5, 0.05, 0.1, 0x2e1c12, 0.0, S + 0.22, z); } K.box(0.52, 0.35, 0.03, 0x2a180e, -0.02, 0.2, 0.0); break;
    case 6: for (let k = 0; k < 9; k++) K.box(0.5, 0.02, 0.03, 0x262a26, -0.02, S - 0.01, -0.85 + k * 0.21); K.box(0.5, 0.025, L, 0x1e221e, -0.02, S - 0.03, 0);
      for (const z of [-0.88, 0.88]) { arc(K, 'z', z, -0.02, 0.35, 0.3, Math.PI * 0.05, Math.PI * 0.95, 6, 0.03, 0x262a26); line(K, 0.2, 0, z, 0.24, S, z, 0.035, 0x262a26); line(K, -0.24, 0, z, -0.28, S + 0.4, z, 0.035, 0x262a26); K.put(new THREE.TorusGeometry(0.07, 0.012, 4, 12), 0x262a26, 0.22, S + 0.12, z); }
      for (let k = 0; k < 7; k++) K.put(new THREE.TorusGeometry(0.1, 0.012, 4, 12), 0x262a26, -0.28, S + 0.22, -0.75 + k * 0.25, 0, Math.PI / 2, 0); K.box(0.025, 0.025, L, 0x262a26, -0.28, S + 0.36, 0); break;
    case 7: { // a moulded fibreglass bench, faded orange, seat dips marked, one corner cracked off
      K.box(0.46, 0.05, L, 0x6a3a1c, 0.0, S - 0.025, 0); K.box(0.05, 0.42, L, 0x6a3a1c, -0.25, S + 0.2, 0, 0, 0, 0.12); for (const z of [-0.45, 0, 0.45]) K.box(0.47, 0.052, 0.02, 0x3a1e0e, 0.0, S - 0.024, z);
      K.box(0.12, 0.03, 0.2, 0x2a1408, 0.19, S - 0.02, 0.82); K.box(0.08, 0.06, L, 0x2a2c2e, -0.05, S - 0.09, 0); for (const z of [-0.8, 0.8]) K.box(0.06, S - 0.1, 0.06, 0x2a2c2e, -0.05, (S - 0.1) / 2, z); break; }
    case 8: for (let k = 0; k < 4; k++) K.box(0.123, 0.035, L, 0x3e2a1c, -0.19 + k * 0.125, S - 0.018, 0); for (let k = 0; k < 4; k++) K.box(0.03, 0.08, L, 0x3e2a1c, -0.28, S + 0.12 + k * 0.1, 0);
      for (const z of [-0.85, 0.85]) { K.box(0.04, S, 0.08, 0x1a1c1e, 0.17, S / 2, z); arc(K, 'z', z, -0.05, 0.3, 0.25, -Math.PI * 0.4, Math.PI * 0.6, 7, 0.04, 0x1a1c1e); K.box(0.04, S + 0.5, 0.08, 0x1a1c1e, -0.27, (S + 0.5) / 2, z); K.put(new THREE.TorusGeometry(0.06, 0.015, 4, 12), 0x1a1c1e, 0.19, S + 0.1, z); K.ball(0.05, 0x1a1c1e, 0.19, 0.03, z, 1.2, 0.6, 1.4); } break;
  }
}
const EDGE = [0x9aa29a, 0xb88a30, 0x9aa4b8, 0xa8a080, 0xc8a020, 0xb0a490, 0x5a6a50, 0x8a3020, 0xa0a4a8];
const SURF = [ // tints for the canvases (so every platform lands at the same mid-dark brightness) + roof shading
  { floor: 0xc0c0c0, wall: 0xb8b8b8, roofMetal: 0.6 }, { floor: 0xb0b0b0, wall: 0xb0b0b0, roofMetal: 0.1 }, { floor: 0xb4b4b4, wall: 0xb8b8b8, roofMetal: 0.1 },
  { floor: 0xb8b8b8, wall: 0xb0b0b0, roofMetal: 0.2 }, { floor: 0xa4a4a4, wall: 0xaaaaaa, roofMetal: 0.4 }, { floor: 0x989898, wall: 0xa8a8a8, roofMetal: 0.4 },
  { floor: 0xb4b4b4, wall: 0xb8b8b8, roofMetal: 0.0 }, { floor: 0xc0c0c0, wall: 0xc4c4c4, roofMetal: 0.1 }, { floor: 0xb4b4b4, wall: 0xb4b4b4, roofMetal: 0.1 }];
const RAISED_ROOF = new Set([4, 5]);
// v3.6.1: on these platforms the roof sheets over the track half by the spawn end are gone (only the beams / arches remain against the
// sky): x 0.45..3.5, z 8.5..-9.5. Nothing hangs there (the fittings are at x <= 0.6 beyond z -10, or at x < 0.4).
const ROOF_GAP = { 2: [0.45, -9.5], 6: [0.45, -9.5], 8: [0.45, -9.5] };
function roofPiece(mat, x0, x1, z0, z1) { // a piece of the 7.6 x 54 m roof sheet with the same texture mapping as the whole sheet
  const g = new THREE.PlaneGeometry(x1 - x0, z0 - z1), uv = g.attributes.uv, P = g.attributes.position;
  for (let i = 0; i < uv.count; i++) { const x = (x0 + x1) / 2 + P.getX(i), z = (z0 + z1) / 2 + P.getY(i); uv.setXY(i, (x + 4.1) / 7.6, (z - (-18) + 27) / 54); }
  const m = new THREE.Mesh(g, mat); m.rotation.x = Math.PI / 2; m.position.set((x0 + x1) / 2, 4.2, (z0 + z1) / 2); m.userData.noBatch = true; m.visible = false; return m;
}
// the set pieces stand out in the dark beyond the tracks by a faint moon/sodium wash on their own material (no realtime light)
const SET_GLOW = [0x8a9c94, 0xc89c70, 0x8ea0c8, 0x8a9a7c, 0xbcae84, 0x9c90b4, 0x88a8a0, 0xb49888, 0x9ca2b0]; // moon / sodium wash per platform
const SET_GAIN = [2.2, 1.8, 2.0, 0.95, 2.1, 1.05, 0.9, 1.7, 2.2];
// unlit set pieces with baked light: a cold wash from above and from the platform side, so they read as shapes in the dark
function bakeMoon(geo, tint, gain = 2.0) {
  const C = geo.attributes.color, N = geo.attributes.normal, t = new THREE.Color(tint);
  for (let i = 0; i < C.count; i++) { const ny = N.getY(i), nx = N.getX(i), k = gain * (0.16 + 0.34 * Math.max(0, ny) + 0.42 * Math.max(0, -nx) + 0.08 * Math.max(0, Math.abs(N.getZ(i))));
    C.setXYZ(i, C.getX(i) * t.r * k, C.getY(i) * t.g * k, C.getZ(i) * t.b * k); }
  C.needsUpdate = true;
}
const WALL_REP = { 8: [[20, 1], [1, 0.64]] }; // a 4.2 m tall canvas: panelling below, plaster above // these replace the flat ceiling

let BENCH_MAT = null, FAR_MAT = null;
function hasHoles(c) { if (!c || !c.getContext) return false; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] < 128) return true; return false; }
function setAT(m, on, dbl) { if (!m) return; const a = on ? 0.5 : 0, sd = dbl && on ? THREE.DoubleSide : THREE.FrontSide; if (m.alphaTest !== a || m.side !== sd) { m.alphaTest = a; m.side = sd; m.needsUpdate = true; } }
export class PFStruct {
  // refs: { floor, roof, wall, dado, edge, pillarParts:[meshes], roofParts:[meshes], benches:[groups] }
  constructor(ch, refs) {
    this.ch = ch; this.refs = refs; this.n = -1; this.root = new THREE.Group(); this.root.name = 'pfStruct'; this.root.userData.noBatch = true; ch.root.add(this.root);
    for (const k of ['floor', 'roof', 'wall', 'dado', 'edge', 'far']) { const m = refs[k]; if (m) { m.userData.noBatch = true; if (!m.userData.pfOwn) { m.material = m.material.clone(); m.userData.pfOwn = true; } } }
    const rm = refs.roof && refs.roof.material; // alphaTest (discard) only on the platforms whose roof / far wall really has holes: discard costs fill rate on phones
    this.base = { floor: refs.floor && refs.floor.material.map, wall: refs.wall && refs.wall.material.map, dado: refs.dado && refs.dado.material.map, roof: rm && rm.map, roofMetal: rm && rm.metalness };
    this.tex = []; this.sets = []; this.sky = skyMesh(); this.sky.visible = false; this.root.add(this.sky); this.skyN = -1; // v3.6.1: each platform's own night sky
    for (let n = 0; n < 9; n++) {
      const t = (c, rep) => { if (!c) return null; const x = M.ctex(c, { rep }); return x; };
      const wc = wallTex(n), wr = WALL_REP[n] || [[20, 2], [1, 1.3]], rc = roofTex(n), fc = farTex(n); this.tex.push({ roofHoles: hasHoles(rc), farHoles: hasHoles(fc), end: t(wc, [3, 2.0 * (wr[0][1] / 2)]), room: t(wc, wr[1]), wall: t(wc, wr[0]), dado: t(dadoTex(n), [20, 0.48]), floor: t(floorTex(n), [3, 20]), roof: t(rc, [3, 18]), far: t(fc, [40, 1]) });
      const K = new Kit(null); K.kind = 'pillar'; pillars(K, n); K.kind = 'roof'; roof(K, n); K.kind = 'wallfx'; wallFx(K, n); K.kind = 'view'; viewNear(K, n); const KS = new Kit(null); KS.kind = 'setpiece'; if (n === 0) setPiece(KS, n); // v3.6.1: PF 1-8's set pieces are rebuilt in view (pfview.js); PF 0 keeps its caved-in roof end
      const g = K.finish('struct' + n); g.visible = false; this.root.add(g);
      { const gs = KS.finish('setpiece' + n).children[0]; if (gs) { bakeMoon(gs.geometry, SET_GLOW[n], SET_GAIN[n]); gs.material = new THREE.MeshBasicMaterial({ vertexColors: true }); g.add(gs); } K.parts.push(...KS.parts); K.solids.push(...KS.solids); }
      { const KF = new Kit(null), KG = new Kit(null); KF.kind = KG.kind = 'far'; viewFar(KF, KG, n); FAR_MAT = FAR_MAT || thinFog(new THREE.MeshBasicMaterial({ vertexColors: true }), 0.42);
        const f = KF.finish('far' + n).children[0]; if (f) { bake(f.geometry, FAR_TINT[n], FAR_GAIN[n]); f.material = FAR_MAT; f.name = 'pfFar' + n; g.add(f); }
        const fg = KG.finish('farGlow' + n).children[0]; if (fg) { fg.material = FAR_MAT; g.add(fg); } K.parts.push(...KF.parts, ...KG.parts); }
      const B = new Kit(null); bench(B, n); const bg = B.finish('bench' + n).children[0]; const bms = [];
      if (bg) { BENCH_MAT = BENCH_MAT || bg.material; for (const grp of refs.benches || []) { const m = new THREE.Mesh(bg.geometry, bg.material); m.visible = false; m.userData.noBatch = true; m.userData.pfBench = n; m.castShadow = false; grp.add(m); bms.push(m); } }
      const subs = []; if (ROOF_GAP[n] && refs.roof) { const [gx, gz] = ROOF_GAP[n], rm = refs.roof.material; subs.push(roofPiece(rm, -4.1, gx, 8.5, -44.5), roofPiece(rm, gx, 3.5, gz, -44.5)); subs.forEach(m => this.root.add(m)); }
      this.sets.push({ g, solids: K.solids, parts: K.parts, bench: bms, benchParts: B.parts, roofSubs: subs });
    }
  }
  set(n) {
    n = Math.max(0, Math.min(8, n | 0)); const R = this.refs, T = this.tex[n], S = SURF[n], ch = this.ch;
    if (n !== this.n) { const old = this.sets[this.n]; if (old) { old.g.visible = false; old.bench.forEach(m => m.visible = false); for (const s of old.solids) { const i = ch.solids.indexOf(s); if (i >= 0) ch.solids.splice(i, 1); } }
      const cur = this.sets[n]; cur.g.visible = true; cur.bench.forEach(m => m.visible = true); for (const s of cur.solids) if (!ch.solids.includes(s)) ch.solids.push(s); this.n = n; }
    for (const s of this.sets) if (s !== this.sets[n]) { if (s.g.visible) s.g.visible = false; s.bench.forEach(m => { if (m.visible) m.visible = false; }); }
    for (const grp of R.benches || []) for (const c of grp.children) if (!c.userData.pfBench && c.isGroup) c.visible = false; // the old painted bench model
    for (const p of R.pillarParts || []) p.visible = false; for (const p of R.roofParts || []) p.visible = false;
    if (this.skyN !== n) { paintSky(this.sky, n); this.skyN = n; } this.sky.visible = !ch.dawn;
    if (R.floor) { R.floor.material.map = T.floor; R.floor.material.color.setHex(S.floor); }
    if (R.wall) { R.wall.material.map = T.wall; R.wall.material.color.setHex(S.wall); }
    if (R.dado) { R.dado.visible = !!T.dado; if (T.dado) { R.dado.material.map = T.dado; R.dado.material.color.setHex(0xb0b0b0); } }
    for (const s of this.sets) for (const m of s.roofSubs) m.visible = s === this.sets[n];
    if (R.roof) { R.roof.visible = !RAISED_ROOF.has(n) && !ROOF_GAP[n]; R.roof.material.map = T.roof; R.roof.material.color.setHex(0xb0b0b0); R.roof.material.metalness = S.roofMetal; setAT(R.roof.material, T.roofHoles, false); }
    if (R.edge) R.edge.material.color.setHex(EDGE[n]);
    if (R.far) { R.far.material.map = T.far; R.far.material.color.setHex(0xa0a0a0); setAT(R.far.material, T.farHoles, true); }
    const rw = ch.fx && ch.fx.roomWallM; if (rw) { if (!this.roomBase) this.roomBase = { map: rw.map, color: rw.color.getHex() }; rw.map = T.room; rw.color.setHex(S.wall); } // the waiting room's outer walls match
    const ew = ch.endWallM; if (ew) { ew.map = T.end; ew.color.setHex(S.wall); } // and the end walls
  }
}
