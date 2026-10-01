// Final "film" pass: ACES tone mapping + sRGB (replaces OutputPass), then a light grade in display space:
// split toning, filmic contrast, saturation, vignette, edge chromatic aberration and animated grain (also dithers banding).
// Cinematography extras (driven by lib/world3d/camera.ts): a depth-free tilt-shift "depth of field" around the train,
// background motion blur at speed, an analytic sun/moon lens flare (glare, anamorphic streak, ghosts) and letterbox bars.
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const V = `precision highp float;
  uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix;
  attribute vec3 position; attribute vec2 uv; varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const F = `precision highp float;
  uniform sampler2D tDiffuse;
  uniform vec2 uRes; uniform float uTime, uExposure, uVig, uGrain, uCA, uContrast, uSat;
  uniform vec3 uShadow, uHigh;
  uniform vec2 uFocus, uMotion, uFlarePos; uniform float uTilt, uMotAmt, uBars, uAspect; uniform vec3 uFlare;
  varying vec2 vUv;
  vec3 rrtOdt(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
  vec3 aces(vec3 c){
    const mat3 I = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
    const mat3 O = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
    c *= uExposure / 0.6; c = O * rrtOdt(I * c); return clamp(c, 0.0, 1.0);
  }
  vec3 toSRGB(vec3 c){ return mix(c * 12.92, pow(c, vec3(0.41666)) * 1.055 - 0.055, step(0.0031308, c)); }
  float hash(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
  void main(){
    vec2 c = vUv - 0.5;
    float r2 = dot(c, c);
    vec3 col;
    float rad = 0.0, mot = 0.0;
    if (uTilt > 0.0 || uMotAmt > 0.0) {
      vec2 fd = vUv - uFocus;
      rad = uTilt * 9.0 * smoothstep(0.07, 0.42, abs(fd.y));
      mot = uMotAmt * smoothstep(0.08, 0.34, length(fd * vec2(0.42 * uAspect, 1.0)));
    }
    if (rad + mot > 0.6) {
      // 10 golden-angle disc taps (defocus) spread along the motion vector (blur)
      vec2 px = 1.0 / uRes; vec3 acc = vec3(0.0);
      for (int i = 0; i < 10; i++) {
        float fi = float(i);
        float rr = sqrt((fi + 0.5) / 10.0) * rad; float an = fi * 2.39996;
        vec2 o = vec2(cos(an), sin(an)) * rr + uMotion * (fi / 9.0 - 0.5) * mot;
        acc += texture2D(tDiffuse, vUv + o * px).rgb;
      }
      col = acc / 10.0;
    } else if (uCA > 0.0) {
      vec2 off = c * r2 * uCA;
      col = vec3(texture2D(tDiffuse, vUv - off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv + off).b);
    } else col = texture2D(tDiffuse, vUv).rgb;
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col *= mix(uShadow, uHigh, smoothstep(0.02, 0.9, l));
    col = toSRGB(aces(col));
    col = mix(col, col * col * (3.0 - 2.0 * col), uContrast);
    float L = dot(col, vec3(0.299, 0.587, 0.114));
    col = max(mix(vec3(L), col, uSat), 0.0);
    if (uFlare.r + uFlare.g + uFlare.b > 0.001) {
      // lens flare from the sun/moon: soft glare, a thin anamorphic streak and ghosts mirrored through the center
      vec2 asp = vec2(uAspect, 1.0);
      vec2 sd = (vUv - uFlarePos) * asp;
      float glare = exp(-length(sd) * 7.0) * 0.5 + exp(-abs(sd.y) * 260.0) * exp(-abs(sd.x) * 2.2) * 0.45;
      vec2 axis = vec2(0.5) - uFlarePos;
      float gh = 0.0; vec3 gc = vec3(0.0);
      for (int i = 0; i < 4; i++) {
        float t = 0.55 + float(i) * 0.42;
        vec2 gp = uFlarePos + axis * t * 2.0;
        float rr = 0.025 + 0.03 * float(i);
        float dd = length((vUv - gp) * asp);
        float ring = smoothstep(rr, rr * 0.75, dd) * (0.35 + 0.65 * smoothstep(rr * 0.2, rr, dd));
        gc += ring * (i == 1 ? vec3(0.4, 0.9, 0.7) : i == 2 ? vec3(0.9, 0.5, 0.9) : vec3(1.0, 0.75, 0.45)) * 0.08;
      }
      col += uFlare * glare + uFlare * gc * (1.0 - L * 0.5);
    }
    float d = length(c * vec2(1.0, 0.82)) * 1.414;
    col *= 1.0 - uVig * smoothstep(0.42, 1.12, d);
    float g = hash(vUv * uRes + fract(uTime * 7.13) * vec2(211.0, 97.0)) + hash(vUv * uRes * 1.3 + fract(uTime * 3.7) * vec2(57.0, 131.0)) - 1.0;
    col += g * (uGrain * (1.0 - 0.7 * L) + 1.0 / 255.0);
    if (uBars > 0.0) col *= smoothstep(0.0, 1.5 / uRes.y, 0.5 - uBars - abs(vUv.y - 0.5));
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }`;

export function makeGradePass() {
  const mat = new THREE.RawShaderMaterial({
    uniforms: {
      tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uExposure: { value: 1 },
      uVig: { value: 0.32 }, uGrain: { value: 0.022 }, uCA: { value: 0.006 }, uContrast: { value: 0.18 }, uSat: { value: 1.06 },
      uShadow: { value: new THREE.Color(0.96, 1.0, 1.06) }, uHigh: { value: new THREE.Color(1.05, 1.0, 0.94) },
      uFocus: { value: new THREE.Vector2(0.5, 0.5) }, uMotion: { value: new THREE.Vector2(0, 0) }, uFlarePos: { value: new THREE.Vector2(0.5, 0.8) },
      uTilt: { value: 0 }, uMotAmt: { value: 0 }, uBars: { value: 0 }, uAspect: { value: 1.6 }, uFlare: { value: new THREE.Color(0, 0, 0) },
    },
    vertexShader: V, fragmentShader: F, depthTest: false, depthWrite: false,
  });
  const pass = new ShaderPass(mat);
  const u = mat.uniforms;
  return {
    pass,
    uniforms: u,
    dispose() { pass.dispose(); mat.dispose(); },
  };
}
