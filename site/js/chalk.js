// PLATFORM 0 v3.7 — IT REMEMBERS YOU. His pick (Nov 2): "where you died last run, there's a chalk outline next time".
// When you die, the spot (chapter, platform/loop number, x/z, facing, cause) is kept in the save. From then on, whenever you are on
// that chapter's same platform number, a chalk body outline (with a faint smear) lies on the floor there. Only one: the newest death
// replaces it. It is part of that platform's baseline (there every time you're on it, never a reason to turn back; the first time,
// a subtitle says whose it is). It is moved, when it is saved, off any floor spot an anomaly uses (wet footprints, the leaking
// cooler's puddle, the moved suitcase, the hands at the edge, the subway sandals / bowl / drip, the coach crowd / vendor), off
// solids and stairs, and kept inside the floor you can walk on. Settings → "Forget me" erases it.
import * as THREE from './three.module.min.js';

// floor objects anomalies show, per chapter (kept clear of the outline by at least the outline's own size)
const KEEP = { 1: ['feet', 'puddle', 'hands', 'bench3', 'shadow', 'vendor2'], 2: ['sandals', 'bowl', 'beggar', 'beggar2', 'drip', 'cobbler'], 3: ['crowd', 'vendor', 'newspaper'] };
const R = 1.15; // half-size of the outline on the floor (m)
const _b = new THREE.Box3(), _c = new THREE.Box3();

function chalkTex(variant) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  let s = 1234 + variant * 77; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  // the smear: a faint dragged smudge under the shoulders
  g.save(); g.translate(128, 128); g.rotate(-0.5 + variant * 0.4); const sm = g.createRadialGradient(10, -30, 4, 10, -30, 70); sm.addColorStop(0, 'rgba(235,232,220,0.22)'); sm.addColorStop(1, 'rgba(235,232,220,0)'); g.fillStyle = sm; g.scale(1.6, 0.6); g.beginPath(); g.arc(10, -30, 70, 0, Math.PI * 2); g.fill(); g.restore();
  // the outline: a sprawled body (head, shoulders, one arm out, one bent, legs apart), traced in several rough chalk passes
  const P = [[0, -92], [16, -86], [20, -70], [14, -58], [34, -54], [62, -66], [86, -60], [88, -50], [64, -46], [40, -36], [36, -10], [40, 18], [58, 52], [70, 86], [60, 92], [46, 60], [24, 30], [8, 26], [-6, 32], [-14, 66], [-12, 98], [-26, 98], [-30, 64], [-28, 20], [-34, -6], [-44, -26], [-70, -14], [-82, 6], [-94, 0], [-80, -24], [-52, -46], [-30, -56], [-16, -58], [-20, -72], [-14, -88]];
  const flip = variant % 2 ? -1 : 1, rot = [0.2, -0.35, 0.6][variant % 3];
  g.translate(128, 128); g.rotate(rot); g.scale(flip * 1.05, 1.05); g.lineCap = 'round'; g.lineJoin = 'round';
  for (let pass = 0; pass < 4; pass++) {
    g.strokeStyle = `rgba(240,238,228,${0.5 + r() * 0.25})`; g.lineWidth = 3.4 + r() * 2.4; g.beginPath();
    P.forEach(([x, y], i) => { const jx = x + (r() - 0.5) * 3.5, jy = y + (r() - 0.5) * 3.5; i ? g.lineTo(jx, jy) : g.moveTo(jx, jy); }); g.closePath(); g.stroke();
  }
  // chalk dust specks along the line
  g.fillStyle = 'rgba(240,238,228,0.35)'; for (let i = 0; i < 160; i++) { const [x, y] = P[(r() * P.length) | 0]; g.fillRect(x + (r() - 0.5) * 9, y + (r() - 0.5) * 9, 1.4, 1.4); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2; return t;
}

export class Chalk {
  constructor(F) { this.F = F; this.mesh = null; this.texs = {}; this.shown = false; }
  get save() { return this.F.A.save; }
  // keep-out boxes (floor footprint, grown by the outline's size) of the chapter's anomaly floor objects, visible or not
  keepOut(CH) {
    const out = [];
    for (const k of KEEP[CH.id] || []) { const o = CH[k]; if (!o) continue; for (const m of Array.isArray(o) ? o : [o]) { if (!m || !m.isObject3D) continue;
      m.updateMatrixWorld(true); _b.makeEmpty(); m.traverse(x => { if (x.isMesh && x.geometry) { if (!x.geometry.boundingBox) x.geometry.computeBoundingBox(); _c.copy(x.geometry.boundingBox).applyMatrix4(x.matrixWorld); _b.union(_c); } });
      if (!_b.isEmpty()) out.push({ x0: _b.min.x - R, x1: _b.max.x + R, z0: _b.min.z - R, z1: _b.max.z + R, k }); } }
    if (CH.id === 1 && CH.suitcaseHome) out.push({ x0: -2.2 - R, x1: -0.9 + R, z0: -18.9 - R, z1: -17.7 + R, k: 'suitcase_moved' }); // where the moved suitcase goes
    if (CH.id === 1) out.push({ x0: 1.55 - R * 0.3, x1: 9, z0: -60, z1: 20, k: 'edge' }); // the platform edge strip (hands, footprints going over)
    return out;
  }
  ok(CH, x, z) {
    const B = CH.bounds; if (x < B.x0 + 0.3 || x > B.x1 - 0.3 || z < B.z0 + 0.3 || z > B.z1 - 0.3) return false;
    if (CH.walk && !CH.walk(x, z)) return false;
    for (const s of CH.solids) if (x > s.x0 - 0.45 && x < s.x1 + 0.45 && z > s.z0 - 0.45 && z < s.z1 + 0.45) return false;
    const y = CH.floorY ? CH.floorY(x, z) : 0; for (const [dx, dz] of [[R, 0], [-R, 0], [0, R], [0, -R]]) { if (CH.walk && !CH.walk(x + dx * 0.8, z + dz * 0.8)) return false; if (CH.floorY && Math.abs(CH.floorY(x + dx * 0.8, z + dz * 0.8) - y) > 0.03) return false; }
    return true;
  }
  spotFor(CH, x, z) {
    const ko = this.keepOut(CH), free = (x, z) => !ko.some(b => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) && this.ok(CH, x, z);
    if (free(x, z)) return [x, z];
    let best = null, bd = 1e9;
    for (let r = 0.3; r <= 7; r += 0.3) for (let a = 0; a < 16; a++) { const nx = x + Math.cos(a / 16 * Math.PI * 2) * r, nz = z + Math.sin(a / 16 * Math.PI * 2) * r; if (free(nx, nz)) { const d = Math.hypot(nx - x, nz - z); if (d < bd) { bd = d; best = [nx, nz]; } } if (best) break; }
    return best;
  }
  // G.die: remember where you fell (the newest death replaces the old one)
  record(CH, progress, p, cause) {
    if (!CH || !this.save) return null;
    const sp = this.spotFor(CH, p.x, p.z); if (!sp) { this.F.G.chalkLog = (this.F.G.chalkLog || []).concat([{ skipped: true, ch: CH.id, x: p.x, z: p.z }]); return null; }
    const v = ({ train: 2, chase: 1, stranger: 0, tc: 1, ghost: 0 })[cause] ?? 0;
    const c = this.save.chalk = { ch: CH.id, pf: Math.min(8, progress | 0), x: +sp[0].toFixed(3), z: +sp[1].toFixed(3), yaw: +(p.yaw || 0).toFixed(3), v, cause, at: Date.now(), from: [+p.x.toFixed(2), +p.z.toFixed(2)] };
    this.save.chalkSeen = false; this.F.A.writeSave && this.F.A.writeSave(); return c;
  }
  forget() { if (!this.save) return; delete this.save.chalk; this.save.chalkSeen = false; this.F.A.writeSave && this.F.A.writeSave(); if (this.mesh) this.mesh.visible = false; this.shown = false; }
  build(CH, v) {
    if (!this.mesh) { const m = new THREE.MeshStandardMaterial({ map: null, transparent: true, depthWrite: false, roughness: 1, metalness: 0, color: 0xd8d5ca, emissive: 0x5c5a52, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), m); this.mesh.rotation.order = 'YXZ'; this.mesh.userData.noBatch = true; this.mesh.userData.noCollide = true; this.mesh.userData.chalk = true; this.mesh.renderOrder = 1; this.mesh.receiveShadow = true; }
    const m = this.mesh.material, tex = this.texs[v] || (this.texs[v] = chalkTex(v)); if (m.map !== tex) { m.map = tex; m.emissiveMap = tex; m.needsUpdate = true; } // emissive: chalk reads in the dark too
    if (this.mesh.parent !== CH.root) CH.root.add(this.mesh); return this.mesh;
  }
  onLoop(CH, progress) {
    const c = this.save && this.save.chalk; this.CH = CH; this.hintArmed = false;
    if (!c || c.ch !== CH.id || c.pf !== Math.min(8, progress | 0) || CH.dawn) { if (this.mesh) this.mesh.visible = false; this.shown = false; return; }
    const m = this.build(CH, c.v || 0); m.position.set(c.x, (CH.floorY ? CH.floorY(c.x, c.z) : 0) + 0.006, c.z); m.rotation.set(-Math.PI / 2, 0, 0); m.rotation.y = c.yaw; m.rotation.order = 'YXZ';
    m.rotation.set(-Math.PI / 2, c.yaw, 0, 'YXZ'); m.visible = true; this.shown = true; this.hintArmed = !this.save.chalkSeen;
  }
  update(dt, p) {
    if (!this.shown || !this.hintArmed) return; const G = this.F.G; if (G.state !== 'playing' || G.transitioning) return;
    { const s = document.getElementById('sub'); if (s && s.classList.contains('show')) return; } // never talk over a PA line (it may be the clue)
    const m = this.mesh, dx = m.position.x - p.x, dz = m.position.z - p.z, d = Math.hypot(dx, dz); if (d > 7 || d < 0.6) return;
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw); if ((dx * fx + dz * fz) / d < 0.6) return;
    this.hintArmed = false; this.save.chalkSeen = true; this.F.A.writeSave && this.F.A.writeSave();
    this.F.A.showSub('Chalk on the floor, drawn around a body. Around where you fell.', 4200, true);
  }
  info() { return { save: this.save && this.save.chalk || null, shown: this.shown, pos: this.mesh && this.mesh.visible ? [this.mesh.position.x, this.mesh.position.z] : null }; }
}
