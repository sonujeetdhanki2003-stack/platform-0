// PLATFORM 0 v3 — weather + life, all GPU-animated (one shared time uniform, no per-frame CPU loops):
// rain splash rings, drips off the roof edge, rippling puddles, moths circling lamps, a distant train's headlight.
import * as THREE from './three.module.min.js';
import * as M from './mats.js';

export const WX = { time: { value: 0 } };
export function tickWeather(dt) { WX.time.value = (WX.time.value + dt) % 1000; }
const rnd = (a, b) => a + Math.random() * (b - a);

// expanding rain rings on wet ground / puddles (instanced quads, ring drawn in the shader)
export function makeSplashes(n, x0, x1, z0, z1, y, color = 0xb8c4cc) {
  if (!n) return null;
  const geo = new THREE.InstancedBufferGeometry(); geo.copy(new THREE.PlaneGeometry(1, 1));
  const off = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { off[i * 4] = rnd(x0, x1); off[i * 4 + 1] = y + Math.random() * 0.01; off[i * 4 + 2] = rnd(z0, z1); off[i * 4 + 3] = Math.random(); }
  geo.setAttribute('off', new THREE.InstancedBufferAttribute(off, 4)); geo.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: WX.time, color: { value: new THREE.Color(color) } },
    vertexShader: `attribute vec4 off; uniform float time; varying vec2 vUv; varying float vK;
      void main(){ float ph = fract(time * (1.6 + off.w * 0.8) + off.w * 17.0); vK = ph; vUv = uv;
        vec3 p = vec3(position.x, 0.0, -position.y) * (0.05 + ph * 0.16) + off.xyz; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform vec3 color; varying vec2 vUv; varying float vK;
      void main(){ float r = length(vUv - 0.5) * 2.0; float ring = smoothstep(0.08, 0.0, abs(r - 0.8)) ; float a = ring * (1.0 - vK) * 0.55; if (a < 0.01) discard; gl_FragColor = vec4(color * a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.userData.noAO = true; m.renderOrder = 3; return m;
}

// water dripping off the roof edge: streaks that accelerate down and burst at the bottom
export function makeDrips(n, x, yTop, yBot, z0, z1, color = 0xa8b4bc) {
  if (!n) return null;
  const geo = new THREE.InstancedBufferGeometry(); geo.copy(new THREE.PlaneGeometry(0.012, 0.16));
  const off = new Float32Array(n * 4); for (let i = 0; i < n; i++) { off[i * 4] = x + rnd(-0.03, 0.03); off[i * 4 + 1] = z0 + (z1 - z0) * (i + Math.random() * 0.6) / n; off[i * 4 + 2] = Math.random(); off[i * 4 + 3] = rnd(0.7, 1.4); }
  geo.setAttribute('off', new THREE.InstancedBufferAttribute(off, 4)); geo.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: WX.time, color: { value: new THREE.Color(color) }, yTop: { value: yTop }, yBot: { value: yBot } },
    vertexShader: `attribute vec4 off; uniform float time, yTop, yBot; varying float vA; varying vec2 vUv;
      void main(){ float ph = fract(time * 0.55 * off.w + off.z); float fall = ph * ph; float y = mix(yTop, yBot, fall); vA = smoothstep(0.0, 0.05, ph) * (1.0 - smoothstep(0.92, 1.0, ph)); vUv = uv;
        vec3 c = vec3(off.x, y, off.y); vec4 mv = viewMatrix * vec4(c, 1.0); mv.xy += position.xy * vec2(1.0, 1.0 + fall * 3.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 color; varying float vA; varying vec2 vUv; void main(){ float a = vA * (1.0 - abs(vUv.x - 0.5) * 2.0) * smoothstep(0.0, 0.6, vUv.y) * 0.5; gl_FragColor = vec4(color * a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.userData.noAO = true; return m;
}

// puddles: glossy dark water with animated rain ripples in the normal (environment + lamps reflect in them)
export function makePuddles(parent, spots, y) {
  const g = new THREE.Group(); parent.add(g);
  const mat = new THREE.MeshStandardMaterial({ color: 0x0b0d0e, roughness: 0.04, metalness: 0.0, envMapIntensity: 1.4, transparent: true, opacity: 0.92, depthWrite: false });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.time = WX.time;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec2 vLP;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed,1.0)).xyz; vLP = position.xy;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP; varying vec2 vLP; uniform float time;
      vec2 hash2(vec2 p){ p = vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3))); return fract(sin(p) * 43758.5453); }
      vec2 ripples(vec2 uv){ vec2 n = vec2(0.0); for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 cell = floor(uv) + vec2(float(i), float(j)); vec2 h = hash2(cell); vec2 c = cell + h; float t = fract(time * (0.7 + h.x * 0.6) + h.y); vec2 d = uv - c; float r = length(d); float w = sin((r - t * 0.9) * 40.0) * smoothstep(0.9, 0.0, r) * (1.0 - t) * smoothstep(t * 0.9 + 0.05, t * 0.9 - 0.05, r); n += d / max(r, 0.001) * w; } return n; }`)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n{ vec2 rp = ripples(vWP.xz * 3.0) * 0.12; normal = normalize(normal + (viewMatrix * vec4(rp.x, 0.0, rp.y, 0.0)).xyz); }')
      .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\n{ diffuseColor.a *= smoothstep(0.56, 0.38, length(vLP)); }');
  };
  mat.customProgramCacheKey = () => 'puddle';
  for (const [x, z, w, d, r] of spots) {
    const geo = new THREE.CircleGeometry(0.5, 28); const pos = geo.attributes.position; for (let i = 1; i < pos.count; i++) { const a = Math.atan2(pos.getY(i), pos.getX(i)); const k = 1 + Math.sin(a * 3 + x) * 0.12 + Math.sin(a * 5 + z) * 0.08; pos.setXY(i, pos.getX(i) * k, pos.getY(i) * k); }
    const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.rotation.z = r || 0; m.scale.set(w, d, 1); m.position.set(x, y, z); m.receiveShadow = true; m.renderOrder = 2; g.add(m);
  }
  // PlaneGeometry-style uvs for the soft edge
  g.traverse(o => { if (o.isMesh && !o.geometry.attributes.uv) { /* circle has uvs */ } });
  return g;
}

// moths: little pale specks orbiting each lamp tube, shader-animated
export function makeMoths(lamps, per, parent) {
  if (!per || !lamps.length) return null;
  const n = lamps.length * per, pos = new Float32Array(n * 3), seed = new Float32Array(n * 4);
  lamps.forEach((l, li) => { for (let k = 0; k < per; k++) { const i = li * per + k; pos.set([l.x, l.y - 0.12, l.z], i * 3); seed.set([Math.random(), Math.random(), Math.random(), rnd(0.25, 0.7)], i * 4); } });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: WX.time, map: { value: M.radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 32) }, color: { value: new THREE.Color(0xd8d0b8) }, scale: { value: 380 } },
    vertexShader: `attribute vec4 seed; uniform float time, scale; varying float vA;
      void main(){ float t = time * (1.2 + seed.x * 1.5) + seed.y * 40.0; float r = seed.w;
        vec3 o = vec3(cos(t) * r + sin(t * 2.7 + seed.z * 9.0) * 0.12, sin(t * 1.9 + seed.x * 6.0) * 0.18 - 0.05, sin(t * 1.3) * r * 1.4 + cos(t * 3.1) * 0.1);
        vec4 mv = modelViewMatrix * vec4(position + o, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = scale * 0.012 / -mv.z * (0.8 + 0.4 * sin(t * 30.0)); vA = smoothstep(14.0, 4.0, -mv.z); }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 color; varying float vA; void main(){ float a = texture2D(map, gl_PointCoord).r * vA * 0.9; if (a < 0.02) discard; gl_FragColor = vec4(color * a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const p = new THREE.Points(geo, mat); p.frustumCulled = false; p.userData.noAO = true; parent.add(p); return p;
}

// a far-off local's headlight drifting along the track beyond the fog, with its horn — life in the distance
export function makeDistantTrain(parent, x, y, zFar, sound) {
  const g = new THREE.Group(); parent.add(g);
  const tex = M.radial('rgba(255,250,230,1)', 'rgba(255,250,230,0)', 128);
  const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(6, 5.6, 4.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }));
  head.scale.set(2.4, 2.4, 1); g.add(head);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(0.5, 0.45, 0.35), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.6 }));
  glow.scale.set(14, 9, 1); g.add(glow);
  g.visible = false; g.position.set(x, y, zFar);
  const st = { t: 8 + Math.random() * 10, run: 0 };
  g.userData.update = (dt) => {
    st.t -= dt;
    if (!g.visible && st.t < 0) { g.visible = true; st.run = 0; st.dir = Math.random() < 0.5 ? 1 : -1; if (sound && sound.ctx) { sound.horn(2.2, 0.06); } }
    if (g.visible) { st.run += dt; const k = st.run / 16; g.position.z = zFar + Math.sin(k * Math.PI) * 18 * st.dir - k * 10; const f = Math.sin(Math.min(1, k) * Math.PI); head.material.opacity = f; glow.material.opacity = f * 0.5; if (k >= 1) { g.visible = false; st.t = 35 + Math.random() * 40; } }
  };
  return g;
}
