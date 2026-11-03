// PLATFORM 0 v2 — materials: CC0 PBR textures (Poly Haven), wet floors, canvas signage with Devanagari
import * as THREE from './three.module.min.js';
import { assetURL, assetImage } from './assets.js';

const loader = new THREE.TextureLoader();
const cache = {};
let ANISO = 4;
export function setAniso(a) { ANISO = a; }
// texture tier: 'l' = 512 (Low/phones), 'm' = 1K (Medium), 'h' = 2K webp (High/Ultra)
let TIER = 'm';
export function setTexTier(t) { TIER = t; }
export const texPath = (key) => TIER === 'h' ? 'tex2k/' + key + '.webp' : TIER === 'l' ? 'texl/' + key + '.jpg' : 'tex/' + key + '.jpg';
export const loading = [];
// v3.1.1: textures come in as bytes through fetchAsset (so the phone ones ride in the gzipped packs) and are decoded off-thread by an <img>;
// a material made before its image arrives shows it the moment it lands (the texture object is created at once, the image filled in later)
const pending = {}; const CLONES = new WeakMap();
{ const _clone = THREE.Texture.prototype.clone; // a clone (or a clone of a clone) taken before the image arrived gets it too
  THREE.Texture.prototype.clone = function () { const c = _clone.call(this); const L = CLONES.get(this); if (L && !this.image) { L.push(c); CLONES.set(c, L); } return c; }; }
function fill(t, key) {
  if (!pending[key]) pending[key] = assetImage(texPath(key)).then(img => { t.image = img; t.needsUpdate = true; for (const c of CLONES.get(t) || []) { c.image = img; c.needsUpdate = true; } }).catch(e => console.warn('texture', key, e && e.message));
  return pending[key];
}
export const TEXUSED = new Set();
function tex(key, srgb) {
  if (cache[key]) return cache[key];
  const t = new THREE.Texture(); CLONES.set(t, []);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = ANISO;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  cache[key] = t; fill(t, key); return t;
}
export const texFiles = (keys) => keys.flatMap(k => ['d', 'n', 'a'].map(s => texPath(k + '_' + s)));
export function preloadTextures(keys) {
  return Promise.all(keys.flatMap(k => ['d', 'n', 'a'].map(s => { const key = k + '_' + s; const t = tex(key, s === 'd'); return pending[key]; })));
}
function rep(t, rx, ry) { const c = t.clone(); c.repeat.set(rx, ry); if (t.image) c.needsUpdate = true; return c; }

// PBR material from a Poly Haven set: _d diffuse, _n normal (GL), _a ARM (ao/rough/metal)
export function pbr(key, o = {}) {
  TEXUSED.add(key);
  const [rx, ry] = o.rep || [1, 1];
  const arm = rep(tex(key + '_a'), rx, ry);
  const m = new THREE.MeshStandardMaterial({
    map: rep(tex(key + '_d', true), rx, ry), normalMap: rep(tex(key + '_n'), rx, ry),
    roughnessMap: arm, aoMap: o.noAO ? null : arm, metalnessMap: o.metal ? arm : null,
    color: o.color !== undefined ? o.color : 0xffffff, roughness: o.rough !== undefined ? o.rough : 1, metalness: o.metal || 0,
    aoMapIntensity: o.ao !== undefined ? o.ao : 1, envMapIntensity: o.env !== undefined ? o.env : 0.6,
    side: o.side || THREE.FrontSide,
  });
  m.normalScale.set(o.ns || 1, o.ns || 1);
  return m;
}
export const std = (color, rough = 0.85, metal = 0, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMapIntensity: 0.5, ...o });
export const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
export function emissive(color, intensity = 3) { return new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensity, roughness: 1 }); }

// world-space wetness: puddles get dark + glossy (cheap "wet floor" without extra passes)
let wetTexCache = null;
export function wetTex() {
  if (wetTexCache) return wetTexCache;
  const c = canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 60; i++) {
    const x = rnd() * 256, y = rnd() * 256, r = 6 + rnd() * 28;
    for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, 'rgba(255,255,255,' + (0.5 + rnd() * 0.5) + ')'); gr.addColorStop(0.7, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x + ox, y + oy, r * (1 + rnd()), r, rnd() * 3, 0, 7); g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; wetTexCache = t; return t;
}
export function makeWet(m, amount = 1, scale = 0.09) {
  const wt = wetTex();
  m.userData.wet = { value: amount };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.wetMap = { value: wt }; sh.uniforms.wetAmt = m.userData.wet; sh.uniforms.wetScale = { value: scale };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos; uniform sampler2D wetMap; uniform float wetAmt, wetScale; float wetK;')
      .replace('#include <map_fragment>', '#include <map_fragment>\nwetK = clamp(texture2D(wetMap, vWPos.xz * wetScale).r * 1.4 * wetAmt, 0.0, 1.0);\ndiffuseColor.rgb *= mix(1.0, 0.45, wetK);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.05, wetK);');
  };
  m.customProgramCacheKey = () => 'wet'; m.userData.batchOK = true; // world-space: safe to merge (v3.1.1 batching)
  return m;
}

// ---------- canvas helpers ----------
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; try { c.getContext('2d', { willReadFrequently: true }); } catch (e) {} return c; } // v3.1.1: CPU-side canvases (grime/noise read pixels back; a GPU canvas stalls on every read)
const _ctexCache = new WeakMap();
// one texture per long-lived canvas (anomaly swaps reuse it instead of uploading a new copy every loop)
export function ctexC(c) { let t = _ctexCache.get(c); if (!t) { t = ctex(c); _ctexCache.set(c, t); } return t; }
export function ctex(c, o = {}) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; if (o.rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...o.rep); } return t; }
export const DEVA = '"Noto Sans Devanagari", "Nirmala UI", "Mangal", sans-serif';
export const SANS = '"Arial Narrow", "Helvetica Neue", Arial, sans-serif';
export async function loadFonts() {
  try {
    const f1 = new FontFace('Noto Sans Devanagari', 'url(fonts/noto-deva-devanagari.woff2)', { weight: '700', unicodeRange: 'U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+20A8, U+20B9, U+25CC, U+A830-A839, U+A8E0-A8FF' });
    const f2 = new FontFace('Noto Sans Devanagari', 'url(fonts/noto-deva-latin.woff2)', { weight: '700', unicodeRange: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' });
    await Promise.race([Promise.all([f1.load(), f2.load()]).then(fs => fs.forEach(f => document.fonts.add(f))), new Promise(r => setTimeout(r, 4000))]);
  } catch (e) {}
}
let _noise = null; // 256k signed noise values in [-127.5, 127.5]
function noiseTab() { if (!_noise) { _noise = new Float32Array(1 << 18); let x = 2463534242; for (let i = 0; i < _noise.length; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; _noise[i] = ((x >>> 0) / 4294967296 - 0.5) * 255; } } return _noise; }
// grime overlay for painted signs/posters
export function grime(g, w, h, amt = 0.5, seed = 3) {
  let s = seed * 999 + 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 40 * amt; i++) { const x = rnd() * w, y = rnd() * h, r = 4 + rnd() * w * 0.12; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(40,30,15,${0.25 * amt})`); gr.addColorStop(1, 'rgba(40,30,15,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  for (let i = 0; i < 18 * amt; i++) { const x = rnd() * w; g.fillStyle = `rgba(30,22,10,${0.12 * amt})`; g.fillRect(x, rnd() * h * 0.3, 1 + rnd() * 3, h * (0.3 + rnd() * 0.7)); }
  // v3.1.1: per-pixel film noise from a precomputed table (was one PRNG call per pixel: ~3 s of a phone's boot, and again every loop)
  const id = g.getImageData(0, 0, w, h), d = id.data, N = noiseTab(), k = 26 * amt / 255; let o = ((seed * 7919) >>> 0) % (N.length - 1);
  for (let i = 0; i < d.length; i += 4) { const n = N[o] * k; o = o + 1 === N.length ? 0 : o + 1; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(id, 0, 0);
}
export function fitText(g, text, font, maxW, size) { let s = size; do { g.font = font.replace('#', s); s -= 2; } while (g.measureText(text).width > maxW && s > 8); return s + 2; }

// soft radial sprite (light pools, glows, dust)
const radCache = {};
export function radial(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', size = 128) {
  const k = inner + outer + size; if (radCache[k]) return radCache[k];
  const c = canvas(size, size), g = c.getContext('2d'); const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, inner); gr.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.45)')); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); radCache[k] = t; return t;
}
// contact shadow blob (fake baked AO under props)
export function shadowBlob(w, d, opacity = 0.55) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: radial('rgba(0,0,0,1)', 'rgba(0,0,0,0)', 64), transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.renderOrder = 1; return m;
}
// vertical gradient for wall-floor seams (baked AO strip)
export function aoStrip(len, h = 0.6, opacity = 0.6) {
  const c = canvas(4, 64), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 64, 0, 0); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
  const t = new THREE.CanvasTexture(c);
  return new THREE.Mesh(new THREE.PlaneGeometry(len, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity, depthWrite: false }));
}
