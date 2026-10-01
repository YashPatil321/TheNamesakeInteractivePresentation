// Shared contract for the card add-on modules (choices, then & now, archive images).
// Each module renders an HTML string into the station card and may wire events after render.
import type { Station } from '../stations';

export interface CardApi {
  /** current station index */
  cur: number;
  stations: Station[];
  /** persistent per-visitor store (saved with progress) */
  state: Record<string, unknown>;
  save(): void;
  rerender(): void;
  travelTo(i: number): void;
  toast(msg: string): void;
  sfx: { chime(): void; thump(): void; noise(freq: number, q: number, peak: number, dec: number): void };
  esc(s: string): string;
}

export interface CardModule {
  /** HTML for this station's story panel (or '' for none) */
  html(i: number, api: CardApi): string;
  /** called after the card is in the DOM; return a cleanup */
  mount?(root: HTMLElement, i: number, api: CardApi): void | (() => void);
}
