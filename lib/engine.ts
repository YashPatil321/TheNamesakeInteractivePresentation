// @ts-nocheck -- the canvas + DOM engine, ported from the original single-file page.
// Story content and types live in lib/stations.ts; this file animates and wires the UI.
import { STATIONS, NAME_COLORS, TAG_COLORS, TAG_NAMES, QUIZ, START, NIKHIL_AT, FP_INFO } from './stations';
import { createWorld } from './world3d';
import { filmBadge, animBadge, railMarks, GROUP_CREDIT } from './media';
import choicesMod from './cards/choices';
import nowMod from './cards/now';
import archiveMod from './cards/archive';
import { createMusic } from './music';

export const CHANNEL = 'namesake-line';

/** Mounts the experience into `root` (the .app element). Returns a cleanup function. */
export function startLine(root) {
  let disposed = false, rafId = 0;
  const offs = [];
  const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); offs.push(() => target.removeEventListener(type, fn, opts)); };

  
  const SP = 1000;          // world px between stations
  
  /* ---------- helpers ---------- */
  const $ = (s) => root.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
  const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const store = { get(k, d) { try { const v = localStorage.getItem('namesake.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
                  set(k, v) { try { localStorage.setItem('namesake.' + k, JSON.stringify(v)); } catch (e) {} } };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  /* ---------- state ---------- */
  const st = {
    cur: START, trainX: START * SP, camX: 0, moving: false, from: 0, to: 0, t0: 0, dur: 1, target: START,
    visited: new Set(), lens: 'gogol', lensUnlocked: false, tab: 'story', crashT: -1, crashDone: false, derail: 0,
    gray: 0, shake: 0, speed: 0, polls: {}, revealed: {}, visitor: '', started: false, analysis: false, letterClicks: 0,
    done: {}, certWaits: 0, certDraft: '', quizBest: null,
  };
  /* pointer parallax: -1..1, eased toward the target each frame */
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  on(window, 'pointermove', (e) => {
    if (e.pointerType !== 'mouse' || reduced) return;
    par.tx = e.clientX / window.innerWidth * 2 - 1; par.ty = e.clientY / window.innerHeight * 2 - 1;
  });
  
  /* =========================================================
     SOUND — tiny synth, no audio files needed
     ========================================================= */
  const snd = {
    ctx: null, on: store.get('sound', true), rumble: null, rumbleGain: null, nextClack: 0,
    init() {
      if (this.ctx) return;
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
      const c = this.ctx, len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 140;
      this.rumbleGain = c.createGain(); this.rumbleGain.gain.value = 0;
      src.connect(lp).connect(this.rumbleGain).connect(c.destination); src.start();
    },
    env(node, t, a, peak, dec) { node.gain.setValueAtTime(0.0001, t); node.gain.exponentialRampToValueAtTime(peak, t + a); node.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); },
    noiseBurst(freq, q, peak, dec, delay = 0) {
      if (!this.ok()) return; const c = this.ctx, t = c.currentTime + delay;
      const s = c.createBufferSource(); s.buffer = this.noise; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain(); this.env(g, t, .004, peak, dec); s.connect(f).connect(g).connect(c.destination); s.start(t, Math.random()); s.stop(t + dec + .1);
    },
    ok() { return this.on && this.ctx && this.ctx.state === 'running'; },
    whistle() {
      if (!this.ok()) return; const c = this.ctx, t = c.currentTime;
      [523, 659, 784].forEach((f, i) => { const o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(f * .97, t); o.frequency.linearRampToValueAtTime(f, t + .15);
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.05, t + .08); g.gain.setValueAtTime(.05, t + .7); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
        o.connect(g).connect(c.destination); o.start(t); o.stop(t + 1.2); });
      this.noiseBurst(2500, 1.5, .03, 1.0);
    },
    clack() { this.noiseBurst(1800, 4, .12, .05); this.noiseBurst(1400, 4, .09, .05, .09); },
    boom() {
      if (!this.ok()) return; const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.2);
      const g = c.createGain(); this.env(g, t, .01, .6, 1.4); o.connect(g).connect(c.destination); o.start(t); o.stop(t + 1.6);
      this.noiseBurst(400, .5, .5, 1.6); this.noiseBurst(3000, .8, .2, .5, .05);
    },
    /** a gain envelope wired to the output: attack, hold, exponential release */
    _g(peak, a, hold, rel, delay = 0) {
      const c = this.ctx, t = c.currentTime + delay, g = c.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
      g.connect(c.destination); return g;
    },
    _noise(t, dur, filterType, freq, q, dest) {
      const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
      const f = c.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
      s.connect(f).connect(dest); s.start(t, Math.random()); s.stop(t + dur); return f;
    },
    /** brakes locking: a shrieking, wavering metal squeal */
    screech() {
      if (!this.ok()) return; const c = this.ctx, t = c.currentTime;
      const g = this._g(.05, .06, .25, .5);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(3400, t); bp.frequency.linearRampToValueAtTime(2300, t + .8); bp.Q.value = 4; bp.connect(g);
      [2890, 3420, 4170].forEach((f, i) => {
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * .8, t + .85);
        const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 11 + i * 4; lg.gain.value = f * .025; l.connect(lg).connect(o.frequency);
        o.connect(bp); o.start(t); o.stop(t + .9); l.start(t); l.stop(t + .9);
      });
      const ng = this._g(.06, .04, .3, .5); this._noise(t, 1, 'bandpass', 4200, 5, ng);
    },
    /** the impact: sub-bass hit, a long rumble, crunching metal, a struck-iron clang */
    crash() {
      if (!this.ok()) return; const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(75, t); o.frequency.exponentialRampToValueAtTime(24, t + 2.6);
      const g = this._g(.55, .01, .1, 2.6); o.connect(g); o.start(t); o.stop(t + 2.9);
      const rg = this._g(.42, .02, .6, 2.4); this._noise(t, 3.2, 'lowpass', 320, .7, rg);
      for (let k = 0; k < 11; k++) this.noiseBurst(260 + Math.random() * 1400, 1.3, .12 + Math.random() * .12, .08 + Math.random() * .16, .02 + Math.random() * 1.0);
      [311, 523, 797, 1231, 1873].forEach((f, i) => { const oo = c.createOscillator(); oo.type = 'sine'; oo.frequency.value = f * (1 + (Math.random() - .5) * .02); const gg = this._g(.035 / (1 + i * .3), .005, 0, 1.8 - i * .2, .03); oo.connect(gg); oo.start(t); oo.stop(t + 2.2); });
    },
    /** the cars landing, one after another, at full speed */
    crunch() {
      if (!this.ok()) return; const c = this.ctx;
      [0, .38, .85, 1.2].forEach((d, i) => {
        const t = c.currentTime + d, o = c.createOscillator(); o.frequency.setValueAtTime(95 - i * 10, t); o.frequency.exponentialRampToValueAtTime(32, t + .45);
        const g = this._g(.4 - i * .07, .006, 0, .5, d); o.connect(g); o.start(t); o.stop(t + .6);
        this.noiseBurst(500 + Math.random() * 500, .8, .22 - i * .03, .35, d);
        for (let k = 0; k < 4; k++) this.noiseBurst(900 + Math.random() * 2400, 2, .05, .06 + Math.random() * .1, d + Math.random() * .3);
      });
      // a long groan of bending steel
      const t = c.currentTime + .3, o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(62, t); o.frequency.linearRampToValueAtTime(41, t + 2.2);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; const g = this._g(.05, .3, .8, 1.2, .3); o.connect(lp).connect(g); o.start(t); o.stop(t + 2.6);
    },
    glass() {
      if (!this.ok()) return;
      for (let k = 0; k < 16; k++) this.noiseBurst(4500 + Math.random() * 5000, 9, .025 + Math.random() * .04, .04 + Math.random() * .14, Math.random() * 1.1);
      const c = this.ctx;
      for (let k = 0; k < 5; k++) { const d = Math.random() * 1.2, t = c.currentTime + d, o = c.createOscillator(); o.frequency.value = 2600 + Math.random() * 3200; const g = this._g(.012, .002, 0, .25, d); o.connect(g); o.start(t); o.stop(t + .35); }
    },
    /** the quiet after: steam hissing away, a low wind, and crickets */
    aftermath(dur) {
      if (!this.ok()) return; const c = this.ctx, t = c.currentTime;
      const hg = this._g(.03, .3, .5, 4); this._noise(t, 5, 'highpass', 2600, .5, hg);
      const wg = this._g(.035, 1.2, Math.max(.1, dur - 2.5), 1.2); this._noise(t, dur + .2, 'lowpass', 380, .6, wg);
      [4350, 4720].forEach((f, j) => {
        const o = c.createOscillator(); o.frequency.value = f; const g = c.createGain(); g.gain.value = 0; o.connect(g).connect(c.destination);
        let tt = t + .8 + j * .37;
        while (tt < t + dur - .3) {
          for (let p = 0; p < 3; p++) { const a = tt + p * .055; g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(.009, a + .008); g.gain.linearRampToValueAtTime(0, a + .03); }
          tt += .75 + Math.random() * .5 + j * .15;
        }
        o.start(t); o.stop(t + dur);
      });
    },
    /** the lantern finds the page: three soft, low notes */
    find() {
      if (!this.ok()) return; const c = this.ctx, t = c.currentTime;
      [[220, 0], [329.6, .55], [277.2, 1.3]].forEach(([f, d]) => {
        const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
        const g = this._g(.045, .35, .4, 2.6, d); o.connect(lp).connect(g); o.start(t + d); o.stop(t + d + 3.5);
      });
    },
    thump() { if (!this.ok()) return; const c = this.ctx, t = c.currentTime; const o = c.createOscillator(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(40, t + .2);
      const g = c.createGain(); this.env(g, t, .005, .5, .25); o.connect(g).connect(c.destination); o.start(t); o.stop(t + .4); this.noiseBurst(800, 1, .2, .12); },
    chime() { if (!this.ok()) return; const c = this.ctx, t = c.currentTime;
      [659, 988, 1319].forEach((f, i) => { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = c.createGain(); this.env(g, t + i * .12, .01, .06, 1.6); o.connect(g).connect(c.destination); o.start(t + i * .12); o.stop(t + i * .12 + 1.8); }); },
    ring() {
      if (!this.ok()) return; const c = this.ctx, t = c.currentTime;
      [0, .5].forEach((off) => {
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, t + off); g.gain.exponentialRampToValueAtTime(.05, t + off + .02);
        g.gain.setValueAtTime(.05, t + off + .36); g.gain.exponentialRampToValueAtTime(0.0001, t + off + .42); g.connect(c.destination);
        [440, 480].forEach((f) => { const o = c.createOscillator(); o.frequency.value = f; o.connect(g); o.start(t + off); o.stop(t + off + .45); });
      });
    },
    cry() {
      if (!this.ok()) return; const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(420, t); o.frequency.linearRampToValueAtTime(640, t + .25); o.frequency.linearRampToValueAtTime(380, t + 1.1);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
      const g = c.createGain(); this.env(g, t, .05, .06, 1.1); o.connect(lp).connect(g).connect(c.destination); o.start(t); o.stop(t + 1.3);
    },
    tick(now, speed) {
      if (!this.ctx) return;
      if (this.rumbleGain) this.rumbleGain.gain.setTargetAtTime(this.on ? clamp(speed, 0, 1) * .25 : 0, this.ctx.currentTime, .15);
      if (speed > .05 && now > this.nextClack) { this.clack(); this.nextClack = now + lerp(700, 260, clamp(speed, 0, 1)); }
    },
  };
  
  /* =========================================================
     CANVAS SCENE
     ========================================================= */
  const cv = $('#scene'), ctx = cv.getContext('2d');
  // next/font gives hashed family names; resolve them from the CSS variables for canvas text
  const FONT = { display: 'Georgia, serif', mono: 'monospace', body: 'Georgia, serif' };
  function readFonts() { const cs = getComputedStyle(root); for (const k of ['display', 'mono', 'body']) FONT[k] = cs.getPropertyValue('--' + k).trim() || FONT[k]; }
  /* ---------- WORLD3D HOOKS: the Three.js world (lib/world3d.ts); the 2D canvas is the fallback ---------- */
  const cv3 = $('#scene3d');
  let world = null;
  try { world = createWorld(cv3, { stations: STATIONS, reduced, fonts: () => ({ display: FONT.display, mono: FONT.mono }) }); }
  catch (e) { console.warn('3D world unavailable, using the 2D scene', e); world = null; }
  cv3.hidden = !world; cv.hidden = !!world;
  const view = world ? cv3 : cv; // the canvas people see and click
  /* ---------- end WORLD3D HOOKS ---------- */
  let W = 0, H = 0, DPR = 1, S = 1, groundY = 0, anchor = 0;
  const F_FAR = 0.45, TILE = SP * F_FAR, SPAN = 1100;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const narrow = W < 760;
    S = clamp(Math.min(H / 900, W / 1100), .5, 1.15);
    if (narrow) S = clamp(W / 700, .5, .8);
    groundY = narrow ? H * .36 : H * .83;
    // Park the loco in the free space right of the ticket card: the rear car (~440*S behind the loco centre)
    // clears the card, and the nose + headlight (~115*S ahead) keep a margin for camera lag on long rides.
    // When both can't fit, the loco and its station sign win over the rear car.
    const cardR = Math.min(40, Math.max(16, W * .03)) + Math.min(470, W - 32);
    const lo = cardR + 440 * S + 24, hi = W - 115 * S - Math.max(120, W * .12);
    anchor = narrow ? W * .56 : (lo <= hi ? clamp(W * .62, lo, hi) : Math.max(hi, cardR + 280 * S));
    if (world) world.resize();
  }
  
  /* skyline generation per region */
  const SKY = STATIONS.map((s, i) => genSkyline(s.region, i * 97 + 13));
  function genSkyline(region, seed) {
    const r = rng(seed), items = [];
    let x = -SPAN;
    while (x < SPAN) {
      let w, h, it;
      switch (region) {
        case 'india': {
          const k = r();
          if (k < .18) { it = { k: 'palm', x, h: 70 + r() * 50 }; w = 26; }
          else if (k < .3) { w = 34 + r() * 20; h = 70 + r() * 70; it = { k: 'temple', x, w, h }; }
          else { w = 30 + r() * 44; h = 34 + r() * 70; it = { k: 'rect', x, w, h, dome: r() < .25, win: .4 }; }
          break; }
        case 'town': {
          const k = r();
          if (k < .1) { w = 26; h = 170 + r() * 50; it = { k: 'steeple', x, w, h }; }
          else { w = 40 + r() * 26; h = 60 + r() * 50; it = { k: 'rect', x, w, h, chimney: r() < .6, win: .5 }; }
          break; }
        case 'suburb': {
          const k = r();
          if (k < .35) { w = 34 + r() * 26; it = { k: 'tree', x, w, h: 80 + r() * 50 }; }
          else { w = 60 + r() * 28; h = 48 + r() * 22; it = { k: 'house', x, w, h, win: .7 }; }
          break; }
        case 'campus': {
          const k = r();
          if (k < .22) { w = 34; h = 150 + r() * 70; it = { k: 'gothic', x, w, h }; }
          else { w = 50 + r() * 40; h = 60 + r() * 50; it = { k: 'rect', x, w, h, win: .5, crenel: true }; }
          break; }
        case 'nyc': { w = 26 + r() * 40; h = 110 + r() * 230; it = { k: 'rect', x, w, h, win: .55, antenna: r() < .25 }; break; }
        case 'lake': { w = 16 + r() * 22; it = { k: 'pine', x, w, h: 50 + r() * 80 }; break; }
        case 'cleveland': {
          const k = r();
          if (k < .15) { w = 14; h = 130 + r() * 60; it = { k: 'stack', x, w, h }; }
          else { w = 40 + r() * 40; h = 60 + r() * 140; it = { k: 'rect', x, w, h, win: .35 }; }
          break; }
      }
      it.seed = Math.floor(r() * 1e6);
      items.push(it); x += w + (region === 'lake' ? -4 : 2 + r() * 10);
    }
    return items;
  }
  
  function drawSkyline(i, cx, base, col, winAlpha) {
    const items = SKY[i]; if (!items) return;
    ctx.fillStyle = col;
    for (const it of items) {
      const x = cx + it.x * S, w = (it.w || 20) * S, h = (it.h || 40) * S;
      if (x > W + 60 || x + w < -60) continue;
      ctx.fillStyle = col;
      switch (it.k) {
        case 'rect':
          ctx.fillRect(x, base - h, w, h);
          if (it.dome) { ctx.beginPath(); ctx.arc(x + w / 2, base - h, w * .32, Math.PI, 0); ctx.fill(); ctx.fillRect(x + w / 2 - 1, base - h - w * .32 - 8 * S, 2, 8 * S); }
          if (it.chimney) ctx.fillRect(x + w * .7, base - h - 12 * S, 7 * S, 12 * S);
          if (it.antenna) ctx.fillRect(x + w / 2 - 1, base - h - 30 * S, 2, 30 * S);
          if (it.crenel) for (let c = 0; c < w - 4; c += 10 * S) ctx.fillRect(x + c, base - h - 6 * S, 5 * S, 6 * S);
          if (winAlpha > .02) drawWindows(x, base - h, w, h, it.seed, it.win, winAlpha, col);
          break;
        case 'temple':
          ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - h * .45); ctx.quadraticCurveTo(x + w * .15, base - h, x + w / 2, base - h - 10 * S);
          ctx.quadraticCurveTo(x + w * .85, base - h, x + w, base - h * .45); ctx.lineTo(x + w, base); ctx.fill(); break;
        case 'palm': {
          ctx.strokeStyle = col; ctx.lineWidth = 4 * S; ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + 10 * S, base - h * .6, x + 6 * S, base - h); ctx.stroke();
          ctx.lineWidth = 3 * S; for (let a = 0; a < 6; a++) { const ang = -Math.PI + a * (Math.PI / 5); ctx.beginPath(); ctx.moveTo(x + 6 * S, base - h);
            ctx.quadraticCurveTo(x + 6 * S + Math.cos(ang) * 18 * S, base - h - 12 * S, x + 6 * S + Math.cos(ang) * 30 * S, base - h + Math.abs(Math.sin(ang)) * 6 * S + 10 * S); ctx.stroke(); }
          break; }
        case 'steeple':
          ctx.fillRect(x, base - h * .55, w, h * .55); ctx.beginPath(); ctx.moveTo(x - 2, base - h * .55); ctx.lineTo(x + w / 2, base - h); ctx.lineTo(x + w + 2, base - h * .55); ctx.fill(); break;
        case 'house':
          ctx.fillRect(x, base - h, w, h); ctx.beginPath(); ctx.moveTo(x - 4 * S, base - h); ctx.lineTo(x + w / 2, base - h - 22 * S); ctx.lineTo(x + w + 4 * S, base - h); ctx.fill();
          if (winAlpha > .02) { const rr = rng(it.seed); ctx.fillStyle = `rgba(255,205,120,${winAlpha * (rr() < it.win ? .9 : .15)})`; ctx.fillRect(x + w * .2, base - h * .7, w * .18, h * .35);
            ctx.fillStyle = `rgba(255,205,120,${winAlpha * (rr() < it.win ? .9 : .15)})`; ctx.fillRect(x + w * .62, base - h * .7, w * .18, h * .35); }
          break;
        case 'tree': ctx.beginPath(); ctx.arc(x + w / 2, base - h + w / 2, w / 2, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x + w / 2 - 2 * S, base - h + w / 2, 4 * S, h - w / 2); break;
        case 'pine': ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x + w / 2, base - h); ctx.lineTo(x + w, base); ctx.fill(); break;
        case 'gothic':
          ctx.fillRect(x, base - h * .7, w, h * .7); for (let c = 0; c < 4; c++) { const px = x + c * (w / 3) - 2; ctx.beginPath(); ctx.moveTo(px, base - h * .7); ctx.lineTo(px + 2, base - h * .9); ctx.lineTo(px + 4, base - h * .7); ctx.fill(); }
          ctx.beginPath(); ctx.moveTo(x + 4, base - h * .7); ctx.lineTo(x + w / 2, base - h); ctx.lineTo(x + w - 4, base - h * .7); ctx.fill(); break;
        case 'stack':
          ctx.fillRect(x, base - h, w, h); break;
      }
    }
  }
  function drawWindows(x, y, w, h, seed, p, a, col) {
    const r = rng(seed), cw = 5 * S, ch = 6 * S, gx = 10 * S, gy = 12 * S;
    for (let yy = y + 8 * S; yy < y + h - 10 * S; yy += gy) for (let xx = x + 5 * S; xx < x + w - 8 * S; xx += gx) {
      if (r() < p) { ctx.fillStyle = `rgba(255,208,130,${a * (.5 + r() * .5)})`; ctx.fillRect(xx, yy, cw, ch); }
    }
  }
  
  /* particles */
  const stars = Array.from({ length: 170 }, () => ({ x: Math.random(), y: Math.random() * .7, r: Math.random() * 1.3 + .2, p: Math.random() * 6 }));
  const smoke = [];
  const flakes = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * .6 + .4, d: Math.random() * 6 }));
  const drops = Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * .5 + .6 }));
  let snowAmt = 0, rainAmt = 0;
  
  function stationPos() { return st.trainX / SP; }
  function skyAt(p) {
    const i = clamp(Math.floor(p), 0, STATIONS.length - 1), j = clamp(i + 1, 0, STATIONS.length - 1), t = clamp(p - i, 0, 1);
    const a = STATIONS[i].sky, b = STATIONS[j].sky;
    return [mix(hex(a[0]), hex(b[0]), t), mix(hex(a[1]), hex(b[1]), t)];
  }
  const lum = (c) => (c[0] * .3 + c[1] * .59 + c[2] * .11) / 255;
  
  function trainDims() { return { loco: 190 * S, car: 160 * S, gap: 12 * S, wheel: 17 * S }; }
  
  function draw(now) {
    const p = stationPos();
    const [top, bot] = skyAt(p);
    const dark = clamp(1 - lum(bot) * 1.3, 0, 1);
    let sx = 0, sy = 0;
    if (st.shake > 0 && !reduced) { sx = (Math.random() - .5) * st.shake * 22; sy = (Math.random() - .5) * st.shake * 14; }
    ctx.save(); ctx.translate(sx, sy);
  
    // sky
    const g = ctx.createLinearGradient(0, 0, 0, groundY);
    g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(bot));
    ctx.fillStyle = g; ctx.fillRect(-30, -30, W + 60, groundY + 40);
  
    // stars
    if (dark > .3) for (const s of stars) {
      const x = ((s.x * W * 1.5 - st.camX * .04 - par.x * 6) % (W * 1.5) + W * 1.5) % (W * 1.5) - W * .25;
      ctx.fillStyle = `rgba(255,255,240,${(dark - .3) * (.5 + .5 * Math.sin(now / 900 + s.p))})`;
      ctx.fillRect(x, s.y * groundY, s.r, s.r);
    }
    // moon / sun
    const mx = W * .82 - (st.camX * .02) % 60 - par.x * 10, my = groundY * .22 - par.y * 6;
    ctx.fillStyle = dark > .45 ? `rgba(250,244,220,${dark})` : `rgba(255,230,170,${.75 - dark})`;
    ctx.beginPath(); ctx.arc(mx, my, 26 * S + 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgb(bot, .12); ctx.beginPath(); ctx.arc(mx, my, 70 * S + 20, 0, Math.PI * 2); ctx.fill();
  
    // far skyline (parallax)
    const farCol = rgb(mix(bot, [8, 10, 20], .72));
    const base = groundY - 18 * S;
    const offFar = anchor * (1 - F_FAR) - par.x * 16;
    const i0 = clamp(Math.floor(p), 0, STATIONS.length - 1), i1 = clamp(i0 + 1, 0, STATIONS.length - 1), ft = clamp(p - i0, 0, 1);
    for (const [i, a] of [[i0, 1 - ft], [i1, ft]]) {
      if (a < .01 || (i === i1 && i1 === i0)) continue;
      ctx.globalAlpha = a;
      drawSkyline(i, i * TILE - st.camX * F_FAR + offFar, base, farCol, dark);
    }
    ctx.globalAlpha = 1;
    // lake water for lake region
    // mid hills
    const midCol = rgb(mix(bot, [6, 8, 16], .84));
    ctx.fillStyle = midCol; ctx.beginPath(); ctx.moveTo(-30, groundY);
    for (let x = -30; x <= W + 30; x += 12) { const wx = x + st.camX * .75 + par.x * 8; ctx.lineTo(x, groundY - 14 * S - (Math.sin(wx / 210) * 10 + Math.sin(wx / 83) * 5 + 10) * S); }
    ctx.lineTo(W + 30, groundY); ctx.fill();
  
    // ground
    const gcol = mix(bot, [5, 6, 12], .9);
    ctx.fillStyle = rgb(gcol); ctx.fillRect(-30, groundY, W + 60, H - groundY + 40);
    // gravel bed
    ctx.fillStyle = rgb(mix(gcol, [120, 120, 130], .12)); ctx.fillRect(-30, groundY + 4 * S, W + 60, 14 * S);
  
    // telegraph poles + wires
    const poleSp = 260;
    ctx.strokeStyle = rgb(mix(gcol, [0, 0, 0], .3)); ctx.lineWidth = 3 * S;
    let prev = null;
    for (let k = Math.floor((st.camX - 100) / poleSp); k * poleSp < st.camX + W + 100; k++) {
      const x = k * poleSp - st.camX, py = groundY - 150 * S;
      ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x, py); ctx.moveTo(x - 12 * S, py + 8 * S); ctx.lineTo(x + 12 * S, py + 8 * S); ctx.stroke();
      if (prev != null) { ctx.save(); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(prev, py + 8 * S); ctx.quadraticCurveTo((prev + x) / 2, py + 26 * S, x, py + 8 * S); ctx.stroke(); ctx.restore(); }
      prev = x;
    }
  
    // stations (platform + sign)
    for (let i = 0; i < STATIONS.length; i++) drawStation(i, now, dark);
  
    // track
    drawTrack(now);
  
    // train
    drawTrain(now, dark);
  
    // smoke
    for (let k = smoke.length - 1; k >= 0; k--) {
      const s = smoke[k]; s.x += s.vx; s.y += s.vy; s.r += .35 * S; s.a -= .006;
      if (s.a <= 0) { smoke.splice(k, 1); continue; }
      ctx.fillStyle = `rgba(200,205,222,${s.a * .7})`; ctx.beginPath(); ctx.arc(s.x - st.camX, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
  
    // a small flock crosses the daytime sky; grass and fence posts rush past in front
    if (dark < .55 && !reduced) drawBirds(now, dark);
    drawForeground(now, gcol);

    // weather
    const want = STATIONS[clamp(Math.round(p), 0, STATIONS.length - 1)];
    snowAmt = lerp(snowAmt, want.snow ? 1 : 0, .02); rainAmt = lerp(rainAmt, want.rain ? 1 : 0, .02);
    if (snowAmt > .02) for (const f of flakes) {
      f.y += .0012 * f.s; if (f.y > 1) f.y = 0;
      const x = ((f.x * W + Math.sin(now / 1200 + f.d) * 20 - st.camX * .3 * f.s) % W + W) % W;
      ctx.fillStyle = `rgba(255,255,255,${.8 * snowAmt * f.s})`; ctx.beginPath(); ctx.arc(x, f.y * H, 2.2 * f.s, 0, Math.PI * 2); ctx.fill();
    }
    if (rainAmt > .02) { ctx.strokeStyle = `rgba(180,195,230,${.35 * rainAmt})`; ctx.lineWidth = 1; ctx.beginPath();
      for (const d of drops) { d.y += .018 * d.s; if (d.y > 1) d.y = 0; const x = ((d.x * W - st.camX * .2) % W + W) % W; ctx.moveTo(x, d.y * H); ctx.lineTo(x - 4, d.y * H + 16 * d.s); } ctx.stroke(); }
  
    // crash darkness + flashlight
    if (st.crashT >= 0) drawCrashLight(now);
  
    ctx.restore();
  }
  
  function drawBirds(now, dark) {
    const t = (now % 26000) / 26000, span = W + 300;
    ctx.strokeStyle = `rgba(20,22,34,${.55 * (1 - dark)})`; ctx.lineWidth = 1.6;
    for (let k = 0; k < 6; k++) {
      const bx = t * span - 150 - k * 26 + Math.sin(k * 3.1) * 14 - par.x * 12;
      const by = groundY * (.3 + .05 * Math.sin(k * 1.7)) + Math.sin(now / 700 + k) * 6, flap = Math.sin(now / 120 + k * 1.3) * 5;
      ctx.beginPath(); ctx.moveTo(bx - 7, by - flap); ctx.quadraticCurveTo(bx - 3, by - 3, bx, by); ctx.quadraticCurveTo(bx + 3, by - 3, bx + 7, by - flap); ctx.stroke();
    }
  }
  function drawForeground(now, gcol) {
    const fx = st.camX * 1.35, y = groundY + 34 * S, gap = 70;
    ctx.fillStyle = rgb(mix(gcol, [0, 0, 0], .5));
    ctx.fillRect(-10, y - 4 * S, W + 20, 2.5 * S);
    for (let k = Math.floor(fx / gap) - 1; k * gap < fx + W + gap; k++) {
      const x = k * gap - fx, h = (10 + rng(k * 7919 + 17)() * 16) * S, b = y + 20 * S;
      ctx.beginPath(); ctx.moveTo(x, b); ctx.lineTo(x + 3 * S, b - h); ctx.lineTo(x + 6 * S, b); ctx.lineTo(x + 9 * S, b - h * .7); ctx.lineTo(x + 12 * S, b); ctx.fill();
      if (k % 5 === 0) ctx.fillRect(x + 20 * S, y - 10 * S, 5 * S, 34 * S);
    }
    if (st.speed > .35 && !reduced) {
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(.12, (st.speed - .35) * .15)})`; ctx.lineWidth = 1; ctx.beginPath();
      for (let k = 0; k < 14; k++) { const r = rng(k * 131 + Math.floor(now / 90))(), yy = groundY - r * groundY * .6, xx = (r * 9973 + now * 1.5) % (W + 200) - 100; ctx.moveTo(xx, yy); ctx.lineTo(xx - 60 - r * 80, yy); }
      ctx.stroke();
    }
  }

  function drawStation(i, now, dark) {
    const x = i * SP - st.camX;
    if (x < -400 || x > W + 400) return;
    const s = STATIONS[i], col = NAME_COLORS[s.name];
    // platform
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 330 * S, groundY - 6 * S, 440 * S, 8 * S);
    ctx.fillStyle = rgb(mix(hex(s.sky[1]), [30, 30, 40], .6)); ctx.fillRect(x - 330 * S, groundY - 10 * S, 440 * S, 5 * S);
    // lamp posts
    for (const lx of [x - 300 * S, x + 90 * S]) {
      ctx.fillStyle = '#10131d'; ctx.fillRect(lx - 2, groundY - 120 * S, 4, 112 * S);
      const lg = ctx.createRadialGradient(lx, groundY - 122 * S, 2, lx, groundY - 122 * S, 60 * S);
      lg.addColorStop(0, `rgba(255,214,140,${.2 + dark * .6})`); lg.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, groundY - 122 * S, 60 * S, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe2a8'; ctx.beginPath(); ctx.arc(lx, groundY - 122 * S, 4 * S, 0, Math.PI * 2); ctx.fill();
    }
    // sign board
    const bw = 150 * S, bh = 62 * S, bx = x - 250 * S, by = groundY - 250 * S;
    ctx.fillStyle = '#10131d'; ctx.fillRect(bx + 14 * S, by + bh, 4 * S, groundY - by - bh); ctx.fillRect(bx + bw - 18 * S, by + bh, 4 * S, groundY - by - bh);
    const isCur = i === st.cur && !st.moving;
    ctx.fillStyle = st.visited.has(i) || isCur ? '#ece4cf' : '#cfc6ad';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = col; ctx.fillRect(bx, by, bw, 6 * S);
    if (isCur) { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.strokeRect(bx - 4, by - 4, bw + 8, bh + 8); }
    ctx.fillStyle = '#1d1b26'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(26 * S)}px ${FONT.display}`; ctx.fillText(s.year, bx + bw / 2, by + 26 * S);
    ctx.font = `700 ${Math.round(10 * S)}px ${FONT.mono}`;
    ctx.fillText(s.code + ' · STN ' + String(i + 1).padStart(2, '0'), bx + bw / 2, by + 48 * S);
    STATION_HIT[i] = { x: bx, y: by, w: bw, h: groundY - by };
  }
  const STATION_HIT = [];
  
  function drawTrack(now) {
    const y = groundY;
    // sleepers
    ctx.fillStyle = '#2a2320';
    const sp = 26 * S;
    for (let k = Math.floor(st.camX / sp) - 1; k * sp < st.camX + W + sp; k++) { const x = k * sp - st.camX; ctx.fillRect(x, y + 2 * S, 14 * S, 7 * S); }
    // rails, colored by identity segment
    for (let i = -1; i < STATIONS.length; i++) {
      const x0 = Math.max(i * SP - st.camX, -40), x1 = Math.min((i + 1) * SP - st.camX, W + 40);
      const xa = i < 0 ? -40 : x0, xb = i === STATIONS.length - 1 ? W + 40 : x1;
      if (xb < -40 || xa > W + 40 || xa >= xb) continue;
      const s = STATIONS[Math.max(i, 0)];
      if (s.name === 'both') {
        // braided rails: two colors weaving
        for (const [c, ph] of [[NAME_COLORS.gogol, 0], [NAME_COLORS.nikhil, Math.PI]]) {
          ctx.strokeStyle = c; ctx.lineWidth = 3 * S; ctx.shadowColor = c; ctx.shadowBlur = 10; ctx.beginPath();
          for (let x = xa; x <= xb; x += 6) { const wx = x + st.camX; const yy = y - 1 * S + Math.sin(wx / 40 + ph + now / 600) * 2.5 * S; x === xa ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      } else {
        const c = NAME_COLORS[s.name];
        ctx.strokeStyle = c; ctx.lineWidth = 3 * S; ctx.shadowColor = c; ctx.shadowBlur = s.name === 'none' ? 0 : 8;
        ctx.beginPath(); ctx.moveTo(xa, y - 1 * S); ctx.lineTo(xb, y - 1 * S); ctx.stroke(); ctx.shadowBlur = 0;
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(-40, y + 1 * S, W + 80, 1.5 * S);
  }
  
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  
  function drawTrain(now, dark) {
    const { loco, car, gap, wheel } = trainDims();
    const lx = st.trainX - st.camX; // loco center
    const y = groundY - 2 * S;
    const d = st.derail;
    const wheelAng = st.trainX / (wheel);
    const lensCol = st.lens === 'nikhil' ? NAME_COLORS.nikhil : st.lens === 'both' ? NAME_COLORS.both : NAME_COLORS.gogol;
    const units = [
      { x: lx - loco / 2 - gap - car * 1.5 - gap, rot: -0.55 * d, dx: -40 * d, dy: 22 * d, kind: 'car' },
      { x: lx - loco / 2 - gap - car / 2, rot: 0.4 * d, dx: -10 * d, dy: 14 * d, kind: 'car' },
      { x: lx, rot: 0.14 * d, dx: 30 * d, dy: 6 * d, kind: 'loco' },
    ];
    // headlight beam
    if (dark > .25 && d < .5) {
      const hx = lx + loco / 2 - 6 * S, hy = y - 80 * S;
      const beam = ctx.createLinearGradient(hx, hy, hx + 420 * S, hy);
      beam.addColorStop(0, `rgba(255,236,190,${.35 * dark})`); beam.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(hx, hy - 6 * S); ctx.lineTo(hx + 420 * S, hy - 70 * S); ctx.lineTo(hx + 420 * S, hy + 70 * S); ctx.lineTo(hx, hy + 6 * S); ctx.fill();
    }
    for (const u of units) {
      ctx.save(); ctx.translate(u.x + u.dx * S, y + u.dy * S); ctx.rotate(u.rot);
      if (u.kind === 'car') drawCar(car, wheel, wheelAng, dark, lensCol); else drawLoco(loco, wheel, wheelAng, dark, lensCol, now);
      ctx.restore();
    }
    // coupling bars
    if (d < .1) { ctx.fillStyle = '#111'; ctx.fillRect(units[0].x + car / 2, y - 26 * S, gap, 4 * S); ctx.fillRect(units[1].x + car / 2, y - 26 * S, gap, 4 * S); }
  
    // emit smoke
    const stackX = st.trainX + 58 * S, stackY = y - 132 * S;
    if (d < .3 && Math.random() < (st.moving ? .65 : .12)) smoke.push({ x: stackX, y: stackY, vx: -st.speed * 3 - .3 - Math.random() * .4, vy: -.6 - Math.random() * .6, r: 6 * S, a: st.moving ? .5 : .28 });
  }
  function drawWheel(cx, cy, r, ang) {
    ctx.fillStyle = '#16171d'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8c7a55'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); for (let k = 0; k < 4; k++) { const a = ang + k * Math.PI / 4; ctx.moveTo(cx - Math.cos(a) * (r - 3), cy - Math.sin(a) * (r - 3)); ctx.lineTo(cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3)); } ctx.stroke();
    ctx.fillStyle = '#8c7a55'; ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  function drawCar(L, r, ang, dark, lensCol) {
    const h = 84 * S, top = -r - h - 6 * S;
    roundRect(-L / 2, top, L, h, 8 * S); ctx.fillStyle = '#6b1e2a'; ctx.fill();
    ctx.fillStyle = '#4c1520'; ctx.fillRect(-L / 2, top + h - 14 * S, L, 14 * S);
    ctx.fillStyle = '#d9c48f'; ctx.fillRect(-L / 2, top + h * .62, L, 3 * S);
    roundRect(-L / 2 - 4 * S, top - 8 * S, L + 8 * S, 12 * S, 6 * S); ctx.fillStyle = '#2d2f3a'; ctx.fill();
    // windows (lit)
    const n = 5, ww = L / n * .6;
    for (let k = 0; k < n; k++) {
      const wx = -L / 2 + (k + .2) * (L / n);
      ctx.fillStyle = `rgba(255,${200 + dark * 20},${120 + dark * 30},${.55 + dark * .45})`; roundRect(wx, top + 14 * S, ww, 26 * S, 4 * S); ctx.fill();
      if (k % 2 === 0) { ctx.fillStyle = 'rgba(30,20,20,.55)'; ctx.beginPath(); ctx.arc(wx + ww / 2, top + 30 * S, 6 * S, Math.PI, 0); ctx.fill(); ctx.fillRect(wx + ww / 2 - 7 * S, top + 30 * S, 14 * S, 10 * S); }
    }
    ctx.fillStyle = lensCol; ctx.fillRect(-L / 2, top + h - 4 * S, L, 2 * S);
    drawWheel(-L / 2 + 26 * S, -r, r * .8, ang); drawWheel(-L / 2 + 50 * S, -r, r * .8, ang);
    drawWheel(L / 2 - 50 * S, -r, r * .8, ang); drawWheel(L / 2 - 26 * S, -r, r * .8, ang);
  }
  function drawLoco(L, r, ang, dark, lensCol, now) {
    const base = -r - 8 * S;
    // frame
    ctx.fillStyle = '#16171d'; ctx.fillRect(-L / 2, base - 16 * S, L, 16 * S);
    // boiler
    const bx0 = -L / 2 + 60 * S, bx1 = L / 2 - 16 * S, btop = base - 70 * S;
    const bg = ctx.createLinearGradient(0, btop, 0, base - 16 * S); bg.addColorStop(0, '#3a3f52'); bg.addColorStop(.35, '#5b6178'); bg.addColorStop(1, '#1d202b');
    roundRect(bx0, btop, bx1 - bx0, 54 * S, 22 * S); ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = '#b89a55'; for (const bxx of [.3, .55, .8]) ctx.fillRect(bx0 + (bx1 - bx0) * bxx, btop + 2, 4 * S, 50 * S);
    // dome + stack
    ctx.fillStyle = '#2b2f3d'; ctx.beginPath(); ctx.arc(bx0 + (bx1 - bx0) * .42, btop + 2, 14 * S, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#b89a55'; ctx.fillRect(bx0 + (bx1 - bx0) * .42 - 14 * S, btop, 28 * S, 3 * S);
    const sx = 58 * S; ctx.fillStyle = '#1d202b'; ctx.beginPath(); ctx.moveTo(sx - 9 * S, btop + 4); ctx.lineTo(sx - 14 * S, btop - 40 * S); ctx.lineTo(sx + 14 * S, btop - 40 * S); ctx.lineTo(sx + 9 * S, btop + 4); ctx.fill();
    ctx.fillStyle = '#b89a55'; ctx.fillRect(sx - 15 * S, btop - 44 * S, 30 * S, 5 * S);
    // cab
    const cx0 = -L / 2, cw = 66 * S, ctop = base - 104 * S;
    ctx.fillStyle = '#7b2430'; ctx.fillRect(cx0, ctop, cw, 88 * S);
    ctx.fillStyle = '#2d2f3a'; ctx.fillRect(cx0 - 6 * S, ctop - 8 * S, cw + 12 * S, 10 * S);
    ctx.fillStyle = `rgba(255,214,140,${.6 + dark * .4})`; roundRect(cx0 + 14 * S, ctop + 14 * S, 34 * S, 28 * S, 4 * S); ctx.fill();
    ctx.fillStyle = lensCol; ctx.fillRect(cx0, ctop + 60 * S, cw, 5 * S);
    // name plate on cab
    ctx.fillStyle = '#e9dcb4'; ctx.fillRect(cx0 + 8 * S, ctop + 70 * S, cw - 16 * S, 12 * S);
    ctx.fillStyle = '#1d1b26'; ctx.font = `700 ${Math.max(7, Math.round(9 * S))}px ${FONT.mono}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(st.lens === 'nikhil' ? 'NIKHIL' : st.lens === 'both' ? 'GOGOL·NIKHIL' : 'GOGOL', cx0 + cw / 2, ctop + 76.5 * S);
    // cowcatcher
    ctx.fillStyle = '#3a2222'; ctx.beginPath(); ctx.moveTo(L / 2 - 16 * S, base - 16 * S); ctx.lineTo(L / 2 + 16 * S, base + 6 * S); ctx.lineTo(L / 2 - 16 * S, base + 6 * S); ctx.fill();
    // headlight
    ctx.fillStyle = '#2b2f3d'; ctx.fillRect(L / 2 - 30 * S, btop - 4 * S, 18 * S, 16 * S);
    ctx.fillStyle = '#fff3cf'; ctx.shadowColor = '#ffe9b0'; ctx.shadowBlur = 20 * dark + 4; ctx.beginPath(); ctx.arc(L / 2 - 12 * S, btop + 4 * S, 6 * S, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    // wheels
    const dr = r * 1.15;
    const wxs = [-L / 2 + 34 * S, -L / 2 + 84 * S, -L / 2 + 128 * S];
    for (const wx of wxs) drawWheel(wx, -dr + 2 * S, dr, ang * .9);
    drawWheel(L / 2 - 26 * S, -r * .6, r * .6, ang * 1.6);
    // connecting rod
    const ox = Math.cos(ang * .9) * dr * .5, oy = Math.sin(ang * .9) * dr * .5;
    ctx.strokeStyle = '#c9b27a'; ctx.lineWidth = 4 * S; ctx.beginPath(); ctx.moveTo(wxs[0] + ox, -dr + 2 * S + oy); ctx.lineTo(wxs[2] + ox, -dr + 2 * S + oy); ctx.stroke();
  }
  
  function drawCrashLight(now) {
    const t = st.crashT;
    // darkness after impact
    const dk = clamp((t - 1.3) / .6, 0, 1) * (1 - clamp((t - 6.5) / 1.2, 0, 1));
    if (dk <= 0) return;
    const tx = st.trainX - st.camX - 140 * S, ty = groundY - 40 * S;
    const sweep = clamp((t - 2) / 2.6, 0, 1);
    const fx = lerp(W * .05, tx, ease(sweep)), fy = lerp(groundY - 200 * S, ty, ease(sweep)) + Math.sin(now / 300) * 6;
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${.9 * dk})`;
    ctx.beginPath(); ctx.rect(-40, -40, W + 80, H + 80); ctx.arc(fx, fy, 90 * S, 0, Math.PI * 2, true); ctx.fill('evenodd');
    const lg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 90 * S); lg.addColorStop(0, `rgba(255,240,200,${.25 * dk})`); lg.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(fx, fy, 90 * S, 0, Math.PI * 2); ctx.fill();
    // the page
    if (sweep > .6) {
      const a = clamp((sweep - .6) / .4, 0, 1) * dk;
      ctx.translate(tx, ty); ctx.rotate(Math.sin(now / 250) * .15 - .2);
      ctx.fillStyle = `rgba(245,238,215,${a})`; ctx.fillRect(-16 * S, -20 * S, 32 * S, 40 * S);
      ctx.fillStyle = `rgba(60,60,70,${a * .7})`; for (let k = 0; k < 6; k++) ctx.fillRect(-12 * S, -14 * S + k * 6 * S, (k % 3 === 2 ? 16 : 24) * S, 1.5 * S);
    }
    ctx.restore();
  }
  
  /* =========================================================
     MOTION / TRAVEL
     ========================================================= */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(64, now - last); last = now;
    if (st.moving) {
      const k = clamp((now - st.t0) / st.dur, 0, 1), e = ease(k);
      const prevX = st.trainX;
      st.trainX = lerp(st.from, st.to, e);
      st.speed = Math.abs(st.trainX - prevX) / Math.max(dt, 1) / 1.2;
      if (k >= 1) arrive();
    } else st.speed = lerp(st.speed, 0, .1);
    // camera follows
    const want = st.trainX - anchor;
    st.camX = lerp(st.camX, want, reduced ? 1 : .08);
    // grayscale for flashbacks
    const p = stationPos(), i = clamp(Math.round(p), 0, STATIONS.length - 1);
    st.gray = lerp(st.gray, STATIONS[i].flashback && st.started && !st.opening ? 1 : 0, .04); // the title shot and the opening ride stay in colour
    view.style.filter = st.gray > .01 ? `grayscale(${st.gray}) contrast(${1 + st.gray * .15}) sepia(${st.gray * .15})` : '';
    // crash timeline
    if (st.crashT >= 0) crashTick(dt / 1000);
    st.shake = Math.max(0, st.shake - dt / 900);
    par.x = lerp(par.x, par.tx, .06); par.y = lerp(par.y, par.ty, .06);
    snd.tick(now, st.speed);
    if (!music && snd.ctx && snd.ctx.state === 'running') { music = createMusic(snd.ctx, snd.ctx.destination); music.setEnabled(snd.on); }
    if (music && !disposed) music.setStation(clamp(Math.round(stationPos()), 0, STATIONS.length - 1), st.moving);
    if (world) {
      world.render({ now, p: stationPos(), cur: st.cur, target: st.target, moving: st.moving, speed: st.speed, derail: st.derail, crashT: st.crashT,
        shake: reduced ? 0 : st.shake, lens: st.lens, visited: st.visited, parX: par.x, parY: par.y,
        cardSide: ticket.classList.contains('away') ? 'none' : (window.innerWidth < 760 ? 'bottom' : 'left'), intro: !st.started });
    } else draw(now);
    if (!disposed) rafId = requestAnimationFrame(frame);
  }
  
  function travelTo(i, opts = {}) {
    i = clamp(i, 0, STATIONS.length - 1);
    if (st.crashT >= 0) return;
    if (i === st.cur && !st.moving && st.trainX === i * SP) { showCard(); return; } // already parked here
    const dist = Math.abs(i * SP - st.trainX) / SP;
    st.from = st.trainX; st.to = i * SP; st.t0 = performance.now(); st.target = i; st.moving = true;
    st.dur = reduced ? 300 : opts.dur || clamp(900 + dist * 520, 1300, 4200) * (opts.rewind ? .55 : 1);
    st.derail = 0;
    if (!scenePop.hidden) closeScenePop();
    hideCard();
    const back = i < st.cur;
    if (opts.rewind || (back && st.cur - i > 1)) { $('#rwYear').textContent = STATIONS[i].year; $('#vhs').classList.add('on'); }
    else snd.whistle();
    markRail(i);
    try { history.replaceState(null, '', '#s' + (i + 1)); } catch (e) {}
    publish();
  }
  function arrive() {
    st.moving = false; st.trainX = st.to; st.cur = st.target;
    $('#vhs').classList.remove('on');
    const i = st.cur, s = STATIONS[i];
    const firstVisit = !st.visited.has(i);
    st.visited.add(i);
    updateHud(); markRail(i);
    if (firstVisit) updatePass(true);
    if (i === 0 && !st.crashDone) { startCrash(); return; }
    if (s.special === 'decree' && firstVisit) { doDecree(); }
    if (i >= NIKHIL_AT && !st.lensUnlocked) unlockLens();
    if (s.name === 'both') setLens('both', true);
    else if (st.lens === 'both') setLens(st.lensUnlocked ? 'nikhil' : 'gogol', true);
    st.tab = 'story';
    showCard(true);
    autoScene(i);
  }
  
  /* crash sequence — cue times match lib/world3d/crash.ts CRASH (the 3D side stages the shots on the same clock) */
  // Exterior only: the compartment, the flashlight and the page are our filmed scene, which autoScene(0) opens at END.
  const CR = { SCREECH: 2.25, IMPACT: 2.55, SLOW1: 3.5, WIDE: 3.5, GLASS: 3.9, AFTER: 5.3, CAP1: 5.6, CAP2: 7.1, CAPOFF: 8.5, SKIP: 7.4, END: 8.8 };
  const CRASH_CAP2 = 'Rescuers search the wreck by lantern light.';
  // corner mark while the 3D crash plays: this part is computer-generated (our filmed scene follows)
  const crashMark = document.createElement('div');
  crashMark.className = 'crash-mark'; crashMark.setAttribute('aria-hidden', 'true');
  crashMark.hidden = true;
  root.appendChild(crashMark);
  function startCrash() {
    st.crashT = reduced ? 2.05 : 0; st.crashDone = true; st.derail = 0; hideCard();
    snd.whistle();
  }
  function crashTick(dt) {
    const before = st.crashT; st.crashT += dt;
    const t = st.crashT;
    const x = (m) => before < m && t >= m;
    if (t < CR.IMPACT) { st.speed = lerp(.8, 1.2, clamp(t / CR.IMPACT, 0, 1)); st.shake = Math.max(st.shake, t > CR.SCREECH ? .5 : .08); } // racing: clacks accelerate
    else st.speed = 0;
    if (x(CR.SCREECH)) snd.screech();
    if (x(CR.IMPACT)) {
      snd.crash(); st.shake = 1.4;
      const f = $('#flash'); f.style.transition = 'none'; f.style.opacity = reduced ? '.25' : '.55'; requestAnimationFrame(() => { f.style.transition = 'opacity .9s'; f.style.opacity = '0'; });
    }
    if (t >= CR.IMPACT && t < CR.SLOW1) st.shake = Math.max(st.shake, 1.2); // held through the slow motion
    if (x(CR.WIDE)) { snd.crunch(); st.shake = .9; }
    if (x(CR.GLASS)) snd.glass();
    if (t >= CR.IMPACT) st.derail = clamp((t - CR.IMPACT) / 1.5, 0, 1);
    if (x(CR.AFTER)) snd.aftermath(CR.END - CR.AFTER + 1.5);
    const cap = $('#crashCap');
    if (x(CR.CAP1)) { cap.textContent = 'October 1961. The train derails in the dark.'; cap.classList.add('on'); }
    if (x(CR.CAP2)) { cap.textContent = CRASH_CAP2; }
    if (x(CR.CAPOFF)) cap.classList.remove('on');
    crashMark.classList.toggle('on', t < CR.END);
    if (t > CR.END) { st.crashT = -1; st.derail = 1; crashMark.classList.remove('on'); showCard(true); autoScene(0); }
  }
  /** Esc / Enter / Space / → (a presenter's clicker) jumps to the wide aftermath, just before the hand-off to our filmed scene. */
  function skipCrash() {
    if (st.crashT < 0 || st.crashT >= CR.SKIP) return;
    st.crashT = CR.SKIP; st.derail = 1; st.speed = 0; st.shake = 0;
    const cap = $('#crashCap'); cap.textContent = CRASH_CAP2; cap.classList.add('on');
  }
  on(window, 'keydown', (e) => { if (st.crashT >= 0 && ['Escape', 'Enter', ' ', 'ArrowRight', 'PageDown'].includes(e.key)) { e.preventDefault(); skipCrash(); } });
  function replayCrash() { st.crashDone = false; st.derail = 0; hideCard(); setTimeout(startCrash, 400); }
  
  /* =========================================================
     CARD
     ========================================================= */
  const ticket = $('#ticket');
  function voiceHTML(s) {
    if (!s.voice) return '';
    const lens = st.lens === 'both' ? 'both' : (st.lensUnlocked ? st.lens : 'gogol');
    if (lens === 'both') return `<div class="voice"><span class="who">Gogol + Nikhil</span><p>${esc(s.voice.gogol)}</p><p>${esc(s.voice.nikhil)}</p><span class="note">Inner voice, our interpretation</span></div>`;
    return `<div class="voice"><span class="who">Inside ${lens === 'nikhil' ? 'Nikhil' : 'Gogol'}'s head</span><p>${esc(s.voice[lens])}</p><span class="note">Inner voice, our interpretation${st.lensUnlocked ? ' · press N to flip names' : ''}</span></div>`;
  }
  function pollHTML(i, s) {
    if (!s.poll) return '';
    const v = st.polls[i] || s.poll.options.map(() => 0), tot = v.reduce((a, b) => a + b, 0) || 1;
    return `<div class="poll" id="poll"><div class="label">${s.poll.predict ? 'Predict · tap once per hand' : 'Class vote · tap once per hand'}</div><p class="q">${esc(s.poll.q)}</p>
      ${s.poll.options.map((o, k) => `<button class="opt" data-vote="${k}"><i class="bar" style="width:${v[k] / tot * 100}%"></i><span>${esc(o)}</span><span class="n">${v[k]}</span></button>`).join('')}
      ${st.revealed[i] ? `<div class="answer"><b>What happened:</b> ${esc(s.poll.actual)}</div>` : `<button class="btn ghost reveal" data-reveal>Reveal what Gogol did</button>`}
    </div>`;
  }
  function specialHTML(i, s) {
    if (s.special === 'rewind') return `<div class="actions"><button class="btn hot" data-act="rewind">◀◀ Why "Gogol"? Rewind to 1961</button></div>`;
    if (i === 0) return `<div class="actions"><button class="btn ghost" data-act="replay">Replay the crash</button></div>`;
    if (s.special === 'finale') {
      const missing = STATIONS.map((_, k) => k).filter((k) => !st.visited.has(k));
      if (!missing.length) return `<div class="actions"><button class="btn hot" data-act="finale">Open the book →</button></div>`;
      return `<div class="actions"><button class="btn hot" disabled>Open the book (locked)</button></div>
        <p style="font-size:.9rem">Visit every station to unlock the ending. Still unvisited: ${missing.map((k) => `<button class="btn ghost" style="padding:2px 8px;font-size:.75rem;margin:2px" data-go="${k}">${esc(STATIONS[k].year)}</button>`).join('')}</p>`;
    }
    return '';
  }
  /* =========================================================
     HANDS-ON MOMENTS — a small "Try it" at five stations (never at a filmed moment)
     ========================================================= */
  const TRY_COUNT = STATIONS.filter((s) => s.try).length;
  const SHOE = '<svg viewBox="0 0 96 46" aria-hidden="true"><path d="M4 32c0-9 4-16 11-17l21-2c7 0 11 4 17 8 8 5 21 6 31 8 6 1 8 4 8 8v3H4z" fill="#2a1d18"/><path d="M4 38h88v5H4z" fill="#120c0a"/><path d="M42 17l6 6M48 15l6 6M54 14l5 5" stroke="#a8865f" stroke-width="1.5"/><path d="M12 22c6-3 14-4 22-3" stroke="#4a3830" stroke-width="2" fill="none"/></svg>';
  const RICE_ITEMS = { earth: ['🌱', 'Earth', 'a landowner'], pen: ['🖊️', 'Pen', 'a scholar'], money: ['💵', 'Dollar', 'a businessman'] };
  const CERT_DAYS = ['Day 1. No letter from Calcutta yet.', 'Day 2. Still nothing. The nurses keep asking for a name.', 'Day 3. The letter is lost somewhere between Calcutta and Cambridge. You have to write something.'];
  
  function tryHTML(i, s) {
    if (!s.try) return '';
    const d = st.done[s.try];
    const head = (label) => `<div class="try-label"><span>Try it · ${label}</span>${d ? '<span class="done">✓ Stamped</span>' : ''}</div>`;
    switch (s.try) {
      case 'shoes': return `<div class="try">${head('Be Ashima')}
        <div class="shoes ${d ? 'warm' : ''}">${SHOE}${SHOE}</div>
        ${d ? '' : '<div class="actions" style="justify-content:center;margin:8px 0 0"><button class="btn sm" data-try="shoes">Slip your feet in</button></div>'}
        <div class="try-msg">${d ? 'Still warm. She has never spoken to him, but she has already stood where he stood.' : 'The suitor left his shoes by the door. Nobody is watching.'}</div></div>`;
      case 'cert': {
        const w = st.certWaits;
        return `<div class="try">${head('You\'re the parents')}
        <div class="cert" id="cert">
          <div class="cert-h">Certificate of Live Birth · Cambridge, Mass.</div>
          <label for="certName">Name of child</label>
          <input id="certName" maxlength="20" autocomplete="off" placeholder="write a name" value="${esc(d || st.certDraft)}" ${d ? 'readonly' : ''}>
          ${d ? '<span class="filed">FILED</span>' : `<div class="cert-row"><button class="btn sm ghost" data-try="wait" ${w >= CERT_DAYS.length ? 'disabled' : ''}>Wait for Grandma's letter</button><button class="btn sm" data-try="sign">Sign it</button></div>`}
          <div class="cert-days">${w ? CERT_DAYS[Math.min(w, CERT_DAYS.length) - 1] : 'The hospital won\'t discharge the baby until this line is filled in.'}</div>
        </div>
        <div class="try-msg" id="certMsg">${d ? `You named him <b>${esc(d)}</b>. Ashoke, out of time, wrote <b>Gogol</b>: a pet name that was never meant to go on a form.` : ''}</div></div>`;
      }
      case 'rice': {
        const pick = RICE_ITEMS[d];
        return `<div class="try">${head('Offer the plate')}
        <div class="plate" id="plate"><span class="baby">${d ? '😭' : '👶'}</span>
          ${Object.entries(RICE_ITEMS).map(([k, [e, l]]) => `<button class="${k}${d === k ? ' picked' : ''}" data-rice="${k}" aria-label="${l}">${e}<small>${l}</small></button>`).join('')}</div>
        <div class="try-msg">${pick ? `You pushed the ${pick[1].toLowerCase()} toward him. It stands for ${pick[2]}. But Gogol refuses all three and cries. Nobody gets to decide his future for him.` : 'Which one will Gogol reach for? Tap it.'}</div></div>`;
      }
      case 'rub': return `<div class="try">${head('Grave rubbing')}
        <div class="rub"><canvas id="rubBase" width="480" height="240"></canvas><canvas id="rubTop" width="480" height="240" ${d ? 'hidden' : ''}></canvas></div>
        <div class="try-msg">${d ? 'Old names that nobody uses anymore. Gogol is drawn to them: they are as unusual as his own.' : 'Drag across the paper to rub the gravestone.'}<span class="try-note">Our stone is illustrative, not from the book.</span></div></div>`;
      case 'gift': return `<div class="try">${head('Open the present')}
        <div class="giftbook"><button class="hardcover" data-try="gift" ${d ? 'disabled' : ''}>The Short Stories of Nikolai Gogol</button>
        <div class="try-msg" style="margin:0">${d ? 'Onto the shelf it goes. It stays there, unread, for eighteen years.' : 'Click the book. Will fourteen-year-old Gogol read it?'}</div></div></div>`;
    }
    return '';
  }
  
  function markTry(quiet) {
    const n = STATIONS.filter((s) => s.try && st.done[s.try]).length;
    if (!quiet) snd.chime();
    toast(`Hands-on moment ${n} of ${TRY_COUNT} stamped in your passport.`);
    updatePass(true);
  }
  
  function doTry(kind, btn) {
    if (kind === 'shoes') { st.done.shoes = true; snd.thump(); markTry(); renderCard(false); }
    else if (kind === 'wait') { st.certWaits = Math.min(st.certWaits + 1, CERT_DAYS.length); snd.noiseBurst(5000, 1, .05, .2); renderCard(false); }
    else if (kind === 'sign') {
      const inp = $('#certName'); if (!inp || st.done.cert) return;
      const v = inp.value.trim();
      if (!v) { const c = $('#cert'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); $('#certMsg').textContent = 'The clerk won\'t accept a blank line.'; snd.noiseBurst(300, 2, .15, .1); return; }
      st.done.cert = v; snd.thump(); markTry(true); renderCard(false);
    }
    else if (kind === 'gift') {
      if (st.done.gift) return;
      btn.classList.add('shake'); snd.thump();
      setTimeout(() => { st.done.gift = true; markTry(true); renderCard(false); }, 500);
    }
  }
  
  
  function setupRub() {
    const base = $('#rubBase'), top = $('#rubTop'); if (!base) return;
    const b = base.getContext('2d'), w = base.width, h = base.height, r = rng(7);
    b.fillStyle = '#35333b'; b.fillRect(0, 0, w, h);
    for (let k = 0; k < 2600; k++) { b.fillStyle = `rgba(${r() < .5 ? '255,255,255' : '0,0,0'},${r() * .12})`; b.fillRect(r() * w, r() * h, 2, 2); }
    b.strokeStyle = 'rgba(236,228,207,.7)'; b.lineWidth = 3; b.beginPath(); b.moveTo(34, h - 12); b.lineTo(34, 82);
    b.ellipse(w / 2, 82, w / 2 - 34, 66, 0, Math.PI, 0); b.lineTo(w - 34, h - 12); b.stroke();
    b.fillStyle = 'rgba(236,228,207,.92)'; b.textAlign = 'center'; b.textBaseline = 'middle';
    b.font = `700 16px ${FONT.mono}`; b.fillText('HERE LIES', w / 2, 62);
    b.font = `38px ${FONT.display}`; b.fillText('HOPESTILL WARD', w / 2, 112);
    b.font = `700 18px ${FONT.mono}`; b.fillText('1739 · 1802', w / 2, 156);
    b.font = `italic 17px ${FONT.body}`; b.fillText('Remember me as you pass by', w / 2, 196);
    if (st.done.rub) return;
    const t = top.getContext('2d');
    t.fillStyle = '#efe8d6'; t.fillRect(0, 0, w, h);
    t.fillStyle = 'rgba(29,27,38,.05)'; for (let y = 0; y < h; y += 4) t.fillRect(0, y, w, 1);
    t.globalCompositeOperation = 'destination-out'; t.fillStyle = '#000';
    let down = false, n = 0, lastS = 0;
    const rub = (e) => {
      const rc = top.getBoundingClientRect(), x = (e.clientX - rc.left) / rc.width * w, y = (e.clientY - rc.top) / rc.height * h;
      for (let k = 0; k < 22; k++) { const a = Math.random() * Math.PI * 2, dd = Math.random() * 20; t.globalAlpha = .2 + Math.random() * .5; t.fillRect(x + Math.cos(a) * dd * 1.4, y + Math.sin(a) * dd * .7, 5, 2); }
      const now = performance.now(); if (now - lastS > 90) { snd.noiseBurst(2600, 1.5, .03, .05); lastS = now; }
      if (++n === 200) {
        st.done.rub = true; top.style.transition = 'opacity 1.2s'; top.style.opacity = '0';
        setTimeout(() => { markTry(); if (st.cur === 5 && !ticket.classList.contains('away')) renderCard(false); }, 1200);
      }
    };
    top.addEventListener('pointerdown', (e) => { down = true; try { top.setPointerCapture(e.pointerId); } catch (_) {} rub(e); });
    top.addEventListener('pointermove', (e) => { if (down) rub(e); });
    top.addEventListener('pointerup', () => { down = false; });
    top.addEventListener('pointercancel', () => { down = false; });
  }
  
  function renderCard(fresh) {
    const i = st.cur, s = STATIONS[i];
    const hasVideo = !!s.video;
    const nowHtml = nowMod.html(i, cardApi());
    const tabs = [['story', 'Story'], ['analysis', "4 I's"], ...(nowHtml ? [['now', 'Then & Now']] : []), ...(hasVideo ? [['scene', 'Our film']] : [])];
    if (!tabs.some(([k]) => k === st.tab)) st.tab = 'story';
    const a = s.analysis;
    let panel = '';
    if (st.tab === 'story') {
      panel = archiveMod.html(i, cardApi()) + fpHTML(i, s) + s.story.map((p) => `<p>${esc(p)}</p>`).join('') + choicesMod.html(i, cardApi()) +
        (s.quote ? `<blockquote class="quote">${esc(s.quote.text)}<cite>${esc(s.quote.cite)}</cite></blockquote>` : '') +
        (s.detail ? `<p style="font-size:.95rem;color:var(--ink-soft)">${esc(s.detail)}</p>` : '') +
        tryHTML(i, s) + voiceHTML(s) + pollHTML(i, s) + specialHTML(i, s);
    } else if (st.tab === 'now') {
      panel = nowHtml;
    } else if (st.tab === 'analysis') {
      panel = `<div class="analysis"><div class="tagrow"><span class="tag ${a.tag}">${TAG_NAMES[a.tag]}</span></div>
        <h4>In the book</h4><p>${esc(a.text)}</p><h4>Real world</h4><p>${esc(a.world)}</p></div>` + specialHTML(i, s);
    } else {
      panel = `<div class="mk-head">${filmBadge()}<span class="mk-credit">${esc(GROUP_CREDIT)}</span></div>
        <div class="scene-box mk-filmframe" id="sceneBox">
          <video id="vid" controls playsinline preload="metadata" src="${esc(s.video)}"></video>
          <div class="clapper" id="clap"><div class="bars"></div><b>Scene: ${esc(s.title)}</b><small>Our acted scene goes here · add ${esc(s.video)}</small></div>
        </div>
        <ol class="shotlist">${(s.shots || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`;
    }
    const oldBody = ticket.querySelector('.t-body'), keepScroll = !fresh && oldBody && ticket.dataset.i === String(i) ? oldBody.scrollTop : 0;
    // tab motion: the ink underline slides from the previous tab and the panel slides in from that side
    const tabIx = tabs.findIndex(([k]) => k === st.tab), prevIx = tabs.findIndex(([k]) => k === ticket.dataset.tab);
    const tabMoved = !fresh && ticket.dataset.i === String(i) && prevIx >= 0 && prevIx !== tabIx;
    ticket.dataset.i = i; ticket.dataset.tab = st.tab;
    const prevDis = i === 0 ? 'disabled' : '', nextDis = i === STATIONS.length - 1 ? 'disabled' : '';
    ticket.innerHTML = `
      <div class="t-head"><span>Station <b>${String(i + 1).padStart(2, '0')}</b> / ${STATIONS.length}</span><span>${s.flashback ? 'Flashback' : (s.name === 'none' ? '' : 'Passenger: <b>' + (s.name === 'both' ? 'Gogol + Nikhil' : s.name === 'nikhil' ? 'Nikhil' : 'Gogol') + '</b>')}</span></div>
      <div class="t-body">
        <header class="t-hero">
          <div class="t-year">${esc(s.year)}</div>
          <h2 class="t-title">${esc(s.title)}</h2>
          <div class="t-place">${esc(s.place)}</div>
          <div class="stamp" aria-hidden="true"><span>${esc(s.code)}<small>${esc(s.year)}</small></span></div>
        </header>
        <div class="tabs${tabMoved ? ' slide' : ''}" role="tablist" style="--n:${tabs.length};--i:${tabIx};--from:${tabMoved ? prevIx : tabIx}">${tabs.map(([k, l]) => `<button class="tab" role="tab" data-tab="${k}" aria-selected="${st.tab === k}">${l}${k === 'scene' ? '<i class="dot"></i>' : ''}</button>`).join('')}<i class="tab-ink" aria-hidden="true"></i></div>
        <div class="panel${tabMoved ? ' enter' : ''}" role="tabpanel" style="--dir:${tabMoved ? Math.sign(tabIx - prevIx) : 0}">${panel}</div>
      </div>
      <div class="t-foot">
        <button class="btn ghost" data-go="${i - 1}" ${prevDis}>← Back</button>
        <span class="hint"><kbd>→</kbd> or <kbd>Space</kbd> to ride on</span>
        <button class="btn" data-go="${i + 1}" ${nextDis}>Next stop →</button>
      </div>`;
    ticket.classList.toggle('fresh', !!fresh);
    ticket.querySelector('.t-body').scrollTop = keepScroll;
    mountCardMods(i);
    changed();
    setupRub();
    const vid = $('#vid');
    if (vid) {
      const clap = $('#clap');
      vid.addEventListener('loadeddata', () => { clap.hidden = true; });
      vid.addEventListener('error', () => { clap.hidden = false; });
      clap.hidden = false;
    }
  }
  /* ---------- card add-on modules (lib/cards/*): choices, then & now, archive ---------- */
  let cardCleanups = [];
  function cardApi() {
    st.cards = st.cards || {};
    return { cur: st.cur, stations: STATIONS, state: st.cards, save: () => save(), rerender: () => renderCard(false), travelTo: (k) => travelTo(k),
      toast: (m) => toast(m), sfx: { chime: () => snd.chime(), thump: () => snd.thump(), noise: (f, q, pk, d) => snd.noiseBurst(f, q, pk, d) }, esc };
  }
  function mountCardMods(i) {
    cardCleanups.forEach((c) => { try { c(); } catch (_) {} }); cardCleanups = [];
    for (const m of [archiveMod, choicesMod, nowMod]) if (m.mount) { const c = m.mount(ticket, i, cardApi()); if (typeof c === 'function') cardCleanups.push(c); }
  }

  function showCard(fresh) { renderCard(fresh); requestAnimationFrame(() => ticket.classList.remove('away')); }
  function hideCard() { ticket.classList.add('away'); const v = $('#vid'); if (v) v.pause(); }
  
  function vote(k) {
    const i = st.cur, s = STATIONS[i]; if (!s.poll || st.moving || !(k >= 0 && k < s.poll.options.length)) return;
    st.polls[i] = st.polls[i] || s.poll.options.map(() => 0); st.polls[i][k]++;
    snd.noiseBurst(2400, 6, .08, .04); if (st.tab !== 'story') st.tab = 'story'; renderCard(false);
  }
  function reveal() { if (!STATIONS[st.cur].poll || st.moving) return; st.revealed[st.cur] = true; snd.chime(); st.tab = 'story'; renderCard(false); }

  on(ticket, 'input', (e) => { if (e.target.id === 'certName') st.certDraft = e.target.value; });
  on(ticket, 'pointermove', (e) => {
    if (e.pointerType !== 'mouse' || reduced) return;
    const r = ticket.getBoundingClientRect();
    ticket.style.setProperty('--tx', ((e.clientX - r.left) / r.width - .5) * 5 + 'deg');
    ticket.style.setProperty('--ty', -((e.clientY - r.top) / r.height - .5) * 4 + 'deg');
  });
  on(ticket, 'pointerleave', () => { ticket.style.setProperty('--tx', '0deg'); ticket.style.setProperty('--ty', '0deg'); });
  on(ticket, 'click', (e) => {
    const t = e.target.closest('button'); if (!t || t.disabled) return;
    if (t.dataset.tab) { st.tab = t.dataset.tab; renderCard(false); return; }
    if (t.dataset.try) { doTry(t.dataset.try, t); return; }
    if (t.dataset.rice) {
      const first = !st.done.rice; st.done.rice = t.dataset.rice;
      snd.cry(); if (first) markTry(true); else updatePass(false);
      renderCard(false); $('#plate').classList.add('cry'); return;
    }
    if (t.dataset.go != null) { travelTo(+t.dataset.go); return; }
    if (t.dataset.vote != null) { vote(+t.dataset.vote); return; }
    if (t.hasAttribute('data-reveal')) { reveal(); return; }
    const act = t.dataset.act;
    if (act === 'rewind') travelTo(0, { rewind: true });
    if (act === 'replay') replayCrash();
    if (act === 'finale') openFinale();
    if (act === 'fp') openFP(STATIONS[st.cur].fp);
  });
  
  /* =========================================================
     HUD, RAIL, LENS
     ========================================================= */
  const rail = $('#rail');
  rail.innerHTML = STATIONS.map((s, i) => `<button class="stop" data-i="${i}" style="--c:${NAME_COLORS[s.name]}" title="${esc(s.title)}">
    ${railMarks(i)}<i class="tagdot" style="background:${TAG_COLORS[s.analysis.tag]}"></i>${esc(s.year.replace('Late 1990s', "late '90s"))}</button>`).join('');
  on(rail, 'click', (e) => { const b = e.target.closest('.stop'); if (b) travelTo(+b.dataset.i); });
  function markRail(target) {
    rail.querySelectorAll('.stop').forEach((b, i) => { b.classList.toggle('current', i === target); b.classList.toggle('visited', st.visited.has(i)); });
    const cur = rail.children[target]; if (cur) cur.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  }
  function updateHud() { const s = STATIONS[st.cur]; $('#locText').textContent = `${s.place} · ${s.year}`; updatePass(false); }
  
  /* passport: one stamp per station, a star for each hands-on moment */
  const PP_COLORS = { none: '#5a6072', gogol: '#c0691a', nikhil: '#2b6fc4', both: '#7a4fc0' };
  const passport = $('#passport');
  function updatePass(pulse) {
    $('#passN').textContent = st.visited.size;
    if (pulse) { const b = $('#passBtn'); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); }
    if (!passport.hidden) renderPassport();
  }
  function renderPassport() {
    const tries = STATIONS.filter((s) => s.try && st.done[s.try]).length;
    $('#ppSub').textContent = `Holder: ${st.visitor || 'Passenger'} · ${st.visited.size} of ${STATIONS.length} stations`;
    let k = 0; // stamps thud in one after another (--k orders the visited ones)
    $('#ppGrid').innerHTML = STATIONS.map((s, i) => st.visited.has(i)
      ? `<button class="pp-stamp got" data-i="${i}" style="--c:${PP_COLORS[s.name]};--r:${(i * 37) % 23 - 11}deg;--k:${k++}" title="${esc(s.title)}"><span class="pp-ink"><b>${esc(s.year)}</b>${esc(s.code)}${s.try && st.done[s.try] ? ' <span class="star">★</span>' : ''}</span></button>`
      : `<button class="pp-stamp" data-i="${i}" title="Not visited yet"><b>?</b>STN ${String(i + 1).padStart(2, '0')}</button>`).join('');
    const fps = STATIONS.filter((s) => s.fp && st.done['fp-' + s.fp]).length, fpTotal = STATIONS.filter((s) => s.fp).length;
    $('#ppFoot').textContent = `★ Hands-on moments: ${tries} of ${TRY_COUNT} · First-person views: ${fps} of ${fpTotal} · ` + (st.visited.size === STATIONS.length ? 'The ending is unlocked.' : 'Visit every station to unlock the ending.');
  }
  function openPassport() { renderPassport(); passport.hidden = false; $('#ppClose').focus(); }
  on($('#passBtn'), 'click', openPassport);
  on($('#ppClose'), 'click', () => { passport.hidden = true; });
  on($('#ppQuiz'), 'click', () => openQuiz());
  on($('#ppReset'), 'click', (e) => {
    const b = e.currentTarget;
    if (b.dataset.armed) { store.set('progress', null); try { history.replaceState(null, '', location.pathname); } catch (_) {} location.reload(); return; }
    b.dataset.armed = '1'; b.textContent = 'Sure? Click again'; setTimeout(() => { delete b.dataset.armed; b.textContent = 'Start over'; }, 3000);
  });
  on(passport, 'click', (e) => {
    if (e.target === passport) { passport.hidden = true; return; }
    const b = e.target.closest('.pp-stamp'); if (b) { passport.hidden = true; travelTo(+b.dataset.i); }
  });
  
  function setLens(l, quiet) {
    st.lens = l; root.classList.remove('lens-gogol', 'lens-nikhil', 'lens-both'); root.classList.add('lens-' + l);
    if (!quiet) snd.thump();
    if (!st.moving && !ticket.classList.contains('away')) renderCard(false);
  }
  function unlockLens() { st.lensUnlocked = true; const n = $('#nameSwitch'); n.classList.remove('locked'); n.title = 'Flip names (N)'; }
  function toggleLens() {
    if (!st.lensUnlocked) { toast('Locked. He is still Gogol until 1986.'); snd.noiseBurst(300, 2, .15, .1); return; }
    if (st.lens === 'both') { toast('At the end he is both. Ride back to flip again.'); return; }
    setLens(st.lens === 'gogol' ? 'nikhil' : 'gogol');
  }
  on($('#nameSwitch'), 'click', toggleLens);
  
  function doDecree() {
    const d = $('#decree'); d.classList.remove('on'); void d.offsetWidth; d.classList.add('on');
    setTimeout(() => snd.thump(), 380);
    unlockLens(); setTimeout(() => setLens('nikhil'), 600);
  }
  
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3200); }
  
  /* lost letter */
  const LETTER_LINES = [
    'The letter with his good name is still in the mail.',
    'Ashima\'s grandmother chose a name. Nobody ever learns what it was.',
    'Still lost somewhere between Calcutta and Cambridge.',
    'Some names never arrive. Keep riding.',
  ];
  on($('#letter'), 'click', () => { toast(LETTER_LINES[st.letterClicks++ % LETTER_LINES.length]); snd.noiseBurst(5000, 1, .05, .2); });
  
  /* toggles */
  let music = null;
  function setSound(on) { if (music) music.setEnabled(on); snd.on = on; store.set('sound', on); $('#soundBtn').setAttribute('aria-pressed', on); $('#soundBtn').textContent = on ? 'Sound' : 'Muted'; if (on) { snd.init(); snd.ctx && snd.ctx.resume(); } }
  on($('#soundBtn'), 'click', () => setSound(!snd.on));
  function toggleAnalysis() { st.analysis = !st.analysis; root.classList.toggle('show-analysis', st.analysis); $('#analysisBtn').setAttribute('aria-pressed', st.analysis);
    if (st.analysis) { st.tab = 'analysis'; if (!st.moving) renderCard(false); toast('4 I\'s mode: colored dots on the timeline show each kind of oppression.'); } }
  on($('#analysisBtn'), 'click', toggleAnalysis);
  function togglePresent() { const on = root.classList.toggle('present'); $('#presentBtn').setAttribute('aria-pressed', on); publish(); }
  on($('#presentBtn'), 'click', togglePresent);
  const help = $('#help');
  on($('#helpBtn'), 'click', () => { help.hidden = false; $('#helpClose').focus(); });
  on($('#helpClose'), 'click', () => { help.hidden = true; });
  function fullscreen() { const el = document.documentElement; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else if (el.requestFullscreen) el.requestFullscreen().catch(() => toast('Fullscreen is not available here.')); }
  
  /* canvas click → station */
  on(view, 'click', (e) => {
    if (world) { const hit = world.pick(e.clientX, e.clientY); if (typeof hit === 'number') travelTo(hit); else if (hit === 'train') snd.whistle(); return; }
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    for (let i = 0; i < STATION_HIT.length; i++) { const h = STATION_HIT[i]; if (h && x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) { travelTo(i); return; } }
    // click the train for a whistle
    const tx = st.trainX - st.camX; if (Math.abs(x - tx) < 300 * S && Math.abs(y - (groundY - 60 * S)) < 80 * S) snd.whistle();
  });
  on(view, 'mousemove', (e) => {
    if (world) { view.style.cursor = world.pick(e.clientX, e.clientY) != null ? 'pointer' : 'default'; return; }
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    cv.style.cursor = STATION_HIT.some((h) => h && x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) ? 'pointer' : 'default';
  });
  // swipe on the stage
  let tsx = null;
  on(view, 'touchstart', (e) => { tsx = e.touches[0].clientX; }, { passive: true });
  on(view, 'touchend', (e) => { if (tsx == null) return; const dx = e.changedTouches[0].clientX - tsx; if (Math.abs(dx) > 50) travelTo(st.target + (dx < 0 ? 1 : -1)); tsx = null; });
  
  /* keyboard */
  on(document, 'keydown', (e) => {
    if (e.target.tagName === 'INPUT') { if (e.key === 'Enter') { if (e.target.id === 'certName') doTry('sign'); else board(); } return; }
    if (!st.started) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); board(); } return; }
    if (fpCtl || !fpBox.hidden) return; // the first-person view handles its own keys
    if (!scenePop.hidden) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); closeScenePop(); } return; }
    if (!scenesOv.hidden) { if (e.key === 'Escape') closeScenes(); return; } // the scenes section handles its own keys
    if (!help.hidden) { if (e.key === 'Escape' || e.key === '?') help.hidden = true; return; }
    if (!passport.hidden) { if (e.key === 'Escape' || e.key === 'v' || e.key === 'V') passport.hidden = true; return; }
    if (!quiz.hidden) {
      if ('1234'.includes(e.key) && e.key !== '') answer(+e.key - 1);
      else if ((e.key === 'Enter' || e.key === 'ArrowRight') && $('#quizNext') && !$('#quizNext').hidden) { e.preventDefault(); qi++; renderQuiz(); }
      else if (e.key === 'Escape') closeQuiz();
      return;
    }
    if (!$('#finale').hidden) { if (e.key === 'Escape' || e.key === 'ArrowLeft') closeFinale(); return; }
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && e.target.tagName !== 'BUTTON')) { e.preventDefault(); travelTo((st.moving ? st.target : st.cur) + 1); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); travelTo((st.moving ? st.target : st.cur) - 1); }
    else if (k === 'n' || k === 'N') toggleLens();
    else if (k === 'm' || k === 'M') setSound(!snd.on);
    else if (k === 'p' || k === 'P') togglePresent();
    else if (k === 'f' || k === 'F') fullscreen();
    else if (k === 'a' || k === 'A') toggleAnalysis();
    else if (k === 'v' || k === 'V') openPassport();
    else if (k === 'q' || k === 'Q') openQuiz();
    else if (k === 'e' || k === 'E') { if (STATIONS[st.cur].fp && !st.moving) openFP(STATIONS[st.cur].fp); }
    else if (k === 's' || k === 'S') openScenes();
    else if (k === '?' || k === 'h' || k === 'H') help.hidden = false;
    else if (k === 'Home') travelTo(0);
    else if (k === 'End') travelTo(STATIONS.length - 1);
    else if ('1234'.includes(k) && !st.moving) { const tabs = [...ticket.querySelectorAll('.tab')].map((t) => t.dataset.tab); const tt = tabs[+k - 1]; if (tt) { st.tab = tt; renderCard(false); } }
  });
  
  /* =========================================================
     INTRO + FINALE
     ========================================================= */
  const scr = $('#scramble');
  let scrWord = 0;
  function scramble() {
    if (st.started || disposed) return;
    // cycles GOGOL → NIKHIL → the visitor's own name, once they type one
    const mine = nameIn.value.trim().toUpperCase().slice(0, 14), words = ['GOGOL', 'NIKHIL'].concat(mine ? [mine] : []);
    scrWord = (scrWord + 1) % words.length; const target = words[scrWord], chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; let f = 0;
    const iv = setInterval(() => {
      f++; scr.textContent = target.split('').map((c, k) => (k < f / 2 ? c : chars[Math.floor(Math.random() * 26)])).join('');
      if (f >= target.length * 2) { clearInterval(iv); scr.textContent = target; scr.classList.toggle('n', scrWord === 1); scr.classList.toggle('v', scrWord === 2); }
    }, 45);
    setTimeout(scramble, 2600);
  }
  setTimeout(scramble, 1800);
  const nameIn = $('#visitorName'); nameIn.value = store.get('visitor', '');
  
  function board() {
    if (st.started) return; st.started = true;
    st.visitor = nameIn.value.trim(); store.set('visitor', st.visitor);
    if (snd.on) { snd.init(); snd.ctx && snd.ctx.resume(); }
    const intro = $('#intro'); intro.classList.add('open');
    setTimeout(() => snd.whistle(), 250);
    setTimeout(() => { intro.hidden = true; }, 1700);
    // opening: the waiting train (title screen) departs and pulls in to 1968; the camera cranes up out of the title shot
    const startAt = hashStation();
    st.trainX = startAt * SP - 900; st.camX = st.trainX - anchor; st.cur = Math.max(0, startAt - 1);
    st.opening = true; setTimeout(() => { st.opening = false; }, 3900);
    setTimeout(() => travelTo(startAt, { dur: 3400 }), 450);
    setTimeout(() => root.classList.remove('pre'), reduced ? 0 : 2600);
    publish();
  }
  on($('#boardBtn'), 'click', board);
  function hashStation() { const m = /^#s(\d+)$/.exec(location.hash); return m ? clamp(+m[1] - 1, 0, STATIONS.length - 1) : START; }
  
  let typeIv;
  function openFinale() {
    const f = $('#finale'); f.hidden = false; hideCard();
    $('#letter').classList.add('gone');
    requestAnimationFrame(() => f.classList.add('on'));
    const book = $('#book'); book.classList.remove('open');
    const ins = $('#inscription'); ins.innerHTML = '<span class="caret"></span>';
    $('#finText').classList.remove('on');
    const v = st.visitor;
    $('#finHead').textContent = v ? `${v}, who gave you your name?` : 'Who gave you your name?';
    setTimeout(() => { book.classList.add('open'); snd.chime(); }, 900);
    const text = 'For Gogol Ganguli — The man who gave you his name, from the man who gave you your name.';
    let n = 0; clearInterval(typeIv);
    setTimeout(() => { typeIv = setInterval(() => {
      n++; ins.innerHTML = esc(text.slice(0, n)).replace('Ganguli — ', 'Ganguli —<br>') + '<span class="caret"></span>';
      if (n % 3 === 0) snd.noiseBurst(4000, 3, .015, .03);
      if (n >= text.length) { clearInterval(typeIv); setTimeout(() => $('#finText').classList.add('on'), 500); }
    }, reduced ? 1 : 55); }, 2800);
  }
  function closeFinale() { const f = $('#finale'); f.classList.remove('on'); clearInterval(typeIv); setTimeout(() => { f.hidden = true; showCard(false); }, 600); }
  on($('#finBack'), 'click', closeFinale);
  on($('#finQuiz'), 'click', () => openQuiz());
  on($('#finReplay'), 'click', () => { closeFinale(); st.crashDone = false; setTimeout(() => travelTo(0, { rewind: true }), 700); });
  
  /* =========================================================
     TICKET INSPECTOR QUIZ
     ========================================================= */
  const quiz = $('#quiz'), qRes = [];
  let qi = 0, qScore = 0, qAnswered = false;
  function openQuiz() { qi = 0; qScore = 0; qRes.length = 0; hideCard(); passport.hidden = true; help.hidden = true; quiz.hidden = false; renderQuiz(); publish(); }
  function closeQuiz() { quiz.hidden = true; if ($('#finale').hidden) showCard(false); publish(); }
  function renderQuiz() {
    const done = qi >= QUIZ.length;
    // the card flips over for every new question (and for the score)
    const qCard = quiz.querySelector('.quiz-card'); qCard.classList.remove('flip'); void qCard.offsetWidth; qCard.classList.add('flip');
    $('#quizStep').textContent = done ? 'Final score' : `Question ${qi + 1} of ${QUIZ.length}`;
    $('#quizPunches').innerHTML = QUIZ.map((_, k) => `<i class="${k < qi ? (qRes[k] ? 'hit' : 'miss') + ' set' : k === qi ? 'now' : ''}"></i>`).join('');
    if (done) {
      st.quizBest = Math.max(qScore, st.quizBest || 0); save();
      const line = qScore === QUIZ.length ? 'Perfect ride. Every ticket punched.' : qScore >= QUIZ.length - 2 ? 'Nice riding. You were paying attention.' : 'Ride the line again and look closer.';
      $('#quizBody').innerHTML = `<div class="quiz-result"><span class="quiz-kicker">Tickets punched</span><h2 id="quizQ" class="quiz-q quiz-score">${qScore}<small>/ ${QUIZ.length}</small></h2><p>${line}${st.visitor ? ` Well done, ${esc(st.visitor)}.` : ''}</p></div>
        <div class="quiz-acts"><button class="btn ghost" data-q="again">Try again</button><button class="btn hot" data-q="close">Back to the train</button></div>`;
      if (qScore === QUIZ.length) snd.chime();
      $('#quizBody').querySelector('.btn.hot').focus();
      return;
    }
    const q = QUIZ[qi]; qAnswered = false;
    $('#quizBody').innerHTML = `<h2 id="quizQ" class="quiz-q">${esc(q.q)}</h2>
      <div class="quiz-opts">${q.options.map((o, k) => `<button class="quiz-opt" data-a="${k}"><kbd>${k + 1}</kbd><span>${esc(o)}</span></button>`).join('')}</div>
      <div class="quiz-why" id="quizWhy" aria-live="polite"></div>
      <div class="quiz-acts"><button class="btn ghost" data-q="close">Close</button><button class="btn" data-q="next" id="quizNext" hidden>${qi === QUIZ.length - 1 ? 'See my score' : 'Next question'} →</button></div>`;
  }
  function answer(k) {
    if (qAnswered || qi >= QUIZ.length || k >= QUIZ[qi].options.length) return; qAnswered = true;
    const q = QUIZ[qi], ok = k === q.answer; qRes[qi] = ok; if (ok) qScore++;
    quiz.querySelectorAll('.quiz-opt').forEach((b, j) => { b.disabled = true; b.classList.toggle('right', j === q.answer); b.classList.toggle('wrong', j === k && !ok); });
    $('#quizWhy').innerHTML = `<b>${ok ? 'Punched!' : 'Not quite.'}</b> ${esc(q.why)}`;
    const nx = $('#quizNext'); nx.hidden = false; nx.focus();
    const p = $('#quizPunches').children[qi]; if (p) p.className = ok ? 'hit' : 'miss';
    if (ok) snd.thump(); else snd.noiseBurst(300, 2, .15, .1);
  }
  on(quiz, 'click', (e) => {
    if (e.target === quiz) { closeQuiz(); return; }
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.a != null) answer(+b.dataset.a);
    else if (b.dataset.q === 'next') { qi++; renderQuiz(); }
    else if (b.dataset.q === 'again') openQuiz();
    else if (b.dataset.q === 'close') closeQuiz();
  });

  /* =========================================================
     SAVED PROGRESS + PRESENTER REMOTE (same browser, any window)
     ========================================================= */
  function save() { store.set('progress', { visited: [...st.visited], done: st.done, certWaits: st.certWaits, quizBest: st.quizBest, cards: st.cards || {} }); }
  const saved = store.get('progress', null);
  if (saved) {
    (Array.isArray(saved.visited) ? saved.visited : []).forEach((i) => { if (i >= 0 && i < STATIONS.length) st.visited.add(i); });
    if (saved.done && typeof saved.done === 'object') Object.assign(st.done, saved.done); if (saved.cards && typeof saved.cards === 'object') st.cards = saved.cards; st.certWaits = saved.certWaits || 0; st.quizBest = saved.quizBest ?? null;
  }
  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;
  function publish() {
    if (!bc) return;
    try {
      bc.postMessage({ type: 'state', cur: st.cur, target: st.target, moving: st.moving, tab: st.tab, lens: st.lens, lensUnlocked: st.lensUnlocked,
        visited: [...st.visited], polls: st.polls, revealed: st.revealed, started: st.started, quizOpen: !quiz.hidden, finaleOpen: !$('#finale').hidden,
        fpOpen: !fpBox.hidden, scenesOpen: !scenesOv.hidden,
        present: root.classList.contains('present') });
    } catch (_) {}
  }
  function changed() { save(); publish(); }
  function remote(m) {
    if (m.type === 'hello') { publish(); return; }
    if (!st.started) { board(); setTimeout(() => remote(m), 900); return; }
    const nav = () => { if (!fpBox.hidden) closeFP(); closeScenes(false); help.hidden = true; passport.hidden = true; if (!quiz.hidden) quiz.hidden = true; if (!$('#finale').hidden) closeFinale(); };
    switch (m.type) {
      case 'go': nav(); travelTo(m.i); break;
      case 'next': nav(); travelTo((st.moving ? st.target : st.cur) + 1); break;
      case 'prev': nav(); travelTo((st.moving ? st.target : st.cur) - 1); break;
      case 'tab': if (!st.moving && (m.tab !== 'scene' || STATIONS[st.cur].video)) { st.tab = m.tab; renderCard(false); } break;
      case 'lens': toggleLens(); break;
      case 'vote': vote(m.k); break;
      case 'reveal': reveal(); break;
      case 'rewind': nav(); travelTo(0, { rewind: true }); break;
      case 'finale': if (STATIONS.every((_, k) => st.visited.has(k))) { nav(); openFinale(); } else toast('Visit every station to unlock the ending.'); break;
      case 'quiz': if (quiz.hidden) openQuiz(); else closeQuiz(); break;
      case 'present': togglePresent(); break;
      case 'fp': if (!fpBox.hidden) closeFP(); else if (STATIONS[st.cur].fp && !st.moving) { nav(); openFP(STATIONS[st.cur].fp); } break;
      case 'scenes': if (scenesOv.hidden) openScenes(); else closeScenes(); break;
    }
  }
  if (bc) bc.onmessage = (e) => remote(e.data || {});

  /* =========================================================
     FIRST-PERSON VIEWS (lib/firstperson.ts, loaded on demand)
     ========================================================= */
  const fpBox = $('#fp');
  let fpCtl = null, fpKind = null;
  function fpHTML(i, s) {
    if (!s.fp) return '';
    const info = FP_INFO[s.fp], done = st.done['fp-' + s.fp];
    return `<button class="fp-tile" data-act="fp"><span class="fp-eye" aria-hidden="true"></span><span class="fp-txt">${animBadge('3D · computer-generated', 'xs')}<b>Step inside · ${esc(info.title)}</b><span>${esc(info.blurb)}</span></span>${done ? '<i class="fp-done" aria-label="explored">✓</i>' : '<kbd class="fp-key">E</kbd>'}</button>`;
  }
  async function openFP(kind) {
    if (fpCtl || !kind || st.moving) return;
    fpKind = kind; hideCard(); help.hidden = true; passport.hidden = true;
    fpBox.hidden = false; root.classList.add('fp-open');
    publish();
    try {
      const m = await import('./firstperson');
      if (disposed || fpKind !== kind) return;
      fpCtl = m.startFirstPerson(fpBox, kind, {
        reduced, visitor: st.visitor,
        sfx: { clack: () => snd.clack(), thump: () => snd.thump(), chime: () => snd.chime(), whistle: () => snd.whistle(), boom: () => snd.boom(),
          noise: (f, q, pk, d) => snd.noiseBurst(f, q, pk, d) },
        onFound: () => {},
        onComplete: () => { st.done['fp-' + kind] = true; save(); updatePass(true); },
        onExit: () => closeFP(),
      });
    } catch (e) { console.error(e); closeFP(); toast('This view could not load on this device.'); }
  }
  function closeFP() {
    if (fpCtl) { fpCtl.dispose(); fpCtl = null; }
    const was = fpKind; fpKind = null;
    fpBox.hidden = true; fpBox.innerHTML = ''; root.classList.remove('fp-open');
    if (was && !st.moving && $('#finale').hidden && quiz.hidden) showCard(false);
    publish();
  }

  /* =========================================================
     OUR SCENES overlay (components/Scenes.tsx renders inside #scenesOverlay)
     ========================================================= */
  const scenesOv = $('#scenesOverlay');
  function openScenes() {
    if (!scenesOv.hidden) return;
    hideCard(); help.hidden = true; passport.hidden = true;
    scenesOv.hidden = false; window.dispatchEvent(new CustomEvent('namesake:scenes-open')); publish();
  }
  function closeScenes(show = true) {
    if (scenesOv.hidden) return;
    scenesOv.hidden = true; window.dispatchEvent(new CustomEvent('namesake:scenes-closed'));
    if (show && !st.moving && $('#finale').hidden && quiz.hidden && fpBox.hidden) showCard(false);
    publish();
  }
  on($('#scenesBtn'), 'click', () => openScenes());
  on(window, 'namesake:scenes-close', () => closeScenes());
  on(window, 'namesake:go', (e) => { closeScenes(false); const i = +e.detail; if (!st.started) { board(); setTimeout(() => travelTo(i), 900); } else travelTo(i); });

  /* =========================================================
     SCENE POP-UP: when the train reaches a station with a filmed scene, the video opens and plays by itself
     ========================================================= */
  const scenePop = document.createElement('div');
  scenePop.className = 'overlay scene-pop mk-cinema'; scenePop.hidden = true;
  scenePop.innerHTML = `<div class="sp-frame" role="dialog" aria-labelledby="spTitle">
      <div class="sp-head">${filmBadge('Filmed by our group', 'md')}<h2 id="spTitle"></h2><button class="sp-close" aria-label="Close the scene">Skip ✕</button></div>
      <div class="mk-filmframe sp-reel"><video class="sp-video" playsinline controls preload="auto"></video></div>
      <div class="sp-bar"><i></i></div>
      <p class="sp-credit">${esc(GROUP_CREDIT)}</p>
    </div>`;
  root.appendChild(scenePop);
  const spVideo = scenePop.querySelector('.sp-video'), spBar = scenePop.querySelector('.sp-bar i');
  const videoOk = new Map(); // file -> Promise<boolean>
  function hasVideo(src) {
    if (!videoOk.has(src)) videoOk.set(src, fetch(src, { method: 'HEAD' }).then((r) => r.ok && !(r.headers.get('content-type') || '').includes('text/html')).catch(() => false));
    return videoOk.get(src);
  }
  let spFor = -1;
  function autoScene(i) {
    const s = STATIONS[i]; if (!s.video) return;
    hasVideo(s.video).then((ok) => {
      // still parked here, nothing else open
      if (!ok || disposed || st.cur !== i || st.moving || st.crashT >= 0 || !$('#finale').hidden || !quiz.hidden || !fpBox.hidden || !scenesOv.hidden) return;
      spFor = i;
      scenePop.querySelector('#spTitle').textContent = `${s.year} · ${s.title}`;
      spVideo.src = s.video; spVideo.currentTime = 0;
      scenePop.hidden = false; requestAnimationFrame(() => scenePop.classList.add('on'));
      hideCard();
      if (music) music.setEnabled(false);
      const p = spVideo.play(); if (p && p.catch) p.catch(() => { spVideo.muted = true; spVideo.play().catch(() => {}); });
      publish();
    });
  }
  function closeScenePop() {
    if (scenePop.hidden) return;
    spVideo.pause(); scenePop.classList.remove('on'); spFor = -1;
    if (music) music.setEnabled(snd.on);
    setTimeout(() => { scenePop.hidden = true; spVideo.removeAttribute('src'); spVideo.load(); if (!st.moving) showCard(false); }, 350);
    publish();
  }
  on(scenePop.querySelector('.sp-close'), 'click', closeScenePop);
  // full-screen viewing: the title and Skip fade out while the scene plays, and come back on any movement
  let spIdle = 0;
  const spWake = () => { scenePop.classList.remove('sp-idle'); clearTimeout(spIdle); spIdle = setTimeout(() => { if (!spVideo.paused) scenePop.classList.add('sp-idle'); }, 2600); };
  on(scenePop, 'pointermove', spWake); on(spVideo, 'play', spWake); on(spVideo, 'pause', () => scenePop.classList.remove('sp-idle'));
  on(spVideo, 'ended', closeScenePop);
  on(spVideo, 'timeupdate', () => { spBar.style.transform = `scaleX(${spVideo.duration ? spVideo.currentTime / spVideo.duration : 0})`; });
  on(scenePop, 'click', (e) => { if (e.target === scenePop) closeScenePop(); });

  /* boot */
  on(window, 'resize', () => { resize(); });
  resize();
  // title screen: the train waits out on the line short of the first stop (see board()), lit for the establishing shot
  st.trainX = hashStation() * SP - 900; st.cur = Math.max(0, hashStation() - 1); st.camX = st.trainX - anchor;
  root.classList.add('pre');
  setSound(snd.on);
  readFonts();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!disposed) { readFonts(); if (world) world.refreshText(); } });
  updatePass(false);
  rafId = requestAnimationFrame(frame);

  return () => {
    disposed = true;
    cancelAnimationFrame(rafId);
    offs.forEach((off) => off());
    clearInterval(typeIv);
    if (snd.ctx) snd.ctx.close().catch(() => {});
    if (bc) bc.close();
    if (music) music.dispose();
    if (fpCtl) fpCtl.dispose();
    if (world) world.dispose();
  };
}
