// "Our Scenes": the moments the group acts out, taken from VIDEO_PLAN.md.
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
    n: 1, title: '“I’m Nikhil”', year: '1986', file: 'nikhil.mp4',
    where: 'Any dim room', length: '~25 sec', filter: 'blue', filterLabel: 'Cool blue',
    setup: 'Dim room, colored light or party music.',
    beats: [
      { lines: [{ speaker: 'Kim', text: 'Hey, what’s your name?' }] },
      { lines: [{ speaker: 'Gogol', how: 'hesitates, then says', text: '…Nikhil.' }], after: 'Kim smiles.' },
      { action: 'Close-up: a hand crosses out GOGOL on the name tag and writes NIKHIL.', written: 'NIKHIL' },
    ],
    roles: ['Gogol', 'Kim'],
    props: ['The GOGOL name tag', 'A marker', 'Colored light or party music'],
    shoot: { block: 3, place: 'Dim room' },
    source: OWN,
  },
  {
    n: 2, title: 'Dinner with the Ratliffs', year: '1990s', file: 'ratliffs.mp4',
    where: 'Dinner table', length: '~10 sec', filter: 'natural', filterLabel: 'No filter',
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
    n: 3, title: 'The Phone Call', year: '1990s', file: 'phonecall.mp4',
    where: 'Any room + a mirror', length: '~55 sec', filter: 'grey', filterLabel: 'Grey, cold',
    setup: 'Any room, then a bathroom mirror.',
    beats: [
      { action: 'His phone rings. He answers, listens, and slowly sits down.' },
      { action: 'He folds his father’s shirts into a box.' },
      { action: 'At the mirror he raises a razor to his hair.', cue: 'Cut before it touches' },
    ],
    roles: ['Gogol'],
    props: ['A phone', 'Shirts and a box', 'A razor (don’t actually use it!)', 'A mirror'],
    shoot: { block: 1, place: 'House: living room, stairs + mirror' },
    flag: 'silent',
    source: SILENT,
  },
  {
    n: 4, title: 'Coming Apart', year: '~2000', file: 'apart.mp4',
    where: 'Kitchen or dinner table', length: '~20 sec', filter: 'grey', filterLabel: 'Grey, cold',
    setup: 'A table at night with one lamp on. Moushumi is on the phone when Nikhil walks in.',
    beats: [
      { action: 'Moushumi laughs quietly on the phone, sees Nikhil, and hangs up fast.' },
      { lines: [
        { speaker: 'Nikhil', text: 'Who was that?' },
        { speaker: 'Moushumi', how: 'long pause, not looking at him', text: 'Dimitri.' },
      ] },
      { action: 'Nikhil sets his wedding ring on the table and walks out.' },
      { action: 'Close-up: the ring on the table.', cue: 'Hold 3 seconds, fade out' },
    ],
    roles: ['Nikhil', 'Moushumi'],
    props: ['A phone', 'Any ring', 'A lamp'],
    shoot: { block: 2, place: 'Desk + dinner table' },
    source: OWN,
  },
];

export const SCENES: Scene[] = DRAFTS.map((d) => {
  const station = stationOf(d.file);
  return { ...d, station, lens: STATIONS[station].name };
});

export const SCENE_COLORS = NAME_COLORS;

export const videoUrl = (s: Scene) => `/videos/${s.file}`;
