// PLATFORM 0 v3.3 — defences against THE LOOKALIKE (they do nothing to Maa: a swing or a shove passes through her with a cold whoosh).
// 1) a melee weapon (steel rod / broken umbrella) picked up on the platforms: R / left-click (pointer locked) / ⚔️ — hit = he staggers
//    ~2.5 s and is knocked back, 3 hits and he dissolves; breaks after 5 swings.
// 2) a shove: Space / ✋ (shown when he's within ~4 m), short range, 8 s cooldown, knock back + 1.5 s stagger. No item needed.
// 3) hiding spots (under the benches, the waiting room, behind the subway shop, under a train seat): USE to hide / leave. If he didn't see
//    you go in, he loses you, searches, walks past and fades. If he saw, he drags you out. Hiding doesn't stop Maa.
import * as THREE from './three.module.min.js';
import { clearAt } from './npc.js';
const rnd = (a, b) => a + Math.random() * (b - a);
import { ik2 } from './humans.js';
import { SwingFx, shoveK } from './swing.js';
import { TP_STATES } from './tp.js';

// ---------- v3.3.1: attack animations (both views), hit feedback, break ----------
const SW = { wind: 0.11, strike: 0.23, end: 0.46, hitAt: 0.155 }, SH = { end: 0.44, hitAt: 0.13 };
const ease = (x) => x * x * (3 - 2 * x), clamp01 = (x) => Math.max(0, Math.min(1, x));
const _tS = new THREE.Vector3(), _tH = new THREE.Vector3(), _tD = new THREE.Vector3(), _tP = new THREE.Vector3(), _tR = new THREE.Vector3();
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
let SPARK_TEX = null;
function sparkTex() { if (SPARK_TEX) return SPARK_TEX; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,236,190,.85)'); g.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  x.strokeStyle = 'rgba(255,250,235,.9)'; x.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.3; x.beginPath(); x.moveTo(32 + Math.cos(a) * 6, 32 + Math.sin(a) * 6); x.lineTo(32 + Math.cos(a) * (18 + (i % 2) * 11), 32 + Math.sin(a) * (18 + (i % 2) * 11)); x.stroke(); }
  SPARK_TEX = new THREE.CanvasTexture(c); SPARK_TEX.colorSpace = THREE.SRGBColorSpace; return SPARK_TEX; }
// rotate a bone by a world-space quaternion
function boneRotWorld(bone, q) { bone.parent.getWorldQuaternion(_q1); _q2.copy(_q1).invert().multiply(q).multiply(_q1); bone.quaternion.premultiply(_q2); bone.updateMatrixWorld(true); }
export const DEF = { swingR: 2.1, swingCost: 1, uses: 5, hitsToKill: 3, stagger: 2.5, knock: 1.6, shoveR: 1.9, shoveCool: 8000, shoveStagger: 1.5, shoveKnock: 2.0, shoveShow: 4 };
const WEAPON_SPOTS = { 1: [{ kind: 'rod', x: 1.25, z: -12.9, ry: 0.5 }], 2: [{ kind: 'umbrella', x: -1.45, z: -6.2, ry: 1.2 }], 3: [{ kind: 'rod', x: 0.32, z: -8.3, ry: 1.45 }] };
const HIDE_SPOTS = {
  1: [{ id: 'bench1', label: 'Hide under the bench', x: -2.98, z: -8.6, from: [-2.25, -8.6], camY: 0.42, my: 0.3, slats: true },
      { id: 'bench2', label: 'Hide under the bench', x: -2.98, z: -20.0, from: [-2.25, -20.0], camY: 0.42, my: 0.3, slats: true },
      { id: 'room', label: 'Hide in the waiting room corner', x: -3.0, z: -5.05, from: [-2.6, -4.6], camY: 0.95, my: 0.6 }],
  2: [{ id: 'shop', label: 'Hide behind the shop', x: -1.68, z: -15.35, from: [-1.2, -15.0], camY: 0.95, my: 0.6 },
      { id: 'box', label: 'Hide behind the box', x: 1.68, z: -8.55, from: [1.2, -8.2], camY: 0.95, my: 0.6 }],
  3: [{ id: 'seat1', label: 'Hide between the seats', x: -1.0, z: -6.5, from: [-0.2, -6.5], camY: 0.6, my: 0.4, slats: true },
      { id: 'seat2', label: 'Hide between the seats', x: 1.0, z: -13.5, from: [0.2, -13.5], camY: 0.6, my: 0.4, slats: true }] };
export class Defence {
  constructor(F) {
    this.F = F; this.weapon = null; this.shoveReady = 0; this.hiding = null; this.log = []; this.swingT = -1; this.built = {};
    const css = document.createElement('style'); css.textContent = `
#dfSwing,#dfShove{position:fixed;width:58px;height:58px;border-radius:50%;border:2px solid rgba(255,255,255,.5);background:rgba(0,0,0,.35);color:#fff;font-size:24px;display:none;z-index:7}
#dfSwing{right:100px;bottom:74px;border-color:rgba(240,120,90,.7)} #dfShove{right:176px;bottom:112px;--cd:1;background-image:conic-gradient(rgba(255,255,255,.28) calc(var(--cd)*360deg),rgba(0,0,0,0) 0)} #dfShove.wait{opacity:.55}
body.touch[data-screen=hud] #dfSwing.on,body.touch[data-screen=hud] #dfShove.on{display:block} body.inspecting #dfSwing,body.inspecting #dfShove{display:none!important}
#dfUses{position:fixed;left:calc(16px + env(safe-area-inset-left,0px));top:50px;font:700 12px system-ui,sans-serif;color:#f0b8a0;text-shadow:0 1px 2px #000;display:none;z-index:6;pointer-events:none}
body[data-screen=hud] #dfUses.on{display:block} body.hpon.dfweap #goal{top:72px} body.dfweap #goal{top:72px}
#dfHide{position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;transition:opacity .5s;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 30%,rgba(0,0,0,.75) 75%,rgba(0,0,0,.95) 100%)}
#dfHide.slats{background:repeating-linear-gradient(0deg,rgba(0,0,0,.0) 0 26px,rgba(10,8,6,.88) 26px 44px),radial-gradient(ellipse at center,rgba(0,0,0,0) 30%,rgba(0,0,0,.85) 85%)}
body.hiding #dfHide{opacity:1} body.hiding #cross{display:none}`;
    document.head.appendChild(css);
    const mk = (tag, id, html = '') => { const e = document.createElement(tag); e.id = id; e.innerHTML = html; document.body.appendChild(e); return e; };
    this.$swing = mk('button', 'dfSwing', '⚔️'); this.$shove = mk('button', 'dfShove', '✋'); this.$uses = mk('div', 'dfUses'); this.$hide = mk('div', 'dfHide');
    this.$swing.setAttribute('aria-label', 'Swing'); this.$shove.setAttribute('aria-label', 'Shove');
    const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
    const swingBtn = (e) => { stop(e); if (!this.weapon) { this.A.hint('No weapon: find a steel rod or an umbrella on the platform', 2000); return; } this.swing(); };
    this.$swing.addEventListener('touchstart', swingBtn); this.$swing.addEventListener('click', swingBtn);
    this.$shove.addEventListener('touchstart', (e) => { stop(e); this.shove(); }); this.$shove.addEventListener('click', (e) => { stop(e); this.shove(); });
    // first-person weapon (on the camera) and a third-person one (in his left hand)
    this.fpW = new THREE.Group(); this.fpW.visible = false; F.A.camera.add(this.fpW); this.fpW.position.set(0.3, -0.34, -0.5);
    // v3.3.2: modelled hands (hands.js) hold the rod / the torch and push in the shove; the swing's 3 variants, smear, hitstop, camera
    // kick, impact dust and the pickup hint live in swing.js (visuals only — the hit timing and numbers stay here)
    this.fpHands = new THREE.Group(); this.fpHands.visible = false; F.A.camera.add(this.fpHands);
    this.fx2 = new SwingFx(this, F.A.camera); this.fpTrail = this.fx2.fpSmear;
    this.shoveT = -1; this.sparks = [];
  }
  get G() { return this.F.G; } get A() { return this.F.A; } get S() { return this.F.S; } get look() { return this.F.foe; }
  makeWeaponMesh(kind) {
    const g = new THREE.Group();
    if (kind === 'umbrella') { const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.82, 8), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6, roughness: 0.4 })); g.add(shaft);
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12, Math.PI), new THREE.MeshStandardMaterial({ color: 0x3a2014, roughness: 0.6 })); hook.position.y = -0.41; hook.rotation.z = Math.PI; hook.position.x = 0.045; g.add(hook);
      const cloth = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 8, 1, true), new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.9, side: THREE.DoubleSide })); cloth.position.y = 0.18; g.add(cloth); }
    else { const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.95, 8), new THREE.MeshStandardMaterial({ color: 0x6a5a4a, metalness: 0.8, roughness: 0.45 })); g.add(rod);
      const rust = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0x5a2a14, roughness: 0.9 })); rust.position.y = -0.35; g.add(rust); }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.handProp = 1; } });
    return g;
  }
  buildChapter(CH) {
    if (this.built[CH.id]) return this.built[CH.id]; const B = this.built[CH.id] = { weapons: [], hides: [] };
    for (const s of WEAPON_SPOTS[CH.id] || []) { const m = this.makeWeaponMesh(s.kind); m.rotation.set(Math.PI / 2, 0, 0); const holder = new THREE.Group(); holder.add(m); holder.position.set(s.x, (CH.floorY ? CH.floorY(s.x, s.z) : 0) + 0.025, s.z); holder.rotation.y = s.ry;
      this.fx2.pickupHint(holder, s.kind); // v3.3.2: a soft pool of light + a glint along the rod (the old flat glow read as a sheet of paper)
      CH.root.add(holder); B.weapons.push({ spot: s, obj: holder }); }
    for (const s of HIDE_SPOTS[CH.id] || []) { const o = new THREE.Object3D(); o.position.set(s.x, s.my, s.z); CH.root.add(o); B.hides.push({ spot: s, obj: o }); }
    return B;
  }
  resetRun() { this.dropWeapon(true); this.shoveReady = 0; this.leave(true); }
  onLoop(CH, items, exit) {
    this.CH = CH; this.leave(true); const B = this.buildChapter(CH);
    for (const w of B.weapons) { const on = !this.weapon && !exit; w.obj.visible = on; if (on) items.push({ obj: w.obj, r: 1.35, losEnd: 0.3, label: w.spot.kind === 'umbrella' ? 'Take the broken umbrella' : 'Take the steel rod', use: () => { this.takeWeapon(w); return 'remove'; } }); }
    const self = this; for (const h of B.hides) items.push({ obj: h.obj, r: 1.3, losEnd: 0.6, label: h.spot.label, hide: true, get prio() { const f = self.F.foe; return f && f.active && f.state !== 'gone' ? 1 : -1; }, /* something after you: hiding comes first; otherwise pick-ups do */ use: () => { this.enter(h.spot); } });
    this.updateHud();
  }
  // ---------- weapon ----------
  takeWeapon(w) {
    this.weapon = { kind: w.spot.kind, uses: DEF.uses, hits: 0 }; for (const x of this.built[this.CH.id].weapons) x.obj.visible = false;
    if (this.fpMesh) this.fpW.remove(this.fpMesh); this.fx2.resetSeq(); const m = this.makeWeaponMesh(this.weapon.kind); m.position.y = 0.36; m.traverse(o => { if (o.isMesh) o.renderOrder = 3; }); this.fpW.add(m); this.fpMesh = m; this.fpW.visible = false; this.fpRest(); if (this.tpW) { this.tpW.parent && this.tpW.parent.remove(this.tpW); this.tpW = null; }
    const S = this.S; S && S.step && S.step(0.4); this.A.hint(this.A.isTouch ? `${w.spot.kind === 'umbrella' ? 'Umbrella' : 'Steel rod'} — tap the swing button (only he can be hit)` : `${w.spot.kind === 'umbrella' ? 'Umbrella' : 'Steel rod'} — R or left-click to swing`, 2600);
    this.log.push({ ev: 'take', kind: this.weapon.kind }); this.updateHud();
  }
  dropWeapon(silent) { this.weapon = null; this.fpW.visible = false; if (this.fpMesh) { this.fpW.remove(this.fpMesh); this.fpMesh = null; } this.fpTrail && this.fpTrail.clear(); this.tpTrail && this.tpTrail.clear(); if (this.tpW) { this.tpW.parent && this.tpW.parent.remove(this.tpW); this.tpW = null; } this.updateHud(); }
  fpRest() { this.fpW.position.set(0.26, -0.21, -0.48); this.fpW.rotation.set(-1.15, 0.1, 0.32); }
  swing() {
    const G = this.G; if (!this.weapon || G.state !== 'playing' || G.transitioning || this.hiding || this.swingT >= 0) return false;
    this.swingT = 0; this.weapon.uses--; const S = this.S; this.whoosh(0.5);
    // what's in front of you within reach?
    const p = this.A.player, L = this.look; let hit = null;
    if (L && L.active && L.h) { const d = this.dist(L.h), f = this.F.facing(L.h.position, p); if (d < DEF.swingR && f > 0.35) hit = 'look'; }
    const g = this.F.CH && this.F.CH.fx && this.F.CH.fx.ghost; if (!hit && g && g.userData.active && g.visible) { const d = this.dist(g), f = this.F.facing(g.position, p); if (d < DEF.swingR && f > 0.35) hit = 'maa'; }
    const kind = this.weapon.kind; if (hit === 'look') this.pendingHit = L; this.fx2.start(hit === 'look'); // the impact frame (and its hitstop) lands on the hit
    setTimeout(() => { if (this.pendingHit === L) this.pendingHit = null; if (hit === 'look' && L.active) { this.fx2.onImpact(); this.weapon && this.weapon.hits++; const dead = (L.hits = (L.hits || 0) + 1) >= DEF.hitsToKill; this.impact(L.h, kind); G.shake(0.6); if (dead) L.blind(); else L.stagger(DEF.stagger, DEF.knock); }
      else if (hit === 'maa') this.coldWhoosh(); }, SW.hitAt * 1000);
    this.log.push({ ev: 'swing', hit, uses: this.weapon.uses });
    if (this.weapon.uses <= 0) setTimeout(() => { this.crack(kind); this.A.hint(kind === 'umbrella' ? 'The umbrella snapped' : 'The rod bent and broke', 2000); this.breakFx(kind); this.dropWeapon(); this.log.push({ ev: 'broke' }); }, SW.strike * 1000 + 60);
    this.updateHud(); return hit;
  }
  // ---------- shove ----------
  shove() {
    const G = this.G, now = performance.now(); if (G.state !== 'playing' || G.transitioning || this.hiding) return false;
    if (now < this.shoveReady) { this.A.hint('Catch your breath…', 800); return false; }
    this.shoveReady = now + DEF.shoveCool; const p = this.A.player, L = this.look; let hit = null; G.shake(0.25); this.whoosh(0.35); this.shoveT = 0; // v3.3.1: both hands push out (both views)
    if (L && L.active && L.h && this.dist(L.h) < DEF.shoveR && this.F.facing(L.h.position, p) > 0.2) { hit = 'look'; L.stagger(DEF.shoveStagger, DEF.shoveKnock); const S = this.S; S && S.thud && S.thud(); this.impact(L.h, 'hands'); }
    else { const g = this.F.CH && this.F.CH.fx && this.F.CH.fx.ghost; if (g && g.userData.active && g.visible && this.dist(g) < DEF.shoveR && this.F.facing(g.position, p) > 0.2) { hit = 'maa'; this.coldWhoosh(); } }
    this.log.push({ ev: 'shove', hit }); return hit;
  }
  coldWhoosh() { const S = this.S; this.A.showSub('…your hands go straight through her. Ice cold.', 2200, true); S && S.whisper && S.whisper(0.6, 0, 0.12); this.F.G.flash(0.08); if (this.F.$breath) { this.F.$breath.style.opacity = '0.7'; } }
  whoosh(loud) { const S = this.S; if (!S || !S.ctx) return; const ctx = S.ctx, t = S.now(); const n = ctx.createBufferSource(); n.buffer = S.noiseBuf; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(1800, t + 0.12); bp.frequency.exponentialRampToValueAtTime(400, t + 0.28); const g = ctx.createGain(); S.env(g, t, 0.02, 0.4 * loud, 0.25); n.connect(bp); bp.connect(g); g.connect(S.out); n.start(t, 0, 0.35); }
  // v3.3.1 hit feedback: a heavy thud + a metal clang (rod) / a dull thwack (umbrella / hands), a spark at the point of impact
  impact(h, kind) { const S = this.S; S && S.thud && (S.thud(), kind !== 'hands' && S.thud());
    if (S && S.ctx && kind === 'rod') { const ctx = S.ctx, t = S.now(); for (const [f, a, d] of [[523, 0.22, 0.5], [1187, 0.13, 0.35], [2311, 0.07, 0.22], [3790, 0.04, 0.12]]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * rnd(0.98, 1.02); const g = ctx.createGain(); S.env(g, t, 0.002, a, d); o.connect(g); g.connect(S.out); g.connect(S.rev); o.start(t); o.stop(t + d + 0.1); } }
    if (!h) return; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex(), color: kind === 'hands' ? 0xbfd0ff : 0xffe2b0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
    const p = this.A.player; _v1.set(p.x - h.position.x, 0, p.z - h.position.z).normalize(); sp.position.set(h.position.x + _v1.x * 0.32, h.position.y + (kind === 'hands' ? 1.25 : 1.45), h.position.z + _v1.z * 0.32); sp.renderOrder = 9; sp.scale.setScalar(0.15);
    (h.parent || this.A.camera.parent).add(sp); this.sparks.push({ sp, t: 0 }); this.fx2.burst(sp.position, h.parent || this.A.camera.parent, _v1); }
  crack(kind) { const S = this.S; if (!S || !S.ctx) { S && S.glass && S.glass(); return; } const ctx = S.ctx, t = S.now(); // the snap of metal / umbrella ribs
    const n = ctx.createBufferSource(); n.buffer = S.noiseBuf; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = kind === 'umbrella' ? 1400 : 2200; const g = ctx.createGain(); S.env(g, t, 0.001, 0.55, 0.09); n.connect(hp); hp.connect(g); g.connect(S.out); g.connect(S.rev); n.start(t, 0, 0.2);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(kind === 'umbrella' ? 240 : 170, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.18); const g2 = ctx.createGain(); S.env(g2, t, 0.002, 0.5, 0.2); o.connect(g2); g2.connect(S.out); o.start(t); o.stop(t + 0.3);
    if (kind !== 'umbrella') for (const f of [2870, 4410]) { const p = ctx.createOscillator(); p.frequency.value = f; const g3 = ctx.createGain(); S.env(g3, t + 0.01, 0.002, 0.06, 0.4); p.connect(g3); g3.connect(S.out); g3.connect(S.rev); p.start(t + 0.01); p.stop(t + 0.5); }
    if (kind === 'umbrella') for (let i = 0; i < 3; i++) { const c = ctx.createBufferSource(); c.buffer = S.noiseBuf; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3000 + i * 700; bp.Q.value = 6; const g4 = ctx.createGain(); const tt = t + 0.05 + i * 0.045; S.env(g4, tt, 0.001, 0.3, 0.03); c.connect(bp); bp.connect(g4); g4.connect(S.out); c.start(tt, 0, 0.05); } }
  breakFx(kind) { // the broken weapon spins down out of view (first person) / drops from his hand (third person)
    const m = this.fpMesh; if (m && this.fpW.visible) { const cam = this.A.camera; this.fpW.updateMatrixWorld(true); const piece = m.clone(); piece.matrix.copy(this.fpW.matrix).multiply(m.matrix); piece.matrix.decompose(piece.position, piece.quaternion, piece.scale); cam.add(piece);
      const t0 = performance.now(), spin = rnd(4, 7); const step = () => { const k = (performance.now() - t0) / 450; if (k >= 1 || !piece.parent) { cam.remove(piece); return; } piece.position.y -= 0.03 + k * 0.02; piece.position.x += 0.004; piece.rotateZ(spin * 0.016); requestAnimationFrame(step); }; requestAnimationFrame(step); }
    if (this.tpW && this.tpW.visible && this.tpW.parent) { const w = this.tpW.clone(), par = this.tpW.parent; par.add(w); const t0 = performance.now(), y0 = w.position.y, floor = (this.A.player.y || 0) + 0.03; const step = () => { const k = (performance.now() - t0) / 1000; if (k > 2.2 || !w.parent) { par.remove(w); return; } w.position.y = Math.max(floor, y0 - 4.9 * k * k); if (w.position.y > floor) w.rotateX(0.12); requestAnimationFrame(step); }; requestAnimationFrame(step); } }
  dist(o) { const p = this.A.player; return Math.hypot(o.position.x - p.x, o.position.z - p.z); }
  // ---------- hiding ----------
  enter(spot) {
    const G = this.G, p = this.A.player, L = this.look; if (this.hiding || G.state !== 'playing') return;
    let seen = false; if (L && L.active && L.h && this.dist(L.h) < 14) seen = this.F.losClear(new THREE.Vector3(L.h.position.x, L.h.position.y + 1.55, L.h.position.z), new THREE.Vector3(p.x, (p.y || 0) + 1.3, p.z), L.h, 0.2);
    this.hiding = { spot, back: { x: p.x, z: p.z, yaw: p.yaw }, seen, t: 0 }; G.hiding = this.hiding;
    p.x = spot.x; p.z = spot.z; document.body.classList.add('hiding'); this.$hide.classList.toggle('slats', !!spot.slats);
    const S = this.S; S && S.heartbeat && S.heartbeat(5, 1.1); S && S.step && S.step(0.3);
    if (L && L.active) L.lostYou(seen, spot); this.log.push({ ev: 'hide', id: spot.id, seen });
    this.A.hint(this.A.isTouch ? 'Hidden — tap USE to come out' : 'Hidden — E to come out', 2200);
  }
  leave(silent) { if (!this.hiding) return; const p = this.A.player, b = this.hiding.back; if (!silent) { p.x = b.x; p.z = b.z; } this.hiding = null; this.G.hiding = null; document.body.classList.remove('hiding'); }
  // ---------- per frame ----------
  update(dt) {
    const G = this.G, F = this.F, now = performance.now();
    if (this.hiding) { this.hiding.t += dt; this.A.tp && this.A.tp.forceFP && this.A.tp.forceFP(250);
      F.near = { label: 'Come out', obj: null, use: () => { this.leave(); return 'keep'; } }; const lbl = (this.A.isTouch ? '👆 ' : 'E · ') + 'Come out';
      if (F.$prompt.textContent !== lbl) F.$prompt.textContent = lbl; F.$prompt.classList.add('on'); F.$useBtn.classList.add('on'); }
    // v3.3.1 the swing: wind-up over the shoulder, a fast arc across the screen with a trail, follow-through, back to ready
    if (this.swingT >= 0) { this.swingT += dt * (this.slowmo || 1); if (this.swingT >= SW.end) this.swingT = -1; }
    if (this.freezeT !== undefined && this.swingT >= 0) this.swingT = Math.min(this.swingT, this.freezeT); // tests / screenshots
    const tp = this.A.tp, tpOn = !!(tp && tp.active && tp.h && TP_STATES.has(G.state)), tpChosen = !!(tp && tp.on && tp.h); // v3.6: third person is on even when the avatar is hidden (the lens close to him): never show the first-person hands/rod/torch then
    // v3.3.2 first person: the rod in a modelled hand (3 swing variants), the shove's open hands, the torch in hand
    if (this.shoveT >= 0) { this.shoveT += dt * (this.slowmo || 1); if (this.shoveT >= SH.end) this.shoveT = -1; }
    if (this.freezeShove !== undefined && this.shoveT >= 0) this.shoveT = Math.min(this.shoveT, this.freezeShove);
    const live = G.state === 'playing' && !this.hiding && !tpOn && !tpChosen, /* v3.6: third person chosen = no first-person hands, ever (also during a forced first-person moment) */ shoveVis = this.shoveT >= 0 && live;
    this.fpHands.visible = shoveVis; this.fpW.visible = !!this.weapon && live && !shoveVis;
    this.fx2.fp(dt, this.fpW.visible, G); this.fx2.shoveFP(shoveVis);
    { const T = F.torch, insp = !!F.inspecting || !!(F.holder && F.holder.visible); this.fx2.torchFP(!!(T && T.on && T.has) && live && !shoveVis && !insp, this.fpW.visible, dt); }
    this.fx2.tick(dt);
    if (this.weapon && tp && tp.h) { if (!this.tpW) { this.tpW = new THREE.Group(); const m = this.makeWeaponMesh(this.weapon.kind); m.position.y = 0.36; this.tpW.add(m); (this.A.camera.parent || tp.h.parent).add(this.tpW); this.tpW.visible = false; }
      if (!tpOn) this.tpW.visible = false; }
    if (!tpOn && this.tpTrail) this.tpTrail.clear();
    for (let i = this.sparks.length - 1; i >= 0; i--) { const s = this.sparks[i]; s.t += dt; const k = s.t / 0.22; if (k >= 1) { s.sp.parent && s.sp.parent.remove(s.sp); s.sp.material.dispose(); this.sparks.splice(i, 1); continue; } s.sp.scale.setScalar(0.15 + k * 0.55); s.sp.material.opacity = 1 - k * k; s.sp.material.rotation = k * 0.8; }
    // phone buttons
    const L = this.look, near = L && L.active && L.h && this.dist(L.h) < DEF.shoveShow;
    // v3.3.1: ⚔️ shows with a weapon in hand, and (dimmed, "no weapon") when he is close and you have none, so you know it exists
    this.$swing.classList.toggle('on', (!!this.weapon || !!near) && G.state === 'playing' && !this.hiding);
    this.$shove.classList.toggle('on', !!near && G.state === 'playing' && !this.hiding);
    const K = F.skills; if (K) { K.dim('dfSwing', 'noweap', !this.weapon, '✕'); K.cool('dfSwing', this.swingT >= 0 ? this.swingT / SW.end : 1, 0); }
    if (near) { const left = Math.max(0, this.shoveReady - now), cd = left > 0 ? 1 - left / DEF.shoveCool : 1; if (K) K.cool('dfShove', cd, left); else { this.$shove.style.setProperty('--cd', cd.toFixed(2)); this.$shove.classList.toggle('wait', cd < 1); } }
    for (const w of (this.built[F.CH && F.CH.id] || { weapons: [] }).weapons) if (w.obj.visible && w.obj.userData.hint) this.fx2.tickPickup(w.obj.userData.hint, now);
  }
  // v3.3.1 third person: called by tp.js after his animation, before the torch arm. Poses the left arm (rod swing), both arms (shove), the
  // torso twist, and places the weapon in his left fist. Returns true when the right arm is busy (the shove) so the torch arm leaves it be.
  tpPose(tp) {
    const rig = tp.h.userData.rig, B = rig && rig.bones; if (!B) return false;
    const UA = B.Bip01_L_UpperArm, FA = B.Bip01_L_Forearm, HD = B.Bip01_L_Hand, RUA = B.Bip01_R_UpperArm, RFA = B.Bip01_R_Forearm, RHD = B.Bip01_R_Hand;
    if (!UA || !FA || !HD) return false;
    const y = tp.byaw, fw = _v3.set(-Math.sin(y), 0, -Math.cos(y)), rt = _v4.set(Math.cos(y), 0, -Math.sin(y));
    const t = this.swingT, sw = this.weapon && t >= 0, sh = this.shoveT >= 0; let busyR = false;
    const X = this.fx2; X.tpBody(tp, B, sw, sh); // v3.3.2: hips + shoulders twist, he sinks into it, feet planted; leans into a shove
    const S = UA.getWorldPosition(_tS);
    const tgt = (f, r, u, o) => o.copy(S).addScaledVector(fw, f).addScaledVector(rt, r).add(_v1.set(0, u, 0));
    let two = false;
    if (sw) { X.tpRod(tp, S, _tH, _tD); ik2(UA, FA, HD, _tH, tgt(-0.15, -0.35, -0.25, _tP));
      if (X.v === 2 && X.canTwoHands() && RUA && RFA && RHD) { two = true; RUA.getWorldPosition(_tR); _tP.copy(_tR).addScaledVector(fw, -0.1).addScaledVector(rt, 0.4); _tP.y -= 0.3; _v2.copy(_tH).addScaledVector(_tD, -0.115); ik2(RUA, RFA, RHD, _v2, _tP); busyR = true; } }
    if (sh) { const out = shoveK(this.shoveT);
      ik2(UA, FA, HD, tgt(0.18 + out * 0.42, 0.12 + out * 0.04, -0.3 + out * 0.2, _tH), tgt(0, -0.35, -0.3, _tP));
      if (RUA && RFA && RHD) { RUA.getWorldPosition(_tR); const tr = (f, r, u, o) => o.copy(_tR).addScaledVector(fw, f).addScaledVector(rt, r).add(_v1.set(0, u, 0)); ik2(RUA, RFA, RHD, tr(0.18 + out * 0.42, -0.12 - out * 0.04, -0.3 + out * 0.2, _v2), tr(0, 0.35, -0.3, _tP)); busyR = Math.abs(out) > 0.05; } }
    X.tpFist(rig, 'L', !!(this.weapon && this.tpW) && !sh); X.tpFist(rig, 'R', two);
    // the weapon in the left fist: its direction follows the swing; at rest held forward-down
    if (this.tpW && this.weapon) { const w = this.tpW; HD.getWorldPosition(_v2); const F2 = B.Bip01_L_Finger2; if (F2) { F2.getWorldPosition(_v1); _v2.lerp(_v1, 0.5); }
      let dir; if (sw) dir = _tD; else if (sh) dir = _tD.set(0, 0, 0).addScaledVector(fw, 0.4).add(_v1.set(0, 0.9, 0)).normalize(); else dir = _tD.set(0, 0, 0).addScaledVector(fw, 0.75).add(_v1.set(0, -0.65, 0)).normalize();
      w.position.copy(_v2); w.quaternion.setFromUnitVectors(_up, dir); w.visible = tp.h.visible; // v3.6: hidden with him w.updateMatrixWorld(true);
      this.tpTrail = X.tpSmearUpdate(tp, S, w.parent); }
    return busyR;
  }
  camKick(cam, tp) { this.fx2 && this.fx2.camKick(cam, tp); } // v3.3.2 (main.js, after the camera is placed)
  updateHud() { const w = this.weapon; this.$uses.classList.toggle('on', !!w); document.body.classList.toggle('dfweap', !!w); if (w) this.$uses.textContent = (w.kind === 'umbrella' ? '☂ umbrella ' : '⚔ rod ') + '▮'.repeat(Math.max(0, w.uses)) + '▯'.repeat(Math.max(0, DEF.uses - w.uses)); }
}
