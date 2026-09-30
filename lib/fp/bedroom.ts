// 2000 · His old bedroom on Christmas Eve. Lamp light, snow at the window, the party muffled downstairs,
// and one red book on the shelf that flies to you and opens to Ashoke's inscription.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Ctx, Room } from './types';
import { rng, lerp, smooth, easeInOut, easeOutBack } from './kit';

export function buildBedroom(ctx: Ctx): Room {
  const { scene, kit, reduced, sfx } = ctx;
  const R = rng(2000);
  scene.background = new THREE.Color(0x05070f);
  scene.fog = new THREE.Fog(0x0b1224, 12, 60);

  const EYE = new THREE.Vector3(0.05, 1.5, 1.3);
  const room = new THREE.Group(); scene.add(room);
  const X0 = -2.0, X1 = 2.1, Z0 = -2.3, Z1 = 2.3, H = 2.5;

  /* ---------- materials ---------- */
  const paperTex = kit.canvas(256, 256, (g, w, h) => {
    g.fillStyle = '#5d6f8a'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x, 0, 12, h); g.fillStyle = 'rgba(20,30,50,.08)'; g.fillRect(x + 14, 0, 2, h); }
    for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(0,0,0,${R() * 0.06})`; g.fillRect(R() * w, R() * h, 1, 1); }
  }, { repeat: [4, 2] });
  const wallM = kit.std(0xffffff, 0.95, 0, { map: paperTex });
  const floorM = kit.std(0xffffff, 0.7, 0, { map: kit.wood('#7a5234', '#3a220f', 256, [2, 4], 5, 12) });
  const ceilM = kit.std(0xe8e2d4, 0.95);
  const trimM = kit.std(0xefe9dc, 0.6);
  const woodM = kit.std(0xffffff, 0.6, 0, { map: kit.wood('#6a4428', '#2c1709', 256, [1, 1], 3, 6) });

  /* ---------- shell ---------- */
  kit.box(X1 - X0, 0.05, Z1 - Z0, floorM, room, (X0 + X1) / 2, -0.025, 0);
  kit.box(X1 - X0, 0.05, Z1 - Z0, ceilM, room, (X0 + X1) / 2, H, 0, false);
  kit.box(0.06, H, Z1 - Z0, wallM, room, X0, H / 2, 0);
  kit.box(X1 - X0, H, 0.06, wallM, room, (X0 + X1) / 2, H / 2, Z1);
  // back wall with the window x ∈ [-1.25, 0.05], y ∈ [0.95, 2.05]
  const wx0 = -1.25, wx1 = 0.05, wy0 = 0.95, wy1 = 2.05;
  kit.box(X1 - X0, wy0, 0.06, wallM, room, (X0 + X1) / 2, wy0 / 2, Z0);
  kit.box(X1 - X0, H - wy1, 0.06, wallM, room, (X0 + X1) / 2, (H + wy1) / 2, Z0);
  kit.box(wx0 - X0, wy1 - wy0, 0.06, wallM, room, (X0 + wx0) / 2, (wy0 + wy1) / 2, Z0);
  kit.box(X1 - wx1, wy1 - wy0, 0.06, wallM, room, (wx1 + X1) / 2, (wy0 + wy1) / 2, Z0);
  // right wall with a door opening z ∈ [0.75, 1.7]
  const dz0 = 0.75, dz1 = 1.7, dh = 2.05;
  kit.box(0.06, H, dz0 - Z0, wallM, room, X1, H / 2, (Z0 + dz0) / 2);
  kit.box(0.06, H, Z1 - dz1, wallM, room, X1, H / 2, (dz1 + Z1) / 2);
  kit.box(0.06, H - dh, dz1 - dz0, wallM, room, X1, (H + dh) / 2, (dz0 + dz1) / 2);
  // baseboards + door casing
  kit.box(X1 - X0, 0.1, 0.02, trimM, room, (X0 + X1) / 2, 0.05, Z0 + 0.04, false);
  kit.box(0.02, 0.1, Z1 - Z0, trimM, room, X0 + 0.04, 0.05, 0, false);
  kit.box(0.08, 0.08, dz1 - dz0 + 0.16, trimM, room, X1 - 0.02, dh + 0.04, (dz0 + dz1) / 2, false);
  kit.box(0.08, dh, 0.08, trimM, room, X1 - 0.02, dh / 2, dz0 - 0.04, false);
  kit.box(0.08, dh, 0.08, trimM, room, X1 - 0.02, dh / 2, dz1 + 0.04, false);

  /* ---------- window, curtains, the snowy street ---------- */
  kit.box(1.44, 0.05, 0.2, trimM, room, (wx0 + wx1) / 2, wy0 - 0.02, Z0 + 0.06);
  kit.box(1.36, 0.06, 0.1, trimM, room, (wx0 + wx1) / 2, wy1, Z0);
  kit.box(0.06, 1.16, 0.1, trimM, room, wx0, (wy0 + wy1) / 2, Z0);
  kit.box(0.06, 1.16, 0.1, trimM, room, wx1, (wy0 + wy1) / 2, Z0);
  kit.box(0.04, 1.1, 0.05, trimM, room, (wx0 + wx1) / 2, (wy0 + wy1) / 2, Z0, false);
  kit.box(1.3, 0.04, 0.05, trimM, room, (wx0 + wx1) / 2, (wy0 + wy1) / 2 + 0.05, Z0, false);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.1), new THREE.MeshBasicMaterial({ color: 0x9fb4d8, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending }));
  glass.position.set((wx0 + wx1) / 2, (wy0 + wy1) / 2, Z0 - 0.01); room.add(glass);
  const curtainTex = kit.canvas(64, 64, (g, w, h) => {
    g.fillStyle = '#7a2e2a'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, 0, 3, h); }
  }, { repeat: [3, 1] });
  const curtainM = kit.std(0xffffff, 0.95, 0, { map: curtainTex, side: THREE.DoubleSide });
  for (const [cx, w] of [[wx0 - 0.12, 0.42], [wx1 + 0.12, 0.42]] as const) {
    const g = new THREE.PlaneGeometry(w, 1.55, 12, 1);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 40) * 0.025);
    g.computeVertexNormals();
    kit.mesh(g, curtainM, room, cx, 1.35, Z0 + 0.1);
  }
  kit.cyl(0.015, 0.015, 2.0, kit.std(0x8a6a34, 0.35, 0.8), room, (wx0 + wx1) / 2, 2.15, Z0 + 0.1, 8, false).rotation.z = Math.PI / 2;

  const out = new THREE.Group(); scene.add(out);
  const skyTex = kit.canvas(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#060a18'); gr.addColorStop(0.6, '#18223f'); gr.addColorStop(0.85, '#3b3a52'); gr.addColorStop(1, '#4a4258');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(260, 90), new THREE.MeshBasicMaterial({ map: skyTex, fog: false }));
  sky.position.set(0, 18, -80); out.add(sky);
  const snowGround = new THREE.Mesh(new THREE.PlaneGeometry(200, 120), kit.std(0xdfe8f6, 0.9));
  snowGround.rotation.x = -Math.PI / 2; snowGround.position.set(0, -3, -60); out.add(snowGround);
  // street
  const street = new THREE.Mesh(new THREE.PlaneGeometry(200, 7), kit.std(0x8a93a8, 0.8));
  street.rotation.x = -Math.PI / 2; street.position.set(0, -2.98, -14); out.add(street);
  // houses across the street, with warm windows and strings of lights
  const houseCols = [0x3a4660, 0x4b3f52, 0x3f4e4a, 0x5a4a3e];
  const bulbCols = [0xff4a3a, 0x4aff7a, 0x5aa0ff, 0xffd04a, 0xff7ae0];
  const twinkles: THREE.Sprite[] = [];
  for (let i = 0; i < 5; i++) {
    const hx = -30 + i * 14 + (R() - 0.5) * 3, hz = -38 - R() * 5, hw = 8 + R() * 3;
    const hse = new THREE.Group(); hse.position.set(hx, -3, hz); out.add(hse);
    kit.box(hw, 5, 6, kit.std(houseCols[i % 4], 0.9), hse, 0, 2.5, 0, false);
    const roof = kit.mesh(new THREE.CylinderGeometry(0.01, hw * 0.62, 2.6, 4, 1), kit.std(0x2a2c36, 0.9), hse, 0, 6.3, 0, false);
    roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.75);
    const snowRoof = kit.mesh(new THREE.CylinderGeometry(0.01, hw * 0.64, 2.2, 4, 1), kit.std(0xe8eef8, 0.85), hse, 0, 6.5, 0, false);
    snowRoof.rotation.y = Math.PI / 4; snowRoof.scale.set(1, 1, 0.75);
    for (let k = 0; k < 4; k++) {
      if (R() < 0.3) continue;
      const wm = new THREE.MeshBasicMaterial({ color: R() < 0.5 ? 0xd9822e : 0xe8a050, toneMapped: false });
      kit.mesh(new THREE.PlaneGeometry(0.9, 1.1), wm, hse, -hw / 2 + 1.1 + k * (hw - 2.2) / 3, k % 2 ? 3.3 : 1.4, 3.01, false);
    }
    for (let k = 0; k < 16; k++) {
      const s = kit.glow(bulbCols[k % bulbCols.length], 0.55, 0.9, hse, -hw / 2 + k * hw / 15, 5.05 + Math.sin(k) * 0.05, 3.1);
      twinkles.push(s);
    }
  }
  // streetlamp
  const lampPost = new THREE.Group(); lampPost.position.set(4, -3, -11); out.add(lampPost);
  kit.box(0.14, 4.4, 0.14, kit.std(0x1a1c22, 0.6), lampPost, 0, 2.2, 0, false);
  kit.glow(0xffc27a, 5, 0.8, lampPost, 0, 4.5, 0);
  kit.glow(0xffc27a, 12, 0.2, lampPost, 0, 0.1, 0);
  // snow
  const SN = reduced ? 260 : 700;
  const snowPos = new Float32Array(SN * 3), snowSpd = new Float32Array(SN);
  for (let i = 0; i < SN; i++) {
    snowPos[i * 3] = -6 + R() * 11; snowPos[i * 3 + 1] = -3 + R() * 8; snowPos[i * 3 + 2] = -2.5 - R() * 12;
    snowSpd[i] = 0.4 + R() * 0.6;
  }
  const snowG = new THREE.BufferGeometry(); snowG.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snowM = new THREE.PointsMaterial({ size: 0.06, map: kit.dotTexture(), color: 0xe8f0ff, transparent: true, opacity: 0.9, depthWrite: false });
  const snow = new THREE.Points(snowG, snowM); out.add(snow);

  /* ---------- bed ---------- */
  const bed = new THREE.Group(); bed.position.set(-1.45, 0, -1.25); room.add(bed);
  kit.box(1.05, 0.32, 2.05, woodM, bed, 0, 0.16, 0);
  kit.box(1.08, 0.9, 0.06, woodM, bed, 0, 0.45, -1.03);
  kit.box(1.08, 0.5, 0.06, woodM, bed, 0, 0.25, 1.03);
  kit.mesh(new RoundedBoxGeometry(0.98, 0.2, 1.96, 3, 0.06), kit.std(0xf2eee6, 0.9), bed, 0, 0.41, 0);
  const plaid = kit.canvas(128, 128, (g, w, h) => {
    g.fillStyle = '#2f4f7a'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(180,40,40,.55)'; for (let x = 0; x < w; x += 32) { g.fillRect(x, 0, 8, h); g.fillRect(0, x, w, 8); }
    g.fillStyle = 'rgba(240,220,160,.35)'; for (let x = 16; x < w; x += 32) { g.fillRect(x, 0, 2, h); g.fillRect(0, x, w, 2); }
  }, { repeat: [3, 5] });
  const quilt = kit.mesh(new RoundedBoxGeometry(1.06, 0.09, 1.5, 3, 0.04), kit.std(0xffffff, 0.95, 0, { map: plaid }), bed, 0, 0.53, 0.24);
  quilt.rotation.x = 0.01;
  kit.box(1.04, 0.2, 0.04, kit.std(0xffffff, 0.95, 0, { map: plaid }), bed, 0, 0.44, 0.99, false);
  const pillow = kit.mesh(new RoundedBoxGeometry(0.7, 0.14, 0.4, 4, 0.065), kit.std(0xf4f0e8, 0.9), bed, 0, 0.58, -0.74);
  pillow.rotation.x = 0.12;

  /* ---------- desk + lamp ---------- */
  const desk = new THREE.Group(); desk.position.set(1.72, 0, -1.7); room.add(desk);
  kit.box(0.7, 0.05, 1.15, woodM, desk, 0, 0.75, 0);
  kit.box(0.66, 0.72, 0.04, woodM, desk, 0, 0.36, -0.55);
  kit.box(0.66, 0.72, 0.04, woodM, desk, 0, 0.36, 0.55);
  kit.box(0.04, 0.2, 1.1, woodM, desk, -0.33, 0.62, 0);
  // gooseneck lamp
  const lampPos = new THREE.Vector3(1.8, 1.22, -2.0);
  const brass = kit.std(0x9a7a3a, 0.3, 0.9);
  kit.cyl(0.09, 0.1, 0.03, brass, room, 1.84, 0.79, -2.02, 16);
  const arm = kit.cyl(0.012, 0.012, 0.42, brass, room, 1.84, 0.99, -2.02, 8); arm.rotation.z = 0.12;
  const shade = kit.mesh(new THREE.ConeGeometry(0.13, 0.16, 20, 1, true), kit.std(0x2f5a3c, 0.5, 0.3, { side: THREE.DoubleSide }), room, lampPos.x, lampPos.y, lampPos.z);
  shade.rotation.z = -0.5;
  const bulbM = new THREE.MeshBasicMaterial({ color: 0xfff0d0 });
  kit.mesh(new THREE.SphereGeometry(0.035, 10, 8), bulbM, room, lampPos.x - 0.03, lampPos.y - 0.05, lampPos.z, false);
  kit.glow(0xffc680, 0.8, 0.8, room, lampPos.x - 0.04, lampPos.y - 0.07, lampPos.z);
  // desk things: pencil cup, tapes, a framed building sketch on the wall
  kit.cyl(0.04, 0.035, 0.1, kit.std(0x3a4a6a, 0.6), desk, 0.1, 0.83, 0.35, 12);
  for (let i = 0; i < 5; i++) { const p = kit.cyl(0.004, 0.004, 0.16, kit.std([0xe8b923, 0xc0392b, 0x2c3e50][i % 3], 0.6), desk, 0.1 + (R() - 0.5) * 0.03, 0.9, 0.35 + (R() - 0.5) * 0.03, 5, false); p.rotation.set((R() - 0.5) * 0.4, 0, (R() - 0.5) * 0.4); }
  for (let i = 0; i < 4; i++) kit.box(0.07, 0.012, 0.11, kit.std([0x1b1b1f, 0xd8d0c0, 0x8a2e2e, 0x2e4a8a][i], 0.5), desk, -0.05, 0.785 + i * 0.013, -0.05).rotation.y = (R() - 0.5) * 0.3;
  const sketchTex = kit.canvas(256, 192, (g, w, h) => {
    g.fillStyle = '#f1ead8'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(40,60,110,.8)'; g.lineWidth = 1.5;
    const bx = 60, by = 40;
    g.strokeRect(bx, by + 40, 140, 100); g.beginPath(); g.moveTo(bx - 10, by + 44); g.lineTo(bx + 70, by); g.lineTo(bx + 150, by + 44); g.stroke();
    for (let i = 0; i < 4; i++) g.strokeRect(bx + 14 + i * 32, by + 62, 18, 22);
    g.strokeRect(bx + 58, by + 100, 24, 40);
    g.beginPath(); for (let i = 0; i < 9; i++) { g.moveTo(10, 150 + i * 4); g.lineTo(w - 10, 150 + i * 4); } g.globalAlpha = 0.15; g.stroke();
  });
  const frame = new THREE.Group(); frame.position.set(X1 - 0.04, 1.62, -1.7); frame.rotation.y = -Math.PI / 2; room.add(frame);
  kit.box(0.72, 0.56, 0.03, kit.std(0x1b1b1f, 0.5), frame, 0, 0, 0);
  kit.mesh(new THREE.PlaneGeometry(0.64, 0.48), kit.std(0xffffff, 0.8, 0, { map: sketchTex }), frame, 0, 0, 0.017, false);

  /* ---------- bookshelf ---------- */
  const shelf = new THREE.Group(); shelf.position.set(1.9, 0, -0.25); room.add(shelf);
  const sw = 0.32, sl = 1.2, sh = 1.95;
  kit.box(sw, sh, 0.03, woodM, shelf, 0, sh / 2, -sl / 2);
  kit.box(sw, sh, 0.03, woodM, shelf, 0, sh / 2, sl / 2);
  kit.box(0.02, sh, sl, woodM, shelf, sw / 2 - 0.01, sh / 2, 0);
  const levels = [0.08, 0.46, 0.84, 1.22, 1.6, 1.93];
  levels.forEach((y) => kit.box(sw, 0.025, sl, woodM, shelf, 0, y, 0));
  const bookCols = ['#7a2e2a', '#2e4a7a', '#3a5a3a', '#8a6a2a', '#5a3a5a', '#2a2a2e', '#a8783a', '#4a6a7a', '#6a2a3a', '#c8b890', '#355045', '#7a5a3a'];
  const spineTex = kit.canvas(512, 256, (g, w, h) => {
    // a tile atlas of generic spines: 12 columns
    const cw = w / 12;
    bookCols.forEach((c, i) => {
      g.fillStyle = c; g.fillRect(i * cw, 0, cw, h);
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(i * cw + 2, 0, 3, h);
      g.fillStyle = 'rgba(230,200,120,.6)'; g.fillRect(i * cw + 6, 30, cw - 12, 3); g.fillRect(i * cw + 6, h - 36, cw - 12, 3);
      g.fillStyle = 'rgba(240,230,210,.35)'; g.fillRect(i * cw + cw / 2 - 2, 60, 4, 110);
    });
  });
  const bookG = new THREE.BoxGeometry(1, 1, 1);
  const bookMats = bookCols.map((c, i) => {
    const t = spineTex.clone(); t.needsUpdate = true; t.repeat.set(1 / 12, 1); t.offset.set(i / 12, 0); kit.textures.push(t);
    const side = kit.std(c, 0.8);
    return [side, kit.std(0xffffff, 0.75, 0, { map: t }), kit.std(0xe8dcc0, 0.95), kit.std(0xe8dcc0, 0.95), side, side];
  });
  const RED_LEVEL = 3, RED_Z = -0.12;
  for (let li = 0; li < levels.length - 1; li++) {
    let z = -sl / 2 + 0.03;
    const top = levels[li + 1] - levels[li] - 0.05;
    while (z < sl / 2 - 0.06) {
      const th = 0.025 + R() * 0.035, bh = Math.min(top, 0.18 + R() * 0.1), bw = 0.16 + R() * 0.08;
      if (li === RED_LEVEL && Math.abs(z + th / 2 - RED_Z) < 0.05) { z = RED_Z + 0.03; continue; }
      if (R() < 0.06 && li !== RED_LEVEL) { z += 0.08; continue; }
      const m = new THREE.Mesh(bookG, bookMats[Math.floor(R() * bookMats.length)]);
      m.scale.set(bw, bh, th); m.position.set(sw / 2 - 0.03 - bw / 2 - 0.01, levels[li] + 0.0125 + bh / 2, z + th / 2);
      if (R() < 0.08 && z < sl / 2 - 0.2) { m.rotation.x = -0.18; m.position.y -= 0.005; }
      m.castShadow = true; m.receiveShadow = true;
      shelf.add(m);
      z += th + 0.002;
    }
  }

  /* ---------- the red book ---------- */
  const BW = 0.15, BH = 0.225, BT = 0.042;
  const F = () => kit.fonts;
  const coverTex = kit.canvas(300, 450, (g, w, h) => {
    g.fillStyle = '#8e1f1f'; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(0.08, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d9b45a'; g.lineWidth = 3; g.strokeRect(22, 22, w - 44, h - 44); g.lineWidth = 1; g.strokeRect(30, 30, w - 60, h - 60);
    g.fillStyle = '#e6c46a'; g.textAlign = 'center';
    g.font = `22px ${F().mono}`; g.fillText('THE SHORT STORIES OF', w / 2, 150);
    g.font = `50px ${F().display}`; g.fillText('Nikolai', w / 2, 215); g.fillText('Gogol', w / 2, 272);
  }, { text: true });
  const spineRedTex = kit.canvas(64, 512, (g, w, h) => {
    g.fillStyle = '#8e1f1f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d9b45a'; g.fillRect(6, 30, w - 12, 3); g.fillRect(6, h - 34, w - 12, 3);
    g.save(); g.translate(w / 2 + 8, h / 2); g.rotate(-Math.PI / 2);
    g.fillStyle = '#ecc86a'; g.textAlign = 'center';
    g.font = `26px ${F().display}`; g.fillText('The Short Stories of Nikolai Gogol', 0, 0);
    g.restore();
  }, { text: true });
  const inscTex = kit.canvas(600, 900, (g, w, h) => {
    g.fillStyle = '#f3ead2'; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(120,90,40,.28)'); gr.addColorStop(0.1, 'rgba(120,90,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,90,40,${R() * 0.05})`; g.fillRect(R() * w, R() * h, 2, 2); }
    g.fillStyle = '#1f2a55'; g.textAlign = 'center';
    g.font = `64px ${F().hand}`;
    const lines = ['The man who', 'gave you his name,', 'from the man who', 'gave you your name.'];
    lines.forEach((l, i) => { g.save(); g.translate(w / 2, 330 + i * 86); g.rotate(-0.03); g.fillText(l, 0, 0); g.restore(); });
  }, { text: true });
  const redM = kit.std(0x8e1f1f, 0.6, 0, { emissive: 0x000000, emissiveIntensity: 0 });
  const book = new THREE.Group();
  const shelfBookPos = new THREE.Vector3(shelf.position.x + sw / 2 - 0.03 - BW / 2 - 0.01, levels[RED_LEVEL] + 0.0125 + BH / 2, shelf.position.z + RED_Z);
  book.position.copy(shelfBookPos); room.add(book);
  const pagesM = kit.std(0xefe4c8, 0.95);
  const endM = kit.std(0x6a1616, 0.8);
  kit.box(BW, BH, 0.004, redM, book, 0, 0, -BT / 2 + 0.002);
  kit.box(BW - 0.008, BH - 0.01, BT - 0.01, pagesM, book, 0.002, 0, 0);
  const spine = kit.box(0.006, BH, BT, [redM, kit.std(0xffffff, 0.6, 0, { map: spineRedTex, emissive: 0xffffff, emissiveMap: spineRedTex, emissiveIntensity: 0.05 }), redM, redM, redM, redM], book, -BW / 2, 0, 0);
  void spine;
  const hinge = new THREE.Group(); hinge.position.set(-BW / 2, 0, BT / 2 - 0.002); book.add(hinge);
  const coverFace = kit.std(0xffffff, 0.6, 0, { map: coverTex });
  kit.box(BW, BH, 0.004, [redM, redM, redM, redM, coverFace, endM], hinge, BW / 2, 0, 0);
  const inscM = kit.std(0xffffff, 0.9, 0, { map: inscTex, emissive: 0xffffff, emissiveMap: inscTex, emissiveIntensity: 0.0 });
  const insc = kit.mesh(new THREE.PlaneGeometry(BW - 0.012, BH - 0.014), inscM, book, 0.003, 0, BT / 2 - 0.0045, false);
  void insc;
  const readLight = new THREE.PointLight(0xffd9a0, 0, 1.2, 2); scene.add(readLight);

  /* ---------- the door and the hall light ---------- */
  const hallTex = kit.gradient([[0, '#ffcf8a'], [0.6, '#e8964a'], [1, '#6a3a1a']]);
  const hall = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.3), new THREE.MeshBasicMaterial({ map: hallTex }));
  hall.position.set(X1 + 0.9, 1.1, (dz0 + dz1) / 2); hall.rotation.y = -Math.PI / 2; room.add(hall);
  kit.box(0.02, 2.3, 2.4, kit.std(0x8a6a4a, 0.9), room, X1 + 1.0, 1.15, (dz0 + dz1) / 2, false);
  const door = new THREE.Group(); door.position.set(X1 - 0.02, 0, dz1); room.add(door);
  const doorM = kit.std(0xf2ede2, 0.6);
  kit.box(0.04, dh - 0.02, dz1 - dz0 - 0.02, doorM, door, 0, dh / 2, -(dz1 - dz0) / 2);
  for (const y of [0.55, 1.45]) kit.box(0.05, 0.6, 0.6, kit.std(0xe8e2d4, 0.6), door, -0.01, y, -(dz1 - dz0) / 2, false);
  kit.mesh(new THREE.SphereGeometry(0.03, 10, 8), kit.std(0xb89a50, 0.3, 0.9), door, -0.05, 1.0, -(dz1 - dz0) + 0.1, false);
  let doorAng = 0.55, doorTarget = 0.55;
  const hallL = new THREE.PointLight(0xffb060, 5, 0, 2); hallL.position.set(X1 + 0.5, 1.9, (dz0 + dz1) / 2); scene.add(hallL);
  const wedgeTex = kit.canvas(128, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,190,110,.8)'); gr.addColorStop(1, 'rgba(255,190,110,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const wedgeG = new THREE.BufferGeometry();
  wedgeG.setAttribute('position', new THREE.Float32BufferAttribute([X1, 0.004, dz0 + 0.1, X1, 0.004, dz1 - 0.2, X1 - 1.9, 0.004, dz1 + 0.35, X1 - 1.9, 0.004, dz0 - 0.2], 3));
  wedgeG.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 1, 0], 2));
  wedgeG.setIndex([0, 2, 1, 0, 3, 2]);
  const wedgeM = new THREE.MeshBasicMaterial({ map: wedgeTex, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
  room.add(new THREE.Mesh(wedgeG, wedgeM));

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight(0x3a4a78, 0x1a120c, 0.45); scene.add(hemi);
  const lamp = new THREE.SpotLight(0xffc27a, 16, 0, 1.1, 0.8, 2);
  lamp.position.copy(lampPos); lamp.target.position.set(1.3, 0.6, -1.4); scene.add(lamp, lamp.target);
  lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.0006; lamp.shadow.normalBias = 0.02; lamp.shadow.camera.near = 0.05; lamp.shadow.camera.far = 6;
  const lampFill = new THREE.PointLight(0xffb870, 2.2, 0, 2); lampFill.position.set(lampPos.x - 0.25, lampPos.y + 0.1, lampPos.z + 0.3); scene.add(lampFill);
  const moon = new THREE.DirectionalLight(0x7f9ad8, 0.7); moon.position.set(-1, 5, -8); moon.target.position.set(-0.6, 0, 0); scene.add(moon, moon.target);
  const snowLight = new THREE.PointLight(0x9fb8f0, 2.5, 0, 2); snowLight.position.set(-0.6, 1.4, -2.9); scene.add(snowLight);

  /* ---------- state ---------- */
  let bookAt = -1, tNow = 0, murmur = 1.5, doorAt = -1;
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), ctl = new THREE.Vector3();
  const q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion();
  const tmpO = new THREE.Object3D();
  const spots = {
    book: { id: 'book', pos: shelfBookPos.clone().add(new THREE.Vector3(-0.12, 0, 0)), hit: 0.16, look: shelfBookPos.clone(), glow: [redM],
      onFind: () => {
        bookAt = tNow;
        // fly to a reading spot in front of the camera
        const f = ctx.forward(); f.y = 0; f.normalize();
        p0.copy(shelfBookPos);
        p1.copy(shelfBookPos).add(new THREE.Vector3(-0.2, 0.02, 0));
        p2.copy(EYE).addScaledVector(f, 0.44); p2.y = EYE.y - 0.1;
        ctl.copy(p1).lerp(p2, 0.5); ctl.y += 0.25;
        q0.copy(book.quaternion);
        tmpO.position.copy(p2); tmpO.lookAt(EYE.x, EYE.y + 0.02, EYE.z); q1.copy(tmpO.quaternion);
        sfx.noise(2600, 0.6, 0.05, 0.35);
        ctx.wait(reduced ? 100 : 700).then(() => ctx.lookAt(p2.clone().add(new THREE.Vector3(0, -0.02, 0)), 1.2));
      } },
  };

  const update = (t: number, dt: number) => {
    tNow = t;
    // snow
    const p = snowG.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < SN; i++) {
      let y = p.getY(i) - snowSpd[i] * dt;
      let x = p.getX(i) + Math.sin(t * 0.6 + i) * 0.12 * dt + 0.08 * dt;
      if (y < -3) { y = 5; x = -6 + Math.random() * 11; }
      if (x > 5) x -= 11;
      p.setXY(i, x, y);
    }
    p.needsUpdate = true;
    twinkles.forEach((s, i) => { (s.material as THREE.SpriteMaterial).opacity = 0.55 + 0.4 * Math.max(0, Math.sin(t * 1.3 + i * 2.1)); });

    // the lamp hums; the party goes on downstairs
    lamp.intensity = 16 * (reduced ? 1 : 0.97 + Math.sin(t * 31) * 0.01 + Math.sin(t * 3) * 0.02);
    const walkBy = Math.max(0, Math.sin(t * 0.45) - 0.85) * 5; // someone passes the hall light now and then
    hallL.intensity = (doorAt >= 0 ? 8 : 5) * (1 - walkBy * 0.6);
    wedgeM.opacity = (doorAt >= 0 ? 0.5 : 0.35) * (1 - walkBy * 0.5) * (0.35 + doorAng);
    murmur -= dt;
    if (murmur <= 0) {
      murmur = 1.2 + Math.random() * 2.2;
      sfx.noise(220 + Math.random() * 260, 1.4, doorAt >= 0 ? 0.03 : 0.014, 0.45 + Math.random() * 0.4);
    }
    doorAng = lerp(doorAng, doorTarget, 1 - Math.exp(-2 * dt));
    door.rotation.y = -doorAng;

    // the book's flight
    if (bookAt >= 0) {
      const u = t - bookAt;
      const s = reduced ? 0.35 : 1;
      const a = u / (0.45 * s), b = (u - 0.45 * s) / (1.35 * s), c = (u - 1.9 * s) / (1.3 * s);
      if (a < 1) {
        book.position.lerpVectors(p0, p1, easeInOut(a));
      } else if (b < 1) {
        const k = easeInOut(b);
        const i1 = p1.clone().lerp(ctl, k), i2 = ctl.clone().lerp(p2, k);
        book.position.copy(i1.lerp(i2, k));
        book.quaternion.slerpQuaternions(q0, q1, easeInOut(Math.min(1, b * 1.15)));
        book.rotateZ(Math.sin(k * Math.PI) * 0.5);
      } else {
        book.quaternion.copy(q1);
        book.position.copy(p2);
        if (!reduced) { book.position.y += Math.sin(t * 1.4) * 0.006; book.rotateZ(Math.sin(t * 0.9) * 0.02); book.rotateX(Math.sin(t * 1.1) * 0.015); }
      }
      const open = c <= 0 ? 0 : easeOutBack(Math.min(1, c));
      hinge.rotation.y = -open * 2.55;
      inscM.emissiveIntensity = smooth(c) * 0.28;
      readLight.position.copy(book.position).add(new THREE.Vector3(0, 0.25, 0)).lerp(EYE, 0.35);
      readLight.intensity = smooth(c) * 1.6;
      spots.book.pos.copy(book.position).add(new THREE.Vector3(0, BH / 2 + 0.05, 0));
    }
  };

  return {
    eye: EYE, yaw: -0.22, pitch: -0.1, fov: 62,
    yawRange: [-1.75, 1.0], pitchRange: [-0.8, 0.45],
    exposure: 1.2,
    intro: { from: new THREE.Vector3(1.2, 1.55, 1.9), yaw: -1.35, pitch: 0.0, fov: 70, ms: 4000 },
    spots: [
      { id: 'window', pos: new THREE.Vector3((wx0 + wx1) / 2, 1.62, Z0 + 0.1), hit: [1.3, 1.1, 0.3], hitPos: new THREE.Vector3((wx0 + wx1) / 2, 1.5, Z0), look: new THREE.Vector3(-0.6, 1.4, Z0) },
      { id: 'door', pos: new THREE.Vector3(X1 - 0.1, 1.5, (dz0 + dz1) / 2), hit: [0.4, 2.0, 1.0], hitPos: new THREE.Vector3(X1, 1.0, (dz0 + dz1) / 2), look: new THREE.Vector3(X1, 1.3, (dz0 + dz1) / 2),
        onFind: () => { doorAt = tNow; doorTarget = 0.9; } },
      spots.book,
    ],
    update,
  };
}
