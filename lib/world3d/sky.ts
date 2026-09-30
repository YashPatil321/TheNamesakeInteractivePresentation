// Sky dome (gradient, horizon glow, sun/moon with halo, drifting clouds, twinkling stars),
// layered distant mountains with aerial perspective, and a sky-matched image-based light (PMREM).
import * as THREE from 'three';
import type { Station, Region } from '../stations';
import { GAP, clamp } from './kit';

/* ---------------- sky dome ---------------- */

const SKY_V = `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const SKY_F = `uniform vec3 uTop, uBot, uSunDir, uDisc, uHalo, uCloudLit, uCloudShade, uGlow;
  uniform float uStars, uTime, uLight, uSize, uMoon, uCloud, uCloudSpeed;
  varying vec3 vDir;
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
  float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int k = 0; k < 5; k++) { s += a * vn(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
  void main(){
    vec3 d = normalize(vDir);
    float h = d.y;
    float t = smoothstep(-0.03, 0.5, h);
    vec3 col = mix(uBot, uTop, pow(t, 0.62));
    float cs = dot(d, uSunDir);
    float sunSide = max(dot(normalize(vec3(d.x, 0.0, d.z) + 1e-4), normalize(vec3(uSunDir.x, 0.0, uSunDir.z) + 1e-4)), 0.0);
    // horizon glow, warmer and brighter on the sun side
    float band = exp(-abs(h - 0.01) * 16.0);
    col += uBot * 0.16 * band + uGlow * band * (0.25 + 0.75 * pow(sunSide, 3.0));
    float ang = acos(clamp(cs, -1.0, 1.0));
    col += uHalo * (pow(max(cs, 0.0), 420.0) * 0.9 + pow(max(cs, 0.0), 36.0) * 0.26 + pow(max(cs, 0.0), 6.0) * 0.08);
    float starOcc = 1.0;
    // clouds on a virtual plane, drifting
    float cl = 0.0;
    if (uCloud > 0.01 && h > -0.02) {
      vec2 cp = d.xz / (max(h, 0.0) + 0.12) * 2.4 + vec2(uTime * uCloudSpeed, uTime * uCloudSpeed * 0.3) * 8.0;
      float n = fbm(cp);
      float cov = 1.0 - uCloud;
      cl = smoothstep(cov, cov + 0.14, n) * smoothstep(0.0, 0.1, h);
      float thick = smoothstep(cov + 0.04, cov + 0.3, n);
      float lit = 0.35 + 0.65 * pow(max(cs * 0.5 + 0.5, 0.0), 2.0);
      vec3 cc = mix(uCloudLit, uCloudShade, thick * 0.85) * mix(0.8, 1.1, lit);
      // silver lining around the sun/moon
      cc += uHalo * pow(max(cs, 0.0), 14.0) * (1.0 - thick) * 1.2;
      cc = mix(cc, col, pow(1.0 - smoothstep(0.0, 0.35, h), 2.0) * 0.55); // hazier near the horizon
      col = mix(col, cc, cl * 0.85);
      starOcc = 1.0 - cl;
    }
    if (uStars > 0.01 && h > 0.0) {
      vec2 sp = vec2(atan(d.x, d.z) * 95.0, asin(h) * 95.0);
      vec2 id = floor(sp), f = fract(sp) - 0.5;
      float r = h21(id);
      vec2 o = vec2(h21(id + 3.7), h21(id + 9.1)) - 0.5;
      float s = step(0.962, r) * smoothstep(0.13, 0.0, length(f - o * 0.6));
      s *= 0.5 + 0.5 * sin(uTime * (1.5 + r * 3.0) + r * 40.0);
      vec3 sc = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.9, 0.75), fract(r * 53.0));
      col += sc * s * uStars * starOcc * smoothstep(0.02, 0.25, h) * (0.6 + 1.6 * fract(r * 91.0));
      // faint milky band
      float mw = exp(-pow(dot(d, normalize(vec3(0.5, 0.6, -0.62))) * 4.0, 2.0)) * (vn(sp * 0.04) * 0.7 + vn(sp * 0.11) * 0.3);
      col += vec3(0.5, 0.55, 0.75) * mw * 0.05 * uStars * starOcc;
    }
    float disc = 1.0 - smoothstep(uSize * 0.9, uSize, ang);
    vec3 dc = uDisc;
    if (uMoon > 0.5) { vec3 q = normalize(d - uSunDir * cs); dc *= 0.8 + 0.2 * sin(q.x * 190.0 + q.y * 70.0) * sin(q.y * 150.0 - q.z * 60.0); }
    col = mix(col, dc, disc * (1.0 - cl * 0.85));
    gl_FragColor = vec4(col * uLight, 1.0);
  }`;

export function makeSky() {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color() }, uBot: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0.3, 0.4, -1).normalize() },
      uDisc: { value: new THREE.Color() }, uHalo: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() },
      uCloudLit: { value: new THREE.Color() }, uCloudShade: { value: new THREE.Color() },
      uStars: { value: 0 }, uTime: { value: 0 }, uLight: { value: 1 }, uSize: { value: 0.03 }, uMoon: { value: 1 }, uCloud: { value: 0.4 }, uCloudSpeed: { value: 0.012 },
    },
    vertexShader: SKY_V, fragmentShader: SKY_F, side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat);
  mesh.renderOrder = -10; mesh.frustumCulled = false;
  return { mesh, mat };
}

/* ---------------- distant mountains with aerial perspective ---------------- */

const RIDGE_V = `attribute float aHaze; varying vec3 vCol; varying float vHaze; varying float vY;
  void main(){ vCol = color; vHaze = aHaze; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RIDGE_F = `uniform vec3 uHaze, uAmb, uRim; uniform float uWet, uLight; varying vec3 vCol; varying float vHaze; varying float vY;
  void main(){
    vec3 c = vCol * uAmb;
    c += uRim * smoothstep(0.0, 40.0, vY) * 0.35;
    float hz = clamp(mix(vHaze, 1.0, uWet), 0.0, 1.0);
    gl_FragColor = vec4(mix(c, uHaze, hz) * uLight, 1.0);
  }`;

export function makeRidges(stations: Station[], xMin: number, xMax: number) {
  const N = stations.length;
  const regionAt = (x: number): Region => stations[clamp(Math.round(x / GAP), 0, N - 1)].region;
  const layers = [
    { z: -150, h: 6, a: 6, col: '#3a4a3c', haze: 0.14, f: 0.011, rough: 2 },
    { z: -205, h: 8, a: 8, col: '#3c4a48', haze: 0.3, f: 0.009, rough: 3 },
    { z: -270, h: 11, a: 11, col: '#43505a', haze: 0.45, f: 0.0075, rough: 4 },
    { z: -360, h: 16, a: 16, col: '#4c5868', haze: 0.6, f: 0.0055, rough: 6 },
    { z: -470, h: 22, a: 22, col: '#5a6576', haze: 0.72, f: 0.004, rough: 8 },
  ];
  const pos: number[] = [], col: number[] = [], haze: number[] = [], idx: number[] = [];
  const c = new THREE.Color();
  let base = 0;
  layers.forEach((L, li) => {
    c.set(L.col);
    let n = 0;
    // far layers are wider so they fill the view from any camera position
    const pad = 200 + li * 120;
    for (let x = xMin - pad; x <= xMax + pad; x += 5 + li) {
      const reg = regionAt(x);
      const k = reg === 'lake' ? 1.6 : reg === 'nyc' ? 0.5 : reg === 'india' ? 0.75 : reg === 'cleveland' ? 0.7 : 1;
      const ridge = 1 - Math.abs(Math.sin(x * L.f * 2.3 + li * 1.7)); // sharp-crested peaks
      const hgt = (L.h + L.a * (0.5 + 0.5 * Math.sin(x * L.f + li * 2)) + L.a * 0.45 * ridge * ridge + L.a * 0.25 * Math.sin(x * L.f * 3.7 + li)) * k
        + Math.abs(Math.sin(x * 0.09 + li)) * L.rough * 0.3 + Math.sin(x * 0.23 + li * 5) * L.rough * 0.12;
      pos.push(x, -4, L.z, x, hgt, L.z + Math.sin(x * 0.05) * 6);
      col.push(c.r, c.g, c.b, c.r * 1.05, c.g * 1.05, c.b * 1.05);
      haze.push(Math.min(1, L.haze + 0.3), L.haze); // valleys hazier than crests
      if (n > 0) { const a = base + (n - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      n++;
    }
    base += n * 2;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aHaze', new THREE.Float32BufferAttribute(haze, 1));
  g.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uHaze: { value: new THREE.Color() }, uAmb: { value: new THREE.Color(1, 1, 1) }, uRim: { value: new THREE.Color() }, uWet: { value: 0 }, uLight: { value: 1 } },
    vertexShader: RIDGE_V, fragmentShader: RIDGE_F, vertexColors: true, fog: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false; mesh.renderOrder = -5;
  return { mesh, mat, geo: g };
}

/* ---------------- sky-matched environment light ---------------- */

const ENV_F = `uniform vec3 uTop, uBot, uGround, uSunDir, uSun; varying vec3 vDir;
  void main(){
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = h > 0.0 ? mix(uBot, uTop, pow(smoothstep(0.0, 0.7, h), 0.8)) : mix(uBot * 0.6, uGround, smoothstep(0.0, -0.25, h));
    float cs = max(dot(d, uSunDir), 0.0);
    col += uSun * (pow(cs, 600.0) * 60.0 + pow(cs, 48.0) * 2.0 + pow(cs, 6.0) * 0.25);
    // two soft 'studio' panels so paint and glass always show a shaped highlight
    col += uTop * 0.8 * smoothstep(0.93, 0.97, dot(d, normalize(vec3(-0.6, 0.55, 0.6))));
    col += uBot * 0.6 * smoothstep(0.95, 0.98, dot(d, normalize(vec3(0.7, 0.3, 0.65))));
    gl_FragColor = vec4(col, 1.0);
  }`;

export class SkyEnv {
  private scene = new THREE.Scene();
  private mat: THREE.ShaderMaterial;
  private pmrem: THREE.PMREMGenerator;
  private rt: THREE.WebGLRenderTarget | null = null;
  private key = new Float32Array(10).fill(-1);
  private lastBake = -1e9;
  private _size = 256;
  get size() { return this._size; }
  set size(v: number) { if (v !== this._size) { this._size = v; this.key.fill(-1); this.lastBake = -1e9; } }
  constructor(private renderer: THREE.WebGLRenderer) {
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTop: { value: new THREE.Color() }, uBot: { value: new THREE.Color() }, uGround: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSun: { value: new THREE.Color() } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: ENV_F, side: THREE.BackSide, depthWrite: false, depthTest: false,
    });
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), this.mat));
  }
  /** Re-bake when the lighting changed noticeably (throttled). Returns the current env texture, or null before the first bake. */
  update(now: number, top: THREE.Color, bot: THREE.Color, ground: THREE.Color, sunDir: THREE.Vector3, sun: THREE.Color, minGapMs: number) {
    const k = [top.r, top.g, top.b, bot.r, bot.g, bot.b, sun.r, sun.g, sun.b, sunDir.y];
    let diff = 0; for (let i = 0; i < k.length; i++) diff = Math.max(diff, Math.abs(k[i] - this.key[i]));
    if (this.rt && (diff < 0.012 || now - this.lastBake < minGapMs)) return this.rt.texture;
    this.key.set(k); this.lastBake = now;
    const u = this.mat.uniforms;
    u.uTop.value.copy(top); u.uBot.value.copy(bot); u.uGround.value.copy(ground); u.uSunDir.value.copy(sunDir); u.uSun.value.copy(sun);
    const next = this.pmrem.fromScene(this.scene, 0, 0.1, 100, { size: this._size });
    if (this.rt) this.rt.dispose();
    this.rt = next;
    return next.texture;
  }
  dispose() {
    if (this.rt) this.rt.dispose();
    this.pmrem.dispose();
    this.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
    this.mat.dispose();
  }
}
