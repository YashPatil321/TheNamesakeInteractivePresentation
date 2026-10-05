// "Our analysis": the Ethnic Studies Praxis Story Plot framework, answered directly.
// Each part points to the stations (index into STATIONS) where it happens.

export interface PraxisPart {
  n: number;
  title: string;
  question: string;
  answer: string[];
  /** a line from the novel that supports this part */
  quote?: { text: string; cite: string };
  /** stations that show it: [index, label] */
  see: [number, string][];
}

export const PRAXIS: PraxisPart[] = [
  {
    n: 1,
    title: 'The System Exposed',
    question: "What's the root problem the story reveals?",
    answer: [
      'The root problem is the pressure to assimilate: the idea that to belong in America, an immigrant family has to give up what makes it different.',
      "Gogol's name is where that pressure lands. A hospital form, a school and later a courtroom all decide what he is called, and he grows up believing his own name, and the culture behind it, is something to be embarrassed about.",
    ],
    quote: { text: 'Being a foreigner, Ashima is beginning to realize, is a sort of lifelong pregnancy—a perpetual wait, a constant burden, a continuous feeling out of sorts.', cite: 'The Namesake, Chapter 3' },
    see: [[2, '1968 · The birth certificate'], [4, '1973 · The principal decides'], [10, '1990s · "Where are you from?"']],
  },
  {
    n: 2,
    title: "The 4 I's in Action",
    question: 'How do Ideological, Institutional, Interpersonal and Internalized oppression play out?',
    answer: [
      'Ideological: the "perpetual foreigner" belief. A dinner guest at the Ratliffs\' assumes Gogol is from India, even though he grew up in Massachusetts.',
      "Institutional: rules decide his name. The hospital won't release a baby without a name on the form, and the principal, not his parents, decides what he is called at school.",
      'Interpersonal: someone mocks the family\'s name on their mailbox, and his whole English class turns to stare when the teacher talks about Nikolai Gogol.',
      'Internalized: Gogol starts to agree. He shelves the book his father gave him and legally changes his name to Nikhil.',
    ],
    see: [[10, 'Ideological · 1990s'], [2, 'Institutional · 1968'], [5, 'Interpersonal · 1970s'], [8, 'Internalized · 1986']],
  },
  {
    n: 3,
    title: 'Breaking Point',
    question: 'When does the trauma or tension peak?',
    answer: [
      "His father dies suddenly in Ohio. Gogol flies to Cleveland alone and empties his father's apartment.",
      'Everything he pushed away (his father, his name, his family) can no longer be fixed. He never read the book, and the only person who knew the whole story behind his name is gone.',
    ],
    quote: { text: '"Do I remind you of that night?" … "Not at all. You remind me of everything that followed."', cite: 'Ashoke to Gogol, Chapter 5. After his father dies, these words are all Gogol has left of the story behind his name.' },
    see: [[11, '1990s · The phone call']],
  },
  {
    n: 4,
    title: 'Resistance & Revolution',
    question: 'How do characters fight back or heal?',
    answer: [
      'Fighting back starts early. On his first day of kindergarten, Gogol refuses to be renamed "Nikhil" and keeps his own name.',
      "The Bengali families in Cambridge become each other's relatives and keep their traditions alive far from home, like Gogol's rice ceremony.",
      'After his father dies, Gogol shaves his head in Bengali mourning, the first tradition he chooses for himself.',
      'In the end he stops choosing between his names. He opens the book from his father and starts to read, and Ashima chooses a life split between India and America.',
      'Resistance is still working today: through a bill first introduced in 2021, New York made Diwali a public school holiday in New York City (see Then & Now at the rice ceremony stop).',
    ],
    quote: { text: 'The man who gave you his name, from the man who gave you your name.', cite: "Ashoke's inscription in the book, read at the end" },
    see: [[4, '1973 · He keeps his name'], [3, '1968 · The rice ceremony'], [11, '1990s · Mourning'], [14, '2000 · The book']],
  },
  {
    n: 5,
    title: 'Mirror to Society',
    question: 'What does this story reveal about our society?',
    answer: [
      'History shows this pressure was built into law. Until the Immigration and Nationality Act of 1965, U.S. quotas kept most Asian immigrants out; that law is what let families like the Gangulis come. In 1987, a hate group calling itself the "Dotbusters" attacked Indian Americans in Jersey City, New Jersey.',
      'The same pressures are still in the news. California has debated whether birth certificates can show accent marks in names, schools are still working out how to say students\' names right, and most Asian Americans say strangers still treat them as foreigners.',
      'The Namesake shows that a name carries a family\'s history, and that a society that cannot make room for a name is really saying it cannot make room for the people who carry it. Open the "Then & Now" tab at a station to see each book moment next to a real news story.',
    ],
    see: [[0, '1961 · The 1965 immigration law'], [2, 'Then & Now · Names on forms'], [10, 'Then & Now · Forever foreigner']],
  },
];

/** The five parts, short names and colors used everywhere on the line (cards, timeline, analysis page). */
export const PART_NAMES = ['', 'The System Exposed', "The 4 I's in Action", 'Breaking Point', 'Resistance & Revolution', 'Mirror to Society'];
export const PART_COLORS = ['', '#b8382a', '#2f7fb8', '#1d1b26', '#2e9a5e', '#7a5cc4'];

export interface FrameNote { part: number; label?: string; why: string }

/** Which framework part(s) each station shows, and why, in one line. Keyed by station index. */
export const FRAME: Record<number, FrameNote[]> = {
  0: [{ part: 5, why: 'Four years after this crash, the 1965 immigration law opens the U.S. to Indian families like Ashoke\'s. Laws decide who gets to belong.' }],
  1: [{ part: 1, why: 'Ashima is sent to a country where she knows no one and is expected to adjust alone. The pressure to fit in starts here.' }],
  2: [{ part: 1, why: 'A hospital form, not his family, decides his name. This is the root problem: American rules come before Bengali tradition.' }, { part: 2, label: 'Institutional', why: 'The rule that a baby can\'t leave without a name on the form.' }],
  3: [{ part: 4, why: 'Far from home, the Bengali community becomes family and keeps its traditions alive.' }],
  4: [{ part: 2, label: 'Institutional', why: 'The principal, not his parents, decides what he is called at school.' }, { part: 4, why: 'Five-year-old Gogol refuses to be renamed and keeps his own name.' }],
  5: [{ part: 2, label: 'Interpersonal', why: 'Someone mocks the family\'s name on their mailbox.' }],
  6: [{ part: 2, label: 'Internalized', why: 'Gogol shelves his father\'s gift. He already feels his name is something to be embarrassed about.' }],
  7: [{ part: 2, label: 'Interpersonal', why: 'The whole class turns to stare when the teacher talks about Nikolai Gogol.' }],
  8: [{ part: 2, label: 'Internalized', why: 'He legally changes his name to be accepted. The pressure to assimilate becomes his own choice.' }],
  9: [{ part: 4, why: 'Learning the true story of his name starts to turn his shame into understanding.' }],
  10: [{ part: 2, label: 'Ideological', why: 'The "perpetual foreigner" belief: a guest assumes he is from India though he grew up in Massachusetts.' }, { part: 1, why: 'Even the America he wanted still sees him as an outsider.' }],
  11: [{ part: 3, why: 'His father dies suddenly. Everything he pushed away can no longer be fixed. This is where the tension peaks.' }, { part: 4, why: 'He shaves his head in Bengali mourning, the first tradition he chooses himself.' }],
  12: [{ part: 2, label: 'Internalized', why: 'Both of them grew up trying to escape their parents\' expectations, and that is what draws them together.' }],
  13: [{ part: 1, why: 'Neither assimilating nor the "right" Bengali marriage fixes him. Neither path the system offered works.' }],
  14: [{ part: 4, why: 'He opens his father\'s book and stops choosing between his names. Ashima chooses a life in two countries.' }],
};
