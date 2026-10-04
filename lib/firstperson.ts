// First-person 3D views (Three.js) you can step into from two stations (rooms for filmed moments are not on the line).
// lib/engine.ts shows the #fp overlay and calls startFirstPerson(); this module builds everything inside it.
// Rooms live in lib/fp/*.ts, every caption in lib/fp/copy.ts, styles in app/styles/fp.css.
import * as THREE from 'three';
import { STATIONS, FP_INFO, type FpKind } from './stations';
import { Kit, disposeTree, disposeSharedGeometry, clamp, lerp, easeInOut } from './fp/kit';
import { COPY, type SpotCopy } from './fp/copy';
import { animBadge } from './media';
import type { Ctx, Room, Spot, Sfx } from './fp/types';
import { buildCompartment } from './fp/compartment';
import { buildClassroom } from './fp/classroom';
import { buildCar } from './fp/car';
import { buildBedroom } from './fp/bedroom';

export interface FpOptions {
  reduced: boolean;
  visitor: string; // the visitor's name from the intro nametag, may be ''
  sfx: Sfx;
  onFound(found: number, total: number): void; // a new hotspot was discovered
  onComplete(): void; // every hotspot found (fires once)
  onExit(): void; // the viewer pressed Exit or Escape
}

const BUILD: Record<FpKind, (c: Ctx) => Room> = {
  compartment: buildCompartment, classroom: buildClassroom, car: buildCar, bedroom: buildBedroom,
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Wraps each word in a span with a staggered delay. Returns [html, nextDelay]. */
function words(text: string, d0: number, step: number): [string, number] {
  let d = d0;
  const html = text.split(/\s+/).filter(Boolean).map((w) => { const s = `<span class="fp-w" style="--d:${Math.round(d)}ms">${esc(w)}</span>`; d += step; return s; }).join(' ');
  return [html, d];
}

export function startFirstPerson(container: HTMLElement, kind: FpKind, opts: FpOptions): { dispose(): void } {
  const station = STATIONS.find((s) => s.fp === kind)!;
  const info = FP_INFO[kind];
  const copy = COPY[kind];
  const total = copy.spots.length;
  const reduced = !!opts.reduced;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const offs: (() => void)[] = [];
  const timers = new Set<number>();
  let disposed = false;
  const on = <K extends string>(t: EventTarget, type: K, fn: (e: Event) => void, o?: AddEventListenerOptions | boolean) => {
    t.addEventListener(type, fn as EventListener, o); offs.push(() => t.removeEventListener(type, fn as EventListener, o));
  };
  const later = (fn: () => void, ms: number) => { const id = window.setTimeout(() => { timers.delete(id); if (!disposed) fn(); }, ms); timers.add(id); return id; };

  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = `fp-root fp-k-${kind} fp-cine`;
  root.tabIndex = -1;
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', `First-person view: ${station.year}, ${info.title}`);
  container.appendChild(root);

  const pips = copy.spots.map(() => '<i></i>').join('');
  const hint = coarse ? 'Drag to look around <i>·</i> tap the glowing spots' : 'Drag to look around <i>·</i> click the glowing spots';
  root.innerHTML = `
    <canvas class="fp-canvas" aria-hidden="true"></canvas>
    <div class="fp-vig" aria-hidden="true"></div>
    <div class="fp-bars" aria-hidden="true"><i></i><i></i></div>
    <div class="fp-top">
      <div class="fp-badge"><b>${esc(station.year)}</b><span>${esc(info.title)}</span>${animBadge('3D · computer-generated', 'xs')}</div>
      <div class="fp-count" role="status" aria-live="polite"><span class="fp-pips" aria-hidden="true">${pips}</span><span class="fp-count-t">0 of ${total} found</span></div>
      <button class="fp-exit" type="button" aria-label="Exit the first-person view"><span>Exit</span><kbd>Esc</kbd></button>
    </div>
    <div class="fp-intro" aria-hidden="true">
      <div class="fp-intro-k">${esc(station.title)} <i>·</i> ${esc(station.place)}</div>
      <div class="fp-intro-y">${esc(station.year)}</div>
      <h2 class="fp-intro-t">${esc(info.title)}</h2>
      <div class="fp-intro-h"><span class="fp-ico" aria-hidden="true"></span>${hint}</div>
    </div>
    <div class="fp-tip" aria-hidden="true"></div>
    <nav class="fp-list" aria-label="Things to find">
      <div class="fp-list-h">Look for</div>
      <ol>${copy.spots.map((s, i) => `<li><button type="button" class="fp-hs" data-i="${i}" aria-label="${esc(s.label)}, not found yet"><span class="fp-hs-n">${i + 1}</span><span class="fp-hs-l">${esc(s.label)}</span><span class="fp-hs-s" aria-hidden="true"></span></button></li>`).join('')}</ol>
    </nav>
    <section class="fp-cap" aria-live="polite" hidden></section>
    <div class="fp-black" aria-hidden="true"><div class="fp-black-t"></div></div>
    <div class="fp-donep" role="dialog" aria-labelledby="fpDoneT" hidden></div>`;
  const $ = <T extends HTMLElement>(s: string) => root.querySelector(s) as T;
  const canvas = $<HTMLCanvasElement>('.fp-canvas');
  const capEl = $<HTMLElement>('.fp-cap');
  const tipEl = $<HTMLElement>('.fp-tip');
  const blackEl = $<HTMLElement>('.fp-black');
  const doneEl = $<HTMLElement>('.fp-donep');
  const countT = $<HTMLElement>('.fp-count-t');
  const listBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('.fp-hs'));

  on($('.fp-exit'), 'click', () => opts.onExit());

  /* ---------- renderer (with a DOM fallback) ---------- */
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (err) {
    console.warn('First-person view: WebGL unavailable', err);
    return fallback();
  }
  const hq = /[?&]fphq\b/.test(location.search);
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.03, 600);
  camera.rotation.order = 'YXZ';
  const kit = new Kit(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

  /* ---------- animation helpers shared with rooms ---------- */
  type Anim = { t0: number; ms: number; fn(k: number): void; done?: () => void };
  const anims: Anim[] = [];
  const anim = (ms: number, fn: (k: number) => void, done?: () => void) => { anims.push({ t0: performance.now(), ms: Math.max(1, ms), fn, done }); };
  let shakeAmt = 0;
  let camTween: { y0: number; p0: number; y1: number; p1: number; t0: number; ms: number } | null = null;
  const fwd = new THREE.Vector3();

  const ctx: Ctx = {
    scene, camera, renderer, kit, sfx: opts.sfx, reduced, visitor: (opts.visitor || '').trim(),
    lookAt(p, dur = 1) {
      const d = p.clone().sub(eyeNow);
      let y1 = Math.atan2(-d.x, -d.z);
      const p1 = clamp(Math.atan2(d.y, Math.hypot(d.x, d.z)), room.pitchRange[0] - 0.05, room.pitchRange[1] + 0.05);
      while (y1 - yaw > Math.PI) y1 -= Math.PI * 2;
      while (y1 - yaw < -Math.PI) y1 += Math.PI * 2;
      y1 = clamp(y1, room.yawRange[0] - 0.05, room.yawRange[1] + 0.05);
      vy = vp = 0;
      camTween = { y0: yaw, p0: pitch, y1, p1, t0: performance.now(), ms: reduced ? 1 : dur * 1000 };
    },
    shake(a) { if (!reduced) shakeAmt = Math.max(shakeAmt, a); },
    black(o, ms, text) {
      blackEl.style.transitionDuration = `${ms}ms`;
      blackEl.style.opacity = String(o);
      const t = blackEl.firstElementChild as HTMLElement;
      if (text !== undefined) { t.textContent = text; t.classList.remove('on'); void t.offsetWidth; if (text) t.classList.add('on'); }
    },
    wait: (ms) => new Promise<void>((res) => { later(res, ms); }),
    exposure(v, ms) {
      const e0 = renderer.toneMappingExposure;
      anim(ms, (k) => { renderer.toneMappingExposure = lerp(e0, v, easeInOut(k)); });
    },
    forward() { return camera.getWorldDirection(fwd).clone(); },
  };

  /* ---------- build the room ---------- */
  const room = BUILD[kind](ctx);
  renderer.toneMappingExposure = room.exposure ?? 1;
  const eye = room.eye.clone();
  const eyeNow = eye.clone();
  let yaw = room.yaw, pitch = room.pitch, fovBase = room.fov;
  let vy = 0, vp = 0;

  // establishing move
  let introPos: { from: THREE.Vector3; fov0: number; t0: number; ms: number } | null = null;
  if (room.intro && !reduced) {
    const ms = room.intro.ms ?? 3600;
    introPos = { from: room.intro.from.clone(), fov0: room.intro.fov ?? room.fov, t0: performance.now(), ms };
    yaw = room.intro.yaw; pitch = room.intro.pitch;
    camTween = { y0: yaw, p0: pitch, y1: room.yaw, p1: room.pitch, t0: performance.now(), ms };
    eyeNow.copy(introPos.from); fovBase = introPos.fov0;
  }

  /* ---------- hotspot markers + hit volumes ---------- */
  const spots: Spot[] = copy.spots.map((c) => room.spots.find((s) => s.id === c.id)!);
  const found = spots.map(() => false);
  let nFound = 0, completed = false, finished = false;
  const markerGroup = new THREE.Group(); scene.add(markerGroup);
  const hitGroup = new THREE.Group(); scene.add(hitGroup);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const AMBER = new THREE.Color(0xf2a33a), PAPER = new THREE.Color(0xece4cf);
  const markers = spots.map((s, i) => {
    const g = new THREE.Group(); g.position.copy(s.pos); markerGroup.add(g);
    const mk = (tex: THREE.Texture, o: number) => {
      const m = new THREE.SpriteMaterial({ map: tex, color: AMBER.clone(), transparent: true, opacity: o, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
      const sp = new THREE.Sprite(m); sp.renderOrder = 20; g.add(sp); return sp;
    };
    const halo = mk(kit.glowTexture(), 0.5);
    const ring = mk(kit.ringTexture(), 0.9);
    const ring2 = mk(kit.ringTexture(), 0.9);
    const dot = mk(kit.dotTexture(), 1);
    const hg = Array.isArray(s.hit) ? new THREE.BoxGeometry(...s.hit) : new THREE.SphereGeometry(s.hit, 12, 8);
    const hm = new THREE.Mesh(hg, hitMat); hm.position.copy(s.hitPos ?? s.pos); hm.userData.i = i; hitGroup.add(hm);
    s.glow?.forEach((m) => { m.userData.baseEI = m.emissive.getHex() === 0 ? 0 : m.emissiveIntensity; if (m.emissive.getHex() === 0) { m.emissive.setHex(0xffb35c); m.emissiveIntensity = 0; } m.userData.hoverEI = 0; });
    return { g, halo, ring, ring2, dot, hm, hov: 0, pop: 0 };
  });
  const hitMeshes = markers.map((m) => m.hm);

  /* ---------- input: drag-to-look with inertia, hover, click ---------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = -1;
  let drag: { id: number; x: number; y: number; sx: number; sy: number; t0: number; lt: number; moved: boolean } | null = null;
  const keys = new Set<string>();

  function pick(cx: number, cy: number) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(hitMeshes, false);
    return hits.length ? (hits[0].object.userData.i as number) : -1;
  }
  function setHover(i: number, cx = 0, cy = 0) {
    if (i !== hovered) {
      hovered = i;
      root.classList.toggle('fp-hovering', i >= 0);
      if (i >= 0) {
        tipEl.innerHTML = `${found[i] ? '<i class="fp-tip-ok">✓</i>' : ''}${esc(copy.spots[i].label)}`;
        tipEl.classList.add('on');
      } else tipEl.classList.remove('on');
    }
    if (i >= 0) {
      const r = root.getBoundingClientRect();
      tipEl.style.transform = `translate(${Math.round(cx - r.left + 16)}px, ${Math.round(cy - r.top + 14)}px)`;
    }
  }
  const radPerPx = () => (camera.fov * Math.PI / 180) / Math.max(200, canvas.clientHeight) * 1.05;
  function nudge(dy: number, dp: number) {
    const [ya, yb] = room.yawRange, [pa, pb] = room.pitchRange;
    if ((yaw > yb && dy > 0) || (yaw < ya && dy < 0)) dy /= 1 + Math.max(yaw - yb, ya - yaw) * 14;
    if ((pitch > pb && dp > 0) || (pitch < pa && dp < 0)) dp /= 1 + Math.max(pitch - pb, pa - pitch) * 14;
    yaw += dy; pitch += dp;
  }
  on(canvas, 'pointerdown', (ev) => {
    const e = ev as PointerEvent;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (drag) return;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t0: performance.now(), lt: e.timeStamp, moved: false };
    vy = vp = 0; camTween = null;
    root.classList.add('fp-dragging');
  });
  on(canvas, 'pointermove', (ev) => {
    const e = ev as PointerEvent;
    if (drag && e.pointerId === drag.id) {
      const k = radPerPx();
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      const dts = Math.max(1, e.timeStamp - drag.lt) / 1000;
      drag.x = e.clientX; drag.y = e.clientY; drag.lt = e.timeStamp;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) { drag.moved = true; hideIntro(); setHover(-1); }
      if (drag.moved) {
        nudge(dx * k, dy * k);
        vy = lerp(vy, clamp((dx * k) / dts, -4, 4), 0.45);
        vp = lerp(vp, clamp((dy * k) / dts, -4, 4), 0.45);
      }
      return;
    }
    if (e.pointerType === 'mouse') setHover(pick(e.clientX, e.clientY), e.clientX, e.clientY);
  });
  const endDrag = (ev: Event) => {
    const e = ev as PointerEvent;
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    root.classList.remove('fp-dragging');
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (ev.type === 'pointerup' && !d.moved && performance.now() - d.t0 < 700) {
      vy = vp = 0;
      const i = pick(e.clientX, e.clientY);
      if (i >= 0) select(i, false);
    } else if (performance.now() - d.lt > 0 && e.timeStamp - d.lt > 80) { vy = vp = 0; }
  };
  on(canvas, 'pointerup', endDrag);
  on(canvas, 'pointercancel', endDrag);
  on(canvas, 'pointerleave', () => { if (!drag) setHover(-1); });
  on(canvas, 'contextmenu', (e) => e.preventDefault());

  on(window, 'keydown', (ev) => {
    const e = ev as KeyboardEvent;
    if (e.key === 'Escape') { e.preventDefault(); opts.onExit(); return; }
    if (e.key.startsWith('Arrow')) { e.preventDefault(); keys.add(e.key); camTween = null; hideIntro(); return; }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= total && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); select(n - 1, true); }
  });
  on(window, 'keyup', (ev) => { keys.delete((ev as KeyboardEvent).key); });
  on(window, 'blur', () => keys.clear());
  listBtns.forEach((b) => on(b, 'click', () => select(+b.dataset.i!, true)));
  capEl.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('button');
    if (!t) return;
    if (t.classList.contains('fp-cap-x')) hideCaption();
    else if (t.classList.contains('fp-cap-next')) finish();
  });
  doneEl.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('button');
    if (!t) return;
    if (t.dataset.act === 'back') opts.onExit();
    else if (t.dataset.act === 'stay') { doneEl.classList.remove('on'); later(() => { doneEl.hidden = true; }, 400); room.after?.(); canvas.focus?.(); }
  });

  /* ---------- discovering ---------- */
  let introHidden = false;
  function hideIntro() {
    if (introHidden) return; introHidden = true;
    root.classList.remove('fp-intro-on', 'fp-cine');
  }
  let revealTimer = 0, finishTimer = 0;
  function select(i: number, fromList: boolean) {
    if (i < 0 || i >= total || finished && !doneEl.hidden) return;
    hideIntro();
    const s = spots[i];
    clearTimeout(revealTimer); timers.delete(revealTimer);
    if (fromList) {
      ctx.lookAt(s.look ?? s.pos, 0.9);
      revealTimer = later(() => reveal(i), reduced ? 30 : 650);
    } else {
      if (s.look && !reduced) ctx.lookAt(s.look, 1.1);
      reveal(i);
    }
  }
  function reveal(i: number) {
    const first = !found[i];
    markers[i].pop = 1;
    if (first) {
      found[i] = true; nFound++;
      opts.sfx.chime();
      try { opts.onFound(nFound, total); } catch (e) { console.error(e); }
      spots[i].onFind?.();
      listBtns[i].classList.add('found');
      listBtns[i].setAttribute('aria-label', `${copy.spots[i].label}, found`);
      root.querySelectorAll('.fp-pips i')[nFound - 1]?.classList.add('on');
      countT.textContent = nFound === total ? `All ${total} found` : `${nFound} of ${total} found`;
      const c = $<HTMLElement>('.fp-count'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
      if (hovered === i) { hovered = -2; }
    }
    spots[i].onShow?.();
    listBtns.forEach((b, j) => b.classList.toggle('current', j === i));
    showCaption(i);
    if (first && nFound === total && !completed) {
      completed = true;
      try { opts.onComplete(); } catch (e) { console.error(e); }
      const c = copy.spots[i];
      const chars = (c.body ?? []).join(' ').length + (c.lines ?? []).join(' ').length + (c.voice ?? '').length;
      finishTimer = later(finish, (reduced ? 5000 : 6500) + chars * 55);
    }
  }
  function showCaption(i: number) {
    const c: SpotCopy = copy.spots[i];
    const step = reduced ? 0 : 34;
    let d = reduced ? 0 : 120;
    let html = `<div class="fp-cap-k"><span>${i + 1} / ${total}</span>${esc(c.label)}</div>`;
    const [th, d1] = words(c.title, d, step * 1.6); d = d1 + (reduced ? 0 : 120);
    html += `<h3 class="fp-cap-t">${th}</h3>`;
    for (const p of c.body ?? []) { const [ph, d2] = words(p, d, step); d = d2 + (reduced ? 0 : 160); html += `<p class="fp-cap-p">${ph}</p>`; }
    if (c.lines) {
      d += reduced ? 0 : (kind === 'bedroom' ? 1900 : 300);
      html += `<blockquote class="fp-cap-q">${c.lines.map((l) => { const s = `<span class="fp-line${l === '…' ? ' fp-ellipsis' : ''}" style="--d:${Math.round(d)}ms">${esc(l)}</span>`; d += reduced ? 0 : (l === '…' ? 1300 : 1500); return s; }).join('')}</blockquote>`;
    }
    if (c.cite) { html += `<cite class="fp-cap-c" style="--d:${Math.round(d)}ms">${esc(c.cite)}</cite>`; d += reduced ? 0 : 300; }
    if (c.voice) html += `<div class="fp-cap-v" style="--d:${Math.round(d + (reduced ? 0 : 200))}ms"><small>Inner voice</small><p>${esc(c.voice)}</p></div>`;
    if (completed && !finished) html += `<button type="button" class="fp-cap-next" style="--d:${Math.round(d + 300)}ms">${kind === 'compartment' ? 'Continue' : 'Finish'} <span aria-hidden="true">›</span></button>`;
    html += `<button type="button" class="fp-cap-x" aria-label="Close caption">×</button>`;
    capEl.innerHTML = `<div class="fp-cap-in">${html}</div>`;
    capEl.hidden = false;
    capEl.classList.remove('on'); void capEl.offsetWidth; capEl.classList.add('on');
  }
  function hideCaption() {
    capEl.classList.remove('on');
    listBtns.forEach((b) => b.classList.remove('current'));
    later(() => { if (!capEl.classList.contains('on')) capEl.hidden = true; }, 350);
  }
  async function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(finishTimer);
    hideCaption();
    root.classList.add('fp-finale');
    if (room.finale) await room.finale();
    if (disposed) return;
    showDone();
  }
  function showDone() {
    const d = copy.done;
    const name = ctx.visitor;
    let personal = '';
    if (kind === 'bedroom') personal = `<p class="fp-done-q">${name ? `${esc(name)}, who gave you your name?` : 'Who gave you your name?'}</p>`;
    doneEl.innerHTML = `<div class="fp-done-in">
      <div class="fp-done-k"><span class="fp-done-stamp" aria-hidden="true">✓</span>All ${total} found <i>·</i> ${esc(d.kicker)}</div>
      <h2 class="fp-done-t" id="fpDoneT">${esc(d.title)}</h2>
      <p class="fp-done-p">${esc(d.text)}</p>
      ${d.voice ? `<p class="fp-done-v"><small>Inner voice</small>${esc(d.voice)}</p>` : ''}
      ${personal}
      <div class="fp-done-b"><button type="button" class="fp-btn" data-act="back">Back to the line</button><button type="button" class="fp-btn ghost" data-act="stay">Keep looking</button></div>
    </div>`;
    doneEl.hidden = false;
    void doneEl.offsetWidth;
    doneEl.classList.add('on');
    later(() => (doneEl.querySelector('[data-act="back"]') as HTMLButtonElement | null)?.focus({ preventScroll: true }), 450);
  }

  /* ---------- resize ---------- */
  function resize() {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    root.classList.toggle('fp-narrow', w < 760);
  }
  const ro = new ResizeObserver(() => resize());
  ro.observe(container);
  resize();

  /* ---------- frame loop ---------- */
  let raf = 0, last = performance.now(), t = 0, started = false;
  let slow = 0, fast = 0;
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const rawDt = (now - last) / 1000; last = now;
    const dt = Math.min(0.05, Math.max(0, rawDt));
    t += dt;

    // adaptive resolution for weak GPUs
    if (!hq && rawDt > 0 && rawDt < 0.5) {
      if (rawDt > 0.034) { slow++; fast = 0; } else if (rawDt < 0.019) { fast++; slow = Math.max(0, slow - 1); }
      if (slow > 25 && pixelRatio > 0.75) { pixelRatio = Math.max(0.75, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); resize(); slow = 0; }
    }

    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i]; const k = clamp((now - a.t0) / a.ms, 0, 1);
      a.fn(k); if (k >= 1) { anims.splice(i, 1); a.done?.(); }
    }

    // establishing move
    if (introPos) {
      const k = easeInOut((now - introPos.t0) / introPos.ms);
      eyeNow.lerpVectors(introPos.from, eye, k);
      fovBase = lerp(introPos.fov0, room.fov, k);
      if (k >= 1) introPos = null;
    } else { eyeNow.copy(eye); fovBase = room.fov; }

    // look controls
    if (camTween) {
      const k = easeInOut((now - camTween.t0) / camTween.ms);
      yaw = lerp(camTween.y0, camTween.y1, k); pitch = lerp(camTween.p0, camTween.p1, k);
      if (k >= 1) camTween = null;
    } else if (!drag) {
      const ky = (keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0);
      const kp = (keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0);
      if (ky) vy = lerp(vy, ky * 1.4, 1 - Math.exp(-8 * dt));
      if (kp) vp = lerp(vp, kp * 1.0, 1 - Math.exp(-8 * dt));
      nudge(vy * dt, vp * dt);
      const damp = Math.exp(-(ky || kp ? 1.5 : 4.2) * dt);
      vy *= damp; vp *= damp;
      const [ya, yb] = room.yawRange, [pa, pb] = room.pitchRange;
      const sp = 1 - Math.exp(-9 * dt);
      if (yaw > yb) { yaw = lerp(yaw, yb, sp); vy = Math.min(vy, 0); } else if (yaw < ya) { yaw = lerp(yaw, ya, sp); vy = Math.max(vy, 0); }
      if (pitch > pb) { pitch = lerp(pitch, pb, sp); vp = Math.min(vp, 0); } else if (pitch < pa) { pitch = lerp(pitch, pa, sp); vp = Math.max(vp, 0); }
    }

    room.update(t, dt);

    // camera: breathing, room sway, shake
    const bob = reduced ? 0 : (room.bob ?? 1);
    camera.position.copy(eyeNow);
    camera.position.y += Math.sin(t * 1.35) * 0.006 * bob;
    camera.position.x += Math.sin(t * 0.61) * 0.003 * bob;
    let r = 0, py = 0, pp = 0;
    if (room.sway && !reduced) { camera.position.add(room.sway.pos); r = room.sway.roll; py = room.sway.yaw; pp = room.sway.pitch; }
    else if (room.sway) r = room.sway.roll * (Math.abs(room.sway.roll) > 0.05 ? 1 : 0);
    if (shakeAmt > 0.001) {
      const s = shakeAmt * shakeAmt;
      py += (Math.random() - 0.5) * 0.05 * s; pp += (Math.random() - 0.5) * 0.05 * s; r += (Math.random() - 0.5) * 0.06 * s;
      camera.position.x += (Math.random() - 0.5) * 0.05 * s; camera.position.y += (Math.random() - 0.5) * 0.04 * s;
      shakeAmt *= Math.exp(-2.4 * dt);
    }
    camera.rotation.set(pitch + pp + Math.sin(t * 1.35 + 1) * 0.002 * bob, yaw + py, r);
    // keep the horizontal field of view usable on portrait phones
    const hMin = 58 * Math.PI / 180;
    const vNeeded = 2 * Math.atan(Math.tan(hMin / 2) / camera.aspect) * 180 / Math.PI;
    const fov = clamp(Math.max(fovBase, vNeeded), 20, 88);
    if (Math.abs(fov - camera.fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }

    // markers
    const fovK = camera.fov / 60;
    markers.forEach((m, i) => {
      m.g.position.copy(spots[i].pos); m.hm.position.copy(spots[i].hitPos ?? spots[i].pos);
      const d = camera.position.distanceTo(m.g.position);
      const base = d * 0.032 * fovK;
      const h = hovered === i ? 1 : 0;
      m.hov = lerp(m.hov, h, 1 - Math.exp(-12 * dt));
      m.pop = Math.max(0, m.pop - dt * 1.6);
      const f = found[i];
      const ph = (t * 0.55 + i * 0.27) % 1, ph2 = (ph + 0.5) % 1;
      const col = f ? PAPER : AMBER;
      [m.halo, m.ring, m.ring2, m.dot].forEach((s) => (s.material as THREE.SpriteMaterial).color.copy(col));
      m.dot.scale.setScalar(base * (f ? 0.55 : 0.8) * (1 + m.hov * 0.45 + m.pop * 0.8));
      (m.dot.material as THREE.SpriteMaterial).opacity = f ? 0.45 + m.hov * 0.5 : 0.95;
      m.halo.scale.setScalar(base * (f ? 1.6 : 3.2 + Math.sin(t * 2.4 + i) * 0.4) * (1 + m.hov * 0.5));
      (m.halo.material as THREE.SpriteMaterial).opacity = f ? 0.12 + m.hov * 0.2 : 0.42 + m.hov * 0.3;
      const pulse = !f && !reduced;
      m.ring.visible = pulse || m.hov > 0.05; m.ring2.visible = pulse;
      if (pulse) {
        m.ring.scale.setScalar(base * (0.9 + ph * 2.4)); (m.ring.material as THREE.SpriteMaterial).opacity = (1 - ph) * 0.85;
        m.ring2.scale.setScalar(base * (0.9 + ph2 * 2.4)); (m.ring2.material as THREE.SpriteMaterial).opacity = (1 - ph2) * 0.85;
      } else {
        m.ring.scale.setScalar(base * (1.5 + m.hov * 0.4)); (m.ring.material as THREE.SpriteMaterial).opacity = m.hov * 0.8;
      }
      // hover glow on the real object
      spots[i].glow?.forEach((mat) => { mat.emissiveIntensity = (mat.userData.baseEI ?? 0) + m.hov * 0.55 + (f ? 0 : 0.12 + Math.sin(t * 2.4 + i) * 0.08); });
    });

    renderer.render(scene, camera);
  }

  /* ---------- start once shaders are compiled (avoids a frozen first second on weak GPUs) ---------- */
  function start() {
    if (started || disposed) return;
    started = true;
    const now = performance.now();
    if (introPos) introPos.t0 = now;
    if (camTween) camTween.t0 = now;
    last = now;
    raf = requestAnimationFrame(frame);
    root.classList.add('fp-live');
    later(() => root.classList.add('fp-ui-on'), reduced ? 0 : 600);
    later(() => hideIntro(), (room.intro?.ms ?? 3600) + (reduced ? 1800 : 700));
  }
  later(() => root.classList.add('fp-intro-on'), reduced ? 0 : 150);
  const compiled = renderer.extensions.has('KHR_parallel_shader_compile') ? renderer.compileAsync(scene, camera).catch(() => undefined) : Promise.resolve();
  Promise.race([compiled, new Promise<void>((res) => { later(res, 2500); })]).then(() => later(start, 0));

  /* ---------- intro card + fonts ---------- */
  root.focus({ preventScroll: true });
  if (document.fonts) {
    const f = kit.fonts;
    Promise.all([`64px ${f.display}`, `32px ${f.body}`, `32px ${f.mono}`, `64px ${f.hand}`].map((s) => document.fonts.load(s).catch(() => [])))
      .then(() => { if (!disposed) kit.refreshText(); });
  }

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      timers.forEach((id) => clearTimeout(id)); timers.clear();
      ro.disconnect();
      offs.forEach((off) => off());
      disposeTree(scene, kit.textures);
      hitMat.dispose();
      disposeSharedGeometry();
      renderer.dispose();
      renderer.forceContextLoss();
      container.innerHTML = '';
    },
  };

  /* ---------- no WebGL: a readable list of every caption ---------- */
  function fallback() {
    const items = copy.spots.map((c, i) => `<li><div class="fp-cap-k"><span>${i + 1} / ${total}</span>${esc(c.label)}</div>
      <h3 class="fp-cap-t">${esc(c.title)}</h3>${(c.body ?? []).map((p) => `<p class="fp-cap-p">${esc(p)}</p>`).join('')}
      ${c.lines ? `<blockquote class="fp-cap-q">${c.lines.map((l) => `<span class="fp-line">${esc(l)}</span>`).join('')}</blockquote>` : ''}
      ${c.cite ? `<cite class="fp-cap-c">${esc(c.cite)}</cite>` : ''}
      ${c.voice ? `<div class="fp-cap-v"><small>Inner voice</small><p>${esc(c.voice)}</p></div>` : ''}</li>`).join('');
    root.classList.remove('fp-cine');
    root.classList.add('fp-fallback-on', 'fp-ui-on');
    const fb = document.createElement('div');
    fb.className = 'fp-fallback';
    fb.innerHTML = `<div class="fp-fb-in">
      <div class="fp-fb-k">${esc(station.year)} <i>·</i> ${esc(info.title)}</div>
      <h2 class="fp-fb-t">${esc(station.title)}</h2>
      <p class="fp-fb-note">This view can’t load on this device, so here is everything you would find inside.</p>
      <ol class="fp-fb-list">${items}</ol>
      <p class="fp-done-p">${esc(copy.done.text)}</p>
      <div class="fp-done-b"><button type="button" class="fp-btn" data-act="back">Back to the line</button></div>
    </div>`;
    root.querySelectorAll('.fp-canvas, .fp-list, .fp-count, .fp-intro').forEach((n) => n.remove());
    root.appendChild(fb);
    const back = fb.querySelector('[data-act="back"]') as HTMLButtonElement;
    const done = () => {
      if (!completed) { completed = true; try { opts.onFound(total, total); opts.onComplete(); } catch (e) { console.error(e); } }
      opts.onExit();
    };
    let completed = false;
    on(back, 'click', done);
    on(window, 'keydown', (ev) => { if ((ev as KeyboardEvent).key === 'Escape') { ev.preventDefault(); opts.onExit(); } });
    back.focus({ preventScroll: true });
    return {
      dispose() {
        if (disposed) return;
        disposed = true;
        timers.forEach((id) => clearTimeout(id));
        offs.forEach((off) => off());
        container.innerHTML = '';
      },
    };
  }
}
