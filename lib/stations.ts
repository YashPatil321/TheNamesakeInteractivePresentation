// All story text lives here. Edit freely; the app re-renders from this file.
// video: put the file in public/videos (e.g. public/videos/crash.mp4) and reference it as 'videos/crash.mp4'.

export type Tag = 'IDEOLOGICAL' | 'INSTITUTIONAL' | 'INTERPERSONAL' | 'INTERNALIZED' | 'BREAKING' | 'RESISTANCE' | 'MIRROR' | 'TURNING';
export type NameLens = 'none' | 'gogol' | 'nikhil' | 'both';
export type Region = 'india' | 'town' | 'suburb' | 'campus' | 'nyc' | 'lake' | 'cleveland';
export type TryKind = 'shoes' | 'cert' | 'rice' | 'rub' | 'gift' | 'phone';

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
  detail?: string;
  quote?: { text: string; cite: string };
  voice?: { gogol: string; nikhil: string };
  poll?: { q: string; options: string[]; actual: string };
  special?: 'rewind' | 'decree' | 'finale';
  video?: string;
  shots?: string[];
}

export const STATIONS: Station[] = [
  { year: '1961', title: 'The Night Train', place: 'Near Jamshedpur, India', code: 'JSR', region: 'india', name: 'none', flashback: true,
    sky: ['#04060c', '#1b2133'],
    story: [
      'Ashoke Ganguli, 22, rides an overnight train to visit his grandfather, rereading the stories of Nikolai Gogol, his grandfather\'s favorite writer.',
      'A friendly stranger named Ghosh tells him to see the world while he still can. Hours later the train derails in the dark. Rescuers nearly pass him by, until they notice a crumpled page from "The Overcoat" in his hand.'
    ],
    detail: 'He spends a year in bed recovering. He decides he will go abroad, just as Ghosh said.',
    analysis: { tag: 'MIRROR', text: 'Four years after the crash, the Immigration and Nationality Act of 1965 ends the U.S. quotas that had kept most Asian immigrants out. It opens the door for educated professionals like Ashoke.', world: 'Historical connection: the Hart-Celler Act (1965). Look up History.com or the Migration Policy Institute for a citation.' },
    video: 'videos/crash.mp4', shots: ['Two rows of chairs as the train compartment', 'Flashlight swinging past the window for passing lights', 'Blackout, then a flashlight finds the page in his hand'] },

  { year: '1967', title: 'The Shoes', place: 'Calcutta, India', code: 'CAL', region: 'india', name: 'none', flashback: true, try: 'shoes',
    sky: ['#2a1640', '#c86b4a'],
    story: [
      'Ashima, 19, is told a suitor is coming to meet her. While the families talk, she slips her feet into his shoes, which he left by the door. They are still warm.',
      'Weeks later they are married, and Ashima follows a man she barely knows to Cambridge, Massachusetts.'
    ],
    detail: 'In Cambridge she is alone most of the day in a small apartment, far from everyone she has ever known.',
    analysis: { tag: 'MIRROR', text: 'Ashima arrives with no family or community around her and is expected to adjust on her own. Isolation is the first cost of immigrating.', world: 'Many immigrant spouses describe the first years as the loneliest of their lives.' } },

  { year: '1968', title: 'A Name in a Hurry', place: 'Cambridge, Massachusetts', code: 'CAM', region: 'town', name: 'gogol', try: 'cert',
    sky: ['#10223d', '#e59a5c'],
    story: [
      'Pregnant and homesick, Ashima makes a snack from Rice Krispies, Planters peanuts, onion, salt, lemon and green chili. It is the closest she can get to the street food of Calcutta.',
      'Their son is born. By Bengali custom, Ashima\'s grandmother is to choose his "good name" (bhalonam), and her letter is in the mail. It never arrives. The hospital won\'t discharge a baby without a name on the birth certificate, so Ashoke writes the pet name (daknam) he chooses: Gogol.'
    ],
    detail: 'Pet name vs. good name: in Bengali families a daknam is used at home, and a bhalonam is used in the world.',
    special: 'rewind',
    analysis: { tag: 'INSTITUTIONAL', text: 'An American hospital rule overrides a Bengali tradition. Because a form needs a name now, a private pet name becomes his legal one.', world: 'Official forms still often fail to fit naming traditions: missing middle names, reversed family-name order, character limits.' } },

  { year: '1968', title: 'The Rice Ceremony', place: 'Cambridge, Massachusetts', code: 'CAM', region: 'town', name: 'gogol', try: 'rice',
    sky: ['#1d2b52', '#f1b56b'],
    story: [
      'At six months old, Gogol has his annaprasan, the first time he is fed rice. Bengali friends in Cambridge play the role of the family back in India.',
      'To predict his future they offer him a plate: a clod of earth, a ballpoint pen, and a dollar bill. Gogol refuses all three and cries.'
    ],
    quote: { text: 'Being a foreigner, Ashima is beginning to realize, is a sort of lifelong pregnancy—a perpetual wait, a constant burden, a continuous feeling of out of sorts.', cite: 'Chapter 3' },
    analysis: { tag: 'RESISTANCE', text: 'A community response: the Bengali families in Cambridge become each other\'s relatives and keep their traditions alive far from home.', world: 'Immigrant communities today still build cultural associations, festivals and language schools for the same reason.' } },

  { year: '1973', title: 'Two Names at School', place: 'Pemberton Road, Massachusetts', code: 'PEM', region: 'suburb', name: 'gogol',
    sky: ['#3a6fa8', '#c9e0f0'],
    story: [
      'On his first day of kindergarten his parents tell him he will be "Nikhil" at school, his new good name.',
      'Gogol refuses. He doesn\'t know anyone called Nikhil. The principal, Mrs. Lapidus, overrules his parents and lets him keep "Gogol."'
    ],
    voice: { gogol: 'Gogol is the name I know. Why would I answer to a stranger\'s name?', nikhil: 'Nikhil? That\'s someone else. I don\'t know him yet.' },
    poll: { q: 'You\'re five. Your parents hand you a new "school name." Do you use it?', options: ['Keep my name', 'Use the new one'], actual: 'He refuses, and the school sides with him. He stays Gogol for the next 13 years.' },
    analysis: { tag: 'INSTITUTIONAL', text: 'A school official, not the family, ends up deciding what the child is called.', world: 'Students with non-English names are still renamed or given nicknames by teachers who find their names "hard."' },
    video: 'videos/kindergarten.mp4', shots: ['Small backpack, parents crouched to his height', 'He shakes his head: "I\'m Gogol."', 'The principal shrugs and writes GOGOL'] },

  { year: '1970s', title: 'Pemberton Road', place: 'Suburban Massachusetts', code: 'PEM', region: 'suburb', name: 'gogol', try: 'rub',
    sky: ['#27447a', '#9cc3e0'],
    story: [
      'The Gangulis buy a house in a college town. Sonia is born. Weekends fill with Bengali parties, and Christmas gets celebrated for the kids.',
      'Someone vandalizes the family\'s mailbox, mocking their name. On a school trip to an old cemetery, Gogol makes rubbings of gravestones with names nobody uses anymore.'
    ],
    voice: { gogol: 'Our street looks like every other street. Why doesn\'t our name?', nikhil: 'Someday I\'ll have a name that fits the mailbox.' },
    analysis: { tag: 'INTERPERSONAL', text: 'Neighbors target the family through their name, and a child learns that his difference is visible and unwelcome.', world: 'In 1987 a group calling itself the "Dotbusters" terrorized Indian Americans in Jersey City. Research it for a citation.' } },

  { year: '1982', title: 'The Gift', place: 'Pemberton Road', code: 'PEM', region: 'suburb', name: 'gogol', try: 'gift',
    sky: ['#2a1d45', '#e08a6a'],
    story: [
      'For Gogol\'s 14th birthday his father gives him a hardcover: The Short Stories of Nikolai Gogol. Gogol thanks him and puts it on a shelf, unread.',
      'Ashoke almost tells him about the train, then decides it can wait.'
    ],
    voice: { gogol: 'A whole book with my name on the cover. I don\'t want to read it.', nikhil: 'Nikolai Gogol isn\'t me. Why does Dad keep pushing him on me?' },
    analysis: { tag: 'INTERNALIZED', text: 'By 14 Gogol has absorbed the idea that his name, and what it stands for, is embarrassing. He rejects the gift before he knows what it means.', world: 'Many children of immigrants remember rejecting their parents\' food, language or names to avoid standing out.' } },

  { year: '1985', title: 'English Class', place: 'High school, Massachusetts', code: 'HS', region: 'suburb', name: 'gogol',
    sky: ['#3b4a6b', '#b8c2d6'],
    story: [
      'His English teacher decides to teach Nikolai Gogol and walks the class through the writer\'s strange, lonely life and miserable death.',
      'Every head turns toward Gogol. He sits through it, humiliated, and refuses to read the story.'
    ],
    voice: { gogol: 'Everyone is looking at me. My name belongs to a strange, sad, dead man.', nikhil: 'I need a name nobody can laugh at.' },
    analysis: { tag: 'INTERPERSONAL', text: 'A lesson meant as enrichment turns into public humiliation. Individual actions, even well-meaning ones, single him out.', world: 'Research on students\' names ("Teachers, please learn our names!", Kohli & Solórzano, 2012) shows how mispronounced names affect students.' } },

  { year: '1986', title: '"I\'m Nikhil"', place: 'Party near Boston → the courthouse', code: 'BOS', region: 'town', name: 'nikhil',
    sky: ['#120b2a', '#5b2a6e'],
    story: [
      'At a college party, Gogol introduces himself to a girl named Kim as "Nikhil." It\'s the first time he uses the name, and it gets him his first kiss.',
      'Before leaving for Yale he goes to court and legally changes his name. His parents reluctantly agree. At college, he is Nikhil to everyone.'
    ],
    voice: { gogol: 'Gogol stays home. That\'s who my parents still see.', nikhil: 'Nikhil can be anyone. Nikhil kisses girls at parties.' },
    poll: { q: 'Would you legally change your name to fit in?', options: ['Yes, I\'d change it', 'No, I\'d keep it'], actual: 'He changes it. But he keeps feeling like he is pretending, living as two people.' },
    special: 'decree',
    analysis: { tag: 'INTERNALIZED', text: 'He erases the name his parents gave him to be accepted. The pressure to assimilate becomes his own choice.', world: 'Immigrants and their children still anglicize names on résumés and at coffee shops. Hiring studies show why.' } },

  { year: '1987', title: 'The Truth in the Car', place: 'Train home from Yale', code: 'NHV', region: 'campus', name: 'nikhil',
    sky: ['#070b18', '#27304f'],
    story: [
      'Nikhil takes the train home. It stops for hours: someone has died on the tracks. His father drives out to pick him up.',
      'In the car, Ashoke finally tells him about the 1961 crash and the page from "The Overcoat." Gogol\'s name was never a joke. It was the night his father survived.'
    ],
    quote: { text: '"Do I remind you of that night?" … "Not at all. You remind me of everything that followed."', cite: 'Ashoke to Gogol, Chapter 5' },
    voice: { gogol: 'My name was a rescue, not a joke.', nikhil: 'I threw away the one thing he gave me that meant everything.' },
    analysis: { tag: 'TURNING', text: 'The meaning of his name flips. What he treated as an embarrassment is his father\'s survival story.', world: 'Lots of family names and naming traditions carry histories that younger generations only learn later.' },
    video: 'videos/truth.mp4', shots: ['Two front seats in a parked car, headlights off', 'Ashoke looks straight ahead as he talks', 'Close-up: Gogol\'s face, the word "Gogol" landing'] },

  { year: '1990s', title: 'The Ratliffs', place: 'New York City → New Hampshire', code: 'NYC', region: 'lake', name: 'nikhil',
    sky: ['#0e2a4a', '#f0c27a'],
    story: [
      'Now an architect in New York, Nikhil falls for Maxine Ratliff and practically moves into her parents\' Chelsea townhouse. Gerald and Lydia\'s easy, confident life feels like the America he always wanted.',
      'At their lake house in New Hampshire, a dinner guest assumes he must never get sick in India because he\'s "Indian." He has to point out that he grew up in Massachusetts.'
    ],
    voice: { gogol: 'Gogol feels too loud at the Ratliffs\' table.', nikhil: 'Their life is so easy. I want to belong here.' },
    poll: { q: 'Gogol feels more at home with Maxine\'s family than his own. Does that make sense to you?', options: ['I get it', 'Not at all'], actual: 'It lasts until his father dies. Then Maxine\'s world suddenly feels like it has no place for his grief.' },
    analysis: { tag: 'IDEOLOGICAL', text: 'The "perpetual foreigner" belief: that an American with brown skin must really be from somewhere else.', world: '"Where are you really from?" is one of the most common experiences Asian Americans report.' } },

  { year: '1990s', title: 'The Phone Call', place: 'Cleveland, Ohio', code: 'CLE', region: 'cleveland', name: 'nikhil', rain: true, try: 'phone',
    sky: ['#15171f', '#3d4250'],
    story: [
      'Ashoke, working temporarily in Ohio, dies suddenly of a heart attack. Gogol flies to Cleveland alone to identify his father and empty his apartment.',
      'Back home he shaves his head, following Bengali mourning custom, the first tradition he chooses for himself. He drifts away from Maxine.'
    ],
    voice: { gogol: 'I\'m Gogol again. His son. That\'s the only name that matters now.', nikhil: 'Nikhil has nothing to say here.' },
    analysis: { tag: 'BREAKING', text: 'The climax. Everything he pushed away, his father, his name, his family, can\'t be taken back. He never read the book, and the only person who knew the full story is gone.', world: 'Grief often pulls second-generation kids back toward the traditions they once avoided.' } },

  { year: 'Late 1990s', title: 'Moushumi', place: 'New York City', code: 'NYC', region: 'nyc', name: 'nikhil',
    sky: ['#1a2440', '#b06a7a'],
    story: [
      'His mother sets him up with Moushumi Mazoomdar, a Bengali girl he knew growing up. Both spent their lives trying to escape what their parents expected.',
      'They fall into an easy understanding and marry in a big Bengali wedding.'
    ],
    voice: { gogol: 'We both know what it\'s like to live between two worlds.', nikhil: 'She\'s the one person who knows both of my names.' },
    analysis: { tag: 'INTERNALIZED', text: 'Both of them carry the same inner conflict. Part of the attraction is that neither has to explain.', world: 'Family and community expectations around marriage are still a major pressure for many second-generation kids.' } },

  { year: '~2000', title: 'Coming Apart', place: 'New York City', code: 'NYC', region: 'nyc', name: 'nikhil',
    sky: ['#0b0d16', '#2c2238'],
    story: [
      'Moushumi begins an affair with Dimitri Desjardins, a man from her past. When Gogol finds out, the marriage ends.',
      'He realizes they may have married the idea of each other, and the comfort of their parents\' approval.'
    ],
    voice: { gogol: 'Maybe we married the idea of each other.', nikhil: 'Maybe Nikhil was never the answer.' },
    analysis: { tag: 'TURNING', text: 'Assimilating didn\'t fix him, and neither did returning to the "right" Bengali life. He has to find himself without a script.', world: 'Identity isn\'t something someone else can hand you, whether it\'s your parents or society.' } },

  { year: '2000', title: 'The Man Who Gave You His Name', place: 'Pemberton Road, Christmas Eve', code: 'PEM', region: 'suburb', name: 'both', snow: true,
    sky: ['#0a1430', '#2d3d6b'],
    story: [
      'Ashima is selling the house to split her year between Calcutta and America. At her last Christmas Eve party, Gogol slips upstairs to his old bedroom.',
      'He finds the book his father gave him and reads the inscription for the first time. Then, as the party goes on downstairs, he begins to read.'
    ],
    quote: { text: 'The man who gave you his name, from the man who gave you your name.', cite: 'Ashoke\'s inscription' },
    voice: { gogol: 'The man who gave me his name. I\'m finally ready to read him.', nikhil: 'Nikhil and Gogol were always the same person.' },
    special: 'finale',
    analysis: { tag: 'RESISTANCE', text: 'Healing is personal. Gogol stops choosing between his names and accepts both, and Ashima chooses a life in two countries.', world: 'Hope: you don\'t have to choose between two cultures to belong.' },
    video: 'videos/finale.mp4', shots: ['Party noise drifting up the stairs', 'Dust off the book, open the cover', 'Close-up of the inscription, then he starts to read'] },
];

export const NAME_COLORS: Record<NameLens, string> = { none: '#8a90a8', gogol: '#f2a33a', nikhil: '#5eaaff', both: '#c9a3ff' };
export const TAG_COLORS: Record<Tag, string> = { IDEOLOGICAL: '#9c5bd9', INSTITUTIONAL: '#3a93cf', INTERPERSONAL: '#d8513f', INTERNALIZED: '#c9862a', BREAKING: '#ffffff', RESISTANCE: '#3fae6c', MIRROR: '#8b91a5', TURNING: '#d0408a' };
export const TAG_NAMES: Record<Tag, string> = { IDEOLOGICAL: 'Ideological', INSTITUTIONAL: 'Institutional', INTERPERSONAL: 'Interpersonal', INTERNALIZED: 'Internalized', BREAKING: 'Breaking point', RESISTANCE: 'Resistance & healing', MIRROR: 'Mirror to society', TURNING: 'Turning point' };

/** Speaker notes shown only on the presenter remote (/presenter), one list per station. */
export const NOTES: string[][] = [
  ['This is a flashback: Gogol has not been born yet.', 'Let the crash play, then point at the page from "The Overcoat". It is why Ashoke lives, and why the name will matter.', 'Mirror to society: the 1965 Hart-Celler Act opens the door for Ashoke.'],
  ['Still a flashback. Ashima is 19 and has not met her husband.', 'Hands-on: have someone click "Slip your feet in".', 'Talking point: isolation is the first cost of immigrating.'],
  ['The first stop where Gogol is on the train. Track turns orange.', 'Hands-on: let a classmate try to fill the birth certificate, then wait for the letter three times.', 'Institutional: a hospital form overrides a Bengali naming tradition.', 'Optional: press "Why Gogol?" to rewind to the crash.'],
  ['The rice ceremony: the Bengali community acts as family.', 'Hands-on: ask the class which item baby Gogol will pick, then tap it.', 'Read the "lifelong pregnancy" quote aloud.'],
  ['Class vote: tap once per raised hand, then reveal.', 'Institutional: the principal, not the parents, decides his name.', 'Scene video station (kindergarten).'],
  ['Hands-on: rub the gravestone.', 'Interpersonal: the mailbox vandalism.', 'Real world: the 1987 "Dotbusters" in Jersey City.'],
  ['Hands-on: try to open the book, and it goes on the shelf.', 'Internalized: he rejects the gift before he knows what it means.', 'Plant the seed: this book comes back at the very end.'],
  ['English class turns into public humiliation.', 'Real world: Kohli & Solórzano (2012) on students\' names.'],
  ['PETITION GRANTED stamp plays on first visit. The Gogol/Nikhil switch unlocks.', 'Class vote: would you change your name?', 'Press N to flip the inner voice between names.'],
  ['Turning point: the truth in the car.', 'Read the quote slowly: "You remind me of everything that followed."', 'Scene video station.'],
  ['The Ratliffs: the easy America he wanted.', 'Class vote, then reveal.', 'Ideological: the "perpetual foreigner" belief.'],
  ['The climax. Let the phone ring once or twice before answering.', 'Breaking point: he shaves his head, the first tradition he chooses.'],
  ['Moushumi: two people who both know both of his names.', 'Internalized: expectations around marriage.'],
  ['The marriage ends. Neither path came with a script.', 'Turning point: identity cannot be handed to you.'],
  ['The track braids orange and blue. He is both now.', 'If every station is visited, open the book for the finale.', 'After the finale, run the ticket inspector quiz with the class.'],
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
