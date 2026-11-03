// PLATFORM 0 v3.1 — "THE 0217": one mystery woven through all three chapters.
//  · every clock stopped at 2:17 (platform, waiting room, subway, train, Room 0)
//  · four numbers scratched where only the torch finds them (I·0  II·2  III·1  IV·7)
//  · ROOM 0, the station master's office at the far end of Platform 0, behind a keypad (code 0217)
//  · Lost & Found: six of Maa's things, one waiting per loop in a fixed spot
//  · the 0217 "Platform Zero Local" — announced, on no timetable, on the departure board for a few seconds
// The true ending now needs: 6 diary pages + 6 lost things + Room 0 opened.
import * as THREE from './three.module.min.js';
import * as M from './mats.js';
import { box, rbox, cyl, plane, shadows, signMesh, panelTex, makeLamp } from './props.js';

export const CODE = '0217';
const H = 2, MN = 17; // 02:17
export const LOST = [
  { id: 'tiffin', ch: 1, name: 'Steel tiffin', icon: '🍱', pos: [-2.92, 0.655, -9.05], ry: 0.3, iscale: 1.3, rx: 0.38,
    caption: 'A three-tier steel tiffin. <b>Still warm.</b>', back: 'Folded under the lid: "Arjun, eat something. — Maa"' },
  { id: 'bangle', ch: 1, name: 'Green glass bangle', icon: '🟢', pos: [1.05, 0.006, -17.4], ry: 0.4, iscale: 2.4,
    caption: 'A green glass bangle, cracked clean through.<br>She never took them off. Not even after.', back: 'Scratched inside, tiny: "K + R · 1989"' },
  { id: 'stub', ch: 1, name: 'Ticket stub', icon: '🎟️', pos: [-2.5, 0.004, -26.7], ry: 0.9, iscale: 2.2,
    caption: 'A punched ticket stub. <b>TRAIN 0217 · PLATFORM 0</b>.<br>There is no train 0217.', back: 'On the back: "31.10.2018 · 02:17 · ONE WAY · 1 ADULT"' },
  { id: 'slipper', ch: 2, name: 'Child\'s slipper', icon: '🩴', pos: [1.45, 0.006, -13.6], ry: 2.2, iscale: 1.5,
    caption: 'A tiny blue rubber slipper. A six-year-old\'s.<br>She kept it in her purse for seventeen years.', back: 'Written on the sole in marker: "ARJUN"' },
  { id: 'anklet', ch: 2, name: 'Ghungroo anklet', icon: '🔔', pos: [-1.35, 0.008, -31.2], ry: 1.1, iscale: 2.0,
    caption: 'One ghungroo anklet, the bells gone black.<br>You have heard these before. At night. Behind you.', back: '"chhan… chhan…"' },
  { id: 'pass', ch: 3, name: 'Rail pass', icon: '🪪', pos: [-0.98, 0.505, -12.25], ry: 0.25, iscale: 2.4,
    caption: 'A monthly rail pass. <b>KAMLA DESAI, 54</b>.<br>The photo is the woman in white.', back: 'Valid till 30.11.2018. Never renewed.' },
];
export const DIGITS = [
  { n: 0, d: '0', r: 'I', ch: 1, where: 'on the back of a pillar', pos: [0.424, 1.05, -14], ry: -Math.PI / 2 },
  { n: 1, d: '2', r: 'II', ch: 1, where: 'low on the waiting-room wall', pos: [-3.444, 0.55, -5.25], ry: Math.PI / 2 },
  { n: 2, d: '1', r: 'III', ch: 2, where: 'in the subway tiles', pos: [2.178, 1.05, -25.5], ry: -Math.PI / 2 },
  { n: 3, d: '7', r: 'IV', ch: 3, where: 'on the end wall of the coach', pos: [-1.08, 1.12, -21.955], ry: 0 },
];
// Room 0 (Ch1, far end of the platform, against the back wall)
const R0 = { x0: -3.5, x1: -1.95, z0: -37.4, z1: -33.4, h: 2.7, dz0: -35.95, dz1: -35.05 };

const rand = Math.random;
function txt(g, s, x, y, font, col) { g.font = font; g.fillStyle = col; g.fillText(s, x, y); }

// ---------- textures ----------
function clockFaceTex(label) {
  const c = M.canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#ece6d4'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
  g.strokeStyle = '#1a1a1a'; for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r0 = i % 5 ? 112 : 100; g.lineWidth = i % 5 ? 2 : 5; g.beginPath(); g.moveTo(128 + Math.sin(a) * r0, 128 - Math.cos(a) * r0); g.lineTo(128 + Math.sin(a) * 120, 128 - Math.cos(a) * 120); g.stroke(); }
  g.fillStyle = '#1a1a1a'; g.font = 'bold 30px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; g.fillText(String(i), 128 + Math.sin(a) * 80, 130 - Math.cos(a) * 80); }
  g.font = '600 13px sans-serif'; g.fillStyle = '#7a1a14'; g.fillText(label || 'SHUNYA RD', 128, 172);
  M.grime(g, 256, 256, 0.5, 4); return M.ctex(c);
}
function scratchTex(d, r) { // carved, not drawn: a dark groove with a pale lip, so it reads in the torch hot spot and in the dark
  const c = M.canvas(256, 256), g = c.getContext('2d'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineCap = 'round'; g.lineJoin = 'round';
  const carve = (s, x, y, font, w) => { for (let k = 0; k < 5; k++) { const ox = (rand() - 0.5) * 4, oy = (rand() - 0.5) * 4; g.font = font;
      g.strokeStyle = `rgba(240,232,214,${0.3 + rand() * 0.2})`; g.lineWidth = w * (3.2 + rand() * 1.2); g.strokeText(s, x + ox + 2.5, y + oy + 2.5);
      g.strokeStyle = `rgba(14,10,6,${0.6 + rand() * 0.3})`; g.lineWidth = w * (2.2 + rand() * 0.8); g.strokeText(s, x + ox, y + oy); } };
  carve(d, 128, 112, 'bold 150px Georgia, serif', 3.2); carve(r, 128, 222, 'bold 36px Georgia, serif', 2);
  for (let k = 0; k < 16; k++) { g.strokeStyle = `rgba(${rand() < 0.5 ? '18,12,8' : '240,232,214'},.22)`; g.lineWidth = 1; g.beginPath(); const x = 30 + rand() * 196, y = 20 + rand() * 200; g.moveTo(x, y); g.lineTo(x + (rand() - 0.5) * 50, y + (rand() - 0.5) * 50); g.stroke(); }
  return M.ctex(c);
}
function cardTex(kind) {
  const W = kind === 'pass' ? 340 : 300, Hh = kind === 'pass' ? 220 : 170; const c = M.canvas(W, Hh), g = c.getContext('2d');
  if (kind === 'pass') {
    g.fillStyle = '#d9cfa8'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#2a3e78'; g.fillRect(0, 0, W, 34);
    txt(g, 'WESTERN RAILWAY · SEASON TICKET', 12, 23, 'bold 15px sans-serif', '#fff');
    g.fillStyle = '#e8e4da'; g.fillRect(14, 48, 82, 104); g.fillStyle = '#c8c4b8'; g.beginPath(); g.ellipse(55, 88, 22, 27, 0, 0, 7); g.fill(); g.fillStyle = '#f2f0ea'; g.fillRect(24, 114, 62, 38); // the photo: a face in a white saree, washed out
    g.fillStyle = '#4a3a2a'; g.fillRect(47, 84, 4, 2); g.fillRect(59, 84, 4, 2);
    [['NAME', 'KAMLA DESAI'], ['AGE', '54   F'], ['FROM', 'SHUNYA ROAD'], ['TO', 'CHURCHGATE'], ['VALID', '01.11 – 30.11.2018']].forEach(([a, b], i) => { txt(g, a, 110, 62 + i * 27, '11px sans-serif', '#5a5040'); txt(g, b, 160, 62 + i * 27, 'bold 15px monospace', '#1a1a1a'); });
    txt(g, 'II CLASS · MONTHLY', 14, 200, 'bold 13px sans-serif', '#7a1a14');
  } else if (kind === 'stub') {
    g.fillStyle = '#e6d9b4'; g.fillRect(0, 0, W, Hh); g.strokeStyle = '#8a7a5a'; g.setLineDash([5, 4]); g.strokeRect(6, 6, W - 12, Hh - 12); g.setLineDash([]);
    txt(g, 'SHUNYA RD  →  ——', 18, 40, 'bold 22px monospace', '#1a1a1a'); txt(g, 'TRAIN 0217', 18, 78, 'bold 30px monospace', '#7a1a14'); txt(g, 'PLATFORM 0', 18, 112, 'bold 22px monospace', '#1a1a1a'); txt(g, '31.10.2018   02:17', 18, 146, '18px monospace', '#333');
    g.fillStyle = 'rgba(0,0,0,.85)'; g.beginPath(); g.arc(W - 40, 42, 13, 0, 7); g.fill(); // the punch hole
  } else { // keypad
    g.fillStyle = '#2a2c2a'; g.fillRect(0, 0, W, Hh);
  }
  M.grime(g, W, Hh, 0.55, 5); return M.ctex(c);
}
function keypadTex() {
  const c = M.canvas(128, 192), g = c.getContext('2d'); g.fillStyle = '#3a3c38'; g.fillRect(0, 0, 128, 192);
  g.fillStyle = '#0c1a10'; g.fillRect(14, 12, 100, 28); txt(g, '- - - -', 30, 33, 'bold 18px monospace', '#3aff6a');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  keys.forEach((k, i) => { const x = 18 + (i % 3) * 34, y = 52 + Math.floor(i / 3) * 34; g.fillStyle = '#b8b4a8'; g.fillRect(x, y, 26, 26); g.fillStyle = '#1a1a1a'; g.font = 'bold 16px sans-serif'; g.textAlign = 'center'; g.fillText(k, x + 13, y + 19); g.textAlign = 'left'; });
  M.grime(g, 128, 192, 0.6, 3); return M.ctex(c);
}
function paperTexHTML(inner) { return `<div class="tk mys" style="background:#e6dcc2;color:#22201a;font:13px/1.38 'Courier New',monospace;text-align:left;padding:12px 14px;max-height:66vh;overflow:auto">${inner}</div>`; }

// ---------- small meshes ----------
export function makeClock(r = 0.22, label) {
  const g = new THREE.Group(); const tex = clockFaceTex(label);
  const face = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.12, roughness: 0.4 })); face.position.z = 0.016; g.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r + 0.012, 0.014, 8, 32), M.std(0x1a1a1a, 0.4, 0.6)); rim.position.z = 0.014; g.add(rim);
  const back = cyl(r + 0.01, r + 0.01, 0.025, M.std(0x222222, 0.6, 0.3), 0, 0, 0, g, 24); back.rotation.x = Math.PI / 2;
  const hand = (L, W2, ang, z, col) => { const pv = new THREE.Group(); pv.position.z = z; pv.rotation.z = -ang; g.add(pv); box(W2, L, 0.004, M.basic(col), 0, L / 2 - r * 0.12, 0, pv); return pv; };
  g.userData.h = hand(r * 0.55, r * 0.07, (H + MN / 60) / 12 * Math.PI * 2, 0.02, 0x111111);
  g.userData.m = hand(r * 0.82, r * 0.05, MN / 60 * Math.PI * 2, 0.023, 0x111111);
  g.userData.s = hand(r * 0.86, r * 0.018, 0, 0.026, 0xaa0000); // the second hand twitches on the 12 and never gets past it
  g.userData.isStopped = true; return g;
}
function wrap(inner) { const w = new THREE.Group(); w.add(inner); return w; } // inspect wants the "face" as the first child
function makeLostMesh(id) {
  // built like the key/photo: the first child's +z is the "face"; rotated -90° about x it lies face-up where it was dropped
  const g = new THREE.Group(), up = new THREE.Group(); up.rotation.x = Math.PI / 2; // content modelled y-up goes in `up`
  if (id === 'bangle') { const mat = new THREE.MeshStandardMaterial({ color: 0x1f9a52, roughness: 0.08, metalness: 0.1, emissive: 0x0e6a2a, transparent: true, opacity: 0.9 });
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.005, 8, 32, Math.PI * 1.88), mat); m.position.z = 0.0045; g.add(m);
    const m2 = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.005, 8, 4, Math.PI * 0.07), mat); m2.rotation.z = Math.PI * 1.92; m2.position.set(0.003, -0.002, 0.0045); g.add(m2); }
  else if (id === 'stub' || id === 'pass') { const W = id === 'pass' ? 0.1 : 0.09, Hh = id === 'pass' ? 0.065 : 0.052;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, Hh), new THREE.MeshStandardMaterial({ map: cardTex(id), roughness: 0.85, side: THREE.DoubleSide, emissive: 0x111008 })); m.position.z = 0.002; g.add(m); }
  else {
    if (id === 'tiffin') { const st = M.std(0xc9cdd2, 0.22, 1);
      for (let i = 0; i < 3; i++) cyl(0.062, 0.062, 0.052, st, 0, 0.027 + i * 0.056, 0, up, 20);
      cyl(0.064, 0.058, 0.012, st, 0, 0.176, 0, up, 20); const hdl = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.005, 6, 16, Math.PI), st); hdl.position.y = 0.182; up.add(hdl);
      for (const s of [-1, 1]) box(0.006, 0.17, 0.012, st, s * 0.066, 0.1, 0, up); }
    if (id === 'slipper') { const blue = M.std(0x2a62c8, 0.7, 0.0); rbox(0.062, 0.012, 0.15, 0.005, blue, 0, 0.006, 0, up);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.005, 6, 12, Math.PI), M.std(0x1a3a8a, 0.7)); strap.position.set(0, 0.012, -0.02); up.add(strap);
      box(0.004, 0.004, 0.04, M.std(0x1a3a8a, 0.7), 0, 0.03, -0.035, up); }
    if (id === 'anklet') { const sil = M.std(0x5a5650, 0.35, 0.9); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.003, 6, 28), sil); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.004; up.add(ring);
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), M.std(0x3a362e, 0.3, 0.9)); b.position.set(Math.cos(a) * 0.047, 0.006, Math.sin(a) * 0.047); up.add(b); } }
    g.add(up);
  }
  g.rotation.x = -Math.PI / 2; return g;
}


// ---------- static batching: bake a group's static meshes into one mesh per material (fewer draw calls on phones) ----------
const _inv = new THREE.Matrix4(), _rel = new THREE.Matrix4();
export function mergeStatic(group, keep = () => false) {
  group.updateMatrixWorld(true); _inv.copy(group.matrixWorld).invert();
  const buckets = new Map(), victims = [];
  group.traverse(o => { if (!o.isMesh || o.isSkinnedMesh || keep(o) || Array.isArray(o.material) || o.material.transparent) return;
    const g = o.geometry, names = Object.keys(g.attributes).sort(); if (!g.attributes.position || !g.attributes.normal) return;
    const key = o.material.uuid + '|' + names.join(','); if (!buckets.has(key)) buckets.set(key, { mat: o.material, names, parts: [], cast: false, recv: false });
    const b = buckets.get(key); _rel.multiplyMatrices(_inv, o.matrixWorld); const ng = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(_rel);
    b.parts.push(ng); b.cast = b.cast || o.castShadow; b.recv = b.recv || o.receiveShadow; victims.push(o); });
  for (const b of buckets.values()) { if (b.parts.length < 2) { b.parts.forEach(p => p.dispose()); continue; }
    const out = new THREE.BufferGeometry();
    for (const n of b.names) { const it = b.parts[0].attributes[n].itemSize; let len = 0; for (const p of b.parts) len += p.attributes[n].count * it;
      const arr = new Float32Array(len); let off = 0; for (const p of b.parts) { const a = p.attributes[n]; for (let i = 0; i < a.count; i++) for (let k = 0; k < it; k++) arr[off++] = a.array[i * it + k] ?? a.getComponent(i, k); }
      out.setAttribute(n, new THREE.BufferAttribute(arr, it)); }
    out.computeBoundingSphere(); out.computeBoundingBox(); b.parts.forEach(p => p.dispose());
    const m = new THREE.Mesh(out, b.mat); m.castShadow = b.cast; m.receiveShadow = b.recv; m.userData.merged = true; group.add(m);
    for (const v of victims) if (v.material === b.mat && v.parent) v.parent.remove(v);
  }
  // drop now-empty sub-groups
  const empty = []; group.traverse(o => { if (o !== group && o.isGroup && o.children.length === 0) empty.push(o); }); empty.forEach(o => o.parent && o.parent.remove(o));
  return group;
}

export class Mystery {
  constructor(F) {
    this.F = F; this.A = F.A; this.G = F.G; this.kp = { open: false, code: '' };
    const css = document.createElement('style'); css.textContent = `
      #kp{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:9;background:rgba(0,0,0,.55)}
      #kp.on{display:flex}
      #kp .box{background:#2e302c;border:2px solid #555;border-radius:12px;padding:14px 16px;box-shadow:0 10px 40px #000;width:min(250px,80vw)}
      #kp .lbl{font:600 12px sans-serif;letter-spacing:.14em;color:#c8c0a8;text-align:center;margin-bottom:8px}
      #kp .scr{background:#07140a;color:#3aff6a;font:bold 30px monospace;letter-spacing:.35em;text-align:center;padding:6px 0 6px .35em;border-radius:6px;margin-bottom:10px;min-height:38px}
      #kp .scr.bad{color:#ff4a3a} #kp .scr.ok{color:#9aff7a}
      #kp .keys{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
      #kp button{font:bold 20px sans-serif;padding:10px 0;border-radius:7px;border:0;background:#c8c4b8;color:#1a1a1a;cursor:pointer;touch-action:manipulation}
      #kp button.k2{background:#6a6c66;color:#fff;font-size:14px}
      #kp .hint{font:12px sans-serif;color:#9a9480;text-align:center;margin-top:8px}
      @media (max-height:420px){#kp .box{padding:8px 12px} #kp button{padding:5px 0;font-size:16px} #kp .scr{font-size:22px;min-height:28px;padding:2px 0 2px .35em;margin-bottom:6px} #kp .keys{gap:5px}}
      /* v3.4: short landscape phones (~250 px tall with Chrome's bars): code screen on the left, keys on the right, 44 px keys */
      @media (max-height:340px) and (orientation:landscape){#kp .box{display:grid;grid-template-columns:150px 200px;column-gap:14px;align-items:center;width:auto;max-width:94vw;padding:8px 12px}
        #kp .lbl,#kp .scr,#kp .hint{grid-column:1} #kp .keys{grid-column:2;grid-row:1/span 3;gap:5px} #kp button{min-height:44px;padding:0} #kp .hint{margin-top:4px}}
      @media (max-height:420px){.tk.mys{font-size:10.5px!important;line-height:1.28!important;padding:8px 10px!important}}
      #pauseLost{margin:2px auto 10px;max-width:420px;font:13px/1.45 sans-serif;text-align:left}
      #pauseLost .lf{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 10px;margin:4px 0}
      #pauseLost .lf span{opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #pauseLost .lf span.no{opacity:.35}
      #pauseLost .row{opacity:.8;text-align:center;white-space:nowrap}
      @media (max-height:420px){#pauseLost{font-size:11px;line-height:1.3;margin-bottom:4px} #pauseLost .lf{gap:1px 8px;margin:2px 0}}`;
    document.head.appendChild(css);
    const d = this.$kp = document.createElement('div'); d.id = 'kp';
    d.innerHTML = `<div class="box"><div class="lbl">ROOM 0 · STATION MASTER</div><div class="scr" id="kpScr">____</div><div class="keys">${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map(k => `<button data-k="${k}" class="${k.length > 1 || k === 'C' ? 'k2' : ''}">${k}</button>`).join('')}</div><div class="hint">${this.A.isTouch ? 'tap outside the keypad to step back' : 'type the digits · Enter · Esc to step back'}</div></div>`;
    document.body.appendChild(d);
    d.addEventListener('pointerdown', e => { e.stopPropagation(); const k = e.target.dataset && e.target.dataset.k; if (k) { e.preventDefault(); this.press(k); } else if (e.target === d) this.closeKeypad(); });
    d.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
  }
  get save() { const s = this.A.save; if (!Array.isArray(s.lost)) s.lost = []; if (!Array.isArray(s.digits)) s.digits = []; return s; }
  write() { this.A.writeSave && this.A.writeSave(); }
  complete() { const s = this.save; return LOST.every(l => s.lost.includes(l.id)) && !!s.roomOpen; }
  status() { const s = this.save; return { lost: s.lost.length, lostOf: LOST.length, digits: DIGITS.map(x => s.digits.includes(x.n) ? x.d : '_').join(''), room: !!s.roomOpen, read: !!s.readLog }; }

  // ---------- build (once per chapter) ----------
  build(CH) {
    const R = CH.root, fx = CH.fx, my = fx.my = { clocks: [], scratches: [], lost: [] };
    // stopped clocks
    const clk = (x, y, z, ry, r, label) => { const c = makeClock(r, label); c.position.set(x, y, z); c.rotation.y = ry; R.add(c); my.clocks.push(c); return c; };
    if (CH.id === 1) { clk(-3.44, 2.2, -3.0, Math.PI / 2, 0.16, 'STATION'); }        // waiting room, above the desk
    if (CH.id === 2) { clk(-2.17, 2.45, -6.0, Math.PI / 2, 0.2, 'SUBWAY'); }        // subway wall near the entry stairs
    if (CH.id === 3) { clk(-1.02, 1.92, -21.97, 0, 0.14, 'W.R. 2016'); }             // on the end wall of the coach, beside the door
    // scratched numbers
    for (const s of DIGITS.filter(x => x.ch === CH.id)) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: scratchTex(s.d, s.r), transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      m.position.set(...s.pos); m.rotation.y = s.ry; m.renderOrder = 3; R.add(m); my.scratches.push({ s, m, look: 0 });
    }
    // lost & found
    for (const l of LOST.filter(x => x.ch === CH.id)) {
      const it = this.F.inspectItem(R, 'lost_' + l.id, 'Pick it up', l.pos[0], l.pos[1], l.pos[2], l.ry, () => wrap(makeLostMesh(l.id)), {
        iscale: l.iscale, rx: l.rx, keep: false, caption: l.caption,
        onOpen: (F) => this.collect(l), onTurn: (F) => { F.A.showSub(l.back, 3200, true); if (l.id === 'anklet') { F.S.whisper && F.S.whisper(1.0, 0.3, 0.2); } } });
      mergeStatic(it.mesh.children[0]); it.lost = l; my.lost.push(it);
    }
    if (CH.id === 1) this.buildRoom(CH);
    if (CH.setBoard && !CH._boardWrapped) { const sb = CH.setBoard.bind(CH); CH._boardWrapped = true; CH.setBoard = (lines, color, temp) => { if (!temp) CH.boardLines = [lines, color]; sb(lines, color); }; }
  }
  buildRoom(CH) {
    const R = CH.root, fx = CH.fx, my = fx.my, { x0, x1, z0, z1, h, dz0, dz1 } = R0;
    const S = new THREE.Group(); R.add(S); // static shell + furniture, batched at the end
    const wallM = M.pbr('pwall', { rep: [1.4, 1.1], color: 0xb8ac90 });
    const wl = (w, hh, d, x, y, z) => { const m = box(w, hh, d, wallM, x, y, z, S); m.castShadow = m.receiveShadow = true; return m; };
    wl(x1 - x0, h, 0.1, (x0 + x1) / 2, h / 2, z1); CH.addSolid(x0, x1, z1 - 0.05, z1 + 0.05);
    wl(x1 - x0, h, 0.1, (x0 + x1) / 2, h / 2, z0); CH.addSolid(x0, x1, z0 - 0.05, z0 + 0.05);
    wl(0.1, h, dz0 - z0, x1, h / 2, (z0 + dz0) / 2); CH.addSolid(x1 - 0.05, x1 + 0.05, z0, dz0);
    wl(0.1, h, z1 - dz1, x1, h / 2, (z1 + dz1) / 2); CH.addSolid(x1 - 0.05, x1 + 0.05, dz1, z1);
    wl(0.1, h - 2.1, dz1 - dz0, x1, 2.1 + (h - 2.1) / 2, (dz0 + dz1) / 2);
    box(x1 - x0, 0.08, z1 - z0, M.std(0x34302a, 0.9), (x0 + x1) / 2, h + 0.04, (z0 + z1) / 2, S);
    // door (hinged on its +z edge; it swings OUT onto the platform — the room is too narrow for a door to open inward)
    const dg = my.door = new THREE.Group(); dg.position.set(x1, 0, dz1); R.add(dg);
    const dm = M.pbr('wood', { rep: [1, 2], color: 0x5a3a24 }); rbox(0.05, 2.08, dz1 - dz0 - 0.02, 0.01, dm, 0, 1.04, -(dz1 - dz0) / 2, dg);
    box(0.02, 0.2, 0.3, M.std(0x8a1a14, 0.6), 0.03, 1.55, -(dz1 - dz0) / 2, dg); // a red "NO ENTRY" plate
    const knob = cyl(0.02, 0.02, 0.05, M.std(0xb08a3a, 0.3, 1), 0.04, 1.0, -(dz1 - dz0) + 0.1, dg, 10); knob.rotation.z = Math.PI / 2; shadows(dg);
    for (const zz of [dz0 - 0.03, dz1 + 0.03]) box(0.13, 2.12, 0.06, M.std(0x3a2a1c, 0.7), x1, 1.06, zz, S); // jambs, proud of the wall
    my.doorSolid = { x0: x1 - 0.05, x1: x1 + 0.05, z0: dz0, z1: dz1 }; my.openSolid = { x0: x1, x1: x1 + 0.94, z0: dz1 - 0.05, z1: dz1 + 0.1 };
    // sign + keypad
    const sign = signMesh(panelTex([['कक्ष ० · स्टेशन मास्टर', 42, 'deva', '#fff'], ['ROOM 0 · STATION MASTER · NO ENTRY', 30, 'sans', '#fff']], { bg: '#6a1410', w: 1024, h: 140, top: 18, borderColor: '#fff', seed: 11 }), 1.45, 0.2);
    sign.rotation.y = Math.PI / 2; sign.position.set(x1 + 0.06, 2.4, (z0 + z1) / 2); R.add(sign);
    const kp = my.keypad = new THREE.Group(); kp.position.set(x1 + 0.05, 1.32, dz0 - 0.24); kp.rotation.y = Math.PI / 2; R.add(kp);
    rbox(0.12, 0.18, 0.03, 0.008, M.std(0x2a2c2a, 0.5, 0.6), 0, 0, 0, kp);
    const kf = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.15), new THREE.MeshStandardMaterial({ map: keypadTex(), emissive: 0xffffff, emissiveMap: keypadTex(), emissiveIntensity: 0.18, roughness: 0.5 })); kf.position.z = 0.016; kp.add(kf);
    const led = my.led = new THREE.Mesh(new THREE.CircleGeometry(0.006, 10), new THREE.MeshBasicMaterial({ color: 0xff2a1a, toneMapped: false })); led.position.set(0.045, 0.082, 0.017); kp.add(led);
    // inside: desk, chair, filing cabinet, the logbook, the incident report, a stopped clock, a bulb
    const wood = M.pbr('wood', { rep: [1, 1], color: 0x6a4428 }), dark = M.std(0x3a2a1c, 0.8);
    const desk = new THREE.Group(); desk.position.set(-3.08, 0, -36.55); desk.rotation.y = Math.PI / 2; S.add(desk);
    rbox(1.0, 0.05, 0.55, 0.01, wood, 0, 0.755, 0, desk); for (const [a, b] of [[-0.45, -0.23], [0.45, -0.23], [-0.45, 0.23], [0.45, 0.23]]) box(0.04, 0.73, 0.04, dark, a, 0.365, b, desk); shadows(desk);
    CH.addSolid(-3.5, -2.78, -37.1, -36.0);
    const chair = new THREE.Group(); chair.position.set(-2.55, 0, -36.3); chair.rotation.y = -0.5; S.add(chair); box(0.42, 0.04, 0.42, wood, 0, 0.46, 0, chair); for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box(0.03, 0.46, 0.03, dark, a, 0.23, b, chair); box(0.42, 0.45, 0.03, wood, 0, 0.7, 0.2, chair); shadows(chair); CH.addSolid(-2.8, -2.3, -36.55, -36.05);
    const cab = rbox(0.45, 1.3, 0.5, 0.01, M.std(0x4a5248, 0.6, 0.5), -3.24, 0.65, -33.85, S); cab.castShadow = true; CH.addSolid(-3.5, -3.0, -34.1, -33.45);
    for (let i = 0; i < 3; i++) box(0.12, 0.02, 0.01, M.std(0xb0a890, 0.3, 0.9), -3.0, 1.05 - i * 0.4, -33.85 + 0.0, S).rotation.y = Math.PI / 2;
    const papers = box(0.3, 0.03, 0.22, M.std(0xd8ccb0, 0.9), -3.2, 1.315, -33.85, S);
    clk(-2.72, 2.15, -33.46, Math.PI, 0.16, 'ROOM 0');
    function clk(x, y, z, ry, r, label) { const c = makeClock(r, label); c.position.set(x, y, z); c.rotation.y = ry; R.add(c); my.clocks.push(c); c.rotation.z = 0.08; }
    // logbook (open on the desk) and the incident report (pinned on the back wall)
    const lb = my.logbook = new THREE.Group(); lb.position.set(-3.05, 0.785, -36.45); lb.rotation.y = 0.2; R.add(lb);
    const red = M.std(0x5a1410, 0.8); box(0.36, 0.012, 0.26, red, 0, 0, 0, lb); const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24), new THREE.MeshStandardMaterial({ map: this.logTex(), roughness: 0.9, emissive: 0x18160f })); pg.rotation.x = -Math.PI / 2; pg.position.y = 0.0075; lb.add(pg);
    const rp = my.report = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.32), new THREE.MeshStandardMaterial({ map: this.reportTex(), roughness: 0.9, emissive: 0x18160f, side: THREE.DoubleSide })); rp.rotation.y = Math.PI / 2; rp.rotation.z = -0.04; rp.position.set(-3.444, 1.5, -35.0); R.add(rp);
    // a bare bulb (dark until the door opens — the room was sealed)
    const lamp = my.lamp = makeLamp(R, -2.72, 2.6, -35.4, { color: 0xffc080, power: 3.6, dist: 4.5, len: 0.45, cone: false, poolW: 1.6, poolD: 2.6, prio: 1.1 }); lamp.base = 1; lamp.level = 0; lamp.apply();
    // dust in the doorway light
    my.inside = (p) => p.x < x1 - 0.1 && p.x > x0 && p.z < z1 && p.z > z0;
    my.exitSpot = { id: 'room', x: -2.7, y: 0, z: -35.5, ry: Math.PI / 2, near: 1.0, when: () => true };
    mergeStatic(S); this.applyRoom(CH);
  }
  logTex() {
    const c = M.canvas(512, 360), g = c.getContext('2d'); g.fillStyle = '#e4d8b8'; g.fillRect(0, 0, 512, 360); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(254, 0, 4, 360);
    g.strokeStyle = 'rgba(60,80,130,.3)'; for (let y = 40; y < 360; y += 20) { g.beginPath(); g.moveTo(8, y); g.lineTo(504, y); g.stroke(); }
    const L = this.logLines(); g.font = '12px Georgia, serif'; g.fillStyle = '#2a2a3a';
    L.forEach((l, i) => { const col = i < 6 ? 0 : 1, row = i % 6; g.fillStyle = l.you ? '#a00' : '#2a2a3a'; g.font = l.you ? 'bold 14px Georgia, serif' : '12px Georgia, serif'; g.fillText(l.d, 14 + col * 256, 56 + row * 50); g.fillText(l.n.slice(0, 26), 14 + col * 256, 72 + row * 50); });
    M.grime(g, 512, 360, 0.5, 6); return M.ctex(c);
  }
  logLines() {
    const y = new Date().getFullYear(), last = (new Date().getMonth() > 9 || (new Date().getMonth() === 9 && new Date().getDate() === 31)) ? y : y - 1;
    const names = ['Kamla Desai, 54 — waited with a tiffin', 'R. Pillai, 41 — night porter', 'unknown woman, about 20', 'S. Kulkarni, 63 — retired', 'two college boys — names not given', 'a vendor — "chai, chai"', 'Ms. Fernandes, 37', 'nobody (the clock stopped anyway)', 'T. Ansari, 29'];
    const L = [{ d: '30.10.2016  23:58', n: 'Arjun Desai, 23 — struck at 23:58, goods train' }];
    for (let k = 2018, i = 0; k < Math.max(2019, last); k++, i++) L.push({ d: `31.10.${k}  02:17`, n: names[i % names.length] });
    L.push({ d: `31.10.${Math.max(2019, last)}  02:17`, n: 'YOU', you: true });
    return L.slice(-12);
  }
  reportTex() {
    const c = M.canvas(256, 340), g = c.getContext('2d'); g.fillStyle = '#ece4cc'; g.fillRect(0, 0, 256, 340);
    g.fillStyle = '#1a1a1a'; g.font = 'bold 14px monospace'; g.fillText('WESTERN RAILWAY', 14, 26); g.fillText('INCIDENT REPORT 0217', 14, 46); g.font = '11px monospace';
    for (let i = 0; i < 16; i++) g.fillRect(14, 66 + i * 15, 60 + rand() * 160, 2);
    g.fillStyle = '#a00'; g.font = 'bold 22px monospace'; g.save(); g.translate(150, 290); g.rotate(-0.25); g.strokeStyle = '#a00'; g.lineWidth = 3; g.strokeRect(-70, -22, 140, 34); g.fillText('UNSOLVED', -58, 3); g.restore();
    M.grime(g, 256, 340, 0.6, 5); return M.ctex(c);
  }
  applyRoom(CH) {
    const my = CH.fx.my, open = !!this.save.roomOpen; if (!my || !my.door) return;
    my.door.rotation.y = open ? -1.6 : 0;
    const sw = (o, want) => { const has = CH.solids.includes(o); if (want && !has) CH.solids.push(o); if (!want && has) CH.solids.splice(CH.solids.indexOf(o), 1); }; sw(my.doorSolid, !open); sw(my.openSolid, open);
    my.led.material.color.setHex(open ? 0x2aff4a : 0xff2a1a);
    my.lamp.level = open ? 0.85 : 0; my.lamp.base = my.lamp.level; my.lamp.apply();
    const inL = CH.lamps.includes(my.lamp); if (open && !inL) CH.lamps.push(my.lamp); if (!open && inL) CH.lamps.splice(CH.lamps.indexOf(my.lamp), 1);
  }

  // ---------- per loop ----------
  onLoop(CH, progress, exit, force) {
    const F = this.F, my = CH.fx.my, s = this.save, G = this.G; if (!my) return; const f = F.loopF;
    for (const c of my.clocks) c.visible = true;
    for (const sc of my.scratches) { sc.m.visible = !exit; sc.look = 0; }
    // one of her things waits in each loop (the first one you have not found in this chapter)
    let shown = null; for (const it of my.lost) { const on = !exit && !shown && (!s.lost.includes(it.lost.id) || force.lost === it.lost.id) && (!force.lost || force.lost === it.lost.id); it.mesh.visible = on; if (on) { shown = it; F.items.push({ obj: it.mesh, r: 1.35, label: 'Pick it up', use: () => F.openInspect(it) }); } }
    if (CH.id === 1 && my.door) { this.applyRoom(CH); if (!s.roomOpen) F.items.push({ obj: my.keypad, r: 1.5, label: 'Use the keypad', use: () => this.openKeypad() });
      if (s.roomOpen) this.roomItems(); }
    // the 0217 announcement: always possible on the last (exit) loop; on ordinary loops only once Room 0 is open (no false anomaly tells)
    const forced = Object.keys(force).length > 0;
    f.ann = force.ann0217 ? { at: 3.0 } : (!forced && !G.anomaly && ((exit && rand() < 0.6) || (!exit && s.roomOpen && progress >= 2 && rand() < 0.18)) ? { at: 5 + rand() * 6 } : null);
    f.roomScare = null;
  }
  // ---------- per frame ----------
  update(dt, p) {
    const F = this.F, CH = F.CH, my = CH && CH.fx && CH.fx.my, f = F.loopF, G = this.G; if (!my) return;
    const t = performance.now() / 1000;
    for (const c of my.clocks) { if (!c.visible) continue; const tw = (t % 1.0) < 0.12; c.userData.s.rotation.z = tw ? -0.1 : 0; }
    // scratches: a ghost of a mark in the dark, clear in the torch beam; found when lit (or stared at up close)
    const s = this.save;
    for (const sc of my.scratches) { if (!sc.m.visible) continue;
      const beam = F.inBeam(sc.m), dx = sc.m.position.x - p.x, dz = sc.m.position.z - p.z, d = Math.hypot(dx, dz);
      const base = G.blackout ? 0.32 : (d < 2.4 ? 0.13 : 0.05); sc.m.material.opacity = Math.max(base, beam);
      const looking = d < 2.0 && F.facing(sc.m.position, p) > 0.85; if (beam > 0.45 || looking) sc.look += dt; else sc.look = Math.max(0, sc.look - dt);
      if (sc.look > (beam > 0.45 ? 0.35 : 1.4) && !s.digits.includes(sc.s.n) && G.state === 'playing') { s.digits.push(sc.s.n); this.write(); F.A.showSub(`Scratched ${sc.s.where}:  ${sc.s.r} · ${sc.s.d}`, 3600, true); F.S.paper && F.S.paper(); }
    }
    // announcement
    if (f.ann && !f.ann.done && f.t > f.ann.at && G.state === 'playing') { f.ann.done = true; this.announce0217(CH); }
    if (f.ann && f.ann.restoreAt && f.t > f.ann.restoreAt) { f.ann.restoreAt = 0; if (CH.boardLines) CH.setBoard(CH.boardLines[0], CH.boardLines[1], true); }
    // Room 0: the exit scare (once per run, after reading the logbook)
    if (my.inside) { const inside = my.inside(p);
      if (inside) { f.wasInside = true; }
      if (f.wasInside && !inside && p.x > R0.x1 + 0.3 && s.readLog && !this.scared && G.state === 'playing') { this.scared = true; this.roomScare(CH); } }
  }
  roomItems() { const my = this.F.CH.fx.my; if (this.F.items.some(i => i.obj === my.logbook)) return;
    this.F.items.push({ obj: my.logbook, r: 1.3, label: 'Read the logbook', use: () => { this.readLog(); } }, { obj: my.report, r: 1.4, label: 'Read the report', use: () => { this.readReport(); } }); }
  phoneHint() { // the honest voice adds one thread of the mystery (the next thing you are missing), about half the time
    if (rand() < 0.45) return null; const st = this.status();
    if (st.lost < LOST.length) return '…her things are still lying on the platforms… bring them home…';
    if (st.digits.includes('_')) return '…the numbers are scratched where only light can find them…';
    if (!st.room) return '…Room 0… every clock stopped at the same minute…';
    return '…same night… same minute… don\'t wait for the 0217…';
  }
  announce0217(CH) {
    const G = this.G; G.announce('Yatri kripya dhyan dein. Train number zero two one seven, the Platform Zero Local, is arriving on Platform zero. This train is not in the timetable. Please do not wait for it.', true);
    if (CH.setBoard && CH.id === 1) { CH.setBoard(['0217  PLATFORM 0 LOCAL', '02:17   NOT IN TIMETABLE'], '#ff3a1a', true); this.F.loopF.ann.board = true; this.F.loopF.ann.restoreAt = this.F.loopF.t + 5.5; }
    this.F.loopF.ann.played = true;
  }
  roomScare(CH) {
    const F = this.F, my = CH.fx.my; if (!CH.fx.sight) return;
    F.loopF.sight = { spot: my.exitSpot, state: 'armed' };
    F.A.showSub('"…now you know when it comes."', 2600, true); if (!(F.S.voice && F.S.voice('w_know', { gain: 1.0, pan: -0.4 }))) F.S.whisper && F.S.whisper(1.4, -0.4, 0.3);
    my.lamp.level = 0.05; my.lamp.apply(); setTimeout(() => { if (this.save.roomOpen) { my.lamp.level = 0.85; my.lamp.apply(); } }, 700);
  }
  collect(l) {
    const s = this.save; if (!s.lost.includes(l.id)) { s.lost.push(l.id); this.write(); }
    const n = s.lost.length; setTimeout(() => this.A.hint(n >= LOST.length ? 'Lost & Found: all of her things. Now find Room 0.' : `Lost & Found ${n} / ${LOST.length} — ${l.name}`, 2600), 300);
    this.F.S.paper && this.F.S.paper();
  }
  readLog() {
    const s = this.save; s.readLog = true; this.write();
    const L = this.logLines(), row = (l) => `<div style="margin:0 0 5px;${l.you ? 'color:#a00;font-weight:bold;font-size:15px' : ''}"><span style="opacity:.7">${l.d}</span><br>${l.n}${l.you ? ' <span style="font-size:11px;font-weight:normal">(the ink is still wet)</span>' : ''}</div>`;
    const cut = Math.ceil(L.length / 2);
    this.A.openNote('PLATFORM 0 · LOGBOOK', paperTexHTML(`<div style="opacity:.6;margin-bottom:6px">Last seen waiting on Platform 0</div>${L.slice(0, cut).map(row).join('')}`),
      paperTexHTML(`${L.slice(cut).map(row).join('')}<div style="margin-top:8px;opacity:.7;font-style:italic">Same night. Same minute. Every year.</div>`));
    return null;
  }
  readReport() {
    const s = this.save; s.readReport = true; this.write();
    this.A.openNote('INCIDENT REPORT 0217', paperTexHTML(`<b>WESTERN RAILWAY · SHUNYA ROAD</b><br>Report No. 0217 / 2018<br><br>
      30.10.2016, 23:58. Arjun Desai (23) struck by a goods train passing through the closed Platform 0 while waiting for the 23:58 slow local (cancelled). Headphones on. The driver sounded the horn twice. His mother was informed by telephone at 02:17.<br><br>
      After that his mother, Smt. Kamla Desai (54), came every night with a tiffin. Staff let her sit.<br><br>
      31.10.2018, <b>02:17</b>. Every clock in the station stopped. A local with no lights entered Platform 0. It is not in any timetable. When it left, Smt. Desai was gone.`),
      paperTexHTML(`Her things were found on the platforms and sent to Lost &amp; Found.<br><br>The clocks were never repaired.<br><br>— S. Mehta, Station Master<br><br><i style="color:#555">In pencil, underneath: "It comes back every year. Same night, same minute. Don't let anyone wait on Platform 0. I set the door code to the time, so I never forget."</i>`));
    return null;
  }
  // ---------- keypad ----------
  openKeypad() {
    const G = this.G; if (G.state !== 'playing') return; this.prevState = G.state; G.state = 'keypad'; this.A.holdClock(); for (const k in this.A.keys) this.A.keys[k] = false; if (document.pointerLockElement) document.exitPointerLock();
    this.kp.code = ''; this.kp.open = true; this.draw(); this.$kp.classList.add('on'); this.F.$prompt.classList.remove('on'); this.F.$useBtn.classList.remove('on'); this.F.S.step && this.F.S.step(0.2);
  }
  closeKeypad() {
    if (!this.kp.open) return; this.kp.open = false; this.$kp.classList.remove('on'); const G = this.G;
    if (G.state === 'keypad') { G.state = 'playing'; this.A.show('hud'); this.A.releaseClock(); if (!this.A.isTouch) this.A.lockPointer(); this.A.resetClock(); }
  }
  draw(cls) { const e = document.getElementById('kpScr'); e.textContent = (this.kp.code + '____').slice(0, 4); e.className = 'scr' + (cls ? ' ' + cls : ''); }
  beep(f, d = 0.08, g0 = 0.05) { const S = this.F.S; if (!S || !S.ctx) return; const c = S.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(g0, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(S.master); o.start(t); o.stop(t + d + 0.02); }
  press(k) {
    if (!this.kp.open || this.kp.busy) return;
    if (k === 'C') { this.kp.code = ''; this.draw(); this.beep(600); return; }
    if (k === 'OK') return this.submit();
    if (/^[0-9]$/.test(k) && this.kp.code.length < 4) { this.kp.code += k; this.draw(); this.beep(1200); if (this.kp.code.length === 4) setTimeout(() => this.submit(), 250); }
  }
  submit() {
    if (!this.kp.open || this.kp.busy) return; const ok = this.kp.code === CODE; this.kp.busy = true;
    if (ok) { this.draw('ok'); this.beep(1600, 0.12); setTimeout(() => this.beep(2000, 0.2), 140); setTimeout(() => { this.kp.busy = false; this.closeKeypad(); this.unlock(); }, 650); }
    else { this.draw('bad'); this.beep(180, 0.45, 0.08); setTimeout(() => { this.kp.busy = false; this.kp.code = ''; this.draw(); }, 700); this.wrong = (this.wrong || 0) + 1; if (this.wrong === 3) this.A.hint('Every clock here stopped at the same minute.', 3200); }
  }
  unlock() {
    const s = this.save, CH = this.F.CH; s.roomOpen = true; this.write();
    const my = CH.fx.my; this.F.items = this.F.items.filter(i => i.obj !== my.keypad);
    const S = this.F.S; if (S && S.ctx) { const c = S.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(45, t + 1.4); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; o.connect(f); f.connect(g); g.connect(S.master); o.start(t); o.stop(t + 1.6); }
    // swing it open over a second
    const d = my.door, t0 = performance.now(); const step = () => { const k = Math.min(1, (performance.now() - t0) / 1400); d.rotation.y = -1.6 * (1 - Math.pow(1 - k, 3)); if (k < 1) requestAnimationFrame(step); }; step();
    const i = CH.solids.indexOf(my.doorSolid); if (i >= 0) CH.solids.splice(i, 1); if (!CH.solids.includes(my.openSolid)) CH.solids.push(my.openSolid);
    my.led.material.color.setHex(0x2aff4a); setTimeout(() => { if (!CH.lamps.includes(my.lamp)) CH.lamps.push(my.lamp); my.lamp.level = 0.85; my.lamp.base = 0.85; my.lamp.apply(); }, 900);
    this.roomItems(); this.A.hint('ROOM 0 is open', 2400);
  }
  key(code) {
    if (!this.kp.open) return false;
    if (code === 'Escape' || code === 'KeyE' && !this.kp.code) { this.closeKeypad(); return true; }
    if (code === 'Enter' || code === 'NumpadEnter') { this.press('OK'); return true; }
    if (code === 'Backspace') { this.kp.code = this.kp.code.slice(0, -1); this.draw(); return true; }
    const m = /^(Digit|Numpad)([0-9])$/.exec(code); if (m) { this.press(m[2]); return true; }
    return true;
  }
  // ---------- pause / title / ending text ----------
  pauseHTML() {
    const s = this.save, st = this.status();
    const items = LOST.map(l => s.lost.includes(l.id) ? `<span>${l.icon} ${l.name}</span>` : '<span class="no">❔ ???</span>').join('');
    return `<div class="row">🧳 Lost &amp; Found ${st.lost} / ${st.lostOf}</div><div class="lf">${items}</div><div class="row">🔢 Scratched: <b style="letter-spacing:.3em">${st.digits}</b> &nbsp; 🚪 Room 0: ${st.room ? 'open' : 'locked'}</div>`;
  }
  endHint(pagesDone) { const st = this.status(); if (st.lost >= LOST.length && st.room) return '';
    return pagesDone ? '<span style="color:#f2c613">Something is still missing — her things, and Room 0.</span>' : (st.lost || st.room ? `Lost &amp; Found ${st.lost} / ${st.lostOf}${st.room ? ' · Room 0 opened' : ''}` : ''); }
  // debug / tests
  forceComplete() { const s = this.save; s.lost = LOST.map(l => l.id); s.roomOpen = true; s.digits = DIGITS.map(d => d.n); this.write(); }
}
