// PLATFORM 0 v3.5 — hidden anomalies + red herrings.
// His ask (Nov 1): "hidden anomalies that can make you think if you should keep walking or turn back".
// SUBTLE anomalies: small, fair changes a careful player who knows the baseline can spot (the clock, a poster's eyes, one sign,
// the CCTV camera, the announcer, the kettle's steam, the sleeper, the suitcase, a dead tube, a still fan...). They are flagged
// `subtle: true`; main.js pickAnomaly makes them rare on the first platforms and common on the last ones.
// RED HERRINGS: odd-but-normal details that are part of each platform's baseline and never change from loop to loop on that
// platform (a tube that blinks in a fixed rhythm, a newspaper page that lifts in the draught, a plastic bag twitching on the
// tracks, a pigeon pacing a roof truss, a dead bulb swaying on its cord, a clay cup rocking on the floor, a fan that wobbles and
// creaks, the CCTV's blinking red light, the kettle's steam). None of them touches anything an anomaly changes.
import * as THREE from './three.module.min.js';
import * as M from './mats.js';
import { box, cyl, panelTex, setSignCanvas } from './props.js';
import { facePlayer } from './chapter.js';
import { Reflection } from './reflection.js'; // v3.7

// per platform (PF 0..8): which tube blinks (index into the 8 platform tubes, near → far), which tube an anomaly kills,
// and the two red herrings that platform always has
const FLICK = [2, 5, 1, 6, 3, 0, 4, 7, 2];
const DEAD = [5, 1, 4, 2, 6, 3, 1, 3, 5];
export const RH_BY_PF = [
  ['paper', 'wobble'], ['bag', 'cup'], ['paper', 'bulb'], ['pigeon', 'bag'], ['cup', 'wobble'],
  ['bulb', 'paper'], ['pigeon', 'cup'], ['bag', 'bulb'], ['wobble', 'pigeon'],
];
export const WOBBLE_FAN = 0, STILL_FAN = 1; // the wobbling fan (red herring) is never the one the anomaly stops
// the blink: two quick blinks and a stutter every 4.2 s (always the same rhythm, so it reads as a bad starter, not a change)
export function blinkOff(t) { const k = t % 4.2; return k < 0.09 || (k > 0.25 && k < 0.36) || (k > 2.1 && k < 2.16); }

function softTex() { const c = M.canvas(64, 64), g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return M.ctex(c); }
function paperTex() {
  const c = M.canvas(128, 96), g = c.getContext('2d'); g.fillStyle = '#d6d0bf'; g.fillRect(0, 0, 128, 96);
  g.fillStyle = '#2a2824'; g.fillRect(6, 5, 116, 10); g.fillStyle = '#6a665c'; g.fillRect(8, 20, 46, 30);
  g.fillStyle = 'rgba(40,38,34,.55)'; for (let y = 20; y < 92; y += 4) { g.fillRect(60, y, 60, 1.6); if (y > 54) g.fillRect(8, y, 46, 1.6); }
  M.grime(g, 128, 96, 0.35, 21); return M.ctex(c);
}

export class Subtle {
  constructor(ch, o = {}) {
    this.ch = ch; const root = ch.root; this.t = 0; this.pf = 0; this.on = new Set(); this.steamDir = 1; this.creakIn = 3;
    this.tubes = ch.lamps.filter(l => !l.noFlicker && !l.fob);
    this.refl = new Reflection(ch); // v3.7: the retiring room's dark glass door, with your reflection in it (anomaly 'reflection_still')
    // ---- CCTV camera on pillar 2 (z -14), under the roof, lit by the tubes. Baseline: it looks down the platform, away from you
    // (you see its back and the blinking red light); 'cctv_watch' turns it round to follow you ----
    { const g = new THREE.Group(); g.position.set(0.43, 3.3, -14.0); g.scale.setScalar(1.35); root.add(g); const dark = M.std(0x2a2c2e, 0.55, 0.6), body = M.std(0xc8c6bc, 0.45, 0.3);
      box(0.03, 0.18, 0.14, dark, -0.015, 0, 0, g); box(0.3, 0.04, 0.04, dark, -0.15, 0, 0, g);
      const pan = new THREE.Group(); pan.position.set(-0.3, -0.06, 0); g.add(pan); cyl(0.02, 0.02, 0.07, dark, 0, 0.035, 0, pan, 6);
      const tilt = new THREE.Group(); pan.add(tilt);
      box(0.16, 0.14, 0.36, body, 0, -0.03, 0.06, tilt); box(0.2, 0.018, 0.42, dark, 0, 0.05, 0.08, tilt); // body + sun hood
      const lens = cyl(0.052, 0.058, 0.04, M.std(0x050608, 0.08, 0.2), 0, -0.03, 0.255, tilt, 14); lens.rotation.x = Math.PI / 2;
      const glint = cyl(0.03, 0.03, 0.004, M.std(0x304a60, 0.05, 0.9), 0, -0.03, 0.277, tilt, 10); glint.rotation.x = Math.PI / 2;
      this.camLed = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), M.basic(0xff2010)); this.camLed.position.set(0.05, 0.03, -0.125); tilt.add(this.camLed);
      g.traverse(m => { m.userData.noBatch = true; });
      this.cam = { g, pan, tilt, yaw0: Math.PI, pitch0: 0.3 }; }
    // ---- steam from the chai kettle (baseline: rises and curls away; 'steam_down' makes it pour down over the counter) ----
    { const tex = softTex(), n = 9; this.steam = [];
      const sp = o.spout || new THREE.Vector3(-2.27, 1.37, o.stallZ !== undefined ? o.stallZ + 0.65 : -12.85); this.spout = sp;
      for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xf2eee6, transparent: true, depthWrite: false, opacity: 0 })); s.userData.noBatch = true; s.renderOrder = 3; root.add(s); this.steam.push({ s, ph: i / n, sw: (i * 0.618) % 1 }); } }
    // ---- red herrings ----
    const rh = this.rh = {};
    { // a newspaper left on bench 1: its top page lifts and settles in the draught
      const tex = paperTex(), m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide });
      const g = new THREE.Group(); g.position.set(-3.09, 0.657, -9.2); root.add(g);
      const base = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.42), m); base.rotation.x = -Math.PI / 2; base.position.set(0.15, 0, 0); g.add(base);
      const hinge = new THREE.Group(); hinge.position.set(0.0, 0.004, 0); g.add(hinge);
      const flap = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.42), m); flap.rotation.x = -Math.PI / 2; flap.position.set(0.15, 0, 0); hinge.add(flap);
      rh.paper = { g, hinge };
    }
    { // a white plastic bag snagged on the ballast, twitching in the wind
      const geo = new THREE.SphereGeometry(0.16, 9, 7), p = geo.attributes.position; let s = 7;
      const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let i = 0; i < p.count; i++) { const k = 0.7 + r() * 0.45; p.setXYZ(i, p.getX(i) * k * 1.25, Math.max(-0.02, p.getY(i)) * k * 0.7, p.getZ(i) * k); }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, M.std(0xd8dcd6, 0.6, 0, { transparent: true, opacity: 0.88 })); const g = new THREE.Group(); g.position.set(5.75, -1.13, -17.2); g.add(m);
      const ear = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.14), M.std(0xd8dcd6, 0.6, 0, { side: THREE.DoubleSide, transparent: true, opacity: 0.85 })); ear.position.set(0.12, 0.1, 0); g.add(ear);
      root.add(g); rh.bag = { g, m, ear };
    }
    { // a pigeon pacing the bottom flange of the roof truss at z -12, bobbing its head
      const grey = M.std(0xa4a7b0, 0.75), dk = M.std(0x5c606c, 0.75), g = new THREE.Group(); g.scale.setScalar(1.25); root.add(g);
      const bodyM = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), grey); bodyM.scale.set(1, 0.85, 1.55); bodyM.position.y = 0.08; g.add(bodyM);
      const head = new THREE.Group(); head.position.set(0, 0.15, 0.09); g.add(head); const hm = new THREE.Mesh(new THREE.SphereGeometry(0.038, 7, 5), dk); head.add(hm);
      const beak = cyl(0.004, 0.009, 0.03, M.std(0x2a2422, 0.6), 0, -0.005, 0.045, head, 5); beak.rotation.x = Math.PI / 2;
      const tail = box(0.07, 0.015, 0.1, dk, 0, 0.07, -0.13, g); tail.rotation.x = -0.35;
      for (const x of [-0.025, 0.025]) cyl(0.005, 0.005, 0.04, M.std(0xa04040, 0.6), x, 0.02, 0, g, 4);
      g.position.set(-0.6, 3.97, -12.0); rh.pigeon = { g, head };
    }
    { // a dead bulb hanging on its flex near the cooler end, swaying slowly (no light: it is dead, so it never reads as a lamp change)
      const g = new THREE.Group(); g.position.set(-2.72, 4.18, -27.7); root.add(g);
      cyl(0.004, 0.004, 0.95, M.std(0x111111, 0.8), 0, -0.475, 0, g, 4); cyl(0.018, 0.018, 0.05, M.std(0x3a3a36, 0.5, 0.6), 0, -0.97, 0, g, 8);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), M.std(0x8a8476, 0.15, 0.1, { transparent: true, opacity: 0.8 })); b.scale.set(1, 1.25, 1); b.position.y = -1.03; g.add(b);
      rh.bulb = { g };
    }
    { // a clay chai cup (kulhad) on its side by the utility box, rocking in the draught
      const pts = [[0.0, 0], [0.026, 0], [0.03, 0.01], [0.038, 0.07], [0.036, 0.072], [0.03, 0.012], [0.0, 0.008]].map(([x, y]) => new THREE.Vector2(x, y));
      const g = new THREE.Group(); g.position.set(-2.62, 0.035, -24.35); root.add(g);
      const k = new THREE.Mesh(new THREE.LatheGeometry(pts, 12), M.std(0x9a5434, 0.9)); k.material.side = THREE.DoubleSide; k.rotation.z = Math.PI / 2; k.position.x = -0.036; g.add(k);
      rh.cup = { g };
    }
    this.all = Object.keys(rh);
    for (const k of this.all) { rh[k].g.traverse(m => { m.userData.noBatch = true; }); rh[k].g.visible = false; }
  }
  // every loop: back to the baseline for platform pf (anomalies are applied after this)
  reset(pf) {
    const ch = this.ch; this.pf = pf = Math.max(0, Math.min(8, pf | 0)); this.on = new Set(RH_BY_PF[pf]); this.t = 0; this.steamDir = 1;
    for (const k of this.all) this.rh[k].g.visible = this.on.has(k);
    const c = this.cam; c.pan.rotation.y = c.yaw0; c.tilt.rotation.x = c.pitch0;
    ch.flicker = this.tubes[FLICK[pf]] || null; ch.flickerFn = blinkOff;
    this.deadLamp = this.tubes[DEAD[pf]] || null;
    for (const f of ch.fans || []) if (f.parent) f.parent.rotation.set(0, 0, 0);
    this.refl.reset(); this.update(0, null, null);
  }
  update(dt, p, G) {
    const t = (this.t += dt), ch = this.ch, rh = this.rh;
    this.refl.update(dt, p, G, !!(ch.flags && ch.flags.reflStill)); // v3.7
    this.camLed.visible = (t % 1.6) < 0.8;
    // steam
    const sp = this.spout, down = this.steamDir < 0;
    for (const q of this.steam) {
      const k = (t / 2.6 + q.ph) % 1, s = q.s, sw = q.sw;
      if (!down) { s.position.set(sp.x + k * 0.22 + Math.sin(t * 1.3 + sw * 6) * 0.05 * k, sp.y + k * 0.75, sp.z + (sw - 0.5) * 0.16 * k); }
      else { const fall = Math.min(1, k * 1.6); s.position.set(sp.x + 0.05 + k * 0.32, sp.y - fall * 1.15, sp.z + (sw - 0.5) * 0.3 * k + Math.sin(t * 1.1 + sw * 6) * 0.03); }
      const sz = 0.14 + k * (down ? 0.55 : 0.5); s.scale.set(sz, sz * 1.15, 1); s.material.opacity = 0.5 * Math.sin(Math.PI * k) * (k < 0.12 ? k / 0.12 : 1);
    }
    // red herrings (only the platform's own two are visible; the others still tick, cheaply)
    if (this.on.has('paper')) { const gust = Math.max(0, Math.sin(t * 0.83) * Math.sin(t * 2.9 + 1.1)); rh.paper.hinge.rotation.z = 0.04 + gust * 0.95 + Math.sin(t * 17) * 0.02 * gust; }
    if (this.on.has('bag')) { const gust = Math.max(0, Math.sin(t * 0.61 + 0.5)) ** 2; const b = rh.bag; b.g.rotation.y = Math.sin(t * 0.4) * 0.5 + gust * 0.6; b.g.position.y = -1.13 + Math.abs(Math.sin(t * 9)) * 0.03 * gust; b.m.scale.set(1 + Math.sin(t * 5.3) * 0.06 * gust, 1 + Math.sin(t * 3.1) * 0.12 * (0.3 + gust), 1); b.ear.rotation.y = Math.sin(t * 11) * 0.8 * (0.2 + gust); }
    if (this.on.has('pigeon')) { const P2 = rh.pigeon, cyc = t % 14, walk = cyc < 5 ? cyc / 5 : cyc < 7 ? 1 : cyc < 12 ? 1 - (cyc - 7) / 5 : 0, moving = (cyc < 5 || (cyc > 7 && cyc < 12));
      P2.g.position.x = -1.5 + walk * 2.3; P2.g.rotation.y = (cyc < 6 || cyc > 12.5) ? Math.PI / 2 : -Math.PI / 2; P2.head.position.z = 0.09 + (moving ? Math.max(0, Math.sin(t * 9)) * 0.03 : Math.sin(t * 0.7) * 0.01); P2.g.position.y = 3.97 + (moving ? Math.abs(Math.sin(t * 9)) * 0.006 : 0); }
    if (this.on.has('bulb')) { rh.bulb.g.rotation.z = Math.sin(t * 1.8) * 0.1; rh.bulb.g.rotation.x = Math.sin(t * 1.27 + 0.6) * 0.05; }
    if (this.on.has('cup')) { rh.cup.g.rotation.x = Math.sin(t * 1.9) * 0.35 * (0.4 + 0.6 * Math.max(0, Math.sin(t * 0.5))); }
    if (this.on.has('wobble') && ch.fans && ch.fans[WOBBLE_FAN] && ch.fansOn !== false) {
      const f = ch.fans[WOBBLE_FAN].parent, a = ch.fans[WOBBLE_FAN].rotation.y; f.rotation.x = Math.sin(a) * 0.035; f.rotation.z = Math.cos(a) * 0.035;
      if (G && G.sound && G.sound.pfAccent && !ch.dawn && !(ch.flags && ch.flags.bo)) { this.creakIn -= dt; if (this.creakIn < 0) { this.creakIn = 5 + (t * 7.3 % 3); G.sound.pfAccent('creak', -0.3); } }
    } else if (this.on.has('wobble') && ch.fans && ch.fans[WOBBLE_FAN]) ch.fans[WOBBLE_FAN].parent.rotation.set(0, 0, 0);
  }
  // the CCTV turns to look at you (slow servo, like a real PTZ camera)
  trackCam(dt, p) {
    const c = this.cam, w = c.pan.getWorldPosition(this._v || (this._v = new THREE.Vector3())), dx = p.x - w.x, dz = p.z - w.z, dy = (p.y || 0) + 1.55 - w.y;
    const yaw = Math.atan2(dx, dz), pitch = Math.atan2(-dy, Math.hypot(dx, dz)), k = Math.min(1, dt * 1.6);
    let d = yaw - c.pan.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); c.pan.rotation.y += d * k; c.tilt.rotation.x += (pitch - c.tilt.rotation.x) * k;
  }
}

// the platform sign with its number mirrored (a backwards 2). 0 and 8 look the same mirrored, so on those platforms the word
// PLATFORM is the part that is backwards. One canvas per platform, made on first use.
const _mir = new Map();
export function mirroredNumber(src, n) {
  if (_mir.has(n)) return _mir.get(n);
  const c = M.canvas(src.width, src.height), g = c.getContext('2d'); g.drawImage(src, 0, 0);
  const k = src.width / 1024, sym = n === 0 || n === 8;
  const [x0, x1, y0, y1] = (sym ? [130, 530, 128, 226] : [760, 945, 40, 220]).map(v => Math.round(v * k));
  const w = x1 - x0, h = y1 - y0, tmp = M.canvas(w, h); tmp.getContext('2d').drawImage(src, x0, y0, w, h, 0, 0, w, h);
  g.save(); g.translate(x0 + w, y0); g.scale(-1, 1); g.drawImage(tmp, 0, 0); g.restore();
  _mir.set(n, c); return c;
}

// ---------- the subtle anomalies ----------
const S = (o) => Object.assign({ subtle: true }, o);
export const CH1_SUBTLE = [
  S({ id: 'clock_behind', name: 'The clock has lost ten minutes (2:07, not 2:17)', apply: c => { c.clockTime = 2 * 3600 + 7 * 60; } }),
  S({ id: 'clock_ticking', name: 'The stopped clock\'s second hand is ticking', update: c => { c.clockTime = 2 * 3600 + 17 * 60 + (Math.floor(c.t) % 60); } }),
  S({ id: 'poster_follow', name: 'The poster girl\'s eyes follow you', apply: c => { c.flags.follow = 1; },
    update: (c, dt, p) => { const z = c.animePoster.position.z; const m = p.z > z + 0.8 ? c.posterTex.lookL : p.z < z - 0.8 ? c.posterTex.lookR : c.posterTex.anime; if (c.animePoster.material.map !== m) { c.animePoster.material.map = m; } } }),
  S({ id: 'sign_one_mirror', name: 'The number on the big platform sign is backwards', apply: c => { setSignCanvas(c.signMesh, mirroredNumber(c.pfv.sign(c.pfv.n), c.pfv.n)); } }),
  S({ id: 'pa_name', name: 'The announcement says your name', noPA: true, update: (c, dt, p, G) => { if (!c.flags.paName && p.z < -5) { c.flags.paName = true; G.announce('Yatri kripya dhyan dein. The 11:58 slow local is running late. Arjun. Inconvenience is deeply regretted.', false, 'pa_arjun'); } } }),
  S({ id: 'notice_0217', name: 'The green notice says the last local is at 02:17', apply: c => { c.hindiNotice.material.map = c.hindiNoticeTex.t; } }),
  S({ id: 'cctv_watch', name: 'The CCTV camera turns to watch you', update: (c, dt, p) => c.subtle.trackCam(dt, p) }),
  S({ id: 'lamp_dead', name: 'One tube light is dead', update: c => { const l = c.subtle.deadLamp; if (l && l !== c.flicker) l.level = 0; } }),
  S({ id: 'fan_one_still', name: 'One ceiling fan isn\'t turning', apply: c => { c.flags.stillA = c.fans[STILL_FAN].rotation.y; }, update: c => { c.fans[STILL_FAN].rotation.y = c.flags.stillA; } }),
  S({ id: 'sleeper_flipped', name: 'The sleeper is lying the other way round', apply: c => { c.sleeper.rotation.y = Math.PI; } }),
  S({ id: 'steam_down', name: 'The kettle\'s steam pours downward', apply: c => { c.subtle.steamDir = -1; } }),
  S({ id: 'reflection_still', name: 'Your reflection in the dark glass door doesn\'t move with you', apply: c => { c.flags.reflStill = 1; } }), // v3.7 (#18)
  S({ id: 'suitcase_moved', name: 'The lone suitcase has moved', avail: c => !!c.suitcase, apply: c => c.moveSuitcase(true) }),
];
export const CH2_SUBTLE = [
  S({ id: 'bowl_flipped', name: 'The old man\'s bowl is upside down', apply: c => { const b = c.bowl; b.geometry.computeBoundingBox(); b.rotation.x = Math.PI; b.position.y = 0.012 + b.geometry.boundingBox.max.y; } }),
  S({ id: 'film_mirror', name: 'The film poster is mirrored', apply: c => { if (!c.filmTex.m) { const t = c.filmTex.n.clone(); t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; t.needsUpdate = true; c.filmTex.m = t; } c.film.material.map = c.filmTex.m; } }),
  S({ id: 'cobbler_watch', name: 'The cobbler is watching you', update: (c, dt, p) => { const u = c.cobbler.userData; if (!c.cobbler.visible || !u.head) return; const yaw = facePlayer(c.cobbler, p) - c.cobbler.rotation.y; u.head.rotation.y = Math.max(-1.2, Math.min(1.2, Math.atan2(Math.sin(yaw), Math.cos(yaw)))); u.head.rotation.x = -0.15; } }),
];
export const CH3_SUBTLE = [
  S({ id: 'paper_upside', name: 'The newspaper on the seat is upside down', apply: c => { c.newspaper.rotation.z = 0.3 + Math.PI; } }),
  S({ id: 'handle_odd', name: 'One hanging handle swings against the others', update: (c) => { const h = c.oddHandle(); if (!h) return; const t = c.t; h.rotation.x = -Math.sin(t * 1.7) * 0.32; h.rotation.z = Math.cos(t * 1.7) * 0.18; } }),
];
