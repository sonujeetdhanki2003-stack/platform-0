// PLATFORM 0 v2 — renderer, quality presets, post-processing, light pool
import * as THREE from './three.module.min.js';
import { EffectComposer } from './vendor/EffectComposer.js';
import { RenderPass } from './vendor/RenderPass.js';
import { ShaderPass } from './vendor/ShaderPass.js';
import { UnrealBloomPass } from './vendor/UnrealBloomPass.js';
import { OutputPass } from './vendor/OutputPass.js';
import { Reflector } from './vendor/Reflector.js';
import { GTAOPass } from './vendor/GTAOPass.js';
import { SMAAPass } from './vendor/SMAAPass.js';
import { BokehPass } from './vendor/BokehPass.js';
import { RGBELoader } from './vendor/RGBELoader.js';
import { assetBlobURL } from './assets.js';
import { wetTex } from './mats.js';

// touch UI only when the PRIMARY pointer is a finger (phones/tablets/APK). Touchscreen laptops keep mouse + keyboard controls.
export const isTouch = matchMedia('(pointer: coarse)').matches || (('ontouchstart' in window) && !matchMedia('(pointer: fine)').matches && navigator.maxTouchPoints > 0);

export const QUALITY = {
  // v3: tex = texture tier (l 512 / m 1K / h 2K), ao = ambient occlusion (0 off, 1 half-res GTAO, 2 full GTAO), smaa = anti-aliasing, hdri = night-sky environment, dof = depth of field on notes/inspect
  low:    { name: 'Low',    pr: 0.8,  maxPr: 1.0, post: false, bloom: false, shadows: 0, shadowSize: 0,    points: 3, env: 0,   reflect: false, dust: 60,  rain: 360,  cones: false, aniso: 1,  tex: 'l', ao: 0, smaa: false, hdri: false, dof: false, moths: 0,  splash: 0 },
  medium: { name: 'Medium', pr: 1.0,  maxPr: 1.25, post: true, bloom: true,  shadows: 1, shadowSize: 512,  points: 4, env: 128, reflect: false, dust: 260, rain: 1400, cones: true,  aniso: 4,  tex: 'm', ao: 0, smaa: true,  hdri: true,  dof: false, moths: 18, splash: 60 },
  high:   { name: 'High',   pr: 1.0,  maxPr: 2.0, post: true,  bloom: true,  shadows: 2, shadowSize: 1024, points: 5, env: 256, reflect: true,  dust: 500, rain: 3000, cones: true,  aniso: 8,  tex: 'h', ao: 1, smaa: true,  hdri: true,  dof: true,  moths: 36, splash: 140 },
  ultra:  { name: 'Ultra',  pr: 1.0,  maxPr: 2.0, post: true,  bloom: true,  shadows: 3, shadowSize: 2048, points: 6, env: 256, reflect: true,  dust: 800, rain: 4800, cones: true,  aniso: 16, tex: 'h', ao: 2, smaa: true,  hdri: true,  dof: true,  moths: 60, splash: 240, soft: true },
};

const _gpu = new WeakMap();
export function gpuName(renderer) {
  if (_gpu.has(renderer)) return _gpu.get(renderer);
  let n = ''; try { const gl = renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); n = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) {}
  _gpu.set(renderer, n || ''); return n || '';
}
// v3.1.1: phones always start on Low (touch, a phone/tablet user agent, or a small screen); computers by GPU name, then the
// first seconds of play step it down if the fps can't keep up (main.js). Low on a phone also runs dynamic resolution.
export const isPhone = isTouch || /Android|iPhone|iPad|iPod|Mobile|Silk|KAIOS/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 820);
export function autoQuality(renderer) {
  const g = gpuName(renderer) || '';
  if (isPhone) return 'low';
  if (/SwiftShader|llvmpipe|Software|Basic Render/i.test(g)) return 'low';
  if (/Intel|Mali|Adreno|PowerVR|HD Graphics|UHD/i.test(g)) return 'medium';
  if (/RTX [2-9]\d{3}|RTX A\d|RX [67]\d{3}|RX 7\d{3}|Radeon Pro W|Apple M[1-9] (Pro|Max|Ultra)/i.test(g)) return 'ultra';
  return 'high';
}

// final grade: colour grade + chromatic aberration + grain + vignette + damage/flash + optional retro pixels
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, time: { value: 0 }, res: { value: new THREE.Vector2(1, 1) },
    ca: { value: 0.0018 }, grain: { value: 0.07 }, vig: { value: 1.0 }, pixel: { value: 0 },
    tintA: { value: new THREE.Color(1.0, 0.62, 0.32) }, tintB: { value: new THREE.Color(0.55, 0.95, 0.62) },
    gradeAmt: { value: 0.35 }, damage: { value: 0 }, flash: { value: 0 }, sat: { value: 0.82 }, scareCA: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time, ca, grain, vig, pixel, gradeAmt, damage, flash, sat, scareCA; uniform vec2 res;
    uniform vec3 tintA, tintB; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + time*7.13) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      if (pixel > 0.5) { vec2 px = res / 3.0; uv = (floor(uv * px) + 0.5) / px; }
      vec2 d = uv - 0.5; float r2 = dot(d,d);
      float k = ca + scareCA;
      vec3 c;
      c.r = texture2D(tDiffuse, uv - d * k * (1.0 + r2*4.0)).r;
      c.g = texture2D(tDiffuse, uv).g;
      c.b = texture2D(tDiffuse, uv + d * k * (1.0 + r2*4.0)).b;
      float l = dot(c, vec3(0.299,0.587,0.114));
      c = mix(vec3(l), c, sat);
      // split-tone: warm sodium highlights, sickly green shadows
      vec3 toned = mix(c * tintB, c * tintA, smoothstep(0.05, 0.6, l));
      c = mix(c, toned, gradeAmt);
      c = pow(max(c, 0.0), vec3(1.06));
      float v = smoothstep(0.95, 0.18, sqrt(r2) * vig * 1.25);
      c *= mix(0.25, 1.0, v);
      c += (h(uv * res) - 0.5) * grain;
      c = mix(c, vec3(0.55, 0.0, 0.0) * (0.4 + l), damage * 0.6);
      c += flash;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export class Engine {
  constructor(canvas, qualityKey) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    const r = this.renderer;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.AgXToneMapping !== undefined ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0; // v3: AgX keeps the sodium/neon highlights from clipping to flat yellow
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.shadowMap.autoUpdate = true;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.05, 160); this.scene.add(this.camera);
    this.scene.fog = new THREE.FogExp2(0x07090a, 0.05); this.scene.background = new THREE.Color(0x05070a);
    this.pmrem = new THREE.PMREMGenerator(r);
    this.lamps = [];           // lamp descriptors from the active chapter
    this.pool = { points: [], spots: [] };
    this.retro = false; this.time = 0; this.expMul = r.toneMapping === THREE.ACESFilmicToneMapping ? 1 : 1.3; // AgX reads darker than ACES at the same exposure
    this.setQuality(qualityKey || autoQuality(r));
  }
  setQuality(key) {
    this.qKey = QUALITY[key] ? key : 'medium'; this.Q = QUALITY[this.qKey];
    const r = this.renderer;
    r.shadowMap.enabled = this.Q.shadows > 0;
    r.shadowMap.type = this.Q.soft ? THREE.VSMShadowMap : THREE.PCFSoftShadowMap;
    if (this.Q.hdri) this.loadHDRI(); else { this.scene.background = this.bgColor || this.scene.background; }
    this.buildPool();
    this.buildComposer();
    this.resize();
    this.scene.traverse(o => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); } });
    if (this.onQuality) this.onQuality(this.Q);
  }
  buildPool() {
    const S = this.scene;
    for (const l of [...this.pool.points, ...this.pool.spots]) { S.remove(l); if (l.target) S.remove(l.target); if (l.shadow && l.shadow.map) l.shadow.map.dispose(); l.dispose && l.dispose(); }
    this.pool = { points: [], spots: [] };
    for (let i = 0; i < this.Q.points; i++) { const l = new THREE.PointLight(0xe8f0d8, 0, 13, 1.7); S.add(l); this.pool.points.push(l); }
    for (let i = 0; i < this.Q.shadows; i++) {
      const l = new THREE.SpotLight(0xe8f0d8, 0, 16, 1.25, 0.65, 1.6);
      l.castShadow = true; l.shadow.mapSize.set(this.Q.shadowSize, this.Q.shadowSize); l.shadow.bias = -0.0008; l.shadow.normalBias = 0.03;
      l.shadow.camera.near = 0.2; l.shadow.camera.far = 14; if (this.Q.soft) { l.shadow.radius = 6; l.shadow.blurSamples = 12; l.shadow.bias = -0.0004; }
      S.add(l); S.add(l.target); this.pool.spots.push(l);
    }
  }
  buildComposer() {
    if (this.composer) { this.composer.dispose(); this.composer = null; }
    if (!this.Q.post) return;
    const r = this.renderer;
    const comp = this.composer = new EffectComposer(r);
    comp.addPass(new RenderPass(this.scene, this.camera));
    this.gtao = null; this.bokeh = null; this.smaa = null;
    if (this.Q.ao) {
      try {
        const w = innerWidth, h = innerHeight;
        const ao = this.gtao = new GTAOPass(this.scene, this.camera, w, h);
        ao.output = GTAOPass.OUTPUT.Default; ao.blendIntensity = 0.85;
        ao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.6, thickness: 1.2, scale: 1.0, samples: this.Q.ao > 1 ? 16 : 8, distanceFallOff: 1, screenSpaceRadius: false });
        ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: this.Q.ao > 1 ? 6 : 4, radiusExponent: 1, rings: 2, samples: this.Q.ao > 1 ? 16 : 8 });
        comp.addPass(ao);
      } catch (e) { console.warn('ao off', e && e.message); this.gtao = null; }
    }
    if (this.Q.bloom) { this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.6, 0.76); comp.addPass(this.bloom); } else this.bloom = null;
    if (this.Q.dof) { this.bokeh = new BokehPass(this.scene, this.camera, { focus: 0.6, aperture: 0.012, maxblur: 0.012 }); this.bokeh.enabled = false; comp.addPass(this.bokeh); }
    comp.addPass(new OutputPass());
    if (this.Q.smaa) { this.smaa = new SMAAPass(innerWidth * (this.pr || 1), innerHeight * (this.pr || 1)); comp.addPass(this.smaa); }
    this.grade = new ShaderPass(GradeShader); comp.addPass(this.grade);
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight, dpr = window.devicePixelRatio || 1;
    let pr = Math.min(this.Q.maxPr, dpr * this.Q.pr) * (this.qKey === 'low' ? (this.dyn || 1) : 1); // v3.1.1: dynamic resolution on Low
    if (this.retro) pr = Math.min(0.5, dpr * 0.45);
    if (this.qKey === 'low' && w * h * pr * pr > 1.1e6) pr = Math.sqrt(1.1e6 / (w * h));
    this.pr = pr;
    this.renderer.setPixelRatio(pr); this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px'; this.canvas.classList.toggle('retro', !!this.retro);
    this.camera.aspect = w / h;
    // cap the horizontal field of view (~100°): a fixed 72° vertical FOV on wide phone screens gave ~115° and stretched anything near the edges
    this.camera.fov = w / h < 1 ? 88 : Math.min(70, 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(50)) / (w / h)) * 180 / Math.PI);
    this.camera.updateProjectionMatrix();
    if (this.composer) {
      this.composer.setPixelRatio(pr); this.composer.setSize(w, h);
      if (this.bloom) this.bloom.resolution.set(w * pr * 0.5, h * pr * 0.5);
      if (this.gtao) this.gtao.setSize(Math.floor(w * pr * (this.Q.ao > 1 ? 1 : 0.5)), Math.floor(h * pr * (this.Q.ao > 1 ? 1 : 0.5)));
      this.grade.uniforms.res.value.set(w * pr, h * pr);
    }
  }
  // assign real lights to the lamps nearest the player (lamps elsewhere keep their emissive tube + baked floor pool)
  updateLights(px, pz, yaw) {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const L = this.lamps.filter(l => l.on !== false).map(l => {
      const dx = l.x - px, dz = l.z - pz, d = Math.hypot(dx, dz);
      const ahead = (dx * fx + dz * fz) / Math.max(d, 0.001);
      return { l, s: d - ahead * 2.5 - (l.prio || 0) };
    }).sort((a, b) => a.s - b.s);
    let i = 0;
    for (const sp of this.pool.spots) {
      const e = L[i++];
      if (!e) { sp.intensity = 0; continue; }
      const l = e.l; sp.position.set(l.x, l.y - 0.05, l.z); sp.target.position.set(l.x + (l.tx || 0), 0, l.z + (l.tz || 0));
      sp.color.copy(l.color); sp.intensity = l.level * l.power * 1.6; sp.distance = l.dist || 15;
    }
    for (const pt of this.pool.points) {
      const e = L[i++];
      if (!e) { pt.intensity = 0; continue; }
      const l = e.l; pt.position.set(l.x, l.y - 0.25, l.z); pt.color.copy(l.color); pt.intensity = l.level * l.power; pt.distance = l.dist || 13;
    }
  }
  envFrom(pos, key) {
    if (!this.Q.env) { this.scene.environment = null; return; }
    const size = this.Q.env;
    // one capture per chapter per size: re-capturing on every chapter entry cost seconds (cube render + shader variants) each time
    this._envCache = this._envCache || {};
    const ck = key !== undefined ? key + ':' + size : null;
    if (ck && this._envCache[ck]) { this.scene.environment = this._env = this._envCache[ck]; return; }
    const rt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType });
    const cc = new THREE.CubeCamera(0.1, 60, rt); cc.position.copy(pos); this.scene.add(cc);
    const fog = this.scene.fog; this.scene.fog = null; cc.update(this.renderer, this.scene); this.scene.fog = fog;
    this.scene.remove(cc);
    const env = this.pmrem.fromCubemap(rt.texture).texture; rt.dispose();
    if (this._env && !Object.values(this._envCache).includes(this._env)) this._env.dispose();
    if (ck) this._envCache[ck] = env;
    this._env = env; this.scene.environment = env;
  }
  // v3: depth of field for reading notes / inspecting objects (High/Ultra); focus distance in metres
  setDOF(on, focus = 0.6) { if (!this.bokeh) return; this.bokeh.enabled = !!on; if (on) { this.bokeh.uniforms.focus.value = focus; } }
  // v3: real night-sky HDRI (Poly Haven "Satara Night", CC0) — background seen past the platform shed + source for the reflection probes
  loadHDRI() {
    if (this._hdriP) return this._hdriP;
    this._hdriP = (async () => {
      try {
        const url = await assetBlobURL('hdr/satara_night_1k.hdr');
        const tex = await new RGBELoader().setDataType(THREE.FloatType).loadAsync(url); URL.revokeObjectURL(url);
        // clamp the street lamps in the HDR (values in the hundreds) so a dimmed night sky never blows out the bloom pass
        { const d = tex.image.data; for (let i = 0; i < d.length; i++) if (d[i] > 2.5) d[i] = 2.5; tex.needsUpdate = true; }
        tex.mapping = THREE.EquirectangularReflectionMapping; this.hdri = tex;
        this.hdriEnv = this.pmrem.fromEquirectangular(tex).texture;
        if (this.onHDRI) this.onHDRI();
      } catch (e) { console.warn('hdri', e && e.message); }
    })();
    return this._hdriP;
  }
  // chapters that are open to the sky show the HDRI (dimmed, tinted by fog colour in the grade); enclosed ones keep their fog colour
  useSky(on, intensity = 0.12) {
    const S = this.scene;
    if (on && this.hdri && this.Q.hdri) { S.background = this.hdri; S.backgroundIntensity = intensity; S.backgroundBlurriness = 0.02; S.backgroundRotation && S.backgroundRotation.set(0, 1.2, 0); }
    else { if (!S.background || !S.background.isColor) S.background = new THREE.Color(S.fog ? S.fog.color : 0x05070a); }
  }
  render(dt) {
    this.time += dt;
    if (this.composer) { this.grade.uniforms.time.value = this.time % 100; this.grade.uniforms.pixel.value = this.retro ? 1 : 0; this.composer.render(dt); }
    else this.renderer.render(this.scene, this.camera);
  }
}

// High quality: planar mirror on the wet floor, masked by the same world-space puddle map (reflections only where it's wet)
Engine.prototype.makeReflector = function (rect) {
  const geo = new THREE.PlaneGeometry(rect.w, rect.d);
  const shader = {
    uniforms: { color: { value: new THREE.Color(0xffffff) }, tDiffuse: { value: null }, textureMatrix: { value: null }, wetMap: { value: wetTex() }, strength: { value: rect.strength ?? 0.55 }, base: { value: rect.base ?? 0.06 }, time: { value: 0 } },
    vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW; varying vec3 vV;
      void main(){ vUv = textureMatrix * vec4(position,1.0); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D tDiffuse, wetMap; uniform float strength, base, time; varying vec4 vUv; varying vec3 vW; varying vec3 vV;
      void main(){
        float wet = clamp(texture2D(wetMap, vW.xz * 0.11).r * 1.4, 0.0, 1.0);
        vec2 rip = vec2(sin(vW.x*9.0 + time*1.3) + sin(vW.z*7.0 - time), cos(vW.z*8.0 + time*1.1)) * 0.004 * (1.0 - wet*0.6);
        vec4 uv = vUv; uv.xy += rip * uv.w;
        vec3 r = texture2DProj(tDiffuse, uv).rgb;
        float fres = 0.35 + 0.65 * pow(1.0 - clamp(normalize(vV).y, 0.0, 1.0), 3.0);
        float k = (base + wet * strength) * fres;
        gl_FragColor = vec4(r * k, 1.0);
      }`,
  };
  const m = new Reflector(geo, { clipBias: 0.003, textureWidth: Math.max(2, Math.floor(innerWidth * this.pr * 0.5)), textureHeight: Math.max(2, Math.floor(innerHeight * this.pr * 0.5)), shader });
  m.material.transparent = true; m.material.blending = THREE.AdditiveBlending; m.material.depthWrite = false;
  m.rotation.x = -Math.PI / 2; m.position.set(rect.x, rect.y ?? 0.004, rect.z); m.renderOrder = 1;
  const t0 = performance.now(); const ob = m.onBeforeRender; m.onBeforeRender = (r, s, c) => { if (this._inMirror) return; m.material.uniforms.time.value = (performance.now() - t0) / 1000; this._inMirror = true; const cones = []; s.traverse(o => { if (o.userData.isCone && o.visible) { o.visible = false; cones.push(o); } }); ob(r, s, c); cones.forEach(o => o.visible = true); this._inMirror = false; };
  return m;
};

// keep the mirror's render target matched to the window after a resize / rotation / fullscreen toggle
Engine.prototype.sizeReflector = function (m) { const rt = m.getRenderTarget && m.getRenderTarget(); if (rt) rt.setSize(Math.max(2, Math.floor(innerWidth * this.pr * 0.5)), Math.max(2, Math.floor(innerHeight * this.pr * 0.5))); };
// compile every shader the scene can need while the loading screen is up (avoids the multi-second hitch on the first frames)
Engine.prototype.precompile = async function (roots, opt = {}) {
  if (opt.render === false) { // v3.1.1: a chapter / objects that aren't on screen: compile their materials (hidden ones too) against this scene's lights,
    // a few objects at a time so the title camera / the game keeps running between them (nothing is drawn)
    const r = this.renderer, objs = []; for (const root of roots) root.traverse(o => { if (o.material) objs.push(o); });
    let t0 = performance.now(); const budget = opt.budget || 24;
    for (const o of objs) { try { r.compile(o, this.camera, this.scene); } catch (e) { console.warn('precompile', e && e.message); } if (performance.now() - t0 > budget) { await new Promise(res => setTimeout(res, 0)); t0 = performance.now(); } }
    return;
  }
  const added = roots.filter(r => !r.parent); added.forEach(r => this.scene.add(r)); // v3.1.1: inactive chapter roots live outside the scene
  const was = roots.map(r => r.visible); roots.forEach(r => r.visible = true);
  const hidden = []; for (const r of roots) r.traverse(o => { if (!o.visible) { hidden.push(o); o.visible = true; } });
  try {
    const r = this.renderer;
    if (r.compileAsync && r.extensions.has('KHR_parallel_shader_compile')) await Promise.race([r.compileAsync(this.scene, this.camera), new Promise(res => setTimeout(res, 15000))]);
    else r.compile(this.scene, this.camera);
    // one real frame through the post chain compiles the composer's passes too (canvas is behind the loading screen)
    this.render(0);
  } catch (e) { console.warn('precompile skipped', e && e.message); }
  hidden.forEach(o => o.visible = false); roots.forEach((r, i) => r.visible = was[i]);
  added.forEach(r => { if (!r.visible) this.scene.remove(r); });
};
