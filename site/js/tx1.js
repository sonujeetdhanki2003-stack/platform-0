// Procedural canvas textures for PLATFORM 0
import * as THREE from './three.module.min.js';

export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; try { c.getContext('2d', { willReadFrequently: true }); } catch (e) {} return c; }
export function toTex(c, rep) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 2;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
function rnd(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function grime(g, w, h, n, alpha, seed) {
  const r = rnd(seed || 7);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rad = 4 + r() * 40;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(30,25,10,${alpha * r()})`); gr.addColorStop(1, 'rgba(30,25,10,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}
let _nz = null; // v3.1.1: noise from a precomputed table (one PRNG call per pixel was ~0.6 s of a phone's boot)
function noise(g, w, h, a, seed) {
  if (!_nz) { _nz = new Float32Array(1 << 18); const r = rnd(12345); for (let i = 0; i < _nz.length; i++) _nz[i] = r() - 0.5; }
  const d = g.getImageData(0, 0, w, h); const p = d.data; let o = (((seed || 3) * 104729) >>> 0) % _nz.length;
  for (let i = 0; i < p.length; i += 4) { const v = _nz[o] * a; o = o + 1 === _nz.length ? 0 : o + 1; p[i] += v; p[i + 1] += v; p[i + 2] += v; }
  g.putImageData(d, 0, 0);
}
const FONT = '"Arial Narrow", "Helvetica Neue", Arial, sans-serif';

export function wallTex() {
  const c = canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#cfc6a4'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#9d957a'; g.lineWidth = 2;
  for (let y = 0; y <= 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  for (let x = 0; x <= 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
  // green dado band at bottom
  g.fillStyle = '#3f6b4e'; g.fillRect(0, 176, 256, 80);
  g.fillStyle = '#2b4c37'; g.fillRect(0, 172, 256, 6);
  // paan stains at the bottom
  const r = rnd(11);
  for (let i = 0; i < 3; i++) { const x = r() * 256, y = 236 + r() * 14; for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(${100 + r() * 40},18,12,${0.25 + r() * 0.35})`; g.beginPath(); g.arc(x + (r() - 0.5) * 22, y + (r() - 0.5) * 12 - k * 0.6, 0.8 + r() * 3.2, 0, 7); g.fill(); } g.fillStyle = 'rgba(110,20,14,.35)'; g.fillRect(x - 1, y - 18, 2, 18); }
  grime(g, 256, 256, 40, 0.35, 5); noise(g, 256, 256, 18, 9);
  return c;
}
export function floorTex() {
  const c = canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#6d6a63'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(30,30,30,.5)'; g.lineWidth = 2;
  for (let y = 0; y <= 256; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  for (let x = 0; x <= 256; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
  grime(g, 256, 256, 60, 0.45, 21); noise(g, 256, 256, 30, 4);
  return c;
}
export function edgeTex() {
  const c = canvas(128, 32), g = c.getContext('2d');
  g.fillStyle = '#c9a51c'; g.fillRect(0, 0, 128, 32);
  g.fillStyle = 'rgba(0,0,0,.25)';
  for (let x = 4; x < 128; x += 10) for (let y = 4; y < 32; y += 10) { g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); }
  grime(g, 128, 32, 12, 0.5, 2); noise(g, 128, 32, 25, 8);
  return c;
}
export function gravelTex() {
  const c = canvas(128, 128), g = c.getContext('2d');
  g.fillStyle = '#3a3631'; g.fillRect(0, 0, 128, 128);
  const r = rnd(5);
  for (let i = 0; i < 900; i++) { const v = 40 + r() * 60 | 0; g.fillStyle = `rgb(${v},${v - 4},${v - 9})`; g.fillRect(r() * 128, r() * 128, 2 + r() * 3, 2 + r() * 3); }
  return c;
}
export function roofTex() {
  const c = canvas(128, 128), g = c.getContext('2d');
  g.fillStyle = '#2e3236'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#24282b'; for (let x = 0; x < 128; x += 16) g.fillRect(x, 0, 6, 128);
  noise(g, 128, 128, 16, 2); return c;
}

// --- Posters ---
export function animePoster(variant) {
  const c = canvas(256, 384), g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, 384); bg.addColorStop(0, '#f6a6c1'); bg.addColorStop(1, '#5a3d8a');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 384);
  // petals
  const r = rnd(4); g.fillStyle = 'rgba(255,230,240,.8)';
  for (let i = 0; i < 30; i++) { g.beginPath(); g.ellipse(r() * 256, r() * 260, 4, 2, r() * 3, 0, 7); g.fill(); }
  // hair back
  g.fillStyle = '#1d1b3a'; g.beginPath(); g.ellipse(128, 170, 92, 110, 0, 0, 7); g.fill();
  g.fillRect(40, 170, 176, 120);
  // face
  g.fillStyle = '#ffe1cf'; g.beginPath(); g.ellipse(128, 175, 66, 80, 0, 0, 7); g.fill();
  // bangs
  g.fillStyle = '#26234a'; g.beginPath(); g.moveTo(52, 150); g.quadraticCurveTo(128, 50, 204, 150); g.lineTo(190, 128); g.lineTo(170, 160); g.lineTo(150, 120); g.lineTo(128, 165); g.lineTo(104, 122); g.lineTo(86, 160); g.lineTo(66, 128); g.closePath(); g.fill();
  // eyes
  for (const ex of [98, 158]) {
    if (variant === 'eyes') {
      g.fillStyle = '#000'; g.beginPath(); g.ellipse(ex, 188, 18, 22, 0, 0, 7); g.fill();
      g.fillStyle = '#7a0000'; g.fillRect(ex - 3, 205, 6, 60); g.fillRect(ex - 1, 262, 3, 25);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, 188, 2, 0, 7); g.fill();
    } else {
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex, 188, 17, 21, 0, 0, 7); g.fill();
      const lx = variant === 'lookL' ? -12 : variant === 'lookR' ? 12 : 0; // v3.5: 'poster_follow' — the pupils turn toward you
      g.save(); g.beginPath(); g.ellipse(ex, 188, 17, 21, 0, 0, 7); g.clip();
      g.fillStyle = '#7a3cc2'; g.beginPath(); g.ellipse(ex + lx, 192, 12, 16, 0, 0, 7); g.fill();
      g.fillStyle = '#2a0f4a'; g.beginPath(); g.ellipse(ex + lx * 1.15, 194, 6, 9, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex - 5 + lx, 185, 4, 0, 7); g.fill(); g.restore();
      g.strokeStyle = '#1d1b3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(ex - 20, 172); g.quadraticCurveTo(ex, 160, ex + 20, 172); g.stroke();
    }
  }
  // mouth
  g.strokeStyle = variant === 'eyes' ? '#3a0000' : '#b5545f'; g.lineWidth = 3; g.beginPath();
  if (variant === 'eyes') { g.moveTo(98, 232); g.quadraticCurveTo(128, 262, 158, 232); } else { g.moveTo(118, 232); g.quadraticCurveTo(128, 238, 138, 232); }
  g.stroke();
  // title
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 300, 256, 84);
  g.fillStyle = '#fff'; g.font = `bold 34px ${FONT}`; g.textAlign = 'center'; g.fillText('SAKURA', 128, 336);
  g.fillStyle = '#ffb3cf'; g.font = `bold 22px ${FONT}`; g.fillText('EXPRESS', 128, 362);
  g.fillStyle = '#ddd'; g.font = `11px ${FONT}`; g.fillText('IN CINEMAS THIS FRIDAY', 128, 378);
  grime(g, 256, 384, 20, 0.3, 9); noise(g, 256, 384, 14, 6);
  return c;
}
export function missingPoster(variant, dateStr) {
  const c = canvas(256, 360), g = c.getContext('2d');
  g.fillStyle = '#ece6d4'; g.fillRect(0, 0, 256, 360);
  g.fillStyle = '#b01010'; g.font = `bold 46px ${FONT}`; g.textAlign = 'center'; g.fillText('MISSING', 128, 52);
  g.fillStyle = '#ccc6b4'; g.fillRect(58, 70, 140, 160);
  if (variant === 'you') {
    // silhouette of a person seen from behind wearing headphones
    g.fillStyle = '#111'; g.beginPath(); g.arc(128, 135, 34, 0, 7); g.fill();
    g.beginPath(); g.ellipse(128, 230, 62, 60, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#b3121b'; g.fillRect(84, 186, 88, 44);
    g.strokeStyle = '#333'; g.lineWidth = 7; g.beginPath(); g.arc(128, 135, 40, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.fillStyle = '#333'; g.fillRect(84, 126, 12, 22); g.fillRect(160, 126, 12, 22);
    g.fillStyle = '#222'; g.font = `bold 30px ${FONT}`; g.fillText('THE PLAYER', 128, 268);
    g.font = `15px ${FONT}`; g.fillText('Last seen walking on Platform 0', 128, 294);
    g.fillText(dateStr || 'tonight', 128, 314);
    g.fillStyle = '#b01010'; g.font = `bold 15px ${FONT}`; g.fillText('PLEASE DO NOT LOOK BACK', 128, 342);
  } else {
    // sketch of a man's face
    g.fillStyle = '#6b5a4a'; g.beginPath(); g.ellipse(128, 150, 42, 54, 0, 0, 7); g.fill();
    g.fillStyle = '#1e1a16'; g.beginPath(); g.ellipse(128, 110, 46, 24, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#1e1a16'; g.fillRect(108, 142, 12, 5); g.fillRect(136, 142, 12, 5); g.fillRect(114, 176, 28, 6);
    g.fillStyle = '#ccc6b4'; g.fillRect(58, 200, 140, 30);
    g.fillStyle = '#3c3c46'; g.fillRect(84, 205, 88, 25);
    g.fillStyle = '#222'; g.font = `bold 26px ${FONT}`; g.fillText('RAMESH K., 42', 128, 266);
    g.font = `15px ${FONT}`; g.fillText('Last seen at this station', 128, 292);
    g.fillText('wearing grey shirt', 128, 312);
    g.fillStyle = '#b01010'; g.font = `bold 15px ${FONT}`; g.fillText('CALL 1512', 128, 342);
  }
  grime(g, 256, 360, 25, 0.35, 3); noise(g, 256, 360, 18, 12);
  return c;
}
export function chaiPoster() {
  const c = canvas(256, 384), g = c.getContext('2d');
  g.fillStyle = '#d9541e'; g.fillRect(0, 0, 256, 384);
  g.fillStyle = '#ffd34d'; g.font = `bold 52px ${FONT}`; g.textAlign = 'center'; g.fillText('KISMAT', 128, 70);
  g.fillStyle = '#fff'; g.font = `bold 40px ${FONT}`; g.fillText('CHAI', 128, 112);
  // glass of chai
  g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(88, 150); g.lineTo(168, 150); g.lineTo(156, 290); g.lineTo(100, 290); g.closePath(); g.fill();
  g.fillStyle = '#b7713a'; g.beginPath(); g.moveTo(92, 180); g.lineTo(164, 180); g.lineTo(156, 285); g.lineTo(100, 285); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3;
  for (const x of [110, 128, 146]) { g.beginPath(); g.moveTo(x, 140); g.bezierCurveTo(x - 12, 125, x + 12, 110, x, 92 + 40); g.stroke(); }
  g.fillStyle = '#fff'; g.font = `bold 28px ${FONT}`; g.fillText('ONLY Rs 10', 128, 330);
  g.font = `16px ${FONT}`; g.fillText('garam garam, har platform par', 128, 360);
  grime(g, 256, 384, 25, 0.35, 8); noise(g, 256, 384, 14, 2);
  return c;
}
export function railNotice() {
  const c = canvas(256, 192), g = c.getContext('2d');
  g.fillStyle = '#1f3f7a'; g.fillRect(0, 0, 256, 192);
  g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(8, 8, 240, 176);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `bold 22px ${FONT}`; g.fillText('DO NOT CROSS', 128, 50); g.fillText('THE TRACKS', 128, 76);
  g.font = `15px ${FONT}`; g.fillText('Use the foot over bridge.', 128, 108); g.fillText('Penalty up to Rs 1000.', 128, 130);
  g.font = `bold 13px ${FONT}`; g.fillText('BY ORDER — STATION MASTER', 128, 166);
  grime(g, 256, 192, 15, 0.35, 1); return c;
}
export function rulesNotice() {
  const c = canvas(320, 400), g = c.getContext('2d');
  g.fillStyle = '#f0ead6'; g.fillRect(0, 0, 320, 400);
  g.fillStyle = '#7a1010'; g.fillRect(0, 0, 320, 56);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `bold 26px ${FONT}`; g.fillText('NOTICE TO PASSENGERS', 160, 38);
  g.fillStyle = '#1a1a1a'; g.textAlign = 'left'; g.font = `19px ${FONT}`;
  const L = ['Look carefully at the platform.', '', 'If something is WRONG,', '  turn back immediately.', '', 'If nothing is wrong,', '  keep walking.', '', 'Reach PLATFORM 8 to exit.', '', 'Do not trust the announcements.'];
  L.forEach((s, i) => g.fillText(s, 22, 96 + i * 26));
  g.textAlign = 'center'; g.font = `bold 13px ${FONT}`; g.fillStyle = '#7a1010'; g.fillText('— STATION MASTER, PLATFORM 0 —', 160, 386);
  grime(g, 320, 400, 20, 0.3, 4); noise(g, 320, 400, 12, 5);
  return c;
}
export function stationSign(n, exit) {
  const c = canvas(512, 128), g = c.getContext('2d');
  g.fillStyle = '#f2c613'; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#111'; g.lineWidth = 8; g.strokeRect(6, 6, 500, 116);
  g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (exit) { g.font = `bold 64px ${FONT}`; g.fillText('PLATFORM 8  EXIT', 256, 68); }
  else { g.font = `bold 82px ${FONT}`; g.fillText('PLATFORM ' + n, 256, 70); }
  grime(g, 512, 128, 18, 0.3, 6 + n);
  return c;
}
export function pillarSign(mirror) {
  const c = canvas(128, 128), g = c.getContext('2d');
  g.fillStyle = '#f2c613'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#111'; g.lineWidth = 6; g.strokeRect(4, 4, 120, 120);
  if (mirror) { g.translate(128, 0); g.scale(-1, 1); }
  g.fillStyle = '#111'; g.textAlign = 'center'; g.font = `bold 20px ${FONT}`; g.fillText('PLATFORM', 64, 34);
  g.font = `bold 72px ${FONT}`; g.fillText(mirror ? 'Ↄ' : '0', 64, 108);
  return c;
}
export function ledBoard(lines, color) {
  const c = canvas(512, 128), g = c.getContext('2d');
  g.fillStyle = '#0a0806'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = color || '#ff8a1c'; g.font = `bold 34px "Courier New", monospace`; g.textBaseline = 'middle';
  lines.forEach((s, i) => g.fillText(s, 14, 34 + i * 58));
  // LED dot mask
  g.fillStyle = 'rgba(0,0,0,.45)';
  for (let x = 0; x < 512; x += 4) g.fillRect(x, 0, 1, 128);
  for (let y = 0; y < 128; y += 4) g.fillRect(0, y, 512, 1);
  return c;
}
export function clockFace() {
  const c = canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#111'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#efeadb'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill();
  g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold 26px ${FONT}`;
  for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; g.fillText(String(i), 128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96); }
  for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; const r1 = i % 5 ? 112 : 106; g.fillRect(0, 0, 0, 0); g.beginPath(); g.moveTo(128 + Math.sin(a) * r1, 128 - Math.cos(a) * r1); g.lineTo(128 + Math.sin(a) * 117, 128 - Math.cos(a) * 117); g.lineWidth = i % 5 ? 1.5 : 4; g.strokeStyle = '#111'; g.stroke(); }
  g.font = `bold 12px ${FONT}`; g.fillText('INDIAN RLY', 128, 170);
  noise(g, 256, 256, 10, 3); return c;
}
export function trainSide(kind) {
  const c = canvas(512, 128), g = c.getContext('2d');
  if (kind === 'black') { g.fillStyle = '#060606'; g.fillRect(0, 0, 512, 128); noise(g, 512, 128, 10, 3); return c; }
  g.fillStyle = '#7d1f24'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#e4d9b8'; g.fillRect(0, 84, 512, 10);
  const r = rnd(kind === 'faces' ? 31 : 13);
  for (let i = 0; i < 8; i++) {
    const x = 20 + i * 62; if (i === 3 || i === 4) { g.fillStyle = '#3a1013'; g.fillRect(x, 18, 46, 100); continue; }
    g.fillStyle = kind === 'faces' ? '#ff2a1a' : '#ffe9a8'; g.fillRect(x, 24, 46, 46);
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 28; y < 70; y += 7) g.fillRect(x, y, 46, 2);
    if (kind === 'faces' || r() < 0.3) { // silhouettes
      g.fillStyle = kind === 'faces' ? '#140000' : 'rgba(40,30,20,.7)';
      g.beginPath(); g.arc(x + 23, 46, 11, 0, 7); g.fill(); g.fillRect(x + 8, 56, 30, 16);
      if (kind === 'faces') { g.fillStyle = '#fff'; g.fillRect(x + 17, 43, 4, 3); g.fillRect(x + 26, 43, 4, 3); }
    }
  }
  grime(g, 512, 128, 25, 0.45, 2); noise(g, 512, 128, 14, 7);
  return c;
}
export function scareFace() {
  const c = canvas(256, 256), g = c.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  const gr = g.createRadialGradient(128, 128, 30, 128, 128, 128); gr.addColorStop(0, '#d8d0c4'); gr.addColorStop(0.75, '#7d756c'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(128, 130, 100, 124, 0, 0, 7); g.fill();
  g.fillStyle = '#000';
  g.beginPath(); g.ellipse(88, 110, 24, 30, 0.2, 0, 7); g.fill();
  g.beginPath(); g.ellipse(168, 110, 24, 30, -0.2, 0, 7); g.fill();
  g.beginPath(); g.ellipse(128, 196, 34, 46, 0, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(90, 112, 3, 0, 7); g.arc(166, 112, 3, 0, 7); g.fill();
  g.fillStyle = '#1a0000'; g.fillRect(112, 120, 3, 40); g.fillRect(142, 120, 3, 40);
  noise(g, 256, 256, 40, 9); return c;
}
export function footprintTex() {
  const c = canvas(64, 128), g = c.getContext('2d');
  g.fillStyle = 'rgba(20,24,28,.85)';
  g.beginPath(); g.ellipse(32, 80, 16, 34, 0, 0, 7); g.fill();
  for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(18 + i * 7, 34 - Math.sin(i / 4 * Math.PI) * 6, 4.5 - i * 0.4, 0, 7); g.fill(); }
  return c;
}
export function puddleTex(red) {
  const c = canvas(128, 128), g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 5, 64, 64, 62); gr.addColorStop(0, red ? 'rgba(120,0,0,.95)' : 'rgba(30,40,45,.8)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(64, 64, 62, 46, 0.3, 0, 7); g.fill(); return c;
}
export function stallSign() {
  const c = canvas(256, 64), g = c.getContext('2d');
  g.fillStyle = '#1a6d3b'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#ffe08a'; g.font = `bold 30px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('CHAI  •  SAMOSA', 128, 34); return c;
}
export function coolerSign() {
  const c = canvas(128, 64), g = c.getContext('2d');
  g.fillStyle = '#e9e9e9'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#1f4fa0'; g.font = `bold 17px ${FONT}`; g.textAlign = 'center';
  g.fillText('DRINKING', 64, 26); g.fillText('WATER', 64, 48); return c;
}
export function exitSign() {
  const c = canvas(256, 96), g = c.getContext('2d');
  g.fillStyle = '#0b7a3a'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#fff'; g.font = `bold 60px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('EXIT →', 128, 52); return c;
}
