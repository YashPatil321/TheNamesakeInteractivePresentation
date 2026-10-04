// One visual language for "what kind of picture is this?", shared by the line, the card, the scene pop-up,
// the first-person rooms, Our Scenes and the presenter remote. Styles: app/styles/media.css (classes mk-*).
//
//   FILMED    warm film-strip badge with sprocket holes: the scenes our group acts and films.
//   GENERATED cool blue badge with a wireframe cube: anything the computer draws (3D crash, 3D rooms,
//             Then & Now animations).
//
// Rule of the line: a moment that is filmed is never also generated (see lib/stations.ts).
import { STATIONS } from './stations';
import { VIGNETTE_STATIONS } from './cards/vignettes';

export const GROUP = ['Shiven Swami', 'Yash Patil', 'Jonah Luo', 'Drew Dupart'];
export const GROUP_CREDIT = `Acted & filmed by ${GROUP.join(' · ')}`;

const FILM_ICO = '<svg class="mk-ico" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4 2.5v11M12 2.5v11" stroke="currentColor" stroke-width="1.2"/><path d="M2.3 5h1M2.3 8h1M2.3 11h1M12.7 5h1M12.7 8h1M12.7 11h1" stroke="currentColor" stroke-width="1.2"/></svg>';
const ANIM_ICO = '<svg class="mk-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6 14 4.8v6.4L8 14.4 2 11.2V4.8z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M2 4.8 8 8l6-3.2M8 8v6.4" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>';

export type MkSize = 'xs' | 'sm' | 'md';

/** Warm film-strip badge: our group filmed this. */
export function filmBadge(label = 'Filmed by our group', size: MkSize = 'sm', title = 'Live action, acted and filmed by our group') {
  return `<span class="mk mk-film mk-${size}" title="${title}">${FILM_ICO}<span>${label}</span></span>`;
}
/** Cool badge: computer-generated (3D or animated). */
export function animBadge(_label = '', _size: MkSize = 'sm', _title = '') {
  return '';
}

export interface StationMedia {
  /** our filmed scene */
  film: boolean;
  /** the 3D derailment cinematic (station 1 only) */
  crash3d: boolean;
  /** a first-person 3D room */
  room3d: boolean;
  /** an animated present-day vignette in Then & Now */
  vignette: boolean;
}

export function mediaOf(i: number): StationMedia {
  const s = STATIONS[i];
  return { film: !!s?.video, crash3d: i === 0, room3d: !!s?.fp, vignette: VIGNETTE_STATIONS.includes(i) };
}

/** Tiny marks above a timeline stop: FILM and/or 3D. */
export function railMarks(i: number) {
  const m = mediaOf(i);
  const film = m.film ? filmBadge('Film', 'xs', 'Filmed by our group') : '';
  return film ? `<span class="mk-rail">${film}</span>` : '';
}

/** Every kind of picture at a station, as full-size badges (presenter remote). */
export function mediaBadges(i: number) {
  const m = mediaOf(i), out: string[] = [];
  if (m.film) out.push(filmBadge('Filmed by our group'));
  return out.join('');
}
