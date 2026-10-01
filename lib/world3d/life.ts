// Small ambient life around the train: sunlit dust motes by day, blinking fireflies on warm nights.
// Animated entirely in the vertex shader inside a box that follows the camera target (one draw call).
import * as THREE from 'three';

const WRAP = `vec3 wrapBox(vec3 p, vec3 c, vec3 b) { return c - b * 0.5 + mod(p - (c - b * 0.5), b); }`;

export class Motes {
  readonly points: THREE.Points; readonly mat: THREE.ShaderMaterial;
  private geo: THREE.BufferGeometry;
  constructor(scene: THREE.Scene, n = 260) {
    const g = new THREE.BufferGeometry(), seeds = new Float32Array(n * 3);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    g.setAttribute('position', new THREE.BufferAttribute(seeds, 3));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(90, 16, 46) }, uScale: { value: 400 },
        uDust: { value: new THREE.Color(0, 0, 0) }, uFly: { value: new THREE.Color(0, 0, 0) },
      },
      vertexShader: `uniform float uTime; uniform vec3 uCenter; uniform vec3 uBox; uniform float uScale; varying vec3 vS; varying float vBlink; ${WRAP}
        void main(){ vec3 s = position; vec3 p = s * uBox;
          float t = uTime * (0.25 + s.y * 0.3);
          p += vec3(sin(t + s.z * 40.0) * 2.2 - uTime * 0.4, sin(t * 1.3 + s.x * 30.0) * 1.1, cos(t * 0.9 + s.y * 50.0) * 2.0);
          p = wrapBox(p, uCenter + vec3(0.0, 4.5, 0.0), uBox);
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          vS = s; vBlink = pow(0.5 + 0.5 * sin(uTime * (1.4 + s.x * 1.6) + s.z * 60.0), 6.0);
          gl_PointSize = clamp((0.09 + s.y * 0.08) * uScale / max(0.5, -mv.z), 1.0, 9.0); }`,
      fragmentShader: `uniform vec3 uDust; uniform vec3 uFly; varying vec3 vS; varying float vBlink;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
          vec3 c = uDust * (0.4 + 0.6 * vS.z) + uFly * vBlink * step(0.45, vS.x);
          gl_FragColor = vec4(c * a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false; this.points.renderOrder = 6;
    scene.add(this.points);
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); }
}
