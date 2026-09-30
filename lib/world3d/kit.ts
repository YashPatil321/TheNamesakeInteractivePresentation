// Small shared toolkit for the 3D world: seeded random, geometry helpers, shader patches, generated textures.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const GAP = 64; // world units between stations

export function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/** frame-rate independent exponential smoothing factor */
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

/** Transform a geometry in place: translate, rotate (XYZ euler), scale. */
export function place<T extends THREE.BufferGeometry>(g: T, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1): T {
  _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
  g.applyMatrix4(_m);
  return g;
}

export function composeInto(m: THREE.Matrix4, x: number, y: number, z: number, ry: number, sx: number, sy: number, sz: number, rx = 0, rz = 0) {
  return m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}

/** Give a geometry a flat vertex color. */
export function paint<T extends THREE.BufferGeometry>(g: T, color: THREE.ColorRepresentation): T {
  const c = new THREE.Color(color);
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.Float32BufferAttribute(a, 3));
  return g;
}

/** Box from min/max corners. */
export function boxMM(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  return place(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}

/** Merge geometries (normalising index/uv/color so mergeGeometries accepts them). Inputs are disposed. */
export function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const allIndexed = list.every((g) => !!g.index);
  const norm = list.map((g) => {
    let n = g;
    if (!allIndexed && g.index) { n = g.toNonIndexed(); g.dispose(); }
    if (!n.attributes.color) paint(n, 0xffffff);
    if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
    if (!n.attributes.normal) n.computeVertexNormals();
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) n.deleteAttribute(k);
    return n;
  });
  const out = mergeGeometries(norm, false);
  norm.forEach((g) => g.dispose());
  if (!out) throw new Error('merge failed');
  return out;
}

/* ---------------- shader patches ---------------- */

export interface Shared {
  uTime: { value: number };
  uNight: { value: number }; // 0 day .. 1 night: lit windows
  uWind: { value: number };
}

/** Building material: a grid of windows on vertical faces, some lit at night (hash per cell). */
export function patchWindows(mat: THREE.MeshStandardMaterial, sh: Shared) {
  mat.onBeforeCompile = (s) => {
    s.uniforms.uNight = sh.uNight;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;\nvarying float vLocalY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocalY = position.y;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 wp4 = vec4(transformed, 1.0);
        vec3 wn3 = objectNormal;
        #ifdef USE_INSTANCING
          wp4 = instanceMatrix * wp4;
          wn3 = mat3(instanceMatrix) * wn3;
        #endif
        vWPos = (modelMatrix * wp4).xyz;
        vWNrm = normalize(mat3(modelMatrix) * wn3);`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uNight;
        varying vec3 vWPos; varying vec3 vWNrm; varying float vLocalY;
        float wHash(vec3 p) { p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float winM = 0.0, winL = 0.0;
        if (abs(vWNrm.y) < 0.5 && vLocalY < 0.9 && vWPos.y > 0.9) {
          vec2 t2 = normalize(vec2(-vWNrm.z, vWNrm.x));
          float u = dot(vWPos.xz, t2);
          vec2 cell = vec2(u / 1.35, (vWPos.y - 0.2) / 1.75);
          vec2 fc = fract(cell), id = floor(cell);
          vec2 aa = fwidth(cell) * 1.2;
          float mx = smoothstep(0.26 - aa.x, 0.26 + aa.x, fc.x) * (1.0 - smoothstep(0.74 - aa.x, 0.74 + aa.x, fc.x));
          float my = smoothstep(0.30 - aa.y, 0.30 + aa.y, fc.y) * (1.0 - smoothstep(0.80 - aa.y, 0.80 + aa.y, fc.y));
          float far = clamp(1.0 - length(aa) * 1.6, 0.0, 1.0);
          winM = mx * my * far;
          float h = wHash(vec3(id, floor(vWNrm.x * 3.0) + floor(vWNrm.z * 3.0) * 7.0 + floor(vWPos.x * 0.05) * 13.0));
          winL = step(h, 0.38) * (0.55 + 0.45 * fract(h * 17.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.085, 0.11), winM * 0.8);
          // far away: a soft average glow so distant towers still twinkle
          winL = mix(0.3 * step(h, 0.5), winL, far);
          winM = max(winM, (1.0 - far) * 0.3);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += winM * winL * uNight * vec3(1.0, 0.62, 0.28) * 1.5;`);
  };
  mat.customProgramCacheKey = () => 'windows-v1';
}

/** Foliage: gentle wind sway in the vertex shader, stronger toward the top of the geometry. */
export function patchSway(mat: THREE.MeshStandardMaterial, sh: Shared, amount = 0.06) {
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTime = sh.uTime; s.uniforms.uWind = sh.uWind;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 swP = vec3(0.0);
        #ifdef USE_INSTANCING
          swP = instanceMatrix[3].xyz;
        #endif
        float swH = max(position.y, 0.0);
        float sw = (sin(uTime * 1.4 + swP.x * 0.37 + swP.z * 0.21) + 0.4 * sin(uTime * 3.1 + swP.x)) * ${amount.toFixed(3)} * uWind * swH;
        transformed.x += sw; transformed.z += sw * 0.4;`);
  };
  mat.customProgramCacheKey = () => 'sway-' + amount;
}

/** Ground: world-space value noise breaks up the flat vertex colours into patches of lush / dry / worn grass and soil. */
export function patchGround(mat: THREE.MeshStandardMaterial) {
  mat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vGW;
        float gH(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        float gN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(gH(i), gH(i + vec2(1.0, 0.0)), f.x), mix(gH(i + vec2(0.0, 1.0)), gH(i + vec2(1.0, 1.0)), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec2 q = vGW.xz;
          float big = gN(q * 0.035), mid = gN(q * 0.16 + 7.0), fine = gN(q * 0.9 + 3.0), speck = gN(q * 3.7);
          float lum = 0.8 + 0.28 * big + 0.16 * mid + 0.1 * fine + 0.06 * speck;
          vec3 dry = diffuseColor.rgb * vec3(1.16, 1.06, 0.78);
          vec3 lush = diffuseColor.rgb * vec3(0.86, 1.04, 0.86);
          float dm = smoothstep(0.35, 0.75, gN(q * 0.05 + 21.0));
          diffuseColor.rgb = mix(lush, dry, dm) * lum;
          // worn, darker soil along the track bed
          diffuseColor.rgb *= 1.0 - 0.18 * (1.0 - smoothstep(2.6, 4.2, abs(vGW.z)));
        }`);
  };
  mat.customProgramCacheKey = () => 'ground-v1';
}

/* ---------------- generated textures ---------------- */

export function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, srgb = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!;
  draw(c);
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function glowTexture() {
  return canvasTex(128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,.65)');
    g.addColorStop(0.45, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  }, false);
}

export function puffTexture() {
  return canvasTex(128, 128, (c) => {
    const r = rng(7);
    for (let k = 0; k < 14; k++) {
      const x = 64 + (r() - 0.5) * 40, y = 64 + (r() - 0.5) * 40, rad = 22 + r() * 26;
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(255,255,255,.34)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.fill();
    }
  }, false);
}

export function starTexture() {
  return canvasTex(128, 128, (c) => {
    c.translate(64, 64);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.12, 'rgba(255,250,230,.8)'); g.addColorStop(0.4, 'rgba(255,240,200,.1)'); g.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = g; c.fillRect(-64, -64, 128, 128);
    c.fillStyle = 'rgba(255,255,255,.9)';
    for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(-3, 0); c.lineTo(0, -62); c.lineTo(3, 0); c.fill(); }
    c.rotate(Math.PI / 4); c.fillStyle = 'rgba(255,255,255,.4)';
    for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(-2, 0); c.lineTo(0, -34); c.lineTo(2, 0); c.fill(); }
  }, false);
}

export function gravelTexture() {
  const t = canvasTex(128, 128, (c) => {
    c.fillStyle = '#6d6862'; c.fillRect(0, 0, 128, 128);
    const r = rng(3);
    for (let k = 0; k < 900; k++) {
      const v = 70 + r() * 90 | 0; c.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
      const s = 1 + r() * 3; c.fillRect(r() * 128, r() * 128, s, s);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
