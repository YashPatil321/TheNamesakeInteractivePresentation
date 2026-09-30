// The steam locomotive and its two carriages: merged low-poly geometry per material, instanced wheels, animated rods.
import * as THREE from 'three';
import { place, paint, boxMM, merge, composeInto, clamp, canvasTex } from './kit';

export const RAIL_TOP = 0.58;
const DRV_R = 0.78, SML_R = 0.45, CRANK = 0.34;
const DRV_Y = RAIL_TOP + DRV_R, SML_Y = RAIL_TOP + SML_R;
export const CAR_X = [-9.55, -18.6];
export const TRAIN_BACK = -23.0, TRAIN_FRONT = 5.1;

type Mats = {
  paint: THREE.MeshStandardMaterial; iron: THREE.MeshStandardMaterial; brass: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial; lens: THREE.MeshStandardMaterial; wheel: THREE.MeshStandardMaterial;
  lamp: THREE.MeshBasicMaterial; plate: THREE.MeshStandardMaterial;
};

const MAROON = '#6b1e2a', MAROON_D = '#4a1520', CREAM = '#e6d7ae', ROOF = '#262833', IRON = '#23252d', SMOKE = '#17181d', RED = '#8e2323';

function wheelGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  // tyre + rim
  parts.push(paint(place(new THREE.CylinderGeometry(1, 1, 0.16, 28, 1, true), 0, 0, 0, Math.PI / 2), '#9aa0a8'));
  parts.push(paint(place(new THREE.RingGeometry(0.8, 1, 28), 0, 0, 0.08), '#2a2a30'));
  parts.push(paint(place(new THREE.RingGeometry(0.8, 1, 28), 0, 0, -0.08, 0, Math.PI), '#2a2a30'));
  // spokes
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    parts.push(paint(place(new THREE.BoxGeometry(0.09, 0.84, 0.07), Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0.02, 0, 0, a - Math.PI / 2), '#8f2a2a'));
  }
  // hub + counterweight
  parts.push(paint(place(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 12), 0, 0, 0.03, Math.PI / 2), '#c9a35a'));
  parts.push(paint(place(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 16, 1, false, 2.4, 1.3), 0, 0, 0.03, Math.PI / 2), '#6e1f1f'));
  return merge(parts);
}

/** Half cylinder lying along X with its arc on top: a curved roof. */
function halfRoof(len: number, cx: number, baseY: number, halfW: number, h: number) {
  const g = new THREE.CylinderGeometry(1, 1, len, 22, 1, false, -Math.PI / 2, Math.PI);
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
  g.applyMatrix4(m);
  g.scale(1, h, halfW); g.translate(cx, baseY, 0);
  return g;
}

function funnelGeometry() {
  const pts = [[0.34, 0], [0.31, 0.5], [0.33, 0.85], [0.42, 1.12], [0.52, 1.3], [0.54, 1.38], [0.44, 1.4], [0.3, 1.2], [0.0, 1.2]].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, 18);
}

export function makeNameplate(): { tex: THREE.CanvasTexture; draw: (label: string, mono: string, col: string) => void } {
  const tex = canvasTex(512, 128, () => {});
  const draw = (label: string, mono: string, col: string) => {
    const cv = tex.image as HTMLCanvasElement, c = cv.getContext('2d')!;
    c.clearRect(0, 0, 512, 128);
    c.fillStyle = '#c9a35a'; c.beginPath(); c.roundRect(0, 0, 512, 128, 18); c.fill();
    c.fillStyle = '#1d1b26'; c.beginPath(); c.roundRect(8, 8, 496, 112, 12); c.fill();
    c.fillStyle = col; c.fillRect(8, 104, 496, 8);
    c.fillStyle = '#ece4cf'; c.textAlign = 'center'; c.textBaseline = 'middle';
    let size = 70; c.font = `700 ${size}px ${mono}`;
    while (c.measureText(label).width > 460 && size > 20) { size -= 4; c.font = `700 ${size}px ${mono}`; }
    c.fillText(label, 256, 62);
    tex.needsUpdate = true;
  };
  return { tex, draw };
}

export interface TrainParts {
  root: THREE.Group;
  loco: THREE.Group;
  cars: THREE.Group[];
  wheels: THREE.InstancedMesh;
  rods: THREE.Mesh[];
  mains: THREE.Mesh[];
  headlight: THREE.SpotLight;
  headPos: THREE.Vector3; // local (loco)
  funnelTop: THREE.Vector3; // local (loco)
  pick: THREE.Mesh;
  mats: Mats;
  plate: ReturnType<typeof makeNameplate>;
  update(x: number, derail: number, now: number): void;
  geos: THREE.BufferGeometry[];
}

export function buildTrain(scene: THREE.Scene): TrainParts {
  const plate = makeNameplate();
  const mats: Mats = {
    paint: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.12 }),
    iron: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.55 }),
    brass: new THREE.MeshStandardMaterial({ color: '#d4ab5c', roughness: 0.28, metalness: 0.95 }),
    glass: new THREE.MeshStandardMaterial({ color: '#2a1c10', emissive: '#ffc070', emissiveIntensity: 1.6, roughness: 0.3 }),
    lens: new THREE.MeshStandardMaterial({ color: '#f2a33a', emissive: '#f2a33a', emissiveIntensity: 0.6, roughness: 0.4 }),
    wheel: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.6 }),
    lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.2, 3.6) }),
    plate: new THREE.MeshStandardMaterial({ map: plate.tex, emissiveMap: plate.tex, emissive: '#ffffff', emissiveIntensity: 0.25, roughness: 0.35, metalness: 0.3 }),
  };
  const geos: THREE.BufferGeometry[] = [];
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, shadow = true) => {
    geos.push(g); const o = new THREE.Mesh(g, m); o.castShadow = shadow; o.receiveShadow = true; parent.add(o); return o;
  };
  const root = new THREE.Group(); scene.add(root);

  /* ---------------- locomotive ---------------- */
  const loco = new THREE.Group(); root.add(loco);
  const paintL: THREE.BufferGeometry[] = [], ironL: THREE.BufferGeometry[] = [], brassL: THREE.BufferGeometry[] = [], glassL: THREE.BufferGeometry[] = [], lensL: THREE.BufferGeometry[] = [];
  // frame + running board
  ironL.push(paint(boxMM(-4.3, 1.05, -0.62, 4.05, 1.55, 0.62), IRON));
  ironL.push(paint(boxMM(-1.6, 2.12, -1.18, 3.95, 2.2, 1.18), IRON));
  lensL.push(boxMM(-1.6, 2.02, -1.19, 3.95, 2.12, 1.19));
  // boiler
  ironL.push(paint(place(new THREE.CylinderGeometry(0.95, 0.95, 4.7, 28), 0.7, 3.1, 0, 0, 0, Math.PI / 2), '#2f3547'));
  ironL.push(paint(place(new THREE.CylinderGeometry(1.0, 1.0, 1.05, 28), 3.5, 3.1, 0, 0, 0, Math.PI / 2), SMOKE));
  ironL.push(paint(place(new THREE.CylinderGeometry(0.86, 0.86, 0.1, 28), 4.06, 3.1, 0, 0, 0, Math.PI / 2), '#202229'));
  ironL.push(paint(place(new THREE.SphereGeometry(0.11, 10, 8), 4.12, 3.1, 0), '#c9a35a'));
  brassL.push(place(new THREE.TorusGeometry(0.87, 0.05, 8, 32), 4.07, 3.1, 0, 0, Math.PI / 2));
  for (const bx of [-1.0, 0.55, 2.1, 2.98]) brassL.push(place(new THREE.TorusGeometry(bx > 2.9 ? 1.0 : 0.955, 0.045, 6, 32), bx, 3.1, 0, 0, Math.PI / 2));
  // funnel
  ironL.push(paint(place(funnelGeometry(), 3.45, 3.85, 0), SMOKE));
  brassL.push(place(new THREE.TorusGeometry(0.52, 0.05, 6, 20), 3.45, 5.24, 0, Math.PI / 2));
  // steam dome, sand dome, whistle, safety valves
  brassL.push(place(new THREE.CylinderGeometry(0.42, 0.48, 0.5, 20), 1.35, 4.05, 0));
  brassL.push(place(new THREE.SphereGeometry(0.42, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), 1.35, 4.3, 0));
  ironL.push(paint(place(new THREE.CylinderGeometry(0.34, 0.38, 0.35, 16), -0.25, 4.0, 0), '#2f3547'));
  ironL.push(paint(place(new THREE.SphereGeometry(0.34, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), -0.25, 4.17, 0), '#2f3547'));
  brassL.push(place(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 8), -1.2, 4.25, 0));
  brassL.push(place(new THREE.CylinderGeometry(0.1, 0.06, 0.18, 8), -1.2, 4.6, 0));
  // cylinders + steam chest
  for (const s of [-1, 1]) {
    ironL.push(paint(place(new THREE.CylinderGeometry(0.34, 0.34, 1.2, 16), 2.55, 1.72, s * 1.0, 0, 0, Math.PI / 2), '#2f3547'));
    brassL.push(place(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 16), 3.15, 1.72, s * 1.0, 0, 0, Math.PI / 2));
    ironL.push(paint(boxMM(1.0, 1.28, s * 0.92 - 0.05, 2.0, 1.36, s * 0.92 + 0.05), '#6d7078')); // crosshead guide
  }
  // cab
  paintL.push(paint(boxMM(-4.3, 1.55, -1.18, -1.6, 2.4, 1.18), MAROON_D));
  paintL.push(paint(boxMM(-4.3, 2.52, -1.18, -3.9, 4.45, 1.18), MAROON));
  paintL.push(paint(boxMM(-2.0, 2.52, -1.18, -1.6, 4.45, 1.18), MAROON));
  paintL.push(paint(boxMM(-3.9, 2.52, -1.18, -2.0, 3.0, 1.18), MAROON));
  paintL.push(paint(boxMM(-3.9, 3.95, -1.18, -2.0, 4.45, 1.18), MAROON));
  paintL.push(paint(boxMM(-4.3, 2.4, -1.18, -1.6, 2.52, 1.18), CREAM));
  lensL.push(boxMM(-4.3, 1.55, -1.19, -1.6, 1.66, 1.19));
  glassL.push(boxMM(-3.9, 3.0, -1.12, -2.0, 3.95, 1.12));
  glassL.push(boxMM(-1.62, 3.55, 0.45, -1.56, 4.2, 1.02));
  glassL.push(boxMM(-1.62, 3.55, -1.02, -1.56, 4.2, -0.45));
  paintL.push(paint(boxMM(-1.66, 1.55, -1.18, -1.56, 4.45, -1.02), MAROON));
  paintL.push(paint(boxMM(-1.66, 1.55, 1.02, -1.56, 4.45, 1.18), MAROON));
  paintL.push(paint(boxMM(-1.66, 4.2, -1.02, -1.56, 4.45, 1.02), MAROON));
  // cab roof (curved)
  paintL.push(paint(halfRoof(3.3, -2.95, 4.45, 1.34, 0.3), ROOF));
  // buffer beam, buffers, cowcatcher
  ironL.push(paint(boxMM(4.05, 1.0, -1.22, 4.25, 1.62, 1.22), RED));
  for (const s of [-0.85, 0.85]) {
    ironL.push(paint(place(new THREE.CylinderGeometry(0.1, 0.1, 0.35, 10), 4.4, 1.32, s, 0, 0, Math.PI / 2), IRON));
    ironL.push(paint(place(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 14), 4.58, 1.32, s, 0, 0, Math.PI / 2), '#9aa0a8'));
  }
  {
    const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, 0.62), new THREE.Vector2(0.95, 0)]);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 2.1, bevelEnabled: false });
    ironL.push(paint(place(g, 4.2, RAIL_TOP + 0.08, -1.05), '#3b2020'));
    for (let k = -3; k <= 3; k++) ironL.push(paint(place(new THREE.BoxGeometry(1.1, 0.05, 0.05), 4.66, RAIL_TOP + 0.4, k * 0.3, 0, 0, -0.58), '#6e2a22'));
  }
  // headlight
  ironL.push(paint(boxMM(3.5, 4.06, -0.27, 3.98, 4.6, 0.27), IRON));
  ironL.push(paint(place(new THREE.ConeGeometry(0.12, 0.25, 8), 3.74, 4.72, 0), IRON));
  const lensMesh = new THREE.Mesh(place(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 20), 4.0, 4.33, 0, 0, 0, Math.PI / 2), mats.lamp);
  geos.push(lensMesh.geometry); loco.add(lensMesh);
  // nameplates both sides
  const plateGeo = new THREE.PlaneGeometry(2.0, 0.5); geos.push(plateGeo);
  const pl1 = new THREE.Mesh(plateGeo, mats.plate); pl1.position.set(-2.95, 1.98, 1.195); loco.add(pl1);
  const pl2 = new THREE.Mesh(plateGeo, mats.plate); pl2.position.set(-2.95, 1.98, -1.195); pl2.rotation.y = Math.PI; loco.add(pl2);

  mesh(merge(paintL), mats.paint, loco);
  mesh(merge(ironL), mats.iron, loco);
  mesh(merge(brassL), mats.brass, loco);
  mesh(merge(glassL), mats.glass, loco, false);
  mesh(merge(lensL), mats.lens, loco, false);

  /* ---------------- carriages ---------------- */
  const carPaint: THREE.BufferGeometry[] = [], carIron: THREE.BufferGeometry[] = [], carBrass: THREE.BufferGeometry[] = [], carGlass: THREE.BufferGeometry[] = [], carLens: THREE.BufferGeometry[] = [];
  carIron.push(paint(boxMM(-4.0, 1.05, -0.9, 4.0, 1.42, 0.9), IRON));
  for (const bx of [-2.85, 2.85]) {
    carIron.push(paint(boxMM(bx - 1.0, SML_Y - 0.12, -0.86, bx + 1.0, SML_Y + 0.14, 0.86), '#1b1c22'));
    carIron.push(paint(boxMM(bx - 0.25, SML_Y + 0.1, -0.6, bx + 0.25, 1.1, 0.6), '#1b1c22'));
  }
  carPaint.push(paint(boxMM(-4.2, 1.4, -1.16, 4.2, 1.95, 1.16), MAROON_D));
  carPaint.push(paint(boxMM(-4.2, 1.95, -1.16, 4.2, 2.52, 1.16), MAROON));
  carPaint.push(paint(boxMM(-4.2, 3.2, -1.16, 4.2, 3.55, 1.16), MAROON));
  const winX: number[] = [];
  for (let k = 0; k < 6; k++) winX.push(-3.35 + k * 1.34);
  // window piers
  const edges = [-4.2, ...winX.flatMap((x) => [x - 0.42, x + 0.42]), 4.2];
  for (let k = 0; k < edges.length; k += 2) carPaint.push(paint(boxMM(edges[k], 2.52, -1.16, edges[k + 1], 3.2, 1.16), MAROON));
  carGlass.push(boxMM(-4.1, 2.52, -1.1, 4.1, 3.2, 1.1));
  // passengers' silhouettes in some windows
  const rs = [0, 2, 3, 5];
  for (const k of rs) for (const s of [-1, 1]) {
    carPaint.push(paint(place(new THREE.SphereGeometry(0.15, 10, 8), winX[k] + (k % 2 ? 0.1 : -0.1), 2.93, s * 1.11, 0, 0, 0, 1, 1, 0.25), '#140e0e'));
    carPaint.push(paint(place(new THREE.CylinderGeometry(0.13, 0.26, 0.4, 10), winX[k] + (k % 2 ? 0.1 : -0.1), 2.66, s * 1.11, 0, 0, 0, 1, 1, 0.25), '#140e0e'));
  }
  carBrass.push(boxMM(-4.2, 2.36, -1.175, 4.2, 2.43, 1.175));
  carBrass.push(boxMM(-4.2, 3.14, -1.175, 4.2, 3.19, 1.175));
  carLens.push(boxMM(-4.2, 1.95, -1.18, 4.2, 2.05, 1.18));
  {
    carPaint.push(paint(halfRoof(8.7, 0, 3.55, 1.3, 0.42), ROOF));
    carIron.push(paint(boxMM(-2.5, 3.9, -0.18, 2.5, 4.05, 0.18), '#2c2e37'));
  }
  for (const s of [-1, 1]) carIron.push(paint(boxMM(s * 4.2 - 0.18, 1.55, -0.72, s * 4.2 + 0.18, 3.35, 0.72), '#14151a'));
  const carPaintG = merge(carPaint), carIronG = merge(carIron), carBrassG = merge(carBrass), carGlassG = merge(carGlass), carLensG = merge(carLens);
  geos.push(carPaintG, carIronG, carBrassG, carGlassG, carLensG);
  const cars: THREE.Group[] = [];
  for (const cx of CAR_X) {
    const g = new THREE.Group(); g.position.x = cx; root.add(g); cars.push(g);
    for (const [geo, m, sh] of [[carPaintG, mats.paint, true], [carIronG, mats.iron, true], [carBrassG, mats.brass, true], [carGlassG, mats.glass, false], [carLensG, mats.lens, false]] as const) {
      const o = new THREE.Mesh(geo, m); o.castShadow = sh; o.receiveShadow = true; g.add(o);
    }
  }
  // couplings
  const coupG = boxMM(-0.5, 1.15, -0.12, 0.5, 1.35, 0.12); geos.push(coupG);
  const coup1 = new THREE.Mesh(coupG, mats.iron); coup1.position.x = -4.75; loco.add(coup1);
  const coup2 = new THREE.Mesh(coupG, mats.iron); coup2.position.x = -4.5; cars[0].add(coup2);
  paint(coupG, IRON);

  /* ---------------- wheels (instanced across all units) ---------------- */
  const wheelG = wheelGeometry(); geos.push(wheelG);
  type WheelDef = { unit: THREE.Object3D; x: number; y: number; z: number; r: number };
  const defs: WheelDef[] = [];
  for (const s of [-1, 1]) {
    for (const x of [-3.35, -1.75, -0.15]) defs.push({ unit: loco, x, y: DRV_Y, z: s * 0.74, r: DRV_R });
    for (const x of [2.15, 3.35]) defs.push({ unit: loco, x, y: SML_Y, z: s * 0.74, r: SML_R });
    for (const car of cars) for (const x of [-3.55, -2.15, 2.15, 3.55]) defs.push({ unit: car, x, y: SML_Y, z: s * 0.74, r: SML_R });
  }
  const wheels = new THREE.InstancedMesh(wheelG, mats.wheel, defs.length);
  wheels.castShadow = true; wheels.receiveShadow = true; wheels.frustumCulled = false;
  scene.add(wheels);

  // coupling rods + main rods
  const rodG = boxMM(-1.7, -0.07, -0.04, 1.7, 0.07, 0.04); geos.push(paint(rodG, '#b7bcc4'));
  const mainG = boxMM(0, -0.065, -0.04, 1, 0.065, 0.04); geos.push(paint(mainG, '#b7bcc4'));
  const rods: THREE.Mesh[] = [], mains: THREE.Mesh[] = [];
  const rodMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.9 });
  for (const s of [-1, 1]) {
    const r = new THREE.Mesh(rodG, rodMat); r.position.z = s * 0.9; r.castShadow = true; loco.add(r); rods.push(r);
    const m = new THREE.Mesh(mainG, rodMat); m.position.z = s * 0.97; m.castShadow = true; loco.add(m); mains.push(m);
  }

  // headlight spot
  const headlight = new THREE.SpotLight('#ffe2b0', 0, 70, 0.42, 0.55, 1.6);
  headlight.position.set(4.05, 4.33, 0); loco.add(headlight);
  headlight.target.position.set(22, 0, 0); loco.add(headlight.target);

  // pick proxy
  const pickG = boxMM(TRAIN_BACK, 0.4, -1.5, TRAIN_FRONT, 5.6, 1.5); geos.push(pickG);
  const pick = new THREE.Mesh(pickG, new THREE.MeshBasicMaterial()); pick.visible = false; root.add(pick);

  const _m = new THREE.Matrix4(), _l = new THREE.Matrix4();
  const outBack = (t: number) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  function update(x: number, derail: number, now: number) {
    root.position.x = x;
    const d = clamp(derail, 0, 1), e = d <= 0 ? 0 : outBack(d);
    const jit = d > 0 && d < 1 ? Math.sin(now * 0.07) * 0.03 * (1 - d) : 0;
    // rear carriage flips over away from the camera, the first one tips toward it, the loco slews
    const c2 = cars[1], c1 = cars[0];
    c2.position.set(CAR_X[1] - 1.6 * e, 1.25 * Math.sin(Math.min(1, e) * Math.PI / 2) * 0.9 + jit, -2.6 * e);
    c2.rotation.set(-1.52 * e, 0.42 * e, 0.1 * e);
    c1.position.set(CAR_X[0] - 0.7 * e, 0.28 * e + jit, 1.5 * e);
    c1.rotation.set(0.62 * e, -0.28 * e, 0.14 * e);
    loco.position.set(1.0 * e, 0.12 * e, -0.5 * e);
    loco.rotation.set(-0.16 * e, 0.14 * e, 0.05 * e);
    root.updateMatrixWorld(true);
    // wheels roll with distance (and spin freely once derailed)
    const spin = d > 0 ? now * 0.004 * (1 - d * 0.6) : 0;
    for (let i = 0; i < defs.length; i++) {
      const w = defs[i];
      const ang = -(x / w.r) - (w.unit === loco ? 0 : spin);
      composeInto(_l, w.x, w.y, w.z, 0, w.r, w.r, 1, 0, ang);
      _m.multiplyMatrices(w.unit.matrixWorld, _l);
      wheels.setMatrixAt(i, _m);
    }
    wheels.instanceMatrix.needsUpdate = true;
    // rods follow the crank pins
    const a = -(x / DRV_R);
    const cx = Math.cos(a) * CRANK, cy = Math.sin(a) * CRANK;
    for (let s = 0; s < 2; s++) {
      rods[s].position.set(-1.75 + cx, DRV_Y + cy, rods[s].position.z);
      const pinX = -0.15 + cx, pinY = DRV_Y + cy, headX = 1.55 + cx * 0.3, headY = 1.32;
      const dx = headX - pinX, dy = headY - pinY;
      mains[s].position.set(pinX, pinY, mains[s].position.z);
      mains[s].rotation.z = Math.atan2(dy, dx);
      mains[s].scale.x = Math.hypot(dx, dy);
    }
  }

  return { root, loco, cars, wheels, rods, mains, headlight, headPos: new THREE.Vector3(4.05, 4.33, 0), funnelTop: new THREE.Vector3(3.45, 5.3, 0), pick, mats, plate, update, geos };
}
