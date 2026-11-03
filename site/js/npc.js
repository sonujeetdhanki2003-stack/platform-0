// PLATFORM 0 v3.0.1 — NPC navigation: waypoint paths that stay inside walkable space, smooth turning (heading eases toward
// the next waypoint and the body faces its motion), stride-matched walk clips, and a collision guard against the
// chapter's solids / walkable area so nobody clips through walls, pillars, benches, the stall, the train or the bridge rails.
import * as THREE from './three.module.min.js';
import { animateWalk } from './props.js';
const _v = new THREE.Vector3();
// is the NPC on screen (any of feet / chest / head inside the view)?
export function inView(h, cam) { if (!cam) return false; for (const y of [0.2, 1.0, 1.6]) { _v.set(h.position.x, h.position.y + y, h.position.z).project(cam); if (_v.z < 1 && Math.abs(_v.x) < 1.05 && Math.abs(_v.y) < 1.05) return true; } return false; }

export const NPC_R = 0.24; // body radius used for NPC clearance
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// is (x,z) clear for a body of radius r in chapter CH? (solids + walkable area / bounds)
export function clearAt(CH, x, z, r = NPC_R) {
  const B = CH.walkBounds || CH.bounds;
  if (B && (x < B.x0 - 1e-6 || x > B.x1 + 1e-6 || z < B.z0 - 1e-6 || z > B.z1 + 1e-6)) return false;
  if (CH.walk && !CH.walk(x, z)) return false;
  for (const s of CH.solids) { const cx = Math.max(s.x0, Math.min(s.x1, x)), cz = Math.max(s.z0, Math.min(s.z1, z)); if ((x - cx) ** 2 + (z - cz) ** 2 < (r - 0.01) ** 2) return false; }
  return true;
}
// push a point out of solids (same rule as the player's collision)
export function pushOut(CH, x, z, r = NPC_R) {
  for (let it = 0; it < 3; it++) for (const s of CH.solids) {
    const cx = Math.max(s.x0, Math.min(s.x1, x)), cz = Math.max(s.z0, Math.min(s.z1, z)), dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) { if (d2 > 1e-8) { const d = Math.sqrt(d2); x = cx + dx / d * r; z = cz + dz / d * r; }
      else { const o = [[s.x0 - r - x, 0], [s.x1 + r - x, 0], [0, s.z0 - r - z], [0, s.z1 + r - z]].sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1])); x += o[0][0]; z += o[0][1]; } }
  }
  return [x, z];
}
// a straight segment is walkable if sampled points along it are clear
export function segmentClear(CH, a, b, r = NPC_R) { const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1)); for (let i = 0; i <= n; i++) { const k = i / n; if (!clearAt(CH, a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, r)) return false; } return true; }

// start an NPC on a path ([[x,z],...]); o: { speed, back (walk facing backwards), turn (rad/s), avoid (player) }
export function setPath(h, path, o = {}) {
  const n = h.userData.nav = { path, i: 0, speed: o.speed || 1.2, back: !!o.back, turn: o.turn || 4.0, avoid: o.avoid !== false, done: false, wait: 0 };
  h.position.x = path[0][0]; h.position.z = path[0][1]; n.i = 1;
  const t = path[1] || path[0]; n.heading = Math.atan2(t[0] - path[0][0], t[1] - path[0][1]);
  h.rotation.y = n.heading + (n.back ? Math.PI : 0);
  return n;
}
// advance one step; returns true when the path is finished
export function stepPath(h, CH, dt, p, floorY) {
  const n = h.userData.nav; if (!n || n.done) return true;
  const tgt = n.path[n.i]; let dx = tgt[0] - h.position.x, dz = tgt[1] - h.position.z, d = Math.hypot(dx, dz);
  const last = n.i === n.path.length - 1;
  if (d < (last ? 0.12 : 0.45)) { if (last) { n.done = true; return true; } n.i++; return stepPath(h, CH, dt, p, floorY); }
  // look a little ahead: blend the next waypoint in as we get close (rounds the corners)
  let want = Math.atan2(dx, dz);
  if (!last && d < 1.2) { const nx = n.path[n.i + 1]; const w2 = Math.atan2(nx[0] - tgt[0], nx[1] - tgt[1]); want = want + wrap(w2 - want) * (1 - d / 1.2) * 0.5; }
  // keep a polite distance from the player: step round them on the side with more room, wait if there is no way past
  let sp = n.speed;
  if (n.avoid && p) { const px = p.x - h.position.x, pz = p.z - h.position.z, pd = Math.hypot(px, pz);
    const hx = Math.sin(want), hz = Math.cos(want), ahead = px * hx + pz * hz, lat = px * hz - pz * hx;
    if (pd < 1.8 && ahead > -0.1 && Math.abs(lat) < 0.75) {
      if (n.side === undefined || pd > 1.6) { const l = [hz, -hx], here = [h.position.x, h.position.z], tryS = (s) => { for (const o of [0.75, 0.58]) { const dpt = [p.x - l[0] * o * s, p.z - l[1] * o * s], past = [dpt[0] + hx * 1.0, dpt[1] + hz * 1.0]; if (segmentClear(CH, here, dpt) && segmentClear(CH, dpt, past)) return o; } return 0; };
        const a = tryS(1), b = tryS(-1); n.side = a && b ? (lat > 0 ? 1 : -1) : a ? 1 : b ? -1 : 0; n.off = n.side > 0 ? a : n.side < 0 ? b : 0; }
      if (n.side) { const l = [hz, -hx], tx = p.x - l[0] * n.off * n.side, tz = p.z - l[1] * n.off * n.side; want = Math.atan2(tx - h.position.x, tz - h.position.z); sp *= pd < 0.5 ? 0 : 0.7; }
      else sp *= Math.max(0, (pd - 0.6) / 1.2);
    } else if (pd > 2) n.side = undefined; }
  // smooth turn: the heading eases toward the wanted direction at a capped rate, and he slows through tight turns
  const diff = wrap(want - n.heading), maxT = n.turn * dt; n.heading = wrap(n.heading + Math.max(-maxT, Math.min(maxT, diff)));
  sp *= 0.35 + 0.65 * Math.max(0, Math.cos(Math.min(Math.PI / 2, Math.abs(diff))));
  let step = Math.min(sp * dt, d);
  let nx = h.position.x + Math.sin(n.heading) * step, nz = h.position.z + Math.cos(n.heading) * step;
  // collision guard: never step into a solid or off the walkable area
  if (!clearAt(CH, nx, nz)) { [nx, nz] = pushOut(CH, nx, nz); if (!clearAt(CH, nx, nz)) { nx = h.position.x; nz = h.position.z; step = 0; } }
  const moved = Math.hypot(nx - h.position.x, nz - h.position.z);
  h.position.x = nx; h.position.z = nz; if (floorY) h.position.y = floorY(nx, nz);
  h.rotation.y = n.heading + (n.back ? Math.PI : 0);
  const v = moved / Math.max(dt, 1e-4);
  if (v > 0.08) animateWalk(h, dt, v, n.back ? -1 : 1);
  n.speedNow = v;
  return false;
}
