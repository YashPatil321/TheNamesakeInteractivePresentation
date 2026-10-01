// The 7 scenes we film. Keep in sync with VIDEO_PLAN.md and the `video:` fields in lib/stations.ts.

export type Line = { who?: string; text: string };
export type Scene = {
  n: number; year: string; title: string; file: string; station: number;
  length: string; where: string; look?: string; key?: boolean; noDialogue?: boolean;
  lines: Line[];
};

export const SCENES: Scene[] = [
  { n: 1, year: '1973', title: 'Two Names at School', file: 'kindergarten.mp4', station: 5, length: '~30 sec',
    where: 'Any desk',
    lines: [
      { who: 'Ashoke', text: '(kneeling) “At school, you’ll be Nikhil.”' },
      { who: 'Gogol', text: '(arms crossed) “No. I’m Gogol.”' },
      { who: 'Principal', text: '(shrugs) “Gogol it is.” Writes it down.' },
      { text: 'Close-up of the GOGOL name tag.' },
    ] },
  { n: 2, year: '1986', title: '“I’m Nikhil”', file: 'nikhil.mp4', station: 9, length: '~25 sec',
    where: 'Dim room, colored light or party music', look: 'Cool blue',
    lines: [
      { who: 'Kim', text: '“Hey, what’s your name?”' },
      { who: 'Gogol', text: '(hesitates) “…Nikhil.” Kim smiles.' },
      { text: 'Close-up of a hand crossing out GOGOL on the name tag and writing NIKHIL.' },
    ] },
  { n: 3, year: '1990s', title: 'Dinner with the Ratliffs', file: 'ratliffs.mp4', station: 11, length: '~30 sec',
    where: 'Dinner table with plates',
    lines: [
      { text: 'Everyone is laughing. Nikhil looks relaxed and happy.' },
      { who: 'Guest', text: '“You must never get sick when you go to India!”' },
      { who: 'Nikhil', text: '(smile fading) “I’m from Massachusetts.” Awkward silence. Hold on his face.' },
    ] },
  { n: 4, year: '1990s', title: 'The Phone Call', file: 'phonecall.mp4', station: 12, length: '~25 sec', noDialogue: true,
    where: 'Any room, then a bathroom mirror', look: 'Grey, cold',
    lines: [
      { text: 'His phone rings. He answers, listens, and slowly sits down.' },
      { text: 'He folds his dad’s shirts into a box.' },
      { text: 'At the mirror he raises a razor to his hair. Cut before it touches.' },
    ] },
  { n: 5, year: 'Late 1990s', title: 'Both of My Names', file: 'moushumi.mp4', station: 13, length: '~30 sec', key: true,
    where: 'Small table like a café, evening, two glasses and a candle',
    lines: [
      { text: 'Nikhil and Moushumi sit down across from each other, a little awkward.' },
      { who: 'Moushumi', text: '“My mother made me come tonight.”' },
      { who: 'Nikhil', text: '“Mine too.” They both laugh.' },
      { who: 'Moushumi', text: '“I remember you as Gogol.”' },
      { who: 'Nikhil', text: '(pauses) “Everyone calls me Nikhil now.”' },
      { who: 'Moushumi', text: '(smiling) “I’ll remember both.” Close-up: they clink glasses.' },
    ] },
  { n: 6, year: '~2000', title: 'Coming Apart', file: 'apart.mp4', station: 14, length: '~30 sec',
    where: 'Kitchen or dinner table at night, one lamp on', look: 'Grey, cold',
    lines: [
      { text: 'Moushumi laughs quietly on the phone, sees Nikhil, and hangs up fast.' },
      { who: 'Nikhil', text: '“Who was that?”' },
      { who: 'Moushumi', text: '(long pause, not looking at him) “Dimitri.”' },
      { text: 'Nikhil sets his wedding ring on the table and walks out. Hold on the ring 3 seconds.' },
    ] },
  { n: 7, year: '2000', title: 'The Last Party', file: 'finale.mp4', station: 15, length: '~30 sec',
    where: 'Living room + stairs, Christmas lights, music', look: 'Warm',
    lines: [
      { who: 'Ashima', text: '(raising a glass) “After tonight this house belongs to someone else. I’ll be in Calcutta half the year.” Sonia hugs her.' },
      { text: 'Gogol stands apart, picks up a framed photo of his father, and looks at it.' },
      { text: 'He sets it down and quietly climbs the stairs. Cut as he reaches the top.' },
    ] },
];

export const CAST = [
  { role: 'Gogol / Nikhil', scenes: 'all' },
  { role: 'Ashoke, Principal, Kim (small parts)', scenes: '1, 2' },
  { role: 'Maxine + dinner guest', scenes: '3' },
  { role: 'Moushumi', scenes: '5, 6' },
  { role: 'Ashima + Sonia', scenes: '7' },
  { role: 'Camera', scenes: 'all' },
];

export const PROPS = [
  'A GOGOL name tag (and a marker to write NIKHIL)',
  'Dinner plates and glasses',
  'A candle or phone light',
  'Any ring',
  'A framed photo and Christmas lights',
  'A razor (not actually used)',
];

export const ORDER = [
  { where: 'House: living room, stairs + mirror', scenes: [7, 4], time: '25 min' },
  { where: 'Desk + dinner table', scenes: [1, 3, 5, 6], time: '45 min' },
  { where: 'Dim room', scenes: [2], time: '15 min' },
];
