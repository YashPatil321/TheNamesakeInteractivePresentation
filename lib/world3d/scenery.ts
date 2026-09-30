// Static world: ground, hills, track, stations (platform, lamps, sign boards) and instanced scenery per region.
import * as THREE from 'three';
import type { Station, Region } from '../stations';
import { NAME_COLORS } from '../stations';
import { GAP, rng, place, paint, boxMM, merge, composeInto, clamp, patchWindows, patchSway, canvasTex, gravelTexture, type Shared } from './kit';
import { RAIL_TOP } from './train';

export const X_MIN = -4 * GAP, X_MAX = 19 * GAP;
const BRAID_X0 = 13.5 * GAP, BRAID_X1 = 17.5 * GAP;
export const SIGN_DX = -9, SIGN_Y = 6.05, SIGN_Z = -4.8;
export const LAMP_DX = [-22.5, 5.5], LAMP_Z = -2.55, LAMP_Y = 5.05;

const GROUND: Record<Region, string> = { india: '#8b6b47', town: '#56603c', suburb: '#5b7d45', campus: '#4f6c3f', nyc: '#4a4b50', lake: '#44643f', cleveland: '#514d46' };

export interface SignRef { pivot: THREE.Group; station: number }
export interface SceneryParts {
  signs: SignRef[];
  pickables: THREE.Mesh[];
  bulbs: THREE.InstancedMesh; pools: THREE.InstancedMesh; lampCount: number;
  lampPos: THREE.Vector3[];
  railGlow: THREE.MeshBasicMaterial;
  water: THREE.ShaderMaterial | null;
  stacks: THREE.Vector3[];
  highlight: THREE.Mesh; highlightMat: THREE.MeshBasicMaterial;
  atlas: THREE.CanvasTexture; drawSign: (i: number, visited: boolean, cur: boolean, fonts: { display: string; mono: string }) => void;
  mats: { building: THREE.MeshStandardMaterial; plain: THREE.MeshStandardMaterial; foliage: THREE.MeshStandardMaterial; grass: THREE.MeshStandardMaterial };
  dispose(): void;
}

/* ---------- unit geometries for instancing (base at y = 0) ---------- */
function unitGeos() {
  const box = paint(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), '#fff');
  const roof = (() => {
    const s = new THREE.Shape([new THREE.Vector2(-0.56, 0), new THREE.Vector2(0.56, 0), new THREE.Vector2(0, 1)]);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.06, bevelEnabled: false });
    g.translate(0, 0, -0.53); g.rotateY(Math.PI / 2);
    return paint(g, '#fff');
  })();
  const dome = paint(new THREE.SphereGeometry(0.5, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), '#fff');
  const cone = paint(new THREE.ConeGeometry(0.5, 1, 8).translate(0, 0.5, 0), '#fff');
  const cyl = paint(new THREE.CylinderGeometry(0.5, 0.5, 1, 12).translate(0, 0.5, 0), '#fff');
  const temple = paint(new THREE.LatheGeometry([[0.5, 0], [0.5, 0.3], [0.44, 0.33], [0.44, 0.45], [0.4, 0.5], [0.36, 0.66], [0.27, 0.8], [0.15, 0.9], [0.1, 0.94], [0.13, 0.96], [0.02, 1.04], [0, 1.05]].map(([r, y]) => new THREE.Vector2(r, y)), 8), '#fff');
  const stack = merge([
    paint(new THREE.CylinderGeometry(0.36, 0.5, 1, 12).translate(0, 0.5, 0), '#fff'),
    paint(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 12).translate(0, 0.85, 0), '#d8d4cc'),
    paint(new THREE.CylinderGeometry(0.385, 0.385, 0.04, 12).translate(0, 0.93, 0), '#d8d4cc'),
  ]);
  const spire = merge([
    paint(new THREE.ConeGeometry(0.42, 1.5, 8).translate(0, 0.75, 0), '#fff'),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => paint(new THREE.ConeGeometry(0.1, 0.7, 6).translate(a * 0.45, 0.35, b * 0.45), '#fff')),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => paint(new THREE.BoxGeometry(0.12, 0.2, 0.12).translate(a * 0.45, 0.0, b * 0.45), '#fff')),
  ]);
  const crenel = merge([...Array(12)].map((_, k) => {
    const side = k % 4, t = (Math.floor(k / 4) + 0.5) / 3 - 0.5;
    const x = side < 2 ? t : (side === 2 ? -0.48 : 0.48), z = side < 2 ? (side === 0 ? -0.48 : 0.48) : t;
    return paint(new THREE.BoxGeometry(0.1, 0.07, 0.1).translate(x, 0.035, z), '#fff');
  }));
  const tree = merge([
    paint(new THREE.CylinderGeometry(0.1, 0.15, 1.6, 6).translate(0, 0.8, 0), '#5a4030'),
    paint(new THREE.IcosahedronGeometry(0.95, 0).translate(0, 2.25, 0), '#4f7a3a'),
    paint(new THREE.IcosahedronGeometry(0.72, 0).translate(0.55, 1.85, 0.3), '#5e8b44'),
    paint(new THREE.IcosahedronGeometry(0.66, 0).translate(-0.45, 1.95, -0.32), '#456e37'),
  ]);
  const pine = merge([
    paint(new THREE.CylinderGeometry(0.08, 0.12, 0.9, 5).translate(0, 0.45, 0), '#4a3526'),
    paint(new THREE.ConeGeometry(1.0, 1.7, 7).translate(0, 1.35, 0), '#2d4c35'),
    paint(new THREE.ConeGeometry(0.78, 1.45, 7).translate(0, 2.2, 0), '#34563c'),
    paint(new THREE.ConeGeometry(0.52, 1.2, 7).translate(0, 3.0, 0), '#3a5f42'),
  ]);
  const palm = (() => {
    const parts: THREE.BufferGeometry[] = [];
    let x = 0, y = 0;
    for (let k = 0; k < 6; k++) {
      const nx = 0.07 * (k + 1) * (k + 1) * 0.12;
      parts.push(paint(new THREE.CylinderGeometry(0.1, 0.13, 0.85, 6).translate(0, 0.42, 0).rotateZ(-(nx - x) * 1.2).translate(x, y, 0), k % 2 ? '#7a6048' : '#6b523d'));
      x = nx; y += 0.82;
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const f = new THREE.ConeGeometry(0.2, 2.0, 4).translate(0, 1.0, 0);
      f.scale(1, 1, 0.35);
      f.rotateZ(-1.95 + (k % 2) * 0.25); f.rotateY(a);
      parts.push(paint(f.translate(x, y, 0), k % 2 ? '#4f7f3a' : '#5d9142'));
    }
    parts.push(paint(new THREE.IcosahedronGeometry(0.2, 0).translate(x, y - 0.12, 0), '#5a4a2a'));
    return merge(parts);
  })();
  const bush = paint(new THREE.IcosahedronGeometry(0.7, 0).translate(0, 0.35, 0), '#fff');
  const fence = merge([
    paint(boxMM(-2, 0.35, -0.03, 2, 0.45, 0.03), '#fff'), paint(boxMM(-2, 0.75, -0.03, 2, 0.85, 0.03), '#fff'),
    ...[...Array(10)].map((_, k) => paint(boxMM(-1.9 + k * 0.4, 0, -0.05, -1.82 + k * 0.4, 1.05, 0.05), '#fff')),
  ]);
  const tower = merge([ // water tower on nyc roofs
    paint(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 10).translate(0, 0.75, 0), '#fff'),
    paint(new THREE.ConeGeometry(0.56, 0.4, 10).translate(0, 1.35, 0), '#fff'),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => paint(new THREE.BoxGeometry(0.05, 0.4, 0.05).translate(a * 0.3, 0.2, b * 0.3), '#333')),
  ]);
  return { box, block: box, roof, dome, cone, cyl, temple, stack, spire, crenel, tree, pine, palm, bush, fence, tower };
}
type Kind = keyof ReturnType<typeof unitGeos>;
const FOLIAGE: Kind[] = ['tree', 'pine', 'palm', 'bush'];

/* ---------- sign atlas: 4 x 4 cells of 512 x 256 ---------- */
function makeAtlas(stations: Station[]) {
  const tex = canvasTex(2048, 1024, (c) => { c.fillStyle = '#ece4cf'; c.fillRect(0, 0, 2048, 1024); });
  tex.anisotropy = 8;
  const draw = (i: number, visited: boolean, cur: boolean, fonts: { display: string; mono: string }) => {
    const c = (tex.image as HTMLCanvasElement).getContext('2d')!;
    const s = stations[i], x = (i % 4) * 512, y = Math.floor(i / 4) * 256;
    const lit = visited || cur;
    c.save(); c.translate(x, y);
    c.fillStyle = lit ? '#ece4cf' : '#bdb49c'; c.fillRect(0, 0, 512, 256);
    // paper grain
    const r = rng(i * 31 + 5);
    for (let k = 0; k < 260; k++) { c.fillStyle = `rgba(60,50,30,${r() * 0.05})`; c.fillRect(r() * 512, r() * 256, 2, 2); }
    c.fillStyle = NAME_COLORS[s.name]; c.fillRect(0, 0, 512, 30);
    if (s.name === 'both') { c.fillStyle = NAME_COLORS.gogol; c.fillRect(0, 0, 256, 30); c.fillStyle = NAME_COLORS.nikhil; c.fillRect(256, 0, 256, 30); }
    c.strokeStyle = 'rgba(29,27,38,.35)'; c.lineWidth = 3; c.strokeRect(10, 40, 492, 206);
    c.fillStyle = lit ? '#1d1b26' : '#57513f'; c.textAlign = 'center'; c.textBaseline = 'middle';
    let fs = 118; c.font = `${fs}px ${fonts.display}`;
    while (c.measureText(s.year).width > 440 && fs > 40) { fs -= 6; c.font = `${fs}px ${fonts.display}`; }
    c.fillText(s.year, 256, 128);
    c.font = `700 30px ${fonts.mono}`;
    const label = `${s.code} · STN ${String(i + 1).padStart(2, '0')}`;
    if ('letterSpacing' in c) (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '4px';
    c.fillText(label, 256, 214);
    if (visited) {
      c.translate(452, 72); c.rotate(-0.25);
      c.strokeStyle = 'rgba(184,56,42,.85)'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 30, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 6; c.beginPath(); c.moveTo(-13, 1); c.lineTo(-3, 12); c.lineTo(15, -12); c.stroke();
    }
    c.restore();
    tex.needsUpdate = true;
  };
  return { tex, draw };
}

class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(private x0: number, private x1: number, private z: number, private phase: number) { super(); }
  getPoint(t: number, target = new THREE.Vector3()) {
    const x = this.x0 + (this.x1 - this.x0) * t;
    const a = x * (Math.PI * 2 / 1.5) + this.phase;
    const ramp = clamp((x - this.x0) / 6, 0, 1);
    return target.set(x, RAIL_TOP + 0.01 + (0.06 + Math.sin(a) * 0.05) * ramp, this.z + Math.cos(a) * 0.075 * ramp);
  }
}

export function buildScenery(scene: THREE.Scene, stations: Station[], sh: Shared): SceneryParts {
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(o: T) => { disposables.push(o); return o; };
  const N = stations.length;
  const regionAt = (x: number) => stations[clamp(Math.round(x / GAP), 0, N - 1)].region;

  /* ---------- materials ---------- */
  const building = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 }));
  patchWindows(building, sh);
  const plain = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  const foliage = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }));
  patchSway(foliage, sh, 0.022);
  const grass = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }));
  patchSway(grass, sh, 0.16);
  const stone = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }));
  const iron = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.5 }));

  /* ---------- ground with regional colors ---------- */
  {
    const xs: number[] = []; for (let x = X_MIN; x <= X_MAX; x += 4) xs.push(x);
    const zs = [60, 30, 16, 9, 4.5, 2.6, -2.6, -6, -10, -16, -24, -36, -52, -75, -100, -130, -170, -230, -300];
    const pos: number[] = [], col: number[] = [], idx: number[] = [];
    const cA = new THREE.Color(), cB = new THREE.Color(), cc = new THREE.Color();
    const r = rng(11);
    const lakeX = stations.findIndex((s) => s.region === 'lake');
    for (const z of zs) for (const x of xs) {
      const f = x / GAP, i0 = clamp(Math.floor(f), 0, N - 1), i1 = clamp(i0 + 1, 0, N - 1);
      const t = clamp((f - i0 - 0.35) / 0.3, 0, 1);
      cA.set(stations[i0].snow ? '#dfe5ee' : GROUND[stations[i0].region]); cB.set(stations[i1].snow ? '#dfe5ee' : GROUND[stations[i1].region]);
      cc.copy(cA).lerp(cB, t).multiplyScalar(0.78 + r() * 0.12 + 0.22 * (0.5 + 0.5 * Math.sin(x * 0.045 + Math.sin(z * 0.11) * 2) * Math.sin(z * 0.07 + x * 0.013)));
      if (Math.abs(z) < 3) cc.multiplyScalar(0.8);
      let y = 0;
      if (z < -60) y = (Math.sin(x * 0.013) + Math.sin(x * 0.031 + 1)) * 1.2 + (-z - 60) * 0.03;
      if (lakeX >= 0 && Math.abs(x - lakeX * GAP) < 34 && z < -12 && z > -110) y = -0.9;
      pos.push(x, y, z); col.push(cc.r, cc.g, cc.b);
    }
    const W = xs.length;
    for (let j = 0; j < zs.length - 1; j++) for (let i = 0; i < W - 1; i++) {
      const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(keep(g), keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
    m.receiveShadow = true; scene.add(m);
  }

  /* ---------- distant ridges ---------- */
  {
    const parts: THREE.BufferGeometry[] = [];
    const layers = [{ z: -150, h: 7, a: 7, col: '#2f3d36' }, { z: -215, h: 14, a: 12, col: '#34413f' }, { z: -300, h: 24, a: 20, col: '#3b4650' }];
    layers.forEach((L, li) => {
      const pos: number[] = [], idx: number[] = [];
      let n = 0;
      for (let x = X_MIN - 200; x <= X_MAX + 200; x += 6) {
        const reg = regionAt(x);
        const k = reg === 'lake' ? 1.7 : reg === 'nyc' ? 0.55 : reg === 'india' ? 0.8 : 1;
        const hgt = (L.h + L.a * (0.5 + 0.5 * Math.sin(x * 0.011 + li * 2)) + L.a * 0.35 * Math.sin(x * 0.037 + li)) * k + Math.abs(Math.sin(x * 0.09 + li)) * 2;
        pos.push(x, -2, L.z, x, hgt, L.z + Math.sin(x * 0.05) * 6);
        if (n > 0) { const a = (n - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
        n++;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      parts.push(paint(g, L.col));
    });
    const m = new THREE.Mesh(keep(merge(parts)), keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));
    scene.add(m);
  }

  /* ---------- track: gravel bed, sleepers, rails, glowing name inlay, braid ---------- */
  const L = X_MAX - X_MIN, XC = (X_MIN + X_MAX) / 2;
  {
    const gtex = keep(gravelTexture()); gtex.repeat.set(0.5, 0.5);
    const shape = new THREE.Shape([new THREE.Vector2(-2.3, 0), new THREE.Vector2(2.3, 0), new THREE.Vector2(1.55, 0.28), new THREE.Vector2(-1.55, 0.28)]);
    const g = new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false });
    g.rotateY(Math.PI / 2); g.translate(X_MIN, 0, 0);
    const m = new THREE.Mesh(keep(g), keep(new THREE.MeshStandardMaterial({ map: gtex, color: '#b9b2a8', roughness: 1 })));
    m.receiveShadow = true; scene.add(m);
    // sleepers
    const n = Math.floor(L / 0.9);
    const sg = keep(new THREE.BoxGeometry(0.3, 0.13, 2.3));
    const sm = new THREE.InstancedMesh(sg, keep(new THREE.MeshStandardMaterial({ color: '#3b2d24', roughness: 0.95 })), n);
    const mm = new THREE.Matrix4(), r = rng(5);
    for (let k = 0; k < n; k++) { composeInto(mm, X_MIN + k * 0.9, 0.34, 0, (r() - 0.5) * 0.04, 1, 1, 1); sm.setMatrixAt(k, mm); }
    sm.receiveShadow = true; sm.computeBoundingSphere(); scene.add(sm);
    // steel rails
    const rg = merge([boxMM(X_MIN, 0.4, -0.78, X_MAX, RAIL_TOP, -0.66), boxMM(X_MIN, 0.4, 0.66, X_MAX, RAIL_TOP, 0.78)]);
    paint(rg, '#8d939c');
    const rm = new THREE.Mesh(keep(rg), keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.85 })));
    rm.receiveShadow = true; scene.add(rm);
  }
  // glowing inlay colored by whose name the track carries
  const railGlow = keep(new THREE.MeshBasicMaterial({ vertexColors: true }));
  {
    const colFor = (x: number, out: THREE.Color) => {
      const f = x / GAP, i = clamp(Math.round(f), 0, N - 1);
      const name = x > BRAID_X0 - 3 ? 'both' : stations[i].name;
      out.set(NAME_COLORS[name]);
      if (name === 'none') out.multiplyScalar(0.18);
      // soft blend at band edges
      const j = clamp(f - i > 0 ? i + 1 : i - 1, 0, N - 1), edge = Math.abs(f - i);
      if (edge > 0.42 && j !== i && x < BRAID_X0 - 3) {
        const o = new THREE.Color(NAME_COLORS[stations[j].name]); if (stations[j].name === 'none') o.multiplyScalar(0.18);
        out.lerp(o, (edge - 0.42) / 0.16 * 0.5);
      }
      return out;
    };
    const segs = Math.floor((BRAID_X0 - X_MIN) / 1.0);
    const parts: THREE.BufferGeometry[] = [];
    for (const z of [-0.72, 0.72]) {
      const g = new THREE.BoxGeometry(BRAID_X0 - X_MIN, 0.025, 0.07, segs, 1, 1);
      g.translate((X_MIN + BRAID_X0) / 2, RAIL_TOP + 0.012, z);
      const p = g.attributes.position, c = new Float32Array(p.count * 3), cc = new THREE.Color();
      for (let k = 0; k < p.count; k++) { colFor(p.getX(k), cc); c[k * 3] = cc.r; c[k * 3 + 1] = cc.g; c[k * 3 + 2] = cc.b; }
      g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
      parts.push(g);
    }
    // the braid: orange and blue strands twisting around each rail
    for (const z of [-0.72, 0.72]) for (const [col, ph] of [[NAME_COLORS.gogol, 0], [NAME_COLORS.nikhil, Math.PI]] as const) {
      const tg = new THREE.TubeGeometry(new Helix(BRAID_X0 - 3, BRAID_X1, z, ph), Math.floor((BRAID_X1 - BRAID_X0) * 6), 0.034, 5, false);
      parts.push(paint(tg, col));
    }
    const m = new THREE.Mesh(keep(merge(parts)), railGlow);
    scene.add(m);
  }

  /* ---------- telegraph poles + wires (behind the platforms) ---------- */
  {
    const poleG = keep(merge([
      paint(new THREE.CylinderGeometry(0.09, 0.13, 7.6, 6).translate(0, 3.8, 0), '#3b2f27'),
      paint(boxMM(-0.08, 6.9, -0.85, 0.08, 7.05, 0.85), '#3b2f27'),
      paint(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 5).translate(0, 7.13, -0.7), '#9fb7c0'),
      paint(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 5).translate(0, 7.13, 0.7), '#9fb7c0'),
    ]));
    const sp = 21, z0 = -12.6, n = Math.floor(L / sp) + 1;
    const pm = new THREE.InstancedMesh(poleG, plain, n);
    const mm = new THREE.Matrix4(), wires: number[] = [];
    for (let k = 0; k < n; k++) {
      const x = X_MIN + k * sp;
      composeInto(mm, x, 0, z0, 0, 1, 1, 1, 0, (k % 3 - 1) * 0.02); pm.setMatrixAt(k, mm);
      if (k > 0) for (const dz of [-0.7, 0.7]) {
        const xa = x - sp;
        for (let s = 0; s < 10; s++) {
          const t0 = s / 10, t1 = (s + 1) / 10;
          const y0 = 7.18 - Math.sin(t0 * Math.PI) * 0.75, y1 = 7.18 - Math.sin(t1 * Math.PI) * 0.75;
          wires.push(xa + sp * t0, y0, z0 + dz, xa + sp * t1, y1, z0 + dz);
        }
      }
    }
    pm.castShadow = true; pm.computeBoundingSphere(); scene.add(pm);
    const wg = keep(new THREE.BufferGeometry()); wg.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3));
    scene.add(new THREE.LineSegments(wg, keep(new THREE.LineBasicMaterial({ color: '#1a1b22', transparent: true, opacity: 0.8 }))));
  }

  /* ---------- stations: platforms, lamps, benches, signs ---------- */
  const atlas = makeAtlas(stations);
  keep(atlas.tex);
  const signMat = keep(new THREE.MeshStandardMaterial({ map: atlas.tex, emissiveMap: atlas.tex, emissive: '#ffffff', emissiveIntensity: 0.18, roughness: 0.7 }));
  const boardG = keep(paint(new THREE.BoxGeometry(5.35, 2.85, 0.16), '#1d1f27'));
  const signs: SignRef[] = [], pickables: THREE.Mesh[] = [], lampPos: THREE.Vector3[] = [];
  const pickMat = keep(new THREE.MeshBasicMaterial());
  const stoneParts: THREE.BufferGeometry[] = [], ironParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < N; i++) {
    const xs = i * GAP;
    stoneParts.push(paint(boxMM(xs - 25, 0, -6.9, xs + 8, 0.98, -1.8), '#6d6862'));
    stoneParts.push(paint(boxMM(xs - 25.05, 0.98, -2.2, xs + 8.05, 1.02, -1.75), '#d8c890'));
    stoneParts.push(paint(boxMM(xs - 25, 0.98, -6.9, xs + 8, 1.0, -2.2), '#807a72'));
    for (let k = 0; k < 11; k++) stoneParts.push(paint(boxMM(xs - 25 + k * 3, 0.999, -6.9, xs - 24.96 + k * 3, 1.003, -2.2), '#5c5852'));
    // sign posts
    for (const dx of [-2.2, 2.2]) ironParts.push(paint(boxMM(xs + SIGN_DX + dx - 0.09, 1, SIGN_Z - 0.09, xs + SIGN_DX + dx + 0.09, SIGN_Y - 1.2, SIGN_Z + 0.09), '#1d1f27'));
    ironParts.push(paint(boxMM(xs + SIGN_DX - 2.5, SIGN_Y - 1.5, SIGN_Z - 0.06, xs + SIGN_DX + 2.5, SIGN_Y - 1.38, SIGN_Z + 0.06), '#1d1f27'));
    // lamp posts
    for (const dx of LAMP_DX) {
      const lx = xs + dx;
      ironParts.push(paint(new THREE.CylinderGeometry(0.2, 0.26, 0.5, 8).translate(lx, 1.25, LAMP_Z), '#1f2129'));
      ironParts.push(paint(new THREE.CylinderGeometry(0.07, 0.09, 4.0, 8).translate(lx, 3.0, LAMP_Z), '#1f2129'));
      ironParts.push(paint(new THREE.ConeGeometry(0.34, 0.32, 8).translate(lx, LAMP_Y + 0.38, LAMP_Z), '#1f2129'));
      ironParts.push(paint(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 4).translate(lx, LAMP_Y + 0.12, LAMP_Z), '#1f2129'));
      ironParts.push(paint(new THREE.TorusGeometry(0.2, 0.025, 4, 12).rotateX(Math.PI / 2).translate(lx, LAMP_Y - 0.22, LAMP_Z), '#c9a35a'));
      lampPos.push(new THREE.Vector3(lx, LAMP_Y, LAMP_Z));
    }
    // benches
    for (const dx of [-16, -2]) {
      const bx = xs + dx;
      ironParts.push(paint(boxMM(bx - 1.1, 1.45, -6.2, bx + 1.1, 1.53, -5.7), '#5b3f2c'));
      ironParts.push(paint(boxMM(bx - 1.1, 1.6, -6.28, bx + 1.1, 2.1, -6.2), '#5b3f2c'));
      for (const s of [-1, 1]) ironParts.push(paint(boxMM(bx + s * 0.95 - 0.04, 1.0, -6.25, bx + s * 0.95 + 0.04, 1.5, -5.75), '#1f2129'));
    }
    // sign board (pivot animates on arrival)
    const pivot = new THREE.Group(); pivot.position.set(xs + SIGN_DX, SIGN_Y, SIGN_Z); scene.add(pivot);
    const board = new THREE.Mesh(boardG, iron); board.castShadow = true; pivot.add(board);
    const fg = keep(new THREE.PlaneGeometry(5.0, 2.5));
    const uv = fg.attributes.uv as THREE.BufferAttribute, u0 = (i % 4) * 0.25, v1 = 1 - Math.floor(i / 4) * 0.25;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * 0.25, v1 - 0.25 + uv.getY(k) * 0.25);
    const front = new THREE.Mesh(fg, signMat); front.position.z = 0.085; pivot.add(front);
    signs.push({ pivot, station: i });
    // pick proxies: sign (with posts) and platform
    const p1 = new THREE.Mesh(keep(boxMM(xs + SIGN_DX - 2.8, 1, SIGN_Z - 0.5, xs + SIGN_DX + 2.8, SIGN_Y + 1.5, SIGN_Z + 0.5)), pickMat);
    const p2 = new THREE.Mesh(keep(boxMM(xs - 25, 0, -6.9, xs + 8, 1.2, -1.75)), pickMat);
    for (const p of [p1, p2]) { p.visible = false; p.userData.station = i; scene.add(p); p.updateMatrixWorld(); pickables.push(p); }
  }
  {
    const m = new THREE.Mesh(keep(merge(stoneParts)), stone); m.receiveShadow = true; m.castShadow = true; scene.add(m);
    const m2 = new THREE.Mesh(keep(merge(ironParts)), iron); m2.castShadow = true; m2.receiveShadow = true; scene.add(m2);
  }
  // highlight frame behind the current sign
  const highlightMat = keep(new THREE.MeshBasicMaterial({ color: '#f2a33a', toneMapped: true }));
  const highlight = new THREE.Mesh(keep(new THREE.PlaneGeometry(5.75, 3.25)), highlightMat);
  highlight.position.z = -0.1; highlight.visible = false;
  // bulbs + light pools
  const lampCount = lampPos.length;
  const bulbs = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.17, 12, 8)), keep(new THREE.MeshBasicMaterial({ color: '#ffffff' })), lampCount);
  const poolMat = keep(new THREE.MeshBasicMaterial({ map: keep(canvasTex(128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  }, false)), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: '#ffffff' }));
  const pools = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), poolMat, lampCount);
  {
    const mm = new THREE.Matrix4(), white = new THREE.Color(1, 1, 1);
    lampPos.forEach((p, k) => {
      composeInto(mm, p.x, p.y, p.z, 0, 1, 1, 1); bulbs.setMatrixAt(k, mm); bulbs.setColorAt(k, white);
      composeInto(mm, p.x, 1.03, p.z + 0.4, 0, 8, 1, 8); pools.setMatrixAt(k, mm); pools.setColorAt(k, white);
    });
    bulbs.computeBoundingSphere(); pools.computeBoundingSphere(); pools.renderOrder = 2;
    scene.add(bulbs, pools);
  }

  /* ---------- regional scenery, instanced per station band ---------- */
  const G = unitGeos();
  Object.values(G).forEach((g) => keep(g));
  const matFor = (k: Kind) => (k === 'box' ? building : FOLIAGE.includes(k) ? foliage : plain);
  const stacks: THREE.Vector3[] = [];
  let water: THREE.ShaderMaterial | null = null;
  const tmpM = new THREE.Matrix4(), tmpC = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const s = stations[i], xs = i * GAP, r = rng(i * 7919 + 101);
    const buckets = new Map<Kind, { m: THREE.Matrix4[]; c: THREE.Color[] }>();
    const put = (k: Kind, x: number, z: number, ry: number, sx: number, sy: number, sz: number, col: THREE.ColorRepresentation, y = 0) => {
      let b = buckets.get(k); if (!b) { b = { m: [], c: [] }; buckets.set(k, b); }
      b.m.push(composeInto(new THREE.Matrix4(), x, y, z, ry, sx, sy, sz));
      const c = new THREE.Color(col);
      if (s.snow && (k === 'roof' || k === 'pine' || k === 'tree' || k === 'bush')) c.lerp(new THREE.Color('#eef2f7'), k === 'roof' ? 0.75 : 0.35);
      b.c.push(c);
    };
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    const x0 = i === 0 ? X_MIN : xs - GAP / 2, x1 = i === N - 1 ? X_MAX : xs + GAP / 2;
    const house = (x: number, z: number, w: number, d: number, h: number, wall: string, roofC: string, roofH: number, chimney = false) => {
      put('box', x, z, 0, w, h, d, wall);
      put('roof', x, z, 0, w * 1.04, roofH, d * 1.08, roofC, h);
      if (chimney) put('block', x + w * 0.28, z - d * 0.15, 0, 0.55, roofH * 0.9 + 0.6, 0.55, '#6e3a2c', h);
    };
    const tree = (x: number, z: number, sc: number) => put('tree', x, z, r() * 6.28, sc, sc * (0.9 + r() * 0.3), sc, new THREE.Color().setHSL(0.2 + r() * 0.1, 0.3, 0.78 + r() * 0.2));
    const pine = (x: number, z: number, sc: number) => put('pine', x, z, r() * 6.28, sc, sc * (1 + r() * 0.4), sc, new THREE.Color().setHSL(0.36, 0.15, 0.78 + r() * 0.2));
    // station depot behind the platform
    const depotC: Record<Region, [string, string]> = { india: ['#c9a57a', '#8a4a32'], town: ['#8a4a36', '#3b3336'], suburb: ['#d9d2c0', '#4a4f5c'], campus: ['#8f8574', '#4a4a50'], nyc: ['#6c6f78', '#3a3c44'], lake: ['#8a6a4a', '#3a3f4a'], cleveland: ['#6a5a50', '#3a3a3e'] };
    house(xs - 16, -9.3, 8, 3.4, 3.6, depotC[s.region][0], depotC[s.region][1], 1.3);
    const rowX = (from: number, to: number, fn: (x: number) => number) => { let x = from; while (x < to) x += fn(x); };
    const nearClear = (x: number) => x > xs - 27 && x < xs + 10; // keep the area around the platform open
    const tall = (x: number) => 0.3 + 0.7 * Math.pow(clamp(1 - Math.abs(x - xs) / (GAP / 2), 0, 1), 0.6); // skylines taper at band edges
    switch (s.region) {
      case 'india': {
        const walls = ['#c98f5a', '#d9b27c', '#b86f4b', '#e0c9a0', '#a8765a', '#c7a0a8', '#d6a66e'];
        rowX(x0, x1, (x) => {
          const w = 4 + r() * 4, d = 4 + r() * 3, h = 3 + r() * 4, z = -17 - r() * 8;
          if (r() < 0.2) { put('temple', x + w / 2, z - 3, r() * 0.5, 4 + r() * 2, 8 + r() * 5, 4 + r() * 2, '#b7835a'); return w + 5; }
          put('box', x + w / 2, z, 0, w, h, d, pick(walls));
          if (r() < 0.35) put('dome', x + w / 2, z, 0, w * 0.7, w * 0.55, w * 0.7, '#ece2cc', h);
          if (r() < 0.5) put('palm', x + w + 0.8, z + 3 + r() * 3, r() * 6, 1.0, 0.9 + r() * 0.5, 1.0, '#ffffff');
          return w + 1 + r() * 3;
        });
        rowX(x0, x1, (x) => { const w = 5 + r() * 7, h = 5 + r() * 9; put('box', x, -40 - r() * 25, 0, w, h, 6 + r() * 4, pick(walls)); if (r() < 0.3) put('dome', x, -45, 0, w * 0.6, w * 0.5, w * 0.6, '#e8dcc4', h); return w + 2 + r() * 6; });
        rowX(x0, x1, (x) => { if (!nearClear(x)) put('palm', x, -11.5 - r() * 3, r() * 6, 1.1, 1 + r() * 0.5, 1.1, '#ffffff'); return 5 + r() * 8; });
        for (let k = 0; k < 7; k++) put('palm', x0 + r() * (x1 - x0), -70 - r() * 30, r() * 6, 1.6, 2 + r(), 1.6, '#cfd8c8');
        break;
      }
      case 'town': {
        const walls = ['#8a4a36', '#9c5a40', '#7a4032', '#a0664a', '#b07a5a'];
        rowX(x0, x1, (x) => {
          const w = 5 + r() * 3, d = 5 + r() * 2, h = 4 + r() * 3;
          house(x + w / 2, -18 - r() * 6, w, d, h, pick(walls), pick(['#3b3336', '#4a3a36', '#3a3f4a']), 1.8 + r() * 1.2, r() < 0.7);
          if (r() < 0.4) tree(x + w + 1.5, -14 - r() * 3, 1.1 + r() * 0.5);
          return w + 1.5 + r() * 3;
        });
        // church
        const cx = x0 + (x1 - x0) * (0.2 + r() * 0.6);
        put('box', cx, -34, 0, 7, 7, 12, '#b8ad9c'); put('roof', cx, -34, Math.PI / 2, 12.4, 3.5, 7.6, '#4a4f5a', 7);
        put('box', cx, -26.5, 0, 3.2, 12, 3.2, '#b8ad9c'); put('cone', cx, -26.5, 0, 3.6, 9, 3.6, '#5a5f6a', 12);
        rowX(x0, x1, (x) => { const w = 6 + r() * 6; put('box', x, -48 - r() * 20, 0, w, 5 + r() * 7, 6, pick(walls)); return w + 1 + r() * 4; });
        rowX(x0, x1, (x) => { if (!nearClear(x)) tree(x, -12 - r() * 2, 0.9 + r() * 0.4); return 7 + r() * 9; });
        break;
      }
      case 'suburb': {
        const walls = ['#e9e4d8', '#c9d6e0', '#e6d3a8', '#b8c9b0', '#d9b8a8', '#f0ece2'];
        rowX(x0, x1, (x) => {
          const w = 6.5 + r() * 2, d = 6 + r(), h = 3.6 + r() * 1.2, z = -20 - r() * 3;
          house(x + w / 2, z, w, d, h, pick(walls), pick(['#4a4f5c', '#5a4038', '#39404a', '#6a5040']), 2.3 + r() * 0.8, r() < 0.4);
          put('fence', x + w / 2, z + d / 2 + 2.2, 0, w / 4, 0.9, 1, '#f2efe6');
          tree(x + w + 2, z + 1 - r() * 4, 1.2 + r() * 0.6);
          return w + 4 + r() * 3;
        });
        rowX(x0, x1, (x) => { tree(x, -34 - r() * 30, 1.3 + r() * 0.9); return 3 + r() * 4; });
        rowX(x0, x1, (x) => { const w = 7 + r() * 2; house(x, -52 - r() * 10, w, 6, 4, pick(walls), '#4a4f5c', 2.6); return w + 5 + r() * 6; });
        rowX(x0, x1, (x) => { if (!nearClear(x)) tree(x, -12.5 - r() * 1.5, 0.9 + r() * 0.4); return 8 + r() * 10; });
        if (s.snow) for (let k = 0; k < 8; k++) pine(x0 + r() * (x1 - x0), -30 - r() * 20, 1.3 + r() * 0.6);
        break;
      }
      case 'campus': {
        const stoneC = ['#8f8574', '#9d9380', '#7f7768', '#a39a88'];
        rowX(x0, x1, (x) => {
          if (r() < 0.35) {
            const tw = 4 + r() * 1.5, th = 11 + r() * 5, z = -24 - r() * 6, c = pick(stoneC);
            put('block', x + tw / 2, z, 0, tw, th, tw, c); put('spire', x + tw / 2, z, 0, tw, tw * 2.4, tw, '#5e5a54', th);
            return tw + 3;
          }
          const w = 10 + r() * 6, h = 7 + r() * 3, z = -22 - r() * 6, c = pick(stoneC);
          put('box', x + w / 2, z, 0, w, h, 8, c); put('crenel', x + w / 2, z, 0, w, 8, 8, c, h);
          put('roof', x + w / 2, z, 0, w * 0.96, 2.2, 7.6, '#4a4a50', h);
          return w + 2 + r() * 3;
        });
        rowX(x0, x1, (x) => { const th = (14 + r() * 8) * tall(x), tw = 5, z = -60 - r() * 20; put('block', x, z, 0, tw, th, tw, pick(stoneC)); put('spire', x, z, 0, tw, tw * 2.6, tw, '#5e5a54', th); return 16 + r() * 14; });
        rowX(x0, x1, (x) => { if (!nearClear(x)) tree(x, -13 - r() * 2, 1.2 + r() * 0.5); return 6 + r() * 7; });
        break;
      }
      case 'nyc': {
        const cols = ['#5d6470', '#7b8290', '#4a4f5a', '#8c8a84', '#a09482', '#3c4250', '#6b6660'];
        rowX(x0, x1, (x) => {
          const w = 5 + r() * 5, d = 5 + r() * 5, h = (12 + r() * 24) * tall(x), z = -26 - r() * 14, c = pick(cols);
          put('box', x + w / 2, z, 0, w, h, d, c);
          if (r() < 0.45) put('box', x + w / 2, z, 0, w * 0.65, h * 0.25, d * 0.65, c, h);
          if (r() < 0.3) put('cyl', x + w / 2, z, 0, 0.18, 6 + r() * 6, 0.18, '#2a2c33', h);
          else if (r() < 0.35) put('tower', x + w * 0.3, z, 0, 1.6, 1.6, 1.6, '#6b4a34', h);
          return w + 1 + r() * 2;
        });
        rowX(x0, x1, (x) => { const w = 6 + r() * 8, h = (26 + r() * 46) * tall(x), c = pick(cols); put('box', x, -60 - r() * 30, 0, w, h, 8, c); if (r() < 0.3) put('box', x, -60, 0, w * 0.6, h * 0.3, 5, c, h); return w + 1 + r() * 3; });
        // a landmark tower with setbacks and a spire
        if (i % 2 === 0) { const lx = xs + 18, lz = -85; put('box', lx, lz, 0, 14, 60, 14, '#8a8680'); put('box', lx, lz, 0, 10, 16, 10, '#8a8680', 60); put('box', lx, lz, 0, 6, 10, 6, '#8a8680', 76); put('cone', lx, lz, 0, 1.4, 16, 1.4, '#a0a4aa', 86); }
        rowX(x0, x1, (x) => { if (!nearClear(x)) put('bush', x, -12 - r() * 2, r() * 6, 1.2, 1, 1.2, '#6a8a58'); return 6 + r() * 6; });
        break;
      }
      case 'lake': {
        // the water, pines around it and the Ratliffs' lake house
        const wg = keep(new THREE.PlaneGeometry(66, 96, 1, 1).rotateX(-Math.PI / 2).translate(xs, -0.08, -60));
        water = keep(new THREE.ShaderMaterial({
          uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTop: { value: new THREE.Color() }, uBot: { value: new THREE.Color() }, uTime: { value: 0 }, uLight: { value: 1 }, uGlint: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() } }]),
          vertexShader: `varying vec3 vW;
            #include <fog_pars_vertex>
            void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
            }`,
          fragmentShader: `uniform vec3 uTop, uBot, uGlint, uCam; uniform float uTime, uLight; varying vec3 vW;
            #include <fog_pars_fragment>
            void main(){
              vec3 v = normalize(vW - uCam);
              float fres = pow(1.0 - clamp(-v.y, 0.0, 1.0), 4.0);
              float n = sin(vW.x * 0.8 + uTime * 1.1) * sin(vW.z * 1.4 - uTime * 0.8) + 0.6 * sin(vW.x * 2.1 - vW.z * 1.7 + uTime * 1.9) + 0.35 * sin(vW.x * 4.3 + vW.z * 3.1 - uTime * 2.7);
              vec3 col = mix(uTop * 0.6, uBot * 1.05, fres) * (0.92 + 0.08 * n);
              float g = smoothstep(1.35, 1.75, n) * (0.35 + fres);
              col += uGlint * g;
              gl_FragColor = vec4(col * uLight, 1.0);
              #include <fog_fragment>
            }`,
          fog: true,
        }));
        scene.add(new THREE.Mesh(wg, water));
        for (let k = 0; k < 60; k++) {
          const x = x0 + r() * (x1 - x0), z = -12 - r() * 100;
          const inLake = Math.abs(x - xs) < 34 && z < -11 && z > -106;
          if (inLake || (nearClear(x) && z > -14)) continue;
          pine(x, z, 1.2 + r() * 1.2);
        }
        for (let k = 0; k < 40; k++) pine(xs - 60 + r() * 120, -108 - r() * 30, 1.8 + r() * 1.2);
        house(xs + 26, -18, 9, 7, 4.2, '#8a6a4a', '#3a3f4a', 2.6, true);
        put('block', xs + 20, -13.5, 0, 0.8, 0.3, 8, '#6a5038');
        break;
      }
      case 'cleveland': {
        const cols = ['#6a5a50', '#5c5550', '#74655a', '#7a6a5e'];
        rowX(x0, x1, (x) => {
          const w = 12 + r() * 8, d = 10, h = 6 + r() * 4, z = -24 - r() * 6;
          put('box', x + w / 2, z, 0, w, h, d, pick(cols));
          for (let k = 0; k < Math.floor(w / 3); k++) put('roof', x + 1.5 + k * 3, z, Math.PI / 2, d * 0.95, 1.4, 2.6, '#4a4a4e', h);
          if (r() < 0.8) { const sx = x + w * (0.2 + r() * 0.6), sz = z - d / 2 - 2, sh2 = 16 + r() * 10; put('stack', sx, sz, 0, 1.8, sh2, 1.8, '#7a3a2e'); stacks.push(new THREE.Vector3(sx, sh2, sz)); }
          if (r() < 0.5) put('cyl', x + w + 3, z + 2, 0, 6, 4.5, 6, '#8c8f94');
          return w + 4 + r() * 4;
        });
        // downtown with a Terminal Tower-like landmark
        rowX(x0, x1, (x) => { const w = 6 + r() * 8; put('box', x, -65 - r() * 20, 0, w, (14 + r() * 22) * tall(x), 8, pick(['#5d6470', '#6b6660', '#7a7068'])); return w + 2 + r() * 4; });
        const lx = xs - 12, lz = -80;
        put('box', lx, lz, 0, 12, 34, 12, '#9a8f80'); put('box', lx, lz, 0, 8, 12, 8, '#9a8f80', 34); put('box', lx, lz, 0, 5, 8, 5, '#9a8f80', 46); put('cone', lx, lz, 0, 3, 8, 3, '#8a8078', 54);
        rowX(x0, x1, (x) => { if (!nearClear(x)) put('bush', x, -12.5 - r() * 2, r() * 6, 1.1, 0.9, 1.1, '#56644a'); return 7 + r() * 8; });
        break;
      }
    }
    for (const [k, b] of buckets) {
      const im = new THREE.InstancedMesh(G[k], matFor(k), b.m.length);
      b.m.forEach((m, j) => { im.setMatrixAt(j, m); im.setColorAt(j, b.c[j]); });
      im.castShadow = true; im.receiveShadow = true;
      im.computeBoundingSphere(); scene.add(im);
    }
  }

  /* ---------- a road alongside the line ---------- */
  {
    const ROAD: Record<Region, string> = { india: '#9a7a54', town: '#3e3e44', suburb: '#43444a', campus: '#474238', nyc: '#34353a', lake: '#6b5a44', cleveland: '#3a3a3e' };
    const pos: number[] = [], col: number[] = [], idx: number[] = [];
    const cc = new THREE.Color(), cB = new THREE.Color();
    let n = 0;
    for (let x = X_MIN; x <= X_MAX; x += 4) {
      const f = x / GAP, i0 = clamp(Math.floor(f), 0, N - 1), i1 = clamp(i0 + 1, 0, N - 1), t = clamp((f - i0 - 0.35) / 0.3, 0, 1);
      cc.set(stations[i0].snow ? '#c9d0da' : ROAD[stations[i0].region]).lerp(cB.set(stations[i1].snow ? '#c9d0da' : ROAD[stations[i1].region]), t);
      for (const z of [6.0, 6.3, 9.3, 9.6]) { pos.push(x, z === 6.0 || z === 9.6 ? 0.0 : 0.05, z); const k = z === 6.0 || z === 9.6 ? 0.85 : 1; col.push(cc.r * k, cc.g * k, cc.b * k); }
      if (n > 0) { const a = (n - 1) * 4, b = n * 4; for (let j = 0; j < 3; j++) idx.push(a + j, a + j + 1, b + j, b + j, a + j + 1, b + j + 1); }
      n++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const dashes: THREE.BufferGeometry[] = [];
    for (let x = X_MIN; x < X_MAX; x += 7) {
      const reg = regionAt(x), snowy = stations[clamp(Math.round(x / GAP), 0, N - 1)].snow;
      if (reg === 'india' || reg === 'lake' || snowy) continue;
      dashes.push(paint(boxMM(x, 0.05, 7.88, x + 3.2, 0.065, 8.02), '#b89a4a'));
    }
    const road = new THREE.Mesh(keep(merge([g, ...dashes])), stone);
    road.receiveShadow = true; scene.add(road);
  }

  /* ---------- foreground: grass tufts, rocks, fence posts rushing past near the camera ---------- */
  {
    const blade = merge([...Array(5)].map((_, k) => paint(new THREE.ConeGeometry(0.06, 0.7 + (k % 3) * 0.2, 3).translate(0, 0.35 + (k % 3) * 0.1, 0).rotateZ((k - 2) * 0.28).rotateY(k * 1.3), '#ffffff')));
    keep(blade);
    const n = Math.floor(L * 1.2), r = rng(77);
    const gm = new THREE.InstancedMesh(blade, grass, n);
    const cc = new THREE.Color();
    for (let k = 0; k < n; k++) {
      const x = X_MIN + r() * L, side = r() < 0.72; let z = side ? 2.6 + r() * 11 : -2.6 - r() * 6; if (z > 5.8 && z < 9.8) z = r() < 0.5 ? 2.6 + r() * 3 : 9.9 + r() * 3;
      const s = stations[clamp(Math.round(x / GAP), 0, N - 1)];
      if (!side && Math.abs(x - Math.round(x / GAP) * GAP + 8) < 17) { gm.setMatrixAt(k, composeInto(tmpM, x, -5, z, 0, 0.01, 0.01, 0.01)); gm.setColorAt(k, cc); continue; }
      const sc = 0.7 + r() * 0.9;
      composeInto(tmpM, x, 0, z, r() * 6, sc, sc * (0.8 + r() * 0.6), sc); gm.setMatrixAt(k, tmpM);
      cc.set(s.snow ? '#8a8a70' : GROUND[s.region]).offsetHSL(0.02, 0.08, 0.06 + r() * 0.08); gm.setColorAt(k, cc);
    }
    gm.computeBoundingSphere(); gm.receiveShadow = true; scene.add(gm);
    // rocks
    const rockG = keep(paint(new THREE.IcosahedronGeometry(0.5, 0), '#fff'));
    const rn = Math.floor(L / 3.5), rm = new THREE.InstancedMesh(rockG, plain, rn);
    for (let k = 0; k < rn; k++) {
      const x = X_MIN + r() * L, z = r() < 0.7 ? (r() < 0.5 ? 2.8 + r() * 2.8 : 10 + r() * 6) : -8 - r() * 5, sc = 0.3 + r() * 0.8;
      composeInto(tmpM, x, 0.05, z, r() * 6, sc * 1.3, sc * 0.7, sc, r(), r()); rm.setMatrixAt(k, tmpM);
      tmpC.setHSL(0.08, 0.08, 0.2 + r() * 0.14); rm.setColorAt(k, tmpC);
    }
    rm.computeBoundingSphere(); rm.castShadow = true; rm.receiveShadow = true; scene.add(rm);
    // fence posts with a single rail, close to the camera
    const postG = keep(paint(boxMM(-0.08, 0, -0.08, 0.08, 1.25, 0.08), '#fff'));
    const pn = Math.floor(L / 4.5), pmesh = new THREE.InstancedMesh(postG, plain, pn);
    for (let k = 0; k < pn; k++) { composeInto(tmpM, X_MIN + k * 4.5, 0, 11.5, 0, 1, 0.9 + ((k * 7) % 5) * 0.05, 1, 0, ((k * 13) % 7 - 3) * 0.02); pmesh.setMatrixAt(k, tmpM); pmesh.setColorAt(k, tmpC.set('#4a3a2e')); }
    pmesh.computeBoundingSphere(); pmesh.castShadow = true; scene.add(pmesh);
    const railG = keep(paint(boxMM(X_MIN, 0.85, 11.44, X_MAX, 0.93, 11.5), '#4a3a2e'));
    scene.add(new THREE.Mesh(railG, plain));
  }

  return {
    signs, pickables, bulbs, pools, lampCount, lampPos, railGlow, water, stacks, highlight, highlightMat,
    atlas: atlas.tex, drawSign: atlas.draw,
    mats: { building, plain, foliage, grass },
    dispose() { disposables.forEach((d) => d.dispose()); },
  };
}
