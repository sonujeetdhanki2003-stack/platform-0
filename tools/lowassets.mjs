
// v3.1.1 asset pipeline: Low-tier (phone) avatars + props with small textures / lighter meshes; prune unused animation clips
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress, simplify, weld, meshopt, prune, dedup, resample } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs'; import path from 'path';
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const [mode, src, dst, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map(a => a.split('=')));
const doc = await io.read(src);
if (mode === 'anims') {
  const drop = (opt.drop || '').split(',').filter(Boolean);
  for (const a of doc.getRoot().listAnimations()) if (drop.includes(a.getName())) a.dispose();
  await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
} else {
  const col = +(opt.col || 512), nrm = +(opt.nrm || 256), oth = +(opt.oth || 256), q = +(opt.q || 78);
  await doc.transform(
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [oth, oth], pattern: /opacity|hair/i, quality: q }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [col, col], slots: /^baseColor/, quality: q }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [nrm, nrm], slots: /^normal/, quality: 85 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [oth, oth], slots: /^(?!baseColor|normal)/, quality: q }),
  );
  if (+opt.ratio < 1) await doc.transform(weld({}), simplify({ simplifier: MeshoptSimplifier, ratio: +opt.ratio, error: +(opt.err || 0.002), lockBorder: true }));
  await doc.transform(dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
}
fs.mkdirSync(path.dirname(dst), { recursive: true });
await io.write(dst, doc);
console.log(path.basename(dst), fs.statSync(src).size, '->', fs.statSync(dst).size);
