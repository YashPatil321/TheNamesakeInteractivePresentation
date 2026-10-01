'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { startLine } from '@/lib/engine';
import { STATIONS } from '@/lib/stations';
import Scenes from '@/components/Scenes';

const TITLE_WORDS = ['The', 'Namesake'];

/*
 * The whole experience is one static tree that the canvas engine (lib/engine.ts) animates
 * and fills in. React renders it once; the engine owns it from then on.
 */
export default function NamesakeLine() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    return startLine(rootRef.current);
  }, []);

  // Intro parallax: the pointer gently shifts the intro's layers at different depths (transform only).
  useEffect(() => {
    const intro = rootRef.current?.querySelector<HTMLElement>('#intro');
    if (!intro || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0, x = 0, y = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || intro.hidden) return;
      x = e.clientX / window.innerWidth * 2 - 1; y = e.clientY / window.innerHeight * 2 - 1;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; intro.style.setProperty('--px', x.toFixed(3)); intro.style.setProperty('--py', y.toFixed(3)); });
    };
    window.addEventListener('pointermove', onMove);
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="app lens-gogol" id="app" ref={rootRef}>
      <div id="stage">
        <canvas id="scene" aria-label="Animated train travelling through Gogol's life" />
        <canvas id="scene3d" hidden aria-label="3D train travelling through Gogol's life" />
        <div className="vignette" />
      </div>

      <header className="hud">
        <div className="brand">
          <h1>The Namesake</h1>
          <span className="loc" id="loc">
            <svg viewBox="0 0 10 14" aria-hidden="true"><path d="M5 0a5 5 0 0 0-5 5c0 3.8 5 9 5 9s5-5.2 5-9a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" /></svg>
            <span id="locText">Cambridge, MA · 1968</span>
          </span>
        </div>
        <div className="hud-right">
          <button className="nameswitch locked" id="nameSwitch" aria-label="Switch between Gogol and Nikhil" title="Locked until 1986">
            <i className="knob" /><span className="n-g">GOGOL</span><span className="n-n">NIKHIL</span>
            <svg className="lock" viewBox="0 0 12 14" aria-hidden="true"><path d="M3 6V4a3 3 0 0 1 6 0v2h1a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm1.5 0h3V4a1.5 1.5 0 0 0-3 0z" /></svg>
          </button>
          <button className="chip-btn ico opt-hide" id="analysisBtn" aria-pressed="false" title="Highlight the 4 I's across the timeline (A)"><span className="chip-label">4 I&apos;s</span></button>
          <button className="chip-btn ico" id="soundBtn" aria-pressed="true" title="Sound (M)">Sound</button>
          <button className="chip-btn ico opt-hide" id="presentBtn" aria-pressed="false" title="Presenter mode (P)"><span className="chip-label">Present</span></button>
          <button className="chip-btn ico" id="scenesBtn" title="Our scenes (S)"><span className="chip-label">Scenes</span></button>
          <button className="chip-btn ico" id="passBtn" title="Your passport (V)">
            <span className="pp-word">Passport</span><span className="pp-count"><b id="passN">0</b>{`/${STATIONS.length}`}</span>
          </button>
          <button className="chip-btn round" id="helpBtn" title="Controls (?)" aria-label="Controls and help">?</button>
        </div>
      </header>

      <div className="card-wrap" id="cardWrap"><article className="ticket away" id="ticket" aria-live="polite" /></div>

      <button className="letter" id="letter" aria-label="A letter that never arrived">
        <svg viewBox="0 0 58 38" aria-hidden="true">
          <rect x="1" y="1" width="56" height="36" rx="2" fill="#f3ecd9" stroke="#c9bd9c" />
          <path d="M1 3 L29 22 L57 3" fill="none" stroke="#c9bd9c" strokeWidth="1.5" />
          <rect x="44" y="5" width="9" height="11" fill="#b8382a" />
          <rect x="45.5" y="6.5" width="6" height="8" fill="none" stroke="#f3ecd9" strokeWidth=".8" />
          <path d="M8 26h18M8 30h12" stroke="#8a8270" strokeWidth="1.2" />
        </svg>
      </button>

      <nav className="rail" aria-label="Timeline stations"><div className="rail-track" id="rail" /></nav>

      <div className="vhs" id="vhs"><div className="rw">◀◀ REWIND<small id="rwYear">1961</small></div></div>
      <div className="flash" id="flash" />
      <div className="crash-caption" id="crashCap" />
      <div className="decree" id="decree"><div>PETITION GRANTED<big><s>Gogol</s> Nikhil</big>LEGAL NAME CHANGE · 1986</div></div>
      <div className="toast" id="toast" role="status" />

      <div className="overlay help" id="help" hidden>
        <div className="help-card" role="dialog" aria-labelledby="helpTitle">
          <h2 id="helpTitle">Riding the line</h2>
          <dl>
            <dt><kbd>→</kbd> <kbd>Space</kbd></dt><dd>Next station (clickers work too)</dd>
            <dt><kbd>←</kbd></dt><dd>Previous station</dd>
            <dt><kbd>1</kbd>–<kbd>3</kbd></dt><dd>Story / 4 I&apos;s / Scene tabs</dd>
            <dt><kbd>N</kbd></dt><dd>Flip Gogol ⇄ Nikhil (after 1986)</dd>
            <dt><kbd>A</kbd></dt><dd>Show the 4 I&apos;s on the timeline</dd>
            <dt><kbd>V</kbd></dt><dd>Open your passport</dd>
            <dt><kbd>Q</kbd></dt><dd>Ticket inspector quiz</dd>
            <dt><kbd>E</kbd></dt><dd>Step inside a first-person view (4 stations)</dd>
            <dt><kbd>S</kbd></dt><dd>Our scenes</dd>
            <dt><kbd>P</kbd></dt><dd>Presenter mode (hides extra buttons)</dd>
            <dt><kbd>F</kbd></dt><dd>Fullscreen</dd>
            <dt><kbd>M</kbd></dt><dd>Sound on / off</dd>
          </dl>
          <p className="help-p">Click the stations on the track or the stops along the bottom to jump anywhere. Six stations have a hands-on &ldquo;Try it&rdquo; moment, and every stop stamps your passport. Keep an eye out for a letter drifting across the sky.</p>
          <p className="help-p"><b>Presenting?</b> Open the remote on your laptop and put this window on the projector. The remote shows speaker notes, a timer and vote buttons, and it steers this screen.</p>
          <div className="help-actions">
            <a className="btn hot" href="/presenter" target="_blank" rel="noopener">Open presenter remote ↗</a>
            <a className="btn" href="/video">Scenes to film</a>
            <button className="btn" id="helpClose">Back to the train</button>
          </div>
        </div>
      </div>

      <div className="overlay passport" id="passport" hidden>
        <div className="pp-card" role="dialog" aria-labelledby="ppTitle">
          <h2 id="ppTitle">Passenger passport</h2>
          <div className="pp-sub" id="ppSub" />
          <div className="pp-grid" id="ppGrid" />
          <div className="pp-foot">
            <span id="ppFoot" />
            <span className="pp-btns">
              <button className="btn ghost sm" id="ppReset">Start over</button>
              <button className="btn ghost sm" id="ppQuiz">Quiz</button>
              <button className="btn sm" id="ppClose">Back to the train</button>
            </span>
          </div>
        </div>
      </div>

      <div className="overlay fp" id="fp" hidden />

      <div className="overlay scenes-ov" id="scenesOverlay" hidden>
        <Scenes mode="overlay" />
      </div>

      <div className="overlay quiz" id="quiz" hidden>
        <div className="quiz-stage">
          <div className="quiz-card" role="dialog" aria-labelledby="quizQ">
            <div className="quiz-top"><span className="quiz-badge">Ticket inspector</span><span id="quizStep" /></div>
            <div id="quizBody" />
            <div className="quiz-punches" id="quizPunches" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="overlay finale" id="finale" hidden>
        <div className="fin-inner">
          <div className="book" id="book">
            <div className="book-shadow" aria-hidden="true" />
            <div className="page left">Christmas Eve, 2000<br />Pemberton Road<br /><br />found on a shelf in his old bedroom</div>
            <div className="page right"><div className="inscription" id="inscription" /></div>
            <div className="cover">
              <div className="front"><span>THE SHORT STORIES OF</span><b>Nikolai Gogol</b><span>✦</span></div>
              <div className="back">Christmas Eve, 2000<br />Pemberton Road<br /><br />found on a shelf<br />in his old bedroom</div>
            </div>
          </div>
          <div className="fin-text" id="finText">
            <h2 id="finHead">Every name carries a story.</h2>
            <p id="finLine">The letter with his good name never arrived. His father&apos;s gift did. Gogol opens the book and starts to read &ldquo;The Overcoat.&rdquo;</p>
            <p className="credits">A project by <span className="nw">Shiven Swami</span> · <span className="nw">Yash Patil</span> · <span className="nw">Jonah Luo</span> · <span className="nw">Drew Dupart</span><br />Based on <i>The Namesake</i> by Jhumpa Lahiri</p>
            <div className="fin-actions">
              <button className="btn hot" id="finQuiz">Take the ticket inspector&apos;s quiz</button>
              <button className="btn ghost" id="finBack">Back to the timeline</button>
              <button className="btn ghost" id="finReplay">Ride again from 1961</button>
            </div>
          </div>
        </div>
      </div>

      <div className="overlay intro" id="intro">
        {/* the live 3D world (an establishing shot of the waiting train) shows through; scrims keep the type legible */}
        <div className="intro-scrim" aria-hidden="true" />
        {/* the overcoat: two wool panels part like doors on load to reveal the world ("we all came out of Gogol's overcoat") */}
        <div className="coat l" aria-hidden="true"><div className="lapel" /><div className="buttons"><i /><i /><i /></div></div>
        <div className="coat r" aria-hidden="true"><div className="lapel" /><div className="buttons"><i /><i /><i /></div></div>
        <div className="intro-content">
          <div className="intro-inner">
            <div className="intro-head">
              <p className="epigraph layer" style={{ '--z': 0.4, '--k': 0 } as CSSProperties}>
                &ldquo;We all came out of Gogol&apos;s overcoat.&rdquo;
                <cite><span>Attributed to Dostoyevsky</span><span className="sep" aria-hidden="true"> · </span><span>The book&apos;s epigraph</span></cite>
              </p>
              <h2 className="big-title layer" aria-label="The Namesake" style={{ '--z': 1 } as CSSProperties}>
                {TITLE_WORDS.map((w, wi) => (
                  <span className="w" key={w} aria-hidden="true">
                    {w.split('').map((c, ci) => (
                      <span className="ch" key={ci} style={{ '--k': (wi ? TITLE_WORDS[0].length : 0) + ci } as CSSProperties}>{c}</span>
                    ))}
                  </span>
                ))}
              </h2>
              <div className="scramble-row layer" style={{ '--z': 0.7, '--k': 4 } as CSSProperties}>
                <span className="scr-label" aria-hidden="true">a boy named</span>
                <div className="scramble" id="scramble" aria-hidden="true">GOGOL</div>
              </div>
            </div>
            <div className="intro-foot">
              <div className="intro-act">
                <div className="nametag layer" style={{ '--z': 1.4, '--k': 5 } as CSSProperties}>
                  <div className="top"><b>HELLO</b><span>my name is</span></div>
                  <label className="sr" htmlFor="visitorName">Your name</label>
                  <input id="visitorName" maxLength={24} autoComplete="off" placeholder="write your name" />
                </div>
                <button className="board layer" id="boardBtn" style={{ '--z': 0.9, '--k': 6 } as CSSProperties}>
                  <span>Board the train</span><i aria-hidden="true">→</i>
                </button>
              </div>
              <div className="intro-meta layer" style={{ '--z': 0.3, '--k': 7 } as CSSProperties}>
                <span>Jhumpa Lahiri · 1961–2000</span><span className="sep" aria-hidden="true"> · </span><span>Calcutta → Cambridge → New York → home</span>
              </div>
            </div>
          </div>
        </div>
        <div className="intro-slate layer" aria-hidden="true" style={{ '--z': 0.2, '--k': 8 } as CSSProperties}><i />Now boarding<span>Platform 1</span></div>
      </div>
    </div>
  );
}
