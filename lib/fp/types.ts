import type * as THREE from 'three';
import type { Kit } from './kit';

export interface Sfx {
  clack(): void; thump(): void; chime(): void; whistle(): void; boom(): void;
  noise(freq: number, q: number, peak: number, dec: number): void;
}

/** What the controller hands each room builder. */
export interface Ctx {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  kit: Kit;
  sfx: Sfx;
  reduced: boolean;
  visitor: string;
  /** turn the view toward a world point */
  lookAt(p: THREE.Vector3, dur?: number): void;
  /** camera shake, 0..1 */
  shake(amount: number): void;
  /** fade the black layer to opacity over ms, optional centered text */
  black(opacity: number, ms: number, text?: string): void;
  /** resolves after ms (never resolves once the view is disposed) */
  wait(ms: number): Promise<void>;
  /** tween the renderer exposure */
  exposure(v: number, ms: number): void;
  /** current camera forward direction (world) */
  forward(): THREE.Vector3;
}

/** 3D placement for a caption from copy.ts. */
export interface Spot {
  id: string;
  pos: THREE.Vector3; // marker position
  hit: number | [number, number, number]; // hit sphere radius or box size
  hitPos?: THREE.Vector3; // hit volume center (default pos)
  look?: THREE.Vector3; // where the camera turns when chosen from the list (default pos)
  glow?: THREE.MeshStandardMaterial[]; // brightened on hover
  onFind?(): void; // first discovery
  onShow?(): void; // every selection (including the first)
}

export interface Room {
  eye: THREE.Vector3; yaw: number; pitch: number; fov: number;
  yawRange: [number, number]; pitchRange: [number, number];
  exposure?: number;
  intro?: { from: THREE.Vector3; yaw: number; pitch: number; fov?: number; ms?: number };
  bob?: number; // breathing amplitude multiplier
  spots: Spot[];
  update(t: number, dt: number): void;
  /** camera offsets the room wants this frame (sway, bumps) */
  sway?: { pos: THREE.Vector3; roll: number; pitch: number; yaw: number };
  /** plays after everything is found, before the completion panel */
  finale?(): Promise<void>;
  /** "Keep looking" after the finale */
  after?(): void;
}
