// Every caption shown inside the first-person views. Facts come only from lib/stations.ts
// (story, quote, detail, voice, analysis). Keep it that way: no invented book details or quotes.
import type { FpKind } from '../stations';

export interface SpotCopy {
  id: string;
  label: string; // short name for the list and the hover tooltip
  title: string;
  body?: string[]; // paragraphs, revealed word by word
  lines?: string[]; // quote lines, revealed one after another
  cite?: string;
  voice?: string; // the station's "inner voice" line
}

export interface RoomCopy {
  spots: SpotCopy[];
  done: { kicker: string; title: string; text: string; voice?: string; cite?: string };
  blackout?: string; // compartment only: text on the black screen after the crash
}

export const COPY: Record<FpKind, RoomCopy> = {
  compartment: {
    spots: [
      { id: 'book', label: 'The book', title: "His grandfather's favorite writer",
        body: ['Ashoke Ganguli, 22, rides an overnight train to visit his grandfather, rereading the stories of Nikolai Gogol, his grandfather\'s favorite writer.'] },
      { id: 'ghosh', label: 'The seat across', title: 'A friendly stranger',
        body: ['A friendly stranger named Ghosh tells him to see the world while he still can.'] },
      { id: 'window', label: 'The window', title: 'Hours later',
        body: ['Hours later the train derails in the dark.'] },
      { id: 'page', label: 'The crumpled page', title: 'A page from “The Overcoat”',
        body: ['Rescuers nearly pass him by, until they notice a crumpled page from "The Overcoat" in his hand.'] },
    ],
    done: { kicker: '1961 · The Night Train', title: 'He survives',
      text: 'He spends a year in bed recovering. He decides he will go abroad, just as Ghosh said.' },
    blackout: 'October 1961',
  },
  classroom: {
    spots: [
      { id: 'board', label: 'The chalkboard', title: 'A strange, lonely life',
        body: ['The English teacher walks the class through the writer\'s strange, lonely life and miserable death.'] },
      { id: 'class', label: 'The classmates', title: 'Every head turns',
        body: ['Every head turns toward Gogol.'],
        voice: 'Everyone is looking at me. My name belongs to a strange, sad, dead man.' },
      { id: 'story', label: 'The story on his desk', title: 'He refuses to read it',
        body: ['He sits through it, humiliated, and refuses to read the story.'],
        voice: 'I need a name nobody can laugh at.' },
      { id: 'teacher', label: 'The teacher', title: 'Today: Nikolai Gogol',
        body: ['His English teacher decides to teach Nikolai Gogol.', 'A lesson meant as enrichment turns into public humiliation.'] },
    ],
    done: { kicker: '1985 · English Class', title: 'Singled out',
      text: 'Individual actions, even well-meaning ones, single him out.' },
  },
  car: {
    spots: [
      { id: 'road', label: 'The road home', title: 'The train stops for hours',
        body: ['Nikhil takes the train home. It stops for hours: someone has died on the tracks.', 'His father drives out to pick him up.'] },
      { id: 'ashoke', label: 'Ashoke', title: 'Father and son',
        lines: ['“Do I remind you of that night?”', '…', '“Not at all. You remind me of everything that followed.”'],
        cite: 'Ashoke to Gogol, Chapter 5' },
      { id: 'truth', label: 'The truth', title: 'The night his father survived',
        body: ['In the car, Ashoke finally tells him about the 1961 crash and the page from "The Overcoat."', 'Gogol\'s name was never a joke. It was the night his father survived.'] },
    ],
    done: { kicker: '1987 · The Truth in the Car', title: 'The meaning flips',
      text: 'What he treated as an embarrassment is his father\'s survival story.',
      voice: 'My name was a rescue, not a joke.' },
  },
  // 1982, station 7 "The Gift". Christmas Eve 2000 (the inscription) is our filmed finale, so it is not here.
  bedroom: {
    spots: [
      { id: 'book', label: 'The present', title: 'His 14th birthday',
        body: ['For Gogol\'s 14th birthday his father gives him a hardcover: The Short Stories of Nikolai Gogol.'],
        voice: 'A whole book with my name on the cover. I don\'t want to read it.' },
      { id: 'ashoke', label: 'His father', title: 'It can wait',
        body: ['Ashoke almost tells him about the train, then decides it can wait.'] },
      { id: 'room', label: 'His room', title: 'Fourteen',
        body: ['Many children of immigrants remember rejecting their parents\' food, language or names to avoid standing out.'],
        voice: 'Nikolai Gogol isn\'t me. Why does Dad keep pushing him on me?' },
      { id: 'shelf', label: 'The shelf', title: 'Onto the shelf, unread',
        body: ['Gogol thanks him and puts it on a shelf, unread.'] },
    ],
    done: { kicker: '1982 · The Gift', title: 'He rejects the gift',
      text: 'By 14 Gogol has absorbed the idea that his name, and what it stands for, is embarrassing. He rejects the gift before he knows what it means.' },
  },
};
