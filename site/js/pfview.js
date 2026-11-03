// PLATFORM 0 v3.6.1 — platforms you can tell apart AT A GLANCE from the spawn view (Chapter 1).
// v3.6 rebuilt every platform, but from where you spawn they still read as one scene in nine tints: the set pieces stood 20-30 m away
// in the fog, the sky was black, and the waiting room, lamp and pillar framed every shot the same way. This layer adds, per PF 0..8:
//  · a night sky of its own (one dome, its canvas repainted on the loop change: overcast, moon, stars, smog glow, mist, embers…), so
//    roof holes and everything beyond the far wall read as SILHOUETTES (unlit, fog-free, behind everything; no light is added)
//  · one huge set piece across the tracks, IN VIEW FROM SPAWN (z -2..-20), with a baked moon wash and a thinner fog, so its shape
//    carries 20 m: a tenement, a moonlit luggage mountain, a lattice footbridge, a banyan, a water tower, an island platform with its
//    own roof, an overgrown bank, a burnt carriage, a signal gantry
//  · its own waiting-room silhouette (an upper storey, a lean-to and luggage, boarded up, swallowed by roots, a tin gable, rolling
//    shutters, ivy, burnt out, a timber gable with fretwork) — dressing only: the room's walls, door, window, sign, solids and
//    everything inside (hide spot, diary, clocks, Room-0 numbers) are untouched
//  · its own roof edge (valance, hanging sheets, vines, fascia, iron brackets) and a bolder floor (pftex.js)
// Rules kept: nothing in the train's envelope (x 3.75..6.86, y < 3.6), nothing on the pit by the platform (x < 7 below y 3.6), nothing
// in the walking lane (x > -2.45, y < 2.4), nothing on an anomaly object; deterministic per PF; one merged mesh per kind.
import * as THREE from './three.module.min.js';
import { rngOf } from './pfvariety.js';

const _v = new THREE.Vector3(), _u = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _Y = new THREE.Vector3(0, 1, 0);
function line(K, x0, y0, z0, x1, y1, z1, t, c, round = false) {
  _v.set(x1 - x0, y1 - y0, z1 - z0); const L = _v.length(); if (L < 1e-4) return;
  _q.setFromUnitVectors(_Y, _u.copy(_v).normalize()); _e.setFromQuaternion(_q);
  const g = round ? new THREE.CylinderGeometry(t / 2, t / 2, L, 5) : new THREE.BoxGeometry(t, L, t);
  K.put(g, c, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, _e.x, _e.y, _e.z);
}
// a lattice girder side in the plane z = zz from x0 to x1, bottom y0, height h, panel width p
function lattice(K, x0, x1, y0, h, zz, p, t, c) { K.box(x1 - x0, t * 1.6, t * 1.6, c, (x0 + x1) / 2, y0, zz); K.box(x1 - x0, t * 1.6, t * 1.6, c, (x0 + x1) / 2, y0 + h, zz);
  for (let x = x0, i = 0; x < x1 - 1e-3; x += p, i++) { const xe = Math.min(x1, x + p); line(K, x, y0, zz, x, y0 + h, zz, t, c); line(K, i % 2 ? x : xe, y0, zz, i % 2 ? xe : x, y0 + h, zz, t, c); } line(K, x1, y0, zz, x1, y0 + h, zz, t, c); }

// ---------- materials: baked (unlit) far geometry with a thinner fog, and the sky dome ----------
export function thinFog(mat, k = 0.42) { // fog density x k for this material only (the set piece stays a shape at 20 m; everything else is unchanged)
  mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('fogDensity * fogDensity * vFogDepth * vFogDepth', `fogDensity * fogDensity * ${(k * k).toFixed(4)} * vFogDepth * vFogDepth`); };
  mat.customProgramCacheKey = () => 'thinFog' + k; return mat;
}
// baked light: a cold wash from above and from the platform side (no realtime light); `glow` parts are taken as they are
export function bake(geo, tint, gain, from = 0) {
  const C = geo.attributes.color, N = geo.attributes.normal, t = new THREE.Color(tint);
  for (let i = from; i < C.count; i++) { const ny = N.getY(i), nx = N.getX(i), k = gain * (0.14 + 0.36 * Math.max(0, ny) + 0.46 * Math.max(0, -nx) + 0.12 * Math.abs(N.getZ(i)));
    C.setXYZ(i, C.getX(i) * t.r * k, C.getY(i) * t.g * k, C.getZ(i) * t.b * k); }
  C.needsUpdate = true;
}
// the sky: part of a dome (phi 0.36..0.92 of a turn: from across the tracks round to the far end and a little past), painted per PF
export const SKY = { r: 70, cx: 1, cy: -2, cz: -16, phi0: Math.PI * 2 * 0.36, phiLen: Math.PI * 2 * 0.56, thLen: Math.PI / 2 + 0.12, W: 1024, H: 256 };
export function skyMesh() {
  const g = new THREE.SphereGeometry(SKY.r, 28, 9, SKY.phi0, SKY.phiLen, 0, SKY.thLen);
  const c = document.createElement('canvas'); c.width = SKY.W; c.height = SKY.H; const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 1; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.position.set(SKY.cx, SKY.cy, SKY.cz); m.raycast = () => {}; /* never a collider / pick target (camera, solids, tests) */ m.userData.noAO = true; m.userData.noClip = true; m.renderOrder = -50; m.frustumCulled = false; m.userData.noBatch = true; m.userData.canvas = c; m.name = 'pfSky'; return m;
}
// canvas x for a world direction (azimuth from the dome centre); y for an elevation in degrees
const skyX = (u) => (u - 0.36) / 0.56 * SKY.W; // u = phi / 2pi: 0.5 = across the tracks (+x), 0.75 = down the platform (-z)
const skyY = (deg) => SKY.H * ((90 - deg) * Math.PI / 180) / SKY.thLen;
function grad(g, stops) { const gr = g.createLinearGradient(0, 0, 0, SKY.H); for (const [a, col] of stops) gr.addColorStop(a, col); g.fillStyle = gr; g.fillRect(0, 0, SKY.W, SKY.H); }
const hz = () => skyY(0); // the horizon row
function clouds(g, R, n, y0, y1, col, rx = [40, 120], ry = [6, 18]) { g.fillStyle = col; for (let i = 0; i < n; i++) { g.beginPath(); g.ellipse(R() * SKY.W, y0 + R() * (y1 - y0), rx[0] + R() * (rx[1] - rx[0]), ry[0] + R() * (ry[1] - ry[0]), 0, 0, 7); g.fill(); } }
function stars(g, R, n, a = 0.7) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(210,215,230,${a * (0.3 + R() * 0.7)})`; const s = R() < 0.1 ? 1.6 : 1; g.fillRect(R() * SKY.W, R() * hz() * 0.92, s, s); } }
function moon(g, x, y, r, col, halo) { const gr = g.createRadialGradient(x, y, r * 0.8, x, y, r * 5); gr.addColorStop(0, halo); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r * 5, y - r * 5, r * 10, r * 10); g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
// a painted distant skyline (dark against the sky), standing on the horizon
function skyline(g, R, kind, col) {
  g.fillStyle = col; const H0 = hz() + 4;
  if (kind === 'blocks') { for (let x = 0; x < SKY.W;) { const w = 18 + R() * 50, h = 6 + R() * 26; g.fillRect(x, H0 - h, w, h + 8); if (R() < 0.3) g.fillRect(x + w * 0.3, H0 - h - 8, 4, 8); x += w + R() * 6; } }
  if (kind === 'trees') { for (let x = 0; x < SKY.W; x += 6) { const h = 8 + 10 * Math.abs(Math.sin(x * 0.013)) + R() * 6; g.beginPath(); g.ellipse(x, H0 - h * 0.6, 10 + R() * 8, h * 0.7, 0, 0, 7); g.fill(); } g.fillRect(0, H0 - 6, SKY.W, 12); }
  if (kind === 'hills') { g.beginPath(); g.moveTo(0, SKY.H); for (let x = 0; x <= SKY.W; x += 8) g.lineTo(x, H0 - 10 - 14 * Math.sin(x * 0.006 + 1) - 6 * Math.sin(x * 0.021)); g.lineTo(SKY.W, SKY.H); g.fill(); }
  if (kind === 'chimneys') { g.fillRect(0, H0 - 8, SKY.W, 14); for (const [x, h, w] of [[300, 46, 7], [338, 36, 6], [560, 52, 8], [760, 30, 6]]) { g.fillRect(x, H0 - h, w, h); g.fillRect(x - 14, H0 - 18, 40, 18); } }
  if (kind === 'pylons') { g.fillRect(0, H0 - 4, SKY.W, 10); g.strokeStyle = col; g.lineWidth = 1.2; for (const x of [180, 420, 660, 900]) { g.beginPath(); g.moveTo(x - 9, H0); g.lineTo(x, H0 - 40); g.lineTo(x + 9, H0); g.moveTo(x - 12, H0 - 30); g.lineTo(x + 12, H0 - 30); g.moveTo(x - 9, H0 - 22); g.lineTo(x + 9, H0 - 22); g.stroke(); }
    g.lineWidth = 0.8; for (const dy of [30, 22]) { g.beginPath(); for (const [a, b] of [[180, 420], [420, 660], [660, 900]]) { g.moveTo(a + 12, H0 - dy); g.quadraticCurveTo((a + b) / 2, H0 - dy + 8, b - 12, H0 - dy); } g.stroke(); } }
  if (kind === 'temple') { g.fillRect(0, H0 - 6, SKY.W, 12); const x = 520; g.beginPath(); g.moveTo(x - 30, H0); g.lineTo(x - 22, H0 - 30); g.quadraticCurveTo(x, H0 - 70, x + 22, H0 - 30); g.lineTo(x + 30, H0); g.fill(); g.fillRect(x - 1, H0 - 80, 2, 12); }
}
// per PF: [base gradient stops, painter]; every sky stays a night sky with its darkest at the zenith (no sky outshines the platform)
const SKIES = [
  (g, R) => { grad(g, [[0, '#050607'], [0.55, '#0c0f10'], [0.9, '#1d2324'], [0.93, '#232a2a'], [1, '#0c0e0e']]); clouds(g, R, 70, hz() * 0.45, hz() * 0.95, 'rgba(36,44,44,.55)', [60, 160], [8, 20]); skyline(g, R, 'blocks', '#07090a'); }, // PF0 low overcast over the city, a lid of grey cloud
  (g, R) => { grad(g, [[0, '#030406'], [0.7, '#0a0d14'], [0.93, '#141a24'], [1, '#08090c']]); stars(g, R, 60, 0.5); moon(g, skyX(0.69), skyY(7), 15, '#a8aca8', 'rgba(110,120,130,.34)'); clouds(g, R, 6, skyY(9), skyY(5), 'rgba(10,12,16,.75)', [40, 90], [2, 4]); skyline(g, R, 'hills', '#06070a'); }, // PF1 a big low moon behind thin cloud
  (g, R) => { grad(g, [[0, '#020304'], [0.85, '#070a10'], [0.93, '#0e1420'], [1, '#05060a']]); stars(g, R, 520, 0.85); skyline(g, R, 'pylons', '#020304'); }, // PF2 clear, black, full of stars; pylons on the horizon
  (g, R) => { grad(g, [[0, '#060807'], [0.6, '#121a14'], [0.9, '#26302a'], [0.93, '#2a332c'], [1, '#101410']]); clouds(g, R, 40, hz() * 0.7, hz() * 0.98, 'rgba(44,54,46,.5)', [80, 200], [6, 14]); skyline(g, R, 'trees', '#050706'); }, // PF3 green ground mist, a treeline
  (g, R) => { grad(g, [[0, '#060403'], [0.6, '#150d08'], [0.88, '#3a2414'], [0.93, '#4a2e18'], [1, '#140c06']]); clouds(g, R, 30, hz() * 0.6, hz() * 0.95, 'rgba(70,44,24,.45)', [80, 200], [6, 16]); skyline(g, R, 'chimneys', '#080504'); }, // PF4 sodium smog over the mills
  (g, R) => { grad(g, [[0, '#030305'], [0.8, '#0a0912'], [0.93, '#14111e'], [1, '#07060a']]); stars(g, R, 120, 0.5); moon(g, skyX(0.66), skyY(9), 9, '#a8a6b4', 'rgba(90,80,120,.25)'); g.fillStyle = '#0a0912'; g.beginPath(); g.arc(skyX(0.66) + 5, skyY(9) - 3, 9, 0, 7); g.fill(); skyline(g, R, 'temple', '#040306'); }, // PF5 a thin crescent, a temple spire
  (g, R) => { grad(g, [[0, '#040605'], [0.62, '#0e1614'], [0.86, '#2e3c38'], [0.93, '#34423e'], [1, '#0e1412']]); clouds(g, R, 50, hz() * 0.62, hz() * 0.95, 'rgba(56,72,66,.4)', [100, 220], [5, 12]); clouds(g, R, 30, hz() * 0.15, hz() * 0.6, 'rgba(40,52,48,.45)', [80, 200], [10, 24]); skyline(g, R, 'hills', '#060908'); }, // PF6 pale valley mist behind the bank
  (g, R) => { grad(g, [[0, '#030202'], [0.6, '#0c0706'], [0.9, '#2a1410'], [0.93, '#3a1a12'], [1, '#100806']]); clouds(g, R, 60, hz() * 0.2, hz() * 0.9, 'rgba(4,3,3,.6)', [60, 180], [10, 26]); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(200,${70 + R() * 40},30,${0.25 + R() * 0.4})`; g.fillRect(R() * SKY.W, hz() * (0.5 + R() * 0.45), 1.4, 1.4); } skyline(g, R, 'blocks', '#050303'); }, // PF7 smoke and embers
  (g, R) => { grad(g, [[0, '#030507'], [0.5, '#0b1219'], [0.88, '#1e2a36'], [0.93, '#24303c'], [1, '#0a0e12']]); clouds(g, R, 34, hz() * 0.1, hz() * 0.85, 'rgba(44,60,76,.6)', [120, 260], [12, 26]); clouds(g, R, 30, hz() * 0.25, hz() * 0.85, 'rgba(6,9,12,.5)', [60, 140], [8, 16]); skyline(g, R, 'pylons', '#04060a'); }, // PF8 a cold, broken sky over the yard
];
export function paintSky(mesh, n) { const c = mesh.userData.canvas, g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); SKIES[n](g, rngOf(7100 + n * 31));
  const fade = (x0, x1, a0, a1) => { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, `rgba(7,9,10,${a0})`); gr.addColorStop(1, `rgba(7,9,10,${a1})`); g.fillStyle = gr; g.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), SKY.H); };
  fade(0, 60, 1, 0); fade(SKY.W - 60, SKY.W, 0, 1); // the painted part fades into the fog colour at both ends
  mesh.material.map.needsUpdate = true; }

// ---------- the big set piece across the tracks, in view from spawn (baked; G = parts that keep their own colour) ----------
export const FAR_TINT = [0x9aa4a6, 0xa8b0c4, 0x9aa6c0, 0x98a890, 0xc8a47c, 0xa49cbc, 0x9cb0a8, 0xa49a94, 0x98a6b8];
export const FAR_GAIN = [2.7, 2.6, 3.4, 2.4, 3.0, 2.6, 2.6, 1.8, 2.4];
export function viewFar(K, G, n) {
  const R = rngOf(4200 + n * 17);
  switch (n) {
    case 0: { // a derelict chawl right behind the far wall: four storeys of black windows and broken balconies, two windows faintly lit
      const x0 = 10.2, c = 0x6e6a60; K.box(6, 11.5, 26, c, x0 + 3, 4.55, -11); // face at x 10.2
      for (let f = 0; f < 4; f++) { const y = 0.9 + f * 2.8;
        K.box(1.0, 0.12, 26, 0x7a766c, x0 - 0.5, y - 0.95, -11); // the balcony slab
        for (let z = 1.0; z > -23.5; z -= 0.45) if (R() < 0.82) K.box(0.03, 0.8, 0.03, 0x3a3832, x0 - 0.98, y - 0.5, z); // railings, some gone
        K.box(0.04, 0.05, 26, 0x3a3832, x0 - 0.98, y - 0.12, -11);
        for (let z = 0.2, i = 0; z > -22.5; z -= 2.3, i++) { const lit = (f === 2 && i === 3) || (f === 1 && i === 7) || (f === 3 && i === 1);
          (lit ? G : K).box(0.06, 1.25, 0.9, lit ? 0x2e2410 : 0x060606, x0 - 0.02, y + 0.45, z);
          if (!lit && R() < 0.3) K.box(0.05, 1.25, 0.12, 0x2a2824, x0 - 0.05, y + 0.45, z + 0.3); } // a hanging shutter
        if (f < 3) for (let i = 0; i < 4; i++) { const z = -1 - R() * 21; line(K, x0 - 0.9, y + 1.3, z, x0 - 0.9, y + 1.3, z - 2.0, 0.02, 0x2a2824); K.box(0.02, 0.5 + R() * 0.4, 0.5, R() < 0.5 ? 0x5a5448 : 0x3e3a34, x0 - 0.9, y + 0.95, z - 0.6 - R()); } } // washing lines, rags
      for (const z of [-3, -14]) { K.cyl(0.6, 0.6, 1.2, 0x3a3a36, x0 + 1.5, 11, z, 10); } K.box(0.18, 11, 0.18, 0x2e2c28, x0 - 0.12, 4.3, -6.5); // tanks on the roof, a drain pipe
      break; }
    case 1: { // a mountain of overturned parcel carts, trunks and sacks right across from you, under the moon
      for (let i = 0; i < 46; i++) { const x = 7.9 + R() * 1.4, z = -2.5 - R() * 10, peak = 1 - Math.abs(z + 7) / 5.5, y = -1.0 + Math.max(0, peak) * 4.3 * (0.4 + 0.6 * R()) + R() * 0.4, k = R();
        if (k < 0.35) { K.box(0.7, 0.06, 1.2, 0x5e4836, x, y, z, R() * 1.4, R() * 3, R() * 1.4); K.cyl(0.18, 0.18, 0.06, 0x2a221c, x + 0.3, y - 0.12, z, 10, 0, 0, Math.PI / 2 + R()); }
        else if (k < 0.75) K.box(0.9 + R() * 0.4, 0.5, 0.6, R() < 0.5 ? 0x46525a : 0x5a3e2a, x, y, z, R() * 0.6, R() * 3, R() * 0.6); else K.ball(0.4, 0x7a6c48, x, y, z, 1.2, 0.7, 1, R(), R(), 0); }
      K.box(2.2, 0.4, 12, 0x2a2420, 8.4, -1.0, -7.5); for (const z of [-4, -10.5]) { K.box(0.08, 2.4, 0.08, 0x3a2a20, 8.2, 4.4 + (z + 4) * 0.02, z, 0, 0, 0.5); } // two cart handles stabbing the sky
      break; }
    case 2: { // a steel lattice footbridge crossing high over the tracks just ahead, its roof, its stair dropping beyond the far wall
      const c = 0x3a4448, y = 5.0, z0 = -8.0, z1 = -10.4, zc = (z0 + z1) / 2;
      K.box(9.2, 0.3, 2.4, c, 7.2, y, zc); for (const zz of [z0, z1]) lattice(K, 2.6, 11.8, y + 0.15, 1.5, zz, 0.75, 0.07, c);
      K.box(9.4, 0.08, 2.9, 0x2a3034, 7.2, y + 2.25, zc, 0.06, 0, 0); for (let x = 2.8; x < 11.8; x += 1.5) { K.box(0.06, 0.6, 0.06, c, x, y + 1.95, z0); K.box(0.06, 0.6, 0.06, c, x, y + 1.95, z1); }
      for (const zz of [z0 + 0.1, z1 - 0.1]) { K.box(0.3, y + 1.2, 0.3, c, 11.8, (y - 1.2) / 2, zz); K.box(0.3, y + 1.2, 0.3, c, 7.4, (y - 1.2) / 2 + 0, zz); }
      for (let i = 0; i < 16; i++) K.box(1.2, 0.08, 0.34, 0x30383c, 12.6, y - i * 0.36, zc - 1.4 - i * 0.3); lattice(K, 12.0, 13.2, 0, 0.1, zc - 1.3, 1.2, 0.05, c);
      line(K, 12.0, y + 1.0, zc - 1.3, 12.0, y - 5.0, zc - 6.3, 0.07, c); line(K, 13.2, y + 1.0, zc - 1.3, 13.2, y - 5.0, zc - 6.3, 0.07, c);
      break; }
    case 3: { // a banyan as big as the station: its trunk beyond the far wall, a black canopy over the tracks, a curtain of roots
      K.cyl(1.1, 1.7, 9, 0x4a4030, 11.2, 3.3, -9, 10); for (let i = 0; i < 7; i++) line(K, 11.2, 4.5 + i * 0.5, -9, 7.0 + R() * 3, 6.4 + R() * 1.4, -1 - R() * 18, 0.35, 0x4a4030);
      for (let i = 0; i < 26; i++) K.ball(1.5 + R() * 1.3, R() < 0.5 ? 0x22301c : 0x2a3620, 6.8 + R() * 6.5, 6.6 + R() * 2.4, 0 - R() * 21, 1.4, 0.55, 1.2);
      for (let i = 0; i < 70; i++) { const x = 7.2 + R() * 2.4, z = 0.5 - R() * 20, top = 5.6 + R() * 0.8, bot = -1.2 + R() * 3.6; K.cyl(0.03 + R() * 0.05, 0.02, top - bot, R() < 0.5 ? 0x3a3024 : 0x2a241c, x, (top + bot) / 2, z, 4); }
      break; }
    case 4: { // a rusted water tower right across from you, its tank against the smog
      const c = 0x5a4030, x = 8.4, z = -12.5, yt = 4.6; for (const [dx, dz] of [[-1.0, -1.0], [1.0, -1.0], [-1.0, 1.0], [1.0, 1.0]]) K.cyl(0.1, 0.14, yt + 1.2, c, x + dx, (yt - 1.2) / 2, z + dz, 8);
      for (const y of [0.2, 2.4, 4.4]) { K.box(2.1, 0.1, 0.1, c, x, y, z - 1.0); K.box(2.1, 0.1, 0.1, c, x, y, z + 1.0); K.box(0.1, 0.1, 2.1, c, x - 1.0, y, z); K.box(0.1, 0.1, 2.1, c, x + 1.0, y, z); }
      for (const s of [-1, 1]) { line(K, x - 1.0, 0.2, z + s, x + 1.0, 2.4, z + s, 0.06, c); line(K, x - 1.0, 2.4, z + s, x + 1.0, 4.4, z + s, 0.06, c); line(K, x - s, 0.2, z - 1, x - s, 2.4, z + 1, 0.06, c); }
      K.cyl(1.75, 1.75, 2.8, 0x6a4c38, x, yt + 1.4, z, 18); K.cyl(0.25, 1.85, 0.9, 0x5a4232, x, yt + 3.25, z, 18); K.cyl(0.2, 0.2, 0.4, c, x, yt + 3.9, z, 8);
      for (const y of [yt + 0.1, yt + 1.4, yt + 2.7]) K.put(new THREE.TorusGeometry(1.77, 0.05, 4, 24), 0x3e2c20, x, y, z, Math.PI / 2);
      for (let y = 3.8; y < yt + 2.8; y += 0.34) K.box(0.05, 0.05, 0.5, c, x - 1.86, y, z + 0.6); for (const dz of [0.35, 0.85]) K.box(0.05, yt + 3.0 - 3.7, 0.05, c, x - 1.86, (yt + 3.0 + 3.7) / 2, z + dz); // the ladder starts high (no climbing)
      K.cyl(0.16, 0.16, yt + 1.4, 0x3e2c20, x + 0.6, (yt - 1.4) / 2 + 0.2, z - 0.4, 8); for (let k = 0; k < 6; k++) { const h = 0.5 + k * 0.3; K.box(0.04, h, 0.03, 0x3a2416, x - 1.74 + k * 0.03, yt + 2.7 - h / 2, z - 1.0 + k * 0.4); } // rust streaks down the tank
      break; }
    case 5: { // a dead island platform across the tracks, with its own roof: a deep fretwork valance, a dead hoarding on top
      K.box(2.5, 1.2, 30, 0x5a5650, 8.4, -0.6, -13); K.box(0.12, 0.03, 30, 0x7a6a3a, 7.22, 0.02, -13);
      for (let i = 0; i < 6; i++) { const z = -1.5 - i * 4.4; K.box(1.6, 2.3, 3.6, 0x4e4a44, 8.8, 1.15, z); K.box(0.05, 1.9, 3.2, 0x6a6e72, 7.98, 1.0, z); for (let y = 0.1; y < 1.95; y += 0.12) K.box(0.03, 0.03, 3.2, 0x34383c, 7.95, y, z); }
      for (let z = 1.0; z > -28.5; z -= 4.4) K.cyl(0.07, 0.07, 3.0, 0x3a3630, 7.4, 1.5, z, 6);
      K.box(2.6, 0.1, 30, 0x5a544a, 8.45, 3.3, -13, 0, 0, -0.2); K.box(0.06, 0.6, 30, 0x4a4238, 7.2, 2.95, -13);
      for (let z = 2.0; z > -28; z -= 0.3) K.box(0.05, 0.28, 0.16, 0x4a4238, 7.2, 2.55, z, 0, 0, 0); // the valance's teeth
      K.box(0.2, 2.6, 7, 0x2e2a26, 8.8, 5.0, -7.5); K.box(0.15, 2.2, 6.6, 0x4a463e, 8.68, 5.0, -7.5); K.box(0.12, 1.0, 2.6, 0x2a2622, 8.6, 5.3, -6.3, 0.3, 0, 0); // a dead hoarding, half its panel torn away
      for (const z of [-5, -10]) K.box(0.12, 2.6, 0.12, 0x2e2a26, 8.9, 3.4, z);
      break; }
    case 6: { // the far side has gone back to the jungle: a bank rising behind the wall, and a huge dead tree reaching over the tracks
      const ang = Math.atan2(7.5, 8); K.put(new THREE.BoxGeometry(11, 0.4, 50), 0x2e2e22, 13.6, 6.6, -16, 0, 0, ang);
      for (let i = 0; i < 90; i++) { const x = 9.7 + R() * 7, z = 4 - R() * 40, y = 3.0 + (x - 9.6) * 7.5 / 8, h = 0.6 + R() * 1.4; K.cyl(0, 0.12 + R() * 0.2, h, R() < 0.5 ? 0x26301c : 0x3a3a24, x, y + h / 2, z, 4); }
      const tx = 8.0, tz = -10, tree = (x, y, z, dx, dy, dz, r, d) => { const x2 = x + dx, y2 = y + dy, z2 = z + dz; line(K, x, y, z, x2, y2, z2, r, 0x3e362a); if (d > 0) for (let k = 0; k < 2 + (d > 1 ? 1 : 0); k++) tree(x2, y2, z2, dx * 0.62 + (R() - 0.5) * 1.6, dy * 0.6 + R() * 0.5, dz * 0.62 + (R() - 0.5) * 1.8, r * 0.62, d - 1); };
      K.cyl(0.45, 0.7, 5.5, 0x3e362a, tx + 0.3, 1.55, tz, 7); tree(tx + 0.3, 4.1, tz, -1.4, 1.8, 1.6, 0.36, 3); tree(tx + 0.3, 4.1, tz, -1.6, 1.6, -1.8, 0.34, 3); tree(tx + 0.3, 4.1, tz, 0.6, 2.4, 0.2, 0.36, 3);
      for (const z of [-2, -20]) K.box(0.16, 6.5, 0.16, 0x3a3226, 10.2, 3.6, z, 0, 0, 0.2);
      break; }
    case 7: { // a burnt-out carriage on a siding right across from you: black window holes, a roof eaten through
      const x = 8.2, z = -10, L = 15, c = 0x3a302a; K.box(2.2, 0.7, L + 2, 0x2e2622, x + 0.1, -0.9, z); // the ballast mound
      K.box(2.3, 3.0, L, c, x, 1.0, z); K.box(2.4, 0.18, L + 0.1, 0x2e221c, x, 2.55, z); K.box(2.0, 0.25, L - 0.6, 0x3a2a22, x, 2.75, z);
      for (let k = 0; k < 10; k++) { const zz = z + L / 2 - 1.0 - k * 1.45; K.box(0.06, 0.85, 0.95, 0x050505, x - 1.16, 1.35, zz); K.box(0.05, 0.1, 1.05, 0x2a1e18, x - 1.16, 0.88, zz); }
      for (const zz of [z + L / 2 - 0.4, z - L / 2 + 0.4]) K.box(0.06, 2.2, 0.9, 0x070606, x - 1.16, 0.9, zz);
      for (const s of [-1, 1]) K.box(2.2, 2.9, 0.1, 0x3a2a22, x, 1.0, z + s * (L / 2 + 0.03));
      for (let i = 0; i < 7; i++) { const zz = z - L / 2 + 1 + R() * (L - 2); K.box(0.4 + R() * 0.6, 0.06, 0.8 + R(), 0x1e1612, x - 0.3 + R() * 0.6, 2.9, zz, R() * 0.6, 0, R() * 0.8 - 0.4); } // roof sheets curled up
      for (let k = 0; k < 4; k++) K.cyl(0.42, 0.42, 0.12, 0x1e1a18, x - 1.0, -0.55, z - 5 + k * 3.4, 12, 0, 0, Math.PI / 2);
      for (let i = 0; i < 14; i++) K.box(0.02, 0.6 + R() * 1.4, 0.15 + R() * 0.2, 0x0e0a08, x - 1.17, 1.8 + R() * 0.5, z - L / 2 + R() * L); // soot streaks
      break; }
    case 8: { // a signal cabin on stilts right across from you, a signal gantry over the tracks, a semaphore beyond
      const c = 0x3a3634, x = 8.3, z = -12.5, y0 = 2.4; for (const [dx, dz] of [[-1.0, -1.8], [1.0, -1.8], [-1.0, 1.8], [1.0, 1.8]]) K.box(0.2, y0 + 1.2, 0.2, c, x + dx, (y0 - 1.2) / 2, z + dz);
      for (const s of [-1, 1]) line(K, x - 1.0, -1.1, z + s * 1.8, x - 1.0, y0, z - s * 1.8, 0.07, c);
      K.box(2.3, 2.3, 4.0, 0x4e4844, x, y0 + 1.15, z); K.box(0.06, 1.0, 3.5, 0x060708, x - 1.16, y0 + 1.5, z); for (let k = -3; k <= 3; k++) K.box(0.08, 1.05, 0.05, c, x - 1.18, y0 + 1.5, z + k * 0.5);
      K.box(3.0, 0.12, 4.8, 0x2e2a26, x, y0 + 2.5, z, 0, 0, 0.18); K.box(0.8, 0.06, 1.0, c, x + 0.4, y0 - 0.05, z - 2.5); for (let i = 0; i < 9; i++) K.box(0.8, 0.05, 0.26, c, x + 0.4, y0 - 0.3 - i * 0.36, z - 3.1 - i * 0.25);
      const zg = -6.5; K.box(0.3, 6.0, 0.3, c, 7.6, 1.8, zg); lattice(K, 3.6, 7.6, 4.45, 0.55, zg, 0.5, 0.06, c); // the gantry over the track (above the train)
      for (const xs of [4.4, 5.3, 6.2]) { K.box(0.45, 0.8, 0.3, 0x1e1e1e, xs, 4.0, zg + 0.1); for (const dy of [0.22, -0.04, -0.3]) G.box(0.18, 0.18, 0.04, 0x0a0606, xs, 4.0 + dy, zg + 0.26); }
      K.box(0.18, 9, 0.18, c, 10.0, 3.3, -20); K.box(1.6, 0.25, 0.08, 0x5a5650, 10.0, 6.4, -20.6, 0.6, Math.PI / 2, 0); for (let y = -1; y < 7.6; y += 0.4) K.box(0.4, 0.04, 0.04, c, 10.0, y, -19.8);
      break; }
  }
}

// ---------- the waiting room's silhouette and the roof edge (lit with the platform; dressing only) ----------
// the room: x -3.5..-1.7, z -5.6..-1.9, roof slab at 2.7..2.78; door (z -4.3..-3.2) + barred window (z -5.6..-4.3) + sign on its +x face
export function viewNear(K, n) {
  const R = rngOf(5200 + n * 13), x0 = -3.5, x1 = -1.7, z0 = -5.6, z1 = -1.9, zf = z1 + 0.06; // zf: just in front of the face toward you
  switch (n) {
    case 0: { // a second storey up to the roof, two barred windows, a stained cornice
      K.box(1.9, 1.1, 3.8, 0x8a8478, -2.6, 3.33, -3.75); K.box(2.0, 0.12, 3.9, 0x5a564c, -2.6, 2.84, -3.75);
      for (const [x, z, ry] of [[-2.6, zf, 0], [x1 + 0.06, -3.0, Math.PI / 2], [x1 + 0.06, -4.6, Math.PI / 2]]) { K.box(0.7, 0.6, 0.04, 0x0a0a0a, x, 3.35, z, 0, ry, 0); for (let k = -2; k <= 2; k++) K.box(0.03, 0.62, 0.05, 0x2a2a28, x + (ry ? 0 : k * 0.14), 3.35, z + (ry ? k * 0.14 : 0.01), 0, 0, 0); }
      for (let i = 0; i < 5; i++) K.box(0.18 + R() * 0.2, 0.9 + R() * 0.4, 0.02, 0x3e3a32, -3.3 + i * 0.36, 3.2, z1 + 0.11); // damp streaks
      break; }
    case 1: { // the parcel office: an iron cage over its face, a tin lean-to over the door, lost trunks piled on its roof to the beams
      for (let x = -3.42; x <= -1.75; x += 0.14) K.box(0.025, 2.5, 0.025, 0x1a1816, x, 1.27, zf + 0.06); for (const y of [0.1, 0.9, 1.7, 2.5]) K.box(1.8, 0.05, 0.04, 0x1a1816, -2.6, y, zf + 0.07);
      K.box(0.8, 0.04, 3.9, 0x5a5040, -1.32, 2.68, -3.75, 0, 0, -0.32);
      for (let i = 0; i < 14; i++) { const x = -3.25 + R() * 1.3, z = -2.15 - R() * 3.2, y = 2.98 + R() * 0.75; K.box(0.75, 0.32 + R() * 0.15, 0.48, R() < 0.5 ? 0x3a4652 : R() < 0.5 ? 0x5a3e2a : 0x6a6050, x, y, z, R() * 0.25, R() * 3, R() * 0.25); }
      break; }
    case 2: { // boarded up: planks crossed over its face and a plank fence on its roof
      for (const s of [-1, 1]) K.box(2.4, 0.2, 0.05, 0x8a7c62, -2.6, 1.35, zf + 0.02, 0, 0, s * 0.9);
      for (const y of [0.45, 2.25]) K.box(1.9, 0.22, 0.05, 0x7a6c54, -2.6, y, zf + 0.05);
      for (let i = 0; i < 9; i++) K.box(0.18, 0.8 + R() * 0.7, 0.05, R() < 0.5 ? 0x7a6c54 : 0x5e5444, -3.4 + i * 0.21, 3.15 + R() * 0.15, z1 + 0.02, 0, 0, (R() - 0.5) * 0.2);
      for (let i = 0; i < 6; i++) K.box(0.05, 0.6 + R() * 0.6, 0.18, R() < 0.5 ? 0x7a6c54 : 0x5e5444, x1 + 0.02, 3.15 + R() * 0.15, -2.0 - i * 0.6, (R() - 0.5) * 0.2, 0, 0);
      break; }
    case 3: { // the banyan's roots have come through: they pour over the room's roof and down its face
      const root = (x, z, top, bot, t, onX) => { let px = x, py = top; const n = 5; for (let k = 1; k <= n; k++) { const ny = top - (top - bot) * k / n, nx = x + (R() - 0.5) * 0.28; if (onX) line(K, x1 + 0.08, py, px, x1 + 0.08, ny, nx, t * (1 - k / (n + 2)), 0x3e3224); else line(K, px, py, z, nx, ny, z, t * (1 - k / (n + 2)), 0x3e3224); px = nx; py = ny; } };
      for (let i = 0; i < 16; i++) root(-3.4 + R() * 1.65, zf + 0.05 + R() * 0.06, 4.15, 0.1 + R() * 1.4, 0.07 + R() * 0.08, false);
      for (let i = 0; i < 6; i++) root(-2.0 - R() * 1.0, 0, 4.15, 0.2 + R(), 0.06 + R() * 0.05, true);
      for (let i = 0; i < 7; i++) K.ball(0.35 + R() * 0.25, 0x3a3022, -3.3 + R() * 1.4, 2.95, -2.2 - R() * 3.2, 1.4, 0.5, 1.2);
      break; }
    case 4: { // a steep tin gable on the room, its end toward you, corrugated sheets over its face, a rusted water pipe along the top
      { const sh = new THREE.Shape(), pts = [[-0.62, 0], [-0.7, 0.5], [-0.55, 0.9], [-0.68, 1.35], [-0.35, 1.7], [-0.1, 1.62], [0.2, 1.85], [0.45, 1.5], [0.66, 1.2], [0.55, 0.7], [0.7, 0.3], [0.6, 0]]; // the face is broken through: a black, ragged hole, bricks spilled out
        sh.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) sh.lineTo(p[0], p[1]); K.put(new THREE.ShapeGeometry(sh), 0x030303, -2.65, 0.05, zf + 0.012);
        for (let i = 0; i < 26; i++) { const a = R() * Math.PI * 2, rr = 0.75 + R() * 0.25; K.box(0.22, 0.07, 0.11, R() < 0.5 ? 0x5a3424 : 0x4a2a1e, -2.65 + Math.cos(a) * rr * 0.75, 0.95 + Math.sin(a) * rr * 0.95, zf + 0.03, 0, 0, R() * 0.5); }
        for (let i = 0; i < 22; i++) K.box(0.22, 0.07, 0.11, R() < 0.5 ? 0x5a3424 : 0x4a2a1e, -3.0 + (R() - 0.5) * 0.75, 0.04 + R() * 0.12, zf + 0.1 + R() * 0.3, R(), R() * 3, R()); K.solid(-3.45, -2.55, -1.85, -1.4, 0.2); }
      const ht = 1.15, half = 0.95, sl = Math.atan2(ht, half), Ls = Math.hypot(ht, half) + 0.12; for (const s of [-1, 1]) K.box(Ls, 0.04, 3.9, 0x5e4a3a, -2.6 + s * half / 2, 2.8 + ht / 2, -3.75, 0, 0, -s * sl);
      const tri = new THREE.Shape(); tri.moveTo(-half, 0); tri.lineTo(half, 0); tri.lineTo(0, ht); tri.lineTo(-half, 0); const tg = new THREE.ShapeGeometry(tri); K.put(tg, 0x6a5848, -2.6, 2.78, zf - 0.03);
      for (let k = -3; k <= 3; k++) K.box(0.04, ht * (1 - Math.abs(k) / 4), 0.03, 0x3a2c22, -2.6 + k * 0.24, 2.78 + ht * (1 - Math.abs(k) / 4) / 2, zf); K.cyl(0.08, 0.08, 4.2, 0x4a3426, -1.75, 3.1, -3.75, 8, Math.PI / 2);
      break; }
    case 5: { // rolling shutters pulled down over its face, a shutter box, a blank signboard frame on the roof
      K.box(1.8, 2.2, 0.04, 0x8a8c8c, -2.6, 1.15, zf + 0.01); for (let y = 0.12; y < 2.25; y += 0.1) K.box(1.82, 0.025, 0.05, 0x4a4c4e, -2.6, y, zf + 0.03); K.box(1.9, 0.3, 0.2, 0x5a5c5e, -2.6, 2.4, zf + 0.06); K.box(0.12, 0.14, 0.06, 0x8a7a40, -2.6, 0.2, zf + 0.07);
      K.box(1.9, 1.0, 0.06, 0x2a2a2c, -2.6, 3.4, -2.3); K.box(1.7, 0.8, 0.03, 0x6a6a64, -2.6, 3.4, -2.27); K.box(0.6, 0.5, 0.035, 0x1a1a1c, -2.2, 3.5, -2.255, 0, 0, 0.3); for (const x of [-3.3, -1.9]) K.box(0.06, 0.6, 0.06, 0x2a2a2c, x, 3.0, -2.35);
      break; }
    case 6: { // swallowed by ivy: a dark, ragged sheet of leaves over its face and spilling off its roof
      for (let i = 0; i < 230; i++) { const x = -3.45 + R() * 1.8, top = 2.75 + 0.5 * Math.sin(x * 5.0) + R() * 0.3, y = 0.6 + Math.pow(R(), 0.6) * (top - 0.6); K.put(new THREE.IcosahedronGeometry(0.075 + R() * 0.06, 0), R() < 0.6 ? 0x1a2814 : R() < 0.5 ? 0x24301a : 0x2e2e1c, x, y, zf + 0.04 + R() * 0.05, R(), R(), R(), 1, 1, 0.3); }
      for (let i = 0; i < 50; i++) K.put(new THREE.IcosahedronGeometry(0.12 + R() * 0.08, 0), R() < 0.6 ? 0x22321a : 0x34401e, -3.45 + R() * 1.8, 2.82 + R() * 0.25, -2.0 - R() * 3.5, R(), R(), R(), 1, 0.5, 1);
      for (let i = 0; i < 40; i++) K.put(new THREE.IcosahedronGeometry(0.1 + R() * 0.06, 0), 0x2a3a1e, x1 + 0.05, 1.4 + R() * 1.5, -1.95 - R() * 1.15, R(), R(), R(), 0.3, 1, 1);
      break; }
    case 7: { // burnt out: charred black face, soot to the roof, the parapet broken
      K.box(1.8, 2.6, 0.03, 0x121010, -2.6, 1.3, zf); for (let i = 0; i < 10; i++) K.box(0.15 + R() * 0.3, 1.0 + R() * 1.5, 0.02, 0x0a0908, -3.35 + R() * 1.5, 3.2 + R() * 0.4, z1 + 0.02);
      for (let i = 0; i < 8; i++) K.box(0.3 + R() * 0.3, 0.15 + R() * 0.35, 0.25, 0x2a2622, -3.3 + R() * 1.5, 2.85 + R() * 0.15, -2.0 - R() * 3.4, R() * 0.4, R() * 2, R() * 0.4);
      K.box(0.03, 0.9, 1.1, 0x0e0c0a, x1 + 0.02, 1.0, -2.55); line(K, -3.4, 2.78, -1.95, -2.2, 3.4, -2.2, 0.12, 0x1a1614);
      break; }
    case 8: { // a small domed chhatri on the room's roof, a tall arched timber window frame over its face, fretwork along the eave
      { const ax = -2.6, ay = 1.55, ar = 0.72; for (let i = 0; i < 9; i++) { const a0 = Math.PI * i / 9, a1 = Math.PI * (i + 1) / 9; line(K, ax + Math.cos(a0) * ar, ay + Math.sin(a0) * ar, zf + 0.03, ax + Math.cos(a1) * ar, ay + Math.sin(a1) * ar, zf + 0.03, 0.1, 0x3a2a1a); }
        for (const s of [-1, 1]) K.box(0.1, 1.45, 0.06, 0x3a2a1a, ax + s * ar, 0.82, zf + 0.03); K.box(1.55, 0.1, 0.06, 0x3a2a1a, ax, 0.12, zf + 0.03);
        const sh = new THREE.Shape(); sh.moveTo(-ar + 0.05, 0); sh.lineTo(ar - 0.05, 0); sh.lineTo(ar - 0.05, 1.45); sh.absarc(0, 1.45, ar - 0.05, 0, Math.PI, false); sh.lineTo(-ar + 0.05, 0); K.put(new THREE.ShapeGeometry(sh, 6), 0x0a0908, ax, 0.12, zf + 0.012);
        for (let k = -2; k <= 2; k++) K.box(0.04, 1.9, 0.05, 0x3a2a1a, ax + k * 0.26, 1.15, zf + 0.04); for (const y of [0.6, 1.2]) K.box(1.4, 0.04, 0.05, 0x3a2a1a, ax, y, zf + 0.04); }
      const cx = -2.6, cz = -2.9; K.box(1.3, 0.12, 1.3, 0x5a5048, cx, 2.84, cz); for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) K.cyl(0.06, 0.06, 0.6, 0x5a5048, cx + dx, 3.2, cz + dz, 6);
      K.box(1.35, 0.1, 1.35, 0x5a5048, cx, 3.53, cz); K.put(new THREE.SphereGeometry(0.62, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0x6a6056, cx, 3.58, cz); K.cyl(0.02, 0.05, 0.3, 0x4a4038, cx, 4.3, cz, 5);
      for (let z = -1.95; z > -5.6; z -= 0.18) K.box(0.05, 0.2, 0.12, 0x4a3422, x1 + 0.08, 2.76, z); // fretwork along the eave over the door
      break; }
  }
  // the roof edge over the track (x 3.45), seen running down the right of every shot
  switch (n) {
    case 1: for (let z = 8.3; z > -44.4; z -= 0.17) K.box(0.03, (Math.round(z / 0.17) % 2) ? 0.55 : 0.38, 0.15, 0x4a3422, 3.46, 4.15 - ((Math.round(z / 0.17) % 2) ? 0.55 : 0.38) / 2, z); K.box(0.05, 0.12, 52.8, 0x3a2a1a, 3.47, 4.12, -18); break; // a scalloped timber valance
    case 3: for (let z = 6; z > -44; z -= 3.2 + R() * 2.5) K.box(0.9 + R() * 0.4, 0.012, 1.0 + R() * 0.4, 0x7a7a70, 3.6 + R() * 0.15, 3.8 - R() * 0.3, z, 0.3, R() * 0.4, -0.9 - R() * 0.4); break; // sheets torn loose and hanging over the edge
    case 6: for (let z = 8; z > -44; z -= 0.5) { const L = 0.4 + R() * 1.4; K.cyl(0.015, 0.008, L, 0x24301a, 3.45, 4.15 - L / 2, z, 3); for (let k = 0; k < 2; k++) K.put(new THREE.IcosahedronGeometry(0.08 + R() * 0.04, 0), R() < 0.6 ? 0x1e2c16 : 0x2e3620, 3.45, 4.15 - L * (k + 1) / 2, z, R(), R(), R(), 1, 1, 0.25); } break; // vines over the edge
    case 7: K.box(0.06, 0.7, 52.8, 0x1e1c1a, 3.47, 3.85, -18); for (let z = 6; z > -44; z -= 1.3 + R()) K.box(0.02, 0.3 + R() * 0.4, 0.08, 0x0e0e0e, 3.44, 3.5 - R() * 0.2, z); break; // a deep sooty fascia, dripping
    case 8: for (let z = 8; z > -44; z -= 2.0) { line(K, 3.45, 3.3, z, 2.7, 4.15, z, 0.06, 0x24282c); line(K, 3.45, 3.3, z, 3.45, 4.15, z, 0.06, 0x24282c); } K.box(0.08, 0.1, 52.8, 0x24282c, 3.45, 3.3, -18); break; // cast-iron brackets
    case 0: case 2: K.box(0.08, 0.3, 52.8, n ? 0x2e3438 : 0x3a2c22, 3.47, 4.05, -18); break;
  }
}
