// The scenes we filmed. Keep in sync with VIDEO_PLAN.md and the `video:` fields in lib/stations.ts.

export type Line = { who?: string; text: string };
export type Scene = {
  n: number; year: string; title: string; file: string; station: number;
  length: string; where: string; look?: string; key?: boolean; noDialogue?: boolean;
  lines: Line[];
};

export const SCENES: Scene[] = [
  { n: 1, year: '1986', title: '“I’m Nikhil”', file: 'nikhil.mp4', station: 9, length: '~25 sec',
    where: 'Dim room, colored light or party music', look: 'Cool blue',
    lines: [
      { who: 'Kim', text: '“Hey, what’s your name?”' },
      { who: 'Gogol', text: '(hesitates) “…Nikhil.” Kim smiles.' },
      { text: 'Close-up of a hand crossing out GOGOL on the name tag and writing NIKHIL.' },
    ] },
  { n: 2, year: '1990s', title: 'Dinner with the Ratliffs', file: 'ratliffs.mp4', station: 11, length: '~10 sec',
    where: 'Dinner table with plates',
    lines: [
      { text: 'Everyone is laughing. Nikhil looks relaxed and happy.' },
      { who: 'Guest', text: '“You must never get sick when you go to India!”' },
      { who: 'Nikhil', text: '(smile fading) “I’m from Massachusetts.” Awkward silence. Hold on his face.' },
    ] },
  { n: 3, year: '1990s', title: 'The Phone Call', file: 'phonecall.mp4', station: 12, length: '~55 sec', noDialogue: true,
    where: 'Any room, then a bathroom mirror', look: 'Grey, cold',
    lines: [
      { text: 'His phone rings. He answers, listens, and slowly sits down.' },
      { text: 'He folds his dad’s shirts into a box.' },
      { text: 'At the mirror he raises a razor to his hair. Cut before it touches.' },
    ] },
  { n: 4, year: '~2000', title: 'Coming Apart', file: 'apart.mp4', station: 14, length: '~20 sec',
    where: 'Kitchen or dinner table at night, one lamp on', look: 'Grey, cold',
    lines: [
      { text: 'Moushumi laughs quietly on the phone, sees Nikhil, and hangs up fast.' },
      { who: 'Nikhil', text: '“Who was that?”' },
      { who: 'Moushumi', text: '(long pause, not looking at him) “Dimitri.”' },
      { text: 'Nikhil sets his wedding ring on the table and walks out. Hold on the ring 3 seconds.' },
    ] },
];

export const CAST = [
  { role: 'Gogol / Nikhil', scenes: 'all' },
  { role: 'Kim', scenes: '1' },
  { role: 'Maxine + dinner guest', scenes: '2' },
  { role: 'Moushumi', scenes: '4' },
  { role: 'Camera', scenes: 'all' },
];

export const PROPS = [
  'A GOGOL name tag (and a marker to write NIKHIL)',
  'Dinner plates',
  'A phone, shirts and a box',
  'A razor (not actually used)',
  'Any ring',
];

export const ORDER = [
  { where: 'Dim room', scenes: [1], time: '15 min' },
  { where: 'Dinner table', scenes: [2, 4], time: '25 min' },
  { where: 'Room + mirror', scenes: [3], time: '20 min' },
];
