// Landmarks for the 'lake' region (see ../landmarks.ts), built in Blender (blender/cities_lake.py):
// the Ratliffs' shingled lake house in New Hampshire with its screened porch, fieldstone chimney, dock, canoes,
// Adirondack chairs round a fire ring, a swim float and a pine island. The water itself is laid by scenery.ts.
import * as THREE from 'three';
import type { CityCtx, City } from '../landmarks';
import { loadSet, makeMats, SetBatch, setCity } from './suburb';

export async function build(ctx: CityCtx): Promise<City | null> {
  const nodes = await loadSet('/models/lake.glb');
  const node = nodes.get('S_lake');
  if (!node) return null;
  const mats = makeMats();
  const batch = new SetBatch();
  // pieces sit on the flat near the line / in the lake dip, so they don't follow the far hills
  for (const si of ctx.indices) batch.addNode(node, si * ctx.gap, 0, -50, { follow: false });
  const { meshes } = batch.build(ctx.scene, mats);
  const glow = mats.get('Glow') as THREE.MeshBasicMaterial;
  return setCity(ctx.scene, meshes, mats, (f) => {
    // the fire ring by the water flickers, brighter after dusk
    glow.color.setScalar(1.2 + 1.6 * mats.night.value + 0.35 * Math.sin(f.now * 0.011) * Math.sin(f.now * 0.0047));
  });
}
