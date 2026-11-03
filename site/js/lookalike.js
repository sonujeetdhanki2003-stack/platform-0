// PLATFORM 0 v3.3 — THE LOOKALIKE ("the one who kept walking"): a man in Arjun's exact clothes, face in shadow, at the far end of
// the platform / corridor / coach. He mirrors you (you walk, he walks; you stop, he stops; always facing you). After 10–20 s, or
// if you walk at him, he SNAPS: a glitchy jerk, a sting, then he sprints at you (faster than walking, slower than running).
// Catch = -35 HP (classic mode: back to 0). The torch flare blinds him: he staggers, shrieks and dissolves. Escape (far away /
// out of sight for a few seconds / the next loop) and he is gone. At most one per loop, never in the same loop as Maa's ghost.
import * as THREE from './three.module.min.js';
import { makeHuman, animateWalk, stillPose } from './props.js';
import { clearAt, pushOut } from './npc.js';
const rnd = (a, b) => a + Math.random() * (b - a);
const _hv = new THREE.Vector3(), _white = new THREE.Color(0xffffff);
const CH_X = (CH, x) => CH.id === 1 ? Math.max(-1.6, Math.min(1.6, x)) : x;
export const LOOK = { chase: 3.4, catchD: 0.85, snapNear: 6.5, minLoops: 3 };
export class Lookalike {
  constructor(F) { this.F = F; this.h = null; this.state = 'off'; this.log = []; this.runCount = 0; }
  get G() { return this.F.G; } get A() { return this.F.A; } get S() { return this.F.S; }
  build() {
    if (this.h) return this.h;
    const h = this.h = makeHuman({ shirt: 0xe2e0d6, pants: 0x30323a, backpack: true, headphones: true, skin: 0x7a4e33, idle: 'm_idle_breathe_01' }); // v3.3.1: a stiff stand, not the headphones idle (its raised hand read as a friendly wave)
    const u = h.userData; u.noLod = true; this.mats = [];
    // darker, colder than Arjun; he catches the light badly
    h.traverse(o => { if (!o.isMesh) return; o.castShadow = true; o.frustumCulled = false; const s = o.material;
      /* unlit: the light never quite reaches him; a near-black copy of you with only a ghost of your clothes */
      const m = new THREE.MeshBasicMaterial({ map: s.map || null, color: s.map ? 0x16161c : 0x0b0b0e, transparent: true, opacity: 1, side: s.side, alphaTest: s.alphaTest || 0 }); o.material = m; this.mats.push(m); });
    // the face: a shadow over it, and a too-wide grin that only shows in torchlight
    const head = u.rig && u.rig.bones && (u.rig.bones.Bip01_Head || u.rig.bones['Bip01 Head']);
    const mkTex = (draw) => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); draw(x); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
    const shade = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.3), new THREE.MeshBasicMaterial({ map: mkTex(x => { const g = x.createRadialGradient(64, 60, 8, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.62, 'rgba(0,0,0,.97)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false, fog: true }));
    const grin = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshBasicMaterial({ map: mkTex(x => { x.fillStyle = '#000'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#e8e2cf'; x.lineWidth = 5; x.beginPath(); x.moveTo(6, 40); x.quadraticCurveTo(64, 120, 122, 40); x.stroke(); for (let i = 0; i < 12; i++) { const t = (i + 0.5) / 12, px = 6 + 116 * t, py = 40 + 4 * 80 * t * (1 - t) * 0.92; x.fillStyle = '#d9d2bb'; x.fillRect(px - 3, py - 13, 6, 12); } x.fillStyle = '#e8e2cf'; x.beginPath(); x.arc(38, 16, 5, 0, 7); x.arc(90, 16, 5, 0, 7); x.fill(); }), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    h.add(shade); h.add(grin); shade.position.set(0, 1.62, 0.13); grin.position.set(0, 1.58, 0.14); shade.renderOrder = 4; grin.renderOrder = 5; // placed on his face every frame (placeFace)
    u.stopMotion = 0.085; // he moves in small wrong jerks
    // v3.3.1: unmistakably wrong at any distance: a MIRROR image of you (x flipped: the backpack hangs off the wrong shoulder), too tall and too
    // thin; two pale pin-prick eyes that never blink in the void where his face should be, and a grin that is always faintly there
    this.baseScale = [-0.9, 1.075, 0.9];
    const eyeM = new THREE.MeshBasicMaterial({ color: 0xf4f0e0, transparent: true, opacity: 0.95, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
    const eyes = new THREE.Group(); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CircleGeometry(0.0085, 10), eyeM); e.position.set(s * 0.034, 0, 0); eyes.add(e); const g = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), new THREE.MeshBasicMaterial({ color: 0xbfc8d8, transparent: true, opacity: 0.16, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); g.position.set(s * 0.034, 0, -0.001); eyes.add(g); }
    h.add(eyes); eyes.renderOrder = 6; this.eyes = eyes; this.eyeM = eyeM;
    // position on the head bone: find the face direction from the rig in world space once posed
    this.shade = shade; this.grin = grin; this.headBone = head;
    h.visible = false;
    return h;
  }
  placeFace() { // the void over his face + the grin, on the head bone's position, facing out of his front (+z of his group)
    if (!this.headBone || !this.h) return; const h = this.h; h.updateMatrixWorld(true); const hp = this.headBone.getWorldPosition(_hv); h.worldToLocal(hp);
    this.shade.position.set(hp.x, hp.y + 0.075, hp.z + 0.13); this.grin.position.set(hp.x, hp.y + 0.02, hp.z + 0.14); this.shade.rotation.set(0, 0, 0); this.grin.rotation.set(0, 0, 0);
    if (this.eyes) { this.eyes.position.set(hp.x, hp.y + 0.1, hp.z + 0.142); this.eyes.rotation.set(0, 0, 0); } }
  staticFx(d) { // v3.3.1: faint TV static creeps into the picture the closer he is (only while he is on screen)
    if (!this.eyes) return; if (!this.$static) { const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'), im = x.createImageData(96, 96);
        for (let i = 0; i < im.data.length; i += 4) { const v = (Math.random() * 255) | 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0);
        const e = this.$static = document.createElement('div'); e.id = 'lkStatic'; e.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2;opacity:0;mix-blend-mode:overlay;background-image:url(' + c.toDataURL() + ');background-size:96px 96px;transition:opacity .25s'; document.body.appendChild(e); }
    const on = this.h.visible && this.state !== 'off' && this.state !== 'gone' && this.state !== 'armed' && this.F.facing && this.F.facing(this.h.position, this.A.player) > 0.25;
    const k = on ? Math.max(0, Math.min(1, (14 - d) / 11)) : 0; const o = (k * 0.26).toFixed(2); if (this.$static.style.opacity !== o) this.$static.style.opacity = o;
    if (k > 0) this.$static.style.backgroundPosition = ((Math.random() * 96) | 0) + 'px ' + ((Math.random() * 96) | 0) + 'px'; }
  knockStep(dt) { const h = this.h, CH = this.CH; if (this.kn && this.kn.left > 0) { const st = Math.min(this.kn.left, this.kn.v * dt), nx = h.position.x + this.kn.dx * st, nz = h.position.z + this.kn.dz * st; if (clearAt(CH, nx, nz, 0.28)) { h.position.x = nx; h.position.z = nz; this.kn.left -= st; } else this.kn.left = 0; } }
  hitFx(dt) { // v3.3.1 hit feedback on his body: a pale flash and a recoil lean that settles
    const h = this.h; if (!h) return; const f = this.hitT ? Math.max(0, 1 - (performance.now() - this.hitT) / 200) : 0;
    if (f > 0 || this.flashOn) { this.flashOn = f > 0; for (const m of this.mats || []) { if (!m.userData.c0) m.userData.c0 = m.color.clone(); m.color.copy(m.userData.c0).lerp(_white, f * 0.75); } }
    this.recoil = (this.recoil || 0) * Math.pow(0.02, dt); h.rotation.order = 'YXZ'; h.rotation.x = -0.26 * Math.sin(Math.min(1, this.recoil) * Math.PI * 0.5) * (this.recoil > 0.01 ? 1 : 0); }
  twitch(dt) { // v3.3.1: a small wrong jerk of the head every second or two
    this.twT = (this.twT || 0) - dt; if (this.twT <= 0) { this.twT = rnd(0.9, 2.2); this.twA = rnd(-0.35, 0.35); } this.twA = (this.twA || 0) * Math.pow(0.004, dt); return this.twA; }
  resetRun() { this.runCount = 0; this.warned = false; this.off(); }
  off() { this.state = 'off'; if (this.h) { this.h.visible = false; for (const m of this.mats || []) m.opacity = 1; const b = this.baseScale || [1, 1, 1]; this.h.scale.set(b[0], b[1], b[2]); } if (this.$static) this.$static.style.opacity = '0'; }
  // per loop: decide whether he is here tonight
  onLoop(CH, progress, o) {
    this.off(); this.CH = CH; const G = this.G;
    const minP = CH.id === 1 ? 3 : 2;
    const want = o.force || (!o.exit && !o.ghostOn && !o.hide && !o.trainAnom && !o.blackout && progress >= minP && G.loops >= LOOK.minLoops && o.roll(0.2));
    if (!want) return;
    if (!this.build()) return;
    if (this.h.parent !== CH.root) CH.root.add(this.h);
    this.state = 'armed'; this.hits = 0; this.stagUntil = 0; this.t = 0; this.cueT = 0; this.cueSteps = 0; this.mirrorT = rnd(10, 20); this.towardT = 0; this.lostT = 0; this.stepAcc = 0;
    this.runCount++; this.log.push({ loop: G.loops, ch: CH.id, progress });
  }
  spot(p) { // the far end of where you're heading: 14–19 m ahead (all chapters run towards -z), clear floor, not inside anything
    const CH = this.CH;
    for (const dz of [17, 15.5, 19, 14, 12.5]) for (const dx of [0, -0.8, 0.8, -1.5, 1.5]) { const x = (CH.id === 1 ? -0.4 : 0) + dx, z = p.z - dz; if (clearAt(CH, x, z, 0.3) && (!CH.walk || CH.walk(x, z)) && !(CH.isForward && CH.isForward({ x, z, y: 0 }))) return { x, z }; }
    return null;
  }
  update(dt, p) {
    if (this.state === 'off' || !this.h) return;
    const G = this.G, h = this.h, u = h.userData, S = this.S, CH = this.CH; this.t += dt;
    if (this.state === 'armed') { // footsteps echoing yours before he is there
      const moved = this.px === undefined ? 0 : Math.hypot(p.x - this.px, p.z - this.pz); this.px = p.x; this.pz = p.z; this.cueAcc = (this.cueAcc || 0) + moved;
      if (this.cueAcc > 0.8) { this.cueAcc = 0; this.cueSteps++; setTimeout(() => S && S.step && S.step(0.35, 0, CH.surface), 240); }
      if (this.cueSteps >= 3 || this.t > 6) { const s = this.spot(p); if (!s) { this.off(); return; }
        h.position.set(s.x, CH.floorY ? CH.floorY(s.x, s.z) : 0, s.z); h.rotation.y = Math.atan2(p.x - s.x, p.z - s.z); h.visible = true; stillPose(h); this.placeFace();
        this.state = 'mirror'; this.t = 0; this.px = p.x; this.pz = p.z; this.mdx = this.mdz = 0; this.mYaw = undefined;
        if (!this.warned) { this.warned = true; setTimeout(() => { if (this.state === 'mirror' && G.state === 'playing') { const ok = S && S.playClip && S.playClip('w_dont_look', { gain: 0.9, pan: -0.4 }); if (!ok && S && S.whisper) S.whisper(1.2, -0.4, 0.2); this.A.showSub('"…don\'t look at it… keep walking…"', 2800, true); } }, 900); }
        this.log[this.log.length - 1].appeared = performance.now(); }
      return;
    }
    this.placeFace();
    const dx = p.x - h.position.x, dz = p.z - h.position.z, d = Math.hypot(dx, dz) || 1e-3;
    this.hitFx(dt);
    if (performance.now() < this.stagUntil && this.state !== 'blind') { // staggered by a hit / a shove: reeling, glitching
      this.knockStep(dt);
      u.head.rotation.set(rnd(-0.5, 0.2), rnd(-0.7, 0.7), rnd(-0.6, 0.6)); stillPose(h); h.position.y = (CH.floorY ? CH.floorY(h.position.x, h.position.z) : 0) + (Math.random() < 0.2 ? 0.04 : 0); return; }
    if (this.state === 'search' || this.state === 'drag') { // you hid: he walks to where he lost you (drag: straight to you)
      const tg = this.goal, gx = tg.x - h.position.x, gz = tg.z - h.position.z, gd = Math.hypot(gx, gz) || 1e-3, sp = this.state === 'drag' ? LOOK.chase : 1.3;
      if (gd > 0.15) { const st = Math.min(gd, sp * dt); let tx = h.position.x + gx / gd * st, tz = h.position.z + gz / gd * st; [tx, tz] = pushOut(CH, tx, tz, 0.28); h.position.x = tx; h.position.z = tz; h.rotation.y = Math.atan2(gx, gz); animateWalk(h, dt, sp, 1); this.stepAcc += st; if (this.stepAcc > 0.9) { this.stepAcc = 0; S && S.step && S.step(0.45, this.pan(h), CH.surface); } }
      if (CH.floorY) h.position.y = CH.floorY(h.position.x, h.position.z);
      u.head.rotation.set(0.1, Math.sin(this.t * 1.7) * 0.6, -0.25);
      if (this.state === 'drag' && (gd < 0.9 || this.t > 8)) { this.F.def && this.F.def.leave(); this.grab(); return; }
      if (this.state === 'search' && (gd <= 0.15 || this.t > 9)) { this.state = 'blind'; this.t = 0; this.quiet = true; }
      return; }
    const beam = this.F.torch.on ? this.F.inBeam(this.headBone || h) : 0; this.grin.material.opacity = Math.min(1, (this.eyes ? 0.38 : 0) + beam * 1.2 + (d < 5 ? (5 - d) * 0.06 : 0)) * (this.state === 'gone' ? 0 : 0.9); this.staticFx(d);
    if (this.state === 'mirror') {
      // your move, reflected across the plane between you: walk at him and he walks at you; step aside and he steps the same way.
      // v3.3.1: he no longer slides at your full speed with a forward walk cycle (the "moonwalk"). The reflected move is banked and he
      // follows it at a man's pace: towards you = a walk, facing you; away from you = a slow deliberate back-step, still facing you
      // (the walk played in reverse at a matching stride, so the feet never skate); sideways = his body turns the way he steps while
      // his head stays locked on you.
      const mx = p.x - this.px, mz = p.z - this.pz; this.px = p.x; this.pz = p.z; const nx = -dx / d, nz = -dz / d; // n: from you towards him
      const dn = mx * nx + mz * nz; let ex = mx - 2 * dn * nx, ez = mz - 2 * dn * nz;
      if (Math.hypot(ex, ez) < 1) { this.mdx = (this.mdx || 0) + ex; this.mdz = (this.mdz || 0) + ez; }
      if (Math.hypot(mx, mz) < 1e-4) { const k = Math.pow(0.0005, dt); this.mdx *= k; this.mdz *= k; } // you stop, he stops (what is left of your move fades in ~0.3 s)
      let bl = Math.hypot(this.mdx || 0, this.mdz || 0); if (bl > 0.8) { this.mdx *= 0.8 / bl; this.mdz *= 0.8 / bl; bl = 0.8; }
      const fx = dx / d, fz = dz / d; // his facing: at you
      let mode = 'still', sp = 0;
      if (bl > 0.02) { const ux = this.mdx / bl, uz = this.mdz / bl, c = ux * fx + uz * fz;
        mode = c > 0.64 ? 'fwd' : c < -0.64 ? 'back' : 'side'; const cap = mode === 'fwd' ? 2.6 : mode === 'back' ? 1.05 : 1.35;
        const st = Math.min(bl, cap * dt), ox = h.position.x, oz = h.position.z; let tx = ox + ux * st, tz = oz + uz * st; [tx, tz] = pushOut(CH, tx, tz, 0.28);
        if (clearAt(CH, tx, tz, 0.28) && (!CH.walk || CH.walk(tx, tz))) { h.position.x = tx; h.position.z = tz; this.mdx -= ux * st; this.mdz -= uz * st; sp = Math.hypot(tx - ox, tz - oz) / Math.max(dt, 1e-4); }
        else { this.mdx = this.mdz = 0; mode = 'still'; }
        if (sp < 0.15) mode = 'still';
        else { const ax = (tx - ox), az = (tz - oz), al = Math.hypot(ax, az) || 1; const ca = (ax * fx + az * fz) / al; mode = ca < -0.3 ? 'back' : (mode === 'back' ? 'side' : mode); // what he actually did (a wall can turn a step)
          this.mBody = mode === 'back' ? Math.atan2(-ax, -az) : Math.atan2(ax, az); } } // body square to the step (back-step: back first), head on you
      const want = mode === 'still' ? Math.atan2(dx, dz) : this.mBody; const cur = this.mYaw === undefined ? want : this.mYaw;
      this.mYaw = cur + Math.atan2(Math.sin(want - cur), Math.cos(want - cur)) * Math.min(1, dt * 14); h.rotation.y = this.mYaw;
      this.mirrorMode = mode;
      if (mode !== 'still') { animateWalk(h, dt, sp, mode === 'back' ? -1 : 1); this.stepAcc += sp * dt; if (this.stepAcc > 0.8) { this.stepAcc = 0; S && S.step && S.step(0.3, this.pan(h), CH.surface); } } else stillPose(h);
      if (CH.floorY) h.position.y = CH.floorY(h.position.x, h.position.z);
      // the head: tilted, too still, and always on you (when his body turns to side-step, his head does not)
      const hy = Math.max(-1.25, Math.min(1.25, Math.atan2(Math.sin(Math.atan2(dx, dz) - this.mYaw), Math.cos(Math.atan2(dx, dz) - this.mYaw))));
      u.head.rotation.set(0.12, hy, -0.32 + Math.sin(this.t * 0.7) * 0.04 + this.twitch(dt));
      this.towardT = dn > 0.004 ? this.towardT + dt : Math.max(0, this.towardT - dt * 0.5);
      if (!this.noSnap && (this.t > this.mirrorT || d < LOOK.snapNear || this.towardT > 1.6)) this.snap();
      return;
    }
    if (this.state === 'snap') {
      u.head.rotation.set(rnd(-0.5, 0.5), rnd(-0.8, 0.8), rnd(-0.6, 0.6)); h.position.y = (CH.floorY ? CH.floorY(h.position.x, h.position.z) : 0) + (Math.random() < 0.3 ? rnd(-0.05, 0.08) : 0);
      h.visible = Math.random() > 0.25; if (this.t > 0.65) { h.visible = true; this.state = 'chase'; this.t = 0; }
      return;
    }
    if (this.state === 'chase') {
      const step = Math.min(d - 0.5, LOOK.chase * dt);
      if (step > 0) { let tx = h.position.x + dx / d * step, tz = h.position.z + dz / d * step; [tx, tz] = pushOut(CH, tx, tz, 0.28);
        if (!clearAt(CH, tx, tz, 0.28)) { if (clearAt(CH, h.position.x + dx / d * step, h.position.z, 0.28)) { tx = h.position.x + dx / d * step; tz = h.position.z; } else if (clearAt(CH, h.position.x, h.position.z + dz / d * step, 0.28)) { tx = h.position.x; tz = h.position.z + dz / d * step; } else { tx = h.position.x; tz = h.position.z; } }
        h.position.x = tx; h.position.z = tz; }
      if (CH.floorY) h.position.y = CH.floorY(h.position.x, h.position.z);
      h.rotation.y = Math.atan2(dx, dz); animateWalk(h, dt, LOOK.chase, 1); u.head.rotation.set(0.25, 0, -0.2 + rnd(-0.08, 0.08));
      this.stepAcc += LOOK.chase * dt; if (this.stepAcc > 1.0) { this.stepAcc = 0; S && S.step && S.step(0.9, this.pan(h), CH.surface); }
      // escape: far away, or out of sight long enough
      const sees = this.F.losClear(new THREE.Vector3(h.position.x, 1.5 + h.position.y, h.position.z), new THREE.Vector3(p.x, (p.y || 0) + 1.4, p.z), h, 0.2);
      this.lostT = sees ? 0 : this.lostT + dt;
      if (d > 22 || this.lostT > 3) { this.vanish('escaped'); return; }
      if (d < LOOK.catchD && !(this.A.invuln && this.A.invuln()) && !(this.F.def && this.F.def.pendingHit === this)) this.grab(); // v3.3.1: a swing already landing on him wins the race
      return;
    }
    if (this.state === 'blind') { // staggers back, shrieks, dissolves
      const k = this.t / 1.1; h.position.x -= dx / d * dt * 0.8; h.position.z -= dz / d * dt * 0.8; u.head.rotation.set(-0.4 + rnd(-0.3, 0.3), rnd(-0.9, 0.9), rnd(-0.7, 0.7));
      for (const m of this.mats) m.opacity = Math.max(0, 1 - k); { const b = this.baseScale || [1, 1, 1]; h.scale.set(b[0] * (1 + rnd(-0.06, 0.06) * k), b[1] * (1 - 0.15 * k), b[2] * (1 + rnd(-0.06, 0.06) * k)); } if (this.eyeM) this.eyeM.opacity = 0.95 * Math.max(0, 1 - k);
      if (k >= 1) this.vanish('blinded');
    }
  }
  pan(h) { const p = this.A.player, yaw = p.yaw, rx = Math.cos(yaw), rz = -Math.sin(yaw), dx = h.position.x - p.x, dz = h.position.z - p.z, d = Math.hypot(dx, dz) || 1; return Math.max(-1, Math.min(1, (dx * rx + dz * rz) / d)); }
  snap() {
    if (this.state !== 'mirror') return; this.state = 'snap'; this.t = 0; this.log[this.log.length - 1].snapped = performance.now();
    const S = this.S, G = this.G; if (S) { S.sting && S.sting(0.7); S.scream && setTimeout(() => S.scream(this.pan(this.h)), 120); } G.shake(0.5); G.flash(0.12); this.F.distort && (this.F.distort(), setTimeout(() => this.F.endDistort && this.F.endDistort(), 280));
  }
  grab() {
    const G = this.G, S = this.S; this.state = 'gone'; this.log[this.log.length - 1].caught = true;
    G.shake(1.2); G.flash(0.35); G.damage = 1; S && S.sting && S.sting(1.2); this.A.tp && this.A.tp.forceFP && this.A.tp.forceFP(900);
    this.h.visible = false;
    const r = this.A.caught ? this.A.caught('stranger', 'He had your face.') : this.A.failLoop('He had your face.');
    this.off(); return r;
  }
  blind() { if (this.state === 'off' || this.state === 'armed' || this.state === 'blind' || this.state === 'gone') return false; this.state = 'blind'; this.t = 0; this.log[this.log.length - 1].blinded = performance.now();
    this.quiet = false; const S = this.S; S && S.scream && S.scream(this.pan(this.h)); return true; }
  stagger(sec, knock) { if (!this.active) return false; const p = this.A.player, h = this.h; let dx = h.position.x - p.x, dz = h.position.z - p.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    // v3.3.1: the knock-back is a shove you can see (about 0.16 s), he recoils (leans back) and flashes pale for an instant
    this.kn = { dx, dz, left: knock, v: Math.max(6, knock / 0.16) }; this.hitT = performance.now(); this.recoil = 1;
    this.stagUntil = performance.now() + sec * 1000; if (this.state === 'mirror' || this.state === 'snap') { this.state = 'chase'; this.t = 0; } // a hit makes him angry
    const S = this.S; if (S && S.ctx) { S.sting && S.sting(0.25); } this.G.flash(0.06); (this.log[this.log.length - 1].staggers = (this.log[this.log.length - 1].staggers || 0) + 1); return true; }
  lostYou(seen, spot) { if (!this.active) return; this.t = 0; if (seen) { this.state = 'drag'; this.goal = { x: spot.x, z: spot.z }; this.log[this.log.length - 1].sawHide = true; }
    else { const h = this.h; let dx = spot.x - h.position.x, dz = spot.z - h.position.z; const d = Math.hypot(dx, dz) || 1; // walks past where you hid, then gives up
      let gx = spot.x + dx / d * 2.5, gz = spot.z + dz / d * 2.5; gx = Math.max(-1.2, Math.min(1.2, gx)); if (!clearAt(this.CH, gx, gz, 0.28)) { gx = 0; } this.state = 'search'; this.goal = { x: CH_X(this.CH, gx), z: gz }; this.log[this.log.length - 1].lostYou = true; } }
  vanish(why) { if (this.log.length) this.log[this.log.length - 1].end = why; this.off(); }
  get active() { return this.state === 'mirror' || this.state === 'snap' || this.state === 'chase' || this.state === 'search' || this.state === 'drag'; }
}

// v3.3 THE TC (Coach chapter only): a faceless ticket checker in a black coat walks down the aisle towards you, hole-punch clicking,
// whispering "tikat dikhao…". Show him a lost ticket (USE) and he punches it and moves on. No ticket, or you don't show it in time,
// and he drags you to the open door (-40 HP; classic mode: back to 0). Run and he follows. Hide, shove, whack or flare him like the stranger.
export class TicketChecker extends Lookalike {
  build() {
    if (this.h) return this.h;
    const h = this.h = makeHuman({ av: 'Male_Adult_20', shirt: 0x1a1a1e, pants: 0x15151a, skin: 0x5a3a28 });
    const u = h.userData; u.noLod = true; this.mats = [];
    h.traverse(o => { if (!o.isMesh) return; o.castShadow = true; o.frustumCulled = false; const s = o.material;
      /* unlit like the stranger, but a railway-black coat you can just make out */
      const m = new THREE.MeshBasicMaterial({ map: s.map || null, color: s.map ? 0x24262e : 0x101014, transparent: true, opacity: 1, side: s.side, alphaTest: s.alphaTest || 0 }); o.material = m; this.mats.push(m); });
    const head = u.rig && u.rig.bones && (u.rig.bones.Bip01_Head || u.rig.bones['Bip01 Head']);
    const mkTex = (draw) => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); draw(x); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
    // no face at all: a smooth black blank where it should be
    const shade = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.32), new THREE.MeshBasicMaterial({ map: mkTex(x => { const g = x.createRadialGradient(64, 62, 10, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.7, 'rgba(0,0,0,.96)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false }));
    const grin = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
    // a ticket punch in his right hand and a badge
    const punch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.05), new THREE.MeshStandardMaterial({ color: 0x8a8a90, metalness: 0.8, roughness: 0.35 }));
    const hand = u.rig && (u.rig.bones.Bip01_R_Hand || u.rig.bones['Bip01 R Hand']); if (hand) { punch.scale.setScalar(1 / Math.max(1e-3, hand.getWorldScale(new THREE.Vector3()).x)); hand.add(punch); }
    h.add(shade); h.add(grin); shade.renderOrder = 4; u.stopMotion = 0.1;
    this.shade = shade; this.grin = grin; this.headBone = head; h.visible = false; return h;
  }
  onLoop(CH, progress, o) {
    this.off(); this.CH = CH; const G = this.G; this.item = null;
    const want = o.force || (CH.id === 3 && !o.exit && !o.ghostOn && !o.lookOn && !o.trainAnom && !o.blackout && progress >= 2 && G.loops >= LOOK.minLoops && o.roll(0.22));
    if (!want) return; if (!this.build()) return;
    if (this.h.parent !== CH.root) CH.root.add(this.h);
    this.state = 'armed'; this.hits = 0; this.stagUntil = 0; this.t = 0; this.cueSteps = 0; this.stepAcc = 0; this.lostT = 0; this.clickT = 1; this.talkT = 2.5;
    this.runCount++; this.log.push({ loop: G.loops, ch: CH.id, progress, tc: true });
  }
  click() { const S = this.S; if (!S || !S.ctx) return; const ctx = S.ctx, t = S.now(); for (const dt of [0, 0.07]) { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 2600 - dt * 4000; const g = ctx.createGain(); S.env(g, t + dt, 0.001, 0.12, 0.03); const p = S.pan(this.pan(this.h)); o.connect(g); g.connect(p); p.connect(S.out); g.connect(S.rev); o.start(t + dt); o.stop(t + dt + 0.05); } }
  talk() { const S = this.S; const id = Math.random() < 0.6 ? 'w_tikat' : 'w_tikat2'; if (!(S && S.voice && S.voice(id, { gain: 1.0, pan: this.pan(this.h) }))) { S && S.whisper && S.whisper(1.0, this.pan(this.h), 0.25); } this.A.showSub('"…tikat dikhao…" (ticket, please)', 2400, true); }
  update(dt, p) {
    if (this.state === 'off' || !this.h) return;
    const h = this.h, u = h.userData, CH = this.CH;
    if (this.state === 'armed') { this.t += dt; if (this.t > 1.2) { const s = this.spot(p); if (!s) { this.off(); return; } h.position.set(s.x, CH.floorY ? CH.floorY(s.x, s.z) : 0, s.z); h.rotation.y = Math.atan2(p.x - s.x, p.z - s.z); h.visible = true; stillPose(h); this.placeFace(); this.state = 'walk'; this.t = 0; this.log[this.log.length - 1].appeared = performance.now(); } return; }
    if (this.state === 'walk' || this.state === 'check' || this.state === 'leave') {
      this.t += dt; const dx = p.x - h.position.x, dz = p.z - h.position.z, d = Math.hypot(dx, dz) || 1e-3;
      this.hitFx(dt); if (performance.now() < this.stagUntil) { this.knockStep(dt); u.head.rotation.set(rnd(-0.5, 0.2), rnd(-0.7, 0.7), rnd(-0.6, 0.6)); stillPose(h); return; }
      this.clickT -= dt; if (this.clickT <= 0) { this.clickT = rnd(1.2, 2.2); this.click(); }
      if (this.state === 'walk') { this.talkT -= dt; if (this.talkT <= 0) { this.talkT = rnd(5, 7); this.talk(); }
        const sp = 1.05, st = Math.min(d - 1.4, sp * dt); if (st > 0) { let tx = h.position.x + dx / d * st, tz = h.position.z + dz / d * st; [tx, tz] = pushOut(CH, tx, tz, 0.28); if (clearAt(CH, tx, tz, 0.28)) { h.position.x = tx; h.position.z = tz; } animateWalk(h, dt, sp, 1); this.stepAcc += st; if (this.stepAcc > 0.8) { this.stepAcc = 0; this.S && this.S.step && this.S.step(0.35, this.pan(h), CH.surface); } } else stillPose(h);
        h.rotation.y = Math.atan2(dx, dz); u.head.rotation.set(0.05, 0, -0.12);
        if (d < 1.75) { this.state = 'check'; this.t = 0; this.talk(); this.addItem(); } }
      else if (this.state === 'check') { stillPose(h); h.rotation.y = Math.atan2(dx, dz); u.head.rotation.set(0.15, 0, -0.18 + Math.sin(this.t * 3) * 0.03);
        if (d > 3.2) { this.removeItem(); this.state = 'chase'; this.t = 0; this.S && this.S.sting && this.S.sting(0.5); return; } // you ran
        if (this.t > 5.5) { this.removeItem(); this.grab(); return; } }
      else { // leave: turns and walks back up the train, fading
        h.rotation.y = Math.atan2(-dx, -dz); const st = 1.1 * dt; h.position.x -= dx / d * st; h.position.z -= dz / d * st; animateWalk(h, dt, 1.1, 1);
        for (const m of this.mats) m.opacity = Math.max(0, 1 - this.t / 3); if (this.t > 3) this.vanish('ticket'); }
      if (CH.floorY) h.position.y = CH.floorY(h.position.x, h.position.z);
      return; }
    return super.update(dt, p);
  }
  addItem() { const F = this.F; this.item = { obj: this.h, r: 2.4, losEnd: 0.6, label: (this.A.save.tickets || []).length ? 'Show him a lost ticket' : 'You have no ticket…', use: () => { this.showTicket(); return 'remove'; } }; F.items.push(this.item); }
  removeItem() { const F = this.F; if (this.item) F.items = F.items.filter(x => x !== this.item); this.item = null; }
  showTicket() { if (this.state !== 'check') return; const has = (this.A.save.tickets || []).length > 0; this.removeItem();
    if (has) { this.click(); setTimeout(() => this.click(), 250); this.A.showSub('He punches your ticket. He moves on.', 2400, true); this.state = 'leave'; this.t = 0; this.log[this.log.length - 1].ticket = true; }
    else this.grab(); }
  grab() { const G = this.G, S = this.S; this.removeItem(); this.state = 'gone'; this.log[this.log.length - 1].caught = true;
    G.shake(1.2); G.flash(0.3); G.damage = 1; S && S.sting && S.sting(1.1); this.A.tp && this.A.tp.forceFP && this.A.tp.forceFP(900); this.h.visible = false;
    const r = this.A.caught ? this.A.caught('tc', 'He dragged you to the open door…') : this.A.failLoop('He threw you off the train.'); this.off(); return r; }
  stagger(sec, knock) { const was = this.state; const r = super.stagger(sec, knock); if (r && (was === 'walk' || was === 'check')) { this.removeItem(); this.state = 'chase'; } return r; }
  blind() { this.removeItem(); return super.blind(); }
  lostYou(seen, spot) { this.removeItem(); if (this.state === 'walk' || this.state === 'check') this.state = 'chase'; return super.lostYou(seen, spot); }
  off() { this.removeItem && this.item && this.removeItem(); super.off(); }
  get active() { return super.active || this.state === 'walk' || this.state === 'check' || this.state === 'leave'; }
}
