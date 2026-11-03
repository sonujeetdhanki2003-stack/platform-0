// PLATFORM 0 v3.4 — ONE layout system for the phone HUD. Every control is placed here, in JS, from the REAL visible area
// (visualViewport: Android Chrome's address bar, the status bar and a camera cutout all eat into it — his 1600x720 phone
// showed the game in about 765x250 CSS px) and the safe-area insets (env(safe-area-inset-*), or the APK's native insets).
// v3.3.1 pinned each button at a fixed distance from the bottom-right corner (USE at 198 px, flare at 154 px), so on a 250 px-tall
// screen USE rode up into the top-right corner onto the camera / pause buttons and TURN landed on "Put back".
//  - top bar (right): pause, camera (or "Put back" while holding something)
//  - action cluster (bottom right): USE is the main button in the corner; swing, flare, torch sit on an arc around it and shove on
//    the outer ring. If the arc doesn't fit, a 2-row grid, then a single row. Sizes scale with the screen, never below 48 px; at
//    least 10 px between any two buttons INCLUDING their first-time labels; never in the joystick half (left 45%).
//  - left stack (top left): HP bar, torch battery, weapon uses, loop flash, goal card — stacked, never overlapping.
//  - text (hint, prompt, subtitles, inspect caption): centred, and moved / narrowed so they never touch a button or each other.
const $ = (id) => document.getElementById(id);
const CL = ['fxUseBtn', 'dfSwing', 'fxFlareBtn', 'fxTorchBtn', 'dfShove'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hit = (a, b, g = 0) => a.l < b.r + g && b.l < a.r + g && a.t < b.b + g && b.t < a.b + g;
function setS(el, o) { for (const k in o) { const v = o[k]; if (el.style.getPropertyValue(k) !== v || el.style.getPropertyPriority(k) !== 'important') el.style.setProperty(k, v, 'important'); } }

export function hudLayout(opts = {}) {
  if (window.__p0Layout) return window.__p0Layout;
  const st = document.createElement('style'); st.textContent = '.p0nofit{visibility:hidden!important}'; document.head.appendChild(st);
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
  document.body.appendChild(probe);
  const L = { last: null, sig: '', n: 0 };
  function insets() { const s = getComputedStyle(probe), n = window.__p0Insets || {};
    return { t: Math.max(parseFloat(s.paddingTop) || 0, n.t || 0), r: Math.max(parseFloat(s.paddingRight) || 0, n.r || 0), b: Math.max(parseFloat(s.paddingBottom) || 0, n.b || 0), l: Math.max(parseFloat(s.paddingLeft) || 0, n.l || 0) }; }
  function view() { let w = innerWidth, h = innerHeight; const vv = window.visualViewport; if (vv && vv.scale > 0.99 && vv.scale < 1.01) { w = Math.min(w, Math.round(vv.width)); h = Math.min(h, Math.round(vv.height)); } return { w, h }; }
  const vis = (el) => { if (!el) return false; const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden'; };
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };

  // ---- the action cluster: slot geometry for one mode + size; returns null if it breaks a rule
  function cluster(mode, B, M, g0, S, bar, lw, lh, thumbX, noCheck) {
    const g = g0 + 2; // 2 px slack over the 10 px rule (borders, sub-pixel label widths)
    const wOf = (id, s) => Math.max(s, lw[id] || 0), slot = {};
    const put = (id, cx, cy, s) => { const w = wOf(id, s); slot[id] = { cx, cy, s, box: { l: cx - w / 2, r: cx + w / 2, t: cy - s / 2, b: cy + s / 2 + lh } }; };
    const mw = wOf('fxUseBtn', M), mx = S.r - mw / 2, my = S.b - lh - M / 2;
    put('fxUseBtn', mx, my, M);
    const sep = () => { const ks = Object.keys(slot); for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) if (hit(slot[ks[i]].box, slot[ks[j]].box, g - 0.01)) return false; return true; };
    if (mode === 'arc') { // swing 180°, flare 135°, torch 90° at radius R; shove further out on the bottom row
      let ok = false;
      for (let R = M / 2 + B / 2 + g; R < 400; R += 2) { for (const k of ['dfSwing', 'fxFlareBtn', 'fxTorchBtn']) delete slot[k];
        put('dfSwing', mx - R, my + (M - B) / 2, B); put('fxFlareBtn', mx - R * 0.7071, my - R * 0.7071, B); put('fxTorchBtn', mx, my - R, B);
        if (sep()) { ok = true; break; } }
      if (!ok) return null;
      const sw = slot.dfSwing; ok = false;
      for (let d = B / 2 + g; d < 400; d += 2) { delete slot.dfShove; put('dfShove', sw.cx - wOf('dfSwing', B) / 2 - d, sw.cy - (B * 0.35), B); if (sep()) { ok = true; break; } }
      if (!ok) return null;
    } else if (mode === 'grid') { // bottom row: shove · swing · USE; top row: flare over swing, torch over USE
      const by = S.b - lh - B / 2;
      put('dfSwing', mx - mw / 2 - g - wOf('dfSwing', B) / 2, by, B);
      put('dfShove', slot.dfSwing.cx - wOf('dfSwing', B) / 2 - g - wOf('dfShove', B) / 2, by, B);
      const top = Math.min(slot.fxUseBtn.box.t, slot.dfSwing.box.t) - g - lh - B / 2;
      put('fxTorchBtn', mx, top, B); put('fxFlareBtn', slot.dfSwing.cx, top, B);
    } else { // one row: USE · swing · shove · flare · torch
      const by = S.b - lh - B / 2; let x = mx - mw / 2;
      for (const id of ['dfSwing', 'dfShove', 'fxFlareBtn', 'fxTorchBtn']) { const w = wOf(id, B); put(id, x - g - w / 2, by, B); x -= g + w; }
    }
    if (noCheck) return slot;
    if (!sep()) return null;
    for (const id in slot) { const b = slot[id].box; if (b.l < S.l - 0.01 || b.t < S.t - 0.01 || b.r > S.r + 0.01 || b.b > S.b + 0.01) return null; if (b.l < thumbX) return null; for (const q of bar) if (hit(b, q, g0 - 0.01)) return null; }
    return slot;
  }

  function layout(force) {
    const { w: vw, h: vh } = view(), ins = insets(), body = document.body, touch = body.classList.contains('touch');
    const u = clamp(Math.min(vh / 300, vw / 700), 1, 1.25), m = Math.round(clamp(8 * u, 8, 12)), g = Math.round(clamp(10 * u, 10, 14));
    const S = { l: ins.l + m, t: ins.t + m, r: vw - ins.r - m, b: vh - ins.b - m };
    const T = Math.round(clamp(48 * u, 48, 56));
    L.n++;
    // ---- top bar (right)
    const pause = $('pauseBtn'), cam = $('tpBtn'), close = $('fxClose'), bar = [];
    const pR = { l: S.r - T, t: S.t, r: S.r, b: S.t + T }, cR = { l: pR.l - g - T, t: S.t, r: pR.l - g, b: S.t + T };
    if (pause) setS(pause, { left: pR.l + 'px', top: pR.t + 'px', right: 'auto', bottom: 'auto', width: T + 'px', height: T + 'px', 'font-size': Math.round(T * 0.38) + 'px' });
    if (cam) setS(cam, { left: cR.l + 'px', top: cR.t + 'px', right: 'auto', bottom: 'auto', width: T + 'px', height: T + 'px', 'font-size': Math.round(T * 0.4) + 'px' });
    const inspecting = body.classList.contains('inspecting');
    if (touch) { bar.push(pR, cR); }
    if (close) { setS(close, { top: S.t + 'px', right: (vw - S.r) + 'px', left: 'auto', 'min-height': T + 'px', 'box-sizing': 'border-box' });
      if (inspecting) { const r = rectOf(close); if (r.r > r.l) bar.push(r); } }
    // ---- action cluster
    const els = {}, lw = {}; let lh = 0;
    for (const id of CL) { const e = $(id); if (!e) continue; els[id] = e; const lb = e.querySelector('.lbl'); if (lb && !e.classList.contains('txt')) { lw[id] = lb.offsetWidth; lh = Math.max(lh, lb.offsetHeight + 4); } }
    const thumbX = vw * 0.45;
    let slots = null, used = null;
    const B0 = Math.round(52 * u), M0 = Math.round(60 * u);
    outer: for (const mode of ['arc', 'grid', 'row']) for (let k = 0; k <= 8; k++) { const B = Math.max(48, B0 - k * 2), M = Math.max(52, M0 - k * 2);
      slots = cluster(mode, B, M, g, S, bar, lw, lh, thumbX); if (slots) { used = { mode, B, M }; break outer; } if (B === 48 && M === 52) break; }
    if (!slots) { slots = cluster('row', 48, 52, g, S, bar, lw, lh, 0, true); used = { mode: 'row!', B: 48, M: 52 }; } // nothing fits by the rules (a tiny window): one row, still on screen
    const solids = [...bar];
    for (const id in slots) { const s = slots[id], e = els[id]; if (!e) continue;
      setS(e, { left: (s.cx - s.s / 2) + 'px', top: (s.cy - s.s / 2) + 'px', right: 'auto', bottom: 'auto', width: s.s + 'px', height: s.s + 'px', 'font-size': Math.round(s.s * 0.24) + 'px' });
      if (touch) solids.push(s.box); }
    L.slots = slots; L.mode = used; L.S = S; L.bar = bar; L.vw = vw; L.vh = vh; L.ins = ins; L.g = g;
    // ---- left stack
    let y = S.t; const stackX = S.l; let stackR = S.l;
    const stack = (id, h, gap = 7) => { const e = $(id); if (!e || !vis(e) || (id === 'goal' && +getComputedStyle(e).opacity < 0.02 && !e.textContent)) return; setS(e, { left: stackX + 'px', top: y + 'px', right: 'auto', bottom: 'auto' }); const r = rectOf(e); y = Math.max(y, (h ? y + h : r.b)) + gap; stackR = Math.max(stackR, r.r + (id === 'hpBar' ? 18 : id === 'fxBat' ? 22 : 0)); solids.push({ l: r.l, t: r.t, r: r.r + (id === 'hpBar' ? 18 : id === 'fxBat' ? 22 : 0), b: r.b }); };
    stack('hpBar', 0, 9); stack('fxBat', 0, 9); stack('dfUses'); stack('loopflash');
    const goal = $('goal');
    if (goal) { const left = clusterLeft(slots, touch, S), maxW = Math.max(150, Math.min(vw * 0.34, 320, (touch ? left : S.r) - stackX - g)); setS(goal, { 'max-width': maxW + 'px' }); stack('goal'); }
    // ---- centred text: subtitles, inspect caption, prompt, hint
    // centred texts: try the preferred height first, then step away from it; on a cramped screen try a smaller font; if there is
    // truly no free band, hide that text for now (the hint first: it is the least important) rather than draw it over a button
    const place = (el, pref, dir, minW, keepT, cls) => { if (!el) return; el.classList.remove('p0nofit'); if (!vis(el)) return; const shown = cls === true || el.classList.contains(cls || 'show') || el.classList.contains('on'); if (!shown) return;
      const cx0 = (S.l + S.r) / 2; el.style.removeProperty('font-size');
      const base = { right: 'auto', bottom: 'auto', 'white-space': 'normal', 'box-sizing': 'border-box', left: cx0 + 'px', 'max-width': Math.floor(S.r - S.l) + 'px', width: 'auto' };
      if (!keepT) base.transform = 'translateX(-50%)'; setS(el, base);
      // geometry from the box itself (centred on x by translateX(-50%)), so a card that is still sliding in is placed where it will land
      const box = (x, top) => { const w = el.offsetWidth, h = el.offsetHeight; return { l: x - w / 2, r: x + w / 2, t: top, b: top + h }; };
      const fs0 = parseFloat(getComputedStyle(el).fontSize) || 15;
      const tries = [pref]; for (let k = 1; k < 80; k++) { const a = pref + (dir >= 0 ? 1 : -1) * k * 6, b2 = pref - (dir >= 0 ? 1 : -1) * k * 6; if (a >= S.t - 1 && a <= S.b) tries.push(a); if (b2 >= S.t - 1 && b2 <= S.b) tries.push(b2); }
      let best = null;
      for (const sc of [1, 0.86, 0.74]) { if (sc < 1) { if (fs0 * sc < 10.5) break; setS(el, { 'font-size': (fs0 * sc).toFixed(1) + 'px' }); }
        for (const top0 of tries) { const top = Math.max(S.t, Math.min(top0, S.b - 16)); let h = 16, ok = true;
          for (let it = 0; it < 3 && ok; it++) { const band = { t: top, b: top + h }; let lo = S.l, hi = S.r;
            for (const q of solids) { if (!(q.t < band.b + g && band.t < q.b + g)) continue; const qc = (q.l + q.r) / 2; if (qc <= cx0) lo = Math.max(lo, q.r + g); else hi = Math.min(hi, q.l - g); }
            if (hi - lo < minW) { ok = false; break; }
            setS(el, { 'max-width': Math.floor(hi - lo) + 'px', top: top + 'px', left: cx0 + 'px' }); let r = box(cx0, top);
            if (r.l < lo || r.r > hi) { const x = (lo + hi) / 2; setS(el, { left: x + 'px' }); r = box(x, top); }
            h = r.b - r.t; if (r.t < S.t - 0.5 || r.b > S.b + 0.5) { ok = false; break; }
            if (!solids.some(q => hit(r, q, g - 0.5))) { best = { top, r }; break; } }
          if (best) break; }
        if (best) break; }
      if (best) solids.push(best.r); else el.classList.add('p0nofit'); };
    const sub = $('sub'), cap = $('fxCap'), prompt = $('fxPrompt'), hint = $('hint'), phone = $('sphone'), ssub = $('ssub'), skip = $('sskip');
    if (skip) setS(skip, { right: (vw - S.r) + 'px', bottom: (vh - S.b + Math.round(vh * 0.06)) + 'px', 'min-height': '44px' });
    if (phone) place(phone, S.t, 1, 200, true, 'on'); // Maa's texts slide in from the top: keep their slide, only place them
    if (ssub) place(ssub, Math.round(S.b - vh * 0.15 - 40), -1, 180, false, 'on');
    if (sub) place(sub, Math.round(S.b - vh * 0.05 - 34), -1, 160);
    if (cap && inspecting && !(sub && sub.classList.contains('show'))) place(cap, Math.round(S.b - vh * 0.05 - 44), -1, 160, false, true);
    if (prompt) place(prompt, Math.round(vh * 0.6), 0, 120);
    if (hint) place(hint, Math.round(Math.max(S.t, vh * 0.16)), 1, 140);
    L.solids = solids;
  }
  function clusterLeft(slots, touch, S) { if (!touch) return S.r; let l = S.r; for (const id in slots) l = Math.min(l, slots[id].box.l); return l; }
  let raf = 0; const kick = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; try { layout(); } catch (e) { console.warn('hud layout', e); } }); };
  addEventListener('resize', kick); addEventListener('orientationchange', () => { kick(); setTimeout(kick, 300); });
  if (window.visualViewport) { visualViewport.addEventListener('resize', kick); visualViewport.addEventListener('scroll', kick); }
  addEventListener('p0insets', kick);
  const mo = new MutationObserver(kick); mo.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-screen'] });
  const watched = new Set(); const watch = () => { for (const id of [...CL, 'sub', 'hint', 'fxPrompt', 'goal', 'fxCap', 'dfUses', 'loopflash', 'fxBat', 'hpBar', 'sphone', 'ssub']) { const e = $(id); if (e && !watched.has(e)) { watched.add(e); mo.observe(e, { attributes: true, attributeFilter: ['class'], childList: true, characterData: true, subtree: true }); } } };
  setInterval(() => { watch(); kick(); }, 500); watch(); layout(true);
  // the APK (and tests) can hand in insets: window.__p0SetInsets({l,t,r,b})
  window.__p0SetInsets = (o) => { window.__p0Insets = o || {}; kick(); };
  window.__p0Layout = L; L.layout = layout; L.kick = kick; return L;
}
