// PLATFORM 0 v2 — Chapter 3: inside the last local (moving train)
import * as THREE from './three.module.min.js';
import * as M from './mats.js';
import { box, rbox, cyl, plane, shadows, makeHuman, animateWalk, stillPose, sitPose, makeLamp, makeFan, platformSign, panelTex, signMesh, setSignCanvas, makeDust } from './props.js';
import { Chapter, facePlayer, angleTo } from './chapter.js';
import { pushOut, clearAt } from './npc.js';
import * as TX from './tx1.js';
import { CH3_SUBTLE } from './subtle.js'; // v3.5 hidden anomalies

const HW = 1.55, CH = 2.5, ZR = 3, ZF = -22, ZS0 = -0.4, ZS1 = -18.6; // half width, ceiling, rear/front walls, seating zone

// outside world, two parallax layers per side (the old single flat 2048px strip looked blocky):
//  far  = night skyline with haze, many small lit windows, water tanks / antennas, sodium glow, scrolls slowly
//  near = trackside layer with alpha: catenary masts, fence, poles, bushes (or the lit Platform 0 for the anomaly), scrolls fast
function farTex(hi) {
  const W = hi ? 4096 : 2048, Hh = hi ? 1024 : 512, k = W / 2048;
  const c = M.canvas(W, Hh), g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, Hh); sky.addColorStop(0, '#030508'); sky.addColorStop(0.45, '#0a0d14'); sky.addColorStop(0.62, '#2a1a12'); sky.addColorStop(0.66, '#120d0b'); sky.addColorStop(1, '#040404');
  g.fillStyle = sky; g.fillRect(0, 0, W, Hh);
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const base = Hh * 0.68;
  // two rows of buildings: back row hazier, front row darker with more detail
  for (const row of [0, 1]) {
    for (let x = -20 * k; x < W; ) {
      const w = (30 + rnd() * (row ? 110 : 80)) * k, h = (row ? 50 + rnd() * 170 : 90 + rnd() * 140) * k, top = base - h + (row ? 6 : -10) * k;
      const col = row ? '#06070a' : '#0c0e13';
      g.fillStyle = col; g.fillRect(x, top, w, Hh - top);
      if (rnd() < 0.3) { g.fillRect(x + w * 0.2, top - 14 * k, w * 0.35, 14 * k); } // stair/lift room
      if (rnd() < 0.35) { g.fillStyle = '#05060a'; g.fillRect(x + w * 0.6, top - 22 * k, 16 * k, 22 * k); g.fillRect(x + w * 0.57, top - 24 * k, 22 * k, 4 * k); } // water tank
      if (rnd() < 0.25) { g.fillStyle = '#05060a'; g.fillRect(x + w * 0.3, top - 40 * k, 2 * k, 40 * k); if (rnd() < 0.6) { g.fillStyle = 'rgba(255,40,30,.9)'; g.fillRect(x + w * 0.3 - k, top - 42 * k, 3 * k, 3 * k); } }
      // windows: a grid, most dark, some warm or tube-white, a few TV-blue
      const cw = 5 * k, chh = 6 * k, gx = 11 * k, gy = 13 * k;
      for (let wy = top + 8 * k; wy < base + 30 * k; wy += gy) for (let wx = x + 5 * k; wx < x + w - cw - 3 * k; wx += gx) {
        const r = rnd(); if (r > (row ? 0.22 : 0.3)) continue;
        g.fillStyle = r < 0.16 ? `rgba(255,${170 + (rnd() * 40) | 0},${90 + (rnd() * 40) | 0},${row ? 0.55 : 0.85})` : r < 0.25 ? `rgba(215,235,230,${row ? 0.45 : 0.7})` : `rgba(110,150,255,${row ? 0.4 : 0.6})`;
        g.fillRect(wx, wy, cw, chh);
      }
      x += w + (rnd() < 0.2 ? 20 * k : 0);
    }
    // haze over the back row
    if (!row) { const hz = g.createLinearGradient(0, base - 200 * k, 0, base + 40 * k); hz.addColorStop(0, 'rgba(40,26,18,0)'); hz.addColorStop(1, 'rgba(60,36,22,.55)'); g.fillStyle = hz; g.fillRect(0, base - 200 * k, W, 240 * k); }
  }
  // neon / hoarding glows
  for (let i = 0; i < 6; i++) { const x = rnd() * W, y = base - (40 + rnd() * 120) * k, col = rnd() < 0.5 ? '255,60,60' : '60,220,160'; const rg = g.createRadialGradient(x, y, 0, x, y, 60 * k); rg.addColorStop(0, `rgba(${col},.55)`); rg.addColorStop(1, `rgba(${col},0)`); g.fillStyle = rg; g.fillRect(x - 60 * k, y - 60 * k, 120 * k, 120 * k); g.fillStyle = `rgba(${col},.9)`; g.fillRect(x - 18 * k, y - 4 * k, 36 * k, 8 * k); }
  // ground: dark embankment with sodium street lamps
  g.fillStyle = '#030303'; g.fillRect(0, base + 34 * k, W, Hh);
  for (let x = 40 * k; x < W; x += 220 * k) { const y = base + 20 * k; const rg = g.createRadialGradient(x, y, 0, x, y, 80 * k); rg.addColorStop(0, 'rgba(255,170,80,.75)'); rg.addColorStop(0.25, 'rgba(255,140,60,.25)'); rg.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = rg; g.fillRect(x - 80 * k, y - 80 * k, 160 * k, 160 * k); g.fillStyle = '#ffd9a0'; g.fillRect(x - 2 * k, y - 2 * k, 5 * k, 3 * k); }
  return c;
}
function nearTex(kind) {
  const W = 2048, Hh = 512, c = M.canvas(W, Hh), g = c.getContext('2d');
  let s = kind === 'zero' ? 5 : 23; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  if (kind === 'zero') { // a lit platform with "PLATFORM 0" boards rushing past
    g.fillStyle = 'rgba(40,40,34,1)'; g.fillRect(0, 368, W, Hh - 368); g.fillStyle = '#d0b020'; g.fillRect(0, 368, W, 7);
    for (let x = 0; x < W; x += 256) { g.fillStyle = '#16140f'; g.fillRect(x + 120, 60, 10, 308); const lg = g.createRadialGradient(x + 125, 70, 0, x + 125, 70, 200); lg.addColorStop(0, 'rgba(230,255,220,.5)'); lg.addColorStop(1, 'rgba(230,255,220,0)'); g.fillStyle = lg; g.fillRect(x - 80, 0, 410, 330); g.fillStyle = '#e8ffe0'; g.fillRect(x + 95, 62, 60, 6); }
    for (let x = 150; x < W; x += 512) { g.fillStyle = '#f2c613'; g.fillRect(x, 150, 260, 80); g.fillStyle = '#111'; g.font = `900 44px ${M.SANS}`; g.textAlign = 'center'; g.fillText('PLATFORM 0', x + 130, 205); }
    return c;
  }
  // gravel bank + fence line at the bottom of the window view
  const fb = g.createLinearGradient(0, 380, 0, Hh); fb.addColorStop(0, 'rgba(8,8,8,0)'); fb.addColorStop(0.3, 'rgba(6,6,6,.95)'); fb.addColorStop(1, 'rgba(3,3,3,1)'); g.fillStyle = fb; g.fillRect(0, 380, W, Hh - 380);
  g.fillStyle = 'rgba(2,2,2,.95)'; for (let x = 0; x < W; x += 14) g.fillRect(x, 395, 2, 40); g.fillRect(0, 398, W, 2); g.fillRect(0, 418, W, 2);
  // bushes
  for (let x = 0; x < W; x += 30 + rnd() * 80) { const r = 20 + rnd() * 40; g.fillStyle = 'rgba(3,4,3,.97)'; g.beginPath(); g.ellipse(x, 430, r * 1.4, r, 0, Math.PI, 0); g.fill(); }
  // catenary masts with cantilever arms + wires
  for (let x = 60; x < W; x += 1024) {
    g.fillStyle = 'rgba(1,1,1,1)'; g.fillRect(x, 0, 18, Hh); g.fillRect(x - 4, 0, 26, 16);
    g.fillRect(x - 120, 70, 140, 7); g.save(); g.translate(x - 110, 74); g.rotate(-0.28); g.fillRect(0, 0, 130, 4); g.restore();
    g.fillStyle = 'rgba(60,40,30,.6)'; g.fillRect(x + 2, 200, 14, 40); // rust patch catching light
  }
  g.fillStyle = 'rgba(0,0,0,.9)'; g.fillRect(0, 40, W, 2); g.fillRect(0, 82, W, 1.5);
  // short signal posts / relay boxes
  for (let x = 300; x < W; x += 700) { g.fillStyle = 'rgba(1,1,1,1)'; g.fillRect(x, 300, 8, 120); g.fillRect(x - 10, 290, 28, 22); g.fillStyle = rnd() < 0.5 ? 'rgba(255,60,40,.95)' : 'rgba(60,255,120,.9)'; g.beginPath(); g.arc(x + 4, 301, 5, 0, 7); g.fill(); }
  return c;
}

export class Ch3 extends Chapter {
  constructor(game) {
    super(game);
    this.id = 3; this.title = 'THE LAST LOCAL';
    this.fogColor = 0x06080a; this.fogDensity = 0.045; this.exposure = 0.85;
    this.start = { x: 0, z: 1.6, yaw: 0 };
    this.bounds = { x0: -HW + 0.12, x1: HW - 0.12, z0: ZF - 2.6, z1: ZR + 2.6 };
    this.anomalies = CH3_ANOMALIES.concat(CH3_SUBTLE); this.surface = 'metal'; this.trainLevel = 1; this.rainLevel = 0; this.visitHint = 'Walk at least halfway down the coach before you turn back';
    this.specialAnomaly = CHASE;
    this.build();
  }
  loopLabel(n) { return n >= 8 ? 'COACH 8 · LAST STOP' : 'COACH ' + n; }
  isBack(p) { return p.z > ZR + 0.6; }
  isForward(p) { return p.z < ZF - 0.6; }
  visitedAt(p) { return p.z < -8; }
  special(G) { return G.progress === 5 && !G.chaseDone; }
  camSway(T) { const k = this.flags.stopped ? 0 : 1; return { roll: (Math.sin(T * 1.7) * 0.006 + Math.sin(T * 0.53) * 0.008) * k, x: Math.sin(T * 1.1) * 0.012 * k, y: Math.abs(Math.sin(T * 7.1)) * 0.004 * k }; }
  build() {
    const root = this.root, len = ZR - ZF, mid = (ZR + ZF) / 2;
    const wallM = M.pbr('tpaint', { rep: [len / 2.2, 1], color: 0x9fb8a8, env: 0.7 }); wallM.map = null; wallM.normalScale.set(0.6, 0.6);
    const floorM = M.pbr('tfloor', { rep: [2, 16], color: 0x8a8a86, metal: 1, env: 0.9 });
    const f = plane(HW * 2, len, floorM, root); f.rotation.x = -Math.PI / 2; f.position.set(0, 0, mid); f.receiveShadow = true;
    // ceiling (gently curved) + walls below windows + pillars between windows
    const ceilM = new THREE.MeshStandardMaterial({ color: 0x9aa296, roughness: 0.7, envMapIntensity: 0.4 });
    const cc = plane(1.6, len, ceilM, root); cc.rotation.x = Math.PI / 2; cc.position.set(0, CH, mid);
    for (const s of [-1, 1]) { const dx = HW - 0.8, dy = CH - 2.32, w = Math.hypot(dx, dy); const cv = plane(w, len, ceilM, root); cv.rotation.order = 'ZXY'; cv.rotation.x = Math.PI / 2; cv.rotation.z = 0; cv.rotation.y = s * Math.atan2(dy, dx); cv.position.set(s * (0.8 + dx / 2), 2.32 + dy / 2, mid); }
    for (const s of [-1, 1]) {
      const low = plane(len, 0.85, wallM, root); low.rotation.y = -s * Math.PI / 2; low.position.set(s * HW, 0.425, mid);
      const top = plane(len, 0.55, wallM, root); top.rotation.y = -s * Math.PI / 2; top.position.set(s * HW, 2.05 - 0.05, mid);
      const ao = M.aoStrip(len, 0.4, 0.6); ao.rotation.y = -s * Math.PI / 2; ao.position.set(s * (HW - 0.01), 0.2, mid); root.add(ao);
      // window piers + bars
      for (let z = ZS0; z >= ZS1 - 0.01; z -= 1.75) {
        box(0.08, 0.95, 0.35, wallM, s * (HW - 0.02), 1.32, z, root);
        for (let k = 0; k < 4; k++) box(0.02, 0.02, 1.4, M.std(0x9aa0a0, 0.35, 0.9), s * (HW - 0.05), 0.98 + k * 0.22, z - 0.875, root);
      }
    }
    // outside world (scrolling, two parallax layers per side; each side scrolls its own way so both windows agree on direction)
    { const hi = this.game.engine.qKey !== 'low';
      const farC = farTex(hi), nearC = { n: nearTex('n'), zero: nearTex('zero') };
      const f0 = M.ctex(farC); f0.wrapS = THREE.RepeatWrapping; f0.repeat.set(3, 1);
      const n0 = { n: M.ctex(nearC.n), zero: M.ctex(nearC.zero) }; for (const t of Object.values(n0)) { t.wrapS = THREE.RepeatWrapping; t.repeat.set(6, 1); }
      this.outSides = [-1, 1].map((s, i) => {
        const ft = i ? f0.clone() : f0, nt = i ? { n: n0.n.clone(), zero: n0.zero.clone() } : n0;
        const fm = new THREE.MeshBasicMaterial({ map: ft, fog: false });
        const nm = new THREE.MeshBasicMaterial({ map: nt.n, fog: false, transparent: true, depthWrite: false });
        const fp = plane(180, 40, fm, root); fp.rotation.y = -s * Math.PI / 2; fp.position.set(s * 26, 8.2, mid);
        const np = plane(120, 10, nm, root); np.rotation.y = -s * Math.PI / 2; np.position.set(s * 4.5, 2.5, mid); np.renderOrder = 1;
        return { s, fm, nm, nt };
      }); }
    this.outScroll = 0; this.outDir = 1;
    // end walls with gangway doors + short dark passages
    for (const [z, dir] of [[ZR, 1], [ZF, -1]]) {
      const seg = (x0, x1, y0, y1) => { const m = plane(x1 - x0, y1 - y0, wallM, root); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); m.rotation.y = dir > 0 ? Math.PI : 0; };
      seg(-HW, -0.45, 0, CH); seg(0.45, HW, 0, CH); seg(-0.45, 0.45, 1.95, CH);
      const pas = plane(0.9, 1.95, M.basic(0x000000), root); pas.position.set(0, 0.975, z + dir * 2.4); pas.rotation.y = dir > 0 ? Math.PI : 0;
      for (const sx of [-1, 1]) { const w = plane(2.4, 1.95, M.std(0x202420, 0.8), root); w.rotation.y = -sx * Math.PI / 2; w.position.set(sx * 0.45, 0.975, z + dir * 1.2); }
      const fl = plane(0.9, 2.4, floorM, root); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, z + dir * 1.2);
      this.addSolid(-HW - 1, -0.45, z - 0.1, z + 0.1); this.addSolid(0.45, HW + 1, z - 0.1, z + 0.1);
      this.addSolid(-HW - 1, -0.45, Math.min(z, z + dir * 2.6), Math.max(z, z + dir * 2.6)); this.addSolid(0.45, HW + 1, Math.min(z, z + dir * 2.6), Math.max(z, z + dir * 2.6));
    }
    // vestibule doorways (open, both sides) with central poles
    this.doorVoids = [];
    for (const zc of [ZR - 1.6, ZF + 1.6]) for (const s of [-1, 1]) {
      box(0.1, CH, 0.12, M.std(0x8a9088, 0.4, 0.8), s * HW, CH / 2, zc - 0.7, root); box(0.1, CH, 0.12, M.std(0x8a9088, 0.4, 0.8), s * HW, CH / 2, zc + 0.7, root);
      const pole = cyl(0.025, 0.025, 2.0, M.std(0xb8b8b8, 0.25, 1), s * (HW - 0.1), 1.0, zc, root, 10);
      const v = plane(1.3, 2.0, new THREE.MeshBasicMaterial({ color: 0x000000, fog: false }), root); v.rotation.y = -s * Math.PI / 2; v.position.set(s * (HW + 0.6), 1.0, zc); v.visible = false; this.doorVoids.push(v);
    }
    // seats: facing cross benches, vinyl
    const vinyl = M.std(0x2a5a6a, 0.45, 0.0, { envMapIntensity: 0.8 }), frame = M.std(0x7a807c, 0.4, 0.85);
    this.seats = [];
    for (let z = ZS0 - 0.875, i = 0; z > ZS1; z -= 1.75, i++) for (const s of [-1, 1]) {
      for (const fz of [-0.62, 0.62]) {
        rbox(1.0, 0.1, 0.46, 0.04, vinyl, s * 1.0, 0.45, z + fz * 0.85, root);
        const back = rbox(1.0, 0.62, 0.08, 0.03, vinyl, s * 1.0, 0.82, z + fz * 1.2, root);
        box(0.9, 0.4, 0.04, frame, s * 1.0, 0.2, z + fz * 0.85, root);
        this.seats.push({ x: s * 1.0, z: z + fz * 0.85, face: fz > 0 ? Math.PI : 0, s });
      }
      // luggage rack
      box(0.5, 0.02, 1.6, M.std(0x9a9e9a, 0.3, 0.9), s * 1.25, 2.0, z, root); box(0.02, 0.1, 1.6, M.std(0x9a9e9a, 0.3, 0.9), s * 1.0, 2.05, z, root);
      this.addSolid(s > 0 ? 0.47 : -HW, s > 0 ? HW : -0.47, z - 0.86, z + 0.86); this.solids[this.solids.length - 1].top = 1.16; // v3.3.1: the third-person camera may pass above the seat backs
    }
    // grab rails + hanging handles
    this.handles = [];
    for (const x of [-0.42, 0.42]) { const r = cyl(0.016, 0.016, len - 1, M.std(0xc0c0c0, 0.25, 1), x, 1.98, mid, root, 8); r.rotation.x = Math.PI / 2;
      for (let z = ZR - 1; z > ZF + 1; z -= 0.55) { const h = new THREE.Group(); h.position.set(x, 1.98, z); root.add(h); box(0.025, 0.2, 0.012, M.std(0x222222, 0.6), 0, -0.1, 0, h); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 14), M.std(0x8a8270, 0.5)); ring.position.y = -0.25; h.add(ring); h.userData.ph = Math.random() * 6; this.handles.push(h); } }
    // fans (in cages) + tube lamps (two rows)
    this.fans = [];
    for (let z = ZR - 3.5; z > ZF + 2; z -= 3.6) { const fan = makeFan(root, 0, CH - 0.32, z, 0.12); fan.scale.setScalar(0.75); this.fans.push(fan.userData.hub);
    }
    for (let z = ZR - 1.3; z > ZF + 0.5; z -= 2.4) for (const x of [-0.75, 0.75]) { const l = makeLamp(root, x, 2.22, z, { color: 0xdcecf4, power: 2.4, dist: 6, len: 1.0, cone: false, poolW: 2.4, poolD: 2.6, poolX: -x * 0.4 }); this.lamps.push(l); }
    this.hemi = new THREE.HemisphereLight(0x8a96a0, 0x202224, 0.45); root.add(this.hemi);
    // signs: class, chain, LED destination board above front door, route map
    this.ledCanvas = M.canvas(512, 128); this.ledTex = M.ctex(this.ledCanvas);
    { const g = new THREE.Group(); g.position.set(0, 2.18, ZF + 0.08); root.add(g); box(1.7, 0.26, 0.08, M.std(0x111111, 0.5), 0, 0, -0.03, g);
      const s = plane(1.62, 0.2, new THREE.MeshStandardMaterial({ map: this.ledTex, emissive: 0xffffff, emissiveMap: this.ledTex, emissiveIntensity: 2.4, color: 0x111111 }), g); s.position.z = 0.015; }
    { const s = signMesh(panelTex([['द्वितीय श्रेणी', 70, 'deva', '#fff'], ['SECOND CLASS', 60, 'sans', '#fff']], { bg: '#7a1a1a', w: 512, h: 200, top: 20, borderColor: '#fff', grime: 0.3 }), 0.7, 0.27); s.position.set(-0.95, 2.15, ZR - 0.06); s.rotation.y = Math.PI; root.add(s); }
    this.coachNo = signMesh(panelTex([['डिब्बा 0', 80, 'deva', '#111'], ['COACH 0', 70, 'sans', '#111']], { bg: '#f2c613', w: 512, h: 220, top: 20 }), 0.6, 0.26); this.coachNo.position.set(0.95, 2.15, ZF + 0.06); root.add(this.coachNo);
    const chainSign = signMesh(panelTex([['आपातकाल में', 50, 'deva', '#fff'], ['जंजीर खींचें', 56, 'deva', '#fff'], ['PULL CHAIN IN', 40, 'sans', '#fff'], ['EMERGENCY', 40, 'sans', '#fff'], ['Misuse: ₹1000 fine', 30, 'sans', '#ffd0d0']], { bg: '#b01818', w: 384, h: 420, top: 18, borderColor: '#fff', grime: 0.3 }), 0.34, 0.37); chainSign.position.set(-HW + 0.02, 1.85, -9.6); chainSign.rotation.y = Math.PI / 2; root.add(chainSign);
    this.chain = new THREE.Group(); this.chain.position.set(-HW + 0.1, 2.0, -9.2); root.add(this.chain); box(0.012, 0.35, 0.012, M.std(0xb0a050, 0.3, 0.9), 0, -0.17, 0, this.chain); cyl(0.03, 0.03, 0.06, M.std(0xb01010, 0.4), 0, -0.36, 0, this.chain, 8);
    this.alarm = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), M.emissive(0xff1010, 0)); this.alarm.position.set(0, 2.3, -9.2); root.add(this.alarm);
    const route = (zero) => { const c = M.canvas(1024, 128), g = c.getContext('2d'); g.fillStyle = '#e8e2cc'; g.fillRect(0, 0, 1024, 128); g.fillStyle = '#1a4a8a'; g.fillRect(20, 60, 984, 8); const st = zero ? Array(7).fill('SHUNYA RD') : ['CHURCHGATE', 'MARINE LINES', 'DADAR', 'BANDRA', 'ANDHERI', 'BORIVALI', 'SHUNYA RD'];
      st.forEach((n, i) => { const x = 60 + i * 150; g.fillStyle = i === 6 || zero ? '#b01010' : '#1a4a8a'; g.beginPath(); g.arc(x, 64, 12, 0, 7); g.fill(); g.fillStyle = '#111'; g.font = `700 20px ${M.SANS}`; g.textAlign = 'center'; g.fillText(n, x, 108); g.font = `700 18px ${M.DEVA}`; g.fillText(zero ? 'शून्य रोड' : ['चर्चगेट', 'मरीन लाइन्स', 'दादर', 'बांद्रा', 'अंधेरी', 'बोरीवली', 'शून्य रोड'][i], x, 36); }); M.grime(g, 1024, 128, 0.4, 3); return c; };
    this.routeCanvas = { n: route(false), z: route(true) }; this.routeMaps = [];
    for (const s of [-1, 1]) { const r = signMesh(this.routeCanvas.n, 1.6, 0.2); r.rotation.y = -s * Math.PI / 2; r.position.set(s * (HW - 0.015), 2.2, -5.2); root.add(r); this.routeMaps.push(r); }
    // ads stickers
    { const s = signMesh(panelTex([['English बोलना', 50, 'deva'], ['सीखें 30 दिन में', 46, 'deva'], ['SPOKEN ENGLISH', 40, 'sans', '#b01010'], ['📞 98200 00000', 36, 'sans']], { bg: '#f0e8a0', w: 384, h: 300, top: 18, seed: 81 }), 0.4, 0.31); s.rotation.y = -Math.PI / 2; s.position.set(HW - 0.015, 2.15, -12.8); root.add(s); }
    // newspaper on a seat
    const paper = (bad) => panelTex(bad ? [['THE DAILY LOCAL', 46, 'sans'], ['PASSENGER MISSING', 50, 'sans', '#b01010', 4], ['ON PLATFORM 0', 50, 'sans', '#b01010'], ['red backpack, headphones,', 30, 'sans', '#222', 8], ['last seen tonight 23:58', 30, 'sans']] : [['THE DAILY LOCAL', 46, 'sans'], ['SENSEX UP 200', 50, 'sans', '#222', 4], ['Monsoon returns', 36, 'sans'], ['to Mumbai', 36, 'sans', '#222', 8], ['Local trains late again', 30, 'sans']], { bg: '#e2dccb', w: 512, h: 400, top: 18, bw: 2, seed: 91 });
    this.paperCanvas = { n: paper(false), b: paper(true) };
    this.newspaper = signMesh(this.paperCanvas.n, 0.42, 0.33); this.newspaper.rotation.x = -Math.PI / 2; this.newspaper.rotation.z = 0.3; this.newspaper.position.set(0.95, 0.51, -14.1); root.add(this.newspaper);
    // passengers
    const P = [
      { seat: 2, o: { shirt: 0x6a7a8a, pants: 0x2a2a30, skin: 0x7a4e33 }, sleep: 1 },
      { seat: 5, o: { shirt: 0xc8b090, pants: 0x3a3028, skin: 0x5a3820, mustache: true }, sleep: 1 },
      { seat: 9, o: { shirt: 0x8a3a3a, pants: 0x2a2a2a, skin: 0x8a5a3c }, sleep: 0 },
      { seat: 14, o: { shirt: 0xe2e0d6, pants: 0x30323a, skin: 0x7a4e33, backpack: true, headphones: true }, sleep: 1, you: 1 },
      { seat: 18, o: { shirt: 0x4a6a4a, pants: 0x2a2a30, skin: 0x6b4128, cap: 0x2a2a2a }, sleep: 1 },
      { seat: 23, o: { shirt: 0xd8d0b8, pants: 0x4a4038, skin: 0x5a3820 }, sleep: 1 },
      { seat: 27, o: { shirt: 0x3a4a6a, pants: 0x222222, skin: 0x8a5a3c }, sleep: 0 },
      { seat: 33, o: { shirt: 0xa89060, pants: 0x3a3028, skin: 0x6b4128, mustache: true }, sleep: 1 },
    ];
    this.passengers = P.map(d => { const s = this.seats[d.seat % this.seats.length]; const h = shadows(makeHuman(d.o), true, false); sitPose(h, 0.5); h.position.x = s.x + (s.s > 0 ? 0.25 : -0.25) * (d.seat % 2 ? 1 : -1) * (d.seat % 2 ? 0.76 : 1); /* v3.0.2: window-side sitters 6 cm off the wall (an arm went through it) */ h.position.z = s.z + (s.face === 0 ? 0.05 : -0.05); h.rotation.y = s.face; root.add(h); h.userData.sleep = d.sleep; h.userData.you = d.you; h.userData.baseShirt = d.o.shirt ?? 0xd8d8d0; /* v3.0.2: was userData.base = {shirt}, which clobbered the rig's 'sit' state (sleepers never slumped) */ if (d.o.backpack) { h.userData.upper.children.forEach(ch => { if (ch.userData.backpack) ch.visible = false; }); } return h; });
    this.youBags = this.passengers.map(h => { const bp = rbox(0.34, 0.44, 0.17, 0.05, M.std(0xb3121b, 0.75), 0, 0.33, 0.25, h.userData.upper); bp.visible = false; return bp; });
    // vendor in the aisle, standing crowd, window face, slammer, chaser
    this.vendor = shadows(makeHuman({ shirt: 0xc7b48a, pants: 0xe8e2d0, skin: 0x6b4128, lungi: true, mustache: true, sleeves: 'short', idle: 'm_hold_bag_idle', carry: 'kettle' }), true, false); this.vendor.position.set(0, 0, -12.5); root.add(this.vendor); this.vendor.visible = false;
    if (!this.vendor.userData.real) cyl(0.1, 0.13, 0.22, M.std(0xc8c8c8, 0.25, 1), 0, -0.55, 0.12, this.vendor.userData.armR, 12); // v3.0.2: real rigs carry the kettle in the right hand (it floated at his hip)
    this.crowd = new THREE.Group(); root.add(this.crowd); this.crowd.visible = false;
    { const blk = M.std(0x0a0a0a, 0.9); for (let i = 0; i < 6; i++) { const h = makeHuman({}); h.traverse(o => { if (o.isMesh) o.material = blk; }); h.position.set(-1.1 + (i % 3) * 1.1, 0, ZF + 1.0 + Math.floor(i / 3) * 0.9); h.rotation.y = Math.PI; this.crowd.add(h); } }
    this.wface = new THREE.Group(); root.add(this.wface); this.wface.visible = false;
    { const fm = new THREE.MeshBasicMaterial({ map: M.ctex(TX.scareFace()), transparent: true, opacity: 0.85, depthWrite: false }); const p = plane(0.5, 0.5, fm, this.wface); p.rotation.y = Math.PI / 2; this.wface.position.set(-HW - 0.25, 1.35, 0); }
    this.slam = new THREE.Group(); root.add(this.slam); this.slam.visible = false;
    { const sk = new THREE.MeshBasicMaterial({ color: 0xc8b8a8 }); const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), sk); head.scale.set(0.9, 1.15, 0.7); this.slam.add(head); for (const z of [-0.28, 0.28]) { const hand = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.12), sk); hand.position.set(0, 0.05, z); this.slam.add(hand); } const e = new THREE.MeshBasicMaterial({ color: 0x000000 }); for (const z of [-0.045, 0.045]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), e); eye.position.set(-0.1, 0.03, z); this.slam.add(eye); } }
    this.chaser = makeHuman({ eyes: 'white', cap: 0x0a0a0a }); { const blk = new THREE.MeshBasicMaterial({ color: 0x030303 }); this.chaser.traverse(o => { if (o.isMesh && !this.chaser.userData.eyes.includes(o)) o.material = blk; }); this.chaser.userData.eyes.forEach(e => e.scale.set(2, 2.4, 1)); this.chaser.scale.setScalar(1.18); root.add(this.chaser); this.chaser.visible = false; }
    // exit light at the front door
    this.exitGlow = plane(0.9, 1.95, new THREE.MeshBasicMaterial({ color: 0xfffbea, toneMapped: false }), root); this.exitGlow.position.set(0, 0.975, ZF - 2.35); this.exitGlow.visible = false;
    this.exitLamp = makeLamp(root, 0, 1.9, ZF - 1.5, { color: 0xfff4d8, power: 0, len: 0.01, cone: false, poolW: 2, poolD: 3 }); this.exitLamp.noFlicker = true; this.lamps.push(this.exitLamp);
    // passing-light lamps outside (orange flashes sweep through the windows)
    this.passL = makeLamp(root, 3, 2.5, 0, { color: 0xff9a40, power: 0, dist: 8, len: 0.01, cone: false, poolW: 0.01, poolD: 0.01, prio: -2 }); this.passL.noFlicker = true; this.lamps.push(this.passL);
    const Q = this.game.engine.Q;
    this.dust = makeDust(Math.round(Q.dust * 0.5), new THREE.Box3(new THREE.Vector3(-HW, 0.2, ZF), new THREE.Vector3(HW, CH, ZR))); root.add(this.dust);
    this.updaters.push((dt, t) => this.dust.userData.update(dt, t));
    this.probe = new THREE.Vector3(0, 1.6, -9);
    this.reflectRect = null; // metal floor uses the env map
  }
  setLed(lines, color) { const c = TX.ledBoard(lines, color); const g = this.ledCanvas.getContext('2d'); g.clearRect(0, 0, 512, 128); g.drawImage(c, 0, 0); this.ledTex.needsUpdate = true; }
  setNear(kind) { for (const o of this.outSides) o.nm.map = o.nt[kind]; }
  oddHandle() { if (this._oddH === undefined) { let best = null, bd = 1e9; for (const h of this.handles) { const d = Math.abs(h.position.z + 9) + (h.position.x > 0 ? 0.3 : 0); if (d < bd) { bd = d; best = h; } } this._oddH = best; } return this._oddH; } // v3.5 handle_odd
  resetLoop(progress, rng) {
    this.resetCommon();
    this.setNear('n'); this.outDir = 1; this.flags.stopped = false;
    this.passengers.forEach((h, i) => { const u = h.userData; u.head.rotation.set(u.sleep ? 0.45 : 0.1, u.sleep ? (i % 2 ? 0.3 : -0.3) : 0, u.sleep ? 0.25 : 0); u.mats.shirt.color.setHex(u.baseShirt); h.visible = true; });
    this.youBags.forEach(b => b.visible = false);
    this.vendor.visible = false; this.crowd.visible = false; this.wface.visible = false; this.slam.visible = false; this.chaser.visible = false;
    this.chain.rotation.set(0, 0, 0); this.chain.position.y = 2.0; this.alarm.material.emissiveIntensity = 0;
    this.newspaper.material.map = M.ctexC(this.paperCanvas.n); this.newspaper.rotation.z = 0.3; // v3.5 paper_upside
    this.routeMaps.forEach(r => setSignCanvas(r, this.routeCanvas.n));
    this.doorVoids.forEach(v => { v.visible = false; v.material.color.setHex(0x000000); });
    this.fanSpeed = this.fans.map(() => 7); this.handlesStill = false;
    this.exitGlow.visible = false; this.exitLamp.power = 0;
    setSignCanvas(this.coachNo, panelTex([['डिब्बा ' + '०१२३४५६७८'[Math.min(8, progress)], 80, 'deva', '#111'], ['COACH ' + Math.min(8, progress), 70, 'sans', '#111']], { bg: '#f2c613', w: 512, h: 220, top: 20 }));
    this.setLed(['NEXT: SHUNYA ROAD', progress >= 8 ? 'ARRIVING  PF 0' : 'COACH ' + progress + '  SLOW LOCAL'], '#ff8a1c');
    this.isExit = progress >= 8;
    if (this.isExit) { this.exitGlow.visible = true; this.exitLamp.power = 26; this.exitLamp.prio = 8; this.flags.stopped = true; this.passengers.forEach(h => h.visible = false); this.doorVoids.forEach(v => { v.visible = true; v.material.color.setHex(0xd8dcd8); }); }
    this.events = []; if (!this.isExit && rng() < 0.4) this.events.push({ t: 7 + rng() * 10, kind: 'pa' });
  }
  update(dt, p, G) {
    const t = this.t + dt;
    this.outScroll += dt * (this.flags.stopped ? 0 : 1) * this.outDir;
    for (const o of this.outSides) { o.fm.map.offset.x = (-o.s * this.outScroll * 0.035) % 1; o.nm.map.offset.x = (-o.s * this.outScroll * 0.45) % 1; }
    this.fans.forEach((f, i) => f.rotation.y += dt * this.fanSpeed[i]);
    if (!this.handlesStill) this.handles.forEach(h => { h.rotation.x = Math.sin(t * 1.7 + h.userData.ph * 0.2) * 0.12 * (this.flags.stopped ? 0.1 : 1); h.rotation.z = Math.sin(t * 1.1 + h.userData.ph) * 0.05; });
    else this.handles.forEach(h => h.rotation.set(0, 0, 0));
    // passing lights sweep along the coach
    if (!this.flags.stopped) { const k = (t * 0.6) % 3; this.passL.z = 6 - k * 12; this.passL.x = (Math.floor(t * 0.2) % 2 ? 3 : -3); this.passL.power = k < 2.4 ? 4 : 0; this.passL.level = 1; }
    else this.passL.power = 0;
    this.passengers.forEach((h, i) => { if (h.userData.sleep && !this.flags.heads) h.userData.head.rotation.z = 0.25 + Math.sin(t * 1.7 + i) * 0.03; });
    for (const e of this.events) { if (e.done || t < e.t) continue; e.done = true; if (e.kind === 'pa') G.announce('Agla station... Shunya Road. Next station... Shunya Road. Darwaze se hat kar khade rahein.', false); }
    this.baseUpdate(dt, p, G);
  }
}

const tubes = (c) => c.lamps.filter(l => !l.noFlicker);
export const CHASE = { id: 'chase', forwardOnly: true, name: 'Something follows you down the coach. Don\'t look at it.',
  apply: (c, G) => { c.flags.chase = { started: false, look: 0, dist: 6 }; },
  update: (c, dt, p, G) => {
    const ch = c.flags.chase, k = c.chaser; if (!ch) return;
    if (!ch.started && p.z < -2) { ch.started = true; ch.t0 = c.t; k.visible = true; k.position.set(0, 0, p.z + 6); k.rotation.y = Math.PI; if (!(G.sound.voice && G.sound.voice('w_dont_look', { gain: 1.0 }))) G.sound.whisper(1.5, 0, 0.35); G.showSub('"Don\'t look at it. Keep walking."', 4000, true); G.sound.heartbeat(14, 1.25); G.sound.setHum(0.3); }
    if (!ch.started || ch.done) return;
    c.flags.lightsOverride = true; tubes(c).forEach((l, i) => { const behind = l.z > p.z + 1; l.level = behind ? 0.08 + (Math.sin(c.t * 25 + i) > 0.7 ? 0.3 : 0) : 1; l.setColor(0xffd0c8); });
    const want = p.z + Math.max(0.5, 5.5 - (c.t - ch.t0) * 0.2); // closes in over ~25 s: dawdling lets it reach you (it used to stall 1.6 m behind forever)
    { // v3.0.1: stays in the aisle (never through the seats or the door frames), walks at its real speed, faces where it goes
      const ox = k.position.x, oz = k.position.z; let nz = oz + (want - oz) * Math.min(1, dt * 1.2), nx = ox + (Math.max(-0.22, Math.min(0.22, p.x)) - ox) * dt;
      [nx, nz] = pushOut(c, nx, nz, 0.22); if (!clearAt(c, nx, nz, 0.22)) { nx = ox; nz = oz; }
      k.position.x = nx; k.position.z = nz; const v = Math.hypot(nx - ox, nz - oz) / Math.max(dt, 1e-4);
      if (v > 0.05) { const hd = Math.atan2(nx - ox, nz - oz), dd = Math.atan2(Math.sin(hd - k.rotation.y), Math.cos(hd - k.rotation.y)); k.rotation.y += dd * Math.min(1, dt * 6); animateWalk(k, dt, v); } }
    if (Math.random() < dt * 2.2) G.sound.step(0.9, 0);
    const looking = angleTo(k, p, G.player.yaw) < 0.55 && Math.abs(G.player.pitch) < 0.9;
    ch.look = looking ? ch.look + dt : Math.max(0, ch.look - dt * 0.5);
    if (looking) G.damage = Math.max(G.damage, 0.25 + ch.look * 0.6);
    if (ch.look > 0.7 || k.position.z - p.z < 0.9) { ch.done = true; k.visible = false; G.scareFace(0.9); G.sound.scream(0); if (G.caught) G.caught('chase', 'It saw you looking.'); else G.restartLoop('It saw you looking.'); return; }
    if (p.z < -20.5) { ch.done = true; k.visible = false; G.chaseDone = true; c.flags.lightsOverride = false; G.sound.setHum(1); }
  } };

export const CH3_ANOMALIES = [
  { id: 'passengers_you', name: 'Every passenger is wearing your white shirt and red backpack', apply: c => { c.passengers.forEach(h => h.userData.mats.shirt.color.setHex(0xe2e0d6)); c.youBags.forEach(b => b.visible = true); } },
  { id: 'heads_turn', name: 'The passengers\' heads follow you', apply: c => { c.flags.heads = true; }, update: (c, dt, p) => { c.passengers.forEach(h => { const yaw = facePlayer(h, p) - h.rotation.y; h.userData.head.rotation.set(0, Math.max(-1.6, Math.min(1.6, Math.atan2(Math.sin(yaw), Math.cos(yaw)))), 0); }); } },
  { id: 'handles_still', name: 'The hanging handles don\'t sway at all', apply: c => { c.handlesStill = true; } },
  { id: 'window_face', name: 'A face outside the window keeps pace with you', apply: c => { c.wface.visible = true; }, update: (c, dt, p) => { c.wface.position.z = p.z - 1.4; c.wface.children[0].lookAt(p.x, 1.6, p.z); } },
  { id: 'platform_zero_outside', name: 'Platform 0 keeps passing outside the window', apply: c => { c.setNear('zero'); } },
  { id: 'reverse_outside', name: 'The world outside moves the wrong way', apply: c => { c.outDir = -1; } },
  { id: 'silent_train', name: 'The train makes no sound', sound: (c, G) => { G.sound.setTrainLoop(0); } },
  { id: 'fan_fast', name: 'One fan is spinning far too fast', apply: c => { c.fanSpeed[2] = 60; } },
  { id: 'vendor_aisle', name: 'The chai vendor from the platform is standing in the aisle', apply: c => { c.vendor.visible = true; c.vendor.rotation.y = 0; c.vendor.userData.armR.rotation.x = -0.6; },
    update: (c, dt, p, G) => { const v = c.vendor; v.rotation.y = facePlayer(v, p); if (!c.flags.vg && p.z < v.position.z + 2.2) { c.flags.vg = 1; v.visible = false; G.sound.whisper(1, 0.2, 0.25); } } },
  { id: 'newspaper_missing', name: 'The newspaper says a passenger went missing on Platform 0 tonight', apply: c => { c.newspaper.material.map = M.ctexC(c.paperCanvas.b); } },
  { id: 'door_white', name: 'Outside the open doors there is only white', apply: c => { c.doorVoids.forEach(v => { v.visible = true; v.material.color.setHex(0xf4f2ea); }); } },
  { id: 'chain_pulled', name: 'The emergency chain has been pulled', apply: c => { c.chain.position.y = 1.75; }, update: (c, dt) => { c.chain.rotation.z = Math.sin(c.t * 3) * 0.3; c.alarm.material.emissiveIntensity = Math.sin(c.t * 8) > 0 ? 8 : 0; } },
  { id: 'route_all_zero', name: 'Every station on the route map is Shunya Road', apply: c => { c.routeMaps.forEach(r => setSignCanvas(r, c.routeCanvas.z)); } },
  { id: 'standing_crowd', name: 'A silent crowd stands facing the front door', apply: c => { c.crowd.visible = true; }, update: (c, dt, p, G) => { if (!c.flags.cg && p.z < -15) { c.flags.cg = 1; c.crowd.visible = false; G.sound.whisper(1.2, 0, 0.2); } } },
  { id: 'window_slam', scare: true, name: 'Something slams against the window', update: (c, dt, p, G) => {
      if (!c.flags.ws && p.z < -9) { c.flags.ws = 1; c.flags.wsT = c.t; c.slam.visible = true; c.slam.position.set(HW + 0.05, 1.3, p.z - 0.9); G.sound.glass(); G.sound.scream(0.8); G.shake(0.7); G.flash(0.12); G.damage = 0.8; }
      if (c.flags.ws && c.t - c.flags.wsT > 1.1) c.slam.visible = false; } },
];
