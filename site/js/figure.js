// PLATFORM 0 v3.7 — THE FIGURE ("it's always there now"). His pick (Nov 2): "A figure at the far end that's a little closer every
// time you turn back". Chapter 1 only. After your first turn-back in a run, a dark, still figure with a dim kerosene hand-lamp stands
// at the far end of the platform, in line with the way out. Every turn-back (right or wrong) brings it one step closer (same spots on
// every platform). On the loop after the 7th turn-back it is suddenly right in front of you: the lights stutter, a sting, a small
// shake; then it is back at the far end and the count starts again. No damage (a scare, not a hit).
// It is BASELINE, never an anomaly: once it has appeared it is there on every Chapter 1 loop (How to play says so; the first time,
// a subtitle says "It will be there every time now."). Only its distance changes, and only when you turn back. It is not shown in a
// loop where Maa or the stranger is out (they own that loop), and it never decides whether a loop is right or wrong.
// Never solid: walk up to it and it is gone (it fades as you get within ~4.5 m), back in its place next loop.
import * as THREE from './three.module.min.js';
import { makeHuman } from './props.js';

export const FIG = { // G.figOn: it has appeared this run (your first turn-back); G.figSteps: turn-backs since then (or since the scare)
  x: -1.0,                                   // in line with the far doorway (the way out) and the spawn corridor
  z: [-37.0, -34.0, -31.0, -28.0, -25.0, -22.0, -19.0], // step 0 = in the mouth of the far doorway; one step per turn-back
  scareAt: 7,                                // turn-backs (since the last scare) before it comes for you
  near: 4.5,                                 // fades when you are this close
};
function glowTex() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,250,210,1)'); r.addColorStop(0.18, 'rgba(230,240,150,0.75)'); r.addColorStop(0.5, 'rgba(160,190,90,0.18)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

const subBusy = () => { const s = document.getElementById('sub'); return !!(s && s.classList.contains('show')); }; // never talk over a PA line (it may be the clue)
export class Figure {
  constructor(F) { this.F = F; this.g = null; this.state = 'off'; this.fade = 0; this.log = []; }
  get G() { return this.F.G; }
  build(CH) {
    if (this.g) { if (this.g.parent !== CH.root) CH.root.add(this.g); return this.g; }
    const g = this.g = new THREE.Group(); g.name = 'figure';
    const h = this.h = makeHuman({ shirt: 0x0b0b0d, pants: 0x0b0b0d, skin: 0x0b0b0d, rate: 0.18 }); // a very slow breath: as good as still
    const u = h.userData; u.noLod = true;
    this.mats = [];
    h.traverse(o => { if (!o.isMesh) return; o.castShadow = false; o.frustumCulled = false; const s = o.material;
      const m = new THREE.MeshBasicMaterial({ color: 0x050506, transparent: true, opacity: 1, side: s.side, alphaTest: s.alphaTest || 0, map: s.alphaTest ? s.map : null }); o.material = m; this.mats.push(m); });
    if (u.eyes) u.eyes.forEach(e => { e.visible = false; });
    h.scale.set(1.0, 1.1, 1.0); g.add(h);
    const blk = new THREE.MeshBasicMaterial({ color: 0x060607, transparent: true }); this.mats.push(blk);
    // a guard's peaked cap: the shape you learn to look for at the end of the platform
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.105, 0.075, 14), blk); cap.position.set(0, 1.93, -0.005); g.add(cap);
    const peak = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.08), blk); peak.position.set(0, 1.9, 0.105); peak.rotation.x = 0.25; g.add(peak);
    // the hand-lamp, held low at its right side: dark frame, a dim greenish kerosene glass, a soft glow you can see from the far end
    const lamp = this.lamp = new THREE.Group(); lamp.position.set(0.27, 0.78, 0.06); g.add(lamp);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.17, 0.11), blk); lamp.add(frame);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 4, 10, Math.PI), blk); handle.position.y = 0.09; lamp.add(handle);
    this.glassM = new THREE.MeshBasicMaterial({ color: 0xc9dd86, transparent: true, fog: false, toneMapped: false }); this.mats.push(this.glassM);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.1, 0.115), this.glassM); glass.position.y = -0.005; lamp.add(glass);
    const glass2 = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.1, 0.085), this.glassM); glass2.position.y = -0.005; lamp.add(glass2);
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xd8e89a, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
    this.glow.scale.setScalar(1.0); this.glow.renderOrder = 4; lamp.add(this.glow);
    // and the little pool of light it stands in, so its shape reads against the floor from the far end of the platform
    this.pool = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshBasicMaterial({ map: this.glow.material.map, color: 0x7f9a52, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: 0.5, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.pool.rotation.x = -Math.PI / 2; this.pool.position.set(0.18, 0.012, 0.12); this.pool.renderOrder = 2; g.add(this.pool);
    g.traverse(o => { o.userData.noBatch = true; o.userData.noCollide = true; o.userData.figure = true; });
    CH.root.add(g); g.visible = false; return g;
  }
  steps() { return Math.min(FIG.scareAt, this.G.figSteps || 0); } // turn-backs since it appeared (or since the last scare)
  // called from Features.onLoop after Maa / the stranger / the TC have decided
  onLoop(CH, progress, o) {
    this.CH = CH; this.state = 'off'; this.scare = null; this.fade = 0; this.firstHint = false;
    if (this.g) this.g.visible = false;
    if (CH.id !== 1 || o.exit || !this.G.figOn) return;            // never before the first turn-back, Chapter 1 only
    if (o.ghostOn || o.lookOn) { this.state = 'yield'; return; }            // Maa / the stranger own this loop
    this.build(CH);
    const n = this.steps();
    if (n >= FIG.scareAt && !o.blackout && !o.lightsAnom && !o.scareAnom && !o.hide && !o.forced) { this.state = 'scare'; this.scare = { t: 0, phase: 'wait' }; this.place(FIG.z[FIG.z.length - 1]); this.g.visible = false; }
    else { this.state = 'stand'; this.place(FIG.z[Math.min(n, FIG.z.length - 1)]); this.g.visible = true; }
    if (!this.G.figIntro && this.state === 'stand') this.firstHint = true;
    this.log.push({ loop: this.G.loops, steps: n, state: this.state, z: this.g.position.z });
  }
  place(z) { const g = this.g; g.position.set(FIG.x, this.CH.floorY ? this.CH.floorY(FIG.x, z) : 0, z); g.rotation.y = 0; this.setAlpha(1); }
  setAlpha(a) { for (const m of this.mats) { m.opacity = a; } this.glow.material.opacity = 0.85 * a; this.pool.material.opacity = 0.65 * a; this.g.visible = a > 0.02; }
  spotZ() { return this.g ? this.g.position.z : null; }
  update(dt, p) {
    if (!this.g || (this.state !== 'stand' && this.state !== 'scare' && this.state !== 'gone')) return;
    const G = this.G, g = this.g, t = (this.t = (this.t || 0) + dt);
    // the lamp: a slow kerosene breath, the same every loop
    const fl = 0.86 + 0.08 * Math.sin(t * 2.1) + 0.05 * Math.sin(t * 5.3 + 1.2);
    this.glassM.color.setRGB(0.79 * fl, 0.87 * fl, 0.53 * fl); this.glow.scale.setScalar(1.0 * (0.94 + 0.06 * fl)); this.pool.material.color.setRGB(0.62 * fl, 0.75 * fl, 0.4 * fl);
    if (this.state === 'scare') return this.updateScare(dt, p);
    if (this.state === 'gone') return;
    // it turns, slowly, to face you
    const yaw = Math.atan2(p.x - g.position.x, p.z - g.position.z); let d = yaw - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); g.rotation.y += d * Math.min(1, dt * 0.8);
    const dist = Math.hypot(p.x - g.position.x, p.z - g.position.z);
    if (dist < FIG.near) { this.fade = Math.min(1, this.fade + dt * 2.2); this.setAlpha(1 - this.fade); if (this.fade >= 1) this.state = 'gone'; }
    if (this.firstHint && G.state === 'playing' && !G.transitioning && !subBusy() && this.inView(p) && dist < 40 && p.z < 1.5) { this.firstHint = false; G.figIntro = true; if (this.F.A.save) { this.F.A.save.figIntro = true; this.F.A.writeSave && this.F.A.writeSave(); }
      this.F.A.showSub('Someone is standing at the far end. It will be there every time now.', 4200, true); }
  }
  inView(p) { const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), dx = this.g.position.x - p.x, dz = this.g.position.z - p.z, d = Math.hypot(dx, dz) || 1; return (dx * fx + dz * fz) / d > 0.8; }
  // the one well-timed scare: a beat after you arrive, the lights stutter and it is right in front of you; then it is back at the far end
  updateScare(dt, p) {
    const s = this.scare, G = this.G, CH = this.CH, g = this.g, S = G.sound; s.t += dt;
    if (s.phase === 'wait') { if (G.transitioning || G.state !== 'playing') { s.t = 0; return; } if (s.t < 1.1) return;
      s.phase = 'stutter'; s.t = 0; CH.flags.lightsOverride = true; this._levels = CH.lamps.map(l => l.level); S && S.setHum && S.setHum(0.2); }
    if (s.phase === 'stutter') { const k = s.t, on = (k < 0.1) || (k > 0.18 && k < 0.24) || (k > 0.5 && k < 0.56);
      for (const l of CH.lamps) if (!l.isExit && l !== CH.exitLamp) l.level = on ? (l.base ?? 1) * 0.7 : 0.03;
      if (k > 0.62) { s.phase = 'there'; s.t = 0;
        // right in front of you, in the direction you're looking (kept on the floor you can walk on)
        const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw); let x = p.x + fx * 1.9, z = p.z + fz * 1.9; if (this.F.A.resolve) { const r = this.F.A.resolve(x, z); x = r[0]; z = r[1]; }
        g.position.set(x, CH.floorY ? CH.floorY(x, z) : 0, z); g.rotation.y = Math.atan2(p.x - x, p.z - z); this.setAlpha(1); g.visible = true;
        for (const l of CH.lamps) if (!l.isExit && l !== CH.exitLamp) l.level = (l.base ?? 1) * 0.55;
        S && S.sting && S.sting(0.9); G.shake && G.shake(0.38); G.flash && G.flash(0.25);
        this.log.push({ loop: G.loops, scare: true, at: [+x.toFixed(2), +z.toFixed(2)] }); G.figScares = (G.figScares || 0) + 1; } return; }
    if (s.phase === 'there') { if (s.t > 0.55 && s.t < 0.62) for (const l of CH.lamps) if (!l.isExit && l !== CH.exitLamp) l.level = 0.03; // one last blink and it's gone
      if (s.t > 0.68) { s.phase = 'done'; for (let i = 0; i < CH.lamps.length; i++) { const l = CH.lamps[i]; if (!l.isExit && l !== CH.exitLamp) l.level = l.base ?? this._levels[i]; } CH.flags.lightsOverride = false; S && S.setHum && S.setHum(CH.humLevel ?? 1);
        G.figSteps = 0; this.F.A.save && (this.F.A.save.figSteps = 0, this.F.A.writeSave && this.F.A.writeSave());
        this.place(FIG.z[0]); this.state = 'stand'; this.fade = 0; } }
  }
  off() { if (this.state === 'scare' && this.scare && (this.scare.phase === 'stutter' || this.scare.phase === 'there') && this.CH) { for (const l of this.CH.lamps) if (!l.isExit && l !== this.CH.exitLamp) l.level = l.base ?? 1; this.CH.flags.lightsOverride = false; } this.state = 'off'; if (this.g) this.g.visible = false; }
}
