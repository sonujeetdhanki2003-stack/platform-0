(function(){
  function key(code){ var o={code:code,key:code==='KeyP'?'p':'Escape',bubbles:true};
    window.dispatchEvent(new KeyboardEvent('keydown',o)); window.dispatchEvent(new KeyboardEvent('keyup',o)); }
  function vis(id){ var e=document.getElementById(id); return !!(e && e.classList.contains('on')); }
  function st(){ return window.__p0G ? window.__p0G.state : null; }
  window.__p0Back = function(){
    var s = st();
    if (s === 'playing') { key('KeyP'); return true; }                 // playing -> pause
    if (s === 'note' || s === 'inspect') { key('Escape'); return true; } // reading a ticket/diary or inspecting -> close it
    var back = document.querySelector('.screen.on #btnHowBack, .screen.on #btnSetBack, .screen.on #btnChBack');
    if (back) { back.click(); return true; }                           // how/settings/chapters -> back one screen
    if (s === 'paused' || vis('pause')) { key('KeyP'); return true; }  // paused -> resume
    if (vis('title')) return false;                                    // title -> app to background
    if (vis('end')) { var t=document.getElementById('btnEndTitle'); if (t) { t.click(); return true; } }
    return true;                                                       // cutscenes/fades: swallow, don't exit mid-game
  };
  document.addEventListener('visibilitychange', function(){ if (document.hidden && st() === 'playing') key('KeyP'); });
})();
