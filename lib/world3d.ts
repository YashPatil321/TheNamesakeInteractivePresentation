// The 3D world (Three.js) that replaces the 2D canvas train scene.
// lib/engine.ts owns all story/game state and calls render() every animation frame.
import type { Station } from './stations';

export interface WorldFrame {
  now: number; // performance.now()
  p: number; // train position in station units (0..STATIONS.length-1), fractional while moving
  cur: number; // station the train is at (or last left)
  target: number; // station the train is heading to
  moving: boolean;
  speed: number; // ~0 when stopped, up to ~1.5 at full speed
  derail: number; // 0..1, the 1961 crash
  crashT: number; // -1 when no crash is playing, else seconds since the crash sequence started
  shake: number; // camera shake strength 0..1.4 (already 0 when reduced motion is on)
  lens: 'gogol' | 'nikhil' | 'both'; // which name the train carries
  visited: Set<number>;
  parX: number; // pointer parallax -1..1 (0 on touch devices)
  parY: number;
  cardSide: 'left' | 'bottom' | 'none'; // where the ticket card covers the screen, so the camera frames the train in the free space
}

export interface World {
  render(f: WorldFrame): void;
  resize(): void;
  /** Hit-test a click: a station index, 'train', or null. */
  pick(clientX: number, clientY: number): number | 'train' | null;
  /** Re-draw text textures (station signs, nameplate) once web fonts have loaded. */
  refreshText(): void;
  dispose(): void;
}

export interface WorldOptions {
  stations: Station[];
  reduced: boolean;
  fonts: () => { display: string; mono: string };
}

/** Returns null when WebGL is unavailable; the engine then keeps the 2D canvas. */
export function createWorld(_canvas: HTMLCanvasElement, _opts: WorldOptions): World | null {
  return null; // stub: implemented by the 3D world work
}
