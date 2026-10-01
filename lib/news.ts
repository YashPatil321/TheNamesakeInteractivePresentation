// "Then & Now": each station's book event next to a real, recent news story or report.
//
// Source check, 2026-10-01: every outlet, headline, date and URL below was confirmed against
// search-engine index listings of the article itself (title + URL), cross-checked where possible with
// syndicated copies (e.g. NPR member stations) or the publisher's own companion pages. The sandbox this
// was built in blocks direct page fetches, so if a link ever breaks, re-check it before presenting.
// "In the book" text only restates facts already in lib/stations.ts. "In the news" text is our own
// neutral summary; no quotes are reproduced. Stations without a verified match are simply left out
// (the Then & Now tab is hidden for them).
//
// date: shown as written. Where only the month could be confirmed, only the month is given.

export type FourI = 'Ideological' | 'Institutional' | 'Interpersonal' | 'Internalized';

export interface NewsItem {
  /** "In the book" summary (facts from lib/stations.ts only) */
  then: string;
  /** neutral summary of the article */
  now: string;
  outlet: string;
  headline: string;
  date: string;
  /** year label for the "Now · ____" heading */
  year: string;
  url: string;
  /** which of the 4 I's the pair shows */
  kind: FourI;
  /** one-line connection between the two */
  link: string;
  /** optional verified statistic */
  stat?: { n: string; text: string };
  /** label when the source is research rather than a news report */
  sourceKind?: string;
}

/** keyed by station index in STATIONS */
export const NEWS: Record<number, NewsItem> = {
  0: {
    then: 'In 1961 Ashoke survives a train crash in India and decides to go abroad. Four years later the Immigration and Nationality Act of 1965 ends the quotas that had kept most Asian immigrants out of the U.S.',
    now: 'The Migration Policy Institute\'s profile of Indian immigrants notes that the 1965 law abolished the national-origins quotas that had excluded many Indians, and that Indian immigrants are now the second-largest foreign-born group in the U.S., about 3.2 million people.',
    outlet: 'Migration Policy Institute',
    headline: 'Indian Immigrants in the United States',
    date: 'Apr. 15, 2026',
    year: '2026',
    url: 'https://www.migrationpolicy.org/article/indian-immigrants-united-states',
    kind: 'Institutional',
    link: 'A law decides who is allowed in. The 1965 change that let Ashoke come shaped a community that is millions strong today.',
    sourceKind: 'Research profile',
  },
  2: {
    then: 'The hospital will not discharge baby Gogol without a name on his birth certificate, so a private pet name becomes his legal one before his great-grandmother\'s letter can arrive.',
    now: 'A California bill (AB 77) proposed allowing accent marks such as á and ñ on birth certificates and other state records. The state had not allowed them since 1986, when voters made English the official language.',
    outlet: 'Axios',
    headline: 'California bill would allow accent marks on birth certificates',
    date: 'Mar. 28, 2023',
    year: '2023',
    url: 'https://www.axios.com/2023/03/28/california-assembly-latino-accent-marks',
    kind: 'Institutional',
    link: 'In both cases an official birth form decides how a child\'s name is allowed to look, not the family.',
  },
  3: {
    then: 'Far from India, Bengali friends in Cambridge stand in for family at Gogol\'s annaprasan, his first-rice ceremony, keeping the tradition alive in a new country.',
    now: 'New York Gov. Kathy Hochul signed a law making Diwali a New York City public school holiday. The bill was first introduced by Assemblymember Jenifer Rajkumar in 2021, and the signing took place at a Hindu temple in Flushing, Queens.',
    outlet: 'NY1 (Spectrum News)',
    headline: 'Hochul signs bill making Diwali a city public school holiday',
    date: 'Nov. 14, 2023',
    year: '2023',
    url: 'https://ny1.com/nyc/all-boroughs/politics/2023/11/14/governor-kathy-hochul-diwali-bill-law-legislation-mayor-eric-adams-jenifer-rajkumar',
    kind: 'Institutional',
    link: 'Resistance that worked: in 1968 the community kept its traditions in private. Decades later, organizing got one written into a school calendar.',
  },
  4: {
    then: 'On his first day of kindergarten Gogol refuses his new "school name," Nikhil. The principal, Mrs. Lapidus, overrules his parents and decides he will stay Gogol.',
    now: 'A Texas school district, Plano ISD, planned to have an AI tool read graduates\' names at commencement, with students recording how their own names should be said. Some seniors welcomed getting their names right; others petitioned for a human announcer.',
    outlet: 'Gray News (via WBNG)',
    headline: 'Seniors torn over district\'s plan to use AI to announce names at high school graduation',
    date: 'Apr. 16, 2026',
    year: '2026',
    url: 'https://www.wbng.com/2026/04/16/seniors-torn-over-districts-plan-use-ai-announce-names-high-school-graduation/',
    kind: 'Institutional',
    link: 'Schools still make the rules for how students\' names are said. Today the debate is how to let students decide that.',
  },
  5: {
    then: 'Someone vandalizes the Gangulis\' mailbox in suburban Massachusetts, mocking the family\'s name. Young Gogol learns his difference is visible and unwelcome.',
    now: 'A Hindu temple near Sacramento was spray-painted overnight with hateful anti-Hindu messages, including "Hindus go back," and its water pipes were cut. Deputies investigated it as a hate crime, the second attack on a temple of the same organization in about two weeks.',
    outlet: 'AsAmNews',
    headline: '2nd hate crime investigated at Hindu temple',
    date: 'Sept. 26, 2024',
    year: '2024',
    url: 'https://asamnews.com/2024/09/26/hinduphobia-sacramento-ca-baps-shri-swarminarayan-mandir/',
    kind: 'Interpersonal',
    link: 'Vandalism aimed at a family\'s or a community\'s identity sends the same message: you don\'t belong here.',
  },
  6: {
    then: 'At 14, Gogol puts his father\'s gift, a book of Nikolai Gogol\'s stories, on a shelf unread. He has already absorbed the idea that his name, and what it stands for, is embarrassing.',
    now: 'HuffPost looked at the "stinky lunch" story many Asian American kids share: being stared at or teased for bringing home-cooked food to school, then feeling ashamed of it, and often reclaiming that food with pride as adults.',
    outlet: 'HuffPost',
    headline: '\'The Asian Kid With The Stinky Lunch\' Narrative Is A Pop Culture Trope, But It\'s Still Worth Telling',
    date: 'Sept. 2024',
    year: '2024',
    url: 'https://www.huffpost.com/entry/asian-kid-stinky-lunch-narrative_l_66e323e8e4b02a333c0b5430',
    kind: 'Internalized',
    link: 'A name or a lunchbox: kids learn to feel ashamed of the things that come from their families.',
  },
  7: {
    then: 'Gogol\'s English teacher teaches a unit on Nikolai Gogol\'s strange, sad life. Every head turns toward him, and a lesson meant as enrichment becomes public humiliation.',
    now: 'A Pew Research Center survey of more than 7,000 Asian American adults found that about eight in ten had been treated as foreigners by strangers, including having their names mispronounced.',
    outlet: 'Pew Research Center',
    headline: 'Asian Americans and the \'forever foreigner\' stereotype',
    date: 'Nov. 30, 2023',
    year: '2023',
    url: 'https://www.pewresearch.org/race-and-ethnicity/2023/11/30/asian-americans-and-the-forever-foreigner-stereotype/',
    kind: 'Interpersonal',
    link: 'One moment in a classroom, repeated millions of times: everyday encounters keep marking a name as "foreign."',
    stat: { n: '68%', text: 'of Asian American adults say people have mispronounced their name in everyday encounters with strangers in the U.S.' },
    sourceKind: 'Survey report',
  },
  8: {
    then: 'Before leaving for Yale, Gogol goes to court and legally changes his name to Nikhil. He erases the name his parents gave him so he can be accepted.',
    now: 'Economists sent about 83,000 fake job applications to large U.S. companies, changing only the names. The typical employer called back applicants with white-sounding names about 9% more often than those with Black-sounding names, and the worst offenders about 24% more often.',
    outlet: 'NPR',
    headline: 'White-sounding names get called back for jobs more than Black ones, a new study finds',
    date: 'Apr. 11, 2024',
    year: '2024',
    url: 'https://www.npr.org/2024/04/11/1243713272/resume-bias-study-white-names-black-names',
    kind: 'Internalized',
    link: 'When a name can cost you a callback, changing it can feel like a choice. That is how outside bias becomes internalized.',
  },
  10: {
    then: 'At the Ratliffs\' lake house, a dinner guest assumes Gogol must never get sick in India because he is "Indian." He has to explain that he grew up in Massachusetts.',
    now: 'NPR reported on a Pew survey finding that most Asian Americans say they have faced discrimination, and that 78% have been treated as foreigners, even if they were born in the U.S.: told to go back to their country, assumed not to speak English, or having their names mispronounced.',
    outlet: 'NPR',
    headline: 'Most Asian Americans say they face discrimination and are often treated as foreigners',
    date: 'Nov. 30, 2023',
    year: '2023',
    url: 'https://www.npr.org/2023/11/30/1216121806/anti-asian-american-discrimination-pew-survey',
    kind: 'Ideological',
    link: 'The "perpetual foreigner" belief: an American with brown skin is assumed to be from somewhere else.',
    stat: { n: '78%', text: 'of Asian American adults say they have been treated as a foreigner, even if they were born in the U.S. (Pew Research Center, 2023)' },
  },
  11: {
    then: 'After his father dies, Gogol shaves his head, following Bengali mourning custom. It is the first tradition he chooses for himself.',
    now: 'For Hindu families who can\'t travel to India\'s Ganges River to scatter a loved one\'s ashes, the Suwannee River in Florida has become a substitute site, and a local motel has become a gathering place for these funeral rites.',
    outlet: 'NPR',
    headline: 'Florida river becomes substitute site for sacred Hindu funeral tradition',
    date: 'Dec. 2025',
    year: '2025',
    url: 'https://www.npr.org/2025/12/05/nx-s1-5615095-e1/florida-river-becomes-substitute-site-for-sacred-hindu-funeral-tradition',
    kind: 'Internalized',
    link: 'Grief pulls families back to tradition, even when they have to adapt it to a new country.',
  },
};
