'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CHANNEL } from '@/lib/engine';
import { NAME_COLORS, NOTES, STATIONS, TAG_NAMES } from '@/lib/stations';

type LineState = {
  cur: number;
  target: number;
  moving: boolean;
  tab: 'story' | 'analysis' | 'scene';
  lens: 'gogol' | 'nikhil' | 'both';
  lensUnlocked: boolean;
  visited: number[];
  polls: Record<number, number[]>;
  revealed: Record<number, boolean>;
  started: boolean;
  quizOpen: boolean;
  finaleOpen: boolean;
  present: boolean;
};

type Command =
  | { type: 'hello' | 'next' | 'prev' | 'lens' | 'reveal' | 'rewind' | 'finale' | 'quiz' | 'present' }
  | { type: 'go'; i: number }
  | { type: 'tab'; tab: LineState['tab'] }
  | { type: 'vote'; k: number };

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/** A second-screen remote: speaker notes, a timer and vote buttons that steer the main view over BroadcastChannel. */
export default function Presenter() {
  const [line, setLine] = useState<LineState | null>(null);
  const [lastSeen, setLastSeen] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const chan = useRef<BroadcastChannel | null>(null);

  const send = useCallback((cmd: Command) => {
    chan.current?.postMessage(cmd);
    if (cmd.type !== 'hello') setTimerStart((t) => t ?? Date.now());
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel(CHANNEL);
    chan.current = bc;
    bc.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'state') { setLine(e.data as LineState); setLastSeen(Date.now()); }
    };
    bc.postMessage({ type: 'hello' });
    const hb = setInterval(() => bc.postMessage({ type: 'hello' }), 2500);
    const tick = setInterval(() => setNow(Date.now()), 500);
    return () => { clearInterval(hb); clearInterval(tick); bc.close(); chan.current = null; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT') return;
      const k = e.key;
      if (k === ' ' && tag === 'BUTTON') return; // let Space press the focused button instead
      if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') { e.preventDefault(); send({ type: 'next' }); }
      else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); send({ type: 'prev' }); }
      else if (k === '1') send({ type: 'tab', tab: 'story' });
      else if (k === '2') send({ type: 'tab', tab: 'analysis' });
      else if (k === '3') send({ type: 'tab', tab: 'scene' });
      else if (k === 'n' || k === 'N') send({ type: 'lens' });
      else if (k === 'q' || k === 'Q') send({ type: 'quiz' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [send]);

  const connected = now - lastSeen < 6000;
  const i = line ? (line.moving ? line.target : line.cur) : 2;
  const s = STATIONS[i];
  const next = STATIONS[i + 1];
  const votes = line?.polls[i] ?? s.poll?.options.map(() => 0) ?? [];
  const total = votes.reduce((a, b) => a + b, 0);
  const allVisited = !!line && line.visited.length === STATIONS.length;

  return (
    <div className="pr">
      <header className="pr-top">
        <div>
          <div className="pr-kicker">Presenter remote</div>
          <h1>The Namesake Line</h1>
        </div>
        <div className="pr-status">
          <span className={`pr-dot ${connected ? 'on' : ''}`} />
          {connected ? (line?.started ? 'Steering the main screen' : 'Main screen is on the intro. Any button boards the train.') : 'Looking for the main screen…'}
        </div>
        <div className="pr-timer">
          <span>{timerStart ? fmt(now - timerStart) : '00:00'}</span>
          <button className="pr-mini" onClick={() => setTimerStart(timerStart ? null : Date.now())}>{timerStart ? 'Reset' : 'Start'}</button>
        </div>
      </header>

      {!connected && (
        <p className="pr-help">
          Open <a href="/" target="_blank" rel="noopener">the main view</a> in another window of this same browser (put it on the projector). This remote finds it automatically.
        </p>
      )}

      <main className="pr-grid">
        <section className="pr-now" style={{ ['--c' as string]: NAME_COLORS[s.name] }}>
          <div className="pr-kicker">Station {String(i + 1).padStart(2, '0')} / {STATIONS.length}{line?.moving ? ' · riding…' : ''}</div>
          <div className="pr-year">{s.year}</div>
          <h2>{s.title}</h2>
          <div className="pr-place">{s.place} · <b>{TAG_NAMES[s.analysis.tag]}</b></div>
          <h3>Speaker notes</h3>
          <ul className="pr-notes">{NOTES[i].map((n) => <li key={n}>{n}</li>)}</ul>

          {s.poll && (
            <div className="pr-poll">
              <h3>Class vote · tap once per raised hand</h3>
              <p>{s.poll.q}</p>
              <div className="pr-opts">
                {s.poll.options.map((o, k) => (
                  <button key={o} className="pr-opt" onClick={() => send({ type: 'vote', k })}>
                    <i style={{ width: `${total ? (votes[k] / total) * 100 : 0}%` }} />
                    <span>{o}</span><b>{votes[k] ?? 0}</b>
                  </button>
                ))}
              </div>
              <button className="pr-btn ghost" disabled={!!line?.revealed[i]} onClick={() => send({ type: 'reveal' })}>
                {line?.revealed[i] ? 'Revealed on screen' : 'Reveal what Gogol did'}
              </button>
            </div>
          )}
        </section>

        <aside className="pr-side">
          <div className="pr-nav">
            <button className="pr-btn big ghost" disabled={i === 0} onClick={() => send({ type: 'prev' })}>← Back</button>
            <button className="pr-btn big" disabled={i === STATIONS.length - 1} onClick={() => send({ type: 'next' })}>Next →</button>
          </div>
          {next && <div className="pr-next">Up next: <b>{next.year} · {next.title}</b></div>}

          <h3>On screen</h3>
          <div className="pr-row">
            {(['story', 'analysis', 'scene'] as const).map((t) => (
              <button key={t} className={`pr-chip ${line?.tab === t ? 'on' : ''}`} disabled={t === 'scene' && !s.video} onClick={() => send({ type: 'tab', tab: t })}>
                {t === 'analysis' ? "4 I's" : t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="pr-row">
            <button className="pr-chip" disabled={!line?.lensUnlocked || line?.lens === 'both'} onClick={() => send({ type: 'lens' })}>
              Flip name ({line?.lens === 'nikhil' ? 'Nikhil' : line?.lens === 'both' ? 'Both' : 'Gogol'})
            </button>
            {s.special === 'rewind' && <button className="pr-chip" onClick={() => send({ type: 'rewind' })}>◀◀ Rewind to 1961</button>}
            <button className={`pr-chip ${line?.present ? 'on' : ''}`} onClick={() => send({ type: 'present' })}>Clean screen</button>
          </div>
          <div className="pr-row">
            <button className="pr-chip" disabled={!allVisited} onClick={() => send({ type: 'finale' })}>{allVisited ? 'Open the book (finale)' : `Finale: ${line?.visited.length ?? 0}/${STATIONS.length} visited`}</button>
            <button className={`pr-chip ${line?.quizOpen ? 'on' : ''}`} onClick={() => send({ type: 'quiz' })}>{line?.quizOpen ? 'Close quiz' : 'Quiz'}</button>
          </div>

          <h3>Jump to</h3>
          <div className="pr-stations">
            {STATIONS.map((st, k) => (
              <button
                key={k}
                className={`pr-st ${k === i ? 'cur' : ''} ${line?.visited.includes(k) ? 'seen' : ''}`}
                style={{ ['--c' as string]: NAME_COLORS[st.name] }}
                onClick={() => send({ type: 'go', i: k })}
                title={st.title}
              >
                <b>{st.year.replace('Late 1990s', "late '90s")}</b>
                <span>{st.title}</span>
              </button>
            ))}
          </div>
          <p className="pr-keys">Keys here: ← → Space · 1 2 3 tabs · N flip · Q quiz</p>
        </aside>
      </main>
    </div>
  );
}
