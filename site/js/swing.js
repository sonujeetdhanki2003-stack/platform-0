// PLATFORM 0 v3.3.2 — THE SWING, THE HANDS, THE SHOVE, THE PICKUP HINT (visuals only: hit timing, reach, damage, cooldown and the
// weapon's 5 uses live in defend.js and are unchanged).
// A swing is one of 3 variants that alternate on repeated presses: 0 = a diagonal chop from over the shoulder, 1 = a flat backhand the
// other way, 2 = an overhead two-handed strike. Each is: anticipation (a small dip / pull back) -> wind-up with a body twist -> a fast strike
// with a smear -> the IMPACT frame at exactly the hit time (0.155 s, when defend.js registers the hit) -> follow-through -> recovery.
// On a hit the pose holds ~60 ms (hitstop), the camera kicks, sparks and a dust puff burst at the hit point; the recovery is a touch
// quicker so the swing still ends when the gameplay swing ends (0.46 s, the cooldown is untouched).
// First person: modelled hands (hands.js) grip the rod; the camera dips / rolls with the swing. Third person: hips + shoulders twist, he
// sinks into the strike with his feet planted (two-bone IK on the legs), the left hand carries the rod, both hands for the overhead.
import * as THREE from './three.module.min.js';
import { ik2 } from './humans.js';
import { FPArm, aimHand, gripAt, handAssets } from './hands.js';

export const HIT_T = 0.155, STOP = 0.06, END = 0.46;
const TK = [0, 0.04, 0.11, 0.155, 0.23, 0.30, 0.46];
const EZ = { o: (k) => 1 - (1 - k) * (1 - k), i: (k) => k * k, s: (k) => k * k * (3 - 2 * k), l: (k) => k };
const SEGE = ['o', 's', 'i', 'o', 's', 's'];
// first person: [fist x,y,z, rod euler x,y,z, camera pitch, camera roll]
const FPR = [0.26, -0.21, -0.48, -1.15, 0.1, 0.32, 0, 0];
const FPV = [
  [FPR, [0.35, -0.24, -0.45, -0.1, -0.05, -0.38, 0.012, -0.01], [0.42, -0.04, -0.4, 0.55, -0.2, -0.85, 0.026, -0.022], [0.04, -0.12, -0.6, -1.1, 0.15, 0.88, -0.03, 0.035], [-0.27, -0.3, -0.52, -1.35, 0.25, 1.55, -0.022, 0.03], [-0.2, -0.29, -0.5, -1.2, 0.2, 1.4, -0.008, 0.01], FPR],
  [FPR, [0.22, -0.22, -0.46, -0.4, 0.1, 0.5, 0.01, 0.006], [-0.1, -0.06, -0.4, 0.2, 0.35, 1.35, 0.022, 0.024], [0.1, -0.12, -0.6, -1.15, -0.1, -0.35, -0.026, -0.035], [0.44, -0.22, -0.5, -0.65, -0.3, -1.4, -0.016, -0.03], [0.4, -0.24, -0.5, -0.6, -0.22, -1.2, -0.005, -0.01], FPR],
  [FPR, [0.2, -0.26, -0.45, -0.35, 0, 0.18, 0.012, 0], [0.1, 0.12, -0.36, 0.8, 0, 0.1, 0.04, 0], [0.1, -0.12, -0.56, -1.35, 0, 0.45, -0.045, 0], [0.03, -0.33, -0.5, -2.0, 0, 0.3, -0.065, 0], [0.06, -0.3, -0.5, -1.85, 0, 0.3, -0.028, 0], FPR]];
// third person (left hand): [hand fwd,right,up from the left shoulder, rod dir fwd,right,up, torso twist, sink, lean]
const TPR = [0.22, -0.06, -0.42, 0.75, 0, -0.65, 0, 0, 0];
const TPV = [
  [TPR, [0.12, -0.1, -0.25, 0.5, -0.2, 0.2, 0.12, 0.02, -0.03], [-0.12, -0.04, 0.32, -0.55, -0.15, 0.8, 0.5, 0.04, -0.06], [0.52, 0.1, 0.0, 1, 0.3, 0.1, -0.15, 0.08, 0.12], [0.36, 0.5, -0.38, 0.5, 0.68, -0.55, -0.55, 0.07, 0.16], [0.3, 0.38, -0.42, 0.5, 0.45, -0.7, -0.42, 0.05, 0.1], TPR],
  [TPR, [0.15, 0.05, -0.3, 0.6, 0.3, -0.3, -0.12, 0.02, -0.02], [0.05, 0.45, 0.0, -0.35, 0.9, 0.25, -0.6, 0.05, -0.04], [0.55, 0.08, -0.06, 1, 0.05, 0.12, 0.05, 0.08, 0.1], [0.25, -0.42, -0.1, 0.0, -1, 0.12, 0.5, 0.07, 0.08], [0.28, -0.3, -0.25, 0.35, -0.8, -0.2, 0.38, 0.05, 0.05], TPR],
  [TPR, [0.18, 0.08, -0.3, 0.6, 0, 0.2, 0.05, 0.03, 0.02], [0.0, 0.16, 0.5, -0.65, 0, 0.75, 0.12, 0.02, -0.14], [0.5, 0.18, -0.02, 0.9, 0, -0.42, -0.04, 0.1, 0.25], [0.38, 0.18, -0.48, 0.35, 0, -0.94, -0.05, 0.13, 0.32], [0.32, 0.15, -0.45, 0.5, 0, -0.85, -0.04, 0.09, 0.2], TPR]];
// the visual clock: the gameplay time with the hitstop folded in. On a hit the pose reaches the contact frame and holds it until defend.js
// actually lands the hit (on time at 60 fps; later if the phone hitched), holds 60 ms more, then follow-through + a quicker recovery
// bring it back in step so it ends exactly when the gameplay swing ends (END). imp = gameplay time of the hit (null = not yet).
// the shove's reach curve: pull back (-0.4) -> a hard push (1) -> hold, recoil -> back to 0 (0.44 s)
export function shoveK(t) { if (t < 0) return 0; return t < 0.06 ? -0.4 * EZ.s(t / 0.06) : t < 0.13 ? -0.4 + 1.4 * EZ.i((t - 0.06) / 0.07) : t < 0.2 ? 1 - 0.1 * EZ.o((t - 0.13) / 0.07) : Math.max(0, 0.9 * (1 - EZ.s((t - 0.2) / 0.24))); }
export function visT(t, stop, imp) {
  if (t < 0) return -1; if (!stop) return t;
  if (imp != null && imp < HIT_T && t >= imp) { // the hit landed early (a hitch): snap to the contact frame on the hit itself
    if (t < imp + STOP) return HIT_T; return Math.min(END, HIT_T + (t - imp - STOP) * (END - HIT_T) / Math.max(1e-3, END - imp - STOP));
  }
  if (t < HIT_T) return t;
  const s0 = imp != null ? imp : (t < HIT_T + 0.12 ? 1e9 : HIT_T); // waiting for the hit (released if it never comes)
  const resume = s0 + STOP; if (t < resume) return HIT_T;
  const fol = 0.23 - HIT_T;
  if (resume + fol < END - 0.08) { if (t < resume + fol) return HIT_T + (t - resume); return 0.23 + (t - resume - fol) * (END - 0.23) / (END - resume - fol); }
  return Math.min(END, HIT_T + (t - resume) * (END - HIT_T) / Math.max(1e-3, END - resume));
}
function sample(V, t, out) { // Catmull-Rom through the keys, each segment on its own easing
  const n = TK.length; if (t <= 0 || t >= END) { const r = V[0]; for (let j = 0; j < out.length; j++) out[j] = r[j]; return out; }
  let i = 0; while (i < n - 2 && t >= TK[i + 1]) i++; const k = EZ[SEGE[i]](Math.min(1, (t - TK[i]) / (TK[i + 1] - TK[i])));
  const p0 = V[Math.max(0, i - 1)], p1 = V[i], p2 = V[i + 1], p3 = V[Math.min(n - 1, i + 2)], k2 = k * k, k3 = k2 * k;
  for (let j = 0; j < out.length; j++) out[j] = 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * k + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * k2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * k3);
  return out;
}
const _fp = new Array(8).fill(0), _tp = new Array(9).fill(0), _e = new THREE.Euler(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4(), _one = new THREE.Vector3(1, 1, 1);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _p = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3(), _UP = new THREE.Vector3(0, 1, 0);
const FL = [new THREE.Vector3(), new THREE.Vector3()];
// ---------- a smear: a ribbon swept by the rod, built from the pose function itself (smooth at any frame rate), additive ----------
class Smear {
  constructor(parent, n = 14) { this.n = n; const g = new THREE.BufferGeometry(); this.pos = new Float32Array(n * 2 * 3); this.col = new Float32Array(n * 2 * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3)); const idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 8; this.mesh.visible = false; parent.add(this.mesh); this.c = new THREE.Color(0xc8ccd4); }
  // fill(k, inner, outer, a): one sample per k (0 = now, n-1 = oldest)
  set(k, inner, outer, a) { const w = a, i6 = k * 6; this.pos[i6] = outer.x; this.pos[i6 + 1] = outer.y; this.pos[i6 + 2] = outer.z; this.pos[i6 + 3] = inner.x; this.pos[i6 + 4] = inner.y; this.pos[i6 + 5] = inner.z;
    this.col[i6] = this.c.r * w; this.col[i6 + 1] = this.c.g * w; this.col[i6 + 2] = this.c.b * w; this.col[i6 + 3] = this.c.r * w * 0.08; this.col[i6 + 4] = this.c.g * w * 0.08; this.col[i6 + 5] = this.c.b * w * 0.08; }
  done(on) { const g = this.mesh.geometry; g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; this.mesh.visible = on; }
  clear() { this.mesh.visible = false; }
}
// soft round texture (dust, motes, the pickup pool)
let SOFT = null, GLINT = null;
function softTex() { if (SOFT) return SOFT; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.55)'); g.addColorStop(0.7, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); SOFT = new THREE.CanvasTexture(c); return SOFT; }
function glintTex() { if (GLINT) return GLINT; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 14); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  for (const [w, l] of [[3, 30], [2, 18]]) { const gl = x.createLinearGradient(2, 0, 62, 0); gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.5, 'rgba(255,255,255,.9)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gl; x.fillRect(32 - l, 32 - w / 2, l * 2, w); x.save(); x.translate(32, 32); x.rotate(Math.PI / 2); x.fillRect(-l * 0.7, -w / 2, l * 1.4, w); x.restore(); }
  GLINT = new THREE.CanvasTexture(c); return GLINT; }
// the pickup hint's floor pool: an ellipse that fades to nothing (no edge at all)
let POOL = null;
function poolTex() { if (POOL) return POOL; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (let i = 0; i <= 10; i++) { const k = i / 10, a = Math.pow(1 - k, 2.2) * (1 - k * k * 0.2); g.addColorStop(k, `rgba(255,255,255,${a.toFixed(3)})`); } x.fillStyle = g; x.fillRect(0, 0, 128, 128); POOL = new THREE.CanvasTexture(c); return POOL; }

export class SwingFx {
  constructor(D, cam) {
    this.D = D; this.cam = cam; handAssets(); this.v = 0; this.n = 0; this.stop = false; this.kick = 0; this.pickups = [];
    // first person: the rod hand (in the weapon holder), a second hand for the overhead, the torch hand, the two shove hands
    this.armR = new FPArm(cam, 1, 'grip'); D.fpW.add(this.armR.hand); aimHand(this.armR.hand, _a.set(0, 1, 0), _b.set(0.18, 0, -1)); gripAt(this.armR.hand, _c.set(0, 0, 0));
    this.armL = new FPArm(cam, -1, 'grip'); D.fpW.add(this.armL.hand); aimHand(this.armL.hand, _a.set(0, -1, 0), _b.set(-0.25, 0, -1)); gripAt(this.armL.hand, _c.set(0, -0.105, 0), -1); this.armL.elbow.set(-0.3, -1, 0.3);
    // the torch in first person (it is the camera's spot light that lights the way; this is the thing in your hand)
    const A = handAssets(); this.torch = new THREE.Group(); cam.add(this.torch); this.torch.visible = false;
    const tm = new THREE.Mesh(A.torch, A.tool); tm.renderOrder = 3; tm.frustumCulled = false; this.torch.add(tm);
    const lens = this.lens = new THREE.Mesh(new THREE.CircleGeometry(0.021, 14), A.lensM); lens.position.z = -0.1315; lens.rotation.y = Math.PI; lens.renderOrder = 4; lens.frustumCulled = false; this.torch.add(lens);
    this.armT = new FPArm(cam, 1, 'grip'); this.torch.add(this.armT.hand); this.armT.hand.userData.side = 1;
    // the shove: two open hands (fpHands.children[0] = left, [1] = right, as before)
    this.shoveArms = [];
    for (const s of [-1, 1]) { const g = new THREE.Group(); g.userData.s = s; D.fpHands.add(g); const arm = new FPArm(cam, s, 'open'); g.add(arm.hand); aimHand(arm.hand, _a.set(-1, 0, 0), _b.set(0, 1, 0.22)); arm.hand.position.set(0, -0.05, 0); arm.elbow.set(s * 0.22, -1, 0.42); this.shoveArms.push(arm); }
    this.fpSmear = new Smear(cam, 14); this.tpSmear = null;
    // impact pools: dust puff + spark grit (created once)
    this.dust = []; this.grit = []; this.poolParent = null;
    for (let i = 0; i < 7; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: 0x8a8070, transparent: true, opacity: 0, depthWrite: false, fog: true })); s.visible = false; s.renderOrder = 7; this.dust.push({ s, t: 9, v: new THREE.Vector3() }); }
    for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); s.visible = false; s.renderOrder = 9; this.grit.push({ s, t: 9, v: new THREE.Vector3() }); }
  }
  // ---------- a swing starts (called by defend.js swing(); hit = a hit on the stranger is coming) ----------
  start(hit) { this.v = this.n % 3; this.n++; this.stop = !!hit; this.imp = null; }
  onImpact() { if (this.D.swingT >= 0 && this.imp == null) this.imp = this.D.swingT; }
  resetSeq() { this.n = 0; }
  vt() { return visT(this.D.swingT, this.stop, this.imp); }
  canTwoHands() { const T = this.D.F.torch; return !(T && T.on && T.has); }
  // ---------- first person, every frame ----------
  fp(dt, show, G) {
    const D = this.D, t = this.vt(), V = FPV[this.v];
    sample(V, t, _fp); D.fpW.position.set(_fp[0], _fp[1], _fp[2]); D.fpW.rotation.set(_fp[3], _fp[4], _fp[5]);
    this.camP = _fp[6]; this.camR = _fp[7];
    const two = show && this.v === 2 && t >= 0 && this.canTwoHands();
    this.armR.show(show); this.armL.show(two);
    // the elbow follows the fist a little (a backhand pulls the arm across)
    this.armR.elbow.set(0.35 - Math.max(0, -_fp[0]) * 0.8, -1, 0.32); this.armR.update(); if (two) this.armL.update();
    // smear: sample the pose back in time over the strike
    const on = show && t > TK[2] - 0.005 && t < 0.262;
    if (on) { const span = 0.045, n = this.fpSmear.n, life = 1 - Math.max(0, (t - 0.215) / 0.047);
      for (let k = 0; k < n; k++) { const tk = Math.max(TK[2], t - span * k / (n - 1)); sample(V, tk, _fp); _e.set(_fp[3], _fp[4], _fp[5]); _q.setFromEuler(_e); _m.compose(_p.set(_fp[0], _fp[1], _fp[2]), _q, _one);
        _a.set(0, 0.55, 0).applyMatrix4(_m); _b.set(0, 0.84, 0).applyMatrix4(_m); const age = k / (n - 1); this.fpSmear.set(k, _a, _b, 0.15 * life * (1 - age) * (1 - age)); }
      sample(V, t, _fp); } // restore
    this.fpSmear.done(on);
    D.fpTrail = this.fpSmear;
  }
  // the camera: dip / roll with the swing, a punch on the impact (first person); a much smaller nudge in third person
  camKick(cam, tp) {
    const D = this.D; let p = 0, r = 0; if (D.swingT >= 0 && D.weapon) { p = this.camP || 0; r = this.camR || 0; }
    if (this.stop && this.imp != null && D.swingT >= 0) { const k = Math.max(0, 1 - (D.swingT - this.imp) / (STOP + 0.09)); p -= 0.03 * k; }
    if (D.shoveT >= 0) { const k = D.shoveT; p += k < 0.06 ? 0.012 * (k / 0.06) : k < 0.13 ? 0.012 - 0.04 * ((k - 0.06) / 0.07) : -0.028 * Math.max(0, 1 - (k - 0.13) / 0.3); }
    if (tp) { p *= 0.25; r *= 0.25; } cam.rotation.x += p; cam.rotation.z += r;
  }
  // ---------- the torch in first person ----------
  torchFP(on, left, dt) {
    this.torch.visible = on; this.armT.show(on); if (!on) return;
    const s = left ? -1 : 1, T = this.torch, arm = this.armT; if (arm.side !== s) { arm.side = s; arm.mesh.scale.x = s; }
    const bob = this.D.A.player ? Math.sin(this.D.A.player.bob || 0) * 0.006 : 0;
    T.position.set(s * 0.25, -0.165 + bob, -0.5); _d.set(-s * 0.06, 0.07, -1).normalize(); _q.setFromUnitVectors(_a.set(0, 0, -1), _d); T.quaternion.copy(_q);
    // the hand: grip axis (thumb side) along the barrel towards the head, knuckles up
    if (s > 0) aimHand(arm.hand, _a.set(0, 0, -1), _b.set(0, 1, 0)); else aimHand(arm.hand, _a.set(0, 0, 1), _b.set(0, 1, 0));
    gripAt(arm.hand, _c.set(0, 0, 0.012), s); arm.elbow.set(s * 0.3, -1, 0.22); arm.update();
    const L = this.D.F.light; this.lens.material.opacity = L && L.intensity > 0.5 ? 0.95 : 0.1;
  }
  // ---------- the shove in first person ----------
  shoveFP(show) {
    const D = this.D, t = D.shoveT; for (const a of this.shoveArms) a.show(show); if (!show) return;
    // anticipation (pull back, down) -> a hard push -> recoil -> drop away
    let z, y, sp, tilt;
    if (t < 0.06) { const k = EZ.s(t / 0.06); z = -0.34 + 0.06 * k; y = -0.5 + 0.04 * k; sp = 0.2; tilt = 0.25; }
    else if (t < 0.13) { const k = EZ.i((t - 0.06) / 0.07); z = -0.28 - 0.37 * k; y = -0.46 + 0.24 * k; sp = 0.2 - 0.07 * k; tilt = 0.25 - 0.3 * k; }
    else if (t < 0.2) { const k = EZ.o((t - 0.13) / 0.07); z = -0.65 + 0.07 * k; y = -0.22 - 0.02 * k; sp = 0.13; tilt = -0.05 + 0.08 * k; }
    else { const k = EZ.s((t - 0.2) / 0.24); z = -0.58 + 0.26 * k; y = -0.24 - 0.5 * k; sp = 0.13 + 0.06 * k; tilt = 0.03 + 0.3 * k; }
    for (const g of D.fpHands.children) { const s = g.userData.s; g.position.set(s * sp, y, z); g.rotation.set(tilt, -s * 0.12, s * 0.06); }
    for (const a of this.shoveArms) a.update();
  }
  // ---------- third person: called from defend.tpPose after his animation ----------
  tpBody(tp, B, sw, sh) {
    const y = tp.byaw; _f.set(-Math.sin(y), 0, -Math.cos(y)); _r.set(Math.cos(y), 0, -Math.sin(y));
    let tw = 0, sink = 0, lean = 0, push = 0;
    if (sw) { sample(TPV[this.v], this.vt(), _tp); tw = _tp[6]; sink = _tp[7]; lean = _tp[8]; }
    if (sh) { const k = shoveK(this.D.shoveT); lean += 0.3 * k; sink += 0.06 * Math.abs(k); push = 0.1 * k; }
    const PV = B.Bip01_Pelvis, S1 = B.Bip01_Spine1 || B.Bip01_Spine, S2 = B.Bip01_Spine2 || S1, HD = B.Bip01_Head, NK = B.Bip01_Neck;
    if (!PV) return;
    if (this._prB !== PV) { this._prB = PV; this._pr = PV.position.clone(); }
    PV.position.copy(this._pr); PV.updateMatrixWorld(true);
    if (!tw && !sink && !lean) return;
    const legs = [['L', FL[0]], ['R', FL[1]]];
    for (const [s, v] of legs) { const ft = B['Bip01_' + s + '_Foot']; ft && ft.getWorldPosition(v); }
    // hips: sink, shift into the push, a share of the twist; legs stay planted
    PV.getWorldPosition(_a); _a.y -= sink; _a.addScaledVector(_f, push); PV.parent.worldToLocal(_a); PV.position.copy(_a); PV.updateMatrixWorld(true);
    if (tw) rotW(PV, _q.setFromAxisAngle(_UP, tw * 0.35));
    if (S1 && tw) rotW(S1, _q.setFromAxisAngle(_UP, tw * 0.25)); if (S2 && tw) rotW(S2, _q.setFromAxisAngle(_UP, tw * 0.4));
    if (S1 && lean) rotW(S1, _q.setFromAxisAngle(_r, -lean * 0.55)); if (S2 && lean) rotW(S2, _q.setFromAxisAngle(_r, -lean * 0.45));
    if (NK && (tw || lean)) rotW(NK, _q2.setFromAxisAngle(_UP, -tw * 0.55)); // the head stays on what he swings at
    if (HD && lean) rotW(HD, _q.setFromAxisAngle(_r, lean * 0.6));
    for (const [s, v] of legs) { const th = B['Bip01_' + s + '_Thigh'], ca = B['Bip01_' + s + '_Calf'], ft = B['Bip01_' + s + '_Foot']; if (!th || !ca || !ft) continue;
      ft.getWorldQuaternion(_q2); ca.getWorldPosition(_b); th.getWorldPosition(_c); _d.copy(_b).sub(_c).multiplyScalar(2).add(_c).addScaledVector(_f, 0.4); ik2(th, ca, ft, v, _d);
      // keep the foot's own angle (planted, not swivelled by the hip twist)
      ft.getWorldQuaternion(_q); rotW(ft, _q.invert().premultiply(_q2)); }
  }
  // the rod hand target, the rod direction (world), and for the overhead the right hand's target; returns false if not swinging
  tpRod(tp, S, outHand, outDir) {
    const y = tp.byaw; _f.set(-Math.sin(y), 0, -Math.cos(y)); _r.set(Math.cos(y), 0, -Math.sin(y));
    sample(TPV[this.v], this.vt(), _tp);
    outHand.copy(S).addScaledVector(_f, _tp[0]).addScaledVector(_r, _tp[1]); outHand.y += _tp[2];
    outDir.set(0, 0, 0).addScaledVector(_f, _tp[3]).addScaledVector(_r, _tp[4]); outDir.y += _tp[5]; outDir.normalize();
  }
  tpSmearUpdate(tp, S, parent) {
    if (!this.tpSmear || this.tpSmear.mesh.parent !== parent) { if (this.tpSmear) this.tpSmear.mesh.parent && this.tpSmear.mesh.parent.remove(this.tpSmear.mesh); this.tpSmear = new Smear(parent, 14); this.tpSmear.c.set(0xcfc8ba); }
    const t = this.vt(), on = this.D.swingT >= 0 && t > TK[2] - 0.005 && t < 0.262; if (!on) { this.tpSmear.clear(); return this.tpSmear; }
    const y = tp.byaw; _f.set(-Math.sin(y), 0, -Math.cos(y)); _r.set(Math.cos(y), 0, -Math.sin(y)); const n = this.tpSmear.n, life = 1 - Math.max(0, (t - 0.215) / 0.047), V = TPV[this.v];
    for (let k = 0; k < n; k++) { const tk = Math.max(TK[2], t - 0.055 * k / (n - 1)); sample(V, tk, _tp);
      _p.copy(S).addScaledVector(_f, _tp[0]).addScaledVector(_r, _tp[1]); _p.y += _tp[2]; _d.set(0, 0, 0).addScaledVector(_f, _tp[3]).addScaledVector(_r, _tp[4]); _d.y += _tp[5]; _d.normalize();
      _a.copy(_p).addScaledVector(_d, 0.5); _b.copy(_p).addScaledVector(_d, 0.86); const age = k / (n - 1); this.tpSmear.set(k, _a, _b, 0.24 * life * (1 - age) * (1 - age)); }
    this.tpSmear.done(true); return this.tpSmear;
  }
  // curl Arjun's fingers round the grip (absolute from the bind pose; the walk clip does not drive the fingers)
  tpFist(rig, s, on) {
    const key = 'fist' + s; if (!on) { if (this[key]) { for (const k in rig.bindQ) if (k.startsWith('Bip01_' + s + '_Finger')) rig.bones[k].quaternion.copy(rig.bindQ[k]); this[key] = false; } return; }
    this[key] = true; for (const k in rig.bindQ) { if (!k.startsWith('Bip01_' + s + '_Finger')) continue; const thumb = /Finger0/.test(k), seg = k.length - k.lastIndexOf('Finger') - 7; // 0 base, 1, 2
      const a = thumb ? [0.35, 0.5, 0.4][seg] : [1.15, 1.35, 0.9][seg]; rig.bones[k].quaternion.copy(rig.bindQ[k]).multiply(_q.setFromAxisAngle(FAX, -a)); }
  }
  // ---------- impact: dust puff + sparks at the hit point ----------
  burst(pos, parent, toward) {
    if (this.poolParent !== parent) { for (const d of this.dust) parent.add(d.s); for (const g of this.grit) parent.add(g.s); this.poolParent = parent; }
    for (const d of this.dust) { d.t = 0; d.s.position.copy(pos).add(_a.set((Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.25)); d.v.set((Math.random() - 0.5) * 0.7, 0.15 + Math.random() * 0.35, (Math.random() - 0.5) * 0.7).addScaledVector(toward, 0.4); d.s.visible = true; d.life = 0.5 + Math.random() * 0.3; d.s0 = 0.14 + Math.random() * 0.1; }
    for (const g of this.grit) { g.t = 0; g.s.position.copy(pos); g.v.set((Math.random() - 0.5) * 3.2, 0.6 + Math.random() * 2.2, (Math.random() - 0.5) * 3.2).addScaledVector(toward, 1.4); g.s.visible = true; g.life = 0.22 + Math.random() * 0.2; }
  }
  tick(dt) {
    for (const d of this.dust) { if (d.t >= 9) continue; d.t += dt; const k = d.t / d.life; if (k >= 1) { d.s.visible = false; d.t = 9; continue; } d.s.position.addScaledVector(d.v, dt); d.v.multiplyScalar(Math.pow(0.15, dt)); d.s.scale.setScalar(d.s0 * (1 + 2.2 * k)); d.s.material.opacity = 0.35 * (1 - k) * Math.min(1, k * 6); }
    for (const g of this.grit) { if (g.t >= 9) continue; g.t += dt; const k = g.t / g.life; if (k >= 1) { g.s.visible = false; g.t = 9; continue; } g.v.y -= 6 * dt; g.s.position.addScaledVector(g.v, dt); g.s.scale.setScalar(0.035 * (1 - k * 0.6)); g.s.material.opacity = 1 - k; }
  }
  // ---------- the pickup hint (replaces the old "sheet of paper"): a soft pool of light, a glint running along the rod, a few motes ----------
  pickupHint(holder, kind) {
    const len = kind === 'umbrella' ? 0.82 : 0.95;
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(0.8, len + 0.55), new THREE.MeshBasicMaterial({ map: poolTex(), color: 0xffc98a, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: true }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = 0.004 - 0.025; pool.renderOrder = 6; pool.userData.noBatch = 1; holder.add(pool);
    const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex(), color: 0xfff0d8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: true })); glint.scale.setScalar(0.17); glint.renderOrder = 6; holder.add(glint);
    const N = 6, mp = new Float32Array(N * 3), mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
    const motes = new THREE.Points(mg, new THREE.PointsMaterial({ map: softTex(), color: 0xffe4b8, size: 0.026, sizeAttenuation: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: true })); motes.frustumCulled = false; motes.renderOrder = 6; holder.add(motes);
    const seeds = []; for (let i = 0; i < N; i++) seeds.push([Math.random() * 10, (Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * len * 0.8, 0.5 + Math.random() * 0.5]);
    const h = { holder, pool, glint, motes, mp, seeds, len, ph: Math.random() * 6 }; holder.userData.hint = h; return h;
  }
  tickPickup(h, now) {
    const t = now / 1000 + h.ph;
    h.pool.material.opacity = 0.3 + 0.14 * (0.5 + 0.5 * Math.sin(t * 2.2));
    const per = 2.6, k = (t % per) / per, run = Math.min(1, k / 0.45); // the glint runs tip to tip, then rests
    h.glint.position.set(0, 0.03, (run - 0.5) * h.len); h.glint.material.opacity = k < 0.45 ? Math.sin(run * Math.PI) * 0.9 : 0; h.glint.material.rotation = t * 0.8;
    for (let i = 0; i < h.seeds.length; i++) { const s = h.seeds[i], u = ((t * 0.12 * s[3] + s[0]) % 1); h.mp[i * 3] = s[1] + Math.sin(t * 0.7 + s[0]) * 0.04; h.mp[i * 3 + 1] = 0.02 + u * 0.7; h.mp[i * 3 + 2] = s[2]; }
    h.motes.geometry.attributes.position.needsUpdate = true; h.motes.material.opacity = 0.5;
  }
}
const FAX = new THREE.Vector3(0, 0, 1);
const _qw = new THREE.Quaternion(), _qw2 = new THREE.Quaternion();
function rotW(bone, q) { bone.parent.getWorldQuaternion(_qw); _qw2.copy(_qw).invert().multiply(q).multiply(_qw); bone.quaternion.premultiply(_qw2); bone.updateMatrixWorld(true); }
