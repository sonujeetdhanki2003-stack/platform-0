// PLATFORM 0 v3.7 — the dark glass door and YOUR REFLECTION (hidden anomaly #18, 'reflection_still').
// His pick (Nov 2): "Your reflection in a train window that doesn't move when you do".
// Baseline (every Chapter 1 platform): the black-painted glass door of the old retiring room, on the back wall between the second
// bench and the water cooler. Walk past it and you see yourself in it: Arjun (backpack, headphones), dim and cold, mirrored live
// (position, facing, walk / run / idle; in third person the exact pose of your body). Cheap on every tier: no render-to-texture.
// The mirrored Arjun stands behind the wall where a mirror image would be; his fragments are re-projected onto the glass plane
// (gl_FragDepth = the depth of the glass point on the same view ray) and cut to the glass rectangle, so he shows only "in" the glass,
// over the wall, and anything between you and the glass (you, in third person) still covers him.
// The anomaly: the reflection doesn't follow you. It stands at the glass, facing out, and only its head turns after you, a beat late.
import * as THREE from './three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { makeRealHuman, HUM } from './humans.js';
import * as M from './mats.js';

export const GLASS = { x: -3.468, z0: -24.96, z1: -23.80, y0: 0.14, y1: 2.04 }; // the glass pane (world), facing +x
const IDLE = 'm_headphones_idle', WALK = 'm_walk_neutral_01', RUN = 'm_run_fast_01';
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const _pq = new THREE.Quaternion(), _dq = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);

function streakTex() { // faint smears, dust and a cold highlight on the black glass (emissive, so it reads as glass on every tier)
  const c = M.canvas(128, 256), g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 128, 256);
  let s = 77; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const gr = g.createLinearGradient(0, 0, 128, 256); gr.addColorStop(0, 'rgba(60,70,80,0.0)'); gr.addColorStop(0.35, 'rgba(70,82,92,0.35)'); gr.addColorStop(0.42, 'rgba(70,82,92,0.0)'); gr.addColorStop(0.6, 'rgba(70,82,92,0.18)'); gr.addColorStop(0.66, 'rgba(70,82,92,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(90,96,100,${0.04 + r() * 0.07})`; g.lineWidth = 1 + r() * 3; g.beginPath(); const x = r() * 128, y = r() * 256; g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 40, y + 20, x + (r() - 0.5) * 30, y + 30 + r() * 50); g.stroke(); }
  g.fillStyle = 'rgba(110,110,104,0.12)'; g.fillRect(0, 226, 128, 30); // dust along the bottom
  return M.ctex(c);
}
function patchMirror(mat, U) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vRW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vRW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'varying vec3 vRW;\nuniform float uGX, uZ0, uZ1, uY0, uY1;\nuniform mat4 projectionMatrix;\n' + sh.fragmentShader.replace('void main() {', `void main() {
      vec3 dRW = vRW - cameraPosition; if (abs(dRW.x) < 1e-4) discard; float tG = (uGX - cameraPosition.x) / dRW.x; if (tG <= 0.0 || tG >= 1.0) discard;
      vec3 hG = cameraPosition + dRW * tG; if (hG.z < uZ0 || hG.z > uZ1 || hG.y < uY0 || hG.y > uY1) discard;
      vec4 cG = projectionMatrix * viewMatrix * vec4(hG, 1.0); gl_FragDepth = clamp((cG.z / cG.w) * 0.5 + 0.5 - 0.00002, 0.0, 1.0);`);
  };
  mat.customProgramCacheKey = () => 'p0mirror';
}

export class Reflection {
  constructor(ch) {
    this.ch = ch; const root = ch.root; const G = GLASS, w = G.z1 - G.z0, h = G.y1 - G.y0, zc = (G.z0 + G.z1) / 2;
    // the door: a teak frame, a brass push-plate, the pane (black paint behind glass) and a small faded sign over it
    const g = this.door = new THREE.Group(); root.add(g);
    const wood = M.std(0x2a1a10, 0.75, 0.05), brass = M.std(0x6a5428, 0.4, 0.7);
    const bx = (sx, sy, sz, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); g.add(b); return b; };
    bx(0.07, 2.2, 0.09, wood, G.x - 0.005, 1.1, G.z0 - 0.045); bx(0.07, 2.2, 0.09, wood, G.x - 0.005, 1.1, G.z1 + 0.045); // jambs
    bx(0.07, 0.1, w + 0.18, wood, G.x - 0.005, G.y1 + 0.05, zc); bx(0.07, 0.14, w + 0.18, wood, G.x - 0.005, 0.07, zc); // head, kick rail
    bx(0.07, 0.05, w, wood, G.x - 0.002, 1.05, zc); // the glazing bar
    bx(0.012, 0.32, 0.07, brass, G.x + 0.03, 1.05, G.z1 - 0.12); // push plate
    this.glassM = new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.12, metalness: 0.2, emissive: 0xffffff, emissiveMap: streakTex(), emissiveIntensity: 0.55 });
    const pane = this.pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.glassM); pane.rotation.y = Math.PI / 2; pane.position.set(G.x, (G.y0 + G.y1) / 2, zc); g.add(pane);
    { const c = M.canvas(512, 96), x = c.getContext('2d'); x.fillStyle = '#1d2a22'; x.fillRect(0, 0, 512, 96); x.fillStyle = 'rgba(214,206,180,0.78)'; x.font = '700 40px sans-serif'; x.textAlign = 'center'; x.fillText('RETIRING ROOM', 256, 44); x.font = `700 32px ${M.DEVA || 'sans-serif'}`; x.fillText('विश्रामालय', 256, 84); M.grime && M.grime(x, 512, 96, 0.5, 9);
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.24), new THREE.MeshStandardMaterial({ map: M.ctex(c), roughness: 0.9 })); sg.rotation.y = Math.PI / 2; sg.position.set(G.x + 0.01, G.y1 + 0.3, zc); g.add(sg); }
    g.traverse(o => { if (o.isMesh) { o.receiveShadow = true; o.userData.reflDoor = true; } });
    this.U = { uGX: { value: G.x }, uZ0: { value: G.z0 }, uZ1: { value: G.z1 }, uY0: { value: G.y0 }, uY1: { value: G.y1 } };
    this.h = null; this.w = { i: 1, w: 0, r: 0 }; this.spd = 0; this.byaw = 0; this.headYaw = 0; this.on = true;
  }
  build() {
    if (this.h || !HUM.on) return this.h;
    const h = this.h = makeRealHuman({ av: 'Male_Adult_02', backpack: true, headphones: true, noProps: true }, RoundedBoxGeometry);
    const u = h.userData; u.selfDrive = true; u.noLod = true; u.reflectionOf = 'player'; // not an NPC: tests that sample walkers skip it
    h.traverse(o => { if (!o.isMesh) return; o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false; const s = o.material;
      const m = new THREE.MeshBasicMaterial({ map: s.map || null, color: s.map ? 0x4a5462 : 0x262c34, transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide, alphaTest: s.alphaTest || 0, fog: false });
      patchMirror(m, this.U); o.material = m; o.renderOrder = 3; o.userData.reflection = true; });
    h.traverse(o => { o.userData.noBatch = true; o.userData.noCollide = true; });
    const rig = u.rig; rig.mixer.stopAllAction(); rig.cur = null; this.act = {};
    for (const k of [IDLE, WALK, RUN]) { const C = HUM.clips[k] || HUM.clips.m_idle_neutral_01; if (!C) continue; const a = rig.mixer.clipAction(C); a.enabled = true; a.setEffectiveWeight(k === IDLE ? 1 : 0); a.play(); this.act[k] = a; }
    if (this.act[WALK]) this.act[WALK].timeScale = 0; if (this.act[RUN]) this.act[RUN].timeScale = 0;
    this.head = rig.bones && (rig.bones.Bip01_Head || rig.bones['Bip01 Head']);
    this.ch.root.add(h); h.visible = false; return h;
  }
  reset() { this.px = null; this.frozen = null; this.headYaw = 0; if (this.h) this.h.visible = false; }
  // p: the player; G: game; still: the anomaly is on this loop
  update(dt, p, G, still) {
    if (!p || !G || this.ch.dawn) { if (this.h) this.h.visible = false; return; }
    const GL = GLASS, zc = (GL.z0 + GL.z1) / 2, near = Math.hypot(p.x - GL.x, p.z - zc) < 15 && p.x > GL.x;
    if (!near) { if (this.h) this.h.visible = false; this.px = null; return; }
    const h = this.build(); if (!h) return; const u = h.userData, rig = u.rig;
    const TP = G.TP, tpOn = TP && TP.active && TP.h && TP.h.visible;
    // ground speed + facing, like the third-person body
    if (this.px === null || this.px === undefined) { this.px = p.x; this.pz = p.z; this.byaw = p.yaw; }
    const vx = (p.x - this.px) / Math.max(dt, 1e-4), vz = (p.z - this.pz) / Math.max(dt, 1e-4); this.px = p.x; this.pz = p.z;
    let s = Math.hypot(vx, vz); if (s > 9) s = 0; this.spd += (s - this.spd) * Math.min(1, dt * 12);
    h.visible = true;
    if (still) { // ---- the anomaly: it stays at the glass, facing out at you; only the head follows, late ----
      if (!this.frozen) { this.frozen = { x: GL.x - 0.42, z: zc + 0.1 }; this.blend(1, 0, 0, 0); rig.mixer.update(0.4); h.position.set(this.frozen.x, p.y || 0, this.frozen.z); h.scale.set(1, 1, 1); h.rotation.set(0, Math.PI / 2, 0); h.updateMatrixWorld(true); this.headQ0 = this.head ? this.head.quaternion.clone() : null; this.headYaw = 0; }
      h.position.set(this.frozen.x, p.y || 0, this.frozen.z); h.scale.set(1, 1, 1); h.rotation.set(0, Math.PI / 2, 0); // facing +x, out of the glass; the body never moves
      const want = Math.max(-1.0, Math.min(1.0, wrap(Math.atan2(p.x - h.position.x, p.z - h.position.z) - Math.PI / 2)));
      this.headYaw += (want - this.headYaw) * Math.min(1, dt * 0.9); // a beat late
      if (this.head && this.headQ0) { // turn the head about the world vertical: q = parent^-1 * rotY * parent * q0
        const par = this.head.parent; par.updateWorldMatrix(true, false); par.getWorldQuaternion(_pq); _dq.setFromAxisAngle(_up, this.headYaw);
        this.head.quaternion.copy(_pq).invert().multiply(_dq).multiply(_pq).multiply(this.headQ0); }
      return;
    }
    this.frozen = null;
    // ---- the mirror image: across the glass plane x = GL.x ----
    let yaw; if (tpOn) yaw = TP.h.rotation.y; else { if (this.spd > 0.15) this.byaw = this.byaw + wrap(Math.atan2(-vx, -vz) - this.byaw) * Math.min(1, dt * 10); else this.byaw += wrap(p.yaw - this.byaw) * Math.min(1, dt * 3); yaw = this.byaw + Math.PI; }
    h.position.set(2 * GL.x - p.x, p.y || 0, p.z); h.rotation.set(0, -yaw, 0); h.scale.set(-1, 1, 1);
    if (tpOn && TP.h.userData.rig && TP.h.userData.rig.bones) { // the exact pose of your body
      const src = TP.h.userData.rig.bones, dst = rig.bones; for (const k in dst) { const a = src[k], b = dst[k]; if (a && b) { b.quaternion.copy(a.quaternion); b.position.copy(a.position); } }
    } else {
      const sp = this.spd, moving = sp > 0.15 ? 1 : 0, run = moving ? Math.max(0, Math.min(1, (sp - 2.9) / 1.0)) : 0;
      this.blend(dt, moving * (1 - run), moving * run, sp);
      rig.mixer.update(dt);
    }
  }
  blend(dt, w, r, sp) {
    const k = dt >= 1 ? 1 : Math.min(1, dt * 8); this.w.i += ((1 - w - r) - this.w.i) * k; this.w.w += (w - this.w.w) * k; this.w.r += (r - this.w.r) * k;
    const A = this.act; if (A[IDLE]) A[IDLE].setEffectiveWeight(this.w.i); if (A[WALK]) { A[WALK].setEffectiveWeight(this.w.w); A[WALK].timeScale = sp > 0.15 ? Math.max(0.5, Math.min(1.8, sp / 1.02)) : 0; }
    if (A[RUN]) { A[RUN].setEffectiveWeight(this.w.r); A[RUN].timeScale = sp > 0.15 ? Math.max(0.6, Math.min(1.5, sp / 5.86)) : 0; }
  }
  // tests: where is it, what is it doing
  info() { const h = this.h; return h ? { vis: h.visible, x: +h.position.x.toFixed(3), z: +h.position.z.toFixed(3), sx: h.scale.x, ry: +h.rotation.y.toFixed(3), frozen: !!this.frozen } : null; }
}
