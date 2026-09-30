// Station 1 (October 1961): Ashoke's night train derails near Jamshedpur.
// A ~12 s directed sequence driven by the engine's crash clock (lib/engine.ts crashTick, WorldFrame.crashT):
//   A 0.00  low tracking shot beside the racing locomotive (clacks accelerate)
//   B 1.30  a lit carriage window: a man reading
//   C 2.25  screech; low static shot ahead of the train; impact at 2.55 drops into slow motion
//   D 3.50  hard cut to a wide shot at full speed: loco ploughs off, coach jackknifes, van rolls; lights flicker and die
//   E 5.30  aftermath in the dark: smoke, embers, rescuers' lanterns; one lantern passes, turns back and finds
//           a hand holding a crumpled page of "The Overcoat" (8.5); hold, then fade back to the station card (12.0)
// The train's own update() poses the cars on the rails; this module overrides loco/car transforms afterwards
// (and carries the instanced wheels along), so it keeps working when the train model is replaced.
import * as THREE from 'three';
import type { TrainParts } from './train';
import { clamp, lerp, smooth, canvasTex, starTexture, paint, place, merge, boxMM } from './kit';
import { Puffs, Glows, Sparks, Debris } from './fx';

/** Crash clock marks (seconds of WorldFrame.crashT). lib/engine.ts keeps its sound/caption cues in step with these. */
export const CRASH = { WINDOW: 1.3, SCREECH: 2.25, IMPACT: 2.55, SLOW0: 2.6, SLOW1: 3.5, WIDE: 3.5, AFTER: 5.3, FIND: 8.5, FADE: 11.0, END: 12.0 } as const;
const SLOW_RATE = 0.3; // time dilation during the impact
const V = 24; // train speed before the derail, world units / s
const LOCO_REST = { x: 2.5, z: 3.0 }, COACH_REST = { x: -5.9, z: 1.0 }, VAN_REST = { x: -14.5, z: 1.9 };
const HAND = new THREE.Vector3(-9.2, 0, 4.05); // root-local (root sits at the station's x once derailed)

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
  /** after train.update(): pose the wreck, run particles, rescuers and the page */
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
  const sparks = keep(new Sparks(scene, opts.uScale, 900));
  const dust = keep(new Puffs(scene, 300));
  dust.mat.uniforms.uScale = opts.uScale;
  dust.mat.uniforms.uLit = opts.puffs.mat.uniforms.uLit;
  dust.mat.uniforms.uAmb = opts.puffs.mat.uniforms.uAmb;
  const debris = keep(new Debris(scene, 64));
  const glows = keep(new Glows(scene, 8)); // 0..2 lanterns, 3 fire, 4 page, 5 hero lantern halo
  glows.mat.uniforms.uScale = opts.uScale;

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

  /* ---------- a man reading at a lit window (car 0) ---------- */
  const readerTex = keep(canvasTex(128, 104, (c) => {
    c.fillStyle = '#050403';
    c.beginPath(); c.ellipse(52, 34, 15, 18, -0.15, 0, Math.PI * 2); c.fill(); // head, bowed over the page
    c.beginPath(); c.moveTo(20, 104); c.quadraticCurveTo(22, 58, 50, 54); c.quadraticCurveTo(76, 54, 84, 72); c.lineTo(92, 104); c.fill(); // shoulders
    c.fillRect(44, 44, 14, 16); // neck
    c.save(); c.translate(88, 64); c.rotate(-0.5); c.fillRect(-4, -16, 30, 30); c.restore(); // the open book
    c.strokeStyle = '#050403'; c.lineWidth = 2; c.beginPath(); c.moveTo(62, 30); c.lineTo(69, 32); c.stroke(); // spectacles
  }));
  const reader = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.82, 0.66)), keep(new THREE.MeshBasicMaterial({ map: readerTex, transparent: true, depthWrite: false })));
  reader.position.set(-2.01, 2.86, 1.13);
  reader.visible = false;
  if (train.cars[0]) train.cars[0].add(reader);

  /* ---------- the hand, the crumpled page and its glint ---------- */
  const pageTex = keep(canvasTex(256, 320, (c) => {
    const g = c.createLinearGradient(0, 0, 256, 320); g.addColorStop(0, '#f3ead3'); g.addColorStop(0.55, '#e4d8b9'); g.addColorStop(1, '#f0e6cc');
    c.fillStyle = g; c.fillRect(0, 0, 256, 320);
    c.fillStyle = '#4a4538'; c.font = 'bold 22px Georgia, serif'; c.textAlign = 'center'; c.fillText('THE OVERCOAT', 128, 42);
    c.fillStyle = 'rgba(60,56,48,.55)';
    for (let k = 0; k < 14; k++) c.fillRect(26, 70 + k * 16, k % 4 === 3 ? 120 : 204, 5);
    c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 120); c.lineTo(256, 180); c.moveTo(90, 0); c.lineTo(150, 320); c.moveTo(0, 250); c.lineTo(256, 230); c.stroke();
  }));
  const pageMat = keep(new THREE.MeshStandardMaterial({ map: pageTex, emissiveMap: pageTex, emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.8, side: THREE.DoubleSide }));
  const pageGeo = keep(new THREE.PlaneGeometry(0.62, 0.8, 8, 10));
  {
    const p = pageGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      p.setZ(i, Math.sin(x * 9 + y * 4) * 0.03 + Math.sin(y * 13 - x * 5) * 0.025 + Math.max(0, x + 0.12) * 0.22 * (0.5 + y)); // crumpled, one side curling into the fist
    }
    pageGeo.computeVertexNormals();
  }
  const victim = new THREE.Group(); victim.visible = false; scene.add(victim);
  const page = new THREE.Mesh(pageGeo, pageMat);
  page.position.set(0.42, 0.07, 0.12); page.rotation.set(-Math.PI / 2 + 0.12, 0, 0.5);
  victim.add(page);
  {
    const SK = '#6b4630', SL = '#cfc8b8';
    const parts: THREE.BufferGeometry[] = [
      paint(place(new THREE.CylinderGeometry(0.1, 0.13, 0.9, 10), -0.62, 0.1, -0.22, 0, 0, Math.PI / 2 - 0.08), SL), // kurta sleeve
      paint(place(new THREE.CylinderGeometry(0.058, 0.07, 0.26, 10), -0.1, 0.075, -0.1, 0, 0, Math.PI / 2 - 0.05), SK), // wrist
      paint(place(new THREE.SphereGeometry(0.1, 12, 8), 0.07, 0.07, -0.07, 0, 0.2, 0, 1.15, 0.45, 0.95), SK), // back of the hand
    ];
    for (let k = 0; k < 4; k++) { // fingers curled over the page
      const z = -0.14 + k * 0.05;
      parts.push(paint(place(new THREE.CapsuleGeometry(0.022, 0.07, 3, 6), 0.19, 0.075, z, 0, 0, Math.PI / 2 - 0.5), SK));
      parts.push(paint(place(new THREE.CapsuleGeometry(0.02, 0.04, 3, 6), 0.245, 0.035, z + 0.004, 0, 0, Math.PI / 2 + 0.7), SK));
    }
    parts.push(paint(place(new THREE.CapsuleGeometry(0.024, 0.07, 3, 6), 0.12, 0.06, 0.05, 0.9, 0.5, 0), SK)); // thumb
    // a broken door panel and a plank across the arm: he is under the wreckage
    parts.push(paint(place(boxMM(-0.7, 0, -0.55, 0.7, 0.07, 0.55), -1.0, 0.24, -0.25, 0.15, 0.4, -0.18), '#3a2e26'));
    parts.push(paint(place(boxMM(-0.9, -0.05, -0.08, 0.9, 0.05, 0.08), -0.55, 0.3, 0.05, 0, -0.5, 0.12), '#4a3b2e'));
    const hg = keep(merge(parts));
    const hand = new THREE.Mesh(hg, keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 })));
    hand.castShadow = true;
    victim.add(hand);
  }
  victim.scale.setScalar(1.35);
  const glintTex = keep(starTexture());
  const glintMat = keep(new THREE.SpriteMaterial({ map: glintTex, color: new THREE.Color(3, 2.8, 2.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  const glint = new THREE.Sprite(glintMat);
  glint.visible = false; glint.renderOrder = 7; scene.add(glint);

  /* ---------- scratch ---------- */
  const units: THREE.Object3D[] = [train.loco, ...train.cars.slice(0, 2)];
  const rest = units.map(() => new THREE.Matrix4()), delta = units.map(() => new THREE.Matrix4());
  const mA = new THREE.Matrix4(), mB = new THREE.Matrix4(), mInv = new THREE.Matrix4(), vS = new THREE.Vector3();
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), camP = new THREE.Vector3(), camL = new THREE.Vector3();
  const lastP = new THREE.Vector3(), lastQ = new THREE.Quaternion(), qTmp = new THREE.Quaternion();
  const lampCol0 = lampLight.color.clone(), FIRE = new THREE.Color(1, 0.5, 0.2);
  let wheelUnit: Int8Array | null = null, wheelMapped = false;
  const S = { prevTau: -1, prevCt: -1, tx: 0, ct: -1, tau: -1, s: -1, on: false, wasOn: false, endAt: -1, lastFov: 34, glintT0: -1, glinted: false,
    fire: 0, dustAcc: 0, emitSp: 0, emitDust: 0, emitEmber: 0, emitHiss: 0, restored: true };

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
      for (let k = 0; k < 9; k++) debris.spawn(f.x + R() * 2, 0.3, f.z + (R() - 0.5) * 2, 6 + R() * 10, 3 + R() * 6, 1 + R() * 6, 2.4, 0.16, 0.26, k % 3 ? '#4a3a2c' : '#5a4838');
      for (let k = 0; k < 3; k++) debris.spawn(f.x + R(), 0.6, f.z + (R() - 0.5), 8 + R() * 6, 4 + R() * 4, 2 + R() * 4, 3.2, 0.12, 0.1, '#8a8e96');
      for (let k = 0; k < 160; k++) sparks.spawn(f.x + (R() - 0.5) * 2, 0.4 + R() * 0.8, f.z + (R() - 0.5) * 2, 8 + R() * 16, 1 + R() * 7, (R() - 0.3) * 12, 0.5 + R() * 0.9, 9.8, 0.14, 1.2);
      for (let k = 0; k < 26; k++) dust.spawn(f.x - R() * 8, 0.5 + R(), f.z + (R() - 0.3) * 4, 3 + R() * 6, 1 + R() * 2, R() * 4, 2.2, 7, 3 + R() * 2.5, 0.55, 0.7);
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
      const rate = s < 0 ? 260 : 420 * (1 - s / T_SLIDE[0]);
      S.emitSp += rate * ds;
      while (S.emitSp >= 1) {
        S.emitSp -= 1;
        if (s < 0) {
          const wx = [-3.35, -1.75, -0.15, 2.15, 3.35][(R() * 5) | 0], sd = R() < 0.5 ? 1 : -1;
          const p = unitPoint(0, wx, 0.6, sd * 0.74, v1);
          sparks.spawn(p.x, p.y, p.z, -4 - R() * 10, 1 + R() * 4, sd * (R() * 3), 0.25 + R() * 0.5, 9.8, 0.09, 1);
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
      S.emitHiss += 5 * ds;
      while (S.emitHiss >= 1) {
        S.emitHiss -= 1;
        const p = unitPoint(0, 0.5 + R() * 2.5, 2.4, 0, v1);
        dust.spawn(p.x, p.y, p.z, (R() - 0.5) * 0.8, 1.1 + R() * 0.8, 0.3 + R() * 0.6, 1.2, 6, 4.5 + R() * 2, 0.32, 0.85);
      }
    }
  }

  /* ---------- rescuers ---------- */
  // hero: from beyond the engine, hurries along the field, passes him, stops, turns back and lowers the lantern
  const hero = (ct: number, out: { x: number; z: number; yaw: number; walk: number; raise: number }) => {
    const a = clamp((ct - 5.4) / (7.7 - 5.4), 0, 1);
    if (ct < 7.7) { out.x = lerp(1, -12.4, a); out.z = lerp(7.8, 6.9, a); out.yaw = Math.PI; out.walk = 1; out.raise = 0; }
    else if (ct < 8.05) { out.x = -12.4; out.z = 6.9; out.yaw = Math.PI + Math.sin((ct - 7.7) * 9) * 0.5; out.walk = 0.2; out.raise = 0; }
    else {
      const b = ease(clamp((ct - 8.05) / 0.55, 0, 1));
      out.x = lerp(-12.4, -10.7, b); out.z = lerp(6.9, 5.7, b); out.yaw = lerp(Math.PI, 0.83, b); out.walk = b < 1 ? 0.8 : 0; out.raise = b;
    }
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
    victim.visible = false; glint.visible = false; reader.visible = false;
    for (const f of figs) { f.body.visible = false; f.lamp.visible = false; }
    lantern.intensity = 0;
  }
  function showAll() {
    sparks.lines.visible = sparks.heads.visible = true;
    dust.points.visible = true; debris.visible = true; glows.points.visible = true;
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
          hideAll(); sparks.clear(); debris.clear(); S.on = false; S.prevTau = -1; S.glinted = false; S.fire = 0; this.lights = 1;
        }
        return;
      }
      if (!S.on || (ct >= 0 && ct < S.prevCt - 0.001)) { // (re)start
        showAll(); sparks.clear(); debris.clear(); S.prevTau = -1; S.glinted = false; S.glintT0 = -1;
        S.emitSp = S.emitDust = S.emitEmber = S.emitHiss = 0;
      }
      S.on = true;
      const cte = ct >= 0 ? ct : CRASH.END + 5; // after the sequence the wreck stays in its final pose
      S.ct = ct;
      const tau = tauOf(cte), s = tau - TI;
      S.tau = tau; S.s = s;
      let ds = S.prevTau < 0 ? 0 : tau - S.prevTau;
      if (ds > 0.5 && ds < 30) { // skipped ahead: age what is already in the air through the gap so the impact dust has settled
        for (let a = ds; a > 0.1; a -= 0.1) { sparks.update(0.1); dust.update(0.1); debris.update(0.1); }
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
      sparks.update(simDt); dust.update(simDt); debris.update(simDt);

      // lamps and windows: steady, then flicker and die after the impact
      let L = 1;
      if (s >= 0) {
        const fl = hash(Math.floor(s * 22)) > 0.45 + 0.4 * s / 2.2 ? 1 : 0.08;
        L = s < 2.2 ? fl * (1 - s / 2.2) : 0;
        if (s < 0.06) L = 1.6; // the jolt
      }
      this.lights = L;
      reader.visible = false; // the Blender coach has its own passenger silhouettes in the windows

      // fire in the spilled firebox
      S.fire = s < 0.8 ? 0 : smooth(0.8, 2.2, s);

      // rescuers + lanterns
      glows.set(3, 0, -50, 0, 0, 0, 0, 0);
      if (s > 0.8) {
        const p = unitPoint(0, -3.0, 1.2, 0.2, v1), fk = 0.8 + 0.2 * Math.sin(now / 70) * Math.sin(now / 130 + 1);
        glows.set(3, p.x, Math.max(0.4, p.y), p.z + 0.6, 1.6 * S.fire * fk, 0.62 * S.fire * fk, 0.2 * S.fire * fk, 3.2);
      }
      const dkE = crash.dark(ct);
      const showFig = cte >= CRASH.AFTER;
      if (showFig) {
        hero(Math.min(cte, CRASH.END), HS);
        placeFig(0, tx + HS.x, 0, HS.z, HS.yaw, ct >= 0 ? HS.walk : 0, now, HS.raise);
        const b = clamp((Math.min(cte, CRASH.END) - 5.8) / 6, 0, 1);
        placeFig(1, tx - 36 + 12 * b, 0, 9.4 - b, 0.05, ct >= 0 && b < 1 ? 0.8 : 0, now, 0);
        const c = clamp((Math.min(cte, CRASH.END) - 5.3) / 6.7, 0, 1);
        placeFig(2, tx - 26 + 21 * c, 1.0, -4.3, -0.02, ct >= 0 && c < 1 ? 0.7 : 0, now, 0.2);
        const inA = smooth(CRASH.AFTER, CRASH.AFTER + 0.6, Math.min(cte, CRASH.END));
        const near = smooth(8.05, 8.6, Math.min(cte, CRASH.END)); // the camera is beside the hero once he stoops
        for (let i = 0; i < 3; i++) {
          const f = figs[i], k = inA * (i === 0 ? 1 - 0.7 * near : 0.8) * (0.9 + 0.1 * Math.sin(now / 90 + i * 3));
          glows.set(i, f.lx, f.ly, f.lz, 2.6 * k, 1.8 * k, 0.9 * k, 1.1);
        }
        // the hero's lantern is a real light: sweeps the ground ahead, searches, then settles on the hand
        const f = figs[0], hw = W(v2, HAND.x + 0.3, 0.05, HAND.z + 0.15);
        let tx2: number, ty2: number, tz2: number;
        const cc = Math.min(cte, CRASH.END);
        if (cc < 7.7) { tx2 = f.lx - 3.2; ty2 = 0; tz2 = f.lz - 0.8 + Math.sin(cc * 2.1) * 0.8; }
        else if (cc < 8.05) { const u = (cc - 7.7) / 0.35; tx2 = f.lx - 2.6 + u * 2; ty2 = 0; tz2 = f.lz - 1.5 - u; }
        else { const u = ease(clamp((cc - 8.05) / 0.5, 0, 1)); tx2 = lerp(f.lx - 0.6, hw.x, u); ty2 = lerp(0, hw.y, u); tz2 = lerp(f.lz - 2.5, hw.z, u); }
        lantern.position.set(f.lx, f.ly + 0.05, f.lz);
        lantern.target.position.set(tx2, ty2, tz2);
        lantern.target.updateMatrixWorld();
        // once it settles on the hand the lamp is ~2 units from a white page: dim it so the page reads, not blows out
        const settle = cc < 8.05 ? 0 : ease(clamp((cc - 8.05) / 0.5, 0, 1));
        lantern.intensity = lerp(140, 7, settle) * inA * (ct >= 0 ? 1 : 0.6);
        glows.set(5, f.lx, f.ly, f.lz, 0.7 * inA, 0.47 * inA, 0.24 * inA, lerp(1.8, 0.9, settle));
      } else {
        for (const f of figs) { f.body.visible = false; f.lamp.visible = false; }
        for (let i = 0; i < 3; i++) glows.set(i, 0, -50, 0, 0, 0, 0, 0);
        glows.set(5, 0, -50, 0, 0, 0, 0, 0);
        lantern.intensity = 0;
      }

      // the hand and the page
      victim.visible = s > 0.2;
      victim.position.set(tx + HAND.x, HAND.y, HAND.z); victim.rotation.y = 0.35;
      const found = smooth(CRASH.FIND - 0.25, CRASH.FIND + 0.4, Math.min(cte, CRASH.END));
      pageMat.emissiveIntensity = 0.02 + 0.1 * found * (ct >= 0 ? 1 : 0.6) + 0.05 * (1 - dkE);
      page.getWorldPosition(v3);
      glows.set(4, v3.x, v3.y + 0.08, v3.z, 0.1 * found, 0.09 * found, 0.07 * found, 0.6 * found + 0.001);
      if (ct >= 0 && !S.glinted && ct >= CRASH.FIND + 0.15) { S.glinted = true; S.glintT0 = now; }
      const ga = S.glintT0 < 0 ? -1 : (now - S.glintT0) / 1100;
      if (ga >= 0 && ga < 1) {
        glint.visible = true;
        glint.position.set(v3.x + 0.1, v3.y + 0.2, v3.z + 0.1);
        const k = Math.sin(ga * Math.PI);
        glint.scale.setScalar(1.1 * k + 0.01);
        glintMat.rotation = ga * 1.4; glintMat.opacity = k;
      } else glint.visible = false;
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
        let fov = 34, shk = 0;
        if (ct < CRASH.WINDOW) { // A: low beside the driving wheels, racing
          const L = unitPoint(0, 0, 0, 0, v1);
          camP.set(L.x + 9.5 - ct * 3.2, 0.95, 6.2); camL.set(L.x - 3.5 - ct * 2, 1.9, 0);
          if (!reduced) { camP.y += Math.sin(now * 0.05) * 0.015 + Math.sin(now * 0.021) * 0.02; }
          fov = 44;
        } else if (ct < CRASH.SCREECH) { // B: the window, a man reading
          const u = ct - CRASH.WINDOW;
          // wide enough to read as a row of lit windows (passengers inside) racing through the night
          unitPoint(1, 1.2 - u * 0.6, 3.2, 8.2, camP);
          unitPoint(1, -1.2, 2.7, 1.1, camL);
          if (!reduced) camP.y += Math.sin(now * 0.004) * 0.03;
          fov = 40;
        } else if (ct < CRASH.WIDE) { // C: low, ahead of the train; impact in slow motion
          W(camP, IMP + 11.5, 0.75, 7.6);
          const L = unitPoint(0, 2.5, 1.9, 0, v1);
          camL.copy(L);
          fov = 40 - 4 * smooth(CRASH.IMPACT, CRASH.WIDE, ct);
          shk = ct > CRASH.SCREECH + 0.1 ? 0.35 + (ct > CRASH.IMPACT ? 0.9 : 0) : 0.1;
        } else if (ct < CRASH.AFTER) { // D: wide, the wreck tumbles at full speed
          const u = (ct - CRASH.WIDE) / (CRASH.AFTER - CRASH.WIDE);
          W(camP, -13 + u * 1.5, 7.5 - u * 0.6, 44 - u * 3); W(camL, -13, 1.6, 0);
          fov = 36; shk = 0.55 * (1 - u);
        } else { // E: aftermath, a slow push-in to the hand
          const u = ease(clamp((ct - CRASH.AFTER - 0.2) / (CRASH.FIND + 1.3 - CRASH.AFTER), 0, 1));
          const u2 = clamp((ct - CRASH.FIND - 1.3) / 2.5, 0, 1);
          W(camP, lerp(-5, -7.35, u) + u2 * 0.15, lerp(5.4, 1.5, u) - u2 * 0.08, lerp(27, 8.0, u) - u2 * 0.35);
          W(camL, lerp(-8, HAND.x + 0.15, u), lerp(1.4, 0.25, u), lerp(0, HAND.z + 0.1, u));
          fov = lerp(36, 29, u);
        }
        if (!reduced && shake > 0) {
          // heavy and slow in slow motion: phase runs on the simulation clock
          const a = (shk || 0.15) * shake * 0.22, p = tau * 1000;
          camP.x += (Math.sin(p * 0.047) + Math.sin(p * 0.083) * 0.5) * a;
          camP.y += (Math.sin(p * 0.061 + 1) + Math.sin(p * 0.101) * 0.5) * a * 0.7;
          camL.x += Math.sin(p * 0.053 + 2) * a * 0.4; camL.y += Math.sin(p * 0.071) * a * 0.3;
        }
        camera.position.copy(camP);
        camera.up.set(0, 1, 0);
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
      scene.remove(lantern, lantern.target, victim, glint);
      for (const f of figs) scene.remove(f.body, f.lamp);
      if (reader.parent) reader.parent.remove(reader);
    },
  };
  return crash;
}
