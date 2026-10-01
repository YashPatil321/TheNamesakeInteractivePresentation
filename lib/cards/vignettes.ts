// "Then & Now" animated vignettes: short, looping 2D canvas scenes that illustrate the present-day side of a
// station's NewsItem (lib/news.ts). They are clearly badged as ANIMATED (our illustration, not footage) and never
// restage a moment our group films. Every caption only restates what news.ts already says; the drawings are
// generic (no real people, places drawn from life, or invented numbers).
// Rendered by ./now.ts; styles in app/styles/now.css (classes vg-*).

type G = CanvasRenderingContext2D;

interface Beat { at: number; text: string }
interface Vignette {
  title: string;
  /** loop length, seconds */
  dur: number;
  /** frame shown with reduced motion */
  still: number;
  /** screen-reader description of the whole loop */
  alt: string;
  beats: Beat[];
  draw(g: G, t: number, f: Fonts): void;
}
interface Fonts { mono: string; body: string; display: string }

export const VW = 480, VH = 230;
const GROUND = 186;

/* ---------- tiny drawing kit ---------- */
const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const k = (t: number, a: number, b: number) => cl((t - a) / (b - a));
const eo = (x: number) => 1 - Math.pow(1 - cl(x), 3);
const eio = (x: number) => { x = cl(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
function seeded(n: number) { let s = n; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

const C = {
  ink: '#eaf3ff', soft: '#9fb7d6', cyan: '#7fd3ff', line: 'rgba(127,211,255,.07)',
  paper: '#eef3fa', paperInk: '#1a2a44', warm: '#f2b45a', red: '#ff7a7a', green: '#7fe0a8',
  skins: ['#c58c5c', '#8d5a3b', '#e2b48c', '#6b4630', '#a8714a'],
  shirts: ['#5ea0d8', '#e6a04a', '#9ad1c4', '#d8607a', '#b9a8e8', '#7bbf7b'],
  hair: ['#1d1714', '#3a2a20', '#1a1a22', '#5a3d2a'],
};

function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function bg(g: G, top = '#10203c', bot = '#1d3760') {
  const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, top); gr.addColorStop(1, bot);
  g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
  // faint blueprint grid: the house style for "generated"
  g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath();
  for (let x = 0.5; x < VW; x += 24) { g.moveTo(x, 0); g.lineTo(x, VH); }
  for (let y = 0.5; y < VH; y += 24) { g.moveTo(0, y); g.lineTo(VW, y); }
  g.stroke();
}
function floor(g: G, y = GROUND, c = 'rgba(127,211,255,.25)') { g.fillStyle = 'rgba(8,16,32,.45)'; g.fillRect(0, y, VW, VH - y); g.fillStyle = c; g.fillRect(0, y, VW, 1.5); }

interface P { skin?: string; shirt?: string; hair?: string; pants?: string; look?: number; bob?: number; s?: number; arm?: number; armL?: number; seated?: boolean; cap?: boolean; gown?: boolean; slump?: number; smile?: boolean; long?: boolean }
/** A friendly flat figure standing on (x, y). Seated figures draw only above y (a table hides the rest). */
function person(g: G, x: number, y: number, o: P = {}) {
  const s = o.s ?? 1, bob = o.bob ?? 0, sl = o.slump ?? 0;
  g.save(); g.translate(x, y - bob); g.scale(s, s);
  const skin = o.skin ?? C.skins[0], shirt = o.shirt ?? C.shirts[0];
  if (!o.seated) {
    g.fillStyle = o.pants ?? '#24324d';
    rr(g, -8, -24, 7, 24, 3); g.fill(); rr(g, 1, -24, 7, 24, 3); g.fill();
  }
  const by = o.seated ? -2 : -22;
  // body
  g.fillStyle = o.gown ? '#2a3a66' : shirt;
  if (o.gown) { g.beginPath(); g.moveTo(-12, by - 26); g.lineTo(12, by - 26); g.lineTo(15, by + (o.seated ? 0 : 20)); g.lineTo(-15, by + (o.seated ? 0 : 20)); g.closePath(); g.fill(); }
  else { rr(g, -12, by - 28 + sl * 3, 24, 30 - sl * 3, 8); g.fill(); }
  // arms
  g.strokeStyle = o.gown ? '#2a3a66' : shirt; g.lineWidth = 6; g.lineCap = 'round';
  const a = o.arm ?? 0.15, aL = o.armL ?? 0.15;
  g.beginPath(); g.moveTo(10, by - 22); g.lineTo(10 + Math.sin(a) * 18, by - 22 + Math.cos(a) * 18); g.stroke();
  g.beginPath(); g.moveTo(-10, by - 22); g.lineTo(-10 - Math.sin(aL) * 18, by - 22 + Math.cos(aL) * 18); g.stroke();
  g.fillStyle = skin;
  g.beginPath(); g.arc(10 + Math.sin(a) * 19, by - 22 + Math.cos(a) * 19, 3.2, 0, 7); g.fill();
  g.beginPath(); g.arc(-10 - Math.sin(aL) * 19, by - 22 + Math.cos(aL) * 19, 3.2, 0, 7); g.fill();
  // head
  const hy = by - 38 + sl * 6, lx = (o.look ?? 0) * 2.6;
  g.fillStyle = skin; g.beginPath(); g.arc(lx * 0.4, hy, 10, 0, 7); g.fill();
  g.fillStyle = o.hair ?? C.hair[0];
  g.beginPath(); g.arc(lx * 0.4, hy - 2, 10.4, Math.PI * 1.02, Math.PI * 1.98); g.fill();
  if (o.long) { rr(g, lx * 0.4 - 11, hy - 4, 5, 18, 2.5); g.fill(); rr(g, lx * 0.4 + 6, hy - 4, 5, 18, 2.5); g.fill(); }
  g.fillStyle = '#121a2a';
  g.beginPath(); g.arc(lx - 3.4, hy + 1 + sl, 1.3, 0, 7); g.arc(lx + 3.4, hy + 1 + sl, 1.3, 0, 7); g.fill();
  if (o.smile) { g.strokeStyle = '#121a2a'; g.lineWidth = 1.2; g.beginPath(); g.arc(lx, hy + 3.5, 3, 0.2, Math.PI - 0.2); g.stroke(); }
  if (o.cap) {
    g.fillStyle = '#1a2240'; g.beginPath(); g.moveTo(lx * 0.4 - 14, hy - 9); g.lineTo(lx * 0.4, hy - 15); g.lineTo(lx * 0.4 + 14, hy - 9); g.lineTo(lx * 0.4, hy - 4); g.closePath(); g.fill();
    g.strokeStyle = C.warm; g.lineWidth = 1.2; g.beginPath(); g.moveTo(lx * 0.4 + 4, hy - 9); g.lineTo(lx * 0.4 + 13, hy - 1); g.stroke();
  }
  g.restore();
}
function bubble(g: G, x: number, y: number, text: string, f: Fonts, a = 1, side: 1 | -1 = 1, size = 13) {
  if (a <= 0) return;
  g.save(); g.globalAlpha *= cl(a); g.font = `600 ${size}px ${f.body}`;
  const w = g.measureText(text).width + 20, h = size + 14;
  const bx = side > 0 ? x - 14 : x - w + 14, by = y - h - 10;
  g.translate(x, y); g.scale(lerp(0.85, 1, eo(a)), lerp(0.85, 1, eo(a))); g.translate(-x, -y);
  g.fillStyle = C.paper; rr(g, bx, by, w, h, 9); g.fill();
  g.beginPath(); g.moveTo(x - 5 * side, by + h - 1); g.lineTo(x, y - 2); g.lineTo(x + 6 * side, by + h - 1); g.closePath(); g.fill();
  g.fillStyle = C.paperInk; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(text, bx + 10, by + h / 2 + 0.5);
  g.restore();
}
function label(g: G, text: string, x: number, y: number, f: Fonts, o: { size?: number; color?: string; align?: CanvasTextAlign; font?: string; weight?: number } = {}) {
  g.font = `${o.weight ?? 700} ${o.size ?? 11}px ${o.font ?? f.mono}`; g.fillStyle = o.color ?? C.soft; g.textAlign = o.align ?? 'center'; g.textBaseline = 'middle';
  g.fillText(text, x, y);
}
function steam(g: G, x: number, y: number, t: number, a: number) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = 0.55 * a; g.strokeStyle = '#dfeaff'; g.lineWidth = 2; g.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const ph = t * 2 + i * 2.1, ox = x + (i - 1) * 9;
    g.beginPath();
    for (let j = 0; j <= 12; j++) { const yy = y - j * 2.2 - (ph % 1) * 4; const xx = ox + Math.sin(ph + j * 0.5) * 3; if (j) g.lineTo(xx, yy); else g.moveTo(xx, yy); }
    g.stroke();
  }
  g.restore();
}
function waveform(g: G, x: number, y: number, w: number, h: number, t: number, fill: number, color: string) {
  const n = 26, bw = w / n;
  g.fillStyle = color;
  for (let i = 0; i < n * cl(fill); i++) {
    const v = 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6 + 1)) * (0.8 + 0.2 * Math.sin(t * 6 + i));
    rr(g, x + i * bw + 1, y - (h * v) / 2, bw - 2, h * v, 1.5); g.fill();
  }
}

/* ---------- the vignettes, keyed by station index ---------- */
const V: Record<number, Vignette> = {
  // 1961 → today: the 1965 law and the community it made possible
  0: {
    title: 'A law opens the door', dur: 9.5, still: 8.2,
    alt: 'Animation: travelers with suitcases wait at a barrier beside a booth. The barrier lifts and they walk through toward a row of houses, and the hillside behind fills with small figures, a community growing.',
    beats: [
      { at: 0, text: 'A law decides who is allowed in.' },
      { at: 3.0, text: 'The 1965 law ended the national-origins quotas that had kept many Indians out.' },
      { at: 6.0, text: 'Today about 3.2 million Indian immigrants live in the U.S.' },
    ],
    draw(g, t, f) {
      bg(g);
      // the community on the hill behind
      const R = seeded(7), n = Math.floor(90 * eo(k(t, 5.6, 8.2)));
      g.fillStyle = 'rgba(127,211,255,.10)'; g.beginPath(); g.ellipse(390, GROUND + 6, 170, 72, 0, Math.PI, 0); g.fill();
      for (let i = 0; i < 90; i++) {
        const px = 250 + R() * 225, py = GROUND - 8 - R() * 52, c = C.shirts[(R() * 6) | 0];
        if (i >= n || Math.hypot((px - 390) / 170, (py - GROUND - 6) / 72) > 0.95) continue;
        g.fillStyle = c; g.beginPath(); g.arc(px, py, 2.3, 0, 7); g.fill();
      }
      // houses
      for (let i = 0; i < 4; i++) {
        const hx = 300 + i * 44, a = eo(k(t, 2.6 + i * 0.35, 3.3 + i * 0.35));
        if (a <= 0) continue;
        g.save(); g.globalAlpha = a; g.translate(hx, GROUND); g.scale(1, a);
        g.fillStyle = ['#3a4f7a', '#46557e', '#3d5a6e', '#4f4a72'][i]; g.fillRect(-16, -30, 32, 30);
        g.beginPath(); g.moveTo(-20, -30); g.lineTo(0, -46); g.lineTo(20, -30); g.fillStyle = '#26324f'; g.fill();
        g.fillStyle = t > 3.6 + i * 0.4 ? C.warm : '#2a3654'; g.fillRect(-9, -22, 7, 8); g.fillRect(3, -22, 7, 8);
        g.restore();
      }
      floor(g);
      // booth + barrier
      g.fillStyle = '#2b3d63'; g.fillRect(186, GROUND - 64, 46, 64); g.fillStyle = '#9fc3ea'; g.fillRect(192, GROUND - 56, 34, 20);
      label(g, 'ENTRY', 209, GROUND - 71, f, { size: 9, color: C.cyan });
      person(g, 209, GROUND - 28, { seated: true, s: 0.55, shirt: '#33507e', skin: C.skins[2], hair: C.hair[3] });
      const ang = -1.25 * eio(k(t, 1.3, 1.9));
      g.save(); g.translate(236, GROUND - 30); g.rotate(ang);
      g.fillStyle = '#e8eef8'; g.fillRect(0, -3, 62, 6); g.fillStyle = C.red; for (let s = 8; s < 62; s += 16) g.fillRect(s, -3, 7, 6);
      g.restore(); g.fillStyle = '#9aa9c4'; g.fillRect(233, GROUND - 34, 6, 34);
      // travelers
      for (let j = 0; j < 5; j++) {
        const t0 = 0.15 + j * 0.55, w = 168 - j * 26, ta = t0 + (w + 20) / 62, rel = Math.max(1.8 + j * 0.42, ta);
        let x = t < ta ? -20 + 62 * (t - t0) : t < rel ? w : w + 62 * (t - rel);
        const dest = 300 + j * 36 + (j % 2) * 8;
        x = Math.min(x, dest);
        const walking = (t < ta || t >= rel) && x < dest && t > t0;
        if (t < t0) continue;
        const bob = walking ? Math.abs(Math.sin(t * 9 + j)) * 2 : 0;
        person(g, x, GROUND, { s: 0.85, bob, shirt: C.shirts[j], skin: C.skins[(j + 1) % 5], hair: C.hair[j % 4], long: j % 2 === 1, smile: x >= dest });
        g.fillStyle = ['#7a5a3a', '#5a6a8a', '#8a4a4a', '#4a6a5a', '#6a5a7a'][j]; rr(g, x + 9, GROUND - 16, 12, 14, 2); g.fill();
      }
    },
  },

  // 1968 → 2023: an official form decides how a name may look
  2: {
    title: 'A form that can’t spell a name', dur: 10, still: 8.6,
    alt: 'Animation: a birth certificate form. Someone types the name José; the form rejects the accented é and turns it into a plain e. Then a stamp reads Proposed: AB 77, and the accent is accepted.',
    beats: [
      { at: 0, text: 'An official birth form decides how a child’s name is allowed to look.' },
      { at: 2.3, text: 'California had not allowed accent marks like é or ñ on state records since 1986.' },
      { at: 5.6, text: 'A 2023 bill, AB 77, proposed allowing them.' },
    ],
    draw(g, t, f) {
      bg(g);
      const shake = t > 2.0 && t < 2.6 ? Math.sin(t * 70) * 4 * (1 - k(t, 2.0, 2.6)) : 0;
      g.save(); g.translate(shake, 0);
      g.fillStyle = 'rgba(0,0,0,.25)'; rr(g, 66, 30, 356, 168, 8); g.fill();
      g.fillStyle = C.paper; rr(g, 62, 24, 356, 168, 8); g.fill();
      g.fillStyle = '#c9d6ea'; g.fillRect(62, 52, 356, 1.5);
      label(g, 'CERTIFICATE OF LIVE BIRTH', 240, 39, f, { size: 12, color: C.paperInk });
      label(g, 'NAME OF CHILD', 84, 74, f, { size: 9, color: '#5a6d8e', align: 'left' });
      const typed = t < 0.6 ? 0 : Math.min(4, 1 + Math.floor((t - 0.6) / 0.42));
      const fixed = t > 3.3 && t < 6.6;
      const name = fixed ? 'Jose' : 'José';
      const bad = t >= 2.0 && t < 3.3, good = t >= 6.6;
      g.strokeStyle = bad ? C.red : good ? '#2fa36b' : '#8aa0c4'; g.lineWidth = bad || good ? 2.5 : 1.5;
      g.fillStyle = '#fff'; rr(g, 82, 82, 316, 40, 6); g.fill(); g.stroke();
      g.font = `600 22px ${f.body}`; g.fillStyle = C.paperInk; g.textAlign = 'left'; g.textBaseline = 'middle';
      const shown = name.slice(0, typed);
      g.fillText(shown, 96, 103);
      if (Math.floor(t * 2.2) % 2 === 0 && !good) { const w = g.measureText(shown).width; g.fillStyle = C.paperInk; g.fillRect(98 + w, 92, 1.6, 22); }
      if (bad) label(g, '✕  Character not allowed: é', 84, 136, f, { size: 11, color: '#d0453f', align: 'left' });
      if (fixed && t < 5.4) label(g, 'Changed to: Jose', 84, 136, f, { size: 11, color: '#5a6d8e', align: 'left' });
      if (good) label(g, '✓  José', 84, 136, f, { size: 12, color: '#2fa36b', align: 'left' });
      // the bill's stamp
      const st = eo(k(t, 5.6, 6.1));
      if (st > 0) {
        g.save(); g.translate(330, 158); g.rotate(-0.12); g.scale(lerp(1.8, 1, st), lerp(1.8, 1, st)); g.globalAlpha = st;
        g.strokeStyle = '#2f6fd0'; g.lineWidth = 2.5; rr(g, -64, -16, 128, 32, 4); g.stroke();
        label(g, 'PROPOSED · AB 77', 0, 1, f, { size: 12, color: '#2f6fd0' });
        g.restore();
      }
      g.restore();
    },
  },

  // 1968 → 2023: a tradition written into a school calendar
  3: {
    title: 'On the school calendar', dur: 9, still: 7.5,
    alt: 'Animation: a school calendar page. A small clay lamp, a diya, floats in and settles on one day, which lights up and reads No school, Diwali. More lamps glow along the bottom.',
    beats: [
      { at: 0, text: 'In 1968 the Bengali community kept its traditions alive in private.' },
      { at: 3.2, text: 'In 2023 New York made Diwali a city public school holiday.' },
      { at: 6.0, text: 'Community organizing got a tradition written into the calendar.' },
    ],
    draw(g, t, f) {
      bg(g, '#13203a', '#22284f');
      const X = 128, Y = 18, W = 224, H = 170;
      g.fillStyle = 'rgba(0,0,0,.25)'; rr(g, X + 4, Y + 5, W, H, 8); g.fill();
      g.fillStyle = C.paper; rr(g, X, Y, W, H, 8); g.fill();
      g.fillStyle = '#2f5d9a'; rr(g, X, Y, W, 28, 8); g.fill(); g.fillRect(X, Y + 18, W, 10);
      label(g, 'SCHOOL CALENDAR', X + W / 2, Y + 15, f, { size: 11, color: '#fff' });
      const cw = W / 7, ch = 27, gx = X, gy = Y + 34;
      const TR = 2, TC = 3; // target cell
      for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) {
        const d = r * 7 + c + 1; if (d > 30) continue;
        const x = gx + c * cw, y = gy + r * ch, hit = r === TR && c === TC;
        const lit = hit ? eo(k(t, 3.0, 3.6)) : 0;
        g.fillStyle = lit > 0 ? `rgba(242,180,90,${0.25 + 0.6 * lit})` : (c === 0 || c === 6 ? '#e2e8f2' : '#f7f9fc');
        g.fillRect(x + 1, y + 1, cw - 2, ch - 2);
        label(g, String(d), x + 7, y + 8, f, { size: 8, color: '#6a7a96', align: 'left', weight: 400 });
        if (hit && lit > 0) { g.globalAlpha = lit; label(g, 'NO SCHOOL', x + cw / 2, y + 15, f, { size: 6.5, color: '#7a3b10' }); label(g, 'Diwali', x + cw / 2, y + 22, f, { size: 7, color: '#7a3b10' }); g.globalAlpha = 1; }
      }
      // the diya floats in on an arc and settles in the day
      const u = eio(k(t, 0.8, 3.0));
      const tx = gx + TC * cw + cw / 2, ty = gy + TR * ch + 6;
      const dx = lerp(40, tx, u), dy = lerp(150, ty, u) - Math.sin(u * Math.PI) * 60;
      const sc = lerp(1.6, 0.55, u);
      if (t < 3.05) diya(g, dx, dy, sc, t);
      // a row of lamps along the bottom
      for (let i = 0; i < 7; i++) { const a = eo(k(t, 4.2 + i * 0.22, 4.8 + i * 0.22)); if (a > 0) { g.globalAlpha = a; diya(g, 60 + i * 60, 214, 0.75, t + i); g.globalAlpha = 1; } }
    },
  },

  // 1973 → 2026: who decides how a name is said at school
  4: {
    title: 'Names at commencement', dur: 11.5, still: 6.2,
    alt: 'Animation: a graduate records her own name on a phone. At commencement a speaker on the podium plays it back while she crosses the stage in cap and gown. Then two reactions: a check mark for names said right, and a petition asking for a human announcer.',
    beats: [
      { at: 0, text: 'A Texas school district planned to have AI read graduates’ names.' },
      { at: 2.0, text: 'Students record how their own names should be said.' },
      { at: 4.2, text: 'At commencement, the recording guides the AI voice.' },
      { at: 8.0, text: 'Some seniors welcomed it. Others petitioned for a human announcer.' },
    ],
    draw(g, t, f) {
      bg(g);
      const p1 = 1 - k(t, 3.6, 4.2), p2 = k(t, 3.6, 4.2) * (1 - k(t, 7.6, 8.1)), p3 = k(t, 7.6, 8.1);
      if (p1 > 0) {
        g.save(); g.globalAlpha = p1;
        floor(g);
        person(g, 190, GROUND, { s: 1.5, shirt: C.shirts[4], skin: C.skins[1], hair: C.hair[0], long: true, arm: 2.3, look: 1 });
        // phone
        g.fillStyle = '#0c1424'; rr(g, 248, 72, 64, 112, 10); g.fill(); g.fillStyle = '#18294a'; rr(g, 253, 80, 54, 96, 6); g.fill();
        label(g, 'RECORD', 280, 93, f, { size: 8, color: C.cyan });
        label(g, 'YOUR NAME', 280, 104, f, { size: 8, color: C.cyan });
        waveform(g, 258, 132, 44, 30, t, k(t, 1.2, 3.2), C.cyan);
        g.fillStyle = Math.floor(t * 3) % 2 ? '#ff5a5a' : '#c03a3a'; g.beginPath(); g.arc(280, 162, 5, 0, 7); g.fill();
        g.restore();
      }
      if (p2 > 0) {
        g.save(); g.globalAlpha = p2;
        // stage + screen
        g.fillStyle = '#26365c'; g.fillRect(0, GROUND - 10, VW, 10);
        floor(g, GROUND);
        g.fillStyle = '#0c1424'; rr(g, 150, 18, 180, 70, 6); g.fill();
        label(g, 'COMMENCEMENT', 240, 32, f, { size: 9, color: C.soft });
        waveform(g, 172, 62, 136, 34, t, 1, C.cyan);
        // podium with the speaker
        g.fillStyle = '#3a4d78'; g.fillRect(380, GROUND - 52, 40, 42); g.fillStyle = '#1a2440'; rr(g, 390, GROUND - 74, 20, 22, 4); g.fill();
        g.strokeStyle = C.cyan; g.lineWidth = 2;
        for (let i = 0; i < 3; i++) { const r = 10 + ((t * 18 + i * 9) % 27); g.globalAlpha = p2 * (1 - r / 37); g.beginPath(); g.arc(400, GROUND - 63, r, -Math.PI * 0.8, -Math.PI * 0.2); g.stroke(); }
        g.globalAlpha = p2;
        // the graduate crosses
        const x = lerp(40, 330, eio(k(t, 4.2, 7.4)));
        person(g, x, GROUND - 10, { s: 1, gown: true, cap: true, skin: C.skins[1], hair: C.hair[0], long: true, bob: Math.abs(Math.sin(t * 8)) * 1.5, smile: true, look: 1 });
        g.restore();
      }
      if (p3 > 0) {
        g.save(); g.globalAlpha = p3;
        floor(g);
        // left: welcomed
        person(g, 120, GROUND, { s: 1.15, cap: true, gown: true, skin: C.skins[0], hair: C.hair[1], smile: true, arm: 2.6 });
        g.fillStyle = 'rgba(127,224,168,.18)'; g.beginPath(); g.arc(120, 52, 26, 0, 7); g.fill();
        g.strokeStyle = C.green; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(108, 52); g.lineTo(117, 61); g.lineTo(134, 42); g.stroke();
        g.fillStyle = 'rgba(127,211,255,.2)'; g.fillRect(239, 30, 2, 150);
        // right: a petition
        person(g, 330, GROUND, { s: 1.15, cap: true, gown: true, skin: C.skins[3], hair: C.hair[2], arm: 1.4 });
        g.save(); g.translate(372, 84); g.rotate(0.08);
        g.fillStyle = '#7a5a3a'; rr(g, -30, -40, 60, 82, 4); g.fill(); g.fillStyle = C.paper; g.fillRect(-25, -32, 50, 70);
        label(g, 'PETITION', 0, -22, f, { size: 7, color: C.paperInk });
        label(g, 'A HUMAN', 0, -11, f, { size: 6.5, color: '#5a6d8e' });
        label(g, 'ANNOUNCER', 0, -3, f, { size: 6.5, color: '#5a6d8e' });
        g.strokeStyle = '#5a6d8e'; g.lineWidth = 1;
        const nSig = Math.floor(6 * k(t, 8.2, 10.6));
        for (let i = 0; i < nSig; i++) { g.beginPath(); const y = 8 + i * 5; g.moveTo(-18, y); for (let j = 0; j < 6; j++) g.lineTo(-18 + j * 6, y + (j % 2 ? -2 : 1)); g.stroke(); }
        g.restore();
        g.restore();
      }
    },
  },

  // 1982 → 2024: learning to be ashamed of what comes from home
  6: {
    title: 'The lunchbox', dur: 11, still: 9.2,
    alt: 'Animation: at a school cafeteria table a kid opens a home-cooked lunch; steam rises and the other kids turn to stare, so the kid closes the lid and slumps. Then, years later, the same food is set out proudly for a table of smiling adult friends.',
    beats: [
      { at: 0, text: 'A kid opens a home-cooked lunch at school…' },
      { at: 2.2, text: '…gets stared at, and learns to feel ashamed of it.' },
      { at: 6.2, text: 'Many reclaim that food with pride as adults.' },
    ],
    draw(g, t, f) {
      bg(g);
      const pA = 1 - k(t, 5.6, 6.2), pB = k(t, 5.6, 6.2);
      const TY = 140;
      if (pA > 0) {
        g.save(); g.globalAlpha = pA;
        floor(g);
        const look = eo(k(t, 2.0, 2.4)), slump = eo(k(t, 3.9, 4.6));
        person(g, 140, TY, { seated: true, s: 1.1, shirt: C.shirts[1], skin: C.skins[1], hair: C.hair[0], slump, look: slump ? 0 : 1 });
        person(g, 290, TY, { seated: true, s: 1.05, shirt: C.shirts[0], skin: C.skins[2], hair: C.hair[3], look: lerp(1, -1, look) });
        person(g, 360, TY, { seated: true, s: 1.05, shirt: C.shirts[3], skin: C.skins[0], hair: C.hair[1], long: true, look: lerp(1, -1, look) });
        table(g, TY);
        // tiffin box + lid
        g.fillStyle = '#b8c4d6'; rr(g, 160, TY - 16, 46, 16, 3); g.fill();
        g.fillStyle = '#e2a24a'; g.fillRect(164, TY - 14, 38, 4);
        const open = eo(k(t, 0.6, 1.2)) * (1 - eo(k(t, 3.6, 4.0)));
        g.save(); g.translate(206, TY - 16); g.rotate(-open * 1.9); g.fillStyle = '#d2dbe8'; rr(g, -46, -5, 46, 5, 2); g.fill(); g.restore();
        steam(g, 183, TY - 18, t, open * k(t, 1.0, 1.6));
        // the stare
        if (look > 0 && t < 4.6) { g.globalAlpha = pA * look * (1 - k(t, 4.2, 4.6)); label(g, '?', 304, 76, f, { size: 16, color: C.ink, font: f.body }); label(g, '?', 374, 72, f, { size: 16, color: C.ink, font: f.body }); }
        g.restore();
      }
      if (pB > 0) {
        g.save(); g.globalAlpha = pB;
        g.fillStyle = 'rgba(242,180,90,.10)'; g.beginPath(); g.arc(240, 100, 150, 0, 7); g.fill();
        floor(g);
        person(g, 110, TY, { seated: true, s: 1.2, shirt: C.shirts[2], skin: C.skins[0], hair: C.hair[2], smile: true, look: 1 });
        person(g, 200, TY, { seated: true, s: 1.25, shirt: C.shirts[1], skin: C.skins[1], hair: C.hair[0], smile: true, arm: 1.9, look: 1 });
        person(g, 300, TY, { seated: true, s: 1.2, shirt: C.shirts[4], skin: C.skins[3], hair: C.hair[1], long: true, smile: true, look: -1 });
        person(g, 385, TY, { seated: true, s: 1.2, shirt: C.shirts[5], skin: C.skins[2], hair: C.hair[3], smile: true, look: -1 });
        table(g, TY);
        const d = eo(k(t, 6.2, 7.0));
        g.fillStyle = '#e8eef8'; g.beginPath(); g.ellipse(lerp(220, 250, d), TY - 4, 34, 7, 0, 0, 7); g.fill();
        g.fillStyle = '#d98a3a'; g.beginPath(); g.ellipse(lerp(220, 250, d), TY - 7, 24, 6, 0, Math.PI, 0); g.fill();
        steam(g, lerp(220, 250, d), TY - 12, t, d);
        for (let i = 0; i < 5; i++) { const a = k(t, 7.2 + i * 0.3, 7.6 + i * 0.3); if (a > 0) { g.globalAlpha = pB * a * (1 - k(t, 10.4, 10.9)); sparkle(g, 150 + i * 50, 46 + (i % 2) * 14, 5 + (i % 3)); } }
        g.restore();
      }
    },
  },

  // 1986 → 2024: same résumé, different name
  8: {
    title: 'Same résumé, different name', dur: 10.5, still: 9.0,
    alt: 'Animation: two identical résumés side by side. Only the name line differs, labeled white-sounding name and Black-sounding name. Callback bars grow beneath each; the first grows slightly taller.',
    beats: [
      { at: 0, text: 'Economists sent about 83,000 fake job applications to large U.S. companies.' },
      { at: 2.8, text: 'The résumés matched. Only the names were changed.' },
      { at: 5.4, text: 'The typical employer called back white-sounding names about 9% more often.' },
    ],
    draw(g, t, f) {
      bg(g);
      const sheet = (x: number, nameCol: string, tag: string, d: number) => {
        const y = lerp(-170, 18, eo(k(t, d, d + 0.8)));
        g.fillStyle = 'rgba(0,0,0,.25)'; rr(g, x + 4, y + 5, 140, 150, 6); g.fill();
        g.fillStyle = C.paper; rr(g, x, y, 140, 150, 6); g.fill();
        const hl = k(t, 2.8, 3.4) * (1 - k(t, 5.0, 5.4));
        if (hl > 0) { g.fillStyle = `rgba(255,214,102,${0.55 * hl})`; rr(g, x + 10, y + 10, 120, 18, 4); g.fill(); }
        g.fillStyle = nameCol; rr(g, x + 14, y + 14, 88, 10, 3); g.fill();
        g.fillStyle = '#b6c3d8';
        for (let i = 0; i < 9; i++) { const w = [100, 80, 110, 70, 105, 90, 60, 100, 85][i]; g.fillRect(x + 14, y + 40 + i * 11, w, 4); }
        label(g, tag, x + 70, y + 164, f, { size: 11, color: C.soft });
      };
      sheet(60, '#3f6fb0', 'WHITE-SOUNDING NAME', 0.2);
      sheet(280, '#9a5fb0', 'BLACK-SOUNDING NAME', 0.5);
      const eq = k(t, 1.6, 2.2);
      if (eq > 0) { g.globalAlpha = eq; label(g, '=', 240, 92, f, { size: 34, color: C.cyan, font: f.body }); label(g, 'SAME', 240, 118, f, { size: 9, color: C.cyan }); g.globalAlpha = 1; }
      // callback bars: the stated figure, about 9% more for the first
      const grow = eo(k(t, 5.4, 7.6));
      if (grow > 0) {
        const base = 30 * grow;
        g.fillStyle = 'rgba(8,16,32,.6)'; g.fillRect(40, 196, 400, 34);
        g.fillStyle = C.cyan; rr(g, 140, 222 - base * 1.09, 26, base * 1.09, 3); g.fill();
        g.fillStyle = '#9fb7d6'; rr(g, 360, 222 - base, 26, base, 3); g.fill();
        label(g, 'CALLBACKS', 240, 212, f, { size: 9, color: C.soft });
        if (grow > 0.98) label(g, '≈ +9%', 196, 205, f, { size: 11, color: C.cyan });
      }
    },
  },

  // 1990s → 2023: the "perpetual foreigner" question
  10: {
    title: '“Where are you really from?”', dur: 10, still: 8.4,
    alt: 'Animation: two people at a dinner table with candles. One asks, Where are you from? The other answers, Here. I was born here. The first asks again, No, where are you really from? The second looks down.',
    beats: [
      { at: 0, text: 'Small talk at a dinner table.' },
      { at: 4.4, text: 'An American with brown skin is assumed to be from somewhere else.' },
      { at: 7.2, text: 'Most Asian Americans surveyed say they have been treated as foreigners (Pew, 2023).' },
    ],
    draw(g, t, f) {
      bg(g, '#151b34', '#2a2448');
      g.fillStyle = 'rgba(242,180,90,.08)'; g.beginPath(); g.arc(240, 120, 140, 0, 7); g.fill();
      floor(g);
      const TY = 146, sad = eo(k(t, 5.4, 6.0));
      person(g, 140, TY, { seated: true, s: 1.25, shirt: '#8a9ab8', skin: C.skins[2], hair: C.hair[3], look: 1, smile: t < 4.4, arm: t > 4.4 && t < 6 ? 1.6 : 0.3 });
      person(g, 340, TY, { seated: true, s: 1.25, shirt: C.shirts[0], skin: C.skins[1], hair: C.hair[0], look: sad ? 0 : -1, slump: sad * 0.7, smile: t < 4.4 });
      table(g, TY);
      for (const cx of [222, 258]) {
        g.fillStyle = '#e8eef8'; g.fillRect(cx - 2, TY - 22, 4, 18);
        const fl = 1 + Math.sin(t * 13 + cx) * 0.12;
        g.fillStyle = C.warm; g.beginPath(); g.ellipse(cx, TY - 27, 3 * fl, 5 * fl, 0, 0, 7); g.fill();
      }
      bubble(g, 150, 70, 'Where are you from?', f, k(t, 0.6, 0.9) * (1 - k(t, 4.0, 4.3)), 1);
      bubble(g, 330, 70, 'Here. I was born here.', f, k(t, 2.2, 2.5) * (1 - k(t, 4.0, 4.3)), -1);
      bubble(g, 150, 70, 'No, where are you really from?', f, k(t, 4.4, 4.7) * (1 - k(t, 9.4, 9.8)), 1);
    },
  },

  // 1990s → 2025: tradition, adapted
  11: {
    title: 'A river stands in for the Ganges', dur: 12, still: 7.0,
    alt: 'Animation: a calm river at dusk with trees on the far bank. A family stands on the near bank; marigold flowers drift out from the shore and float slowly downstream.',
    beats: [
      { at: 0, text: 'Families who can’t travel to India’s Ganges River to scatter ashes…' },
      { at: 4.0, text: '…have made Florida’s Suwannee River a substitute site.' },
      { at: 8.0, text: 'Grief pulls families back to tradition, adapted to a new country.' },
    ],
    draw(g, t, f) {
      bg(g, '#1a2346', '#3a3a5e');
      g.fillStyle = 'rgba(242,180,90,.22)'; g.beginPath(); g.arc(380, 92, 22, 0, 7); g.fill();
      // far bank trees
      g.fillStyle = '#1a2a3a'; g.fillRect(0, 96, VW, 22);
      for (let i = 0; i < 16; i++) { const x = i * 32 + (i % 3) * 7; g.beginPath(); g.ellipse(x, 96, 18, 24 + (i % 4) * 5, 0, Math.PI, 0); g.fill(); }
      // water
      const wg = g.createLinearGradient(0, 118, 0, 196); wg.addColorStop(0, '#2b4870'); wg.addColorStop(1, '#1d3254');
      g.fillStyle = wg; g.fillRect(0, 118, VW, 78);
      g.strokeStyle = 'rgba(200,225,255,.18)'; g.lineWidth = 1.5;
      for (let i = 0; i < 9; i++) { const y = 126 + i * 8, off = ((t * 18 + i * 37) % 120); g.beginPath(); for (let x = -120 + off; x < VW; x += 120) { g.moveTo(x, y); g.lineTo(x + 40, y); } g.stroke(); }
      g.fillStyle = 'rgba(242,180,90,.18)'; g.fillRect(360, 122, 40, 3); g.fillRect(366, 132, 28, 2);
      // marigolds drifting
      for (let i = 0; i < 9; i++) {
        const s0 = 1.2 + i * 0.7; if (t < s0) continue;
        const u = t - s0, x = 96 + u * 26 + Math.sin(u + i) * 4, y = 172 - Math.min(u, 1.2) * 24 + (i % 3) * 6 + Math.sin(u * 2 + i) * 1.2;
        if (x > VW + 10) continue;
        g.fillStyle = i % 2 ? '#f29a2e' : '#f6c23e'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill();
        g.fillStyle = 'rgba(122,59,16,.6)'; g.beginPath(); g.arc(x, y, 1.5, 0, 7); g.fill();
      }
      // near bank + family
      g.fillStyle = '#18233a'; g.beginPath(); g.moveTo(0, 196); g.lineTo(0, 168); g.quadraticCurveTo(70, 160, 120, 196); g.closePath(); g.fill(); g.fillRect(0, 196, VW, 34);
      person(g, 40, 176, { s: 0.85, shirt: '#e8eef8', skin: C.skins[1], hair: C.hair[0], look: 1, arm: 1.2 });
      person(g, 70, 180, { s: 0.8, shirt: '#e8eef8', skin: C.skins[3], hair: C.hair[1], long: true, look: 1 });
      person(g, 15, 182, { s: 0.65, shirt: '#e8eef8', skin: C.skins[1], hair: C.hair[0], look: 1 });
    },
  },
};

function table(g: G, y: number) {
  g.fillStyle = '#5a4630'; rr(g, 50, y, 380, 12, 3); g.fill();
  g.fillStyle = '#463624'; g.fillRect(80, y + 12, 8, GROUND - y - 12); g.fillRect(392, y + 12, 8, GROUND - y - 12);
}
function diya(g: G, x: number, y: number, s: number, t: number) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = 'rgba(255,190,90,.22)'; g.beginPath(); g.arc(0, -10, 16, 0, 7); g.fill();
  g.fillStyle = '#b4542a'; g.beginPath(); g.ellipse(0, 0, 14, 6, 0, 0, Math.PI); g.lineTo(-14, 0); g.fill();
  g.fillStyle = '#d06a34'; g.beginPath(); g.ellipse(0, 0, 14, 3, 0, 0, 7); g.fill();
  const fl = 1 + Math.sin(t * 14) * 0.12;
  g.fillStyle = '#ffd36b'; g.beginPath(); g.ellipse(6, -7, 3 * fl, 6 * fl, 0.15, 0, 7); g.fill();
  g.restore();
}
function sparkle(g: G, x: number, y: number, r: number) {
  g.fillStyle = C.warm; g.beginPath();
  g.moveTo(x, y - r); g.lineTo(x + r * 0.3, y - r * 0.3); g.lineTo(x + r, y); g.lineTo(x + r * 0.3, y + r * 0.3);
  g.lineTo(x, y + r); g.lineTo(x - r * 0.3, y + r * 0.3); g.lineTo(x - r, y); g.lineTo(x - r * 0.3, y - r * 0.3); g.closePath(); g.fill();
}

export const VIGNETTE_STATIONS = Object.keys(V).map(Number);

const beatAt = (v: Vignette, t: number) => { let b = v.beats[0]; for (const x of v.beats) if (t >= x.at) b = x; return b; };

/** HTML for the vignette block (badge, canvas, caption, controls). '' when the station has none. */
export function vignetteHTML(i: number, esc: (s: string) => string, badge: string): string {
  const v = V[i];
  if (!v) return '';
  return `<figure class="vg" data-vg="${i}">
    <div class="vg-top">${badge}<span class="vg-title">${esc(v.title)}</span></div>
    <div class="vg-stage">
      <canvas class="vg-canvas" width="${VW}" height="${VH}" role="img" aria-label="${esc(v.alt)}"></canvas>
      <div class="vg-ctl">
        <button type="button" class="vg-btn" data-vg-toggle aria-label="Pause the animation">❚❚</button>
        <button type="button" class="vg-btn" data-vg-replay aria-label="Replay the animation">↻</button>
      </div>
      <div class="vg-bar" aria-hidden="true"><i></i></div>
    </div>
    <figcaption class="vg-cap"><span class="vg-cap-t">${esc(v.beats[0].text)}</span><small>Our animated illustration of the news story below, not real footage.</small></figcaption>
  </figure>`;
}

/** Starts the vignette inside `root` (if any). Returns a cleanup. */
export function mountVignette(root: HTMLElement, i: number): (() => void) | void {
  const v = V[i];
  const fig = root.querySelector<HTMLElement>(`.vg[data-vg="${i}"]`);
  if (!v || !fig) return;
  const canvas = fig.querySelector<HTMLCanvasElement>('.vg-canvas')!;
  const g = canvas.getContext('2d');
  if (!g) return;
  const capT = fig.querySelector<HTMLElement>('.vg-cap-t')!, bar = fig.querySelector<HTMLElement>('.vg-bar i')!;
  const toggle = fig.querySelector<HTMLButtonElement>('[data-vg-toggle]')!, replay = fig.querySelector<HTMLButtonElement>('[data-vg-replay]')!;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cs = getComputedStyle(canvas);
  const pick = (n: string, fb: string) => cs.getPropertyValue(n).trim() || fb;
  const fonts: Fonts = { mono: pick('--mono', '"Courier New", monospace'), body: pick('--body', 'Georgia, serif'), display: pick('--display', 'Georgia, serif') };

  let raf = 0, playing = !reduced, once = reduced, t0 = performance.now(), tPaused = v.still, lastCap = '';
  let dpr = 0;
  const size = () => {
    const d = Math.min(2, window.devicePixelRatio || 1) * Math.max(1, (canvas.clientWidth || VW) / VW);
    if (Math.abs(d - dpr) < 0.01) return;
    dpr = d; canvas.width = Math.round(VW * d); canvas.height = Math.round(VH * d);
  };
  const frame = (t: number) => {
    size();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1;
    g.clearRect(0, 0, VW, VH);
    v.draw(g, t, fonts);
    // soft fade at the loop seam
    const seam = Math.max(1 - t / 0.35, (t - (v.dur - 0.45)) / 0.45, 0);
    if (seam > 0 && !reduced) { g.globalAlpha = Math.min(1, seam); g.fillStyle = '#10203c'; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; }
    const c = beatAt(v, t).text;
    if (c !== lastCap) { lastCap = c; capT.textContent = c; capT.classList.remove('in'); void capT.offsetWidth; capT.classList.add('in'); }
    bar.style.transform = `scaleX(${(t / v.dur).toFixed(4)})`;
  };
  const setBtn = () => {
    toggle.textContent = playing ? '❚❚' : '▶';
    toggle.setAttribute('aria-label', playing ? 'Pause the animation' : 'Play the animation');
  };
  const loop = (now: number) => {
    raf = 0;
    if (!playing) return;
    let t = (now - t0) / 1000;
    if (once && t >= v.dur) { playing = false; once = reduced; tPaused = v.still; frame(v.still); setBtn(); return; }
    t %= v.dur;
    frame(t);
    raf = requestAnimationFrame(loop);
  };
  const play = (from: number) => { playing = true; t0 = performance.now() - from * 1000; setBtn(); if (!raf) raf = requestAnimationFrame(loop); };
  const pause = () => { playing = false; tPaused = ((performance.now() - t0) / 1000) % v.dur; cancelAnimationFrame(raf); raf = 0; setBtn(); };

  const onToggle = () => { if (playing) pause(); else play(reduced && tPaused === v.still ? 0 : tPaused); };
  const onReplay = () => { cancelAnimationFrame(raf); raf = 0; play(0); };
  toggle.addEventListener('click', onToggle);
  replay.addEventListener('click', onReplay);
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (!playing) frame(tPaused); }) : null;
  ro?.observe(canvas);

  if (reduced) { frame(v.still); setBtn(); }
  else play(0);
  return () => { cancelAnimationFrame(raf); raf = 0; playing = false; ro?.disconnect(); toggle.removeEventListener('click', onToggle); replay.removeEventListener('click', onReplay); };
}
