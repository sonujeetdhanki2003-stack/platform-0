// PLATFORM 0 v3.2 — third-person view. You see Arjun: Rocketbox Male_Adult_02 (MIT), red backpack + headphones (yes, the
// backpack man). Over-the-shoulder camera with smoothing and collision (chapter walls/bounds, solids, thin wall/ceiling/glass
// panels collected from the chapter's own meshes), pulls in tight in narrow places, the avatar fades when the camera gets close.
// Locomotion: idle / walk / run blended by GROUND speed with one shared phase (walk and run clips are in step), so the feet plant.
// The torch is held in the right hand (two-bone IK aims the arm at what the camera centre looks at) and the spot light rides it.
import * as THREE from './three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { makeRealHuman, HUM, ik2, orientHand } from './humans.js';
import * as M from './mats.js';

const IDLE = 'm_headphones_idle', IDLE2 = 'm_idle_neutral_01', WALK = 'm_walk_neutral_01', RUN = 'm_run_fast_01';
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const CAM_HD = 0.95, TP_PITCH_MIN = -0.95, TP_PITCH_MAX = 0.85; // v3.6: lens-to-head minimum, pitch window
const _bd = new THREE.Vector3(), _pv = new THREE.Vector3(), OA_TRY = [0.55, -0.55, 1.0, -1.0, 1.45, -1.45, 1.75, -1.75, 2.05, -2.05];
// the boom direction: -f (behind him, following the view pitch) turned about the vertical by ang
function rotBoom(o, f, ang) { const c = Math.cos(ang), s = Math.sin(ang), x = -f.x, z = -f.z; o.set(x * c + z * s, -f.y, -x * s + z * c); return o; }
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const _hd = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3(), _h = new THREE.Vector3(), _p = new THREE.Vector3(), _t = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _box = new THREE.Box3();
export const TP_STATES = new Set(['playing', 'card', 'paused', 'note', 'inspect', 'keypad', 'phone']);

export class ThirdPerson {
  constructor(A) { // A: { G, engine, camera, player, FX }
    this.A = A; this.on = false; this.h = null; this.curD = 2.2; this.byaw = 0; this.phase = 0; this.spd = 0; this.px = null; this.pz = null;
    this.w = { i: 1, i2: 0, w: 0, r: 0 }; this.walls = new Map(); this.fpUntil = 0; this.tight = 0; this.tightT = 0; this.fadeK = 1; this.mounted = false;
    this.lightRig = new THREE.Object3D(); A.engine.scene.add(this.lightRig);
    this.stats = { hits: 0, minD: 9 };
  }
  get active() { return this.on && !!this.h && performance.now() > this.fpUntil && !this.hold; } // v3.2.1: hold = inspecting (seen from his eyes)
  forceFP(ms) { this.fpUntil = performance.now() + ms; }
  setOn(on) { this.on = !!on; if (on) this.build(); if (!on) { if (this.h) this.h.visible = false; this.unmount(); } }
  build() {
    if (this.h || !HUM.on) return this.h;
    const h = this.h = makeRealHuman({ av: 'Male_Adult_02', backpack: true, headphones: true, noProps: true }, RoundedBoxGeometry);
    const u = h.userData; u.selfDrive = true; u.noLod = true; u.isPlayer = true;
    this.mats = [];
    h.traverse(o => { if (!o.isMesh) return; o.frustumCulled = false; o.castShadow = true; const m = o.material.clone(); if (o.material.onBeforeCompile) { m.onBeforeCompile = o.material.onBeforeCompile; m.customProgramCacheKey = o.material.customProgramCacheKey; }
      m.transparent = true; m.opacity = 1; m.depthWrite = true; o.material = m; this.mats.push(m); });
    // v3.2.1: his pack sat ~9 cm off his back (the offset was set for the slimmer backpack-man NPC rig): pull it in towards the spine, his avatar only
    { h.updateMatrixWorld(true); let bp = null; h.traverse(o => { if (o.userData.isBackpack) bp = o; });
      if (bp && bp.parent) { const a = bp.getWorldPosition(new THREE.Vector3()), s = bp.parent.getWorldPosition(new THREE.Vector3()), d = new THREE.Vector3(s.x - a.x, 0, s.z - a.z); if (d.lengthSq() > 1e-6) { a.add(d.normalize().multiplyScalar(0.11)); bp.parent.worldToLocal(a); bp.position.copy(a); } } }
    const rig = u.rig; rig.mixer.stopAllAction(); rig.cur = null; this.act = {};
    for (const k of [IDLE, IDLE2, WALK, RUN]) { const C = HUM.clips[k] || HUM.clips[IDLE2]; const a = rig.mixer.clipAction(C); a.enabled = true; a.setEffectiveWeight(0); a.play(); this.act[k] = a; }
    this.act[WALK].timeScale = 0; this.act[RUN].timeScale = 0; this.act[IDLE].setEffectiveWeight(1);
    // torch in the right hand: a black rubber body, a chrome head and a lens that glows when it is on
    const t = this.torch = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.017, 0.17, 12), M.std(0x1a1a1c, 0.5, 0.2)); body.rotation.x = Math.PI / 2; body.position.z = -0.02; t.add(body);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.021, 0.05, 14), M.std(0x9a9a9e, 0.3, 0.9)); head.rotation.x = Math.PI / 2; head.position.z = -0.125; t.add(head);
    this.lensM = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff2d8, emissiveIntensity: 0, roughness: 0.2 });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.026, 14), this.lensM); lens.position.z = -0.151; lens.rotation.y = Math.PI; t.add(lens);
    t.traverse(o => { if (o.isMesh) { o.castShadow = false; o.userData.handProp = 1; } });
    A_SCENE(this).add(t); t.visible = false;
    A_SCENE(this).add(h); h.visible = false;
    rig.mixer.update(0); h.updateMatrixWorld(true);
    return h;
  }
  // ---------- torch light mount: the camera in first person, the hand in third ----------
  mount() { if (this.mounted) return; const L = this.A.FX.light; this.lightRig.add(L); this.lightRig.add(L.target); L.position.set(0, 0, 0); L.target.position.set(0, -0.03, -2); this.A.FX.mountObj = this.lightRig; this.mounted = true; }
  unmount() { if (!this.mounted) return; const L = this.A.FX.light, cam = this.A.camera; cam.add(L); cam.add(L.target); L.position.set(0.12, -0.12, 0.05); L.target.position.set(0.05, -0.1, -2); this.A.FX.mountObj = null; this.mounted = false; }
  // ---------- per frame (called from simStep after the player moved) ----------
  update(dt, CH, opts) {
    const G = this.A.G, p = this.A.player, show = this.active && TP_STATES.has(G.state);
    if (!this.h) return false;
    this.h.visible = show && this.fadeK > 0.04; this.torch.visible = this.h.visible && this.A.FX.torch.has;
    if (!show) { this.unmount(); this.px = null; return false; }
    const live = G.state === 'playing' || G.state === 'card';
    if (live) this.locomote(dt, p);
    this.camera(dt, CH, p, opts || {});
    this.hand(dt, p);
    return true;
  }
  locomote(dt, p) {
    const u = this.h.userData, rig = u.rig;
    if (this.px === null) { this.px = p.x; this.pz = p.z; this.byaw = p.yaw; }
    const vx = (p.x - this.px) / Math.max(dt, 1e-4), vz = (p.z - this.pz) / Math.max(dt, 1e-4); this.px = p.x; this.pz = p.z;
    let s = Math.hypot(vx, vz); if (s > 9) s = 0; // a teleport (new loop) is not a sprint
    this.spd += (s - this.spd) * Math.min(1, dt * 14); const sp = this.spd;
    const torchOn = this.A.FX.torch.on && this.A.FX.torch.has;
    let dir = 1, tb = this.byaw;
    // v3.3.1: he faces where he walks. Without the torch he turns round and walks towards the camera when you go back (he used to
    // moonwalk backwards at full speed). With the torch up he keeps the beam on the screen centre: strafes turn his body the way he
    // steps (up to ~95 deg off the view, the torch arm crosses his body), and going straight back is a slow, deliberate back-step.
    this.backpedal = false;
    if (sp > 0.12) { const my = Math.atan2(-vx, -vz), rel = wrap(my - p.yaw);
      if (torchOn && Math.abs(rel) > 2.2) { tb = my + Math.PI; dir = -1; this.backpedal = true; }
      else if (torchOn) { const d = wrap(my - p.yaw); tb = p.yaw + clamp(d, -1.65, 1.65); if (Math.abs(d) > 1.65) { tb = my + Math.PI; dir = -1; this.backpedal = true; } }
      else tb = my; }
    else if (Math.abs(wrap(this.byaw - p.yaw)) > (torchOn ? 0.5 : 1.1)) tb = p.yaw;
    { const dd = wrap(tb - this.byaw); this.byaw += dd * Math.min(1, dt * (sp > 0.12 ? (Math.abs(dd) > 1.0 ? 16 : 10) : 4)); } // v3.3.1: a quick pivot when he turns round
    this.h.position.set(p.x, p.y, p.z); this.h.rotation.set(0, this.byaw + Math.PI, 0);
    // gait: walk below 1.02 m/s (the walk clip's own stride speed, so slow = careful), above it walk and run blended at one phase
    const Lw = 1.1872, Pw = 1.1667, Lr = 3.4202, Pr = 0.5833; let wr = 0, P = Pw;
    if (sp > 0.12) { if (sp <= Lw / Pw || this.backpedal) P = Lw / sp; else { wr = clamp((Lw - sp * Pw) / (Lw - Lr + sp * (Pr - Pw)), 0, 1); P = (1 - wr) * Pw + wr * Pr; if (wr >= 1) P = Lr / sp; } }
    const moving = sp > 0.12 ? 1 : 0;
    const hasT = this.A.FX.torch.has; // carrying the torch: the plain idle (the headphones idle would hold it to his ear)
    const tw = { i: (1 - moving) * (hasT ? 0 : 1), i2: (1 - moving) * (hasT ? 1 : 0), w: moving * (1 - wr), r: moving * wr };
    const k = Math.min(1, dt * 10); let tot = 0; for (const q in tw) { this.w[q] += (tw[q] - this.w[q]) * k; tot += this.w[q]; }
    for (const q in this.w) this.w[q] /= tot || 1;
    this.phase = (this.phase + dir * dt / Math.min(P, 6) + 1) % 1;
    const A = this.act; A[WALK].time = this.phase * HUM.clips[WALK].duration; A[RUN].time = ((this.phase + 0.02) % 1) * HUM.clips[RUN].duration;
    A[IDLE].setEffectiveWeight(this.w.i); A[IDLE2].setEffectiveWeight(this.w.i2); A[WALK].setEffectiveWeight(this.w.w); A[RUN].setEffectiveWeight(this.w.r);
    rig.mixer.update(dt); this.h.updateMatrixWorld(true);
    this.gait = { speed: sp, walk: this.w.w, run: this.w.r, period: P, dir };
  }
  // ---------- the torch hand ----------
  hand(dt, p) {
    const u = this.h.userData, rig = u.rig, FX = this.A.FX, T = FX.torch, cam = this.A.camera;
    const torchOn = T.on && T.has;
    const UA = rig.bones.Bip01_R_UpperArm, FA = rig.bones.Bip01_R_Forearm, HD = rig.bones.Bip01_R_Hand, F2 = rig.bones.Bip01_R_Finger2;
    if (!UA || !FA || !HD) return;
    const busyR = FX.def && FX.def.tpPose ? FX.def.tpPose(this) : false; // v3.3.1 rod swing / shove poses (left arm, torso, both arms)
    // what the screen centre looks at (8 m out, or the first wall)
    cam.getWorldDirection(_f); _t.copy(cam.position).addScaledVector(_f, 8);
    if (torchOn && !busyR) {
      const y = this.byaw, fw = _r.set(-Math.sin(y), 0, -Math.cos(y)), rt = _c.set(Math.cos(y), 0, -Math.sin(y));
      UA.getWorldPosition(_a);
      _d.subVectors(_t, _a).normalize();
      _b.copy(_a).addScaledVector(_d, 0.43).addScaledVector(rt, 0.05); _b.y -= 0.16;
      _p.copy(_a).addScaledVector(rt, 0.32).addScaledVector(fw, -0.05); _p.y -= 0.45;
      ik2(UA, FA, HD, _b, _p);
      HD.getWorldPosition(_h); _d.subVectors(_t, _h).normalize();
      orientHand(rig, 'R', _d, _a.set(0, 1, 0)); HD.updateMatrixWorld(true);
    }
    HD.getWorldPosition(_h);
    if (F2) { F2.getWorldPosition(_a); _h.lerp(_a, 0.45); }
    const tr = this.torch;
    if (torchOn) { _d.subVectors(_t, _h).normalize(); }
    else { // carried, pointing where the fingers point
      if (F2) { F2.getWorldPosition(_a); HD.getWorldPosition(_b); _d.subVectors(_a, _b).normalize(); } else _d.set(0, -1, 0); }
    _m.lookAt(_a.set(0, 0, 0), _d, _b.set(0, 1, 0)); _q.setFromRotationMatrix(_m); // -z along _d
    tr.position.copy(_h); tr.quaternion.copy(_q); tr.updateMatrixWorld(true);
    this.lensM.emissiveIntensity = torchOn ? 2.2 * (FX.light.intensity > 3 ? 1 : 0.3) : 0;
    if (torchOn) { this.mount(); this.lightRig.position.copy(_h).addScaledVector(_d, 0.16); this.lightRig.quaternion.copy(_q); this.lightRig.updateMatrixWorld(true); }
    else this.unmount();
  }
  // ---------- camera ----------
  camera(dt, CH, p, o) {
    const cam = this.A.camera, live = this.A.G.state === 'playing' || this.A.G.state === 'card';
    if (!live && this._camSet) return; // paused / reading: hold the shot
    const yaw = p.yaw, pitch = clamp(p.pitch, -1.05, 0.9);
    const cp = Math.cos(pitch); _f.set(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp); _r.set(Math.cos(yaw), 0, -Math.sin(yaw));
    // how tight: the train, Room 0 / the waiting room, standing at something you can use, or walls close on both sides
    this.tightT -= dt; if (this.tightT <= 0) { this.tightT = 0.2; this.tightWant = this.tightness(CH, p); }
    this.tight += ((this.tightWant || 0) - this.tight) * Math.min(1, dt * 3);
    const tg = this.tight, shoulder = 0.42 - 0.2 * tg, dist = 2.35 - 1.0 * tg, hgt = 1.56;
    _h.set(p.x, p.y + hgt, p.z);
    _a.copy(_h).addScaledVector(_r, shoulder); const ts = this.clearT(CH, _h, _a); _a.lerpVectors(_h, _a, ts); // the pivot (shoulder), never inside a wall
    // v3.6: no room behind him (his back to a wall / pillar / prop / the edge): the boom swings round to the side with room, so he
    // stays in the shot instead of the lens closing in on his head
    if (!this._camSet) { this.oa = 0; this.oaT = 0; } this.oaT = (this.oaT || 0) - dt;
    if (this.oaT <= 0) { this.oaT = 0.12; _bd.copy(_f).multiplyScalar(-1); _b.copy(_a).addScaledVector(_bd, dist); const t0 = this.clearT(CH, _a, _b) * dist; let want = 0;
      if (t0 < 1.25) { let best = t0 + 0.35, cur = this.oaWant || 0; for (const ang of OA_TRY) { rotBoom(_bd, _f, ang); _b.copy(_h).addScaledVector(_bd, dist); const L2 = this.clearT(CH, _h, _b) * dist - 0.18 * Math.abs(ang) + (cur && Math.sign(cur) === Math.sign(ang) ? 0.25 : 0); if (L2 > best) { best = L2; want = ang; } } }
      this.oaWant = want; }
    this.oa = this._camFresh || !this._camSet ? (this.oaWant || 0) : (this.oa || 0) + ((this.oaWant || 0) - (this.oa || 0)) * Math.min(1, dt * 4);
    const ok = clamp(Math.abs(this.oa) / 0.6, 0, 1); _pv.lerpVectors(_a, _h, ok); rotBoom(_bd, _f, this.oa);
    _b.copy(_pv).addScaledVector(_bd, dist); _b.y += 0.1;
    const tc = this.clearT(CH, _pv, _b); let maxD = dist * tc;
    // v3.3.1: keep the line from the lens to his HEAD clear too (thin panel edges used to graze it): step the lens in until it is
    if (!this._camSet) this.losT = 0; this.losT -= dt; if (this.losT === undefined || isNaN(this.losT) || this.losT <= 0 || this._losD === undefined) { this.losT = 0.1;
      _hd.set(p.x, p.y + 1.56, p.z); let best = maxD; for (const f of [1, 0.82, 0.66, 0.5, 0.36]) { const d2 = maxD * f; _c.copy(_pv).addScaledVector(_bd, d2); _c.y += 0.1 * (d2 / dist); if (this.clearT(CH, _hd, _c) > 0.97) { best = d2; break; } best = d2; } this._losD = best / Math.max(1e-3, maxD); }
    maxD *= Math.min(1, this._losD || 1);
    if (!this._camSet) this._camFresh = true; if (maxD < this.curD || !this._camSet) this.curD = maxD; else this.curD += (maxD - this.curD) * Math.min(1, dt * 2.5);
    if (tc < 0.999) this.stats.hits++;
    _b.copy(_pv).addScaledVector(_bd, this.curD); _b.y += 0.1 * (this.curD / dist);
    // v3.6: the lens never sits in his body. When the boom is short (his back to a wall, a pillar, a prop, the platform edge) the lens
    // rises over his shoulder until it is at least CAM_HD from his head; under a low ceiling it also slides out along the shoulder.
    // It looks down at a point a few metres ahead of him (not at the floor), and the body is only hidden as a last resort (< 0.55 m).
    _h.set(p.x, p.y + 1.5, p.z);
    const fy0 = CH.floorY ? CH.floorY(_b.x, _b.z) : 0, cap0 = this.ceilAt(CH, _b.x, _b.z, p) - 0.12;
    let need = 0; { const hx = _b.x - _h.x, hz = _b.z - _h.z, hr2 = hx * hx + hz * hz, dy = _b.y - _h.y; if (hr2 + dy * dy < CAM_HD * CAM_HD) need = Math.max(0, Math.sqrt(Math.max(0, CAM_HD * CAM_HD - hr2)) - dy); }
    const liftW = live ? Math.max(clamp((0.9 - this.curD) / 0.6, 0, 1) * 0.42, need) : (this.liftY || 0);
    const ly = this.liftY || 0; this.liftY = this._camFresh ? liftW : ly + (liftW - ly) * Math.min(1, dt * (liftW > ly ? 14 : 4)); // rise fast, settle slowly
    _b.y += this.liftY; this.liftK = clamp(this.liftY / 0.42, 0, 1.6);
    // a low ceiling caps the rise: slide out along the shoulder instead (the side with room)
    let side = 0; if (_b.y > cap0) { _b.y = cap0; const hx = _b.x - _h.x, hz = _b.z - _h.z, dy = _b.y - _h.y, d = Math.sqrt(hx * hx + hz * hz + dy * dy);
      if (d < CAM_HD) { const want = Math.sqrt(Math.max(0, CAM_HD * CAM_HD - dy * dy)) - Math.hypot(hx, hz) * 0.5; if (want > 0) { for (const s of [1, -1]) { _c.copy(_b).addScaledVector(_r, s * want); const t = this.clearT(CH, _b, _c); if (t * want > Math.abs(side)) side = s * t * want; } } } }
    this.sideX = this._camFresh ? side : (this.sideX || 0) + (side - (this.sideX || 0)) * Math.min(1, dt * 8); _b.addScaledVector(_r, this.sideX);
    // height window: above the floor, under the chapter's ceiling
    const fy = CH.floorY ? CH.floorY(_b.x, _b.z) : fy0, cap = this.ceilAt(CH, _b.x, _b.z, p);
    _b.y = clamp(_b.y, Math.max(p.y, fy) + 0.35, Math.min(cap - 0.08, p.y + 2.9));
    // view: lifted, aim at a point ahead of him at chest height instead of tilting at the floor; always clamped
    let pt = pitch, vy = yaw; const lk = clamp(this.liftY / 0.5 + Math.abs(this.oa || 0) / 0.5, 0, 1); if (lk > 0.01) { const fl = Math.max(0.2, cp), ad = 3.2 * clamp(1 - Math.abs(this.oa || 0) / 2.5, 0.2, 1), fx = _h.x + _f.x / fl * ad, fz = _h.z + _f.z / fl * ad, fy2 = p.y + 1.25 + Math.sin(pitch) * 2.5;
      const aim = Math.atan2(fy2 - _b.y, Math.hypot(fx - _b.x, fz - _b.z)); pt = pitch + (aim - pitch) * lk; const ay = Math.atan2(-(fx - _b.x), -(fz - _b.z)); vy = yaw + wrap(ay - yaw) * lk; }
    pt = clamp(pt, TP_PITCH_MIN, TP_PITCH_MAX); this.camPitch = pt;
    const sh = o.shake || 0, sw = o.sway || { roll: 0, x: 0, y: 0 };
    cam.position.set(_b.x + sw.x + (Math.random() - 0.5) * sh * 0.1, _b.y + sw.y + (Math.random() - 0.5) * sh * 0.1, _b.z);
    cam.rotation.set(pt + (Math.random() - 0.5) * sh * 0.05, vy, sw.roll * 0.6, 'YXZ');
    this._camSet = true;
    // avatar: hidden only if the lens still ends up within ~0.55 m of his head (it should not, see above); the held item follows him
    const dHead = cam.position.distanceTo(_h.set(p.x, p.y + 1.45, p.z)); this.camHeadD = dHead; this.stats.minD = Math.min(this.stats.minD, dHead);
    if (this.avOn === undefined || this._camFresh) this.avOn = dHead > 0.6; else if (this.avOn && dHead < 0.55) this.avOn = false; else if (!this.avOn && dHead > 0.65) this.avOn = true; const kt = this.avOn ? 1 : 0; const k = this._camFresh ? kt : this.fadeK + (kt - this.fadeK) * Math.min(1, dt * 10); this.fadeK = k; this._camFresh = false; for (const m of this.mats) m.opacity = k; this.h.visible = k > 0.04; // v3.3.1: no lingering half-ghost: either he is there, or (lens pinned on his head) a clean first-person view
  }
  ceilAt(CH, x, z, p) {
    if (CH.id === 3) return 2.18;
    if (CH.id === 2) return (CH.floorY ? CH.floorY(x, z) : 0) + 2.55;
    // Ch1: under the platform roof; much lower inside the waiting room / Room 0; on the bridge, under its roof
    if ((x < -1.65 && z < -1.8 && z > -5.7) || (x < -1.9 && z < -33.3 && z > -37.5)) return 2.45;
    const fy = CH.floorY ? CH.floorY(x, z) : 0; if (fy > 0.5 || x > 2.6 || z < -46) return fy + 2.35;
    return 3.7;
  }
  tightness(CH, p) {
    let t = 0;
    if (CH.id === 3) t = 1; else if (CH.id === 2) t = 0.35;
    if (CH.id === 1 && ((p.x < -1.65 && p.z < -1.8 && p.z > -5.7) || (p.x < -1.9 && p.z < -33.3 && p.z > -37.5))) t = 1; // waiting room / Room 0
    if (this.A.FX.near) t = Math.max(t, 0.6); // at the payphone, the keypad, a page...
    // walls close on both sides (stairs, the bridge, between benches and a wall)
    _a.set(p.x, p.y + 1.5, p.z); const y = p.yaw; const L = this.clearT(CH, _a, _b.set(p.x - Math.cos(y) * 1.1, p.y + 1.5, p.z + Math.sin(y) * 1.1)) * 1.1, R = this.clearT(CH, _a, _c.set(p.x + Math.cos(y) * 1.1, p.y + 1.5, p.z - Math.sin(y) * 1.1)) * 1.1;
    if (L + R < 1.6) t = Math.max(t, clamp((1.6 - (L + R)) / 0.8, 0, 1));
    return t;
  }
  // free fraction of the segment a->b (0..1) for a camera with ~0.2 m of padding
  clearT(CH, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, len = Math.hypot(dx, dy, dz); if (len < 1e-4) return 1;
    let t = 1; const pad = 0.2;
    // 1. the walkable map / chapter bounds (2D), sampled every 10 cm
    const n = Math.ceil(len / 0.1);
    for (let i = 1; i <= n; i++) { const k = i / n; if (!this.allowed(CH, a.x + dx * k, a.z + dz * k)) { t = Math.min(t, (i - 1) / n); break; } }
    // 2. solids (pillars, benches, stalls, room walls): 2D slabs, padded
    const e = 0.17;
    const lowY = Math.min(a.y, b.y); // v3.3.1: a solid with a top (the train seats) only blocks a lens that dips below it
    for (const s of CH.solids) { if (s.top !== undefined && lowY > s.top + 0.14) continue; const h = slab2(a.x, a.z, dx, dz, s.x0 - e, s.x1 + e, s.z0 - e, s.z1 + e); if (h >= 0 && h < t) t = h; }
    // 3. thin panels from the chapter's meshes (walls, ceilings, glass, signs): 3D slabs
    for (const w of this.wallsFor(CH)) { if (!w.m.visible || (w.m.parent && !w.m.parent.visible)) continue;
      if (Math.abs(w.cx - a.x) > w.rx + len + 0.5 || Math.abs(w.cz - a.z) > w.rz + len + 0.5) continue;
      const h = slab3(a, dx, dy, dz, w.b); if (h >= 0 && h < t) t = h; }
    if (t < 1) t = Math.max(0, t - pad / len);
    return t;
  }
  allowed(CH, x, z) {
    if (CH.id === 1) { if (CH.walk && CH.walk(x, z)) return true; return x >= 2.2 && x <= 3.6 && z >= -46 && z <= 10.2; } // over the track edge is open air
    const B = CH.bounds; return x >= B.x0 - 0.15 && x <= B.x1 + 0.15 && z >= B.z0 - 0.15 && z <= B.z1 + 0.15;
  }
  wallsFor(CH) {
    let W = this.walls.get(CH); if (W) return W; W = [];
    CH.root.updateMatrixWorld(true);
    const skip = new Set(); const mark = (o) => o && o.traverse(x => skip.add(x));
    mark(CH.train); if (CH.fx) { mark(CH.fx.ghost); mark(CH.fx.sight); }
    CH.root.traverse(o => {
      if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || skip.has(o) || o.userData.isCone || o.userData.handProp) return;
      const m = o.material; if (!m || Array.isArray(m) || m.blending !== THREE.NormalBlending) return;
      if (m.transparent && m.opacity < 0.2) return;
      for (let q = o; q; q = q.parent) if (q.userData && (q.userData.rig || q.userData.real)) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      _box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
      const sx = _box.max.x - _box.min.x, sy = _box.max.y - _box.min.y, sz = _box.max.z - _box.min.z, d = [sx, sy, sz].sort((p, q) => p - q);
      if (d[0] > 0.3 || d[1] < 0.9) return; // thin and wide: a wall / ceiling / pane / sign
      if (sy === d[0] && _box.max.y < 0.12) return; // floors at ground level never block
      const b = _box.clone().expandByScalar(0.06);
      W.push({ m: o, b, cx: (b.min.x + b.max.x) / 2, cz: (b.min.z + b.max.z) / 2, rx: (b.max.x - b.min.x) / 2, rz: (b.max.z - b.min.z) / 2 });
    });
    this.walls.set(CH, W); return W;
  }
}
function A_SCENE(tp) { return tp.A.engine.scene; }
// ray (origin + t*dir, t in 0..1) entry into an axis-aligned box; -1 if missed or starting inside
export function slab2(x, z, dx, dz, x0, x1, z0, z1) {
  if (x > x0 && x < x1 && z > z0 && z < z1) return -1;
  let t0 = 0, t1 = 1;
  for (const [o, d, lo, hi] of [[x, dx, x0, x1], [z, dz, z0, z1]]) { if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return -1; continue; } let a = (lo - o) / d, b = (hi - o) / d; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return -1; }
  return t0;
}
export function slab3(a, dx, dy, dz, b) {
  const mn = b.min, mx = b.max; if (a.x > mn.x && a.x < mx.x && a.y > mn.y && a.y < mx.y && a.z > mn.z && a.z < mx.z) return -1;
  let t0 = 0, t1 = 1;
  const ax = [[a.x, dx, mn.x, mx.x], [a.y, dy, mn.y, mx.y], [a.z, dz, mn.z, mx.z]];
  for (const [o, d, lo, hi] of ax) { if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return -1; continue; } let p = (lo - o) / d, q = (hi - o) / d; if (p > q) [p, q] = [q, p]; t0 = Math.max(t0, p); t1 = Math.min(t1, q); if (t0 > t1) return -1; }
  return t0;
}
