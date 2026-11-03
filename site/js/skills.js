// PLATFORM 0 v3.3.1 — the phone skill buttons, finished: torch 🔦, flare 🔆, swing ⚔️, shove ✋ and USE share one look with the
// camera / pause buttons (dark glass circle, thin light rim), a crisp line icon, an accent colour each, a radial cooldown sweep with a
// countdown, a dim "can't right now" state (no battery / no weapon), a press squash + glow, a short label under each the first time it
// appears, and a smooth fade + scale in and out when they become available (they used to pop on and off, and the flare sat as a flat
// orange disc).
const ICON = {
  torch: '<svg viewBox="0 0 24 24"><path d="M4.5 9.5h7l2.2-2.2v9.4l-2.2-2.2h-7z"/><path d="M16.5 8.6l3.6-1.7M16.8 12h4M16.5 15.4l3.6 1.7" class="b"/></svg>',
  flare: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.6"/><path d="M12 2.6v3.2M12 18.2v3.2M2.6 12h3.2M18.2 12h3.2M5.4 5.4l2.2 2.2M16.4 16.4l2.2 2.2M5.4 18.6l2.2-2.2M16.4 7.6l2.2-2.2" class="b"/></svg>',
  swing: '<svg viewBox="0 0 24 24"><path d="M5 19L17.5 6.5"/><path d="M4 20l2.2-.6-1.6-1.6z" class="f"/><path d="M8.5 4.2a10 10 0 0 1 11.3 11.3" class="b"/><path d="M20.6 12.6l-.8 3.2-2.6-1.9" class="b"/></svg>',
  shove: '<svg viewBox="0 0 24 24"><path d="M8.2 12.4V6.3a1.3 1.3 0 0 1 2.6 0v5M10.8 11V4.9a1.3 1.3 0 0 1 2.6 0V11M13.4 11V5.8a1.3 1.3 0 0 1 2.6 0V12M16 12V8.4a1.3 1.3 0 0 1 2.6 0v5.4c0 3.8-2.6 6.6-6.2 6.6-2.6 0-4.1-1.2-5.3-3l-2.4-3.8a1.3 1.3 0 0 1 2.1-1.5l1.4 1.6"/><path d="M2.2 6.5h3M2.2 9.5h2" class="b"/></svg>',
};
const SKILLS = { fxTorchBtn: { icon: 'torch', label: 'Torch', ac: '242,214,117' }, fxFlareBtn: { icon: 'flare', label: 'Flare', ac: '255,182,72' }, dfSwing: { icon: 'swing', label: 'Swing', ac: '255,122,92' }, dfShove: { icon: 'shove', label: 'Shove', ac: '156,196,255' }, fxUseBtn: { text: 'USE', label: 'Use', ac: '255,255,255' } };
const CSS = `
.p0sk{display:block!important;position:fixed;border-radius:50%;padding:0;margin:0;color:#fff;--cd:1;--ac:255,255,255;
  border:1.5px solid rgba(255,255,255,.4);background:radial-gradient(circle at 50% 35%,rgba(48,48,54,.66),rgba(8,8,10,.74) 72%);
  box-shadow:0 2px 10px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.08);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);
  opacity:0;visibility:hidden;transform:scale(.62);pointer-events:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;
  transition:opacity .22s ease,transform .26s cubic-bezier(.2,.9,.3,1.25),visibility 0s linear .26s,border-color .2s,box-shadow .18s;font:700 14px/1 system-ui,sans-serif;letter-spacing:.06em}
.p0sk .ic{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transition:opacity .2s,filter .2s,transform .12s}
.p0sk svg{width:46%;height:46%;fill:none;stroke:#fff;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;overflow:visible}
.p0sk svg .b{stroke:rgb(var(--ac))} .p0sk svg .f{fill:#fff;stroke:none}
.p0sk .ring{position:absolute;inset:-1.5px;width:calc(100% + 3px);height:calc(100% + 3px);transform:rotate(-90deg);pointer-events:none}
.p0sk .ring circle{fill:none;stroke-width:3;cx:50%;cy:50%}
.p0sk .ring .tr{stroke:rgba(255,255,255,0)} .p0sk .ring .pr{stroke:rgb(var(--ac));stroke-dasharray:100;stroke-dashoffset:calc(100 - var(--cd) * 100);opacity:0;transition:opacity .2s}
.p0sk:before{content:'';position:absolute;inset:0;border-radius:50%;pointer-events:none;opacity:0;transition:opacity .2s;background:conic-gradient(from 0deg,rgba(0,0,0,0) calc(var(--cd) * 360deg),rgba(0,0,0,.58) 0)}
.p0sk .cdn{position:absolute;left:0;right:0;bottom:15%;text-align:center;font:800 11px/1 system-ui,sans-serif;color:rgb(var(--ac));text-shadow:0 1px 2px #000;opacity:0;transition:opacity .2s}
.p0sk.wait:before,.p0sk.wait .ring .pr,.p0sk.wait .cdn{opacity:1} .p0sk.wait .ic{opacity:.5;transform:translateY(-3px) scale(.86)}
.p0sk.nobat .ic,.p0sk.noweap .ic{opacity:.34;filter:grayscale(1)} .p0sk.nobat,.p0sk.noweap{border-style:dashed;border-color:rgba(255,255,255,.28)}
.p0sk .bdg{position:absolute;right:-3px;top:-3px;min-width:17px;height:17px;border-radius:9px;background:#2a2a2e;border:1px solid rgba(255,255,255,.35);font:700 9px/15px system-ui,sans-serif;color:#ffb0a0;text-align:center;display:none;padding:0 2px}
.p0sk.nobat .bdg,.p0sk.noweap .bdg{display:block}
.p0sk.lit{border-color:rgba(var(--ac),.9);box-shadow:0 0 14px rgba(var(--ac),.35),0 2px 10px rgba(0,0,0,.5)}
.p0sk.press{transform:scale(.86)!important;box-shadow:0 0 22px rgba(var(--ac),.7),0 0 0 3px rgba(var(--ac),.35);border-color:rgb(var(--ac));transition:transform .06s,box-shadow .06s}
.p0sk.pop{animation:p0pop .32s cubic-bezier(.2,.9,.3,1.4)} @keyframes p0pop{0%{transform:scale(.86)}55%{transform:scale(1.09)}100%{transform:scale(1)}}
.p0sk .lbl{position:absolute;left:50%;top:calc(100% + 4px);transform:translate(-50%,-3px);white-space:nowrap;font:700 9.5px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#fff;
  background:rgba(0,0,0,.62);padding:3px 7px;border-radius:7px;opacity:0;transition:opacity .35s,transform .35s;pointer-events:none}
.p0sk.lblon .lbl{opacity:1;transform:translate(-50%,0)} .p0sk.txt .lbl{display:none}
.p0sk.txt .ic{font:800 14px/1 system-ui,sans-serif;letter-spacing:.06em}
body.touch[data-screen=hud] #fxTorchBtn.has,body.touch[data-screen=hud] #fxFlareBtn.has,body.touch[data-screen=hud] #fxUseBtn.on,
body.touch[data-screen=hud] #dfSwing.on,body.touch[data-screen=hud] #dfShove.on{opacity:1;visibility:visible;transform:scale(1);pointer-events:auto;transition:opacity .22s ease,transform .26s cubic-bezier(.2,.9,.3,1.25),visibility 0s,border-color .2s,box-shadow .18s}
body.dying .p0sk,body.hiding #dfSwing,body.hiding #dfShove{opacity:0!important;visibility:hidden!important;pointer-events:none!important;transition:none!important}
body:not([data-screen=hud]) #lkStatic,body.dying #lkStatic{opacity:0!important;transition:none!important}
body.inspecting #fxFlareBtn,body.inspecting #fxTorchBtn,body.inspecting #dfSwing,body.inspecting #dfShove{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
#fxTorchBtn{right:24px;bottom:116px;width:64px;height:64px} #fxUseBtn{right:24px;bottom:198px;width:64px;height:64px}
#fxFlareBtn{right:102px;bottom:154px;width:56px;height:56px} #dfSwing{right:102px;bottom:76px;width:56px;height:56px} #dfShove{right:172px;bottom:112px;width:56px;height:56px}
#fxFlareBtn,#dfSwing,#dfShove,#fxTorchBtn,#fxUseBtn{background-image:radial-gradient(circle at 50% 35%,rgba(48,48,54,.66),rgba(8,8,10,.74) 72%)!important}
#fxTorchBtn.p0sk,#fxFlareBtn.p0sk,#dfSwing.p0sk,#dfShove.p0sk,#fxUseBtn.p0sk{border:1.5px solid rgba(255,255,255,.4);color:#fff;font-size:14px;filter:none!important}
#dfShove.p0sk.wait,#fxFlareBtn.p0sk.wait,#fxFlareBtn.p0sk.nobat,#dfSwing.p0sk.noweap{opacity:0}
#fxFlareBtn.p0sk.nobat,#dfSwing.p0sk.noweap{border-style:dashed;border-color:rgba(255,255,255,.28)} #fxTorchBtn.p0sk.lit,#fxFlareBtn.p0sk.lit{border-color:rgba(var(--ac),.9)} #fxTorchBtn.p0sk.press,#fxFlareBtn.p0sk.press,#dfSwing.p0sk.press,#dfShove.p0sk.press,#fxUseBtn.p0sk.press{border-color:rgb(var(--ac))}
#pauseBtn,#tpBtn{border:1.5px solid rgba(255,255,255,.4)!important;background:radial-gradient(circle at 50% 35%,rgba(48,48,54,.66),rgba(8,8,10,.74) 72%)!important;box-shadow:0 2px 10px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.08);transition:transform .12s,box-shadow .12s}
#pauseBtn:active,#tpBtn:active{transform:scale(.88);box-shadow:0 0 16px rgba(255,255,255,.35)}
body.touch.tpv #tpBtn{border-color:rgba(242,198,19,.95)!important}
`;
export function skillHud(FX) {
  if (document.getElementById('p0skCss')) return; const st = document.createElement('style'); st.id = 'p0skCss'; st.textContent = CSS; document.head.appendChild(st);
  let seen = {}; try { seen = JSON.parse(localStorage.getItem('p0_sk_seen') || '{}'); } catch (e) { }
  const els = {};
  for (const id in SKILLS) { const e = document.getElementById(id); if (!e) continue; const k = SKILLS[id]; els[id] = e;
    e.classList.add('p0sk'); if (k.text) e.classList.add('txt'); e.style.setProperty('--ac', k.ac); e.setAttribute('aria-label', k.label);
    const keep = k.text ? e.textContent : '';
    e.innerHTML = '<svg class="ring" viewBox="0 0 64 64"><circle class="tr" cx="32" cy="32" r="30" pathLength="100"/><circle class="pr" cx="32" cy="32" r="30" pathLength="100"/></svg>' +
      '<span class="ic">' + (k.text ? '' : ICON[k.icon]) + '</span><b class="cdn"></b><i class="bdg"></i><em class="lbl">' + k.label + '</em>';
    if (k.text) { const ic = e.querySelector('.ic'); ic.textContent = keep || k.text;
      // USE's text is changed elsewhere with textContent (USE / TURN / DONE / Come out): keep it in the icon slot
      Object.defineProperty(e, 'textContent', { configurable: true, get() { return ic.textContent; }, set(v) { ic.textContent = v; } }); }
    const press = () => { e.classList.remove('pop'); e.classList.add('press'); clearTimeout(e._pt); e._pt = setTimeout(release, 400); };
    const release = () => { if (!e.classList.contains('press')) return; e.classList.remove('press'); void e.offsetWidth; e.classList.add('pop'); };
    e.addEventListener('touchstart', press, { passive: true }); e.addEventListener('touchend', release, { passive: true }); e.addEventListener('touchcancel', release, { passive: true });
    e.addEventListener('mousedown', press); e.addEventListener('mouseup', release); e.addEventListener('mouseleave', release);
    e.addEventListener('animationend', () => e.classList.remove('pop')); }
  // a label under each button the first time it shows (3 s), remembered across sessions
  const shown = {};
  setInterval(() => { for (const id in els) { const e = els[id], vis = getComputedStyle(e).visibility === 'visible';
      if (vis && !shown[id]) { shown[id] = true; if (!seen[id]) { seen[id] = 1; try { localStorage.setItem('p0_sk_seen', JSON.stringify(seen)); } catch (er) { } e.classList.add('lblon'); setTimeout(() => e.classList.remove('lblon'), 3200); } }
      if (!vis) shown[id] = false; } }, 300);
  return { els,
    // per frame: cooldown sweep + countdown seconds; dim states
    cool(id, frac, msLeft) { const e = els[id]; if (!e) return; const f = Math.max(0, Math.min(1, frac)); const s = f.toFixed(3); if (e._cd !== s) { e._cd = s; e.style.setProperty('--cd', s); }
      const w = f < 1; e.classList.toggle('wait', w); const t = w && msLeft > 0 ? String(Math.ceil(msLeft / 1000)) : ''; const c = e.querySelector('.cdn'); if (c.textContent !== t) c.textContent = t; },
    dim(id, cls, on, badge) { const e = els[id]; if (!e) return; e.classList.toggle(cls, !!on); if (badge !== undefined) { const b = e.querySelector('.bdg'); if (b.textContent !== badge) b.textContent = badge; } },
    lit(id, on) { const e = els[id]; if (e) e.classList.toggle('lit', !!on); } };
}
