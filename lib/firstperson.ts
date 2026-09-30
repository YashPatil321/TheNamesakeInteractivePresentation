// First-person 3D views (Three.js) you can step into from four stations.
// lib/engine.ts shows the #fp overlay and calls startFirstPerson(); this module builds everything inside it.
import type { FpKind } from './stations';

export interface FpOptions {
  reduced: boolean;
  visitor: string; // the visitor's name from the intro nametag, may be ''
  sfx: {
    clack(): void; thump(): void; chime(): void; whistle(): void; boom(): void;
    noise(freq: number, q: number, peak: number, dec: number): void;
  };
  onFound(found: number, total: number): void; // a new hotspot was discovered
  onComplete(): void; // every hotspot found (fires once)
  onExit(): void; // the viewer pressed Exit or Escape
}

export function startFirstPerson(container: HTMLElement, kind: FpKind, opts: FpOptions): { dispose(): void } {
  // stub: implemented by the first-person work
  container.innerHTML = `<div style="display:grid;place-items:center;height:100%;color:#ece4cf">First-person view “${kind}” coming soon <button id="fpExit">Exit</button></div>`;
  const btn = container.querySelector('#fpExit') as HTMLButtonElement;
  const exit = () => opts.onExit();
  btn.addEventListener('click', exit);
  return { dispose() { btn.removeEventListener('click', exit); container.innerHTML = ''; } };
}
