// PLATFORM 0 v2 — story: lost tickets (collectibles) + chapter intros
import * as THREE from './three.module.min.js';
import * as M from './mats.js';

const stub = (n) => `<div class="tk"><div class="tkh">भारतीय रेल · INDIAN RAILWAYS</div><div class="tkr"><b>SHUNYA ROAD</b> → <b>CHURCHGATE</b></div><div class="tkr">II CLASS · ADULT · ₹10</div><div class="tkr">30.10.2016 &nbsp; 23:58 &nbsp; PF <b>0</b></div><div class="tkn">No. 0${n}7713${n}</div></div>`;
export const TICKETS = [
  { id: 0, ch: 1, p: 2, pos: [-2.9, 0.53, -9.2], back: 'Missed the 11:41 again. Maa called twice. Texted her I\'d be home by 12:30. It won\'t send.<br><br>The board says <b>PF 0</b>. I didn\'t know Shunya Road had a Platform 0.' },
  { id: 1, ch: 1, p: 5, pos: [-2.45, 1.13, -13.0], back: 'The chai uncle says the last local always comes.<br><br>He says he has seen me here before. Every night. I have never been to this station in my life.' },
  { id: 2, ch: 1, p: 7, pos: [-1.0, 0.03, 8.0], back: 'Every time I reach the end, I\'m back at the start. Same posters. Same fans.<br><br>Same man with the red backpack. He looks like he has been crying.' },
  { id: 3, ch: 2, p: 1, pos: [1.75, 0.03, -14.2], back: 'Took the subway to find the station master. The tiles go on forever.<br><br>Someone wrote on the wall in Hindi: <b>मैं यहाँ था</b> — "I was here." It\'s my handwriting.' },
  { id: 4, ch: 2, p: 4, pos: [-1.85, 1.08, -25.6], back: 'The ticket window was open. The clerk punched my ticket without looking up.<br><br>Same date. Same time. <b>30.10.2016, 23:58.</b><br>That was years ago... wasn\'t it?' },
  { id: 5, ch: 2, p: 6, pos: [1.6, 0.03, -33.5], back: 'The old man on the mat said Platform 0 was closed after the accident. "Nobody boards there now."<br><br>I asked him what accident. He just pointed at my backpack.' },
  { id: 6, ch: 3, p: 2, pos: [-0.95, 0.5, -11.2], back: 'Finally on the train. But every coach is the same coach, and it never stops.<br><br>The passengers are all asleep. One of them is wearing my shirt.' },
  { id: 7, ch: 3, p: 6, pos: [0.95, 0.5, -17.6], back: 'I remember now. The headphones. The horn I didn\'t hear.<br><br>If you\'re reading this: when the man with the red backpack walks past you, <b>don\'t let him be you.</b>' },
].map(t => ({ ...t, front: stub(t.id + 1) }));

export const CHAPTER_INTRO = [
  { title: 'PLATFORM 0', hindi: 'प्लेटफ़ॉर्म ०', line: '11:58 PM. Shunya Road. The last local is late.', pa: 'Yatri kripya dhyan dein. The 11:58 slow local to Churchgate will arrive on Platform 0. Inconvenience is regretted.', clip: 'pa_normal' },
  { title: 'THE SUBWAY', hindi: 'सबवे', line: 'The platform let you go. The subway did not.', pa: 'Attention please. The subway to all platforms is closed. Passengers are requested... not to use the subway.', paCreepy: true },
  { title: 'THE LAST LOCAL', hindi: 'आख़िरी लोकल', line: 'You made the train. It does not stop.', pa: 'Agla station... Shunya Road. Next station... Shunya Road.', paCreepy: true },
];

let tkTex = null;
function ticketTex() {
  if (tkTex) return tkTex;
  const c = M.canvas(256, 140), g = c.getContext('2d');
  g.fillStyle = '#efe6c8'; g.fillRect(0, 0, 256, 140); g.fillStyle = '#c0281c'; g.fillRect(0, 0, 256, 26);
  g.fillStyle = '#fff'; g.font = `700 18px ${M.DEVA}`; g.textAlign = 'center'; g.fillText('भारतीय रेल', 128, 20);
  g.fillStyle = '#222'; g.font = `900 22px ${M.SANS}`; g.fillText('SHUNYA RD → CCG', 128, 58); g.font = `700 18px ${M.SANS}`; g.fillText('30.10.2016  23:58', 128, 86); g.fillText('PF 0  ·  ₹10', 128, 112);
  M.grime(g, 256, 140, 0.5, 7); tkTex = M.ctex(c); return tkTex;
}
export function makeTicketMesh() {
  const g = new THREE.Group();
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.12), new THREE.MeshStandardMaterial({ map: ticketTex(), emissive: 0xffffff, emissiveMap: ticketTex(), emissiveIntensity: 0.6, side: THREE.DoubleSide, roughness: 0.7 }));
  card.rotation.x = -1.2; card.position.y = 0.04; g.add(card);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: M.radial('rgba(255,230,160,1)', 'rgba(255,230,160,0)', 64), transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.005; g.add(glow); g.userData.glow = glow;
  return g;
}
