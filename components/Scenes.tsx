'use client';

// The "Our Scenes" section: rendered as an overlay inside the app and as the /scenes page.
// Overlay mode talks to the engine through window events:
//   'namesake:scenes-open' / 'namesake:scenes-closed'  (engine -> component)
//   'namesake:scenes-close' and 'namesake:go' (detail: station index)  (component -> engine)
// Styles: app/styles/scenes.css (all classes start with sc-).
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { SCENES, videoUrl, type Scene } from '@/lib/scenes';
import { STATIONS } from '@/lib/stations';
import { filmBadge, GROUP_CREDIT } from '@/lib/media';
import SceneArt from '@/components/scenes/SceneArt';
import Clapper from '@/components/scenes/Clapper';

type Status = 'checking' | 'filmed' | 'missing';
type Vars = CSSProperties & Record<`--${string}`, string | number>;

const N = SCENES.length;
const STEP = 360 / N;
const mod = (n: number) => ((n % N) + N) % N;
/** shortest signed distance from a to b around the ring */
const wrap = (d: number) => d - Math.round(d / N) * N;
const ACCENT: Record<Scene['lens'], string> = { none: '#dcd3ba', gogol: '#f2a33a', nikhil: '#5eaaff', both: '#c9a3ff' };
const pad = (n: number) => String(n).padStart(2, '0');

/** card depth values for the resting ring (pos 0), so the server render already looks right */
const restVars = (i: number): Vars => {
  const d = Math.abs(wrap(i));
  return { '--i': i, '--f': Math.min(1, d), '--dd': Math.min(1, d / 3).toFixed(3), '--c': ACCENT[SCENES[i].lens] };
};

interface Drag { id: number; x0: number; pos0: number; per: number; moved: boolean; lastT: number; v: number }

export default function Scenes({ mode }: { mode: 'page' | 'overlay' }) {
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<Record<string, Status>>(() => Object.fromEntries(SCENES.map((s) => [s.file, 'checking'])));
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const phys = useRef({ pos: 0, vel: 0, target: 0, raf: 0, last: 0, drag: null as Drag | null, suppress: false, reduced: false });
  const openRef = useRef(mode === 'page');

  /* ---------- ring physics: a spring toward an integer target, painted straight to CSS vars ---------- */
  const paint = useCallback(() => {
    const p = phys.current;
    ringRef.current?.style.setProperty('--spin', `${(-p.pos * STEP).toFixed(3)}deg`);
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const d = Math.abs(wrap(i - p.pos));
      el.style.setProperty('--f', Math.min(1, d).toFixed(3));
      el.style.setProperty('--dd', Math.min(1, d / 3).toFixed(3));
    });
  }, []);

  const kick = useCallback(() => {
    const p = phys.current;
    if (p.raf) return;
    p.last = performance.now();
    const step = (t: number) => {
      // real elapsed time (slow frames still finish on time), integrated in small substeps
      const dt = Math.min(0.25, Math.max(0, (t - p.last) / 1000));
      p.last = t;
      if (!p.drag) {
        if (p.reduced) { p.pos = p.target; p.vel = 0; }
        else {
          const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
          for (let s = 0; s < n; s++) {
            const a = 120 * (p.target - p.pos) - 15.5 * p.vel;
            p.vel += a * h; p.pos += p.vel * h;
          }
        }
      }
      paint();
      if (p.drag || Math.abs(p.target - p.pos) > 0.0006 || Math.abs(p.vel) > 0.0006) p.raf = requestAnimationFrame(step);
      else { p.pos = p.target; p.vel = 0; paint(); p.raf = 0; }
    };
    p.raf = requestAnimationFrame(step);
  }, [paint]);

  const setTarget = useCallback((t: number) => {
    phys.current.target = t;
    setActive(mod(t));
    kick();
  }, [kick]);

  const goTo = useCallback((i: number) => {
    const t = phys.current.target;
    setTarget(t + wrap(i - mod(t)));
  }, [setTarget]);

  const nudge = useCallback((dir: number) => setTarget(Math.round(phys.current.target) + dir), [setTarget]);

  // mount: reduced-motion check, first paint, and (page mode) a little spin-in
  useEffect(() => {
    const p = phys.current;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    p.reduced = mq.matches;
    const onMq = () => { p.reduced = mq.matches; };
    mq.addEventListener('change', onMq);
    if (mode === 'page' && !p.reduced) { p.pos = p.target - 1.6; }
    paint();
    kick();
    return () => { mq.removeEventListener('change', onMq); cancelAnimationFrame(p.raf); p.raf = 0; };
  }, [mode, paint, kick]);

  /* ---------- which videos exist? ---------- */
  useEffect(() => {
    let alive = true;
    for (const s of SCENES) {
      fetch(videoUrl(s), { method: 'HEAD', cache: 'no-store' })
        .then((r) => r.ok && !(r.headers.get('content-type') || '').includes('text/html'))
        .catch(() => false)
        .then((ok) => { if (alive) setStatus((m) => ({ ...m, [s.file]: ok ? 'filmed' : 'missing' })); });
    }
    return () => { alive = false; };
  }, []);

  /* ---------- overlay: open / close from the engine ---------- */
  useEffect(() => {
    if (mode !== 'overlay') return;
    const ov = rootRef.current?.closest<HTMLElement>('.overlay');
    openRef.current = !!ov && !ov.hidden;
    const onOpen = () => {
      openRef.current = true;
      const p = phys.current;
      if (!p.reduced) { p.pos = p.target - 1.6; p.vel = 0; }
      paint(); kick();
      requestAnimationFrame(() => cardRefs.current[mod(p.target)]?.focus({ preventScroll: true }));
    };
    const onClosed = () => {
      openRef.current = false;
      rootRef.current?.querySelectorAll('video').forEach((v) => v.pause());
    };
    window.addEventListener('namesake:scenes-open', onOpen);
    window.addEventListener('namesake:scenes-closed', onClosed);
    return () => {
      window.removeEventListener('namesake:scenes-open', onOpen);
      window.removeEventListener('namesake:scenes-closed', onClosed);
    };
  }, [mode, paint, kick]);

  /* ---------- keys (the engine owns Escape in overlay mode) ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!openRef.current || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'VIDEO' || t.isContentEditable)) return;
      let moved = false;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); nudge(e.key === 'ArrowRight' ? 1 : -1); moved = true; }
      else if (/^[1-7]$/.test(e.key)) { goTo(+e.key - 1); moved = true; }
      if (moved && t?.classList.contains('sc-card')) {
        requestAnimationFrame(() => cardRefs.current[mod(phys.current.target)]?.focus({ preventScroll: true }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nudge, goTo]);

  /* ---------- drag / swipe with inertia ---------- */
  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const p = phys.current;
    const card = cardRefs.current[0];
    p.suppress = false;
    p.drag = { id: e.pointerId, x0: e.clientX, pos0: p.pos, per: Math.max(70, (card?.offsetWidth || 150) * 1.15), moved: false, lastT: e.timeStamp, v: 0 };
    p.vel = 0;
    kick();
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const p = phys.current, d = p.drag;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0;
    if (!d.moved) {
      if (Math.abs(dx) < 6) return;
      d.moved = true; p.suppress = true;
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      e.currentTarget.classList.add('is-dragging');
    }
    const next = d.pos0 - dx / d.per;
    const dt = Math.max(8, e.timeStamp - d.lastT) / 1000;
    d.v = d.v * 0.5 + ((next - p.pos) / dt) * 0.5;
    d.lastT = e.timeStamp;
    p.pos = next;
  };
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const p = phys.current, d = p.drag;
    if (!d || e.pointerId !== d.id) return;
    p.drag = null;
    e.currentTarget.classList.remove('is-dragging');
    if (!d.moved) { kick(); return; }
    const v = e.timeStamp - d.lastT > 140 ? 0 : Math.max(-10, Math.min(10, d.v));
    p.vel = v;
    setTarget(Math.round(p.pos + v * 0.24));
  };

  const scene = SCENES[active];
  const filmed = SCENES.filter((s) => status[s.file] === 'filmed').length;
  const checking = SCENES.some((s) => status[s.file] === 'checking');
  const Title = mode === 'page' ? 'h1' : 'h2';

  return (
    <section ref={rootRef} className={`sc sc-${mode}`} aria-labelledby={`sc-title-${mode}`} data-in="">
      <div className="sc-bg" aria-hidden="true"><i className="sc-leak sc-leak-a" /><i className="sc-leak sc-leak-b" /><i className="sc-grain" /></div>

      <div className="sc-shell">
        <header className="sc-head">
          <div className="sc-head-l">
            {mode === 'page' && (
              <Link href="/" className="sc-back"><span aria-hidden="true">←</span> Back to the line</Link>
            )}
            <p className="sc-kicker">The Namesake Line · seven reels</p>
            <Title className="sc-title" id={`sc-title-${mode}`}>Our Scenes</Title>
            <p className="sc-sub">Seven moments we act out, one for each turning point.</p>
            <p className="sc-made">
              <span dangerouslySetInnerHTML={{ __html: filmBadge('Filmed by our group', 'sm') }} />
              <span className="sc-made-t">{GROUP_CREDIT}.</span>
            </p>
          </div>
          <div className="sc-head-r">
            <div className="sc-tally">
              <span className="sc-tally-bar" aria-hidden="true">
                {SCENES.map((s) => <i key={s.n} className={status[s.file] === 'filmed' ? 'on' : ''} />)}
              </span>
              <span>{checking ? 'Checking reels…' : `${filmed} of ${N} filmed`}</span>
            </div>
            {mode === 'overlay' && (
              <button type="button" className="sc-close" aria-label="Close our scenes (Esc)" title="Close (Esc)"
                onClick={() => window.dispatchEvent(new CustomEvent('namesake:scenes-close'))}>
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
              </button>
            )}
          </div>
        </header>

        <div className="sc-body">
          <div className="sc-reel">
            <div ref={stageRef} className="sc-stage" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              role="group" aria-roledescription="carousel" aria-label="Scene reels. Drag, or use the left and right arrow keys.">
              <div className="sc-beam" aria-hidden="true" />
              <div className="sc-floor" aria-hidden="true" />
              <div className="sc-tilt">
                <div ref={ringRef} className="sc-ring">
                  {SCENES.map((s, i) => (
                    <button key={s.n} type="button" ref={(el) => { cardRefs.current[i] = el; }}
                      className={`sc-card${i === active ? ' is-active' : ''}`} style={restVars(i)}
                      aria-label={`Scene ${s.n}: ${s.title.replace(/[“”]/g, '')}, ${s.year}. ${status[s.file] === 'filmed' ? 'Filmed' : 'Not filmed yet'}.`}
                      aria-current={i === active ? 'true' : undefined}
                      onClick={() => { if (phys.current.suppress) { phys.current.suppress = false; return; } goTo(i); }}
                      onFocus={(e) => { if (e.currentTarget.matches(':focus-visible') && mod(phys.current.target) !== i) goTo(i); }}>
                      <span className="sc-lift">
                        <span className="sc-face">
                          <span className="sc-frame-top">
                            <b>{pad(s.n)}</b>
                            <span>{s.year}</span>
                          </span>
                          <span className="sc-thumb">
                            <SceneArt scene={s} />
                            <span className="sc-thumb-tag">{s.filterLabel.split(' · ')[0]}</span>
                          </span>
                          <span className="sc-card-title">{s.title}</span>
                          <span className={`sc-badge sc-badge-${status[s.file]}`}>
                            <i aria-hidden="true" />{status[s.file] === 'filmed' ? 'Filmed' : status[s.file] === 'checking' ? 'Checking' : 'Not filmed yet'}
                          </span>
                          <span className="sc-shade" aria-hidden="true" />
                        </span>
                        <span className="sc-back-face" aria-hidden="true"><span>Reel {pad(s.n)}</span></span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <nav className="sc-nav" aria-label="Choose a scene">
              <button type="button" className="sc-arrow" onClick={() => nudge(-1)} aria-label="Previous scene">
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4.5L7 10l5.5 5.5" /></svg>
              </button>
              <ol className="sc-dots">
                {SCENES.map((s, i) => (
                  <li key={s.n}>
                    <button type="button" className={i === active ? 'on' : ''} style={{ '--c': ACCENT[s.lens] } as Vars}
                      aria-label={`Scene ${s.n}: ${s.title.replace(/[“”]/g, '')}`} aria-current={i === active ? 'true' : undefined}
                      onClick={() => goTo(i)}>{s.n}</button>
                  </li>
                ))}
              </ol>
              <button type="button" className="sc-arrow" onClick={() => nudge(1)} aria-label="Next scene">
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 4.5L13 10l-5.5 5.5" /></svg>
              </button>
            </nav>
            <p className="sc-hint">Drag the reel, or press <kbd>←</kbd> <kbd>→</kbd></p>
          </div>

          <p className="sc-sr" aria-live="polite">Scene {scene.n} of {N}: {scene.title}, {scene.year}. {status[scene.file] === 'filmed' ? 'Filmed.' : status[scene.file] === 'missing' ? 'Not filmed yet.' : ''}</p>
          <Detail key={scene.n} scene={scene} status={status[scene.file]} mode={mode}
            onPrev={() => nudge(-1)} onNext={() => nudge(1)} />
        </div>
      </div>
    </section>
  );
}

/* =================================================================== */

function Detail({ scene, status, mode, onPrev, onNext }: {
  scene: Scene; status: Status; mode: 'page' | 'overlay'; onPrev: () => void; onNext: () => void;
}) {
  const prev = SCENES[mod(scene.n - 2)], next = SCENES[mod(scene.n)];
  const ride = () => window.dispatchEvent(new CustomEvent('namesake:go', { detail: scene.station }));

  const tilt = (e: RPointerEvent<HTMLLIElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.currentTarget, r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--rx', `${((0.5 - y) * 12).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((x - 0.5) * 14).toFixed(2)}deg`);
    el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
    el.classList.add('is-tilt');
  };
  const untilt = (e: RPointerEvent<HTMLLIElement>) => {
    const el = e.currentTarget;
    el.classList.remove('is-tilt');
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  const rideLabel = <><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3l2 2H5l2-2a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2zm0 3v4h12V7zm2 7.5a1.2 1.2 0 1 0 0 .01zm8 0a1.2 1.2 0 1 0 0 .01z" /></svg>Ride to this stop</>;

  return (
    <article className={`sc-detail sc-f-${scene.filter}`} style={{ '--c': ACCENT[scene.lens] } as Vars} aria-labelledby={`sc-d-${scene.n}-${mode}`}>
      <header className="sc-d-head">
        <p className="sc-d-kicker">
          <span>Scene {pad(scene.n)} <span className="sc-of">/ {pad(N)}</span></span>
          <span className="sc-sep" aria-hidden="true" />
          <span className="sc-yr">{scene.year}</span>
          <span className="sc-sep" aria-hidden="true" />
          <span dangerouslySetInnerHTML={{ __html: filmBadge('Live action', 'xs') }} />
        </p>
        <h3 className="sc-d-title" id={`sc-d-${scene.n}-${mode}`}>{scene.title}</h3>
        {scene.flag && (
          <p className={`sc-flag sc-flag-${scene.flag}`}>
            {scene.flag === 'key' ? <><span aria-hidden="true">★</span> The most important one</> : <><span aria-hidden="true">◌</span> No dialogue</>}
          </p>
        )}
      </header>

      <div className="sc-d-media">
        <div className={`sc-screen${status === 'filmed' ? ' is-filmed' : ''}`}>
          {status === 'filmed' ? (
            <video src={videoUrl(scene)} controls playsInline preload="metadata" aria-label={`Our scene: ${scene.title}`} />
          ) : (
            <>
              <SceneArt scene={scene} className="sc-screen-bg" />
              <Clapper scene={scene} checking={status === 'checking'} />
            </>
          )}
        </div>
      </div>

      <div className="sc-d-facts">
        <ul className="sc-chips" aria-label="Filming details">
          <li><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.4 4.5 8.5 4.5 8.5s4.5-5.1 4.5-8.5A4.5 4.5 0 0 0 8 1.5zm0 6.2a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4z" /></svg>{scene.where}</li>
          <li><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm.8 6.2 2.6 1.6-.8 1.3-3.4-2V4h1.6z" /></svg>{scene.length}</li>
          <li className={`sc-chip-filter sc-cf-${scene.filter}`}><i aria-hidden="true" />{scene.filterLabel}</li>
        </ul>

        <div className="sc-facts-grid">
          <section>
            <h4 className="sc-label">Roles</h4>
            <ul className="sc-roles">
              {scene.roles.map((r) => <li key={r}>{r}</li>)}
              <li className="sc-role-crew">Camera</li>
            </ul>
          </section>
          <section>
            <h4 className="sc-label">Props</h4>
            <ul className="sc-props">{scene.props.map((p) => <li key={p}>{p}</li>)}</ul>
          </section>
        </div>
        <p className="sc-shoot"><span className="sc-label">Shoot</span> Block {scene.shoot.block} of 4 · {scene.shoot.place}</p>
      </div>

      <div className="sc-d-board">
        <h4 className="sc-label">Storyboard</h4>
        {scene.setup && <p className="sc-setup"><span>Setup</span>{scene.setup}</p>}
        <ol className="sc-beats">
          {scene.beats.map((b, k) => (
            <li key={k} className="sc-beat" style={{ '--k': k } as Vars} onPointerMove={tilt} onPointerLeave={untilt}>
              <div className="sc-beat-in">
                <span className="sc-beat-no" aria-hidden="true">{k + 1}</span>
                <div className="sc-beat-body">
                  {b.action && <p className="sc-act">{b.action}</p>}
                  {b.lines?.map((l, j) => (
                    <p className="sc-line" key={j}>
                      <span className="sc-spk">{l.speaker}{l.how && <em> ({l.how})</em>}</span>
                      <span className="sc-say">“{l.text}”</span>
                      {l.book && <span className="sc-book">From the book · {l.book}</span>}
                    </p>
                  ))}
                  {b.after && <p className="sc-act">{b.after}</p>}
                  {b.written && <p className={`sc-written${b.written.length > 12 ? ' is-long' : ''}`}>{b.written}</p>}
                  {b.cue && <p className="sc-cue">{b.cue}</p>}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="sc-source">{scene.source}</p>
      </div>

      <footer className="sc-d-foot">
        {mode === 'overlay' ? (
          <button type="button" className="sc-btn sc-btn-hot" onClick={ride}>{rideLabel}</button>
        ) : (
          <Link href={`/#s${scene.station + 1}`} className="sc-btn sc-btn-hot">{rideLabel}</Link>
        )}
        <span className="sc-stop">Stop {scene.station + 1} of {STATIONS.length} on the line</span>
        <span className="sc-pn">
          <button type="button" className="sc-btn sc-btn-ghost" onClick={onPrev} aria-label={`Previous: scene ${prev.n}`}>
            <span aria-hidden="true">←</span> {pad(prev.n)}
          </button>
          <button type="button" className="sc-btn sc-btn-ghost" onClick={onNext} aria-label={`Next: scene ${next.n}`}>
            {pad(next.n)} <span aria-hidden="true">→</span>
          </button>
        </span>
      </footer>
    </article>
  );
}
