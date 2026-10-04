// Small illustrated "stills" for each scene, color graded like the finished video will be.
// Pure SVG + CSS (see .sc-art in app/styles/scenes.css), so nothing to download.
import { useId } from 'react';
import type { Scene } from '@/lib/scenes';

const mono = { fontFamily: 'var(--mono)', fontWeight: 700 } as const;
const hand = { fontFamily: 'var(--hand)' } as const;

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

function DateNight({ u }: { u: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}d1`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a1f36" /><stop offset="1" stopColor="#3a2a35" /></linearGradient>
        <radialGradient id={`${u}d2`} cx=".5" cy=".62" r=".45"><stop offset="0" stopColor="#ffcf7a" stopOpacity=".55" /><stop offset="1" stopColor="#ffcf7a" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="160" height="100" fill={`url(#${u}d1)`} />
      {[14, 30, 46, 112, 128, 144].map((x, k) => <rect key={k} x={x} y={10 + (k % 3) * 6} width="8" height="12" fill={k % 2 ? '#e8c27a' : '#6d7aa8'} opacity=".55" />)}
      <rect width="160" height="100" fill={`url(#${u}d2)`} />
      <circle cx="46" cy="44" r="9" fill="#2a1d19" />
      <path d="M30 86 C30 60 62 58 64 86Z" fill="#2c3e63" />
      <circle cx="114" cy="44" r="9" fill="#2a1d19" />
      <path d="M100 52 C96 40 132 38 128 54 L124 60 L104 60Z" fill="#1a1210" />
      <path d="M96 86 C98 60 130 58 132 86Z" fill="#7a2c3e" />
      <rect x="40" y="74" width="80" height="6" rx="2" fill="#5a3a28" />
      <rect x="66" y="62" width="5" height="12" rx="1" fill="#cfe3ee" opacity=".8" />
      <rect x="89" y="62" width="5" height="12" rx="1" fill="#cfe3ee" opacity=".8" />
      <rect x="78" y="66" width="4" height="8" fill="#f3ead2" />
      <ellipse cx="80" cy="63" rx="1.6" ry="3" fill="#ffcf5a" />
    </>
  );
}

function Apart({ u }: { u: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${u}a1`} cx=".3" cy=".2" r=".7"><stop offset="0" stopColor="#5d636e" /><stop offset="1" stopColor="#15171c" /></radialGradient>
      </defs>
      <rect width="160" height="100" fill={`url(#${u}a1)`} />
      <rect x="112" y="16" width="30" height="70" fill="#0c0d10" />
      <rect x="114" y="18" width="26" height="68" fill="#2a2d33" />
      <circle cx="126" cy="38" r="6" fill="#0c0d10" />
      <path d="M116 86 C116 58 138 56 138 86Z" fill="#0c0d10" />
      <circle cx="40" cy="40" r="8.5" fill="#1d1513" />
      <path d="M34 34 C30 52 34 62 38 64 L46 50Z" fill="#120d0c" />
      <path d="M24 82 C24 58 54 56 56 82Z" fill="#4a4f5c" />
      <rect x="44" y="44" width="5" height="9" rx="1" fill="#b9c2cf" />
      <rect x="10" y="80" width="98" height="8" rx="2" fill="#3a3530" />
      <ellipse cx="80" cy="79" rx="5" ry="2" fill="none" stroke="#e4c46a" strokeWidth="1.6" />
      <path d="M20 10 L20 24 M14 24 L26 24 L22 18 L18 18Z" stroke="#c9b48a" strokeWidth="1" fill="#e8d6a8" opacity=".7" />
    </>
  );
}

function LastParty({ u }: { u: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}l1`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a2418" /><stop offset="1" stopColor="#1a100c" /></linearGradient>
      </defs>
      <rect width="160" height="100" fill={`url(#${u}l1)`} />
      <path d="M0 12 Q40 22 80 12 T160 12" stroke="#4a3426" strokeWidth=".8" fill="none" />
      {[8, 22, 36, 50, 64, 78, 92, 106, 120, 134, 148].map((x, k) => <circle key={k} cx={x} cy={14 + Math.sin(k) * 3} r="1.8" fill={['#ffd36b', '#ff7a6b', '#8fe0a0', '#7ab8ff'][k % 4]} />)}
      {[0, 1, 2, 3, 4, 5].map((k) => <rect key={k} x={110 + k * 8} y={84 - k * 10} width="50" height="10" fill={k % 2 ? '#4a3020' : '#56382a'} />)}
      <circle cx="130" cy="34" r="6" fill="#140c08" />
      <path d="M122 54 C122 38 140 38 140 54 L138 64 L124 64Z" fill="#140c08" />
      <circle cx="28" cy="46" r="7" fill="#2a1a12" />
      <path d="M18 88 C18 60 40 58 40 88Z" fill="#8a2c3a" />
      <circle cx="52" cy="48" r="6.5" fill="#2a1a12" />
      <path d="M43 88 C43 62 62 60 62 88Z" fill="#c2803a" />
      <circle cx="80" cy="50" r="6" fill="#2a1a12" opacity=".7" />
      <path d="M72 88 C72 64 90 62 90 88Z" fill="#3a4a6a" opacity=".7" />
    </>
  );
}

const ART: Record<number, (p: { u: string }) => React.JSX.Element> = { 1: School, 2: Party, 3: Dinner, 4: Phone, 5: DateNight, 6: Apart, 7: LastParty };

export default function SceneArt({ scene, className = '' }: { scene: Scene; className?: string }) {
  const Art = ART[scene.n];
  const u = 'sa' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <span className={`sc-art sc-grade-${scene.filter} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><Art u={u} /></svg>
    </span>
  );
}
