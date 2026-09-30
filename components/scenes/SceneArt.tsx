// Small illustrated "stills" for each scene, color graded like the finished video will be.
// Pure SVG + CSS (see .sc-art in app/styles/scenes.css), so nothing to download.
import { useId } from 'react';
import type { Scene } from '@/lib/scenes';

const mono = { fontFamily: 'var(--mono)', fontWeight: 700 } as const;
const hand = { fontFamily: 'var(--hand)' } as const;

function Train({ u }: { u: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}sa1bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0c0f18" /><stop offset="1" stopColor="#262a33" /></linearGradient>
        <linearGradient id={`${u}sa1beam`} x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".85" /><stop offset=".7" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="160" height="100" fill={`url(#${u}sa1bg)`} />
      <rect x="54" y="12" width="52" height="30" rx="5" fill="#3a4250" />
      <rect x="57" y="15" width="46" height="24" rx="3" fill="#6f7a8c" />
      <path d="M57 32 L103 26 L103 39 L57 39Z" fill="#4a5363" />
      <rect x="18" y="44" width="30" height="46" rx="4" fill="#1b1e25" />
      <rect x="112" y="44" width="30" height="46" rx="4" fill="#1b1e25" />
      <circle cx="120" cy="50" r="8" fill="#0e1015" />
      <path d="M106 90 C106 66 134 64 134 90Z" fill="#0e1015" />
      <circle cx="40" cy="52" r="8.5" fill="#2c313b" />
      <path d="M26 90 C26 66 54 64 56 90Z" fill="#2c313b" />
      <rect x="43" y="62" width="16" height="11" rx="1" fill="#efe9d8" transform="rotate(-12 51 67)" />
      <line x1="51" y1="62" x2="52" y2="73" stroke="#9c9686" strokeWidth=".8" transform="rotate(-12 51 67)" />
      <polygon points="160,0 160,18 30,100 0,100 0,86" fill={`url(#${u}sa1beam)`} opacity=".5" />
    </>
  );
}

function School({ u }: { u: string }) {
  return (
    <>
      <rect width="160" height="100" fill="#e3b778" />
      <rect x="14" y="8" width="132" height="40" rx="2" fill="#35523f" />
      <rect x="14" y="8" width="132" height="40" rx="2" fill="none" stroke="#8a5a2e" strokeWidth="3" />
      <text x="24" y="26" fontSize="9" fill="#dfe8dc" style={hand}>A B C  1 2 3</text>
      <path d="M22 36 q10 -6 20 0 t20 0" stroke="#dfe8dc" strokeWidth="1" fill="none" opacity=".6" />
      <rect x="0" y="66" width="160" height="34" fill="#8e5a31" />
      <rect x="0" y="66" width="160" height="4" fill="#a86d3e" />
      <g transform="rotate(-5 80 70)">
        <rect x="46" y="54" width="68" height="34" rx="3" fill="#fbf7ec" />
        <rect x="46" y="54" width="68" height="9" rx="3" fill="#b8382a" />
        <text x="80" y="61" fontSize="5" textAnchor="middle" fill="#fff" style={mono}>HELLO my name is</text>
        <text x="80" y="80" fontSize="14" textAnchor="middle" fill="#1d1b26" style={mono}>GOGOL</text>
      </g>
      <rect x="120" y="72" width="30" height="4" rx="2" fill="#f2c14a" transform="rotate(18 135 74)" />
      <circle cx="24" cy="78" r="7" fill="#c7372b" />
      <path d="M24 71 q2 -4 5 -4" stroke="#5a3a1a" strokeWidth="1.4" fill="none" />
    </>
  );
}

function Party({ u }: { u: string }) {
  const dots: [number, number, number, string][] = [
    [18, 18, 9, '#ff5fa2'], [48, 10, 6, '#ffd166'], [132, 16, 10, '#5ee1ff'], [104, 30, 5, '#ff8a5b'], [150, 44, 7, '#b388ff'],
    [10, 48, 6, '#5ee1ff'], [70, 22, 4, '#ffffff'], [30, 36, 4, '#ffd166'], [120, 50, 4, '#ff5fa2'],
  ];
  return (
    <>
      <rect width="160" height="100" fill="#15102a" />
      {dots.map(([x, y, r, c], k) => <circle key={k} cx={x} cy={y} r={r} fill={c} opacity=".55" />)}
      <g transform="rotate(4 80 64)">
        <rect x="40" y="40" width="80" height="48" rx="4" fill="#fbf7ec" />
        <rect x="40" y="40" width="80" height="11" rx="4" fill="#b8382a" />
        <text x="80" y="48.5" fontSize="6" textAnchor="middle" fill="#fff" style={mono}>HELLO my name is</text>
        <text x="80" y="66" fontSize="13" textAnchor="middle" fill="#1d1b26" style={mono}>GOGOL</text>
        <line x1="54" y1="62" x2="106" y2="61" stroke="#1d1b26" strokeWidth="2.4" strokeLinecap="round" />
        <text x="80" y="83" fontSize="15" textAnchor="middle" fill="#1f4fbf" style={hand}>Nikhil</text>
      </g>
    </>
  );
}

function Car({ u }: { u: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}sa4sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#131a33" /><stop offset=".62" stopColor="#3a3450" /><stop offset="1" stopColor="#d77b43" /></linearGradient>
        <radialGradient id={`${u}sa4glow`} cx=".5" cy="1" r=".7"><stop offset="0" stopColor="#ffd08a" stopOpacity=".9" /><stop offset="1" stopColor="#ffd08a" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="160" height="100" fill="#07080d" />
      <path d="M14 10 Q80 2 146 10 L154 64 L6 64Z" fill={`url(#${u}sa4sky)`} />
      <circle cx="40" cy="52" r="1.4" fill="#ffe6a8" /><circle cx="118" cy="50" r="1.1" fill="#ffe6a8" /><circle cx="96" cy="55" r="1" fill="#ff9c6b" />
      <rect x="0" y="62" width="160" height="38" fill="#0d0e14" />
      <ellipse cx="80" cy="70" rx="60" ry="26" fill={`url(#${u}sa4glow)`} opacity=".75" />
      <rect x="72" y="63" width="16" height="5" rx="1.5" fill="#fff4d6" />
      <circle cx="48" cy="54" r="12" fill="#050608" />
      <path d="M28 100 C28 70 68 70 68 100Z" fill="#050608" />
      <circle cx="113" cy="56" r="10" fill="#050608" />
      <path d="M96 100 C96 74 130 74 130 100Z" fill="#050608" />
      <path d="M0 0 H160 V10 Q80 0 0 10Z" fill="#050608" />
    </>
  );
}

function Dinner({ u }: { u: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${u}sa5c`} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#ffe09a" stopOpacity=".9" /><stop offset="1" stopColor="#ffe09a" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="160" height="100" fill="#5a3520" />
      <rect x="10" y="12" width="140" height="76" rx="6" fill="#f1e3c6" />
      <circle cx="80" cy="50" r="30" fill={`url(#${u}sa5c)`} />
      {[[40, 32], [120, 32], [80, 76]].map(([x, y], k) => (
        <g key={k}>
          <circle cx={x} cy={y} r="13" fill="#fffdf6" stroke="#d8c9a6" strokeWidth="1.2" />
          <circle cx={x} cy={y} r="8" fill="#f4ecdc" />
          <circle cx={x + 3} cy={y - 1} r="3" fill="#b7512f" opacity=".8" />
        </g>
      ))}
      <circle cx="58" cy="54" r="4" fill="none" stroke="#9fb7c9" strokeWidth="1.4" />
      <circle cx="104" cy="56" r="4" fill="none" stroke="#9fb7c9" strokeWidth="1.4" />
      <rect x="78" y="44" width="4" height="10" rx="1" fill="#fbf2d8" />
      <ellipse cx="80" cy="42" rx="1.6" ry="3" fill="#ffb347" />
    </>
  );
}

function Phone({ u }: { u: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}sa6bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6b7686" /><stop offset="1" stopColor="#2c323c" /></linearGradient>
      </defs>
      <rect width="160" height="100" fill={`url(#${u}sa6bg)`} />
      {[12, 26, 38, 54, 64].map((x, k) => <line key={k} x1={x} y1={4 + k * 7} x2={x - 4} y2={30 + k * 9} stroke="#c9d3e0" strokeWidth=".8" opacity=".5" />)}
      <ellipse cx="112" cy="46" rx="34" ry="40" fill="#1e232b" />
      <ellipse cx="112" cy="46" rx="30" ry="36" fill="#9aa6b4" />
      <circle cx="112" cy="38" r="12" fill="#2a2f38" />
      <path d="M90 82 C92 58 132 58 134 82Z" fill="#2a2f38" />
      <rect x="126" y="24" width="4" height="22" rx="1" fill="#e9eef4" transform="rotate(28 128 35)" />
      <rect x="18" y="62" width="20" height="34" rx="4" fill="#1a1d23" />
      <rect x="21" y="66" width="14" height="22" rx="1.5" fill="#cfe0f2" />
      <path d="M44 66 q6 6 0 12 M50 62 q10 10 0 20" stroke="#e9eef4" strokeWidth="1.4" fill="none" opacity=".8" />
    </>
  );
}

function Book({ u }: { u: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${u}sa7l`} cx=".85" cy=".2" r=".8"><stop offset="0" stopColor="#ffcf7a" stopOpacity=".85" /><stop offset="1" stopColor="#ffcf7a" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="160" height="100" fill="#3b2418" />
      <rect x="12" y="8" width="40" height="34" rx="2" fill="#1d2b4c" />
      {[[18, 14], [30, 20], [44, 13], [22, 30], [40, 34], [34, 26]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r="1.3" fill="#fff" />)}
      <rect x="12" y="8" width="40" height="34" rx="2" fill="none" stroke="#6b4a33" strokeWidth="2.5" />
      <rect width="160" height="100" fill={`url(#${u}sa7l)`} />
      {[70, 84, 98, 112, 126, 140].map((x, k) => <circle key={k} cx={x} cy={10 + (k % 2) * 4} r="1.6" fill={k % 2 ? '#ffd36b' : '#ff8a6b'} />)}
      <path d="M30 94 L78 84 L78 44 L30 52Z" fill="#fbf5e6" />
      <path d="M130 94 L82 84 L82 44 L130 52Z" fill="#f4ecd8" />
      <rect x="78" y="44" width="4" height="40" fill="#b8382a" />
      <text x="34" y="64" fontSize="7" fill="#35306a" style={hand} transform="rotate(-10 34 64)">The man who</text>
      <text x="36" y="73" fontSize="7" fill="#35306a" style={hand} transform="rotate(-10 36 73)">gave you his name</text>
      {[60, 67, 74].map((y, k) => <line key={k} x1="88" y1={y - 6} x2="124" y2={y + 1} stroke="#b9ab8c" strokeWidth="1" />)}
    </>
  );
}

const ART: Record<number, (p: { u: string }) => React.JSX.Element> = { 1: Train, 2: School, 3: Party, 4: Car, 5: Dinner, 6: Phone, 7: Book };

export default function SceneArt({ scene, className = '' }: { scene: Scene; className?: string }) {
  const Art = ART[scene.n];
  const u = 'sa' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <span className={`sc-art sc-grade-${scene.filter} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><Art u={u} /></svg>
    </span>
  );
}
