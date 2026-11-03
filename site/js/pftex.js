// PLATFORM 0 v3.6 — the nine platforms' SURFACES (canvas textures, 256², tiling): back wall, dado, floor, roof.
// His words (Nov 1, 3:38 PM): "I want you change all the platforms each looking different from the other not just the lights".
// Every surface is drawn to the same mid-dark average brightness, so no platform reads brighter or cheerier than another.
import * as M from './mats.js';
import { rngOf } from './pfvariety.js';

function cv(seed) { const c = M.canvas(256, 256), g = c.getContext('2d'), R = rngOf(seed); return { c, g, R }; }
const rgba = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
function jitter(R, base, j) { return base.map(v => Math.max(0, Math.min(255, v + (R() - 0.5) * 2 * j))); }
function grimeOver(g, R, n, a = 0.18, col = [20, 16, 12]) { for (let i = 0; i < n; i++) { const x = R() * 256, y = R() * 256, r = 6 + R() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(...col, a * (0.4 + R() * 0.6))); gr.addColorStop(1, rgba(...col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } }
function streaksDown(g, R, n, col, a = 0.35, wMax = 5) { for (let i = 0; i < n; i++) { const x = R() * 256, w = 1 + R() * wMax, h = 60 + R() * 196, y = R() * 40; const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, rgba(...col, a)); gr.addColorStop(1, rgba(...col, 0)); g.fillStyle = gr; g.fillRect(x, y, w, h); } }
function cracks(g, R, n, col = 'rgba(10,8,6,.8)', w = 1.4) { g.strokeStyle = col; g.lineWidth = w; for (let i = 0; i < n; i++) { let x = R() * 256, y = R() * 256, a = R() * 6.3; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 9; k++) { a += (R() - 0.5) * 1.2; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); if (R() < 0.18) { const bx = x, by = y; g.moveTo(bx, by); g.lineTo(bx + (R() - 0.5) * 24, by + (R() - 0.5) * 24); g.moveTo(x, y); } } g.stroke(); } }
// tiles in a grid (w x h px, grout px, optional brick offset)
function tiles(g, R, w, h, grout, base, j, groutCol, offset = 0, miss = 0, missCol = null) {
  g.fillStyle = groutCol; g.fillRect(0, 0, 256, 256);
  for (let y = 0, row = 0; y < 256; y += h, row++) for (let x = -w + ((row % 2) ? offset : 0); x < 256 + w; x += w) {
    if (R() < miss) { g.fillStyle = missCol || groutCol; g.fillRect(x + grout / 2, y + grout / 2, w - grout, h - grout); continue; }
    const c = jitter(R, base, j); g.fillStyle = rgba(...c); g.fillRect(x + grout / 2, y + grout / 2, w - grout, h - grout);
    g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x + grout / 2, y + grout / 2, w - grout, 1.5); }
}

// ---------- back wall (256² = 2 m x 2.1 m; repeat 20 x 2 on the 40 m x 4.2 m wall) ----------
export function wallTex(n) {
  const { c, g, R } = cv(500 + n * 13);
  switch (n) {
    case 0: // cracked glazed green tiles, water streaks
      tiles(g, R, 19, 19, 2, [88, 118, 96], 14, '#1e2620', 0, 0.035, '#3a3a32'); cracks(g, R, 5, 'rgba(14,20,16,.8)', 1.2); streaksDown(g, R, 18, [16, 26, 20], 0.5, 6); grimeOver(g, R, 18, 0.22); break;
    case 1: // exposed red brick
      tiles(g, R, 29, 10, 2.5, [120, 58, 38], 22, '#3e3428', 14); grimeOver(g, R, 22, 0.25, [20, 10, 6]); streaksDown(g, R, 8, [30, 14, 8], 0.4); break;
    case 2: { // two-tone plaster with big peeling patches showing brick
      g.fillStyle = '#53627a'; g.fillRect(0, 0, 256, 256); grimeOver(g, R, 30, 0.2);
      for (let i = 0; i < 5; i++) { const x = R() * 230, y = R() * 220, w = 26 + R() * 70, h = 18 + R() * 50; g.save(); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; g.lineTo(x + w / 2 + Math.cos(a) * w / 2 * (0.7 + R() * 0.5), y + h / 2 + Math.sin(a) * h / 2 * (0.7 + R() * 0.5)); } g.closePath(); g.clip(); tiles(g, R, 29, 10, 2.5, [104, 56, 40], 18, '#3a3026', 14); g.restore(); }
      streaksDown(g, R, 14, [20, 22, 30], 0.45); break; }
    case 3: { // vertical corrugated fibre-cement sheets, broken edges, droppings
      g.fillStyle = '#8a8c84'; g.fillRect(0, 0, 256, 256);
      for (let x = 0; x < 256; x += 19) { const gr = g.createLinearGradient(x, 0, x + 19, 0); gr.addColorStop(0, 'rgba(0,0,0,.42)'); gr.addColorStop(0.45, 'rgba(255,255,255,.08)'); gr.addColorStop(1, 'rgba(0,0,0,.42)'); g.fillStyle = gr; g.fillRect(x, 0, 19, 256); }
      g.fillStyle = 'rgba(15,15,12,.75)'; g.fillRect(0, 126, 256, 4); // sheet overlap seam
      for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(230,228,215,${0.4 + R() * 0.4})`; g.fillRect(R() * 256, R() * 256, 1.5 + R() * 2, 2 + R() * 4); }
      streaksDown(g, R, 16, [40, 36, 24], 0.4); cracks(g, R, 3); grimeOver(g, R, 14, 0.25); break; }
    case 4: // dirty white metro tiles (brick bond)
      tiles(g, R, 19, 10, 1.6, [150, 146, 132], 10, '#3c3a32', 9, 0.02, '#2a2620'); grimeOver(g, R, 30, 0.28, [40, 34, 18]); streaksDown(g, R, 10, [60, 50, 20], 0.35); cracks(g, R, 2); break;
    case 5: { // cream plaster with ruled panels (a station office front) and damp
      g.fillStyle = '#8e826c'; g.fillRect(0, 0, 256, 256); grimeOver(g, R, 26, 0.22);
      g.strokeStyle = 'rgba(30,22,16,.55)'; g.lineWidth = 3; for (let x = 0; x < 256; x += 64) { g.strokeRect(x + 6, 14, 52, 228); } g.strokeStyle = 'rgba(255,240,210,.12)'; g.lineWidth = 1; for (let x = 0; x < 256; x += 64) g.strokeRect(x + 9, 17, 46, 222);
      streaksDown(g, R, 10, [40, 30, 20], 0.4); break; }
    case 6: { // plaster smothered in dead ivy
      g.fillStyle = '#6a6a5e'; g.fillRect(0, 0, 256, 256); cracks(g, R, 4);
      g.strokeStyle = 'rgba(40,34,24,.85)'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { let x = R() * 256, y = 256; g.beginPath(); g.moveTo(x, y); while (y > 0) { x += (R() - 0.5) * 18; y -= 14; g.lineTo(x, y); } g.stroke(); }
      for (let i = 0; i < 420; i++) { const x = R() * 256, y = R() * 256, s = 3 + R() * 6, k = R(); g.fillStyle = k < 0.5 ? rgba(34 + R() * 20, 52 + R() * 26, 26, 0.92) : k < 0.8 ? rgba(70 + R() * 30, 58 + R() * 20, 30, 0.9) : rgba(22, 30, 18, 0.95); g.beginPath(); g.ellipse(x, y, s, s * 0.6, R() * 3, 0, 7); g.fill(); }
      break; }
    case 7: { // rusted, soot-streaked HORIZONTAL corrugated sheeting
      g.fillStyle = '#3e3a36'; g.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 12) { const gr = g.createLinearGradient(0, y, 0, y + 12); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.5, 'rgba(200,190,170,.10)'); gr.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = gr; g.fillRect(0, y, 256, 12); }
      g.fillStyle = 'rgba(0,0,0,.7)'; for (const x of [0, 128]) g.fillRect(x, 0, 3, 256); for (let y = 6; y < 256; y += 24) for (const x of [4, 124, 132, 252]) { g.fillStyle = 'rgba(20,16,12,.8)'; g.fillRect(x - 1, y, 3, 3); }
      grimeOver(g, R, 30, 0.38, [70, 34, 12]); streaksDown(g, R, 14, [0, 0, 0], 0.55, 10); break; }
    case 8: { // 4.2 m tall: dark wood panelling to 1.1 m, a rail, mouldy cream plaster above
      g.fillStyle = '#8a8068'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 22; i++) { const x = R() * 256, y = R() * 180, r = 10 + R() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(36,40,24,.5)'); gr.addColorStop(1, 'rgba(50,52,30,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      const py = 256 - 67; g.fillStyle = '#2a1a10'; g.fillRect(0, py, 256, 67); for (let x = 0; x < 256; x += 32) { g.fillStyle = 'rgba(80,52,28,.55)'; g.fillRect(x + 4, py + 8, 24, 52); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.5; g.strokeRect(x + 4, py + 8, 24, 52); }
      g.fillStyle = '#4a3220'; g.fillRect(0, py - 5, 256, 6); g.fillStyle = 'rgba(30,22,14,.7)'; g.fillRect(0, 0, 256, 5); streaksDown(g, R, 10, [30, 26, 16], 0.4); break; }
  }
  return c;
}
// dado band (1 m tall): null = hidden on that platform
export function dadoTex(n) {
  const { c, g, R } = cv(700 + n * 17);
  switch (n) {
    case 0: tiles(g, R, 19, 19, 2, [30, 58, 42], 10, '#0e1610', 0, 0.04, '#1a1a14'); grimeOver(g, R, 20, 0.3); return c;
    case 2: g.fillStyle = '#1e2738'; g.fillRect(0, 0, 256, 256); grimeOver(g, R, 30, 0.3); cracks(g, R, 3); return c;
    case 4: tiles(g, R, 19, 10, 1.6, [126, 98, 30], 12, '#2e2614', 9); grimeOver(g, R, 30, 0.3); return c;
    case 5: g.fillStyle = '#4a1c22'; g.fillRect(0, 0, 256, 256); grimeOver(g, R, 26, 0.3); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, 0, 256, 8); return c;
    // PF 8: the panelling is part of its tall wall canvas
  }
  return null;
}
// ---------- floor (256² = 2 m x 2 m; repeat 3 x 20) ----------
export function floorTex(n) {
  const { c, g, R } = cv(900 + n * 19);
  switch (n) {
    case 0: { // big wet stone slabs
      g.fillStyle = '#16181a'; g.fillRect(0, 0, 256, 256);
      for (let y = 0, r = 0; y < 256; y += 85, r++) for (let x = (r % 2) * -64; x < 256; x += 128) { const k = jitter(R, [92, 96, 94], 10); g.fillStyle = rgba(...k); g.fillRect(x + 2, y + 2, 124, 81); }
      grimeOver(g, R, 26, 0.3, [10, 14, 16]); cracks(g, R, 4); for (let i = 0; i < 6; i++) { const x = R() * 256, y = R() * 256; g.fillStyle = 'rgba(8,12,14,.35)'; g.beginPath(); g.ellipse(x, y, 20 + R() * 30, 10 + R() * 18, R() * 3, 0, 7); g.fill(); } break; }
    case 1: { // basket-weave brick pavers
      g.fillStyle = '#2a201a'; g.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) { const hor = ((x + y) / 32) % 2 === 0; for (let k = 0; k < 2; k++) { const c2 = jitter(R, [112, 66, 46], 18); g.fillStyle = rgba(...c2); if (hor) g.fillRect(x + 1, y + 1 + k * 16, 30, 14); else g.fillRect(x + 1 + k * 16, y + 1, 14, 30); } }
      grimeOver(g, R, 26, 0.32); break; }
    case 2: { // terrazzo with a crack network
      g.fillStyle = '#6c6e70'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 1400; i++) { const k = R(); g.fillStyle = k < 0.4 ? 'rgba(30,30,32,.7)' : k < 0.75 ? 'rgba(160,156,150,.7)' : 'rgba(110,70,60,.6)'; g.fillRect(R() * 256, R() * 256, 1 + R() * 3, 1 + R() * 3); }
      g.fillStyle = 'rgba(14,14,16,.92)'; for (let x = 0; x < 256; x += 128) { g.fillRect(x, 0, 9, 256); g.fillRect(0, x, 256, 9); } g.fillStyle = 'rgba(190,186,176,.5)'; for (let x = 0; x < 256; x += 128) { g.fillRect(x + 9, 0, 3, 256); g.fillRect(0, x + 9, 256, 3); } cracks(g, R, 9, 'rgba(8,8,8,.85)', 1.6); grimeOver(g, R, 18, 0.24); break; } // v3.6.1: bold black brass-strip grid every metre
    case 3: { // broken concrete, patched, droppings
      g.fillStyle = '#6a685e'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 9; i++) { const k = jitter(R, [82, 80, 72], 16); g.fillStyle = rgba(...k); g.fillRect(R() * 220, R() * 220, 30 + R() * 80, 20 + R() * 60); }
      cracks(g, R, 8, 'rgba(10,10,8,.85)', 2); for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(225,222,205,${0.35 + R() * 0.4})`; g.beginPath(); g.arc(R() * 256, R() * 256, 1 + R() * 2.5, 0, 7); g.fill(); } grimeOver(g, R, 22, 0.3); break; }
    case 4: { // small hexagonal tiles
      g.fillStyle = '#0e0d0a'; g.fillRect(0, 0, 256, 256); const r = 256 / 9, h = r * Math.sqrt(3); /* v3.6.1: big hexes, black grout */
      for (let y = -h, row = 0; y < 256 + h; y += h / 2, row++) for (let x = (row % 2) * r * 1.5 - 2 * r; x < 256 + 2 * r; x += r * 3) { const k = R() < 0.07 ? [60, 56, 46] : jitter(R, [124, 118, 100], 10); g.fillStyle = rgba(...k); g.beginPath(); for (let a = 0; a < 6; a++) g.lineTo(x + Math.cos(a * Math.PI / 3) * (r - 3.5), y + Math.sin(a * Math.PI / 3) * (r - 3.5)); g.fill(); }
      grimeOver(g, R, 30, 0.35, [30, 24, 10]); break; }
    case 5: { // worn chequerboard
      for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) { const d = ((x + y) / 32) % 2; const k = jitter(R, d ? [30, 28, 30] : [124, 120, 112], 8); g.fillStyle = rgba(...k); g.fillRect(x, y, 32, 32); }
      g.fillStyle = 'rgba(0,0,0,.4)'; for (let x = 0; x < 256; x += 32) { g.fillRect(x, 0, 1, 256); g.fillRect(0, x, 256, 1); } grimeOver(g, R, 30, 0.35); cracks(g, R, 3); break; }
    case 6: { // cracked slabs with weeds in the cracks
      g.fillStyle = '#1c2016'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 64) { const k = jitter(R, [84, 86, 76], 12); g.fillStyle = rgba(...k); g.fillRect(x + 3 + R() * 3, y + 3 + R() * 3, 56 + R() * 3, 56 + R() * 3); }
      for (let i = 0; i < 260; i++) { const onX = R() < 0.5, a = Math.floor(R() * 4) * 64 + 2, b = R() * 256; g.fillStyle = rgba(40 + R() * 30, 60 + R() * 30, 24, 0.9); g.beginPath(); g.ellipse(onX ? a : b, onX ? b : a, 2 + R() * 5, 1.5 + R() * 3, R() * 3, 0, 7); g.fill(); }
      cracks(g, R, 4); grimeOver(g, R, 18, 0.3); break; }
    case 7: { // asphalt, faded line, oil
      g.fillStyle = '#3a3936'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${R() < 0.5 ? 0 : 150},${R() < 0.5 ? 0 : 150},${R() < 0.5 ? 0 : 140},${0.12 + R() * 0.2})`; g.fillRect(R() * 256, R() * 256, 1.4, 1.4); }
      g.save(); g.beginPath(); g.rect(0, 0, 256, 256); g.clip(); g.fillStyle = 'rgba(176,166,120,.62)'; for (let k = -256; k < 512; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 26, 0); g.lineTo(k + 26 + 256, 256); g.lineTo(k + 256, 256); g.fill(); } g.restore(); /* v3.6.1: a faded painted hatch */ for (let i = 0; i < 6; i++) { const x = R() * 256, y = R() * 256; const gr = g.createRadialGradient(x, y, 0, x, y, 30); gr.addColorStop(0, 'rgba(5,5,8,.75)'); gr.addColorStop(1, 'rgba(5,5,8,0)'); g.fillStyle = gr; g.fillRect(x - 30, y - 30, 60, 60); } cracks(g, R, 4); break; }
    case 8: { // small mosaic with a diamond border
      g.fillStyle = '#201c18'; g.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 8) for (let x = 0; x < 256; x += 8) { const dx = Math.abs((x % 128) - 64), dy = Math.abs((y % 128) - 64); const ring = Math.abs(dx + dy - 48) < 10 || Math.abs(dx + dy - 16) < 6; const k = ring ? jitter(R, [26, 18, 16], 6) : jitter(R, [124, 118, 104], 10); g.fillStyle = rgba(...k); g.fillRect(x + 0.8, y + 0.8, 6.4, 6.4); }
      grimeOver(g, R, 32, 0.38); break; }
  }
  return c;
}
// ---------- roof underside (256² = 2.5 m x 3 m; repeat 3 x 18). Alpha 0 = a hole showing the night sky ----------
export function roofTex(n) {
  const { c, g, R } = cv(1100 + n * 23);
  const ribs = (base, step, dark = 0.4) => { g.fillStyle = base; g.fillRect(0, 0, 256, 256); for (let x = 0; x < 256; x += step) { const gr = g.createLinearGradient(x, 0, x + step, 0); gr.addColorStop(0, `rgba(0,0,0,${dark})`); gr.addColorStop(0.5, 'rgba(255,255,255,.06)'); gr.addColorStop(1, `rgba(0,0,0,${dark})`); g.fillStyle = gr; g.fillRect(x, 0, step, 256); } };
  const holes = (k, r0, r1) => { g.save(); g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < k; i++) { const x = R() * 256, y = R() * 256; g.beginPath(); for (let a = 0; a < 9; a++) { const ang = a / 9 * 6.28, rr = r0 + R() * (r1 - r0); g.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr); } g.fill(); } g.restore(); };
  switch (n) {
    case 0: ribs('#5e4a3a', 16, 0.45); grimeOver(g, R, 40, 0.4, [80, 36, 10]); streaksDown(g, R, 20, [90, 40, 12], 0.5); holes(7, 4, 13); break; // rusted tin, rust holes
    case 1: for (let y = 0; y < 256; y += 21) { const k = jitter(R, [72, 52, 36], 14); g.fillStyle = rgba(...k); g.fillRect(0, y, 256, 19); g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, y + 19, 256, 2); } grimeOver(g, R, 30, 0.35); g.save(); g.globalCompositeOperation = 'destination-out'; g.fillRect(0, 103, 256, 3); g.fillRect(90, 166, 120, 3); g.restore(); break; // timber planks with gaps
    case 2: g.fillStyle = '#5a5a58'; g.fillRect(0, 0, 256, 256); grimeOver(g, R, 40, 0.35, [10, 10, 8]); cracks(g, R, 5); streaksDown(g, R, 10, [20, 20, 18], 0.4); break; // concrete slab
    case 3: { ribs('#8a8a80', 21, 0.35); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 126, 256, 3); grimeOver(g, R, 30, 0.3); g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(40, 0); g.lineTo(150, 0); g.lineTo(120, 40); g.lineTo(70, 70); g.closePath(); g.fill(); g.beginPath(); g.moveTo(170, 130); g.lineTo(256, 132); g.lineTo(256, 210); g.lineTo(210, 190); g.closePath(); g.fill(); g.restore(); break; } // broken asbestos: big gaps
    case 4: ribs('#6a6862', 12, 0.35); grimeOver(g, R, 30, 0.3); break; // tin (above the trusses)
    case 5: ribs('#62584e', 14, 0.3); grimeOver(g, R, 30, 0.3); break; // vault sheets
    case 6: for (let y = 0; y < 256; y += 18) { const k = jitter(R, [60, 52, 38], 16); g.fillStyle = rgba(...k); g.fillRect(0, y, 256, 16); } for (let i = 0; i < 200; i++) { g.fillStyle = rgba(30 + R() * 20, 48 + R() * 20, 22, 0.8); g.beginPath(); g.ellipse(R() * 256, R() * 256, 3 + R() * 5, 2 + R() * 3, R() * 3, 0, 7); g.fill(); } holes(4, 8, 22); break; // rotten planks, moss, holes
    case 7: g.fillStyle = '#353331'; g.fillRect(0, 0, 256, 256); grimeOver(g, R, 50, 0.45, [0, 0, 0]); for (let x = 0; x < 256; x += 64) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x, 0, 2, 256); } break; // sooty concrete
    case 8: for (let x = 0; x < 256; x += 32) { const k = jitter(R, [56, 40, 30], 10); g.fillStyle = rgba(...k); g.fillRect(x, 0, 30, 256); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x + 30, 0, 2, 256); } grimeOver(g, R, 26, 0.35); break; // dark boarded ceiling
  }
  return c;
}

// ---------- the far boundary wall across the tracks (256² = 4 m x 4.2 m; repeat 40 x 1). Alpha 0 = see-through (a fence) ----------
export function farTex(n) {
  const { c, g, R } = cv(1300 + n * 29);
  switch (n) {
    case 1: case 7: tiles(g, R, 15, 6, 1.5, n === 1 ? [96, 50, 34] : [70, 46, 36], 16, '#2a2420', 7); grimeOver(g, R, 30, 0.35, [0, 0, 0]); if (n === 7) streaksDown(g, R, 20, [0, 0, 0], 0.6, 12); break;
    case 3: case 5: { // chain-link fence on posts, a concrete footing
      g.clearRect(0, 0, 256, 256); g.strokeStyle = n === 3 ? 'rgba(90,92,86,1)' : 'rgba(80,76,90,1)'; g.lineWidth = 2;
      for (let k = -256; k < 512; k += 9) { g.beginPath(); g.moveTo(k, 40); g.lineTo(k + 216, 256); g.stroke(); g.beginPath(); g.moveTo(k, 256); g.lineTo(k + 216, 40); g.stroke(); }
      g.clearRect(0, 0, 256, 40); g.fillStyle = '#3a3a36'; for (const x of [0, 128]) g.fillRect(x, 20, 7, 236); g.fillRect(0, 30, 256, 5); g.fillStyle = '#4a4842'; g.fillRect(0, 222, 256, 34);
      g.strokeStyle = 'rgba(60,60,56,1)'; g.lineWidth = 1.5; for (let x = 0; x < 256; x += 6) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x + 3, 14); g.lineTo(x + 6, 30); g.stroke(); } // barbed top
      if (n === 3) { g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.ellipse(190, 150, 40, 70, 0.3, 0, 7); g.fill(); g.restore(); } // torn open
      break; }
    case 4: { g.fillStyle = '#4a4036'; g.fillRect(0, 0, 256, 256); for (let x = 0; x < 256; x += 12) { const gr = g.createLinearGradient(x, 0, x + 12, 0); gr.addColorStop(0, 'rgba(0,0,0,.5)'); gr.addColorStop(0.5, 'rgba(200,180,150,.1)'); gr.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = gr; g.fillRect(x, 0, 12, 256); } grimeOver(g, R, 40, 0.4, [80, 30, 10]); g.clearRect(0, 0, 256, 18); break; } // corrugated tin fence
    case 8: tiles(g, R, 42, 24, 3, [74, 72, 66], 12, '#26241f', 21); grimeOver(g, R, 30, 0.35); break; // stone blocks
    default: { g.fillStyle = n === 2 ? '#585c62' : n === 0 ? '#4c5450' : '#4e4c44'; g.fillRect(0, 0, 256, 256); for (let x = 0; x < 256; x += 64) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x, 0, 3, 256); } grimeOver(g, R, 40, 0.35); streaksDown(g, R, 18, [0, 0, 0], 0.5, 8); cracks(g, R, 4); }
  }
  return c;
}
