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
