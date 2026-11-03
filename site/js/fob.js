// PLATFORM 0 v3 — Chapter 1 forward route: up the stairs at the far end, across a covered foot-over-bridge (FOB)
// with two turns, and down to the next platform. Self-contained: geometry, walkable area, floor height, triggers, bridge anomalies.
import * as THREE from './three.module.min.js';
import * as M from './mats.js';
import { box, plane, shadows, makeLamp, panelTex, signMesh, setSignCanvas, makeHuman, stillPose } from './props.js';

const Y = 4.2;                                // deck height
const S1 = { x0: -1.9, x1: -0.1, z0: -52.4, z1: -46.4 };  // stairs up (towards -z)
const A = { x0: -1.9, x1: 8.0, z0: -55.0, z1: -52.4 };   // landing + first span (east)
const B = { x0: 5.6, x1: 8.0, z0: -60.0, z1: -55.0 };    // turn south
const C = { x0: 5.6, x1: 12.5, z0: -60.0, z1: -57.6 };   // second span (east)
const D = { x0: 12.5, x1: 18.5, z0: -60.0, z1: -57.6 };  // stairs down (towards +x)
const E = { x0: 18.5, x1: 20.6, z0: -60.0, z1: -57.6 };  // bottom landing → next platform
export const FOB = { Y, S1, A, B, C, D, E };
const R = 0.28;
const inR = (r, x, z) => x >= r.x0 + R && x <= r.x1 - R && z >= r.z0 + R && z <= r.z1 - R;
// union of rectangles with the joins opened up (a point may sit in the overlap band of two)
const inAny = (x, z) => inR({ ...S1, z0: A.z0, z1: -45.5 }, x, z) || inR(A, x, z) || inR({ ...B, z1: A.z1 }, x, z) || inR(C, x, z) || inR({ ...D, x0: C.x0 }, x, z) || inR({ ...E, x0: D.x0 }, x, z);

export function buildFob(ch) {
  const root = ch.root, g = new THREE.Group(); root.add(g);
  const floorM = M.pbr('ufloor', { rep: [1, 4], color: 0xb4b0a6 }), wallM = M.pbr('plaster', { rep: [2, 1], color: 0xb0a898 }), roofM = M.pbr('roof', { rep: [2, 4], color: 0x7a7266, metal: 0.6 });
  const rail = M.std(0x3a5a4a, 0.5, 0.6), glass = new THREE.MeshStandardMaterial({ color: 0x05080a, roughness: 0.25, metalness: 0.0, transparent: true, opacity: 0.72, envMapIntensity: 0.15, depthWrite: false });
  const mat = (m, rx, ry) => { const c = m.clone(); if (c.map) { for (const k of ['map', 'normalMap', 'roughnessMap', 'aoMap', 'metalnessMap']) if (c[k]) { c[k] = c[k].clone(); c[k].repeat.set(rx, ry); c[k].needsUpdate = true; } } return c; };
  const H = 2.8;
  // ---- stairs up (21 steps) ----
  const nS = 21, run = (S1.z1 - S1.z0) / nS, rise = Y / nS, stepM = mat(floorM, 1, 0.15);
  for (let i = 0; i < nS; i++) { const s = box(S1.x1 - S1.x0, rise, run + 0.02, stepM, (S1.x0 + S1.x1) / 2, rise * (i + 0.5), S1.z1 - run * (i + 0.5), g); s.receiveShadow = true; box(S1.x1 - S1.x0, 0.025, 0.04, M.std(0xc8a020, 0.6), (S1.x0 + S1.x1) / 2, rise * (i + 1) + 0.005, S1.z1 - run * i - 0.02, g); }
  const sl = S1.z1 - S1.z0, wallH = Y + H;
  for (const x of [S1.x0, S1.x1]) { const w = plane(sl + 0.01, wallH, mat(wallM, sl / 3, wallH / 3), g); w.rotation.y = x < -1 ? Math.PI / 2 : -Math.PI / 2; w.position.set(x + (x < -1 ? 0.003 : -0.003), wallH / 2, (S1.z0 + S1.z1) / 2); /* v3.0.2: 3 mm in from the passage walls they overlap */ w.receiveShadow = true; }
  // hand rails
  for (const x of [S1.x0 + 0.06, S1.x1 - 0.06]) { const r = box(0.05, 0.05, Math.hypot(sl, Y), rail, x, Y / 2 + 0.9, (S1.z0 + S1.z1) / 2, g); r.rotation.x = Math.atan2(Y, sl); }
  const sc = plane(S1.x1 - S1.x0, Math.hypot(sl, Y) + 0.2, mat(wallM, 0.6, 2), g); sc.rotation.x = Math.PI / 2 - Math.atan2(Y, sl); sc.rotation.order = 'YXZ'; sc.rotation.x = Math.PI / 2 + Math.atan2(Y, sl); sc.position.set((S1.x0 + S1.x1) / 2, Y / 2 + H + 0.1, (S1.z0 + S1.z1) / 2);
  // ---- deck spans: floor, roof, walls with windows ----
  let spanN = 0; // v3.0.2: spans overlap at the corner landings: stagger each one's floor / roof by 1.5 mm (their textures z-fought there)
  const span = (r, axis, openA, openB) => { const dy = 0.0015 * spanN++; // axis 'x' (runs east) or 'z' (runs south); openA/openB: which side walls are skipped
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    const f = plane(w, d, mat(floorM, w / 2, d / 2), g); f.rotation.x = -Math.PI / 2; f.position.set((r.x0 + r.x1) / 2, Y + 0.002 + dy, (r.z0 + r.z1) / 2); f.receiveShadow = true;
    const c = plane(w, d, mat(roofM, w / 3, d / 3), g); c.rotation.x = Math.PI / 2; c.position.set((r.x0 + r.x1) / 2, Y + H - dy, (r.z0 + r.z1) / 2);
    return { f, c };
  };
  span(A); span(B); span(C); span(E);
  // walls: [x0,z0]-[x1,z1] segments with optional window band (outer walls get windows)
  const wall = (x0, z0, x1, z1, win, y0 = Y) => {
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const seg = (yb, yt, m) => { const p = plane(len, yt - yb, m, g); p.position.set(cx, yb + (yt - yb) / 2, cz); p.rotation.y = -ang; p.receiveShadow = true; return p; };
    if (!win) { const p = seg(y0, Y + H, mat(wallM, len / 3, H / 3)); p.material.side = THREE.DoubleSide; return; }
    const lo = seg(Y, Y + 1.0, mat(wallM, len / 3, 0.35)); lo.material.side = THREE.DoubleSide; const hi = seg(Y + 2.2, Y + H, mat(wallM, len / 3, 0.2)); hi.material.side = THREE.DoubleSide;
    const gl = seg(Y + 1.0, Y + 2.2, glass); gl.material = glass; gl.userData.noAO = true;
    for (let k = 0; k <= Math.floor(len / 1.2); k++) { const t = k / Math.floor(len / 1.2); const b = box(0.06, 1.2, 0.06, rail, x0 + (x1 - x0) * t, Y + 1.6, z0 + (z1 - z0) * t, g); }
    box(len, 0.06, 0.08, rail, cx, Y + 1.0, cz, g).rotation.y = -ang;
  };
  // span A (z -55..-52.4, x -1.9..8): north wall from x -0.1 (stair opening -1.9..-0.1) to 8; south wall from -1.9 to 5.6 (B opening 5.6..8)
  wall(-1.9, A.z1, -1.9, A.z0, false);          // west end above the stairs
  wall(-0.1, A.z1, 8.0, A.z1, true);              // north side windows
  wall(-1.9, A.z0, 5.6, A.z0, true);              // south side windows
  wall(8.0, A.z1, 8.0, C.z1, true);               // east wall of A + B (down to C)
  wall(5.6, A.z0, 5.6, C.z0, true);               // west wall of B + C
  wall(8.0, C.z1, 12.5, C.z1, true);              // north side of C
  wall(5.6, C.z0, 12.5, C.z0, true);              // south side of C
  // stair down (D): side walls run from deck down to the ground
  const dl = D.x1 - D.x0;
  for (const z of [D.z0, D.z1]) { const w = plane(dl + 0.01, Y + H, mat(wallM, dl / 3, (Y + H) / 3), g); w.position.set((D.x0 + D.x1) / 2, (Y + H) / 2, z); w.rotation.y = z > -59 ? Math.PI : 0; w.material.side = THREE.DoubleSide; }
  for (let i = 0; i < nS; i++) { const rn = dl / nS, s = box(rn + 0.02, Y - rise * i, D.z1 - D.z0, stepM, D.x0 + rn * (i + 0.5), (Y - rise * i) / 2, (D.z0 + D.z1) / 2, g); s.receiveShadow = true; box(0.04, 0.025, D.z1 - D.z0, M.std(0xc8a020, 0.6), D.x0 + rn * i + 0.02, Y - rise * i + 0.005, (D.z0 + D.z1) / 2, g); }
  const dc = plane(Math.hypot(dl, Y) + 0.2, D.z1 - D.z0, mat(wallM, 2, 0.6), g); dc.rotation.order = 'ZXY'; dc.rotation.x = Math.PI / 2; dc.rotation.z = 0; dc.rotation.y = 0; dc.position.set((D.x0 + D.x1) / 2, Y / 2 + H, (D.z0 + D.z1) / 2); dc.rotation.set(Math.PI / 2, -Math.atan2(Y, dl), 0, 'XZY');
  for (const z of [D.z0 + 0.06, D.z1 - 0.06]) { const r = box(Math.hypot(dl, Y), 0.05, 0.05, rail, (D.x0 + D.x1) / 2, Y / 2 + 0.9, z, g); r.rotation.z = -Math.atan2(Y, dl); }
  // bottom: the next platform's doorway glowing faintly, walls around the landing
  const ew = plane(E.z1 - E.z0, H, mat(wallM, 0.8, 1), g); ew.rotation.y = -Math.PI / 2; ew.position.set(E.x1, H / 2, (E.z0 + E.z1) / 2);
  for (const z of [E.z0, E.z1]) { const w = plane(E.x1 - E.x0, H, mat(wallM, 0.7, 1), g); w.position.set((E.x0 + E.x1) / 2, H / 2, z); w.rotation.y = z > -59 ? Math.PI : 0; }
  const ec = plane(E.x1 - E.x0, E.z1 - E.z0, mat(wallM, 0.7, 0.8), g); ec.rotation.x = Math.PI / 2; ec.position.set((E.x0 + E.x1) / 2, H, (E.z0 + E.z1) / 2);
  const door = plane(1.6, 2.3, new THREE.MeshBasicMaterial({ color: 0x8a9a8a, toneMapped: false }), g); door.rotation.y = -Math.PI / 2; door.position.set(E.x1 - 0.02, 1.15, (E.z0 + E.z1) / 2);
  // lamps
  const lamps = [];
  const L = (x, z, rotY, floorY) => { const l = makeLamp(root, x, Y + H - 0.05, z, { color: 0xe4f0d8, power: 3.2, dist: 8, len: 0.9, cone: false, poolW: 2.6, poolD: 3, prio: 1, floorY, rotY }); l.fob = true; ch.lamps.push(l); lamps.push(l); return l; };
  // v3.0.1: the stairwell was too dark — its lamps hung at deck-roof height, above the sloping stair ceiling. Now three tubes sit
  // just under that ceiling (2.5 m over the steps), a little brighter, with their floor glow on the steps
  const stairY = (z) => (S1.z1 - z) / (S1.z1 - S1.z0) * Y;
  for (const [z, pw] of [[-46.9, 4.2], [-49.4, 4.8], [-51.8, 4.4]]) { const fy = Math.max(0, stairY(z)); const l = makeLamp(root, -1.0, fy + 2.5, z, { color: 0xe4f0d8, power: pw, dist: 7, len: 0.9, cone: false, poolW: 2.4, poolD: 2.6, prio: 1.4, floorY: fy + 0.02 }); l.fob = true; ch.lamps.push(l); lamps.push(l); } L(1.5, -53.7, Math.PI / 2, Y); L(6.8, -53.7, Math.PI / 2, Y); L(6.8, -57.5, 0, Y); L(10.0, -58.8, Math.PI / 2, Y); L(15.5, -58.8, Math.PI / 2, 2.1);
  const lb = makeLamp(root, 19.5, H - 0.05, -58.8, { color: 0xffe0b0, power: 3, dist: 6, len: 0.5, cone: false, poolW: 2, poolD: 2, prio: 1 }); lb.fob = true; ch.lamps.push(lb); lamps.push(lb);
  // signs
  const signC = (bad) => panelTex(bad ? [['प्लेटफ़ॉर्म 0  ↓', 64, 'deva', '#fff'], ['PLATFORM 0  ↓  PLATFORM 0', 54, 'sans', '#fff']] : [['सभी प्लेटफ़ॉर्म  ↓', 64, 'deva', '#fff'], ['ALL PLATFORMS  ↓', 58, 'sans', '#fff']], { bg: bad ? '#7a0c0c' : '#1a4a8a', w: 1024, h: 210, top: 20, borderColor: '#fff', grime: 0.3 });
  const fobSign = signMesh(signC(false), 1.6, 0.33, { emissive: 1.0 }); fobSign.rotation.y = -Math.PI / 2; fobSign.position.set(12.4, Y + H - 0.35, (C.z0 + C.z1) / 2); g.add(fobSign);
  const nameC = panelTex([['पैदल पुल', 62, 'deva', '#111'], ['FOOT OVER BRIDGE', 52, 'sans', '#111']], { bg: '#f2c613', w: 1024, h: 200, top: 20, borderColor: '#111', grime: 0.3 });
  const nm = signMesh(nameC, 1.5, 0.3, { emissive: 0.8 }); nm.position.set(-1.0, Y + H - 0.3, A.z1 - 0.05); nm.rotation.y = Math.PI; g.add(nm);
  const nm2 = signMesh(nameC, 1.5, 0.3, { emissive: 0.8 }); nm2.position.set(-1.0, 2.35, -46.35); g.add(nm2); nm2.rotation.y = 0;
  shadows(g, false, true);
  // ---- bridge anomalies' props ----
  const fig = makeHuman({ shirt: 0x111111, pants: 0x111111, skin: 0x0a0a0a, eyes: 'white' }); fig.position.set(6.8, Y, -55.6); fig.rotation.y = Math.PI / 2 + Math.PI; stillPose(fig); g.add(fig); fig.visible = false;
  const faceC = M.canvas(128, 160), fg = faceC.getContext('2d'); { const gr = fg.createRadialGradient(64, 80, 10, 64, 80, 70); gr.addColorStop(0, 'rgba(225,225,215,1)'); gr.addColorStop(0.7, 'rgba(180,180,170,.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); fg.fillStyle = gr; fg.fillRect(0, 0, 128, 160); fg.fillStyle = '#000'; fg.beginPath(); fg.ellipse(44, 70, 10, 13, 0, 0, 7); fg.ellipse(84, 70, 10, 13, 0, 0, 7); fg.fill(); fg.beginPath(); fg.ellipse(64, 118, 12, 18, 0, 0, 7); fg.fill(); }
  const face = plane(0.36, 0.45, new THREE.MeshBasicMaterial({ map: M.ctex(faceC), transparent: true, depthWrite: false }), g); face.position.set(3.2, Y + 1.65, A.z0 - 0.04); face.visible = false;
  const fob = {
    g, lamps, fig, face, fobSign, signC,
    reset(progress, isExit) {
      g.visible = true; fig.visible = false; face.visible = false; setSignCanvas(fobSign, signC(false)); this.exit = isExit;
      for (const l of lamps) { l.setColor(l.baseColor.getHex()); }
    },
    walk(x, z) { if (this.exit && z < -46.0) return false; return inAny(x, z); },
    floorY(x, z) {
      if (z > S1.z1) return 0;
      if (x < S1.x1 + 0.3 && z > S1.z0) return Math.min(Y, Math.max(0, (S1.z1 - z) / (S1.z1 - S1.z0) * Y));
      if (x > D.x0 && z < C.z1 + 0.3) return x >= D.x1 ? 0 : Math.max(0, Y - (x - D.x0) / (D.x1 - D.x0) * Y);
      return Y;
    },
    isForward(p) { return p.x > 19.4 && p.z < -57; },
    update(dt, p) { g.visible = !this.exit && p.z < -24; // the bridge is only drawn once you're far enough down the platform to see into the stairwell (saves ~100 draw calls)
      if (fig.visible && Math.hypot(p.x - fig.position.x, p.z - fig.position.z) < 4.2) { fig.visible = false; ch.game.sound.whisper && ch.game.sound.whisper(0.8, 0.2, 0.2); } },
  };
  return fob;
}

export const FOB_ANOMALIES = [
  { id: 'fob_figure', name: 'Someone is standing at the turn of the bridge', apply: c => { c.fob.fig.visible = true; } },
  { id: 'fob_red', name: 'The bridge lights are red', apply: c => { c.fob.lamps.forEach(l => l.setColor(0xff2a18)); } },
  { id: 'fob_sign', name: 'The bridge sign points down to Platform 0', apply: c => { setSignCanvas(c.fob.fobSign, c.fob.signC(true)); } },
  { id: 'fob_face', name: 'A face is pressed against a bridge window', apply: c => { c.fob.face.visible = true; } },
];
