// Landmarks for the 'suburb' region (see ../landmarks.ts): Pemberton Road, built in Blender (blender/cities_suburb.py).
// 1973 elementary school with a cupola, flagpole and school bus; the 1970s cemetery by the Gangulis' house;
// the family house in autumn (1982); the brick high school and its football field (1985); Christmas Eve (2000).
// Also exports the small set-loading kit the NYC, lake and Cleveland modules share.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loadGLB } from '../assets';
import type { CityCtx, City, CityFrame } from '../landmarks';

/* ------------------------------------------------------------------ shared set kit ------------------------------------------------------------------ */

/** Height of the scenery terrain (see scenery.ts ground): flat near the line, rising into hills behind z = -60. */
export function groundY(x: number, z: number) {
  return z < -60 ? (Math.sin(x * 0.013) + Math.sin(x * 0.031 + 1)) * 1.2 + (-z - 60) * 0.03 : 0;
}

const smoothstep = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

export interface SetMats {
  night: { value: number }; time: { value: number }; twinkle: { value: number };
  get(role: string): THREE.Material;
  dispose(): void;
}

/** Materials by role name (as named in Blender). Windows glow at night, Lights twinkle, Beacon blinks, Glow flickers. */
export function makeMats(): SetMats {
  const night = { value: 0 }, time = { value: 0 }, twinkle = { value: 1 };
  const cache = new Map<string, THREE.Material>();
  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, ...o });
  const make = (role: string): THREE.Material => {
    switch (role) {
      case 'Metal': return std({ roughness: 0.45, metalness: 0.55 });
      case 'Snow': return std({ roughness: 0.75, emissive: '#1a2230', emissiveIntensity: 0.4 });
      case 'Foliage': return std({ roughness: 0.9, flatShading: true });
      case 'Water': return std({ roughness: 0.18, metalness: 0.35 });
      case 'Window': {
        const m = new THREE.MeshBasicMaterial({ vertexColors: true });
        m.onBeforeCompile = (s) => {
          s.uniforms.uNightW = night;
          s.fragmentShader = 'uniform float uNightW;\n' + s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
            float litW = step(0.45, vColor.r);
            vec3 dayGlass = vec3(0.16, 0.2, 0.26) + vColor.rgb * 0.07;
            diffuseColor.rgb = mix(dayGlass, mix(vec3(0.05, 0.06, 0.09), vColor.rgb * 2.3, litW), uNightW);`);
        };
        m.customProgramCacheKey = () => 'cityB-window';
        return m;
      }
      case 'Lights': {
        const m = new THREE.MeshBasicMaterial({ vertexColors: true });
        m.onBeforeCompile = (s) => {
          s.uniforms.uTimeL = time; s.uniforms.uNightL = night; s.uniforms.uTw = twinkle;
          s.vertexShader = 'varying float vPh;\n' + s.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
            vec4 wpL = modelMatrix * vec4(position, 1.0); vPh = fract(sin(dot(floor(wpL.xyz * 3.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);`);
          s.fragmentShader = 'uniform float uTimeL, uNightL, uTw;\nvarying float vPh;\n' + s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
            float tw = mix(1.0, 0.35 + 0.65 * step(0.5, fract(uTimeL * (0.35 + vPh * 0.5) + vPh * 7.0)), uTw);
            diffuseColor.rgb *= (0.75 + 2.6 * uNightL) * tw;`);
        };
        m.customProgramCacheKey = () => 'cityB-lights';
        return m;
      }
      case 'Lamp': { // steady street / bridge lamps: soft by day, bright (bloom) at night
        const m = new THREE.MeshBasicMaterial({ vertexColors: true });
        m.onBeforeCompile = (s) => {
          s.uniforms.uNightP = night;
          s.fragmentShader = 'uniform float uNightP;\n' + s.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= 0.7 + 2.2 * uNightP;');
        };
        m.customProgramCacheKey = () => 'cityB-lamp';
        return m;
      }
      case 'Beacon': return new THREE.MeshBasicMaterial({ color: '#ff2a1a' });
      case 'Glow': return new THREE.MeshBasicMaterial({ vertexColors: true, color: '#ffffff' });
      default: return std({});
    }
  };
  return {
    night, time, twinkle,
    get(role) { let m = cache.get(role); if (!m) { m = make(role); m.name = 'cityB-' + role; cache.set(role, m); } return m; },
    dispose() { cache.forEach((m) => m.dispose()); cache.clear(); },
  };
}

/** Blender roles that share one material here (fewer draw calls): everything matte merges into 'Matte'. */
const OWN = new Set(['Metal', 'Snow', 'Foliage', 'Water', 'Window', 'Lights', 'Lamp', 'Beacon', 'Glow']);
const UNLIT = new Set(['Window', 'Lights', 'Lamp', 'Beacon', 'Glow']);
export const roleClass = (role: string) => (OWN.has(role) ? role : 'Matte');

/** Collects the meshes of placed Blender sets and merges them into one mesh per (role, shadow) bucket. */
export class SetBatch {
  private buckets = new Map<string, { role: string; cast: boolean; geos: THREE.BufferGeometry[] }>();
  private tmp = new THREE.Matrix4();
  private inv = new THREE.Matrix4();

  /** Add every piece under a station node, placed at (x, 0, z); pieces behind z = -60 follow the hills.
   *  Pieces whose base is nearer than castZ cast shadows. */
  addNode(node: THREE.Object3D, x: number, z = 0, castZ = -48, opts: { follow?: boolean; dy?: number } = {}) {
    node.updateMatrixWorld(true);
    this.inv.copy(node.matrixWorld).invert();
    const base = new THREE.Vector3();
    for (const piece of node.children) {
      base.copy(piece.position);
      const wx = x + base.x, wz = z + base.z;
      const dy = (opts.dy ?? 0) + (opts.follow === false ? 0 : groundY(wx, wz));
      const place = new THREE.Matrix4().makeTranslation(x, dy, z);
      piece.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.Material;
        const role = roleClass((mat?.name || 'Paint').replace(/\.\d+$/, ''));
        this.tmp.multiplyMatrices(this.inv, m.matrixWorld).premultiply(place);
        this.push(role, wz > castZ, m.geometry, this.tmp);
      });
    }
  }

  /** Add a raw geometry (already in world space unless a matrix is given). */
  push(role: string, cast: boolean, src: THREE.BufferGeometry, matrix?: THREE.Matrix4) {
    const n = src.attributes.position.count;
    // copy into plain float xyz attributes (Draco decodes to assorted layouts; colours may be RGBA / normalized)
    const xyz = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
      const o = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { o[i * 3] = a.getX(i); o[i * 3 + 1] = a.getY(i); o[i * 3 + 2] = a.getZ(i); }
      return new THREE.BufferAttribute(o, 3);
    };
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', xyz(src.attributes.position));
    if (src.attributes.color) g.setAttribute('color', xyz(src.attributes.color));
    else g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    if (src.attributes.normal) g.setAttribute('normal', xyz(src.attributes.normal));
    if (src.index) g.setIndex(Array.from(src.index.array as ArrayLike<number>));
    const ng = g.index ? g.toNonIndexed() : g;
    if (ng !== g) g.dispose();
    if (matrix) ng.applyMatrix4(matrix);
    if (!ng.attributes.normal) ng.computeVertexNormals();
    if (UNLIT.has(role)) cast = false; // glowing parts never cast; one bucket each
    const key = role + (cast ? '|c' : '|n');
    let b = this.buckets.get(key); if (!b) { b = { role, cast, geos: [] }; this.buckets.set(key, b); }
    b.geos.push(ng);
  }

  build(scene: THREE.Scene, mats: SetMats) {
    const meshes: THREE.Mesh[] = [];
    let tris = 0;
    for (const b of this.buckets.values()) {
      const g = mergeGeometries(b.geos, false);
      b.geos.forEach((x) => x.dispose());
      if (!g) continue;
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mats.get(b.role));
      const unlit = UNLIT.has(b.role);
      m.castShadow = b.cast && !unlit; m.receiveShadow = !unlit;
      m.name = `cityB-${b.role}${b.cast ? '-near' : ''}`;
      m.matrixAutoUpdate = false; m.updateMatrix();
      scene.add(m); meshes.push(m);
      tris += g.attributes.position.count / 3;
    }
    this.buckets.clear();
    return { meshes, tris };
  }
}

/** Find the named station nodes in a loaded set. */
export async function loadSet(url: string) {
  const gltf = await loadGLB(url);
  const nodes = new Map<string, THREE.Object3D>();
  gltf.scene.traverse((o) => { if (o.name.startsWith('S_')) nodes.set(o.name, o); });
  return nodes;
}

export function setCity(scene: THREE.Scene, meshes: THREE.Mesh[], mats: SetMats, extra?: (f: CityFrame) => void, disposeExtra?: () => void): City {
  const has = (r: string) => meshes.some((m) => m.name.startsWith(`cityB-${r}`));
  const beacon = has('Beacon') ? (mats.get('Beacon') as THREE.MeshBasicMaterial) : null;
  const glow = has('Glow') ? (mats.get('Glow') as THREE.MeshBasicMaterial) : null;
  return {
    update(f) {
      mats.night.value = smoothstep(0.12, 0.6, f.dark);
      const t = (mats.time.value = f.now * 0.001);
      if (beacon) beacon.color.setRGB(1, 0.16, 0.1).multiplyScalar(((t * 0.8) % 1) < 0.18 ? 3.2 : 0.25);
      if (glow) glow.color.setScalar(1.6 + 0.9 * mats.night.value + 0.25 * Math.sin(t * 7.3) + 0.2 * Math.sin(t * 3.1 + 1));
      extra?.(f);
    },
    dispose() {
      for (const m of meshes) { scene.remove(m); m.geometry.dispose(); }
      mats.dispose(); disposeExtra?.();
    },
  };
}

/* ------------------------------------------------------------------ Pemberton Road ------------------------------------------------------------------ */

// station order within the region -> set node (4: school, 5: cemetery, 6: the house in 1982, 7: high school, 14: Christmas)
const NODES = ['S_school', 'S_cemetery', 'S_street', 'S_highschool', 'S_christmas'];

export async function build(ctx: CityCtx): Promise<City | null> {
  const nodes = await loadSet('/models/suburb.glb');
  const mats = makeMats();
  const batch = new SetBatch();
  ctx.indices.forEach((si, k) => {
    const snow = !!ctx.stations[si].snow;
    const name = snow ? 'S_christmas' : NODES[Math.min(k, NODES.length - 2)];
    const node = nodes.get(name);
    if (node) batch.addNode(node, si * ctx.gap, 0);
  });
  const { meshes } = batch.build(ctx.scene, mats);
  return setCity(ctx.scene, meshes, mats);
}
