// "Our Scenes": the seven moments the group acts out, taken from VIDEO_PLAN.md.
// Edit the plan and this file together. Videos go in public/videos/<file> and show up automatically.
import { STATIONS, NAME_COLORS, type NameLens } from './stations';

/** The color grade applied in editing (VIDEO_PLAN.md, "Editing"). */
export type SceneFilter = 'bw' | 'blue' | 'grey' | 'natural' | 'night';

export interface SceneLine {
  speaker: string;
  /** stage direction, e.g. "kneeling to Gogol's height" */
  how?: string;
  text: string;
  /** set (e.g. 'Ch. 5') when the line is quoted from the novel rather than written by the group */
  book?: string;
}

export interface SceneBeat {
  /** what happens on screen (before any lines) */
  action?: string;
  lines?: SceneLine[];
  /** what happens after the lines */
  after?: string;
  /** words written on screen (a name tag, the inscription) */
  written?: string;
  /** a hard instruction for the camera or editor */
  cue?: string;
}

export interface Scene {
  n: number;
  title: string;
  year: string;
  /** file name inside public/videos */
  file: string;
  /** index into STATIONS (the stop this scene belongs to) */
  station: number;
  lens: NameLens;
  where: string;
  length: string;
  filter: SceneFilter;
  filterLabel: string;
  setup?: string;
  beats: SceneBeat[];
  roles: string[];
  props: string[];
  /** which filming block it belongs to (VIDEO_PLAN.md, "Filming order") */
  shoot: { block: number; place: string };
  flag?: 'key' | 'silent';
  /** where the words come from */
  source: string;
}

const stationOf = (file: string) => {
  const i = STATIONS.findIndex((s) => s.video === `videos/${file}`);
  return i < 0 ? 0 : i;
};

const OWN = 'Our own dialogue, written by the group.';
const SILENT = 'No dialogue. The pictures carry it.';

type Draft = Omit<Scene, 'station' | 'lens'>;

const DRAFTS: Draft[] = [
  {
    n: 1, title: 'The Night Train', year: '1961', file: 'crash.mp4',
    where: 'Dark room + 2 chairs', length: '~40 sec', filter: 'bw', filterLabel: 'Black & white',
    setup: 'Two chairs facing each other in a dark room, train sounds playing.',
    beats: [
      { action: 'Ashoke reads the book. Someone swings a flashlight past him every few seconds.',
        lines: [{ speaker: 'Ghosh', text: 'You’re young. Go see the world before it’s too late.' }] },
      { action: 'Ashoke smiles and keeps reading. The camera shakes harder and harder.', cue: 'Cut to black · add a crash sound' },
      { action: 'In the dark, the flashlight finds Ashoke’s hand holding one crumpled page.', cue: 'Hold 3 seconds' },
    ],
    roles: ['Ashoke', 'Ghosh'],
    props: ['Paperback labeled “Nikolai Gogol”', 'Flashlight', 'Phone playing train sounds', 'Crash sound (added in editing)'],
    shoot: { block: 3, place: 'Dark room' },
    source: OWN,
  },
  {
    n: 2, title: 'Two Names at School', year: '1973', file: 'kindergarten.mp4',
    where: 'Any desk', length: '~30 sec', filter: 'natural', filterLabel: 'No filter',
    beats: [
      { lines: [
        { speaker: 'Ashoke', how: 'kneeling to Gogol’s height', text: 'At school, you’ll be Nikhil.' },
        { speaker: 'Gogol', how: 'arms crossed', text: 'No. I’m Gogol.' },
      ] },
      { lines: [{ speaker: 'Principal', how: 'at a desk, shrugs', text: 'Gogol it is.' }], after: 'Writes it down.' },
      { action: 'Close-up: the name tag.', written: 'GOGOL' },
    ],
    roles: ['Gogol', 'Ashoke', 'Principal'],
    props: ['Name tag or sticky note reading GOGOL', 'A desk and a pen'],
    shoot: { block: 2, place: 'Desk + dinner table' },
    source: OWN,
  },
  {
    n: 3, title: '“I’m Nikhil”', year: '1986', file: 'nikhil.mp4',
    where: 'Any dim room', length: '~25 sec', filter: 'blue', filterLabel: 'Cool blue',
    setup: 'Dim room, colored light or party music.',
    beats: [
      { lines: [{ speaker: 'Kim', text: 'Hey, what’s your name?' }] },
      { lines: [{ speaker: 'Gogol', how: 'hesitates, then says', text: '…Nikhil.' }], after: 'Kim smiles.' },
      { action: 'Close-up: a hand crosses out GOGOL on the name tag and writes NIKHIL.', written: 'NIKHIL' },
    ],
    roles: ['Gogol', 'Kim'],
    props: ['The GOGOL name tag', 'A marker', 'Colored light or party music'],
    shoot: { block: 3, place: 'Dark room' },
    source: OWN,
  },
  {
    n: 4, title: 'The Truth in the Car', year: '1987', file: 'truth.mp4',
    where: 'Parked car, engine off', length: '~45 sec', filter: 'night', filterLabel: 'No filter · evening',
    setup: 'Film in the evening, or with a phone light on the dashboard. One take from the back seat, or two from the passenger side.',
    beats: [
      { lines: [{ speaker: 'Ashoke', how: 'staring ahead', text: 'When I was young, I was in a train crash. They found me because I was holding a page of Gogol.' }] },
      { lines: [{ speaker: 'Gogol', text: 'Is that why you named me Gogol? … Do I remind you of that night?', book: 'Ch. 5' }] },
      { lines: [{ speaker: 'Ashoke', how: 'finally looks at him', text: 'Not at all. You remind me of everything that followed.', book: 'Ch. 5' }] },
      { action: 'Hold on Gogol’s face.', cue: 'Hold 3 seconds' },
    ],
    roles: ['Gogol', 'Ashoke'],
    props: ['A parked car (engine off)', 'Phone light on the dashboard'],
    shoot: { block: 4, place: 'Car, saved for last so it’s darker' },
    flag: 'key',
    source: 'The last two lines are quoted from the book (Ch. 5). The rest is our own dialogue.',
  },
  {
    n: 5, title: 'Dinner with the Ratliffs', year: '1990s', file: 'ratliffs.mp4',
    where: 'Dinner table', length: '~30 sec', filter: 'natural', filterLabel: 'No filter',
    setup: 'A dinner table with plates. Nikhil sits with Maxine and a guest.',
    beats: [
      { action: 'Everyone is laughing. Nikhil looks relaxed and happy.' },
      { lines: [{ speaker: 'Guest', text: 'You must never get sick when you go to India!' }] },
      { lines: [{ speaker: 'Nikhil', how: 'smile fading', text: 'I’m from Massachusetts.' }], after: 'Awkward silence.', cue: 'Hold on his face' },
    ],
    roles: ['Nikhil', 'Maxine', 'Dinner guest'],
    props: ['Dinner plates', 'A table set for three'],
    shoot: { block: 2, place: 'Desk + dinner table' },
    source: OWN,
  },
  {
    n: 6, title: 'The Phone Call', year: '1990s', file: 'phonecall.mp4',
    where: 'Any room + a mirror', length: '~25 sec', filter: 'grey', filterLabel: 'Grey, cold',
    setup: 'Any room, then a bathroom mirror.',
    beats: [
      { action: 'His phone rings. He answers, listens, and slowly sits down.' },
      { action: 'He folds his father’s shirts into a box.' },
      { action: 'At the mirror he raises a razor to his hair.', cue: 'Cut before it touches' },
    ],
    roles: ['Gogol'],
    props: ['A phone', 'Shirts and a box', 'A razor (don’t actually use it!)', 'A mirror'],
    shoot: { block: 1, place: 'Bedroom + mirror' },
    flag: 'silent',
    source: SILENT,
  },
  {
    n: 7, title: 'The Man Who Gave You His Name', year: '2000', file: 'finale.mp4',
    where: 'Bedroom', length: '~30 sec', filter: 'natural', filterLabel: 'No filter',
    beats: [
      { action: 'Gogol finds the book on a shelf and sits on the bed.' },
      { action: 'Close-up: he opens the cover. Handwritten inside:',
        written: 'The man who gave you his name, from the man who gave you your name.' },
      { action: 'He turns the page and starts reading.', cue: 'Fade out' },
    ],
    roles: ['Gogol'],
    props: ['The “Nikolai Gogol” book, inscription written inside first', 'A shelf and a bed'],
    shoot: { block: 1, place: 'Bedroom + mirror' },
    flag: 'silent',
    source: 'No dialogue. The site shows the inscription on screen right after, so nobody reads it aloud.',
  },
];

export const SCENES: Scene[] = DRAFTS.map((d) => {
  const station = stationOf(d.file);
  return { ...d, station, lens: STATIONS[station].name };
});

export const SCENE_COLORS = NAME_COLORS;

export const videoUrl = (s: Scene) => `/videos/${s.file}`;
