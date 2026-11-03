// PLATFORM 0 v3.2 — the storyline you play through: cold open, interludes between chapters, chapter goals, small story beats
// inside the chapters (phone, voicemail, PA, people, flashback flickers), ending epilogues. Everything is skippable, and a
// scene you have already seen is skipped on replays (Settings → Story scenes: New only / Always / Off). See STORY.md.
import * as THREE from './three.module.min.js';
import { makeHuman } from './props.js';

export const GOALS = [
  'Get off Platform 0 — over the foot-over-bridge. Something wrong? Turn back.',
  'Cross the subway to Platform 1. Something wrong? Turn back.',
  'Walk to the front of the last local. Something wrong? Turn back.',
];
// in-chapter beats: once per save (or every run with "Always")
const BEATS = [
  { id: 'c1_sms', ch: 1, at: (S) => S.prog >= 1 && S.loopT > 5, phone: { app: 'Maa', time: '11:47 PM', text: 'Beta, kahaan ho? Khaana thanda ho raha hai.', tr: 'Son, where are you? The food is getting cold.' } },
  { id: 'c1_chai', ch: 1, at: (S) => S.near('vendor', 2.8), line: ['Chai uncle', 'Phir aa gaye, beta? Roz raat yahin…', 'Back again, son? Every night, right here…'] },
  { id: 'c1_pa', ch: 1, at: (S) => S.prog >= 3 && S.loopT > 8, pa: 'Yatri kripya dhyan dein. Platform zero is closed to passengers. Platform zero is… closed.' },
  { id: 'c1_flash', ch: 1, at: (S) => S.prog >= 5 && S.loopT > 6, flash: '— a horn. twice. you didn\'t turn around. —' },
  { id: 'c1_missed', ch: 1, at: (S) => S.prog >= 6 && S.loopT > 4, phone: { app: 'Phone', time: '11:56 PM', text: '3 missed calls · Maa', missed: true } },
  { id: 'c2_vm', ch: 2, at: (S) => S.prog >= 1 && S.loopT > 6, phone: { app: 'Voicemail', time: '31 Oct · 02:17 AM', text: '🎙 Maa · 0:12', vm: true },
    line: ['Maa (voicemail)', 'Arjun… station se phone aaya. Woh Platform zero bol rahe hain… Platform zero toh hai hi nahi, beta…', 'Arjun… the station called. They keep saying Platform zero… there is no Platform zero, beta…'] },
  { id: 'c2_old', ch: 2, at: (S) => S.near('beggar', 2.6), line: ['Old man', 'Platform zero band hai. Accident ke baad koi nahi chadhta.', 'Platform zero is closed. Nobody boards there since the accident.'] },
  { id: 'c2_flash', ch: 2, at: (S) => S.prog >= 4 && S.loopT > 7, flash: '— Maa calling…  you pressed decline. —' },
  { id: 'c2_pa', ch: 2, at: (S) => S.prog >= 6 && S.loopT > 6, pa: 'The eleven fifty-eight slow local is cancelled. The eleven fifty-eight is… cancelled.' },
  { id: 'c3_bat', ch: 3, at: (S) => S.prog >= 1 && S.loopT > 5, phone: { app: 'Phone', time: '02:13 AM', text: 'Battery 2% · 47 missed calls · Maa', missed: true } },
  { id: 'c3_sleep', ch: 3, at: (S) => S.prog >= 3 && S.near('passenger', 1.7), line: ['A sleeping passenger', '…agla station Shunya Road. Hamesha Shunya Road.', '…next station, Shunya Road. It\'s always Shunya Road.'] },
  { id: 'c3_flash', ch: 3, at: (S) => S.prog >= 5 && S.loopT > 6, flash: '— the song was still playing when they found you. —' },
  { id: 'c3_maa', ch: 3, at: (S) => S.prog >= 7 && S.loopT > 5, line: ['Maa (very close)', 'Mud ke dekh, beta.', 'Turn around, son.'], creepy: true },
];
export const EPILOGUE = {
  normal: { title: 'ENDING · SEE YOU TOMORROW', lines: ['Arjun never turned around.', 'Next 30 October, at 11:43 PM, he will miss the 11:41 again.', 'And somewhere behind him on Platform 0, a woman in white will wait for him to look back.'] },
  maa: { title: 'ENDING · MAA', lines: ['Arjun went home at 6:12 AM.', 'Every night at 11:58, a woman in white still brings a steel tiffin to Platform 0. The chai uncle says she doesn\'t cry any more.', 'Her things are still in Lost &amp; Found. Her name is still in the logbook. She is waiting for the 0217.'] },
  '0217': { title: 'TRUE ENDING · THE 0217', lines: ['At 2:18, every clock at Shunya Road started again.', 'That winter, Platform 0 was bricked up for good.', 'The next 31 October, the station master opened his logbook at 2:17 and waited. Nobody\'s name was added.'] },
};
const CSS = `
#story{position:fixed;inset:0;pointer-events:none;z-index:6;display:none}
#story.on{display:block}
#story .bar{position:absolute;left:0;right:0;height:9vh;background:#000}
#story .bar.t{top:0} #story .bar.b{bottom:0}
#stime{position:absolute;left:4vw;top:28vh;font:600 clamp(13px,2.3vw,20px)/1.35 'Noto Sans Devanagari',system-ui,sans-serif;color:#e8e2d0;letter-spacing:.06em;text-shadow:0 2px 6px #000;opacity:0;transition:opacity .6s}
#stime.on{opacity:1}
#stitle{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#f2ead6;text-shadow:0 3px 14px #000;opacity:0;transition:opacity 1s}
#stitle.on{opacity:1}
#stitle b{font:700 clamp(30px,8vw,76px)/1 Georgia,serif;letter-spacing:.14em} #stitle i{font:600 clamp(18px,4vw,36px)/1.4 'Noto Sans Devanagari',sans-serif;font-style:normal;margin-top:8px;opacity:.9} #stitle small{font:clamp(12px,1.8vw,16px)/1.4 sans-serif;opacity:.65;margin-top:6px}
#scap{position:absolute;left:8vw;right:8vw;bottom:calc(9vh + 18px);text-align:center;font:500 clamp(15px,2.6vw,24px)/1.4 Georgia,serif;color:#f2ead6;text-shadow:0 2px 8px #000,0 0 2px #000;opacity:0;transition:opacity .5s}
#scap.on{opacity:1}
#ssub{position:fixed;left:6vw;right:6vw;bottom:15vh;text-align:center;z-index:7;pointer-events:none;opacity:0;transition:opacity .35s}
#ssub.on{opacity:1}
#ssub div{display:inline-block;background:rgba(0,0,0,.62);padding:7px 14px;border-radius:8px;color:#fff;font:500 clamp(14px,2.2vw,20px)/1.4 'Noto Sans Devanagari',system-ui,sans-serif;max-width:760px}
#ssub em{display:block;font-style:normal;color:#c8c0b0;font-size:.82em;margin-top:2px}
#ssub b{color:#f2c613;font-weight:600;margin-right:.35em}
#ssub.creepy div{color:#f0d8d8;background:rgba(30,0,0,.6)}
#sphone{position:fixed;top:max(10px,2vh);left:50%;transform:translate(-50%,-140%);width:min(300px,46vw);background:rgba(18,20,24,.94);border:1px solid #333;border-radius:16px;padding:9px 13px;color:#eee;font:14px/1.35 system-ui,sans-serif;z-index:8;pointer-events:none;transition:transform .45s cubic-bezier(.2,.9,.3,1.2);box-shadow:0 8px 24px rgba(0,0,0,.6)}
#sphone.on{transform:translate(-50%,0)}
#sphone:not(.on){visibility:hidden;transition:transform .45s cubic-bezier(.2,.9,.3,1.2),visibility 0s .45s} /* v3.7 bug fix: the hidden, empty phone's shadow peeked in as a grey bar at the top */
#sphone .h{display:flex;justify-content:space-between;font-size:12px;opacity:.7;margin-bottom:3px}
#sphone .t{font-size:clamp(13px,2vw,16px)} #sphone .tr{font-size:12px;opacity:.6;margin-top:2px}
#sphone .me{margin-top:6px;background:#1f6d46;border-radius:12px 12px 2px 12px;padding:6px 10px;text-align:right;font-size:clamp(13px,1.9vw,15px)}
#sphone .bad{color:#ff6a5a;font-size:12px;text-align:right;margin-top:3px}
#sphone.missed .t{color:#ff6a5a}
#sflash{position:fixed;inset:0;pointer-events:none;z-index:6;opacity:0;background:radial-gradient(ellipse at 50% 46%,#fffef4 0,#fff6d8 12%,rgba(255,240,200,.55) 26%,rgba(0,0,0,.0) 55%),rgba(0,0,0,.25)}
#sflash.on{animation:sflash 1.5s ease-out}
@keyframes sflash{0%{opacity:0}6%{opacity:1}14%{opacity:.15}22%{opacity:.95}40%{opacity:.5}100%{opacity:0}}
#sflashT{position:fixed;left:6vw;right:6vw;top:42%;text-align:center;font:italic 600 clamp(15px,2.6vw,24px)/1.4 Georgia,serif;color:#fff;text-shadow:0 0 12px #000,0 2px 4px #000;z-index:7;pointer-events:none;opacity:0;transition:opacity .4s}
#sflashT.on{opacity:1}
#sskip{position:fixed;right:14px;bottom:calc(9vh + 12px);z-index:9;background:rgba(0,0,0,.55);color:#eee;border:1px solid #777;border-radius:20px;padding:8px 16px;font:600 14px system-ui,sans-serif;display:none;pointer-events:auto}
#sskip.on{display:block}
#goal{position:fixed;left:14px;top:50px;max-width:min(30vw,320px);background:rgba(0,0,0,.45);border-left:3px solid #f2c613;color:#f2ead6;padding:6px 11px;font:500 clamp(12px,1.8vw,15px)/1.35 system-ui,sans-serif;z-index:4;pointer-events:none;opacity:0;transition:opacity .6s}
#goal.on{opacity:1}
body.goalon:not(.inspecting) #hint{left:calc(min(30vw,320px) + 52px);top:max(16vh,68px);transform:none;max-width:calc(100vw - min(30vw,320px) - 150px);white-space:normal;text-align:center} #goal small{color:#f2c613;letter-spacing:.14em;font-weight:700;font-size:.78em;display:block}
body:not([data-screen=hud]) #goal{display:none}
#epi{position:fixed;inset:0;background:#000;z-index:9;display:none;flex-direction:column;align-items:center;justify-content:center;padding:6vh 8vw;text-align:center;color:#e8e2d0}
#epi.on{display:flex}
#epi h3{font:700 clamp(15px,2.4vw,22px)/1.3 system-ui,sans-serif;letter-spacing:.22em;color:#f2c613;margin:0 0 3vh}
#epi p{font:500 clamp(15px,2.5vw,22px)/1.5 Georgia,serif;margin:0 0 1.6vh;max-width:760px;opacity:0;transition:opacity 1.1s}
#epi p.on{opacity:1}
#epi .c{position:absolute;bottom:4vh;font:13px sans-serif;opacity:0;transition:opacity .6s} #epi .c.on{opacity:.55}
#chcard .chg{margin-top:14px;font:500 clamp(13px,2vw,17px)/1.4 system-ui,sans-serif;color:#f2c613;letter-spacing:.02em;max-width:80vw}
`;
const $ = (id) => document.getElementById(id);
const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class Storyline {
  constructor(A) { // A: { G, engine, camera, sound, save, writeSave, settings, getChapter, showSub }
    this.A = A; this.scene = null; this.timers = [];
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const add = (html) => { const d = document.createElement('div'); d.innerHTML = html; while (d.firstChild) document.body.appendChild(d.firstChild); };
    add(`<div id="story"><div class="bar t"></div><div class="bar b"></div><div id="stime"></div><div id="stitle"></div><div id="scap"></div></div>
      <div id="ssub"></div><div id="sphone"></div><div id="sflash"></div><div id="sflashT"></div><button id="sskip">Skip ▸▸</button><div id="goal"></div>
      <div id="epi"><h3 id="epiT"></h3><div id="epiL"></div><div class="c" id="epiC">tap / click / Enter to continue</div></div>`);
    $('sskip').addEventListener('click', (e) => { e.stopPropagation(); this.skip(); });
    $('sskip').addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); this.skip(); });
    const epiNext = (e) => { if (e) e.preventDefault(); if (this.epi && performance.now() - this.epi.t0 > 600) this.epiDone(); };
    $('epi').addEventListener('click', epiNext); $('epi').addEventListener('touchend', epiNext);
  }
  get seen() { const s = this.A.save; if (!s.seen || typeof s.seen !== 'object') s.seen = {}; return s.seen; }
  mark(k) { this.seen[k] = 1; this.A.writeSave(); }
  wants(k) { const m = this.A.settings.story || 'new'; if (m === 'off') return false; if (m === 'all') return true; return !this.seen[k]; }
  later(fn, ms) { const t = setTimeout(fn, ms); this.timers.push(t); return t; }
  clear() { for (const t of this.timers) clearTimeout(t); this.timers = []; }
  // ---------- shared UI ----------
  sub(who, line, tr, ms = 3200, creepy) {
    const el = $('ssub'); if (!this.A.settings.subs && !creepy && !this.scene) { /* subtitles off: story lines still show in scenes */ }
    el.innerHTML = `<div>${who ? `<b>${who}:</b>` : ''}“${line}”${tr ? `<em>${tr}</em>` : ''}</div>`; el.className = 'on' + (creepy ? ' creepy' : '');
    clearTimeout(this._subT); this._subT = setTimeout(() => { el.className = ''; }, ms);
  }
  phone(o, ms = 4200) {
    const el = $('sphone'); el.className = o.missed ? 'missed' : '';
    el.innerHTML = `<div class="h"><span>${o.app}</span><span>${o.time || ''}</span></div>${o.text ? `<div class="t">${o.text}</div>` : ''}${o.tr ? `<div class="tr">${o.tr}</div>` : ''}${o.me ? `<div class="me">${o.me}</div>` : ''}${o.bad ? `<div class="bad">${o.bad}</div>` : ''}`;
    void el.offsetWidth; el.classList.add('on'); const S = this.A.sound; if (S && S.ctx) buzz(S);
    clearTimeout(this._phT); if (ms) this._phT = setTimeout(() => el.classList.remove('on'), ms);
  }
  phoneOff() { $('sphone').classList.remove('on'); }
  flash(text) {
    const f = $('sflash'), t = $('sflashT'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
    const S = this.A.sound; S.horn && S.horn(1.3, 0.28); this.A.G.shake && this.A.G.shake(0.35); this.A.G.flash && this.A.G.flash(0.5);
    if (text) { t.textContent = text; t.classList.add('on'); clearTimeout(this._flT); this._flT = setTimeout(() => t.classList.remove('on'), 2600); }
  }
  goal(i, ms = 7000) { const el = $('goal'); el.innerHTML = `<small>CHAPTER ${i + 1} · GOAL</small>${GOALS[i]}`; el.classList.add('on'); document.body.classList.add('goalon'); clearTimeout(this._gT); this._gT = setTimeout(() => this.goalOff(), ms); }
  goalOff() { $('goal').classList.remove('on'); document.body.classList.remove('goalon'); } // v3.3.1: while the goal card shows, hints sit to its right (they overlapped it on 844x390)
  // ---------- in-chapter beats ----------
  resetRun() { this.runDone = new Set(); this.beatCool = 0; }
  update(dt, CH, G, player) {
    if (G.state !== 'playing' || G.transitioning || !CH) return;
    this.beatCool -= dt; if (this.beatCool > 0) return;
    const mode = this.A.settings.story || 'new'; if (mode === 'off') return;
    const S = { prog: G.progress, loopT: (performance.now() - (G.loopStart || 0)) / 1000, near: (k, r) => nearNPC(CH, k, player, r) };
    for (const b of BEATS) {
      if (b.ch !== CH.id || this.runDone.has(b.id)) continue;
      if (mode === 'new' && this.seen['b_' + b.id]) continue;
      if (G.anomaly && G.anomaly.scare) continue;
      if (!b.at(S)) continue;
      this.runDone.add(b.id); this.seen['b_' + b.id] = 1; this.A.writeSave(); this.beatCool = 12;
      if (b.phone) this.phone(b.phone, 4600);
      if (b.line) this.later(() => this.sub(b.line[0], b.line[1], b.line[2], 5200, b.creepy), b.phone ? 900 : 0);
      if (b.pa) G.announce(b.pa, true);
      if (b.flash) this.flash(b.flash);
      if (b.creepy && this.A.sound.whisper) this.A.sound.whisper(1.4, 0, 0.3);
      this.lastBeat = b.id; break;
    }
  }
  // ---------- scenes (camera owned by the scene; HUD hidden) ----------
  begin(kind, done) {
    this.clear(); this.scene = { kind, t: 0, step: 0, done, cam: { p: V(0, 1.6, 0), l: V(0, 1.6, -5) } };
    $('story').classList.add('on'); $('sskip').classList.add('on'); this.A.G.state = 'story'; this.A.show('cutscene');
    if (document.pointerLockElement) document.exitPointerLock(); // the cursor is free during a scene (Skip is clickable)
    ['stime', 'stitle', 'scap'].forEach(k => $(k).classList.remove('on'));
  }
  end() {
    const sc = this.scene; if (!sc) return; this.scene = null; this.clear();
    $('story').classList.remove('on'); $('sskip').classList.remove('on'); this.phoneOff(); $('ssub').className = ''; $('sflashT').classList.remove('on');
    if (this.actor) { this.actor.visible = false; }
    const C1 = this.A.getChapter(0, true); if (C1 && C1.train && sc.kind === 'intro') { const sm = C1.train.userData.sideMat; if (sm && this._trEm !== undefined) sm.emissiveIntensity = this._trEm; C1.train.visible = false; C1.train.position.z = -200; if (C1.train.userData.setKind) C1.train.userData.setKind('normal'); }
    if (sc.kind) this.mark(sc.kind);
    sc.done && sc.done();
  }
  skip() { const sc = this.scene; if (!sc) { if (this.onSkipOther) this.onSkipOther(); return; } if (sc.skipping) return; if (sc.t < 0.4) return; sc.skipping = true; this.A.fade(1, 250, () => this.end(), '#000'); }
  key(code) { if (this.epi && (code === 'Enter' || code === 'Space' || code === 'KeyE' || code === 'Escape')) { if (performance.now() - this.epi.t0 > 600) this.epiDone(); return true; }
    if (this.scene && (code === 'Escape' || code === 'Enter' || code === 'Space')) { this.skip(); return true; } return false; }
  cap(t) { const c = $('scap'); if (!t) { c.classList.remove('on'); return; } c.innerHTML = t; c.classList.add('on'); }
  tick(dt) { // called every frame while G.state === 'story'
    const sc = this.scene; if (!sc) return; sc.t += dt;
    if (sc.kind === 'intro') this.introTick(sc, dt); else this.interTick(sc, dt);
    const cam = this.A.camera; cam.position.copy(sc.cam.p); cam.lookAt(sc.cam.l);
  }
  // ---------- cold open (Chapter 1) ----------
  intro(done) {
    const C1 = this.A.getChapter(0); this.begin('intro', done); const sc = this.scene; sc.C = C1;
    C1.setBoard(['11:58  SLOW  CCG', 'PF 0   ·   LATE'], '#f2a213');
    if (!this.actor) { this.actor = makeHuman({ shirt: 0xe2e0d6, pants: 0x30323a, backpack: true, headphones: true, skin: 0x7a4e33, idle: 'm_cell_phone_textmessage' }); this.actor.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
    C1.root.add(this.actor); this.actor.visible = true; this.actor.position.set(1.55, 0, -8.4); this.actor.rotation.set(0, -Math.PI / 2 - 0.45, 0);
    if (C1.train) { C1.train.visible = true; if (C1.train.userData.setKind) C1.train.userData.setKind('normal'); C1.train.position.z = -170; const sm = C1.train.userData.sideMat; if (sm) { this._trEm = sm.emissiveIntensity; sm.emissiveIntensity = 0.7; } }
    const S = this.A.sound; S.train && S.train(9, true, 0.75);
    $('stime').innerHTML = 'Sunday, 30 October · 11:43 PM<br><span style="opacity:.7;font-weight:400">Shunya Road Junction</span>';
    this.later(() => $('stime').classList.add('on'), 600);
    this.later(() => this.phone({ app: 'Phone', time: '11:43 PM', text: '2 missed calls · Maa', missed: true }, 2600), 2400);
    this.later(() => { $('stime').classList.remove('on'); this.phone({ app: 'Voicemail', time: '11:31 PM', text: '🎙 Maa · 0:19  ▶ playing' }, 9800); }, 5600);
    this.later(() => this.sub('Maa (voicemail)', 'Arjun, beta… kahaan hai tu? Phone kyun nahi utha raha?', 'Arjun, son… where are you? Why aren\'t you picking up?', 3000), 6600);
    this.later(() => this.sub('Maa (voicemail)', 'Khaana bana ke rakha hai. Tera tiffin bhi.', 'I\'ve made dinner. Your tiffin too.', 2900), 9800);
    this.later(() => this.sub('Maa (voicemail)', 'Main jaag rahi hoon… jab tak tu nahi aata.', 'I\'ll stay up… until you come home.', 3300), 12900);
    this.later(() => { this.phone({ app: 'Messages · Maa', time: '11:44 PM', me: 'Missed the 11:41 😩 Taking the 11:58. Home by 12:30 Maa', bad: '⚠ Not delivered' }, 4600); }, 16600);
    this.later(() => { S.train && S.train(8, false, 0.6); }, 17400);
    this.later(() => this.sub('Arjun', 'Platform 0? Since when does Shunya Road have a Platform 0?', '', 3400), 22400);
    this.later(() => { $('stitle').innerHTML = '<b>SHUNYA ROAD</b><i>शून्य रोड</i><small>shunya: zero · nothing</small>'; $('stitle').classList.add('on'); }, 26200);
    this.later(() => this.A.fade(1, 900, null, '#000'), 29200);
    this.later(() => { $('stitle').classList.remove('on'); this.end(); }, 30300);
  }
  introTick(sc, dt) {
    const t = sc.t, C = sc.C, c = sc.cam, tr = C.train;
    // the 11:43 arrives (0-8 s), waits, and leaves (17.5 s on)
    if (tr) { if (t < 8) tr.position.z = -170 + (1 - Math.pow(1 - Math.min(1, t / 8), 2.4)) * 135; else if (t > 17.5) tr.position.z = -35 + Math.pow(t - 17.5, 2) * 1.6; if (tr.position.z > 140) tr.visible = false; }
    if (t < 7.5) { const k = ease(t / 7.5); c.p.set(1.95 - k * 0.15, 1.3 + k * 0.15, 1.2 - k * 1.6); c.l.set(3.6 - k * 0.6, 1.55, -32 + k * 16); } // rain, the platform edge, the train coming in
    else if (t < 16.5) { const k = ease((t - 7.5) / 9); c.p.set(-0.45 + k * 0.45, 1.5, -10.3 + k * 0.7); c.l.set(1.85, 1.3, -8.1); } // Arjun on his phone, the train behind him
    else if (t < 21) { const k = ease((t - 16.5) / 4.5); c.p.set(0.0 - k * 0.85, 1.5 + k * 0.35, -9.6 - k * 8.9); c.l.set(1.85 - k * 1.25, 1.3 + k * 1.95, -8.1 - k * 16.9); }
    else if (t < 26) { const k = ease((t - 21) / 5); c.p.set(-0.85 + k * 0.15, 1.85 + k * 0.1, -18.5 - k * 3.4); c.l.set(0.6, 3.3, -25); } // the board: PF 0
    else { const k = ease((t - 26) / 4); c.p.set(-0.7, 1.95 - k * 0.15, -21.9 + k * 1.8); c.l.set(0.6, 3.3 - k * 1.45, -25); }
  }
  // ---------- between chapters ----------
  interlude(i, done) {
    const CH = this.A.getChapter(i); this.begin('inter' + i, done); const sc = this.scene; sc.C = CH; sc.i = i;
    if (i === 1) {
      this.later(() => this.cap('The bridge didn\'t lead out. It led down.'), 500);
      this.later(() => { this.cap('Fifteen minutes to the 11:58. The subway runs under every platform.'); this.phone({ app: 'Messages · Maa', time: '11:48 PM', me: 'Missed the 11:41 😩 Taking the 11:58. Home by 12:30 Maa', bad: '⚠ Not delivered · Tap to retry' }, 4400); }, 4600);
      this.later(() => { this.cap(''); this.flash('— a horn. twice. —'); }, 9300);
      this.later(() => this.A.fade(1, 600, null, '#000'), 11400);
      this.later(() => this.end(), 12100);
    } else {
      this.later(() => this.cap('Platform 1. The 11:58 was waiting, doors open, lights on.'), 500);
      this.later(() => this.cap('Every seat taken. Every passenger asleep. Nobody looked up.'), 4700);
      this.later(() => { this.cap(''); this.phone({ app: 'Phone', time: '02:14 AM', text: '📞 Maa calling…' }, 2400); this.A.sound.whisper && this.A.sound.whisper(0.8, 0.3, 0.12); }, 8600);
      this.later(() => this.phone({ app: 'Phone', time: '02:14 AM', text: 'Call failed · No network', missed: true }, 2600), 11000);
      this.later(() => this.A.fade(1, 600, null, '#000'), 13100);
      this.later(() => this.end(), 13800);
    }
  }
  interTick(sc) {
    const t = sc.t, c = sc.cam, s = sc.C.start || { x: 0, z: 0 };
    if (sc.i === 1) { const k = ease(t / 12); c.p.set(s.x + 0.4 - k * 0.3, 2.35 - k * 0.6, s.z + 1.6 - k * 6.5); c.l.set(s.x - 0.2, 1.1, s.z - 14 - k * 4); }
    else { const k = ease(t / 13.5); c.p.set(s.x + 0.25 * Math.sin(t * 0.4), 1.55, s.z + 0.9 - k * 5.5); c.l.set(s.x - 0.1, 1.35, s.z - 12 - k * 3); }
  }
  // ---------- ending epilogue ----------
  epilogue(kind, done) {
    const E = EPILOGUE[kind] || EPILOGUE.normal; $('epiT').textContent = E.title;
    $('epiL').innerHTML = E.lines.map(l => `<p>${l}</p>`).join(''); $('epi').classList.add('on'); $('epiC').classList.remove('on');
    this.epi = { t0: performance.now(), done, kind }; const ps = [...$('epiL').children];
    ps.forEach((p, i) => this.later(() => p.classList.add('on'), 400 + i * 1900));
    this.later(() => $('epiC').classList.add('on'), 400 + ps.length * 1900);
    this.later(() => this.epiDone(), 400 + ps.length * 1900 + 6000);
    this.mark('end_' + kind);
  }
  epiDone() { const e = this.epi; if (!e) return; this.epi = null; this.clear(); $('epi').classList.remove('on'); e.done && e.done(); }
  hideAll() { this.clear(); this.scene = null; this.epi = null; $('story').classList.remove('on'); $('sskip').classList.remove('on'); $('epi').classList.remove('on'); this.phoneOff(); $('ssub').className = ''; this.goalOff(); $('sflashT').classList.remove('on'); if (this.actor) this.actor.visible = false; }
}
function nearNPC(CH, k, p, r) {
  const list = k === 'passenger' ? (CH.passengers || []) : [CH[k]].filter(Boolean);
  for (const o of list) { if (!o.visible) continue; const v = o.getWorldPosition(new THREE.Vector3()); if (Math.hypot(v.x - p.x, v.z - p.z) < r) return true; }
  return false;
}
function buzz(S) { // a phone vibrating in a pocket
  try { const c = S.ctx, t = c.currentTime; for (let i = 0; i < 2; i++) { const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = 140; g.gain.setValueAtTime(0.0001, t + i * 0.32); g.gain.exponentialRampToValueAtTime(0.05, t + i * 0.32 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.32 + 0.22); o.connect(g); g.connect(S.master || c.destination); o.start(t + i * 0.32); o.stop(t + i * 0.32 + 0.25); } } catch (e) {}
}
