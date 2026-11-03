// PLATFORM 0 v3 — CC0 scanned props (Poly Haven) as meshopt-compressed glTF; procedural props stay as the fallback.
import * as THREE from './three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/meshopt_decoder.module.js';
import { fetchAsset, forget } from './assets.js';

export const PROPS = { on: false, src: {}, err: null, used: new Set() };
export const PROP_LIST = ['ceiling_fan', 'metal_trash_can', 'WetFloorSign_01', 'cardboard_box_01', 'trashbag', 'street_rat', 'vintage_suitcase', 'utility_box_01', 'wall_clock', 'painted_wooden_bench', 'tea_set_01', 'vintage_electric_kettle', 'mounted_fluorescent_lights', 'signal_flashlight'];
let PDIR = 'models/';
export function setPropTier(t) { PDIR = t === 'l' ? 'models/l/' : 'models/'; }
export const propFile = (n) => PDIR + 'p_' + n + '.glb';
const pP = {};
// v3.1.1: per-chapter lists (first chapter first); phones get the light versions (models/l/)
export async function loadProps(list = PROP_LIST) {
  try {
    const L = new GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder);
    await Promise.all(list.map(n => pP[n] || (pP[n] = fetchAsset(propFile(n)).then(b => L.parseAsync(b, '')).then(g => {
      forget(propFile(n)); const s = g.scene; s.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; const m = o.material; if (m) { m.envMapIntensity = 0.55; if (m.map) m.map.anisotropy = 4; } } }); PROPS.src[n] = s; PROPS.on = true;
    }).catch(e => { console.warn('prop', n, e && e.message); }))));
  } catch (e) { PROPS.err = String(e && e.message || e); console.warn('props fallback', PROPS.err); }
}
export const hasProp = (n) => { PROPS.used.add(n); return PROPS.on && !!PROPS.src[n]; };
// clone a prop; o.h = target height (m) or o.s = uniform scale; sits on y=0, centred on x/z unless o.keepOrigin
export function prop(n, o = {}) {
  PROPS.used.add(n); const src = PROPS.src[n]; if (!src) return null;
  const c = src.clone(true); const wrap = new THREE.Group(); wrap.add(c);
  const bb = new THREE.Box3().setFromObject(c); const size = bb.getSize(new THREE.Vector3());
  const s = o.h ? o.h / size.y : o.w ? o.w / Math.max(size.x, size.z) : (o.s || 1); c.scale.setScalar(s);
  if (!o.keepOrigin) { const ctr = bb.getCenter(new THREE.Vector3()); c.position.set(-ctr.x * s, -bb.min.y * s, -ctr.z * s); }
  if (o.tint) c.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.multiply(new THREE.Color(o.tint)); } });
  wrap.userData.size = size.multiplyScalar(s); wrap.userData.prop = n;
  return wrap;
}
