// PLATFORM 0 v3.3 — health: a small HP bar, hits instead of instant resets, a short invulnerability after a hit,
// slow regen when it's quiet, and at 0 HP a death scene that wakes you back at the chapter's loop 0 ("Platform 0").
// Settings > Health off = classic (every catch sends you back to 0).
export const DMG = { ghost: 40, train: 34, chase: 30, stranger: 35, tc: 40, scare: 6 };
export class Health {
  constructor(A) {
    this.A = A; this.max = 100; this.hp = 100; this.invulnUntil = 0; this.lastHit = -1e9; this.dying = false; this.hbT = 0; this.log = [];
    const css = document.createElement('style'); css.textContent = `
#hpBar{position:fixed;left:calc(16px + env(safe-area-inset-left,0px));top:14px;width:118px;height:11px;border:1px solid rgba(255,255,255,.55);border-radius:3px;background:rgba(0,0,0,.45);display:none;z-index:6;pointer-events:none}
#hpBar i{display:block;height:100%;width:100%;background:linear-gradient(#e2412c,#9c1b10);border-radius:2px;transition:width .25s}
#hpBar b{position:absolute;left:0;top:0;height:100%;width:100%;background:#fff;opacity:0;border-radius:2px;transition:width .9s .35s,opacity .4s}
#hpBar:after{content:'♥';position:absolute;left:124px;top:-6px;font-size:15px;color:#e2412c;text-shadow:0 1px 2px #000}
#hpBar.low i{animation:hplow .9s ease-in-out infinite} @keyframes hplow{50%{filter:brightness(1.8)}}
#hpBar.hit{animation:hpshake .35s} @keyframes hpshake{25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
body[data-screen=hud].hpon #hpBar{display:block} body.inspecting #hpBar{opacity:.4}
body.hpon #fxBat{top:33px} body.hpon #goal{top:58px} body.hpon #loopflash{top:56px}
#hpVig{position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 45%,rgba(120,0,0,.45) 75%,rgba(170,0,0,.85) 100%)}
#hpVig.on{animation:hpvig .9s ease-out}
@keyframes hpvig{0%{opacity:0}12%{opacity:1}100%{opacity:0}}
#hpLow{position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;transition:opacity .8s;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 55%,rgba(110,0,0,.35) 85%,rgba(150,0,0,.6) 100%)}
#hpDeath{position:fixed;inset:0;z-index:10;display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 6vw;pointer-events:none;background:#000}
#hpDeath.on{display:flex}
#hpDeath .d1{font:900 clamp(22px,5.6vw,52px)/1.1 system-ui,sans-serif;color:#d8261a;letter-spacing:.04em;opacity:0;transition:opacity .7s;text-shadow:0 0 18px rgba(200,0,0,.5)}
#hpDeath .d2{margin-top:14px;font:italic clamp(14px,2.4vw,20px)/1.4 Georgia,serif;color:#cfc6b0;opacity:0;transition:opacity .7s}
#hpDeath .board{margin-top:22px;background:#111;border:2px solid #333;border-radius:6px;padding:8px 18px;font:700 clamp(18px,3.6vw,30px) monospace;letter-spacing:.18em;color:#f2a213;opacity:0;transition:opacity .5s;min-width:min(60vw,320px)}
#hpDeath .d1.on,#hpDeath .d2.on,#hpDeath .board.on{opacity:1}`;
    document.head.appendChild(css);
    const mk = (id, html = '') => { const e = document.createElement('div'); e.id = id; e.innerHTML = html; document.body.appendChild(e); return e; };
    this.$bar = mk('hpBar', '<b></b><i></i>'); this.$vig = mk('hpVig'); this.$low = mk('hpLow');
    this.$death = mk('hpDeath', '<div class="d1"></div><div class="d2"></div><div class="board"></div>');
    this.sync();
  }
  get enabled() { return this.A.settings.hp !== false; }
  sync() { document.body.classList.toggle('hpon', this.enabled); this.draw(); }
  draw() { const k = Math.max(0, this.hp / this.max); this.$bar.lastChild.style.width = (k * 100).toFixed(1) + '%'; this.$bar.classList.toggle('low', k < 0.3);
    this.$low.style.opacity = this.enabled && k < 0.3 && this.A.G.state === 'playing' ? ((0.3 - k) / 0.3 * 0.9 + 0.25).toFixed(2) : '0'; }
  reset() { this.hp = this.max; this.invulnUntil = 0; this.lastHit = -1e9; this.dying = false; this.$bar.firstChild.style.transition = 'none'; this.$bar.firstChild.style.width = '100%'; this.$bar.firstChild.style.opacity = 0; void this.$bar.offsetWidth; this.$bar.firstChild.style.transition = ''; this.draw(); }
  invuln() { return performance.now() < this.invulnUntil; }
  // returns 'off' (classic mode), 'blocked' (invulnerable / not in play), 'hit' or 'dead'
  hurt(amt, cause, o = {}) {
    if (!this.enabled) return 'off';
    const G = this.A.G, now = performance.now();
    if (this.dying || !(G.state === 'playing' || G.state === 'cutscene_ghost')) return 'blocked';
    if (now < this.invulnUntil) { this.log.push({ cause, amt, r: 'blocked' }); return 'blocked'; }
    const before = this.hp; this.hp = Math.max(o.lethal === false ? Math.min(this.hp, 1) : 0, this.hp - amt);
    this.lastHit = now; const iframes = o.iframes ?? 3000; if (iframes > 0) this.invulnUntil = now + iframes;
    // the lost chunk shows white for a moment, then drains
    const ghost = this.$bar.firstChild; ghost.style.transition = 'none'; ghost.style.width = (before / this.max * 100) + '%'; ghost.style.opacity = .85; void ghost.offsetWidth; ghost.style.transition = ''; ghost.style.width = (this.hp / this.max * 100) + '%'; setTimeout(() => { ghost.style.opacity = 0; }, 900);
    this.$bar.classList.remove('hit'); void this.$bar.offsetWidth; this.$bar.classList.add('hit');
    this.$vig.classList.remove('on'); void this.$vig.offsetWidth; this.$vig.classList.add('on');
    const S = this.A.sound; if (amt >= 20 && S && S.heartbeat) S.heartbeat(3, 1.6);
    G.damage = Math.max(G.damage, amt >= 20 ? 0.9 : 0.45); G.shake && G.shake(amt >= 20 ? 0.6 : 0.25);
    this.draw(); this.log.push({ cause, amt, r: this.hp <= 0 ? 'dead' : 'hit', hp: this.hp });
    if (this.hp <= 0) { this.dying = true; this.A.onDeath(cause); return 'dead'; }
    return 'hit';
  }
  // per frame while playing: slow regen once it has been quiet for a while (not while she is close)
  update(dt, danger) {
    if (!this.enabled || this.dying) return;
    const now = performance.now();
    if (this.hp < this.max && now - this.lastHit > 9000 && danger < 0.25) { this.hp = Math.min(this.max, this.hp + 2.5 * dt); this.draw(); }
    if (this.hp < this.max * 0.3) { this.hbT -= dt; if (this.hbT <= 0) { this.hbT = 1.5; const S = this.A.sound; S && S.thud && (S.thud(), setTimeout(() => S.thud && S.thud(), 230)); } }
    if ((this._t = (this._t || 0) + dt) > 0.25) { this._t = 0; this.draw(); }
  }
  // the death card: red, then black; the board flips back to 11:58 · PF 0
  deathCard(lines, board, done) {
    const d = this.$death, [a, b, c] = d.children; a.textContent = lines[0]; b.textContent = lines[1]; c.textContent = '';
    a.className = 'd1'; b.className = 'd2'; c.className = 'board'; d.style.background = '#2a0000'; d.style.transition = 'background 1.6s'; d.classList.add('on');
    const T = []; const at = (ms, fn) => T.push(setTimeout(fn, ms));
    at(60, () => { d.style.background = '#000'; a.classList.add('on'); });
    at(900, () => b.classList.add('on'));
    at(1700, () => { c.classList.add('on'); const steps = ['02:17 · ??', '--:-- · --', board]; steps.forEach((s, i) => setTimeout(() => { c.textContent = s; }, i * 260)); this.A.sound && this.A.sound.chime && this.A.sound.chime(); });
    at(3500, () => { a.classList.remove('on'); b.classList.remove('on'); c.classList.remove('on'); done && done(); });
    at(4300, () => { d.classList.remove('on'); });
    this._T = T;
  }
  cancel() { (this._T || []).forEach(clearTimeout); this._T = []; this.$death.classList.remove('on'); this.dying = false; document.body.classList.remove('dying'); }
}
