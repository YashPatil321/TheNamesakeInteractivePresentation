// Landmarks for the 'india' region (see ../landmarks.ts), modelled in Blender by blender/cities_india.py.
//   station 0 (1961, night near Jamshedpur): mud-and-thatch village, banyan, shrine, lanterns, paddies, steelworks on the horizon
//   station 1 (1967, Calcutta): colonial street with balconies, yellow taxis and a tram, the Hooghly ghats,
//     a cantilever truss bridge and a white domed memorial on the far bank
// Also exports the small mounting kit (mountCity) that town.ts and campus.ts share.
import * as THREE from 'three';
import type { CityCtx, City, CityFrame } from '../landmarks';
import { loadGLB, shadowAll } from '../assets';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { smooth, type Shared } from '../kit';

/* ------------------------------------------------------------------ shared kit */

/** Height of the procedural terrain (mirrors the ground grid in scenery.ts: flat to z=-52, rising behind). */
const ZS = [-52, -75, -100, -130, -170, -230, -300];
const hRow = (x: number, z: number) => (z < -60 ? (Math.sin(x * 0.013) + Math.sin(x * 0.031 + 1)) * 1.2 + (-z - 60) * 0.03 : 0);
export function groundY(x: number, z: number) {
  if (z >= ZS[0]) return 0;
  for (let k = 0; k < ZS.length - 1; k++) {
    const a = ZS[k], b = ZS[k + 1];
    if (z <= a && z >= b) { const t = (a - z) / (a - b); return hRow(x, a) * (1 - t) + hRow(x, b) * t; }
  }
  return hRow(x, ZS[ZS.length - 1]);
}

export interface GroupPlace {
  station: number;
  /** drop the group's origin onto the terrain */
  ground?: boolean;
  /** keep as its own object (to animate it) instead of merging into the static batch */
  live?: boolean;
  shadow?: boolean;
}

export interface Mounted {
  root: THREE.Group;
  live: Map<string, THREE.Object3D>;
  mats: Map<string, THREE.MeshStandardMaterial>;
  /** night glow / water shimmer / lantern flicker, driven from CityFrame */
  frame(f: CityFrame): void;
  dispose(): void;
}

const MAX_SETS = 4;

/**
 * One shader patch for every city material:
 *  - per-set dissolve: each station's set carries an `aSet` index; uVis[set] (0..1) stipples it in/out, so each stop
 *    shows only its own landmarks and neighbouring cities cross-fade while the train travels
 *  - emissive = vertex colour (each window keeps its own lit/unlit tint) for Glass and Lamp
 *  - animated ripple normals for Water
 */
function patchCity(m: THREE.MeshStandardMaterial, sh: Shared, uVis: { value: number[] }, kind: 'plain' | 'emissive' | 'water') {
  m.onBeforeCompile = (s) => {
    s.uniforms.uVis = uVis;
    s.uniforms.uTime = sh.uTime;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSet;\nvarying float vSet;\nvarying vec3 vCityW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvSet = aSet;\nvCityW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    let f = s.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uVis[${MAX_SETS}];\nuniform float uTime;\nvarying float vSet;\nvarying vec3 vCityW;`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float cityVis = vSet < 0.5 ? uVis[0] : vSet < 1.5 ? uVis[1] : vSet < 2.5 ? uVis[2] : uVis[3];
        if (cityVis < 0.999) {
          float hq = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
          if (hq >= cityVis) discard;
        }`);
    if (kind === 'emissive') f = f.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\n totalEmissiveRadiance *= vColor.rgb;\n#endif');
    if (kind === 'water') f = f.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec2 wq = vCityW.xz;
        float w1 = sin(wq.x * 0.9 + wq.y * 0.35 + uTime * 1.3) + sin(wq.x * 0.37 - wq.y * 1.1 - uTime * 0.9);
        float w2 = cos(wq.y * 1.4 + wq.x * 0.2 + uTime * 1.1) + cos(wq.x * 1.7 + uTime * 0.7);
        normal = normalize(normal + (viewMatrix * vec4(w1 * 0.07, 0.0, w2 * 0.07, 0.0)).xyz);`);
    s.fragmentShader = f;
  };
  m.customProgramCacheKey = () => `cityA-${kind}`;
}

/** Keep only position/normal/color(rgb float)/aSet so every piece merges. */
function normalise(g: THREE.BufferGeometry, set: number) {
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  const n = g.attributes.position.count;
  const c = g.attributes.color;
  const a = new Float32Array(n * 3).fill(1);
  if (c) for (let i = 0; i < n; i++) { a[i * 3] = c.getX(i); a[i * 3 + 1] = c.getY(i); a[i * 3 + 2] = c.getZ(i); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(a, 3));
  if (!g.attributes.normal) g.computeVertexNormals();
  g.setAttribute('aSet', new THREE.Float32BufferAttribute(new Float32Array(n).fill(set), 1));
  if (!g.index) g.setIndex([...Array(n).keys()]);
  return g;
}

/**
 * Load a Blender city GLB and mount its groups (top-level empties) at their stations. Static groups are
 * merged into one mesh per material for the whole region (few draw calls); `live` groups stay separate.
 */
export async function mountCity(ctx: CityCtx, url: string, place: Record<string, GroupPlace>): Promise<Mounted> {
  const gltf = await loadGLB(url);
  const root = new THREE.Group();
  root.name = `city:${url}`;
  const live = new Map<string, THREE.Object3D>();
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const geos: THREE.BufferGeometry[] = [];
  const batches = new Map<string, { list: THREE.BufferGeometry[]; shadow: boolean }>();
  // one dissolve slot per station this region dresses
  const stationsUsed = [...new Set(Object.values(place).map((p) => p.station))].slice(0, MAX_SETS);
  const uVis = { value: new Array(MAX_SETS).fill(1) as number[] };
  const setOf = (station: number) => Math.max(0, stationsUsed.indexOf(station));

  // one material per role, shared by batches and live groups
  const srcMats = new Set<THREE.Material>();
  const matFor = (src: THREE.Material): THREE.MeshStandardMaterial => {
    srcMats.add(src);
    const name = src.name || 'Plaster';
    let m = mats.get(name);
    if (m) return m;
    const s = src as THREE.MeshStandardMaterial;
    m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: s.roughness ?? 0.85, metalness: s.metalness ?? 0 });
    m.name = name;
    let kind: 'plain' | 'emissive' | 'water' = 'plain';
    if (name === 'Glass') {
      m.color.setRGB(0.2, 0.22, 0.27); m.roughness = 0.18; m.metalness = 0.4;
      m.emissive.setRGB(1, 1, 1); m.emissiveIntensity = 0;
      kind = 'emissive';
    } else if (name === 'Lamp') {
      m.emissive.setRGB(1, 1, 1); m.emissiveIntensity = 0.4;
      kind = 'emissive';
    } else if (name === 'Water') {
      m.roughness = 0.08; m.metalness = 0.35; m.envMapIntensity = 1.2;
      kind = 'water';
    } else if (name === 'Foliage' || name === 'Thatch') {
      m.flatShading = true; m.roughness = 0.95;
    } else if (name === 'Metal') {
      m.roughness = 0.5; m.metalness = 0.55;
    }
    patchCity(m, ctx.shared, uVis, kind);
    mats.set(name, m);
    return m;
  };

  gltf.scene.updateMatrixWorld(true);
  const tmp = new THREE.Matrix4();
  for (const g of [...gltf.scene.children]) {
    const p = place[g.name];
    if (!p) continue;
    const off = new THREE.Vector3(p.station * ctx.gap, 0, 0);
    if (p.ground) off.y = groundY(g.position.x + off.x, g.position.z);
    if (p.live) {
      g.position.add(off);
      g.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh) { normalise(mesh.geometry, setOf(p.station)); geos.push(mesh.geometry); mesh.material = matFor(mesh.material as THREE.Material); } });
      if (p.shadow) shadowAll(g, true, false);
      root.add(g);
      live.set(g.name, g);
      continue;
    }
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = matFor(mesh.material as THREE.Material);
      const key = mat.name; // one batch per material for the whole region (few draw calls)
      let b = batches.get(key);
      if (!b) { b = { list: [], shadow: false }; batches.set(key, b); }
      if (p.shadow) b.shadow = true;
      const geo = mesh.geometry.clone();
      tmp.makeTranslation(off.x, off.y, off.z).multiply(mesh.matrixWorld);
      geo.applyMatrix4(tmp);
      b.list.push(normalise(geo, setOf(p.station)));
      mesh.geometry.dispose();
    });
  }
  for (const [key, b] of batches) {
    const geo = mergeGeometries(b.list, false);
    b.list.forEach((g) => g.dispose());
    if (!geo) continue;
    geo.computeBoundingSphere();
    geos.push(geo);
    const mesh = new THREE.Mesh(geo, mats.get(key)!);
    mesh.castShadow = b.shadow; mesh.receiveShadow = true;
    mesh.name = key;
    root.add(mesh);
  }
  ctx.scene.add(root);
  srcMats.forEach((sm) => sm.dispose()); // the GLB's own materials were replaced by the shared role materials

  const glass = mats.get('Glass'), lamp = mats.get('Lamp');
  return {
    root, live, mats,
    frame(f) {
      // each set shows around its own station and dissolves out over the second half of the ride away from it
      let any = false;
      stationsUsed.forEach((st, k) => {
        const d = Math.abs(f.trainX - st * ctx.gap);
        uVis.value[k] = 1 - smooth(0.5 * ctx.gap, 0.85 * ctx.gap, d);
        if (uVis.value[k] > 0) any = true;
      });
      root.visible = any;
      const night = smooth(0.15, 0.7, f.dark);
      if (glass) glass.emissiveIntensity = 0.04 + 2.1 * night;
      if (lamp) {
        const fl = 0.9 + 0.06 * Math.sin(f.now * 0.017) + 0.04 * Math.sin(f.now * 0.043 + 1.3);
        lamp.emissiveIntensity = (0.5 + 3.2 * night) * fl;
      }
    },
    dispose() {
      ctx.scene.remove(root);
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
}

/* ------------------------------------------------------------------ India */

export async function build(ctx: CityCtx): Promise<City | null> {
  const [s0, s1] = [ctx.indices[0] ?? 0, ctx.indices[1] ?? 1];
  const m = await mountCity(ctx, '/models/india.glb', {
    village: { station: s0, shadow: true },
    village_far: { station: s0, ground: true },
    calcutta: { station: s1, shadow: true },
    calcutta_far: { station: s1, ground: true },
    calcutta_tram: { station: s1, live: true, shadow: true },
    calcutta_boats: { station: s1, live: true },
  });
  const tram = m.live.get('calcutta_tram'), boats = m.live.get('calcutta_boats');
  const tramX0 = tram?.position.x ?? 0, boatY0 = boats?.position.y ?? 0;
  return {
    update(f) {
      m.frame(f);
      const t = f.now * 0.001;
      if (tram) {
        // trundles up and down the street, easing into each end
        const ph = (Math.sin(t * 0.09) + 1) / 2;
        tram.position.x = tramX0 - 46 + ph * 70;
      }
      if (boats) { boats.position.y = boatY0 + Math.sin(t * 1.1) * 0.06; boats.rotation.z = Math.sin(t * 0.8) * 0.01; }
    },
    dispose() { m.dispose(); },
  };
}
