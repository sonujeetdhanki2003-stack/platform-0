// PLATFORM 0 v3 — gameplay features layered on the anomaly loop (each one self-contained; chapters only give spots):
// interact (E / tap), grab & inspect, torch + blackout loops + batteries, ringing STD payphone, the white-saree ghost,
// the ghost-train hide moment, and 6 secret diary pages that unlock the true ending.
import * as THREE from './three.module.min.js';
import * as M from './mats.js';
import { box, rbox, cyl, plane, shadows, makeHuman, signMesh, panelTex, makeLamp } from './props.js';
import { prop, hasProp } from './models.js';
import { HUM } from './humans.js';
import { WX } from './weather.js';
import { buildGhost } from './ghost.js';
import { pushOut, clearAt } from './npc.js';
import { slab2, slab3 } from './tp.js';
import { Lookalike, TicketChecker } from './lookalike.js';
import { Defence } from './defend.js';
const G_OK = (G) => G.state === 'playing';
export const FLARE = { cost: 20, min: 15, cool: 6000, stun: 4000, range: 9, push: 2.6 }; // v3.3 torch flare
import { Mystery } from './mystery.js';
import { skillHud } from './skills.js';
import { hudLayout } from './hudlayout.js';
import { Figure } from './figure.js'; // v3.7
import { Chalk } from './chalk.js'; // v3.7

export const PAGES = [
  { id: 'd1', ch: 1, torch: true, title: 'DIARY PAGE', date: '31 Oct 2016', text: 'They called from Shunya Road at 2 in the night. They kept saying <b>Platform 0</b>. There is no Platform 0, I told them.<br><br>The man on the phone said, "Aunty, please come."' },
  { id: 'd2', ch: 1, title: 'DIARY PAGE', date: '1 Nov 2016', text: 'The station master gave me his bag. Red. Still wet from the rain.<br><br>His headphones were still playing. The same song he played every night on the way home.' },
  { id: 'd3', ch: 2, torch: true, title: 'DIARY PAGE', date: 'Day 41', text: 'I come every night for the 11:58. The chai man gives me tea and won\'t take money.<br><br>He says he sees Arjun walking the platform. Up and down. Up and down. He says Arjun never looks at him.' },
  { id: 'd4', ch: 2, title: 'DIARY PAGE', date: 'Day 212', text: 'I wore white today, like everyone told me to.<br><br>I don\'t feel like a widow. I feel like a mother waiting at a station for a train that is very, very late.' },
  { id: 'd5', ch: 3, torch: true, title: 'DIARY PAGE', date: 'Day 700-something', text: 'I followed him onto the last local tonight. He walked right past me.<br><br>Every time I reach for him he screams and runs. Every time I stand still, he forgets I am there.' },
  { id: 'd6', ch: 3, title: 'DIARY PAGE', date: '30 Oct 2018', text: 'Two years tomorrow. Mehta-ji says a train comes at 2:17 that is in no timetable, and it only takes the ones who are waiting. I bought a ticket. One way.<br><br>If you are reading this, Arjun: I am not angry. I was never angry. Stop walking. Turn around.<br><b>Maa is right behind you.</b>' },
];

const v = new THREE.Vector3(), v2 = new THREE.Vector3(), ndc = new THREE.Vector3(), _eye = new THREE.Vector3();
const rand = Math.random;
const rnd = (a, b) => a + Math.random() * (b - a);

// ---------- small procedural textures ----------
function paperTex(lines, o = {}) {
  const c = M.canvas(256, 320), g = c.getContext('2d');
  g.fillStyle = o.bg || '#e9dfc4'; g.fillRect(0, 0, 256, 320);
  g.strokeStyle = 'rgba(70,90,140,.35)'; for (let y = 40; y < 320; y += 22) { g.beginPath(); g.moveTo(10, y); g.lineTo(246, y); g.stroke(); }
  g.fillStyle = '#2a2440'; g.font = 'italic 17px Georgia, serif'; lines.forEach((l, i) => g.fillText(l, 18, 36 + i * 22));
  // torn edge
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(0, 0); for (let x = 0; x <= 256; x += 8) g.lineTo(x, 4 + Math.random() * 7); g.lineTo(256, 0); g.fill(); g.globalCompositeOperation = 'source-over';
  M.grime(g, 256, 320, 0.5, 5); return M.ctex(c);
}
function phoneScreenTex(call) {
  const c = M.canvas(256, 480), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 480); gr.addColorStop(0, '#0b1a2a'); gr.addColorStop(1, '#02060a'); g.fillStyle = gr; g.fillRect(0, 0, 256, 480);
  g.fillStyle = '#fff'; g.textAlign = 'center';
  if (call) { g.font = '18px sans-serif'; g.fillText('Incoming call', 128, 110); g.font = 'bold 54px sans-serif'; g.fillText('YOU', 128, 180); g.font = '16px sans-serif'; g.fillStyle = '#9ab'; g.fillText('mobile · Platform 0', 128, 212);
    g.fillStyle = '#d33'; g.beginPath(); g.arc(70, 400, 30, 0, 7); g.fill(); g.fillStyle = '#2b4'; g.beginPath(); g.arc(186, 400, 30, 0, 7); g.fill(); }
  else { g.font = 'bold 64px sans-serif'; g.fillText('02:13', 128, 150); g.font = '16px sans-serif'; g.fillText('Sunday, 30 October 2016', 128, 182); g.fillStyle = '#e44'; g.fillText('47 missed calls · Maa', 128, 260); }
  return M.ctex(c);
}
function photoTex(stage) {
  const c = M.canvas(320, 240), g = c.getContext('2d');
  if (stage === 'back') { g.fillStyle = '#e6dcc2'; g.fillRect(0, 0, 320, 240); g.fillStyle = '#334'; g.font = 'italic 18px Georgia, serif'; ['Arjun, Shunya Road', '30.10.2016 — 11:50 pm', 'the last photo on his phone', '', 'turn around, beta'].forEach((l, i) => g.fillText(l, 22, 46 + i * 30)); M.grime(g, 320, 240, 0.6, 9); return M.ctex(c); }
  const gr = g.createLinearGradient(0, 0, 0, 240); gr.addColorStop(0, '#1a1c18'); gr.addColorStop(1, '#3a342a'); g.fillStyle = gr; g.fillRect(0, 0, 320, 240);
  g.fillStyle = '#c8b070'; g.fillRect(0, 168, 320, 10); g.fillStyle = '#5a5448'; g.fillRect(0, 178, 320, 62);
  for (let i = 0; i < 4; i++) { g.fillStyle = '#e8f0d0'; g.fillRect(30 + i * 80, 20, 40, 5); }
  // figure with red backpack (stage 'turned' = facing the camera, white eyes)
  g.fillStyle = '#d8d4c8'; g.fillRect(150, 100, 26, 52); g.fillStyle = '#2a2c34'; g.fillRect(151, 150, 24, 30); g.fillStyle = '#5a3a28'; g.beginPath(); g.arc(163, 90, 12, 0, 7); g.fill();
  if (stage === 'turned') { g.fillStyle = '#fff'; g.fillRect(157, 87, 4, 3); g.fillRect(166, 87, 4, 3); } else { g.fillStyle = '#b3121b'; g.fillRect(146, 104, 34, 36); }
  g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(290, 218, 3, 3); M.grime(g, 320, 240, 0.7, 4);
  return M.ctex(c);
}
function tagTex() { const c = M.canvas(256, 128), g = c.getContext('2d'); g.fillStyle = '#d8c69a'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#222'; g.font = 'bold 22px sans-serif'; g.fillText('STATION MASTER', 18, 44); g.font = '20px sans-serif'; g.fillText('PF 0 · ROOM 0', 18, 78); g.fillText('— do not open —', 18, 108); M.grime(g, 256, 128, 0.6, 2); return M.ctex(c); }

// ---------- procedural audio bits (ring, ghungroo, wind, clunk) ----------
function ring(S, dur = 1.6) { if (!S.ctx) return; const c = S.ctx, t = c.currentTime, g = c.createGain(); g.gain.value = 0; g.connect(S.master);
  for (const f of [425, 475]) { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f; const og = c.createGain(); og.gain.value = 0.02; o.connect(og); og.connect(g); o.start(t); o.stop(t + dur); }
  for (let k = 0; k < 2; k++) { g.gain.setValueAtTime(0.0, t + k * 0.6); g.gain.linearRampToValueAtTime(1, t + k * 0.6 + 0.02); g.gain.setValueAtTime(1, t + k * 0.6 + 0.38); g.gain.linearRampToValueAtTime(0, t + k * 0.6 + 0.42); } }
function ghungroo(S, pan = 0, loud = 0.12) { if (!S.ctx) return; const c = S.ctx, t = c.currentTime; const p = S.pan ? S.pan(pan) : c.createGain(); p.connect(S.master);
  for (let i = 0; i < 5; i++) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 3200 + Math.random() * 2600; const g = c.createGain(); const tt = t + i * 0.035 + Math.random() * 0.02; g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(loud * (0.5 + Math.random() * 0.5), tt + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.22); o.connect(g); g.connect(p); o.start(tt); o.stop(tt + 0.25); } }
function crack(S, loud = 0.3) { if (!S.ctx || !S.noise) return; const c = S.ctx, t = c.currentTime; for (let i = 0; i < 3; i++) { const n = S.noise(false), f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1800; const g = c.createGain(); const tt = t + i * 0.035 + Math.random() * 0.02; g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(loud * (0.6 + Math.random() * 0.4), tt + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.03); n.connect(f); f.connect(g); g.connect(S.master); n.start(tt); n.stop(tt + 0.05); } }
function clunk(S) { if (!S.ctx) return; const c = S.ctx, t = c.currentTime; const o = c.createOscillator(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.3); const g = c.createGain(); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4); o.connect(g); g.connect(S.master); o.start(t); o.stop(t + 0.45); }
function wind(S, dur = 4, loud = 0.35) { if (!S.ctx || !S.noise) return; const c = S.ctx, t = c.currentTime, n = S.noise(false), f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(1400, t + dur * 0.4); f.frequency.linearRampToValueAtTime(200, t + dur); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(loud, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); n.connect(f); f.connect(g); g.connect(S.master); n.start(t); n.stop(t + dur + 0.1); }

export class Features {
  constructor(api) {
    this.A = api; const G = api.G; this.G = G; G.hideDone = {};
    this.items = [];          // interactables in the current loop
    this.torch = { has: false, on: false, battery: 100 };
    this.inspecting = null; this.loopF = {}; this.force = {};
    const cam = api.camera;
    // torch: a spot light parented to the camera (shadows on Medium and up)
    const L = this.light = new THREE.SpotLight(0xfff2d8, 0, 22, 0.42, 0.55, 1.4); L.position.set(0.12, -0.12, 0.05); cam.add(L); L.target.position.set(0.05, -0.1, -2); cam.add(L.target);
    L.castShadow = api.engine.Q.shadows > 0; L.shadow.mapSize.set(512, 512); L.shadow.bias = -0.0006; L.shadow.camera.near = 0.1; L.shadow.camera.far = 22; this.light.visible = true;
    // inspect rig (object held in front of the camera, with its own small light)
    this.holder = new THREE.Group(); this.holder.position.set(0, -0.01, -0.42); cam.add(this.holder); this.holder.visible = false;
    const il = this.inspLight = new THREE.PointLight(0xfff0dc, 0, 0.9, 2); il.position.set(0.18, 0.2, -0.02); cam.add(il); /* v3.2.1: was 0.72 m from the object, right at the light's 0.9 m cut-off, so held things were barely lit */ // always present (intensity 0 when idle) so toggling never recompiles shaders
    // v3.2.1: a vignette veil between the world and the held object (drawn last in the opaque pass, no depth test; the object draws after it), so the
    // scene is dimmed on every tier (Low has no depth-of-field blur)
    { const c = M.canvas(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 6, 32, 32, 46); g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0.82)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      const dm = new THREE.MeshBasicMaterial({ map: M.ctex(c), transparent: false, blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, depthTest: false, depthWrite: false, toneMapped: false, fog: false });
      const d = this.dim = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), dm); d.position.z = -0.6; d.renderOrder = 1e6; d.frustumCulled = false; d.visible = false; d.userData.isCone = true; cam.add(d); }
    this.ui();
    // v3.0.1: cold-breath frost on the screen edge, a breath puff, and the scare's screen tear
    const css2 = document.createElement('style'); css2.textContent = `
      #fxBreath{position:fixed;inset:0;pointer-events:none;z-index:2;opacity:0;transition:opacity .6s;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 52%,rgba(170,195,210,.10) 70%,rgba(205,222,232,.34) 88%,rgba(230,240,246,.6) 100%);mix-blend-mode:screen}
      #fxBreath:before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 10% 90%,rgba(220,232,240,.35),rgba(0,0,0,0) 40%),radial-gradient(ellipse at 92% 12%,rgba(220,232,240,.28),rgba(0,0,0,0) 38%)}
      #fxPuff{position:fixed;left:50%;bottom:-18vh;width:60vw;height:44vh;transform:translateX(-50%);pointer-events:none;z-index:2;opacity:0;background:radial-gradient(ellipse at center,rgba(225,235,242,.55),rgba(225,235,242,.18) 45%,rgba(0,0,0,0) 70%);filter:blur(6px);mix-blend-mode:screen}
      #fxPuff.on{animation:fxpuff 1.6s ease-out}
      @keyframes fxpuff{0%{opacity:0;transform:translate(-50%,10%) scale(.6)}25%{opacity:.85}100%{opacity:0;transform:translate(-50%,-30%) scale(1.25)}}
      #game.tear{will-change:transform,filter}
      #fxTear{position:fixed;left:-5%;width:110%;top:40%;height:10%;pointer-events:none;z-index:4;display:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.18) 0 2px,rgba(0,0,0,.5) 2px 5px);mix-blend-mode:difference}
      #fxTear.on{display:block}`;
    document.head.appendChild(css2);
    const mk = (id) => { const d = document.createElement('div'); d.id = id; document.body.appendChild(d); return d; };
    this.$breath = mk('fxBreath'); this.$puff = mk('fxPuff'); this.$tear = mk('fxTear');
    this.look = new Lookalike(this); this.figure = new Figure(this); this.chalk = new Chalk(this); /* v3.7 the Figure, the chalk outline */ this.tc = new TicketChecker(this); this.def = new Defence(this); // v3.3: the stranger + defences against him
    this.skills = skillHud(this); // v3.3.1: the finished phone skill buttons
    this.layout = hudLayout(); // v3.4: one layout system places every HUD control from the real visible area + safe insets
    this.mystery = new Mystery(this); // v3.1: the 0217 mystery (clocks, scratched code, Room 0, lost & found)
  }
  get S() { return this.A.sound; }
  get foe() { return this.tc && this.tc.state !== 'off' ? this.tc : this.look; } // v3.3 whichever stranger is here this loop
  // ---------- UI: prompt, torch button + battery, inspect overlay, page counter ----------
  ui() {
    const css = document.createElement('style'); css.textContent = `
      #fxPrompt{position:fixed;left:50%;top:62%;transform:translateX(-50%);font:600 15px/1.2 sans-serif;color:#fff;background:rgba(0,0,0,.55);padding:7px 14px;border-radius:8px;letter-spacing:.04em;opacity:0;transition:opacity .15s;pointer-events:none;z-index:6}
      #fxPrompt.on{opacity:1} body.touch #fxPrompt{pointer-events:none}
      #fxBat{position:fixed;left:16px;top:16px;width:88px;height:12px;border:1px solid rgba(255,255,255,.6);border-radius:3px;display:none;z-index:6}
      #fxBat i{display:block;height:100%;background:#e8e0a0;width:100%} #fxBat.low i{background:#e04a2a}
      #fxBat:after{content:'🔦';position:absolute;left:96px;top:-5px;font-size:15px}
      #fxTorchBtn,#fxUseBtn{position:fixed;right:24px;width:64px;height:64px;border-radius:50%;border:2px solid rgba(255,255,255,.5);background:rgba(0,0,0,.35);color:#fff;font-size:26px;display:none;z-index:7}
      #fxTorchBtn{bottom:120px} #fxUseBtn{bottom:196px;font-size:15px;font-weight:700}
      #fxFlareBtn{position:fixed;right:100px;bottom:150px;width:58px;height:58px;border-radius:50%;border:2px solid rgba(255,214,120,.65);background:rgba(0,0,0,.35);color:#fff;font-size:24px;display:none;z-index:7;--cd:1;background-image:conic-gradient(rgba(255,214,120,.35) calc(var(--cd)*360deg),rgba(0,0,0,0) 0)}
      #fxFlareBtn.wait{opacity:.55} #fxFlareBtn.nobat{opacity:.35;filter:grayscale(1)}
      body.touch[data-screen=hud] #fxFlareBtn.has{display:block} body.inspecting #fxFlareBtn{display:none!important}
      #fxFlash{position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;background:radial-gradient(ellipse at center,rgba(255,250,225,.95) 0%,rgba(255,236,170,.55) 35%,rgba(255,230,160,0) 75%)}
      #fxFlash.on{animation:fxflash .55s ease-out} @keyframes fxflash{0%{opacity:0}10%{opacity:1}100%{opacity:0}}
      body.touch[data-screen=hud] #fxTorchBtn.has{display:block} body.touch[data-screen=hud] #fxUseBtn.on{display:block}
      #fxInspect{position:fixed;inset:0;display:none;z-index:8;pointer-events:auto;touch-action:none}
      #fxInspect.on{display:block} #fxCap{position:absolute;left:50%;bottom:9%;transform:translateX(-50%);max-width:min(86vw,640px);text-align:center;color:#eee;font:16px/1.45 Georgia,serif;text-shadow:0 1px 4px #000}
      #fxCap small{display:block;opacity:.6;font:12px sans-serif;margin-top:8px;letter-spacing:.08em}
      #fxClose{position:absolute;right:calc(14px + env(safe-area-inset-right,0px));top:12px;background:rgba(0,0,0,.5);color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:8px;padding:8px 14px;font:600 14px sans-serif}
      body.inspecting #tpBtn,body.inspecting #pauseBtn{display:none!important} body.inspecting #fxUseBtn{z-index:9} body.inspecting #cross,body.inspecting #goal{display:none} body.inspecting #hint{top:12px} body.inspecting #sub{z-index:9} #fxCap{transition:opacity .3s} #sub.show~#fxInspect #fxCap{opacity:0;transition:none} /* v3.7: the caption steps aside at once (was a 0.3 s cross-fade under the subtitle: the 915x300 HUD flake) */ /* v3.2.1: nothing under the Put back pill; USE sits above the drag layer */
      [data-screen=hud] #fxBat.has{display:block}`;
    document.head.appendChild(css);
    const mk = (tag, id, html = '') => { const e = document.createElement(tag); e.id = id; e.innerHTML = html; document.body.appendChild(e); return e; };
    this.$prompt = mk('div', 'fxPrompt'); this.$bat = mk('div', 'fxBat', '<i></i>');
    this.$torchBtn = mk('button', 'fxTorchBtn', '🔦'); this.$useBtn = mk('button', 'fxUseBtn', 'USE'); this.$flareBtn = mk('button', 'fxFlareBtn', '🔆'); this.$flareBtn.setAttribute('aria-label', 'Torch flare'); this.$flash = mk('div', 'fxFlash');
    this.$insp = mk('div', 'fxInspect', '<div id="fxCap"></div><button id="fxClose">Put back ✕</button>');
    const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
    this.$torchBtn.addEventListener('touchstart', (e) => { stop(e); this.toggleTorch(); });
    this.$useBtn.addEventListener('touchstart', (e) => { stop(e); this.use(); });
    this.$flareBtn.addEventListener('touchstart', (e) => { stop(e); this.flare(); }); this.$flareBtn.addEventListener('click', (e) => { stop(e); this.flare(); });
    this.$prompt.addEventListener('touchstart', (e) => { stop(e); this.use(); });
    document.getElementById('fxClose').addEventListener('click', (e) => { stop(e); this.closeInspect(); });
    document.getElementById('fxClose').addEventListener('touchstart', (e) => { stop(e); this.closeInspect(); });
    // drag to rotate the held object
    let drag = null; const el = this.$insp;
    const down = (x, y) => { drag = { x, y }; }, move = (x, y) => { if (!drag || !this.inspecting) return; this.spin((x - drag.x) * 0.012, (y - drag.y) * 0.012); drag = { x, y }; };
    el.addEventListener('mousedown', (e) => down(e.clientX, e.clientY)); addEventListener('mousemove', (e) => move(e.clientX, e.clientY)); addEventListener('mouseup', () => drag = null);
    el.addEventListener('touchstart', (e) => { const t = e.touches[0]; down(t.clientX, t.clientY); }, { passive: true }); el.addEventListener('touchmove', (e) => { const t = e.touches[0]; move(t.clientX, t.clientY); }, { passive: true }); el.addEventListener('touchend', () => drag = null);
  }
  key(code) {
    const st = this.G.state;
    if (st === 'keypad') return this.mystery.key(code);
    if (st === 'inspect') { if (code === 'KeyE' || code === 'Escape' || code === 'Space' || code === 'Enter') { this.closeInspect(); return true; } if (code === 'KeyQ' || code === 'ArrowLeft') { this.spin(-0.5, 0); return true; } if (code === 'ArrowRight' || code === 'KeyR') { this.spin(0.5, 0); return true; } if (code === 'ArrowUp') { this.spin(0, -0.5); return true; } if (code === 'ArrowDown') { this.spin(0, 0.5); return true; } return true; }
    if (st !== 'playing') return false;
    if (code === 'KeyE') { this.use(); return true; }
    if (code === 'KeyF') { this.toggleTorch(); return true; }
    if (code === 'KeyQ') { this.flare(); return true; } // v3.3 torch flare
    if (code === 'KeyR') { this.def.swing(); return true; } // v3.3 melee (the stranger only)
    if (code === 'Space') { this.def.shove(); return true; } // v3.3 shove
    return false;
  }
  // ---------- per chapter / per loop ----------
  onChapter(CH) { this.CH = CH; if (!CH.fx) { CH.fx = {}; if (CH.id === 1) this.buildCh1(CH); if (CH.id === 2) this.buildCh2(CH); if (CH.id === 3) this.buildCh3(CH); this.mystery.build(CH); } }
  resetRun(chIdx = 0) { this.look && this.look.resetRun(); this.tc && this.tc.resetRun(); this.def && this.def.resetRun(); this.flareReady = 0; this.flareK = 0; this.flareLog = []; this.torch.has = chIdx > 0; this.torch.on = false; this.torch.battery = 100; this.G.hideDone = {}; this.light.intensity = 0; this.updateHud(); }
  onLoop(CH, progress) {
    const G = this.G, f = this.loopF = { t: 0 }, fx = CH.fx; this.CH = CH; G.blackout = false; this.restoreFlicker();
    if (CH.hemi) { if (fx.hemiBase === undefined) fx.hemiBase = CH.hemi.intensity; else if (!CH.dawn) CH.hemi.intensity = fx.hemiBase; }
    if (this.inspecting) this.closeInspect(true);
    this.items = [];
    const a = G.anomaly, aid = a ? a.id : '', exit = CH.isExit || progress >= 8;
    const lightsAnom = /light|dark|red|blackout|lamp|tube|flicker|crawler/.test(aid);
    const trainAnom = /train/.test(aid) || (a && a.forwardOnly);
    const force = this.force; this.force = {}; const forced = Object.keys(force).length > 0; const roll = (p) => !forced && rand() < p; // forced loops (tests / debug) have no random extras
    // torch on the station master's desk (Ch1 only, once per run)
    if (fx.torchItem) { fx.torchItem.visible = !this.torch.has; if (!this.torch.has) this.items.push({ obj: fx.torchItem, r: 1.4, label: 'Take the torch', use: () => this.takeTorch() }); }
    // batteries lying around in some loops
    if (fx.battery) { const on = this.torch.has && !exit && (force.battery || roll(0.35)); fx.battery.visible = on; if (on) this.items.push({ obj: fx.battery, r: 1.3, label: 'Take batteries', use: () => { this.torch.battery = Math.min(100, this.torch.battery + 60); fx.battery.visible = false; this.A.hint('Torch battery recharged', 1800); this.S.step && this.S.step(0.3); return 'remove'; } }); }
    // blackout loops: the lights die a moment after you arrive (never in the same loop as a lighting anomaly)
    f.blackout = !exit && !lightsAnom && (force.blackout || (progress >= 2 && (this.torch.has || CH.id === 1) && roll(0.16)));
    if (f.blackout) f.blackT = 2.2;
    // payphone rings
    if (fx.phone) { fx.phone.ringing = !exit && !f.blackout && (force.payphone || (G.loops > 1 && roll(0.28))); fx.phone.answered = false; fx.phone.ringT = 0; if (fx.phone.ringing) this.items.push({ obj: fx.phone.g, r: 1.7, label: 'Answer the phone', use: () => this.answerPhone() }); }
    // grab & inspect objects (each chapter has a few spots; 1–2 appear per loop)
    for (const it of (fx.inspect || [])) { const on = !exit && (force.inspect === it.id || roll(it.p)); it.mesh.visible = on; if (on) this.items.push({ obj: it.mesh, r: 1.35, label: it.label, use: () => this.openInspect(it) }); }
    // diary pages
    for (const pg of (fx.pages || [])) { const got = this.A.save.pages.includes(pg.id); const on = !got && !exit && !pg.hidden; pg.mesh.visible = on; pg.active = on; if (on) this.items.push({ obj: pg.mesh, r: 1.25, label: 'Pick up the page', torchOnly: pg.torch, use: () => this.takePage(pg) }); }
    // ghost (white saree)
    if (fx.ghost) { const g = fx.ghost; g.visible = false; g.userData.active = false;
      const allowed = !exit && !f.blackout && !trainAnom && (CH.id === 1 ? progress >= 5 : progress >= 1);
      if (force.ghost || (allowed && roll(0.2))) { const u = g.userData; u.active = true; g.visible = true; const s = fx.ghostStart; g.position.set(s.x, s.y || 0, s.z); u.baseY = s.y || 0; g.rotation.y = 0; u.caught = false; u.seenT = 0; u.snapT = 0; u.closeWarned = false; if (u.ghost) { u.ghost.part = 0; u.ghost.jaw = 0; } } }
    // v3.0.1: sightings — a glimpse of her at the end of the bridge, behind the waiting-room glass, at the top of the subway stairs, or reflected in the train window
    f.sight = null;
    if (fx.sight) { fx.sight.visible = false; const spots = fx.sightSpots || [], ghostOn = fx.ghost && fx.ghost.userData.active; let spot = null;
      if (force.sight) spot = spots.find(sp => sp.id === force.sight) || spots[0];
      else if (!exit && !ghostOn && !f.blackout && !trainAnom && progress >= (CH.id === 1 ? 2 : 1) && roll(0.3)) { const ok = spots.filter(sp => !sp.ok || sp.ok(CH)); spot = ok[(rand() * ok.length) | 0] || null; }
      if (spot) f.sight = { spot, state: 'armed' }; }
    // hide moment: a ghost train (Ch1), once per run
    f.hide = null;
    if (fx.hide && !exit && !trainAnom && !lightsAnom && !(fx.ghost && fx.ghost.userData.active) && (force.hide || (progress >= 3 && !G.hideDone[CH.id] && roll(0.3)))) f.hide = { state: 'wait' };
    // v3.3: the stranger (never with Maa, the ghost train, a blackout or a train anomaly in the same loop) + weapons / hiding spots
    this.look.onLoop(CH, progress, { force: !!force.lookalike, exit, ghostOn: !!(fx.ghost && fx.ghost.userData.active), hide: !!f.hide, trainAnom, blackout: f.blackout, roll });
    this.tc.onLoop(CH, progress, { force: !!force.tc, exit, ghostOn: !!(fx.ghost && fx.ghost.userData.active), lookOn: this.look.state !== 'off', trainAnom, blackout: f.blackout, roll });
    // v3.7 the Figure (baseline after your first turn-back; never in a loop Maa or the stranger owns)
    this.figure.onLoop(CH, progress, { exit, ghostOn: !!(fx.ghost && fx.ghost.userData.active), lookOn: this.look.state !== 'off', blackout: f.blackout, lightsAnom, scareAnom: !!(a && a.scare), hide: !!f.hide, forced: forced && !force.figure });
    this.chalk.onLoop(CH, progress); // v3.7
    this.def.onLoop(CH, this.items, exit);
    this.mystery.onLoop(CH, progress, exit, force);
    this.updateHud();
  }
  // ---------- per frame ----------
  update(dt) {
    const G = this.G, CH = this.CH, p = this.A.player; if (!CH || !CH.fx) return;
    const f = this.loopF; f.t = (f.t || 0) + dt;
    // torch
    const T = this.torch;
    if (T.on) { T.battery = Math.max(0, T.battery - dt * 1.4); if (T.battery <= 0) { T.on = false; this.A.hint('The torch battery is dead', 2000); } }
    const low = T.battery < 22, flick = low && (Math.sin(f.t * 23) + Math.sin(f.t * 7.1)) > 1.3;
    // v3.0.2: the beam no longer blows a white-out hot spot on a wall right in front of you (white subway tiles, the train's end wall):
    // a cheap ray (visible opaque meshes only, every 0.15 s) measures how far the beam lands and dims it up close.
    if (T.on) { f.tRay = (f.tRay || 0) - dt; if (f.tRay <= 0) { f.tRay = 0.15; const d = this.beamDist(); this.beamK = Math.min(1, Math.max(0.12, Math.pow(d / 4, 2))); } }
    const bk = this.beamKs = (this.beamKs ?? 1) + ((this.beamK ?? 1) - (this.beamKs ?? 1)) * Math.min(1, dt * 6);
    this.light.intensity = T.on ? (flick ? 3 : (34 + T.battery * 0.16) * bk) : 0;
    if (this.flareK > 0) { this.flareK = Math.max(0, this.flareK - dt * 1.8); this.light.intensity += 420 * this.flareK * this.flareK; } // v3.3 flare burst
    if (this.$flareBtn && T.has) { const now = performance.now(), left = Math.max(0, (this.flareReady || 0) - now), cd = left > 0 ? 1 - left / FLARE.cool : 1; const K = this.skills;
      if (K) { K.cool('fxFlareBtn', cd, left); K.dim('fxFlareBtn', 'nobat', T.battery < FLARE.min, Math.round(T.battery) + '%'); K.lit('fxTorchBtn', T.on); K.dim('fxTorchBtn', 'nobat', T.battery <= 0, '0%'); }
      else { this.$flareBtn.style.setProperty('--cd', cd.toFixed(2)); this.$flareBtn.classList.toggle('wait', cd < 1); this.$flareBtn.classList.toggle('nobat', T.battery < FLARE.min); } }
    if (this.$bat.firstChild) { this.$bat.firstChild.style.width = T.battery + '%'; this.$bat.classList.toggle('low', low); }
    // blackout
    if (f.blackout && f.blackT !== undefined) { f.blackT -= dt; if (f.blackT <= 0) { f.blackT = undefined; this.lightsOut(true); } }
    // torch-only things (pages / writing): fade in only inside the torch beam
    for (const pg of (CH.fx.pages || [])) if (pg.active && pg.torch) { const k = this.inBeam(pg.mesh); pg.mesh.material.opacity = k; pg.mesh.userData.glow && (pg.mesh.userData.glow.material.opacity = k * 0.5); }
    for (const w of (CH.fx.torchWriting || [])) w.material.opacity = this.inBeam(w) * 0.95;
    // payphone ring
    const ph = CH.fx.phone; if (ph && ph.ringing && !ph.answered) { ph.ringT += dt; if (ph.ringT > 14) { ph.ringing = false; this.items = this.items.filter(i => i.obj !== ph.g); } else if ((ph.ringT % 3) < dt) ring(this.S); ph.handset.position.y = ph.hy + (Math.sin(ph.ringT * 60) > 0 && (ph.ringT % 3) < 1.1 ? 0.006 : 0); }
    // inspect items bob/glint
    // ghost
    if (CH.fx.ghost && CH.fx.ghost.userData.active) this.updateGhost(dt, p); else if ((this.flick && this.flick.size) || (this.$breath && this.$breath.style.opacity !== '0')) this.restoreFlicker();
    if (f.sight) this.updateSight(dt, p);
    if (f.hide) this.updateHide(dt, p);
    this.mystery.update(dt, p);
    this.look.update(dt, p); this.tc.update(dt, p); // v3.3 the stranger, the TC
    this.figure.update(dt, p); this.chalk.update(dt, p); // v3.7
    // nearest interactable prompt
    let best = null, bd = 1e9;
    if (G.state === 'playing' && !G.transitioning) for (const it of this.items) { if (!it.obj.visible) continue; if (it.torchOnly && this.inBeam(it.obj) < 0.3) continue; it.obj.getWorldPosition(v); const d = Math.hypot(v.x - p.x, v.z - p.z); const pr = it.prio || 0, bp = best ? (best.prio || 0) : -1e9; if (d < it.r && (pr > bp || (pr === bp && d < bd)) && this.facing(v, p) > 0.25 && this.losClear(_eye.set(p.x, (p.y || 0) + 1.45, p.z), v, it.obj, it.losEnd ?? 0.3, true)) { best = it; bd = d; } } // hiding spots only when nothing else is in reach // v3.3: not through walls
    this.near = best;
    const lbl = best ? (this.A.isTouch ? '👆 ' : 'E · ') + best.label : '';
    if (this.$prompt.textContent !== lbl) this.$prompt.textContent = lbl; this.$prompt.classList.toggle('on', !!best); this.$useBtn.classList.toggle('on', !!best);
    this.def.update(dt); // v3.3 weapon / shove / hiding
  }
  facing(pos, p) { const yaw = p.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw); const dx = pos.x - p.x, dz = pos.z - p.z, d = Math.hypot(dx, dz) || 1; return (dx * fx + dz * fz) / d; }
  inBeam(obj) { if (!this.torch.on || this.light.intensity <= 0) return 0; const cam = this.mountObj || this.A.camera; obj.getWorldPosition(v); cam.getWorldPosition(v2); const d = v.distanceTo(v2); if (d > 9) return 0; const dir = new THREE.Vector3(0, -0.05, -1).applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion())).normalize(); /* v3.2: from the hand in third person */ const to = v.sub(v2).normalize(); let c = dir.dot(to);
    if (this.mountObj) { /* v3.2.1: third person — the beam is aimed with the camera, so what the camera aims at counts too (the hand's beam alone missed things close to him: torch-only pages could not be picked up) */ const C = this.A.camera; obj.getWorldPosition(v); C.getWorldPosition(v2); const dc = new THREE.Vector3(0, 0, -1).applyQuaternion(C.getWorldQuaternion(new THREE.Quaternion())); c = Math.max(c, dc.dot(v.sub(v2).normalize())); }
    return THREE.MathUtils.smoothstep(c, 0.9, 0.97) * THREE.MathUtils.smoothstep(9 - d, 0, 2); }
  use() { if (this.inspecting && this.G.state === 'inspect') { if (this.inspecting.turned) this.closeInspect(); else this.turnOver(); return; } // v3.2.1: USE works while holding something
    const it = this.near; if (!it || this.G.state !== 'playing') return; const r = it.use(); if (r === 'remove' || it.once) this.items = this.items.filter(x => x !== it); }
  updateHud() { const has = this.torch.has; this.$bat.classList.toggle('has', has); this.$torchBtn.classList.toggle('has', has); this.$flareBtn.classList.toggle('has', has); }
  // ---------- torch ----------
  beamDist() { // distance to the first visible opaque surface along the beam (max 4 m)
    const cam = this.mountObj || this.A.camera, rc = this._rc || (this._rc = new THREE.Raycaster()), hits = this._hits || (this._hits = []); hits.length = 0;
    cam.getWorldPosition(v); if (this.mountObj) v2.set(0, 0, -1).applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion())); else cam.getWorldDirection(v2); rc.set(v, v2); rc.near = 0.05; rc.far = 4;
    const walk = (o) => { if (!o.visible || o === this.holder) return; if (o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh && o.material && !o.material.transparent && !o.userData.isCone && !o.userData.batch) o.raycast(rc, hits); for (const c of o.children) walk(c); };
    if (this.CH && this.CH.root) walk(this.CH.root); let d = 4; for (const h of hits) if (h.distance < d) d = h.distance; return d;
  }
  takeTorch() { this.torch.has = true; this.torch.battery = 100; this.torch.on = true; if (this.CH.fx.torchItem) this.CH.fx.torchItem.visible = false; this.A.hint(this.A.isTouch ? 'Torch taken — tap the torch button to switch it on/off' : 'Torch taken — press F to switch it on/off', 3200); this.S.step && this.S.step(0.4); this.updateHud(); return 'remove'; }
  toggleTorch() { if (!this.torch.has) return; if (this.torch.battery <= 0) { this.A.hint('The battery is dead — find batteries', 1800); return; } this.torch.on = !this.torch.on; clunk(this.S); }
  lightsOut(on) {
    const CH = this.CH; CH.flags.lightsOverride = true; clunk(this.S); this.S.setHum && this.S.setHum(0); this.S.setFans && this.S.setFans(false);
    for (const l of CH.lamps) { if (l.isExit || l === CH.exitLamp) continue; l.level = l.noFlicker && l.keepInBlackout ? l.level : 0.0; }
    if (CH.hemi) CH.hemi.intensity *= 0.25; CH.fansOn = false;
    
    this.A.showSub(this.torch.has ? '— the lights die —' : '— the lights die. There was a torch on the station master\'s desk… —', 3500, true);
    this.G.blackout = true;
  }
  // ---------- v3.3: torch flare (defend) ----------
  // A blinding burst from the torch: costs battery, has a cooldown; if Maa is in the beam she is stunned (she can't move or catch you,
  // even unseen) and thrown back. The 'moves only when unseen' rule still holds the rest of the time. Aimed with the camera in both views.
  flare() {
    const G = this.G, T = this.torch, now = performance.now(), A = this.A;
    if (G.state !== 'playing' || G.transitioning) return false;
    if (!T.has) { A.hint('You need the torch for a flare', 1800); return false; }
    if (now < (this.flareReady || 0)) { A.hint('Flare recharging…', 900); return false; }
    if (T.battery < FLARE.min) { A.hint('Not enough torch battery for a flare', 1800); return false; }
    T.battery = Math.max(0, T.battery - FLARE.cost); T.on = true; this.flareReady = now + FLARE.cool; this.flareK = 1;
    this.$flash.classList.remove('on'); void this.$flash.offsetWidth; this.$flash.classList.add('on'); G.flash(0.3);
    const S = this.S; if (S && S.flare) S.flare(); else if (S && S.thud) S.thud();
    let hit = false; const g = this.CH && this.CH.fx && this.CH.fx.ghost;
    if (g && g.userData.active && g.visible && !g.userData.caught) hit = this.flareHits(g);
    let hitL = false; const L = this.foe; if (L && L.active && L.h && this.flareHits(L.h)) hitL = L.blind(); // blinds the stranger: he staggers, shrieks, dissolves
    (this.flareLog = this.flareLog || []).push({ t: now, hit, hitL, battery: T.battery });
    if (hit) this.stunGhost(g);
    return hit || hitL;
  }
  flareHits(g) { // in the beam: in front of the camera, within range, nothing solid in between
    const cam = this.A.camera, p = this.A.player; cam.getWorldPosition(v2);
    const dc = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()));
    const dP = this.distTo(g); if (dP > FLARE.range) return false;
    let best = -1; for (const y of [0.5, 1.1, 1.55]) { v.set(g.position.x, g.position.y + y, g.position.z); const to = v.clone().sub(v2); const len = to.length(); if (len < 1e-3) { best = 1; break; } best = Math.max(best, dc.dot(to.multiplyScalar(1 / len))); }
    const need = dP < 1.8 ? 0.55 : 0.82; // close up a wide arc counts, further away she has to be in the middle of the beam
    if (best < need) return false;
    v.set(g.position.x, g.position.y + 1.2, g.position.z);
    return this.losClear(new THREE.Vector3(p.x, p.y + 1.45, p.z), v, g, 0.3);
  }
  stunGhost(g) {
    const u = g.userData, p = this.A.player, now = performance.now();
    u.stunUntil = now + FLARE.stun; u.snapT = 0.6; u.closeWarned = false; u.stuns = (u.stuns || 0) + 1;
    // thrown back along the line from you to her, never into a wall
    let dx = g.position.x - p.x, dz = g.position.z - p.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    for (let s = 0.25; s <= FLARE.push + 1e-6; s += 0.25) { const nx = g.position.x + dx * 0.25, nz = g.position.z + dz * 0.25; if (!clearAt(this.CH, nx, nz, 0.22)) break; g.position.x = nx; g.position.z = nz; }
    if (this.CH.floorY) u.baseY = this.CH.floorY(g.position.x, g.position.z);
    u.twK = 0.5; u.twA = { x: -0.35, y: rnd(-0.6, 0.6), z: rnd(-0.5, 0.5) }; // she flinches from the light
    const S = this.S; if (S && S.ctx) { crack(S, 0.5); S.sting && S.sting(0.35); }
    if (!this.toldStun) { this.toldStun = true; this.A.showSub('She recoils from the light…', 2200, true); }
  }
  // v3.3 line of sight for USE / the flare: from Arjun's eyes to the thing, blocked by the chapter's walls, glass and solids
  // (the prompt used to reach the torch through the waiting-room wall). The last `end` metres before the target don't count
  // (it sits on a desk / bench / shelf, or is fixed to a wall).
  losClear(a, b, own, end = 0.3, wallsOnly = false) { // wallsOnly (USE): only real walls / glass / doors block — not seat backs, benches, counters
    const CH = this.CH, dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, len = Math.hypot(dx, dy, dz); if (len < 0.05) return true;
    const tMax = Math.max(0, 1 - end / len);
    const inside = (s, x, z, e) => x > s.x0 - e && x < s.x1 + e && z > s.z0 - e && z < s.z1 + e;
    if (!wallsOnly) for (const s of CH.solids || []) { if (s.low || inside(s, b.x, b.z, 0.12) || inside(s, a.x, a.z, 0)) continue; const h = slab2(a.x, a.z, dx, dz, s.x0, s.x1, s.z0, s.z1); if (h >= 0 && h < tMax) return false; }
    const TP = this.A.tp; if (!TP || !TP.wallsFor) return true;
    for (const w of TP.wallsFor(CH)) { if (!w.m.visible || (w.m.parent && !w.m.parent.visible)) continue;
      if (Math.abs(w.cx - a.x) > w.rx + len + 0.5 || Math.abs(w.cz - a.z) > w.rz + len + 0.5) continue;
      if (own) { let q = w.m, mine = false; while (q) { if (q === own) { mine = true; break; } q = q.parent; } if (mine) continue; }
      if (w.b.max.y - w.b.min.y < 0.5 && w.b.max.y < 1.3) continue; // low flat things (a bench seat, a counter top) don't block
      if (wallsOnly && !(w.b.min.y < 1.0 && w.b.max.y > 1.75)) continue;
      const h = slab3(a, dx, dy, dz, w.b); if (h >= 0 && h < tMax) return false; }
    return true;
  }
  onRespawn() { this.def && this.def.leave(true); this.look && this.look.off(); this.tc && this.tc.off(); this.flareReady = 0; this.flareK = 0; if (this.torch.has) this.torch.battery = Math.max(this.torch.battery, 60); this.restoreFlicker(); this.updateHud(); }
  // ---------- payphone ----------
  answerPhone() {
    const ph = this.CH.fx.phone; if (!ph || ph.answered) return; ph.answered = true; ph.ringing = false;
    const G = this.G; const honest = this.phoneHonest ?? (rand() < 0.65);
    ph.handset.visible = false; setTimeout(() => { ph.handset.visible = true; }, 4500);
    if (honest) {
      const lines = G.anomaly ? ['…something here is wrong… go back…', '…don\'t keep walking… turn around…', '…it\'s not the same tonight… go back…'] : ['…nothing is wrong… keep walking, beta…', '…it is all as it should be… go on…', '…keep going… don\'t turn back…'];
      const li = (rand() * lines.length) | 0, line = lines[li];
      if (!(this.S.voice && this.S.voice((G.anomaly ? 'w_ph_back' : 'w_ph_fwd') + (li + 1) + '_x'.slice(2), { gain: 0.9, pan: -0.2 }))) this.S.whisper && this.S.whisper(2.4, -0.2, 0.32); this.A.showSub('📞 ' + line, 4200, true); this.lastPhone = { honest: true, hint: G.anomaly ? 'back' : 'forward' };
      const mh = this.mystery.phoneHint(); if (mh) setTimeout(() => { if (G.state === 'playing') { const vid = /her things/.test(mh) ? 'w_ph_lost' : /scratched/.test(mh) ? 'w_ph_digits' : /Room 0/.test(mh) ? 'w_ph_room' : 'w_ph_0217'; if (!(this.S.voice && this.S.voice(vid, { gain: 0.9, pan: 0.2 }))) this.S.whisper && this.S.whisper(2.0, 0.2, 0.26); this.A.showSub('📞 ' + mh, 4200, true); } }, 4600);
    } else { this.S.scream && this.S.scream(0); G.scareFace && G.scareFace(0.7); this.A.showSub('📞 …', 1500, true); this.lastPhone = { honest: false }; }
    return 'remove';
  }
  // ---------- inspect ----------
  openInspect(it) {
    const G = this.G; this.prevState = G.state; G.state = 'inspect'; this.A.holdClock(); for (const k in this.A.keys) this.A.keys[k] = false; if (document.pointerLockElement) document.exitPointerLock();
    // v3.2.1: in third person the held object is seen from Arjun's eyes: hold the first-person pose (the avatar hides, the torch goes back on the camera)
    const tp = this.A.tp; this.tpHeld = !!(tp && tp.active); if (this.tpHeld) { tp.hold = true; this.A.fpCam && this.A.fpCam(true); }
    const obj = it.make(); this.holder.add(obj); this.holder.visible = true; obj.rotation.set(it.rx ?? (Math.PI / 2 - 0.12), it.iry || 0, 0);
    // v3.2.1: frame it for this screen. Sizes were tuned on 16:9 (vertical fov 67.7°); wide phones (20:9) have a narrower vertical fov, so keep the same
    // apparent size, and never let it fill more than ~70% of the screen height (it spins, so its bounding sphere is what has to fit)
    const cam = this.A.camera, tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), hh = 0.42 * tanH;
    let sc = (it.iscale || 1) * Math.min(1, tanH / Math.tan(THREE.MathUtils.degToRad(67.7) / 2));
    obj.scale.setScalar(1); obj.updateMatrixWorld(true); const bs = new THREE.Box3().setFromObject(obj).getBoundingSphere(new THREE.Sphere()); const r0 = bs.radius || 0.1;
    sc = Math.min(sc, (0.62 * hh) / r0, (0.62 * hh * cam.aspect) / r0); obj.scale.setScalar(sc);
    this.holder.position.set(0, 0.06 * hh, -0.42); // a touch above centre: the caption sits at the bottom
    // turn it about its own middle (the models' origins sit at their base, so a tall thing hung off the top of the screen)
    this.holder.updateMatrixWorld(true); { const c = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3()); obj.worldToLocal(c); for (const ch of obj.children) ch.position.sub(c); }
    // bare metal (the tiffin, the bangle, keys) has nothing to reflect up close on Low (no environment map) and read as a black shape: soften it on the held copy only
    obj.traverse((o) => { if (!o.isMesh) return; o.renderOrder = 1e6 + 1; if (o.material && o.material.metalness > 0.6) { o.material = o.material.clone(); o.material.metalness = 0.6; o.material.roughness = Math.max(o.material.roughness, 0.38); } }); this.dim.visible = true;
    this.inspecting = { it, obj, turned: false, t0: performance.now(), sc }; it.mesh.visible = false;
    document.getElementById('fxCap').innerHTML = it.caption + `<small>${this.A.isTouch ? 'drag to turn it over · USE turns it' : 'drag the mouse (or Q / R) to turn it over · E to put it back'}</small>`;
    this.$insp.classList.add('on'); this.$prompt.classList.remove('on'); this.A.engine.setDOF(true, 0.42); this.inspLight.intensity = 0.35;
    document.body.classList.add('inspecting'); this.$useBtn.textContent = 'TURN'; this.$useBtn.classList.add('on');
    if (it.onOpen) it.onOpen(this);
  }
  turnOver() { // v3.2.1: USE while holding something turns it over (once), then puts it back
    const I = this.inspecting; if (!I || I.anim) return; let last = performance.now(), left = Math.PI; I.anim = true;
    const step = (t) => { if (this.inspecting !== I) return; const dt = Math.min(0.2, Math.max(0, (t - last) / 1000)); last = t; const a = Math.min(left, dt * Math.PI / 0.5); left -= a; if (a) this.spin(a, 0);
      if (left > 1e-4) requestAnimationFrame(step); else { I.anim = false; if (!I.turned) { I.turned = true; if (I.it.onTurn) I.it.onTurn(this, I); } if (this.inspecting === I) this.$useBtn.textContent = 'DONE'; } };
    requestAnimationFrame(step);
  }
  spin(dx, dy) { // turn the held object about the screen's axes (so it always flips the way you drag)
    const I = this.inspecting; if (!I) return; const q = new THREE.Quaternion();
    if (dx) I.obj.quaternion.premultiply(q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx)); if (dy) I.obj.quaternion.premultiply(q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy));
    this.inspectTurned();
  }
  inspectTurned() {
    const I = this.inspecting; if (!I || I.turned) return; const inner = I.obj.children[0] || I.obj;
    const q = new THREE.Quaternion(); inner.getWorldQuaternion(q); const n = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.A.camera.getWorldQuaternion(new THREE.Quaternion()));
    if (n.dot(fwd) > 0.3) { I.turned = true; if (I.it.onTurn) I.it.onTurn(this, I); }
  }
  closeInspect(silent) {
    const I = this.inspecting; if (!I) return; if (!silent && performance.now() - I.t0 < 350) return;
    this.holder.remove(I.obj); this.holder.visible = false; this.inspecting = null; this.inspLight.intensity = 0; this.$insp.classList.remove('on'); this.A.engine.setDOF(false);
    this.dim.visible = false; document.body.classList.remove('inspecting'); this.$useBtn.textContent = 'USE'; this.$useBtn.classList.remove('on'); if (this.A.tp) this.A.tp.hold = false; this.tpHeld = false; // v3.2.1
    if (I.it.keep) I.it.mesh.visible = true;
    if (this.G.state === 'inspect') { this.G.state = 'playing'; this.A.show('hud'); this.A.releaseClock(); if (!this.A.isTouch) this.A.lockPointer(); this.A.resetClock(); }
    if (I.it.onClose) I.it.onClose(this, I);
    this.items = this.items.filter(x => x.obj !== I.it.mesh || I.it.keep);
  }
  // ---------- pages ----------
  takePage(pg) {
    const save = this.A.save; if (!save.pages.includes(pg.id)) { save.pages.push(pg.id); this.A.writeSave(); }
    pg.mesh.visible = false; pg.active = false; this.S.paper && this.S.paper();
    const P = PAGES.find(x => x.id === pg.id), n = save.pages.length;
    this.A.openNote(`DIARY PAGE ${n} / ${PAGES.length}`, `<div class="tk" style="background:#e9dfc4;color:#2a2440;font:italic 17px/1.5 Georgia,serif;text-align:left;padding:18px 20px"><div style="opacity:.6;font-size:13px;margin-bottom:8px">${P.date}</div>${P.text}</div>`, n === PAGES.length ? '<div style="font:15px/1.5 sans-serif;color:#f2c613">You found every page.<br>Finish the game to see what really happened.</div>' : `<div style="font:14px/1.5 sans-serif;opacity:.75">${PAGES.length - n} more page${PAGES.length - n > 1 ? 's' : ''} hidden somewhere. Some only show up in torchlight.</div>`);
    return 'remove';
  }
  revealPage(id, at) { // a page found inside an inspected object goes straight to your diary
    const pg = (this.CH.fx.pages || []).find(x => x.id === id); if (!pg || this.A.save.pages.includes(id)) return false;
    setTimeout(() => { this.closeInspect(true); this.takePage(pg); }, at || 900); return true;
  }
  // ---------- ghost (v3.0.1: rebuilt — see ghost.js) ----------
  makeGhost(CH, o = {}) {
    const g = buildGhost(makeHuman({ av: 'Female_Adult_06', eyes: 'white', idle: 'f_idle_neutral_01' }));
    const u = g.userData; (u.eyes || []).forEach(e => { e.visible = false; });
    if (o.reflection) { // a half-there figure for the train-window reflection: her own copies of every material, see-through
      g.traverse(m => { if (!m.isMesh) return; const src = m.material; const c = src.clone(); c.onBeforeCompile = src.onBeforeCompile; c.customProgramCacheKey = src.customProgramCacheKey; c.transparent = true; c.opacity = 0.5; c.depthWrite = false; c.alphaTest = Math.min(c.alphaTest || 0, 0.2); m.material = c; m.castShadow = false; m.renderOrder = 3; });
    }
    if (o.sight) for (const m of u.rig.meshes) if (m.material && m.material.emissive) m.material.emissiveIntensity = o.reflection ? 0.14 : 0.06; // apparitions carry a faint cold glow of their own
    u.tilt = rnd(-0.55, -0.35); u.headJ = { x: 0, y: 0, z: 0 }; u.twT = rnd(1.5, 3.5);
    g.visible = false; CH.root.add(g); u.isGhost = true;
    return g;
  }
  ghostSeen(g) {
    const cam = this.A.camera; let seen = false;
    for (const y of [0.4, 1.0, 1.55]) { v.set(g.position.x, g.position.y + y, g.position.z); ndc.copy(v).project(cam); if (ndc.z < 1 && Math.abs(ndc.x) < 1.02 && Math.abs(ndc.y) < 1.02) { seen = true; break; } }
    // a blackout or a dead torch doesn't count as looking: she is lit by her own pale glow, so treat in-frame as seen
    return seen;
  }
  // broken posture: head lolled at a wrong angle, the odd violent twitch; eye glint only in the dark
  ghostPose(g, dt, seen) {
    const u = g.userData, G = this.G, hj = u.headJ;
    u.twT -= dt; if (u.twT <= 0) { u.twT = seen ? rnd(1.4, 4.0) : rnd(0.3, 0.9); u.twK = 0.13; u.twA = { x: rnd(-0.18, 0.22), y: rnd(-0.4, 0.4), z: rnd(-0.35, 0.35) }; if (seen && this.S.ctx) crack(this.S, Math.min(0.5, 2.5 / (1 + this.distTo(g)))); }
    if (u.twK > 0) { u.twK -= dt; hj.x = u.twA.x; hj.y = u.twA.y; hj.z = u.twA.z; } else if (!u.stopMotion || !seen) { hj.x *= 0.5; hj.y *= 0.5; hj.z *= 0.5; }
    u.head.rotation.set(0.1 + hj.x, hj.y, u.tilt + hj.z);
    const dark = G.blackout || (this.CH.flags && this.CH.flags.lightsOverride) ? 1 : 0;
    u.ghost.glint = Math.max(0, Math.min(1, dark * 0.9 + (this.torch.on ? 0 : 0.12)));
    g.position.y = (u.baseY || 0) + 0.05 + Math.sin(this.loopF.t * 1.3) * 0.015; // floating: her feet never quite touch the floor
  }
  distTo(g) { const p = this.A.player; return Math.hypot(g.position.x - p.x, g.position.z - p.z); }
  updateGhost(dt, p) {
    const g = this.CH.fx.ghost, u = g.userData, G = this.G; if (u.caught || G.transitioning) return;
    const seen = this.ghostSeen(g); u.seen = seen;
    const rig = u.rig; if (rig) rig.mixer.timeScale = seen ? 0 : 1;
    u.stopMotion = 0.16; // stop-motion: her pose only updates in jerky snaps
    // v3.2 third person: "seen" is what the camera sees, so she comes for the viewer — the camera behind your shoulder
    const tpv = this.A.tp && this.A.tp.active, cp = this.A.camera.position, tgx = tpv ? cp.x : p.x, tgz = tpv ? cp.z : p.z;
    const dx = tgx - g.position.x, dz = tgz - g.position.z, d = Math.hypot(dx, dz);
    const stunned = performance.now() < (u.stunUntil || 0); u.stunned = stunned;
    if (stunned) { // v3.3: flared — she can't move or catch you; she shudders in place
      if (rig) rig.mixer.timeScale = 0; u.unseenT = 0; if (Math.random() < dt * 6) { u.twK = 0.12; u.twA = { x: rnd(-0.3, 0.1), y: rnd(-0.5, 0.5), z: rnd(-0.4, 0.4) }; }
    } else if (!seen) {
      // she doesn't glide: she snaps forward in jumps (like missing frames), never through walls, benches or pillars
      u.snapT = (u.snapT || 0) - dt;
      if (u.snapT <= 0) { const iv = rnd(0.28, 0.6); u.snapT = iv; const sp = d > 6 ? 3.2 : 2.2; const step = Math.min(d - 0.6, sp * iv);
        if (step > 0) { let nx = g.position.x + dx / d * step, nz = g.position.z + dz / d * step; [nx, nz] = pushOut(this.CH, nx, nz, 0.22);
          if (!clearAt(this.CH, nx, nz, 0.22)) { const sx = g.position.x + dx / d * step, sz = g.position.z; if (clearAt(this.CH, sx, sz, 0.22)) { nx = sx; nz = sz; } else if (clearAt(this.CH, g.position.x, g.position.z + dz / d * step, 0.22)) { nx = g.position.x; nz = g.position.z + dz / d * step; } else { nx = g.position.x; nz = g.position.z; } }
          g.position.x = nx; g.position.z = nz; if (this.CH.floorY) u.baseY = this.CH.floorY(nx, nz);
          const yaw = p.yaw, rx = Math.cos(yaw), rz = -Math.sin(yaw), pan = Math.max(-1, Math.min(1, (-dx * rx - dz * rz) / (d || 1)));
          ghungroo(this.S, pan, Math.min(0.24, 0.03 + 0.7 / (1 + d * 0.45)));
          if (rig) rig.mixer.update(rnd(0.05, 0.4)); u.tilt = Math.max(-0.75, Math.min(-0.25, u.tilt + rnd(-0.12, 0.12))); }
        g.rotation.y = Math.atan2(dx, dz); }
      u.unseenT = (u.unseenT || 0) + dt;
      if ((d < (tpv ? 0.8 : 0.95) || (tpv && this.distTo(g) < 0.95)) && !(this.A.invuln && this.A.invuln())) { u.caught = true; this.ghostCatch(); }
    } else { u.unseenT = 0; if (d < 2.2 && !u.closeWarned) { u.closeWarned = true; this.S.heartbeat && this.S.heartbeat(4, 1.5); } }
    this.ghostPose(g, dt, seen);
    this.ghostPresence(dt, d, g);
  }
  // presence: lights near her stutter, cold breath fogs the screen edge, whispering + ghungroo + heartbeat swell as she nears
  ghostPresence(dt, d, g) {
    const f = this.loopF, CH = this.CH, G = this.G, S = this.S, prox = d == null ? 0 : Math.max(0, Math.min(1, 1 - (d - 1.2) / 11));
    f.prox = prox;
    // lights
    const fl = this.flick || (this.flick = new Set());
    if (g && !f.blackout && !(CH.flags && CH.flags.lightsOverride)) {
      for (const l of CH.lamps) { if (l.noFlicker || l === CH.flicker) continue; const ld = Math.hypot(l.x - g.position.x, l.z - g.position.z);
        if (ld < 7 && prox > 0.15) { fl.add(l); const k = Math.min(1, (7 - ld) / 4) * prox; const off = Math.random() < k * 0.35; l.level = off ? 0.04 : l.base * (1 - k * 0.35 * Math.random()); }
        else if (fl.has(l)) { l.level = l.base; fl.delete(l); } }
    } else this.restoreFlicker();
    // breath on the screen edge
    if (this.$breath) { this.$breath.style.opacity = (Math.pow(prox, 1.5) * 0.62).toFixed(3); f.puffT = (f.puffT || 0) - dt; if (prox > 0.45 && f.puffT <= 0) { f.puffT = rnd(2.2, 3.4) - prox; this.$puff.classList.remove('on'); void this.$puff.offsetWidth; this.$puff.classList.add('on'); } }
    if (!S || !S.ctx) return;
    const p = this.A.player, yaw = p.yaw, rx = Math.cos(yaw), rz = -Math.sin(yaw), dx = g ? g.position.x - p.x : 0, dz = g ? g.position.z - p.z : 0, pan = Math.max(-1, Math.min(1, (dx * rx + dz * rz) / (d || 1)));
    f.whT = (f.whT || rnd(1, 2)) - dt;
    if (prox > 0.08 && f.whT <= 0) { f.whT = rnd(2.0, 4.0) * (1.2 - prox * 0.7);
      if (prox > 0.55 && Math.random() < 0.3 && S.voice && S.voice(Math.random() < 0.5 ? 'w_arjun_turn' : 'w_arjun_hi', { gain: 0.25 + prox * 0.6, pan, rate: rnd(0.9, 1.0) })) {} else if (Math.random() < 0.35 && S.playClip) S.playClip('whisper', { creepy: true, rate: rnd(0.62, 0.8), gain: 0.15 + prox * 0.6 }); else S.whisper(rnd(0.9, 1.8), pan, 0.06 + prox * 0.34); } // v3.3: when she's close she says his name
    if (prox > 0.25) { f.hbT = (f.hbT || 0) - dt; if (f.hbT <= 0) { f.hbT = 1 / (0.9 + prox * 1.5); S.thud && S.thud(); setTimeout(() => S.thud && S.thud(), 200); } }
  }
  restoreFlicker() { if (this.flick) { for (const l of this.flick) l.level = l.base; this.flick.clear(); } if (this.$breath) this.$breath.style.opacity = '0'; }
  // the catch: the view whips round onto her face, her hair parts, the jaw drops far too wide, a stinger and a screen tear
  ghostCatch() {
    const G = this.G, cam = this.A.camera, g = this.CH.fx.ghost, u = g.userData, p = this.A.player, S = this.S;
    G.state = 'cutscene_ghost'; if (this.A.keys) for (const k in this.A.keys) this.A.keys[k] = false;
    if (this.CH.fx.sight) this.CH.fx.sight.visible = false;
    const target = Math.atan2(-(g.position.x - p.x), -(g.position.z - p.z)), y0 = p.yaw, p0 = p.pitch, t0 = performance.now();
    let dy = target - y0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const camY = p.y + 1.6, eyeY = 1.612;
    const fx = -Math.sin(target), fz = -Math.cos(target);
    // the cold under-light reuses the camera's inspect light (already compiled into every shader; adding a new light here would recompile them all mid-scare)
    const L = this.inspLight, L0 = { p: L.position.clone(), c: L.color.getHex(), d: L.distance }; L.position.set(0.12, -0.24, -0.08); L.color.setHex(0xb8d4e8); L.distance = 2.2;
    u.stopMotion = 0; if (u.rig) u.rig.mixer.timeScale = 0; u.twK = 0; if (this.$breath) { this.$breath.style.transition = 'none'; this.$breath.style.opacity = '0'; setTimeout(() => { this.$breath.style.transition = ''; }, 2500); }
    S && S.whisper && S.whisper(0.25, 0, 0.5);
    const eyeB = u.rig && u.rig.bones.Bip01_REye, ew = new THREE.Vector3(); let eyeOff = eyeY;
    const place = (dist) => { g.position.set(p.x + fx * dist, camY - eyeOff - 0.03, p.z + fz * dist); g.rotation.y = Math.atan2(-fx, -fz);
      if (eyeB) { g.updateMatrixWorld(true); eyeB.getWorldPosition(ew); const el = u.rig.bones.Bip01_LEye; if (el) { const e2 = new THREE.Vector3(); el.getWorldPosition(e2); ew.add(e2).multiplyScalar(0.5); }
        eyeOff = ew.y - g.position.y; g.position.y = camY - eyeOff - 0.03; const lx = -fz, lz = fx, side = (ew.x - (p.x + fx * dist)) * lx + (ew.z - (p.z + fz * dist)) * lz; g.position.x -= lx * side; g.position.z -= lz * side; } }; // her eyes level with yours and dead centre, whatever her pose
    place(0.7);
    const fov0 = cam.fov; // a hard push-in: the lens tightens onto her face as she lunges
    let stung = false, glitchT = 0;
    const tick = () => {
      const restoreL = () => { cam.fov = fov0; cam.updateProjectionMatrix(); L.intensity = 0; L.position.copy(L0.p); L.color.setHex(L0.c); L.distance = L0.d; };
      if (G.state !== 'cutscene_ghost') { this.endDistort(); restoreL(); return; }
      const t = (performance.now() - t0) / 1000;
      const k = Math.min(1, t / 0.2), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; // whip round
      p.yaw = y0 + dy * e; p.pitch = p0 * (1 - e);
      if (t >= 0.17 && !stung) { stung = true; S && S.sting && S.sting(1.35); S && S.scream && S.scream(0); G.shake(1.2); G.damage = 1; G.flash(0.25); this.distort(); }
      const lunge = t < 0.2 ? 0.75 : Math.max(0.46, 0.75 - (t - 0.2) * 1.8);
      const zk = Math.max(0, Math.min(1, (t - 0.17) / 0.18)); cam.fov = fov0 + (Math.min(fov0, 46) - fov0) * zk; cam.updateProjectionMatrix();
      place(lunge);
      const a = Math.max(0, Math.min(1, (t - 0.18) / 0.12)), j = Math.max(0, Math.min(1, (t - 0.24) / 0.1));
      u.ghost.part = a; u.ghost.jaw = j * (0.9 + Math.sin(t * 47) * 0.08); u.ghost.glint = 0.7;
      const jit = t > 0.2 ? 0.07 : 0; u.head.rotation.set(0.08 + (Math.random() - 0.5) * jit, (Math.random() - 0.5) * jit * 1.5, (t < 0.2 ? u.tilt : u.tilt * Math.max(0, 1 - (t - 0.2) * 6)) + (Math.random() - 0.5) * jit);
      L.intensity = t < 0.17 ? 0 : (Math.random() < 0.18 ? 0.04 : 0.22); // a cold under-light on her face
      cam.position.set(p.x + (Math.random() - 0.5) * 0.02 * (t > 0.17 ? 1 : 0), camY + (Math.random() - 0.5) * 0.02 * (t > 0.17 ? 1 : 0), p.z);
      cam.rotation.set(p.pitch, p.yaw, (t > 0.17 ? (Math.random() - 0.5) * 0.05 : 0), 'YXZ'); cam.updateMatrixWorld();
      glitchT -= 1 / 60; if (t > 0.17 && glitchT <= 0) { glitchT = rnd(0.04, 0.1); this.distortFrame(t); }
      if (t < 1.25) requestAnimationFrame(tick);
      else { restoreL(); this.endDistort(); const fd = document.getElementById('fade'); if (fd) { fd.style.transition = 'none'; fd.style.opacity = '1'; }
        setTimeout(() => { if (fd) { fd.style.transition = ''; } u.ghost.part = 0; u.ghost.jaw = 0; this.restoreFlicker();
          const r = this.A.caught ? this.A.caught('ghost', 'She let go… for now.') : (G.state = 'playing', this.A.failLoop('She was right behind you.'));
          if (r === 'hit' || r === 'blocked') { this.ghostRecoil(g); } else { g.visible = false; u.active = false; } }, 380); }
    };
    tick();
  }
  // v3.3: after a catch that didn't kill you she is thrown back to where she started (or vanishes if that is too close), stunned for a moment
  ghostRecoil(g) {
    const u = g.userData, p = this.A.player, s = this.CH.fx.ghostStart; u.caught = false; u.seenT = 0; u.snapT = 0.5; u.closeWarned = false;
    if (G_OK(this.G) && s && Math.hypot(s.x - p.x, s.z - p.z) > 7) { g.position.set(s.x, s.y || 0, s.z); u.baseY = s.y || 0; u.stunUntil = performance.now() + 2500; g.visible = true; u.active = true; }
    else { g.visible = false; u.active = false; }
  }
  // screen tear: works on every quality tier (CSS on the canvas), on top of the post chromatic aberration where it exists
  distort() { const c = document.getElementById('game'); if (c) c.classList.add('tear'); }
  distortFrame(t) { const c = document.getElementById('game'); if (!c) return;
    if (Math.random() < 0.35 || t < 0.24) { const s = 1 + Math.random() * 0.05; c.style.transform = `translate(${rnd(-12, 12)}px,${rnd(-5, 5)}px) scale(${s}) skewX(${rnd(-3, 3)}deg)`;
      c.style.filter = t < 0.22 ? 'invert(1) contrast(1.8)' : `contrast(${rnd(1.3, 1.9).toFixed(2)}) saturate(${rnd(0, 0.4).toFixed(2)}) hue-rotate(${rnd(-25, 25) | 0}deg)`;
      if (this.$tear) { this.$tear.classList.add('on'); this.$tear.style.top = rnd(0, 80) + '%'; this.$tear.style.height = rnd(3, 18) + '%'; this.$tear.style.transform = `translateX(${rnd(-40, 40)}px)`; } }
    else { c.style.transform = `scale(${1 + (t - 0.2) * 0.04})`; c.style.filter = 'contrast(1.25) saturate(0.6)'; if (this.$tear) this.$tear.classList.remove('on'); } // clean frames between the tears so her face reads
    this.G.damage = 1; }
  endDistort() { const c = document.getElementById('game'); if (c) { c.classList.remove('tear'); c.style.transform = ''; c.style.filter = ''; } if (this.$tear) this.$tear.classList.remove('on'); }
  // ---------- sightings: a glimpse of her somewhere she can't be (gone when you look too long, come close, or look away) ----------
  updateSight(dt, p) {
    const f = this.loopF, sg = f.sight, CH = this.CH, g = CH.fx.sight; if (!sg || !g || sg.state === 'done') return;
    const sp = sg.spot, u = g.userData;
    if (sg.state === 'armed') { if (sp.when(p)) { sg.state = 'shown'; sg.t = 0; sg.look = 0; g.visible = true; u.stopMotion = 0.2; u.ghost.part = 0; u.ghost.jaw = 0; u.baseY = sp.y || 0;
        if (!sp.reflection) { g.position.set(sp.x, sp.y || 0, sp.z); g.rotation.y = sp.ry; } } else return; }
    sg.t += dt;
    if (sp.reflection) { // mirror a point just behind you across the window you are looking at
      const sx = -Math.sin(p.yaw) > 0 ? 1 : -1, HW = sp.hw, fwdx = -Math.sin(p.yaw), fwdz = -Math.cos(p.yaw);
      const vx = p.x - fwdx * 1.0, vz = p.z - fwdz * 1.0; g.position.set(2 * sx * HW - vx, 0, vz); g.rotation.y = -sx * Math.PI / 2;
      if (sg.yaw0 === undefined) sg.yaw0 = p.yaw; const turned = Math.abs(Math.atan2(Math.sin(p.yaw - sg.yaw0), Math.cos(p.yaw - sg.yaw0))) > 0.7;
      if (turned || sg.t > 3.2) return this.endSight(g, sg, turned);
    } else {
      const seen = this.ghostSeen(g), d = this.distTo(g);
      const v3 = new THREE.Vector3(g.position.x, g.position.y + 1.3, g.position.z).project(this.A.camera), centered = seen && Math.abs(v3.x) < 0.3 && Math.abs(v3.y) < 0.5;
      if (seen) sg.seenOnce = true; if (centered) sg.look += dt;
      if (sg.look > 1.1 || d < (sp.near || 4) || sg.t > 14 || (sg.seenOnce && !seen && sg.t > 0.5)) return this.endSight(g, sg, seen);
    }
    this.ghostPose(g, dt, true); g.position.y = (sp.y || 0) + 0.05;
  }
  endSight(g, sg, loud) {
    sg.state = 'done'; g.visible = false; this.lastSight = sg.spot.id; const S = this.S;
    if (S && S.ctx && loud) { S.whisper(1.0, 0, 0.22); ghungroo(S, 0, 0.12); }
    // the nearest lamp stutters as she goes
    let best = null, bd = 1e9; for (const l of this.CH.lamps) { const d = Math.hypot(l.x - g.position.x, l.z - g.position.z); if (d < bd && !l.noFlicker) { bd = d; best = l; } }
    if (best && bd < 8 && !this.loopF.blackout) { const b0 = best.level; best.level = 0.03; setTimeout(() => { if (!this.loopF.blackout) best.level = b0; }, 160); }
  }
  // ---------- hide moment (ghost train) ----------
  updateHide(dt, p) {
    const f = this.loopF, h = f.hide, CH = this.CH, fx = CH.fx, G = this.G;
    if (h.state === 'wait') { if (p.z < (fx.hide.triggerZ ?? -7)) { h.state = 'warn'; h.t = 0; G.hideDone[CH.id] = true; this.S.horn && this.S.horn(2.4, 0.22); this.S.train && this.S.train(9, true, 0.9); this.A.showSub('A train horn… something is coming. HIDE — the waiting room, or behind a pillar!', 4200, true); G.shake(0.2); } return; }
    h.t += dt;
    if (h.state === 'warn') {
      CH.flags.lightsOverride = true; for (const l of CH.lamps) if (!l.noFlicker) l.level = (Math.sin(h.t * 40 + l.z) > 0.2 ? 1 : 0.15);
      G.shake(0.05 + h.t * 0.03);
      if (h.t > 7.0) { h.state = 'pass'; h.t = 0; h.safe = fx.hide.safe(p); CH.train.userData.setKind('black'); CH.train.visible = true; CH.train.position.z = 60; CH.trainState = null; this.S.horn && this.S.horn(1.6, 0.5); wind(this.S, 4, 0.5); G.shake(1.2); G.flash(0.15); }
    } else if (h.state === 'pass') {
      CH.train.position.z -= dt * 55; G.shake(0.9);
      if (h.t > 0.45 && !h.judged) { h.judged = true; h.safe = h.safe && fx.hide.safe(p); if (!h.safe) { G.scareFace && G.scareFace(0.9); setTimeout(() => { if (this.A.caught) this.A.caught('train', 'The ghost train clipped you.'); else this.A.failLoop('The ghost train took you off the platform.'); }, 700); h.state = 'done'; } }
      if (h.t > 3.5) { h.state = 'done'; CH.train.visible = false; CH.train.userData.setKind('normal'); CH.train.position.z = -200; CH.flags.lightsOverride = false; for (const l of CH.lamps) l.level = l.base; this.A.showSub(h.safe ? '…it passed.' : '', 2000, true); this.lastHide = h.safe ? 'safe' : 'caught'; }
    }
  }
  // ---------- chapter builds ----------
  buildCh1(CH) {
    const R = CH.root, fx = CH.fx;
    // waiting room / station master's office protruding from the back wall (x -3.5..-1.7, z -1.9..-5.6), door on its +x face
    const wallM = fx.roomWallM = M.pbr('pwall', { rep: [1.4, 1.1], color: 0xc8bca0 }), x0 = -3.5, x1 = -1.7, z0 = -5.6, z1 = -1.9, h = 2.7, dz0 = -4.3, dz1 = -3.2;
    const wl = (w, d, x, z) => { const m = box(w, h, d, wallM, x, h / 2, z, R); m.castShadow = m.receiveShadow = true; this.solid(CH, x - w / 2, x + w / 2, z - d / 2, z + d / 2); return m; };
    wl(x1 - x0, 0.1, (x0 + x1) / 2, z1); wl(x1 - x0, 0.1, (x0 + x1) / 2, z0); wl(0.1, z1 - dz1, x1, (z1 + dz1) / 2);
    { // v3.0.1: the wall left of the door gets a barred glass window (you can glimpse inside — and sometimes her)
      const len = dz0 - z0, zc = (dz0 + z0) / 2; this.solid(CH, x1 - 0.05, x1 + 0.05, z0, dz0);
      const lo = box(0.1, 0.95, len, wallM, x1, 0.475, zc, R), hi = box(0.1, h - 2.05, len, wallM, x1, 2.05 + (h - 2.05) / 2, zc, R); lo.castShadow = hi.castShadow = lo.receiveShadow = hi.receiveShadow = true;
      for (const zz of [z0 + 0.03, dz0 - 0.03]) box(0.12, 1.1, 0.06, wallM, x1, 1.5, zz, R);
      const frame = M.std(0x2a3a30, 0.55, 0.5); box(0.12, 0.05, len, frame, x1, 0.97, zc, R); box(0.12, 0.05, len, frame, x1, 2.03, zc, R);
      for (let k = 1; k < 6; k++) cyl(0.008, 0.008, 1.06, M.std(0x1a1a18, 0.5, 0.7), x1 + 0.03, 1.5, z0 + len * k / 6, R, 6);
      const gm = new THREE.MeshStandardMaterial({ color: 0x18242a, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.2, envMapIntensity: 0.9, depthWrite: false });
      const gl = plane(len - 0.06, 1.04, gm, R); gl.rotation.y = Math.PI / 2; gl.position.set(x1 + 0.01, 1.5, zc); gl.userData.noAO = true; gl.renderOrder = 2; }
    box(0.1, h - 2.25, dz1 - dz0, wallM, x1, 2.25 + (h - 2.25) / 2, (dz0 + dz1) / 2, R);
    const roofIn = box(x1 - x0, 0.08, z1 - z0, M.std(0x3a3630, 0.9), (x0 + x1) / 2, h + 0.04, (z0 + z1) / 2, R);
    const sign = signMesh(panelTex([['प्रतीक्षालय · स्टेशन मास्टर', 44, 'deva', '#fff'], ['WAITING ROOM · STATION MASTER', 34, 'sans', '#fff']], { bg: '#1a4a8a', w: 1024, h: 140, top: 18, borderColor: '#fff', seed: 6 }), 1.9, 0.26); sign.rotation.y = Math.PI / 2; sign.position.set(x1 + 0.06, 2.48, (z0 + z1) / 2); R.add(sign);
    // inside: desk, chair, a dim bulb, the torch, a calendar from 2016
    const desk = new THREE.Group(); desk.position.set(-3.0, 0, -2.6); R.add(desk); rbox(0.9, 0.06, 0.55, 0.01, M.pbr('wood', { rep: [1, 1], color: 0x7a5030 }), 0, 0.76, 0, desk); for (const [a, b] of [[-0.4, -0.22], [0.4, -0.22], [-0.4, 0.22], [0.4, 0.22]]) box(0.04, 0.76, 0.04, M.std(0x3a2a1c, 0.8), a, 0.38, b, desk); shadows(desk); this.solid(CH, -3.5, -2.5, -2.95, -2.25);
    const reg = box(0.3, 0.05, 0.22, M.std(0x6a1a14, 0.8), -0.15, 0.815, 0.05, desk);
    const bulbL = CH.fx.roomLamp = { x: -2.6, y: 2.45, z: -3.75 };
    
    const rl = makeLamp(R, -2.6, 2.62, -3.75, { color: 0xffc890, power: 2.6, dist: 5, len: 0.6, cone: false, poolW: 2.2, poolD: 2.6, prio: 1.2 }); CH.lamps.push(rl); fx.roomLamp = rl;
    let tm; if (hasProp('signal_flashlight')) { tm = prop('signal_flashlight', { h: 0.17 }); tm.rotation.z = Math.PI / 2; tm.rotation.y = 0.4; } else { tm = new THREE.Group(); const b = cyl(0.025, 0.03, 0.18, M.std(0x222222, 0.5, 0.4), 0, 0, 0, tm, 10); b.rotation.z = Math.PI / 2; }
    tm.position.set(-2.85, 0.8, -2.62); R.add(tm); fx.torchItem = tm;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: M.radial('rgba(255,240,180,1)', 'rgba(255,240,180,0)', 64), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.03; tm.add(glow);
    // batteries (some loops), on the bench by the stall
    const bat = new THREE.Group(); for (let i = 0; i < 2; i++) { const c = cyl(0.014, 0.014, 0.05, M.std(0xc8a020, 0.4, 0.6), i * 0.032, 0.025, 0, bat, 10); } bat.position.set(-2.88, 0.652, -19.3); /* v3.0.2: on the bench seat (0.65 m) — they were inside it */ R.add(bat); bat.visible = false; fx.battery = bat;
    // STD/ISD/PCO payphone booth (z -27.6) — moves the utility box out of the way
    if (CH.utilityBox) CH.utilityBox.visible = false;
    fx.phone = this.makePayphone(R, -3.05, -27.6, Math.PI / 2); this.solid(CH, -3.5, -2.7, -28.1, -27.1);
    // diary pages: d1 under bench 2 (torch only), d2 pinned inside the waiting room
    fx.pages = [this.makePage(R, 'd1', -2.95, 0.03, -20.4, { flat: true, torch: true }), this.makePage(R, 'd2', -3.44, 1.55, -4.6, { wallX: 1 })];
    // grab & inspect: a ringing mobile on bench 1, an old ticket by the stall
    fx.inspect = [
      this.inspectItem(R, 'mobile', 'Pick up the phone', -2.92, 0.655, -8.15, 0.3, () => this.makeMobile(true), { iscale: 1.5, caption: 'A cracked phone. It\'s ringing.<br><b>Incoming call: YOU</b>', onOpen: (F) => { if (F.S.voice && F.S.voice('w_arjun_hi_phone', { gain: 0.75, pan: 0.35 })) F.A.showSub('📞 "…Arjun… peeche dekh…"', 2600, true); else F.S.whisper && F.S.whisper(1.6, 0.4, 0.28); }, onTurn: (F) => { const v = F.S.voice && F.S.voice('w_arjun_turn', { gain: 1.05, pan: -0.55 }); if (!v) F.S.whisper && F.S.whisper(1.6, -0.4, 0.3); F.A.showSub('"…Arjun… turn around…"', 2600, true); F.G.flash(0.2); setTimeout(() => { F.S.sting && F.S.sting(0.45); F.S.heartbeat && F.S.heartbeat(3, 1.4); }, 1500); } }),
      this.inspectItem(R, 'ticket', 'Pick up the ticket', -2.3, 0.02, -15.8, 0.22, () => this.makeTicket(), { iscale: 1.4, caption: 'A return ticket. <b>SHUNYA ROAD → SHUNYA ROAD</b>.<br>Valid for one journey. Issued 30.10.2016.', onTurn: (F) => F.A.showSub('On the back, in pencil: "it never stops at home"', 2800, true) }),
    ];
    // ghost starts at the far end; hide-moment safe spots
    fx.ghost = this.makeGhost(CH); fx.ghostStart = { x: -0.6, z: -36.5 };
    fx.sight = this.makeGhost(CH, { sight: true }); fx.sightSpots = [
      { id: 'bridge', x: 11.3, y: 4.2, z: -58.9, ry: -Math.PI / 2, near: 3.2, when: (p) => p.x > 5.4 && p.x < 8.2 && p.z < -55.2 && p.z > -60 }, // at the far end of the bridge, top of the stairs down
      { id: 'glass', x: -2.45, y: 0, z: -4.95, ry: Math.PI / 2, near: 2.2, when: (p) => p.x > -1.45 && p.z < -1.5 && p.z > -15 && Math.hypot(p.x + 2.45, p.z + 4.95) > 3.2 }, // inside the waiting room, behind the glass
    ];
    const pillars = [-6, -14, -22, -30];
    fx.hide = { triggerZ: -7, safe: (p) => (p.x < -1.85 && p.z < -2.0 && p.z > -5.5) || pillars.some(z => p.x < 0.45 && p.x > -0.6 && Math.abs(p.z - z) < 0.45) };
  }
  buildCh2(CH) {
    const R = CH.root, fx = CH.fx, W = 2.2;
    fx.phone = this.makePayphone(R, -W + 0.18, -17.8, Math.PI / 2); this.solid(CH, -W, -W + 0.5, -18.3, -17.3);
    fx.pages = [this.makePage(R, 'd3', W - 0.02, 1.35, -23.8, { wallX: -1, torch: true }), this.makePage(R, 'd4', 0, -50, 0, { hidden: true })];
    fx.inspect = [
      this.inspectItem(R, 'bag', 'Open the bag', 1.55, 0.0, -30.2, 0.55, () => this.makeBag(), { iscale: 0.55, rx: 1.2, caption: 'A red backpack. Soaked through — and not with rain.', onOpen: (F) => { F.S.heartbeat && F.S.heartbeat(4, 1.2); }, onTurn: (F) => { if (!F.revealPage('d4')) F.A.showSub('Inside: headphones, a phone with 47 missed calls, a lunch box.', 3200, true); } }),
    ];
    fx.ghost = this.makeGhost(CH); fx.ghostStart = { x: 0, z: -38 };
    fx.sight = this.makeGhost(CH, { sight: true }); fx.sightSpots = [{ id: 'stairs', x: -0.95, y: 0, z: -38.6, ry: 0, near: 7, when: (p) => p.z < -12 && p.z > -27 }]; // at the far end, at the foot of the stairs
    // torch-only writing on the subway wall
    const c = M.canvas(512, 256), g = c.getContext('2d'); g.fillStyle = 'rgba(220,30,20,0.95)'; g.font = `700 64px ${M.DEVA}`; g.fillText('बेटा, घर चलो', 30, 110); g.font = '700 46px sans-serif'; g.fillText('COME HOME, BETA', 30, 190);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), new THREE.MeshBasicMaterial({ map: M.ctex(c), transparent: true, opacity: 0, depthWrite: false })); w.rotation.y = Math.PI / 2; w.position.set(-W + 0.02, 1.5, -9.0); R.add(w); fx.torchWriting = [w];
  }
  buildCh3(CH) {
    const R = CH.root, fx = CH.fx;
    fx.pages = [this.makePage(R, 'd5', 1.05, 0.06, -6.9, { flat: true, torch: true }), this.makePage(R, 'd6', 0, -50, 0, { hidden: true })];
    fx.inspect = [
      this.inspectItem(R, 'photo', 'Pick up the photo', -0.95, 0.505, -15.85, /* v3.0.2: on the seat — it hung in the air 12 cm off the seat edge, in a passenger's lap */ 0.35, () => this.makePhoto(), { iscale: 1.5, caption: 'A photo of a platform at night. A young man with a red backpack.', onTurn: (F, I) => { if (!F.revealPage('d6', 1600)) F.A.showSub('"turn around, beta"', 2400, true); I.obj.userData.front.material.map = photoTex('turned'); F.S.whisper && F.S.whisper(1.2, 0, 0.25); } }),
      this.inspectItem(R, 'key', 'Pick up the key', 0.3, 0.02, -10.5, 0.3, () => this.makeKey(), { iscale: 2.6, caption: 'An old brass key on a cardboard tag.', onTurn: (F) => F.A.showSub('The tag: "STATION MASTER · PF 0 · ROOM 0 — do not open". On the back, in pencil: "the code is when the clocks stopped"', 4200, true) }),
    ];
    fx.ghost = this.makeGhost(CH); fx.ghostStart = { x: 0, z: -20.5 };
    fx.sight = this.makeGhost(CH, { reflection: true, sight: true }); fx.sightSpots = [{ id: 'window', reflection: true, hw: 1.55, when: (p) => p.z < -1 && p.z > -18 && Math.abs(Math.sin(p.yaw)) > 0.88 }];
  }
  solid(CH, x0, x1, z0, z1) { CH.addSolid(x0, x1, z0, z1); }
  makePayphone(R, x, z, ry) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; R.add(g);
    const yel = M.std(0xd8a414, 0.55, 0.1), red = M.std(0x9a1a14, 0.6), blk = M.std(0x161616, 0.5, 0.2);
    rbox(0.6, 1.045, 0.45, 0.03, M.pbr('rust', { rep: [1, 1], color: 0xb8b0a0, metal: 1 }), 0, 0.5225, 0, g);    // stand (v3.0.2: reaches the phone body; it floated 4 cm above)
    rbox(0.36, 0.42, 0.22, 0.03, red, 0, 1.25, 0.06, g);                       // phone body
    box(0.3, 0.14, 0.01, M.std(0xb8c0b8, 0.2), 0, 1.36, 0.175, g);            // dial plate
    for (let i = 0; i < 12; i++) cyl(0.012, 0.012, 0.01, blk, -0.07 + (i % 3) * 0.07, 1.31 - Math.floor(i / 3) * 0.04, 0.18, g, 8).rotation.x = Math.PI / 2;
    const hs = new THREE.Group(); hs.position.set(0, 1.47, 0.14); g.add(hs); const hb = rbox(0.24, 0.05, 0.06, 0.02, blk, 0, 0, 0, hs); cyl(0.03, 0.03, 0.05, blk, -0.11, -0.03, 0, hs, 10); cyl(0.03, 0.03, 0.05, blk, 0.11, -0.03, 0, hs, 10);
    const s = signMesh(panelTex([['STD · ISD · PCO', 70, 'sans', '#c0181a']], { bg: '#f2c613', w: 512, h: 128, top: 24, borderColor: '#c0181a', seed: 9 }), 0.6, 0.15); s.position.set(0, 1.62, 0.18); g.add(s);
    shadows(g);
    return { g, handset: hs, hy: hs.position.y, ringing: false };
  }
  makePage(R, id, x, y, z, o = {}) {
    const P = PAGES.find(p => p.id === id); const tex = paperTex(['', '  ' + P.date, '  ~~~ ~~~~ ~~ ~~~~~', '  ~~~~ ~~~ ~~~~~', '  ~~ ~~~~~ ~~~ ~', '  ~~~~~ ~~ ~~~~']);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.27), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide, transparent: !!o.torch, opacity: o.torch ? 0 : 1, emissive: 0x222018, emissiveMap: tex, emissiveIntensity: o.torch ? 0.0 : 0.35 }));
    if (o.flat) { m.rotation.x = -Math.PI / 2; m.rotation.z = 0.5; } else if (o.wallX) { m.rotation.y = o.wallX > 0 ? Math.PI / 2 : -Math.PI / 2; m.rotation.z = 0.06; }
    m.position.set(x, y, z); R.add(m); m.visible = false;
    if (o.torch) { m.material.emissiveIntensity = 0.6; }
    return { id, mesh: m, torch: !!o.torch, hidden: !!o.hidden, active: false };
  }
  inspectItem(R, id, label, x, y, z, ry, make, o) {
    const mesh = make(); mesh.position.set(x, y, z); mesh.rotation.y = ry; mesh.scale.multiplyScalar(o.worldScale || 1); R.add(mesh); mesh.visible = false; shadows(mesh, true, false);
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: M.radial('rgba(255,240,200,1)', 'rgba(255,240,200,0)', 64), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })); glint.rotation.x = -Math.PI / 2; glint.position.y = 0.01; mesh.add(glint);
    return Object.assign({ id, label, mesh, make, p: 0.3, keep: true }, o);
  }
  makeMobile(call) { const g = new THREE.Group(); rbox(0.075, 0.15, 0.009, 0.008, M.std(0x111111, 0.3, 0.6), 0, 0, 0, g); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.135), new THREE.MeshBasicMaterial({ map: phoneScreenTex(call), toneMapped: false })); scr.position.z = 0.005; g.add(scr); const back = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.14), M.std(0x2a2a30, 0.4, 0.5)); back.position.z = -0.0049; back.rotation.y = Math.PI; g.add(back); const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.135), new THREE.MeshBasicMaterial({ map: (() => { const c = M.canvas(128, 256), x = c.getContext('2d'); x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 1.2; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(90, 60); x.lineTo(90 + (Math.random() - 0.5) * 220, 60 + (Math.random() - 0.5) * 300); x.stroke(); } return M.ctex(c); })(), transparent: true })); crack.position.z = 0.0055; g.add(crack); g.rotation.x = -Math.PI / 2; const w = new THREE.Group(); w.add(g); w.userData.inspectScale = 1.6; return w; }
  makeTicket() { const g = new THREE.Group(); const c = M.canvas(256, 140), x = c.getContext('2d'); x.fillStyle = '#efe6c8'; x.fillRect(0, 0, 256, 140); x.fillStyle = '#c0281c'; x.fillRect(0, 0, 256, 26); x.fillStyle = '#222'; x.font = '900 22px sans-serif'; x.fillText('SHUNYA RD → SHUNYA RD', 8, 62); x.font = '700 17px sans-serif'; x.fillText('RETURN · 30.10.2016 · PF 0', 12, 96); M.grime(x, 256, 140, 0.6, 3); const t = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.088), new THREE.MeshStandardMaterial({ map: M.ctex(c), side: THREE.FrontSide, roughness: 0.8 })); g.add(t); const c2 = M.canvas(256, 140), y = c2.getContext('2d'); y.fillStyle = '#e6dcc0'; y.fillRect(0, 0, 256, 140); y.fillStyle = '#555'; y.font = 'italic 20px Georgia'; y.fillText('it never stops at home', 20, 80); M.grime(y, 256, 140, 0.6, 5); const b = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.088), new THREE.MeshStandardMaterial({ map: M.ctex(c2), roughness: 0.8 })); b.rotation.y = Math.PI; g.add(b); g.rotation.x = -Math.PI / 2; const w = new THREE.Group(); w.add(g); return w; }
  makeBag() { const g = new THREE.Group(); const red = M.std(0x8a0e14, 0.35, 0.1); rbox(0.32, 0.42, 0.16, 0.06, red, 0, 0.21, 0, g); rbox(0.24, 0.16, 0.06, 0.03, M.std(0x5e0a0e, 0.3), 0, 0.12, 0.09, g); const wet = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.36), new THREE.MeshStandardMaterial({ color: 0x3a0204, roughness: 0.05, transparent: true, opacity: 0.85 })); wet.rotation.x = -Math.PI / 2; wet.position.y = 0.004; g.add(wet); g.rotation.x = -1.35; const w = new THREE.Group(); w.add(g); return w; }
  makePhoto() { const g = new THREE.Group(); const f = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.11), new THREE.MeshStandardMaterial({ map: photoTex('front'), roughness: 0.35 })); g.add(f); const b = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.11), new THREE.MeshStandardMaterial({ map: photoTex('back'), roughness: 0.8 })); b.rotation.y = Math.PI; g.add(b); g.rotation.x = -Math.PI / 2; const w = new THREE.Group(); w.add(g); w.userData.front = f; return w; }
  makeKey() { const g = new THREE.Group(); const brass = M.std(0xb08a3a, 0.3, 1); cyl(0.004, 0.004, 0.07, brass, 0, 0, 0, g, 8).rotation.z = Math.PI / 2; const ring = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.004, 6, 16), brass); ring.position.x = -0.045; g.add(ring); box(0.008, 0.012, 0.003, brass, 0.03, -0.007, 0, g); const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.045), new THREE.MeshStandardMaterial({ map: tagTex(), side: THREE.DoubleSide, roughness: 0.8 })); tag.position.set(-0.1, -0.02, 0); g.add(tag); g.rotation.x = -Math.PI / 2; const w = new THREE.Group(); w.add(g); return w; }
}
