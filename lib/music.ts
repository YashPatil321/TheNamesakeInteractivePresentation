// Generative background score (WebAudio). It follows the era of Gogol's life:
//   india    (st 0–1, 1961–67)  tanpura drone on D + a bansuri-like flute improvising in raga Yaman
//   america  (st 2–7, 1968–85)  warm Rhodes-like electric piano, Dmaj9 → Bm9 → Gmaj9 → Gm6 (the nostalgic minor iv)
//   nikhil   (st 8–9, 1986–87)  cooler and sparser: soft triangle pads Em9 ↔ Cmaj7#11, a few high piano notes
//   nineties (st 10, 12, 13)    melancholy string pads in D minor, Dm(add9) → B♭maj7 → Fmaj7 → C/E, a quiet piano line
//   phone    (st 11, the call)  nearly nothing: open fifths in the strings, long gaps
//   finale   (st 14, 2000)      both worlds braided: the tanpura drone under the Rhodes on a D pedal, and the flute
//                               returns in raga Bhupali (which is also the Western major pentatonic, so it sits on both)
// Each era has its own bus; switching eras crossfades the buses over ~4 s. Notes are scheduled ahead with a
// lookahead timer, voices are capped, and the master level stays low (~0.1) so narration always sits on top.
export interface Music { setStation(i: number, moving: boolean): void; setEnabled(on: boolean): void; dispose(): void }

type EraId = 'india' | 'america' | 'nikhil' | 'nineties' | 'phone' | 'finale';
const ERA_OF: EraId[] = ['india', 'india', 'america', 'america', 'america', 'america', 'america', 'america', 'nikhil', 'nikhil', 'nineties', 'phone', 'nineties', 'nineties', 'finale'];

const MASTER = 0.11;
const MAX_VOICES = 28;
const LOOKAHEAD = 0.6;
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

interface Track { next: number; step(t: number): number }
interface Era { bus: GainNode; tracks: Track[]; aliveUntil: number }

export function createMusic(ctx: AudioContext, out: AudioNode): Music {
  /* ---------------- persistent graph: era buses → mix → (dry + reverb) → master → limiter → out ---------------- */
  const master = ctx.createGain();
  master.gain.value = 0;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10; limiter.knee.value = 6; limiter.ratio.value = 6; limiter.attack.value = 0.01; limiter.release.value = 0.3;
  master.connect(limiter); limiter.connect(out);

  const mix = ctx.createGain();
  mix.connect(master);
  const verb = ctx.createConvolver();
  verb.buffer = impulse(2.6);
  const wet = ctx.createGain(); wet.gain.value = 0.42;
  mix.connect(verb); verb.connect(wet); wet.connect(master);

  // one shared second of white noise for the flute's breath and the tanpura's attack
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  { const d = noise.getChannelData(0); for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1; }

  function impulse(sec: number) {
    const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let k = 0; k < n; k++) { const x = k / n; d[k] = (Math.random() * 2 - 1) * Math.pow(1 - x, 3.2) * (k < 200 ? k / 200 : 1); }
    }
    return b;
  }

  let voices = 0;
  const live = new Set<AudioScheduledSourceNode>();
  function track(o: AudioScheduledSourceNode, end: number) {
    voices++; live.add(o);
    o.onended = () => { voices--; live.delete(o); o.disconnect(); };
    o.stop(end);
  }
  const busy = () => voices >= MAX_VOICES;

  /* ---------------- instruments ---------------- */

  /** tanpura pluck: bright saw + octave, swept low-pass (the "jawari" buzz settling), long ring */
  function tanpura(bus: AudioNode, t: number, midi: number, vel: number) {
    if (busy()) return;
    const f = mtof(midi);
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 4;
    lp.frequency.setValueAtTime(f * 14, t); lp.frequency.exponentialRampToValueAtTime(f * 3.5, t + 2.2);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.015); g.gain.setTargetAtTime(0, t + 0.05, 1.1);
    lp.connect(g); g.connect(bus);
    for (const [mul, det, lvl] of [[1, -3, 0.5], [2, 4, 0.25]] as const) {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = f * mul; o.detune.value = det; og.gain.value = lvl;
      o.connect(og); og.connect(lp); o.start(t); track(o, t + 4.6);
    }
  }

  /** bansuri-like flute playing a whole phrase on one oscillator, with meend (glides), vibrato and breath */
  function flute(bus: AudioNode, t: number, sa: number, notes: [number, number][], beat: number, vel: number) {
    if (busy()) return t;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), tone = ctx.createBiquadFilter();
    const vib = ctx.createOscillator(), vibG = ctx.createGain();
    o.type = 'sine'; o2.type = 'triangle';
    tone.type = 'lowpass'; tone.frequency.value = 2600;
    const o2g = ctx.createGain(); o2g.gain.value = 0.18;
    vib.frequency.value = 5.2; vibG.gain.value = 0;
    vib.connect(vibG); vibG.connect(o.frequency); vibG.connect(o2.frequency);
    o.connect(g); o2.connect(o2g); o2g.connect(g); g.connect(tone); tone.connect(bus);
    // breath noise, band-passed around the note
    const n = ctx.createBufferSource(), nb = ctx.createBiquadFilter(), ng = ctx.createGain();
    n.buffer = noise; n.loop = true; nb.type = 'bandpass'; nb.Q.value = 2.5; ng.gain.value = 0;
    n.connect(nb); nb.connect(ng); ng.connect(tone);

    let at = t;
    g.gain.setValueAtTime(0, t);
    notes.forEach(([deg, beats], k) => {
      const f = mtof(sa + deg), d = beats * beat;
      if (k === 0) { o.frequency.setValueAtTime(f, at); o2.frequency.setValueAtTime(f, at); }
      else { o.frequency.setTargetAtTime(f, at, 0.045); o2.frequency.setTargetAtTime(f, at, 0.045); }
      nb.frequency.setTargetAtTime(f * 2, at, 0.05);
      // each note swells in, a slight dip separates repeated phrasing
      g.gain.setTargetAtTime(vel * (k === 0 ? 1 : 0.86), at, k === 0 ? 0.12 : 0.05);
      ng.gain.setTargetAtTime(vel * 0.05, at, 0.03); ng.gain.setTargetAtTime(vel * 0.015, at + 0.12, 0.1);
      // vibrato blooms on held notes
      vibG.gain.setTargetAtTime(beats >= 2 ? f * 0.007 : f * 0.002, at + Math.min(0.35, d * 0.4), 0.25);
      at += d;
    });
    g.gain.setTargetAtTime(0, at - 0.15, 0.22);
    ng.gain.setTargetAtTime(0, at - 0.15, 0.1);
    const end = at + 1.4;
    for (const s of [o, o2, vib, n]) s.start(t);
    track(o, end); track(o2, end); track(vib, end); track(n, end);
    return at;
  }

  /** Rhodes-ish electric piano: FM bell attack that fades into a round sine tone */
  function epiano(bus: AudioNode, t: number, midi: number, vel: number, len = 3.6) {
    if (busy()) return;
    const f = mtof(midi);
    const c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    c.type = 'sine'; m.type = 'sine';
    c.frequency.value = f; m.frequency.value = f; c.detune.value = (Math.random() - 0.5) * 6;
    mg.gain.setValueAtTime(f * 1.6, t); mg.gain.setTargetAtTime(f * 0.12, t, 0.18);
    m.connect(mg); mg.connect(c.frequency);
    // keep the low notes gentler so chords stay transparent
    const v = vel * (midi < 48 ? 0.75 : 1);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.006);
    g.gain.setTargetAtTime(v * 0.45, t + 0.01, 0.35); g.gain.setTargetAtTime(0, t + 0.6, len / 3.2);
    c.connect(g); g.connect(bus);
    c.start(t); m.start(t);
    track(c, t + len + 0.6); track(m, t + len + 0.6);
  }

  /** string/pad section: detuned oscillators through one low-pass, slow swell */
  function pad(bus: AudioNode, t: number, midis: number[], dur: number, vel: number, type: OscillatorType, cutoff: number, attack = 1.8) {
    const lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 0.5;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + attack);
    g.gain.setValueAtTime(vel, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 2.6);
    lp.connect(g); g.connect(bus);
    const per = 1 / Math.sqrt(midis.length * 2);
    for (const mm of midis) {
      for (const det of [-7, 7]) {
        if (busy()) return;
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = type; o.frequency.value = mtof(mm); o.detune.value = det + (Math.random() - 0.5) * 3;
        og.gain.value = per * (mm < 45 ? 0.8 : 1);
        o.connect(og); og.connect(lp); o.start(t); track(o, t + dur + 2.8);
      }
    }
  }

  /* ---------------- eras ---------------- */
  const D2 = 38;
  const mkBus = () => { const g = ctx.createGain(); g.gain.value = 0; g.connect(mix); return g; };

  function tanpuraTrack(bus: GainNode, vel: number, gap: number): Track {
    // Pa – Sa' – Sa' – Sa (A2, D3, D3, D2): the classic tanpura cycle on D
    const cycle = [D2 + 7, D2 + 12, D2 + 12, D2];
    let k = 0;
    return { next: 0, step(t) { tanpura(bus, t, cycle[k % 4], vel * (k % 4 === 3 ? 1.1 : 1)); k++; return t + (k % 4 === 0 ? gap * 1.5 : gap); } };
  }

  function fluteTrack(bus: GainNode, sa: number, phrases: [number, number][][], beat: number, vel: number, rest: [number, number]): Track {
    let k = Math.floor(Math.random() * phrases.length);
    return { next: 0, step(t) { const end = flute(bus, t + 0.05, sa, phrases[k % phrases.length], beat, vel); k++; return end + rest[0] + Math.random() * (rest[1] - rest[0]); } };
  }

  // Yaman (Lydian on Sa = D4): S R G M♯ P D N. Phrases in semitones from Sa with lengths in beats.
  const YAMAN: [number, number][][] = [
    [[-1, 1], [2, 1], [4, 2], [2, 1], [0, 3]],
    [[4, 1], [6, 1], [9, 1.5], [11, 1], [9, 1], [7, 3]],
    [[6, 1], [4, 1], [2, 1], [4, 1.5], [2, 1], [0, 3]],
    [[-1, 1], [-3, 1], [-1, 1], [2, 1.5], [0, 3.5]],
    [[7, 1], [9, 1], [11, 1], [12, 2.5], [11, 1], [9, 1], [7, 3]],
  ];
  // Bhupali (S R G P D: the major pentatonic, at home over both drone and piano)
  const BHUPALI: [number, number][][] = [
    [[4, 1], [2, 1], [0, 1.5], [-3, 1], [0, 3]],
    [[7, 1], [4, 1], [2, 1], [4, 3]],
    [[4, 1], [7, 1], [9, 1.5], [12, 2], [9, 1], [7, 1], [4, 3]],
    [[2, 1], [4, 1], [7, 2], [4, 1], [2, 1], [0, 3.5]],
  ];

  function chordTrack(bus: GainNode, chords: number[][], bar: number, vel: number, melody: { lo: number; hi: number; p: number; vel: number } | null, roll = 0.07): Track {
    let k = 0;
    return {
      next: 0,
      step(t) {
        const ch = chords[k % chords.length]; k++;
        if (vel > 0) epiano(bus, t, ch[0], vel * 0.9, bar + 1);
        if (vel > 0) ch.slice(1).forEach((m, j) => epiano(bus, t + 0.02 + j * roll * (0.8 + Math.random() * 0.4), m, vel * 0.7, bar));
        if (melody) {
          const tones = [...new Set(ch.slice(1).flatMap((m) => [m, m + 12, m + 24]))].filter((m) => m >= melody.lo && m <= melody.hi).sort((a, b) => a - b);
          const slots = [bar * 0.5, bar * 0.69, bar * 0.81];
          slots.forEach((s) => { if (tones.length && Math.random() < melody.p) epiano(bus, t + s, pick(tones), melody.vel, 2.8); });
        }
        return t + bar;
      },
    };
  }

  function padTrack(bus: GainNode, chords: number[][], bar: number, vel: number, type: OscillatorType, cutoff: number, attack?: number): Track {
    let k = 0;
    return { next: 0, step(t) { pad(bus, t, chords[k % chords.length], bar - 0.4, vel, type, cutoff, attack); k++; return t + bar; } };
  }

  function sparseTrack(bus: GainNode, notes: number[], every: number, p: number, vel: number): Track {
    return { next: 0, step(t) { if (Math.random() < p) epiano(bus, t, pick(notes), vel, 3.4); return t + every * (0.75 + Math.random() * 0.5); } };
  }

  const eras: Record<EraId, Era> = {} as Record<EraId, Era>;
  {
    const b = mkBus();
    eras.india = { bus: b, aliveUntil: 0, tracks: [tanpuraTrack(b, 0.12, 1.05), fluteTrack(b, 62, YAMAN, 0.62, 0.24, [2.5, 5])] };
  }
  {
    const b = mkBus();
    const chords = [
      [38, 57, 61, 64, 66], // Dmaj9
      [35, 54, 57, 61, 62], // Bm9 (B1 bass)
      [43, 54, 57, 59, 62], // Gmaj9
      [43, 50, 58, 64, 67], // Gm6 (G Bb D E): the borrowed minor iv, then home to D
    ];
    eras.america = { bus: b, aliveUntil: 0, tracks: [chordTrack(b, chords, 4.8, 0.27, { lo: 66, hi: 78, p: 0.55, vel: 0.17 })] };
  }
  {
    const b = mkBus();
    const chords = [[40, 55, 59, 62, 66], [36, 55, 59, 64, 66]]; // Em9, Cmaj7(#11)
    eras.nikhil = { bus: b, aliveUntil: 0, tracks: [padTrack(b, chords, 9.6, 0.19, 'triangle', 1400, 2.4), sparseTrack(b, [71, 74, 76, 79, 83], 2.6, 0.45, 0.11)] };
  }
  {
    const b = mkBus();
    const chords = [
      [38, 53, 57, 62, 64], // Dm(add9)
      [34, 50, 53, 57, 62], // Bbmaj7
      [41, 53, 57, 60, 64], // Fmaj7
      [40, 55, 60, 62, 67], // C/E (sus2)
    ];
    eras.nineties = { bus: b, aliveUntil: 0, tracks: [padTrack(b, chords, 8, 0.26, 'sawtooth', 950), chordTrack(b, chords.map((c) => [c[0] + 12, ...c.slice(2)]), 8, 0.0, { lo: 69, hi: 77, p: 0.5, vel: 0.1 })] };
  }
  {
    const b = mkBus();
    eras.phone = { bus: b, aliveUntil: 0, tracks: [padTrack(b, [[38, 45, 52], [34, 41, 53]], 12, 0.2, 'sawtooth', 700, 3.5), sparseTrack(b, [69, 74, 76], 7, 0.35, 0.07)] };
  }
  {
    const b = mkBus();
    const chords = [
      [38, 57, 61, 64, 66], // Dmaj9
      [38, 55, 59, 62, 66], // Gmaj7/D
      [38, 54, 57, 59, 62], // Bm7/D
      [38, 57, 59, 64, 69], // Asus2/D
    ];
    eras.finale = { bus: b, aliveUntil: 0, tracks: [tanpuraTrack(b, 0.12, 1.2), chordTrack(b, chords, 5.6, 0.17, null, 0.11), fluteTrack(b, 74, BHUPALI, 0.6, 0.17, [4, 8])] };
  }

  /* ---------------- control ---------------- */
  let cur: EraId | null = null;
  let enabled = true, moving = false, disposed = false;
  const FADE = 1.1; // time constant: ~95 % in 3.3 s

  function setLevel() {
    if (disposed) return;
    const v = enabled ? MASTER * (moving ? 0.72 : 1) : 0;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(v, ctx.currentTime, enabled ? 0.8 : 0.25);
  }

  function switchTo(id: EraId) {
    const now = ctx.currentTime;
    if (cur) { const e = eras[cur]; e.bus.gain.setTargetAtTime(0, now, FADE); e.aliveUntil = now + FADE * 5; }
    cur = id;
    const e = eras[id];
    e.bus.gain.setTargetAtTime(1, now, FADE);
    e.aliveUntil = Infinity;
    for (const tr of e.tracks) if (tr.next < now + 0.05) tr.next = now + 0.1 + Math.random() * 0.4;
  }

  function tick() {
    if (disposed || !enabled || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    for (const id of Object.keys(eras) as EraId[]) {
      const e = eras[id];
      if (e.aliveUntil < now) continue;
      for (const tr of e.tracks) {
        let guard = 0;
        if (tr.next < now - 1) tr.next = now + 0.1;
        while (tr.next < now + LOOKAHEAD && guard++ < 8) tr.next = tr.step(Math.max(tr.next, now + 0.02));
      }
    }
  }
  const timer = setInterval(tick, 120);

  return {
    setStation(i: number, mv: boolean) {
      if (disposed) return;
      const id = ERA_OF[Math.max(0, Math.min(ERA_OF.length - 1, i | 0))];
      if (id !== cur) switchTo(id);
      if (mv !== moving) { moving = mv; setLevel(); }
    },
    setEnabled(on: boolean) {
      if (disposed) return;
      if (on && !enabled && cur) {
        // resume each track from now rather than replaying the backlog
        const now = ctx.currentTime;
        for (const e of Object.values(eras)) for (const tr of e.tracks) tr.next = Math.max(tr.next, now + 0.1);
      }
      enabled = on; setLevel();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearInterval(timer);
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(0, now, 0.08);
      setTimeout(() => {
        for (const o of live) { try { o.stop(); } catch { /* already stopped */ } }
        live.clear();
        try { limiter.disconnect(); master.disconnect(); } catch { /* ignore */ }
      }, 600);
    },
  };
}
