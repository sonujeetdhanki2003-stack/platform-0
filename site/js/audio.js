import { assetURL } from './assets.js';
// Procedural WebAudio for PLATFORM 0 (no audio files)
export const VOICE_CLIPS = ["w_turn", "w_turn_hi", "w_turn_phone", "w_turn_hi_phone", "w_arjun_turn", "w_arjun_hi", "w_arjun_turn_phone", "w_arjun_hi_phone", "w_ph_back1", "w_ph_back2", "w_ph_back3", "w_ph_fwd1", "w_ph_fwd2", "w_ph_fwd3", "w_ph_lost", "w_ph_digits", "w_ph_room", "w_ph_0217", "w_dont_turn", "w_dont_look", "w_know", "w_tikat", "w_tikat2"];
const AMBI = ['w_turn', 'w_turn_hi', 'w_arjun_turn', 'w_arjun_hi', 'w_dont_turn', 'w_know', 'w_ph_lost'];
export class Sound {
  constructor() { this.ctx = null; this.vol = 0.8; this.started = false; this.voices = {}; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(ctx.destination);
    this.comp = ctx.createDynamicsCompressor(); this.comp.threshold.value = -10; this.comp.connect(this.master);
    this.out = ctx.createGain(); this.out.connect(this.comp);
    // reverb-ish: feedback delay network
    this.rev = ctx.createGain(); this.rev.gain.value = 0.35;
    const d1 = ctx.createDelay(1), d2 = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
    d1.delayTime.value = 0.13; d2.delayTime.value = 0.21; fb.gain.value = 0.55; lp.type = 'lowpass'; lp.frequency.value = 1800;
    this.rev.connect(d1); d1.connect(d2); d2.connect(lp); lp.connect(fb); fb.connect(d1); lp.connect(this.out);
    // noise buffer
    const len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), ch = b.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; ch[i] = w; }
    this.noiseBuf = b;
    const bb = ctx.createBuffer(1, len, ctx.sampleRate), cb = bb.getChannelData(0); last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; cb[i] = last * 3.5; }
    this.brownBuf = bb;
    this.startAmbience();
    this.loadClips(['pa_normal', 'pa_creepy', 'pa_end', 'whisper', 'pa_arjun']); // v3.5: pa_arjun = the normal line with his name in it (anomaly 'pa_name')
    this.loadClips(VOICE_CLIPS); // v3.3: real whispered voice lines (Maa, the TC)
  }
  loadClips(names) {
    this.clips = this.clips || {};
    for (const n of names) {
      fetch(assetURL('audio/' + n + '.mp3')).then(r => r.ok ? r.arrayBuffer() : null).then(b => b && new Promise((res, rej) => this.ctx.decodeAudioData(b, res, rej))).then(buf => { if (buf) this.clips[n] = buf; }).catch(() => {});
    }
  }
  hasClip(n) { return !!(this.clips && this.clips[n]); }
  playClip(n, o = {}) {
    if (!this.ctx || !this.hasClip(n)) return 0; const ctx = this.ctx, t = this.now();
    const s = ctx.createBufferSource(); s.buffer = o.reverse ? this.revClip(n) : this.clips[n]; s.playbackRate.value = o.rate || 1;
    let node = s;
    if (o.radio) { // PA horn speaker
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 420; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400;
      const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 1800; pk.gain.value = 6;
      const sh = ctx.createWaveShaper(); const c = new Float32Array(512); for (let i = 0; i < 512; i++) { const x = i / 256 - 1; c[i] = Math.tanh(x * (o.creepy ? 4 : 2)); } sh.curve = c;
      node.connect(hp); hp.connect(pk); pk.connect(lp); lp.connect(sh); node = sh;
    }
    const g = ctx.createGain(); g.gain.value = o.gain || 0.8; node.connect(g);
    if (this.duckBed) this.duckBed((o.dur || s.buffer.duration / (o.rate || 1)) + 0.6); // v3.7: the platform bed stays under the PA and the voices
    const p = this.pan(o.pan || 0); g.connect(p); p.connect(this.out);
    const rs = ctx.createGain(); rs.gain.value = o.radio ? 1.4 : 0.5; g.connect(rs); rs.connect(this.rev);
    if (o.dur) { const e = t + o.dur; g.gain.setValueAtTime(g.gain.value, Math.max(t, e - 0.25)); g.gain.linearRampToValueAtTime(0.0001, e); s.start(t); s.stop(e + 0.05); return o.dur; }
    s.start(t);
    return s.buffer.duration / (o.rate || 1);
  }
  revClip(n) { this.rev_ = this.rev_ || {}; if (this.rev_[n]) return this.rev_[n]; const b = this.clips[n], r = this.ctx.createBuffer(b.numberOfChannels, b.length, b.sampleRate);
    for (let c = 0; c < b.numberOfChannels; c++) { const a = b.getChannelData(c), d = r.getChannelData(c); for (let i = 0, L = a.length; i < L; i++) d[i] = a[L - 1 - i]; } return (this.rev_[n] = r); }
  // v3.3: a spoken line in Maa's whisper (or the TC's); false if the clip isn't loaded yet (callers fall back to the synth)
  voice(n, o = {}) { if (!this.hasClip(n)) return false; return this.playClip(n, Object.assign({ gain: 0.95 }, o)) > 0; }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }
  now() { return this.ctx ? this.ctx.currentTime : 0; }
  noise(brown) { const s = this.ctx.createBufferSource(); s.buffer = brown ? this.brownBuf : this.noiseBuf; s.loop = true; return s; }
  pan(x) { const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : this.ctx.createGain(); if (p.pan) p.pan.value = Math.max(-1, Math.min(1, x)); return p; }
  startAmbience() {
    const ctx = this.ctx;
    // electrical hum
    const hum = ctx.createGain(); hum.gain.value = 0.035; hum.connect(this.out);
    for (const [f, a] of [[50, 1], [100, 0.5], [150, 0.25], [250, 0.08]]) { const o = ctx.createOscillator(); o.frequency.value = f; const g = ctx.createGain(); g.gain.value = a; o.connect(g); g.connect(hum); o.start(); }
    this.humGain = hum;
    // room tone / wind
    const n = this.noise(true), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const g = ctx.createGain(); g.gain.value = 0.18; n.connect(f); f.connect(g); g.connect(this.out); n.start();
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 0.08; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    this.windGain = g;
    // fans whoosh
    const fn = this.noise(false), ff = ctx.createBiquadFilter(); ff.type = 'bandpass'; ff.frequency.value = 900; ff.Q.value = 0.7;
    const fg = ctx.createGain(); fg.gain.value = 0.0; fn.connect(ff); ff.connect(fg); fg.connect(this.out); fn.start();
    const fl = ctx.createOscillator(), flg = ctx.createGain(); fl.frequency.value = 3.2; flg.gain.value = 0.006; fl.connect(flg); flg.connect(fg.gain); fl.start();
    this.fanGain = fg;
    // tube-light buzz
    const bo = ctx.createOscillator(); bo.type = 'sawtooth'; bo.frequency.value = 100; const bf = ctx.createBiquadFilter(); bf.type = 'highpass'; bf.frequency.value = 2500;
    const bg = ctx.createGain(); bg.gain.value = 0.006; bo.connect(bf); bf.connect(bg); bg.connect(this.out); bo.start(); this.buzzGain = bg;
  }
  // v3.4: each Chapter 1 platform's quiet sound accent (pfvariety.js schedules one every few seconds). Low and distant on purpose:
  // never a footstep, a whisper or static (those are the stranger's / Maa's cues), never a fan (the fans stopping is an anomaly).
  pfAccent(kind, pan = 0) {
    if (!this.ctx) return; const ctx = this.ctx, t = this.now(), out = ctx.createGain(), p = this.pan(pan); out.gain.value = 1; out.connect(p); p.connect(this.out);
    const rs = ctx.createGain(); rs.gain.value = 0.6; out.connect(rs); rs.connect(this.rev);
    const osc = (type, f0, f1, t0, dur, peak, a = 0.005) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur); const g = ctx.createGain(); this.env(g, t0, a, peak, dur); o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + a + dur + 0.05); return o; };
    const nz = (brown, type, f, q, t0, dur, peak, a = 0.01) => { const s = ctx.createBufferSource(); s.buffer = brown ? this.brownBuf : this.noiseBuf; const bf = ctx.createBiquadFilter(); bf.type = type; bf.frequency.value = f; bf.Q.value = q; const g = ctx.createGain(); this.env(g, t0, a, peak, dur); s.connect(bf); bf.connect(g); g.connect(out); s.start(t0, Math.random(), a + dur + 0.1); return bf; };
    const r = Math.random;
    if (kind === 'drip') { const f = 1400 + r() * 900; osc('sine', f, f * 0.55, t, 0.09, 0.05, 0.002); if (r() < 0.4) osc('sine', f * 1.3, f * 0.7, t + 0.35 + r() * 0.3, 0.07, 0.03, 0.002); }
    else if (kind === 'dog') { const n = 1 + (r() * 2 | 0); for (let i = 0; i < n; i++) { const t0 = t + i * 1.9, o = osc('sawtooth', 420 + r() * 60, 300, t0, 1.5, 0.018, 0.25); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; o.disconnect(); const g = ctx.createGain(); this.env(g, t0, 0.3, 0.02, 1.4); o.connect(lp); lp.connect(g); g.connect(out); } }
    else if (kind === 'wind') { const bf = nz(true, 'bandpass', 380, 3, t, 3.2, 0.14, 1.2); bf.frequency.setValueAtTime(260, t); bf.frequency.linearRampToValueAtTime(520, t + 1.8); bf.frequency.linearRampToValueAtTime(300, t + 4); for (let i = 0; i < 4; i++) nz(false, 'bandpass', 2600, 2, t + 1 + i * 0.13 + r() * 0.05, 0.04, 0.03, 0.002); }
    else if (kind === 'coo') { for (let i = 0; i < 3; i++) { const t0 = t + i * 0.42; osc('sine', 330, 260, t0, 0.3, 0.025, 0.05); } if (r() < 0.5) nz(false, 'bandpass', 900, 1, t + 1.6, 0.5, 0.03, 0.05); }
    else if (kind === 'clank') { const t0 = t; nz(false, 'bandpass', 700, 6, t0, 0.35, 0.05, 0.002); osc('triangle', 180, 170, t0, 0.6, 0.025, 0.002); if (r() < 0.6) { nz(false, 'bandpass', 760, 6, t0 + 0.28, 0.25, 0.03, 0.002); } }
    else if (kind === 'creak') { const o = osc('sawtooth', 95 + r() * 30, 70, t, 0.9, 0.012, 0.2); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 8; o.disconnect(); const g = ctx.createGain(); this.env(g, t, 0.2, 0.03, 0.8); o.connect(bp); bp.connect(g); g.connect(out); }
    else if (kind === 'crickets') { const f = 4300 + r() * 500; for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) osc('sine', f, f, t + k * 0.5 + i * 0.045, 0.025, 0.008, 0.003); }
    else if (kind === 'sputter') { for (let i = 0; i < 6; i++) { const t0 = t + i * 0.07 + r() * 0.05; const o = osc('sawtooth', 100, 100, t0, 0.05 + r() * 0.06, 0.012, 0.004); } nz(false, 'highpass', 5000, 0.7, t + 0.1, 0.05, 0.015, 0.002); }
    else if (kind === 'drone') { osc('sine', 55, 52, t, 3.5, 0.03, 1.5); osc('sine', 82.5, 80, t + 0.4, 3.0, 0.014, 1.3); nz(true, 'lowpass', 160, 1, t, 3.5, 0.08, 1.5); }
  }
  setFans(on) { if (this.fanGain) this.fanGain.gain.setTargetAtTime(on ? 0.022 : 0, this.now(), 0.3); }
  setHum(level) { if (this.humGain) this.humGain.gain.setTargetAtTime(0.035 * level, this.now(), 0.05); if (this.buzzGain) this.buzzGain.gain.setTargetAtTime(0.006 * level, this.now(), 0.05); }
  env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  step(intensity = 1, pan = 0) {
    if (!this.ctx) return; const ctx = this.ctx, t = this.now();
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500 + Math.random() * 250; f.Q.value = 1.4;
    const g = ctx.createGain(); this.env(g, t, 0.005, 0.22 * intensity, 0.09); const p = this.pan(pan);
    s.connect(f); f.connect(g); g.connect(p); p.connect(this.out); g.connect(this.rev);
    s.start(t, Math.random() * 1.5, 0.15);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.08); const og = ctx.createGain(); this.env(og, t, 0.003, 0.12 * intensity, 0.08); o.connect(og); og.connect(p); o.start(t); o.stop(t + 0.15);
  }
  chime() { // station PA jingle
    if (!this.ctx) return; const ctx = this.ctx, t = this.now();
    [[659, 0], [523, 0.38], [784, 0.76], [659, 1.14]].forEach(([fr, dt]) => {
      for (const m of [1, 2.01]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr * m; const g = ctx.createGain(); this.env(g, t + dt, 0.01, m === 1 ? 0.16 : 0.04, 1.2); o.connect(g); g.connect(this.out); g.connect(this.rev); o.start(t + dt); o.stop(t + dt + 1.4); }
    });
    return 1.9;
  }
  // garbled PA voice: formant-filtered buzz with syllable rhythm (subtitles carry meaning)
  paVoice(dur = 3.5, creepy = false) {
    if (!this.ctx) return; const ctx = this.ctx, t = this.now();
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = creepy ? 72 : 120;
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5; vg.gain.value = creepy ? 6 : 3; vib.connect(vg); vg.connect(o.frequency); vib.start(t); vib.stop(t + dur + 0.2);
    const amp = ctx.createGain(); amp.gain.value = 0;
    const bp1 = ctx.createBiquadFilter(); bp1.type = 'bandpass'; bp1.Q.value = 6; const bp2 = ctx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.Q.value = 8;
    const tel = ctx.createBiquadFilter(); tel.type = 'highpass'; tel.frequency.value = 350; const tel2 = ctx.createBiquadFilter(); tel2.type = 'lowpass'; tel2.frequency.value = 3200;
    const sh = ctx.createWaveShaper(); const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 3); } sh.curve = curve;
    o.connect(bp1); o.connect(bp2); bp1.connect(amp); bp2.connect(amp); amp.connect(sh); sh.connect(tel); tel.connect(tel2);
    const g = ctx.createGain(); g.gain.value = 0.32; tel2.connect(g); g.connect(this.out); g.connect(this.rev);
    const F1 = [300, 700, 500, 400, 650, 350], F2 = [2300, 1200, 1700, 900, 1900, 2600];
    let tt = t; while (tt < t + dur) {
      const sy = 0.12 + Math.random() * 0.14, k = Math.random() * 6 | 0;
      bp1.frequency.setTargetAtTime(F1[k] * (creepy ? 0.8 : 1), tt, 0.02); bp2.frequency.setTargetAtTime(F2[k] * (creepy ? 0.8 : 1), tt, 0.02);
      amp.gain.setTargetAtTime(Math.random() < 0.12 ? 0 : 0.9, tt, 0.015); amp.gain.setTargetAtTime(0.05, tt + sy * 0.7, 0.02);
      if (!creepy) o.frequency.setTargetAtTime(110 + Math.random() * 30, tt, 0.05);
      tt += sy;
    }
    amp.gain.setTargetAtTime(0, t + dur, 0.03);
    o.start(t); o.stop(t + dur + 0.3);
  }
  train(dur = 9, approach = true, loud = 1) { // rumble that swells and fades
    if (!this.ctx) return; const ctx = this.ctx, t = this.now();
    const n = this.noise(true), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9 * loud, t + dur * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(this.out); n.start(t); n.stop(t + dur + 0.1);
    // clackety
    for (let k = 0; k < dur * 4; k++) { const tk = t + k * 0.25 + (k % 2) * 0.07; const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 1400; const bg = ctx.createGain(); const env = Math.sin(Math.PI * k / (dur * 4)); this.env(bg, tk, 0.002, 0.0001 + 0.18 * loud * env * env, 0.06); s.connect(bf); bf.connect(bg); bg.connect(this.out); s.start(tk, Math.random(), 0.1); }
  }
  horn(dur = 1.6, loud = 0.3) {
    if (!this.ctx) return; const ctx = this.ctx, t = this.now();
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(loud, t + 0.08); g.gain.setValueAtTime(loud, t + dur - 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200; f.connect(g); g.connect(this.out); g.connect(this.rev);
    for (const fr of [311, 370, 466]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(t); o.stop(t + dur); }
  }
  sting(loud = 1) { // jump-scare stinger
    if (!this.ctx) return; const ctx = this.ctx, t = this.now();
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9 * loud, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    g.connect(this.out); g.connect(this.rev);
    for (const fr of [233, 247, 349, 370, 523, 554, 740]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(fr, t); o.frequency.exponentialRampToValueAtTime(fr * 0.94, t + 1.6); o.connect(g); o.start(t); o.stop(t + 1.9); }
    const n = ctx.createBufferSource(); n.buffer = this.noiseBuf; const ng = ctx.createGain(); this.env(ng, t, 0.005, 0.8 * loud, 0.5); n.connect(ng); ng.connect(this.out); n.start(t, 0, 0.7);
  }
  scream(pan = 0) {
    if (!this.ctx) return; const ctx = this.ctx, t = this.now();
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(700, t); o.frequency.linearRampToValueAtTime(1100, t + 0.3); o.frequency.linearRampToValueAtTime(500, t + 1.3);
    const v = ctx.createOscillator(), vg = ctx.createGain(); v.frequency.value = 23; vg.gain.value = 60; v.connect(vg); vg.connect(o.frequency); v.start(t); v.stop(t + 1.5);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 2;
    const g = ctx.createGain(); this.env(g, t, 0.02, 0.6, 1.3); const p = this.pan(pan); o.connect(bp); bp.connect(g); g.connect(p); p.connect(this.out); g.connect(this.rev); o.start(t); o.stop(t + 1.5);
    this.sting(0.6);
  }
  whisper(dur = 1.6, pan = 0, loud = 0.25) {
    if (dur >= 0.5 && this.ctx) { const have = AMBI.filter(n => this.hasClip(n)); if (have.length) { const n = have[(Math.random() * have.length) | 0]; // v3.3: a real whisper played backwards: a voice, but no words (so it never hints which way to go)
      this.playClip(n, { reverse: true, dur: Math.min(this.clips[n].duration, dur + 0.7), gain: Math.min(1.2, loud * 3), pan, rate: 0.9 + Math.random() * 0.15 }); return; } }
    if (!this.ctx) return; const ctx = this.ctx, t = this.now();
    const n = ctx.createBufferSource(); n.buffer = this.noiseBuf; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 4;
    const g = ctx.createGain(); g.gain.value = 0; const p = this.pan(pan);
    n.connect(bp); bp.connect(g); g.connect(p); p.connect(this.out); g.connect(this.rev);
    let tt = t; while (tt < t + dur) { const sy = 0.08 + Math.random() * 0.12; bp.frequency.setTargetAtTime(1500 + Math.random() * 3000, tt, 0.02); g.gain.setTargetAtTime(loud * (0.4 + Math.random() * 0.6), tt, 0.01); g.gain.setTargetAtTime(0.01, tt + sy * 0.6, 0.02); tt += sy; }
    g.gain.setTargetAtTime(0, t + dur, 0.05); n.start(t, Math.random(), dur + 0.3);
  }
  flare() { // v3.3 torch flare: a bright electric pop + a rising hiss
    if (!this.ctx) return; const ctx = this.ctx, t = this.now();
    const n = ctx.createBufferSource(); n.buffer = this.noiseBuf; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.setValueAtTime(900, t); bp.frequency.exponentialRampToValueAtTime(6500, t + 0.35);
    const g = ctx.createGain(); this.env(g, t, 0.01, 0.55, 0.6); n.connect(bp); bp.connect(g); g.connect(this.out); g.connect(this.rev); n.start(t, 0, 0.8);
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(2400, t); o.frequency.exponentialRampToValueAtTime(320, t + 0.12); const og = ctx.createGain(); this.env(og, t, 0.002, 0.18, 0.14); o.connect(og); og.connect(this.out); o.start(t); o.stop(t + 0.2);
  }
  thud() {
    if (!this.ctx) return; const ctx = this.ctx, t = this.now();
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.6); const g = ctx.createGain(); this.env(g, t, 0.005, 0.6, 0.8); o.connect(g); g.connect(this.out); g.connect(this.rev); o.start(t); o.stop(t + 1);
  }
  drone(on) { // tension drone used for some anomalies / ending
    if (!this.ctx) return; const ctx = this.ctx, t = this.now();
    if (on && !this.droneG) {
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 3); g.connect(this.out); g.connect(this.rev);
      const os = [55, 58.3, 82.4].map(fr => { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = fr; o.connect(g); o.start(); return o; });
      this.droneG = g; this.droneOs = os;
    } else if (!on && this.droneG) {
      const g = this.droneG, os = this.droneOs; g.gain.setTargetAtTime(0.0001, t, 0.5); setTimeout(() => os.forEach(o => o.stop()), 3000); this.droneG = null;
    }
  }
  birds() {
    if (!this.ctx) return; const ctx = this.ctx, t = this.now();
    for (let i = 0; i < 14; i++) { const tt = t + Math.random() * 6; const o = ctx.createOscillator(); const base = 2500 + Math.random() * 1800; o.frequency.setValueAtTime(base, tt); o.frequency.exponentialRampToValueAtTime(base * 1.4, tt + 0.07); o.frequency.exponentialRampToValueAtTime(base * 0.9, tt + 0.14); const g = ctx.createGain(); this.env(g, tt, 0.01, 0.05, 0.13); const p = this.pan(Math.random() * 2 - 1); o.connect(g); g.connect(p); p.connect(this.out); o.start(tt); o.stop(tt + 0.2); }
  }
  heartbeat(n = 6, rate = 1.1) { if (!this.ctx) return; this.hb = this.hb || []; for (let i = 0; i < n; i++) { this.hb.push(setTimeout(() => this.thud(), i * 1000 / rate)); this.hb.push(setTimeout(() => this.thud(), i * 1000 / rate + 220)); } }
  stopTransient() { (this.hb || []).forEach(clearTimeout); this.hb = []; this.drone(false); }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  wake() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
}

// ---- v2 additions: rain, moving-train loop, paper, brakes, phone ring, glass thud ----
Sound.prototype.setRain = function (level) {
  if (!this.ctx) return; const ctx = this.ctx;
  if (!this.rainGain) { const n = this.noise(false), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200; const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 7000;
    const g = ctx.createGain(); g.gain.value = 0; n.connect(f); f.connect(f2); f2.connect(g); g.connect(this.out); n.start(); this.rainGain = g;
    const n2 = this.noise(true), f3 = ctx.createBiquadFilter(); f3.type = 'lowpass'; f3.frequency.value = 300; const g2 = ctx.createGain(); g2.gain.value = 0; n2.connect(f3); f3.connect(g2); g2.connect(this.out); n2.start(); this.rainLow = g2; }
  this.rainGain.gain.setTargetAtTime(0.05 * level, this.now(), 0.4); this.rainLow.gain.setTargetAtTime(0.12 * level, this.now(), 0.4);
};
Sound.prototype.setTrainLoop = function (level) {
  if (!this.ctx) return; const ctx = this.ctx;
  if (!this.tlGain) {
    const g = ctx.createGain(); g.gain.value = 0; g.connect(this.out); this.tlGain = g;
    const n = this.noise(true), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180; const rg = ctx.createGain(); rg.gain.value = 0.9; n.connect(f); f.connect(rg); rg.connect(g); n.start();
    const n2 = this.noise(false), f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 600; f2.Q.value = 0.5; const wg = ctx.createGain(); wg.gain.value = 0.06; n2.connect(f2); f2.connect(wg); wg.connect(g); n2.start();
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.31; lg.gain.value = 0.25; lfo.connect(lg); lg.connect(rg.gain); lfo.start();
    this._clack = setInterval(() => { if (!this.tlLevel || !this.ctx) return; const t = this.now(); for (const dt of [0, 0.11, 0.62, 0.73]) { const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 260 + Math.random() * 60; bf.Q.value = 2; const eg = ctx.createGain(); s.connect(bf); bf.connect(eg); eg.connect(this.out); this.env(eg, t + dt, 0.004, 0.22 * this.tlLevel, 0.09); s.start(t + dt, Math.random()); s.stop(t + dt + 0.2); } }, 1450);
  }
  this.tlLevel = level; this.tlGain.gain.setTargetAtTime(0.32 * level, this.now(), 0.6);
};
Sound.prototype.paper = function () { if (!this.ctx) return; const ctx = this.ctx, t = this.now(); for (let i = 0; i < 3; i++) { const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500; const g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(this.out); this.env(g, t + i * 0.09, 0.01, 0.12, 0.08); s.start(t + i * 0.09, Math.random()); s.stop(t + i * 0.09 + 0.2); } };
Sound.prototype.brake = function () { if (!this.ctx) return; const ctx = this.ctx, t = this.now(); const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(2400, t); o.frequency.linearRampToValueAtTime(1500, t + 2.5); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2000; f.Q.value = 8; const g = ctx.createGain(); o.connect(f); f.connect(g); g.connect(this.out); this.env(g, t, 0.3, 0.06, 2.4); o.start(t); o.stop(t + 3); };
Sound.prototype.phoneRing = function (on) {
  if (!this.ctx) return; clearInterval(this._ring); if (!on) return;
  const ring = () => { const ctx = this.ctx, t = this.now(); for (let k = 0; k < 2; k++) { const o = ctx.createOscillator(), o2 = ctx.createOscillator(); o.frequency.value = 440; o2.frequency.value = 480; const m = ctx.createGain(); const g = ctx.createGain(); o.connect(m); o2.connect(m); m.connect(g); const p = this.pan(0.3); g.connect(p); p.connect(this.out); const rs = ctx.createGain(); rs.gain.value = 0.4; g.connect(rs); rs.connect(this.rev); const t0 = t + k * 0.6; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.04, t0 + 0.02); g.gain.setValueAtTime(0.04, t0 + 0.4); g.gain.linearRampToValueAtTime(0, t0 + 0.42); o.start(t0); o2.start(t0); o.stop(t0 + 0.45); o2.stop(t0 + 0.45); } };
  ring(); this._ring = setInterval(ring, 3000);
};
Sound.prototype.glass = function () { if (!this.ctx) return; const ctx = this.ctx, t = this.now(); const s = ctx.createBufferSource(); s.buffer = this.brownBuf; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; const g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(this.out); this.env(g, t, 0.003, 1.2, 0.35); s.start(t); s.stop(t + 0.5); const o = ctx.createOscillator(); o.frequency.value = 1900; const g2 = ctx.createGain(); o.connect(g2); g2.connect(this.out); this.env(g2, t, 0.002, 0.05, 0.4); o.start(t); o.stop(t + 0.5); };
Sound.prototype.drip = function (pan = 0) { if (!this.ctx) return; const ctx = this.ctx, t = this.now(); const o = ctx.createOscillator(); o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(500, t + 0.06); const g = ctx.createGain(); const p = this.pan(pan); o.connect(g); g.connect(p); p.connect(this.out); const rs = ctx.createGain(); rs.gain.value = 0.8; g.connect(rs); rs.connect(this.rev); this.env(g, t, 0.002, 0.05, 0.08); o.start(t); o.stop(t + 0.12); };

// ---- v3.7: each Chapter 1 platform's own looping ambience bed (procedural, no files: works offline in the APK) ----
// A continuous layer (a generated, seamlessly looping buffer) + the platform's own recurring sounds. The same bed every loop on
// a platform (it never changes, so it never reads as an anomaly), quiet, under the existing hum / wind / rain, ducked under the
// PA and the voices, through the master volume (mute = volume 0). Fades out on its own when the platform loop stops calling it
// (pause, title, Chapters 2/3, dawn, the blackout scare).
export const PF_BEDS = [
  { name: 'drips + trickle',            cont: 'trickle', gain: 0.11, ev: [['drip', 1.1, 2.6, -0.35], ['plonk', 6, 11, 0.3]] },
  { name: 'low wind + far dog',         cont: 'moan',    gain: 0.10, ev: [['dog', 13, 24, 0.65], ['cartcreak', 10, 18, -0.4]] },
  { name: 'wind whistling in the roof gap', cont: 'whistle', gain: 0.075, ev: [['gust', 7, 13, 0.2], ['flap', 9, 16, 0.45]] },
  { name: 'insects + owl (banyan)',     cont: 'insects', gain: 0.06, ev: [['owl', 11, 20, 0.6], ['rustle', 5, 9, 0.5], ['coo', 12, 20, -0.4]] },
  { name: 'water tank: groan + plinks', cont: 'tank',    gain: 0.12, ev: [['tankdrop', 3.2, 6.5, 0.55], ['groan', 8, 14, 0.6]] },
  { name: 'far temple bell + tin creak', cont: 'air',    gain: 0.08, ev: [['bell', 14, 24, 0.7], ['creak', 7, 12, -0.3]] },
  { name: 'crickets + frogs',           cont: 'crickets', gain: 0.05, ev: [['frog', 4, 8, 0.55], ['grass', 9, 15, -0.3]] },
  { name: 'embers crackling + cooling metal', cont: 'embers', gain: 0.10, ev: [['tick', 6, 11, 0.6], ['sputter', 9, 15, -0.45]] },
  { name: 'high-voltage hum + relay clicks', cont: 'hv',  gain: 0.05, ev: [['relay', 3, 6, 0.55], ['sigbell', 15, 26, 0.7]] },
];
function _loopBuf(ctx, sec, fill) { // fill(i, t, sr) -> sample; the last 0.25 s cross-fades into the start so the loop has no seam
  const sr = ctx.sampleRate, n = Math.floor(sr * sec), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0); fill(d, sr, n);
  const x = Math.floor(sr * 0.25); for (let i = 0; i < x; i++) { const k = i / x; d[i] = d[i] * k + d[n - x + i] * (1 - k); }
  const out = ctx.createBuffer(1, n - x, sr); out.getChannelData(0).set(d.subarray(0, n - x)); return out;
}
function _seeded(s) { return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const CONT = {
  trickle(ctx) { const r = _seeded(11); return _loopBuf(ctx, 6, (d, sr, n) => { let a = 0, b = 0; for (let i = 0; i < n; i++) { const w = r() * 2 - 1; a = a * 0.6 + w * 0.4; b = b * 0.97 + (a - b) * 0.2; const am = 0.6 + 0.4 * Math.sin(i / sr * 9.3) * Math.sin(i / sr * 2.1 + 1); d[i] = (a - b) * 0.7 * am; } }); },
  moan(ctx) { const r = _seeded(23); return _loopBuf(ctx, 8, (d, sr, n) => { let l = 0; for (let i = 0; i < n; i++) { l = (l + 0.02 * (r() * 2 - 1)) / 1.02; const t = i / sr; d[i] = l * 3.2 * (0.55 + 0.45 * Math.sin(t * 0.78) ** 2); } }); },
  whistle(ctx) { const r = _seeded(37); return _loopBuf(ctx, 8, (d, sr, n) => { let ph = 0, l = 0; for (let i = 0; i < n; i++) { const t = i / sr, f = 880 + 140 * Math.sin(t * 0.785) + 40 * Math.sin(t * 2.3); ph += 2 * Math.PI * f / sr; l = (l + 0.05 * (r() * 2 - 1)) / 1.05; const sw = Math.max(0, Math.sin(t * 0.785 * 2)) ** 2; d[i] = Math.sin(ph) * 0.18 * sw * (0.7 + 0.3 * Math.sin(t * 13)) + l * 1.4; } }); },
  insects(ctx) { const r = _seeded(41); return _loopBuf(ctx, 5, (d, sr, n) => { let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr; ph += 2 * Math.PI * 4650 / sr; const g = Math.max(0, Math.sin(t * 2 * Math.PI * 16)) ** 6 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 0.6)); d[i] = Math.sin(ph) * 0.22 * g + (r() * 2 - 1) * 0.015; } }); },
  tank(ctx) { const r = _seeded(53); return _loopBuf(ctx, 6, (d, sr, n) => { let l = 0, ph = 0; for (let i = 0; i < n; i++) { const t = i / sr; l = (l + 0.01 * (r() * 2 - 1)) / 1.01; ph += 2 * Math.PI * 61 / sr; d[i] = l * 2.6 + Math.sin(ph) * 0.05 * (0.6 + 0.4 * Math.sin(t * 1.05)); } }); },
  air(ctx) { const r = _seeded(61); return _loopBuf(ctx, 7, (d, sr, n) => { let a = 0; for (let i = 0; i < n; i++) { a = a * 0.985 + (r() * 2 - 1) * 0.015; d[i] = a * 6 * (0.6 + 0.4 * Math.sin(i / sr * 0.9)); } }); },
  crickets(ctx) { const r = _seeded(71); return _loopBuf(ctx, 4, (d, sr, n) => { let p1 = 0, p2 = 0; for (let i = 0; i < n; i++) { const t = i / sr; p1 += 2 * Math.PI * 4100 / sr; p2 += 2 * Math.PI * 3600 / sr; const c1 = (t * 1.6 % 1) < 0.35 ? Math.max(0, Math.sin(t * 2 * Math.PI * 28)) ** 4 : 0, c2 = ((t * 1.1 + 0.4) % 1) < 0.4 ? Math.max(0, Math.sin(t * 2 * Math.PI * 22)) ** 4 : 0; d[i] = Math.sin(p1) * 0.25 * c1 + Math.sin(p2) * 0.18 * c2 + (r() * 2 - 1) * 0.01; } }); },
  embers(ctx) { const r = _seeded(83); return _loopBuf(ctx, 5, (d, sr, n) => { let env = 0, l = 0; for (let i = 0; i < n; i++) { if (r() < 9 / sr) env = 0.4 + r() * 0.6; if (r() < 60 / sr) env = Math.max(env, 0.08 + r() * 0.15); env *= 0.9965; l = (l + 0.02 * (r() * 2 - 1)) / 1.02; d[i] = (r() * 2 - 1) * env * 0.6 + l * 1.2; } }); },
  hv(ctx) { const r = _seeded(97); return _loopBuf(ctx, 4, (d, sr, n) => { for (let i = 0; i < n; i++) { const t = i / sr, a = 2 * Math.PI * t; const buzz = Math.sign(Math.sin(a * 100)) * 0.05 + Math.sin(a * 200) * 0.25 + Math.sin(a * 300) * 0.12 + Math.sin(a * 600) * 0.05; d[i] = buzz * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 0.75) ** 2) * 0.5 + (r() * 2 - 1) * 0.02 * (r() < 0.002 ? 8 : 1); } }); },
};
Sound.prototype.pfBed = function (n, dt) {
  if (!this.ctx) return; const ctx = this.ctx; this._bedSeen = performance.now();
  if (!this._bedWatch) this._bedWatch = setInterval(() => { if (this.bed && performance.now() - (this._bedSeen || 0) > 450) this._bedTo(-1); }, 250);
  if (n !== this.bedN) this._bedTo(n);
  const B = this.bed; if (!B || !B.def || !(dt > 0)) return;
  for (const e of B.ev) { e.in -= dt; if (e.in <= 0) { e.in = e.d[1] + Math.random() * (e.d[2] - e.d[1]); if (performance.now() > (this._duckUntil || 0)) this.bedEvent(e.d[0], e.d[3]); } }
};
Sound.prototype._bedTo = function (n) {
  const ctx = this.ctx, t = this.now(); this.bedN = n;
  if (this.bed) { const old = this.bed; old.g.gain.cancelScheduledValues(t); old.g.gain.setTargetAtTime(0, t, 0.35); setTimeout(() => { try { old.src.stop(); old.g.disconnect(); } catch (e) {} }, 2500); this.bed = null; }
  if (n < 0 || !PF_BEDS[n]) return;
  const def = PF_BEDS[n]; this._bufs = this._bufs || {};
  const buf = this._bufs[def.cont] || (this._bufs[def.cont] = CONT[def.cont](ctx));
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = def.cont === 'insects' || def.cont === 'crickets' || def.cont === 'hv' || def.cont === 'whistle' ? 'highpass' : 'lowpass'; f.frequency.value = f.type === 'highpass' ? 120 : (def.cont === 'trickle' ? 5200 : def.cont === 'embers' ? 6500 : 1600);
  const g = ctx.createGain(); g.gain.value = 0; const p = this.pan(def.cont === 'insects' || def.cont === 'crickets' ? 0.35 : def.cont === 'hv' ? 0.45 : 0);
  src.connect(f); f.connect(g); g.connect(p); p.connect(this.bedBus()); src.start(t, (n * 0.37) % buf.duration);
  g.gain.setTargetAtTime(def.gain, t + 0.15, 0.6);
  this.bed = { n, def, src, g, ev: def.ev.map((d, i) => ({ d, in: 1.2 + i * 1.7 + (d[1] * 0.3) })) };
};
// all bed sound goes through one bus, so the PA and the voices can duck it (they must stay clear: the "Arjun" announcement etc.)
Sound.prototype.bedBus = function () {
  if (this._bedBus) return this._bedBus; const g = this._bedBus = this.ctx.createGain(); g.gain.value = 1; g.connect(this.out);
  const rs = this.ctx.createGain(); rs.gain.value = 0.35; g.connect(rs); rs.connect(this.rev); return g;
};
Sound.prototype.duckBed = function (sec) {
  if (!this.ctx) return; const b = this.bedBus(), t = this.now(); this._duckUntil = Math.max(this._duckUntil || 0, performance.now() + sec * 1000);
  b.gain.cancelScheduledValues(t); b.gain.setTargetAtTime(0.22, t, 0.12); b.gain.setTargetAtTime(1, t + sec, 0.8);
};
Sound.prototype.bedLevel = function () { return this.bed ? { n: this.bed.n, gain: this.bed.g.gain.value, bus: this._bedBus ? this._bedBus.gain.value : 1 } : null; };
Sound.prototype.bedEvent = function (kind, pan = 0) {
  const ctx = this.ctx; if (!ctx) return; const t = this.now(), out = ctx.createGain(); out.gain.value = 1; const p = this.pan(pan); out.connect(p); p.connect(this.bedBus());
  const r = Math.random;
  const osc = (type, f0, f1, t0, dur, peak, a = 0.005) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur); const g = ctx.createGain(); this.env(g, t0, a, peak, dur); o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + a + dur + 0.05); return { o, g }; };
  const nz = (brown, type, f, q, t0, dur, peak, a = 0.01) => { const s = ctx.createBufferSource(); s.buffer = brown ? this.brownBuf : this.noiseBuf; const bf = ctx.createBiquadFilter(); bf.type = type; bf.frequency.value = f; bf.Q.value = q; const g = ctx.createGain(); this.env(g, t0, a, peak, dur); s.connect(bf); bf.connect(g); g.connect(out); s.start(t0, r(), a + dur + 0.1); return bf; };
  if (kind === 'plonk') { const f = 520 + r() * 80; osc('sine', f, f * 0.6, t, 0.25, 0.07, 0.002); osc('sine', f * 2.1, f * 1.2, t + 0.01, 0.12, 0.02, 0.002); }
  else if (kind === 'cartcreak') { const { o } = osc('sawtooth', 210, 160, t, 0.7, 0.012, 0.15); for (let i = 0; i < 2; i++) nz(false, 'bandpass', 1300 + i * 400, 9, t + 0.2 + i * 0.25, 0.25, 0.02, 0.05); }
  else if (kind === 'gust') { const bf = nz(true, 'bandpass', 500, 2, t, 3.4, 0.16, 1.4); bf.frequency.setValueAtTime(320, t); bf.frequency.linearRampToValueAtTime(820, t + 1.8); bf.frequency.linearRampToValueAtTime(360, t + 4.4); }
  else if (kind === 'flap') { for (let i = 0; i < 5; i++) nz(false, 'bandpass', 700 + r() * 300, 1.2, t + i * 0.16 + r() * 0.05, 0.06, 0.04, 0.004); }
  else if (kind === 'owl') { for (let i = 0; i < 2; i++) { const t0 = t + i * 0.55; osc('sine', 410, 380, t0, i ? 0.5 : 0.28, 0.03, 0.06); } osc('sine', 395, 360, t + 1.4, 0.7, 0.025, 0.08); }
  else if (kind === 'rustle') { nz(false, 'highpass', 3000, 0.7, t, 1.4, 0.035, 0.4); }
  else if (kind === 'coo') { this.pfAccent('coo', pan); }
  else if (kind === 'tankdrop') { const f = 300 + r() * 120; osc('sine', f, f * 0.92, t, 1.1, 0.05, 0.002); osc('sine', f * 2.76, f * 2.5, t, 0.5, 0.012, 0.002); }
  else if (kind === 'groan') { const { o } = osc('sawtooth', 68, 54, t, 1.8, 0.02, 0.5); const lp = ctx.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 330; lp.Q.value = 5; o.disconnect(); const g = ctx.createGain(); this.env(g, t, 0.5, 0.06, 1.6); o.connect(lp); lp.connect(g); g.connect(out); }
  else if (kind === 'bell') { const f = 392; for (const [m, a, d] of [[1, 0.035, 4.5], [2.0, 0.018, 3.2], [2.76, 0.014, 2.6], [5.4, 0.006, 1.4], [0.5, 0.012, 5]]) osc('sine', f * m, f * m * 0.998, t, d, a, 0.003); }
  else if (kind === 'creak') { this.pfAccent('creak', pan); }
  else if (kind === 'frog') { const n = 2 + (r() * 3 | 0); for (let i = 0; i < n; i++) { const t0 = t + i * 0.22; const { o } = osc('square', 180, 140, t0, 0.11, 0.012, 0.01); } }
  else if (kind === 'grass') { const bf = nz(false, 'bandpass', 2400, 0.8, t, 2.2, 0.03, 0.8); bf.frequency.linearRampToValueAtTime(1600, t + 2.5); }
  else if (kind === 'tick') { const n = 2 + (r() * 3 | 0); for (let i = 0; i < n; i++) nz(false, 'bandpass', 3800 + r() * 900, 14, t + i * (0.3 + r() * 0.5), 0.03, 0.05, 0.001); }
  else if (kind === 'sputter') { this.pfAccent('sputter', pan); }
  else if (kind === 'relay') { for (const d of [0, 0.09]) { nz(false, 'bandpass', 2600, 4, t + d, 0.012, 0.06, 0.001); osc('square', 1200, 900, t + d, 0.01, 0.008, 0.001); } }
  else if (kind === 'sigbell') { for (let k = 0; k < 2; k++) for (const [m, a] of [[1, 0.025], [2.6, 0.01], [4.1, 0.006]]) osc('sine', 1180 * m, 1180 * m, t + k * 0.32, 0.9, a, 0.002); }
  else if (kind === 'drip') { this.pfAccent('drip', pan); }
  else if (kind === 'dog') { this.pfAccent('dog', pan); }
};
