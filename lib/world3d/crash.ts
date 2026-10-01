// Station 1 (October 1961): Ashoke's night train derails near Jamshedpur.
// A ~9 s directed sequence driven by the engine's crash clock (lib/engine.ts crashTick, WorldFrame.crashT).
// Seen from outside the train; the compartment itself is the first-person room (press E at this station).
//   A 0.00  low tracking shot beside the racing locomotive (clacks accelerate)
//   B 1.30  high, wide exterior: the whole train racing across the dark plain
//   C 2.25  screech: wheels lock in a fountain of sparks; low shot ahead of the train past a buckled rail;
//           impact at 2.55: white flash, the rail is torn out, dust/ballast/steam burst, deep slow motion
//   D 3.50  hard cut to a wide shot at full speed: loco ploughs off, coach jackknifes, van rolls;
//           the windows flicker and go dark one by one; each landing kicks the camera
//   E 5.30  wide aftermath under the moon: smoke drifting over the wreck lit from below by the firebox,
//           steam venting, embers, distant rescuers' lanterns; slow push-in, fade (END)
// The train's own update() poses the cars on the rails; this module overrides loco/car transforms afterwards
// (and carries the instanced wheels along), so it keeps working when the train model is replaced.
import * as THREE from 'three';
import type { TrainParts } from './train';
import { clamp, lerp, smooth, paint, place, merge } from './kit';
import { Puffs, Glows, Sparks, Debris } from './fx';

/** Crash clock marks (seconds of WorldFrame.crashT). lib/engine.ts keeps its sound/caption cues in step with these. */
export const CRASH = { RUN2: 1.3, SCREECH: 2.25, IMPACT: 2.55, SLOW0: 2.6, SLOW1: 3.5, WIDE: 3.5, AFTER: 5.3, FADE: 8.6, END: 9.6 } as const;
const SLOW_RATE = 0.24; // time dilation during the impact
const V = 24; // train speed before the derail, world units / s
const LOCO_REST = { x: 2.5, z: 3.0 }, COACH_REST = { x: -5.9, z: 1.0 }, VAN_REST = { x: -14.5, z: 1.9 };

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const hop = (s: number, t0: number, dur: number, h: number) => (s > t0 && s < t0 + dur ? h * Math.sin(((s - t0) / dur) * Math.PI) : 0);
/** Falls with gravity-like acceleration from 0 to `target` between t0..t1, then bounces off the ground. */
const topple = (s: number, t0: number, t1: number, target: number, bounce: number) => {
  if (s <= t0) return 0;
  if (s < t1) { const u = (s - t0) / (t1 - t0); return target * u * u; }
  const d = s - t1;
  return target * (1 - bounce * Math.exp(-5 * d) * Math.abs(Math.sin(9 * d)));
};
const hash = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

export interface CrashOptions {
  reduced: boolean;
  /** the world's glow uniform (pixels per world unit), shared so particle sizes track the camera */
  uScale: { value: number };
  /** the world's steam puffs: its lighting uniforms are shared with the crash dust */
  puffs: Puffs;
  /** the station lamp point light; borrowed as firebox / wreck-fire light while the crash is on screen */
  lampLight: THREE.PointLight;
}

export interface Crash {
  /** true while the crash is playing or the wreck is on screen */
  on(ct: number, derail: number): boolean;
  /** offset added to the train's x before train.update (the approach run) */
  runX(ct: number): number;
  /** 0..1 darkness applied to the world lighting */
  dark(ct: number): number;
  /** 0..1 how lit the train's lamps/windows are */
  lights: number;
  /** after train.update(): pose the wreck, run particles and the distant rescuers */
  update(ct: number, derail: number, tx: number, now: number, dt: number): void;
  /** after the world camera is placed: take over the camera for the shots, borrow the lamp light */
  late(camera: THREE.PerspectiveCamera, shake: number, now: number): void;
  dispose(): void;
}

export function createCrash(scene: THREE.Scene, train: TrainParts, opts: CrashOptions): Crash {
  const { reduced, lampLight } = opts;
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(d: T) => { disposables.push(d); return d; };

  /* ---------- particles ---------- */
  const sparks = keep(new Sparks(scene, opts.uScale, 1400));
  const dust = keep(new Puffs(scene, 380));
  dust.mat.uniforms.uScale = opts.uScale;
  dust.mat.uniforms.uLit = opts.puffs.mat.uniforms.uLit;
  dust.mat.uniforms.uAmb = opts.puffs.mat.uniforms.uAmb;
  const debris = keep(new Debris(scene, 120));
  const glows = keep(new Glows(scene, 8)); // 0..2 lanterns, 3 fire, 4 impact flash, 5 lead lantern halo
  glows.mat.uniforms.uScale = opts.uScale;
  // the aftermath smoke has its own lighting: moonlit from above, firebox-orange from below
  const smoke = keep(new Puffs(scene, 140));
  smoke.mat.uniforms.uScale = opts.uScale;
  const MOON_TOP = new THREE.Color(0.45, 0.52, 0.72), FIRE_BOT = new THREE.Color(0.55, 0.22, 0.08);
  // halos on the lit windows, so they can go dark one at a time (the glass material is shared by every car)
  const WIN: [number, number, number, number][] = [ // unit, local x, y, z
    [0, -2.9, 3.45, 1.15], [0, 4.6, 2.9, 0], // loco cab, headlamp
    ...[-3.45, -2.07, -0.69, 0.69, 2.07, 3.45].map((x) => [1, x, 2.86, 1.12] as [number, number, number, number]),
    [2, -3.4, 2.95, 1.2], [2, 3.4, 2.95, 1.2],
  ];
  const WIN_DIE = [0.04, 0.32, 0.55, 0.9, 0.42, 1.25, 0.72, 1.55, 1.3, 1.9]; // sim seconds after impact
  const winGlow = keep(new Glows(scene, WIN.length));
  winGlow.mat.uniforms.uScale = opts.uScale;

  /* ---------- the buckled rail: a kinked length of rail ahead of the train, torn out at the impact ---------- */
  const bentPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 12; i++) { const u = i / 12, b = Math.sin(u * Math.PI); bentPts.push(new THREE.Vector3(-2 + 4 * u, 0.28 * b * b, 0.45 * b * (1 + 0.4 * Math.sin(u * 9)))); }
  const bentGeo = keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bentPts), 40, 0.07, 6, false));
  const bentMat = keep(new THREE.MeshStandardMaterial({ color: '#8a8580', roughness: 0.35, metalness: 0.9, emissive: '#ff5a10', emissiveIntensity: 0 }));
  const bent = new THREE.Mesh(bentGeo, bentMat);
  bent.visible = false; bent.castShadow = true; scene.add(bent);
  const BENT_X = 7.1; // root-local x of the kink, relative to the loco's impact position (its nose is at +4.8)

  /* ---------- moonlight: a cool key that comes up on the aftermath so the smoke and the wreck read ---------- */
  const moon = new THREE.DirectionalLight(0x8ea4d8, 0);
  moon.castShadow = false; moon.position.set(-30, 40, 30);
  scene.add(moon, moon.target);

  /* ---------- the rescuers' lantern (the only real light added) ---------- */
  const lantern = new THREE.SpotLight(0xffd08a, 0, 40, 0.42, 0.65, 1.3);
  lantern.castShadow = false;
  scene.add(lantern, lantern.target);

  /* ---------- rescuers: dark silhouettes carrying lanterns ---------- */
  const figMat = keep(new THREE.MeshStandardMaterial({ color: '#15130f', roughness: 1 }));
  const figGeo = keep(merge([
    place(new THREE.CylinderGeometry(0.075, 0.09, 0.85, 6), 0, 0.43, 0.11), place(new THREE.CylinderGeometry(0.075, 0.09, 0.85, 6), 0, 0.43, -0.11),
    place(new THREE.CylinderGeometry(0.2, 0.3, 0.8, 8), 0, 1.2, 0), place(new THREE.SphereGeometry(0.2, 8, 6), 0, 1.58, 0, 0, 0, 0, 1.1, 0.7, 1.25),
    place(new THREE.SphereGeometry(0.125, 10, 8), 0, 1.78, 0), place(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 10), 0, 1.9, 0),
    place(new THREE.CylinderGeometry(0.05, 0.045, 0.62, 6), 0.08, 1.3, -0.3, -0.45, 0, 0), // arm reaching to the lantern
  ].map((g) => paint(g, '#ffffff'))));
  const lampMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.6, 1.8) }));
  const lampGeo = keep(new THREE.CylinderGeometry(0.07, 0.09, 0.2, 8));
  const figs = [0, 1, 2].map(() => {
    const g = new THREE.Mesh(figGeo, figMat); g.visible = false; scene.add(g);
    const l = new THREE.Mesh(lampGeo, lampMat); l.visible = false; scene.add(l);
    return { body: g, lamp: l, x: 0, z: 0, y: 0, yaw: 0, lx: 0, ly: 0, lz: 0, walk: 0 };
  });

  /* ---------- scratch ---------- */
  const units: THREE.Object3D[] = [train.loco, ...train.cars.slice(0, 2)];
  const rest = units.map(() => new THREE.Matrix4()), delta = units.map(() => new THREE.Matrix4());
  const mA = new THREE.Matrix4(), mB = new THREE.Matrix4(), mInv = new THREE.Matrix4(), vS = new THREE.Vector3();
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), camP = new THREE.Vector3(), camL = new THREE.Vector3();
  const lastP = new THREE.Vector3(), lastQ = new THREE.Quaternion(), qTmp = new THREE.Quaternion();
  const lampCol0 = lampLight.color.clone(), FIRE = new THREE.Color(1, 0.5, 0.2);
  let wheelUnit: Int8Array | null = null, wheelMapped = false;
  const S = { prevTau: -1, prevCt: -1, tx: 0, ct: -1, tau: -1, s: -1, on: false, wasOn: false, endAt: -1, lastFov: 34,
    fire: 0, dustAcc: 0, emitSp: 0, emitDust: 0, emitEmber: 0, emitHiss: 0, emitSmoke: 0, kick: 0, restored: true };

  function slideTime(finalX: number, restX: number) { // time to decelerate uniformly from V to 0 so the unit ends at finalX
    return (2 * (finalX - (restX + (LOCO_REST.x - (V * 1.7) / 2)))) / V;
  }
  const IMP = LOCO_REST.x - (V * 1.7) / 2; // -17.9: loco's root-local x at impact (its slide lasts 1.7 s)
  const carX0 = train.cars.map((c) => c.position.x);
  const T_SLIDE = [1.7, slideTime(COACH_REST.x, carX0[0] ?? -9.55), slideTime(VAN_REST.x, carX0[1] ?? -18.6)];

  /** crash clock -> simulation clock (slow motion around the impact) */
  const tauOf = (ct: number) => (reduced ? ct : ct - (1 - SLOW_RATE) * clamp(ct - CRASH.SLOW0, 0, CRASH.SLOW1 - CRASH.SLOW0));
  const TI = CRASH.IMPACT; // == tauOf(IMPACT) since IMPACT < SLOW0

  function slide(k: number, s: number) { const T = T_SLIDE[k], u = clamp(s / T, 0, 1); return ((V * T) / 2) * (1 - (1 - u) * (1 - u)); }

  /** Compose unit k at (x,y,z) root-local, yaw about Y, then roll about its long axis pivoting on the side edge it falls onto, then pitch about the nose/tail. */
  function pose(k: number, x: number, y: number, z: number, yaw: number, roll: number, pitch: number, hw: number, nose: number, tail: number) {
    const u = units[k];
    mA.makeRotationY(yaw); mA.setPosition(x, y, z);
    const pz = roll >= 0 ? hw : -hw;
    mA.multiply(mB.makeTranslation(0, 0, pz)); mA.multiply(mB.makeRotationX(roll)); mA.multiply(mB.makeTranslation(0, 0, -pz));
    const px = pitch <= 0 ? nose : tail;
    mA.multiply(mB.makeTranslation(px, 0, 0)); mA.multiply(mB.makeRotationZ(pitch)); mA.multiply(mB.makeTranslation(-px, 0, 0));
    mA.decompose(u.position, u.quaternion, vS);
  }

  function poseWreck(s: number, tau: number) {
    // before the impact: rolling on the rails, a little body sway and a shudder under the screech
    if (s < 0) {
      const sw = reduced ? 0 : 1, scr = smooth(-0.3, 0, s);
      pose(0, 0, 0, 0, 0, sw * (0.008 * Math.sin(tau * 9) + scr * 0.02 * Math.sin(tau * 61)), sw * scr * 0.01 * Math.sin(tau * 47), 1.25, 4.5, -4.5);
      for (let k = 1; k < units.length; k++) pose(k, carX0[k - 1], 0, 0, 0, sw * 0.012 * Math.sin(tau * 7.3 + k * 1.7) + sw * scr * 0.025 * Math.sin(tau * 53 + k), 0, 1.18, 4, -4);
      return;
    }
    const sh = (k: number, a: number, f: number) => (reduced ? 0 : a * Math.sin(s * f + k) * (1 - clamp(s / T_SLIDE[k], 0, 1)));
    // locomotive: jumps the rail, noses down, veers toward the field and topples onto its side
    {
      const x = IMP + slide(0, s);
      const z = LOCO_REST.z * smooth(0.05, 1.4, s);
      const yaw = -0.46 * smooth(0, 0.9, s) + 0.08 * smooth(0.9, 1.7, s);
      const roll = topple(s, 0.45, 1.2, 1.45, 0.12) + sh(0, 0.035, 53);
      const pitch = -0.12 * smooth(0.05, 0.35, s) + 0.06 * smooth(0.9, 1.5, s) + sh(0, 0.02, 71);
      const y = hop(s, 0.02, 0.4, 0.35) - 0.3 * smooth(0.3, 0.6, s) + Math.abs(sh(0, 0.05, 37));
      pose(0, x, y, z, yaw, roll, pitch, 1.25, 4.8, -4.6);
    }
    // coach: rides up on the tender, jackknifes, rocks toward us and settles leaning back
    if (units[1]) {
      const x = (carX0[0] ?? -9.55) + IMP + slide(1, s);
      const z = COACH_REST.z * smooth(0.1, 1.3, s);
      const yaw = 0.42 * smooth(0.15, 1.1, s) - 0.07 * smooth(1.1, 1.8, s) + (s > 1.1 ? 0.03 * Math.exp(-4 * (s - 1.1)) * Math.sin(8 * (s - 1.1)) : 0);
      const roll = 0.28 * Math.sin(Math.PI * clamp((s - 0.2) / 0.8, 0, 1)) - 0.22 * smooth(0.75, 1.25, s) + sh(1, 0.03, 49);
      const pitch = 0.05 * Math.sin(Math.PI * clamp((s - 0.1) / 0.5, 0, 1)) + sh(1, 0.015, 63);
      const y = hop(s, 0.1, 0.55, 0.55) - 0.28 * smooth(0.5, 0.8, s);
      pose(1, x, y, z, yaw, roll, pitch, 1.18, 4.2, -4.2);
    }
    // van: whipped off the rails, thrown up, lands on its corner and rolls onto its side, bouncing twice
    if (units[2]) {
      const x = (carX0[1] ?? -18.6) + IMP + slide(2, s);
      const z = VAN_REST.z * smooth(0.2, 1.4, s);
      const yaw = -0.3 * smooth(0.25, 1.0, s) + 0.05 * smooth(1.0, 1.6, s);
      const roll = topple(s, 0.5, 1.25, 1.62, 0.16) + sh(2, 0.03, 45);
      const pitch = 0.08 * Math.sin(Math.PI * clamp((s - 0.3) / 0.9, 0, 1));
      const y = hop(s, 0.3, 0.7, 1.1) + (s > 1.25 ? 0.25 * Math.exp(-6 * (s - 1.25)) * Math.abs(Math.sin(10 * (s - 1.25))) : 0) - 0.15 * smooth(1.2, 1.5, s);
      pose(2, x, y, z, yaw, roll, pitch, 1.18, 4.2, -4.2);
    }
  }

  function mapWheels() {
    wheelMapped = true;
    const w = train.wheels as THREE.InstancedMesh | undefined;
    if (!w || !(w as THREE.InstancedMesh).isInstancedMesh || units.includes(w.parent as THREE.Object3D)) return;
    const boxes = units.map((u) => new THREE.Box3().setFromObject(u));
    const map = new Int8Array(w.count).fill(-1);
    const m = new THREE.Matrix4(), p = new THREE.Vector3();
    for (let i = 0; i < w.count; i++) {
      w.getMatrixAt(i, m); p.setFromMatrixPosition(m).applyMatrix4(w.matrixWorld);
      let best = -1, bd = 1e9;
      for (let k = 0; k < boxes.length; k++) {
        const b = boxes[k];
        const d = p.x < b.min.x ? b.min.x - p.x : p.x > b.max.x ? p.x - b.max.x : 0;
        const dc = Math.abs(p.x - (b.min.x + b.max.x) / 2) * 1e-3;
        if (d + dc < bd) { bd = d + dc; best = k; }
      }
      map[i] = best;
    }
    wheelUnit = map;
    w.frustumCulled = false;
  }
  const mW = new THREE.Matrix4();
  function carryWheels() {
    const w = train.wheels as THREE.InstancedMesh | undefined;
    if (!wheelUnit || !w) return;
    for (let i = 0; i < wheelUnit.length; i++) {
      const k = wheelUnit[i]; if (k < 0) continue;
      w.getMatrixAt(i, mW); mW.premultiply(delta[k]); w.setMatrixAt(i, mW);
    }
    w.instanceMatrix.needsUpdate = true;
  }

  /** root-local -> world on the scratch vector */
  const W = (out: THREE.Vector3, x: number, y: number, z: number) => out.set(S.tx + x, y, z);
  const unitPoint = (k: number, x: number, y: number, z: number, out: THREE.Vector3) => units[k].localToWorld(out.set(x, y, z));

  /* ---------- event spawns (keyed on simulation time s since impact) ---------- */
  const EV = [0, 0.5, 1.2, 1.25, 1.35];
  function fire(i: number) {
    const R = Math.random;
    if (i === 0) { // impact: sleepers and rail torn up under the front, a spray of sparks, a wall of dust
      const f = unitPoint(0, 4.2, 0.3, 0, v1);
      for (let k = 0; k < 12; k++) debris.spawn(f.x + R() * 3, 0.3, f.z + (R() - 0.5) * 2.4, 4 + R() * 9, 3 + R() * 8, (R() - 0.65) * 8, 2.4, 0.16, 0.26, k % 3 ? '#4a3a2c' : '#5a4838');
      for (let k = 0; k < 5; k++) debris.spawn(f.x + R(), 0.6, f.z + (R() - 0.5), 8 + R() * 6, 4 + R() * 5, 2 + R() * 5, 1.6 + R() * 2, 0.12, 0.1, '#8a8e96');
      for (let k = 0; k < 24; k++) debris.spawn(f.x + R() * 3, 0.35, f.z + (R() - 0.5) * 2, (R() - 0.2) * 12, 4 + R() * 7, (R() - 0.4) * 10, 0.14, 0.12, 0.14, R() < 0.5 ? '#6e675e' : '#8b8378'); // ballast stones
      for (let k = 0; k < 260; k++) sparks.spawn(f.x + (R() - 0.5) * 2, 0.4 + R() * 0.8, f.z + (R() - 0.5) * 2, 6 + R() * 18, 1 + R() * 9, (R() - 0.3) * 14, 0.5 + R() * 1.1, 9.8, 0.15, 1.3);
      for (let k = 0; k < 36; k++) { const a = R() * Math.PI * 2, sp = 3 + R() * 6; dust.spawn(f.x - R() * 6, 0.4 + R(), f.z + (R() - 0.3) * 3, Math.cos(a) * sp + 3, 0.8 + R() * 2.5, Math.sin(a) * sp, 2.2, 7.5, 3.5 + R() * 3, 0.6, 0.62); } // a ring of dust
      for (let k = 0; k < 14; k++) { const p = unitPoint(0, -1 + R() * 4, 2.6, (R() - 0.5) * 1.6, v2); dust.spawn(p.x, p.y, p.z, (R() - 0.5) * 3, 3 + R() * 4, 1 + R() * 3, 1.6, 6, 2.6 + R() * 1.5, 0.55, 1.05); } // the boiler bursts: white steam
    } else if (i === 1) { // coach windows burst
      for (let k = 0; k < 10; k++) { const p = unitPoint(1, (R() - 0.5) * 7, 2.9, 1.2, v1); debris.spawn(p.x, p.y, p.z, (R() - 0.3) * 4, 2 + R() * 3, 2 + R() * 4, 0.3, 0.02, 0.22, '#c8ccd2'); }
    } else if (i === 2 || i === 3) { // loco / van hit the ground on their sides
      const k = i === 2 ? 0 : 2;
      if (!units[k]) return;
      for (let j = 0; j < 30; j++) { const p = unitPoint(k, (R() - 0.5) * 9, 0.4, 0, v1); dust.spawn(p.x, 0.4 + R() * 0.6, p.z + (R() - 0.2) * 3, (R() - 0.5) * 5, 0.8 + R() * 2, 1 + R() * 4, 2.6, 7.5, 3.5 + R() * 3, 0.6, 0.66); }
      for (let j = 0; j < 7; j++) { const p = unitPoint(k, (R() - 0.5) * 8, 1.5, 0, v1); debris.spawn(p.x, p.y + 1, p.z + 1, (R() - 0.5) * 6, 3 + R() * 4, 2 + R() * 5, 0.9 + R() * 1.4, 0.06, 0.24, R() < 0.5 ? '#3a3028' : '#6a6a70'); }
      for (let j = 0; j < 70; j++) { const p = unitPoint(k, (R() - 0.5) * 9, 0.3, 0, v1); sparks.spawn(p.x, 0.2, p.z + 1, (R() - 0.5) * 10, 2 + R() * 5, 2 + R() * 7, 0.4 + R() * 0.7, 9.8, 0.12, 1); }
    } else if (i === 4) { // glass from the van
      if (!units[2]) return;
      for (let k = 0; k < 8; k++) { const p = unitPoint(2, (R() - 0.5) * 7, 2.9, 1.2, v1); debris.spawn(p.x, p.y, p.z, (R() - 0.5) * 3, 2 + R() * 2, 1 + R() * 3, 0.26, 0.02, 0.2, '#c8ccd2'); }
    }
  }

  function continuous(s: number, ds: number) {
    const R = Math.random;
    if (ds <= 0) return;
    // screeching wheels just before the impact, then the loco scraping along on its side
    if (s > -0.32 && s < T_SLIDE[0]) {
      const rate = s < 0 ? 420 * (1 + 2 * smooth(-0.32, 0, s)) : 520 * (1 - s / T_SLIDE[0]);
      S.emitSp += rate * ds;
      while (S.emitSp >= 1) {
        S.emitSp -= 1;
        if (s < 0) {
          const wx = [-3.35, -1.75, -0.15, 2.15, 3.35][(R() * 5) | 0], sd = R() < 0.5 ? 1 : -1;
          const p = unitPoint(0, wx, 0.6, sd * 0.74, v1);
          sparks.spawn(p.x, p.y, p.z, -4 - R() * 12, 1 + R() * 5, sd * (R() * 3.5), 0.25 + R() * 0.6, 9.8, 0.1, 1.1);
          if (R() < 0.45) { // the carriages' locked wheels too
            const k = 1 + ((R() * 2) | 0); if (units[k]) { const q = unitPoint(k, R() < 0.5 ? -3.2 : 3.2, 0.6, sd * 0.74, v2); sparks.spawn(q.x, q.y, q.z, -3 - R() * 9, 0.8 + R() * 3, sd * R() * 2.5, 0.2 + R() * 0.45, 9.8, 0.08, 0.95); }
          }
        } else {
          const p = unitPoint(0, -4.5 + R() * 9, 0.2, 1.1, v1);
          sparks.spawn(p.x, Math.max(0.1, p.y), p.z, -6 - R() * 12 + V * (1 - s / T_SLIDE[0]) * 0.4, 1.5 + R() * 6, (R() - 0.2) * 7, 0.35 + R() * 0.8, 9.8, 0.12, 1.15);
        }
      }
    }
    if (s > 0.1 && s < 1.6) { // cars' bogies grinding in the ballast
      S.dustAcc += 90 * ds;
      while (S.dustAcc >= 1) {
        S.dustAcc -= 1;
        const k = 1 + ((R() * 2) | 0); if (!units[k]) continue;
        const p = unitPoint(k, (R() - 0.5) * 8, 0.3, 0, v1);
        if (R() < 0.6) sparks.spawn(p.x, 0.25, p.z, -3 + R() * 6, 1 + R() * 4, (R() - 0.5) * 6, 0.3 + R() * 0.5, 9.8, 0.1, 0.9);
        else dust.spawn(p.x, 0.5, p.z + 1, (R() - 0.5) * 2, 0.6 + R(), 0.5 + R() * 2, 1.6, 5.5, 2.5 + R() * 2, 0.4, 0.66);
      }
    }
    if (s > 0 && s < T_SLIDE[0]) { // plough dust behind the loco
      S.emitDust += 34 * ds;
      while (S.emitDust >= 1) { S.emitDust -= 1; const p = unitPoint(0, -4 + R() * 8, 0.3, 0.8, v1); dust.spawn(p.x, 0.5, p.z, (R() - 0.5) * 3, 0.8 + R() * 1.5, 1 + R() * 3, 1.8, 6.5, 3 + R() * 2, 0.5, 0.68); }
    }
    // after it settles: embers from the spilled firebox and steam hissing from the boiler
    if (s > 0.9) {
      S.emitEmber += (s > 3 ? 7 : 16) * ds;
      while (S.emitEmber >= 1) {
        S.emitEmber -= 1;
        const p = unitPoint(0, -3.2 + R() * 1.4, 1.4, 0, v1);
        sparks.spawn(p.x + (R() - 0.5), Math.max(0.3, p.y), p.z + (R() - 0.5), (R() - 0.5) * 0.8, 0.8 + R() * 1.4, (R() - 0.5) * 0.8, 2.5 + R() * 3, -0.25, 0.1, 0.55, 1.8);
      }
      S.emitHiss += (s < 2.5 ? 14 : 7) * ds;
      while (S.emitHiss >= 1) { // a ruptured steam pipe venting sideways out of the boiler, then rising
        S.emitHiss -= 1;
        const p = unitPoint(0, 0.5 + R() * 2.5, 2.4, 0, v1);
        dust.spawn(p.x, p.y, p.z, (R() - 0.5) * 2.5, 1.4 + R() * 1.2, 1.5 + R() * 2.5, 0.9, 5.5, 3.2 + R() * 2, 0.42, 1.05);
      }
    }
    // the wreck burning: heavy smoke rolling off the firebox, drifting over the wreck on the night breeze
    if (s > 1.0) {
      S.emitSmoke += (s < 3 ? 12 : 8) * ds;
      while (S.emitSmoke >= 1) {
        S.emitSmoke -= 1;
        const p = unitPoint(0, -3.4 + R() * 2, 1.2, 0, v1);
        smoke.spawn(p.x + (R() - 0.5), Math.max(0.8, p.y + 0.3), p.z + (R() - 0.5), -1.1 - R() * 0.8, 0.8 + R() * 0.7, 0.4 + R() * 0.5, 2.8, 4, 6 + R() * 3, 0.62, 1.25);
      }
    }
  }

  /* ---------- rescuers ---------- */
  // the lead rescuer hurries along the field past the wreck, sweeping the ground with his lantern.
  // (Who they find, and the page in his hand, is our filmed scene, not animated.)
  const hero = (ct: number, out: { x: number; z: number; yaw: number; walk: number; raise: number }) => {
    const a = clamp((ct - 5.4) / (CRASH.END - 5.4), 0, 1);
    out.x = lerp(1, -9.5, a); out.z = lerp(8.4, 7.6, a); out.yaw = Math.PI; out.walk = 1; out.raise = 0;
  };
  const HS = { x: 0, z: 0, yaw: 0, walk: 0, raise: 0 };

  function placeFig(i: number, x: number, y: number, z: number, yaw: number, walk: number, now: number, raise: number) {
    const f = figs[i], ph = now / 1000 * 7.5 + i * 2;
    const bob = reduced ? 0 : walk * Math.abs(Math.sin(ph)) * 0.06;
    f.body.visible = true; f.lamp.visible = true;
    f.body.position.set(x, y + bob, z); f.body.rotation.set(0, yaw, reduced ? 0 : walk * Math.sin(ph) * 0.04);
    // lantern held forward on the camera side; swings as they walk, raised when looking
    const sw = reduced ? 0 : walk * Math.sin(ph * 0.5) * 0.08;
    const fx = Math.cos(yaw), fz = -Math.sin(yaw);
    const fwd = lerp(0.35, 0.75, raise), up = lerp(0.95, 1.05, raise);
    const side = 0.3 * (1 - raise);
    f.lx = x + fx * fwd + fz * side + sw * fx; f.ly = y + up + bob * 0.5 + (reduced ? 0 : Math.sin(now / 330 + i) * 0.02); f.lz = z + fz * fwd - fx * side + sw * fz;
    f.lamp.position.set(f.lx, f.ly, f.lz);
  }

  function hideAll() {
    sparks.lines.visible = sparks.heads.visible = false;
    dust.points.visible = false; debris.visible = false; glows.points.visible = false;
    smoke.points.visible = false; winGlow.points.visible = false; bent.visible = false; moon.intensity = 0;
    for (const f of figs) { f.body.visible = false; f.lamp.visible = false; }
    lantern.intensity = 0;
  }
  function showAll() {
    sparks.lines.visible = sparks.heads.visible = true;
    dust.points.visible = true; debris.visible = true; glows.points.visible = true;
    smoke.points.visible = true; winGlow.points.visible = true; bent.visible = true;
  }
  hideAll();

  const crash: Crash = {
    lights: 1,
    on(ct, derail) { return ct >= 0 || derail > 0; },
    runX(ct) {
      if (ct < 0) return 0;
      const tau = tauOf(ct);
      return tau < TI ? IMP - V * (TI - tau) : 0;
    },
    dark(ct) {
      if (ct < 0) return 0;
      return (0.35 + 0.5 * smooth(CRASH.IMPACT + 0.05, CRASH.AFTER, ct)) * (1 - smooth(CRASH.FADE, CRASH.END, ct));
    },
    update(ct, derail, tx, now, dt) {
      S.tx = tx;
      const on = ct >= 0 || derail > 0;
      if (!on) {
        if (S.on) { // travelled away / replay: clear the wreck
          hideAll(); sparks.clear(); debris.clear(); S.on = false; S.prevTau = -1; S.fire = 0; this.lights = 1;
        }
        return;
      }
      if (!S.on || (ct >= 0 && ct < S.prevCt - 0.001)) { // (re)start
        showAll(); sparks.clear(); debris.clear(); S.prevTau = -1;
        S.emitSp = S.emitDust = S.emitEmber = S.emitHiss = S.emitSmoke = 0;
      }
      S.on = true;
      const cte = ct >= 0 ? ct : CRASH.END + 5; // after the sequence the wreck stays in its final pose
      S.ct = ct;
      const tau = tauOf(cte), s = tau - TI;
      S.tau = tau; S.s = s;
      let ds = S.prevTau < 0 ? 0 : tau - S.prevTau;
      if (ds > 0.5 && ds < 30) { // skipped ahead: age what is already in the air through the gap so the impact dust has settled
        for (let a = ds; a > 0.1; a -= 0.1) { sparks.update(0.1); dust.update(0.1); smoke.update(0.1); debris.update(0.1); }
      }
      if (ds < 0 || ds > 0.5) ds = Math.min(Math.max(ds, 0), 0.1);
      S.prevCt = ct;

      // pose the train: record where train.update put each unit, move it, then carry the wheels along
      if (!wheelMapped) mapWheels();
      for (let k = 0; k < units.length; k++) rest[k].copy(units[k].matrixWorld);
      poseWreck(s, tau);
      for (let k = 0; k < units.length; k++) {
        units[k].updateMatrixWorld(true);
        delta[k].multiplyMatrices(units[k].matrixWorld, mInv.copy(rest[k]).invert());
      }
      carryWheels();

      // events + continuous emitters, all on the simulation clock
      if (S.prevTau >= 0 && tau - S.prevTau < 0.5) for (let i = 0; i < EV.length; i++) { const t = TI + EV[i]; if (S.prevTau < t && tau >= t && ct >= 0) fire(i); }
      if (ct >= 0) continuous(s, ds);
      else if (s > 0.9) { // the wreck still smoulders behind the station card
        S.emitEmber += 3 * dt;
        while (S.emitEmber >= 1) { S.emitEmber -= 1; const p = unitPoint(0, -3.2 + Math.random() * 1.4, 1.4, 0, v1); sparks.spawn(p.x, Math.max(0.3, p.y), p.z, 0, 0.8 + Math.random(), 0, 3 + Math.random() * 2, -0.25, 0.1, 0.45, 1.8); }
      }
      S.prevTau = tau;
      const simDt = ct >= 0 ? ds : dt;
      sparks.update(simDt); dust.update(simDt); smoke.update(simDt); debris.update(simDt);

      // lamps and windows: steady, a surge at the jolt, then each window flickers and goes dark on its own
      let L = 1, sum = 0;
      for (let i = 0; i < WIN.length; i++) {
        const die = WIN_DIE[i];
        let w = 1;
        if (s >= 0) {
          if (s < 0.05) w = 1.8;
          else if (s < die) w = hash(Math.floor(s * 26) + i * 17.3) > 0.25 + 0.6 * (s / die) ? 1 : 0.12;
          else w = s < die + 0.12 && hash(Math.floor(s * 40) + i) > 0.6 ? 0.5 : 0; // a last sputter
        }
        sum += w;
        const [k, x, y, z] = WIN[i];
        if (!units[k] || w <= 0) { winGlow.set(i, 0, -50, 0, 0, 0, 0, 0); continue; }
        const p = unitPoint(k, x, y, z, v1), head = i === 1;
        winGlow.set(i, p.x, p.y, p.z, (head ? 0.7 : 1.1) * w, (head ? 0.6 : 0.68) * w, (head ? 0.4 : 0.3) * w, head ? 1.0 : 1.25);
      }
      winGlow.commit();
      if (s >= 0) L = Math.min(1.6, (sum / WIN.length) * 1.1);
      this.lights = L;

      // the buckled rail: lying in wait ahead of the loco, torn out and flung at the impact
      {
        const bx = S.tx + IMP + BENT_X, hot = s > -0.3 ? smooth(-0.3, 0, s) : 0;
        if (s < 0) { bent.position.set(bx, 0.55, 0.72); bent.rotation.set(0, 0, 0); }
        else { // a ballistic arc over ~0.95 s, two full tumbles, landing flat in the field
          const u = Math.min(s, 0.95) / 0.95;
          bent.position.set(bx + 5 * u - 1.2 * u * u, 0.55 + 5.2 * u - 5.25 * u * u, 0.72 - 4.5 * u);
          bent.rotation.set(-Math.PI * 2 * u, 0.9 * u, Math.PI * 2 * u);
        }
        bentMat.emissiveIntensity = (s < 0 ? hot * 0.15 : 0.6 * Math.exp(-2.5 * s)) * (reduced ? 0 : 1);
      }

      // impact flash
      if (s >= 0 && s < 0.4 && ct >= 0) {
        const p = unitPoint(0, 4.6, 1.2, 0.2, v1), a = Math.exp(-9 * s);
        glows.set(4, p.x + 0.8, p.y, p.z, 4 * a, 2.9 * a, 1.9 * a, 3.5 + 5 * s);
      } else glows.set(4, 0, -50, 0, 0, 0, 0, 0);

      // smoke lighting + moonlight on the aftermath
      const fireK = S.fire * (0.85 + 0.15 * Math.sin(now / 80));
      smoke.mat.uniforms.uLit.value.copy(MOON_TOP);
      smoke.mat.uniforms.uAmb.value.copy(FIRE_BOT).multiplyScalar(0.25 + 0.9 * fireK);
      const moonK = smooth(CRASH.WIDE, CRASH.AFTER + 0.8, cte) * (ct >= 0 ? 1 - 0.6 * smooth(CRASH.FADE, CRASH.END, ct) : 0.4);
      moon.intensity = 1.1 * moonK;
      moon.position.set(S.tx - 40, 45, 35); moon.target.position.set(S.tx - 6, 0, 0); moon.target.updateMatrixWorld();

      // fire in the spilled firebox
      S.fire = s < 0.8 ? 0 : smooth(0.8, 2.2, s);

      // rescuers + lanterns
      glows.set(3, 0, -50, 0, 0, 0, 0, 0);
      if (s > 0.8) {
        const p = unitPoint(0, -3.0, 1.2, 0.2, v1), fk = 0.8 + 0.2 * Math.sin(now / 70) * Math.sin(now / 130 + 1);
        glows.set(3, p.x, Math.max(0.4, p.y), p.z + 0.6, 1.6 * S.fire * fk, 0.62 * S.fire * fk, 0.2 * S.fire * fk, 3.2);
      }
      const showFig = cte >= CRASH.AFTER;
      if (showFig) {
        hero(Math.min(cte, CRASH.END), HS);
        placeFig(0, tx + HS.x, 0, HS.z, HS.yaw, ct >= 0 ? HS.walk : 0, now, HS.raise);
        const b = clamp((Math.min(cte, CRASH.END) - 5.8) / (CRASH.END - 5.8), 0, 1);
        placeFig(1, tx - 36 + 12 * b, 0, 9.4 - b, 0.05, ct >= 0 && b < 1 ? 0.8 : 0, now, 0);
        const c = clamp((Math.min(cte, CRASH.END) - 5.3) / (CRASH.END - 5.3), 0, 1);
        placeFig(2, tx - 26 + 21 * c, 1.0, -4.3, -0.02, ct >= 0 && c < 1 ? 0.7 : 0, now, 0.2);
        const inA = smooth(CRASH.AFTER, CRASH.AFTER + 0.6, Math.min(cte, CRASH.END));
        for (let i = 0; i < 3; i++) {
          const f = figs[i], k = inA * (i === 0 ? 1 : 0.8) * (0.9 + 0.1 * Math.sin(now / 90 + i * 3));
          glows.set(i, f.lx, f.ly, f.lz, 2.6 * k, 1.8 * k, 0.9 * k, 1.1);
        }
        // the lead lantern is a real light: it sweeps the ground ahead as he searches the field
        const f = figs[0], cc = Math.min(cte, CRASH.END);
        lantern.position.set(f.lx, f.ly + 0.05, f.lz);
        lantern.target.position.set(f.lx - 3.2, 0, f.lz - 1.2 + Math.sin(cc * 2.1) * 1.1);
        lantern.target.updateMatrixWorld();
        lantern.intensity = 120 * inA * (ct >= 0 ? 1 : 0.6);
        glows.set(5, f.lx, f.ly, f.lz, 0.7 * inA, 0.47 * inA, 0.24 * inA, 1.8);
      } else {
        for (const f of figs) { f.body.visible = false; f.lamp.visible = false; }
        for (let i = 0; i < 3; i++) glows.set(i, 0, -50, 0, 0, 0, 0, 0);
        glows.set(5, 0, -50, 0, 0, 0, 0, 0);
        lantern.intensity = 0;
      }

      glows.commit();
    },
    late(camera, shake, now) {
      // borrow the station lamp light: firebox glow on the racing engine, then the wreck fire
      if (S.on) {
        S.restored = false;
        if (S.s < 0) { const p = unitPoint(0, -3.6, 2.6, 1.6, v1); lampLight.position.copy(p); lampLight.color.copy(FIRE); lampLight.intensity = 22 * (0.85 + 0.15 * Math.sin(now / 60)); }
        else {
          const p = unitPoint(0, -3.0, 1.6, 0, v1);
          lampLight.position.set(p.x, Math.max(0.8, p.y + 0.4), p.z + 1.2);
          lampLight.color.copy(FIRE);
          const fk = 0.75 + 0.25 * Math.sin(now / 55) * Math.sin(now / 97 + 2);
          lampLight.intensity = (S.s < 0.08 ? 160 : 60 * S.fire) * fk * (S.ct >= 0 ? 1 : 0.5);
        }
      } else if (!S.restored) { lampLight.color.copy(lampCol0); S.restored = true; }

      const ct = S.ct;
      if (S.on && ct >= 0) {
        const tx = S.tx, tau = S.tau;
        let fov = 34, shk = 0, roll = 0;
        if (ct < CRASH.RUN2) { // A: low beside the driving wheels, racing
          const L = unitPoint(0, 0, 0, 0, v1);
          camP.set(L.x + 9.5 - ct * 3.2, 0.95, 6.2); camL.set(L.x - 3.5 - ct * 2, 1.9, 0);
          if (!reduced) { camP.y += Math.sin(now * 0.05) * 0.015 + Math.sin(now * 0.021) * 0.02; }
          fov = 44;
        } else if (ct < CRASH.SCREECH) { // B: high and wide, the whole train racing across the dark plain (exterior only)
          const u = ct - CRASH.RUN2;
          const L = unitPoint(0, 0, 0, 0, v1);
          camP.set(L.x + 4 - u * 9, 5.2 - u * 0.4, 24);
          camL.set(L.x - 9 - u * 4, 1.4, 0);
          if (!reduced) camP.y += Math.sin(now * 0.004) * 0.03;
          fov = 38;
        } else if (ct < CRASH.WIDE) { // C: low, ahead of the train; impact in slow motion
          W(camP, IMP + 11.5, 0.75, 7.6);
          const L = unitPoint(0, 2.5, 1.9, 0, v1);
          camL.copy(L);
          // a creeping push as the brakes scream, then a hard punch-in on the impact
          fov = 40 - 3 * smooth(CRASH.SCREECH, CRASH.IMPACT, ct) - 9 * smooth(CRASH.IMPACT, CRASH.IMPACT + 0.25, ct);
          shk = ct > CRASH.SCREECH + 0.05 ? 0.3 + 0.35 * smooth(CRASH.SCREECH, CRASH.IMPACT, ct) : 0.1;
          if (!reduced) roll = 0.06 * smooth(CRASH.IMPACT, CRASH.IMPACT + 0.3, ct);
        } else if (ct < CRASH.AFTER) { // D: wide, the wreck tumbles at full speed
          const u = (ct - CRASH.WIDE) / (CRASH.AFTER - CRASH.WIDE);
          W(camP, -13 + u * 1.5, 7.5 - u * 0.6, 44 - u * 3); W(camL, -13, 1.6, 0);
          fov = 36; shk = 0.25 * (1 - u);
          if (!reduced) roll = -0.025 * (1 - u);
        } else { // E: the wide aftermath, a slow push-in on the wreck (no close-ups: the rescue is on film)
          const u = ease(clamp((ct - CRASH.AFTER - 0.2) / (CRASH.END - CRASH.AFTER - 0.2), 0, 1));
          W(camP, lerp(-4.5, -6.5, u), lerp(5.8, 4.4, u), lerp(29, 21, u));
          W(camL, lerp(-8, -8.6, u), lerp(1.4, 1.0, u), lerp(0, 0.8, u));
          fov = lerp(36, 33, u);
        }
        // kicks tuned to the hits (simulation clock): the impact, then the loco and the van landing
        const ss = S.s;
        const kick = ss < 0 ? 0 : 1.6 * Math.exp(-7 * ss) + (ss > 1.2 ? 0.9 * Math.exp(-8 * (ss - 1.2)) : 0) + (ss > 1.25 ? 0.7 * Math.exp(-8 * (ss - 1.25)) : 0) + (ss > 0.5 ? 0.35 * Math.exp(-9 * (ss - 0.5)) : 0);
        if (!reduced && (shake > 0 || kick > 0.01)) {
          // heavy and slow in slow motion: phase runs on the simulation clock
          const a = ((shk || 0.15) * shake + kick * 0.6) * 0.22, p = tau * 1000;
          camP.x += (Math.sin(p * 0.047) + Math.sin(p * 0.083) * 0.5) * a;
          camP.y += (Math.sin(p * 0.061 + 1) + Math.sin(p * 0.101) * 0.5) * a * 0.7;
          camL.x += Math.sin(p * 0.053 + 2) * a * 0.4; camL.y += Math.sin(p * 0.071) * a * 0.3;
        }
        camera.position.copy(camP);
        if (!reduced) roll += kick * 0.02 * Math.sin(tau * 37);
        camera.up.set(Math.sin(roll), Math.cos(roll), 0);
        camera.lookAt(camL);
        camera.fov = fov;
        lastP.copy(camera.position); lastQ.copy(camera.quaternion); S.lastFov = fov;
        S.wasOn = true; S.endAt = -1;
      } else if (S.wasOn) { // ease from the last crash shot back to the world camera
        if (S.endAt < 0) S.endAt = now;
        const w = 1 - smooth(0, 1, (now - S.endAt) / 1500);
        if (w <= 0) S.wasOn = false;
        else {
          qTmp.copy(camera.quaternion);
          camera.position.lerp(lastP, w);
          camera.quaternion.copy(qTmp).slerp(lastQ, w);
          camera.fov = lerp(camera.fov, S.lastFov, w);
        }
      }
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
      scene.remove(lantern, lantern.target, bent, moon, moon.target);
      for (const f of figs) scene.remove(f.body, f.lamp);
    },
  };
  return crash;
}
