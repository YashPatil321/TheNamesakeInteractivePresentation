// Stylised people for the first-person rooms, built procedurally in three.js.
//
// The look is a soft, rounded "diorama" style that matches the low-poly cities and toy-like train:
// ~6.7 heads tall, clean silhouettes, simple clothing shapes, sculpted hair masses and a minimal face
// (two small dark eyes and a nose bump: nothing that invites close scrutiny).
//
// Joints never show seams: every limb segment is a tapered capsule whose end sphere is centred on its
// pivot and matches the radius of the next segment, so shoulders, elbows and knees bend like clay.
//
// Rig (unchanged contract with the rooms): root -> torso (pivots at the hips) -> neck -> head;
// torso -> armL/armR (shoulder pivots) -> foreL/foreR (elbow pivots, hand at y -0.27). Figures face +z.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type HairStyle = 'short' | 'long' | 'bob' | 'bald' | 'curly' | 'part' | 'fringe' | 'bun';

export interface FigureOpts {
  skin: THREE.ColorRepresentation; top: THREE.ColorRepresentation; bottom?: THREE.ColorRepresentation;
  hair: THREE.ColorRepresentation; hairStyle?: HairStyle;
  seated?: boolean; scale?: number; shoulders?: number; collar?: THREE.ColorRepresentation; glasses?: boolean;
  legs?: boolean; // default true; hidden legs save draw calls under desks
  sex?: 'm' | 'f'; // default: 'f' for long/bob/bun hair, otherwise 'm'
  /** 'shirt' (default when a collar colour is given) | 'sweater' | 'saree' (blouse + draped pallu + skirt, in `bottom`) */
  garment?: 'shirt' | 'sweater' | 'saree';
  moustache?: boolean;
  /** eye colour (they are tiny; dark reads best) */
  eyes?: THREE.ColorRepresentation;
}

export interface Figure {
  root: THREE.Group; torso: THREE.Group; neck: THREE.Group; head: THREE.Group;
  armL: THREE.Group; armR: THREE.Group; foreL: THREE.Group; foreR: THREE.Group;
  /** [skin, top, bottom, hair, shoe, ...]; rooms tint mats[1] (the top) */
  mats: THREE.MeshStandardMaterial[];
}

/* ---------------- shared geometry cache ---------------- */

const G: Record<string, THREE.BufferGeometry> = {};
function cached(key: string, make: () => THREE.BufferGeometry) { return G[key] || (G[key] = make()); }
/** Shared figure geometries are cached for the module's lifetime; call this from dispose(). */
export function disposeSharedGeometry() { Object.keys(G).forEach((k) => { G[k].dispose(); delete G[k]; }); }
export function isShared(g: THREE.BufferGeometry) { return Object.values(G).includes(g); }

/* ---------------- geometry helpers ---------------- */

const smoothstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function clean(g: THREE.BufferGeometry) {
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  if (g.getAttribute('uv1')) g.deleteAttribute('uv1');
  if (!g.index) g.setIndex([...Array(g.getAttribute('position').count).keys()]);
  return g;
}

/** Recomputes normals and averages them across coincident vertices (UV seams, poles) so shading stays smooth. */
function smoothNormals(g: THREE.BufferGeometry) {
  g.computeVertexNormals();
  const p = g.getAttribute('position'), n = g.getAttribute('normal');
  const map = new Map<string, number[]>();
  for (let i = 0; i < p.count; i++) {
    const k = `${Math.round(p.getX(i) * 1e4)},${Math.round(p.getY(i) * 1e4)},${Math.round(p.getZ(i) * 1e4)}`;
    const l = map.get(k); if (l) l.push(i); else map.set(k, [i]);
  }
  const v = new THREE.Vector3();
  for (const l of map.values()) {
    if (l.length < 2) continue;
    v.set(0, 0, 0);
    for (const i of l) v.x += n.getX(i), v.y += n.getY(i), v.z += n.getZ(i);
    v.normalize();
    for (const i of l) n.setXYZ(i, v.x, v.y, v.z);
  }
  return g;
}

/** Ellipsoid centred at c with radii r and Euler rotation rot. */
function ell(c: [number, number, number], r: [number, number, number], rot: [number, number, number] = [0, 0, 0], seg = 18, rings = 12) {
  const g = new THREE.SphereGeometry(1, seg, rings);
  g.scale(r[0], r[1], r[2]);
  g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rot)));
  g.translate(...c);
  return clean(g);
}

/** Tapered capsule from a (radius ra) to b (radius rb), tangent-continuous. */
function capsule(a: THREE.Vector3, b: THREE.Vector3, ra: number, rb: number, seg = 18) {
  const L = a.distanceTo(b);
  const phi = Math.asin(Math.max(-1, Math.min(1, (ra - rb) / L)));
  const pts: THREE.Vector2[] = [];
  const n = 7;
  for (let i = 0; i <= n; i++) { const t = -Math.PI / 2 + (phi + Math.PI / 2) * (i / n); pts.push(new THREE.Vector2(Math.max(0, rb * Math.cos(t)), -L + rb * Math.sin(t))); }
  for (let i = 1; i <= n; i++) { const t = phi + (Math.PI / 2 - phi) * (i / n); pts.push(new THREE.Vector2(Math.max(0, ra * Math.cos(t)), ra * Math.sin(t))); }
  pts[0].x = 0; pts[pts.length - 1].x = 0;
  const g = new THREE.LatheGeometry(pts, seg);
  const dir = new THREE.Vector3().subVectors(b, a).normalize();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir));
  g.translate(a.x, a.y, a.z);
  return smoothNormals(clean(g));
}

type Ring = [y: number, rx: number, rz: number, dz?: number];
/** Lofts closed superellipse rings (bottom to top) into one smooth capped body. */
function loft(rings: Ring[], seg = 28, n = 2.3, bump?: (x: number, y: number, z: number, th: number) => number) {
  const pos: number[] = [], idx: number[] = [];
  const e = 2 / n;
  for (const [y, rx, rz, dz = 0] of rings) {
    for (let j = 0; j < seg; j++) {
      const th = (j / seg) * Math.PI * 2;
      const s = Math.sin(th), c = Math.cos(th);
      let x = rx * Math.sign(s) * Math.pow(Math.abs(s), e), z = rz * Math.sign(c) * Math.pow(Math.abs(c), e) + dz;
      if (bump) { const b = bump(x, y, z, th); const l = Math.hypot(x, z - dz) || 1; x += (x / l) * b; z += ((z - dz) / l) * b; }
      pos.push(x, y, z);
    }
  }
  const R = rings.length;
  for (let i = 0; i < R - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * seg + j, b = i * seg + (j + 1) % seg, c = a + seg, d = b + seg;
    idx.push(a, b, d, a, d, c);
  }
  // caps: a pole slightly beyond each end ring keeps the ends rounded
  const bot = pos.length / 3; pos.push(0, rings[0][0] - 0.01, rings[0][3] ?? 0);
  const top = bot + 1; pos.push(0, rings[R - 1][0] + 0.006, rings[R - 1][3] ?? 0);
  for (let j = 0; j < seg; j++) {
    idx.push(bot, (j + 1) % seg, j);
    const o = (R - 1) * seg; idx.push(top, o + j, o + (j + 1) % seg);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function torus(r: number, tube: number, y: number, sz = 1, arc = Math.PI * 2, rotY = 0, z = 0) {
  const g = new THREE.TorusGeometry(r, tube, 8, 28, arc);
  g.rotateX(Math.PI / 2); g.rotateY(rotY); g.scale(1, 1, sz); g.translate(0, y, z);
  return clean(g);
}

const merge = (list: THREE.BufferGeometry[]) => {
  const g = mergeGeometries(list.map(clean), false)!;
  list.forEach((x) => x.dispose());
  return g;
};

/* ---------------- head & hair ---------------- */

// skull centre in head-pivot space; radii (x, y, z)
const HC = 0.11;
function headPoint(p: THREE.Vector3, fem: boolean, out = new THREE.Vector3()) {
  const RX = fem ? 0.096 : 0.1, RY = fem ? 0.121 : 0.125, RZ = fem ? 0.106 : 0.11;
  let x = p.x * RX, y = p.y * RY, z = p.z * RZ;
  if (p.y < 0) { const k = -p.y; x *= 1 - (fem ? 0.24 : 0.15) * k * k; z *= 1 - 0.1 * k * k * Math.max(0, -p.z); }
  if (p.z < 0) z *= 1 + 0.06 * smoothstep(-0.6, 0.3, p.y); // rounder back of the cranium
  if (p.z > 0) z *= 1 - 0.05 * smoothstep(0.2, 0.9, p.z) * smoothstep(-0.3, 0.3, p.y); // a gently flatter face plane
  return out.set(x, y + HC, z);
}

function sphereDirs(seg: number, rings: number) {
  const g = new THREE.SphereGeometry(1, seg, rings);
  g.rotateX(Math.PI / 2); // poles front/back: no pinching at the crown or under the chin
  return clean(g);
}

function headGeo(fem: boolean) {
  return cached('head' + fem, () => {
    const g = sphereDirs(36, 26);
    const p = g.getAttribute('position'), v = new THREE.Vector3(), o = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); headPoint(v, fem, o); p.setXYZ(i, o.x, o.y, o.z); }
    const ears = [-1, 1].map((s) => ell([s * (fem ? 0.093 : 0.097), HC - 0.012, -0.004], [0.016, 0.03, 0.022], [0, s * 0.35, 0], 12, 8));
    const nose = ell([0, HC - 0.03, (fem ? 0.101 : 0.104)], [0.011, 0.016, 0.012], [0.25, 0, 0], 12, 8);
    return merge([smoothNormals(g), ...ears, nose]);
  });
}

/** Eyes: two small dark ovals sitting on the face surface (head space). */
function eyesGeo(fem: boolean) {
  return cached('eyes' + fem, () => {
    const o = new THREE.Vector3();
    return merge([-1, 1].map((s) => {
      headPoint(new THREE.Vector3(s * 0.36, -0.02, 0.93).normalize(), fem, o);
      return ell([o.x, o.y, o.z - 0.004], [0.0105, fem ? 0.0135 : 0.0122, 0.007], [0, s * 0.35, 0], 12, 8);
    }));
  });
}

type HairSpec = { thr: (phi: number, p: THREE.Vector3) => number; thick: (p: THREE.Vector3, phi: number) => number; drop?: number; dropFrom?: number; flare?: number };
const temples = (f: number) => 0.12 * Math.exp(-(((Math.abs(f) - 0.8) / 0.28) ** 2));
const HAIR: Record<Exclude<HairStyle, 'bald'>, HairSpec> = {
  short: { thr: (f) => 0.04 + 0.4 * Math.cos(f) + temples(f), thick: (p) => 0.01 + 0.016 * Math.max(0, p.y) },
  part: {
    thr: (f) => 0.04 + 0.4 * Math.cos(f) + temples(f),
    thick: (p) => 0.01 + 0.014 * Math.max(0, p.y) + 0.014 * smoothstep(-0.3, 0.5, p.x) * smoothstep(0.0, 0.7, p.z) * smoothstep(0.1, 0.6, p.y),
  },
  fringe: { thr: (f) => 0.0 + 0.3 * Math.cos(f), thick: (p) => 0.011 + 0.014 * Math.max(0, p.y) + 0.008 * smoothstep(0.3, 0.8, p.z) * smoothstep(0.1, 0.5, p.y) },
  curly: {
    thr: (f) => 0.0 + 0.42 * Math.cos(f),
    thick: (p) => 0.02 + 0.03 * Math.max(0, p.y) + 0.012 * (Math.sin(p.x * 9) * Math.sin(p.y * 9 + 1) * Math.sin(p.z * 9 + 2) + 0.4),
  },
  long: { thr: (f) => (Math.abs(f) < 0.8 ? 0.5 : 0.5 - 1.7 * smoothstep(0.8, 1.35, Math.abs(f))), thick: (p) => 0.012 + 0.016 * Math.max(0, p.y), drop: 0.2, dropFrom: 0.85, flare: 0.02 },
  bob: { thr: (f) => (Math.abs(f) < 0.8 ? 0.45 : 0.45 - 1.6 * smoothstep(0.8, 1.3, Math.abs(f))), thick: (p) => 0.014 + 0.016 * Math.max(0, p.y) + 0.01 * smoothstep(0, -0.8, p.y), drop: 0.04, dropFrom: 0.8, flare: 0.012 },
  bun: { thr: (f) => 0.5 * Math.cos(f) - 0.08 * (1 - Math.cos(f)), thick: (p) => 0.008 + 0.01 * Math.max(0, p.y) },
};

function hairGeo(style: HairStyle, fem: boolean) {
  return cached(`hair-${style}-${fem}`, () => {
    const g = sphereDirs(64, 48);
    const p = g.getAttribute('position'), d = new THREE.Vector3(), base = new THREE.Vector3();
    const C = new THREE.Vector3(0, HC, 0);
    for (let i = 0; i < p.count; i++) {
      d.fromBufferAttribute(p, i);
      headPoint(d, fem, base);
      const phi = Math.atan2(d.x, d.z);
      let mask: number, thick: number;
      let drop = 0, flare = 0;
      if (style === 'bald') {
        // a low horseshoe of hair around the back and sides
        mask = smoothstep(1.3, 1.7, Math.abs(phi)) * smoothstep(-0.45, -0.3, d.y) * smoothstep(0.32, 0.2, d.y);
        thick = 0.008;
      } else {
        const H = HAIR[style];
        const t = H.thr(phi, d);
        mask = smoothstep(t - 0.09, t + 0.07, d.y);
        thick = H.thick(d, phi);
        if (H.drop) {
          const side = smoothstep(H.dropFrom! - 0.25, H.dropFrom! + 0.25, Math.abs(phi));
          const w = smoothstep(0.35, -1.0, d.y) * side;
          drop = H.drop * w; flare = (H.flare ?? 0) * w;
          thick += 0.004 * w * Math.sin(phi * 11) * smoothstep(-1, -0.6, d.y); // soft strand clumps where it falls
        }
      }
      const rel = base.clone().sub(C);
      const len = rel.length();
      // the shell thins to nothing at the hairline (and tucks just under the skin past it): a clean edge, no stair-steps
      const outer = rel.clone().multiplyScalar((len + thick * mask - 0.005 * (1 - mask)) / len);
      outer.x *= 1 + flare * 3; outer.z -= flare * 1.2;
      outer.y -= drop;
      const q = outer.add(C);
      p.setXYZ(i, q.x, q.y, q.z);
    }
    const parts = [smoothNormals(g)];
    if (style === 'bun') parts.push(ell([0, HC + 0.03, -0.125], [0.052, 0.048, 0.045], [0.4, 0, 0], 18, 12));
    return merge(parts);
  });
}

/* ---------------- body ---------------- */

/** Catmull-Rom subdivision of loft rings: smoother silhouettes, and enough rows for masks like the pallu. */
function densify(R: Ring[], sub = 3): Ring[] {
  const out: Ring[] = [];
  const at = (i: number) => R[Math.max(0, Math.min(R.length - 1, i))];
  for (let i = 0; i < R.length - 1; i++) {
    for (let k = 0; k < sub; k++) {
      const t = k / sub, t2 = t * t, t3 = t2 * t;
      const r: number[] = [];
      for (let c = 0; c < 4; c++) {
        const p0 = at(i - 1)[c] ?? 0, p1 = at(i)[c] ?? 0, p2 = at(i + 1)[c] ?? 0, p3 = at(i + 2)[c] ?? 0;
        r.push(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3));
      }
      out.push(r as Ring);
    }
  }
  out.push(R[R.length - 1]);
  return out;
}

function torsoRings(fem: boolean): Ring[] {
  return fem
    ? [[0.05, 0.15, 0.108], [0.08, 0.16, 0.114], [0.16, 0.146, 0.104, 0.004], [0.25, 0.13, 0.095, 0.006], [0.33, 0.138, 0.098, 0.006],
      [0.4, 0.152, 0.106, 0.004], [0.455, 0.166, 0.104], [0.495, 0.172, 0.098, -0.006], [0.528, 0.16, 0.086, -0.01], [0.552, 0.13, 0.07, -0.01], [0.566, 0.09, 0.054, -0.01], [0.576, 0.05, 0.038, -0.008]]
    : [[0.05, 0.152, 0.106], [0.08, 0.166, 0.112], [0.16, 0.16, 0.108, 0.005], [0.25, 0.155, 0.105, 0.008], [0.33, 0.166, 0.112, 0.008],
      [0.41, 0.183, 0.119, 0.006], [0.46, 0.196, 0.117], [0.5, 0.2, 0.11, -0.006], [0.535, 0.19, 0.098, -0.01], [0.56, 0.16, 0.08, -0.012], [0.578, 0.11, 0.062, -0.012], [0.59, 0.06, 0.044, -0.01]];
}
const bustBump = (x: number, y: number, z: number) => (z > 0 ? 0.02 * Math.exp(-(((y - 0.4) / 0.055) ** 2)) * Math.exp(-(((Math.abs(x) - 0.06) / 0.06) ** 2)) : 0);

function torsoGeo(fem: boolean, garment: string) {
  return cached(`torso-${fem}-${garment}`, () => {
    const body = loft(densify(torsoRings(fem)), 36, 2.4, fem ? bustBump : undefined);
    const parts = [body];
    if (garment === 'sweater') {
      // ribbed hem and a rolled neckband read as knitwear
      parts.push(loft([[0.045, 0.158, 0.11], [0.06, 0.166, 0.116], [0.095, 0.165, 0.115], [0.11, 0.158, 0.108]], 36, 2.4));
      parts.push(torus(fem ? 0.056 : 0.062, 0.011, fem ? 0.566 : 0.582, 0.78, Math.PI * 2, 0, -0.01));
    }
    return merge(parts);
  });
}

function pelvisGeo(fem: boolean) {
  return cached('pelvis' + fem, () => loft([[-0.07, 0.11, 0.09], [-0.035, 0.15, 0.112], [0.02, fem ? 0.165 : 0.158, 0.112], [0.08, fem ? 0.152 : 0.152, 0.105]], 32, 2.4));
}

/** Shirt details: a collar band hugging the neck, two collar points and an open placket in the collar colour. */
function collarGeo(fem: boolean) {
  return cached('collar' + fem, () => {
    const y = fem ? 0.548 : 0.562, k = fem ? 0.9 : 1;
    const band = loft([[y - 0.004, 0.072 * k, 0.062 * k, -0.012], [y + 0.03, 0.062 * k, 0.056 * k, -0.012], [y + 0.046, 0.058 * k, 0.052 * k, -0.012]], 28, 2);
    // collar points: thin rounded wedges lying on the chest, spreading from the throat
    const pts = [-1, 1].map((s) => {
      const sh = new THREE.Shape();
      sh.moveTo(s * 0.004, 0); sh.lineTo(s * 0.05 * k, -0.004); sh.lineTo(s * 0.012 * k, -0.048 * k); sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.0025, bevelSize: 0.003, bevelSegments: 2, curveSegments: 4 });
      g.rotateX(-0.55); g.translate(0, y + 0.022, (fem ? 0.05 : 0.056));
      return clean(g);
    });
    return merge([band, ...pts]);
  });
}

function beltGeo() {
  return cached('belt', () => loft([[0.055, 0.162, 0.111], [0.085, 0.168, 0.115]], 32, 2.4));
}

/** Saree: the pallu, a shell over the blouse masked to a band from the right hip, across the chest,
 *  over the left shoulder and down the back. */
function palluGeo() {
  return cached('pallu', () => {
    const dist = (x: number, y: number, ax: number, ay: number, bx: number, by: number) => {
      const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(x - ax - t * dx, y - ay - t * dy);
    };
    const R = densify(torsoRings(true), 8);
    return loft(R, 96, 2.4, (x, y, z) => {
      const front = smoothstep(0.085, 0.055, dist(x, y, 0.13, 0.05, -0.15, 0.56)) * smoothstep(-0.04, 0.02, z);
      const back = smoothstep(0.095, 0.065, dist(x, y, -0.15, 0.56, -0.05, 0.02)) * smoothstep(0.04, -0.02, z);
      const m = Math.max(front, back);
      return bustBump(x, y, z) + m * 0.008 - (1 - m) * 0.004 + m * 0.0015 * Math.sin(y * 90);
    });
  });
}

/** Saree skirt (standing): gently flared with front pleats. */
function skirtGeo() {
  return cached('skirt', () => loft(densify([[0.015, 0.215, 0.19, 0.01], [0.25, 0.2, 0.17], [0.55, 0.18, 0.14], [0.8, 0.165, 0.118], [0.92, 0.155, 0.11]], 3), 48, 2.4,
    (_x, y, _z, th) => 0.006 * Math.max(0, Math.cos(th)) ** 2 * Math.sin(th * 18) * smoothstep(0.85, 0.3, y)));
}


function neckGeo(fem: boolean) {
  return cached('neck' + fem, () => capsule(new THREE.Vector3(0, 0.1, -0.008), new THREE.Vector3(0, -0.03, -0.004), fem ? 0.042 : 0.05, fem ? 0.046 : 0.056, 16));
}

const ARM = { m: { u: [0.053, 0.046], f: [0.046, 0.037] }, f: { u: [0.045, 0.039], f: [0.039, 0.032] } };
function upperGeo(fem: boolean, sleeve: 'long' | 'short') {
  return cached(`upper-${fem}-${sleeve}`, () => {
    const [ra, rb] = ARM[fem ? 'f' : 'm'].u;
    if (sleeve === 'long') return capsule(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.28, 0), ra, rb);
    // short blouse sleeve: a soft cap
    return capsule(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.11, 0), ra + 0.006, ra - 0.002);
  });
}
function upperSkinGeo(fem: boolean) {
  return cached('upperSkin' + fem, () => { const [ra, rb] = ARM[fem ? 'f' : 'm'].u; return capsule(new THREE.Vector3(0, -0.02, 0), new THREE.Vector3(0, -0.28, 0), ra - 0.004, rb); });
}
function foreGeo(fem: boolean) {
  return cached('fore' + fem, () => {
    const [ra, rb] = ARM[fem ? 'f' : 'm'].f;
    return merge([capsule(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.2, 0), ra, rb), torus(rb - 0.001, 0.006, -0.196)]);
  });
}
function foreSkinGeo(fem: boolean) {
  return cached('foreSkin' + fem, () => { const [ra, rb] = ARM[fem ? 'f' : 'm'].f; return capsule(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.21, 0), ra, rb - 0.004); });
}
/** A mitten hand: soft palm block plus a thumb, at the wrist (elbow-pivot space). */
function handGeo(fem: boolean) {
  return cached('hand' + fem, () => {
    const k = fem ? 0.9 : 1;
    return merge([
      ell([0, -0.262 * (fem ? 0.985 : 1), 0.004], [0.027 * k, 0.05 * k, 0.04 * k], [0.08, 0, 0], 16, 12),
      capsule(new THREE.Vector3(0, -0.232, 0.026 * k), new THREE.Vector3(0, -0.262, 0.046 * k), 0.014 * k, 0.012 * k, 10),
    ]);
  });
}

function legGeo(seated: boolean, fem: boolean) {
  return cached(`leg-${seated}-${fem}`, () => {
    const t = fem ? 0.94 : 1;
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    if (seated) return merge([
      capsule(V(0, 0.5, 0.0), V(0.004, 0.5, 0.44), 0.08 * t, 0.06 * t),
      capsule(V(0.004, 0.5, 0.44), V(0.006, 0.1, 0.47), 0.06 * t, 0.045 * t),
    ]);
    return merge([
      capsule(V(0, 0.86, 0), V(0.004, 0.47, 0.012), 0.08 * t, 0.06 * t),
      capsule(V(0.004, 0.47, 0.012), V(0.006, 0.1, -0.01), 0.06 * t, 0.045 * t),
    ]);
  });
}
function shoeGeo(seated: boolean, fem: boolean) {
  return cached(`shoe-${seated}-${fem}`, () => {
    const k = fem ? 0.9 : 1;
    const z = seated ? 0.52 : 0.035;
    const g = ell([0.006, 0.045, z], [0.048 * k, 0.045, 0.115 * k], [0, 0, 0], 18, 12);
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) if (p.getY(i) < 0.012) p.setY(i, 0.012 - (0.012 - p.getY(i)) * 0.15); // flat sole
    return smoothNormals(g);
  });
}

function glassesGeo() {
  return cached('glasses', () => {
    const o = new THREE.Vector3();
    const parts: THREE.BufferGeometry[] = [];
    for (const s of [-1, 1]) {
      headPoint(new THREE.Vector3(s * 0.36, -0.02, 0.93).normalize(), false, o);
      const ring = new THREE.TorusGeometry(0.026, 0.0042, 6, 20); ring.rotateY(s * 0.25); ring.translate(o.x, o.y + 0.002, o.z + 0.012);
      parts.push(clean(ring));
      parts.push(capsule(new THREE.Vector3(s * 0.064, o.y + 0.006, o.z + 0.004), new THREE.Vector3(s * 0.099, HC + 0.004, -0.02), 0.003, 0.003, 6));
    }
    parts.push(capsule(new THREE.Vector3(-0.012, HC - 0.012, 0.115), new THREE.Vector3(0.012, HC - 0.012, 0.115), 0.0035, 0.0035, 6));
    return merge(parts);
  });
}
function moustacheGeo() {
  return cached('moustache', () => merge([-1, 1].map((s) => ell([s * 0.016, HC - 0.052, 0.098], [0.024, 0.009, 0.012], [0.2, s * 0.3, s * -0.2], 12, 8))));
}

/* ---------------- the figure ---------------- */

/** Builds a stylised person facing +z. Seated figures sit with hips at 0.47 m. */
export function buildFigure(o: FigureOpts): Figure {
  const style: HairStyle = o.hairStyle ?? 'short';
  const fem = o.sex ? o.sex === 'f' : style === 'long' || style === 'bob' || style === 'bun';
  const garment = o.garment ?? (o.collar !== undefined ? 'shirt' : 'sweater');
  const saree = garment === 'saree';
  const sw = o.shoulders ?? 1;
  const hipY = o.seated ? 0.47 : 0.86;

  const std = (color: THREE.ColorRepresentation, rough: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
  const skin = std(o.skin, 0.62);
  skin.emissive.set(o.skin).multiplyScalar(0.05); // a touch of warmth so faces never go grey in shadow
  const top = std(o.top, 0.88);
  const bottom = std(o.bottom ?? 0x2b3144, 0.86);
  const hair = std(o.hair, style === 'curly' ? 0.8 : 0.58);
  const shoe = std(0x1d1a1c, 0.5);
  const collar = o.collar !== undefined ? std(o.collar, 0.8) : top;
  const eye = std(o.eyes !== undefined ? new THREE.Color(o.eyes).multiplyScalar(0.45) : 0x17110e, 0.3);
  const mats = [skin, top, bottom, hair, shoe, eye];
  if (collar !== top) mats.push(collar);

  const root = new THREE.Group();
  const put = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, shadow = true) => {
    const me = new THREE.Mesh(g, m);
    me.castShadow = shadow; me.receiveShadow = true;
    parent.add(me);
    return me;
  };

  // legs (root space); a saree's skirt covers them
  if (o.legs !== false) {
    for (const s of [-1, 1]) {
      const lg = new THREE.Group(); lg.position.x = s * (fem ? 0.085 : 0.092); root.add(lg);
      put(legGeo(!!o.seated, fem), bottom, lg);
      put(shoeGeo(!!o.seated, fem), shoe, lg);
    }
    if (saree && !o.seated) put(skirtGeo(), bottom, root);
  }

  // torso pivots at the hips so it can twist; its shell is scaled by the shoulder factor
  const torso = new THREE.Group(); torso.position.y = hipY; root.add(torso);
  const shell = new THREE.Group(); shell.scale.x = sw; torso.add(shell);
  const body = put(torsoGeo(fem, saree ? 'blouse' : garment), top, shell);
  put(pelvisGeo(fem), bottom, shell);
  if (garment === 'shirt') {
    put(collarGeo(fem), collar, shell, false);
    if (!fem) put(beltGeo(), shoe, shell, false);
  }
  if (saree) put(palluGeo(), bottom, shell);

  const neck = new THREE.Group(); neck.position.set(0, fem ? 0.555 : 0.57, 0); torso.add(neck);
  put(neckGeo(fem), skin, neck);
  const head = new THREE.Group(); head.position.set(0, 0.07, 0); neck.add(head);
  put(headGeo(fem), skin, head);
  put(eyesGeo(fem), eye, head, false);
  put(hairGeo(style, fem), hair, head);
  if (o.moustache) put(moustacheGeo(), hair, head, false);
  if (o.glasses) { const fr = std(0x231f1d, 0.35, { metalness: 0.3 }); mats.push(fr); put(glassesGeo(), fr, head, false); }

  // arms: shoulder pivot -> upper arm -> elbow pivot (y -0.28) -> forearm -> mitten at y -0.27
  const mk = (s: number) => {
    const a = new THREE.Group(); a.position.set(s * (fem ? 0.165 : 0.192) * sw, fem ? 0.48 : 0.49, 0.004); torso.add(a);
    // yaw first: rotation.y swings the arm about the torso's vertical (identical to XYZ whenever y is 0)
    a.rotation.order = 'YXZ';
    // a saree's pallu falls over the left shoulder, so that sleeve cap takes the saree colour
    if (saree) { put(upperGeo(fem, 'short'), s < 0 ? bottom : top, a); put(upperSkinGeo(fem), skin, a); } else put(upperGeo(fem, 'long'), top, a);
    const f = new THREE.Group(); f.position.y = -0.28; a.add(f);
    if (saree) put(foreSkinGeo(fem), skin, f); else put(foreGeo(fem), top, f);
    put(handGeo(fem), skin, f, false);
    a.rotation.z = s * 0.07;
    return [a, f] as const;
  };
  const [armL, foreL] = mk(-1);
  const [armR, foreR] = mk(1);

  // quiet breathing: the chest rises a few millimetres (one frame behind, which is invisible)
  const phase = Math.random() * 10, rate = 1.3 + Math.random() * 0.4;
  body.onBeforeRender = () => {
    const b = Math.sin(performance.now() / 1000 * rate + phase);
    shell.scale.y = 1 + b * 0.006; shell.scale.z = 1 + b * 0.012;
    neck.position.y = (fem ? 0.555 : 0.57) + b * 0.0025;
  };

  if (o.scale) root.scale.setScalar(o.scale);
  return { root, torso, neck, head, armL, armR, foreL, foreR, mats };
}
