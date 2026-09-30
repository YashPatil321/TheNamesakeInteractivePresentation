// Landmarks for the 'nyc' region (see ../landmarks.ts), built in Blender (blender/cities_nyc.py).
// Late 1990s: an avenue of yellow cabs, brownstones with stoops, walk-ups with fire escapes and water towers,
// Empire State- and Chrysler-like towers behind. ~2000: a Brooklyn Bridge-like span over the river, downtown lit beyond.
import type * as THREE from 'three';
import type { CityCtx, City } from '../landmarks';
import { loadSet, makeMats, SetBatch, setCity } from './suburb';

const NODES = ['S_midtown', 'S_bridge'];

export async function build(ctx: CityCtx): Promise<City | null> {
  const nodes = await loadSet('/models/nyc.glb');
  const mats = makeMats();
  // one batch per station so a set can be hidden once the line leaves New York
  // (the ~2000 bridge skyline would otherwise loom behind the Pemberton Road Christmas house next door)
  const perStation: { x: number; meshes: THREE.Mesh[] }[] = [];
  ctx.indices.forEach((si, k) => {
    const node = nodes.get(NODES[Math.min(k, NODES.length - 1)]);
    if (!node) return;
    const batch = new SetBatch();
    batch.addNode(node, si * ctx.gap, 0, -40);
    perStation.push({ x: si * ctx.gap, meshes: batch.build(ctx.scene, mats).meshes });
  });
  const all = perStation.flatMap((p) => p.meshes);
  const lastX = Math.max(...perStation.map((p) => p.x));
  return setCity(ctx.scene, all, mats, (f) => {
    const hide = f.trainX > lastX + ctx.gap * 0.55;
    for (const p of perStation) if (p.x === lastX) for (const m of p.meshes) m.visible = !hide;
  });
}
