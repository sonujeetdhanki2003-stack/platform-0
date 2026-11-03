// PLATFORM 0 v2 — Chapter 1: the platform
import * as THREE from './three.module.min.js';
import * as M from './mats.js';
import * as TX from './tx1.js';
import { box, rbox, cyl, plane, shadows, makeHuman, animateWalk, stillPose, makeLamp, makeFan, makeBench, nameBoard, platformSign, panelTex, signMesh, setSignCanvas, makeTrainExt, makeDust, makeRain } from './props.js';
import { Chapter, facePlayer } from './chapter.js';
import { hasProp, prop } from './models.js';
import { buildFob, FOB_ANOMALIES } from './fob.js';
import { PFStruct } from './pfstruct.js';
import { setPath, stepPath, inView } from './npc.js';
import { leanOnCounter } from './humans.js';
import { makeSplashes, makeDrips, makePuddles, makeMoths, makeDistantTrain } from './weather.js';
import { PFVariety } from './pfvariety.js'; // v3.4: every platform PF 0..8 has its own look
import { Subtle, CH1_SUBTLE } from './subtle.js'; // v3.5: hidden anomalies + red herrings

export const PLAT = { x0: -3.5, x1: 2.5, zNear: 2, zFar: -38, roof: 4.2, doorX: -1.0, doorW: 1.8, doorH: 2.6 };

export class Ch1 extends Chapter {
  constructor(game) {
    super(game);
    this.id = 1; this.title = 'PLATFORM 0'; this.sub = 'प्लेटफ़ॉर्म ०';
    this.fogColor = 0x07090a; this.fogDensity = 0.048; this.exposure = 1.05; this.sky = true; this.skyI = 0.14;
    this.start = { x: PLAT.doorX, z: 5.6, yaw: 0 }; this.visitHint = 'Walk at least halfway down the platform before you turn back';
    this.bounds = { x0: -3.22, x1: 2.2, z0: -46.2, z1: 10.2 };
    this.anomalies = CH1_ANOMALIES.concat(FOB_ANOMALIES, CH1_SUBTLE);
    this.walkBounds = { x0: -3.22, x1: 20.4, z0: -60, z1: 10.2 }; // v3: the forward route continues over the foot-over-bridge
    this.build();
  }
  loopLabel(n) { return n >= 8 ? 'PLATFORM 8 · EXIT' : 'PLATFORM ' + n; }
  setDawn(on) {
    this.dawn = on; const E = this.game.engine;
    E.scene.fog.color.setHex(on ? 0x6a7a86 : this.fogColor); E.useSky(!on && this.sky, this.skyI); if (E.scene.background.isColor) E.scene.background.setHex(on ? 0x8a9aa6 : this.fogColor); E.scene.fog.density = on ? 0.03 : this.fogDensity;
    this.hemi.intensity = on ? 1.6 : 0.35; this.hemi.color.setHex(on ? 0xa8c0d8 : 0x5d6a66);
    this.lamps.forEach(l => { if (!l.noFlicker) l.base = on ? 0.25 : 1; });
    this.rain.visible = !on; const st = this.pfv && this.pfv.struct; if (st && st.sky) st.sky.visible = !on && st.skyN >= 0; // v3.6.1
     if (this.splash) this.splash.visible = !on; if (this.roofDrips) this.roofDrips.visible = !on; E.renderer.toneMappingExposure = (on ? 1.5 : this.exposure) * (E.bright || 1) * (E.expMul || 1);
  }
  isBack(p) { return p.z > 8.6; }
  isForward(p) { return this.isExit ? p.z < -42.5 : this.fob.isForward(p); }
  walk(x, z) { return (z >= -46.2 && x >= -3.22 && x <= 2.2 && z <= 10.2) || this.fob.walk(x, z); }
  floorY(x, z) { return this.fob ? this.fob.floorY(x, z) : 0; }
  visitedAt(p) { return p.z < -15; } // v3: must walk ~halfway (past the second pillar) before a turn-back counts
  build() {
    const P = PLAT, root = this.root, len = P.zNear - P.zFar, midZ = (P.zNear + P.zFar) / 2;
    const floorM = M.makeWet(M.pbr('floor', { rep: [3, 20], color: 0xb8b2a6 }), 0.9, 0.11);
    const wallM = M.pbr('pwall', { rep: [10, 1.1], color: 0xd2c6aa });
    const plast = M.pbr('plaster', { rep: [30, 2], color: 0x8a8478 });
    const rust = M.pbr('rust', { rep: [1, 2], color: 0x6c8a7a, metal: 1, ns: 0.8 });
    // platform floor + coping + yellow tactile strip
    const fl = plane(P.x1 - P.x0 + 0.01, len, floorM, root); fl.rotation.x = -Math.PI / 2; fl.position.set((P.x0 + P.x1) / 2, 0, midZ); fl.receiveShadow = true;
    const edge = this.edgeStrip = plane(0.42, len, M.makeWet(M.pbr('tactile', { rep: [len / 0.55, 0.75], color: 0xf0c020, env: 0.6 }), 0.7, 0.11), root); edge.rotation.x = -Math.PI / 2; edge.rotation.z = Math.PI / 2; edge.position.set(P.x1 - 0.32, 0.006, midZ); edge.receiveShadow = true; // v3: scanned tactile warning strip (yellow). v3.3.1: these lines had slipped inside the comment, so the strip stood upright, 40 m tall, in the middle of the platform at the start
    const cope = box(0.12, 0.08, len, M.std(0x8c877c, 0.7), P.x1 - 0.06, 0.0, midZ, root);
    const side = plane(len, 1.25, M.pbr('floor', { rep: [20, 0.6], color: 0x6a655c }), root); side.rotation.y = Math.PI / 2; side.position.set(P.x1 - 0.004, -0.62, midZ); /* v3.0.2: 4 mm behind the coping's face (z-fight strip along the edge) */
    // back wall with a darker dado band + wall/floor AO seam
    const bw = plane(len, P.roof, wallM, root); bw.rotation.y = Math.PI / 2; bw.position.set(P.x0, P.roof / 2, midZ); bw.receiveShadow = true;
    const dado = plane(len, 1.0, M.pbr('pwall', { rep: [14, 0.35], color: 0x6b2e22 }), root); dado.rotation.y = Math.PI / 2; dado.position.set(P.x0 + 0.005, 0.5, midZ); dado.receiveShadow = true;
    const seam = M.aoStrip(len, 0.7, 0.75); seam.rotation.y = Math.PI / 2; seam.position.set(P.x0 + 0.012, 0.35, midZ); root.add(seam);
    const seam2 = M.aoStrip(len, 0.9, 0.5); seam2.rotation.x = -Math.PI / 2; seam2.rotation.z = Math.PI / 2; seam2.position.set(P.x0 + 0.45, 0.011, midZ); seam2.material = seam2.material.clone(); root.add(seam2);
    // track pit: gravel, sleepers, rails
    const gravelM = M.pbr('gravel', { rep: [3, 70], color: 0x5c5850 });
    const pit = plane(7, 160, gravelM, root); pit.rotation.x = -Math.PI / 2; pit.position.set(6, -1.2, -18); pit.receiveShadow = true; this.pit = pit;
    const rails = this.rails = new THREE.Group(); root.add(rails);
    const railM = M.std(0x9a9ca0, 0.32, 0.9);
    for (const rx of [4.6, 6.0]) { box(0.07, 0.15, 160, M.std(0x4a3a30, 0.8, 0.5), rx, -1.08, -18, rails); box(0.075, 0.03, 160, railM, rx, -0.995, -18, rails); }
    const slN = 200, sl = new THREE.InstancedMesh(new THREE.BoxGeometry(2.5, 0.12, 0.26), M.std(0x6e6a62, 0.95), slN);
    const mtx = new THREE.Matrix4(); for (let i = 0; i < slN; i++) { mtx.makeTranslation(5.3, -1.16, -98 + i * 0.8); sl.setMatrixAt(i, mtx); } sl.receiveShadow = true; rails.add(sl);
    // far boundary wall across the tracks (open air, rain falls here)
    const fw = this.farWall = plane(160, 4.2, plast, root); fw.rotation.y = -Math.PI / 2; fw.position.set(9.5, 0.9, -18);
    { const c = M.canvas(512, 512), g = c.getContext('2d'); g.strokeStyle = 'rgba(240,200,30,.8)'; g.lineWidth = 50; g.beginPath(); g.ellipse(256, 256, 140, 200, 0, 0, 7); g.stroke(); M.grime(g, 512, 512, 0.4, 2);
      const z0 = plane(2.6, 2.6, new THREE.MeshStandardMaterial({ map: M.ctex(c), transparent: true, roughness: 0.9 }), root); z0.rotation.y = -Math.PI / 2; z0.position.set(9.45, 1.4, -18); }
    { const c = panelTex([['पटरी पार करना', 64, 'deva', '#fff'], ['मना है', 64, 'deva', '#fff'], ['DO NOT CROSS', 60, 'sans', '#fff'], ['THE TRACKS', 60, 'sans', '#fff']], { bg: '#8a1a14', w: 512, h: 384, top: 30, borderColor: '#fff' });
      const s = signMesh(c, 1.6, 1.2); s.rotation.y = -Math.PI / 2; s.position.set(9.44, 1.5, -5); root.add(s); }
    // sodium street lamps behind the far wall (warm orange spill)
    for (const z of [-8, -30]) {
      const pole = cyl(0.06, 0.08, 6, M.std(0x333333, 0.6, 0.6), 10.2, 2, z, root, 8);
      const head = box(0.6, 0.12, 0.25, M.std(0x222222, 0.6, 0.5), 9.9, 5, z, root);
      const l = makeLamp(root, 9.7, 4.9, z, { color: 0xff9440, power: 22, dist: 24, len: 0.4, cone: false, floorY: -1.2, poolW: 9, poolD: 12, poolX: -2.5, prio: -6 });
      l.noFlicker = true; l.tx = -4; this.lamps.push(l);
    }
    // roof: corrugated iron over the platform only, with steel trusses
    const roofM = M.pbr('roof', { rep: [3, 18], color: 0x8a8070, metal: 1, side: THREE.DoubleSide });
    const rf = plane(7.6, len + 14, roofM, root); rf.rotation.x = Math.PI / 2; rf.position.set(-0.3, P.roof, midZ);
    const roofEdge = box(0.08, 0.35, len + 14, rust, 3.5, P.roof - 0.15, midZ, root);
    this.roofParts = []; /* v3.6: per-platform roofs (pfstruct.js) replace these */ for (let z = P.zNear - 2; z > P.zFar - 4; z -= 4) { const tr = box(7.4, 0.22, 0.14, rust, -0.25, P.roof - 0.13, z, root); tr.castShadow = true; this.roofParts.push(tr, box(7.4, 0.04, 0.3, rust, -0.25, P.roof - 0.25, z, root)); }
    // end walls with doorways + dark tunnel mouths, passages
    this.endWall(P.zNear, 1); this.endWall(P.zFar, -1);
    this.passage(P.zNear, 1); this.passage(P.zFar, -1);
    this.fob = buildFob(this);
    // pillars (painted steel columns) with platform signs
    this.pillarSigns = [];
    this.pillarCanvas = { n: M.canvas(1024, 256) /* v3.4: its own canvas (it was platformSign's cached PF 0 canvas, which drawPillar(0) then cleared and drew onto itself: blank pillar signs on PF 0) */, m: (() => { const c = platformSign(0, false); const m = M.canvas(1024, 256), g = m.getContext('2d'); g.translate(1024, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return m; })() };
    this.pillarTex = { n: M.ctex(this.pillarCanvas.n), m: M.ctex(this.pillarCanvas.m) };
    for (const z of [-6, -14, -22, -30]) {
      const pil = rbox(0.34, P.roof, 0.34, 0.04, rust, 0.6, P.roof / 2, z, root); pil.castShadow = true; pil.receiveShadow = true;
      (this.pillarParts = this.pillarParts || []).push(pil, box(0.5, 0.12, 0.5, M.std(0x3d4a44, 0.6, 0.5), 0.6, 0.06, z, root)); // v3.6: per-platform pillar styles (pfstruct.js) replace these
      const sb = M.shadowBlob(1.2, 1.2, 0.5); sb.position.set(0.6, 0.012, z); root.add(sb);
      this.addSolid(0.38, 0.82, z - 0.22, z + 0.22);
      for (const f of [1, -1]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.155), new THREE.MeshStandardMaterial({ map: this.pillarTex.n, roughness: 0.6 })); s.position.set(0.6, 2.2, z + f * 0.172); if (f < 0) s.rotation.y = Math.PI; root.add(s); this.pillarSigns.push(s); }
    }
    // tube lamps along the platform
    for (let z = P.zNear - 3, i = 0; z > P.zFar; z -= 5, i++) { const l = makeLamp(root, -0.9, P.roof - 0.5, z, { hang: 0.42, color: 0xdaf2d4, power: 8.5, poolX: 0.4 }); this.lamps.push(l); }
    this.hemi = new THREE.HemisphereLight(0x5d6a66, 0x15120e, 0.35); root.add(this.hemi);
    // station name boards (Hindi + English)
    { const s = signMesh(nameBoard('SHUNYA ROAD', 'शून्य रोड'), 2.6, 0.65); s.rotation.y = Math.PI / 2; s.position.set(P.x0 + 0.03, 2.9, -11.5); root.add(s); this.nameBoard = s; }
    { const g = new THREE.Group(); g.position.set(1.8, 2.75, -35); root.add(g); box(2.0, 0.55, 0.06, M.std(0x111111, 0.6), 0, 0, 0, g); for (const f of [1, -1]) { const s = signMesh(nameBoard('SHUNYA ROAD', 'शून्य रोड', { seed: 8 }), 1.95, 0.5); s.position.z = 0.035 * f; if (f < 0) s.rotation.y = Math.PI; g.add(s); } box(0.04, 1.5, 0.04, M.std(0x222222, 0.6, 0.5), -0.8, 1.0, 0, g); box(0.04, 1.5, 0.04, M.std(0x222222, 0.6, 0.5), 0.8, 1.0, 0, g); }
    // posters on the back wall
    const today = new Date(); this.dateStr = today.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    this.posterTex = { anime: M.ctex(TX.animePoster('normal')), animeEyes: M.ctex(TX.animePoster('eyes')), missing: M.ctex(TX.missingPoster('normal')), missingYou: M.ctex(TX.missingPoster('you', this.dateStr)), lookL: M.ctex(TX.animePoster('lookL')), lookR: M.ctex(TX.animePoster('lookR')) };
    const poster = (tex, w, h, z, y = 1.75) => { const m = plane(w, h, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), root); m.rotation.y = Math.PI / 2; m.position.set(P.x0 + 0.02, y, z); m.receiveShadow = true; return m; };
    this.animePoster = poster(this.posterTex.anime, 1.0, 1.5, -0.4); // v3: moved clear of the waiting room
    this.missingPoster = poster(this.posterTex.missing, 0.8, 1.12, -17.2);
    poster(M.ctex(TX.chaiPoster()), 1.0, 1.5, -26.5);
    poster(M.ctex(TX.railNotice()), 1.0, 0.75, -33, 1.85);
    poster(M.ctex(panelTex([['सावधान!', 90, 'deva', '#b01010'], ['जेबकतरों से', 66, 'deva'], ['सावधान रहें', 66, 'deva'], ['BEWARE OF', 54, 'sans'], ['PICKPOCKETS', 54, 'sans']], { w: 384, h: 512, seed: 11 })), 0.62, 0.82, -24.6, 1.9);
    this.hindiNotice = poster(M.ctex(panelTex([['यात्रीगण', 70, 'deva'], ['कृपया ध्यान दें', 56, 'deva', '#222', 10], ['Last local', 52, 'sans'], ['23:58', 90, 'sans', '#b01010'], ['to CHURCHGATE', 46, 'sans']], { w: 384, h: 512, bg: '#d8e4d0', seed: 12 })), 0.62, 0.82, -7.3, 1.9);
    this.hindiNoticeTex = { n: this.hindiNotice.material.map, m: M.ctex(panelTex([['मुड़ो मत', 92, 'deva', '#b01010'], ['मुड़ो मत', 92, 'deva', '#b01010'], ['DON\'T', 70, 'sans', '#b01010'], ['TURN', 70, 'sans', '#b01010'], ['AROUND', 70, 'sans', '#b01010']], { w: 384, h: 512, bg: '#d8e4d0', seed: 12 })),
      t: M.ctex(panelTex([['यात्रीगण', 70, 'deva'], ['कृपया ध्यान दें', 56, 'deva', '#222', 10], ['Last local', 52, 'sans'], ['02:17', 90, 'sans', '#b01010'], ['to CHURCHGATE', 46, 'sans']], { w: 384, h: 512, bg: '#d8e4d0', seed: 12 })) }; // v3.5 'notice_0217'
    // benches
    this.bench1 = makeBench(root, -2.95, -8.6); this.addSolid(-3.35, -2.6, -9.55, -7.65);
    this.bench2 = makeBench(root, -2.95, -20); this.addSolid(-3.35, -2.6, -20.95, -19.05);
    this.bench3 = makeBench(root, -2.95, -29.6); this.bench3.visible = false;
    this.stall(-13.5); this.cooler(-23.2); this.binMake(-31.3); this.dressV3();
    // ceiling fans
    this.fans = []; for (const z of [-9, -19, -31]) this.fans.push(makeFan(root, -1.9, P.roof - 0.62, z, 0.5).userData.hub);
    this.clockMake(); this.boardMake(); this.signMake();
    // NPCs
    this.commuter = shadows(makeHuman({ shirt: 0xe2e0d6, pants: 0x30323a, backpack: true, headphones: true, skin: 0x7a4e33 }), true, false); root.add(this.commuter);
    this.vendor = shadows(makeHuman({ shirt: 0xc7b48a, pants: 0xe8e2d0, skin: 0x6b4128, lungi: true, mustache: true, sleeves: 'short', bodyTint: 0x8a8478, idle: 'm_idle_breathe_01' }), true, false); root.add(this.vendor); this.vendor.position.set(-3.12, 0, -13.2); this.vendor.rotation.y = Math.PI / 2; leanOnCounter(this.vendor, this.stallTop); // v3.0.2: behind the counter, not inside it
    this.vendor2 = makeHuman({ shirt: 0xc7b48a, pants: 0xe8e2d0, skin: 0x6b4128, lungi: true, mustache: true, sleeves: 'short', bodyTint: 0x8a8478 }); root.add(this.vendor2); this.vendor2.position.set(3.25, -1.2, -21); this.vendor2.visible = false;
    this.shadow = makeHuman({ eyes: 'white' }); const blk = new THREE.MeshBasicMaterial({ color: 0x010101 }); this.shadow.traverse(o => { if (o.isMesh && !this.shadow.userData.eyes.includes(o)) o.material = blk; }); this.shadow.scale.setScalar(1.25); this.shadow.position.set(-2.3, 0, -29.5); this.shadow.userData.eyes.forEach(e => e.scale.set(2.2, 2.6, 1)); root.add(this.shadow); this.shadow.visible = false;
    this.sleeper = this.makeSleeper(); this.sleeper.position.set(-2.98, 0.69, -20); root.add(this.sleeper); // v3.0.2: on the seat (0.65 m) instead of 19 cm inside it, and short enough to fit between the armrests
    // hands at the edge
    this.hands = new THREE.Group(); root.add(this.hands); this.hands.position.set(2.5, 0, -18.5); this.hands.scale.setScalar(1.6); this.hands.visible = false;
    { const sk = M.std(0x9a8a82, 0.55), arm = M.std(0x3a302a, 0.9);
      for (const dz of [-0.45, 0.45]) { const h = new THREE.Group(); h.position.z = dz; this.hands.add(h); cyl(0.06, 0.07, 0.8, arm, 0.07, -0.42, 0, h, 8); for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.16, 3, 6), sk); f.rotation.z = Math.PI / 2; f.position.set(-0.08, 0.025, -0.08 + i * 0.053); h.add(f); } rbox(0.12, 0.07, 0.22, 0.03, sk, 0.04, -0.01, 0, h); } }
    // footprints
    this.feet = new THREE.Group(); root.add(this.feet); this.feet.visible = false;
    { const fm = new THREE.MeshStandardMaterial({ map: M.ctex(TX.footprintTex()), transparent: true, depthWrite: false, roughness: 0.1 });
      for (let i = 0; i < 12; i++) { const k = i / 11; const x = -3.0 + k * 5.2 + (i % 2 ? 0.12 : -0.12), z = -15.5 - k * 3.6; const f = plane(0.14, 0.3, fm, this.feet); f.rotation.x = -Math.PI / 2; f.rotation.z = -Math.atan2(5.2, 3.6) + Math.PI; f.position.set(x, 0.008 + i * 0.0003, z); } }
    this.puddle = plane(1.6, 1.4, new THREE.MeshStandardMaterial({ map: M.ctex(TX.puddleTex(true)), transparent: true, depthWrite: false, roughness: 0.05, metalness: 0.2 }), root); this.puddle.rotation.x = -Math.PI / 2; this.puddle.position.set(-2.6, 0.012, -23.2); this.puddle.visible = false;
    this.drips = []; for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), M.std(0x6a0000, 0.1)); d.position.set(-2.88, 0.6, -23.05 + i * 0.03); d.visible = false; root.add(d); this.drips.push(d); }
    // train
    this.train = makeTrainExt(5); this.train.position.set(5.3, -1.0, -200); this.train.visible = false; root.add(this.train);
    // exit glow
    this.exitGlow = plane(1.8, 2.6, new THREE.MeshBasicMaterial({ color: 0xfffbea, toneMapped: false }), root); this.exitGlow.position.set(-1.0, 1.3, -46.3); this.exitGlow.visible = false;
    this.exitSign = signMesh(platformSign(8, true, { exitEn: 'EXIT  ↑', exitHi: 'निकास' }), 1.2, 0.3, { emissive: 1.4 }); this.exitSign.position.set(-1.0, 2.95, -37.75); root.add(this.exitSign); this.exitSign.visible = false;
    this.exitLamp = makeLamp(root, -1.0, 2.5, -43, { color: 0xfff4d8, power: 0, len: 0.01, cone: false }); this.exitLamp.noFlicker = true; this.lamps.push(this.exitLamp);
    // particles
    const Q = this.game.engine.Q;
    this.dust = makeDust(Q.dust, new THREE.Box3(new THREE.Vector3(-3.4, 0.2, -38), new THREE.Vector3(2.4, 4, 2))); root.add(this.dust);
    this.rain = makeRain(Q.rain, new THREE.Box3(new THREE.Vector3(3.7, -1.2, -45), new THREE.Vector3(9.4, 7, 6)), 0x7a8690); root.add(this.rain);
    // v3 weather + life: splash rings on the ballast, drips off the roof edge, rippling puddles, moths at the tubes, a distant train
    { const sp = makeSplashes(Q.splash, 3.8, 9.3, -45, 6, -1.17); if (sp) { root.add(sp); this.splash = sp; }
      const dr = makeDrips(Q.splash ? Math.round(Q.splash * 0.45) : 18, 3.56, 4.0, -1.15, -44, 8); if (dr) { root.add(dr); this.roofDrips = dr; }
      this.puddles = makePuddles(root, [[4.1, -6, 1.3, 0.8, 0.3], [5.3, -13, 0.9, 1.6, 0], [7.4, -9, 2.2, 1.2, 0.5], [4.4, -21, 1.0, 2.2, 0.1], [6.8, -27, 1.8, 1.0, 1.2], [5.3, -35, 0.9, 1.8, 0], [8.2, -38, 1.6, 2.4, 0.7], [7.0, 2, 2.0, 1.2, 0.2]], -1.185);
      this.moths = makeMoths(this.lamps.filter(l => !l.noFlicker && !l.fob && l.y > 3), Q.moths ? Math.max(2, Math.round(Q.moths / 8)) : 0, root);
      this.farTrain = makeDistantTrain(root, 5.3, -0.4, -110, this.game.sound);
      this.updaters.push((dt) => { if (this.farTrain && !this.isExit) this.farTrain.userData.update(dt); }); }
    this.updaters.push((dt, t) => { this.dust.userData.update(dt, t); this.rain.userData.update(dt); });
    this.probe = new THREE.Vector3(-0.5, 1.7, -16);
    this.reflectRect = { x: -0.5, z: -18, w: 6.0, d: 40, y: 0.004 };
    this.rainLevel = 0.7; this.surface = 'concrete';
    this.pfv = new PFVariety(this, { floor: fl, roof: rf, wall: bw, dado }); // v3.4 per-platform looks (pfvariety.js)
    this.pfv.struct = new PFStruct(this, { floor: fl, roof: rf, wall: bw, dado, edge: this.edgeStrip, pillarParts: this.pillarParts, roofParts: this.roofParts, far: this.farWall, benches: [this.bench1, this.bench2, this.bench3] }); // v3.6 every platform rebuilt (pfstruct.js)
    this.subtle = new Subtle(this, { stallZ: -13.5 }); // v3.5: CCTV, kettle steam and the red herrings (subtle.js)

  }
  endWall(z, dir) {
    const P = PLAT, root = this.root, mat = this.endWallM = this.endWallM || M.pbr('pwall', { rep: [3, 1.1], color: 0xc8bca0 }); // v3.6: one material for both end walls, re-skinned per platform
    const seg = (x0, x1, y0, y1) => { const m = plane(x1 - x0, y1 - y0, mat.clone(), root); m.material.map = m.material.map.clone(); m.material.map.repeat.set((x1 - x0) / 3, (y1 - y0) / 3.8); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); m.rotation.y = dir > 0 ? Math.PI : 0; m.receiveShadow = true; };
    const d0 = P.doorX - P.doorW / 2, d1 = P.doorX + P.doorW / 2;
    seg(P.x0, d0, 0, P.roof); seg(d0, d1, P.doorH, P.roof); seg(d1, 3.4, 0, P.roof); seg(3.4, 8.6, 3.4, P.roof + 0.4); seg(8.6, 9.5, -1.2, P.roof);
    const dark = plane(5.6, 4.8, M.basic(0x000000), root); dark.position.set(5.9, 1.1, z + dir * 3); dark.rotation.y = dir > 0 ? Math.PI : 0;
    this.addSolid(P.x0 - 1, d0, z - 0.2, z + 0.2); this.addSolid(d1, 11, z - 0.2, z + 0.2);
    const fr = M.std(0x3a2a20, 0.7); box(0.12, P.doorH, 0.25, fr, d0 - 0.054, P.doorH / 2, z, root); box(0.12, P.doorH, 0.25, fr, d1 + 0.054, P.doorH / 2, z, root); /* v3.0.2: jambs stand 6 mm proud of the passage walls (their faces were coplanar: flicker) */ box(P.doorW + 0.24, 0.14, 0.25, fr, P.doorX, P.doorH + 0.05, z, root);
  }
  passage(z, dir) {
    const P = PLAT, root = this.root, len = 8.5, x0 = P.doorX - P.doorW / 2, x1 = P.doorX + P.doorW / 2, zc = z + dir * len / 2, zEnd = z + dir * len;
    const wm = M.pbr('pwall', { rep: [2.5, 0.8], color: 0xa89c86 });
    const l = plane(len, P.doorH, wm, root); l.rotation.y = Math.PI / 2; l.position.set(x0, P.doorH / 2, zc);
    const r = plane(len, P.doorH, wm, root); r.rotation.y = -Math.PI / 2; r.position.set(x1, P.doorH / 2, zc);
    const e = plane(P.doorW, P.doorH, wm, root); e.position.set(P.doorX, P.doorH / 2, zEnd); e.rotation.y = dir > 0 ? Math.PI : 0; if (dir < 0) this.farEnd = e;
    const f = plane(P.doorW, len, M.makeWet(M.pbr('floor', { rep: [0.6, 2.6], color: 0x9a948a }), 0.7), root); f.rotation.x = -Math.PI / 2; f.position.set(P.doorX, 0, zc); f.receiveShadow = true;
    const c = plane(P.doorW, len, M.pbr('plaster', { rep: [0.6, 2.6], color: 0x55524c }), root); c.rotation.x = Math.PI / 2; c.position.set(P.doorX, P.doorH, zc);
    const lamp = makeLamp(root, P.doorX, P.doorH - 0.04, z + dir * 4, { color: 0xffcf8a, power: 3.5, dist: 7, len: 0.35, cone: false, poolW: 2.4, poolD: 3.5, prio: 1.5 });
    lamp.noFlicker = true; this.lamps.push(lamp);
    if (dir > 0) { this.passLamp = lamp; const n = plane(0.62, 0.78, new THREE.MeshStandardMaterial({ map: M.ctex(TX.rulesNotice()), roughness: 0.8 }), root); n.rotation.y = Math.PI / 2; n.position.set(x0 + 0.02, 1.45, z + 2.6); this.rulesSign = n; }
    this.addSolid(x0 - 1, x0, z, zEnd); this.addSolid(x1, x1 + 1, z, zEnd);
  }

  // v3: scanned CC0 props (Poly Haven) dressing the platform + a couple of rats on the tracks
  dressV3() {
    const R = this.root, add = (n, o, x, y, z, ry = 0, solid) => { const m = prop(n, o); if (!m) return null; m.position.set(x, y, z); m.rotation.y = ry; shadows(m); R.add(m); if (solid) this.addSolid(...solid); return m; };
    const low = this.game.engine.qKey === 'low'; // phone Low: skip the small high-poly dressing (tea set, kettle, rats)
    if (!low) { add('tea_set_01', { w: 0.42 }, -2.42, this.stallTop, -13.82, Math.PI / 2); add('vintage_electric_kettle', { h: 0.22 }, -2.5, this.stallTop, -12.3, -0.6); /* v3.0.2: on the new counter top, clear of the stove / jars */ add('cardboard_box_01', { h: 0.32 }, -3.15, 0.343, -15.22, -0.3); }
    add('cardboard_box_01', { h: 0.36 }, -3.12, 0, -15.25, 0.2, [-3.4, -2.85, -15.6, -14.9]);
    add('cardboard_box_01', { h: 0.3 }, -3.1, 0, -11.7, 0.9, [-3.4, -2.85, -12.0, -11.4]);
    add('trashbag', { h: 0.5 }, -3.0, 0, -30.05, 0.6, [-3.3, -2.75, -30.35, -29.75]);
    this.suitcase = add('vintage_suitcase', { w: 1.1 }, -3.2, 0, -17.4, Math.PI / 2, [-3.42, -3.0, -18.0, -16.8]); if (this.suitcase) { this.suitcaseSolid = this.solids[this.solids.length - 1]; this.suitcaseHome = { x: -3.2, z: -17.4, ry: Math.PI / 2, s: [-3.42, -3.0, -18.0, -16.8] }; } // v3.5: 'suitcase_moved'
    add('utility_box_01', { h: 1.05 }, -3.28, 0, -25.4, Math.PI / 2, [-3.45, -2.95, -25.7, -25.1]);
    add('WetFloorSign_01', { h: 0.62 }, 1.2, 0, -3.6, 0.7, [0.95, 1.45, -3.85, -3.35]);
    this.rats = [];
    if (hasProp('street_rat') && !low) for (const [x, z] of [[4.3, -9], [6.6, -24], [5.0, -33]]) {
      const r = prop('street_rat', { w: 0.22 }); r.position.set(x, -1.195, z); R.add(r); /* v3.0.2: on the ballast (they floated 8 cm above it) */
      this.rats.push({ m: r, x0: x, z0: z, t: Math.random() * 6, tx: x, tz: z });
    }
  }
  updateRats(dt) {
    for (const r of this.rats || []) {
      r.t -= dt; const m = r.m;
      if (r.t < 0) { r.t = 2 + Math.random() * 6; r.tx = r.x0 + (Math.random() - 0.5) * 2.4; r.tz = r.z0 + (Math.random() - 0.5) * 6; }
      const dx = r.tx - m.position.x, dz = r.tz - m.position.z, d = Math.hypot(dx, dz);
      if (d > 0.05) { const s = Math.min(d, dt * 2.2); m.position.x += dx / d * s; m.position.z += dz / d * s; m.rotation.y = Math.atan2(dx, dz); m.position.y = -1.195 + Math.abs(Math.sin(performance.now() * 0.03)) * 0.008; }
    }
  }
  stall(z) {
    // v3.0.2: a counter he can actually stand behind: 1.0 m high (was 1.1 m, chest height) and 0.62 m deep (was 0.9 m, so it filled the
    // whole space to the wall and he stood inside it). He stands in the 0.38 m gap between the wall and the counter's back.
    const g = new THREE.Group(); g.position.set(-2.9, 0, z); this.root.add(g); this.stallTop = 1.0;
    const wood = M.pbr('wood', { rep: [1, 1], color: 0x8a5a36 }), steel = M.std(0xc8c8c8, 0.25, 1.0), T = 1.0;
    rbox(0.62, T - 0.05, 2.6, 0.03, wood, 0.345, (T - 0.05) / 2, 0, g);
    rbox(0.84, 0.05, 2.8, 0.02, M.std(0x9a7a50, 0.5), 0.38, T - 0.025, 0, g);
    box(1.25, 0.06, 3.0, M.pbr('roof', { rep: [1, 2], color: 0x2e7a4a, metal: 1 }), 0.25, 2.5, 0, g);
    for (const dz of [-1.36, 1.36]) box(0.05, 2.47 - T, 0.05, M.std(0x333333, 0.5, 0.6), 0.76, (2.47 + T) / 2, dz, g);
    const s = signMesh(panelTex([['चाय  ☕  CHAI  ₹10', 74, 'deva', '#fff']], { bg: '#a0281c', w: 1024, h: 160, top: 34, borderColor: '#f2c613', seed: 3 }), 2.6, 0.42); s.rotation.y = Math.PI / 2; s.position.set(0.88, 2.76, 0); g.add(s);
    // stove + kettle + steam (on the counter, in front of his right hand)
    box(0.36, 0.1, 0.3, M.std(0x222222, 0.6, 0.5), 0.42, T + 0.05, 0.65, g);
    const flame = cyl(0.07, 0.09, 0.03, M.emissive(0x3a6aff, 5), 0.42, T + 0.115, 0.65, g, 10);
    const k = cyl(0.11, 0.15, 0.24, steel, 0.42, T + 0.25, 0.65, g, 16); cyl(0.03, 0.04, 0.12, steel, 0.42, T + 0.41, 0.65, g, 8);
    const sp = cyl(0.015, 0.025, 0.18, steel, 0.57, T + 0.27, 0.65, g, 6); sp.rotation.z = -1.0;
    // glasses with chai (front edge, past the stove)
    for (let i = 0; i < 6; i++) { cyl(0.032, 0.026, 0.085, new THREE.MeshStandardMaterial({ color: 0xb87a40, roughness: 0.1, transparent: true, opacity: 0.85 }), 0.6 + (i % 2) * 0.075, T + 0.0425, 0.95 + Math.floor(i / 2) * 0.075, g, 10); }
    // biscuit jars (far end)
    for (let i = 0; i < 3; i++) { const jz = -1.05 + i * 0.25; cyl(0.11, 0.11, 0.26, new THREE.MeshStandardMaterial({ color: 0xddeeff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.35 }), 0.25, T + 0.13, jz, g, 14); cyl(0.09, 0.09, 0.14, M.std([0xd9a050, 0xc87a3a, 0xe8c070][i], 0.9), 0.25, T + 0.07, jz, g, 10); cyl(0.1, 0.1, 0.04, M.std(0xb02020, 0.5), 0.25, T + 0.28, jz, g, 14); }
    // hanging snack packets (colour strip)
    { const c = M.canvas(512, 128), gg = c.getContext('2d'); const cols = ['#e8302a', '#f2c613', '#2a7ae8', '#30b050', '#ff7a1a', '#c030c0']; for (let i = 0; i < 16; i++) { gg.fillStyle = cols[i % 6]; gg.fillRect(i * 32 + 2, 0, 28, 120); gg.fillStyle = 'rgba(255,255,255,.6)'; gg.fillRect(i * 32 + 6, 30, 20, 26); } M.grime(gg, 512, 128, 0.3, 4);
      const pk = plane(2.0, 0.28, new THREE.MeshStandardMaterial({ map: M.ctex(c), roughness: 0.35, side: THREE.DoubleSide }), g); pk.rotation.y = Math.PI / 2; pk.position.set(0.82, 2.22, 0); pk.material.color.setHex(0x9a9080); }
    // bare bulb (warm), hanging from the roof on its flex
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), M.emissive(0xffc070, 8)); bulb.position.set(0.45, 2.3, 0); g.add(bulb); this.stallBulb = bulb;
    cyl(0.005, 0.005, 0.17, M.std(0x111111, 0.8), 0.45, 2.385, 0, g, 4);
    const l = makeLamp(this.root, -2.45, 2.25, z, { color: 0xffa850, power: 4, dist: 6, len: 0.01, cone: false, poolW: 3.2, poolD: 3.6, prio: 2 }); l.noFlicker = true; this.stallLamp = l; this.lamps.push(l);
    const sb = M.shadowBlob(1.6, 3.2, 0.6); sb.position.set(0.15, 0.012, 0); g.add(sb);
    shadows(g); this.addSolid(-3.5, -2.1, z - 1.4, z + 1.4);
  }
  cooler(z) {
    const g = new THREE.Group(); g.position.set(-3.15, 0, z); this.root.add(g);
    const steel = M.std(0xb9bcbf, 0.32, 0.9);
    rbox(0.5, 1.2, 0.8, 0.03, steel, 0, 0.6, 0, g); for (const dz of [0.15, -0.15]) { const t = cyl(0.02, 0.02, 0.1, M.std(0x888888, 0.3, 1), 0.3, 0.64, dz, g, 8); t.rotation.z = Math.PI / 2; }
    const s = signMesh(panelTex([['पीने का पानी', 44, 'deva', '#fff'], ['DRINKING WATER', 34, 'sans', '#fff']], { bg: '#1a4a8a', w: 256, h: 128, top: 14, bw: 4, borderColor: '#fff', grime: 0.4 }), 0.46, 0.23); s.rotation.y = Math.PI / 2; s.position.set(0.26, 0.98, 0); g.add(s);
    shadows(g); this.addSolid(-3.45, -2.85, z - 0.45, z + 0.45);
  }
  binMake(z) {
    this.bin = new THREE.Group(); this.root.add(this.bin); this.bin.position.set(-3.1, 0, z);
    const m = M.pbr('rust', { rep: [1, 1], color: 0x4a7aa8, metal: 1 });
    if (hasProp('metal_trash_can')) { const b = prop('metal_trash_can', { h: 0.95 }); b.rotation.y = Math.PI / 2; b.position.x = -0.02; this.bin.add(b); shadows(this.bin); this.addSolid(-3.4, -2.75, z - 0.85, z + 0.85); return; }
    cyl(0.25, 0.22, 0.75, m, 0, 0.375, 0, this.bin, 16); cyl(0.27, 0.27, 0.05, M.std(0x1f3f5f, 0.6, 0.4), 0, 0.76, 0, this.bin, 16);
    shadows(this.bin); this.addSolid(-3.4, -2.8, z - 0.3, z + 0.3);
  }
  clockMake() {
    const ck = this.clock = new THREE.Group(); ck.position.set(0.6, 3.15, -10.5); this.root.add(ck);
    box(0.03, 0.85, 0.03, M.std(0x222222, 0.5, 0.6), 0, 0.625, 0, ck); /* v3.0.2: the rod reaches the 4.2 m roof (it stopped 25 cm short, so the clock hung from nothing) */
    const faceTex = M.ctex(TX.clockFace()); this.clockHands = [];
    for (const f of [1, -1]) {
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), new THREE.MeshStandardMaterial({ map: faceTex, emissive: 0xffffff, emissiveMap: faceTex, emissiveIntensity: 0.35, roughness: 0.3 })); face.position.z = 0.051 * f; if (f < 0) face.rotation.y = Math.PI; ck.add(face);
      const hands = {}; for (const [k, L2, W] of [['h', 0.16, 0.025], ['m', 0.25, 0.018], ['s', 0.28, 0.008]]) { const pv = new THREE.Group(); pv.position.z = 0.06 * f; box(W, L2, 0.005, M.basic(k === 's' ? 0xaa0000 : 0x111111), 0, L2 / 2 - 0.03, 0, pv); ck.add(pv); hands[k] = { pv, f }; }
      this.clockHands.push(hands);
    }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 8, 32), M.std(0x1a1a1a, 0.4, 0.6)); ck.add(rim); const back = cyl(0.35, 0.35, 0.1, M.std(0x1a1a1a, 0.5, 0.5), 0, 0, 0, ck, 24); back.rotation.x = Math.PI / 2;
    this.clockTime = 2 * 3600 + 17 * 60; this.clockDir = 0; // v3.1: stopped at 2:17, like every clock at Shunya Road
  }
  boardMake() {
    const bd = this.boardG = new THREE.Group(); bd.position.set(0.6, 3.3, -25); this.root.add(bd);
    rbox(2.0, 0.55, 0.12, 0.02, M.std(0x151515, 0.5, 0.4), 0, 0, 0, bd); for (const x of [-0.8, 0.8]) box(0.03, 0.66, 0.03, M.std(0x222222, 0.6, 0.5), x, 0.58, 0, bd); /* v3.0.2: hangers reach the roof */
    this.boardCanvas = M.canvas(512, 128); this.boardTex = M.ctex(this.boardCanvas);
    for (const f of [1, -1]) { const s = plane(1.9, 0.47, new THREE.MeshStandardMaterial({ map: this.boardTex, emissive: 0xffffff, emissiveMap: this.boardTex, emissiveIntensity: 2.2, roughness: 0.4, color: 0x222222 }), bd); s.position.z = 0.065 * f; if (f < 0) s.rotation.y = Math.PI; }
  }
  signMake() {
    const sg = this.stationSignG = new THREE.Group(); sg.position.set(-1.0, 2.62, 0.3); this.root.add(sg);
    box(2.3, 0.62, 0.08, M.std(0x111111, 0.6), 0, 0, -0.03, sg);
    this.signMesh = signMesh(platformSign(0, false), 2.2, 0.55); this.signMesh.position.z = 0.02; sg.add(this.signMesh);
    for (const x of [-0.9, 0.9]) box(0.03, 1.32, 0.03, M.std(0x222222, 0.6, 0.5), x, 0.92, 0, sg); /* v3.0.2: hangers reach the roof (48 cm short before) */
  }
  setBoard(lines, color) { const c = TX.ledBoard(lines, color); const g = this.boardCanvas.getContext('2d'); g.clearRect(0, 0, 512, 128); g.drawImage(c, 0, 0); this.boardTex.needsUpdate = true; }
  setProgressSign(n, exit) {
    setSignCanvas(this.signMesh, exit ? platformSign(n, exit) : this.pfv.sign(n)); // v3.4: each platform's own sign style + colour band
    // v3 fix: the pillar signs always said PLATFORM 0 while the board showed the real number (looked like an anomaly every loop).
    // Every number sign now shows the current loop's number; only the sign_* anomalies change them.
    this.drawPillar(n);
  }
  drawPillar(n) {
    const src = this.pfv.sign(n), cn = this.pillarCanvas.n, cm = this.pillarCanvas.m;
    const gn = cn.getContext('2d'); gn.setTransform(1, 0, 0, 1, 0, 0); gn.clearRect(0, 0, cn.width, cn.height); gn.drawImage(src, 0, 0, cn.width, cn.height);
    const gm = cm.getContext('2d'); gm.setTransform(1, 0, 0, 1, 0, 0); gm.clearRect(0, 0, cm.width, cm.height); gm.translate(cm.width, 0); gm.scale(-1, 1); gm.drawImage(src, 0, 0, cm.width, cm.height); gm.setTransform(1, 0, 0, 1, 0, 0);
    this.pillarTex.n.needsUpdate = true; this.pillarTex.m.needsUpdate = true; this.pillarN = n;
  }
  // v3.5: the pillar sign the 'sign_one_mirror' anomaly flips: pillar 2 (z -14), the face you see walking in
  oddSign() { let best = null; for (const s of this.pillarSigns) { const w = s.getWorldPosition(new THREE.Vector3()); if (Math.abs(w.z + 14) < 0.6 && (!best || w.z > best.w)) best = { s, w: w.z }; } return best && best.s; }
  moveSuitcase(on) { // v3.5 'suitcase_moved': pulled off the wall into the platform, turned; its solid moves with it
    const m = this.suitcase, h = this.suitcaseHome, so = this.suitcaseSolid; if (!m) return;
    if (on) { m.position.set(-1.55, 0, -18.3); m.rotation.y = 0.18; Object.assign(so, { x0: -2.15, x1: -0.95, z0: -18.65, z1: -17.95 }); }
    else { m.position.set(h.x, 0, h.z); m.rotation.y = h.ry; Object.assign(so, { x0: h.s[0], x1: h.s[1], z0: h.s[2], z1: h.s[3] }); }
  }
  makeSleeper() {
    // v3.0.2: a sheet draped over a sleeping body (head, shoulders, hips, legs, feet tenting it; it hangs over the seat's front edge)
    // instead of three white capsules. Two pieces split at the hips so "the sleeper sits up" still folds the top half upright.
    const g = new THREE.Group(); const S = -0.039; // seat top in local space (seat 0.651 m, group at 0.69 m)
    const parts = [[0, -0.66, 0.1, 0.1, 0.19], [0, -0.41, 0.2, 0.18, 0.21], [0, -0.18, 0.19, 0.16, 0.2], [0, 0.07, 0.18, 0.15, 0.19], [0.05, 0.38, 0.09, 0.27, 0.13], [-0.055, 0.38, 0.09, 0.27, 0.12], [0.05, 0.7, 0.065, 0.075, 0.17], [-0.055, 0.69, 0.065, 0.075, 0.16]];
    const body = (x, z) => { let h = 0; for (const [cx, cz, rx, rz, ph] of parts) { const q = 1 - ((x - cx) / rx) ** 2 - ((z - cz) / rz) ** 2; if (q > 0) h = Math.max(h, ph * Math.pow(q, 0.55)); } return h; };
    const tent = (x, z) => { let s = 0, w = 0; for (const [dx, dz, k] of [[0, 0, 4], [0.05, 0, 1], [-0.05, 0, 1], [0, 0.06, 1], [0, -0.06, 1], [0.1, 0, 0.6], [-0.1, 0, 0.6], [0, 0.12, 0.6], [0, -0.12, 0.6]]) { s += body(x + dx, z + dz) * k; w += k; } return Math.max(body(x, z) * 0.85, s / w); };
    // the seat is 0.45 m deep and 1.65 m between the armrests (local x -0.22..0.23, z -0.8..0.85): the sheet stays inside it
    const X0 = -0.215, X1 = 0.225, Z0 = -0.79, Z1 = 0.83, NX = 26, NZ = 70;
    const sm = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    const yAt = (x, z) => { const e = sm(X0, X0 + 0.05, x) * sm(X1, X1 - 0.05, x) * sm(Z0, Z0 + 0.05, z) * sm(Z1, Z1 - 0.04, z);
      const h = tent(x, z) * (0.35 + 0.65 * e); const wr = (0.006 * Math.sin(z * 38 + x * 9) + 0.004 * Math.sin(z * 17 - x * 31)) * Math.min(1, h * 8); return S + 0.006 + h + wr; };
    const mk = (za, zb, ox, oy, oz) => { const geo = new THREE.PlaneGeometry(1, 1, NX, Math.round(NZ * (zb - za) / (Z1 - Z0))); const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) { const u = uv.getX(i), v = uv.getY(i), x = X0 + (X1 - X0) * u, z = za + (zb - za) * (1 - v); p.setXYZ(i, x - ox, yAt(x, z) - oy, z - oz); }
      geo.computeVertexNormals(); return geo; };
    const c = M.canvas(256, 512), gg = c.getContext('2d'); gg.fillStyle = '#e4ded0'; gg.fillRect(0, 0, 256, 512); M.grime(gg, 256, 512, 0.55, 7);
    for (let i = 0; i < 5; i++) { gg.fillStyle = `rgba(120,96,60,${0.05 + Math.random() * 0.06})`; gg.beginPath(); gg.ellipse(Math.random() * 256, Math.random() * 512, 20 + Math.random() * 40, 14 + Math.random() * 30, Math.random() * 3, 0, 7); gg.fill(); }
    const sheet = new THREE.MeshStandardMaterial({ map: M.ctex(c), color: 0xd0cabc, roughness: 0.97, side: THREE.DoubleSide });
    const HZ = -0.02; const upper = new THREE.Group(); g.add(upper); upper.position.set(0, S + 0.1, HZ);
    const top = new THREE.Mesh(mk(Z0, HZ + 0.03, 0, S + 0.1, HZ), sheet); upper.add(top);
    const low = new THREE.Mesh(mk(HZ, Z1, 0, 0, 0), sheet); g.add(low);
    const head = new THREE.Object3D(); head.position.set(0, 0.1, -0.64); upper.add(head);
    // a bare foot sticking out at the end
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), M.std(0x6b4128, 0.6)); foot.scale.set(0.8, 0.7, 1.6); foot.position.set(0.06, S + 0.1, Z1 - 0.06); foot.rotation.x = -0.6; g.add(foot);
    shadows(g); g.userData = { upper, head }; return g;
  }
  startTrain(kind, speed, dir) {
    this.train.userData.setKind(kind); this.train.visible = true;
    this.train.position.z = dir < 0 ? 70 : -150; this.trainState = { speed, dir };
    this.game.sound.train(kind === 'faces' ? 6 : 9, true, kind === 'faces' ? 1.6 : 0.7);
  }
  resetLoop(progress, rng) {
    this.resetCommon();
    this.animePoster.material.map = this.posterTex.anime; this.missingPoster.material.map = this.posterTex.missing; this.hindiNotice.material.map = this.hindiNoticeTex.n;
    this.clockDir = 0; this.clockTime = 2 * 3600 + 17 * 60; this.bench3.visible = false;
    this.vendor.visible = true; this.vendor.userData.head.rotation.set(0, 0, 0); this.vendor2.visible = false;
    this.hemi.intensity = 0.35; this.hemi.color.setHex(0x5d6a66);
    this.feet.visible = false; this.puddle.visible = false; this.drips.forEach(d => d.visible = false);
    this.train.visible = false; this.train.position.z = -200; this.trainState = null; this.train.userData.setKind('normal');
    this.commuter.visible = true; this.commuter.scale.setScalar(1); this.commuter.rotation.set(0, 0, 0); this.commuter.position.set(1.75, 0, -36); this.commuter.userData.nav = null; this.commuterState = 'wait'; this.commuter.userData.head.rotation.set(0, 0, 0);
    this.pillarSigns.forEach(s => s.material.map = this.pillarTex.n);
    this.rails.visible = true; this.pit.visible = true;
    this.hands.visible = false; this.hands.position.y = 0;
    this.fansOn = true; this.bin.position.y = 0; this.bin.rotation.set(0, 0, 0);
    this.shadow.visible = false;
    this.sleeper.visible = true; this.sleeper.userData.upper.rotation.set(0, 0, 0);
    this.rain.userData.speedMul = 1; this.rain.visible = true; if (this.splash) this.splash.visible = true; if (this.roofDrips) this.roofDrips.visible = true;
    this.exitGlow.visible = false; this.exitSign.visible = false; this.exitLamp.power = 0;
    this.setBoard(['23:58 SLOW   CHURCHGATE', `PF ${Math.min(progress, 8)}   LATE   ...`]); this.boardN = Math.min(progress, 8); // v3: board number matches the loop number too
    this.setProgressSign(Math.min(progress, 8), progress >= 8);
    this.pfv.set(Math.min(progress, 8)); // v3.4: this platform's look (lights, surfaces, props, sound); same platform = same look every loop
    this.sleeper.rotation.set(0, 0, 0); this.moveSuitcase(false);
    this.subtle.reset(Math.min(progress, 8)); // v3.5: this platform's red herrings + the baseline of everything a subtle anomaly changes
    this.isExit = progress >= 8;
    this.fob.reset(progress, this.isExit); this.fob.g.visible = !this.isExit; if (this.farEnd) this.farEnd.visible = this.isExit;
    if (this.isExit) { this.exitGlow.visible = true; this.exitSign.visible = true; this.exitLamp.power = 30; this.exitLamp.prio = 8; this.commuter.visible = false; this.sleeper.visible = false; }
    if (!this.isExit) {
      if (rng() < 0.45) this.events.push({ t: 6 + rng() * 14, kind: 'pa' });
      if (rng() < 0.3) this.events.push({ t: 8 + rng() * 16, kind: 'train' });
    }
  }
  update(dt, p, G) {
    this.updateRats(dt); this.fob.update(dt, p); this.pfv.update(dt, p, G); this.subtle.update(dt, p, G);
    const t = this.t + dt;
    this.clockTime += dt * this.clockDir * (this.clockDir < 0 ? 12 : 1);
    const ct = this.clockTime, s = ct % 60, m = (ct / 60) % 60, h = (ct / 3600) % 12;
    for (const hands of this.clockHands) { const f = hands.s.f; hands.s.pv.rotation.z = -f * s / 60 * Math.PI * 2; hands.m.pv.rotation.z = -f * m / 60 * Math.PI * 2; hands.h.pv.rotation.z = -f * h / 12 * Math.PI * 2; }
    if (this.fansOn) this.fans.forEach((f, i) => f.rotation.y += dt * (7 + i));
    /* v3.0.2: the vendor's serving motion is now leg-free IK on the counter (humans.leanOnCounter), not arm swings into the wood */
    this.stallBulb.rotation.z = Math.sin(t * 0.9) * 0.05;
    const c = this.commuter;
    if (c.visible && !this.isExit) {
      // v3.0.1: he walks a waypoint path that stays clear of the pillars, the wet-floor sign and the end wall, turns smoothly
      // and leaves through the doorway (he used to walk straight into the near-end wall and vanish inside it)
      if (this.commuterState === 'wait' && p.z < 1.2) { this.commuterState = 'walk'; setPath(c, [[1.75, -36], [1.75, -2.8], [0.2, -0.2], [-1.0, 1.0], [-1.0, 4.0], [-1.0, 9.4]], { speed: this.flags.backward ? 0.85 : 1.2, back: this.flags.backward } /* v3.3.1: the backwards anomaly walks a slow, deliberate back-step (the walk played in reverse at its own stride) */); }
      if (this.commuterState === 'walk') { const done = stepPath(c, this, dt, p);
        if (done || (c.position.z > 2.6 && !inView(c, this.game.engine.camera))) { c.visible = false; this.commuterState = 'gone'; } }
      else if (this.commuterState === 'wait') stillPose(c);
    }
    for (const e of this.events) { if (e.done || t < e.t) continue; e.done = true;
      if (e.kind === 'pa' && !(this.anomaly && this.anomaly.noPA)) G.announce('Yatri kripya dhyan dein. The 11:58 slow local is running late. Inconvenience is deeply regretted.', false, 'pa_normal');
      if (e.kind === 'train') this.startTrain('normal', 16, -1); }
    if (this.trainState) { const ts = this.trainState; this.train.position.z += ts.speed * dt * ts.dir; if ((ts.dir > 0 && this.train.position.z > 90) || (ts.dir < 0 && this.train.position.z < -160)) { this.trainState = null; this.train.visible = false; } }
    this.baseUpdate(dt, p, G);
  }
}

// ---------- chapter 1 anomalies (v1's 23 + 2 new) ----------
const tubes = (c) => c.lamps.filter(l => !l.noFlicker);
export const CH1_ANOMALIES = [
  { id: 'poster_eyes', name: 'The anime poster\'s eyes are black', apply: c => { c.animePoster.material.map = c.posterTex.animeEyes; } },
  { id: 'missing_you', name: 'The missing poster shows you', apply: c => { c.missingPoster.material.map = c.posterTex.missingYou; } },
  { id: 'clock_backward', name: 'The clock runs backward', apply: c => { c.clockDir = -1; } },
  { id: 'extra_bench', name: 'There is an extra bench', apply: c => { c.bench3.visible = true; } },
  { id: 'vendor_stare', name: 'The chai vendor keeps staring at you', update: (c, dt, p) => { const v = c.vendor, u = v.userData; u.armR.rotation.x = 0; u.armL.rotation.x = 0; const yaw = facePlayer(v, p) - v.rotation.y; u.head.rotation.y = Math.max(-1.4, Math.min(1.4, Math.atan2(Math.sin(yaw), Math.cos(yaw)))); } },
  { id: 'vendor_on_track', name: 'The chai vendor is standing on the tracks', apply: c => { c.vendor.visible = false; c.vendor2.visible = true; },
    update: (c, dt, p, G) => { const v = c.vendor2; v.rotation.y = facePlayer(v, p); if (!c.flags.vgone && p.z < v.position.z + 3) { c.flags.vgone = true; v.visible = false; G.sound.whisper(1.2, 0.8, 0.2); } } },
  { id: 'lights_red', name: 'The lights flicker together and turn red', update: (c, dt, p, G) => {
      const t = c.t, on = !(Math.sin(t * 2.3) > 0.93 || (t % 6 < 0.25)); c.flags.lightsOverride = true;
      const red = t > 1.5; tubes(c).forEach(l => { l.level = on ? 1 : 0.04; l.setColor(red ? 0xff2a18 : l.baseColor.getHex()); }); /* v3.4: before it turns red it keeps this platform's tint */ G.sound.setHum(on ? 1 : 0.2); } },
  { id: 'pa_dont_turn', name: 'The announcement tells you not to turn around', update: (c, dt, p, G) => { if (!c.flags.pa && p.z < -7) { c.flags.pa = true; G.announce('Attention. Passenger in the white shirt... do not turn around. Keep walking. Keep walking.', true, 'pa_creepy'); } } },
  { id: 'footprints', name: 'Wet footprints walk off the platform edge', apply: c => { c.feet.visible = true; } },
  { id: 'black_train', name: 'A silent train with no windows is waiting', apply: (c, G) => { c.train.userData.setKind('black'); c.train.visible = true; c.train.position.z = -50; G.sound.setHum(0.4); } },
  { id: 'commuter_backward', name: 'The backpack man walks toward you backwards', apply: c => { c.flags.backward = true; } },
  { id: 'commuter_tall', name: 'The backpack man is far too tall', apply: c => { c.commuter.scale.setScalar(1.38); } },
  { id: 'board_message', name: 'The departure board shows your stop', apply: c => { const now = new Date(); const hh = String(now.getHours()).padStart(2, '0'), mm = String(now.getMinutes()).padStart(2, '0'); c.setBoard([`${hh}:${mm} YOUR STOP   NOW`, 'PF 0   DO NOT BOARD'], '#ff2a1a'); } },
  { id: 'sign_mirror', name: 'The pillar signs are mirrored', apply: c => { c.pillarSigns.forEach(s => s.material.map = c.pillarTex.m); } },
  { id: 'no_rails', name: 'The tracks are gone', apply: c => { c.rails.visible = false; c.pit.visible = false; } },
  { id: 'hands_edge', name: 'Hands grip the platform edge', apply: c => { c.hands.visible = true; },
    update: (c, dt, p, G) => { if (!c.flags.pulled && Math.abs(p.z - c.hands.position.z) < 3.2 && p.x > -0.5) { c.flags.pulled = true; G.sound.whisper(0.9, 0.9, 0.3); } if (c.flags.pulled && c.hands.position.y > -1) c.hands.position.y -= dt * 4; } },
  { id: 'red_water', name: 'The water cooler is leaking blood', apply: c => { c.puddle.visible = true; c.drips.forEach(d => d.visible = true); }, update: c => { c.drips.forEach((d, i) => { d.position.y = 0.6 - ((c.t * 0.9 + i * 0.25) % 0.6); }); } },
  { id: 'fans_stopped', name: 'All the ceiling fans have stopped', apply: (c, G) => { c.fansOn = false; G.sound.setFans(false); } },
  { id: 'floating_bin', name: 'The dustbin is floating', update: (c, dt) => { c.bin.position.y = 0.35 + Math.sin(c.t * 1.3) * 0.06; c.bin.rotation.y += dt * 0.3; } },
  { id: 'shadow_peek', name: 'A tall shadow stands at the far end', apply: c => { c.shadow.visible = true; },
    update: (c, dt, p, G) => { const sh = c.shadow; if (sh.visible) { sh.rotation.y = facePlayer(sh, p); if (p.z < -19) { sh.visible = false; G.sound.whisper(1.0, 0, 0.18); } } } },
  { id: 'rain_frozen', name: 'The rain has frozen in mid-air', apply: (c, G) => { c.rain.userData.speedMul = 0; if (c.splash) c.splash.visible = false; if (c.roofDrips) c.roofDrips.visible = false; G.sound.setRain && G.sound.setRain(0); } },
  { id: 'notice_turn', name: 'The green notice says "don\'t turn around"', apply: c => { c.hindiNotice.material.map = c.hindiNoticeTex.m; } },
  { id: 'blackout_face', scare: true, name: 'The lights go out and something is in front of you', update: (c, dt, p, G) => {
      if (!c.flags.bo && p.z < -14) { c.flags.bo = 1; c.flags.boT = c.t; G.sound.setHum(0); }
      if (c.flags.bo) { const k = c.t - c.flags.boT, dark = k < 2.1; c.flags.lightsOverride = dark;
        c.lamps.forEach(l => { if (l !== c.passLamp) l.level = dark ? 0 : 1; }); c.hemi.intensity = dark ? 0.01 : 0.35;
        if (k > 1.2 && k < 2.0 && !c.flags.faceShown) { c.flags.faceShown = 1; G.scareFace(0.8); }
        if (!dark && !c.flags.boEnd) { c.flags.boEnd = 1; G.sound.setHum(1); } } } },
  { id: 'sheet_sitter', scare: true, name: 'The sleeper sits up', update: (c, dt, p, G) => {
      const s = c.sleeper, u = s.userData;
      if (!c.flags.sat && Math.abs(p.z - s.position.z) < 3.4 && p.z < s.position.z + 3.4) { c.flags.sat = c.t; G.sound.scream(-0.6); G.shake(0.5); G.flash(0.15); }
      if (c.flags.sat) { const k = Math.min(1, (c.t - c.flags.sat) * 9); u.upper.rotation.x = k * 1.3; } } },
  { id: 'red_train', scare: true, name: 'A screaming train full of red windows', update: (c, dt, p, G) => {
      if (!c.flags.rt && p.z < -10) { c.flags.rt = 1; c.train.userData.setKind('faces'); c.train.visible = true; c.train.position.z = -150; c.trainState = { speed: 42, dir: 1 }; G.sound.horn(2.4, 0.9); G.sound.train(5, true, 1.6); setTimeout(() => G.shake(0.5), 1800); } } },
];
