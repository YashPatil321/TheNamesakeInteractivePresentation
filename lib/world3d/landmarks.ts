// City landmarks built in Blender (public/models/*.glb), placed around the stations of each region
// so every stop on the line looks like its own place. Each region's module lives in ./cities/<region>.ts.
import * as THREE from 'three';
import type { Station, Region } from '../stations';
import type { Shared } from './kit';
import * as india from './cities/india';
import * as town from './cities/town';
import * as suburb from './cities/suburb';
import * as campus from './cities/campus';
import * as nyc from './cities/nyc';
import * as lake from './cities/lake';
import * as cleveland from './cities/cleveland';

export interface CityCtx {
  scene: THREE.Scene;
  stations: Station[];
  /** indices of the stations in this region */
  indices: number[];
  gap: number; // world units between stations; station i sits at x = i * gap, track along +x at z = 0, platform/sign side is -z
  shared: Shared;
}
export interface CityFrame { now: number; dark: number; trainX: number }
export interface City { update?(f: CityFrame): void; dispose(): void }
export type CityModule = { build(ctx: CityCtx): Promise<City | null> };

const MODULES: Record<Region, CityModule> = { india, town, suburb, campus, nyc, lake, cleveland };

export function addLandmarks(scene: THREE.Scene, stations: Station[], gap: number, shared: Shared) {
  const cities: City[] = [];
  let disposed = false;
  const regions = [...new Set(stations.map((s) => s.region))];
  for (const r of regions) {
    const indices = stations.map((s, i) => (s.region === r ? i : -1)).filter((i) => i >= 0);
    MODULES[r].build({ scene, stations, indices, gap, shared })
      .then((c) => { if (!c) return; if (disposed) c.dispose(); else cities.push(c); })
      .catch((e) => console.warn(`landmarks for ${r} failed to load`, e));
  }
  return {
    update(f: CityFrame) { for (const c of cities) c.update?.(f); },
    dispose() { disposed = true; cities.forEach((c) => c.dispose()); cities.length = 0; },
  };
}
