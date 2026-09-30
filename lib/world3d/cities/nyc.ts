// Landmarks for the 'nyc' region (see ../landmarks.ts), built in Blender (blender/cities_nyc.py).
// Late 1990s: an avenue of yellow cabs, brownstones with stoops, walk-ups with fire escapes and water towers,
// Empire State- and Chrysler-like towers behind. ~2000: a Brooklyn Bridge-like span over the river, downtown lit beyond.
import type { CityCtx, City } from '../landmarks';
import { loadSet, makeMats, SetBatch, setCity } from './suburb';

const NODES = ['S_midtown', 'S_bridge'];

export async function build(ctx: CityCtx): Promise<City | null> {
  const nodes = await loadSet('/models/nyc.glb');
  const mats = makeMats();
  const batch = new SetBatch();
  ctx.indices.forEach((si, k) => {
    const node = nodes.get(NODES[Math.min(k, NODES.length - 1)]);
    if (node) batch.addNode(node, si * ctx.gap, 0, -40);
  });
  const { meshes } = batch.build(ctx.scene, mats);
  return setCity(ctx.scene, meshes, mats);
}
