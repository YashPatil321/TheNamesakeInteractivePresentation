// The "director": film-style camera moves layered on top of the framing camera in lib/world3d.ts.
// Between stations it picks a shot per trip (crane up, low wheel-height tracking, aerial drone pass, side dolly),
// favours the arriving city's landmark (a "reveal"), and on arrival hands back to the card framing with a gentle push-in.
// The first trip after boarding is an establishing flyover that descends from high over the line onto the train.
// Before boarding, an 'idle' establishing shot holds on the train waiting at a lamplit platform behind the title
// (a slow low-angle drift; static with reduced motion); boarding cranes up out of that shot into the flyover.
// Nothing else here runs with reduced motion or during the 1961 crash (lib/world3d/crash.ts owns that camera).
import * as THREE from 'three';
import { clamp, lerp, smooth, damp } from './kit';

export type ShotKind = 'none' | 'idle' | 'intro' | 'crane' | 'low' | 'drone' | 'dolly';
const CYCLE: ShotKind[] = ['crane', 'dolly', 'drone', 'low'];

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eOut = (t: number) => 1 - Math.pow(1 - t, 3);

export interface DirectorInput {
  now: number; dt: number;
  p: number; // raw train position in station units (can be < 0 during the opening pull-in)
  target: number; moving: boolean; speed: number;
  crash: boolean; // crash playing or derailed: director off
  cardOpen: boolean; // the ticket card is on screen: hand back to the framing camera (train + sign beside the card)
  center: THREE.Vector3; // train center in world space
  gap: number;
  idle: boolean; // the title screen is up: hold the establishing shot
  portrait: number; // 0 landscape .. 1 tall phone screen
}

export interface Shot {
  w: number; // blend weight 0..1 of the cinematic shot over the framing camera
  pos: THREE.Vector3; look: THREE.Vector3; fov: number;
  push: number; // >1 right after arrival: framing distance multiplier, easing to 1 (push-in)
  tilt: number; // tilt-shift / depth-of-field strength 0..1 for the grade pass
  bars: number; // letterbox 0..1
  kind: ShotKind;
}

export function createDirector(reduced: boolean) {
  const st = {
    kind: 'none' as ShotKind, from: 0, to: 0, t0: 0, dir: 1, dist: 1, lastKind: 'none' as ShotKind,
    trips: 0, w: 0, prevMoving: false, prevTarget: -1, init: false, push: 1,
    fromIdle: false, idleT0: -1,
  };
  // last pose of the establishing shot, so the boarding move starts exactly where the title screen left the camera
  const idlePos = new THREE.Vector3(), idleLook = new THREE.Vector3();
  let idleFov = 34;
  const out: Shot = { w: 0, pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 34, push: 1, tilt: 0, bars: 0, kind: 'none' };
  const L = new THREE.Vector3(), tmp = new THREE.Vector3();

  function pick(to: number, from: number): ShotKind {
    const back = to < from;
    if (back && Math.abs(to - from) > 1.5) return 'drone'; // rewinds: soar over the years
    let k = CYCLE[(Math.round(to) * 3 + Math.round(Math.abs(from)) + st.trips) % CYCLE.length];
    if (k === st.lastKind) k = CYCLE[(CYCLE.indexOf(k) + 1) % CYCLE.length];
    return k;
  }

  function idleShot(f: DirectorInput) {
    const C = f.center;
    if (st.idleT0 < 0) st.idleT0 = f.now;
    // a slow, low drift and push-in on the waiting engine; steam drifts through frame
    const t = reduced ? 0 : (f.now - st.idleT0) / 1000;
    const a = Math.sin(t * 0.07), b = Math.sin(t * 0.045 + 1.3);
    const P = f.portrait;
    const nose = C.x + 14; // the locomotive's buffer beam
    // ahead of the engine and off to the platform's near side: its lamp-lit face, the cars receding behind it
    // (z ~8 keeps the lens over the road beside the line: no grass tufts or fence posts between it and the train)
    out.pos.set(nose + lerp(12.5, 8.5, P) + a * 1.2, lerp(1.5, 1.6, P) + b * 0.2, lerp(8.4, 8.8, P) - a * 0.5 - Math.min(t, 40) * 0.02);
    out.look.set(nose - lerp(7.5, 5, P) + a * 0.6, lerp(3.3, 3.0, P), lerp(-1.6, -1.2, P));
    out.fov = lerp(38, 58, P) - Math.min(t, 40) * 0.06;
    out.w = 1; out.push = 1; out.tilt = 0.55; out.bars = 1; out.kind = 'idle';
    idlePos.copy(out.pos); idleLook.copy(out.look); idleFov = out.fov;
    st.kind = 'idle'; st.w = 1; st.fromIdle = true; st.init = true;
    st.prevMoving = f.moving; st.prevTarget = f.target;
    return out;
  }

  function update(f: DirectorInput): Shot {
    const { now, dt, center: C } = f;
    if (f.idle && !f.crash) return idleShot(f);
    if (reduced || f.crash) {
      st.kind = 'none'; st.w = 0; st.prevMoving = f.moving; st.prevTarget = f.target; st.init = true;
      out.w = 0; out.push = 1; out.tilt = 0; out.bars = 0; out.kind = 'none';
      return out;
    }
    // trip start / retarget
    if (f.moving && (!st.prevMoving || f.target !== st.prevTarget)) {
      st.from = f.p; st.to = f.target; st.t0 = now; st.dir = f.target >= f.p ? 1 : -1; st.dist = Math.abs(f.target - f.p);
      // first trip after the page loads (boarding): establishing flyover
      if (st.trips === 0 && (!st.init || !st.prevMoving)) { st.kind = 'intro'; st.w = 1; }
      else st.kind = pick(f.target, f.p);
      st.lastKind = st.kind; st.trips++;
    }
    st.prevMoving = f.moving; st.prevTarget = f.target; st.init = true;

    // progress through the trip
    const span = st.to - st.from;
    const u = Math.abs(span) > 1e-3 ? clamp((f.p - st.from) / span, 0, 1) : 1;
    const age = (now - st.t0) / 1000;
    let wT = 0, s = u;
    if (st.kind === 'intro') {
      // time-based so the flyover is long enough to read; it lands on the train as the card opens
      s = clamp(age / (st.fromIdle ? 4.4 : 3.8), 0, 1);
      wT = 1 - smooth(0.5, 1, s);
      if (s >= 1) st.kind = 'none';
    } else if (st.kind !== 'none') {
      if (!f.moving) wT = 0;
      else wT = smooth(0, 0.16, u) * (1 - smooth(0.7, 0.985, u)) * clamp(0.55 + st.dist * 0.3, 0, 1);
      if (!f.moving && st.w < 0.01) st.kind = 'none';
    }
    if (f.cardOpen && !f.moving) wT = 0;
    st.w += (wT - st.w) * (st.kind === 'intro' && !f.cardOpen ? 1 : damp(f.cardOpen ? 3.2 : 5, dt));
    if (st.kind === 'intro' && f.cardOpen && st.w < 0.01) st.kind = 'none';
    const w = st.w;
    const d = st.dir;
    const e = ease(s);
    // landmark of the arriving city (cities place their set pieces around z = -40 behind the platform)
    L.set(st.to * f.gap, 9, -38);
    const reveal = smooth(0.35, 0.8, u) * 0.4;
    let fov = 34, tilt = 0.25;
    switch (st.kind) {
      case 'intro': {
        if (st.fromIdle) {
          // boarding from the title shot: the engine pulls out and thunders past the lens (the camera pans with it),
          // then the camera cranes up and swings in behind and above the train to ride it into its first stop
          const pan = smooth(0, 0.3, s), rise = ease(smooth(0.18, 1, s));
          out.pos.copy(idlePos).lerp(tmp.set(C.x - d * 20, C.y + 13, C.z + 30), rise);
          out.pos.y += Math.sin(Math.PI * smooth(0.18, 0.8, s)) * 6;
          out.look.copy(idleLook).lerp(L.set(C.x + d * 9, C.y + 0.6, C.z - 1), pan).lerp(tmp.set(C.x + d * 4, C.y - 0.5, C.z - 3), rise);
          fov = lerp(idleFov, 36, smooth(0, 0.6, s)); tilt = lerp(0.55, 0.45, s);
          break;
        }
        // high over the line, looking along it toward home, then descending onto the train
        const k = eOut(s);
        out.pos.set(C.x - d * lerp(60, 12, k), C.y + lerp(46, 6, k), C.z + lerp(42, 32, k));
        out.look.set(C.x + d * lerp(64, 2, k), C.y + lerp(-2, 0, k), C.z + lerp(-50, 0, k));
        fov = lerp(44, 36, k); tilt = lerp(1, 0.4, k);
        break;
      }
      case 'crane': {
        // starts low beside the rails, rises up over the train to show the city behind it
        out.pos.set(C.x - d * lerp(10, -4, e), C.y + lerp(-0.6, 24, e), C.z + lerp(13, 36, e));
        out.look.set(C.x + d * 6, C.y + lerp(1.2, -1, e), C.z - lerp(0, 6, e));
        out.look.lerp(L, reveal);
        fov = lerp(38, 34, e); tilt = lerp(0.2, 0.75, e);
        break;
      }
      case 'low': {
        // wheel-height, just off the rails ahead of the train; the train rushes past the lens
        out.pos.set(C.x + d * lerp(26, 6, e), C.y - 1.7, C.z + 5.2);
        out.look.set(C.x + d * lerp(2, -6, e), C.y - 0.2, C.z - 0.6);
        out.look.lerp(L, reveal * 0.6);
        fov = 44; tilt = 0.2;
        break;
      }
      case 'drone': {
        // aerial pass from behind and above, overtaking the train
        out.pos.set(C.x + d * lerp(-40, 16, e), C.y + lerp(30, 22, e), C.z + lerp(30, 40, e));
        out.look.set(C.x + d * lerp(14, 4, e), C.y - 2, C.z - 10);
        out.look.lerp(L, reveal);
        fov = 40; tilt = 1;
        break;
      }
      case 'dolly': {
        // long-lens side dolly: the train slides through frame against the landmarks
        out.pos.set(C.x + d * lerp(-9, 9, e), C.y + 1.2, C.z + 30);
        out.look.set(C.x + d * lerp(-5, 5, e), C.y + 0.6, C.z - 2);
        out.look.lerp(tmp.copy(L).setY(6), reveal * 0.7);
        fov = 24; tilt = 0.55;
        break;
      }
      default: out.pos.copy(C); out.look.copy(C);
    }
    out.fov = fov; out.w = w; out.kind = st.kind;
    out.tilt = lerp(0.18, tilt, w);
    out.bars = w;
    // push-in after arriving: the framing camera starts a little wider and settles
    // (eases out during the last stretch of the trip, then settles back in once the train has stopped)
    const pushT = f.moving && u > 0.7 ? 1.14 : 1;
    st.push += (pushT - st.push) * damp(pushT > st.push ? 2.5 : 1.1, dt);
    out.push = st.push;
    return out;
  }

  return { update };
}
