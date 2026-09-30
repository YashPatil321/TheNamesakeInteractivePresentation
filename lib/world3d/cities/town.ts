// Landmarks for the 'town' region (see ../landmarks.ts), modelled in Blender by blender/cities_town.py.
//   stations 2 & 3 (1968, Cambridge, MA): triple-deckers + white church steeple + the Charles with a domed hall beyond (2);
//     red-brick bowfront rows, a railed green and a brick clock tower with a blue cupola (3)
//   station 8 (1986, near Boston): granite courthouse with portico and dome, brownstone rows, a flag
import type { CityCtx, City } from '../landmarks';
import { mountCity } from './india';

export async function build(ctx: CityCtx): Promise<City | null> {
  const [a, b, c] = [ctx.indices[0] ?? 2, ctx.indices[1] ?? 3, ctx.indices[2] ?? 8];
  const m = await mountCity(ctx, '/models/town.glb', {
    camA: { station: a, shadow: true },
    camA_river: { station: a },
    camA_far: { station: a, ground: true },
    camB: { station: b, shadow: true },
    court: { station: c, shadow: true },
    court_flag: { station: c, live: true },
  });
  const flag = m.live.get('court_flag');
  return {
    update(f) {
      m.frame(f);
      if (flag) {
        const t = f.now * 0.001;
        flag.rotation.y = Math.sin(t * 1.7) * 0.18 + Math.sin(t * 4.1) * 0.05;
        flag.scale.x = 0.92 + 0.08 * Math.sin(t * 2.3);
      }
    },
    dispose() { m.dispose(); },
  };
}
