import type { Metadata } from 'next';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CAST, ORDER, PROPS, SCENES } from '@/lib/shootSheet';

export const metadata: Metadata = { title: 'Shoot sheet · The Namesake Line', robots: { index: false } };

// Checked at build time: a scene counts as filmed once its file is in public/videos/.
const filmed = (file: string) => existsSync(join(process.cwd(), 'public', 'videos', file));

export default function VideoPage() {
  const done = SCENES.filter((s) => filmed(s.file)).length;
  return (
    <div className="shoot">
      <header className="shoot-head">
        <a className="shoot-back" href="/">← Back to the train</a>
        <p className="shoot-eyebrow">Shoot sheet</p>
        <h1>The scenes we film</h1>
        <p className="shoot-sum">
          7 scenes · 20–45 sec each · about 1½–2 hours at one house ·{' '}
          <b>{done} of {SCENES.length} filmed</b>
        </p>
      </header>

      <ol className="shoot-list">
        {SCENES.map((s) => {
          const ok = filmed(s.file);
          return (
            <li key={s.n} className={'shot-card' + (s.key ? ' key' : '')}>
              <div className="shot-top">
                <span className="shot-n">{s.n}</span>
                <div className="shot-title">
                  <span className="shot-year">{s.year}</span>
                  <h2>{s.title}</h2>
                </div>
                <span className={'shot-status' + (ok ? ' ok' : '')}>{ok ? 'Filmed' : 'To film'}</span>
              </div>
              <p className="shot-meta">
                <span>{s.length}</span>
                <span>{s.where}</span>
                {s.look && <span>Filter: {s.look}</span>}
                {s.key && <span className="shot-flag">Most important scene</span>}
                {s.noDialogue && <span>No dialogue</span>}
              </p>
              <ul className="shot-lines">
                {s.lines.map((l, i) => (
                  <li key={i}>{l.who ? <><b>{l.who}:</b> {l.text}</> : <i>{l.text}</i>}</li>
                ))}
              </ul>
              <p className="shot-file">
                Save as <code>public/videos/{s.file}</code> ·{' '}
                <a href={`/#s${s.station}`}>See station {s.station} →</a>
              </p>
            </li>
          );
        })}
      </ol>

      <section className="shoot-grid">
        <div className="shoot-box">
          <h3>Cast</h3>
          <table>
            <tbody>
              {CAST.map((c) => (
                <tr key={c.role}><td>{c.role}</td><td className="num">{c.scenes}</td><td className="blank">________</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="shoot-box">
          <h3>Props</h3>
          <ul>{PROPS.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
        <div className="shoot-box">
          <h3>Filming order</h3>
          <ol>
            {ORDER.map((o) => (
              <li key={o.where}><b>{o.where}</b>: scene{o.scenes.length > 1 ? 's' : ''} {o.scenes.join(' & ')} <span className="dim">({o.time})</span></li>
            ))}
          </ol>
        </div>
        <div className="shoot-box">
          <h3>Tips</h3>
          <ul>
            <li>2 takes of each line, no more.</li>
            <li>Phone sideways and steady. Lean it on something.</li>
            <li>Stand close to whoever is talking.</li>
            <li>Edit in CapCut. Export as MP4, 720p.</li>
          </ul>
        </div>
      </section>
      <p className="shoot-foot">The last two car lines are quoted from the book (Ch. 5). All other dialogue is ours.</p>
    </div>
  );
}
