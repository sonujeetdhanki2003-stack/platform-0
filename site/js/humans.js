// PLATFORM 0 v3 — realistic rigged humans (Microsoft Rocketbox avatars, MIT) with idle/sit/walk clips.
// makeRealHuman() returns a Group with the same userData API the capsule rig had (head/upper/armL/armR/legL/legR/eyes/mats),
// so every anomaly keeps working: proxy rotations are applied to the matching bones on top of the playing clip.
import * as THREE from './three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/meshopt_decoder.module.js';
import * as SkeletonUtils from './vendor/SkeletonUtils.js';
import { fetchAsset, forget } from './assets.js';
import * as M from './mats.js';

export const AVATARS = ['Male_Adult_02', 'Male_Adult_15', 'Male_Adult_05', 'Male_Adult_04', 'Male_Adult_10', 'Male_Adult_13', 'Male_Adult_17', 'Male_Adult_20', 'Male_Adult_18', 'Male_Adult_12', 'Female_Adult_06', 'Female_Adult_09', 'Female_Adult_14'];
export const YOU = 'Male_Adult_02', VENDOR = 'Male_Adult_15', BEGGAR = 'Male_Adult_18', SHADE = 'Male_Adult_12';
const POOL = ['Male_Adult_04', 'Male_Adult_10', 'Male_Adult_13', 'Male_Adult_17', 'Male_Adult_20', 'Female_Adult_06', 'Male_Adult_05', 'Female_Adult_09', 'Female_Adult_14'];
export const HUM = { on: false, av: {}, clips: {}, live: [], seatH: {}, stride: {}, pose: {}, err: null, used: new Set() };
const YOU_SHIRT = 0xe2e0d6;

// v3.1.1: avatars load per chapter (the first chapter's people first, the rest in the background); phones get the light versions
// (models/l/: half-res textures, ~60% of the triangles). makeRig falls back to a loaded body if one is asked for before it arrives.
let MODEL_DIR = 'models/';
export function setModelTier(t) { MODEL_DIR = t === 'l' ? 'models/l/' : 'models/'; }
export const avatarFile = (n) => MODEL_DIR + 'av_' + n + '.glb';
let LOADER = null;
const parseGLB = async (p) => { if (!LOADER) { LOADER = new GLTFLoader(); LOADER.setMeshoptDecoder(MeshoptDecoder); } const b = await fetchAsset(p); const g = await LOADER.parseAsync(b, ''); forget(p); return g; };
function prepAvatar(n, gltf) {
  const s = gltf.scene;
  s.traverse(o => {
    if (!o.isMesh) return;
    o.frustumCulled = false; o.castShadow = true; o.receiveShadow = false;
    const m = o.material; if (/NOTEX/.test(m.name)) { o.visible = false; return; }
    m.envMapIntensity = 0.35; m.roughness = /head/.test(m.name) ? 0.55 : 0.85; m.metalness = 0;
    if (m.map) m.map.anisotropy = 4;
    if (/opacity/.test(m.name)) { m.alphaTest = 0.45; m.transparent = false; m.side = THREE.DoubleSide; m.roughness = 0.7; }
  });
  // v3.1.1 (phones): real frustum culling for people (they were drawn even when behind you): a padded bind-pose sphere per body
  if (MODEL_DIR === 'models/l/') { s.updateMatrixWorld(true); s.traverse(o => { if (o.isSkinnedMesh && o.visible) { try { o.computeBoundingSphere(); o.boundingSphere.radius *= 1.6; o.frustumCulled = true; } catch (e) { o.frustumCulled = false; } } }); }
  HUM.av[n] = s;
}
const avP = {};
export function loadAvatars(list) { return Promise.all(list.map(n => avP[n] || (avP[n] = parseGLB(avatarFile(n)).then(g => prepAvatar(n, g)).catch(e => { delete avP[n]; console.warn('avatar', n, e && e.message); })))); }
export async function loadHumans(list = AVATARS) {
  try {
    const [anims] = await Promise.all([parseGLB('models/anims.glb'), loadAvatars(Array.from(new Set([YOU, ...list])))]);
    for (const c of anims.animations) {
      c.tracks = c.tracks.filter(t => !/Footsteps/.test(t.name));
      for (const t of c.tracks) t.name = t.name.replace(/_\d+\.(position|quaternion|scale)$/, '.$1');
      // v3.0.1: walk/run clips carry root motion (Bip01 moves ~1.2 m forward per cycle, then snaps back on loop):
      // strip the forward drift so the clip walks in place, and remember the stride speed so code can match it
      if (/walk|run/.test(c.name)) { const rt = c.tracks.find(t => t.name === 'Bip01.position');
        if (rt) { const v = rt.values, tm = rt.times, n = tm.length, z0 = v[2], dz = v[3 * n - 1] - z0, x0 = v[0], dx = v[3 * n - 3] - x0, T = tm[n - 1] - tm[0] || 1;
          for (let i = 0; i < n; i++) { const k = (tm[i] - tm[0]) / T; v[3 * i + 2] -= z0 + dz * k; v[3 * i] -= x0 + dx * k; }
          HUM.stride[c.name] = Math.hypot(dx, dz) / (c.duration || T); } }
      HUM.clips[c.name] = c;
    }
    if (!HUM.av[YOU]) throw new Error('base avatar missing');
    // seat height of each sit clip (pelvis height above the root when sitting)
    const probe = SkeletonUtils.clone(HUM.av[YOU]); const mx = new THREE.AnimationMixer(probe); const pel = probe.getObjectByName('Bip01_Pelvis'), v = new THREE.Vector3();
    for (const k of Object.keys(HUM.clips).filter(k => /sit_chair|crouch/.test(k))) { mx.stopAllAction(); mx.clipAction(HUM.clips[k]).play(); mx.update(0); probe.updateMatrixWorld(true); pel.getWorldPosition(v); HUM.seatH[k] = v.y; }
    // v3.0.2: per-clip pose stats over the whole loop (mean pelvis height, lowest toe / ankle) so seated and crouching people
    // are placed on the seat / floor instead of sinking into them (all Rocketbox rigs share the same skeleton proportions)
    for (const k of Object.keys(HUM.clips).filter(k => /sit_chair|crouch/.test(k))) {
      const C = HUM.clips[k]; mx.stopAllAction(); mx.clipAction(C).play(); let P = 0, toe = 9, ank = 9; const K = 16;
      for (let i = 0; i < K; i++) { mx.setTime(C.duration * i / K); probe.updateMatrixWorld(true); pel.getWorldPosition(v); P += v.y / K;
        for (const s of ['L', 'R']) { probe.getObjectByName('Bip01_' + s + '_Toe0').getWorldPosition(v); toe = Math.min(toe, v.y); probe.getObjectByName('Bip01_' + s + '_Foot').getWorldPosition(v); ank = Math.min(ank, v.y); } }
      HUM.pose[k] = { P, toe, ank };
    }
    mx.stopAllAction();
    HUM.on = true;
  } catch (e) { HUM.err = String(e && e.message || e); console.warn('humans: falling back to simple figures', HUM.err); }
}

function pick(o) {
  if (o.av) return o.av;
  if (o.backpack) return YOU;
  if (o.lungi) return VENDOR;
  if (o.eyes === 'white' && !o.pale) return SHADE;
  if (o.shawl) return BEGGAR;
  const k = ((o.shirt ?? 0) ^ ((o.pants ?? 0) * 7) ^ ((o.skin ?? 0) * 13)) >>> 0;
  return POOL[k % POOL.length];
}
const fem = (n) => /^Female/.test(n);
function clipFor(av, kind, o = {}) {
  const f = fem(av), C = HUM.clips;
  const pickK = (list) => list.find(k => C[k]) || 'm_idle_neutral_01';
  if (kind === 'walk') return f ? 'f_walk_neutral_01' : 'm_walk_neutral_01';
  if (kind === 'run') return 'm_run_fast_01';
  if (kind === 'sit') return f ? pickK(['f_sit_chair_breathe_01']) : (o.sleep ? 'm_sit_chair_breathe_01' : 'm_sit_chair_idle_neutral_01');
  if (kind === 'crouch') return 'm_crouch_idle';
  if (o.idle && C[o.idle]) return o.idle;
  if (f) return 'f_idle_neutral_01';
  if (av === YOU) return 'm_headphones_idle';
  if (av === SHADE) return 'm_idle_breathe_01';
  const L = ['m_idle_neutral_01', 'm_idle_neutral_02', 'm_idle_look_around_01', 'm_cell_phone_textmessage', 'm_newspaper_hand_idle'];
  return L[(Math.random() * L.length) | 0];
}

const BONES = { head: 'Bip01_Head', upper: 'Bip01_Spine', armL: 'Bip01_L_UpperArm', armR: 'Bip01_R_UpperArm', legL: 'Bip01_L_Thigh', legR: 'Bip01_R_Thigh' };
const ANCHOR = { head: 'Bip01_Head', upper: 'Bip01_Pelvis', armL: 'Bip01_L_UpperArm', armR: 'Bip01_R_UpperArm', legL: 'Bip01_L_Thigh', legR: 'Bip01_R_Thigh' };

// v3.0.2: hand props for the clips that hold something (they used to mime with empty hands): built in bind pose from the hand's
// own frame (F = toward the middle finger, S = toward the index side, N = palm normal) and parented to the hand bone.
let PROPM = null;
function handProps(rig, o = {}) {
  if (!PROPM) PROPM = { phone: M.std(0x111214, 0.35, 0.6), screen: new THREE.MeshStandardMaterial({ color: 0x0a0c10, emissive: 0x9ab8e0, emissiveIntensity: 0.55, roughness: 0.2 }),
    paper: M.std(0xd8d2c0, 0.9), ink: M.std(0x8a8678, 0.9), glass: new THREE.MeshStandardMaterial({ color: 0xc8d4d8, roughness: 0.08, transparent: true, opacity: 0.55 }), chai: M.std(0xa8682e, 0.35), bag: M.std(0x6a5a3a, 0.95), strap: M.std(0x3a3226, 0.9) };
  const P = PROPM; rig.root.updateMatrixWorld(true);
  const frame = (s) => { const b = (n) => rig.bones['Bip01_' + s + '_' + n].getWorldPosition(new THREE.Vector3()); const h = b('Hand'), F = b('Finger2').sub(h).normalize(), S = b('Finger1').sub(b('Finger4')); S.addScaledVector(F, -S.dot(F)).normalize();
    const N = new THREE.Vector3().crossVectors(F, S); if (N.dot(b('Finger02').sub(h)) < 0) N.negate(); return { h, F, S, N, s }; };
  const put = (fr, obj, off, X, Y, Z) => { const m = new THREE.Matrix4().makeBasis(X, Y, Z); obj.quaternion.setFromRotationMatrix(m); obj.position.copy(fr.h).addScaledVector(fr.F, off[0]).addScaledVector(fr.N, off[1]).addScaledVector(fr.S, off[2]);
    rig.root.add(obj); obj.updateMatrixWorld(true); rig.bones['Bip01_' + fr.s + '_Hand'].attach(obj); obj.visible = false; obj.traverse(x => { if (x.isMesh) { x.castShadow = true; x.userData.handProp = 1; } }); return obj; };
  const R = frame('R'), out = {};
  { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.145, 0.009), P.phone); g.add(body); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.062, 0.128), P.screen); sc.position.z = 0.0048; g.add(sc);
    const X = R.S.clone(), Y = R.F.clone(), Z = R.N.clone().negate(); X.crossVectors(Y, Z); out.m_cell_phone_textmessage = out.f_cell_phone_textmessage = put(R, g, [0.065, 0.028, 0], X, Y, Z); }
  if (!P.print) { const c = document.createElement('canvas'); c.width = 128; c.height = 192; const x = c.getContext('2d'); x.fillStyle = '#d8d2c0'; x.fillRect(0, 0, 128, 192); x.fillStyle = '#2a2826'; x.fillRect(8, 8, 112, 16);
    for (let col = 0; col < 3; col++) for (let r = 0; r < 26; r++) { if (r > 3 && r < 9 && col < 2) continue; x.fillStyle = 'rgba(40,38,36,' + (0.35 + Math.random() * 0.3) + ')'; x.fillRect(8 + col * 38, 32 + r * 6, 32 - (r % 7 === 6 ? 14 : 0), 3); }
    x.fillStyle = '#6a6660'; x.fillRect(8, 56, 70, 30); P.print = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), roughness: 0.9 }); P.print.map.colorSpace = THREE.SRGBColorSpace; }
  { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.012), P.paper); g.add(p); for (const sd of [1, -1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.29), P.print); f.position.z = sd * 0.0065; if (sd < 0) f.rotation.y = Math.PI; g.add(f); }
    const Y = R.F.clone().negate(), Z = R.N.clone(), X = new THREE.Vector3().crossVectors(Y, Z); out.m_newspaper_hand_idle = put(R, g, [0.2, 0.02, 0], X, Y, Z); }
  { const g = new THREE.Group(); const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.024, 0.085, 12, 1, true), P.glass); g.add(gl); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.06, 12), P.chai); c.position.y = -0.011; g.add(c);
    const Y = R.S.clone(), Z = R.N.clone(), X = new THREE.Vector3().crossVectors(Y, Z); out.m_drink_idle = put(R, g, [0.065, 0.045, -0.005], X, Y, Z); }
  { const g = new THREE.Group();
    if (o.carry === 'kettle') { // the train chai-wallah's aluminium kettle, hanging from its handle
      const st = M.std(0xc8c8c8, 0.25, 1); const k = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.22, 14), st); k.position.y = -0.2; g.add(k); const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.04, 12), st); lid.position.y = -0.07; g.add(lid);
      const hdl = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 6, 14, Math.PI), M.std(0x222222, 0.6)); hdl.position.y = -0.06; g.add(hdl); const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.14, 6), st); sp.position.set(0.14, -0.2, 0); sp.rotation.z = -0.9; g.add(sp);
    } else { const bag = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.08), P.bag); bag.position.y = -0.2; g.add(bag); for (const x of [-0.06, 0.06]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.1, 0.01), P.strap); s.position.set(x, -0.04, 0); s.rotation.z = x > 0 ? -0.4 : 0.4; g.add(s); } }
    const Y = new THREE.Vector3(0, 1, 0), Z = R.N.clone(); Z.y = 0; Z.normalize(); const X = new THREE.Vector3().crossVectors(Y, Z); out.m_hold_bag_idle = put(R, g, [0.07, 0.0, 0], X, Y, Z); out.m_hold_bag_idle.userData.hang = 1; }
  return out;
}

function makeRig(av, o) {
  if (!HUM.av[av]) { const alt = (fem(av) ? Object.keys(HUM.av).find(fem) : null) || YOU; console.warn('avatar not loaded yet', av, '->', alt); HUM.missing = (HUM.missing || 0) + 1; av = alt; }
  HUM.used.add(av);
  const root = SkeletonUtils.clone(HUM.av[av]);
  const meshes = []; root.traverse(x => { if (x.isMesh) meshes.push(x); });
  if (o.bodyTint) for (const m of meshes) if (/body/.test(m.material.name)) { m.material = m.material.clone(); m.material.color.setHex(o.bodyTint); } // v3.0.1: tone down a too-bright outfit (the chai vendor's kurta)
  if (o.tint || o.pale) for (const m of meshes) { m.material = m.material.clone(); if (o.tint) m.material.color.setHex(o.tint); if (o.pale) paleify(m.material); }
  const bones = {}; root.traverse(x => { if (x.isBone || /^Bip01/.test(x.name)) bones[x.name] = x; });
  const mixer = new THREE.AnimationMixer(root);
  root.updateMatrixWorld(true);
  const rig = { av, root, meshes, bones, mixer, actions: {}, cur: null, bindQ: {} };
  for (const n in bones) if (/Finger/.test(n)) rig.bindQ[n] = bones[n].quaternion.clone();
  if (!o.noProps) rig.props = handProps(rig, o);
  return rig;
}
function paleify(m) {
  m.color.setHex(0xd8dcd8);
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\nfloat lum = dot(diffuseColor.rgb, vec3(0.3,0.59,0.11)); diffuseColor.rgb = mix(vec3(lum), diffuseColor.rgb, 0.12) * vec3(0.95,1.0,0.97) * 1.25;'); };
  m.customProgramCacheKey = () => 'pale';
}
function play(rig, name, fade = 0.35, rate = 1) {
  const C = HUM.clips[name] || HUM.clips.m_idle_neutral_01; if (!C) return;
  let a = rig.actions[name]; if (!a) { a = rig.actions[name] = rig.mixer.clipAction(C); }
  if (rig.cur === a) { a.timeScale = rate; return; }
  a.reset(); a.timeScale = rate; a.enabled = true; a.setEffectiveWeight(1);
  if (!rig.cur) { a.time = Math.random() * C.duration; a.play(); }
  else { a.play(); rig.cur.crossFadeTo(a, fade, false); }
  rig.cur = a;
}

// world placement helper: put an object at an avatar-space position (bind pose) then parent it to a bone
function attachAt(rig, bone, obj, x, y, z) { rig.root.updateMatrixWorld(true); obj.position.set(x, y, z); rig.root.add(obj); obj.updateMatrixWorld(true); rig.bones[bone].attach(obj); return obj; }

function extras(rig, o, u) {
  const out = [];
  // eyes on the eye bones (hidden unless glowing): anomalies scale / recolour them
  const eyeMat = o.eyes === 'white' ? new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5, 5), fog: false, toneMapped: false }) : M.basic(0x050403);
  const eg = new THREE.SphereGeometry(0.014, 10, 8);
  const eyes = [['Bip01_REye', -1], ['Bip01_LEye', 1]].map(([b]) => {
    const e = new THREE.Mesh(eg, eyeMat); const bw = new THREE.Vector3(); rig.root.updateMatrixWorld(true); rig.bones[b].getWorldPosition(bw); rig.root.worldToLocal(bw);
    attachAt(rig, b, e, bw.x, bw.y, bw.z + 0.012); e.visible = o.eyes === 'white'; e.scale.z = 0.5; return e;
  });
  const H = rig.bones.Bip01_Head; const hp = new THREE.Vector3(); H.getWorldPosition(hp); rig.root.worldToLocal(hp);
  if (o.backpack) {
    const red = M.std(0xa3121b, 0.78), dark = M.std(0x6e0b12, 0.85), strap = M.std(0x1c1c1c, 0.8);
    const bp = new THREE.Group(); bp.userData.isBackpack = 1;
    const body = new THREE.Mesh(new (u.RBG)(0.32, 0.44, 0.17, 3, 0.06), red); bp.add(body);
    const pocket = new THREE.Mesh(new (u.RBG)(0.24, 0.17, 0.07, 2, 0.03), dark); pocket.position.set(0, -0.09, -0.1); bp.add(pocket);
    const top = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 12, Math.PI), strap); top.position.set(0, 0.23, 0); bp.add(top);
    for (const x of [-0.1, 0.1]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.46, 0.012), strap); s.position.set(x, 0.0, 0.095); bp.add(s); }
    bp.traverse(m => { if (m.isMesh) m.castShadow = true; });
    attachAt(rig, 'Bip01_Spine2', bp, 0, hp.y - 0.37, -0.23);
    const marker = new THREE.Object3D(); marker.userData.backpack = 1;
    Object.defineProperty(marker, 'visible', { get: () => bp.visible, set: (v) => { bp.visible = v; } });
    out.push(['upper', marker]); out.push(['_bp', bp]);
  }
  if (o.headphones) {
    const hm = M.std(0x161616, 0.4, 0.3); const hg = new THREE.Group();
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.011, 6, 18, Math.PI), hm); band.position.y = 0.0; hg.add(band);
    for (const x of [-0.094, 0.094]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.03, 14), hm); c.rotation.z = Math.PI / 2; c.position.set(x, -0.06, 0); hg.add(c); }
    attachAt(rig, 'Bip01_Head', hg, 0, hp.y + 0.07, hp.z + 0.0);
  }
  if (o.cap) { // v3.0.2: a boat-shaped topi sitting on the crown (the old flat cylinder looked like a chef's hat and hair poked through its top)
    const cg = new THREE.BoxGeometry(0.14, 0.06, 0.235, 2, 1, 4); const p = cg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i); if (y > 0) p.setX(i, p.getX(i) * 0.4); p.setY(i, y + (Math.abs(z) / 0.1175) ** 2 * 0.012); } cg.computeVertexNormals();
    const c = new THREE.Mesh(cg, M.std(o.cap, 0.85)); attachAt(rig, 'Bip01_Head', c, 0, hp.y + 0.195, hp.z - 0.005); }
  return { eyes, out };
}

export function makeRealHuman(o = {}, RBG) {
  const av = pick(o);
  const g = new THREE.Group();
  const P = () => { const p = new THREE.Group(); g.add(p); return p; };
  const u = { legL: P(), legR: P(), armL: P(), armR: P(), head: P(), upper: P(), phase: 0, real: true, opts: o, RBG };
  u.legL.userData.knee = new THREE.Object3D(); u.legR.userData.knee = new THREE.Object3D();
  const rig = makeRig(av, o); g.add(rig.root);
  const ex = extras(rig, o, u);
  u.eyes = ex.eyes; u.torso = u.upper; u.skull = u.head;
  for (const [k, ob] of ex.out) if (k === 'upper') u.upper.add(ob);
  u.rig = rig; u.rigs = [rig]; u.av = av; u.base = 'idle'; u.baseClip = clipFor(av, 'idle', o); u.walkReq = 0; u.walkRate = 1;
  u.mats = {
    shirt: { color: { setHex: (h) => setLook(g, h === YOU_SHIRT && av !== YOU), getHex: () => 0 } },
    skin: { color: new THREE.Color() }, pants: { color: new THREE.Color() },
  };
  g.userData = u;
  play(rig, u.baseClip, 0);
  HUM.live.push(g);
  return g;
}
// "everyone looks like you": swap to a second rig wearing the backpack man's body (same clip + time)
function setLook(g, you) {
  const u = g.userData;
  if (you) {
    if (!u.youRig) { u.youRig = makeRig(YOU, {}); g.add(u.youRig.root); u.rigs.push(u.youRig); }
    if (u.rig === u.youRig) return;
    const t = u.rig.cur ? u.rig.cur.time : 0; u.rig.root.visible = false; u.rig = u.youRig; u.rig.root.visible = true; play(u.rig, u.baseClip, 0); if (u.rig.cur) u.rig.cur.time = t; u.rig.mixer.update(0); u.rig.root.updateMatrixWorld(true); // v3.1.1: posed at once (no bind-pose frame)
  } else if (u.youRig && u.rig === u.youRig) { u.youRig.root.visible = false; u.rig = u.rigs[0]; u.rig.root.visible = true; }
}

// v3.0.1: the clip is picked by speed and played at speed / its own stride speed, so the feet plant instead of sliding
export function walkClipFor(av, speed) {
  const f = fem(av), C = HUM.clips;
  if (speed > 2.4 && C.m_run_fast_01) return 'm_run_fast_01';
  if (!f && speed < 0.95 && C.m_walk_slow_01) return 'm_walk_slow_01';
  return clipFor(av, 'walk');
}
export function realWalk(h, dt, speed, dir) {
  const u = h.userData; u.walkReq = 0.2; const clip = walkClipFor(u.av, speed); u.walkClip = clip;
  const nat = HUM.stride[clip] || 1.1; u.walkRate = Math.max(0.3, Math.min(2.4, speed / nat)) * (dir < 0 ? -1 : 1); u.phase += dt * speed * 5.2 * dir; }
export function realStill(h) { const u = h.userData; zero(u); u.base = 'idle'; u.baseClip = clipFor(u.av, 'idle', u.opts); }
export function realSit(h, seatY) {
  const u = h.userData; zero(u);
  const crouch = seatY < 0.3; u.base = crouch ? 'crouch' : 'sit'; u.baseClip = clipFor(u.av, u.base, Object.assign({}, u.opts, { sleep: u.sleep }));
  for (const r of u.rigs) play(r, u.baseClip, 0);
  // v3.0.2: the pelvis joint sits ~11 cm above the cushion (it used to be 2 cm, so hips, thighs and hands sank into the seat);
  // a croucher's toes rest on the floor (they were 7 cm under it). Feet that would still go through the floor are lifted by leg IK.
  const ps = HUM.pose[u.baseClip] || { P: HUM.seatH[u.baseClip] ?? 0.5, toe: 0, ank: 0.08 };
  u.sitY = crouch ? (u.opts.floorY || 0) - ps.toe + 0.014 : seatY + 0.115 - ps.P; h.position.y = u.sitY; u.sitting = true; u.seatY = seatY;
  u.plantFloor = crouch ? (u.opts.floorY || 0) : 0; u.touchBones = (u.touchBones || []).concat(legBones(u.rig));
  for (const r of u.rigs) r.touch = null;
}
const legBones = (rig) => ['L', 'R'].flatMap(s => ['Calf', 'Foot', 'Toe0'].map(n => rig.bones['Bip01_' + s + '_' + n])).filter(Boolean);

// ---------- v3.0.2: two-bone IK (analytic, world space) ----------
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _t = new THREE.Vector3(), _d = new THREE.Vector3(), _w = new THREE.Vector3(), _n = new THREE.Vector3(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qr = new THREE.Quaternion();
function rotWorld(bone, q) { bone.getWorldQuaternion(_qa); bone.parent.getWorldQuaternion(_qb); bone.quaternion.copy(_qb.invert().multiply(q).multiply(_qa)); bone.updateMatrixWorld(true); }
// a = upper joint, b = middle joint, c = end joint; target = world point for c; pole = world point the middle joint should bend toward
export function ik2(a, b, c, target, pole) {
  a.getWorldPosition(_a); b.getWorldPosition(_b); c.getWorldPosition(_c); _t.copy(target);
  const lab = _a.distanceTo(_b), lcb = _b.distanceTo(_c); const lat = Math.max(0.01, Math.min(lab + lcb - 1e-3, _a.distanceTo(_t)));
  // 1. middle joint angle
  const want = Math.acos(Math.max(-1, Math.min(1, (lab * lab + lcb * lcb - lat * lat) / (2 * lab * lcb))));
  const u = _d.subVectors(_a, _b).normalize(); const cb = _w.subVectors(_c, _b).normalize();
  let perp = _n.copy(cb).addScaledVector(u, -cb.dot(u)); if (perp.lengthSq() < 1e-6 && pole) perp.subVectors(pole, _b).addScaledVector(u, -_t.subVectors(pole, _b).dot(u)); perp.normalize();
  const nd = u.clone().multiplyScalar(Math.cos(want)).addScaledVector(perp, Math.sin(want)).normalize();
  rotWorld(b, _qr.setFromUnitVectors(cb.clone(), nd));
  // 2. swing the chain onto the target
  c.getWorldPosition(_c); a.getWorldPosition(_a);
  rotWorld(a, _qr.setFromUnitVectors(_d.subVectors(_c, _a).normalize(), _w.subVectors(target, _a).normalize()));
  // 3. twist about the a->target axis so the middle joint points at the pole
  if (pole) { a.getWorldPosition(_a); b.getWorldPosition(_b); const ax = _d.subVectors(target, _a).normalize();
    const v1 = _w.subVectors(_b, _a); v1.addScaledVector(ax, -v1.dot(ax)); const v2 = _n.subVectors(pole, _a); v2.addScaledVector(ax, -v2.dot(ax));
    if (v1.lengthSq() > 1e-8 && v2.lengthSq() > 1e-8) { v1.normalize(); v2.normalize(); let ang = Math.acos(Math.max(-1, Math.min(1, v1.dot(v2)))); if (_t.crossVectors(v1, v2).dot(ax) < 0) ang = -ang; rotWorld(a, _qr.setFromAxisAngle(ax, ang)); } }
}
// orient a hand so its fingers point along `fwd` and the index side faces `side` (both world, unit) — palm down when side points to the body's midline
const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4();
export function orientHand(rig, s, fwd, side) {
  const hand = rig.bones['Bip01_' + s + '_Hand'], f2 = rig.bones['Bip01_' + s + '_Finger2'], f1 = rig.bones['Bip01_' + s + '_Finger1'], f4 = rig.bones['Bip01_' + s + '_Finger4']; if (!hand || !f2 || !f1 || !f4) return;
  hand.getWorldPosition(_a); f2.getWorldPosition(_b); f1.getWorldPosition(_c); f4.getWorldPosition(_t);
  const F = _b.sub(_a).normalize(), S = _c.sub(_t); S.addScaledVector(F, -S.dot(F)).normalize(); const N = new THREE.Vector3().crossVectors(F, S);
  const Fd = fwd.clone().normalize(), Sd = side.clone(); Sd.addScaledVector(Fd, -Sd.dot(Fd)).normalize(); const Nd = new THREE.Vector3().crossVectors(Fd, Sd);
  _m1.makeBasis(F, S, N); _m2.makeBasis(Fd, Sd, Nd); _m2.multiply(_m1.transpose()); rotWorld(hand, _qr.setFromRotationMatrix(_m2));
}
// seated people: lift a foot that would go through the floor (keeps the clip's foot angle)
const _fq = new THREE.Quaternion(), _pole = new THREE.Vector3(), _tg = new THREE.Vector3(), _fl = new THREE.Vector3();
function plantFeet(g, rig, floorLocal) {
  _fl.set(0, floorLocal, 0); g.parent.localToWorld(_fl); const fy = _fl.y;
  for (const s of ['L', 'R']) {
    const th = rig.bones['Bip01_' + s + '_Thigh'], ca = rig.bones['Bip01_' + s + '_Calf'], ft = rig.bones['Bip01_' + s + '_Foot'], to = rig.bones['Bip01_' + s + '_Toe0']; if (!th || !ca || !ft || !to) continue;
    ft.getWorldPosition(_tg); to.getWorldPosition(_c); const dy = Math.max(fy + 0.075 - _tg.y, fy + 0.018 - _c.y, 0); if (dy <= 0) continue;
    ft.getWorldQuaternion(_fq); ca.getWorldPosition(_pole); th.getWorldPosition(_a); _pole.sub(_a).multiplyScalar(2).add(_a); _pole.y += 0.3;
    _tg.y += dy; ik2(th, ca, ft, _tg, _pole);
    ft.getWorldQuaternion(_qa); rotWorld(ft, _qr.copy(_fq).multiply(_qa.invert()));
  }
}
function zero(u) { for (const k of ['legL', 'legR', 'armL', 'armR', 'upper', 'head']) u[k].rotation.set(0, 0, 0); }

const _q = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _qg = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _v = new THREE.Vector3(), _e = new THREE.Euler();
function chainVisible(o) { while (o) { if (!o.visible) return false; if (o.isScene) return true; o = o.parent; } return false; }
// v3.1.1 animation LOD (Low): people off screen don't animate at all (their clock keeps running), far ones every 2nd / 4th frame
const _fr = new THREE.Frustum(), _fm = new THREE.Matrix4(), _sph = new THREE.Sphere(), _lp = new THREE.Vector3();
export function updateHumans(dt0) {
  if (!HUM.on) return;
  const lod = HUM.lod && HUM.cam && !HUM.lodOff; let cp = null;
  if (lod) { const c = HUM.cam; _fm.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse); _fr.setFromProjectionMatrix(_fm); cp = c.position; HUM.lodSkipped = 0; }
  for (const g of HUM.live) {
    if (!chainVisible(g)) continue;
    const u = g.userData, rig = u.rig;
    if (u.selfDrive) continue; // v3.2: the third-person player drives its own mixer (tp.js)
    let dt = dt0;
    if (lod && !u.stopMotion && !u.post && !u.noLod) {
      g.getWorldPosition(_lp); _sph.center.copy(_lp); _sph.center.y += 0.9; _sph.radius = 1.4;
      const d = _lp.distanceTo(cp), step = !_fr.intersectsSphere(_sph) ? 0 : d > 16 ? 4 : d > 9 ? 2 : 1;
      u._lodAcc = (u._lodAcc || 0) + dt0; u._lodN = (u._lodN || 0) + 1;
      if (step === 0 || u._lodN % step) { if (u.walkReq > 0) u.walkReq -= dt0; HUM.lodSkipped++; continue; }
      dt = Math.min(u._lodAcc, 1); u._lodAcc = 0;
    }
    // re-target sleepers (sleep flag can be set after creation)
    if (u.base === 'sit' && u.sleep !== u._sl) { u._sl = u.sleep; const c = clipFor(u.av, 'sit', Object.assign({}, u.opts, { sleep: u.sleep })); if (c !== u.baseClip) { u.baseClip = c; const ps2 = HUM.pose[c]; if (ps2 && u.seatY !== undefined) { u.sitY = u.seatY + 0.115 - ps2.P; g.position.y = u.sitY; } } }
    let want = u.baseClip, rate = u.opts.rate || 1;
    if (u.walkReq > 0) { u.walkReq -= dt; want = u.walkClip || clipFor(u.av, 'walk'); rate = u.walkRate; }
    // v3.0.1: three's mixer only writes a bone when its sampled value changes, so on a frozen / held pose the offsets added below
    // would pile up frame after frame (the ghost's head and hair spun off). Restore the clean pose first, then let the clip write.
    if (!rig.touch) { rig.touch = Object.values(BONES).map(n => rig.bones[n]).filter(Boolean).concat(u.touchBones || []); rig.clean = rig.touch.map(b => [b.quaternion.clone(), b.scale.clone()]); }
    else for (let i = 0; i < rig.touch.length; i++) { rig.touch[i].quaternion.copy(rig.clean[i][0]); rig.touch[i].scale.copy(rig.clean[i][1]); }
    play(rig, want, 0.3, rate);
    // stop-motion (the ghost): the pose only advances in discrete snaps
    if (u.stopMotion) { u._smAcc = (u._smAcc || 0) + dt; if (u._smAcc >= u.stopMotion) { rig.mixer.update(u._smAcc); u._smAcc = 0; } } 
    else rig.mixer.update(dt);
    for (let i = 0; i < rig.touch.length; i++) { rig.clean[i][0].copy(rig.touch[i].quaternion); rig.clean[i][1].copy(rig.touch[i].scale); }
    g.updateMatrixWorld(true);
    g.getWorldQuaternion(_qg); _qi.copy(_qg).invert();
    for (const k in BONES) {
      const p = u[k].rotation; if (p.x === 0 && p.y === 0 && p.z === 0) continue;
      const b = rig.bones[BONES[k]]; if (!b) continue;
      b.parent.getWorldQuaternion(_q); _q.premultiply(_qi);           // parent orientation in body space
      _qp.setFromEuler(p);                                            // delta in body space
      const qpar = _q.clone(); b.quaternion.premultiply(_qp.premultiply(qpar.clone().invert()).multiply(qpar)); // local = par^-1 * dp * par * local
    }
    rig.root.updateMatrixWorld(true);
    if (u.post) { u.post(dt, rig); rig.root.updateMatrixWorld(true); }
    if (u.plantFloor !== undefined && u.base !== 'idle' && g.parent) plantFeet(g, rig, u.plantFloor); // v3.0.2
    if (u.ik) u.ik(rig, dt); // v3.0.2: per-character IK (the chai vendor's hands on the counter)
    if (rig.props) for (const k in rig.props) { const pr = rig.props[k]; pr.visible = !!(rig.cur && rig.cur._clip.name === k && !u.noProps); // v3.0.2: hand props follow the playing clip
      if (pr.visible && pr.userData.hang) { g.getWorldQuaternion(_qg); pr.parent.getWorldQuaternion(_q); pr.quaternion.copy(_q.invert().multiply(_qg)); pr.updateMatrixWorld(true); } }
    for (const k in ANCHOR) { const b = rig.bones[ANCHOR[k]]; if (!b) continue; b.getWorldPosition(_v); g.worldToLocal(_v); u[k].position.copy(_v); }
  }
}

// ---------- v3.0.2: the chai vendor leans on his counter (hands planted on the top, the right one wiping it with a rag) ----------
// topY = counter surface height in the parent's space. Everything is solved per frame from his live shoulders, so the idle clip's
// sway and the stare anomaly's head turn keep working and his hands never go into the wood.
export function leanOnCounter(h, topY, o = {}) {
  const u = h.userData; if (!u.real) return; const rig = u.rig;
  const arm = ['L', 'R'].flatMap(s => ['Forearm', 'Hand', ...[0, 1, 2, 3, 4].flatMap(i => ['Finger' + i, 'Finger' + i + '1', 'Finger' + i + '2'])].map(n => rig.bones['Bip01_' + s + '_' + n])).filter(Boolean);
  u.touchBones = (u.touchBones || []).concat(arm); rig.touch = null;
  u.counter = { topY, t: Math.random() * 10, wipe: o.wipe !== false, lat: o.lat ?? 0.2, reach: o.reach ?? 0.88 };
  // rag under the right palm
  rig.root.updateMatrixWorld(true);
  { const b = (n) => rig.bones['Bip01_R_' + n].getWorldPosition(new THREE.Vector3()); const hp = b('Hand'), F = b('Finger2').sub(hp).normalize(), S = b('Finger1').sub(b('Finger4')); S.addScaledVector(F, -S.dot(F)).normalize();
    const N = new THREE.Vector3().crossVectors(F, S); if (N.dot(b('Finger02').sub(hp)) < 0) N.negate();
    const rag = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, 0.008), M.std(0x8a7a62, 0.95)); const X = S.clone(), Z = N.clone(), Y = new THREE.Vector3().crossVectors(Z, X);
    rag.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); rag.position.copy(hp).addScaledVector(F, 0.07).addScaledVector(N, 0.028); rig.root.add(rag); rag.updateMatrixWorld(true); rig.bones.Bip01_R_Hand.attach(rag); rag.castShadow = true; u.rag = rag; }
  u.ik = (rig, dt) => counterIK(h, rig, dt);
}
const _cv = { up: new THREE.Vector3(0, 1, 0), f: new THREE.Vector3(), l: new THREE.Vector3(), root: new THREE.Vector3(), ua: new THREE.Vector3(), fa: new THREE.Vector3(), hd: new THREE.Vector3(), tg: new THREE.Vector3(), pole: new THREE.Vector3(), top: new THREE.Vector3(), fw: new THREE.Vector3(), sd: new THREE.Vector3() };
function counterIK(h, rig, dt) {
  const u = h.userData, c = u.counter, V = _cv; c.t += dt;
  h.getWorldQuaternion(_qg); V.f.set(0, 0, 1).applyQuaternion(_qg); V.f.y = 0; V.f.normalize(); V.l.set(1, 0, 0).applyQuaternion(_qg); V.l.y = 0; V.l.normalize(); h.getWorldPosition(V.root);
  V.top.set(0, c.topY, 0); h.parent.localToWorld(V.top);
  // wipe: slow circles on the counter for a few seconds, then rest
  const on = c.wipe ? Math.max(0, Math.sin(c.t * 0.33)) : 0, wl = Math.sin(c.t * 2.3) * 0.07 * on, wf = Math.cos(c.t * 2.3) * 0.035 * on;
  for (const s of ['L', 'R']) {
    const sg = s === 'L' ? 1 : -1, UA = rig.bones['Bip01_' + s + '_UpperArm'], FA = rig.bones['Bip01_' + s + '_Forearm'], HD = rig.bones['Bip01_' + s + '_Hand']; if (!UA || !FA || !HD) continue;
    UA.getWorldPosition(V.ua); FA.getWorldPosition(V.fa); HD.getWorldPosition(V.hd); const len = V.ua.distanceTo(V.fa) + V.fa.distanceTo(V.hd);
    const hy = V.top.y + 0.045, lat = c.lat * sg + (s === 'R' ? wl : 0);
    // lateral offset of the shoulder from the body line, and forward reach that keeps the elbow softly bent
    const uaLat = V.tg.subVectors(V.ua, V.root).dot(V.l), uaF = V.tg.subVectors(V.ua, V.root).dot(V.f);
    const dy = V.ua.y - hy, dx = lat - uaLat, R2 = Math.pow(len * c.reach, 2) - dy * dy - dx * dx; const fwd = uaF + Math.sqrt(Math.max(0.0025, R2)) + (s === 'R' ? wf - 0.035 * on : 0);
    V.tg.copy(V.root).addScaledVector(V.l, lat).addScaledVector(V.f, fwd); V.tg.y = hy;
    V.pole.copy(V.ua).addScaledVector(V.l, sg * 0.45).addScaledVector(V.f, -0.25); V.pole.y -= 0.35;
    ik2(UA, FA, HD, V.tg, V.pole);
    // relax the fingers toward flat, then lay the hand palm-down, fingers forward and a little inward
    for (const k in rig.bindQ) if (k.startsWith('Bip01_' + s + '_')) rig.bones[k].quaternion.slerp(rig.bindQ[k], /Finger0/.test(k) ? 0.3 : 0.65);
    rig.bones['Bip01_' + s + '_Hand'].updateMatrixWorld(true);
    V.fw.copy(V.f).addScaledVector(V.l, -sg * 0.35); V.fw.y = -0.12; V.fw.normalize(); V.sd.copy(V.l).multiplyScalar(-sg);
    orientHand(rig, s, V.fw, V.sd);
  }
}
