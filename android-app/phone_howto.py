# Phone-only 'How to play' text for the Android build (drops the PC controls line, mentions the back button).
p='index.html'; s=open(p,encoding='utf-8').read()
old="<b>PC:</b> WASD / arrows to walk, mouse to look, Shift to run, <b>E</b> to use / pick up, <b>F</b> torch, <b>Q</b> / right-click torch flare, <b>R</b> / left-click swing, <b>Space</b> shove, Esc to pause.<br><b>Phone:</b> left thumb to walk (push far to run), right thumb to look, <b>USE</b>, <b>🔦</b> torch and <b>🔆</b> flare buttons on the right, plus <b>⚔️</b> swing and <b>✋</b> shove when you need them (holding something: drag to turn it, or USE). Play in landscape."
new="Left thumb to walk (push far to run), right thumb to look, <b>USE</b>, <b>🔦</b> torch and <b>🔆</b> flare buttons on the right, plus <b>⚔️</b> swing and <b>✋</b> shove when you need them (holding something: drag to turn it, or USE). Back button or <b>II</b> to pause."
assert old in s, 'how-to-play line not found'
s=s.replace(old,new); open(p,'w',encoding='utf-8').write(s)
