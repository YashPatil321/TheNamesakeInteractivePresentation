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

/**
 * Hot sparks and embers: a CPU ring buffer drawn twice — as velocity-stretched additive streaks (LineSegments)
 * and as small glowing heads (Points) so they still read without bloom. No allocations per frame.
 * gravity < 0 makes a particle rise (embers); `turb` adds a lazy wobble.
 */
export class Sparks {
  readonly lines: THREE.LineSegments; readonly heads: THREE.Points;
  readonly lineMat: THREE.LineBasicMaterial; readonly headMat: THREE.ShaderMaterial;
  private n: number; private head = 0;
  private pos: Float32Array; private vel: Float32Array; private age: Float32Array; private life: Float32Array;
  private grav: Float32Array; private turb: Float32Array; private size: Float32Array; private heat: Float32Array;
  private lPos: Float32Array; private lCol: Float32Array; private hPos: Float32Array; private hCol: Float32Array; private hSize: Float32Array;
  private lGeo: THREE.BufferGeometry; private hGeo: THREE.BufferGeometry; private tex: THREE.Texture;
  private t = 0; private live = 1;
  constructor(scene: THREE.Scene, uScale: { value: number }, n = 900) {
    this.n = n;
    this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3);
    this.age = new Float32Array(n).fill(1e9); this.life = new Float32Array(n).fill(1);
    this.grav = new Float32Array(n); this.turb = new Float32Array(n); this.size = new Float32Array(n); this.heat = new Float32Array(n);
    this.lPos = new Float32Array(n * 6); this.lCol = new Float32Array(n * 6);
    this.hPos = new Float32Array(n * 3); this.hCol = new Float32Array(n * 3); this.hSize = new Float32Array(n);
    this.lGeo = new THREE.BufferGeometry();
    this.lGeo.setAttribute('position', new THREE.BufferAttribute(this.lPos, 3).setUsage(THREE.DynamicDrawUsage));
    this.lGeo.setAttribute('color', new THREE.BufferAttribute(this.lCol, 3).setUsage(THREE.DynamicDrawUsage));
    this.lineMat = new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
    this.lines = new THREE.LineSegments(this.lGeo, this.lineMat);
    this.lines.frustumCulled = false; this.lines.renderOrder = 6;
    this.hGeo = new THREE.BufferGeometry();
    this.hGeo.setAttribute('position', new THREE.BufferAttribute(this.hPos, 3).setUsage(THREE.DynamicDrawUsage));
    this.hGeo.setAttribute('aCol', new THREE.BufferAttribute(this.hCol, 3).setUsage(THREE.DynamicDrawUsage));
    this.hGeo.setAttribute('aSize', new THREE.BufferAttribute(this.hSize, 1).setUsage(THREE.DynamicDrawUsage));
    this.tex = glowTexture();
    this.headMat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: this.tex }, uScale },
      vertexShader: `attribute vec3 aCol; attribute float aSize; uniform float uScale; varying vec3 vC;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize > 0.0 ? max(2.0, aSize * uScale / max(0.5, -mv.z)) : 0.0; vC = aCol; }`,
      fragmentShader: `uniform sampler2D uTex; varying vec3 vC; void main(){ float a = texture2D(uTex, gl_PointCoord).a; gl_FragColor = vec4(vC * a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.heads = new THREE.Points(this.hGeo, this.headMat);
    this.heads.frustumCulled = false; this.heads.renderOrder = 6;
    scene.add(this.lines, this.heads);
  }
  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, gravity = 9.8, size = 0.12, heat = 1, turb = 0) {
    const i = this.head; this.head = (this.head + 1) % this.n;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.age[i] = 0; this.life[i] = life; this.grav[i] = gravity; this.size[i] = size; this.heat[i] = heat; this.turb[i] = turb;
  }
  clear() { this.age.fill(1e9); this.live = 1; }
  update(dt: number) {
    this.t += dt;
    const { n, pos, vel, age, life, lPos, lCol, hPos, hCol, hSize } = this;
    const drag = Math.exp(-dt * 0.35);
    let live = 0;
    for (let i = 0; i < n; i++) {
      const i3 = i * 3, i6 = i * 6;
      if (age[i] >= life[i]) {
        if (hSize[i] !== 0 || lCol[i6] !== 0) { hSize[i] = 0; hCol[i3] = hCol[i3 + 1] = hCol[i3 + 2] = 0; for (let k = 0; k < 6; k++) lCol[i6 + k] = 0; }
        continue;
      }
      live++;
      age[i] += dt;
      const tb = this.turb[i];
      if (tb > 0) { vel[i3] += Math.sin(this.t * 2.3 + i) * tb * dt; vel[i3 + 2] += Math.cos(this.t * 1.9 + i * 1.3) * tb * dt; }
      vel[i3] *= drag; vel[i3 + 2] *= drag; vel[i3 + 1] = vel[i3 + 1] * drag - this.grav[i] * dt;
      const x = pos[i3] + vel[i3] * dt, z = pos[i3 + 2] + vel[i3 + 2] * dt;
      let y = pos[i3 + 1] + vel[i3 + 1] * dt;
      if (y < 0.03 && vel[i3 + 1] < 0) { y = 0.03; vel[i3 + 1] *= -0.32; vel[i3] *= 0.55; vel[i3 + 2] *= 0.55; }
      pos[i3] = x; pos[i3 + 1] = y; pos[i3 + 2] = z;
      const t = Math.min(1, age[i] / life[i]);
      // cools from white-yellow through orange to a dull red, with a little flicker
      const h = this.heat[i] * (1 - t) * (1 - t) * (0.75 + 0.25 * Math.sin(age[i] * 40 + i));
      const r = 3.2 * h, g = 2.1 * h * (1 - t * 0.6), b = 0.9 * h * (1 - t);
      const k = 0.028; // streak = distance covered in ~28 ms
      lPos[i6] = x; lPos[i6 + 1] = y; lPos[i6 + 2] = z;
      lPos[i6 + 3] = x - vel[i3] * k; lPos[i6 + 4] = y - vel[i3 + 1] * k; lPos[i6 + 5] = z - vel[i3 + 2] * k;
      lCol[i6] = r; lCol[i6 + 1] = g; lCol[i6 + 2] = b; lCol[i6 + 3] = r * 0.15; lCol[i6 + 4] = g * 0.1; lCol[i6 + 5] = 0;
      hPos[i3] = x; hPos[i3 + 1] = y; hPos[i3 + 2] = z;
      hCol[i3] = r * 0.35; hCol[i3 + 1] = g * 0.35; hCol[i3 + 2] = b * 0.35; hSize[i] = this.size[i];
    }
    if (live === 0 && this.live === 0) return;
    this.live = live;
    const la = this.lGeo.attributes, ha = this.hGeo.attributes;
    la.position.needsUpdate = true; la.color.needsUpdate = true;
    ha.position.needsUpdate = true; ha.aCol.needsUpdate = true; ha.aSize.needsUpdate = true;
  }
  dispose() { this.lGeo.dispose(); this.hGeo.dispose(); this.lineMat.dispose(); this.headMat.dispose(); this.tex.dispose(); }
}

/** Tumbling rigid debris (sleepers, planks, rail offcuts, glass) as one InstancedMesh with a tiny ground-bounce sim. */
export class Debris {
  readonly mesh: THREE.InstancedMesh; readonly mat: THREE.MeshStandardMaterial;
  private n: number; private head = 0;
  private pos: Float32Array; private vel: Float32Array; private rot: Float32Array; private spin: Float32Array; private scl: Float32Array; private on: Uint8Array;
  private geo: THREE.BufferGeometry;
  private m = new THREE.Matrix4(); private q = new THREE.Quaternion(); private e = new THREE.Euler(); private p = new THREE.Vector3(); private s = new THREE.Vector3(); private c = new THREE.Color();
  private dirty = true;
  constructor(scene: THREE.Scene, n = 64) {
    this.n = n;
    this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3); this.rot = new Float32Array(n * 3); this.spin = new Float32Array(n * 3);
    this.scl = new Float32Array(n * 3); this.on = new Uint8Array(n);
    this.geo = new THREE.BoxGeometry(1, 1, 1);
    this.mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, metalness: 0.1 });
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, n);
    this.mesh.frustumCulled = false; this.mesh.castShadow = true;
    for (let i = 0; i < n; i++) this.mesh.setColorAt(i, this.c.set('#555555'));
    this.clear();
    scene.add(this.mesh);
  }
  get visible() { return this.mesh.visible; }
  set visible(v: boolean) { this.mesh.visible = v; }
  clear() {
    this.on.fill(0); this.s.set(0, 0, 0); this.p.set(0, -50, 0); this.q.identity();
    for (let i = 0; i < this.n; i++) this.mesh.setMatrixAt(i, this.m.compose(this.p, this.q, this.s));
    this.mesh.instanceMatrix.needsUpdate = true; this.dirty = false;
  }
  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, sx: number, sy: number, sz: number, color: THREE.ColorRepresentation) {
    const i = this.head, i3 = i * 3; this.head = (this.head + 1) % this.n;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.rot[i3] = Math.random() * 6.28; this.rot[i3 + 1] = Math.random() * 6.28; this.rot[i3 + 2] = Math.random() * 6.28;
    const sp = 4 + Math.hypot(vx, vy, vz) * 0.9;
    this.spin[i3] = (Math.random() - 0.5) * sp; this.spin[i3 + 1] = (Math.random() - 0.5) * sp; this.spin[i3 + 2] = (Math.random() - 0.5) * sp;
    this.scl[i3] = sx; this.scl[i3 + 1] = sy; this.scl[i3 + 2] = sz; this.on[i] = 1;
    this.mesh.setColorAt(i, this.c.set(color)); this.mesh.instanceColor!.needsUpdate = true;
    this.dirty = true;
  }
  update(dt: number) {
    if (!this.dirty) return;
    let moving = false;
    const { pos, vel, rot, spin, scl } = this;
    for (let i = 0; i < this.n; i++) {
      if (!this.on[i]) continue;
      const i3 = i * 3;
      const rest = Math.min(scl[i3], scl[i3 + 1], scl[i3 + 2]) * 0.5;
      const sp = Math.abs(vel[i3]) + Math.abs(vel[i3 + 1]) + Math.abs(vel[i3 + 2]);
      if (sp > 0.02 || pos[i3 + 1] > rest + 0.01) {
        moving = true;
        vel[i3 + 1] -= 9.8 * dt;
        pos[i3] += vel[i3] * dt; pos[i3 + 1] += vel[i3 + 1] * dt; pos[i3 + 2] += vel[i3 + 2] * dt;
        rot[i3] += spin[i3] * dt; rot[i3 + 1] += spin[i3 + 1] * dt; rot[i3 + 2] += spin[i3 + 2] * dt;
        if (pos[i3 + 1] < rest) {
          pos[i3 + 1] = rest;
          vel[i3 + 1] = Math.abs(vel[i3 + 1]) > 1.2 ? -vel[i3 + 1] * 0.28 : 0;
          vel[i3] *= 0.5; vel[i3 + 2] *= 0.5;
          spin[i3] *= 0.5; spin[i3 + 1] *= 0.6; spin[i3 + 2] *= 0.5;
          // settle flat: ease the tilt axes toward the nearest lying orientation
          rot[i3] += (Math.round(rot[i3] / Math.PI) * Math.PI - rot[i3]) * 0.35;
          rot[i3 + 2] += (Math.round(rot[i3 + 2] / Math.PI) * Math.PI - rot[i3 + 2]) * 0.35;
          if (Math.abs(vel[i3]) + Math.abs(vel[i3 + 2]) < 0.25 && vel[i3 + 1] === 0) { vel[i3] = vel[i3 + 2] = 0; spin[i3] = spin[i3 + 1] = spin[i3 + 2] = 0; }
        }
      }
      this.p.set(pos[i3], pos[i3 + 1], pos[i3 + 2]);
      this.q.setFromEuler(this.e.set(rot[i3], rot[i3 + 1], rot[i3 + 2]));
      this.s.set(scl[i3], scl[i3 + 1], scl[i3 + 2]);
      this.mesh.setMatrixAt(i, this.m.compose(this.p, this.q, this.s));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (!moving) this.dirty = false;
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); }
}
