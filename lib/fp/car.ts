// 1987 · The passenger seat. A night highway: dashboard glow, Ashoke at the wheel,
// headlights on the road, lane lines and sodium lamps streaming past.
import * as THREE from 'three';
import type { Ctx, Room } from './types';
import { rng, lerp, figure, smooth } from './kit';

export function buildCar(ctx: Ctx): Room {
  const { scene, kit, reduced, sfx } = ctx;
  const R = rng(1987);
  const FOG = 0x0a1020;
  scene.background = new THREE.Color(FOG);
  scene.fog = new THREE.FogExp2(FOG, 0.016);

  const EYE = new THREE.Vector3(0.34, 1.13, 0.42);
  const car = new THREE.Group(); scene.add(car);
  const world = new THREE.Group(); scene.add(world);

  /* ---------- sky ---------- */
  const skyTex = kit.canvas(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#03050c'); gr.addColorStop(0.62, '#0d1630'); gr.addColorStop(0.78, '#2a2a45'); gr.addColorStop(0.84, '#3a2e3a'); gr.addColorStop(1, '#0a0c14');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 360; i++) { g.fillStyle = `rgba(255,255,255,${0.15 + R() * 0.7})`; const s = R() < 0.08 ? 2 : 1; g.fillRect(R() * w, R() * h * 0.66, s, s); }
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2 + 0.2), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }));
  sky.position.y = -20; scene.add(sky);
  const moon = kit.glow(0xc9d6ff, 30, 0.55, scene, 90, 60, -200);
  void moon;
  const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(3.2, 24), new THREE.MeshBasicMaterial({ color: 0xeef0ff, fog: false }));
  moonDisc.position.set(90, 60, -200); moonDisc.lookAt(0, 1, 0); scene.add(moonDisc);
  // distant town glow on the horizon
  kit.glow(0xff9a55, 90, 0.18, scene, -60, 2, -260);
  kit.glow(0xffb070, 60, 0.14, scene, 70, 0, -280);

  /* ---------- road + roadside ---------- */
  const asphalt = kit.noise('#26272b', 0.25, 256, [6, 120], 3, 3);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(26, 600), kit.std(0xffffff, 0.88, 0, { map: asphalt }));
  road.rotation.x = -Math.PI / 2; road.position.set(-4, 0, -280); road.receiveShadow = true; world.add(road);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(400, 600), kit.std(0x10160f, 1));
  grass.rotation.x = -Math.PI / 2; grass.position.set(0, -0.02, -280); world.add(grass);
  const lineM = kit.std(0xe8e6dc, 0.6, 0, { emissive: 0x9a988e, emissiveIntensity: 0.25 });
  const yellowM = kit.std(0xe0b030, 0.6, 0, { emissive: 0x8a6a10, emissiveIntensity: 0.25 });
  // solid edges
  kit.box(0.14, 0.012, 600, lineM, world, 2.0, 0.006, -280, false);
  kit.box(0.14, 0.012, 600, yellowM, world, -5.6, 0.006, -280, false);
  // opposite carriageway edge lines
  kit.box(0.14, 0.012, 600, yellowM, world, -8.2, 0.006, -280, false);
  kit.box(0.14, 0.012, 600, lineM, world, -15.8, 0.006, -280, false);

  type Mover = { o: THREE.Object3D; span: number; min: number };
  const movers: Mover[] = [];
  // instanced streams: everything that rushes past shares a few draw calls
  const SPAN = 312, MIN = -300;
  type Stream = { ims: THREE.InstancedMesh[]; pos: Float32Array; scl: Float32Array; n: number };
  const streams: Stream[] = [];
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3();
  const stream = (parts: [THREE.BufferGeometry, THREE.Material][], n: number, place: (i: number) => [number, number, number, number]) => {
    const pos = new Float32Array(n * 3), scl = new Float32Array(n);
    for (let i = 0; i < n; i++) { const [x, y, z, sc] = place(i); pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; scl[i] = sc; }
    const ims = parts.map(([g, m]) => { const im = new THREE.InstancedMesh(g, m, n); im.frustumCulled = false; world.add(im); return im; });
    const st = { ims, pos, scl, n }; streams.push(st); return st;
  };
  const moveStreams = (dz: number) => {
    for (const st of streams) {
      for (let i = 0; i < st.n; i++) {
        let z = st.pos[i * 3 + 2] + dz;
        if (z > MIN + SPAN) z -= SPAN;
        st.pos[i * 3 + 2] = z;
        V3.set(st.pos[i * 3], st.pos[i * 3 + 1], z); S3.setScalar(st.scl[i]);
        M4.compose(V3, Q, S3);
        for (const im of st.ims) im.setMatrixAt(i, M4);
      }
      for (const im of st.ims) im.instanceMatrix.needsUpdate = true;
    }
  };
  const dashG = new THREE.BoxGeometry(0.13, 0.014, 3.0);
  stream([[dashG, lineM]], 52, (i) => [i % 2 ? -12 : -1.8, 0.007, MIN + Math.floor(i / 2) * 12 + (i % 2) * 6, 1]);
  // guardrail posts with amber reflectors on the right
  const postM = kit.std(0x8a8c90, 0.5, 0.6);
  const reflM = new THREE.MeshBasicMaterial({ color: 0xffa640 });
  kit.box(0.04, 0.3, 600, kit.std(0x9a9ca0, 0.4, 0.7), world, 3.6, 0.62, -280);
  stream([[new THREE.BoxGeometry(0.1, 0.7, 0.1).translate(0, 0.35, 0), postM], [new THREE.BoxGeometry(0.03, 0.06, 0.08).translate(-0.06, 0.66, 0), reflM]], 30,
    (i) => [3.62, 0, MIN + i * 10.4, 1]);
  // trees both sides
  const treeG = new THREE.ConeGeometry(1.8, 6.5, 7).translate(0, 3.8, 0);
  const trunkG = new THREE.CylinderGeometry(0.18, 0.22, 1.2, 6).translate(0, 0.6, 0);
  const treeM = kit.std(0x14201a, 0.95), trunkM = kit.std(0x201712, 1);
  stream([[treeG, treeM], [trunkG, trunkM]], 70, (i) => [i % 2 ? 6.5 + R() * 22 : -19 - R() * 22, 0, MIN + R() * SPAN, 0.8 + R() * 1.1]);
  moveStreams(0);
  // sodium lamps on the median: glowing heads plus one real light that sweeps over the car
  const lampHeads: THREE.Group[] = [];
  const lampPoleM = kit.std(0x3a3c40, 0.5, 0.6);
  const lampHeadM = new THREE.MeshBasicMaterial({ color: 0xffc070 });
  for (let i = 0; i < 8; i++) {
    const l = new THREE.Group(); l.position.set(-6.9, 0, -300 + i * 39); world.add(l);
    kit.box(0.14, 8, 0.14, lampPoleM, l, 0, 4, 0, false);
    kit.box(2.2, 0.1, 0.1, lampPoleM, l, 1.1, 8, 0, false);
    kit.box(0.5, 0.08, 0.22, lampHeadM, l, 2.1, 7.92, 0, false);
    kit.glow(0xffa84a, 5, 0.75, l, 2.1, 7.7, 0);
    lampHeads.push(l);
    movers.push({ o: l, span: 312, min: -300 });
  }
  const sodium = new THREE.PointLight(0xffa04a, 0, 0, 2); scene.add(sodium);

  // oncoming traffic on the other side, a pair of tail lights far ahead
  const onc = new THREE.Group(); world.add(onc);
  const hlA = kit.glow(0xfff4dc, 2.2, 1, onc, -0.55, 0.7, 0), hlB = kit.glow(0xfff4dc, 2.2, 1, onc, 0.55, 0.7, 0);
  const hlFlare = kit.glow(0xdfe8ff, 9, 0.35, onc, 0, 0.7, 0);
  onc.position.set(-11.5, 0, -400);
  let oncT = 2.5;
  const tail = new THREE.Group(); world.add(tail); tail.position.set(-1.6, 0, -120);
  kit.glow(0xff2a1a, 0.9, 0.9, tail, -0.6, 0.8, 0); kit.glow(0xff2a1a, 0.9, 0.9, tail, 0.6, 0.8, 0);

  /* ---------- the car ---------- */
  const dashM = kit.std(0x17181c, 0.75);
  const trimM = kit.std(0x24252b, 0.6);
  const headM = kit.std(0x5a5550, 0.95, 0, { map: kit.noise('#5b5650', 0.08, 64, [4, 4], 17) });
  const paint = kit.std(0x3b1a1c, 0.35, 0.5);
  const seatM = kit.std(0x4a3a30, 0.85, 0, { map: kit.noise('#4b3b31', 0.1, 64, [6, 6], 23) });
  // dashboard + cluster hood
  kit.box(1.7, 0.26, 0.5, dashM, car, 0, 0.85, -0.8);
  const top = kit.box(1.7, 0.06, 0.34, trimM, car, 0, 1.0, -0.86); top.rotation.x = 0.08;
  const hood = kit.mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.46, 16, 1, false, 0, Math.PI), dashM, car, -0.38, 1.0, -0.72);
  hood.rotation.set(0, 0, Math.PI / 2); hood.scale.set(1, 1, 0.8);
  // instrument cluster (amber glow)
  const gaugeTex = kit.canvas(512, 160, (g, w, h) => {
    g.fillStyle = '#050506'; g.fillRect(0, 0, w, h);
    const dial = (cx: number, r: number, n: number, needle: number) => {
      const gr = g.createRadialGradient(cx, h / 2, 0, cx, h / 2, r * 1.3); gr.addColorStop(0, 'rgba(255,150,50,.25)'); gr.addColorStop(1, 'rgba(255,150,50,0)');
      g.fillStyle = gr; g.fillRect(cx - r * 1.3, 0, r * 2.6, h);
      g.strokeStyle = '#ffae4a'; g.lineWidth = 3;
      g.beginPath(); g.arc(cx, h / 2, r, Math.PI * 0.8, Math.PI * 2.2); g.stroke();
      for (let i = 0; i <= n; i++) { const a = Math.PI * 0.8 + i / n * Math.PI * 1.4; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.82, h / 2 + Math.sin(a) * r * 0.82); g.lineTo(cx + Math.cos(a) * r * 0.97, h / 2 + Math.sin(a) * r * 0.97); g.stroke(); }
      g.strokeStyle = '#ff5a2a'; g.lineWidth = 4; const a = Math.PI * 0.8 + needle * Math.PI * 1.4;
      g.beginPath(); g.moveTo(cx, h / 2); g.lineTo(cx + Math.cos(a) * r * 0.85, h / 2 + Math.sin(a) * r * 0.85); g.stroke();
    };
    dial(130, 62, 12, 0.52); dial(330, 62, 8, 0.33);
    g.fillStyle = '#5eaaff'; g.fillRect(440, 60, 10, 10); g.fillStyle = '#3aff9a'; g.fillRect(460, 60, 10, 10);
  });
  const gaugeM = new THREE.MeshBasicMaterial({ map: gaugeTex, toneMapped: false });
  const gauge = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.14), gaugeM);
  gauge.position.set(-0.38, 0.95, -0.66); gauge.rotation.x = -0.25; car.add(gauge);
  // radio + vents in the centre stack
  const radioTex = kit.canvas(256, 64, (g, w, h) => {
    g.fillStyle = '#060806'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) { const bh = 6 + Math.abs(Math.sin(i * 1.7)) * 30; g.fillStyle = '#3aff9a'; g.globalAlpha = 0.8; g.fillRect(40 + i * 11, h - 12 - bh, 7, bh); }
    g.globalAlpha = 1;
  });
  const radioM = new THREE.MeshBasicMaterial({ map: radioTex, toneMapped: false, transparent: true, opacity: 0.85 });
  const radio = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05), radioM); radio.position.set(0.02, 0.86, -0.549); car.add(radio);
  kit.box(0.28, 0.2, 0.02, trimM, car, 0.02, 0.83, -0.555);
  for (const x of [-0.08, 0.12]) kit.box(0.08, 0.03, 0.01, kit.std(0x0c0c0e, 0.9), car, x, 0.93, -0.546, false);
  kit.box(0.44, 0.16, 0.02, trimM, car, 0.4, 0.8, -0.555); // glovebox
  kit.box(0.26, 0.5, 0.7, trimM, car, 0.0, 0.35, -0.15); // console
  // windshield frame, A-pillars, roof, headliner, visors, mirror
  const pillar = (a: THREE.Vector3, b: THREE.Vector3, w = 0.08) => {
    const len = a.distanceTo(b);
    const m = kit.box(w, len, 0.1, trimM, car, 0, 0, 0);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return m;
  };
  pillar(new THREE.Vector3(-0.8, 0.98, -1.02), new THREE.Vector3(-0.72, 1.46, -0.32), 0.1);
  pillar(new THREE.Vector3(0.8, 0.98, -1.02), new THREE.Vector3(0.72, 1.46, -0.32), 0.1);
  kit.box(1.56, 0.05, 1.9, headM, car, 0, 1.49, 0.6);
  kit.box(1.56, 0.08, 0.1, trimM, car, 0, 1.46, -0.33);
  const visL = kit.box(0.5, 0.02, 0.2, headM, car, -0.38, 1.44, -0.24); visL.rotation.x = 0.2;
  const visR = kit.box(0.5, 0.02, 0.2, headM, car, 0.38, 1.44, -0.24); visR.rotation.x = 0.2;
  kit.box(0.02, 0.06, 0.02, trimM, car, 0, 1.44, -0.36);
  const mirror = kit.box(0.2, 0.055, 0.025, trimM, car, 0, 1.39, -0.36); mirror.rotation.y = 0.25;
  kit.mesh(new THREE.PlaneGeometry(0.18, 0.042), new THREE.MeshBasicMaterial({ color: 0x141a2a }), car, 0.004, 1.39, -0.346, false).rotation.y = 0.25;
  // doors, window sills, B-pillars
  for (const s of [-1, 1]) {
    kit.box(0.08, 0.72, 1.9, trimM, car, s * 0.82, 0.62, 0.3);
    kit.box(0.14, 0.05, 1.9, kit.std(0x2e2f35, 0.5), car, s * 0.8, 0.99, 0.3);
    kit.box(0.08, 0.5, 0.12, trimM, car, s * 0.76, 1.24, 1.15);
    kit.box(0.04, 0.05, 0.3, kit.std(0x8a8c90, 0.3, 0.8), car, s * 0.77, 0.86, 0.1, false);
  }
  // hood outside, with a chrome strip
  const hoodM = kit.box(1.72, 0.08, 1.8, paint, car, 0, 0.86, -1.95);
  hoodM.rotation.x = 0.06;
  kit.box(0.04, 0.02, 1.7, kit.std(0xc0c4c8, 0.2, 1), car, 0, 0.91, -1.95, false).rotation.x = 0.06;
  kit.box(1.72, 0.3, 0.1, paint, car, 0, 0.72, -2.85);
  // windshield glass: a faint tint and a reflection streak of the dash
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.56, 0.86), new THREE.MeshBasicMaterial({ color: 0x8aa0c8, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  glass.position.set(0, 1.23, -0.67); glass.rotation.x = -0.94; car.add(glass);
  // seats
  kit.box(0.54, 0.7, 0.16, seatM, car, -0.38, 0.85, 0.58).rotation.x = -0.12;
  kit.box(0.3, 0.2, 0.12, seatM, car, -0.38, 1.36, 0.66);
  kit.box(0.56, 0.16, 0.6, seatM, car, -0.38, 0.4, 0.35);
  kit.box(0.56, 0.16, 0.6, seatM, car, 0.38, 0.4, 0.35);
  // steering wheel
  const wheel = new THREE.Group(); wheel.position.set(-0.38, 1.0, -0.5); wheel.rotation.x = -0.45; car.add(wheel);
  const rim = kit.mesh(new THREE.TorusGeometry(0.19, 0.02, 8, 32), kit.std(0x121214, 0.5), wheel);
  void rim;
  for (const a of [0, 2.3, -2.3]) { const sp = kit.box(0.17, 0.025, 0.02, trimM, wheel, Math.cos(a - Math.PI / 2) * 0.085, Math.sin(a - Math.PI / 2) * 0.085, 0, false); sp.rotation.z = a - Math.PI / 2; }
  kit.cyl(0.05, 0.05, 0.05, trimM, wheel, 0, 0, 0, 12, false).rotation.x = Math.PI / 2;
  kit.cyl(0.03, 0.03, 0.3, trimM, car, -0.38, 0.93, -0.58, 8, false).rotation.x = 1.1;

  /* ---------- Ashoke ---------- */
  const ash = figure(kit, { skin: 0x7a4e34, top: 0x4b3c33, bottom: 0x2a2a30, hair: 0x2e2c2e, hairStyle: 'short', seated: true, collar: 0xd8d2c4, shoulders: 1.05 });
  ash.root.position.set(-0.38, 0.02, 0.2); ash.root.rotation.y = Math.PI; car.add(ash.root);
  ash.torso.rotation.x = -0.14;
  ash.armL.rotation.set(-0.95, 0, -0.22); ash.foreL.rotation.x = -0.75;
  ash.armR.rotation.set(-0.95, 0, 0.22); ash.foreR.rotation.x = -0.75;
  const ashTop = ash.mats[1];

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight(0x3a4a7a, 0x0a0806, 0.6); scene.add(hemi);
  const moonL = new THREE.DirectionalLight(0x7f95d0, 0.35); moonL.position.set(40, 60, -80); scene.add(moonL);
  const dashL = new THREE.PointLight(0xff9a40, 0.035, 1.6, 2); dashL.position.set(-0.38, 0.9, -0.72); scene.add(dashL);
  
  const heads: THREE.SpotLight[] = [];
  for (const s of [-1, 1]) {
    const h = new THREE.SpotLight(0xfff0d6, 140, 90, 0.42, 0.55, 1.35);
    h.position.set(s * 0.62, 0.72, -2.9); h.target.position.set(s * 0.8 - 0.2, 0, -26);
    scene.add(h, h.target); heads.push(h);
  }
  heads[1].castShadow = false;

  /* ---------- ghost train for "the truth" ---------- */
  const ghost = new THREE.Group(); ghost.position.set(160, 2.5, -170); scene.add(ghost); ghost.visible = false;
  const winTex = kit.canvas(256, 64, (g, w, h) => {
    g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(255,190,110,.95)'; g.fillRect(10 + i * 30, 18, 18, 20); }
  });
  const ghostMats: THREE.Material[] = [];
  const carM = new THREE.MeshBasicMaterial({ map: winTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false });
  const bodyM = new THREE.MeshBasicMaterial({ color: 0x2a3050, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false });
  ghostMats.push(carM, bodyM);
  for (let i = 0; i < 9; i++) {
    kit.mesh(new THREE.PlaneGeometry(9.6, 3.2), bodyM, ghost, i * 10.2, 2.4, -0.02, false).renderOrder = 5;
    kit.mesh(new THREE.PlaneGeometry(9.6, 2.4), carM, ghost, i * 10.2, 2.6, 0, false).renderOrder = 6;
  }
  const ghostLamp = kit.glow(0xfff0c8, 14, 0, ghost, -5.5, 2.4, 0.2);
  let ghostAt = -1;

  /* ---------- state ---------- */
  const V = 24;
  const sway = { pos: new THREE.Vector3(), roll: 0, pitch: 0, yaw: 0 };
  let lookAt = -1, lookBack = -1;
  let tNow = 0;

  const update = (t: number, dt: number) => {
    tNow = t;
    const v = V;
    for (const m of movers) { m.o.position.z += v * dt; if (m.o.position.z > m.min + m.span) m.o.position.z -= m.span; }
    moveStreams(v * dt);
    // the nearest lamp lights the cabin as it passes overhead
    let best = 999, bz = 0, bx = 0;
    for (const l of lampHeads) { const dz = l.position.z + 1.5; if (Math.abs(dz) < Math.abs(best)) { best = dz; bz = l.position.z; bx = l.position.x; } }
    sodium.position.set(bx + 2.1, 7.4, bz);
    sodium.intensity = 70 * Math.exp(-(best * best) / 90);
    // oncoming cars
    oncT -= dt;
    if (oncT <= 0) { onc.position.z = -260; oncT = 6 + Math.random() * 6; }
    onc.position.z += 38 * dt;
    const oz = onc.position.z;
    const near = Math.max(0, 1 - Math.abs(oz + 30) / 200);
    [hlA, hlB].forEach((s) => ((s.material as THREE.SpriteMaterial).opacity = oz < 12 ? 0.9 : 0));
    (hlFlare.material as THREE.SpriteMaterial).opacity = oz < 12 ? 0.15 + near * 0.5 : 0;
    if (oz > -8 && oz < -7.3 && !reduced) sfx.noise(600, 0.6, 0.05, 0.9);
    tail.position.z = -120 + Math.sin(t * 0.07) * 30;

    // road feel
    if (!reduced) {
      sway.pos.set(Math.sin(t * 0.7) * 0.004, Math.sin(t * 11) * 0.0012 + Math.sin(t * 2.3) * 0.003 + (Math.sin(t * 0.9) > 0.97 ? Math.sin(t * 40) * 0.004 : 0), 0);
      sway.roll = Math.sin(t * 0.55) * 0.008;
      sway.yaw = Math.sin(t * 0.21) * 0.012;
      sway.pitch = Math.sin(t * 1.7) * 0.002;
    }
    world.rotation.y = Math.sin(t * 0.21) * 0.01;
    wheel.rotation.z = Math.sin(t * 0.21 + 0.4) * 0.12;
    ash.root.position.x = -0.38 + sway.pos.x * 0.5;

    // Ashoke: eyes on the road, a glance at his son during the quote
    let hy = Math.sin(t * 0.3) * 0.05;
    if (lookAt >= 0) {
      const u = t - lookAt;
      const k = u < 3.4 ? smooth((u - 2.6) / 0.8) : u < 7.5 ? 1 : 1 - smooth((u - 7.5) / 1.2);
      hy = lerp(hy, -0.75, k);
      if (u > 9) lookAt = -1;
    }
    if (lookBack >= 0) { const u = t - lookBack; hy = lerp(hy, -0.35, u < 1 ? smooth(u) : u < 5 ? 1 : 1 - smooth(u - 5)); if (u > 6) lookBack = -1; }
    ash.head.rotation.y = hy;
    ash.head.rotation.x = 0.04 + Math.sin(t * 1.4) * 0.01;

    // ghost train crossing the horizon
    if (ghostAt >= 0) {
      const u = (t - ghostAt) / (reduced ? 6 : 11);
      ghost.visible = u < 1;
      ghost.position.x = lerp(150, -190, u);
      const a = Math.min(smooth(u * 5), 1 - smooth((u - 0.75) * 4));
      carM.opacity = a * 0.95; bodyM.opacity = a * 0.35;
      (ghostLamp.material as THREE.SpriteMaterial).opacity = a;
      heads.forEach((h) => (h.intensity = 140 * (1 - a * 0.35)));
      if (u >= 1) ghostAt = -1;
    }
    radioM.opacity = 0.7 + Math.sin(t * 7) * 0.1;
  };

  return {
    eye: EYE, yaw: 0.4, pitch: -0.05, fov: 64,
    yawRange: [-0.95, 1.45], pitchRange: [-0.6, 0.35],
    exposure: 1.3, bob: 0.6,
    intro: { from: new THREE.Vector3(0.36, 1.26, 0.85), yaw: 1.2, pitch: -0.08, fov: 68, ms: 4200 },
    sway,
    spots: [
      { id: 'road', pos: new THREE.Vector3(0.4, 0.3, -9), hit: 1.2, look: new THREE.Vector3(0.1, 0.5, -14) },
      { id: 'ashoke', pos: new THREE.Vector3(-0.3, 1.38, 0.02), hit: [0.42, 0.7, 0.45], hitPos: new THREE.Vector3(-0.38, 1.05, 0.14), look: new THREE.Vector3(-0.38, 1.24, 0.1), glow: [ashTop],
        onFind: () => { lookAt = tNow; }, onShow: () => { if (lookAt < 0) lookBack = tNow; } },
      { id: 'truth', pos: new THREE.Vector3(-26, 9, -100), hit: 7, look: new THREE.Vector3(-4, 4, -160),
        onShow: () => { if (ghostAt < 0) { ghostAt = tNow; ctx.wait(1200).then(() => sfx.whistle()); } } },
    ],
    update,
  };
}

