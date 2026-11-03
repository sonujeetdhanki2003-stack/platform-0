// PLATFORM 0 v3.4 — every platform has its own face (Chapter 1).
// His words (Nov 1): "All the platforms should look different than the each other" → "No all platforms are creepy".
// PF 0..8 each get: tube-light tint, signage style + colour band, wall/dado/floor/roof tint, fog tint, a signature prop cluster
// and a quiet sound accent. All nine sets are built once; only the current platform's set is visible (switched in resetLoop).
// Nothing here touches an object an anomaly changes (posters, clock, board text, benches, bin, cooler, fans, NPCs, rails, footprints,
// puddle, signs' mirror canvas, lamp levels): see test/pfvariety.cjs. Props stay against the back wall or overhead; the walking lane,
// the NPC path along the edge, the hide spots, pick-ups and the lost-and-found items are kept clear.
import * as THREE from './three.module.min.js';
import * as M from './mats.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

// ---------- the nine looks ----------
// lamp: tube colour (normalised to the same luminance, so no platform is brighter); hemi/fog: ambient tint; floor/roof/wall/dado: surface tints
export const PF_LOOKS = [
  { name: 'The leak',          lamp: 0xd2f0cc, hemi: 0x4e6a5e, fog: 0x060a09, floor: 0x8f958c, roof: 0x5c625c, wall: 0x9cb4a4, dado: 0x1c3a2c, sound: 'drip',
    sign: { bg: '#d9bb1c', fg: '#111111', band: '#1f5a3a', fx: 'wet' } },
  { name: 'Lost luggage',      lamp: 0xffb35c, hemi: 0x66503c, fog: 0x0b0806, floor: 0xa89276, roof: 0x6e4c34, wall: 0xd0a070, dado: 0x5a2410, sound: 'dog',
    sign: { bg: '#c08a26', fg: '#1a0d05', band: '#8a4a16', fx: 'rust' } },
  { name: 'Closed bookstall',  lamp: 0xa8c2ff, hemi: 0x44506c, fog: 0x05070d, floor: 0x8a92a0, roof: 0x48505e, wall: 0x8c9cc0, dado: 0x13203c, sound: 'wind',
    sign: { bg: '#163672', fg: '#e6ecf6', band: '#8aa8e0', fx: 'chip' } },
  { name: 'Pigeon corner',     lamp: 0xb6e894, hemi: 0x54663c, fog: 0x070a05, floor: 0x9ca084, roof: 0x7e8276, wall: 0xb0b47c, dado: 0x384016, sound: 'coo',
    sign: { bg: '#c4d2a8', fg: '#18220e', band: '#4e6a22', fx: 'mould' } },
  { name: 'Weighing machine',  lamp: 0xf0da86, hemi: 0x686240, fog: 0x0a0905, floor: 0xaea484, roof: 0x7c6a4c, wall: 0xd0bc78, dado: 0x624410, sound: 'clank',
    sign: { bg: '#141210', fg: '#e8c838', band: '#c8a018', fx: 'stencil' } },
  { name: 'Ticket window',     lamp: 0xc8b0ea, hemi: 0x54466a, fog: 0x08060c, floor: 0x968ea0, roof: 0x463e50, wall: 0xb09cc0, dado: 0x32163a, sound: 'creak',
    sign: { bg: '#ddd4c2', fg: '#2a1030', band: '#5a1e62', fx: 'peel' } },
  { name: 'Dead garden',       lamp: 0x6ad8d8, hemi: 0x3c625e, fog: 0x050a0a, floor: 0x8a9c98, roof: 0x3a6456, wall: 0x84b8b0, dado: 0x0c3834, sound: 'crickets',
    sign: { bg: '#0e544c', fg: '#e6f2ec', band: '#b08a3a', fx: 'chip' } },
  { name: 'Dead tube',         lamp: 0xd8d0c6, hemi: 0x58524a, fog: 0x090706, floor: 0x988c7c, roof: 0x44362a, wall: 0xa89480, dado: 0x2c1a10, sound: 'sputter',
    sign: { bg: '#583822', fg: '#e8d4ae', band: '#1e130b', fx: 'soot' } },
  { name: 'Cobwebs',           lamp: 0xd0dcee, hemi: 0x56606c, fog: 0x07080b, floor: 0xa0a2a6, roof: 0x96989c, wall: 0xb0b4b8, dado: 0x1a1e24, sound: 'drone',
    sign: { bg: '#9a9ea2', fg: '#121212', band: '#2c3036', fx: 'dust' } },
];
const LUM = 0.6; // every tube colour is scaled to this relative luminance (same brightness everywhere, only the hue changes)
export function evenColor(hex) {
  const c = new THREE.Color(hex).lerp(new THREE.Color(0xffffff), 0.15), l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; // linear; 15% toward white so reds (the blood leak, red posters) still read under every tint
  c.multiplyScalar(LUM / Math.max(l, 1e-3)); const m = Math.max(c.r, c.g, c.b); if (m > 1) c.multiplyScalar(1 / m); return c;
}

// ---------- tiny seeded rng (same look every session) ----------
export function rngOf(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// ---------- platform signs ----------
const _signs = new Map();
export function pfSign(n) {
  if (_signs.has(n)) return _signs.get(n);
  const st = PF_LOOKS[n % 9].sign, R = rngOf(101 + n * 7), deva = '०१२३४५६७८९';
  const c = M.canvas(1024, 256), g = c.getContext('2d');
  g.fillStyle = st.bg; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = st.band; g.fillRect(0, 0, 1024, 30); g.fillRect(0, 226, 1024, 30); // the platform's colour band
  g.strokeStyle = st.fg; g.lineWidth = 8; g.strokeRect(14, 36, 996, 184);
  g.fillStyle = st.fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  const stencil = st.fx === 'stencil';
  g.font = `700 64px ${M.DEVA}`; g.fillText('प्लेटफ़ॉर्म ' + deva[n % 10], 330, 84);
  g.font = `900 ${stencil ? 80 : 84}px ${M.SANS}`; if (stencil && g.letterSpacing !== undefined) g.letterSpacing = '10px'; g.fillText('PLATFORM', 330, 176); if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
  g.font = `900 200px ${M.SANS}`; g.fillText(String(n), 850, 132);
  if (stencil) { g.fillStyle = st.bg; for (const x of [800, 850, 900]) g.fillRect(x - 3, 40, 6, 180); } // stencil bridges
  g.fillStyle = st.fg; g.fillRect(690, 44, 8, 168);
  // wear, per platform
  const fx = st.fx;
  const blot = (col, n2, r0, r1, yMin = 0, yMax = 256) => { for (let i = 0; i < n2; i++) { g.fillStyle = col; g.beginPath(); g.ellipse(R() * 1024, yMin + R() * (yMax - yMin), r0 + R() * (r1 - r0), (r0 + R() * (r1 - r0)) * 0.7, R() * 3, 0, 7); g.fill(); } };
  if (fx === 'rust' || fx === 'soot') for (let i = 0; i < 26; i++) { const x = R() * 1024, w = 3 + R() * 10, h = 30 + R() * 160, y = R() * 60; const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, fx === 'rust' ? 'rgba(90,40,10,.75)' : 'rgba(10,8,6,.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, y, w, h); }
  if (fx === 'chip') blot('rgba(20,18,16,.85)', 30, 4, 16);
  if (fx === 'mould') { blot('rgba(30,44,20,.55)', 40, 8, 40); blot('rgba(12,18,8,.6)', 30, 3, 10); }
  if (fx === 'wet') { for (let i = 0; i < 18; i++) { const x = R() * 1024; g.fillStyle = 'rgba(20,30,24,.35)'; g.fillRect(x, 0, 4 + R() * 8, 80 + R() * 176); } }
  if (fx === 'peel') { for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(150,140,128,.9)'; g.beginPath(); const x = R() * 1024, y = R() * 256; g.moveTo(x, y); for (let k = 0; k < 7; k++) g.lineTo(x + (R() - 0.3) * 90, y + (R() - 0.5) * 60); g.fill(); } }
  if (fx === 'dust') { g.fillStyle = 'rgba(200,200,200,.25)'; g.fillRect(0, 0, 1024, 256); blot('rgba(60,60,60,.3)', 30, 10, 40); }
  M.grime(g, 1024, 256, 0.55, 20 + n);
  _signs.set(n, c); return c;
}

// ---------- geometry kit: merged low-poly props with vertex colours + one decal atlas per platform ----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
let SOLID_MAT = null;
export class Kit {
  constructor(atlas) { this.geos = []; this.decals = []; this.solids = []; this.parts = []; this.atlas = atlas; }
  note(g, kind) { g.computeBoundingBox(); const b = g.boundingBox; this.parts.push({ kind, tris: g.attributes.position.count / 3, box: [b.min.x, b.max.x, b.min.y, b.max.y, b.min.z, b.max.z].map(v => +v.toFixed(3)) }); } // for test/pfvariety.cjs
  put(geo, color, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone(); geo.dispose();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    const col = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)); g.applyMatrix4(_m); this.geos.push(g); this.note(g, this.kind || 'prop'); return g;
  }
  box(w, h, d, c, x, y, z, rx = 0, ry = 0, rz = 0) { return this.put(new THREE.BoxGeometry(w, h, d), c, x, y, z, rx, ry, rz); }
  cyl(rt, rb, h, c, x, y, z, seg = 8, rx = 0, ry = 0, rz = 0) { return this.put(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y, z, rx, ry, rz); }
  ball(r, c, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) { return this.put(new THREE.SphereGeometry(r, 7, 5), c, x, y, z, rx, ry, rz, sx, sy, sz); }
  torus(r, t, c, x, y, z, rx = 0, ry = 0, rz = 0) { return this.put(new THREE.TorusGeometry(r, t, 4, 14), c, x, y, z, rx, ry, rz); }
  // a flat decal: tile = [x, y, w, h] in atlas pixels (256²); placed with an euler rotation
  decal(w, h, tile, x, y, z, rx = 0, ry = 0, rz = 0) {
    const g = new THREE.PlaneGeometry(w, h).toNonIndexed(), uv = g.attributes.uv, [tx, ty, tw, th] = tile;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (tx + uv.getX(i) * tw) / 256, 1 - (ty + (1 - uv.getY(i)) * th) / 256);
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(1, 1, 1)); g.applyMatrix4(_m); this.decals.push(g); this.note(g, 'decal'); return g;
  }
  wall(w, h, tile, y, z) { return this.decal(w, h, tile, -3.484, y, z, 0, Math.PI / 2, 0); } // on the back wall, facing the platform
  floor(w, d, tile, x, z, rot = 0, y = 0.009) { return this.decal(w, d, tile, x, y, z, -Math.PI / 2, 0, rot); }
  roof(w, d, tile, x, z) { return this.decal(w, d, tile, x, 4.185, z, Math.PI / 2, 0, 0); }
  solid(x0, x1, z0, z1, top) { this.solids.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), top, low: top !== undefined && top < 1.0, pf: true }); }
  finish(name) {
    const g = new THREE.Group(); g.name = 'pf_' + name; g.userData.noBatch = true; // switched on/off per loop: never static-batched
    if (this.geos.length) { SOLID_MAT = SOLID_MAT || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0.08, envMapIntensity: 0.3 });
      const m = new THREE.Mesh(mergeGeometries(this.geos), SOLID_MAT); m.castShadow = false; m.receiveShadow = false; m.userData.noBatch = true; g.add(m); this.geos.forEach(x => x.dispose()); }
    if (this.decals.length && this.atlas) {
      const mat = new THREE.MeshStandardMaterial({ map: M.ctex(this.atlas), transparent: true, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, roughness: 0.92, metalness: 0, envMapIntensity: 0.2 });
      const m = new THREE.Mesh(mergeGeometries(this.decals), mat); m.renderOrder = 1; m.userData.noBatch = true; g.add(m); this.decals.forEach(x => x.dispose()); }
    return g;
  }
}

// ---------- atlas painting helpers (256² canvas; tiles are rectangles in it) ----------
function painter(seed) {
  const c = M.canvas(256, 256), g = c.getContext('2d'), R = rngOf(seed);
  const P = {
    c, g, R,
    clip(t, f) { g.save(); g.beginPath(); g.rect(t[0], t[1], t[2], t[3]); g.clip(); f(t[0], t[1], t[2], t[3]); g.restore(); },
    blob(x, y, rx, ry, col, soft = 1) { const gr = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry)); gr.addColorStop(0, col); gr.addColorStop(Math.min(0.95, 1 - 0.6 * soft), col); gr.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); g.save(); g.translate(x, y); g.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry)); g.translate(-x, -y); g.fillStyle = gr; g.beginPath(); g.arc(x, y, Math.max(rx, ry), 0, 7); g.fill(); g.restore(); },
    streaks(t, col, n, wMax = 6) { P.clip(t, (x, y, w, h) => { for (let i = 0; i < n; i++) { const sx = x + R() * w, sw = 1 + R() * wMax, sh = h * (0.3 + R() * 0.7); const gr = g.createLinearGradient(0, y, 0, y + sh); gr.addColorStop(0, col); gr.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); g.fillStyle = gr; g.fillRect(sx, y, sw, sh); } }); },
    torn(t, fill, f) { P.clip(t, (x, y, w, h) => { g.beginPath(); const pts = 22; for (let i = 0; i <= pts; i++) { const a = i / pts * Math.PI * 2; const r = 0.42 + R() * 0.09; g.lineTo(x + w / 2 + Math.cos(a) * w * r * (1 + 0.15 * Math.sign(Math.cos(a))), y + h / 2 + Math.sin(a) * h * r * 1.12); } g.closePath(); g.fillStyle = fill; g.fill(); g.save(); g.clip(); if (f) f(x, y, w, h); g.restore(); }); },
    text(s, x, y, size, col, font = M.SANS, weight = 900) { g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${weight} ${size}px ${font}`; g.fillText(s, x, y); },
    grime(t, a = 0.5) { P.clip(t, (x, y, w, h) => { for (let i = 0; i < 60 * a; i++) { g.fillStyle = `rgba(20,16,12,${0.05 + R() * 0.12})`; g.beginPath(); g.arc(x + R() * w, y + R() * h, 1 + R() * 5, 0, 7); g.fill(); } }); },
  };
  return P;
}

// ---------- the nine prop sets ----------
// Free spots along the back wall (x -3.5..-2.7) that no anomaly, hide spot, item or path uses:
//   A z +0.55..+1.75 (by the entrance)   B z -6.0..-7.35 (room → bench 1)   C z -10.0..-11.2 (bench 1 → stall boxes)
//   D z -21.3..-22.5 (bench 2 → cooler)   E z -32.35..-33.2 (bin → Room 0). Overhead (y > 2.7) near the wall is free everywhere.
const BUILD = [
  // PF 0 — the leak: a roof leak streaks the wall into a rusty bucket; a second leak past bench 1 with a mop
  (K, P) => {
    const tStreak = [0, 0, 48, 256], tPud = [48, 0, 104, 80], tRing = [152, 0, 104, 104], tMop = [48, 80, 104, 60];
    P.streaks(tStreak, 'rgba(18,30,24,.75)', 22, 7); P.streaks(tStreak, 'rgba(70,60,30,.45)', 10, 3);
    P.blob(100, 40, 50, 36, 'rgba(6,10,12,.85)', 0.5); P.blob(80, 46, 18, 12, 'rgba(60,80,90,.35)', 0.5);
    P.clip(tRing, (x, y, w, h) => { for (let r = 50; r > 10; r -= 7) { P.g.strokeStyle = `rgba(30,24,14,${0.1 + (50 - r) / 160})`; P.g.lineWidth = 3; P.g.beginPath(); P.g.ellipse(x + 52, y + 52, r, r * 0.8, 0.3, 0, 7); P.g.stroke(); } P.blob(x + 52, y + 52, 30, 26, 'rgba(14,16,12,.6)', 0.6); });
    // wall streaks + roof stains
    K.wall(0.6, 4.1, tStreak, 2.08, -6.35); K.wall(0.45, 3.2, tStreak, 2.55, -10.35);
    K.roof(1.5, 1.4, tRing, -2.9, -6.4); K.roof(1.2, 1.1, tRing, -2.85, -10.5); K.roof(1.0, 0.9, tRing, -1.0, -28.5);
    // bucket under the drip, with dark water in it, in a spreading puddle
    K.cyl(0.17, 0.13, 0.3, 0x55574f, -3.1, 0.15, -6.55, 10); K.torus(0.17, 0.012, 0x3e403a, -3.1, 0.3, -6.55, Math.PI / 2);
    K.cyl(0.155, 0.155, 0.01, 0x0b1012, -3.1, 0.26, -6.55, 10);
    K.floor(1.5, 1.1, tPud, -2.95, -6.55, 0.4); K.floor(1.0, 1.2, tPud, -2.95, -10.6, 1.3); // (not by the cooler: its blood leak is an anomaly)
    // a mop left leaning on the wall, in a bucket of grey water
    K.cyl(0.012, 0.012, 1.35, 0x6a5a40, -3.36, 0.72, -10.85, 6, 0.12, 0, -0.16); K.cyl(0.07, 0.11, 0.16, 0x8a8478, -3.27, 0.09, -10.93, 7);
    K.solid(-3.32, -2.88, -6.78, -6.32, 0.32); K.solid(-3.5, -3.15, -11.05, -10.7, 1.4);
    return { drip: { x: -3.1, y0: 4.15, y1: 0.27, z: -6.55 } };
  },
  // PF 1 — lost luggage: rusted parcel trolleys, one loaded with tied gunny sacks and a tin trunk, one empty by the waiting room with a child's shoe
  (K, P) => {
    const tRust = [0, 0, 64, 256], tTag = [64, 0, 64, 64], tSoot = [128, 0, 128, 128];
    P.streaks(tRust, 'rgba(110,50,14,.8)', 26, 5); P.streaks(tRust, 'rgba(40,20,8,.6)', 12, 3);
    P.blob(192, 64, 60, 44, 'rgba(30,18,10,.55)', 0.7);
    const trolley = (x, z, rz, load) => {
      const rust = 0x4e3626, iron = 0x2a221c, y = 0.34;
      K.put(new THREE.BoxGeometry(0.62, 0.05, 1.1), rust, x, y, z, 0, 0, rz);
      for (const dz of [-0.5, 0.5]) for (const dx of [-0.29, 0.29]) K.box(0.04, 0.05, 0.04, iron, x + dx, y + 0.04, z + dz, 0, 0, rz);
      for (const dx of [-0.34, 0.34]) { K.cyl(0.15, 0.15, 0.05, iron, x + dx, 0.15, z + 0.18, 10, 0, 0, Math.PI / 2); K.cyl(0.04, 0.04, 0.07, 0x5a4a3a, x + dx, 0.15, z + 0.18, 6, 0, 0, Math.PI / 2); }
      K.box(0.04, 0.3, 0.04, iron, x - 0.27, 0.17, z - 0.48); K.box(0.04, 0.3, 0.04, iron, x + 0.27, 0.17, z - 0.48);
      for (const dx of [-0.27, 0.27]) K.box(0.035, 0.75, 0.035, iron, x + dx, y + 0.4, z - 0.56, 0.12, 0, 0); K.box(0.58, 0.035, 0.035, iron, x, y + 0.77, z - 0.6);
      if (load) { const sack = 0x6e603e;
        K.ball(0.26, sack, x - 0.1, y + 0.2, z + 0.22, 1, 0.75, 1.15, 0.2); K.ball(0.24, 0x5e5236, x + 0.12, y + 0.18, z - 0.18, 1, 0.7, 1.2, -0.1);
        K.ball(0.2, sack, x, y + 0.48, z + 0.02, 1.1, 0.7, 1, 0.3);
        for (const dz of [0.1, 0.34]) K.torus(0.2, 0.01, 0x2a1e12, x - 0.1, y + 0.2, z + dz, 0, Math.PI / 2, 0);
        K.box(0.46, 0.3, 0.32, 0x2e3a44, x + 0.04, y + 0.18, z + 0.62 - 0.36); K.box(0.47, 0.03, 0.33, 0x8a7a50, x + 0.04, y + 0.31, z + 0.26); }
    };
    trolley(-3.0, -21.8, 0, true); trolley(-3.0, -6.62, 0.06, false);
    K.wall(0.5, 2.6, tRust, 2.9, -21.9); K.wall(0.4, 2.2, tRust, 3.1, -32.75); K.wall(0.6, 2.0, tRust, 3.2, -10.6);
    K.wall(1.4, 1.0, tSoot, 3.6, -26.6);
    // a child's shoe by the empty trolley
    K.ball(0.05, 0x3a2418, -2.6, 0.03, -6.0, 1.1, 0.55, 2.1, 0, 0.4); K.box(0.07, 0.015, 0.17, 0x1a1210, -2.6, 0.008, -6.0, 0, 0.4, 0);
    P.clip(tTag, (x, y, w, h) => { P.g.fillStyle = '#8a7a58'; P.g.fillRect(x + 8, y + 14, 48, 36); P.text('PARCEL', x + 32, y + 26, 10, '#2a1a0a'); P.text('№ 0217', x + 32, y + 40, 10, '#2a1a0a'); });
    K.solid(-3.36, -2.64, -22.42, -21.22, 0.95); K.solid(-3.36, -2.64, -7.25, -6.0, 0.75);
    return {};
  },
  // PF 2 — the bookstall: a shuttered kiosk by the entrance, its shutter plastered with torn magazine covers; peeling blue paint
  (K, P) => {
    const tShut = [0, 0, 128, 192], tPeel = [128, 0, 128, 128], tNews = [128, 128, 64, 64];
    P.clip(tShut, (x, y, w, h) => { const g = P.g; g.fillStyle = '#23292c'; g.fillRect(x, y, w, h);
      for (let k = 0; k < h; k += 6) { g.fillStyle = k % 12 ? 'rgba(0,0,0,.35)' : 'rgba(150,160,160,.18)'; g.fillRect(x, y + k, w, 2); }
      g.fillStyle = '#0c1628'; g.fillRect(x, y, w, 30); P.text('पुस्तक भंडार', x + 64, y + 10, 13, 'rgba(190,180,160,.65)', M.DEVA, 700); P.text('BOOK STALL', x + 64, y + 23, 12, 'rgba(190,180,160,.65)');
      const mag = ['#7a2a3a', '#2a5a7a', '#8a6a1a', '#3a6a3a', '#6a3a6a'];
      for (let i = 0; i < 7; i++) { g.save(); g.translate(x + 14 + P.R() * 100, y + 50 + P.R() * 110); g.rotate((P.R() - 0.5) * 0.6); g.fillStyle = mag[i % 5]; g.globalAlpha = 0.3; g.fillRect(-12, -16, 24, 32); g.fillStyle = 'rgba(230,220,200,.5)'; g.fillRect(-9, -12, 18, 6); g.restore(); }
      g.globalAlpha = 1; g.fillStyle = '#1a1a1a'; g.fillRect(x + 58, y + 170, 12, 14); g.strokeStyle = '#555'; g.lineWidth = 2; g.beginPath(); g.arc(x + 64, y + 170, 5, Math.PI, 0); g.stroke();
      P.streaks([x, y, w, h], 'rgba(70,32,12,.7)', 26, 5); P.streaks([x, y, w, h], 'rgba(0,0,0,.5)', 14, 8); P.grime(tShut, 2.5); });
    P.clip(tPeel, (x, y, w, h) => { for (let i = 0; i < 14; i++) { const px = x + P.R() * w, py = y + P.R() * h; P.g.fillStyle = 'rgba(30,60,110,.55)'; P.g.beginPath(); P.g.moveTo(px, py); for (let k = 0; k < 6; k++) P.g.lineTo(px + (P.R() - 0.5) * 40, py + (P.R() - 0.3) * 30); P.g.fill(); P.g.fillStyle = 'rgba(200,190,170,.35)'; P.g.fillRect(px - 3, py - 1, 8, 2); } });
    P.clip(tNews, (x, y, w, h) => { P.g.fillStyle = '#9a9278'; P.g.fillRect(x, y, w, h); for (let k = 6; k < h; k += 5) { P.g.fillStyle = 'rgba(30,30,30,.4)'; P.g.fillRect(x + 4, y + k, w - 8, 2); } P.g.fillStyle = '#2a2018'; P.g.fillRect(x, y + 26, w, 6); });
    // kiosk (x -3.5..-2.9, z 0.55..1.75): body, overhanging roof, shutter face
    const cx = -3.2, cz = 1.15;
    K.box(0.6, 2.05, 1.2, 0x1e2a30, cx, 1.025, cz); K.box(0.82, 0.06, 1.38, 0x141414, cx + 0.08, 2.1, cz); K.box(0.66, 0.1, 1.26, 0x2a2420, cx, 0.05, cz);
    K.decal(1.08, 1.86, tShut, -2.895, 1.05, cz, 0, Math.PI / 2, 0);
    // a tied bundle of old newspapers by it
    K.box(0.4, 0.22, 0.3, 0x8a8268, -3.28, 0.11, 0.3); for (const dz of [0.22, 0.38]) K.box(0.42, 0.23, 0.02, 0x2a2018, -3.28, 0.11, dz);
    K.wall(1.2, 1.2, tPeel, 3.3, 0.9); K.wall(1.0, 1.0, tPeel, 3.5, -9.8); K.wall(1.1, 1.1, tPeel, 3.4, -22.0); K.wall(0.9, 0.9, tPeel, 3.6, -32.8);
    K.solid(-3.5, -2.86, 0.52, 1.78); K.solid(-3.5, -3.06, 0.13, 0.47, 0.25);
    return {};
  },
  // PF 3 — the pigeon corner: a dead pigeon in a scatter of feathers, droppings down the wall, pigeons roosting on the trusses
  (K, P) => {
    const tFeath = [0, 0, 128, 128], tDrop = [128, 0, 64, 256], tFloorDrop = [0, 128, 128, 128];
    P.clip(tFeath, (x, y, w, h) => { const g = P.g; for (let i = 0; i < 26; i++) { g.save(); g.translate(x + 10 + P.R() * (w - 20), y + 10 + P.R() * (h - 20)); g.rotate(P.R() * 6.3); g.fillStyle = `rgba(${150 + P.R() * 60 | 0},${150 + P.R() * 60 | 0},${150 + P.R() * 60 | 0},.85)`; g.beginPath(); g.ellipse(0, 0, 2 + P.R() * 2, 7 + P.R() * 6, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(60,60,60,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -10); g.lineTo(0, 10); g.stroke(); g.restore(); } P.blob(x + 64, y + 64, 26, 18, 'rgba(40,22,18,.35)', 0.8); });
    P.streaks(tDrop, 'rgba(225,225,215,.7)', 26, 3); P.streaks(tDrop, 'rgba(60,64,40,.5)', 10, 6);
    P.clip(tFloorDrop, (x, y, w, h) => { for (let i = 0; i < 70; i++) { P.g.fillStyle = `rgba(230,230,220,${0.4 + P.R() * 0.5})`; P.g.beginPath(); P.g.arc(x + P.R() * w, y + P.R() * h, 1 + P.R() * 3, 0, 7); P.g.fill(); } });
    // the dead pigeon (on its side, wing out, feet up)
    const bx = -3.1, bz = -10.6, grey = 0x55565c;
    K.ball(0.1, grey, bx, 0.06, bz, 0.8, 0.62, 1.5, 0, 0.5, 0.4); K.ball(0.045, 0x4a4b52, bx + 0.05, 0.05, bz - 0.15, 1, 1, 1);
    K.box(0.18, 0.012, 0.11, 0x3a3b40, bx + 0.11, 0.02, bz + 0.02, 0, 0.5, 0.1); K.box(0.012, 0.012, 0.03, 0x8a6a40, bx + 0.065, 0.05, bz - 0.2, 0, 0.5, 0);
    for (const d of [-0.02, 0.02]) K.box(0.008, 0.06, 0.008, 0x9a5a50, bx - 0.04 + d, 0.11, bz + 0.1, 0.4, 0, 0.3);
    K.floor(1.3, 1.1, tFeath, -3.0, -10.6, 0.3); K.floor(0.8, 0.7, tFeath, -2.95, -21.55, 1.9);
    // droppings down the wall and on the floor under the roost
    K.wall(0.5, 3.0, tDrop, 2.7, -10.25); K.wall(0.4, 2.4, tDrop, 3.0, -16.0); K.wall(0.5, 2.8, tDrop, 2.8, -22.0); K.wall(0.4, 2.4, tDrop, 3.0, -32.8);
    K.floor(1.2, 1.4, tFloorDrop, -2.4, -12.1); K.floor(1.0, 1.2, tFloorDrop, -2.3, -8.3, 1.0); K.floor(1.0, 1.2, tFloorDrop, -1.7, -32.0, 2.0); // not at z -15.5..-19 (the footprints anomaly)
    // roosting pigeons on the trusses' bottom flange (trusses every 4 m from z 0)
    const roost = [[-3.0, -12], [-2.75, -12], [-2.1, -12], [-2.9, -32], [-2.5, -32], [-1.6, -32], [-3.0, -8], [-2.55, -8], [-1.9, -8]];
    roost.forEach(([x, z], i) => { const dz = (i % 2 ? 0.17 : -0.17), c = i % 3 ? 0x26272c : 0x34353a, ry = (i * 1.7) % 6.3;
      K.ball(0.09, c, x, 4.04, z + dz, 0.85, 0.85, 1.45, 0.25, ry); K.ball(0.045, c, x + Math.sin(ry) * 0.12, 4.12, z + dz + Math.cos(ry) * 0.12); });
    K.solid(-3.3, -2.9, -10.85, -10.35, 0.12);
    return {};
  },
  // PF 4 — the weighing machine: a tall rusted coin scale with a cracked dial; torn film posters peeling off the wall
  (K, P) => {
    const tDial = [0, 0, 96, 96], tBody = [96, 0, 64, 160], tPost1 = [160, 0, 96, 128], tPost2 = [160, 128, 96, 128];
    P.clip(tDial, (x, y, w, h) => { const g = P.g, cx = x + 48, cy = y + 48; g.fillStyle = '#2a1c14'; g.fillRect(x, y, w, h); g.fillStyle = '#c8bea0'; g.beginPath(); g.arc(cx, cy, 40, 0, 7); g.fill();
      g.strokeStyle = '#222'; g.lineWidth = 1.5; for (let i = 0; i <= 26; i++) { const a = -Math.PI * 0.75 + i / 26 * Math.PI * 1.5; g.beginPath(); g.moveTo(cx + Math.sin(a) * 36, cy - Math.cos(a) * 36); g.lineTo(cx + Math.sin(a) * (i % 5 ? 32 : 28), cy - Math.cos(a) * (i % 5 ? 32 : 28)); g.stroke(); }
      P.text('KG', cx, cy + 16, 9, '#333'); g.strokeStyle = '#7a1010'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(2.3) * 30, cy - Math.cos(2.3) * 30); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - 30, cy - 18); g.lineTo(cx + 4, cy + 6); g.lineTo(cx + 26, cy - 2); g.moveTo(cx + 4, cy + 6); g.lineTo(cx - 2, cy + 34); g.stroke();
      P.blob(cx + 14, cy + 14, 22, 18, 'rgba(90,50,20,.45)', 0.7); });
    P.clip(tBody, (x, y, w, h) => { const g = P.g; g.fillStyle = '#6e1a14'; g.fillRect(x, y, w, h); P.text('अपना', x + 32, y + 22, 13, '#e8d8b0', M.DEVA, 700); P.text('वज़न', x + 32, y + 40, 13, '#e8d8b0', M.DEVA, 700); P.text('WEIGHT', x + 32, y + 62, 11, '#e8d8b0'); P.text('₹ 1', x + 32, y + 84, 14, '#e8c840');
      g.fillStyle = '#111'; g.fillRect(x + 26, y + 100, 12, 4); P.streaks([x, y, w, h], 'rgba(60,30,10,.75)', 16, 5); P.grime([x, y, w, h], 1.2); });
    const poster = (t, a, b, title) => P.torn(t, '#b8a888', (x, y, w, h) => { const g = P.g; const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(20,10,10,.55)'; g.beginPath(); g.ellipse(x + w * 0.5, y + h * 0.5, w * 0.22, h * 0.26, 0, 0, 7); g.fill(); P.text(title, x + w / 2, y + h * 0.84, 16, 'rgba(240,220,170,.8)', M.DEVA, 700);
      g.fillStyle = 'rgba(190,180,160,.9)'; for (let i = 0; i < 5; i++) { g.beginPath(); const px = x + P.R() * w, py = y + P.R() * h; g.moveTo(px, py); for (let k = 0; k < 5; k++) g.lineTo(px + (P.R() - 0.5) * 50, py + (P.R() - 0.5) * 40); g.fill(); } P.grime([x, y, w, h], 1); });
    poster(tPost1, '#5a2a3a', '#2a1a24', 'रात'); poster(tPost2, '#2a4a5a', '#141e24', 'वापसी');
    // the machine (faces the platform, against the wall)
    const x = -3.18, z = -10.6, red = 0x6a1a14; // slot C (not beside the green notice the 'don't turn around' anomaly rewrites)
    K.box(0.56, 0.12, 0.56, 0x4a1410, x + 0.04, 0.06, z); K.box(0.46, 0.03, 0.46, 0x2c2c2a, x + 0.06, 0.135, z);
    K.box(0.3, 1.45, 0.34, red, x - 0.08, 0.84, z); K.cyl(0.25, 0.25, 0.14, 0x5a1610, x - 0.03, 1.72, z, 16, 0, 0, Math.PI / 2);
    K.cyl(0.21, 0.21, 0.02, 0x8a8a80, x + 0.05, 1.72, z, 16, 0, 0, Math.PI / 2); K.box(0.12, 0.06, 0.2, 0x3a0e0a, x - 0.08, 2.0, z);
    K.decal(0.4, 0.4, tDial, x + 0.065, 1.72, z, 0, Math.PI / 2, 0); K.decal(0.32, 0.8, tBody, x + 0.075, 0.95, z, 0, Math.PI / 2, 0);
    K.wall(0.7, 0.95, tPost2, 1.85, -21.9); K.wall(0.75, 1.0, tPost2, 3.3, -15.6); K.wall(0.8, 1.05, tPost1, 3.2, -32.7);
    K.solid(-3.5, -2.86, -10.9, -10.3);
    return {};
  },
  // PF 5 — the ticket window: a shuttered booking window with a grille and a hand-written "closed" board, an iron queue rail,
  // and a booking-office sign hanging crooked on its chains
  (K, P) => {
    const tShut = [0, 0, 128, 128], tBoard = [128, 0, 128, 64], tSign = [128, 64, 128, 40], tStain = [0, 128, 128, 128];
    P.clip(tShut, (x, y, w, h) => { const g = P.g; g.fillStyle = '#4a3020'; g.fillRect(x, y, w, h); for (let k = 0; k < w; k += 16) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + k, y, 2, h); } g.fillStyle = '#0a0806'; g.fillRect(x + 44, y + 92, 40, 16); P.streaks([x, y, w, h], 'rgba(20,12,6,.6)', 14, 4); P.grime([x, y, w, h], 1); });
    P.clip(tBoard, (x, y, w, h) => { const g = P.g; g.fillStyle = '#1c1c1a'; g.fillRect(x, y, w, h); P.text('टिकट खिड़की बंद', x + 64, y + 20, 15, 'rgba(235,230,215,.85)', M.DEVA, 700); P.text('BOOKING CLOSED', x + 64, y + 44, 15, 'rgba(235,230,215,.85)', M.SANS, 700); P.grime([x, y, w, h], 0.8); });
    P.clip(tSign, (x, y, w, h) => { const g = P.g; g.fillStyle = '#e4dcc8'; g.fillRect(x, y, w, h); g.fillStyle = '#5a1e62'; g.fillRect(x, y, w, 5); g.fillRect(x, y + h - 5, w, 5); P.text('टिकट घर · BOOKING', x + 64, y + 20, 13, '#2a1030', M.DEVA, 700); P.streaks([x, y, w, h], 'rgba(60,40,30,.5)', 10, 3); P.grime([x, y, w, h], 1); });
    P.blob(64, 192, 52, 50, 'rgba(60,20,24,.45)', 0.9); P.blob(50, 210, 20, 16, 'rgba(40,10,14,.45)', 0.5); // old paan spit stains, low in the corner
    // window on the wall at slot C (z -10.0..-11.2)
    const z = -10.6, wx = -3.48;
    K.box(0.12, 1.25, 1.1, 0x2a1e16, wx + 0.06, 1.55, z); K.box(0.2, 0.06, 1.2, 0x3a2a1e, wx + 0.1, 0.92, z);
    K.decal(0.9, 0.9, tShut, wx + 0.125, 1.6, z, 0, Math.PI / 2, 0);
    for (let i = 0; i < 6; i++) K.cyl(0.008, 0.008, 0.95, 0x141414, wx + 0.15, 1.6, z - 0.4 + i * 0.16, 5);
    K.decal(0.72, 0.36, tBoard, wx + 0.16, 1.27, z + 0.02, 0, Math.PI / 2, 0.06);
    K.box(0.025, 0.95, 0.025, 0x3a3a38, -2.88, 0.47, -10.08); K.box(0.025, 0.95, 0.025, 0x3a3a38, -2.88, 0.47, -11.12); K.box(0.02, 0.02, 1.06, 0x4a4a46, -2.88, 0.94, -10.6); K.box(0.02, 0.02, 1.06, 0x3a3a38, -2.88, 0.55, -10.6);
    K.wall(1.0, 1.0, tStain, 0.5, -11.0);
    // the hanging sign (perpendicular to the wall, readable down the platform), crooked
    const sx = -2.55, sy = 3.15, sz = -16.6, tilt = 0.12;
    K.box(1.02, 0.34, 0.03, 0x1a1414, sx, sy, sz, 0, 0, tilt);
    K.decal(0.96, 0.3, tSign, sx, sy, sz + 0.017, 0, 0, tilt); K.decal(0.96, 0.3, tSign, sx, sy, sz - 0.017, 0, Math.PI, -tilt);
    K.box(0.01, 0.95, 0.01, 0x222222, sx - 0.42, 3.75, sz); K.box(0.01, 0.8, 0.01, 0x222222, sx + 0.42, 3.8, sz);
    K.solid(-3.5, -3.28, -11.2, -10.0); K.solid(-2.92, -2.84, -11.15, -10.05, 0.95);
    return {};
  },
  // PF 6 — the dead garden: cracked clay pots of dead plants, dry leaves, a soot-black oil-lamp niche with a withered marigold garland, mould
  (K, P) => {
    const tLeaves = [0, 0, 128, 128], tMould = [128, 0, 128, 128], tSoot = [0, 128, 64, 96];
    P.clip(tLeaves, (x, y, w, h) => { const g = P.g; for (let i = 0; i < 34; i++) { g.save(); g.translate(x + 8 + P.R() * (w - 16), y + 8 + P.R() * (h - 16)); g.rotate(P.R() * 6.3); g.fillStyle = `rgba(${70 + P.R() * 50 | 0},${44 + P.R() * 24 | 0},${18 + P.R() * 12 | 0},.9)`; g.beginPath(); g.ellipse(0, 0, 3 + P.R() * 3, 7 + P.R() * 4, 0, 0, 7); g.fill(); g.restore(); } });
    P.clip(tMould, (x, y, w, h) => { for (let i = 0; i < 26; i++) P.blob(x + P.R() * w, y + P.R() * h, 8 + P.R() * 22, 6 + P.R() * 16, `rgba(${14 + P.R() * 14 | 0},${34 + P.R() * 20 | 0},${22 + P.R() * 10 | 0},.6)`, 0.8); });
    P.clip(tSoot, (x, y, w, h) => { const gr = P.g.createLinearGradient(0, y + h, 0, y); gr.addColorStop(0, 'rgba(10,8,6,.0)'); gr.addColorStop(0.3, 'rgba(10,8,6,.75)'); gr.addColorStop(1, 'rgba(10,8,6,0)'); P.g.fillStyle = gr; P.g.fillRect(x + 8, y, w - 16, h); });
    const pot = (x, z, s, tip) => { const c = 0x8a4a28; K.cyl(0.16 * s, 0.11 * s, 0.3 * s, c, x, 0.15 * s, z, 10, tip, 0, tip * 0.5); K.torus(0.16 * s, 0.018, 0x5a2e18, x, 0.3 * s, z, Math.PI / 2 + tip, 0, 0);
      if (!tip) { K.cyl(0.14 * s, 0.14 * s, 0.01, 0x241a12, x, 0.28 * s, z, 8);
        for (let k = 0; k < 4; k++) { const a = k * 1.7 + x * 3, l = 0.35 + (k % 2) * 0.2; K.cyl(0.006, 0.008, l, 0x3e2e1a, x + Math.sin(a) * 0.05, 0.28 * s + l / 2 * 0.9, z + Math.cos(a) * 0.05, 4, Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5);
          K.box(0.05, 0.004, 0.025, 0x4a3818, x + Math.sin(a) * (0.05 + l * 0.35), 0.28 * s + l * 0.7, z + Math.cos(a) * (0.05 + l * 0.35), 0.6, a, 0.9); } } };
    pot(-3.18, -21.42, 1.35, 0); pot(-3.22, -21.85, 1.55, 0); pot(-2.95, -22.16, 1.2, 1.25); pot(-3.22, -32.62, 1.45, 0); pot(-3.2, -33.05, 1.1, 0);
    K.box(0.15, 0.1, 0.12, 0x5a2e18, -2.7, 0.05, -21.95, 0.3, 0.6, 0.2); K.box(0.1, 0.08, 0.09, 0x6e3a20, -2.78, 0.04, -22.28, 0.1, 1.2, 0.5); // shards (clear of the cooler, whose blood leak is an anomaly)
    K.floor(1.0, 0.8, tLeaves, -2.95, -21.55, 0); K.floor(1.0, 1.0, tLeaves, -2.9, -32.8, 1.7); K.floor(0.9, 0.9, tLeaves, -2.9, 1.0, 2.6);
    // oil-lamp niche on the wall by the entrance (slot A), soot above, burnt-out diyas, a dried garland
    const nz = 1.1, ny = 1.35;
    K.box(0.22, 0.58, 0.5, 0x5a2410, -3.39, ny, nz); K.box(0.06, 0.46, 0.38, 0x120c08, -3.29, ny, nz); K.box(0.26, 0.04, 0.54, 0x4a1e0c, -3.37, ny - 0.27, nz);
    for (const dz of [-0.12, 0.03, 0.15]) { K.cyl(0.04, 0.025, 0.03, 0x6a3a22, -3.24, ny - 0.235, nz + dz, 7); K.cyl(0.004, 0.004, 0.02, 0x0a0a0a, -3.24, ny - 0.21, nz + dz, 4); }
    for (let i = 0; i <= 12; i++) { const t = i / 12, dz = (t - 0.5) * 0.5, dy = -0.2 * Math.sin(t * Math.PI); K.ball(0.025, i % 2 ? 0x6a3a10 : 0x7a4a14, -3.25, ny + 0.27 + dy, nz + dz); }
    K.wall(0.5, 0.9, tSoot, ny + 0.55, nz);
    K.wall(1.3, 1.2, tMould, 3.4, -21.9); K.wall(1.2, 1.1, tMould, 3.5, -8.0); K.wall(1.1, 1.0, tMould, 0.35, -32.75); K.wall(1.4, 1.2, tMould, 3.5, -30.0);
    K.solid(-3.48, -2.66, -22.4, -21.2, 0.5); K.solid(-3.5, -2.96, -33.25, -32.36, 0.48); K.solid(-3.5, -3.26, 0.84, 1.36);
    return {};
  },
  // PF 7 — the dead tube: a fitting hanging by one wire with its tube snapped, glass on the floor, soot over the name board,
  // a junction box hanging open with its wires out
  (K, P) => {
    const tGlass = [0, 0, 128, 128], tSoot = [128, 0, 128, 128], tBox = [0, 128, 64, 96];
    P.clip(tGlass, (x, y, w, h) => { const g = P.g; for (let i = 0; i < 40; i++) { g.save(); g.translate(x + 64 + (P.R() - 0.5) * 110, y + 64 + (P.R() - 0.5) * 100); g.rotate(P.R() * 6.3); g.fillStyle = `rgba(210,225,220,${0.35 + P.R() * 0.4})`; g.beginPath(); g.moveTo(0, 0); g.lineTo(3 + P.R() * 7, 1); g.lineTo(1, 3 + P.R() * 6); g.fill(); g.restore(); } });
    P.clip(tSoot, (x, y, w, h) => { P.blob(x + 64, y + 80, 56, 46, 'rgba(8,6,4,.75)', 0.8); P.blob(x + 50, y + 40, 30, 30, 'rgba(8,6,4,.6)', 0.6); P.blob(x + 84, y + 34, 22, 26, 'rgba(8,6,4,.5)', 0.6); });
    P.clip(tBox, (x, y, w, h) => { const g = P.g; g.fillStyle = '#3a3a34'; g.fillRect(x, y, w, h); g.fillStyle = '#c8a018'; g.beginPath(); g.moveTo(x + 32, y + 14); g.lineTo(x + 46, y + 40); g.lineTo(x + 18, y + 40); g.fill(); P.text('!', x + 32, y + 32, 16, '#111'); P.text('खतरा', x + 32, y + 58, 13, '#c8a018', M.DEVA, 700); P.text('440 V', x + 32, y + 76, 11, '#c8a018'); P.streaks([x, y, w, h], 'rgba(90,40,10,.6)', 10, 4); });
    // the hanging fitting (over bench 1, between the tube lamps at -6 and -11 and clear of the fan, its low end at 2.69 m)
    const fx = -2.6, fz = -8.5, a = 0.95, L = 1.3;
    const top = new THREE.Vector3(fx, 3.75, fz), dir = new THREE.Vector3(0, -Math.sin(a), Math.cos(a)), mid = top.clone().addScaledVector(dir, L / 2);
    K.box(0.11, 0.05, L, 0xa8a89c, mid.x, mid.y, mid.z, a, 0, 0);
    const tm = top.clone().addScaledVector(dir, L * 0.3); K.cyl(0.022, 0.022, L * 0.55, 0x8a948e, tm.x, tm.y - 0.04, tm.z, 6, Math.PI / 2 + a, 0, 0);
    K.box(0.01, 0.45, 0.01, 0x1a1a1a, fx, 3.97, fz); // the one wire left
    const end = top.clone().addScaledVector(dir, L);
    K.cyl(0.004, 0.004, 0.5, 0x1a1a1a, end.x + 0.03, end.y - 0.22, end.z, 4, 0, 0, 0.2); K.cyl(0.004, 0.004, 0.4, 0x6a1a10, end.x - 0.03, end.y - 0.18, end.z - 0.02, 4, 0.2, 0, -0.1);
    K.box(0.012, 0.42, 0.012, 0x1a1a1a, fx, 3.95, fz + 1.05, 0.5, 0, 0); // the broken second hanger
    K.floor(1.2, 1.1, tGlass, -2.4, -7.85, 0.4); // under it
    // soot over the name board (scorch from an old short)
    K.wall(1.6, 1.3, tSoot, 3.65, -11.5); K.wall(1.0, 0.9, tSoot, 3.6, -21.8); K.wall(1.0, 0.9, tSoot, 3.6, -32.8);
    // junction box on the wall at slot D, door hanging open, wires out
    const jz = -21.9;
    K.box(0.14, 0.62, 0.46, 0x2e2e2a, -3.43, 1.75, jz); K.box(0.02, 0.6, 0.44, 0x3a3a34, -3.18, 1.75, jz + 0.36, 0, 1.1, 0);
    K.decal(0.3, 0.45, tBox, -3.18 + 0.45 * 0.012, 1.75, jz + 0.36 - 0.89 * 0.012, 0, 1.1 + Math.PI / 2, 0);
    for (let i = 0; i < 4; i++) K.cyl(0.006, 0.006, 0.6 + i * 0.12, [0x1a1a1a, 0x6a1a10, 0x1a3a6a, 0x1a1a1a][i], -3.32, 1.45 - i * 0.05, jz - 0.12 + i * 0.07, 4, 0.1 * i, 0, 0.25 - i * 0.12);
    K.box(0.3, 0.02, 0.1, 0x3a3a34, -2.95, 0.01, -21.45, 0, 0.6, 0); // a fallen cover plate
    K.solid(-3.5, -3.3, -22.15, -21.65);
    return {};
  },
  // PF 8 — cobwebs: webs in every corner and on the pillar tops, dust drifts along the wall, an abandoned rusted wheelchair facing the tracks
  (K, P) => {
    const tWeb = [0, 0, 128, 128], tDust = [128, 0, 128, 128], tWeb2 = [0, 128, 128, 128];
    const web = (t, cxr, cyr) => P.clip(t, (x, y, w, h) => { const g = P.g, cx = x + w * cxr, cy = y + h * cyr; g.strokeStyle = 'rgba(225,228,232,.7)'; g.lineWidth = 1;
      const sp = 11; for (let i = 0; i < sp; i++) { const a = i / sp * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 140, cy + Math.sin(a) * 140); g.stroke(); }
      for (let r = 8; r < 130; r += 7 + r * 0.08) { g.beginPath(); for (let i = 0; i <= sp; i++) { const a = i / sp * Math.PI * 2, rr = r * (0.93 + 0.1 * Math.sin(i * 2.1 + r)); g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.strokeStyle = `rgba(225,228,232,${0.55 - r / 400})`; g.stroke(); }
      g.fillStyle = 'rgba(210,210,210,.25)'; g.beginPath(); g.arc(cx, cy, 9, 0, 7); g.fill(); });
    web(tWeb, 0.5, 0.5); web(tWeb2, 0.42, 0.58);
    // corner webs: planes cutting the wall/roof corner at 45° (normal down and out), on the pillar tops, and hanging under the trusses
    for (const z of [0.9, -6.4, -10.6, -16.0, -21.9, -26.0, -32.8]) K.decal(0.9, 0.9, z % 2 ? tWeb : tWeb2, -3.18, 3.88, z, Math.PI / 2, Math.PI / 4, 0);
    for (const z of [-6, -14, -22, -30]) { K.decal(0.42, 0.5, tWeb2, 0.6, 3.98, z + 0.32, Math.PI / 4, 0, 0); K.decal(0.42, 0.5, tWeb, 0.6, 3.98, z - 0.32, -Math.PI / 4, Math.PI, 0); }
    for (const z of [-4, -8, -20, -28]) K.decal(0.8, 0.7, tWeb2, -3.1, 3.55, z + 0.08, 0, 0, 0); // between the truss and the wall
    for (const z of [-7.0, -10.6, -21.9, -32.8, 1.0]) K.floor(0.9, 1.4, tDust, -3.06, z, Math.PI / 2 + 0.02);
    // the wheelchair (slot D), turned toward the tracks
    const x = -2.95, z = -21.9, r = 0x4a3e34, seat = 0x2a2220;
    for (const dz of [-0.27, 0.27]) { K.torus(0.29, 0.018, r, x - 0.08, 0.3, z + dz, 0, 0, 0); K.cyl(0.03, 0.03, 0.04, 0x222222, x - 0.08, 0.3, z + dz, 6, Math.PI / 2); K.cyl(0.05, 0.05, 0.03, 0x1a1a1a, x + 0.3, 0.05, z + dz * 0.9, 8, Math.PI / 2); }
    K.box(0.42, 0.04, 0.46, seat, x + 0.08, 0.5, z); K.box(0.04, 0.42, 0.46, seat, x - 0.15, 0.76, z, 0, 0, -0.1);
    for (const dz of [-0.23, 0.23]) { K.box(0.02, 0.85, 0.02, r, x - 0.16, 0.68, z + dz, 0, 0, -0.1); K.box(0.12, 0.02, 0.02, r, x - 0.22, 1.1, z + dz); K.box(0.36, 0.02, 0.02, r, x + 0.06, 0.7, z + dz); K.box(0.02, 0.4, 0.02, r, x + 0.28, 0.3, z + dz, 0, 0, 0.35); }
    K.box(0.12, 0.02, 0.36, r, x + 0.4, 0.14, z, 0, 0, 0.2);
    K.solid(-3.32, -2.52, -22.25, -21.55, 1.1);
    return {};
  },
];

// the platform's colour code, painted (faded) on every pillar and as a stripe along the back wall: you can tell the platform at a glance
function bands(K, css) {
  const n0 = K.parts.length;
  const col = new THREE.Color(css); col.lerp(new THREE.Color(0x3a3630), 0.18);
  for (const z of [-6, -14, -22, -30]) { K.box(0.352, 0.34, 0.352, col, 0.6, 1.12, z); K.box(0.354, 0.04, 0.354, 0x1a1816, 0.6, 0.93, z); K.box(0.354, 0.04, 0.354, 0x1a1816, 0.6, 1.31, z); }
  K.box(0.006, 0.16, 41.6, col, -3.495, 3.42, -18.0); K.box(0.006, 0.035, 41.6, 0x1c1a18, -3.494, 3.32, -18.0);
  for (let i = n0; i < K.parts.length; i++) K.parts[i].kind = 'band';
}
// ---------- sound accents (procedural, quiet; played through Sound.pfAccent) ----------
const ACCENT_GAP = { drip: [1.4, 3.2], dog: [9, 18], wind: [6, 12], coo: [5, 11], clank: [7, 14], creak: [5, 10], crickets: [3, 6], sputter: [6, 12], drone: [8, 14] };

export class PFVariety {
  constructor(ch, surf) {
    this.ch = ch; this.surf = surf; this.n = -1; this.t = 0; this.nextAccent = 3;
    this.tubes = ch.lamps.filter(l => !l.noFlicker && !l.fob); // the 8 platform tube lamps (re-tinted; never a new light)
    for (const k of Object.keys(surf)) { const m = surf[k]; if (m) { m.userData.noBatch = true; m.material = m.material.clone(); } } // tinted per platform: own material, never batched
    this.base = { floor: surf.floor && surf.floor.material.color.getHex(), roof: surf.roof && surf.roof.material.color.getHex(), wall: surf.wall && surf.wall.material.color.getHex(), dado: surf.dado && surf.dado.material.color.getHex() };
    this.root = new THREE.Group(); this.root.name = 'pfVariety'; this.root.userData.noBatch = true; ch.root.add(this.root);
    this.sets = BUILD.map((f, i) => { const P = painter(1000 + i * 31), K = new Kit(P.c); const extra = f(K, P) || {}; bands(K, PF_LOOKS[i].sign.band); const g = K.finish(i); g.visible = false; this.root.add(g);
      const set = { g, solids: K.solids, parts: K.parts, extra };
      if (extra.drip) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 4), new THREE.MeshBasicMaterial({ color: 0x8a9aa0 })); d.scale.set(1, 1.6, 1); d.position.set(extra.drip.x, extra.drip.y0, extra.drip.z); d.userData.noBatch = true; g.add(d); set.drip = d; }
      return set; });
  }
  look(n) { return PF_LOOKS[Math.max(0, Math.min(8, n | 0))]; }
  sign(n) { return pfSign(Math.max(0, Math.min(8, n | 0))); }
  // switch to platform n (called from resetLoop every loop; idempotent)
  set(n) {
    n = Math.max(0, Math.min(8, n | 0)); const ch = this.ch, L = PF_LOOKS[n];
    if (n !== this.n) {
      const old = this.sets[this.n]; if (old) { old.g.visible = false; for (const s of old.solids) { const i = ch.solids.indexOf(s); if (i >= 0) ch.solids.splice(i, 1); } }
      const cur = this.sets[n]; cur.g.visible = true; for (const s of cur.solids) if (!ch.solids.includes(s)) ch.solids.push(s);
      this.n = n; this.nextAccent = 2 + Math.random() * 3;
    }
    for (const s of this.sets) if (s !== this.sets[n] && s.g.visible) s.g.visible = false;
    const c = evenColor(L.lamp); for (const l of this.tubes) { l.baseColor.copy(c); l.color.copy(c); l.apply(); }
    const S = this.surf; if (S.floor) S.floor.material.color.setHex(L.floor); if (S.roof) S.roof.material.color.setHex(L.roof); if (S.wall) S.wall.material.color.setHex(L.wall); if (S.dado) S.dado.material.color.setHex(L.dado);
    if (this.struct) this.struct.set(n); // v3.6 structure, surfaces, benches, set piece
    if (ch.hemi && !ch.dawn) ch.hemi.color.setHex(L.hemi);
    ch.fogColor = L.fog; const E = ch.game.engine;
    if (!ch.dawn && ch.root.parent === E.scene) { E.scene.fog.color.setHex(L.fog); if (E.scene.background && E.scene.background.isColor) E.scene.background.setHex(L.fog); }
  }
  update(dt, p, G) {
    const set = this.sets[this.n]; if (!set) return; this.t += dt;
    if (set.drip) { const d = set.extra.drip, k = (this.t % 1.7) / 1.1; set.drip.visible = k < 1; set.drip.position.y = d.y0 - (d.y0 - d.y1) * k * k; }
    const ch = this.ch, S = G && G.sound; if (!S) return;
    // v3.7: the platform's own looping ambience bed + its recurring sounds (audio.js PF_BEDS) replaces the v3.4 single accent;
    // silent at dawn and while the blackout scare holds the lights out (the bed fades out by itself when this stops being called)
    if (S.pfBed) { if (ch.dawn || (ch.flags && ch.flags.bo) || G.state === 'ending') S.pfBed(-1, dt); else S.pfBed(this.n, dt); return; }
    if (!S.pfAccent || ch.dawn || (ch.flags && ch.flags.bo)) return;
    this.nextAccent -= dt; if (this.nextAccent > 0) return;
    const kind = PF_LOOKS[this.n].sound, gap = ACCENT_GAP[kind] || [6, 12]; this.nextAccent = gap[0] + Math.random() * (gap[1] - gap[0]);
    const pan = kind === 'dog' || kind === 'crickets' || kind === 'drone' ? 0.6 : -0.45; S.pfAccent(kind, pan);
  }
}
