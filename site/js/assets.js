// Where heavy assets live. Empty = same folder (itch zip / APK / local). The public build maps files to helper hosts;
// a file bigger than one helper is split into parts (array of hosts) and joined here.
// v3.1.1: the public build also writes PACKS: the phone (Low) assets concatenated + gzipped into a few big files on a few hosts
// (one request each instead of ~100 small ones on 25 hosts). A pack that fails falls back to the per-file map.
export const ASSET_MAP = {};
export const ASSET_VER = '';
export const PACKS = {};       // path -> [pack index, offset, length]
export const PACK_URLS = [];   // pack index -> [url, gzipped bytes]
export const ASSET_SIZES = {}; // path -> bytes on the wire (progress weights); empty in local dev (then files count 1 each)
export const assetURL = (p) => { const m = ASSET_MAP[p]; if (!m) return p; return (Array.isArray(m) ? m[0] : m) + p + (ASSET_VER ? '?v=' + ASSET_VER : ''); };

// ---------- loading progress ----------
export const LOAD = { want: 0, got: 0, onChange: null, log: [] };
const BYTES = () => Object.keys(ASSET_SIZES).length > 0;
const tick = (n) => { LOAD.got += n; if (LOAD.onChange) LOAD.onChange(); };
const usePacks = () => !packFailed && typeof DecompressionStream !== 'undefined' && PACK_URLS.length > 0;
let packFailed = false;
const counted = new Set(); // packs / files already added to LOAD.want
export function expect(paths) { // tell the bar what a phase is about to fetch
  for (const p of paths) {
    const pk = usePacks() && PACKS[p];
    const key = pk ? 'pack:' + pk[0] : p; if (counted.has(key)) continue; counted.add(key);
    LOAD.want += pk ? PACK_URLS[pk[0]][1] : BYTES() ? (ASSET_SIZES[p] || 50000) : 1;
  }
  if (LOAD.onChange) LOAD.onChange();
}
async function readAll(resp, onBytes) { // stream the body so the bar moves inside big files
  if (!resp.body || !resp.body.getReader) { const b = await resp.arrayBuffer(); onBytes(b.byteLength); return b; }
  const rd = resp.body.getReader(), chunks = []; let n = 0;
  for (;;) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); n += value.byteLength; onBytes(value.byteLength); }
  const out = new Uint8Array(n); let o = 0; for (const c of chunks) { out.set(c, o); o += c.byteLength; } return out.buffer;
}
const packP = {};
function loadPack(i) {
  if (packP[i]) return packP[i];
  const [url, gz] = PACK_URLS[i]; const live = counted.has('pack:' + i);
  if (!live) { counted.add('pack:' + i); LOAD.want += gz; }
  return packP[i] = (async () => {
    const r = await fetch(url); if (!r.ok) throw new Error('pack ' + i + ' ' + r.status);
    let seen = 0;
    const counter = new TransformStream({ transform(c, ctl) { seen += c.byteLength; tick(c.byteLength); ctl.enqueue(c); } });
    const b = await new Response(r.body.pipeThrough(counter).pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    if (seen < gz) tick(gz - seen); // a proxy that inflated it on the way
    return b;
  })();
}
const cache = new Map();
export function fetchAsset(p) {
  if (cache.has(p)) return cache.get(p);
  const pr = (async () => {
    LOAD.log.push(p);
    const pk = usePacks() && PACKS[p];
    if (pk) {
      try { const b = await loadPack(pk[0]); return b.slice(pk[1], pk[1] + pk[2]); }
      catch (e) { console.warn('pack failed, using single files', e && e.message); packFailed = true; }
    }
    if (!counted.has(p)) { counted.add(p); LOAD.want += BYTES() ? (ASSET_SIZES[p] || 50000) : 1; }
    const m = ASSET_MAP[p], sz = ASSET_SIZES[p];
    const per = (n) => { if (BYTES()) tick(n); };
    let b;
    if (Array.isArray(m) && m.length > 1) {
      const parts = await Promise.all(m.map((h, i) => fetch(h + p + '.part' + i + (ASSET_VER ? '?v=' + ASSET_VER : '')).then(r => { if (!r.ok) throw new Error(p + ' part ' + i + ' ' + r.status); return readAll(r, per); })));
      const n = parts.reduce((a, c) => a + c.byteLength, 0), out = new Uint8Array(n); let o = 0; for (const c of parts) { out.set(new Uint8Array(c), o); o += c.byteLength; }
      b = out.buffer;
    } else { const r = await fetch(assetURL(p)); if (!r.ok) throw new Error(p + ' ' + r.status); b = await readAll(r, per); }
    if (!BYTES()) tick(1); else if (sz && b.byteLength < sz) tick(sz - b.byteLength);
    return b;
  })();
  cache.set(p, pr); pr.catch(() => cache.delete(p));
  return pr;
}
export function forget(p) { cache.delete(p); } // drop parsed bytes (phone memory)
export async function assetBlobURL(p, type) { const b = await fetchAsset(p); return URL.createObjectURL(new Blob([b], type ? { type } : {})); }
// textures: fetched as bytes (so they ride in the packs) and decoded by an <img> (same orientation as THREE.TextureLoader)
export async function assetImage(p) {
  const b = await fetchAsset(p); const url = URL.createObjectURL(new Blob([b], { type: /\.webp$/.test(p) ? 'image/webp' : /\.png$/.test(p) ? 'image/png' : 'image/jpeg' }));
  const img = new Image(); img.decoding = 'async'; img.src = url;
  try { await img.decode(); } catch (e) { if (!img.complete || !img.naturalWidth) { URL.revokeObjectURL(url); throw e; } }
  URL.revokeObjectURL(url); return img;
}
