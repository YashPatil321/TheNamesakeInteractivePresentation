// Card add-on: archive postcards. One illustrated postcard per station, rendered in Blender (blender/postcards.py)
// from the same landmark models the 3D line uses, framed as a vintage postcard with a stamp and a postmark.
// Click (or Enter) opens a lightbox. See ./types.ts.
import type { CardModule, CardApi } from './types';

interface Card { alt: string; stamp: string; country: string; mark: string; greet: string }

// alt text describes what is actually in each render; stamp values follow period postage (India naye paise, then US first-class rates)
const CARDS: Card[] = [
  { alt: 'A steam train passes a sleeping village of huts, palms and a small white shrine under a starry night sky.', stamp: '15 nP', country: 'INDIA', mark: 'JAMSHEDPUR', greet: 'Jamshedpur' },
  { alt: 'Dusk over Calcutta: the train runs past balconied colonial houses, a tram and a great steel bridge over the Hooghly.', stamp: '15 nP', country: 'INDIA', mark: 'CALCUTTA', greet: 'Calcutta' },
  { alt: 'Early light in Cambridge: the train passes triple-decker houses and a white church steeple near the Charles River.', stamp: '6¢', country: 'U.S.A.', mark: 'CAMBRIDGE MA', greet: 'Cambridge' },
  { alt: 'Golden evening in Cambridge: the train passes brick rows and a clock tower.', stamp: '6¢', country: 'U.S.A.', mark: 'CAMBRIDGE MA', greet: 'Cambridge' },
  { alt: 'A bright day on Pemberton Road: the train passes a red-brick elementary school with a flag and a yellow school bus.', stamp: '8¢', country: 'U.S.A.', mark: 'PEMBERTON RD', greet: 'Pemberton Road' },
  { alt: 'A clear afternoon: the train passes a small New England cemetery with rows of gravestones under autumn trees, and a white colonial house.', stamp: '13¢', country: 'U.S.A.', mark: 'PEMBERTON RD', greet: 'Pemberton Road' },
  { alt: 'Sunset on a quiet suburban street of colonial houses with autumn trees, the train going by.', stamp: '20¢', country: 'U.S.A.', mark: 'PEMBERTON RD', greet: 'Pemberton Road' },
  { alt: 'An overcast school day: the train passes a brick high school with a clock tower and stadium lights.', stamp: '22¢', country: 'U.S.A.', mark: 'MASSACHUSETTS', greet: 'Massachusetts' },
  { alt: 'Night near Boston: lit windows of brownstones and a domed granite courthouse behind the train.', stamp: '22¢', country: 'U.S.A.', mark: 'BOSTON MA', greet: 'Boston' },
  { alt: 'Night at Yale: Gothic college buildings with glowing pointed windows behind the train.', stamp: '22¢', country: 'U.S.A.', mark: 'NEW HAVEN CT', greet: 'New Haven' },
  { alt: 'Golden hour at a New Hampshire lake: pines, a shingled lake house with a dock and calm water beside the line.', stamp: '25¢', country: 'U.S.A.', mark: 'NEW HAMPSHIRE', greet: 'New Hampshire' },
  { alt: 'Rain in Cleveland: grey industrial buildings and smokestacks behind the train, streaked with rain.', stamp: '29¢', country: 'U.S.A.', mark: 'CLEVELAND OH', greet: 'Cleveland' },
  { alt: 'Pink dusk in New York: rows of brick apartment buildings and towers behind the train.', stamp: '32¢', country: 'U.S.A.', mark: 'NEW YORK NY', greet: 'New York' },
  { alt: 'Night in New York: a suspension bridge strung with lights and the skyline, the Twin Towers lit, beyond the train.', stamp: '33¢', country: 'U.S.A.', mark: 'NEW YORK NY', greet: 'New York' },
  { alt: 'Christmas Eve, snow falling on Pemberton Road: lit houses, pine trees and the train in the snow.', stamp: '33¢', country: 'U.S.A.', mark: 'PEMBERTON RD', greet: 'Pemberton Road' },
];

const src = (i: number) => `/postcards/s${String(i).padStart(2, '0')}.webp`;
const yearOf = (y: string) => (y.match(/\d{4}/)?.[0] ?? y).replace(/s$/, '');

const mod: CardModule = {
  html(i: number, api: CardApi) {
    const c = CARDS[i], s = api.stations[i];
    if (!c || !s) return '';
    const e = api.esc;
    const tilt = i % 2 ? 0.8 : -0.7;
    const india = c.country === 'INDIA';
    return `<figure class="ar-strip">
  <div class="ar-card" style="--ar-tilt:${tilt}deg" role="button" tabindex="0" aria-label="Enlarge postcard: ${e(s.title)}" data-ar-open="${i}">
    <img class="ar-img" src="${src(i)}" alt="${e(c.alt)}" width="1200" height="675" loading="lazy" decoding="async">
    <span class="ar-greet">Greetings from <b>${e(c.greet)}</b></span>
    <span class="ar-stamp${india ? ' ar-in' : ''}" aria-hidden="true"><i>${e(c.country)}</i><b>${e(c.stamp)}</b><svg viewBox="0 0 24 24"><path d="M2 17h20M4 17V11h10l3 3h3v3M6 17v2M17 17v2M7 11V8h4v3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    <span class="ar-mark" aria-hidden="true"><svg viewBox="0 0 100 100"><defs><path id="ar-c${i}" d="M50 50m-36 0a36 36 0 1 1 72 0a36 36 0 1 1 -72 0"/></defs><circle cx="50" cy="50" r="44"/><circle cx="50" cy="50" r="27"/><text><textPath href="#ar-c${i}" startOffset="2%">${e(c.mark)} · ${e(s.code)} ·</textPath></text><text x="50" y="56" text-anchor="middle" class="ar-y">${e(yearOf(s.year))}</text></svg><span class="ar-waves"></span></span>
  </div>
  <figcaption class="ar-cap">${e(s.year)} <span>· ${e(s.place)} · tap to enlarge</span></figcaption>
</figure>`;
  },

  mount(root: HTMLElement, i: number, api: CardApi) {
    const card = root.querySelector<HTMLElement>('[data-ar-open]');
    if (!card) return;
    let box: HTMLElement | null = null, prevFocus: Element | null = null;
    const close = () => {
      if (!box) return;
      const b = box; box = null;
      b.classList.remove('ar-on');
      setTimeout(() => b.remove(), 250);
      document.removeEventListener('keydown', onKey, true);
      (prevFocus as HTMLElement | null)?.focus?.();
    };
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') { ev.stopPropagation(); ev.preventDefault(); close(); } };
    const open = () => {
      if (box) return;
      const s = api.stations[i], c = CARDS[i];
      prevFocus = document.activeElement;
      box = document.createElement('div');
      box.className = 'ar-box';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', `Postcard: ${s.title}`);
      box.innerHTML = `<figure class="ar-big"><img src="${src(i)}" alt="${api.esc(c.alt)}" width="1200" height="675"><figcaption><b>${api.esc(s.title)}</b> · ${api.esc(s.year)}, ${api.esc(s.place)}<span>Illustration rendered for this project in Blender from the line's own 3D models.</span></figcaption></figure><button class="ar-x" type="button" aria-label="Close">×</button>`;
      box.addEventListener('click', (ev) => { if (ev.target === box || (ev.target as HTMLElement).closest('.ar-x')) close(); });
      document.body.appendChild(box);
      document.addEventListener('keydown', onKey, true);
      requestAnimationFrame(() => box?.classList.add('ar-on'));
      box.querySelector<HTMLElement>('.ar-x')?.focus();
    };
    const onClick = () => open();
    const onCardKey = (ev: KeyboardEvent) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); } };
    card.addEventListener('click', onClick);
    card.addEventListener('keydown', onCardKey);
    return () => { card.removeEventListener('click', onClick); card.removeEventListener('keydown', onCardKey); if (box) { box.remove(); box = null; document.removeEventListener('keydown', onKey, true); } };
  },
};
export default mod;
