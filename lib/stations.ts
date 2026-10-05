// All story text lives here. Edit freely; the app re-renders from this file.
// video: put the file in public/videos (e.g. public/videos/nikhil.mp4) and reference it as 'videos/nikhil.mp4'.

export type Tag = 'IDEOLOGICAL' | 'INSTITUTIONAL' | 'INTERPERSONAL' | 'INTERNALIZED' | 'BREAKING' | 'RESISTANCE' | 'MIRROR' | 'TURNING';
export type NameLens = 'none' | 'gogol' | 'nikhil' | 'both';
export type Region = 'india' | 'town' | 'suburb' | 'campus' | 'nyc' | 'lake' | 'cleveland';
export type TryKind = 'shoes' | 'cert' | 'rice' | 'rub' | 'gift';
export type FpKind = 'compartment' | 'classroom' | 'car' | 'bedroom';

export interface Station {
  year: string;
  title: string;
  place: string;
  code: string;
  region: Region;
  name: NameLens;
  sky: [string, string];
  story: string[];
  analysis: { tag: Tag; text: string; world: string };
  flashback?: boolean;
  rain?: boolean;
  snow?: boolean;
  try?: TryKind;
  /** a first-person 3D view you can step into from this station */
  fp?: FpKind;
  detail?: string;
  quote?: { text: string; cite: string };
  voice?: { gogol: string; nikhil: string };
  /** predict: true marks a "predict what happens next" poll (label reads "Predict"). */
  poll?: { q: string; options: string[]; actual: string; predict?: boolean };
  special?: 'rewind' | 'decree' | 'finale';
  video?: string;
  shots?: string[];
}

export const STATIONS: Station[] = [
  { year: '1961', title: 'The Night Train', place: 'Near Jamshedpur, India', code: 'JSR', region: 'india', name: 'none', flashback: true, fp: 'compartment',
    sky: ['#04060c', '#1b2133'],
    story: [
      'Ashoke is reading his favorite book, by Nikolai Gogol, on a night train in India.',
      'The train crashes. Rescuers find him because they see a page of the book in his hand.'
    ],
    detail: 'He spends a year in bed recovering. He decides he will go abroad, just as Ghosh said.',
    analysis: { tag: 'MIRROR', text: 'Four years after the crash, the Immigration and Nationality Act of 1965 ends the U.S. quotas that had kept most Asian immigrants out. It opens the door for educated professionals like Ashoke.', world: 'The Hart-Celler Act of 1965 is why many Indian families, like the Gangulis, could come to the U.S.' } },

  { year: '1967', title: 'The Shoes', place: 'Calcutta, India', code: 'CAL', region: 'india', name: 'none', flashback: true, try: 'shoes',
    sky: ['#2a1640', '#c86b4a'],
    story: [
      'Ashima meets the man her family wants her to marry, and secretly slips her feet into his shoes.',
      'They marry, and she moves with him to America.'
    ],
    detail: 'In Cambridge she is alone most of the day in a small apartment, far from everyone she has ever known.',
    poll: { predict: true, q: 'Next stop, 1968: the baby is born, and Ashima\'s grandmother has mailed a letter with his good name. Will it arrive?', options: ['Yes, in time', 'Yes, but late', 'It never arrives'], actual: 'It never arrives. The hospital won\'t discharge a baby without a name, so Ashoke writes the pet name Gogol on the birth certificate.' },
    analysis: { tag: 'MIRROR', text: 'Ashima arrives with no family or community around her and is expected to adjust on her own. Isolation is the first cost of immigrating.', world: 'Many immigrant spouses describe the first years as the loneliest of their lives.' } },

  { year: '1968', title: 'A Name in a Hurry', place: 'Cambridge, Massachusetts', code: 'CAM', region: 'town', name: 'gogol', try: 'cert',
    sky: ['#10223d', '#e59a5c'],
    story: [
      'Their son is born. His real name is coming in a letter from India, but the hospital needs a name now.',
      'The letter never comes, so his dad writes down "Gogol" for now.'
    ],
    detail: 'Pet name vs. good name: in Bengali families a daknam is used at home, and a bhalonam is used in the world.',
    special: 'rewind',
    analysis: { tag: 'INSTITUTIONAL', text: 'An American hospital rule overrides a Bengali tradition. Because a form needs a name now, a private pet name becomes his legal one.', world: 'Official forms still often fail to fit naming traditions: missing middle names, reversed family-name order, character limits.' } },

  { year: '1968', title: 'The Rice Ceremony', place: 'Cambridge, Massachusetts', code: 'CAM', region: 'town', name: 'gogol', try: 'rice',
    sky: ['#1d2b52', '#f1b56b'],
    story: [
      'At his first rice ceremony, baby Gogol is offered dirt, a pen and money to predict his future.',
      'He refuses all three and cries.'
    ],
    quote: { text: 'Being a foreigner, Ashima is beginning to realize, is a sort of lifelong pregnancy—a perpetual wait, a constant burden, a continuous feeling of out of sorts.', cite: 'Chapter 3' },
    analysis: { tag: 'RESISTANCE', text: 'A community response: the Bengali families in Cambridge become each other\'s relatives and keep their traditions alive far from home.', world: 'Immigrant communities today still build cultural associations, festivals and language schools for the same reason.' } },

  { year: '1973', title: 'Two Names at School', place: 'Pemberton Road, Massachusetts', code: 'PEM', region: 'suburb', name: 'gogol',
    sky: ['#3a6fa8', '#c9e0f0'],
    story: [
      'On his first day of school, his parents want him to be called Nikhil.',
      'Gogol says no, and the principal lets him keep "Gogol."'
    ],
    voice: { gogol: 'Gogol is the name I know. Why would I answer to a stranger\'s name?', nikhil: 'Nikhil? That\'s someone else. I don\'t know him yet.' },
    poll: { predict: true, q: 'He stays "Gogol" at school. By the time he is 14, how will he feel about his name?', options: ['Proud of it', 'Embarrassed by it', 'He won\'t think about it'], actual: 'Embarrassed. At 14 he shelves a book with his name on the cover, unread, and before college he changes his name in court.' },
    analysis: { tag: 'INSTITUTIONAL', text: 'A school official, not the family, ends up deciding what the child is called.', world: 'Students with non-English names are still renamed or given nicknames by teachers who find their names "hard."' },
    video: 'videos/kindergarten.mp4', shots: ['Small backpack, parents crouched to his height', 'He shakes his head: "I\'m Gogol."', 'The principal shrugs and writes GOGOL'] },

  { year: '1970s', title: 'Pemberton Road', place: 'Suburban Massachusetts', code: 'PEM', region: 'suburb', name: 'gogol', try: 'rub',
    sky: ['#27447a', '#9cc3e0'],
    story: [
      'The family moves to a suburb. Someone mocks their name on the mailbox.',
      'On a school trip, Gogol makes rubbings of old names from gravestones.'
    ],
    voice: { gogol: 'Our street looks like every other street. Why doesn\'t our name?', nikhil: 'Someday I\'ll have a name that fits the mailbox.' },
    poll: { predict: true, q: 'Next stop, 1982: for his 14th birthday his father gives him The Short Stories of Nikolai Gogol. Will Gogol read the book?', options: ['Yes, right away', 'A few pages, then quits', 'No, it goes on a shelf'], actual: 'He thanks his father and puts it on a shelf, unread. He won\'t open it until Christmas Eve, 2000.' },
    analysis: { tag: 'INTERPERSONAL', text: 'Neighbors target the family through their name, and a child learns that his difference is visible and unwelcome.', world: 'In 1987 a group calling itself the "Dotbusters" terrorized Indian Americans in Jersey City.' } },

  { year: '1982', title: 'The Gift', place: 'Pemberton Road', code: 'PEM', region: 'suburb', name: 'gogol', try: 'gift', fp: 'bedroom',
    sky: ['#2a1d45', '#e08a6a'],
    story: [
      'For his 14th birthday, his dad gives him a book of Nikolai Gogol\'s stories.',
      'Gogol puts it on a shelf and doesn\'t read it.'
    ],
    voice: { gogol: 'A whole book with my name on the cover. I don\'t want to read it.', nikhil: 'Nikolai Gogol isn\'t me. Why does Dad keep pushing him on me?' },
    analysis: { tag: 'INTERNALIZED', text: 'By 14 Gogol has absorbed the idea that his name, and what it stands for, is embarrassing. He rejects the gift before he knows what it means.', world: 'Many children of immigrants remember rejecting their parents\' food, language or names to avoid standing out.' } },

  { year: '1985', title: 'English Class', place: 'High school, Massachusetts', code: 'HS', region: 'suburb', name: 'gogol', fp: 'classroom',
    sky: ['#3b4a6b', '#b8c2d6'],
    story: [
      'His English class learns about the writer Nikolai Gogol.',
      'Everyone turns and stares at him, and he is embarrassed.'
    ],
    voice: { gogol: 'Everyone is looking at me. My name belongs to a strange, sad, dead man.', nikhil: 'I need a name nobody can laugh at.' },
    poll: { predict: true, q: 'Looking ahead to 1987: Ashoke picks his son up from a stalled train and talks to him in the car. What will he tell him?', options: ['He\'s angry about the name change', 'The story of the 1961 train crash', 'That the family is moving back to India'], actual: 'He finally tells him about the crash and the page from "The Overcoat." Gogol\'s name was never a joke. It was the night his father survived.' },
    analysis: { tag: 'INTERPERSONAL', text: 'A lesson meant as enrichment turns into public humiliation. Individual actions, even well-meaning ones, single him out.', world: 'Research on students\' names ("Teachers, please learn our names!", Kohli & Solórzano, 2012) shows how mispronounced names affect students.' } },

  { year: '1986', title: '"I\'m Nikhil"', place: 'Party near Boston → the courthouse', code: 'BOS', region: 'town', name: 'nikhil',
    sky: ['#120b2a', '#5b2a6e'],
    story: [
      'At a party, he tells a girl his name is Nikhil.',
      'Then he legally changes his name and becomes Nikhil at college.'
    ],
    voice: { gogol: 'Gogol stays home. That\'s who my parents still see.', nikhil: 'Nikhil can be anyone. Nikhil kisses girls at parties.' },
    poll: { q: 'Would you legally change your name to fit in?', options: ['Yes, I\'d change it', 'No, I\'d keep it'], actual: 'He changes it. But he keeps feeling like he is pretending, living as two people.' },
    special: 'decree',
    analysis: { tag: 'INTERNALIZED', text: 'He erases the name his parents gave him to be accepted. The pressure to assimilate becomes his own choice.', world: 'Immigrants and their children still anglicize names on résumés and at coffee shops. Hiring studies show why.' },
    video: 'videos/nikhil.mp4', shots: ['Party music: "Hey, what\'s your name?"', 'He hesitates: "…Nikhil."', 'A hand crosses out GOGOL on a name tag and writes NIKHIL'] },

  { year: '1987', title: 'The Truth in the Car', place: 'Train home from Yale', code: 'NHV', region: 'campus', name: 'nikhil', fp: 'car',
    sky: ['#070b18', '#27304f'],
    story: [
      'Nikhil\'s dad picks him up and drives him home.',
      'In the car, his dad finally tells him about the train crash and why he named him Gogol.'
    ],
    quote: { text: '"Do I remind you of that night?" … "Not at all. You remind me of everything that followed."', cite: 'Ashoke to Gogol, Chapter 5' },
    voice: { gogol: 'My name was a rescue, not a joke.', nikhil: 'I threw away the one thing he gave me that meant everything.' },
    analysis: { tag: 'TURNING', text: 'The meaning of his name flips. What he treated as an embarrassment is his father\'s survival story.', world: 'Lots of family names and naming traditions carry histories that younger generations only learn later.' } },

  { year: '1990s', title: 'The Ratliffs', place: 'New York City → New Hampshire', code: 'NYC', region: 'lake', name: 'nikhil',
    sky: ['#0e2a4a', '#f0c27a'],
    story: [
      'Nikhil dates Maxine and loves her family\'s easy American life.',
      'But at dinner, a guest still treats him like a foreigner.'
    ],
    voice: { gogol: 'Gogol feels too loud at the Ratliffs\' table.', nikhil: 'Their life is so easy. I want to belong here.' },
    poll: { predict: true, q: 'Next stop: a phone call. Ashoke has died suddenly of a heart attack in Ohio. How will Gogol react?', options: ['Lean on Maxine and the Ratliffs', 'Turn back toward his family and Bengali custom', 'Bury himself in work'], actual: 'He flies to Cleveland alone, then shaves his head in Bengali mourning custom, the first tradition he chooses for himself. He drifts away from Maxine.' },
    analysis: { tag: 'IDEOLOGICAL', text: 'The "perpetual foreigner" belief: that an American with brown skin must really be from somewhere else.', world: '"Where are you really from?" is one of the most common experiences Asian Americans report.' },
    video: 'videos/ratliffs.mp4', shots: ['Dinner table, Nikhil laughing with Maxine\'s family', 'Guest: "You must never get sick in India!"', 'Nikhil: "I\'m from Massachusetts." Awkward silence'] },

  { year: '1990s', title: 'The Phone Call', place: 'Cleveland, Ohio', code: 'CLE', region: 'cleveland', name: 'nikhil', rain: true,
    sky: ['#15171f', '#3d4250'],
    story: [
      'His dad dies suddenly while working in Ohio.',
      'Gogol shaves his head to mourn him, following Bengali tradition.'
    ],
    voice: { gogol: 'I\'m Gogol again. His son. That\'s the only name that matters now.', nikhil: 'Nikhil has nothing to say here.' },
    analysis: { tag: 'BREAKING', text: 'The climax. Everything he pushed away, his father, his name, his family, can\'t be taken back. He never read the book, and the only person who knew the full story is gone.', world: 'Grief often pulls second-generation kids back toward the traditions they once avoided.' },
    video: 'videos/phonecall.mp4', shots: ['His phone rings; he answers and slowly sits down', 'He packs his father\'s shirts into a box', 'He looks in the mirror, holding a razor'] },

  { year: 'Late 1990s', title: 'Moushumi', place: 'New York City', code: 'NYC', region: 'nyc', name: 'nikhil',
    sky: ['#1a2440', '#b06a7a'],
    story: [
      'His mom sets him up with Moushumi, a Bengali girl he knew as a kid.',
      'They connect over feeling stuck between two worlds, and they get married.'
    ],
    voice: { gogol: 'We both know what it\'s like to live between two worlds.', nikhil: 'She\'s the one person who knows both of my names.' },
    poll: { predict: true, q: 'Two people who understand both worlds, and a big Bengali wedding. Will the marriage last?', options: ['Yes, they found each other', 'No, it will fall apart'], actual: 'It falls apart. Moushumi begins an affair with Dimitri Desjardins, a man from her past, and the marriage ends.' },
    analysis: { tag: 'INTERNALIZED', text: 'Both of them carry the same inner conflict. Part of the attraction is that neither has to explain.', world: 'Family and community expectations around marriage are still a major pressure for many second-generation kids.' },
    video: 'videos/moushumi.mp4', shots: ['Two chairs at a small table, evening', '"My mother made me come tonight." "Mine too."', '"I remember you as Gogol." "I\'ll remember both."'] },

  { year: '~2000', title: 'Coming Apart', place: 'New York City', code: 'NYC', region: 'nyc', name: 'nikhil',
    sky: ['#0b0d16', '#2c2238'],
    story: [
      'Moushumi cheats on him with a man from her past.',
      'The marriage ends.'
    ],
    voice: { gogol: 'Maybe we married the idea of each other.', nikhil: 'Maybe Nikhil was never the answer.' },
    poll: { predict: true, q: 'Last stop: Christmas Eve, 2000, at his mother\'s final party on Pemberton Road. What will Gogol do?', options: ['Change his name back to Gogol', 'Move to Calcutta with his mother', 'Open the book his father gave him'], actual: 'He slips upstairs, finds the book, reads his father\'s inscription for the first time, and begins to read.' },
    analysis: { tag: 'TURNING', text: 'Assimilating didn\'t fix him, and neither did returning to the "right" Bengali life. He has to find himself without a script.', world: 'Identity isn\'t something someone else can hand you, whether it\'s your parents or society.' },
    video: 'videos/apart.mp4', shots: ['She hangs up fast when he walks in', '"Who was that?" … "Dimitri."', 'Close-up: his wedding ring left on the table'] },

  { year: '2000', title: 'The Man Who Gave You His Name', place: 'Pemberton Road, Christmas Eve', code: 'PEM', region: 'suburb', name: 'both', snow: true,
    sky: ['#0a1430', '#2d3d6b'],
    story: [
      'On Christmas Eve, his mom is selling the family house.',
      'Gogol finds the book his dad gave him and finally starts to read it.'
    ],
    quote: { text: 'The man who gave you his name, from the man who gave you your name.', cite: 'Ashoke\'s inscription' },
    voice: { gogol: 'The man who gave me his name. I\'m finally ready to read him.', nikhil: 'Nikhil and Gogol were always the same person.' },
    special: 'finale',
    analysis: { tag: 'RESISTANCE', text: 'Healing is personal. Gogol stops choosing between his names and accepts both, and Ashima chooses a life in two countries.', world: 'Hope: you don\'t have to choose between two cultures to belong.' },
    video: 'videos/finale.mp4', shots: ['Christmas lights and party noise', 'Ashima tells the room the house is sold', 'Gogol looks at his father\'s photo, then climbs the stairs'] },
];

export const NAME_COLORS: Record<NameLens, string> = { none: '#8a90a8', gogol: '#f2a33a', nikhil: '#5eaaff', both: '#c9a3ff' };
export const TAG_COLORS: Record<Tag, string> = { IDEOLOGICAL: '#9c5bd9', INSTITUTIONAL: '#3a93cf', INTERPERSONAL: '#d8513f', INTERNALIZED: '#c9862a', BREAKING: '#ffffff', RESISTANCE: '#3fae6c', MIRROR: '#8b91a5', TURNING: '#d0408a' };
export const TAG_NAMES: Record<Tag, string> = { IDEOLOGICAL: 'Ideological', INSTITUTIONAL: 'Institutional', INTERPERSONAL: 'Interpersonal', INTERNALIZED: 'Internalized', BREAKING: 'Breaking point', RESISTANCE: 'Resistance & healing', MIRROR: 'Mirror to society', TURNING: 'Turning point' };

/** Speaker notes shown only on the presenter remote (/presenter), one list per station. */
export const NOTES: string[][] = [
  ['This is a flashback: Gogol has not been born yet.', 'Watch the crash, then press E to sit inside the compartment with Ashoke and Ghosh.', 'Mirror to society: the 1965 Hart-Celler Act opens the door for Ashoke.'],
  ['Still a flashback. Ashima is 19 and has not met her husband.', 'Hands-on: have someone click "Slip your feet in".', 'Talking point: isolation is the first cost of immigrating.'],
  ['The first stop where Gogol is on the train. Track turns orange.', 'Hands-on: let a classmate try to fill the birth certificate, then wait for the letter three times.', 'Institutional: a hospital form overrides a Bengali naming tradition.', 'Optional: press "Why Gogol?" to rewind to the crash.'],
  ['The rice ceremony: the Bengali community acts as family.', 'Hands-on: ask the class which item baby Gogol will pick, then tap it.', 'Read the "lifelong pregnancy" quote aloud.'],
  ['Class vote: tap once per raised hand, then reveal.', 'Institutional: the principal, not the parents, decides his name.', 'Scene video station (kindergarten).'],
  ['Hands-on: rub the gravestone.', 'Interpersonal: the mailbox vandalism.', 'Real world: the 1987 "Dotbusters" in Jersey City.'],
  ['Hands-on: try to open the book, and it goes on the shelf.', 'Step inside (press E): his bedroom on his 14th birthday, Ashoke in the doorway.', 'Internalized: he rejects the gift before he knows what it means.', 'Plant the seed: this book comes back at the very end.'],
  ['English class turns into public humiliation.', 'Real world: Kohli & Solórzano (2012) on students\' names.'],
  ['PETITION GRANTED stamp plays on first visit. The Gogol/Nikhil switch unlocks.', 'Class vote: would you change your name?', 'Press N to flip the inner voice between names.', 'Scene video station (the party).'],
  ['Turning point: the truth in the car.', 'Press E for the passenger seat: Ashoke tells the story.', 'Read the quote slowly: "You remind me of everything that followed."'],
  ['The Ratliffs: the easy America he wanted.', 'Class vote, then reveal.', 'Ideological: the "perpetual foreigner" belief.', 'Scene video station (dinner with the Ratliffs).'],
  ['The climax. Our filmed scene carries the phone call.', 'Breaking point: he shaves his head, the first tradition he chooses.', 'Scene video station (the phone call).'],
  ['Moushumi: two people who both know both of his names.', 'Internalized: expectations around marriage.', 'Scene video station (the first date).'],
  ['The marriage ends. Neither path came with a script.', 'Turning point: identity cannot be handed to you.', 'Scene video station (Dimitri).'],
  ['The track braids orange and blue. He is both now.', 'Scene video station (the last party), then he goes upstairs to the book.', 'If every station is visited, open the book for the finale.', 'After the finale, run the ticket inspector quiz with the class.'],
];

export interface QuizQuestion { q: string; options: string[]; answer: number; why: string }

/** The ticket inspector's quiz, built only from events told on the stations above. */
export const QUIZ: QuizQuestion[] = [
  { q: 'What was Ashoke holding when rescuers found him after the 1961 crash?', options: ['A photo of his family', 'A page from "The Overcoat"', 'His train ticket', 'A letter from Ashima'], answer: 1, why: 'The crumpled page caught a rescuer\'s eye. That page is the root of Gogol\'s name.' },
  { q: 'Why does the birth certificate say "Gogol"?', options: ['Ashima loved Russian novels', 'The hospital picked it', 'Ashima\'s grandmother\'s letter with his good name never arrived', 'It was a family name'], answer: 2, why: 'The hospital would not discharge a baby without a name, and the letter was lost in the mail.' },
  { q: 'At the rice ceremony, what does baby Gogol reach for?', options: ['The pen', 'The dollar', 'The earth', 'Nothing. He cries.'], answer: 3, why: 'He refuses all three. Nobody can predict his future for him.' },
  { q: 'Where does Gogol first introduce himself as "Nikhil"?', options: ['His first day of kindergarten', 'A college party', 'The courthouse', 'A job interview at an architecture firm'], answer: 1, why: 'He tells Kim his name is Nikhil, and it gets him his first kiss.' },
  { q: 'Where is Ashoke working when he dies?', options: ['Cleveland, Ohio', 'Calcutta', 'New Haven', 'New Hampshire'], answer: 0, why: 'Gogol flies to Cleveland alone to identify his father and empty the apartment.' },
  { q: 'Finish the inscription: "The man who gave you his name, from…"', options: ['"…your loving father."', '"…the man who gave you your name."', '"…one Gogol to another."', '"…Calcutta, with love."'], answer: 1, why: 'Gogol reads it for the first time on Christmas Eve, 2000, and begins to read.' },
];

export const START = 2; // the book opens in 1968
export const NIKHIL_AT = 8; // the name switch unlocks here

/** Labels for the first-person views (lib/firstperson.ts builds the rooms). */
export const FP_INFO: Record<FpKind, { title: string; blurb: string }> = {
  compartment: { title: 'Inside the night train', blurb: "Sit in Ashoke's compartment the night of the crash and look around." },
  classroom: { title: "Gogol's desk in English class", blurb: 'The teacher starts on Nikolai Gogol. Feel every head turn.' },
  car: { title: 'The passenger seat', blurb: 'Ride home with Ashoke the night he tells the truth.' },
  bedroom: { title: 'His bedroom, 1982', blurb: 'His 14th birthday. His father stands in the doorway; the new book lies on the bed.' },
};
