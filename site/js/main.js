// PLATFORM 0 v2 — game loop, chapters, controls, UI, collectibles, ending
import * as THREE from './three.module.min.js';
import { Engine, QUALITY, isTouch, isPhone, gpuName } from './engine.js';
import * as M from './mats.js';
import * as TX from './tx1.js';
import { makeHuman, animateWalk, stillPose, scareFacePlane } from './props.js';
import { Sound } from './audio.js';
import { Archive } from './archive.js'; // v3.7
import { loadHumans, loadAvatars, updateHumans, HUM, setModelTier, avatarFile } from './humans.js';
import { loadProps, setPropTier, propFile, PROPS } from './models.js';
import { LOAD, expect, fetchAsset } from './assets.js';
import { MANIFEST } from './manifest.js';
import { Batcher } from './batch.js';
import { tickWeather } from './weather.js';
import { Features, PAGES } from './features.js';
import { Ch1, PLAT } from './ch1.js';
import { Ch2 } from './ch2.js';
import { Ch3 } from './ch3.js';
import { TICKETS, CHAPTER_INTRO, makeTicketMesh } from './story.js';
import { ThirdPerson, TP_STATES } from './tp.js';
import { Storyline, GOALS } from './storyline.js';
import { Health, DMG } from './health.js';

const Q = new URLSearchParams(location.search);
const DEBUG = Q.has('debug');
const $ = (id) => document.getElementById(id);
if (isTouch) document.body.classList.add('touch');

// ---------- settings + save ----------
let _saved = {}; try { _saved = JSON.parse(localStorage.getItem('p0v2_settings') || '{}'); } catch (e) {}
const settings = Object.assign({ sens: 1, vol: 0.8, retro: false, invert: false, quality: 'auto', subs: true, bright: 1, tp: false, story: 'new', hp: true }, _saved);
if (Q.get('hp')) settings.hp = Q.get('hp') !== '0'; // v3.3
if (Q.get('tp')) settings.tp = Q.get('tp') === '1';
if (Q.get('story')) settings.story = Q.get('story'); else if (navigator.webdriver && !_saved.story) settings.story = 'off'; // automated test runs keep the old timings unless they ask for ?story=
if (Q.get('q')) settings.quality = Q.get('q');
function saveSettings() { try { localStorage.setItem('p0v2_settings', JSON.stringify(settings)); } catch (e) {} }
let save = {}; try { save = JSON.parse(localStorage.getItem('p0v2_save') || '{}'); } catch (e) {}
save = Object.assign({ ch: 1, unlocked: 1, finished: false, tickets: [], pages: [], lost: [], digits: [], roomOpen: false, best: 0, runStart: 0, runMistakes: 0, runLoops: 0, seen: {}, endings: [] }, save);
if (!Array.isArray(save.pages)) save.pages = [];
function writeSave() { try { localStorage.setItem('p0v2_save', JSON.stringify(save)); } catch (e) {} }

// ---------- engine ----------
const engine = new Engine($('game'), settings.quality === 'auto' ? null : settings.quality);
engine.retro = settings.retro; engine.bright = settings.bright;
const { scene, camera } = engine;
addEventListener('resize', () => { engine.resize(); if (reflector) engine.sizeReflector(reflector);
  if (((isTouch && innerHeight > innerWidth) || (window.matchMedia && matchMedia('(orientation:portrait) and (pointer:coarse)').matches)) && (G.state === 'playing' || G.state === 'card')) pause(); }); // v3.7: the same test as the overlay's CSS (a touch-screen laptop/tablet in portrait got the overlay but the game kept running under it) // the "turn your phone" overlay covers the game: don't let it run underneath
function applyLowOverlays() { document.body.classList.toggle('lowq', !engine.Q.post); }
applyLowOverlays();
M.setAniso(engine.Q.aniso); M.setTexTier(engine.Q.tex || 'm');

const sound = new Sound(); sound.vol = settings.vol;
const G = {
  state: 'loading', chapterIdx: 0, progress: 0, mistakes: 0, loops: 0, startTime: 0, bag: [], usedScares: new Set(), first: true,
  anomaly: null, visited: false, transitioning: false, shakeAmt: 0, history: [], forceNext: Q.get('anomaly') || null,
  sound, engine, flashAmt: 0, damage: 0,
};
window.__p0G = G;
const player = { x: 0, z: 0, y: 0, yaw: 0, pitch: 0, bob: 0, stepAcc: 0, speed: 0 };
G.player = player;
let seed = (Math.random() * 1e9) | 0;
const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
G.rng = rng;
// v3 gameplay features (interact, inspect, torch, payphone, ghost, hide moment, diary pages)
const FX = new Features({ G, engine, camera: engine.camera, scene: engine.scene, get sound() { return sound; }, player, save, writeSave: () => writeSave(), hint: (t, ms) => hint(t, ms), showSub: (t, ms, c) => showSub(t, ms, c),
  failLoop: (msg) => G.failLoop(msg), caught: (cause, msg) => G.caught(cause, msg), invuln: () => HP.invuln(), show: (id) => show(id), holdClock: () => holdClock(), releaseClock: () => releaseClock(), keys: null, lockPointer: () => lockPointer(), isTouch, resetClock: () => { last = performance.now(); },
  openNote: (title, front, back) => openNote(title, front, back), resolve: (x, z) => resolve(x, z) });
G.FX = FX;
// v3.7 the Archive (title + pause menus)
const ARCH = new Archive({ save: () => save, writeSave: () => writeSave(), $: (id) => $(id) }); G.ARCH = ARCH;
let archBack = 'title';
function openArchive(from) { archBack = from; if (document.pointerLockElement) document.exitPointerLock(); show('archive'); ARCH.show(); }
let archToastT = null;
function archToast(e) { const el = $('archToast'); if (!el) return; el.textContent = `📖 New archive entry · ${ARCH.count()} / ${ARCH.total()}`; el.classList.add('show'); clearTimeout(archToastT); archToastT = setTimeout(() => el.classList.remove('show'), 2600); sound.paper && sound.paper(); }
// v3.2: third-person view + storyline
const TP = new ThirdPerson({ G, engine, camera: engine.camera, player, FX }); G.TP = TP; FX.A.tp = TP;
// v3.2.1: inspecting in third person is seen from Arjun's eyes (the first-person pose, pitch kept in a comfortable range)
FX.A.fpCam = (clamp) => { const pt = clamp ? Math.max(-0.5, Math.min(0.15, player.pitch)) : player.pitch; camera.position.set(player.x, player.y + 1.6, player.z); camera.rotation.set(pt, player.yaw, 0, 'YXZ'); camera.updateMatrixWorld(true); };
// v3.3: health (HP bar, hits, death -> back to the chapter's loop 0)
const HP = new Health({ G, settings, get sound() { return sound; }, onDeath: (cause) => G.die(cause) }); G.HP = HP;
const STORY = new Storyline({ G, engine, camera: engine.camera, get sound() { return sound; }, save, writeSave: () => writeSave(), settings, getChapter: (i, noBuild) => noBuild ? chapters[i] : getChapter(i), show: (id) => show(id), fade: (a, b, c, d) => fade(a, b, c, d) });
G.STORY = STORY;
function setTP(on, quiet) {
  settings.tp = !!on; saveSettings(); TP.setOn(settings.tp); const cb = document.getElementById('tpview'); if (cb) cb.checked = settings.tp;
  document.body.classList.toggle('tpv', settings.tp);
  if (!quiet && (G.state === 'playing' || G.state === 'paused')) hint(settings.tp ? 'Third-person view' + (isTouch ? '' : '  ·  V to switch back') : 'First-person view', 1800);
}
const chapters = [];
let CH = null;

G.shake = (a) => { G.shakeAmt = Math.max(G.shakeAmt, a); };
G.flash = (a) => { G.flashAmt = Math.max(G.flashAmt, a); };
const face = scareFacePlane(M.ctex(TX.scareFace())); camera.add(face); face.position.set(0, -0.03, -0.6);
G.scareFace = (dur = 0.8, tex) => { HP.hurt(DMG.scare, 'scare', { iframes: 0, lethal: false }); TP.forceFP(dur * 1000 + 600); if (tex) face.material.map = tex; face.visible = true; face.userData.until = performance.now() + dur * 1000; sound.sting(1.1); G.shake(0.7); G.damage = 1; };
let subTimer = null;
G.announce = (text, creepy, clip) => {
  const d = sound.chime() || 1.9; if (sound.duckBed) sound.duckBed(d + Math.max(3.5, text.length * 0.065) + 1); // v3.7: the platform bed ducks under the PA
  later(() => { if (G.state === 'playing' || G.state === 'ending') {
    let dur = clip ? sound.playClip(clip, { radio: true, creepy, rate: creepy ? 0.9 : 1, gain: creepy ? 0.95 : 0.8 }) : 0;
    if (!dur) { dur = Math.max(3.2, text.length * 0.065); sound.paVoice(dur, creepy); }
    showSub('📢 ' + text, dur * 1000 + 900, creepy); } }, d * 1000);
};
function showSub(text, ms, creepy) {
  if (!settings.subs && !creepy) return;
  const el = $('sub'); el.textContent = text; el.className = 'show' + (creepy ? ' creepy' : '');
  clearTimeout(subTimer); subTimer = setTimeout(() => { el.className = ''; }, ms);
}
G.showSub = showSub;

// ---------- anomaly selection ----------
function pickAnomaly() {
  const list = CH.anomalies;
  if (G.forceNext) { const a = list.find(x => x.id === G.forceNext); G.forceNext = null; if (a) return a; }
  if (CH.special && CH.special(G)) { G.first = false; return CH.specialAnomaly; }
  if (G.first) { G.first = false; return null; }
  const chance = G.progress === 0 && G.lastWrong ? 0.5 : 0.62;
  if (rng() > chance) return null;
  // v3.5: hidden (subtle) anomalies have their own bag; they are rare on the first platforms and common on the last ones
  const subtle = list.filter(a => a.subtle);
  if (subtle.length && rng() < subtleChance(G.progress)) { const a = drawFrom('bagS', subtle); if (a) return a; }
  return drawFrom('bag', list.filter(a => !a.subtle));
}
// share of anomalous loops that get a hidden one: 15% on platform 0 rising to 80% on platform 7
function subtleChance(p) { return Math.min(0.8, 0.15 + Math.max(0, p) * 0.093); }
G.subtleChance = subtleChance;
function drawFrom(key, list) {
  const ok = (a) => !a.avail || a.avail(CH);
  if (!G[key] || !G[key].length || G[key + 'Ch'] !== CH.id) {
    G[key + 'Ch'] = CH.id;
    G[key] = list.filter(a => !a.scare || !G.usedScares.has(a.id)).map(a => a.id);
    for (let i = G[key].length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [G[key][i], G[key][j]] = [G[key][j], G[key][i]]; }
  }
  const bag = G[key];
  for (let k = 0; k < bag.length; k++) {
    const a = list.find(x => x.id === bag[k]); if (!a) { bag.splice(k--, 1); continue; }
    if (!ok(a)) continue;
    if (a.scare && (G.progress < 2 || G.usedScares.has(a.id))) continue;
    if (a.id === G.lastAnomalyId) continue;
    bag.splice(k, 1); if (a.scare) G.usedScares.add(a.id); return a;
  }
  return null;
}
function startLoop() {
  CH.resetLoop(G.progress, rng);
  G.anomaly = G.progress >= 8 ? null : pickAnomaly();
  CH.applyAnomaly(G.anomaly);
  if (CH.batcher) CH.batcher.rebuild(); // v3.1.1: re-merge slices that were dissolved last loop
  G.lastAnomalyId = G.anomaly ? G.anomaly.id : null;
  sound.setFans(CH.fansOn !== false && CH.hasFans !== false); sound.setHum(CH.humLevel ?? 1);
  if (sound.setRain) sound.setRain(CH.rainLevel ?? 0);
  if (sound.setTrainLoop) sound.setTrainLoop(CH.trainLevel ?? 0);
  if (G.anomaly && G.anomaly.sound) G.anomaly.sound(CH, G);
  const s = CH.start; player.x = s.x; player.z = s.z; player.yaw = s.yaw; player.pitch = 0; player.y = CH.floorY(s.x, s.z);
  G.visited = false; G.toldVisit = false; G.loopStart = performance.now(); G.loops++;
  placeTickets();
  FX.onLoop(CH, G.progress);
  clearTimeout(subTimer); $('sub').className = '';
  $('dbg').textContent = DEBUG ? `C${CH.id} P${G.progress} · ${G.anomaly ? G.anomaly.id : 'normal'}` : '';
}
// session token: any timer started by a run checks it, so quitting / restarting cancels stale callbacks
G.session = 0;
const later = (fn, ms) => { const s = G.session; return setTimeout(() => { if (s === G.session) fn(); }, ms); };
function endTransition() { G.transitioning = false; if (G.pendingPause) { G.pendingPause = false; pause(); } }
function decide(dir) {
  if (G.transitioning || G.state !== 'playing') return;
  if (CH.isExit && dir === 'forward') return finishChapter();
  const had = !!G.anomaly;
  let correct = CH.isExit ? false : (had ? dir === 'back' : dir === 'forward');
  if (G.anomaly && G.anomaly.forwardOnly) correct = dir === 'forward';
  G.history.push({ ch: CH.id, progress: G.progress, anomaly: G.anomaly ? G.anomaly.id : null, dir, correct });
  if (dir === 'back' && CH.id === 1 && !CH.isExit) { if (!G.figOn) { G.figOn = true; G.figSteps = 0; } else G.figSteps = (G.figSteps || 0) + 1; save.figOn = true; save.figSteps = G.figSteps; writeSave(); } // v3.7 every turn-back brings the Figure one step closer
  if (!CH.isExit) { if (correct) { G.progress++; G.lastWrong = false; } else { G.progress = 0; G.mistakes++; G.lastWrong = true; } }
  const archNew = (correct && had && dir === 'back' && G.anomaly) ? ARCH.unlock(G.anomaly.id) : null; // v3.7: a right turn-back unlocks its archive note
  G.transitioning = true;
  fade(1, 450, () => {
    sound.step(0.6); if (!correct && !CH.isExit) sound.thud();
    startLoop();
    later(() => { fade(0, 700); endTransition(); flashLoop(); if (archNew) later(() => archToast(archNew), 1500); }, 250); // the toast once the next loop is up, not mid-decision
  });
}
G.restartLoop = (msg) => { // chase caught etc.: same progress, restart loop
  if (G.transitioning) return;
  G.transitioning = true; G.mistakes++;
  fade(1, 300, () => { startLoop(); later(() => { fade(0, 900); endTransition(); flashLoop(); if (msg) showSub(msg, 3000, true); }, 600); }, '#000');
};
G.failLoop = (msg) => { // v3: a feature caught you (ghost / ghost train) — counts like a wrong choice: back to 0
  if (G.transitioning || (G.state !== 'playing' && G.state !== 'cutscene_ghost')) return;
  G.state = 'playing'; G.transitioning = true; G.history.push({ ch: CH.id, progress: G.progress, anomaly: G.anomaly ? G.anomaly.id : null, dir: 'caught', correct: false });
  if (!CH.isExit) { G.progress = 0; G.mistakes++; G.lastWrong = true; }
  fade(1, 300, () => { sound.thud(); startLoop(); later(() => { fade(0, 900); endTransition(); flashLoop(); if (msg) showSub(msg, 3200, true); }, 600); }, '#000');
};
// v3.3: a catch takes HP instead of resetting the loop (classic behaviour when Health is off in Settings)
G.caught = (cause, msg) => {
  const r = HP.hurt(DMG[cause] || 30, cause, { iframes: cause === 'ghost' ? 3500 : 3000 });
  if (r === 'off') { if (cause === 'chase') return G.restartLoop(msg); return G.failLoop(msg); }
  if (r === 'dead') return 'dead';
  if (G.state === 'cutscene_ghost') G.state = 'playing';
  G.history.push({ ch: CH.id, progress: G.progress, anomaly: G.anomaly ? G.anomaly.id : null, dir: 'hit', cause, hp: Math.round(HP.hp) });
  const fd = $('fade'); if (fd && +fd.style.opacity > 0) fade(0, 650);
  if (msg) showSub(msg, 2600, true);
  return r;
};
const WAKE = ['You wake on the bench. Platform 0. Again.', 'You wake at the top of the subway stairs. Again.', 'You wake in the first coach. The train hasn\'t moved.'];
G.die = (cause) => { // 0 HP: a short death scene, then back to this chapter's loop 0 with full HP; tickets, pages, her things, Room 0 and the torch are kept
  const ses = G.session; G.transitioning = true; G.state = 'dying'; for (const k in keys) keys[k] = false;
  document.body.classList.add('dying'); FX.inspecting && FX.closeInspect && FX.closeInspect(true); // v3.3.1: no skill buttons / held object over the death card
  G.history.push({ ch: CH.id, progress: G.progress, anomaly: G.anomaly ? G.anomaly.id : null, dir: 'died', cause, correct: false });
  G.deaths = (G.deaths || 0) + 1;
  FX.chalk && FX.chalk.record(CH, G.progress, player, cause); // v3.7 it remembers where you fell
  sound.stopTransient && sound.stopTransient(); sound.thud(); setTimeout(() => sound.thud && sound.thud(), 420); setTimeout(() => sound.thud && sound.thud(), 1300);
  if (document.pointerLockElement) document.exitPointerLock();
  const lines = cause === 'train' ? ['YOU DIDN\'T MAKE IT HOME', 'The ghost train took you off the platform.'] : cause === 'chase' ? ['YOU DIDN\'T MAKE IT HOME', 'You looked. It saw you.'] : cause === 'stranger' ? ['YOU DIDN\'T MAKE IT HOME', 'He had your face. He kept walking.'] : cause === 'tc' ? ['YOU DIDN\'T MAKE IT HOME', 'No ticket. He opened the door for you.'] : ['YOU DIDN\'T MAKE IT HOME', '"…Arjun…" Her hands were so cold.'];
  HP.deathCard(lines, '11:58 · PF 0', () => { if (ses !== G.session) return;
    document.body.classList.remove('dying'); G.progress = 0; G.mistakes++; G.lastWrong = true; HP.reset(); FX.onRespawn && FX.onRespawn();
    startLoop(); G.state = 'playing'; fade(1, 0, null, '#000');
    later(() => { fade(0, 1100); endTransition(); flashLoop(); showSub(WAKE[CH.id - 1] || WAKE[0], 3400, true); }, 250);
  });
};
function flashLoop() { const el = $('loopflash'); el.textContent = CH.loopLabel(G.progress); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
let fadeTimer = null;
function fade(to, ms, cb, color) {
  const el = $('fade'); if (color) el.style.background = color;
  el.style.transition = `opacity ${ms}ms linear`; el.style.opacity = to; clearTimeout(fadeTimer); if (cb) fadeTimer = later(cb, ms);
}

// ---------- chapters ----------
function getChapter(i) { if (!chapters[i]) { const C = [Ch1, Ch2, Ch3][i]; chapters[i] = new C(G); } return chapters[i]; }
function enterChapter(i) {
  for (const c of chapters) if (c) c.leave();
  CH = getChapter(i); G.chapterIdx = i; CH.enter(); FX.onChapter(CH);
  engine.lamps = CH.lamps;
  setupReflector();
  engine.envFrom(CH.probe, CH.id);
  G.bag = []; G.bagS = []; G.first = true; G.progress = 0; G.lastWrong = false; G.lastAnomalyId = null;
}
let reflector = null;
function setupReflector() {
  if (reflector) { reflector.parent && reflector.parent.remove(reflector); reflector.dispose(); reflector = null; }
  if (!engine.Q.reflect || !CH.reflectRect) return;
  reflector = engine.makeReflector(CH.reflectRect); CH.root.add(reflector);
}
engine.onQuality = () => { for (const c of chapters) if (c && c.batcher) { c.batcher.clear(); c.batcher = null; } HUM.lod = engine.Q.tex === 'l' && Q.get('lod') !== '0'; applyLowOverlays(); if (CH) { setupReflector(); engine.envFrom(CH.probe, CH.id); } };

function finishChapter() {
  G.transitioning = true;
  if (CH.id === 3) return playEnding();
  const next = CH.id; // index of next chapter
  save.ch = next + 1; save.unlocked = Math.max(save.unlocked, next + 1); save.runMistakes = G.mistakes; save.runLoops = G.loops; save.runElapsed = runElapsed(); writeSave();
  fade(1, 900, () => whenChapter(next, () => { // v3.1.1: built + compiled behind the black if it isn't already
    enterChapter(next); startLoop();
    const card = () => chapterCard(next, () => { fade(0, 1200); endTransition(); flashLoop(); });
    if (STORY.wants('inter' + next)) { fade(0, 700); STORY.interlude(next, card); } else card(); // v3.2: a short scene in the next chapter first
  }), '#000');
}
function chapterCard(i, done) {
  const I = CHAPTER_INTRO[i];
  const el = $('chcard'); el.innerHTML = `<div class="chn">CHAPTER ${i + 1}</div><div class="cht">${I.title}</div><div class="chh">${I.hindi}</div><div class="chl">${I.line}</div><div class="chg">${GOALS[i]}</div>`;
  el.classList.add('on'); G.state = 'card'; G.transitioning = true;
  later(() => { el.classList.remove('on'); G.state = 'playing'; done && done(); STORY.goal(i); if (!isTouch && document.pointerLockElement !== canvas && !G.touchActive) hint('Click to look around', 3000); if (I.pa) later(() => G.announce(I.pa, !!I.paCreepy, I.clip), 1500); }, DEBUG ? 600 : 4200);
}

// ---------- collectibles ----------
const ticketMeshes = {};
function placeTickets() {
  for (const k in ticketMeshes) ticketMeshes[k].visible = false;
  if (CH.isExit) return;
  for (const t of TICKETS) {
    if (t.ch !== CH.id || t.p !== G.progress || save.tickets.includes(t.id)) continue;
    if (!ticketMeshes[t.id]) { ticketMeshes[t.id] = makeTicketMesh(); }
    const m = ticketMeshes[t.id]; CH.root.add(m); m.position.set(...t.pos); m.visible = true; m.userData.ticket = t;
  }
}
function checkTickets(dt) {
  for (const k in ticketMeshes) {
    const m = ticketMeshes[k]; if (!m.visible || m.parent !== CH.root || G.transitioning) continue;
    m.rotation.y += dt * 1.2; m.userData.glow && (m.userData.glow.material.opacity = 0.35 + Math.sin(performance.now() / 300) * 0.15);
    const dx = m.position.x - player.x, dz = m.position.z - player.z;
    if (dx * dx + dz * dz < 1.3 * 1.3) { m.visible = false; collectTicket(m.userData.ticket); }
  }
}
function collectTicket(t) {
  if (!save.tickets.includes(t.id)) { save.tickets.push(t.id); writeSave(); }
  sound.paper && sound.paper();
  $('noteNum').textContent = `LOST TICKET ${save.tickets.length} / ${TICKETS.length}`;
  $('noteFront').innerHTML = t.front; $('noteBack').innerHTML = t.back;
  G.state = 'note'; show('note'); holdClock(); for (const k in keys) keys[k] = false; if (document.pointerLockElement) document.exitPointerLock();
  G.noteOpenedAt = performance.now(); engine.setDOF(true, 0.3);
}
function openNote(title, front, back) { // v3: diary pages reuse the ticket reader
  $('noteNum').textContent = title; $('noteFront').innerHTML = front; $('noteBack').innerHTML = back || '';
  G.state = 'note'; show('note'); holdClock(); for (const k in keys) keys[k] = false; if (document.pointerLockElement) document.exitPointerLock();
  G.noteOpenedAt = performance.now(); engine.setDOF(true, 0.3);
}
function closeNote() {
  if (G.state !== 'note') return;
  if (performance.now() - (G.noteOpenedAt || 0) < 400) return; // ignore the tap/key that was already in flight when the note opened
  G.state = 'playing'; show('hud'); releaseClock(); if (!isTouch) lockPointer(); last = performance.now(); engine.setDOF(false);
}

// ---------- collision ----------
function resolve(nx, nz) {
  const r = 0.28, B = CH.walkBounds || CH.bounds, ox = player.x, oz = player.z;
  nx = Math.max(B.x0, Math.min(B.x1, nx)); nz = Math.max(B.z0, Math.min(B.z1, nz));
  if (CH.walk && !CH.walk(nx, nz)) { if (CH.walk(nx, oz)) nz = oz; else if (CH.walk(ox, nz)) nx = ox; else { nx = ox; nz = oz; } } // v3: walkable-area chapters (the bridge)
  for (let it = 0; it < 2; it++) for (const s of CH.solids) {
    const cx = Math.max(s.x0, Math.min(s.x1, nx)), cz = Math.max(s.z0, Math.min(s.z1, nz));
    const dx = nx - cx, dz = nz - cz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-8) { const d = Math.sqrt(d2); nx = cx + dx / d * r; nz = cz + dz / d * r; }
      else { const o = [[s.x0 - r - nx, 0], [s.x1 + r - nx, 0], [0, s.z0 - r - nz], [0, s.z1 + r - nz]].sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1])); nx += o[0][0]; nz += o[0][1]; }
    }
  }
  return [nx, nz];
}

// ---------- input ----------
const keys = {}; FX.A.keys = keys;
addEventListener('keydown', e => { keys[e.code] = true;
  if (STORY.key(e.code)) { e.preventDefault(); return; }
  if (G.state === 'ending' && (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space')) { skipEnding(); e.preventDefault(); return; }
  if (e.code === 'KeyV' && !e.repeat && (G.state === 'playing' || G.state === 'paused' || G.state === 'card')) { setTP(!settings.tp); e.preventDefault(); return; }
  if (FX.key(e.code)) { e.preventDefault(); return; }
  if (G.state === 'note' && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape')) { closeNote(); return; }
  if (e.code === 'Escape') { // menus: Esc goes back one screen
    const on = document.querySelector('.screen.on'); const id = on && on.id;
    if (id === 'settings') { $('btnSetBack').onclick(); return; }
    if (id === 'how') { show('title'); return; }
    if (id === 'chapters') { $('btnChBack').onclick(); return; }
    if (id === 'archive') { if (!ARCH.back()) $('btnArchBack').onclick(); return; }
  }
  if ((e.code === 'Escape' && document.pointerLockElement !== canvas) || e.code === 'KeyP') { if (G.state === 'playing' || G.state === 'card') pause(); else if (G.state === 'paused' && e.code === 'KeyP') resume(); } });
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseDown = false; });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (G.state === 'playing' || G.state === 'card') pause(); if (G.startTime && G.state !== 'title' && G.state !== 'end') { save.runElapsed = runElapsed(); writeSave(); } sound.suspend && sound.suspend(); }
  else sound.wake && sound.wake();
});
addEventListener('pagehide', () => { if (G.state === 'playing' || G.state === 'paused' || G.state === 'note' || G.state === 'card') { save.runElapsed = runElapsed(); writeSave(); } });
const canvas = $('game');
// pointer lock: a refused lock (e.g. the browser's ~1 s cooldown after Esc, or an iframe without permission) is not permanent;
// clicking the game tries again, and holding the mouse button to drag-look always works as a fallback
canvas.addEventListener('click', () => { if ((G.state === 'playing' || G.state === 'card') && document.pointerLockElement !== canvas && !G.touchActive) lockPointer(); });
function lockPointer() {
  if (G.lockDenied > 2) return; // this frame/browser never grants it: stay on drag-to-look
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(lockFailed); } catch (e) { lockFailed(); }
}
function lockFailed() { G.lockDenied = (G.lockDenied || 0) + 1; if (G.state === 'playing') hint('Click to look around  ·  or hold the mouse button and drag', 3500); }
document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement === canvas) G.lockDenied = 0; else if (G.state === 'playing' && G.hadLock) pause(); G.hadLock = document.pointerLockElement === canvas; });
let mouseDown = false; G.lockDenied = 0;
document.addEventListener('pointerlockerror', lockFailed);
canvas.addEventListener('mousedown', (e) => { if (e.button === 2) { if (G.state === 'playing') FX.flare(); return; } if (e.button === 0 && document.pointerLockElement === canvas && G.state === 'playing' && FX.def.weapon) { FX.def.swing(); return; } mouseDown = true; }); canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // v3.3 right-click = torch flare
addEventListener('mouseup', () => { mouseDown = false; }); // v3.7 bug fix: this listener sat inside the comment above, so drag-to-look never let go
addEventListener('mousemove', e => { if (G.state !== 'playing') return; if (document.pointerLockElement === canvas) look(e.movementX, e.movementY, 0.0022); else if (mouseDown) look(e.movementX, e.movementY, 0.004); });
function look(dx, dy, k) { player.yaw -= dx * k * settings.sens; player.pitch -= dy * k * settings.sens * (settings.invert ? -1 : 1); player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch)); }
const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 }, lookT = { id: null, x: 0, y: 0 };
const touchEl = $('touch');
touchEl.addEventListener('touchstart', e => { for (const t of e.changedTouches) { if (t.clientX < innerWidth * 0.45 && joy.id === null) { joy.id = t.identifier; joy.ox = t.clientX; joy.oy = t.clientY; joy.x = joy.y = 0; showJoy(true); } else if (lookT.id === null) { lookT.id = t.identifier; lookT.x = t.clientX; lookT.y = t.clientY; } } e.preventDefault(); }, { passive: false });
touchEl.addEventListener('touchmove', e => { for (const t of e.changedTouches) { if (t.identifier === joy.id) { let dx = t.clientX - joy.ox, dy = t.clientY - joy.oy; const m = Math.hypot(dx, dy), R = 60; if (m > R) { dx *= R / m; dy *= R / m; } joy.x = dx / R; joy.y = dy / R; showJoy(true); } else if (t.identifier === lookT.id) { look(t.clientX - lookT.x, t.clientY - lookT.y, 0.0055); lookT.x = t.clientX; lookT.y = t.clientY; } } e.preventDefault(); }, { passive: false });
const endTouch = e => { for (const t of e.changedTouches) { if (t.identifier === joy.id) { joy.id = null; joy.x = joy.y = 0; showJoy(false); } if (t.identifier === lookT.id) lookT.id = null; } };
touchEl.addEventListener('touchend', endTouch); touchEl.addEventListener('touchcancel', endTouch);
function showJoy(on) { const b = $('joy'), k = $('joyk'); b.style.display = on ? 'block' : 'none'; if (on) { b.style.left = joy.ox - 60 + 'px'; b.style.top = joy.oy - 60 + 'px'; k.style.transform = `translate(${joy.x * 60}px, ${joy.y * 60}px)`; } }

// ---------- screens ----------
function show(id) { document.body.dataset.screen = id; for (const s of document.querySelectorAll('.screen')) s.classList.toggle('on', s.id === id); $('touch').style.display = (id === 'hud' && isTouch) ? 'block' : 'none'; if (id !== 'hud') { joy.id = null; lookT.id = null; joy.x = joy.y = 0; showJoy(false); } }
function startGame(chIdx = 0, fresh = true, withIntro = false) {
  if (!chOK[chIdx]) { if (!G.loadingCh) { G.loadingCh = true; whenChapter(chIdx, () => { G.loadingCh = false; startGame(chIdx, fresh, withIntro); }).catch(e => { G.loadingCh = false; console.warn('chapter load', e && e.message); }); } return; } // v3.1.1
  G.session++; clearTimeout(fadeTimer); G.transitioning = false; G.pendingPause = false; G.chaseDone = false; G.pausedAt = 0;
  for (const k in keys) keys[k] = false;
  sound.init(); sound.setVolume(settings.vol); sound.stopTransient && sound.stopTransient();
  Object.assign(G, { progress: 0, mistakes: fresh ? 0 : (save.runMistakes || 0), loops: fresh ? 0 : (save.runLoops || 0), bag: [], bagS: [], first: true, history: [], lastWrong: false });
  G.figOn = fresh ? false : !!save.figOn; G.figSteps = fresh ? 0 : (save.figSteps || 0); G.figIntro = !!save.figIntro; if (fresh) { save.figOn = false; save.figSteps = 0; } // v3.7 the Figure (per run)
  G.usedScares = new Set();
  G.startTime = performance.now() - (fresh ? 0 : Math.min(30 * 60e3, save.runElapsed || 0));
  if (fresh) { save.ch = chIdx + 1; save.runMistakes = 0; save.runLoops = 0; save.runElapsed = 0; save.finishedRun = false; writeSave(); }
  G.chapterSelect = !fresh && chIdx >= 0 && G.fromSelect;
  restoreNight(); FX.resetRun(chIdx); STORY.hideAll(); STORY.resetRun(); HP.cancel(); HP.reset(); G.deaths = 0;
  enterChapter(chIdx);
  const go = () => { startLoop(); G.state = 'card'; show('hud');
    fade(1, 0); chapterCard(chIdx, () => { fade(0, 1400); endTransition(); flashLoop(); hint(isTouch ? 'Left thumb: walk   ·   Right thumb: look   ·   🎥 view' : 'WASD to walk  ·  Mouse to look  ·  Shift to run  ·  V view', 5000); }); };
  if (withIntro && fresh && chIdx === 0 && !G.fromSelect && STORY.wants('intro')) { CH.resetLoop(0, rng); CH.applyAnomaly(null); G.transitioning = true; fade(0, 700); STORY.intro(go); } // v3.2 cold open
  else { go(); if (!isTouch) lockPointer(); }
}
let hintTimer = null;
function hint(t, ms) { const el = $('hint'); el.textContent = t; el.classList.add('show'); clearTimeout(hintTimer); hintTimer = setTimeout(() => el.classList.remove('show'), ms); }
// run clock that excludes time spent paused or reading a ticket
function runElapsed() { return (G.pausedAt ? G.pausedAt : performance.now()) - G.startTime; }
function holdClock() { if (!G.pausedAt) G.pausedAt = performance.now(); }
function releaseClock() { if (G.pausedAt) { G.startTime += performance.now() - G.pausedAt; G.pausedAt = 0; } }
function pause() {
  if (G.state === 'card' || (G.state === 'playing' && G.transitioning)) { G.pendingPause = true; return; } // finish the fade / chapter card first
  if (G.state !== 'playing') return;
  G.state = 'paused'; show('pause'); holdClock(); for (const k in keys) keys[k] = false; $('pauseStats').textContent = `📖 Diary pages ${save.pages.length} / ${PAGES.length}   ·   🎫 Lost tickets ${save.tickets.length} / ${TICKETS.length}`; $('pauseLost').innerHTML = FX.mystery.pauseHTML(); $('pauseGoal').innerHTML = CH ? `<b>GOAL</b> · ${GOALS[CH.id - 1]}` : ''; $('btnPauseView').textContent = settings.tp ? '🎥 View: third person' : '🎥 View: first person'; pauseLabels();
  if (document.pointerLockElement) document.exitPointerLock(); save.runElapsed = runElapsed(); writeSave();
}
function resume() { if (G.state !== 'paused') return; G.state = 'playing'; show('hud'); releaseClock(); if (!isTouch) lockPointer(); last = performance.now(); }
function toTitle() {
  G.session++; clearTimeout(fadeTimer); G.transitioning = false; G.pendingPause = false; G.pausedAt = 0;
  G.state = 'title'; show('title'); STORY.hideAll(); HP.cancel(); restoreNight(); enterChapter(0); CH.resetLoop(0, rng); CH.applyAnomaly(null);
  sound.stopTransient && sound.stopTransient(); sound.setTrainLoop && sound.setTrainLoop(0); sound.setRain && sound.setRain(CH.rainLevel ?? 0); sound.setHum(1); sound.setFans(true);
  clearTimeout(subTimer); $('sub').className = ''; $('chcard').classList.remove('on'); $('loopflash').classList.remove('show');
  fade(0, 300); if (document.pointerLockElement) document.exitPointerLock(); refreshTitle();
}
G.pause = pause; G.resume = resume;
let settingsBack = 'title';
function openSettings(from) { settingsBack = from; show('settings'); const fb = $('btnForget'); if (fb) { fb.disabled = !save.chalk; fb.textContent = 'Forget me'; } }
function refreshTitle() {
  const cont = save.ch > 1 && !save.finishedRun;
  $('btnContinue').style.display = cont ? 'block' : 'none';
  $('btnContinue').textContent = `Continue · Chapter ${save.ch}`;
  $('btnChapters').style.display = (save.unlocked > 1 || save.finished) ? 'block' : 'none';
  $('btnArchive').textContent = ARCH.label(); $('btnArchive').classList.toggle('hasnew', ARCH.unseen() > 0);
  $('ticketsTitle').textContent = [save.tickets.length ? `🎫 Lost tickets: ${save.tickets.length} / ${TICKETS.length}` : '', save.pages.length ? `📖 Diary pages: ${save.pages.length} / ${PAGES.length}` : '', (save.lost || []).length ? `🧳 Lost & found: ${save.lost.length} / 6` : ''].filter(Boolean).join('   ·   ');
}
$('btnPlay').onclick = () => { G.fromSelect = false; save.finishedRun = false; startGame(0, true, true); };
$('btnContinue').onclick = () => { G.fromSelect = false; startGame(save.ch - 1, false); };
$('btnChapters').onclick = () => { if (document.pointerLockElement) document.exitPointerLock(); show('chapters'); $('chStats').textContent = `🎫 Lost tickets ${save.tickets.length} / ${TICKETS.length}   ·   📖 Diary pages ${save.pages.length} / ${PAGES.length}${save.pages.length >= PAGES.length ? '  ·  true ending unlocked' : ''}`; for (let i = 0; i < 3; i++) { const b = $('chBtn' + i); b.disabled = !(save.finished || save.unlocked > i); } };
for (let i = 0; i < 3; i++) $('chBtn' + i).onclick = () => { G.fromSelect = true; startGame(i, true); };
$('btnChBack').onclick = () => { if (G.state === 'title') show('title'); else toTitle(); };
$('btnHow').onclick = () => show('how');
$('btnArchive').onclick = () => openArchive('title');
$('btnPauseArchive').onclick = () => openArchive('pause');
$('btnArchBack').onclick = () => { show(archBack); if (archBack === 'title') refreshTitle(); else pauseLabels(); };
$('archList').addEventListener('click', (e) => ARCH.click(e.target)); $('archTabs').addEventListener('click', (e) => ARCH.click(e.target)); $('archRead').addEventListener('click', (e) => ARCH.click(e.target));
$('btnForget').onclick = () => { FX.chalk && FX.chalk.forget(); const b = $('btnForget'); b.textContent = 'Forgotten'; b.disabled = true; setTimeout(() => { b.textContent = 'Forget me'; b.disabled = !(save.chalk); }, 1600); };
function pauseLabels() { $('btnPauseArchive').textContent = ARCH.label(); $('btnPauseArchive').classList.toggle('hasnew', ARCH.unseen() > 0); }
$('btnSettings').onclick = () => openSettings('title');
$('btnHowBack').onclick = () => show('title');
$('btnResume').onclick = resume;
$('btnPauseSettings').onclick = () => openSettings('pause');
$('btnQuit').onclick = toTitle;
$('btnSetBack').onclick = () => { show(settingsBack); };
$('btnAgain').onclick = () => { save.finishedRun = false; G.fromSelect = false; startGame(0, true, true); };
$('btnEndTitle').onclick = toTitle;
$('btnEndChapters').onclick = () => { $('btnChapters').onclick(); };
$('pauseBtn').onclick = (e) => { e.stopPropagation(); pause(); };
$('note').onclick = closeNote; $('note').addEventListener('touchend', (e) => { e.preventDefault(); closeNote(); });
const sSens = $('sens'), sVol = $('vol'), sRetro = $('retro'), sInv = $('invert'), sQ = $('quality'), sSubs = $('subs');
sSens.value = settings.sens; sVol.value = settings.vol; sRetro.checked = settings.retro; sInv.checked = settings.invert; sQ.value = settings.quality; sSubs.checked = settings.subs;
sSens.oninput = () => { settings.sens = +sSens.value; saveSettings(); };
sVol.oninput = () => { settings.vol = +sVol.value; sound.setVolume(settings.vol); saveSettings(); };
sRetro.onchange = () => { settings.retro = sRetro.checked; engine.retro = settings.retro; engine.bright = settings.bright; saveSettings(); engine.resize(); };
sInv.onchange = () => { settings.invert = sInv.checked; saveSettings(); };
const sBright = $('bright'); sBright.value = settings.bright; sBright.oninput = () => { settings.bright = +sBright.value; engine.bright = settings.bright; saveSettings(); if (CH) CH.enter(); };
sSubs.onchange = () => { settings.subs = sSubs.checked; saveSettings(); };
const sHP = $('hpon'); sHP.checked = settings.hp !== false; sHP.onchange = () => { settings.hp = sHP.checked; saveSettings(); HP.sync(); };
const sTP = $('tpview'), sStory = $('storymode'); sTP.checked = !!settings.tp; sStory.value = settings.story || 'new';
sTP.onchange = () => setTP(sTP.checked, true); sStory.onchange = () => { settings.story = sStory.value; saveSettings(); };
$('btnPauseView').onclick = () => { setTP(!settings.tp, true); $('btnPauseView').textContent = settings.tp ? '🎥 View: third person' : '🎥 View: first person'; };
const tpBtn = $('tpBtn'); const tpTap = (e) => { e.preventDefault(); e.stopPropagation(); if (G.state === 'playing' || G.state === 'card') setTP(!settings.tp); };
tpBtn.addEventListener('touchstart', tpTap, { passive: false }); tpBtn.addEventListener('click', tpTap);
document.body.classList.toggle('tpv', !!settings.tp);
sQ.onchange = () => { settings.quality = sQ.value; saveSettings(); engine.setQuality(sQ.value === 'auto' ? autoKey : sQ.value); qLabel(); };
const autoKey = engine.qKey;
function qLabel() { $('qnow').textContent = settings.quality === 'auto' ? `(auto: ${engine.Q.name})` : ''; }

// ---------- ending ----------
let body = null;
function restoreNight() {
  $('endtext').className = ''; $('endcard').classList.remove('on'); $('paper').classList.remove('on');
  $('fade').style.background = '#000'; sound.drone(false);
  if (body) body.visible = false;
  if (chapters[0]) chapters[0].dawn && chapters[0].setDawn(false);
}
function playEnding() {
  // v3.2: three endings. normal = reach the end; maa = all 6 diary pages; 0217 (true) = pages + her 6 things + Room 0
  const pagesDone = save.pages.length >= PAGES.length, myst = FX.mystery.complete();
  G.endKind = pagesDone && myst ? '0217' : pagesDone ? 'maa' : 'normal'; G.endSkipping = false;
  G.state = 'ending'; G.endT = 0; G.endStep = 0; G.endTime = runElapsed(); G.pendingPause = false; G.trueEnd = G.endKind !== 'normal'; G.trueStep = 0;
  save.finished = true; save.finishedRun = true; save.ch = 1; save.unlocked = 3; const s = Math.round(G.endTime / 1000); if (!save.best || s < save.best) save.best = s;
  if (!Array.isArray(save.endings)) save.endings = []; if (!save.endings.includes(G.endKind)) save.endings.push(G.endKind); writeSave();
  if (document.pointerLockElement) document.exitPointerLock();
  show('cutscene'); STORY.goalOff(); // hides HUD: crosshair, pause button, touch controls
  document.getElementById('sskip').classList.add('on');
  if (sound.setTrainLoop) sound.setTrainLoop(0);
  sound.brake && sound.brake();
  fade(1, 1800, null, G.endKind === '0217' ? '#000' : '#fff');
  if (G.endKind !== '0217') { later(() => sound.birds(), 2500); later(() => sound.birds(), 5500); }
}
function skipEnding() { // v3.2: Skip ▸▸ / Esc during an ending scene goes straight to its epilogue
  if (G.state !== 'ending' || G.endSkipping || G.endT < 0.5) return; G.endSkipping = true;
  fade(1, 300, () => { $('endtext').className = ''; $('paper').classList.remove('on'); sound.drone(false); toEpilogue(); }, '#000');
}
STORY.onSkipOther = skipEnding;
function toEpilogue() {
  const kind = G.endKind || 'normal'; G.state = 'epilogue'; document.getElementById('sskip').classList.remove('on');
  const ch0 = chapters[0]; if (ch0 && ch0.fx && ch0.fx.ghost) ch0.fx.ghost.visible = false;
  STORY.epilogue(kind, () => endScreen(kind));
}
function endScreen(kind) {
  const s = Math.round(G.endTime / 1000), C1 = chapters[0];
  const base = `Time ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}   ·   Loops ${G.loops}   ·   Mistakes ${G.mistakes}`;
  const got = (save.endings || []).length;
  if (kind === 'normal') {
    $('stats').innerHTML = `${base}<br>Lost tickets ${save.tickets.length} / ${TICKETS.length}${save.tickets.length < TICKETS.length ? ' — the rest are still out there' : ' — you know everything now'}<br>${FX.mystery.endHint(save.pages.length >= PAGES.length) || 'Diary pages ' + save.pages.length + ' / ' + PAGES.length + ' — find them all for Maa\'s ending'}<br><span style="opacity:.7">Endings found ${got} / 3</span>`;
    $('endSub').textContent = 'SEE YOU TOMORROW';
  } else if (kind === 'maa') {
    $('stats').innerHTML = `<b style="color:#f2c613;letter-spacing:.2em">ENDING · MAA</b><br>${base}<br>Diary pages ${save.pages.length} / ${PAGES.length}   ·   Lost &amp; Found ${save.lost.length} / 6   ·   Room 0 ${save.roomOpen ? 'opened' : 'locked'}<br><span style="color:#f2c613">${FX.mystery.endHint(true)}</span><br><span style="opacity:.7">Endings found ${got} / 3</span>`;
    $('endSub').textContent = 'GO HOME, BETA';
  } else {
    $('stats').innerHTML = `<b style="color:#f2c613;letter-spacing:.2em">TRUE ENDING · THE 0217</b><br>${base}<br>Diary pages ${save.pages.length} / ${PAGES.length}   ·   Lost tickets ${save.tickets.length} / ${TICKETS.length}<br>Lost &amp; Found ${save.lost.length} / 6   ·   Room 0 opened<br><span style="opacity:.7">Endings found ${got} / 3</span>`;
    $('endSub').textContent = 'GO HOME';
  }
  if (C1 && C1.fx && C1.fx.ghost) C1.fx.ghost.visible = false;
  G.state = 'end'; show('end'); fade(0, 600); setTimeout(() => $('endcard').classList.add('on'), 50); if (C1) C1.setDawn(false);
}
function endText(t, cls) { const el = $('endtext'); el.textContent = t; el.className = 'show ' + (cls || ''); }
const v3 = new THREE.Vector3();
function ease(k) { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); }
function updateEnding(dt) {
  const t = (G.endT += dt);
  const step = (n, at, fn) => { if (G.endStep === n && t >= at) { G.endStep = n + 1; fn(); } };
  const C1 = chapters[0] || getChapter(0);
  step(0, 1.6, () => endText(G.endKind === '0217' ? '2:17 AM' : '6:12 AM', 'time'));
  step(1, 3.4, () => {
    endText('', ''); enterChapter(0); C1.resetLoop(8, rng); C1.applyAnomaly(null); C1.setDawn(G.endKind !== '0217');
    C1.exitGlow.visible = G.endKind !== '0217'; C1.exitLamp.power = G.endKind !== '0217' ? 30 : 0;
    if (!body) { body = makeHuman({ shirt: 0xe2e0d6, pants: 0x30323a, backpack: true, headphones: true, skin: 0x7a4e33 }); body.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
    C1.root.add(body); body.visible = true; body.position.set(PLAT.doorX, 0, -36.6); body.rotation.set(0, Math.PI, 0); stillPose(body); body.userData.head.rotation.set(0, 0, 0);
    fade(0, 1600);
  });
  if (G.endStep >= 2 && G.endStep <= 3) {
    const k = ease((t - 3.6) / 3.6);
    camera.position.set(PLAT.doorX + k * 1.4, 1.62 + k * 0.7, -36.6 + k * 5.0);
    body.userData.head.getWorldPosition(v3); v3.y += 0.15;
    if (k < 0.05) camera.lookAt(PLAT.doorX, 1.62, -45); else { const tgt = new THREE.Vector3(PLAT.doorX, 1.62, -45).lerp(v3, ease(k * 1.6)); camera.lookAt(tgt); }
  }
  step(2, 7.4, () => { C1.exitGlow.visible = false; C1.exitLamp.power = 0; C1.exitSign.visible = false; sound.thud(); sound.drone(true); });
  if (G.endStep >= 3 && t > 7.8 && t < 9.5) { const kh = ease((t - 7.8) / 0.35), kb = ease((t - 8.3) / 1.1); body.rotation.y = Math.PI - kb * Math.PI; body.userData.head.rotation.y = kh * (1 - kb) * 1.9; }
  step(3, 8.7, () => { sound.sting(0.45); });
  step(4, 9.5, () => { body.rotation.y = 0; body.userData.head.rotation.y = 0; endText('The man with the red backpack, who walked past you on every loop...', 'story'); });
  if (G.endStep >= 5 && !(G.trueEnd && t >= 27.2)) {
    const stopped = t > 12.4 && t < 16.0;
    if (!stopped && body.position.z < 1.5) { body.position.z += 1.25 * dt; body.position.x += (-0.5 - body.position.x) * dt * 0.5; animateWalk(body, dt, 1.25); }
    else if (stopped) { stillPose(body); body.userData.head.rotation.x = -0.12; }
    if (t > 16.0) body.userData.head.rotation.x = 0;
    if (G.endStep < 10) { body.userData.head.getWorldPosition(v3); const cz = Math.min(-24.5, body.position.z + 4.4 - (t > 12.4 ? Math.min(1.6, (t - 12.4) * 0.45) : 0)); camera.position.set(-2.0, 1.75, cz); camera.lookAt(v3.x, v3.y - 0.15, v3.z); }
  }
  step(5, 13.0, () => { endText('...was you.', 'story big'); sound.whisper(1.2, 0, 0.3); });
  step(6, 15.6, () => { endText('', ''); $('paper').classList.add('on'); sound.paper && sound.paper(); });
  step(7, 22.5, () => { $('paper').classList.remove('on'); if (G.endKind === '0217') G.announce('Yatri kripya dhyan dein. Train number zero two one seven, the Platform Zero Local, is arriving on Platform zero.', true); else G.announce('Attention please. The anomaly on Platform 0 has been resolved. Thank you for your patience.', false, 'pa_end'); });
  step(8, 27.0, () => {});
  if (G.trueEnd && t >= 27.2) { updateTrueEnding(dt, t, C1); return; }
  step(9, 27.2, () => {
    const now = new Date(); const hh = String(now.getHours()).padStart(2, '0'), mm = String(now.getMinutes()).padStart(2, '0');
    C1.setBoard(['NEXT: YOU      PF 0', `TOMORROW ${hh}:${mm}`], '#ff3a1a');
    camera.position.set(0.6, 3.05, -23.3); camera.lookAt(0.6, 3.3, -25); sound.drone(false);
  });
  step(10, 28.2, () => { if (!sound.playClip('whisper', { rate: 0.85, gain: 1.1, pan: -0.3 })) sound.whisper(1.8, 0, 0.35); showSub('"see you tomorrow."', 2600, true); });
  if (G.endStep >= 10) camera.position.z -= dt * 0.12;
  step(11, 31.2, () => fade(1, 900, null, '#000'));
  step(12, 32.4, () => { toEpilogue(); });
}


// v3.2 endings B and C: the woman in the white saree was his mother. B (MAA): he turns around and goes home; she stays.
// C (THE 0217, true ending): it is 2:17, the train in no timetable comes for the last name in the logbook, and they board it together.
function updateTrueEnding(dt, t, C1) {
  const st = (n, at, fn) => { if (G.trueStep === n && t >= at) { G.trueStep = n + 1; fn(); } };
  const ghost = C1.fx && C1.fx.ghost, K = G.endKind;
  st(0, 27.2, () => {
    if (K === '0217') C1.setBoard(['0217  PLATFORM 0 LOCAL', 'ARRIVING   02:17'], '#ff3a1a'); else C1.setBoard(['NEXT: HOME      PF 1', 'ON TIME'], '#f2c613');
    sound.drone(false);
    body.visible = true; body.position.set(-1.1, 0, -32.6); body.rotation.set(0, 0, 0); stillPose(body);
    if (ghost) { ghost.visible = true; ghost.userData.active = false; ghost.userData.stopMotion = 0; ghost.userData.head.rotation.set(0.2, 0, -0.15); if (ghost.userData.ghost) { ghost.userData.ghost.part = 0; ghost.userData.ghost.jaw = 0; } ghost.position.set(-0.15, 0, -35.2); ghost.rotation.set(0, 0, 0); if (ghost.userData.rig) ghost.userData.rig.mixer.timeScale = 1; }
    endText('She was never chasing you.', 'story');
  });
  if (G.trueStep >= 1) { // framed clear of Room 0; v3.2: closer on the two of them, then on him going home (MAA) / on the 0217 coming in
    const cz = -27.6 - Math.min(1.4, (t - 27.2) * 0.1);
    if (K === 'maa' && t > 36) { const k = ease((t - 36) / 3), k2 = ease((t - 46.5) / 2.5); camera.position.set(-1.0 - 0.9 * k + 0.9 * k2, 1.62 - 0.08 * k, cz - 2.2 * k + 1.0 * k2); camera.lookAt(-0.3 - 0.4 * k - 0.3 * k2, 1.3 + 0.05 * k, -34.4 + 0.3 * k - 8 * k2); }
    else if (K === '0217' && t > 38) { const k = ease((t - 38) / 4); camera.position.set(-1.0 - 0.6 * k, 1.62 + 0.1 * k, cz + 1.0 * k); camera.lookAt(-0.3 + 2.9 * k, 1.3 + 0.3 * k, -34.4 - 3 * k); }
    else { camera.position.set(-1.0, 1.62, cz); camera.lookAt(-0.3, 1.3, -34.4); } }
  st(1, 31.0, () => { endText('Every night since 2016, Maa came to Platform 0 to bring you home.', 'story'); sound.whisper(1.0, -0.2, 0.18); });
  st(2, 35.2, () => { endText('This time, Arjun turned around.', 'story big'); body.rotation.y = Math.PI; });
  if (K === '0217') {
    if (G.trueStep >= 4 && C1.train) { const k = Math.min(1, (t - 39.0) / 4.2); C1.train.visible = true; C1.train.position.z = -150 + (1 - Math.pow(1 - k, 2.2)) * 112; } // the 0217 pulls in
    if (G.trueStep >= 3) { body.rotation.y = Math.PI; if (ghost && t > 36.4) { body.position.z -= dt * 0.9; ghost.position.z -= dt * 0.9; ghost.rotation.y = Math.PI; animateWalk(body, dt, 0.9); if (ghost.userData.real) animateWalk(ghost, dt, 0.9); } }
    st(3, 39.0, () => { endText('You gave back everything the station had kept of hers.', 'story'); if (C1.train && C1.train.userData.setKind) { C1.train.userData.setKind('0217'); C1.train.position.z = -150; } sound.train && sound.train(6, true, 0.6); });
    st(4, 42.6, () => { endText('At 2:17 the train in no timetable came for the last name in the logbook. He didn\'t go alone.', 'story'); C1.setBoard(['0217  PLATFORM 0 LOCAL', 'DEPARTED 02:17 · 2 PASSENGERS'], '#f2c613'); });
    st(5, 47.6, () => { endText('', ''); fade(1, 1600, null, '#fff'); sound.birds(); });
    st(6, 49.6, () => { toEpilogue(); });
  } else { // MAA
    if (G.trueStep >= 3 && G.trueStep < 6 && ghost && t > 36.2) { const gap = body.position.z - ghost.position.z; if (gap > 0.85) { body.position.z -= dt * 0.8; animateWalk(body, dt, 0.8); } else { stillPose(body); const r = Math.min(1, (t - 38.6) / 1.2); if (r > 0) { body.userData.armR.rotation.x = -0.95 * r; if (ghost.userData.armL) ghost.userData.armL.rotation.x = -0.8 * r; } } ghost.rotation.y = 0; ghost.userData.head.rotation.set(0.05, 0, -0.05); } // he takes her hand
    st(3, 39.4, () => { endText('He took her hand. It was cold from two years of rain. She was smiling.', 'story'); sound.whisper(1.2, 0, 0.15); });
    st(4, 43.4, () => { endText('“Jaa, beta. Ghar jaa. Main yahin hoon.”', 'story big'); showSub('(Go, son. Go home. I\'m right here.)', 3400, false); C1.exitGlow.visible = true; C1.exitLamp.power = 30; });
    if (G.trueStep >= 6 && ghost) { body.userData.armR.rotation.x = 0; if (ghost.userData.armL) ghost.userData.armL.rotation.x *= 0.95; body.rotation.y = Math.PI; body.position.z -= dt * 1.0; animateWalk(body, dt, 1.0); const a = Math.atan2(body.position.x - ghost.position.x, body.position.z - ghost.position.z); ghost.rotation.y += (a - ghost.rotation.y) * Math.min(1, dt * 2); }
    st(5, 47.0, () => { endText('He went home. She stayed.', 'story'); });
    st(6, 47.2, () => {});
    st(7, 51.0, () => { endText('', ''); fade(1, 1600, null, '#fff'); sound.birds(); });
    st(8, 53.0, () => { toEpilogue(); });
  }
}

// ---------- title attract camera ----------
// slow dolly up and down the platform centre (smooth ping-pong, no jump cut), clear of the chai stall so its sign never fills the frame
function updateTitleCam(t) { const k = 0.5 - 0.5 * Math.cos(t * 0.045); const z = -4 - k * 24; camera.position.set(0.45 + Math.sin(t * 0.13) * 0.2, 1.68, z); camera.rotation.set(-0.07, 0.34 + Math.sin(t * 0.11) * 0.1, 0, 'YXZ'); }

// ---------- main loop ----------
let last = performance.now(), fpsAcc = 0, fpsN = 0; G.fps = 0; G.fpsLog = [];
function simStep(dt, now) {
  if (G.state === 'playing' || G.state === 'card') {
    let mx = 0, mz = 0;
    if (G.state === 'playing') { if (keys.KeyW || keys.ArrowUp) mz += 1; if (keys.KeyS || keys.ArrowDown) mz -= 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1; if (joy.id !== null) { mx += joy.x; mz -= joy.y; } }
    const mag = Math.hypot(mx, mz); if (mag > 1) { mx /= mag; mz /= mag; }
    const run = keys.ShiftLeft || keys.ShiftRight || (joy.id !== null && Math.hypot(joy.x, joy.y) > 0.92);
    // v3.3.1: third person with the torch up, going straight back is a careful back-step (slower), not a moonwalk at full speed
    const backStep = TP.active && FX.torch.on && FX.torch.has && mz < -0.15 && Math.abs(mx) < -mz * 10; // the same >95 deg-off-the-view cone tp.js plays as a back-step
    const sp = (run && !backStep ? 4.3 : 2.7) * Math.min(1, mag) * (CH.speedMul || 1) * (backStep ? 0.55 : 1);
    const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
    const dx = (mx * cy - mz * sy) * sp * dt, dz = (-mx * sy - mz * cy) * sp * dt;
    if (!G.transitioning && !G.hiding) { const [nx, nz] = resolve(player.x + dx, player.z + dz); const moved = Math.hypot(nx - player.x, nz - player.z); player.x = nx; player.z = nz; player.speed = moved / Math.max(dt, 1e-4);
      player.stepAcc += moved; if (player.stepAcc > (run ? 0.95 : 0.75)) { player.stepAcc = 0; sound.step(run ? 1 : 0.8, 0, CH.surface); }
      player.bob += moved * 5.0; }
    const fy = CH.floorY(player.x, player.z); player.y += (fy - player.y) * Math.min(1, dt * 12);
    if (CH.visitedAt(player)) G.visited = true;
    if (G.hiding) player.speed = 0;
    if (!G.hiding && CH.isBack(player) && !G.visited && !G.toldVisit) { G.toldVisit = true; hint(CH.visitHint || 'Walk in first', 2500); }
    if (!G.transitioning && !G.hiding && G.state === 'playing') { if (CH.isBack(player) && G.visited) decide('back'); else if (CH.isForward(player)) decide('forward'); }
    CH.update(dt, player, G);
    if (G.state === 'playing') { checkTickets(dt); FX.update(dt); STORY.update(dt, CH, G, player); HP.update(dt, FX.loopF ? (FX.loopF.prox || 0) : 0); }
    G.shakeAmt *= Math.pow(0.02, dt);
    const sh = G.shakeAmt, T = now / 1000;
    const sway = CH.camSway ? CH.camSway(T) : { roll: 0, x: 0, y: 0 };
    const breathe = Math.sin(T * 1.35) * 0.006, idle = (1 - Math.min(1, player.speed / 2));
    if (!TP.update(dt, CH, { shake: sh, sway })) { // v3.2: third person owns the camera when it is on
    camera.position.set(player.x + sway.x + (Math.random() - 0.5) * sh * 0.1, player.y + (G.hiding ? G.hiding.spot.camY : 1.6) + Math.sin(player.bob) * 0.035 + breathe * idle + sway.y + (Math.random() - 0.5) * sh * 0.1, player.z);
    camera.rotation.set(player.pitch + Math.sin(T * 0.6) * 0.004 * idle + (Math.random() - 0.5) * sh * 0.05, player.yaw + Math.sin(T * 0.37) * 0.004 * idle, Math.sin(player.bob * 0.5) * 0.006 + sway.roll, 'YXZ'); }
    if (FX.def && FX.def.camKick && G.state === 'playing') FX.def.camKick(camera, TP.active); // v3.3.2 the swing's camera dip / roll
    if (TP.active && TP.h && TP_STATES.has(G.state)) camera.rotation.x = Math.max(-1.0, Math.min(0.9, camera.rotation.x)); // v3.6: the dip never tips the third-person view at the floor
    if (G.camOverride) { const o = G.camOverride; camera.position.set(o.pos[0], o.pos[1], o.pos[2]); camera.lookAt(o.look[0], o.look[1], o.look[2]); } // v3.0.2: test close-up camera (__p0.cam)
  } else if (G.state === 'story') {
    CH.update(dt, { x: camera.position.x, z: camera.position.z, y: 0 }, G); STORY.tick(dt);
  } else if (G.state === 'ending') {
    CH.update(dt, { x: camera.position.x, z: camera.position.z, y: 0 }, G);
    updateEnding(dt);
  } else if (G.state === 'title' || G.state === 'end') {
    updateTitleCam(now / 1000); CH.update(dt, { x: 99, z: 99, y: 0 }, G);
  }
}
function frame(now) {
  requestAnimationFrame(frame);
  const real = Math.max(0, (now - last) / 1000); last = now;
  fpsAcc += real; fpsN++; if (fpsAcc > 1) { G.fps = Math.round(fpsN / fpsAcc); G.fpsLog.push(G.fps); if (G.fpsLog.length > 120) G.fpsLog.shift(); fpsAcc = 0; fpsN = 0; if (DEBUG) $('fps').textContent = G.fps + ' fps · ' + engine.Q.name; }
  if (!CH) return;
  // fixed-cap sub-steps: a slow frame advances the game by the real time that passed (in steps of <= 50 ms) instead of slowing the clock;
  // gaps over 250 ms (a hitch, tab in background) are dropped rather than replayed; the ending cutscene is timed against real-time audio, so it keeps up to 1 s
  const dt = Math.min(G.state === 'ending' ? 1 : 0.25, real), n = Math.max(1, Math.ceil(dt / 0.05 - 1e-6)), sdt = dt / n;
  for (let i = 0; i < n; i++) simStep(sdt, now - (n - 1 - i) * sdt * 1000);
  if (face.visible && performance.now() > face.userData.until) face.visible = false;
  if (TP.h && !(TP.active && TP_STATES.has(G.state))) { TP.h.visible = false; TP.torch.visible = false; TP.unmount(); TP.px = null; TP._camSet = false; }
  camera.updateMatrixWorld();
  const yawFwd = camera.rotation.y;
  engine.updateLights(camera.position.x, camera.position.z, yawFwd);
  G.flashAmt *= Math.pow(0.01, dt); G.damage *= Math.pow(0.05, dt);
  if (engine.grade) { const u = engine.grade.uniforms; u.flash.value = G.flashAmt; u.damage.value = G.damage; u.scareCA.value = G.damage * 0.02 + G.shakeAmt * 0.004; }
  updateHumans(dt); tickWeather(G.state === 'paused' ? 0 : dt);
  if (BATCH && engine.qKey === 'low' && CH && G.state !== 'loading') { if (!CH.batcher) { CH.batcher = new Batcher(CH.root, engine.renderer); CH.batcher.build(); } CH.batcher.check(); }
  engine.render(dt);
  if (!engine.Q.post) grain();
  if (G.state === 'playing' || G.state === 'title') perfGovernor(real);
}
// v3.1.1 performance governor. Auto quality: if the fps stays under ~28 for 2 s, step the quality down a tier (Ultra -> High -> Medium -> Low),
// at most once every 4 s. Low (phones): dynamic resolution, the render scale drops by 0.1 (to 0.55) when fps < 28 for 2 s and creeps back up
// by 0.05 when it has been over 48 for 5 s. Not on the software renderer the test harness uses unless ?dynres=1.
const BATCH = Q.get('batch') !== '0'; // v3.1.1 static batching on Low (batch.js)
const DYN = Q.get('dynres') === '1' || (!navigator.webdriver && Q.get('dynres') !== '0');
const perf = { acc: 0, n: 0, low: 0, high: 0, cool: 0 };
if (DYN && engine.qKey === 'low' && isPhone) { engine.dyn = 0.85; engine.resize(); }
function perfGovernor(real) {
  if (real > 0.5) return; // a hitch / tab switch is not the steady fps
  perf.acc += real; perf.n++; perf.cool -= real;
  if (perf.acc < 1) return;
  const fps = perf.n / perf.acc; perf.acc = 0; perf.n = 0;
  perf.low = fps < 28 ? perf.low + 1 : 0; perf.high = fps > 48 ? perf.high + 1 : 0;
  if (!DYN || perf.cool > 0) return;
  if (perf.low >= 2 && settings.quality === 'auto' && engine.qKey !== 'low') {
    engine.setQuality(engine.qKey === 'ultra' ? 'high' : engine.qKey === 'high' ? 'medium' : 'low'); qLabel(); perf.low = 0; perf.cool = 4;
    if (G.state === 'playing') hint('Graphics set to ' + engine.Q.name + ' for smoother play (change in Settings)', 3500);
  } else if (perf.low >= 2 && engine.qKey === 'low' && (engine.dyn || 1) > 0.56) { engine.dyn = Math.max(0.55, (engine.dyn || 1) - 0.1); engine.resize(); perf.low = 0; perf.cool = 2; }
  else if (perf.high >= 5 && engine.qKey === 'low' && (engine.dyn || 1) < 1) { engine.dyn = Math.min(1, (engine.dyn || 1) + 0.05); engine.resize(); perf.high = 0; perf.cool = 3; }
}
const gc = $('grain'), gctx = gc.getContext('2d'); const gimg = gctx.createImageData(gc.width, gc.height); let gflip = 0;
let grainT = 0;
// v3.1.1: grain ~9 updates a second (was every other frame)
function grain() { const t = performance.now(); if (t - grainT < 110) return; grainT = t; const d = gimg.data; for (let i = 0; i < d.length; i += 4) { const v = (Math.random() * 255) | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } gctx.putImageData(gimg, 0, 0); }

// ---------- boot ----------
// v3.1.1: only what Chapter 1 needs loads before the title (with a real progress bar); Chapters 2 and 3 download in the
// background and are built + compiled behind the fade / chapter card when you get there (or on the loading card if you jump there first).
const BM = window.__p0marks = []; const bm = (k) => BM.push([k, Math.round(performance.now())]);
const nap = (ms = 16) => new Promise(r => setTimeout(r, ms));
const idle = () => new Promise(r => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 400 }) : setTimeout(r, 30)));
setModelTier(engine.Q.tex); setPropTier(engine.Q.tex);
HUM.cam = camera; HUM.lod = engine.Q.tex === 'l' && Q.get('lod') !== '0'; // v3.1.1: animation LOD on Low
const CH_ASSETS = MANIFEST[engine.Q.tex === 'l' ? 'l' : 'x'];
const chapterFiles = (i) => { const A = CH_ASSETS[i]; return [...M.texFiles(A.tex), ...A.av.map(avatarFile), ...A.props.map(propFile)]; };
const chAssetsP = [], chReady = [], chOK = [];
function chapterAssets(i, slow) { // parse what chapter i needs (slow = one file per idle slot, used in the background)
  if (!chAssetsP[i]) chAssetsP[i] = (async () => {
    const A = CH_ASSETS[i];
    if (!slow) return Promise.all([M.preloadTextures(A.tex), loadAvatars(A.av), loadProps(A.props)]);
    const tx = M.preloadTextures(A.tex);
    for (const n of A.av) { await idle(); await loadAvatars([n]); }
    for (const n of A.props) { await idle(); await loadProps([n]); }
    await tx;
  })();
  return chAssetsP[i];
}
function chapterBuilt(i) { return !!chapters[i]; }
async function ensureChapter(i) { // assets -> build -> compile shaders (no hitch the first time something appears)
  await chapterAssets(i);
  if (!chapters[i]) { await nap(30); getChapter(i); }
  if (!chReady[i]) chReady[i] = engine.precompile([chapters[i].root], { render: false });
  await chReady[i]; chOK[i] = true;
}
let loadShown = 0;
function setLoad(frac, msg) {
  frac = Math.max(loadShown, Math.min(1, frac)); loadShown = frac;
  const b = $('loadbar'); if (b) b.style.transform = `scaleX(${frac.toFixed(3)})`;
  const p = $('loadpct'); if (p) p.textContent = Math.round(frac * 100) + '%';
  if (msg) $('loadmsg').textContent = msg;
}
async function boot() {
  bm('boot');
  const A0 = CH_ASSETS[0];
  expect(['models/anims.glb', ...chapterFiles(0)]);
  LOAD.onChange = () => { if (G.state === 'loading') setLoad(0.04 + 0.78 * (LOAD.want ? LOAD.got / LOAD.want : 0)); };
  setLoad(0.03, 'Loading the station…');
  engine.onHDRI = () => { if (CH) engine.useSky(!!CH.sky, CH.skyI); };
  await Promise.all([M.loadFonts(), loadHumans(A0.av), M.preloadTextures(A0.tex), loadProps(A0.props), engine.Q.hdri ? Promise.race([engine.loadHDRI(), nap(4000)]) : null]);
  chAssetsP[0] = Promise.resolve(); LOAD.onChange = null;
  bm('loaded'); setLoad(0.84, 'Building the station…');
  // start downloading the other chapters now (the network is free while the CPU builds this one)
  const rest = [1, 2].flatMap(chapterFiles); for (const p of rest) fetchAsset(p).catch(() => {});
  await nap(30);
  enterChapter(0); CH.resetLoop(0, rng); CH.applyAnomaly(null); bm('ch1');
  setLoad(0.92, 'Warming up the lights…'); await nap(20);
  let tk = null;
  try {
    tk = makeTicketMesh(); scene.add(tk); tk.position.set(0, -50, 0);
    updateTitleCam(0); camera.updateMatrixWorld(); engine.render(0); // compiles what the title camera sees; the rest compiles in the background
    if (reflector) { reflector.visible = true; engine.render(0); } // the mirror floor's shader variants (High)
    CH.resetLoop(0, rng); CH.applyAnomaly(null);
  } catch (e) { console.warn('warmup', e && e.message); }
  chReady[0] = engine.precompile([CH.root, tk].filter(Boolean), { render: false }).then(() => { if (tk) scene.remove(tk); }); chOK[0] = true;
  TP.setOn(settings.tp); if (TP.h) engine.precompile([TP.h, TP.torch], { render: false }); // v3.2
  bm('probes'); setLoad(1);
  G.state = 'title'; show('title'); refreshTitle(); qLabel(); fade(0, 800); $('loading').classList.add('off');
  requestAnimationFrame(frame);
  background();
  if (Q.has('autostart')) startGame(+(Q.get('ch') || 1) - 1, true);
}
async function background() {
  try { await nap(600); await chapterAssets(1, true); await chapterAssets(2, true); } catch (e) { console.warn('background load', e && e.message); }
  G.bgDone = true; bm('bg');
  // on the title screen with nothing else to do: build the next chapters now (each is one short pause the title camera hides)
  if (Q.has('nobuild')) return;
  for (const i of [1, 2]) { while (G.state !== 'title' && G.state !== 'end') await nap(1500); if (!chapters[i]) { await idle(); await ensureChapter(i); } }
  G.allBuilt = true; bm('built');
}
// a chapter that isn't ready yet: show the loading card until it is (only when you jump ahead from the menu, or on a very slow line)
async function whenChapter(i, then) {
  if (chOK[i]) return then();
  const el = $('chload'); el.classList.add('on'); G.transitioning = true;
  LOAD.onChange = () => { const t = LOAD.want ? LOAD.got / LOAD.want : 1; $('chloadbar').style.transform = `scaleX(${(0.1 + 0.85 * t).toFixed(3)})`; };
  const ses = G.session;
  try { await ensureChapter(i); } finally { LOAD.onChange = null; el.classList.remove('on'); }
  if (G.session === ses) then(); else G.loadingCh = false; // quit while it was loading
}
boot();

// ---------- test hooks ----------
window.__p0 = {
  get bgDone() { return !!G.bgDone; }, batchStats: () => CH && CH.batcher ? Object.assign({}, CH.batcher.stats) : null, get dyn() { return engine.dyn || 1; }, get allBuilt() { return !!G.allBuilt; }, marks: () => BM, load: () => ({ want: LOAD.want, got: LOAD.got, log: LOAD.log.slice() }), used: () => ({ av: [...HUM.used], props: [...PROPS.used], tex: [...M.TEXUSED] }),
  get state() { return { state: G.state, ch: CH && CH.id, progress: G.progress, anomaly: G.anomaly && G.anomaly.id, mistakes: G.mistakes, loops: G.loops, fps: G.fps, quality: engine.qKey, gpu: gpuName(engine.renderer), tickets: save.tickets.length, x: player.x, z: player.z, calls: engine.renderer.info.render.calls, tris: engine.renderer.info.render.triangles }; },
  anomalies: (ch) => getChapter((ch || 1) - 1).anomalies.map(a => a.id),
  force: (id) => { G.forceNext = id; },
  tp: (x, z, yaw = player.yaw, pitch = 0) => { player.x = x; player.z = z; player.yaw = yaw; player.pitch = pitch; },
  decide, startGame, setProgress: (n) => { G.progress = n; startLoop(); },
  goChapter: (i, p = 0) => { chOK[i] = true; G.session++; HP.cancel(); HP.reset(); clearTimeout(fadeTimer); fade(0, 0); G.transitioning = false; G.chaseDone = false; $('chcard').classList.remove('on'); enterChapter(i); G.progress = p; startLoop(); G.state = 'playing'; show('hud'); },
  resolve: (x, z) => resolve(x, z), toTitle, runElapsed: () => runElapsed(), tickets: () => TICKETS,
  quality: (k) => engine.setQuality(k), save: () => save, G, engine, player, closeNote, pause, resume,
  drawStats: () => { const r = engine.renderer; r.info.autoReset = false; r.info.reset(); r.render(scene, camera); const o = { calls: r.info.render.calls, tris: r.info.render.triangles, lights: engine.pool.points.length + engine.pool.spots.length }; r.info.autoReset = true; return o; },
  ch: () => CH,
  // v3.0.1 tests: run the game logic synchronously (no rendering) for `sec` seconds in fixed steps; onStep(t) is called after every step
  sim: (sec, dt = 1 / 30, onStep) => { HUM.lodOff = true; try { const n = Math.round(sec / dt); for (let i = 0; i < n; i++) { const now = performance.now(); simStep(dt, now); updateHumans(dt); camera.updateMatrixWorld(); if (onStep && onStep(i * dt) === false) break; } } finally { HUM.lodOff = false; } },
  fx: FX, pages: () => PAGES, hp: HP, settings,
  ending: (trueEnd, at) => { if (trueEnd) { save.pages = PAGES.map(p => p.id); FX.A.save = save; FX.mystery.forceComplete(); } G.state = 'playing'; playEnding(); if (at) G.endT = at; },
  feature: (force) => { FX.force = force || {}; if (force && force.calm) G.first = true; startLoop(); return FX.loopF; },
  key: (code) => { FX.key(code); },
  cam: (pos, look) => { G.camOverride = pos ? { pos, look } : null; },
  hideHud: (on) => { document.body.classList.toggle('nohud', on); },
  finish: () => finishChapter(), endingKind: (kind) => { save.pages = kind === 'normal' ? [] : PAGES.map(p => p.id); if (kind === '0217') FX.mystery.forceComplete(); else { save.lost = []; save.roomOpen = false; } G.state = 'playing'; G.transitioning = false; playEnding(); },
  view: (on) => { if (on !== undefined) setTP(on, true); return TP; }, story: STORY, endKind: () => G.endKind, skipEnding: () => skipEnding(), GOALS,
  arch: ARCH, archToast: () => archToast(), openArchive: (f) => openArchive(f || 'title'), chalk: () => FX.chalk.info(), figure: () => FX.figure, bed: () => sound.bedLevel && sound.bedLevel(),
  fpsAvg: () => G.fpsLog.length ? Math.round(G.fpsLog.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, G.fpsLog.length)) : 0,
};
