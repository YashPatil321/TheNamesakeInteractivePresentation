// Landmarks for the 'campus' region (see ../landmarks.ts), modelled in Blender by blender/cities_campus.py.
//   station 9 (1987, New Haven): collegiate-gothic halls, a gate tower into a courtyard, elms, and a tall tiered
//   gothic bell tower (after Harkness Tower) on the skyline; the belfry glows at night
import type { CityCtx, City } from '../landmarks';
import { mountCity } from './india';

export async function build(ctx: CityCtx): Promise<City | null> {
  const s = ctx.indices[0] ?? 9;
  const m = await mountCity(ctx, '/models/campus.glb', {
    yale: { station: s, shadow: true },
    yale_tower: { station: s, ground: true },
  });
  return {
    update(f) { m.frame(f); },
    dispose() { m.dispose(); },
  };
}
