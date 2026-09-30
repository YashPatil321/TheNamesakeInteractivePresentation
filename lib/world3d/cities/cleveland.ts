// Landmarks for the 'cleveland' region (see ../landmarks.ts), built in Blender (blender/cities_cleveland.py):
// a steel mill on the near bank (casting sheds, blast furnace and stoves, stacks, ore bridge, gas holder),
// the Cuyahoga under a vertical-lift bridge and a high-level arch bridge, a lake freighter, and downtown
// behind with a Terminal Tower-like skyscraper. Furnace glow flickers; aircraft beacons blink.
import type { CityCtx, City } from '../landmarks';
import { loadSet, makeMats, SetBatch, setCity } from './suburb';

export async function build(ctx: CityCtx): Promise<City | null> {
  const nodes = await loadSet('/models/cleveland.glb');
  const node = nodes.get('S_cleveland');
  if (!node) return null;
  const mats = makeMats();
  const batch = new SetBatch();
  for (const si of ctx.indices) batch.addNode(node, si * ctx.gap, 0, -50);
  const { meshes } = batch.build(ctx.scene, mats);
  return setCity(ctx.scene, meshes, mats);
}
