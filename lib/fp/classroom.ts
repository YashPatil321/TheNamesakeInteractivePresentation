// 1985 · Gogol's desk in English class. Afternoon sun, rows of classmates, a teacher pacing at the board.
// Discovering the chalkboard (or the classmates) turns every head toward the camera.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Ctx, Room } from './types';
import { rng, lerp, clamp, figure, easeInOut, type Figure } from './kit';

export function buildClassroom(ctx: Ctx): Room {
  const { scene, kit, reduced } = ctx;
  const R = rng(1985);
  scene.background = new THREE.Color(0xcfd8e2);
  scene.fog = new THREE.Fog(0xd9d4c4, 14, 40);

  const EYE = new THREE.Vector3(0.8, 1.14, 2.66);
  const room = new THREE.Group(); scene.add(room);
  const W = 4.3, FRONT = -4.6, BACK = 4.0, H = 3.15;

  /* ---------- materials ---------- */
  const tiles = kit.canvas(256, 256, (g, w) => {
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = (i + j) % 2 ? '#d9d0bb' : '#b9bda8'; g.fillRect(i * s, j * s, s, s);
      for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(80,70,50,${R() * 0.12})`; g.fillRect(i * s + R() * s, j * s + R() * s, 2 + R() * 6, 1 + R() * 2); }
    }
    g.strokeStyle = 'rgba(60,50,40,.25)'; g.lineWidth = 2;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, w); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
  }, { repeat: [5, 5] });
  const floorM = kit.std(0xffffff, 0.55, 0, { map: tiles });
  const wallM = kit.std(0xe9e0c8, 0.95, 0, { map: kit.noise('#ece3cb', 0.04, 128, [4, 3], 3) });
  const lowWallM = kit.std(0x8fa596, 0.8);
  const woodM = kit.std(0xffffff, 0.6, 0, { map: kit.wood('#a8743f', '#5a3515', 256, [1, 1], 3, 4) });
  const metalM = kit.std(0x5a5f66, 0.45, 0.6);
  const ceilM = kit.std(0xf3efe4, 0.95);

  /* ---------- shell ---------- */
  kit.box(W * 2, 0.05, BACK - FRONT, floorM, room, 0, -0.025, (BACK + FRONT) / 2);
  kit.box(W * 2, 0.05, BACK - FRONT, ceilM, room, 0, H, (BACK + FRONT) / 2, false);
  kit.box(W * 2, H, 0.08, wallM, room, 0, H / 2, FRONT);
  kit.box(W * 2, H, 0.08, wallM, room, 0, H / 2, BACK);
  kit.box(0.08, H, BACK - FRONT, wallM, room, W, H / 2, (BACK + FRONT) / 2);
  for (const z of [FRONT + 0.05, BACK - 0.05]) kit.box(W * 2, 1.0, 0.02, lowWallM, room, 0, 0.5, z);
  kit.box(0.02, 1.0, BACK - FRONT, lowWallM, room, W - 0.05, 0.5, (BACK + FRONT) / 2);
  // left wall with three tall windows
  const wins = [-2.6, 0.0, 2.6];
  const wy0 = 1.0, wy1 = 2.65, ww = 1.7;
  kit.box(0.08, wy0, BACK - FRONT, wallM, room, -W, wy0 / 2, (BACK + FRONT) / 2);
  kit.box(0.08, H - wy1, BACK - FRONT, wallM, room, -W, (H + wy1) / 2, (BACK + FRONT) / 2);
  let zc = FRONT;
  for (const z of [...wins, BACK + ww / 2]) {
    const z0 = z - ww / 2;
    if (z0 > zc) kit.box(0.08, wy1 - wy0, z0 - zc, wallM, room, -W, (wy0 + wy1) / 2, (zc + z0) / 2);
    zc = z + ww / 2;
  }
  const frameM = kit.std(0xf4f1e8, 0.6);
  for (const z of wins) {
    kit.box(0.14, 0.06, ww, frameM, room, -W + 0.02, wy0, z);
    kit.box(0.14, 0.06, ww, frameM, room, -W + 0.02, wy1, z);
    kit.box(0.1, wy1 - wy0, 0.05, frameM, room, -W + 0.02, (wy0 + wy1) / 2, z);
    kit.box(0.1, 0.04, ww, frameM, room, -W + 0.02, 1.85, z);
    kit.box(0.3, 0.04, ww + 0.1, frameM, room, -W + 0.1, wy0 - 0.03, z);
  }
  // outside: bright sky and trees
  const skyTex = kit.canvas(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#9cc4ea'); gr.addColorStop(0.6, '#d7e6ef'); gr.addColorStop(1, '#f3e7c8');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const x = R() * w, y = h * (0.45 + R() * 0.4), r = 30 + R() * 60;
      const tg = g.createRadialGradient(x, y, 0, x, y, r);
      tg.addColorStop(0, 'rgba(92,128,74,.95)'); tg.addColorStop(0.7, 'rgba(110,146,84,.8)'); tg.addColorStop(1, 'rgba(110,146,84,0)');
      g.fillStyle = tg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#8fae78'; g.fillRect(0, h * 0.88, w, h * 0.12);
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), new THREE.MeshBasicMaterial({ map: skyTex, fog: false }));
  sky.position.set(-W - 6, 2.4, 0); sky.rotation.y = Math.PI / 2; room.add(sky);

  // fluorescent fixtures
  const tubeM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf4f8ff, emissiveIntensity: 1.6 });
  for (const x of [-2.2, 0, 2.2]) for (const z of [-2.6, 0, 2.4]) {
    kit.box(0.5, 0.06, 1.3, kit.std(0xdad8d0, 0.6), room, x, H - 0.04, z, false);
    kit.box(0.4, 0.02, 1.2, tubeM, room, x, H - 0.08, z, false);
  }

  /* ---------- chalkboard, clock, desks at the front ---------- */
  const chalk = 'rgba(245,244,236,';
  const boardTex = kit.canvas(1024, 300, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#243b30'); gr.addColorStop(1, '#1b2f26');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // old eraser swirls
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = `${chalk}${0.02 + R() * 0.04})`; g.lineWidth = 12 + R() * 30;
      g.beginPath(); const x = R() * w, y = R() * h; g.arc(x, y, 30 + R() * 90, R() * 6, R() * 6 + 2); g.stroke();
    }
    const f = kit.fonts;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const scrawl = (txt: string, x: number, y: number, size: number, font: string) => {
      g.font = `${size}px ${font}`;
      for (let k = 0; k < 4; k++) { g.fillStyle = `${chalk}${k === 0 ? 0.85 : 0.18})`; g.fillText(txt, x + (R() - 0.5) * 3, y + (R() - 0.5) * 3); }
    };
    scrawl('NIKOLAI GOGOL', w / 2, h * 0.36, 118, f.display);
    scrawl('·  1809 – 1852  ·', w / 2, h * 0.73, 62, f.display);
    g.strokeStyle = `${chalk}0.6)`; g.lineWidth = 4; g.beginPath(); g.moveTo(w * 0.2, h * 0.55); g.quadraticCurveTo(w * 0.5, h * 0.6, w * 0.8, h * 0.54); g.stroke();
    // chalk grain
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(0,0,0,${R() * 0.5})`; g.fillRect(R() * w, R() * h, 2, 1); }
    g.globalCompositeOperation = 'destination-over';
    g.fillStyle = '#1f3429'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
  }, { text: true });
  const boardMat = kit.std(0xffffff, 0.9, 0, { map: boardTex, emissive: 0xffffff, emissiveMap: boardTex, emissiveIntensity: 0.08 });
  const board = kit.box(4.8, 1.4, 0.04, [kit.std(0x1f3429, 0.9), kit.std(0x1f3429, 0.9), kit.std(0x1f3429, 0.9), kit.std(0x1f3429, 0.9), boardMat, kit.std(0x1f3429, 0.9)], room, 0, 1.7, FRONT + 0.06, false);
  void board;
  const alu = kit.std(0xb8bcc2, 0.35, 0.8);
  kit.box(4.95, 0.06, 0.06, alu, room, 0, 2.43, FRONT + 0.08);
  kit.box(4.95, 0.05, 0.14, alu, room, 0, 0.98, FRONT + 0.12);
  kit.box(0.06, 1.5, 0.06, alu, room, -2.45, 1.7, FRONT + 0.08);
  kit.box(0.06, 1.5, 0.06, alu, room, 2.45, 1.7, FRONT + 0.08);
  kit.box(0.14, 0.04, 0.05, kit.std(0x3b3a44, 0.9), room, 1.2, 1.03, FRONT + 0.14);
  kit.box(0.07, 0.015, 0.015, kit.std(0xf4f2ea, 0.9), room, 0.8, 1.02, FRONT + 0.14, false);
  // clock above the board
  const clockTex = kit.canvas(128, 128, (g, w) => {
    g.fillStyle = '#f7f3ea'; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#222';
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(w / 2 + Math.cos(a) * 50 - 2, w / 2 + Math.sin(a) * 50 - 2, 4, 4); }
  });
  const clock = new THREE.Group(); clock.position.set(0, 2.78, FRONT + 0.08); room.add(clock);
  kit.cyl(0.2, 0.2, 0.05, kit.std(0x2b2b30, 0.5, 0.4), clock, 0, 0, 0, 24, false).rotation.x = Math.PI / 2;
  const face = kit.mesh(new THREE.CircleGeometry(0.18, 24), kit.std(0xffffff, 0.8, 0, { map: clockTex }), clock, 0, 0, 0.03, false);
  void face;
  const handM = kit.std(0x1b1b1f, 0.6);
  const mkHand = (len: number, w: number) => { const g = new THREE.Group(); clock.add(g); g.position.z = 0.035; const m = kit.box(w, len, 0.004, handM, g, 0, len / 2, 0, false); void m; return g; };
  const hH = mkHand(0.09, 0.014), mH = mkHand(0.14, 0.01), sH = mkHand(0.15, 0.004);
  hH.rotation.z = -(2 + 10 / 60) / 12 * Math.PI * 2; mH.rotation.z = -10 / 60 * Math.PI * 2;
  // bulletin board on the right wall
  const pinTex = kit.canvas(256, 160, (g, w, h) => {
    g.fillStyle = '#b48a5a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(60,30,10,${R() * 0.25})`; g.fillRect(R() * w, R() * h, 2, 2); }
    const cols = ['#f2e6c4', '#f5c96a', '#9fc6e0', '#e9a0a0', '#fdfdf6', '#b9dca8'];
    for (let i = 0; i < 9; i++) {
      const x = 12 + (i % 3) * 82 + R() * 10, y = 10 + Math.floor(i / 3) * 50 + R() * 6;
      g.save(); g.translate(x + 30, y + 20); g.rotate((R() - 0.5) * 0.15); g.fillStyle = cols[i % cols.length]; g.fillRect(-32, -20, 64, 42);
      g.fillStyle = 'rgba(40,40,60,.35)'; for (let l = 0; l < 4; l++) g.fillRect(-24, -12 + l * 8, 30 + R() * 18, 2);
      g.fillStyle = '#c0392b'; g.beginPath(); g.arc(0, -17, 3, 0, 7); g.fill(); g.restore();
    }
  });
  const pin = kit.box(0.04, 1.1, 1.8, kit.std(0xffffff, 0.9, 0, { map: pinTex }), room, W - 0.05, 1.65, -1.2, false);
  pin.material = [kit.std(0x6b4a2a, 0.8), kit.std(0xffffff, 0.9, 0, { map: pinTex }), kit.std(0x6b4a2a, 0.8), kit.std(0x6b4a2a, 0.8), kit.std(0x6b4a2a, 0.8), kit.std(0x6b4a2a, 0.8)];
  // door, front right
  kit.box(0.06, 2.2, 1.0, kit.std(0xffffff, 0.6, 0, { map: kit.wood('#9a6a3a', '#4d2c10', 256, [1, 1], 2, 8) }), room, W - 0.04, 1.1, -3.4);
  kit.box(0.02, 0.5, 0.3, kit.std(0xbfd6e6, 0.2, 0.1, { emissive: 0x9fb6c8, emissiveIntensity: 0.25 }), room, W - 0.08, 1.6, -3.4, false);
  kit.box(0.08, 0.05, 0.12, alu, room, W - 0.1, 1.05, -3.05, false);

  // teacher's desk
  const tdesk = new THREE.Group(); tdesk.position.set(1.7, 0, -3.25); room.add(tdesk);
  kit.box(1.5, 0.06, 0.75, woodM, tdesk, 0, 0.76, 0);
  kit.box(1.44, 0.7, 0.04, kit.std(0x7a5230, 0.7), tdesk, 0, 0.38, 0.33);
  kit.box(0.04, 0.7, 0.7, kit.std(0x7a5230, 0.7), tdesk, -0.72, 0.38, 0);
  kit.box(0.04, 0.7, 0.7, kit.std(0x7a5230, 0.7), tdesk, 0.72, 0.38, 0);
  const cols = [0x8b2c2c, 0x2c4a8b, 0x2f6b43, 0xc9a13a];
  for (let i = 0; i < 4; i++) kit.box(0.28, 0.05, 0.2, kit.std(cols[i], 0.7), tdesk, -0.4, 0.815 + i * 0.05, 0.05).rotation.y = (R() - 0.5) * 0.4;
  const apple = kit.mesh(new THREE.SphereGeometry(0.045, 10, 8), kit.std(0xb3261e, 0.4), tdesk, 0.4, 0.83, 0.1);
  void apple;
  const globe = new THREE.Group(); globe.position.set(0.1, 0.79, -0.1); tdesk.add(globe);
  kit.cyl(0.06, 0.08, 0.03, kit.std(0x2a2a2a, 0.5, 0.5), globe, 0, 0.015, 0, 12);
  kit.cyl(0.008, 0.008, 0.12, kit.std(0x2a2a2a, 0.5, 0.5), globe, 0, 0.08, 0, 6);
  const globeTex = kit.canvas(128, 64, (g, w, h) => {
    g.fillStyle = '#4f86b8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8c48a';
    for (let i = 0; i < 16; i++) { g.beginPath(); g.ellipse(R() * w, h * 0.2 + R() * h * 0.6, 6 + R() * 14, 4 + R() * 10, R() * 3, 0, 7); g.fill(); }
  });
  const sphere = kit.mesh(new THREE.SphereGeometry(0.1, 16, 12), kit.std(0xffffff, 0.5, 0, { map: globeTex }), globe, 0, 0.23, 0);
  sphere.rotation.z = 0.4;

  /* ---------- student desks (instanced) ---------- */
  const COLS = [-2.75, -0.98, 0.8, 2.57];
  const ROWS = [-2.05, -0.5, 1.05, 2.66];
  const seats: { x: number; z: number; me: boolean }[] = [];
  for (const z of ROWS) for (const x of COLS) seats.push({ x, z, me: x === 0.8 && z === 2.66 });
  const legG = (x: number, z: number, h: number) => new THREE.BoxGeometry(0.03, h, 0.03).translate(x, h / 2, z);
  const deskTopG = new THREE.BoxGeometry(0.66, 0.03, 0.46).translate(0, 0.74, -0.5);
  const seatG = mergeGeometries([new THREE.BoxGeometry(0.42, 0.03, 0.4).translate(0, 0.44, 0.02), new THREE.BoxGeometry(0.42, 0.26, 0.025).translate(0, 0.72, 0.24).rotateX(0)])!;
  const frameG = mergeGeometries([
    legG(-0.3, -0.7, 0.74), legG(0.3, -0.7, 0.74), legG(-0.3, -0.3, 0.74), legG(0.3, -0.3, 0.74),
    legG(-0.18, -0.15, 0.44), legG(0.18, -0.15, 0.44), legG(-0.18, 0.2, 0.44), legG(0.18, 0.2, 0.44),
    new THREE.BoxGeometry(0.025, 0.36, 0.025).translate(-0.19, 0.62, 0.23), new THREE.BoxGeometry(0.025, 0.36, 0.025).translate(0.19, 0.62, 0.23),
    new THREE.BoxGeometry(0.62, 0.02, 0.02).translate(0, 0.35, -0.5),
  ])!;
  const inst = (g: THREE.BufferGeometry, m: THREE.Material) => {
    const im = new THREE.InstancedMesh(g, m, seats.length); im.castShadow = true; im.receiveShadow = true;
    const M = new THREE.Matrix4();
    seats.forEach((s, i) => { M.makeTranslation(s.x, 0, s.z); im.setMatrixAt(i, M); });
    room.add(im); return im;
  };
  inst(deskTopG, woodM); inst(seatG, kit.std(0x8a5a32, 0.6)); inst(frameG, metalM);

  /* ---------- classmates ---------- */
  const skins = [0xf1c9a5, 0xe0ac86, 0xc68a62, 0x8d5a3b, 0x5e3a28, 0xf5d3b8, 0xd29a74];
  const tops = [0x1f8a8a, 0xc23d7a, 0xd9a431, 0x3b5fa8, 0x8a2e3b, 0x2f6b43, 0xe86a3a, 0x6a4c9c, 0x4d8fc4, 0xa0a4ad, 0xf0e6d2, 0x2b2f3a];
  const hairs = [0x2b1a10, 0x5a3a1e, 0xc9a25a, 0x14100d, 0x8a4a22, 0x3a2616, 0xe0c080];
  const styles: ('short' | 'long' | 'bob' | 'curly')[] = ['short', 'long', 'bob', 'short', 'curly', 'long', 'short', 'bob'];
  type Kid = { f: Figure; x: number; z: number; delay: number; ty: number; hy: number; hp: number; idle: number; writer: boolean };
  const kids: Kid[] = [];
  seats.forEach((s, i) => {
    if (s.me || (s.x === 0.8 && s.z === 1.05)) return;
    const f = figure(kit, {
      skin: skins[Math.floor(R() * skins.length)], top: tops[i % tops.length], bottom: 0x2d3e5e,
      hair: hairs[Math.floor(R() * hairs.length)], hairStyle: styles[Math.floor(R() * styles.length)],
      seated: true, legs: false, shoulders: 0.9 + R() * 0.2, scale: 0.94 + R() * 0.08,
    });
    f.root.position.set(s.x + (R() - 0.5) * 0.06, 0, s.z + 0.02);
    f.root.rotation.y = Math.PI;
    f.armL.rotation.x = -0.75; f.foreL.rotation.x = -0.9; f.armL.rotation.z = -0.25;
    f.armR.rotation.x = -0.75; f.foreR.rotation.x = -0.9; f.armR.rotation.z = 0.25;
    f.torso.rotation.x = 0.1;
    room.add(f.root);
    // target: face the camera, split between a torso twist and a head turn
    const hx = f.root.position.x, hz = f.root.position.z;
    const dx = EYE.x - hx, dz = EYE.z - hz;
    let th = Math.atan2(-dx, -dz);
    if (Math.abs(dx) < 0.3 && dz > 0) th = (i % 2 ? 1 : -1) * (Math.PI - 0.1);
    const ty = clamp(th * 0.42, -0.95, 0.95);
    const hy = clamp(th - ty, -1.5, 1.5);
    const dist = Math.hypot(dx, dz);
    const hp = -Math.atan2(EYE.y - 1.28, dist) * 0.6;
    kids.push({ f, x: hx, z: hz, delay: 0.15 + (EYE.z - hz) * 0.1 + R() * 0.45, ty, hy, hp, idle: R() * 10, writer: R() < 0.35 });
  });
  // a backpack on the empty desk
  const pack = kit.box(0.34, 0.4, 0.2, kit.std(0x2e5b8c, 0.8), room, 0.8, 0.64, 1.05);
  pack.rotation.y = 0.3;

  /* ---------- the teacher ---------- */
  const teacher = figure(kit, { skin: 0xe8b894, top: 0x6b4a2e, bottom: 0x4a4b52, hair: 0x5a4632, hairStyle: 'short', collar: 0xe8e4da, glasses: true, shoulders: 1.08 });
  teacher.root.position.set(-0.6, 0, -3.7); room.add(teacher.root);
  const tieM = kit.std(0x7a1f2a, 0.6);
  kit.box(0.05, 0.3, 0.02, tieM, teacher.torso, 0, 0.4, 0.13, false);
  const teacherTop = teacher.mats[1];

  /* ---------- Gogol's own desk: the story handout ---------- */
  const handTex = kit.canvas(256, 330, (g, w, h) => {
    g.fillStyle = '#f7f3e8'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(30,30,40,.8)'; g.fillRect(40, 30, 176, 12);
    g.fillStyle = 'rgba(30,30,40,.45)'; g.fillRect(84, 52, 88, 6);
    g.fillStyle = 'rgba(30,30,40,.5)';
    for (let y = 80; y < h - 24; y += 10) { let x = 26; while (x < w - 26) { const ww = 6 + R() * 26; if (x + ww > w - 26) break; g.fillRect(x, y, ww, 3); x += ww + 4; } }
    g.fillStyle = 'rgba(30,30,40,.4)'; g.fillRect(w / 2 - 6, h - 16, 12, 4);
  });
  const handMat = kit.std(0xffffff, 0.9, 0, { map: handTex, emissive: 0x000000, emissiveIntensity: 0 });
  const story = new THREE.Group(); story.position.set(0.82, 0.758, 2.2); room.add(story);
  for (let i = 0; i < 3; i++) {
    const p = kit.mesh(new THREE.PlaneGeometry(0.215, 0.28), i === 2 ? handMat : kit.std(0xf2eee2, 0.9), story, (i - 1) * 0.012, i * 0.002, (1 - i) * 0.008, false);
    p.rotation.x = -Math.PI / 2; p.rotation.z = (i - 1) * 0.05 + 0.08;
  }
  const topSheet = story.children[2] as THREE.Mesh;
  const pencil = kit.cyl(0.004, 0.004, 0.18, kit.std(0xe8b923, 0.6), room, 1.02, 0.762, 2.12, 6);
  pencil.rotation.set(Math.PI / 2, 0, 0.7);
  const notebook = kit.box(0.2, 0.012, 0.26, kit.std(0x2f5f8f, 0.8), room, 0.55, 0.762, 2.3);
  notebook.rotation.y = -0.25;

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight(0xe8eef8, 0x8a7a62, 1.25); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2b4, 3.4);
  sun.position.set(-9, 7.5, 1.5); sun.target.position.set(0, 0, 0.5); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536);
  const sc = sun.shadow.camera; sc.left = -7; sc.right = 7; sc.top = 6; sc.bottom = -6; sc.near = 1; sc.far = 25;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  const fl = new THREE.PointLight(0xf4f6ff, 7, 0, 1.4); fl.position.set(0.5, 2.9, -0.5); scene.add(fl);
  const fl2 = new THREE.PointLight(0xfff1dc, 5, 0, 1.4); fl2.position.set(0, 2.8, -3.2); scene.add(fl2);

  // sun shafts and dust
  const shaftTex = kit.canvas(64, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,236,200,.0)'); gr.addColorStop(0.2, 'rgba(255,236,200,.5)'); gr.addColorStop(1, 'rgba(255,236,200,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const sg = g.createLinearGradient(0, 0, w, 0); sg.addColorStop(0, 'rgba(0,0,0,1)'); sg.addColorStop(0.2, 'rgba(0,0,0,0)'); sg.addColorStop(0.8, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = sg; g.fillRect(0, 0, w, h);
  });
  const shaftMat = new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const sdir = new THREE.Vector3(9, -7.5, -1).normalize();
  for (const z of wins) for (const dz of [-0.45, 0.45]) {
    // a parallelogram from the window opening down along the sun direction
    const L = 3.0;
    const p0 = new THREE.Vector3(-W + 0.05, wy1, z + dz), p1 = new THREE.Vector3(-W + 0.05, wy0, z + dz);
    const p2 = p1.clone().addScaledVector(sdir, L), p3 = p0.clone().addScaledVector(sdir, L);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...p0.toArray(), ...p1.toArray(), ...p2.toArray(), ...p3.toArray()], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0.95, 1, 0.95, 1, 0, 0, 0], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    room.add(new THREE.Mesh(g, shaftMat));
  }
  const dustN = 240;
  const dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) { dustPos[i * 3] = -W + 0.3 + R() * 4; dustPos[i * 3 + 1] = 0.3 + R() * 2.6; dustPos[i * 3 + 2] = -4 + R() * 7.5; }
  const dustG = new THREE.BufferGeometry(); dustG.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustG, new THREE.PointsMaterial({ size: 0.018, map: kit.dotTexture(), color: 0xfff0d0, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  room.add(dust);

  /* ---------- state + animation ---------- */
  let turnAt = -1, storyAt = -1, teacherAt = -1;
  let now = 0;
  const turn = () => { if (turnAt < 0) { turnAt = now; ctx.sfx.noise(900, 0.8, 0.05, 0.5); } };

  const update = (t: number, dt: number) => {
    now = t;
    sH.rotation.z = -t / 60 * Math.PI * 2;
    // teacher paces and gestures at the board, then stops and looks at Gogol once heads turn
    const tt = teacherAt >= 0 ? t - teacherAt : -1;
    const staring = turnAt >= 0 && t - turnAt > 0.5;
    const pace = Math.sin(t * 0.32);
    const tx = -0.6 + pace * 1.1;
    teacher.root.position.x = lerp(teacher.root.position.x, staring ? -0.3 : tx, staring ? 0.03 : 1);
    const walking = !staring && Math.abs(Math.cos(t * 0.32)) > 0.25;
    const face = staring ? 0 : (walking ? Math.sign(Math.cos(t * 0.32)) * 1.2 : 0.2);
    teacher.root.rotation.y = lerp(teacher.root.rotation.y, face, 1 - Math.exp(-3 * dt));
    const step = walking && !reduced ? Math.sin(t * 5) : 0;
    teacher.root.position.y = Math.abs(step) * 0.015;
    const gest = (Math.sin(t * 0.9) > 0.3 || (tt >= 0 && tt < 3)) && !staring;
    teacher.armR.rotation.x = lerp(teacher.armR.rotation.x, gest ? -1.3 : -0.1, 1 - Math.exp(-4 * dt));
    teacher.foreR.rotation.x = lerp(teacher.foreR.rotation.x, gest ? -0.5 : -0.2, 1 - Math.exp(-4 * dt));
    teacher.armL.rotation.x = -0.35 + step * 0.1; teacher.foreL.rotation.x = -0.7;
    if (staring) {
      const d = new THREE.Vector3(EYE.x - teacher.root.position.x, 0, EYE.z - teacher.root.position.z);
      teacher.head.rotation.y = lerp(teacher.head.rotation.y, Math.atan2(d.x, d.z) - teacher.root.rotation.y, 0.05);
      teacher.head.rotation.x = lerp(teacher.head.rotation.x, 0.05, 0.05);
    } else {
      teacher.head.rotation.y = lerp(teacher.head.rotation.y, gest ? -0.6 : 0.3 * Math.sin(t * 0.7), 0.05);
    }

    // classmates
    for (const k of kids) {
      const f = k.f;
      const idleY = Math.sin(t * 0.5 + k.idle) * 0.12 + Math.sin(t * 1.3 + k.idle * 2) * 0.03;
      const idleX = 0.12 + Math.sin(t * 0.8 + k.idle) * 0.05 + (k.writer ? 0.25 : 0);
      let a = 0;
      if (turnAt >= 0) {
        const u = (t - turnAt - k.delay) / (reduced ? 0.35 : 0.95);
        a = u <= 0 ? 0 : u >= 1 ? 1 : easeInOut(u);
      }
      f.torso.rotation.y = lerp(0, k.ty, a);
      f.head.rotation.y = lerp(idleY, k.hy, a);
      f.head.rotation.x = lerp(idleX, k.hp, a);
      f.neck.rotation.x = lerp(0, -0.05, a);
      if (k.writer && a < 0.5) f.foreR.rotation.z = Math.sin(t * 9 + k.idle) * 0.06;
    }

    // the story handout gets pushed away and flipped face down
    if (storyAt >= 0) {
      const u = easeInOut((t - storyAt) / (reduced ? 0.3 : 1.2));
      topSheet.position.set(0.012 + u * 0.12, 0.004 + Math.sin(u * Math.PI) * 0.12, -0.008 - u * 0.1);
      topSheet.rotation.x = -Math.PI / 2 + u * Math.PI;
      topSheet.rotation.z = 0.13 + u * 0.4;
    }
    shaftMat.opacity = 0.2 + Math.sin(t * 0.4) * 0.03;
    const p = dustG.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < dustN; i++) {
      let y = p.getY(i) + Math.sin(t * 0.7 + i) * 0.0008 - dt * 0.01;
      if (y < 0.2) y = 2.9;
      p.setY(i, y); p.setX(i, p.getX(i) + Math.cos(t * 0.3 + i * 1.3) * 0.0006);
    }
    p.needsUpdate = true;
  };

  return {
    eye: EYE, yaw: 0.1, pitch: 0.0, fov: 60,
    yawRange: [-1.15, 1.25], pitchRange: [-0.85, 0.42],
    exposure: 0.95,
    intro: { from: new THREE.Vector3(1.05, 1.72, 3.55), yaw: 0.35, pitch: -0.12, fov: 70, ms: 3600 },
    spots: [
      { id: 'board', pos: new THREE.Vector3(0, 2.52, FRONT + 0.2), hit: [4.8, 1.4, 0.3], hitPos: new THREE.Vector3(0, 1.7, FRONT + 0.1), look: new THREE.Vector3(0, 1.75, FRONT),
        glow: [boardMat], onFind: () => { ctx.wait(reduced ? 200 : 1300).then(turn); } },
      { id: 'class', pos: new THREE.Vector3(-0.98, 1.62, -0.5), hit: [2.6, 1.1, 3.2], hitPos: new THREE.Vector3(-0.1, 1.05, 0.2), look: new THREE.Vector3(0.2, 1.1, 0.2),
        onFind: () => turn() },
      { id: 'story', pos: new THREE.Vector3(0.82, 0.86, 2.2), hit: 0.2, look: new THREE.Vector3(0.82, 0.76, 2.2), glow: [handMat],
        onFind: () => { storyAt = now; ctx.sfx.noise(3200, 0.8, 0.04, 0.25); } },
      { id: 'teacher', pos: new THREE.Vector3(-0.6, 2.05, -3.7), hit: [1.0, 1.9, 0.8], hitPos: new THREE.Vector3(-0.6, 1.0, -3.7), look: new THREE.Vector3(-0.3, 1.5, -3.7), glow: [teacherTop],
        onFind: () => { teacherAt = now; } },
    ],
    update(t, dt) {
      // keep the teacher's marker and hit volume with the teacher
      const sp = this.spots[3];
      sp.pos.x = teacher.root.position.x; sp.hitPos!.x = teacher.root.position.x;
      update(t, dt);
    },
  };
}
