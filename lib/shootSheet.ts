// The 7 scenes we film. Keep in sync with VIDEO_PLAN.md and the `video:` fields in lib/stations.ts.

export type Line = { who?: string; text: string };
export type Scene = {
  n: number; year: string; title: string; file: string; station: number;
  length: string; where: string; look?: string; key?: boolean; noDialogue?: boolean;
  lines: Line[];
};

export const SCENES: Scene[] = [
  { n: 1, year: '1961', title: 'The Night Train', file: 'crash.mp4', station: 1, length: '~40 sec',
    where: 'Dark room, 2 chairs facing each other, train sounds playing', look: 'Black & white',
    lines: [
      { text: 'Ashoke reads the book. Someone swings a flashlight past him like passing lights.' },
      { who: 'Ghosh', text: '“You’re young. Go see the world before it’s too late.”' },
      { text: 'The camera shakes harder, then cut to black with a crash sound.' },
      { text: 'In the dark, the flashlight finds Ashoke’s hand holding a crumpled page. Hold 3 seconds.' },
    ] },
  { n: 2, year: '1973', title: 'Two Names at School', file: 'kindergarten.mp4', station: 5, length: '~30 sec',
    where: 'Any desk',
    lines: [
      { who: 'Ashoke', text: '(kneeling) “At school, you’ll be Nikhil.”' },
      { who: 'Gogol', text: '(arms crossed) “No. I’m Gogol.”' },
      { who: 'Principal', text: '(shrugs) “Gogol it is.” Writes it down.' },
      { text: 'Close-up of the GOGOL name tag.' },
    ] },
  { n: 3, year: '1986', title: '“I’m Nikhil”', file: 'nikhil.mp4', station: 9, length: '~25 sec',
    where: 'Dim room, colored light or party music', look: 'Cool blue',
    lines: [
      { who: 'Kim', text: '“Hey, what’s your name?”' },
      { who: 'Gogol', text: '(hesitates) “…Nikhil.” Kim smiles.' },
      { text: 'Close-up of a hand crossing out GOGOL on the name tag and writing NIKHIL.' },
    ] },
  { n: 4, year: '1987', title: 'The Truth in the Car', file: 'truth.mp4', station: 10, length: '~45 sec', key: true,
    where: 'Parked car, engine off. Film in the evening or with a phone light on the dashboard.',
    lines: [
      { who: 'Ashoke', text: '(staring ahead) “When I was young, I was in a train crash. They found me because I was holding a page of Gogol.”' },
      { who: 'Gogol', text: '“Is that why you named me Gogol? … Do I remind you of that night?”' },
      { who: 'Ashoke', text: '(finally looks at him) “Not at all. You remind me of everything that followed.”' },
      { text: 'Hold on Gogol’s face for 3 seconds.' },
    ] },
  { n: 5, year: '1990s', title: 'Dinner with the Ratliffs', file: 'ratliffs.mp4', station: 11, length: '~30 sec',
    where: 'Dinner table with plates',
    lines: [
      { text: 'Everyone is laughing. Nikhil looks relaxed and happy.' },
      { who: 'Guest', text: '“You must never get sick when you go to India!”' },
      { who: 'Nikhil', text: '(smile fading) “I’m from Massachusetts.” Awkward silence. Hold on his face.' },
    ] },
  { n: 6, year: '1990s', title: 'The Phone Call', file: 'phonecall.mp4', station: 12, length: '~25 sec', noDialogue: true,
    where: 'Any room, then a bathroom mirror', look: 'Grey, cold',
    lines: [
      { text: 'His phone rings. He answers, listens, and slowly sits down.' },
      { text: 'He folds his dad’s shirts into a box.' },
      { text: 'At the mirror he raises a razor to his hair. Cut before it touches.' },
    ] },
  { n: 7, year: '2000', title: 'The Man Who Gave You His Name', file: 'finale.mp4', station: 15, length: '~30 sec', noDialogue: true,
    where: 'Bedroom',
    lines: [
      { text: 'He finds the book on a shelf and sits on the bed.' },
      { text: 'Close-up of the inscription inside: “The man who gave you his name, from the man who gave you your name.”' },
      { text: 'He turns the page and starts reading. Fade out.' },
    ] },
];

export const CAST = [
  { role: 'Gogol / Nikhil', scenes: '2–7' },
  { role: 'Ashoke (the dad)', scenes: '1, 2, 4' },
  { role: 'Ghosh, Principal, Kim', scenes: '1, 2, 3' },
  { role: 'Maxine + dinner guest', scenes: '5' },
  { role: 'Camera', scenes: 'all' },
];

export const PROPS = [
  'A paperback labeled “Nikolai Gogol”, with the inscription written inside',
  'A flashlight',
  'A GOGOL name tag (and a pen to write NIKHIL)',
  'Dinner plates',
  'A razor (not actually used)',
  'A phone playing train sounds',
];

export const ORDER = [
  { where: 'Bedroom + mirror', scenes: [7, 6], time: '25 min' },
  { where: 'Desk + dinner table', scenes: [2, 5], time: '25 min' },
  { where: 'Dark room', scenes: [1, 3], time: '25 min' },
  { where: 'Car (last, so it’s dark)', scenes: [4], time: '20 min' },
];
