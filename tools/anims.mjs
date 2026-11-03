
// v3.1.1: compact anims.glb: one skeleton instead of 22 copies, rotation keys as normalized int16, unused clips + footstep tracks dropped
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import fs from 'fs';
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const [src, dst, dropS = ''] = process.argv.slice(2); const drop = dropS.split(',').filter(Boolean);
const doc = await io.read(src); const root = doc.getRoot();
const scenes = root.listScenes(); const canon = new Map();
const strip = (n) => n.replace(/_\d+$/, '');
for (const sc of scenes) sc.traverse(n => { if (!canon.has(strip(n.getName()))) canon.set(strip(n.getName()), n); });
const inS0 = new Set(); scenes[0].traverse(n => inS0.add(n));
for (const [nm, n] of canon) { if (!inS0.has(n)) { const p = n.getParentNode(); if (p) p.removeChild(n); for (const sc of scenes) if (sc.listChildren().includes(n)) sc.removeChild(n); scenes[0].addChild(n); } }
let moved = 0, footsteps = 0, q16 = 0;
for (const a of root.listAnimations()) {
  if (drop.includes(a.getName())) { a.dispose(); continue; }
  for (const ch of a.listChannels()) {
    const t = ch.getTargetNode(); if (!t) continue; const nm = strip(t.getName());
    if (/Footsteps/.test(nm)) { const s = ch.getSampler(); ch.dispose(); s.dispose(); footsteps++; continue; }
    const c = canon.get(nm); if (!c) throw new Error('no canonical node for ' + t.getName());
    if (c !== t) { ch.setTargetNode(c); moved++; }
  }
}
for (const a of root.listAnimations()) for (const ch of a.listChannels()) {
  if (ch.getTargetPath() !== 'rotation') continue; const out = ch.getSampler().getOutput(); const arr = out.getArray();
  if (!(arr instanceof Float32Array)) continue;
  const i16 = new Int16Array(arr.length); for (let i = 0; i < arr.length; i++) i16[i] = Math.max(-32767, Math.min(32767, Math.round(arr[i] * 32767)));
  out.setArray(i16).setNormalized(true); q16++;
}
for (const s of scenes.slice(1)) s.dispose();
await doc.transform(prune({ keepLeaves: true }), dedup(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(dst, doc);
console.log('moved', moved, 'footsteps', footsteps, 'q16', q16, 'nodes', root.listNodes().length, fs.statSync(src).size, '->', fs.statSync(dst).size);
