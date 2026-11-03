// PLATFORM 0 v3.0.1 — the white-saree ghost (chudail), rebuilt: a Rocketbox woman (MIT) turned corpse-pale grey-blue, in a dirty, torn white
// saree with the pallu over her head, long wet black hair hanging over her face (it parts in the catch), hollow dark eye sockets with a faint
// glint that only shows in the dark, an unnaturally wide jaw, twitching clawed fingers, a broken head tilt, and stop-motion posing.
import * as THREE from './three.module.min.js';
import * as M from './mats.js';
import { WX } from './weather.js';

let R = null; // shared textures / materials (built once)
const rnd = (a, b) => a + Math.random() * (b - a);
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();

function hairTex() { // fine wet strands: full at the root, thinning out to sparse tips
  const W = 256, H = 512, c = M.canvas(W, H), g = c.getContext('2d'); g.clearRect(0, 0, W, H);
  { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(6,6,7,0.85)'); gr.addColorStop(0.6, 'rgba(6,6,7,0.55)'); gr.addColorStop(1, 'rgba(6,6,7,0)'); // the clump's body
    g.fillStyle = gr; g.beginPath(); g.moveTo(W * 0.12, 0); g.lineTo(W * 0.88, 0); g.quadraticCurveTo(W * 0.8, H * 0.6, W * 0.55, H); g.lineTo(W * 0.45, H); g.quadraticCurveTo(W * 0.2, H * 0.6, W * 0.12, 0); g.fill(); }
  for (let i = 0; i < 44; i++) {
    const x0 = rnd(4, W - 4), len = H * (Math.random() < 0.5 ? rnd(0.75, 1) : rnd(0.45, 0.8)), w = rnd(1.6, 3.4), ph = rnd(0, 6), l = rnd(3, 16) | 0;
    const gr = g.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, `rgba(${l},${l},${l + 2},1)`); gr.addColorStop(0.75, `rgba(${l},${l},${l + 2},0.95)`); gr.addColorStop(1, `rgba(${l},${l},${l + 2},0)`);
    g.strokeStyle = gr; g.lineWidth = w; g.beginPath();
    for (let y = 0; y <= len; y += 8) { const x = x0 + Math.sin(y * 0.015 + ph) * 3 + (y / H) * (W / 2 - x0) * 0.25; y ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    if (Math.random() < 0.35) { g.strokeStyle = 'rgba(150,160,175,0.4)'; g.lineWidth = 0.7; g.beginPath(); const y0 = rnd(20, 200); g.moveTo(x0 + 0.5, y0); g.lineTo(x0 + 1, y0 + rnd(40, 140)); g.stroke(); } // wet glints
  }
  const t = M.ctex(c); t.anisotropy = 8; return t;
}
function sareeTex() {
  const W = 512, H = 512, c = M.canvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#d7d3c8'; g.fillRect(0, 0, W, H);
  // weave + vertical pleat shading
  for (let x = 0; x < W; x += 2) { g.fillStyle = `rgba(0,0,0,${(0.02 + 0.03 * Math.random()).toFixed(3)})`; g.fillRect(x, 0, 1, H); }
  for (let x = 0; x < W; x += 32) { const gr = g.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, 'rgba(0,0,0,0.16)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0.16)'); g.fillStyle = gr; g.fillRect(x, 0, 32, H); }
  // a faded border stripe near the hem (old cotton saree)
  g.fillStyle = 'rgba(120,110,90,0.35)'; g.fillRect(0, H * 0.83, W, 7); g.fillRect(0, H * 0.86, W, 3);
  // stains: tea-brown, grey soot, rust; wet dark streaks running down
  for (let i = 0; i < 60; i++) { const x = rnd(0, W), y = rnd(0, H), r = rnd(6, 40), a = rnd(0.05, 0.22); const col = Math.random() < 0.5 ? '92,70,45' : Math.random() < 0.5 ? '60,60,58' : '110,60,35';
    const gr = g.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  for (let i = 0; i < 26; i++) { const x = rnd(0, W), y0 = rnd(0, H * 0.6), len = rnd(60, 260); const gr = g.createLinearGradient(0, y0, 0, y0 + len); gr.addColorStop(0, 'rgba(50,48,42,0)'); gr.addColorStop(0.3, 'rgba(50,48,42,0.16)'); gr.addColorStop(1, 'rgba(50,48,42,0)'); g.fillStyle = gr; g.fillRect(x, y0, rnd(2, 6), len); }
  // mud soaked up from the hem
  const mud = g.createLinearGradient(0, H * 0.62, 0, H); mud.addColorStop(0, 'rgba(70,52,34,0)'); mud.addColorStop(0.6, 'rgba(70,52,34,0.45)'); mud.addColorStop(1, 'rgba(45,34,22,0.8)'); g.fillStyle = mud; g.fillRect(0, H * 0.62, W, H * 0.38);
  // torn ragged hem + holes (alpha)
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.moveTo(0, H); let y = H - 8; for (let x = 0; x <= W; x += 6) { y = Math.max(H - 70, Math.min(H - 2, y + rnd(-9, 9))); if (Math.random() < 0.08) { g.lineTo(x, y - rnd(20, 60)); g.lineTo(x + 3, y); } else g.lineTo(x, y); } g.lineTo(W, H); g.closePath(); g.fill();
  for (let i = 0; i < 14; i++) { const x = rnd(0, W), yy = rnd(H * 0.55, H * 0.92), r = rnd(3, 12); g.beginPath(); for (let a = 0; a < 6.3; a += 0.6) { const rr = r * rnd(0.5, 1.3); g.lineTo(x + Math.cos(a) * rr, yy + Math.sin(a) * rr * 1.4); } g.fill(); }
  g.globalCompositeOperation = 'source-over';
  const t = M.ctex(c); t.wrapS = THREE.RepeatWrapping; return t;
}
function socketTex() { // a hollow, sunken eye socket (soft black with a bruised rim)
  const c = M.canvas(128, 96), g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 50, 2, 64, 48, 60); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.35, 'rgba(4,3,6,0.97)'); gr.addColorStop(0.62, 'rgba(30,22,34,0.6)'); gr.addColorStop(1, 'rgba(40,30,45,0)');
  g.save(); g.scale(1, 0.75); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.restore(); return M.ctex(c);
}
const GHOST_FRAG = `
  float gl = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
  vec3 gc = mix(vec3(gl), diffuseColor.rgb, 0.05) * vec3(0.78, 0.87, 0.98) * 1.18;
  float gn = gnoise(vGP * 9.0) * 0.6 + gnoise(vGP * 23.0) * 0.4;
  float stain = smoothstep(0.58, 0.82, gn) * 0.5 + smoothstep(0.55, 0.0, vGP.y) * 0.45 * (0.6 + 0.4 * gn);
  gc = mix(gc, gc * vec3(0.5, 0.44, 0.38), clamp(stain, 0.0, 0.75));
  #ifdef GHOST_HEAD
    gc *= vec3(0.9, 0.93, 0.97);
    // the pallu over her head: grimy, damp, mud-streaked cotton (not a clean dome)
    float cloth = max(smoothstep(uEL.y + 0.035, uEL.y + 0.075, vGP.y), smoothstep(0.075, 0.1, abs(vGP.x)));
    float gn2 = gnoise(vGP * 16.0) * 0.55 + gnoise(vGP * 47.0) * 0.3 + gnoise(vGP * vec3(30.0, 6.0, 30.0)) * 0.35;
    gc = mix(gc, gc * mix(vec3(0.62, 0.56, 0.48), vec3(0.8, 0.78, 0.74), smoothstep(0.35, 0.75, gn2)), cloth * 0.85);
    gc *= 1.0 - cloth * 0.18;
    // sunken, hollow eye sockets with a bruised rim; dead blue-grey lips; faint veins
    vec3 e1 = (vGP - uEL) * vec3(1.0, 1.45, 0.7), e2 = (vGP - uER) * vec3(1.0, 1.45, 0.7);
    float de = min(length(e1), length(e2));
    float hollow = 1.0 - smoothstep(0.014, 0.031, de);
    float rim = (1.0 - smoothstep(0.022, 0.046, de)) * (1.0 - hollow);
    gc = mix(gc, gc * vec3(0.42, 0.36, 0.48), rim * 0.85);
    gc = mix(gc, vec3(0.008, 0.006, 0.01), hollow);
    vec3 dm = (vGP - uMouth) * vec3(0.8, 2.0, 0.6);
    float lip = 1.0 - smoothstep(0.014, 0.034, length(dm));
    gc = mix(gc, vec3(0.16, 0.17, 0.22), lip * 0.8);
    float vein = smoothstep(0.48, 0.5, gnoise(vGP * vec3(60.0, 18.0, 60.0))) * (1.0 - smoothstep(0.5, 0.52, gnoise(vGP * vec3(60.0, 18.0, 60.0))));
    gc = mix(gc, gc * vec3(0.55, 0.62, 0.78), vein * 0.6);
  #endif
  diffuseColor.rgb = gc;`;
const NOISE = `
  varying vec3 vGP;
  float ghash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float gnoise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(ghash(i), ghash(i + vec3(1,0,0)), f.x), mix(ghash(i + vec3(0,1,0)), ghash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(ghash(i + vec3(0,0,1)), ghash(i + vec3(1,0,1)), f.x), mix(ghash(i + vec3(0,1,1)), ghash(i + vec3(1,1,1)), f.x), f.y), f.z); }`;
function ghostify(m, toRoot, head, eyes) { // corpse-pale grey-blue skin, a greyed and stained garment, a faint cold glow
  m.color.setHex(0xffffff); m.roughness = head ? 0.62 : 0.8; m.emissive = new THREE.Color(0x8fa0aa); m.emissiveIntensity = 0.03; m.envMapIntensity = 0.25;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uToRoot = { value: toRoot }; sh.uniforms.uEL = { value: eyes.L }; sh.uniforms.uER = { value: eyes.R }; sh.uniforms.uMouth = { value: eyes.mouth };
    if (head) sh.fragmentShader = '#define GHOST_HEAD\n' + sh.fragmentShader;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGP;\nuniform mat4 uToRoot;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGP = (uToRoot * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + NOISE + '\nuniform vec3 uEL; uniform vec3 uER; uniform vec3 uMouth;').replace('#include <map_fragment>', '#include <map_fragment>\n' + GHOST_FRAG);
  };
  m.customProgramCacheKey = () => head ? 'ghostH' : 'ghostB';
}
function shared() {
  if (R) return R;
  R = {};
  R.hairT = hairTex();
  R.hair = new THREE.MeshStandardMaterial({ color: 0x080809, map: R.hairT, alphaTest: 0.04, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.26, metalness: 0.1, envMapIntensity: 1.2 }); // blended (soft strand edges, no stair-stepping); all one near-black, so draw order inside the hair can't show
  R.hair.userData.part = { value: 0 };
  R.hair.onBeforeCompile = (sh) => { sh.uniforms.time = WX.time; sh.uniforms.uPart = R.hair.userData.part;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float time; uniform float uPart; attribute float aSide; attribute float aT;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float hk = aT * aT;
        transformed.x += sin(time * 0.9 + aSide * 7.0 + aT * 2.0) * 0.004 * hk;
        transformed.z += cos(time * 0.7 + aSide * 5.0) * 0.003 * hk;
        // the curtain of hair parts from the middle (strands swing outward and back round the cheeks)
        float sd = (aSide >= 0.0 ? 1.0 : -1.0) * (1.0 - 0.8 * smoothstep(0.35, 1.0, abs(aSide)));
        transformed.x += sd * uPart * (0.03 + 0.1 * smoothstep(0.0, 0.35, aT));
        transformed.z -= uPart * 0.05 * smoothstep(0.05, 0.5, aT) * (1.0 - abs(aSide));
        transformed.y += uPart * 0.03 * aT;`); };
  R.hair.customProgramCacheKey = () => 'ghosthair';
  R.sareeT = sareeTex();
  R.saree = new THREE.MeshStandardMaterial({ color: 0xc8c6be, map: R.sareeT, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.92, emissive: new THREE.Color(0x8a9496), emissiveIntensity: 0.04, envMapIntensity: 0.2 });
  R.saree.onBeforeCompile = (sh) => { sh.uniforms.time = WX.time; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float time;').replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat sw = 1.0 - uv.y; transformed.x += sin(time * 1.3 + position.y * 7.0 + position.z * 4.0) * 0.018 * sw; transformed.z += cos(time * 1.1 + position.y * 5.0 + position.x * 3.0) * 0.014 * sw;'); };
  R.saree.customProgramCacheKey = () => 'saree2';
  R.socket = new THREE.MeshBasicMaterial({ map: socketTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  R.maw = new THREE.MeshBasicMaterial({ color: 0x000000 });
  R.glint = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.85, 0.95), transparent: true, opacity: 0, fog: false, toneMapped: false, depthWrite: false });
  return R;
}

// strand ribbons hanging from under the pallu over the forehead, down over the face to the chest
function hairGeo(c, faceR) {
  const pos = [], uv = [], side = [], tt = [], idx = []; let base = 0;
  // wet hair hangs in clumps: strands in a clump start spread along the hairline and converge to a point at the tip
  const strand = (th, thTip, layer, len, wd) => {
    const segs = 14, wv = rnd(-0.008, 0.008), ph = rnd(0, 6);
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, k = Math.min(1, t / 0.55), a = th + (thTip - th) * (k * k * (3 - 2 * k)), tx = Math.cos(a), tz = -Math.sin(a);
      const y = c.y + 0.07 - 0.05 * (th / 1.3) ** 2 - len * t;
      let r = faceR - 0.005 + layer + 0.04 * Math.min(1, t / 0.13) ** 0.6; // roots tucked under the pallu's edge, then out over the brow
      if (Math.cos(a) > 0.2) r += 0.06 * Math.max(0, Math.min(1, (1.47 - y) / 0.13)) * Math.cos(a); // clear the chest
      const sx = Math.sin(a) * r + wv * Math.sin(t * 5 + ph) * t, sz = Math.cos(a) * r + c.z, w = wd * (1 - 0.55 * t);
      for (const s of [-1, 1]) { pos.push(sx + tx * w * 0.5 * s, y, sz + tz * w * 0.5 * s); uv.push(s < 0 ? 0 : 1, 1 - t); side.push(Math.sin(th)); tt.push(t); }
      if (i < segs) { const q = base + i * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    }
    base += (segs + 1) * 2;
  };
  // clumps across the face (a natural off-centre gap shows a sliver of skin, an eye socket, the dead mouth)
  const clumps = [-1.0, -0.78, -0.56, -0.36, -0.2, 0.08, 0.26, 0.46, 0.68, 0.9, 1.12];
  for (const cc of clumps) { const n = 6 + (Math.random() * 3 | 0), len = rnd(0.55, 0.8), tip = cc + rnd(-0.04, 0.04);
    for (let j = 0; j < n; j++) { const th = cc + rnd(-0.11, 0.11); strand(th, tip + (th - cc) * 0.15, rnd(0, 0.01), len * rnd(0.85, 1.05), rnd(0.012, 0.024)); } }
  // an outer veil of longer, sparser locks + heavy side locks
  for (let i = 0; i < 18; i++) { const th = rnd(-1.25, 1.25); if (Math.abs(th + 0.06) < 0.16) continue; strand(th, th * 0.9, 0.016, rnd(0.65, 0.95), rnd(0.014, 0.026)); }
  for (let i = 0; i < 16; i++) { const th = (i < 8 ? -1 : 1) * rnd(1.05, 1.5); strand(th, th * 0.95, 0.008, rnd(0.7, 0.95), rnd(0.02, 0.035)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1)); g.setAttribute('aT', new THREE.Float32BufferAttribute(tt, 1)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function skirtGeo(top, bottom) { // gathered pleated saree skirt from the waist to the ground, uneven torn hem
  const pts = []; const n = 10; for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new THREE.Vector2(0.16 + 0.11 * Math.pow(t, 1.3), top - (top - bottom) * t)); }
  const g = new THREE.LatheGeometry(pts, 40); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(x, z), t = (top - y) / (top - bottom); const k = 1 + (0.05 * Math.sin(a * 9) + 0.03 * Math.sin(a * 23 + 1)) * t; p.setX(i, x * k); p.setZ(i, z * k); }
  g.computeVertexNormals(); return g;
}

export function buildGhost(g) { // g = a makeHuman({av:'Female_Adult_06'}) group
  const S = shared(), u = g.userData, rig = u.rig; if (!rig || !rig.bones) return g;
  const B = rig.bones; rig.root.updateMatrixWorld(true);
  const at = (bn, obj, pos) => { obj.position.copy(pos); rig.root.add(obj); obj.updateMatrixWorld(true); B[bn].attach(obj); return obj; };
  const wp = (bn) => { const v = new THREE.Vector3(); B[bn].getWorldPosition(v); return rig.root.worldToLocal(v); };
  const eyeL = wp('Bip01_LEye'), eyeR = wp('Bip01_REye'), pel = wp('Bip01_Pelvis');
  const eyeY = (eyeL.y + eyeR.y) / 2, eyeZ = (eyeL.z + eyeR.z) / 2;
  // skin + garment
  const eyes = { L: eyeL.clone(), R: eyeR.clone(), mouth: new THREE.Vector3(0, eyeY - 0.068, eyeZ + 0.004) };
  const rootInv = rig.root.matrixWorld.clone().invert();
  // geometry -> rig space: skinned vertices map through a bone's world matrix x its inverse-bind (the head bone for the head, pelvis for the body)
  const toRootOf = (m, bn) => { const sk = m.skeleton, i = sk ? sk.bones.indexOf(B[bn]) : -1; if (i < 0) return rootInv.clone().multiply(m.matrixWorld); return rootInv.clone().multiply(B[bn].matrixWorld).multiply(sk.boneInverses[i]).multiply(m.bindMatrix); };
  for (const m of rig.meshes) { if (!m.visible) continue; const toRoot = toRootOf(m, /head|opacity/.test(m.material.name) ? 'Bip01_Head' : 'Bip01_Pelvis'); m.material = m.material.clone(); ghostify(m.material, toRoot, /head/.test(m.material.name), eyes); }
  // hair over the face
  const c = new THREE.Vector3(0, eyeY, eyeZ - 0.065);
  const hg = hairGeo(c, 0.083); hg.translate(-c.x, -c.y, -c.z);
  const hairPivot = new THREE.Group(); at('Bip01_Head', hairPivot, c.clone()); const restQ = hairPivot.quaternion.clone();
  const hair = new THREE.Mesh(hg, S.hair); hair.castShadow = true; hair.frustumCulled = false; hairPivot.add(hair); u.hair = hair;
  // keep the bind-pose world orientation of the pivot so the wet hair hangs with gravity when her head lolls (not glued to the skull)
  hairPivot.updateMatrixWorld(true); const bindWorldQ = new THREE.Quaternion(); hairPivot.getWorldQuaternion(bindWorldQ); const gq0 = new THREE.Quaternion(); g.getWorldQuaternion(gq0); const bodyRel = gq0.clone().invert().multiply(bindWorldQ);
  // hollow eye sockets + a faint glint deep inside (only visible in the dark)
  u.glints = [];
  for (const e of [eyeL, eyeR]) {
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 8, 6), S.glint); const gp = e.clone(); gp.z += 0.012; at('Bip01_Head', gl, gp); u.glints.push(gl);
  }
  // a black maw behind the lips (shows when the jaw drops)
  const maw = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), S.maw); maw.scale.set(0.019, 0.034, 0.016); at('Bip01_Head', maw, new THREE.Vector3(0, eyeY - 0.078, eyeZ - 0.02));
  // the saree skirt
  const sk = new THREE.Mesh(skirtGeo(pel.y + 0.07, 0.0), S.saree); sk.castShadow = true; sk.frustumCulled = false; at('Bip01_Pelvis', sk, new THREE.Vector3(0, 0, 0.0));
  // animation state read by the post hook (runs after the clip every frame)
  const fingers = Object.keys(B).filter(k => /Finger\d+$|Finger\d1$|Finger\d2$/.test(k) && !/Finger0/.test(k)).map(k => B[k]);
  const jaw = B.Bip01_MJaw, lf = B.Bip01_L_Foot, rf = B.Bip01_R_Foot;
  u.touchBones = [jaw, lf, rf, ...fingers].filter(Boolean); rig.touch = null; // restored to the clean pose every frame (see updateHumans)
  u.ghost = { jaw: 0, part: 0, glint: 0, twitch: fingers.map(() => 0), tw: 0 };
  u.post = (dt, rg) => {
    const G = u.ghost;
    if (jaw) { const jv = Math.max(0.04, G.jaw); jaw.rotation.z += jv * 0.95; jaw.scale.setScalar(1 + G.jaw * 0.25); } // the mouth always hangs a little open
    G.tw -= dt; if (G.tw <= 0) { G.tw = rnd(0.04, 0.12); G.twitch = G.twitch.map(() => Math.random() < 0.35 ? rnd(-0.6, 0.5) : 0); }
    fingers.forEach((f, i) => { f.rotation.z += 0.45 + G.twitch[i]; });
    if (lf) lf.rotation.z -= 0.5; if (rf) rf.rotation.z -= 0.5; // toes hang down: she doesn't stand on the floor
    S.hair.userData.part.value = 0.12 + 0.6 * G.part; // a narrow gap always shows a sliver of her face; it tears open in the catch
    // hair gravity: blend the pivot's world orientation 70% toward 'hanging straight down from the body'
    { const qh = _q1, qb = _q2; hairPivot.parent.updateWorldMatrix(true, false); hairPivot.parent.getWorldQuaternion(qh); g.getWorldQuaternion(qb); qb.multiply(bodyRel);
      const cur = _q3.copy(qh).multiply(restQ); cur.slerp(qb, 0.7); hairPivot.quaternion.copy(qh.invert().multiply(cur)); }
    for (const gl of u.glints) gl.material.opacity = G.glint;
  };
  u.isGhost = true;
  return g;
}
