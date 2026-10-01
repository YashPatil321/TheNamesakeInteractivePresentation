// Shared building blocks for the first-person rooms: materials, canvas textures, glow sprites, low-poly figures.
import * as THREE from 'three';
import { buildFigure, type FigureOpts, type Figure } from './people';

export interface Fonts { display: string; body: string; mono: string; hand: string }

export function readFonts(): Fonts {
  const cs = getComputedStyle(document.documentElement);
  const g = (k: string, d: string) => cs.getPropertyValue(k).trim() || d;
  return {
    display: g('--display', 'Georgia, serif'),
    body: g('--body', 'Georgia, serif'),
    mono: g('--mono', '"Courier New", monospace'),
    hand: g('--hand', 'cursive'),
  };
}

/** Small deterministic RNG so every visit looks the same. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const easeInOut = (t: number) => { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOutBack = (t: number) => { t = clamp(t, 0, 1); const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

export class Kit {
  fonts: Fonts = readFonts();
  textures: THREE.Texture[] = [];
  private redraws: (() => void)[] = [];
  private glowTex?: THREE.Texture;
  private ringTex?: THREE.Texture;
  private dotTex?: THREE.Texture;

  constructor(public anisotropy = 4) {}

  /** A CanvasTexture that is redrawn once web fonts finish loading. */
  canvas(w: number, h: number, draw: Draw, o: { repeat?: [number, number]; color?: boolean; text?: boolean } = {}) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d')!;
    const tex = new THREE.CanvasTexture(c);
    if (o.color !== false) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.anisotropy;
    if (o.repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(o.repeat[0], o.repeat[1]); }
    const redraw = () => { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); draw(g, w, h); tex.needsUpdate = true; };
    redraw();
    if (o.text) this.redraws.push(redraw);
    this.textures.push(tex);
    return tex;
  }

  refreshText() { this.fonts = readFonts(); this.redraws.forEach((r) => r()); }

  /** Speckled noise texture for fabric, plaster, asphalt. */
  noise(base: string, amount: number, size = 128, repeat: [number, number] = [4, 4], seed = 7, streak = 0) {
    const r = rng(seed);
    return this.canvas(size, size, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let i = 0; i < w * h * 0.18; i++) {
        const v = r();
        g.fillStyle = v > .5 ? `rgba(255,255,255,${amount * r()})` : `rgba(0,0,0,${amount * 1.4 * r()})`;
        const x = r() * w, y = r() * h;
        g.fillRect(x, y, streak ? 1 + r() * streak : 1, 1);
      }
    }, { repeat });
  }

  /** Wood planks / grain. */
  wood(base: string, dark: string, size = 256, repeat: [number, number] = [1, 1], planks = 4, seed = 3) {
    const r = rng(seed);
    return this.canvas(size, size, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      const ph = h / planks;
      for (let p = 0; p < planks; p++) {
        g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.12})`; g.fillRect(0, p * ph, w, ph);
        for (let i = 0; i < 26; i++) {
          g.strokeStyle = dark; g.globalAlpha = 0.08 + r() * 0.18; g.lineWidth = 0.6 + r() * 1.6;
          const y0 = p * ph + r() * ph;
          g.beginPath(); g.moveTo(0, y0);
          for (let x = 0; x <= w; x += 16) g.lineTo(x, y0 + Math.sin(x * 0.02 + i) * 2 * r());
          g.stroke();
        }
        g.globalAlpha = 0.5; g.fillStyle = dark; g.fillRect(0, p * ph, w, 1.5);
        g.globalAlpha = 1;
      }
    }, { repeat });
  }

  std(color: THREE.ColorRepresentation, rough = 0.85, metal = 0, extra: THREE.MeshStandardMaterialParameters = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
  }

  mesh(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], parent?: THREE.Object3D, x = 0, y = 0, z = 0, shadow = true): THREE.Mesh {
    const m: THREE.Mesh = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = shadow; m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  }

  box(w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], parent?: THREE.Object3D, x = 0, y = 0, z = 0, shadow = true) {
    return this.mesh(new THREE.BoxGeometry(w, h, d), mat, parent, x, y, z, shadow);
  }

  cyl(rt: number, rb: number, h: number, mat: THREE.Material | THREE.Material[], parent?: THREE.Object3D, x = 0, y = 0, z = 0, seg = 12, shadow = true) {
    return this.mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, parent, x, y, z, shadow);
  }

  glowTexture() {
    if (!this.glowTex) this.glowTex = this.canvas(128, 128, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,.55)');
      gr.addColorStop(0.45, 'rgba(255,255,255,.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    return this.glowTex;
  }

  /** Additive glow halo (fake bloom). */
  glow(color: THREE.ColorRepresentation, size: number, opacity = 1, parent?: THREE.Object3D, x = 0, y = 0, z = 0) {
    const m = new THREE.SpriteMaterial({ map: this.glowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const s = new THREE.Sprite(m);
    s.scale.setScalar(size); s.position.set(x, y, z);
    if (parent) parent.add(s);
    return s;
  }

  ringTexture() {
    if (!this.ringTex) this.ringTex = this.canvas(128, 128, (g, w) => {
      g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 7;
      g.shadowColor = 'rgba(255,255,255,.9)'; g.shadowBlur = 10;
      g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 14, 0, Math.PI * 2); g.stroke();
    });
    return this.ringTex;
  }

  dotTexture() {
    if (!this.dotTex) this.dotTex = this.canvas(128, 128, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.22, 'rgba(255,255,255,1)');
      gr.addColorStop(0.3, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    return this.dotTex;
  }

  /** A simple gradient sky / backdrop texture. */
  gradient(stops: [number, string][], w = 16, h = 256) {
    return this.canvas(w, h, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      stops.forEach(([o, c]) => gr.addColorStop(o, c));
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
  }
}

/* ---------------- People (stylised, built in lib/fp/people.ts) ---------------- */

export type { FigureOpts, Figure, HairStyle } from './people';
export { disposeSharedGeometry, isShared } from './people';

/** Builds a stylised person facing +z. Seated figures sit with hips at 0.47 m. */
export function figure(k: Kit, o: FigureOpts): Figure {
  void k;
  return buildFigure(o);
}

/** Disposes everything under an object (geometries, materials, their textures). */
export function disposeTree(obj: THREE.Object3D, extra: THREE.Texture[] = []) {
  const geos = new Set<THREE.BufferGeometry>(), mats = new Set<THREE.Material>(), texs = new Set<THREE.Texture>(extra);
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) geos.add(m.geometry);
    const mm = (m as { material?: THREE.Material | THREE.Material[] }).material;
    if (mm) (Array.isArray(mm) ? mm : [mm]).forEach((x) => mats.add(x));
  });
  mats.forEach((m) => {
    for (const v of Object.values(m)) if (v && (v as THREE.Texture).isTexture) texs.add(v as THREE.Texture);
    m.dispose();
  });
  geos.forEach((g) => g.dispose());
  texs.forEach((t) => t.dispose());
}
