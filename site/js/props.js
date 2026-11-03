// PLATFORM 0 v2 — props: humans, lamps, benches, fans, stall, train, signage
import * as THREE from './three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import * as M from './mats.js';
import { HUM, makeRealHuman, realWalk, realStill, realSit } from './humans.js';
import { hasProp, prop } from './models.js';

export function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (parent) parent.add(m); return m; }
export function rbox(w, h, d, r, mat, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), mat); m.position.set(x, y, z); if (parent) parent.add(m); return m; }
export function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, parent, seg = 12) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); if (parent) parent.add(m); return m; }
export function plane(w, h, mat, parent) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); if (parent) parent.add(m); return m; }
export function shadows(obj, cast = true, recv = true) { obj.traverse(o => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = recv; } }); return obj; }

// ---------- human (smooth capsules, not blocks) ----------
const capCache = {};
function cap(r, len, mat) { const k = r + '_' + len; if (!capCache[k]) capCache[k] = new THREE.CapsuleGeometry(r, len, 4, 10); return new THREE.Mesh(capCache[k], mat); }
export function makeHuman(o = {}) {
  if (HUM.on && !o.simple) return makeRealHuman(o, RoundedBoxGeometry);
  return makeCapsuleHuman(o);
}
export function makeCapsuleHuman(o = {}) {
  const g = new THREE.Group();
  const skin = M.std(o.skin ?? 0x8a5a3c, 0.62), shirt = M.std(o.shirt ?? 0xd8d8d0, 0.92), pants = M.std(o.pants ?? 0x3c3c46, 0.9);
  const shoe = M.std(o.shoes ?? 0x141210, 0.6), hairM = M.std(o.hair ?? 0x0c0a08, 0.75);
  const legL = new THREE.Group(), legR = new THREE.Group(); legL.position.set(-0.1, 0.9, 0); legR.position.set(0.1, 0.9, 0);
  for (const leg of [legL, legR]) {
    const th = cap(0.078, 0.36, pants); th.position.y = -0.22; leg.add(th);
    const knee = new THREE.Group(); knee.position.y = -0.42; leg.add(knee); leg.userData.knee = knee;
    const sh = cap(0.064, 0.36, pants); sh.position.y = -0.2; knee.add(sh);
    if (o.lungi) { th.visible = false; sh.material = skin; sh.scale.set(0.8, 1, 0.8); }
    const f = rbox(0.11, 0.08, 0.26, 0.035, shoe, 0, -0.44, 0.05, knee);
    if (o.barefoot) f.material = skin;
  }
  g.add(legL, legR);
  if (o.lungi) { const lg = cyl(0.2, 0.25, 0.8, pants, 0, 0.5, 0, g, 14); lg.scale.z = 0.8; }
  const upper = new THREE.Group(); upper.position.y = 0.92; g.add(upper);
  const pelvis = cap(0.15, 0.12, pants); pelvis.rotation.z = Math.PI / 2; pelvis.scale.set(1, 1, 0.7); pelvis.position.y = 0.02; upper.add(pelvis);
  const torso = cap(0.17, 0.34, shirt); torso.scale.set(1.12, 1, 0.68); torso.position.y = 0.33; upper.add(torso);
  const shoulders = cap(0.085, 0.3, shirt); shoulders.rotation.z = Math.PI / 2; shoulders.position.y = 0.55; upper.add(shoulders);
  const armL = new THREE.Group(), armR = new THREE.Group(); armL.position.set(-0.24, 0.56, 0); armR.position.set(0.24, 0.56, 0);
  for (const arm of [armL, armR]) {
    const ua = cap(0.055, 0.24, shirt); ua.position.y = -0.15; arm.add(ua);
    const fa = cap(0.045, 0.24, o.sleeves === 'short' ? skin : shirt); fa.position.y = -0.43; arm.add(fa);
    const hd = cap(0.045, 0.06, skin); hd.position.y = -0.62; hd.scale.set(1, 1, 0.6); arm.add(hd);
  }
  upper.add(armL, armR);
  const head = new THREE.Group(); head.position.set(0, 0.62, 0); upper.add(head);
  const neck = cyl(0.045, 0.05, 0.12, skin, 0, 0.04, 0, head, 8);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.112, 20, 16), skin); skull.scale.set(0.8, 1.1, 1.0); skull.position.y = 0.2; head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), skin); jaw.scale.set(0.84, 0.8, 1.0); jaw.position.set(0, 0.13, 0.015); head.add(jaw);
  const nose = cyl(0.008, 0.018, 0.045, skin, 0, 0.19, 0.105, head, 6); nose.rotation.x = 0.3;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.118, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM); hair.scale.set(0.83, 1.1, 1.04); hair.position.set(0, 0.215, -0.008); hair.rotation.x = -0.25; head.add(hair);
  const eyeMat = o.eyes === 'white' ? new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5, 5), fog: false, toneMapped: false }) : M.basic(0x050403);
  const eyes = [-0.038, 0.038].map(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), eyeMat); e.position.set(x, 0.215, 0.098); e.scale.z = 0.5; head.add(e); return e; });
  const brow = box(0.1, 0.012, 0.02, hairM, 0, 0.245, 0.1, head);
  const mouth = box(0.04, 0.006, 0.01, M.basic(0x2a1410), 0, 0.135, 0.095, head);
  if (o.backpack) { const bp = rbox(0.34, 0.44, 0.17, 0.05, M.std(0xb3121b, 0.75), 0, 0.33, -0.19, upper); bp.userData.backpack = 1; rbox(0.24, 0.16, 0.06, 0.03, M.std(0x8a0d14, 0.8), 0, 0.22, -0.29, upper);
    for (const x of [-0.12, 0.12]) box(0.035, 0.42, 0.02, M.std(0x222222, 0.8), x, 0.34, 0.1, upper); }
  if (o.headphones) {
    const hm = M.std(0x1a1a1a, 0.4, 0.3);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.102, 0.01, 6, 16, Math.PI), hm); band.position.y = 0.215; head.add(band);
    for (const x of [-0.096, 0.096]) { const c = cyl(0.034, 0.034, 0.028, hm, x, 0.2, 0, head, 12); c.rotation.z = Math.PI / 2; }
  }
  if (o.cap) { cyl(0.105, 0.108, 0.05, M.std(o.cap, 0.8), 0, 0.3, 0, head, 14); }
  if (o.shawl) { const sh = cap(0.22, 0.4, M.std(o.shawl, 0.95)); sh.scale.set(1.15, 1, 0.85); sh.position.y = 0.35; upper.add(sh); const hood = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), M.std(o.shawl, 0.95)); hood.position.y = 0.21; hood.scale.set(1, 1.15, 1.1); head.add(hood); }
  if (o.mustache) box(0.06, 0.012, 0.015, hairM, 0, 0.16, 0.1, head);
  g.userData = { legL, legR, armL, armR, head, torso, upper, eyes, skull, phase: 0, mats: { skin, shirt, pants } };
  return g;
}
export function animateWalk(h, dt, speed, dir = 1) {
  if (h.userData.real) return realWalk(h, dt, speed, dir);
  const u = h.userData; u.phase += dt * speed * 5.2 * dir;
  const s = Math.sin(u.phase) * 0.5 * Math.min(1, speed);
  u.legL.rotation.x = s; u.legR.rotation.x = -s; u.armL.rotation.x = -s * 0.7; u.armR.rotation.x = s * 0.7;
  u.upper.position.y = 0.92 + Math.abs(Math.cos(u.phase)) * 0.025;
}
export function stillPose(h) { const u = h.userData; if (u.real) return realStill(h); u.legL.rotation.x = u.legR.rotation.x = u.armL.rotation.x = u.armR.rotation.x = 0; u.upper.position.y = 0.92; u.upper.rotation.set(0, 0, 0); }
export function sitPose(h, seatY = 0.45, bend = true) {
  const u = h.userData; if (u.real) return realSit(h, seatY); stillPose(h);
  u.legL.rotation.x = u.legR.rotation.x = -Math.PI / 2 + 0.05;
  if (bend) { u.legL.userData.knee.rotation.x = u.legR.userData.knee.rotation.x = Math.PI / 2 - 0.1; }
  u.armL.rotation.x = u.armR.rotation.x = -0.5; u.armL.rotation.z = 0.1; u.armR.rotation.z = -0.1;
  h.userData.sitY = seatY - 0.92 + 0.06; h.position.y = h.userData.sitY; h.userData.sitting = true;
}

// ---------- lamps (tube light fixtures): emissive tube + baked floor light pool + optional volumetric cone ----------
const coneMatBase = () => new THREE.ShaderMaterial({
  uniforms: { color: { value: new THREE.Color(0xe8f0d8) }, k: { value: 0.12 } },
  vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = position.y; vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
  fragmentShader: 'uniform vec3 color; uniform float k; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(vN, vV)), 1.5); float a = smoothstep(-0.5, 0.5, vY) * f * k; gl_FragColor = vec4(color * a, 1.0); }',
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
});
export function makeLamp(parent, x, y, z, o = {}) {
  const color = new THREE.Color(o.color ?? 0xe8f0d8);
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const len = o.len ?? 1.25, rotY = o.rotY ?? 0;
  const fix = new THREE.Group(); fix.rotation.y = rotY; g.add(fix);
  box(0.11, 0.05, len + 0.1, M.std(0xb8b8ae, 0.5, 0.2), 0, 0.03, 0, fix);
  const tubeMat = M.emissive(color, 3.2);
  const tube = cyl(0.022, 0.022, len, tubeMat, 0, -0.01, 0, fix, 8); tube.rotation.x = Math.PI / 2;
  if (o.hang) { box(0.012, o.hang, 0.012, M.std(0x222222, 0.6), 0, o.hang / 2 + 0.05, -len * 0.35, fix); box(0.012, o.hang, 0.012, M.std(0x222222, 0.6), 0, o.hang / 2 + 0.05, len * 0.35, fix); }
  // light pool on the floor (fake baked lighting, visible even where no real light is assigned)
  const floorY = o.floorY ?? 0;
  const poolMat = new THREE.MeshBasicMaterial({ map: M.radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 128), color: color.clone().multiplyScalar(0.16), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const pp = o.poolParent || parent; const pool = plane(o.poolW ?? 5, o.poolD ?? 6, poolMat, pp); pool.rotation.x = -Math.PI / 2; pool.position.set(x + (o.poolX || 0), floorY + 0.015, z + (o.poolZ || 0)); pool.renderOrder = 2;
  let cone = null;
  if (o.cone !== false) {
    const h = y - floorY;
    const cm = coneMatBase(); cm.uniforms.color.value = color.clone();
    cone = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 1.6, h, 16, 1, true), cm); cone.position.set(x, floorY + h / 2, z); cone.userData.isCone = true; pp.add(cone);
  }
  const lamp = {
    g, x, y, z, color, level: 1, base: 1, power: o.power ?? 9, dist: o.dist ?? 13, prio: o.prio || 0, tube, tubeMat, pool, poolMat, cone, on: true,
    baseColor: color.clone(),
    apply() {
      const L = Math.max(0, this.level);
      this.tubeMat.emissiveIntensity = 3.2 * L; this.tubeMat.emissive.copy(this.color);
      this.poolMat.color.copy(this.color).multiplyScalar(0.16 * L);
      if (this.cone) { this.cone.material.uniforms.color.value.copy(this.color); this.cone.material.uniforms.k.value = 0.11 * L; }
    },
    setColor(hex) { this.color.setHex(hex); },
    reset() { this.color.copy(this.baseColor); this.level = this.base; this.on = true; this.apply(); },
  };
  return lamp;
}

// ---------- ceiling fan ----------
export function makeFan(parent, x, y, z, rod = 0.6) {
  const f = new THREE.Group(); f.position.set(x, y, z); parent.add(f);
  const metal = M.std(0x6a6458, 0.55, 0.4);
  cyl(0.015, 0.015, rod, M.std(0x2a2a2a, 0.5, 0.5), 0, rod / 2, 0, f, 6);
  const hub = new THREE.Group(); f.add(hub);
  if (hasProp('ceiling_fan')) { const m = prop('ceiling_fan', { w: 1.35, keepOrigin: true }); const bb = new THREE.Box3().setFromObject(m); m.position.y = rod + 0.02 - bb.max.y; hub.add(m); f.userData.hub = hub; return f; } // v3: the model's mount sits at the ceiling (it used to hang a whole down-rod too low)
  cyl(0.12, 0.09, 0.1, metal, 0, 0, 0, hub, 16); cyl(0.05, 0.05, 0.04, metal, 0, -0.07, 0, hub, 10);
  const bladeM = M.std(0xa89878, 0.7, 0.1);
  for (let i = 0; i < 3; i++) { const pv = new THREE.Group(); pv.rotation.y = i * Math.PI * 2 / 3; hub.add(pv); const bl = rbox(0.62, 0.012, 0.13, 0.005, bladeM, 0.42, -0.005, 0, pv); bl.rotation.x = 0.08; box(0.14, 0.02, 0.03, metal, 0.12, 0, 0, pv); }
  f.userData.hub = hub; return f;
}

// ---------- benches ----------
export function makeBench(parent, x, z, rotY = 0, len = 1.8) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g);
  if (hasProp('painted_wooden_bench')) {
    const b = prop('painted_wooden_bench', { s: 1 }); const sx = len / b.userData.size.x; b.scale.set(sx, 1.0, 1.08); b.rotation.y = Math.PI / 2; b.position.x = -0.02; g.add(b); /* v3.0.2: was -PI/2, so every bench faced the wall (backrest toward the platform, seat against the wall) */
    const sb = M.shadowBlob(0.9, len + 0.4, 0.6); sb.position.set(0, 0.012, 0); g.add(sb); shadows(b); return g;
  }
  const iron = M.std(0x2b3134, 0.55, 0.6);
  const wood = M.pbr('wood', { rep: [1, 0.2], color: 0x9a8a72 });
  for (let i = 0; i < 4; i++) rbox(0.11, 0.035, len, 0.012, wood, -0.2 + i * 0.125, 0.46, 0, g);
  for (let i = 0; i < 3; i++) { const s = rbox(0.1, 0.035, len, 0.012, wood, -0.28, 0.62 + i * 0.13, 0, g); s.rotation.z = -0.2; }
  for (const dz of [-len / 2 + 0.12, len / 2 - 0.12]) {
    box(0.05, 0.46, 0.05, iron, -0.2, 0.23, dz, g); box(0.05, 0.46, 0.05, iron, 0.22, 0.23, dz, g);
    box(0.5, 0.04, 0.05, iron, 0, 0.43, dz, g); const b = box(0.04, 0.5, 0.05, iron, -0.3, 0.72, dz, g); b.rotation.z = -0.2;
  }
  const sb = M.shadowBlob(0.9, len + 0.4, 0.6); sb.position.set(0, 0.012, 0); g.add(sb);
  shadows(g); sb.castShadow = false;
  return g;
}

// ---------- canvas signage ----------
export function nameBoard(en, hi, o = {}) { // Indian Railways yellow station board: Hindi above English
  const c = M.canvas(1024, 256), g = c.getContext('2d');
  g.fillStyle = o.bg || '#f2c613'; g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = '#111'; g.lineWidth = 10; g.strokeRect(10, 10, 1004, 236);
  g.fillStyle = o.fg || '#111'; g.textAlign = 'center'; g.textBaseline = 'middle';
  M.fitText(g, hi, `700 #px ${M.DEVA}`, 940, 104); g.fillText(hi, 512, 84);
  M.fitText(g, en, `900 #px ${M.SANS}`, 940, 92); g.fillText(en, 512, 186);
  M.grime(g, 1024, 256, o.grime ?? 0.6, o.seed || 4);
  return c;
}
const _signs = new Map();
export function platformSign(n, exit, o = {}) { // v3.1.1: drawn once per number (it was redrawn twice on every loop: a visible hitch on phones)
  const key = n + '|' + !!exit + '|' + JSON.stringify(o); if (_signs.has(key)) return _signs.get(key); const c = platformSign0(n, exit, o); _signs.set(key, c); return c;
}
function platformSign0(n, exit, o = {}) {
  const deva = '०१२३४५६७८९';
  const c = M.canvas(1024, 256), g = c.getContext('2d');
  g.fillStyle = exit ? '#1d7a3c' : '#f2c613'; g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = exit ? '#e8ffe8' : '#111'; g.lineWidth = 10; g.strokeRect(10, 10, 1004, 236);
  g.fillStyle = exit ? '#ffffff' : '#111'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const label = o.label || ['PLATFORM', 'प्लेटफ़ॉर्म'];
  if (exit) { g.font = `900 92px ${M.SANS}`; g.fillText(o.exitEn || 'EXIT  →', 512, 168); g.font = `700 76px ${M.DEVA}`; g.fillText(o.exitHi || 'निकास', 512, 72); }
  else {
    g.font = `700 70px ${M.DEVA}`; g.fillText(label[1] + ' ' + deva[n % 10], 330, 74);
    g.font = `900 88px ${M.SANS}`; g.fillText(label[0], 330, 178);
    g.font = `900 210px ${M.SANS}`; g.fillText(String(n), 850, 140);
    g.fillRect(690, 30, 8, 196);
  }
  M.grime(g, 1024, 256, 0.5, 6 + n);
  return c;
}
export function panelTex(lines, o = {}) { // generic notice/sign: lines = [[text, sizePx, font('deva'|'sans'), color], ...]
  const W = o.w || 512, H = o.h || 512, c = M.canvas(W, H), g = c.getContext('2d');
  g.fillStyle = o.bg || '#e9e2cc'; g.fillRect(0, 0, W, H);
  if (o.border !== false) { g.strokeStyle = o.borderColor || '#222'; g.lineWidth = o.bw || 8; g.strokeRect(6, 6, W - 12, H - 12); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let y = o.top || 50;
  for (const [t, s, f, col, gap] of lines) { g.fillStyle = col || o.fg || '#151515'; M.fitText(g, t, `${f === 'deva' ? 700 : 900} #px ${f === 'deva' ? M.DEVA : M.SANS}`, W - 40, s); g.fillText(t, W / 2, y + s / 2); y += s * 1.18 + (gap || 0); }
  if (o.grime !== 0) M.grime(g, W, H, o.grime ?? 0.6, o.seed || 9);
  return c;
}
export function signMesh(canvas, w, h, o = {}) {
  const t = M.ctex(canvas); t.userData.own = true;
  const mat = o.emissive ? new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: o.emissive, roughness: 0.6 }) : new THREE.MeshStandardMaterial({ map: t, roughness: o.rough ?? 0.75, metalness: 0, transparent: !!o.transparent, envMapIntensity: 0.3 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.userData.canvas = canvas; return m;
}
export function setSignCanvas(mesh, canvas) {
  const old = mesh.material.map;
  if (old && old.image === canvas) { old.needsUpdate = true; return; }
  const t = M.ctex(canvas); t.userData.own = true; mesh.material.map = t; if (mesh.material.emissiveMap) mesh.material.emissiveMap = t; mesh.material.needsUpdate = true;
  if (old && old.userData.own) old.dispose(); // signs are redrawn every loop: free the previous texture (was leaking GPU memory each loop)
}

// ---------- EMU local train (exterior) ----------
export function trainSideTex(kind) {
  const c = M.canvas(2048, 256), g = c.getContext('2d');
  if (kind === 'black') { g.fillStyle = '#050505'; g.fillRect(0, 0, 2048, 256); M.grime(g, 2048, 256, 0.6, 3); return [c, null]; }
  g.fillStyle = '#6e1a1f'; g.fillRect(0, 0, 2048, 256);            // maroon
  g.fillStyle = '#d8c79a'; g.fillRect(0, 40, 2048, 112);            // cream window band
  g.fillStyle = '#6e1a1f'; g.fillRect(0, 150, 2048, 8);
  const e = M.canvas(2048, 256), ge = e.getContext('2d'); ge.fillStyle = '#000'; ge.fillRect(0, 0, 2048, 256);
  let s = kind === 'faces' ? 77 : 13; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const doors = [300, 1700];
  for (const dx of doors) { g.fillStyle = '#140808'; g.fillRect(dx - 70, 30, 140, 226); ge.fillStyle = kind === 'faces' ? '#ff2010' : '#d8c898'; ge.fillRect(dx - 62, 40, 124, 216); g.fillStyle = '#2a1a12'; g.fillRect(dx - 62, 40, 124, 216);
    g.fillStyle = '#888'; g.fillRect(dx - 4, 60, 8, 180); }
  for (let x = 420; x < 1600; x += 120) {
    g.fillStyle = '#1a1612'; g.fillRect(x, 58, 92, 76);
    ge.fillStyle = kind === 'faces' ? '#ff2a18' : '#ffe2a0'; ge.fillRect(x + 4, 62, 84, 68);
    if (kind === 'faces' || rnd() < 0.35) { ge.fillStyle = kind === 'faces' ? '#100000' : 'rgba(60,40,20,.85)'; ge.beginPath(); ge.arc(x + 46, 92, 14, 0, 7); ge.fill(); ge.fillRect(x + 26, 104, 40, 30);
      if (kind === 'faces') { ge.fillStyle = '#fff'; ge.fillRect(x + 39, 88, 5, 4); ge.fillRect(x + 49, 88, 5, 4); } }
    ge.fillStyle = 'rgba(0,0,0,.55)'; for (let y = 64; y < 130; y += 10) ge.fillRect(x, y, 92, 3);
    g.fillStyle = 'rgba(0,0,0,.4)'; for (let y = 64; y < 130; y += 10) g.fillRect(x, y, 92, 3);
  }
  g.fillStyle = '#e9e0c0'; g.font = `700 26px ${M.SANS}`; g.fillText('WR  2 2 1 0 8 A', 1220, 196);
  M.grime(g, 2048, 256, 0.9, 5);
  return [c, e];
}
export function makeTrainExt(nCars = 4) {
  const g = new THREE.Group(); g.userData.cars = [];
  const roofM = M.pbr('roof', { rep: [8, 1], color: 0x7a7a78, rough: 1 });
  const under = M.std(0x161414, 0.8, 0.4);
  const faceM = M.std(0x5a1418, 0.6, 0.2);
  const kinds = {}; for (const k of ['normal', 'faces', 'black']) { const [c, e] = trainSideTex(k); kinds[k] = { map: M.ctex(c), em: e ? M.ctex(e) : null }; }
  g.userData.kinds = kinds;
  const sideMat = new THREE.MeshStandardMaterial({ map: kinds.normal.map, emissive: 0xffffff, emissiveMap: kinds.normal.em, emissiveIntensity: 1.6, roughness: 0.55, metalness: 0.25, envMapIntensity: 0.8 });
  g.userData.sideMat = sideMat;
  const roofShape = new THREE.Shape(); roofShape.moveTo(-1.5, 0); roofShape.quadraticCurveTo(-1.45, 0.55, 0, 0.62); roofShape.quadraticCurveTo(1.45, 0.55, 1.5, 0); roofShape.lineTo(-1.5, 0);
  for (let i = 0; i < nCars; i++) {
    const car = new THREE.Group(); car.position.z = i * 20.4; g.add(car);
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.0, 20), [faceM, faceM, faceM, faceM, faceM, faceM]); body.position.y = 1.5; car.add(body);
    for (const sx of [-1, 1]) { const sd = plane(20, 3.0, sideMat, car); sd.position.set(sx * 1.505, 1.5, 0); sd.rotation.y = sx * Math.PI / 2; }
    const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: 20, bevelEnabled: false }), roofM); roof.position.set(0, 3.0, -10); car.add(roof);
    box(2.6, 0.5, 18, under, 0, -0.2, 0, car);
    for (const bz of [-7, 7]) for (const wx of [-0.75, 0.75]) for (const wz of [-1, 1]) { const wh = cyl(0.42, 0.42, 0.12, under, wx, -0.25, bz + wz * 1.1, car, 14); wh.rotation.z = Math.PI / 2; }
    g.userData.cars.push(car);
  }
  // headlight
  const hl = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), M.emissive(0xfff2c0, 6)); hl.position.set(0, 2.6, -10.02); hl.rotation.y = Math.PI; g.add(hl);
  g.userData.setKind = (k) => { // v3.3.1: '0217' = the black train with its windows lit a cold, pale white (it read as a black hole against the night)
    if (k === '0217') { sideMat.map = kinds.black.map; sideMat.emissiveMap = kinds.normal.em; sideMat.emissiveIntensity = 1.15; sideMat.emissive.setHex(0x8fb0dc); faceM.emissive.setHex(0x1a2430); hl.material.color && hl.scale.setScalar(1.6); sideMat.needsUpdate = true; return; }
    faceM.emissive.setHex(0x000000); hl.scale.setScalar(1);
    const K = kinds[k]; sideMat.map = K.map; sideMat.emissiveMap = K.em; sideMat.emissiveIntensity = k === 'black' ? 0 : k === 'faces' ? 2.6 : 1.6; sideMat.emissive.setHex(K.em ? 0xffffff : 0x000000); sideMat.needsUpdate = true; };
  return g;
}

// ---------- particles: dust motes + rain ----------
export function makeDust(n, box3) {
  const geo = new THREE.BufferGeometry(); const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { p[i * 3] = box3.min.x + Math.random() * (box3.max.x - box3.min.x); p[i * 3 + 1] = box3.min.y + Math.random() * (box3.max.y - box3.min.y); p[i * 3 + 2] = box3.min.z + Math.random() * (box3.max.z - box3.min.z); }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const mat = new THREE.PointsMaterial({ size: 0.03, map: M.radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 32), color: 0xbfb8a0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.userData.box = box3; pts.userData.n = n;
  pts.userData.update = (dt, t) => { const a = geo.attributes.position.array, b = box3; for (let i = 0; i < n; i++) { a[i * 3] += Math.sin(t * 0.3 + i) * dt * 0.05; a[i * 3 + 1] += (Math.sin(t * 0.2 + i * 1.7) * 0.03 - 0.012) * dt; a[i * 3 + 2] += Math.cos(t * 0.25 + i) * dt * 0.05; if (a[i * 3 + 1] < b.min.y) a[i * 3 + 1] = b.max.y; } geo.attributes.position.needsUpdate = true; };
  return pts;
}
export function makeRain(n, box3, color = 0x9aa6b0) {
  const geo = new THREE.BufferGeometry(); const p = new Float32Array(n * 6), sp = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = box3.min.x + Math.random() * (box3.max.x - box3.min.x), y = box3.min.y + Math.random() * (box3.max.y - box3.min.y), z = box3.min.z + Math.random() * (box3.max.z - box3.min.z); p.set([x, y, z, x + 0.02, y - 0.35, z], i * 6); sp[i] = 9 + Math.random() * 4; }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.16, depthWrite: false });
  const L = new THREE.LineSegments(geo, mat); L.frustumCulled = false; L.userData.speedMul = 1;
  L.userData.update = (dt) => { const a = geo.attributes.position.array, b = box3, k = L.userData.speedMul; if (k === 0) return; for (let i = 0; i < n; i++) { const d = sp[i] * dt * k; a[i * 6 + 1] -= d; a[i * 6 + 4] -= d; if (a[i * 6 + 4] < b.min.y) { const y = b.max.y + Math.random() * 0.5; a[i * 6 + 1] = y; a[i * 6 + 4] = y - 0.35; } } geo.attributes.position.needsUpdate = true; };
  return L;
}

// scare face billboard (camera attached)
export function scareFacePlane(tex) { const m = plane(0.95, 0.95, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, fog: false, toneMapped: false })); m.renderOrder = 20; m.visible = false; return m; }
