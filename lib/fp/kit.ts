// Shared building blocks for the first-person rooms: materials, canvas textures, glow sprites, low-poly figures.
import * as THREE from 'three';
import { loadGLB } from '../world3d/assets';

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

/* ---------------- Low-poly people ---------------- */

export interface FigureOpts {
  skin: THREE.ColorRepresentation; top: THREE.ColorRepresentation; bottom?: THREE.ColorRepresentation;
  hair: THREE.ColorRepresentation; hairStyle?: 'short' | 'long' | 'bob' | 'bald' | 'curly' | 'part' | 'fringe';
  seated?: boolean; scale?: number; shoulders?: number; collar?: THREE.ColorRepresentation; glasses?: boolean;
  legs?: boolean; // default true; hidden legs save draw calls under desks
  /** sculpted-model options (public/models/people/people.glb, built by blender/people.py) */
  sex?: 'm' | 'f'; // default: 'f' for long/bob hair, otherwise 'm'
  garment?: 'shirt' | 'sweater'; // default: 'shirt' when a collar colour is given, otherwise 'sweater'
  moustache?: boolean; eyes?: THREE.ColorRepresentation;
}

export interface Figure {
  root: THREE.Group; torso: THREE.Group; neck: THREE.Group; head: THREE.Group;
  armL: THREE.Group; armR: THREE.Group; foreL: THREE.Group; foreR: THREE.Group;
  mats: THREE.MeshStandardMaterial[];
}

const G: Record<string, THREE.BufferGeometry> = {};
function geo(key: string, make: () => THREE.BufferGeometry) { return G[key] || (G[key] = make()); }
/** Shared figure geometries are cached for the module's lifetime; call this from dispose(). */
export function disposeSharedGeometry() { Object.keys(G).forEach((k) => { G[k].dispose(); delete G[k]; }); }
export function isShared(g: THREE.BufferGeometry) { return Object.values(G).includes(g); }

/** Builds a stylised person facing +z. Seated figures sit with hips at 0.47 m. */
export function figure(k: Kit, o: FigureOpts): Figure {
  const root = new THREE.Group();
  const skin = k.std(o.skin, 0.7);
  const top = k.std(o.top, 0.9);
  const bottom = k.std(o.bottom ?? 0x2b3144, 0.9);
  const hair = k.std(o.hair, 0.75);
  const mats = [skin, top, bottom, hair];
  const sw = o.shoulders ?? 1;
  const hipY = o.seated ? 0.47 : 0.92;

  const lo: THREE.Mesh[] = []; // placeholder meshes, swapped for the sculpted parts once they load
  const add = (g: THREE.BufferGeometry, m: THREE.Material, p: THREE.Object3D, x = 0, y = 0, z = 0) => { const me = k.mesh(g, m, p, x, y, z); lo.push(me); return me; };

  // legs
  const thigh = geo('thigh', () => new THREE.CapsuleGeometry(0.075, 0.34, 4, 8));
  const shin = geo('shin', () => new THREE.CapsuleGeometry(0.06, 0.36, 4, 8));
  const shoe = geo('shoe', () => new THREE.BoxGeometry(0.1, 0.07, 0.24));
  const shoeM = k.std(0x1b1a20, 0.6);
  mats.push(shoeM);
  for (const s of o.legs === false ? [] : [-1, 1]) {
    if (o.seated) {
      const t = add(thigh, bottom, root, s * 0.1, hipY, 0.2); t.rotation.x = Math.PI / 2;
      const sh = add(shin, bottom, root, s * 0.1, 0.25, 0.42);
      add(shoe, shoeM, root, s * 0.1, 0.035, 0.47);
      void sh;
    } else {
      add(thigh, bottom, root, s * 0.1, 0.7, 0);
      add(shin, bottom, root, s * 0.1, 0.3, 0);
      add(shoe, shoeM, root, s * 0.1, 0.035, 0.04);
    }
  }

  // torso pivots at the hips so it can twist
  const torso = new THREE.Group(); torso.position.y = hipY; root.add(torso);
  const body = add(geo('torso', () => { const g = new THREE.CylinderGeometry(0.2, 0.16, 0.6, 10); g.translate(0, 0.3, 0); return g; }), top, torso);
  body.scale.set(sw, 1, 0.64);
  const sh = add(geo('shoulder', () => new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), top, torso, 0, 0.56, 0);
  sh.scale.set(sw * 1.02, 0.42, 0.66);
  if (o.collar !== undefined) {
    const c = add(geo('collar', () => new THREE.ConeGeometry(0.07, 0.12, 3)), k.std(o.collar, 0.8), torso, 0, 0.56, 0.12);
    c.name = 'collar';
    c.rotation.x = Math.PI; mats.push(c.material as THREE.MeshStandardMaterial);
  }

  const neck = new THREE.Group(); neck.position.set(0, 0.6, 0); torso.add(neck);
  add(geo('neck', () => new THREE.CylinderGeometry(0.05, 0.055, 0.12, 8)), skin, neck, 0, 0.04, 0);
  const head = new THREE.Group(); head.position.set(0, 0.1, 0); neck.add(head);
  const skull = add(geo('head', () => new THREE.SphereGeometry(0.105, 14, 12)), skin, head, 0, 0.1, 0.005);
  skull.scale.set(0.9, 1.1, 1);
  const eye = geo('eye', () => new THREE.SphereGeometry(0.013, 8, 6));
  const eyeM = k.std(0x15121a, 0.35); mats.push(eyeM);
  const small = (m: THREE.Mesh) => { m.castShadow = false; return m; };
  small(add(eye, eyeM, head, -0.036, 0.11, 0.094)); small(add(eye, eyeM, head, 0.036, 0.11, 0.094));
  const nose = small(add(geo('nose', () => new THREE.ConeGeometry(0.016, 0.045, 5)), skin, head, 0, 0.085, 0.108));
  nose.rotation.x = Math.PI / 2;
  small(add(geo('ear', () => new THREE.SphereGeometry(0.022, 6, 6)), skin, head, -0.094, 0.1, 0));
  small(add(geo('ear', () => new THREE.SphereGeometry(0.022, 6, 6)), skin, head, 0.094, 0.1, 0));
  const style0 = o.hairStyle ?? 'short';
  const style = style0 === 'part' ? 'short' : style0;
  if (style !== 'bald' && style !== 'fringe') {
    const cap = add(geo('hair', () => new THREE.SphereGeometry(0.114, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)), hair, head, 0, 0.115, -0.008);
    cap.scale.set(0.95, 1.1, 1.06); cap.rotation.x = -0.28;
    if (style === 'long' || style === 'bob') {
      const back = add(geo('hair-' + style, () => new THREE.CapsuleGeometry(0.1, style === 'long' ? 0.2 : 0.08, 4, 10)), hair, head, 0, style === 'long' ? 0.02 : 0.07, -0.035);
      back.scale.set(1.08, 1, 0.8);
    }
    if (style === 'curly') {
      const cg = geo('curl', () => new THREE.IcosahedronGeometry(0.05, 0));
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        add(cg, hair, head, Math.cos(a) * 0.09, 0.17 + Math.sin(i * 1.7) * 0.02, Math.sin(a) * 0.08 - 0.02).castShadow = false;
      }
    }
  }
  if (o.glasses) {
    const gm = k.std(0x222226, 0.4, 0.5); mats.push(gm);
    const lens = geo('lens', () => new THREE.TorusGeometry(0.026, 0.005, 6, 14));
    add(lens, gm, head, -0.038, 0.11, 0.104); add(lens, gm, head, 0.038, 0.11, 0.104);
  }

  // arms: shoulder pivot -> upper arm -> elbow pivot -> forearm
  const upper = geo('upper', () => { const g = new THREE.CapsuleGeometry(0.052, 0.24, 4, 8); g.translate(0, -0.14, 0); return g; });
  const fore = geo('fore', () => { const g = new THREE.CapsuleGeometry(0.045, 0.22, 4, 8); g.translate(0, -0.13, 0); return g; });
  const hand = geo('hand', () => new THREE.SphereGeometry(0.048, 8, 6));
  const mk = (s: number) => {
    const a = new THREE.Group(); a.position.set(s * 0.22 * sw, 0.55, 0); torso.add(a);
    add(upper, top, a);
    const f = new THREE.Group(); f.position.y = -0.28; a.add(f);
    add(fore, top, f);
    add(hand, skin, f, 0, -0.27, 0).castShadow = false;
    return [a, f] as const;
  };
  const [armL, foreL] = mk(-1);
  const [armR, foreR] = mk(1);
  armL.rotation.z = -0.08; armR.rotation.z = 0.08;

  if (o.scale) root.scale.setScalar(o.scale);
  const fig = { root, torso, neck, head, armL, armR, foreL, foreR, mats };
  void peopleParts().then((P) => sculpted(k, fig, o, lo, P)).catch(() => { /* keep the placeholder */ });
  return fig;
}

/* ---------------- Sculpted people (blender/people.py) ---------------- */

type Part = { geo: THREE.BufferGeometry; mat: string }[];
let partsP: Promise<Record<string, Part>> | null = null;
/** Loads the body-part kit once; each part is one or more primitives tagged with its material name. */
export function peopleParts() {
  if (!partsP) partsP = loadGLB('/models/people/people.glb').then((g) => {
    const out: Record<string, Part> = {};
    for (const node of g.scene.children) {
      const part: Part = [];
      node.traverse((m) => {
        const mesh = m as THREE.Mesh;
        if (mesh.isMesh) part.push({ geo: mesh.geometry, mat: (mesh.material as THREE.Material).name });
      });
      out[node.name] = part;
    }
    return out;
  }).catch((e) => { partsP = null; throw e; });
  return partsP;
}

function sculpted(k: Kit, f: Figure, o: FigureOpts, lo: THREE.Mesh[], P: Record<string, Part>) {
  const [skin, top, bottom, hair, shoe] = f.mats;
  const collarMesh = lo.find((m) => m.name === 'collar');
  const style = o.hairStyle ?? 'short';
  const fem = o.sex ? o.sex === 'f' : style === 'long' || style === 'bob';
  const garment = o.garment ?? (o.collar !== undefined ? 'shirt' : 'sweater');
  const sw = o.shoulders ?? 1;
  // skin reads warmer and softer with a hint of emissive "subsurface"; all sculpted parts carry baked cavity in COLOR_0
  skin.roughness = 0.58; skin.emissive.copy(skin.color).multiplyScalar(0.06);
  hair.roughness = 0.5;
  const collar = collarMesh ? (collarMesh.material as THREE.MeshStandardMaterial) : top;
  const sclera = k.std(0xeee8de, 0.25), iris = k.std(o.eyes ?? 0x3a2414, 0.2), pupil = k.std(0x060508, 0.08, 0, { envMapIntensity: 2 });
  const frame = k.std(0x2a2420, 0.35, 0.3);
  f.mats.push(sclera, iris, pupil, frame);
  const byName: Record<string, THREE.MeshStandardMaterial> = {
    Skin: skin, Top: top, Bottom: bottom, Hair: hair, Shoe: shoe, Collar: collar, Sclera: sclera, Iris: iris, Pupil: pupil, Frame: frame,
  };
  for (const m of new Set(Object.values(byName))) { m.vertexColors = true; m.needsUpdate = true; }
  // the placeholder's own geometry has no colour attribute: drop it before the materials expect one
  for (const m of lo) m.removeFromParent();

  const put = (name: string, parent: THREE.Object3D, x = 0, y = 0, z = 0, shadow = true) => {
    const part = P[name];
    if (!part) return;
    for (const { geo: g, mat } of part) {
      const me = new THREE.Mesh(g, byName[mat] ?? top);
      me.position.set(x, y, z); me.castShadow = shadow; me.receiveShadow = true;
      parent.add(me);
    }
  };
  if (o.legs !== false) for (const s of [-1, 1]) put(o.seated ? 'leg_seated' : 'leg_standing', f.root, s * 0.1);
  const tName = `torso_${garment}_${fem ? 'f' : 'm'}`;
  const tp = P[tName] ? tName : (fem ? 'torso_top_f' : 'torso_shirt_m');
  const tg = new THREE.Group(); tg.scale.x = sw * (fem ? 1.05 : 1); f.torso.add(tg);
  put(tp, tg);
  if (garment === 'shirt' && !fem) put('collar', tg, 0, 0, 0, false);
  put('neck', f.neck);
  f.head.position.y = 0.07;
  put(fem ? 'head_f' : 'head_m', f.head);
  put(fem ? 'face_f' : 'face_m', f.head, 0, 0, 0, false);
  const hairPart: Record<string, string> = { short: 'hair_short', part: 'hair_part', long: 'hair_long', bob: 'hair_bob', curly: 'hair_curly', fringe: 'hair_fringe' };
  if (hairPart[style]) put(hairPart[style], f.head);
  if (o.moustache) put('moustache', f.head, 0, 0, 0, false);
  if (o.glasses) put('glasses', f.head, 0, 0, 0, false);
  for (const [arm, fore, side] of [[f.armL, f.foreL, 'L'], [f.armR, f.foreR, 'R']] as const) {
    put('arm_upper', arm);
    put('arm_fore', fore);
    put('hand_' + side, fore, 0, 0, 0, false);
  }
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
