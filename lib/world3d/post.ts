// Final "film" pass: ACES tone mapping + sRGB (replaces OutputPass), then a light grade in display space:
// split toning, filmic contrast, saturation, vignette, edge chromatic aberration and animated grain (also dithers banding).
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
    if (uCA > 0.0) {
      vec2 off = c * r2 * uCA;
      col = vec3(texture2D(tDiffuse, vUv - off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv + off).b);
    } else col = texture2D(tDiffuse, vUv).rgb;
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col *= mix(uShadow, uHigh, smoothstep(0.02, 0.9, l));
    col = toSRGB(aces(col));
    col = mix(col, col * col * (3.0 - 2.0 * col), uContrast);
    float L = dot(col, vec3(0.299, 0.587, 0.114));
    col = max(mix(vec3(L), col, uSat), 0.0);
    float d = length(c * vec2(1.0, 0.82)) * 1.414;
    col *= 1.0 - uVig * smoothstep(0.42, 1.12, d);
    float g = hash(vUv * uRes + fract(uTime * 7.13) * vec2(211.0, 97.0)) + hash(vUv * uRes * 1.3 + fract(uTime * 3.7) * vec2(57.0, 131.0)) - 1.0;
    col += g * (uGrain * (1.0 - 0.7 * L) + 1.0 / 255.0);
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }`;

export function makeGradePass() {
  const mat = new THREE.RawShaderMaterial({
    uniforms: {
      tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uExposure: { value: 1 },
      uVig: { value: 0.32 }, uGrain: { value: 0.022 }, uCA: { value: 0.006 }, uContrast: { value: 0.18 }, uSat: { value: 1.06 },
      uShadow: { value: new THREE.Color(0.96, 1.0, 1.06) }, uHigh: { value: new THREE.Color(1.05, 1.0, 0.94) },
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
