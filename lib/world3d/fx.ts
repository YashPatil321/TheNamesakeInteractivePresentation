// Particles and small effects: steam/smoke puffs, glow halos, snow, rain, birds.
import * as THREE from 'three';
import { puffTexture, glowTexture } from './kit';

const FOG_V = '#include <fog_pars_vertex>', FOG_F = '#include <fog_pars_fragment>';

/** Steam and smoke: a ring buffer of soft rotating sprites simulated on the CPU (no allocations per frame). */
export class Puffs {
  readonly points: THREE.Points;
  readonly mat: THREE.ShaderMaterial;
  private n: number; private head = 0;
  private pos: Float32Array; private vel: Float32Array; private age: Float32Array; private life: Float32Array;
  private size0: Float32Array; private grow: Float32Array; private alpha0: Float32Array;
  private aSize: Float32Array; private aAlpha: Float32Array; private aShade: Float32Array;
  private geo: THREE.BufferGeometry; private tex: THREE.Texture;
  constructor(scene: THREE.Scene, n = 260) {
    this.n = n;
    this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3);
    this.age = new Float32Array(n).fill(1e9); this.life = new Float32Array(n).fill(1);
    this.size0 = new Float32Array(n); this.grow = new Float32Array(n); this.alpha0 = new Float32Array(n);
    this.aSize = new Float32Array(n); this.aAlpha = new Float32Array(n); this.aShade = new Float32Array(n).fill(1);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.aSize, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.aAlpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aShade', new THREE.BufferAttribute(this.aShade, 1).setUsage(THREE.DynamicDrawUsage));
    this.tex = puffTexture();
    this.mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTex: { value: null }, uScale: { value: 400 }, uLit: { value: new THREE.Color(1, 1, 1) }, uAmb: { value: new THREE.Color(0.5, 0.5, 0.6) } }]),
      vertexShader: `attribute float aSize; attribute float aAlpha; attribute float aShade; uniform float uScale;
        varying float vA; varying float vS; varying float vRot;
        ${FOG_V}
        void main(){ vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aSize * uScale / max(0.5, -mvPosition.z); vA = aAlpha; vS = aShade; vRot = position.x * 0.35 + position.y * 0.5;
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform sampler2D uTex; uniform vec3 uLit; uniform vec3 uAmb; varying float vA; varying float vS; varying float vRot;
        ${FOG_F}
        void main(){ vec2 c = gl_PointCoord - 0.5; float s = sin(vRot), co = cos(vRot); c = mat2(co, -s, s, co) * c;
          float a = texture2D(uTex, c + 0.5).a * vA; if (a < 0.004) discard;
          vec3 col = mix(uAmb, uLit, clamp(0.75 - gl_PointCoord.y * 0.7, 0.0, 1.0)) * vS;
          gl_FragColor = vec4(col, a);
          #include <fog_fragment>
        }`,
      transparent: true, depthWrite: false, fog: true,
    });
    this.mat.uniforms.uTex.value = this.tex;
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false; this.points.renderOrder = 3;
    scene.add(this.points);
  }
  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number, grow: number, life: number, alpha: number, shade: number) {
    const i = this.head; this.head = (this.head + 1) % this.n;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.age[i] = 0; this.life[i] = life; this.size0[i] = size; this.grow[i] = grow; this.alpha0[i] = alpha; this.aShade[i] = shade;
  }
  update(dt: number) {
    const { n, pos, vel, age, life } = this;
    const drag = Math.exp(-dt * 0.9);
    for (let i = 0; i < n; i++) {
      if (age[i] >= life[i]) { this.aAlpha[i] = 0; continue; }
      age[i] += dt;
      const t = Math.min(1, age[i] / life[i]);
      vel[i * 3] *= drag; vel[i * 3 + 2] *= drag; vel[i * 3 + 1] = vel[i * 3 + 1] * drag + 0.35 * dt;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      this.aSize[i] = this.size0[i] + this.grow[i] * Math.sqrt(t);
      this.aAlpha[i] = this.alpha0[i] * Math.min(1, t * 8) * (1 - t) * (1 - t);
    }
    const a = this.geo.attributes;
    a.position.needsUpdate = true; a.aSize.needsUpdate = true; a.aAlpha.needsUpdate = true; a.aShade.needsUpdate = true;
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); this.tex.dispose(); }
}

/** Additive glow halos (lamps, headlight, lantern) in one draw call. */
export class Glows {
  readonly points: THREE.Points;
  readonly mat: THREE.ShaderMaterial;
  readonly pos: Float32Array; readonly col: Float32Array; readonly size: Float32Array;
  private geo: THREE.BufferGeometry; private tex: THREE.Texture;
  constructor(scene: THREE.Scene, readonly n: number) {
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.size = new Float32Array(n);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aCol', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.tex = glowTexture();
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: this.tex }, uScale: { value: 400 } },
      vertexShader: `attribute vec3 aCol; attribute float aSize; uniform float uScale; varying vec3 vC;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale / max(0.5, -mv.z); vC = aCol; }`,
      fragmentShader: `uniform sampler2D uTex; varying vec3 vC; void main(){ float a = texture2D(uTex, gl_PointCoord).a; gl_FragColor = vec4(vC * a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false; this.points.renderOrder = 4;
    scene.add(this.points);
  }
  set(i: number, x: number, y: number, z: number, r: number, g: number, b: number, size: number) {
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b; this.size[i] = size;
  }
  commit() { const a = this.geo.attributes; a.position.needsUpdate = true; a.aCol.needsUpdate = true; a.aSize.needsUpdate = true; }
  dispose() { this.geo.dispose(); this.mat.dispose(); this.tex.dispose(); }
}

const WRAP = `vec3 wrapBox(vec3 p, vec3 c, vec3 b) { return c - b * 0.5 + mod(p - (c - b * 0.5), b); }`;

/** Snow and rain, animated entirely in the vertex shader around the camera target. */
export class Weather {
  readonly snow: THREE.Points; readonly rain: THREE.LineSegments;
  readonly snowMat: THREE.ShaderMaterial; readonly rainMat: THREE.ShaderMaterial;
  private geos: THREE.BufferGeometry[] = [];
  constructor(scene: THREE.Scene) {
    const box = new THREE.Vector3(130, 40, 110);
    const ns = 1400, sg = new THREE.BufferGeometry(), seeds = new Float32Array(ns * 3);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    sg.setAttribute('position', new THREE.BufferAttribute(seeds, 3));
    this.snowMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uBox: { value: box }, uAmt: { value: 0 }, uScale: { value: 400 }, uCol: { value: new THREE.Color(1, 1, 1) } },
      vertexShader: `uniform float uTime; uniform vec3 uCenter; uniform vec3 uBox; uniform float uScale; varying float vA; ${WRAP}
        void main(){ vec3 s = position; vec3 p = s * uBox;
          p.y -= uTime * (1.1 + s.x * 0.9); p.x += sin(uTime * 0.6 + s.z * 30.0) * 1.2 - uTime * 0.6; p.z += cos(uTime * 0.5 + s.x * 20.0) * 0.8;
          p = wrapBox(p, uCenter + vec3(0.0, 10.0, 0.0), uBox);
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = min(26.0, (0.16 + s.y * 0.16) * uScale / max(0.5, -mv.z)); vA = 0.55 + 0.45 * s.z; }`,
      fragmentShader: `uniform float uAmt; uniform vec3 uCol; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.15, d) * vA * uAmt; gl_FragColor = vec4(uCol, a); }`,
      transparent: true, depthWrite: false,
    });
    this.snow = new THREE.Points(sg, this.snowMat); this.snow.frustumCulled = false; this.snow.visible = false; this.snow.renderOrder = 5;
    scene.add(this.snow);
    const nr = 1600, rg = new THREE.BufferGeometry(), rs = new Float32Array(nr * 2 * 3), re = new Float32Array(nr * 2);
    for (let i = 0; i < nr; i++) {
      const a = Math.random(), b = Math.random(), c = Math.random();
      rs.set([a, b, c, a, b, c], i * 6); re[i * 2] = 0; re[i * 2 + 1] = 1;
    }
    rg.setAttribute('position', new THREE.BufferAttribute(rs, 3)); rg.setAttribute('aEnd', new THREE.BufferAttribute(re, 1));
    this.rainMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uBox: { value: box }, uAmt: { value: 0 }, uCol: { value: new THREE.Color(0.7, 0.76, 0.9) } },
      vertexShader: `attribute float aEnd; uniform float uTime; uniform vec3 uCenter; uniform vec3 uBox; varying float vA; ${WRAP}
        void main(){ vec3 s = position; vec3 p = s * uBox; p.y -= uTime * (26.0 + s.x * 8.0); p.x -= uTime * 5.0;
          p = wrapBox(p, uCenter + vec3(0.0, 10.0, 0.0), uBox);
          p += aEnd * vec3(-0.22, -1.1, 0.0) * (0.8 + s.z * 0.6);
          vA = mix(1.0, 0.1, aEnd);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
      fragmentShader: `uniform float uAmt; uniform vec3 uCol; varying float vA; void main(){ gl_FragColor = vec4(uCol, 0.42 * uAmt * vA); }`,
      transparent: true, depthWrite: false,
    });
    this.rain = new THREE.LineSegments(rg, this.rainMat); this.rain.frustumCulled = false; this.rain.visible = false; this.rain.renderOrder = 5;
    scene.add(this.rain);
    this.geos.push(sg, rg);
  }
  dispose() { this.geos.forEach((g) => g.dispose()); this.snowMat.dispose(); this.rainMat.dispose(); }
}

/** A small flock crossing the daytime sky; wings flap in the vertex shader. */
export class Birds {
  readonly mesh: THREE.InstancedMesh; readonly mat: THREE.MeshBasicMaterial;
  private geo: THREE.BufferGeometry; private m = new THREE.Matrix4(); private q = new THREE.Quaternion(); private s = new THREE.Vector3(1, 1, 1); private p = new THREE.Vector3();
  constructor(scene: THREE.Scene, uTime: { value: number }) {
    const v = new Float32Array([0.25, 0, 0, -0.2, 0, 0, -0.12, 0, 1.0, 0.25, 0, 0, -0.2, 0, 0, -0.12, 0, -1.0, 0.45, 0, 0, -0.35, 0, 0.08, -0.35, 0, -0.08]);
    this.geo = new THREE.BufferGeometry(); this.geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
    this.mat = new THREE.MeshBasicMaterial({ color: '#16171f', side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    this.mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += sin(uTime * 9.0 + float(gl_InstanceID) * 1.7) * abs(position.z) * 0.55;');
    };
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, 9);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }
  update(now: number, cx: number, cz: number, alpha: number) {
    this.mesh.visible = alpha > 0.02;
    if (!this.mesh.visible) return;
    this.mat.opacity = alpha;
    const t = (now % 30000) / 30000;
    for (let k = 0; k < 9; k++) {
      const x = cx - 70 + t * 160 - k * 2.4 + Math.sin(k * 3.1) * 2;
      const y = 24 + Math.sin(k * 1.7) * 2.5 + Math.sin(now / 900 + k) * 0.8, z = cz - 38 - (k % 3) * 2.5;
      this.p.set(x, y, z); this.s.setScalar(0.8 + (k % 2) * 0.25);
      this.mesh.setMatrixAt(k, this.m.compose(this.p, this.q, this.s));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); }
}
