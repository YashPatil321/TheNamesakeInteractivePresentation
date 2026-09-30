// 1961 · Inside the night train. A second-class compartment at night: facing benches, luggage rack,
// a flickering bulb, a caged fan, and a barred window with the dark countryside streaming past.
import * as THREE from 'three';
import type { Ctx, Room } from './types';
import { rng, lerp, figure } from './kit';

export function buildCompartment(ctx: Ctx): Room {
  const { scene, kit, sfx, reduced } = ctx;
  const R = rng(1961);
  scene.background = new THREE.Color(0x020308);
  scene.fog = new THREE.Fog(0x03050b, 18, 90);

  const room = new THREE.Group(); scene.add(room);

  /* ---------- materials ---------- */
  const wallTex = kit.noise('#a3ae94', 0.05, 128, [3, 3], 11);
  const wall = kit.std(0xffffff, 0.92, 0, { map: wallTex });
  const wallLow = kit.std(0x4a5d4a, 0.8);
  const trim = kit.std(0x5a371d, 0.6, 0, { map: kit.wood('#6e4523', '#2a160a', 256, [2, 1], 3, 5) });
  const floorM = kit.std(0xffffff, 0.9, 0, { map: kit.wood('#3b2a20', '#140b06', 256, [2, 3], 6, 9) });
  const ceil = kit.std(0xd8cfb4, 0.95);
  const seat = kit.std(0x2d4a3b, 0.55, 0, { map: kit.noise('#2f4d3d', 0.06, 128, [4, 2], 21) });
  const iron = kit.std(0x2e2f33, 0.45, 0.7);
  const brass = kit.std(0x8a6a34, 0.35, 0.8);

  /* ---------- shell: floor, ceiling, end partitions, corridor wall ---------- */
  kit.box(2.2, 0.06, 2.7, floorM, room, 0, -0.03, 0);
  kit.box(2.2, 0.06, 2.7, ceil, room, 0, 2.46, 0, false);
  for (const z of [-1.32, 1.32]) {
    kit.box(2.2, 2.46, 0.06, wall, room, 0, 1.23, z);
    kit.box(2.2, 0.7, 0.02, wallLow, room, 0, 0.35, z - Math.sign(z) * 0.035);
  }
  // corridor side (x = +1.07) with a louvred sliding door between the benches
  kit.box(0.06, 2.46, 0.85, wall, room, 1.07, 1.23, -0.9);
  kit.box(0.06, 2.46, 0.85, wall, room, 1.07, 1.23, 0.9);
  kit.box(0.06, 0.36, 0.95, wall, room, 1.07, 2.28, 0);
  const door = new THREE.Group(); door.position.set(1.05, 0, 0.05); room.add(door);
  kit.box(0.04, 2.1, 0.92, trim, door, 0, 1.05, 0);
  for (let i = 0; i < 9; i++) kit.box(0.05, 0.025, 0.7, kit.std(0x3b2413, 0.7), door, -0.02, 1.35 + i * 0.07, 0, false).rotation.z = 0.5;
  kit.box(0.05, 0.12, 0.03, brass, door, -0.04, 1.0, -0.38, false);

  // window side (x = -1.07) with an opening z ∈ [-0.5, 0.5], y ∈ [0.86, 1.66]
  const wx = -1.07;
  kit.box(0.06, 0.86, 2.7, wall, room, wx, 0.43, 0);
  kit.box(0.06, 0.8, 2.7, wall, room, wx, 2.06, 0);
  kit.box(0.06, 0.8, 0.82, wall, room, wx, 1.26, -0.91);
  kit.box(0.06, 0.8, 0.82, wall, room, wx, 1.26, 0.91);
  kit.box(0.04, 0.7, 2.66, wallLow, room, wx + 0.04, 0.35, 0);
  // window frame + bars + raised shutter
  kit.box(0.12, 0.06, 1.1, trim, room, wx + 0.02, 0.84, 0);
  kit.box(0.12, 0.06, 1.1, trim, room, wx + 0.02, 1.68, 0);
  kit.box(0.12, 0.84, 0.06, trim, room, wx + 0.02, 1.26, -0.52);
  kit.box(0.12, 0.84, 0.06, trim, room, wx + 0.02, 1.26, 0.52);
  const barG = new THREE.CylinderGeometry(0.011, 0.011, 1.0, 8); barG.rotateX(Math.PI / 2);
  for (let i = 0; i < 4; i++) kit.mesh(barG, iron, room, wx + 0.02, 0.98 + i * 0.13, 0);
  for (let i = 0; i < 5; i++) kit.box(0.03, 0.05, 1.0, trim, room, wx + 0.05, 1.6 - i * 0.012 + 0.03, 0, false).rotation.z = -0.35;
  // little table under the window
  kit.box(0.34, 0.035, 0.56, trim, room, wx + 0.2, 0.72, 0);
  kit.box(0.03, 0.2, 0.03, iron, room, wx + 0.1, 0.62, 0.2).rotation.z = 0.8;
  kit.box(0.03, 0.2, 0.03, iron, room, wx + 0.1, 0.62, -0.2).rotation.z = 0.8;

  /* ---------- benches ---------- */
  const bench = (z: number, dir: number) => {
    // dir points from the middle of the compartment toward this bench's end wall
    kit.box(2.1, 0.32, 0.52, kit.std(0x3a2a1c, 0.8), room, 0, 0.16, z);
    kit.box(2.1, 0.13, 0.58, seat, room, 0, 0.39, z - dir * 0.02);
    kit.box(2.1, 0.62, 0.12, seat, room, 0, 0.8, z + dir * 0.3);
    kit.box(2.14, 0.05, 0.14, trim, room, 0, 1.13, z + dir * 0.33);
    // luggage rack: two iron rails and brackets
    const ry = 1.86;
    for (const dz of [0.04, 0.3]) kit.mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.1, 8).rotateZ(Math.PI / 2), iron, room, 0, ry, z + dir * (0.44 - dz));
    for (const x of [-0.8, 0, 0.8]) kit.box(0.03, 0.03, 0.34, iron, room, x, ry - 0.02, z + dir * 0.28);
    return ry;
  };
  const ry = bench(-0.86, -1);
  bench(0.86, 1);

  // luggage on the far rack: a steel trunk, a striped bedroll, a cloth bag
  const trunk = new THREE.Group(); trunk.position.set(-0.45, ry + 0.14, -1.05); room.add(trunk);
  kit.box(0.62, 0.24, 0.3, kit.std(0x31503f, 0.5, 0.4), trunk);
  kit.box(0.64, 0.03, 0.32, brass, trunk, 0, 0.1, 0);
  kit.box(0.08, 0.06, 0.02, brass, trunk, 0, 0.03, 0.16);
  const rollTex = kit.canvas(128, 64, (g, w, h) => {
    g.fillStyle = '#b9a47a'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { g.fillStyle = '#7a2e22'; g.fillRect(x, 0, 5, h); g.fillStyle = '#2d3f66'; g.fillRect(x + 8, 0, 2, h); }
  }, { repeat: [3, 1] });
  const roll = kit.cyl(0.13, 0.13, 0.7, kit.std(0xffffff, 0.95, 0, { map: rollTex }), room, 0.35, ry + 0.14, -1.07, 14);
  roll.rotation.z = Math.PI / 2;
  kit.box(0.02, 0.28, 0.28, kit.std(0x4a3524, 0.8), room, 0.18, ry + 0.14, -1.07);
  kit.box(0.02, 0.28, 0.28, kit.std(0x4a3524, 0.8), room, 0.52, ry + 0.14, -1.07);
  const bag = kit.mesh(new THREE.SphereGeometry(0.16, 10, 8), kit.std(0x8a5a3a, 0.95), room, 0.82, ry + 0.12, -1.02);
  bag.scale.set(1.1, 0.75, 0.8);

  // a hanging water flask on a hook by the window
  const flask = new THREE.Group(); flask.position.set(wx + 0.07, 1.78, -0.72); room.add(flask);
  kit.cyl(0.006, 0.006, 0.34, kit.std(0x3a2a1c, 0.9), flask, 0, -0.17, 0, 5, false);
  const fb = kit.mesh(new THREE.SphereGeometry(0.075, 12, 10), kit.std(0x7c8a8f, 0.3, 0.8), flask, 0, -0.39, 0.0);
  fb.scale.set(1, 1.15, 0.7);

  /* ---------- ceiling: caged fan + bulb ---------- */
  const fan = new THREE.Group(); fan.position.set(0.45, 2.22, 0.1); room.add(fan);
  kit.cyl(0.05, 0.05, 0.12, iron, fan, 0, 0.14, 0, 10);
  const cage = kit.std(0x3b3c40, 0.5, 0.6);
  for (let i = 0; i < 3; i++) { const r = kit.mesh(new THREE.TorusGeometry(0.2 - i * 0.06, 0.004, 4, 28), cage, fan, 0, -0.04 + i * 0.01, 0, false); r.rotation.x = Math.PI / 2; }
  const blades = new THREE.Group(); fan.add(blades);
  for (let i = 0; i < 3; i++) { const b = kit.box(0.17, 0.004, 0.05, kit.std(0x55575c, 0.5, 0.5), blades, 0, 0, 0, false); b.position.set(Math.cos(i * 2.094) * 0.09, 0, Math.sin(i * 2.094) * 0.09); b.rotation.y = -i * 2.094; b.rotation.x = 0.3; }
  kit.cyl(0.04, 0.04, 0.05, iron, fan, 0, 0.01, 0, 10);

  const bulbPos = new THREE.Vector3(-0.3, 2.28, -0.15);
  kit.cyl(0.07, 0.03, 0.06, brass, room, bulbPos.x, bulbPos.y + 0.12, bulbPos.z, 10);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffc070, emissiveIntensity: 2.2 });
  kit.mesh(new THREE.SphereGeometry(0.045, 12, 10), bulbMat, room, bulbPos.x, bulbPos.y, bulbPos.z, false);
  const shade = kit.mesh(new THREE.SphereGeometry(0.12, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), kit.std(0xe8dcc0, 0.6, 0, { side: THREE.DoubleSide, emissive: 0x806030, emissiveIntensity: 0.3 }), room, bulbPos.x, bulbPos.y + 0.02, bulbPos.z, false);
  shade.scale.y = 0.6;
  const halo = kit.glow(0xffb45a, 0.9, 0.55, room, bulbPos.x, bulbPos.y - 0.02, bulbPos.z);

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight(0x3a4a6a, 0x1a120c, 0.35); scene.add(hemi);
  const key = new THREE.SpotLight(0xffb866, 26, 0, 1.25, 0.9, 2);
  key.position.copy(bulbPos).add(new THREE.Vector3(0, -0.05, 0));
  key.target.position.set(-0.1, 0, 0); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0008; key.shadow.normalBias = 0.02;
  key.shadow.camera.near = 0.1; key.shadow.camera.far = 5;
  const fill = new THREE.PointLight(0xffa860, 3.2, 0, 2); fill.position.copy(bulbPos).add(new THREE.Vector3(0, -0.2, 0)); scene.add(fill);
  const moon = new THREE.DirectionalLight(0x6f8cc8, 0.5); moon.position.set(-10, 6, -3); scene.add(moon);
  // a lamp outside that sweeps past the window now and then
  const passLight = new THREE.PointLight(0xffc27a, 0, 0, 2); scene.add(passLight);

  /* ---------- the book and the page on the table ---------- */
  const book = new THREE.Group(); book.position.set(wx + 0.2, 0.745, -0.06); book.rotation.y = 0.35; room.add(book);
  const pageTex = kit.canvas(256, 256, (g, w, h) => {
    g.fillStyle = '#efe4c8'; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(90,60,20,.25)'); gr.addColorStop(0.12, 'rgba(90,60,20,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(40,30,20,.55)';
    for (let y = 28; y < h - 20; y += 11) { let x = 26; while (x < w - 24) { const ww = 8 + R() * 26; if (x + ww > w - 24) break; g.fillRect(x, y, ww, 3); x += ww + 5; } }
  });
  const pageMat = kit.std(0xffffff, 0.9, 0, { map: pageTex, emissive: 0x302418, emissiveIntensity: 0 });
  const coverMat = kit.std(0x3a2430, 0.7, 0, { emissive: 0x000000, emissiveIntensity: 0 });
  kit.box(0.32, 0.012, 0.22, coverMat, book, 0, 0, 0);
  const pl = kit.mesh(new THREE.PlaneGeometry(0.15, 0.21), pageMat, book, -0.077, 0.02, 0); pl.rotation.set(-Math.PI / 2, 0.1, 0);
  const pr = kit.mesh(new THREE.PlaneGeometry(0.15, 0.21), pageMat, book, 0.077, 0.02, 0); pr.rotation.set(-Math.PI / 2, -0.1, 0);
  pr.scale.x = -1;
  kit.box(0.3, 0.018, 0.2, kit.std(0xe9dcbc, 0.95), book, 0, 0.009, 0, false);

  const crumG = new THREE.IcosahedronGeometry(0.05, 2);
  const pa = crumG.attributes.position as THREE.BufferAttribute;
  const seen = new Map<string, number>();
  for (let i = 0; i < pa.count; i++) {
    const key = `${pa.getX(i).toFixed(3)},${pa.getY(i).toFixed(3)},${pa.getZ(i).toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, 0.72 + R() * 0.5);
    const s = seen.get(key)!; pa.setXYZ(i, pa.getX(i) * s, pa.getY(i) * s * 0.8, pa.getZ(i) * s);
  }
  crumG.computeVertexNormals();
  const crumMat = kit.std(0xe8dcc0, 0.95, 0, { flatShading: true, map: pageTex, emissive: 0x000000, emissiveIntensity: 0 });
  const crumple = kit.mesh(crumG, crumMat, room, wx + 0.23, 0.78, 0.2);

  /* ---------- outside: sky, ground, poles, trees, far lights ---------- */
  const out = new THREE.Group(); scene.add(out);
  const skyTex = kit.canvas(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#02030a'); gr.addColorStop(0.55, '#0b1330'); gr.addColorStop(0.72, '#1c2748'); gr.addColorStop(0.78, '#0a0d16'); gr.addColorStop(1, '#040508');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + R() * 0.7})`; const s = R() < 0.1 ? 2 : 1; g.fillRect(R() * w, R() * h * 0.62, s, s); }
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(420, 120), new THREE.MeshBasicMaterial({ map: skyTex, fog: false }));
  sky.position.set(-110, 10, -40); sky.rotation.y = Math.PI / 2; out.add(sky);
  kit.glow(0xc8d4ff, 16, 0.5, out, -100, 26, -55);
  const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), new THREE.MeshBasicMaterial({ color: 0xe8ecff, fog: false }));
  moonDisc.position.set(-100, 26, -55); moonDisc.rotation.y = Math.PI / 2; out.add(moonDisc);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), kit.std(0x0b0d10, 1));
  ground.rotation.x = -Math.PI / 2; ground.position.set(-80, -1.1, -40); out.add(ground);
  // embankment ballast right under the window
  const bal = new THREE.Mesh(new THREE.PlaneGeometry(4, 300), kit.std(0x24221f, 1, 0, { map: kit.noise('#2a2724', 0.2, 64, [4, 120], 5) }));
  bal.rotation.x = -Math.PI / 2; bal.position.set(-3, -1.0, -40); out.add(bal);
  // telegraph wires
  const wireM = new THREE.MeshBasicMaterial({ color: 0x0a0c12 });
  for (const y of [4.6, 4.95]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 400), wireM); w.position.set(-4.3, y, -60); out.add(w); }

  type Mover = { o: THREE.Object3D; span: number; min: number };
  const movers: Mover[] = [];
  const V = 17; // metres per second
  const poleM = kit.std(0x14110e, 0.9);
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Group(); p.position.set(-4.3, 0, -120 + i * 26); out.add(p);
    kit.box(0.14, 6.4, 0.14, poleM, p, 0, 2.1, 0, false);
    kit.box(0.1, 0.1, 1.3, poleM, p, 0, 4.9, 0, false);
    movers.push({ o: p, span: 156, min: -130 });
  }
  const treeM = kit.std(0x080a0d, 1);
  const treeG = new THREE.ConeGeometry(1.6, 5, 6);
  for (let i = 0; i < 26; i++) {
    const t = kit.mesh(treeG, treeM, out, -9 - R() * 30, 1.2, -140 + R() * 170, false);
    t.scale.set(0.7 + R() * 0.9, 0.6 + R() * 0.9, 0.7 + R() * 0.9);
    movers.push({ o: t, span: 170, min: -140 });
  }
  const farLights: THREE.Sprite[] = [];
  for (let i = 0; i < 14; i++) {
    const s = kit.glow(R() < 0.7 ? 0xffb060 : 0xfff0c8, 0.9 + R() * 1.4, 0.8, out, -30 - R() * 50, -0.4 + R() * 1.2, -150 + R() * 180);
    farLights.push(s);
    movers.push({ o: s, span: 180, min: -150 });
  }
  // the passing lamp on a post
  const lampPost = new THREE.Group(); lampPost.position.set(-3.1, 0, -200); out.add(lampPost);
  kit.box(0.1, 4.2, 0.1, poleM, lampPost, 0, 1.0, 0, false);
  const lampGlow = kit.glow(0xffc27a, 3.2, 1, lampPost, 0.3, 3.1, 0);
  kit.mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe0a8 }), lampPost, 0.3, 3.1, 0, false);
  let lampNext = 3.5;

  /* ---------- Ghosh, the friendly stranger across from you ---------- */
  const g = figure(kit, { skin: 0x8c5b3c, top: 0xd9d2bf, bottom: 0x3a3a44, hair: 0x15110f, hairStyle: 'short', seated: true, collar: 0xbfb8a4 });
  g.root.position.set(0.28, 0.0, -0.98); room.add(g.root);
  g.armR.rotation.x = -0.5; g.foreR.rotation.x = -1.0; g.armR.rotation.z = 0.08;
  g.armL.rotation.x = -0.45; g.foreL.rotation.x = -0.75; g.armL.rotation.z = -0.05;
  g.torso.rotation.x = -0.08;
  const ghoshGlow = g.mats[1];

  /* ---------- state ---------- */
  let flick = 1, dip = 0, dead = false, clackAt = 1.2, jolt = 0, aftermath = false;
  const sway = { pos: new THREE.Vector3(), roll: 0, pitch: 0, yaw: 0 };
  let speed = 1;
  const torch = new THREE.SpotLight(0xfff2d0, 0, 12, 0.22, 0.6, 1.4);
  torch.position.set(-2.6, 1.2, 0.2); torch.target.position.set(0, 0.9, 0); scene.add(torch, torch.target);
  const torchGlow = kit.glow(0xfff2d0, 0.8, 0, out, -2.6, 1.2, 0.2);

  const tmp = new THREE.Vector3();
  const update = (t: number, dt: number) => {
    // bulb flicker with the odd brown-out
    if (!dead) {
      if (dip > 0) dip -= dt; else if (Math.random() < dt * 0.3) dip = 0.06 + Math.random() * 0.14;
      const target = dip > 0 ? 0.35 + Math.random() * 0.2 : 0.93 + Math.sin(t * 43) * Math.sin(t * 17.3) * 0.07;
      flick = reduced ? 0.96 : lerp(flick, target, 0.6);
    }
    key.intensity = 26 * flick; fill.intensity = 3.2 * flick;
    bulbMat.emissiveIntensity = 2.4 * flick; (halo.material as THREE.SpriteMaterial).opacity = 0.55 * flick;
    blades.rotation.y += dt * (dead ? 0.5 : 9) * flick;

    // the world outside streams past
    const v = V * speed;
    for (const m of movers) { m.o.position.z += v * dt; if (m.o.position.z > m.min + m.span) m.o.position.z -= m.span; }
    lampNext -= dt;
    if (lampNext <= 0 && speed > 0.5) { lampPost.position.z = -60; lampNext = 7 + Math.random() * 5; }
    lampPost.position.z += v * dt;
    const lz = lampPost.position.z;
    passLight.position.set(-2.8, 3.1, lz);
    passLight.intensity = speed > 0.5 && lz > -12 && lz < 10 ? 38 * Math.max(0, 1 - Math.abs(lz - 0.2) / 9) : 0;
    (lampGlow.material as THREE.SpriteMaterial).opacity = speed > 0.3 ? 1 : 0;
    farLights.forEach((s, i) => { (s.material as THREE.SpriteMaterial).opacity = speed > 0.3 ? 0.55 + Math.sin(t * 3 + i) * 0.25 : 0.0; });

    // carriage sway + rail joints
    if (!aftermath) {
      clackAt -= dt * speed;
      if (clackAt <= 0 && speed > 0.5) { clackAt = 1.55 + Math.random() * 0.4; sfx.clack(); jolt = 1; }
      jolt = Math.max(0, jolt - dt * 5);
      sway.pos.set(Math.sin(t * 1.3) * 0.012 + Math.sin(t * 3.1) * 0.003, jolt * 0.006 * Math.sin(t * 60) + Math.sin(t * 2.2) * 0.003, 0);
      sway.roll = Math.sin(t * 1.1) * 0.008 + Math.sin(t * 2.7) * 0.003;
      sway.pitch = jolt * 0.004; sway.yaw = 0;
    }
    // Ghosh talks: small nods, a hand that gestures
    g.head.rotation.x = Math.sin(t * 2.1) * 0.05 + (aftermath ? 0.4 : 0);
    g.head.rotation.y = Math.sin(t * 0.5) * 0.12;
    g.foreR.rotation.x = -1.0 + Math.sin(t * 1.7) * 0.18;
    g.root.position.x = 0.28 + sway.pos.x * 0.6;
    flask.rotation.x = Math.sin(t * 1.3) * 0.08;

    if (aftermath) {
      const a = t * 0.9;
      tmp.set(-0.2 + Math.sin(a) * 0.9, 0.7 + Math.sin(a * 1.7) * 0.25, Math.cos(a * 0.8) * 0.8);
      torch.target.position.copy(tmp);
      torch.position.set(-2.4, 1.3 + Math.sin(a * 1.3) * 0.2, 0.2 + Math.sin(a * 0.7) * 0.5);
      torchGlow.position.copy(torch.position);
    }
  };

  const room3: Room = {
    eye: new THREE.Vector3(-0.36, 1.14, 0.84), yaw: 0.16, pitch: -0.13, fov: 64,
    yawRange: [-1.25, 1.35], pitchRange: [-0.85, 0.55],
    exposure: 1.1,
    intro: { from: new THREE.Vector3(0.2, 1.55, 1.15), yaw: -0.55, pitch: 0.18, fov: 72, ms: 3800 },
    sway,
    spots: [
      { id: 'book', pos: new THREE.Vector3(wx + 0.2, 0.86, -0.06), hit: 0.16, look: new THREE.Vector3(wx + 0.2, 0.8, -0.06), glow: [pageMat, coverMat] },
      { id: 'ghosh', pos: new THREE.Vector3(0.28, 1.5, -0.86), hit: [0.6, 1.1, 0.5], hitPos: new THREE.Vector3(0.28, 0.95, -0.9), look: new THREE.Vector3(0.28, 1.1, -0.9), glow: [ghoshGlow] },
      { id: 'window', pos: new THREE.Vector3(wx, 1.3, -0.1), hit: [0.2, 0.8, 1.0], hitPos: new THREE.Vector3(wx, 1.26, 0), look: new THREE.Vector3(wx - 1, 1.2, -0.4),
        onFind: () => { lampNext = 0.2; } },
      { id: 'page', pos: new THREE.Vector3(wx + 0.23, 0.87, 0.2), hit: 0.13, look: new THREE.Vector3(wx + 0.23, 0.78, 0.2), glow: [crumMat] },
    ],
    update,
    async finale() {
      ctx.lookAt(new THREE.Vector3(-1.2, 1.2, -0.6), 0.6);
      await ctx.wait(700);
      sfx.boom();
      ctx.shake(1);
      speed = 0.2;
      // the bulb stutters and dies
      for (let i = 0; i < 6; i++) { dead = true; flick = i % 2 ? 0.1 : 0.9; await ctx.wait(70 + i * 25); }
      flick = 0; speed = 0;
      moon.intensity = 0.15;
      ctx.exposure(0.6, 600);
      await ctx.wait(500);
      ctx.black(1, 900);
      await ctx.wait(1300);
      ctx.black(1, 0, 'October 1961');
      await ctx.wait(reduced ? 1600 : 2800);
      ctx.black(1, 400, '');
      await ctx.wait(400);
    },
    after() {
      aftermath = true;
      sway.pos.set(0, 0, 0); sway.roll = 0.13; sway.pitch = 0; sway.yaw = 0;
      torch.intensity = 60; (torchGlow.material as THREE.SpriteMaterial).opacity = 0.9;
      hemi.intensity = 0.25; moon.intensity = 0.35;
      ctx.exposure(1.0, 1500);
      ctx.black(0, 1800, '');
    },
  };
  return room3;
}
