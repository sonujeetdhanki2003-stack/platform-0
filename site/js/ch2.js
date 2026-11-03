// PLATFORM 0 v2 — Chapter 2: the subway (pedestrian underpass)
import * as THREE from './three.module.min.js';
import * as M from './mats.js';
import { prop } from './models.js';
import { makeDrips, makePuddles } from './weather.js';
import * as TX from './tx1.js';
import { box, rbox, cyl, plane, shadows, makeHuman, animateWalk, stillPose, sitPose, makeLamp, platformSign, panelTex, signMesh, setSignCanvas, makeDust } from './props.js';
import { Chapter, facePlayer, angleTo } from './chapter.js';
import { setPath, stepPath, inView, clearAt, pushOut } from './npc.js';
import { CH2_SUBTLE } from './subtle.js'; // v3.5 hidden anomalies

const W = 2.2, H = 3.0, Z0 = 3, Z1 = -40, SL = 6; // half width, ceiling, corridor ends, stair run

export class Ch2 extends Chapter {
  constructor(game) {
    super(game);
    this.id = 2; this.title = 'THE SUBWAY';
    this.fogColor = 0x080a09; this.fogDensity = 0.055; this.exposure = 1.1;
    this.start = { x: 0, z: 1.6, yaw: 0 };
    this.bounds = { x0: -W + 0.3, x1: W - 0.3, z0: Z1 - SL - 0.5, z1: Z0 + SL - 0.3 };
    this.anomalies = CH2_ANOMALIES.concat(CH2_SUBTLE); this.surface = 'tile'; this.hasFans = false; this.rainLevel = 0.12; this.visitHint = 'Walk at least halfway down the subway before you turn back';
    this.build();
  }
  loopLabel(n) { return n >= 8 ? 'SUBWAY 8 · EXIT' : 'SUBWAY ' + n; }
  floorY(x, z) { if (z > Z0) return Math.min(H, (z - Z0) / SL * H); if (z < Z1) return Math.min(H, (Z1 - z) / SL * H); return 0; }
  isBack(p) { return p.z > Z0 + 4.2; }
  isForward(p) { return p.z < Z1 - 4.2; }
  visitedAt(p) { return p.z < -15; }
  build() {
    const root = this.root, len = Z0 - Z1, mid = (Z0 + Z1) / 2;
    const floorM = M.makeWet(M.pbr('ufloor', { rep: [2.2, 21], color: 0x9a968c }), 0.75, 0.12);
    const tileM = M.pbr('tiles', { rep: [len / 1.2, 2.2 / 1.2], color: 0xd8dccf, env: 0.9 });
    const upperM = M.pbr('plaster', { rep: [len / 3, 0.4], color: 0x8a8678 });
    const ceilM = M.pbr('plaster', { rep: [2, 20], color: 0x6a675e });
    const f = plane(W * 2, len, floorM, root); f.rotation.x = -Math.PI / 2; f.position.set(0, 0, mid); f.receiveShadow = true;
    for (const s of [-1, 1]) {
      const t = plane(len, 2.2, tileM, root); t.rotation.y = -s * Math.PI / 2; t.position.set(s * W, 1.1, mid); t.receiveShadow = true;
      const u = plane(len, H - 2.2, upperM, root); u.rotation.y = -s * Math.PI / 2; u.position.set(s * W, 2.2 + (H - 2.2) / 2, mid);
      const trim = box(0.04, 0.06, len, M.std(0x2e5a3a, 0.5), s * (W - 0.02), 2.2, mid, root);
      const skirt = box(0.03, 0.12, len, M.std(0x3a3a36, 0.7), s * (W - 0.015), 0.06, mid, root);
      const ao = M.aoStrip(len, 0.6, 0.7); ao.rotation.y = -s * Math.PI / 2; ao.position.set(s * (W - 0.01), 0.3, mid); root.add(ao);
      const ao2 = M.aoStrip(len, 0.5, 0.6); ao2.rotation.y = -s * Math.PI / 2; ao2.rotation.z = Math.PI; ao2.position.set(s * (W - 0.01), H - 0.25, mid); root.add(ao2);
    }
    this.ceil = new THREE.Group(); root.add(this.ceil);
    const c = plane(W * 2, len, ceilM, this.ceil); c.rotation.x = Math.PI / 2; c.position.set(0, H, mid);
    for (let z = Z0 - 1; z > Z1; z -= 3) box(W * 2, 0.12, 0.25, M.std(0x5a574e, 0.9), 0, H - 0.06, z, this.ceil);
    // pipes along the ceiling
    for (const x of [-1.6, -1.45]) { const pp = cyl(0.06, 0.06, len, M.pbr('rust', { rep: [1, 10], metal: 1, color: 0x8a8a7a }), x, H - 0.18, mid, this.ceil, 10); pp.rotation.x = Math.PI / 2; }
    // stairs at both ends
    this.stairs(Z0, 1); this.stairs(Z1, -1);
    // lamps
    for (let z = Z0 - 2.5; z > Z1; z -= 4.2) { const l = makeLamp(this.ceil, 0.4, H - 0.08, z, { color: 0xdcefe0, power: 7, rotY: 0, poolW: 4.2, poolD: 5, poolParent: root }); this.lamps.push(l); }
    this.hemi = new THREE.HemisphereLight(0x55625c, 0x14120e, 0.3); root.add(this.hemi);
    // progress sign at the start, overhead direction sign, rules
    const sg = new THREE.Group(); sg.position.set(0, 2.6, -2.6); root.add(sg); box(2.3, 0.62, 0.08, M.std(0x111111, 0.6), 0, 0, -0.03, sg);
    this.signMesh = signMesh(platformSign(0, false, { label: ['SUBWAY', 'सबवे'] }), 2.2, 0.55); this.signMesh.position.z = 0.02; sg.add(this.signMesh);
    for (const x of [-0.9, 0.9]) box(0.03, 0.4, 0.03, M.std(0x222222, 0.6, 0.5), x, 0.5, 0, sg);
    const dirC = (back) => panelTex([[back ? '←  निकास  ·  प्लेटफ़ॉर्म' : 'प्लेटफ़ॉर्म  ·  निकास  →', 70, 'deva', '#fff'], [back ? '←  EXIT  ·  PLATFORMS' : 'PLATFORMS  ·  EXIT  →', 66, 'sans', '#fff']], { bg: '#1c6a3a', w: 1024, h: 230, top: 22, borderColor: '#e8ffe8', grime: 0.35 });
    this.dirCanvas = { n: dirC(false), b: dirC(true) };
    const dg = new THREE.Group(); dg.position.set(0, 2.62, -15); root.add(dg); box(2.0, 0.48, 0.06, M.std(0x111111, 0.6), 0, 0, 0, dg);
    this.dirSign = signMesh(this.dirCanvas.n, 1.94, 0.44, { emissive: 1.1 }); this.dirSign.position.z = 0.035; dg.add(this.dirSign);
    const back2 = signMesh(this.dirCanvas.b, 1.94, 0.44, { emissive: 1.1 }); back2.position.z = -0.035; back2.rotation.y = Math.PI; dg.add(back2);
    for (const x of [-0.8, 0.8]) box(0.03, 0.2, 0.03, M.std(0x222222, 0.6, 0.5), x, 0.3, 0, dg);
    { const s = signMesh(panelTex([['नियम  ·  RULES', 52, 'deva', '#fff'], ['If anything is wrong,', 40, 'sans', '#222', 6], ['go back up the stairs.', 40, 'sans'], ['If nothing is wrong,', 40, 'sans', '#222', 6], ['keep walking.', 40, 'sans'], ['कुछ गलत हो तो', 44, 'deva', '#8a1010', 8], ['वापस जाओ।', 44, 'deva', '#8a1010']], { w: 400, h: 520, top: 18, seed: 21 }), 0.6, 0.78); s.rotation.y = Math.PI / 2; s.position.set(-W + 0.02, 1.5, -1.5); root.add(s); }
    // graffiti
    const graf = (txt) => { const c = M.canvas(1024, 384), g = c.getContext('2d'); g.clearRect(0, 0, 1024, 384); g.save(); g.translate(512, 190); g.rotate(-0.05);
      g.fillStyle = txt[2] || 'rgba(20,20,20,.85)'; g.font = `700 120px ${M.DEVA}`; g.textAlign = 'center'; g.fillText(txt[0], 0, -20); g.font = `italic 900 96px ${M.SANS}`; g.fillText(txt[1], 0, 110); g.restore(); return c; };
    this.grafCanvas = { n: graf(['मैं यहाँ था', 'RAJU ♥ PRIYA']), m: graf(['वापस जाओ', 'GO BACK', 'rgba(150,10,10,.9)']) };
    this.graffiti = signMesh(this.grafCanvas.n, 2.4, 0.9, { transparent: true }); this.graffiti.rotation.y = -Math.PI / 2; this.graffiti.position.set(W - 0.02, 1.45, -12.5); root.add(this.graffiti);
    // posters (film + lost child + lightbox ad)
    const film = (variant) => { const c = M.canvas(384, 576), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 576); gr.addColorStop(0, '#2a0a0a'); gr.addColorStop(1, '#090303'); g.fillStyle = gr; g.fillRect(0, 0, 384, 576);
      // figure
      g.fillStyle = '#c89a78'; g.beginPath(); g.ellipse(192, 230, 70, 88, 0, 0, 7); g.fill(); g.fillStyle = '#100808'; g.beginPath(); g.ellipse(192, 170, 80, 52, 0, Math.PI, 0); g.fill(); g.fillRect(112, 300, 160, 200);
      if (variant === 'back') { g.fillStyle = '#100808'; g.beginPath(); g.ellipse(192, 230, 74, 92, 0, 0, 7); g.fill(); }
      else { g.fillStyle = '#000'; g.beginPath(); g.ellipse(166, 228, 12, 8, 0, 0, 7); g.ellipse(218, 228, 12, 8, 0, 0, 7); g.fill(); g.fillRect(176, 270, 32, 6); }
      g.fillStyle = '#e8c040'; g.font = `700 74px ${M.DEVA}`; g.textAlign = 'center'; g.fillText('भूत स्टेशन', 192, 540 - 40); g.font = `900 30px ${M.SANS}`; g.fillStyle = '#fff'; g.fillText('BHOOT STATION', 192, 556); g.font = `700 20px ${M.SANS}`; g.fillText('NOW SHOWING', 192, 40);
      M.grime(g, 384, 576, 0.9, 31); return c; };
    this.filmTex = { n: M.ctex(film('n')), b: M.ctex(film('back')) };
    this.film = plane(0.8, 1.2, new THREE.MeshStandardMaterial({ map: this.filmTex.n, roughness: 0.7 }), root); this.film.rotation.y = Math.PI / 2; this.film.position.set(-W + 0.02, 1.4, -8.5);
    { const s = signMesh(panelTex([['गुमशुदा', 70, 'deva', '#b01010'], ['MISSING', 60, 'sans', '#b01010'], ['RAMESH K., 42', 42, 'sans', '#222', 140], ['last seen in this subway', 30, 'sans']], { w: 384, h: 512, seed: 41 }), 0.55, 0.74); s.rotation.y = Math.PI / 2; s.position.set(-W + 0.02, 1.55, -19.5); root.add(s); }
    { const lb = new THREE.Group(); lb.position.set(W - 0.06, 1.5, -27.5); lb.rotation.y = -Math.PI / 2; root.add(lb); box(1.5, 1.0, 0.1, M.std(0x222222, 0.4, 0.6), 0, 0, -0.03, lb);
      const s = signMesh(panelTex([['वड़ा पाव', 120, 'deva', '#fff'], ['VADA PAV  ₹12', 80, 'sans', '#ffe040'], ['अब हर स्टेशन पर', 54, 'deva', '#fff']], { bg: '#c0401a', w: 768, h: 512, top: 40, border: false, grime: 0.25 }), 1.4, 0.92, { emissive: 1.6 }); s.position.z = 0.025; lb.add(s); this.lightbox = s;
      const l = makeLamp(root, W - 0.5, 1.5, -27.5, { color: 0xff8040, power: 1.6, dist: 4, len: 0.01, cone: false, poolW: 2.5, poolD: 2.5, poolX: -0.5 }); l.noFlicker = true; this.lamps.push(l); }
    // closed shop shutter + sign
    { const g = new THREE.Group(); g.position.set(W - 0.03, 0, -21.5); g.rotation.y = -Math.PI / 2; root.add(g); this.shopG = g;
      box(2.2, 2.5, 0.25, M.std(0x2a2620, 0.8), 0, 1.25, 0.1, g);
      this.shutter = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.1), M.pbr('roof', { rep: [0.6, 6], color: 0x9a948a, metal: 1 })); this.shutter.rotation.z = Math.PI / 2; this.shutter.position.set(0, 1.05, 0.24); g.add(this.shutter);
      const s = signMesh(panelTex([['गणेश ज़ेरॉक्स · STD · PCO', 60, 'deva', '#111'], ['GANESH XEROX', 54, 'sans', '#b01010']], { bg: '#f0d040', w: 1024, h: 200, top: 18, seed: 51 }), 2.0, 0.39); s.position.set(0, 2.35, 0.24); g.add(s);
      this.shopEyes = new THREE.Group(); this.shopEyes.position.set(0.2, 0.18, 0.2); g.add(this.shopEyes); for (const x of [-0.07, 0.07]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff2d0, toneMapped: false })); e.position.x = x; this.shopEyes.add(e); } this.shopEyes.visible = false;
      this.addSolid(W - 0.4, W, -22.7, -20.3); }
    // ticket window (recessed, lit)
    { const g = new THREE.Group(); g.position.set(-W + 0.03, 0, -25.6); g.rotation.y = Math.PI / 2; root.add(g);
      box(1.6, 2.4, 0.2, M.std(0x3a2e24, 0.7), 0, 1.2, -0.05, g);
      const glass = plane(1.1, 0.7, new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd9a0, emissiveIntensity: 0.3, roughness: 0.1, metalness: 0.4 }), g); glass.position.set(0, 1.45, 0.06);
      for (let i = -5; i <= 5; i++) box(0.012, 0.7, 0.012, M.std(0x222222, 0.5, 0.8), i * 0.1, 1.45, 0.08, g);
      rbox(1.3, 0.06, 0.4, 0.02, M.std(0x5a4632, 0.6), 0, 1.04, 0.18, g);
      const s = signMesh(panelTex([['टिकट खिड़की', 64, 'deva', '#fff'], ['TICKETS · बुकिंग', 46, 'sans', '#ffe080']], { bg: '#1a3a7a', w: 768, h: 200, top: 22, borderColor: '#fff', seed: 61 }), 1.3, 0.34); s.position.set(0, 2.05, 0.06); g.add(s);
      const l = makeLamp(root, -W + 0.5, 1.6, -25.6, { color: 0xffc070, power: 1.8, dist: 4, len: 0.01, cone: false, poolW: 2, poolD: 2.2, poolX: 0.4 }); l.noFlicker = true; this.lamps.push(l);
      this.hand = new THREE.Group(); this.hand.position.set(0.05, 1.08, 0.3); g.add(this.hand); const sk = M.std(0xb8aca4, 0.5);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.5, 4, 8), sk); arm.rotation.x = Math.PI / 2; arm.position.z = -0.1; this.hand.add(arm);
      this.fingers = []; for (let i = 0; i < 4; i++) { const fg = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.14, 3, 6), sk); fg.rotation.x = Math.PI / 2; fg.position.set(-0.035 + i * 0.023, 0, 0.24); this.hand.add(fg); this.fingers.push(fg); }
      this.hand.visible = false; }
    // PCO phone
    { const g = new THREE.Group(); g.position.set(-W + 0.03, 0, -31); g.rotation.y = Math.PI / 2; root.add(g);
      rbox(0.42, 0.55, 0.22, 0.04, M.std(0xe8c020, 0.45), 0, 1.45, 0.1, g); rbox(0.08, 0.28, 0.07, 0.03, M.std(0x111111, 0.4), -0.12, 1.5, 0.24, g);
      const s = signMesh(panelTex([['STD · ISD · PCO', 48, 'sans', '#111'], ['यहाँ से फोन करें', 44, 'deva', '#b01010']], { bg: '#f2e6c0', w: 512, h: 160, top: 14, seed: 71 }), 0.6, 0.19); s.position.set(0, 1.9, 0.02); g.add(s); this.phone = g; }
    // beggar on a mat (right wall), cobbler (left wall)
    const mat = plane(0.9, 1.4, M.std(0x6a3a2a, 0.95), root); mat.rotation.x = -Math.PI / 2; mat.position.set(1.65, 0.012, -9.8);
    // v3.0.2: an open steel begging bowl with a few coins (the solid cylinder's lid read as a black hole on the mat)
    { const pts = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI * 0.5; pts.push(new THREE.Vector2(0.03 + Math.sin(a) * 0.085, 0.004 + (1 - Math.cos(a)) * 0.055)); } for (let i = 10; i >= 0; i--) { const a = i / 10 * Math.PI * 0.5; pts.push(new THREE.Vector2(0.025 + Math.sin(a) * 0.08, 0.009 + (1 - Math.cos(a)) * 0.052)); }
      const bw = new THREE.Mesh(new THREE.LatheGeometry(pts.reverse(), 24), M.std(0x9a9a9a, 0.4, 0.8)); bw.material.side = THREE.DoubleSide; bw.position.set(1.3, 0.012, -9.4); root.add(bw); this.bowl = bw; cyl(0.031, 0.031, 0.006, bw.material, 1.3, 0.018, -9.4, root, 16);
      for (let i = 0; i < 4; i++) { const co = cyl(0.012, 0.012, 0.003, M.std(i % 2 ? 0xb89a50 : 0xb0b0b0, 0.35, 0.9), 1.3 + Math.cos(i * 1.7) * 0.03, 0.0225 + i * 0.0025, -9.4 + Math.sin(i * 1.7) * 0.03, root, 10); co.rotation.x = 0.15 * i; } }
    this.beggar = this.makeSitter({ shirt: 0x6a5a48, shawl: 0x4a3a2c, pants: 0x3a322a, skin: 0x5a3820, floorY: 0.012 }); this.beggar.position.set(1.8, this.beggar.userData.sitY, -9.9); this.beggar.rotation.y = -Math.PI / 2; root.add(this.beggar);
    this.beggar2 = this.makeSitter({ shirt: 0x6a5a48, shawl: 0x4a3a2c, pants: 0x3a322a, skin: 0x5a3820, floorY: 0.012 }); this.beggar2.position.set(1.8, this.beggar2.userData.sitY, -11.0); this.beggar2.rotation.y = -Math.PI / 2; root.add(this.beggar2); this.beggar2.visible = false;
    this.cobbler = this.makeSitter({ shirt: 0x7a8a9a, pants: 0x3a3a40, skin: 0x6b4128 }); /* v3.0.2: no topi — on the squatting, head-down rig it stuck out of his crown like a white box */ this.cobbler.position.set(-1.85, this.cobbler.userData.sitY, -16.85); /* v3.0.2: was at z -17.5, half inside the wall cabinet */ this.cobbler.rotation.y = Math.PI / 2; root.add(this.cobbler);
    rbox(0.4, 0.25, 0.3, 0.03, M.pbr('wood', { rep: [0.3, 0.3], color: 0x7a5030 }), -1.3, 0.13, -16.85, root);
    for (let i = 0; i < 4; i++) rbox(0.1, 0.07, 0.25, 0.03, M.std([0x2a1a10, 0x5a2a18, 0x111111, 0x6a4a2a][i], 0.5), -1.9 + i * 0.14, 0.04, -16.05, root);
    this.addSolid(1.2, W, -11.5, -9.0); this.addSolid(-W, -1.1, -18.1, -15.85);
    // line of empty sandals (anomaly)
    this.sandals = new THREE.Group(); root.add(this.sandals); this.sandals.visible = false;
    for (let i = 0; i < 9; i++) { const x = -1.8 + i * 0.45; for (const dx of [-0.06, 0.06]) rbox(0.09, 0.025, 0.25, 0.02, M.std([0x8a2a1a, 0x2a2a2a, 0x6a4a2a][i % 3], 0.6), x + dx, 0.013, -20.5, this.sandals); }
    // CCTV
    { const g = this.cctv = new THREE.Group(); g.position.set(-1.9, H - 0.25, -6); root.add(g); box(0.05, 0.25, 0.05, M.std(0xdddddd, 0.4), 0, 0.12, 0, g);
      this.cam = new THREE.Group(); g.add(this.cam); rbox(0.14, 0.12, 0.3, 0.03, M.std(0xe8e8e0, 0.35), 0, 0, 0.1, this.cam); cyl(0.04, 0.04, 0.02, M.std(0x111111, 0.1), 0, 0, 0.26, this.cam, 10).rotation.x = Math.PI / 2;
      this.camLed = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), M.emissive(0xff2010, 6)); this.camLed.position.set(0.05, 0.04, 0.25); this.cam.add(this.camLed); this.cam.rotation.set(0.5, -0.6, 0); }
    // ceiling crack drip + handprints + backpack man ahead + figure behind + crawler
    this.drip = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 5), M.std(0x9ab0c0, 0.05, 0.2)); this.drip.position.set(-0.8, H - 0.05, -16); root.add(this.drip);
    this.hands = new THREE.Group(); root.add(this.hands); this.hands.visible = false;
    { const c = M.canvas(128, 128), g = c.getContext('2d'); g.fillStyle = 'rgba(120,8,8,.9)'; g.beginPath(); g.ellipse(64, 80, 26, 32, 0, 0, 7); g.fill(); for (let i = 0; i < 4; i++) { g.save(); g.translate(40 + i * 16, 52); g.rotate((i - 1.5) * 0.15); g.fillRect(-5, -44, 10, 44); g.restore(); } g.save(); g.translate(28, 86); g.rotate(-0.9); g.fillRect(-5, -30, 10, 30); g.restore();
      const t = M.ctex(c); for (let i = 0; i < 14; i++) { const hp = plane(0.22, 0.22, new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.3, depthWrite: false }), this.hands); hp.rotation.y = -Math.PI / 2; hp.rotation.x = (Math.random() - 0.5) * 0.6; hp.position.set(W - 0.015, 0.5 + Math.random() * 1.4, -29 - i * 0.5 - Math.random() * 0.3); } }
    this.walker = shadows(makeHuman({ shirt: 0xe2e0d6, pants: 0x30323a, backpack: true, headphones: true, skin: 0x7a4e33 }), true, false); root.add(this.walker);
    this.behind = makeHuman({ eyes: 'white' }); const blk = new THREE.MeshBasicMaterial({ color: 0x020202 }); this.behind.traverse(o => { if (o.isMesh && !this.behind.userData.eyes.includes(o)) o.material = blk; }); this.behind.scale.setScalar(1.15); root.add(this.behind); this.behind.visible = false;
    this.crawler = makeHuman({ skin: 0xc8c0b4, shirt: 0xb8b0a0, pants: 0x8a8478, hair: 0x050505, barefoot: true, eyes: 'white' }); this.crawler.rotation.z = Math.PI; root.add(this.crawler); this.crawler.visible = false;
    // exit glow (far stairs)
    this.exitGlow = plane(2.6, 3.2, new THREE.MeshBasicMaterial({ color: 0xfffbea, toneMapped: false }), root); this.exitGlow.position.set(0, H + 1.6, Z1 - SL - 0.4); this.exitGlow.visible = false;
    this.exitSign = signMesh(platformSign(8, true, { exitEn: 'TRAIN  ↑', exitHi: 'गाड़ी' }), 1.2, 0.3, { emissive: 1.4 }); this.exitSign.position.set(0, H - 0.35, Z1 + 0.1); root.add(this.exitSign); this.exitSign.visible = false;
    this.exitLamp = makeLamp(root, 0, H + 0.8, Z1 - 3, { color: 0xfff4d8, power: 0, len: 0.01, cone: false, floorY: H * 0.5 }); this.exitLamp.noFlicker = true; this.lamps.push(this.exitLamp);
    // v3: scanned props + a ceiling leak dripping into a rippling puddle
    { const add = (n, o, x, y, z, ry, solid) => { const m = prop(n, o); if (!m) return; m.position.set(x, y, z); m.rotation.y = ry || 0; shadows(m); root.add(m); if (solid) this.addSolid(...solid); };
      add('WetFloorSign_01', { h: 0.62 }, 1.0, 0, -12.6, -0.5, [0.8, 1.2, -12.8, -12.4]);
      add('trashbag', { h: 0.48 }, -1.85, 0, -21.5, 0.4, [-2.2, -1.55, -21.8, -21.2]);
      add('cardboard_box_01', { h: 0.34 }, -1.9, 0, -33.4, 0.2, [-2.2, -1.6, -33.7, -33.1]);
      add('cardboard_box_01', { h: 0.3 }, -1.92, 0.34, -33.38, -0.4);
      const dr = makeDrips(6, 0.4, H - 0.05, 0.01, -14.25, -13.95); if (dr) root.add(dr);
      makePuddles(root, [[0.45, -14.1, 1.1, 0.8, 0.2], [-0.9, -26.5, 0.8, 1.3, 0]], 0.006); }
    const Q = this.game.engine.Q;
    this.dust = makeDust(Math.round(Q.dust * 0.8), new THREE.Box3(new THREE.Vector3(-W, 0.2, Z1), new THREE.Vector3(W, H, Z0))); root.add(this.dust);
    this.updaters.push((dt, t) => this.dust.userData.update(dt, t));
    this.probe = new THREE.Vector3(0, 1.6, -18);
    this.reflectRect = { x: 0, z: mid, w: W * 2, d: len, y: 0.004, strength: 0.5 };
  }
  stairs(z, dir) {
    const root = this.root, n = 18, rise = H / n, run = SL / n;
    const stepM = M.pbr('floor', { rep: [1.5, 0.15], color: 0x8a867c }), side = M.pbr('tiles', { rep: [SL / 1.2, (H + 2.2) / 1.2], color: 0xc8ccbf });
    for (let i = 0; i < n; i++) { const s = box(W * 2, rise, run, stepM, 0, rise * (i + 0.5), z + dir * run * (i + 0.5), root); s.receiveShadow = true; const nose = box(W * 2, 0.02, 0.05, M.std(0xc8a020, 0.6), 0, rise * (i + 1), z + dir * run * i + dir * 0.02, root); }
    box(W * 2, H, 0.3, M.pbr('plaster', { rep: [2, 1], color: 0x6a675e }), 0, H * 1.5 + 0.0, z + dir * (SL + 0.15), root); // wall at top end
    for (const s of [-1, 1]) {
      const wall = plane(SL, H + 2.6, side, root); wall.rotation.y = -s * Math.PI / 2; wall.position.set(s * W, (H + 2.6) / 2, z + dir * SL / 2);
      const rail = cyl(0.025, 0.025, Math.hypot(SL, H), M.std(0x9a9a9a, 0.3, 0.9), s * (W - 0.1), H / 2 + 0.9, z + dir * SL / 2, root, 8); rail.rotation.x = Math.PI / 2 - dir * Math.atan2(H, SL) * -1; rail.rotation.x = dir > 0 ? Math.PI / 2 - Math.atan2(H, SL) : Math.PI / 2 + Math.atan2(H, SL);
    }
    const ceil = plane(W * 2, Math.hypot(SL, H), M.pbr('plaster', { rep: [2, 3], color: 0x55524a }), root); ceil.rotation.x = Math.PI / 2 + (dir > 0 ? -1 : 1) * Math.atan2(H, SL); ceil.position.set(0, H + H / 2, z + dir * SL / 2);
    const lamp = makeLamp(root, 0, H + H * 0.75 + 0.4, z + dir * SL * 0.7, { color: 0xffd8a0, power: 3, dist: 7, len: 0.4, cone: false, floorY: H * 0.7, poolW: 3, poolD: 3, prio: dir > 0 ? 1 : 0 }); lamp.noFlicker = true; this.lamps.push(lamp);
  }
  makeSitter(o) { const h = shadows(makeHuman(o), true, false); sitPose(h, 0.1, false); if (!h.userData.real) { h.userData.armL.rotation.x = -0.9; h.userData.armR.rotation.x = -0.9; } return h; } // v3.0.2: real rigs keep the squat clip's own arms (the extra -0.9 rad made them lunge at the floor)
  setProgressSign(n, exit) { setSignCanvas(this.signMesh, platformSign(n, exit, { label: ['SUBWAY', 'सबवे'], exitEn: 'EXIT  ↓', exitHi: 'निकास' })); }
  resetLoop(progress, rng) {
    this.resetCommon();
    this.ceil.position.y = 0; this.lamps.forEach(l => { if (!l.noFlicker) { l.y = H - 0.08; if (l.cone) l.cone.visible = true; } }); this.graffiti.material.map = M.ctexC(this.grafCanvas.n); this.film.material.map = this.filmTex.n;
    this.bowl.rotation.set(0, 0, 0); this.bowl.position.y = 0.012; if (this.cobbler.userData.head) this.cobbler.userData.head.rotation.y = 0; // v3.5 bowl_flipped / cobbler_watch
    setSignCanvas(this.dirSign, this.dirCanvas.n);
    this.beggar.visible = true; this.beggar.position.set(1.8, this.beggar.userData.sitY, -9.9); this.beggar.userData.upper.rotation.set(0, 0, 0); this.beggar.userData.head.rotation.set(0, 0, 0); this.beggar2.visible = false;
    this.sandals.visible = false; this.cam.rotation.set(0.5, -0.6, 0); this.camLed.visible = true;
    this.shutter.position.y = 1.05; this.shutter.scale.set(1, 1, 1); this.shopEyes.visible = false; this.hand.visible = false; this.hands.visible = false;
    this.behind.visible = false; this.crawler.visible = false; this.hemi.intensity = 0.3;
    this.walker.visible = true; this.walker.position.set(0.3, 0, -24); this.walker.rotation.set(0, Math.PI, 0); this.walker.userData.nav = null; this.walkerState = 'wait';
    this.exitGlow.visible = false; this.exitSign.visible = false; this.exitLamp.power = 0;
    this.drip.userData.dir = 1; this.game.sound.phoneRing(false);
    this.setProgressSign(Math.min(progress, 8), progress >= 8);
    this.isExit = progress >= 8;
    if (this.isExit) { this.exitGlow.visible = true; this.exitSign.visible = true; this.exitLamp.power = 30; this.exitLamp.prio = 8; this.walker.visible = false; }
    if (!this.isExit && rng() < 0.35) this.events.push({ t: 8 + rng() * 14, kind: 'pa' });
    if (!this.isExit && rng() < 0.5) this.events.push({ t: 5 + rng() * 10, kind: 'train' });
  }
  update(dt, p, G) {
    const t = this.t + dt;
    // drip
    const d = this.drip; if (this.drip.userData.dir > 0) { d.position.y -= dt * 3.2; if (d.position.y < 0.02) { d.position.y = H - 0.05; if (p.z < -8 && p.z > -24) G.sound.drip(-0.3); } } else { d.position.y += dt * 2.2; if (d.position.y > H - 0.05) d.position.y = 0.02; }
    // backpack man walks away from you up the far stairs (he is always ahead)
    const w = this.walker;
    if (w.visible && !this.isExit) {
      // v3.0.1: a waypoint path in the clear lane (x 0.3, past the wet-floor sign), stride-matched walk, steps round you
      if (this.walkerState === 'wait' && p.z < 0) { this.walkerState = 'walk'; const z = w.position.z;
        setPath(w, this.flags.walkerBack ? [[0.3, z], [0.3, Z0 + 0.5], [0.3, Z0 + SL - 0.8]] : [[0.3, z], [0.3, Z1 - SL + 0.6]], { speed: 1.15 }); }
      if (this.walkerState === 'walk') { const done = stepPath(w, this, dt, p, (x, z) => this.floorY(x, z));
        if (done || w.position.z < Z1 - SL + 0.7 || (w.position.z > Z0 + 1 && !inView(w, this.game.engine.camera))) { w.visible = false; this.walkerState = 'gone'; } }
    }
    if (this.beggar.visible) { const u = this.beggar.userData; u.head.rotation.x = 0.35 + Math.sin(t * 0.5) * 0.04; }
    if (this.cobbler.visible) { const u = this.cobbler.userData; if (u.real) { u.head.rotation.x = 0.12 + Math.sin(t * 0.7) * 0.05; } else { u.armR.rotation.x = -1.1 + Math.sin(t * 6) * 0.2; u.head.rotation.x = 0.5; } } // v3.0.2: on the real rig the extra arm swing + 0.5 rad bow buried his head in his chest
    for (const e of this.events) { if (e.done || t < e.t) continue; e.done = true;
      if (e.kind === 'pa') G.announce('Yatri kripya dhyan dein. Please do not loiter in the subway.', false);
      if (e.kind === 'train') { G.sound.train(7, true, 0.35); G.shake(0.15); } }
    this.baseUpdate(dt, p, G);
  }
}

const lampsOf = (c) => c.lamps.filter(l => !l.noFlicker);
export const CH2_ANOMALIES = [
  { id: 'graffiti_goback', name: 'The graffiti says "GO BACK"', apply: c => { c.graffiti.material.map = M.ctexC(c.grafCanvas.m); } },
  { id: 'beggar_missing', name: 'The old man is gone, his bowl is still there', apply: c => { c.beggar.visible = false; } },
  { id: 'beggar_twins', name: 'There are two identical old men', apply: c => { c.beggar2.visible = true; } },
  { id: 'sandals_line', name: 'A row of empty sandals blocks the subway', apply: c => { c.sandals.visible = true; } },
  { id: 'cctv_follow', name: 'The CCTV camera follows you', update: (c, dt, p) => { const g = c.cctv; const yaw = Math.atan2(p.x - g.position.x, p.z - g.position.z); c.cam.rotation.y = yaw; c.cam.rotation.x = 0.35; } },
  { id: 'exit_back', name: 'The exit sign points back the way you came', apply: c => { setSignCanvas(c.dirSign, c.dirCanvas.b); } },
  { id: 'ceiling_low', name: 'The ceiling is much lower', apply: c => { c.ceil.position.y = -0.75; c.lamps.forEach(l => { if (!l.noFlicker) { l.y = 2.17; if (l.cone) l.cone.visible = false; } }); } },
  { id: 'water_up', name: 'The leaking water drips upward', apply: c => { c.drip.userData.dir = -1; } },
  { id: 'shutter_eyes', name: 'Eyes watch you from under the shop shutter', apply: c => { c.shutter.scale.y = 1; c.shutter.position.y = 1.25; c.shutter.scale.set(1, 0.8, 1); c.shopEyes.visible = true; },
    update: (c, dt, p, G) => { if (!c.flags.slam && Math.abs(p.z - (-21.5)) < 2.2) { c.flags.slam = 1; c.shopEyes.visible = false; c.shutter.position.y = 1.05; c.shutter.scale.set(1, 1, 1); G.sound.thud(); G.shake(0.35); } } },
  { id: 'poster_back', name: 'The film poster now shows the back of his head', apply: c => { c.film.material.map = c.filmTex.b; } },
  { id: 'ticket_hand', name: 'A pale hand rests outside the ticket window', apply: c => { c.hand.visible = true; }, update: (c) => { c.fingers.forEach((f, i) => { f.position.y = Math.max(0, Math.sin(c.t * 8 - i * 0.7)) * 0.02; }); } },
  { id: 'phone_ring', name: 'The PCO phone is ringing', sound: (c, G) => G.sound.phoneRing(true),
    update: (c, dt, p, G) => { if (!c.flags.answered && Math.abs(p.z - (-31)) < 3 && p.x < 0.5) { c.flags.answered = 1; G.sound.phoneRing(false); if (!(G.sound.voice && G.sound.voice('w_dont_turn', { gain: 1.0, pan: -0.7 }))) G.sound.whisper(1.4, -0.7, 0.3); G.showSub('"...मुड़ो मत. don\'t turn around..."', 2600, true); } } },
  { id: 'lights_follow', name: 'The lights go out one by one behind you', update: (c, dt, p) => { c.flags.lightsOverride = true; lampsOf(c).forEach(l => { if (l.z > p.z + 2.5 && p.z < -4) l.level = Math.max(0, l.level - dt * 3); }); } },
  { id: 'figure_behind', name: 'Someone is standing at the bottom of the stairs behind you', update: (c, dt, p, G) => { const b = c.behind; if (!c.flags.fb && p.z < -16) { c.flags.fb = 1; b.visible = true; b.position.set(-0.4, 0, 1.6); } if (b.visible) { b.rotation.y = facePlayer(b, p); if (p.z > -6) { b.visible = false; G.sound.whisper(1, 0, 0.2); } } } },
  { id: 'bloody_hands', name: 'Bloody handprints cover the wall', apply: c => { c.hands.visible = true; } },
  { id: 'walker_toward', name: 'The backpack man walks toward you, not away', apply: c => { c.flags.walkerBack = true; c.walker.position.z = -32; } },
  { id: 'crawler', scare: true, name: 'The lights die and something crawls on the ceiling', update: (c, dt, p, G) => {
      const cr = c.crawler;
      if (!c.flags.cr && p.z < -14) { c.flags.cr = 1; c.flags.crT = c.t; cr.visible = true; cr.position.set(0, H, p.z - 12); G.sound.setHum(0.1); G.sound.heartbeat(8, 1.4); }
      if (c.flags.cr && !c.flags.crDone) { c.flags.lightsOverride = true; const k = c.t - c.flags.crT; lampsOf(c).forEach((l, i) => l.level = (Math.sin(k * 30 + i) > 0.6 && k < 2.6) ? 0.5 : 0.02);
        cr.position.z += dt * (k < 1.2 ? 2.5 : 9); cr.position.x += (p.x - cr.position.x) * dt * 2; animateWalk(cr, dt, 3); cr.rotation.y = 0;
        if (cr.position.z > p.z - 1.2) { c.flags.crDone = 1; cr.visible = false; G.scareFace(0.85); G.sound.scream(0); c.flags.lightsOverride = false; G.sound.setHum(1); } } } },
  { id: 'beggar_lunge', scare: true, name: 'The old man lunges at you', update: (c, dt, p, G) => {
      const b = c.beggar, u = b.userData;
      if (!c.flags.bl && Math.abs(p.z - b.position.z) < 2.2) { c.flags.bl = c.t; G.sound.scream(0.6); G.shake(0.6); G.flash(0.1); u.head.rotation.x = 0; }
      if (c.flags.bl) { const k = Math.min(1, (c.t - c.flags.bl) * 6); b.position.x = 1.8 - k * 1.2; b.position.y = b.userData.sitY + k * 0.5; u.armL.rotation.x = u.armR.rotation.x = -1.6 * k - 0.4; b.rotation.y = facePlayer(b, p); if (c.t - c.flags.bl > 0.9) { b.visible = false; } } } },
];
