// PLATFORM 0 v2 — chapter base: loop space, lamps, triggers, anomaly plumbing
import * as THREE from './three.module.min.js';

export class Chapter {
  constructor(game) {
    this.game = game; this.root = new THREE.Group(); this.root.visible = false; // v3.1.1: only the active chapter's root is in the scene (hidden roots still cost a full matrix update every frame)
    this.lamps = []; this.solids = []; this.flags = {}; this.t = 0; this.anomaly = null; this.events = []; this.updaters = []; this.tickets = [];
  }
  addSolid(x0, x1, z0, z1) { this.solids.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) }); }
  floorY() { return 0; }
  enter() { this.root.visible = true; const E = this.game.engine; if (this.root.parent !== E.scene) E.scene.add(this.root); E.lamps = this.lamps; E.scene.fog.color.setHex(this.fogColor); E.scene.fog.density = this.fogDensity; E.useSky(!!this.sky, this.skyI); if (E.scene.background && E.scene.background.isColor) E.scene.background.setHex(this.fogColor); E.renderer.toneMappingExposure = (this.exposure || 1) * (E.bright || 1) * (E.expMul || 1); }
  leave() { this.root.visible = false; if (this.root.parent) this.root.parent.remove(this.root); }
  resetCommon() {
    this.t = 0; this.events = []; this.flags = {};
    for (const l of this.lamps) l.reset();
    this.flicker = this.lamps.filter(l => !l.noFlicker)[(Math.random() * this.lamps.length) | 0] || null;
  }
  applyAnomaly(a) { this.anomaly = a; if (a && a.apply) a.apply(this, this.game); }
  baseUpdate(dt, p, G) {
    this.t += dt;
    // red-herring flicker on one lamp (always present; never an anomaly by itself). v3.5: Ch1 sets flickerFn = one fixed rhythm on a fixed tube per platform (subtle.js)
    const f = this.flicker;
    if (f && !this.flags.lightsOverride) { const t = this.t * 1.0; const off = this.flickerFn ? this.flickerFn(t) : (Math.sin(t * 13.1) + Math.sin(t * 7.7)) > 1.7 || (Math.sin(t * 0.7) > 0.97 && Math.sin(t * 40) > 0); f.level = off ? 0.05 : f.base; }
    for (const u of this.updaters) u(dt, this.t, p, G);
    if (this.anomaly && this.anomaly.update) this.anomaly.update(this, dt, p, G);
    for (const l of this.lamps) l.apply();
  }
}
export const facePlayer = (obj, p) => { const v = obj.getWorldPosition(new THREE.Vector3()); return Math.atan2(p.x - v.x, p.z - v.z); };
export const angleTo = (obj, p, yaw) => { const v = obj.getWorldPosition(new THREE.Vector3()); const a = Math.atan2(-(v.x - p.x), -(v.z - p.z)); let d = a - yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); return Math.abs(d); }; // 0 = looking straight at it
