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
    n: 1, title: 'Two Names at School', year: '1973', file: 'kindergarten.mp4',
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
    n: 2, title: '“I’m Nikhil”', year: '1986', file: 'nikhil.mp4',
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
    n: 3, title: 'Dinner with the Ratliffs', year: '1990s', file: 'ratliffs.mp4',
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
    n: 4, title: 'The Phone Call', year: '1990s', file: 'phonecall.mp4',
    where: 'Any room + a mirror', length: '~25 sec', filter: 'grey', filterLabel: 'Grey, cold',
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
    n: 5, title: 'Both of My Names', year: 'Late 1990s', file: 'moushumi.mp4',
    where: 'Small table, like a café', length: '~30 sec', filter: 'night', filterLabel: 'No filter · evening',
    setup: 'Two chairs at a small table with two glasses and a candle (or a phone light). Evening.',
    beats: [
      { action: 'Nikhil and Moushumi sit down across from each other, a little awkward.' },
      { lines: [
        { speaker: 'Moushumi', text: 'My mother made me come tonight.' },
        { speaker: 'Nikhil', text: 'Mine too.' },
      ], after: 'They both laugh.' },
      { lines: [
        { speaker: 'Moushumi', text: 'I remember you as Gogol.' },
        { speaker: 'Nikhil', how: 'pauses', text: 'Everyone calls me Nikhil now.' },
        { speaker: 'Moushumi', how: 'smiling', text: 'I’ll remember both.' },
      ] },
      { action: 'Close-up: they clink glasses.', cue: 'Hold 2 seconds' },
    ],
    roles: ['Nikhil', 'Moushumi'],
    props: ['Two glasses', 'A candle or phone light', 'A small table'],
    shoot: { block: 2, place: 'Desk + dinner table' },
    flag: 'key',
    source: OWN,
  },
  {
    n: 6, title: 'Coming Apart', year: '~2000', file: 'apart.mp4',
    where: 'Kitchen or dinner table', length: '~30 sec', filter: 'grey', filterLabel: 'Grey, cold',
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
  {
    n: 7, title: 'The Last Party', year: '2000', file: 'finale.mp4',
    where: 'Living room + stairs', length: '~30 sec', filter: 'natural', filterLabel: 'No filter · warm',
    setup: 'Christmas Eve: lights on, music, a few people talking in the background.',
    beats: [
      { lines: [{ speaker: 'Ashima', how: 'to the room, raising a glass', text: 'After tonight this house belongs to someone else. I’ll be in Calcutta half the year.' }],
        after: 'Sonia hugs her.' },
      { action: 'Gogol stands apart, picks up a framed photo of his father, and looks at it.' },
      { action: 'He sets it down and quietly climbs the stairs.', cue: 'Cut as he reaches the top' },
    ],
    roles: ['Gogol', 'Ashima', 'Sonia', 'Party guests (anyone)'],
    props: ['Christmas lights or a few candles', 'A framed photo', 'Glasses', 'Music playing'],
    shoot: { block: 1, place: 'House: living room, stairs + mirror' },
    source: OWN,
  },
];

export const SCENES: Scene[] = DRAFTS.map((d) => {
  const station = stationOf(d.file);
  return { ...d, station, lens: STATIONS[station].name };
});

export const SCENE_COLORS = NAME_COLORS;

export const videoUrl = (s: Scene) => `/videos/${s.file}`;
