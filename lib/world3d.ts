// The 3D world (Three.js) that replaces the 2D canvas train scene.
// lib/engine.ts owns all story/game state and calls render() every animation frame.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { Station } from './stations';
import { NAME_COLORS } from './stations';
import { GAP, clamp, lerp, smooth, damp, type Shared } from './world3d/kit';
import { buildTrain, TRAIN_BACK, TRAIN_FRONT, LIVERIES } from './world3d/train';
import { addLandmarks } from './world3d/landmarks';
import { disposeLoaders } from './world3d/assets';
import { buildScenery, SIGN_DX, SIGN_Y, SIGN_Z, LAMP_DX, LAMP_Z, LAMP_Y } from './world3d/scenery';
import { Puffs, Glows, Weather, Birds } from './world3d/fx';
import { makeSky, makeRidges, SkyEnv } from './world3d/sky';
import { makeGradePass } from './world3d/post';
import { createCrash } from './world3d/crash';
import { createDirector } from './world3d/camera';
import { Motes } from './world3d/life';

export interface WorldFrame {
  now: number; // performance.now()
  p: number; // train position in station units (0..STATIONS.length-1), fractional while moving
  cur: number; // station the train is at (or last left)
  target: number; // station the train is heading to
  moving: boolean;
  speed: number; // ~0 when stopped, up to ~1.5 at full speed
  derail: number; // 0..1, the 1961 crash
  crashT: number; // -1 when no crash is playing, else seconds since the crash sequence started
  shake: number; // camera shake strength 0..1.4 (already 0 when reduced motion is on)
  lens: 'gogol' | 'nikhil' | 'both'; // which name the train carries
  visited: Set<number>;
  parX: number; // pointer parallax -1..1 (0 on touch devices)
  parY: number;
  cardSide: 'left' | 'bottom' | 'none'; // where the ticket card covers the screen, so the camera frames the train in the free space
  intro?: boolean; // the title screen is up: hold the establishing shot behind it (lib/world3d/camera.ts idle shot)
}

export interface World {
  render(f: WorldFrame): void;
  resize(): void;
  /** Hit-test a click: a station index, 'train', or null. */
  pick(clientX: number, clientY: number): number | 'train' | null;
  /** Re-draw text textures (station signs, nameplate) once web fonts have loaded. */
  refreshText(): void;
  dispose(): void;
  /** Current adaptive quality level (0 = best). Useful for debugging. */
  quality?(): number;
}

export interface WorldOptions {
  stations: Station[];
  reduced: boolean;
  fonts: () => { display: string; mono: string };
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Returns null when WebGL is unavailable; the engine then keeps the 2D canvas. */
export function createWorld(canvas: HTMLCanvasElement, opts: WorldOptions): World | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    if (!renderer.getContext()) return null;
  } catch (e) {
    console.warn('WebGL unavailable', e);
    return null;
  }
  const { stations, reduced } = opts;
  const N = stations.length;
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', transition: 'filter .8s ease' });

  // quality override for testing: ?q3d=high|low
  let qParam = '';
  try { qParam = new URLSearchParams(location.search).get('q3d') || ''; } catch { /* ignore */ }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x101522, 70, 460);
  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.3, 1400);

  // image-based light baked from the current sky (re-baked, throttled, as the time of day changes)
  const skyEnv = new SkyEnv(renderer);

  const shared: Shared = { uTime: { value: 0 }, uNight: { value: 0 }, uWind: { value: 1 } };

  /* ---------- sky ---------- */
  const { mesh: sky, mat: skyMat } = makeSky();
  scene.add(sky);
  const ridges = makeRidges(stations, -4 * GAP, 19 * GAP);
  scene.add(ridges.mesh);

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x3a3226, 1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 30, bottom: -30, near: 5, far: 220 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04; sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const lampLight = new THREE.PointLight(0xffc98a, 0, 34, 2);
  scene.add(lampLight);

  /* ---------- world ---------- */
  const scenery = buildScenery(scene, stations, shared);
  const landmarks = addLandmarks(scene, stations, GAP, shared);
  const train = buildTrain(scene);
  const puffs = new Puffs(scene);
  const glows = new Glows(scene, scenery.lampCount + 2);
  const weather = new Weather(scene);
  const birds = new Birds(scene, shared.uTime);
  const motes = new Motes(scene);
  const director = createDirector(reduced);

  // the 1961 crash sequence (lib/world3d/crash.ts): wreck choreography, sparks, debris, rescuers, the page
  const crash = createCrash(scene, train, { reduced, uScale: glows.mat.uniforms.uScale, puffs, lampLight });

  /* ---------- post ---------- */
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.55, 0.9);
  composer.addPass(bloom);
  // tone mapping + sRGB + film grade in one pass (replaces OutputPass)
  const grade = makeGradePass();
  composer.addPass(grade.pass);

  /* ---------- precomputed colors ---------- */
  const hex3 = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const skyTop = stations.map((s) => hex3(s.sky[0])), skyBot = stations.map((s) => hex3(s.sky[1]));
  const nameCol = stations.map((s) => new THREE.Color(NAME_COLORS[s.name]));
  const liveryCol = new THREE.Color();
  const lensCols = { gogol: new THREE.Color(NAME_COLORS.gogol), nikhil: new THREE.Color(NAME_COLORS.nikhil), both: new THREE.Color(NAME_COLORS.both) };
  const cTop = new THREE.Color(), cBot = new THREE.Color(), cTmp = new THREE.Color(), cTmp2 = new THREE.Color();
  const WHITE = new THREE.Color(1, 1, 1), MOON = new THREE.Color(0.55, 0.66, 1.0), SUNC = new THREE.Color(1.0, 0.9, 0.76), WARM = new THREE.Color(1.0, 0.72, 0.42);
  const GROUND_HEMI = new THREE.Color('#3a3226');
  const cEnvSun = new THREE.Color(), cEnvGround = new THREE.Color(), cWarmSky = new THREE.Color(), envSunDir = new THREE.Vector3();
  const SH_Z = new THREE.Vector3(34, 62, 46).normalize(), SH_X = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), SH_Z).normalize(), SH_Y = new THREE.Vector3().crossVectors(SH_Z, SH_X);
  const CLOUD_BASE = [0.4, 0.4, 0.46, 0.38, 0.4, 0.36, 0.44, 0.4, 0.5, 0.4, 0.46, 0.62, 0.48, 0.42, 0.5];

  /* ---------- state ---------- */
  const S = {
    init: false, last: 0, W: 1, H: 1, pr: 1,
    T: new THREE.Vector3(), d: 40, yaw: 0.38, pitch: 0.2, fov: 34,
    fx0: 0, fx1: 1, fy0: 0, fy1: 1,
    sunDir: new THREE.Vector3(0.3, 0.35, -1).normalize(),
    snow: 0, rain: 0, prevCur: -1, prevMoving: false, flareT0: -1e9, flareStation: -1,
    signT0: new Float64Array(N).fill(-1e9), highlightOn: -1,
    lens: '', lensCol: new THREE.Color(NAME_COLORS.gogol), visitedMask: -1, curMask: -1,
    emit: 0, stackEmit: 0, camD: 40,
    // adaptive quality
    q: qParam === 'low' ? 4 : /^[0-5]$/.test(qParam) ? +qParam : 0, qLocked: qParam === 'high' || qParam === 'low' || /^[0-5]$/.test(qParam), slow: 0, frames: 0, ema: 16,
    measureT: 0, layout: { cardRight: 0, cardTop: 0, hud: 64, rail: 90 },
    introK: 0, // 1 while the title screen composes the shot (train right of the type on wide screens), eases to 0 after boarding
  };

  const v3 = new THREE.Vector3(), vC = new THREE.Vector3(), vS = new THREE.Vector3();
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), back = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), camUp = new THREE.Vector3(0, 1, 0);
  const pts: THREE.Vector3[] = Array.from({ length: 16 }, () => new THREE.Vector3());
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hits: THREE.Intersection[] = [];
  const pickTargets: THREE.Object3D[] = [...scenery.pickables, train.pick];
  train.pick.userData.train = true;

  /* ---------- layout / quality ---------- */
  function measureLayout() {
    const app = canvas.closest('.app') || document;
    const r = (sel: string) => { const el = app.querySelector(sel); return el ? el.getBoundingClientRect() : null; };
    const cv = canvas.getBoundingClientRect();
    const card = r('#cardWrap') || r('.card-wrap'), hud = r('.hud'), rail = r('.rail');
    const L = S.layout;
    L.cardRight = card && card.width > 0 ? card.right - cv.left : Math.min(530, S.W * 0.45);
    L.cardTop = card && card.height > 0 ? card.top - cv.top : S.H * 0.4;
    L.hud = hud ? clamp(hud.bottom - cv.top, 0, S.H * 0.25) : 64;
    L.rail = rail ? clamp(cv.bottom - rail.top, 0, S.H * 0.25) : 90;
  }

  function applyQuality() {
    const dpr = window.devicePixelRatio || 1;
    const caps = [1.75, 1.3, 1.0, 1.0, 1.0, 0.75];
    S.pr = Math.min(dpr, caps[S.q]);
    renderer.setPixelRatio(S.pr);
    composer.setPixelRatio(S.pr);
    renderer.setSize(S.W, S.H, false);
    composer.setSize(S.W, S.H);
    const samples = S.q === 0 && S.pr < 1.5 ? 4 : 0;
    for (const t of [composer.renderTarget1, composer.renderTarget2]) if (t.samples !== samples) { t.samples = samples; t.dispose(); }
    // grade pass: chromatic aberration only at the top levels; image-based light resolution steps down
    grade.uniforms.uCA.value = S.q <= 1 ? 0.006 : 0;
    grade.uniforms.uGrain.value = S.q <= 3 ? 0.022 : 0;
    skyEnv.size = S.q >= 3 ? 64 : S.q >= 2 ? 128 : 256;
    const shadows = S.q < 4;
    if (sun.castShadow !== shadows) sun.castShadow = shadows;
    sun.shadow.mapSize.setScalar(S.q >= 2 ? 1024 : 2048);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const par = canvas.parentElement;
    S.W = Math.max(1, Math.round(rect.width || (par && par.clientWidth) || window.innerWidth));
    S.H = Math.max(1, Math.round(rect.height || (par && par.clientHeight) || window.innerHeight));
    applyQuality();
    measureLayout();
  }
  resize();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null;
  if (ro) ro.observe(canvas);

  function adapt(dtMs: number) {
    if (S.qLocked || document.hidden) return;
    S.frames++;
    if (S.frames < 90 || dtMs > 250) return;
    S.ema = lerp(S.ema, dtMs, 0.05);
    if (S.ema > 24) S.slow++; else S.slow = Math.max(0, S.slow - 2);
    if (S.slow > 90 && S.q < 5) { S.q++; S.slow = 0; S.ema = 16; S.frames = 30; applyQuality(); }
  }

  /* ---------- text ---------- */
  function drawSigns(f: WorldFrame | null) {
    const fonts = opts.fonts();
    for (let i = 0; i < N; i++) scenery.drawSign(i, f ? f.visited.has(i) : false, f ? (i === f.cur && !f.moving) : false, fonts);
  }
  function drawPlate(lens: string) {
    const label = lens === 'nikhil' ? 'NIKHIL' : lens === 'both' ? 'GOGOL·NIKHIL' : 'GOGOL';
    train.plate.draw(label, opts.fonts().mono, NAME_COLORS[(lens as 'gogol') || 'gogol']);
  }
  let lastFrame: WorldFrame | null = null;
  drawSigns(null); drawPlate('gogol');

  /* ---------- per-frame ---------- */
  function render(f: WorldFrame) {
    const now = f.now;
    const dtMs = S.init ? now - S.last : 16;
    const dt = clamp(dtMs / 1000, 0, 0.1);
    S.last = now; lastFrame = f;
    adapt(dtMs);
    S.measureT -= dt;
    if (S.measureT <= 0) { measureLayout(); S.measureT = 0.5; }
    const time = now / 1000;
    shared.uTime.value = time;
    shared.uWind.value = reduced ? 0.25 : 1;

    const p = clamp(f.p, 0, N - 1);
    const tx = p * GAP; // locomotive center
    const i0 = Math.floor(p), i1 = Math.min(N - 1, i0 + 1), ft = p - i0;
    const ns = clamp(Math.round(p), 0, N - 1);

    /* sky + light levels */
    const tr = lerp(skyTop[i0][0], skyTop[i1][0], ft), tg = lerp(skyTop[i0][1], skyTop[i1][1], ft), tb = lerp(skyTop[i0][2], skyTop[i1][2], ft);
    const br = lerp(skyBot[i0][0], skyBot[i1][0], ft), bg = lerp(skyBot[i0][1], skyBot[i1][1], ft), bb = lerp(skyBot[i0][2], skyBot[i1][2], ft);
    cTop.setRGB(tr / 255, tg / 255, tb / 255, THREE.SRGBColorSpace);
    cBot.setRGB(br / 255, bg / 255, bb / 255, THREE.SRGBColorSpace);
    const dark = clamp(1 - ((br * 0.3 + bg * 0.59 + bb * 0.11) / 255) * 1.3, 0, 1);
    landmarks.update({ now, dark, trainX: tx });
    const day = 1 - dark;
    const ct = f.crashT;
    const dk = crash.dark(ct);
    const ls = 1 - 0.95 * dk;

    S.snow += ((stations[ns].snow ? 1 : 0) - S.snow) * damp(1.3, dt);
    S.rain += ((stations[ns].rain ? 1 : 0) - S.rain) * damp(1.3, dt);

    // golden-hour warmth: how orange the horizon is (0 = neutral/blue, 1 = deep amber)
    const warm = clamp((cBot.r - cBot.b) * 1.6, 0, 1) * smooth(0.05, 0.5, day);
    const wetSky = Math.max(S.rain, S.snow * 0.8);
    skyMat.uniforms.uTop.value.copy(cTop);
    skyMat.uniforms.uBot.value.copy(cBot);
    skyMat.uniforms.uStars.value = smooth(0.35, 0.8, dark) * (1 - S.rain * 0.9);
    skyMat.uniforms.uTime.value = time;
    skyMat.uniforms.uLight.value = ls;
    const isMoon = dark > 0.45;
    skyMat.uniforms.uMoon.value = isMoon ? 1 : 0;
    skyMat.uniforms.uSize.value = isMoon ? 0.028 : 0.034;
    if (isMoon) { skyMat.uniforms.uDisc.value.setRGB(1.8, 1.72, 1.52); skyMat.uniforms.uHalo.value.setRGB(0.45, 0.52, 0.72).multiplyScalar(dark * (1 - S.rain * 0.8)); }
    else { skyMat.uniforms.uDisc.value.setRGB(4.6, 3.9, 2.8).multiplyScalar(1 - S.rain * 0.9); skyMat.uniforms.uHalo.value.setRGB(1.3, 0.92 - 0.2 * warm, 0.6 - 0.25 * warm).multiplyScalar((0.5 + day * 0.5) * (1 - wetSky * 0.6)); }
    {
      const su = skyMat.uniforms;
      su.uCloud.value = lerp(lerp(CLOUD_BASE[i0 % CLOUD_BASE.length], CLOUD_BASE[i1 % CLOUD_BASE.length], ft), 0.9, wetSky);
      su.uCloudSpeed.value = reduced ? 0.002 : 0.012;
      // lit cloud tops pick up the horizon colour by day, dim blue-grey by moonlight
      su.uCloudLit.value.copy(WHITE).lerp(cBot, 0.3 + 0.45 * warm).multiplyScalar(lerp(0.1, 1.1, day) * (1 - wetSky * 0.4));
      su.uCloudShade.value.copy(cTop).lerp(cBot, 0.6).multiplyScalar(lerp(0.6, 0.78, day) * (1 - wetSky * 0.25));
      su.uGlow.value.setRGB(1.0, 0.55, 0.25).multiplyScalar(0.35 * warm * (1 - wetSky)).add(cTmp2.copy(cBot).multiplyScalar(0.08 * dark));
    }
    (scene.fog as THREE.Fog).color.copy(cBot).multiplyScalar(ls);
    {
      const fog = scene.fog as THREE.Fog, wet = Math.max(S.rain, S.snow * 0.7);
      const cd = Math.max(S.d, S.camD); // a travel shot can sit farther out than the framing distance
      fog.near = cd * lerp(0.95, 0.55, wet) + 12;
      fog.far = cd + lerp(lerp(430, 340, dark), 170, wet);
    }

    hemi.color.copy(cTop).lerp(WHITE, 0.55);
    hemi.groundColor.copy(GROUND_HEMI).lerp(cBot, 0.3);
    hemi.intensity = (0.12 + 1.2 * day * day) * ls;
    sun.color.copy(MOON).lerp(cTmp.copy(SUNC).lerp(cBot, 0.25 + 0.3 * warm), smooth(0.2, 0.85, day));
    sun.intensity = (0.6 + 2.6 * day) * ls * (1 - S.rain * 0.55) * (1 - S.snow * 0.2);
    // sky-matched image-based light: reflections on paint, glass and rails follow the sky
    envSunDir.set(34, 62, 46).normalize();
    cEnvSun.copy(sun.color).multiplyScalar(sun.intensity * (isMoon ? 0.25 : 0.5));
    cEnvGround.copy(GROUND_HEMI).lerp(cBot, 0.3).multiplyScalar(0.3 + 0.7 * day);
    cWarmSky.copy(cBot).multiplyScalar(1.15);
    scene.environment = skyEnv.update(now, cTop, cWarmSky, cEnvGround, envSunDir, cEnvSun, S.q >= 4 ? 900 : 250);
    scene.environmentIntensity = (0.5 + 0.35 * day) * ls;
    renderer.toneMappingExposure = 1.0;
    // distant mountains: ambient from the sky, hazed toward the horizon colour
    {
      const ru = ridges.mat.uniforms;
      ru.uHaze.value.copy(cBot).lerp(cTop, 0.12);
      ru.uAmb.value.copy(cTop).lerp(WHITE, 0.5).multiplyScalar(0.18 + 0.85 * day);
      ru.uRim.value.copy(sun.color).multiplyScalar(0.25 * day + 0.4 * warm);
      ru.uWet.value = wetSky * 0.55;
      ru.uLight.value = ls;
    }
    // grade: cool shadows, warm highlights at golden hour, a bluer night
    grade.uniforms.uShadow.value.setRGB(lerp(0.97, 0.9, dark), lerp(1.0, 0.97, dark), lerp(1.04, 1.12, dark));
    grade.uniforms.uHigh.value.setRGB(1.03 + 0.06 * warm, 1.0, lerp(0.96, 0.86, warm));
    grade.uniforms.uVig.value = lerp(0.3, 0.42, dark);
    grade.uniforms.uSat.value = lerp(1.07, 1.0, wetSky) + 0.04 * warm;
    shared.uNight.value = smooth(0.12, 0.6, dark) * ls;
    scenery.railGlow.color.setScalar((0.9 + 1.5 * dark) * ls);
    scenery.mats.building.emissiveIntensity = 1;

    /* train */
    const derail = clamp(f.derail, 0, 1);
    const crashOn = crash.on(ct, derail);
    train.update(tx + crash.runX(ct), crashOn ? 0 : derail, now);
    crash.update(ct, derail, tx, now, dt);
    if (S.lens !== f.lens) { S.lens = f.lens; drawPlate(f.lens); }
    S.lensCol.lerp(lensCols[f.lens] || lensCols.gogol, damp(4, dt));
    // the train's paint follows Gogol's life (lib/world3d/train.ts LIVERIES)
    liveryCol.set(LIVERIES[Math.max(0, Math.min(LIVERIES.length - 1, Math.round(f.p)))]);
    train.mats.body.color.lerp(liveryCol, damp(2.5, dt));
    train.mats.lens.color.copy(S.lensCol); train.mats.lens.emissive.copy(S.lensCol);
    train.mats.lens.emissiveIntensity = (0.35 + 0.9 * dark) * ls;
    train.mats.glass.emissiveIntensity = (0.55 + 2.0 * dark) * (crashOn ? 0.1 + 0.9 * crash.lights : 1) * ls;
    train.mats.plate.emissiveIntensity = (0.1 + 0.3 * dark) * ls;
    const headOn = crashOn ? crash.lights : 1;
    train.headlight.intensity = (40 + 1100 * dark) * headOn * ls;
    train.mats.lamp.color.setRGB(6, 5.2, 3.6).multiplyScalar(headOn * (0.35 + 0.65 * dark) + 0.05);

    /* stations: signs, highlight, lamps */
    let vm = 0; for (let i = 0; i < N; i++) if (f.visited.has(i)) vm |= 1 << i;
    const curShown = !f.moving && ct < 0 ? f.cur : -1;
    if (vm !== S.visitedMask || curShown !== S.curMask) {
      const fonts = opts.fonts();
      for (let i = 0; i < N; i++) {
        const was = ((S.visitedMask >> i) & 1) === 1 || i === S.curMask, is = ((vm >> i) & 1) === 1 || i === curShown;
        if (S.visitedMask < 0 || was !== is || ((S.visitedMask >> i) & 1) !== ((vm >> i) & 1)) scenery.drawSign(i, f.visited.has(i), i === curShown, fonts);
      }
      S.visitedMask = vm; S.curMask = curShown;
    }
    const arrived = !f.moving && (S.prevMoving || f.cur !== S.prevCur);
    if (arrived && S.init) { S.signT0[f.cur] = now; S.flareT0 = now; S.flareStation = f.cur; }
    S.prevMoving = f.moving; S.prevCur = f.cur;
    for (let i = Math.max(0, ns - 2); i <= Math.min(N - 1, ns + 2); i++) {
      const sg = scenery.signs[i].pivot, t = (now - S.signT0[i]) / 1000;
      if (t >= 0 && t < 3 && !reduced) {
        if (t < 0.6) { const u = t / 0.6; sg.rotation.x = -Math.PI * 2 * (1 - Math.pow(1 - u, 3)); sg.rotation.z = Math.sin(u * Math.PI) * 0.06; }
        else { const u = t - 0.6; sg.rotation.x = -0.32 * Math.exp(-4 * u) * Math.sin(u * 13); sg.rotation.z = 0.05 * Math.exp(-3 * u) * Math.sin(u * 9); }
        sg.position.y = SIGN_Y + (t < 0.6 ? Math.sin((t / 0.6) * Math.PI) * 0.35 : 0);
      } else { sg.rotation.set(0, 0, 0); sg.position.y = SIGN_Y; }
    }
    if (curShown !== S.highlightOn) {
      if (curShown >= 0) { scenery.signs[curShown].pivot.add(scenery.highlight); scenery.highlight.visible = true; }
      else scenery.highlight.visible = false;
      S.highlightOn = curShown;
    }
    if (curShown >= 0) scenery.highlightMat.color.copy(nameCol[curShown]).multiplyScalar((1.3 + 0.35 * Math.sin(now * 0.004)) * (0.6 + 0.8 * dark) * ls);

    const flareAge = (now - S.flareT0) / 1000;
    const lampBase = (0.3 + 2.4 * dark) * ls;
    for (let k = 0; k < scenery.lampCount; k++) {
      const st = k >> 1, lp = scenery.lampPos[k];
      const fl = st === S.flareStation ? 1 + (reduced ? 0.6 : 2.4) * Math.exp(-flareAge * 1.6) + (st === curShown ? 0.25 : 0) : 1;
      const b = lampBase * fl;
      cTmp.setRGB(4.2 * b + 0.4, 3.3 * b + 0.35, 2.0 * b + 0.3);
      scenery.bulbs.setColorAt(k, cTmp);
      cTmp.copy(WARM).multiplyScalar((0.05 + 0.5 * dark) * fl * ls);
      scenery.pools.setColorAt(k, cTmp);
      glows.set(k, lp.x, lp.y, lp.z, 0.22 * b, 0.16 * b, 0.09 * b, 1.1 + 0.8 * Math.sqrt(fl) * dark);
    }
    scenery.bulbs.instanceColor!.needsUpdate = true;
    scenery.pools.instanceColor!.needsUpdate = true;
    {
      const ls2 = scenery.lampPos[ns * 2 + 1];
      lampLight.position.set(ls2.x - 1.2, LAMP_Y - 0.5, LAMP_Z + 1.2);
      const fl = ns === S.flareStation ? 1 + 1.5 * Math.exp(-flareAge * 1.6) : 1;
      lampLight.intensity = (4 + 120 * dark) * fl * ls;
    }
    scenery.mats.plain.needsUpdate = false;

    /* water */
    if (scenery.water) {
      const u = scenery.water.uniforms;
      u.uTop.value.copy(cTop); u.uBot.value.copy(cBot); u.uTime.value = reduced ? 0 : time; u.uLight.value = ls; u.uCam.value.copy(camera.position);
      if (isMoon) u.uGlint.value.setRGB(0.9, 0.9, 1.0).multiplyScalar(0.8 * dark); else u.uGlint.value.setRGB(1.5, 1.3, 1.0);
    }

    /* steam + smoke */
    const funnel = train.loco.localToWorld(v1.copy(train.funnelTop));
    if (derail < 0.3) {
      const moving = f.moving || f.speed > 0.05;
      const rate = reduced ? 2 : moving ? 12 + 26 * Math.min(1.5, f.speed) : f.intro ? 7 : 3.2;
      S.emit += rate * dt;
      while (S.emit >= 1) {
        S.emit -= 1;
        const rr = Math.random();
        puffs.spawn(funnel.x + (Math.random() - 0.5) * 0.2, funnel.y, funnel.z + (Math.random() - 0.5) * 0.2,
          -0.8 - Math.random() * 0.8 - (moving ? 1.5 : 0), (moving ? 3.2 : 1.6) + rr * 1.2, (Math.random() - 0.5) * 0.7,
          moving ? 1.1 : 0.8, moving ? 5 + rr * 3 : 3.5 + rr * 2, moving ? 2.4 + rr : 3.6 + rr * 1.5, moving ? 0.6 : 0.42, 0.95 + rr * 0.05);
      }
    }
    if (scenery.stacks.length && !reduced) {
      S.stackEmit += dt * 2.2;
      while (S.stackEmit >= 1) {
        S.stackEmit -= 1;
        for (const s of scenery.stacks) if (Math.abs(s.x - tx) < 110) puffs.spawn(s.x, s.y + 0.4, s.z, 1.2 + Math.random() * 0.4, 1.4 + Math.random() * 0.6, 0.2, 2.2, 8, 6 + Math.random() * 2, 0.38, 0.55);
      }
    }
    puffs.update(dt);
    puffs.mat.uniforms.uLit.value.copy(cBot).lerp(WHITE, 0.55).multiplyScalar((0.35 + 0.7 * day) * ls);
    puffs.mat.uniforms.uAmb.value.copy(cTop).lerp(WHITE, 0.2).multiplyScalar((0.35 + 0.45 * day) * ls);

    /* headlight halo */
    const hp = train.loco.localToWorld(v2.copy(train.headPos).setX(train.headPos.x + 0.1));
    const hb = headOn * (0.3 + 2.2 * dark) * ls;
    glows.set(scenery.lampCount, hp.x, hp.y, hp.z, 0.45 * hb, 0.4 * hb, 0.3 * hb, 1.6);
    const inCrash = ct >= 0;
    glows.commit();

    /* camera */
    const L = S.layout, W = S.W, H = S.H;
    let fx0 = 0, fx1 = W, fy0 = L.hud, fy1 = H - L.rail;
    S.introK += ((f.intro ? 1 : 0) - S.introK) * (S.init ? damp(f.intro ? 6 : 1.4, dt) : 1);
    if (S.introK > 0.001) {
      // title screen: the type sits on the left on wide screens (train to its right); on phones the type is above and below the train
      const wide = clamp((W / H - 1.1) / 0.4, 0, 1);
      fx0 = lerp(fx0, W * 0.46 * wide, S.introK); fy0 = lerp(fy0, H * lerp(0.3, 0.04, wide), S.introK); fy1 = lerp(fy1, H * lerp(0.64, 0.96, wide), S.introK);
    }
    if (f.cardSide === 'left') fx0 = Math.min(W * 0.62, L.cardRight + 12);
    else if (f.cardSide === 'bottom') fy1 = Math.max(fy0 + 80, L.cardTop - 6);
    const kF = S.init ? damp(3.2, dt) : 1;
    S.fx0 += (fx0 - S.fx0) * kF; S.fx1 += (fx1 - S.fx1) * kF; S.fy0 += (fy0 - S.fy0) * kF; S.fy1 += (fy1 - S.fy1) * kF;
    const fw = Math.max(40, S.fx1 - S.fx0), fh = Math.max(40, S.fy1 - S.fy0);
    const aspect = W / H, freeAspect = fw / fh;
    const portrait = clamp((1.5 - freeAspect) / 0.8, 0, 1);
    const fovBase = lerp(34, 48, clamp((1.2 - aspect) / 0.6, 0, 1));
    const spd = Math.min(1.2, f.speed);
    let yawT = lerp(0.4, 0.62, portrait) - (reduced ? 0 : 0.14 * spd);
    let pitchT = lerp(0.16, 0.26, portrait);
    if (derail > 0 || inCrash) { yawT = 0.16; pitchT = 0.3; }
    if (!reduced) {
      yawT += f.parX * 0.06 + 0.035 * Math.sin(now * 0.00012);
      pitchT += -f.parY * 0.03 + 0.012 * Math.sin(now * 0.00019 + 1);
    }
    const kA = S.init ? damp(reduced ? 8 : 2.2, dt) : 1;
    S.yaw += (yawT - S.yaw) * kA; S.pitch += (pitchT - S.pitch) * kA;
    const cp = Math.cos(S.pitch);
    back.set(Math.sin(S.yaw) * cp, Math.sin(S.pitch), Math.cos(S.yaw) * cp);
    right.crossVectors(camUp, back).normalize();
    up.crossVectors(back, right).normalize();
    // points that must stay in frame: the train (or the wreck), and the current station's sign
    let np = 0;
    const wreck = derail > 0 || inCrash;
    const xa = tx + TRAIN_BACK - (wreck ? 3 : 0.3), xb = tx + TRAIN_FRONT + (wreck ? 2 : 0.3);
    const za = wreck ? -5.5 : -1.3, zb = wreck ? 7.5 : 1.3, yb = wreck ? 6.5 : 5.6;
    for (const x of [xa, xb]) for (const y of [0.3, yb]) for (const z of [za, zb]) pts[np++].set(x, y, z);
    const signIdx = Math.abs(p - ns) < 0.3 && (!f.moving || ns === f.target) ? ns : -1;
    if (signIdx >= 0) {
      const sx = signIdx * GAP + SIGN_DX;
      for (const x of [sx - 2.8, sx + 2.8]) for (const y of [SIGN_Y - 1.5, SIGN_Y + 1.6]) pts[np++].set(x, y, SIGN_Z);
    }
    let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9, mnz = 1e9, mxz = -1e9;
    for (let k = 0; k < np; k++) { const q = pts[k]; mnx = Math.min(mnx, q.x); mxx = Math.max(mxx, q.x); mny = Math.min(mny, q.y); mxy = Math.max(mxy, q.y); mnz = Math.min(mnz, q.z); mxz = Math.max(mxz, q.z); }
    v1.set((mnx + mxx) / 2, (mny + mxy) / 2, (mnz + mxz) / 2);
    if (!S.init) S.T.copy(v1);
    else {
      const kx = reduced ? 1 : damp(f.moving ? 3.5 : 2.4, dt);
      S.T.x += (v1.x - S.T.x) * kx;
      S.T.x = clamp(S.T.x, v1.x - 8, v1.x + 8);
      S.T.y += (v1.y - S.T.y) * damp(3, dt); S.T.z += (v1.z - S.T.z) * damp(3, dt);
    }
    const tanV = Math.tan(THREE.MathUtils.degToRad(fovBase) / 2), tanH = tanV * aspect;
    // principal point: centered horizontally in the free area, a little below center vertically (train on the lower third)
    const ppx = (S.fx0 + S.fx1) / 2, ppy = S.fy0 + fh * lerp(0.56, 0.5, portrait);
    const ax = (fw / W) * 0.86, ayUp = ((ppy - S.fy0) / (H / 2)) * 0.86, ayDn = ((S.fy1 - ppy) / (H / 2)) * 0.8;
    let need = 12;
    for (let k = 0; k < np; k++) {
      v2.subVectors(pts[k], S.T);
      const along = v2.dot(back);
      const uv = v2.dot(up);
      need = Math.max(need, Math.abs(v2.dot(right)) / (ax * tanH) + along, Math.abs(uv) / ((uv > 0 ? ayUp : ayDn) * tanV) + along);
    }
    need = clamp(need, 14, 240);
    if (!S.init) S.d = need;
    else S.d += (need - S.d) * damp(need > S.d ? 7 : 1.6, dt);
    const fovT = fovBase + (reduced ? 0 : 7 * spd);
    S.fov += (fovT - S.fov) * (S.init ? damp(3, dt) : 1);
    // the director's shot for this trip (crane / low / drone / dolly / boarding flyover), blended over the framing camera
    vC.set(tx + (TRAIN_BACK + TRAIN_FRONT) / 2, 2.6, 0);
    const shot = director.update({ now, dt, p: f.p, target: f.target, moving: f.moving, speed: f.speed, crash: derail > 0 || inCrash, cardOpen: f.cardSide !== 'none', center: vC, gap: GAP, idle: !!f.intro, portrait: clamp((1.2 - aspect) / 0.6, 0, 1) });
    camera.position.copy(S.T).addScaledVector(back, S.d * shot.push);
    v2.copy(S.T);
    if (shot.w > 0.001) {
      const w = shot.w;
      camera.position.lerp(shot.pos, w);
      v2.lerp(shot.look, w);
    }
    if (f.shake > 0) {
      const sh = f.shake * 0.32;
      camera.position.x += (Math.sin(now * 0.047) + Math.sin(now * 0.083) * 0.5) * sh;
      camera.position.y += (Math.sin(now * 0.061 + 1) + Math.sin(now * 0.101) * 0.5) * sh * 0.7;
      v2.x += Math.sin(now * 0.053 + 2) * sh * 0.3;
    }
    camera.up.set(0, 1, 0);
    camera.lookAt(v2);
    camera.fov = shot.w > 0.001 ? lerp(S.fov, shot.fov + 4 * spd, shot.w) : S.fov; camera.aspect = aspect; camera.near = 0.3; camera.far = 1400;
    crash.late(camera, f.shake, now);
    camera.setViewOffset(W, H, W / 2 - ppx, H / 2 - ppy, W, H);
    camera.updateMatrixWorld();
    S.camD = camera.position.distanceTo(S.T);
    sky.position.copy(camera.position);

    // sun/moon sits in the upper part of the free area
    v1.copy(back).negate().addScaledVector(right, lerp(0.3, 0.1, portrait)).addScaledVector(up, lerp(0.2, 0.36, portrait)).normalize();
    if (!S.init) S.sunDir.copy(v1); else S.sunDir.lerp(v1, damp(0.6, dt)).normalize();
    skyMat.uniforms.uSunDir.value.copy(S.sunDir);

    // shadows follow the train; light comes from the camera side so the train's face is lit
    // snapped to whole shadow-map texels in light space, so shadow edges don't shimmer while the train rolls
    {
      const texel = 76 / sun.shadow.mapSize.x;
      const lx = SH_X.x * (tx - 9) + SH_X.z * -3, ly = SH_Y.x * (tx - 9) + SH_Y.y * 0 + SH_Y.z * -3;
      v1.set(tx - 9, 0, -3).addScaledVector(SH_X, Math.round(lx / texel) * texel - lx).addScaledVector(SH_Y, Math.round(ly / texel) * texel - ly);
    }
    sun.target.position.copy(v1);
    sun.position.set(v1.x + 34, v1.y + 62, v1.z + 46);
    sun.target.updateMatrixWorld();

    /* weather + birds */
    weather.snow.visible = S.snow > 0.01; weather.rain.visible = S.rain > 0.01;
    const pxScale = (H * S.pr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    if (weather.snow.visible) { const u = weather.snowMat.uniforms; u.uTime.value = reduced ? time * 0.3 : time; u.uCenter.value.copy(S.T).addScaledVector(back, 38); u.uAmt.value = S.snow * 0.95; u.uScale.value = pxScale; u.uCol.value.setScalar(0.75 + 0.25 * day); }
    if (weather.rain.visible) { const u = weather.rainMat.uniforms; u.uTime.value = reduced ? time * 0.3 : time; u.uCenter.value.copy(S.T).addScaledVector(back, 38); u.uAmt.value = S.rain * ls; }
    puffs.mat.uniforms.uScale.value = pxScale;
    glows.mat.uniforms.uScale.value = pxScale;
    {
      // dust motes in the sun by day, fireflies on clear warm-region nights
      const mu = motes.mat.uniforms, reg = stations[ns].region;
      motes.points.visible = S.q <= 3;
      mu.uTime.value = reduced ? time * 0.3 : time; mu.uCenter.value.copy(vC); mu.uScale.value = pxScale;
      mu.uDust.value.copy(sun.color).multiplyScalar(0.05 * day * (0.5 + warm) * (1 - wetSky) * ls);
      const fly = (reg === 'india' || reg === 'suburb' || reg === 'lake' || reg === 'town') ? smooth(0.4, 0.75, dark) * (1 - wetSky) * ls : 0;
      mu.uFly.value.setRGB(0.75, 1.0, 0.35).multiplyScalar(0.9 * fly);
    }
    birds.update(now, S.T.x, S.T.z, reduced ? 0 : 0.8 * (1 - smooth(0.3, 0.55, dark)) * (1 - S.rain) * ls);

    /* draw */
    // q0-2: bloom + grade, q3: grade only, q4-5: straight to screen (renderer's own ACES tone mapping)
    if (S.q < 4) {
      bloom.enabled = S.q < 3;
      bloom.strength = lerp(0.3, 0.72, dark);
      bloom.threshold = lerp(1.1, 0.85, dark); // by day only real highlights bloom, so signs stay readable
      const gu = grade.uniforms;
      gu.uRes.value.set(S.W * S.pr, S.H * S.pr); gu.uTime.value = reduced ? 0 : time; gu.uExposure.value = renderer.toneMappingExposure;
      gu.uAspect.value = aspect;
      // focus on the train; tilt-shift depth of field + background motion blur (q0-2 only)
      v3.copy(vC).project(camera);
      gu.uFocus.value.set(clamp(v3.x * 0.5 + 0.5, 0, 1), clamp(v3.y * 0.5 + 0.5, 0, 1));
      const blurOk = S.q <= 2 && !inCrash;
      gu.uTilt.value = blurOk ? shot.tilt * (S.q === 2 ? 0.7 : 1) : 0;
      vS.copy(vC).setX(vC.x + 1).project(camera);
      const mdx = (vS.x - v3.x) * W, mdy = (vS.y - v3.y) * H, ml = Math.hypot(mdx, mdy) || 1;
      const msp = f.moving ? clamp(f.speed, 0, 1.5) : 0;
      const tdir = f.target >= f.p ? 1 : -1;
      gu.uMotion.value.set((-mdx / ml) * tdir * 18 * S.pr, (-mdy / ml) * tdir * 18 * S.pr);
      gu.uMotAmt.value = blurOk && !reduced ? msp * (0.5 + 0.5 * shot.w) * (aspect < 1 ? 0.6 : 1) * (shot.kind === 'low' ? 0.5 : 1) : 0;
      // letterbox while a travel shot is on screen (landscape only)
      gu.uBars.value = shot.w * (aspect > 1.1 ? 0.075 : 0);
      // sun / moon lens flare
      vS.copy(camera.position).addScaledVector(S.sunDir, 600).project(camera);
      const vis = vS.z < 1 ? 1 - smooth(0.85, 1.2, Math.max(Math.abs(vS.x), Math.abs(vS.y))) : 0;
      gu.uFlarePos.value.set(vS.x * 0.5 + 0.5, vS.y * 0.5 + 0.5);
      const fl = S.q <= 3 && !inCrash ? vis * (1 - wetSky) * ls : 0;
      if (isMoon) gu.uFlare.value.copy(MOON).multiplyScalar(0.3 * dark * fl);
      else gu.uFlare.value.copy(SUNC).lerp(WARM, warm * 0.6).multiplyScalar((0.35 + 0.5 * warm) * day * fl);
      composer.render(dt);
    } else renderer.render(scene, camera);
    S.init = true;
  }

  function pick(clientX: number, clientY: number): number | 'train' | null {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    hits.length = 0;
    raycaster.intersectObjects(pickTargets, false, hits);
    for (const h of hits) {
      if (h.object.userData.train) return 'train';
      if (typeof h.object.userData.station === 'number') return h.object.userData.station;
    }
    return null;
  }

  function dispose() {
    if (ro) ro.disconnect();
    const seen = new Set<unknown>();
    const freeMat = (m: THREE.Material) => {
      if (seen.has(m)) return; seen.add(m);
      for (const v of Object.values(m as unknown as Record<string, unknown>)) if (v instanceof THREE.Texture) v.dispose();
      const u = (m as THREE.ShaderMaterial).uniforms;
      if (u) for (const k of Object.keys(u)) { const val = u[k] && u[k].value; if (val instanceof THREE.Texture) val.dispose(); }
      m.dispose();
    };
    scene.traverse((o) => {
      const any = o as THREE.Mesh;
      if (any.geometry && !seen.has(any.geometry)) { seen.add(any.geometry); any.geometry.dispose(); }
      if (any.material) (Array.isArray(any.material) ? any.material : [any.material]).forEach(freeMat);
      const sl = o as THREE.DirectionalLight; if (sl.isLight && sl.shadow && sl.shadow.map) sl.shadow.map.dispose();
    });
    train.geos.forEach((g) => g.dispose());
    landmarks.dispose(); disposeLoaders();
    scenery.dispose(); motes.dispose(); puffs.dispose(); glows.dispose(); weather.dispose(); birds.dispose();
    crash.dispose(); skyEnv.dispose();
    bloom.dispose(); grade.dispose(); composer.dispose(); rt.dispose();
    renderer.dispose();
  }

  return {
    render,
    resize,
    pick,
    refreshText() { drawSigns(lastFrame); drawPlate(S.lens || 'gogol'); S.visitedMask = -1; },
    dispose,
    quality: () => S.q,
  };
}
