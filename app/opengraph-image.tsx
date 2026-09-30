import { ImageResponse } from 'next/og';

export const alt = "The Namesake Line: ride a steam train through Gogol Ganguli's life, 1961–2000";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const STOPS: [string, string][] = [['1961', '#8a90a8'], ['1968', '#f2a33a'], ['1973', '#f2a33a'], ['1986', '#5eaaff'], ['1987', '#5eaaff'], ['1990s', '#5eaaff'], ['2000', '#c9a3ff']];

// The link preview shown when the site is shared (group chats, Google Classroom, etc.)
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '64px 72px',
        background: 'linear-gradient(180deg, #0d1326 0%, #1d2b52 62%, #7a4a4a 100%)', color: '#ece4cf' }}>
        <div style={{ display: 'flex', fontSize: 24, letterSpacing: 6, color: '#9aa3c2' }}>JHUMPA LAHIRI · AN INTERACTIVE TIMELINE</div>
        <div style={{ display: 'flex', fontSize: 104, lineHeight: 1.05, marginTop: 40, fontFamily: 'serif' }}>The Namesake Line</div>
        <div style={{ display: 'flex', fontSize: 40, marginTop: 14 }}>
          <span style={{ color: '#f2a33a' }}>Gogol</span>
          <span style={{ margin: '0 18px', color: '#9aa3c2' }}>/</span>
          <span style={{ color: '#5eaaff' }}>Nikhil</span>
        </div>
        <div style={{ display: 'flex', position: 'relative', marginTop: 'auto', width: 1056, height: 64 }}>
          <div style={{ position: 'absolute', left: 11, right: 11, top: 9, height: 4, background: 'linear-gradient(90deg, #8a90a8, #f2a33a 25%, #5eaaff 55%, #c9a3ff)' }} />
          {STOPS.map(([y, c], k) => (
            <div key={y} style={{ position: 'absolute', left: k * 172, top: 0, width: 22, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: c, border: '3px solid #0d1326' }} />
              <div style={{ display: 'flex', fontSize: 22, marginTop: 10, width: 90, justifyContent: 'center', color: '#ece4cf' }}>{y}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
