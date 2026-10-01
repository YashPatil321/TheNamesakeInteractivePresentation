// Card add-on: "Choose your own adventure". At six moments where oppression pushes Gogol,
// the viewer chooses before the outcome is shown. The book's path is confirmed with its consequence;
// any other path opens a clearly labeled "What if…" branch (our imagination, not the book).
// Facts on the book's path come only from lib/stations.ts. See ./types.ts for the contract.
import type { CardApi, CardModule } from './types';

interface Option { label: string; book?: boolean; whatIf?: string }
interface Decision {
  /** situation shown before the outcome */
  prompt: string;
  options: Option[];
  /** what happened in the book (shown once the viewer is on the book's path) */
  outcome: string;
  /** which of the 4 I's / theme this moment shows */
  lens: string;
  /** indexes of this station's story paragraphs that give the outcome away (veiled until a choice is made) */
  hide: number[];
}

const DECISIONS: Record<number, Decision> = {
  2: {
    prompt: 'Your son is born. The letter from Ashima\'s grandmother with his good name hasn\'t come, and the hospital won\'t discharge a baby without a name on the birth certificate. What do you do?',
    options: [
      { label: 'Wait for the letter', whatIf: 'The Gangulis refuse to fill the blank and wait. Days pass in a hospital ward far from family, and the form stays the same. The rule doesn\'t bend for Bengali custom, so either way an institution, not the family, sets the clock on their son\'s name.' },
      { label: 'Write his pet name, "Gogol," for now', book: true },
      { label: 'Let the hospital staff suggest an American name', whatIf: 'He gets a name that fits every form but carries nothing from Calcutta or from his father\'s train. Assimilation is decided for him on his first day of life. Institutional pressure doesn\'t always look like force. Sometimes it is a blank that must be filled now.' },
    ],
    outcome: 'Ashoke writes "Gogol." The letter never arrives, so a pet name meant only for home becomes his legal name. A hospital rule overrode a Bengali tradition.',
    lens: 'Institutional', hide: [1],
  },
  4: {
    prompt: 'First day of kindergarten. Your parents tell you that at school you will be "Nikhil," your new good name. The principal asks what you want to be called.',
    options: [
      { label: 'Answer to "Nikhil"', whatIf: 'He grows up as Gogol at home and Nikhil in the world, the split Bengali custom intended. He might be spared some teasing, but nobody at school would ever ask about the name his father chose, or the story behind it. Fitting in can quietly bury a history.' },
      { label: 'Keep "Gogol"', book: true },
    ],
    outcome: 'He refuses: he doesn\'t know anyone called Nikhil. The principal, Mrs. Lapidus, overrules his parents and lets him keep "Gogol." A school official, not his family, decides his name for the next 13 years.',
    lens: 'Institutional', hide: [1],
  },
  7: {
    prompt: 'Your English teacher starts a lesson on Nikolai Gogol\'s strange, lonely life and miserable death. Every head turns toward you. Then the class is assigned his story.',
    options: [
      { label: 'Read the story', whatIf: 'He reads "The Overcoat" that week and finds a lonely clerk, an outsider, not a joke. He might even ask his father why that writer matters so much. The humiliation came from other people, but the refusal is internalized: rejecting the name before learning what it means.' },
      { label: 'Refuse to read it', book: true },
    ],
    outcome: 'He sits through the lesson, humiliated, and refuses to read the story. A lesson meant as enrichment turns his name into a spotlight.',
    lens: 'Interpersonal', hide: [1],
  },
  8: {
    prompt: 'At a party you introduce yourself as "Nikhil" for the first time, and it works. Now you\'re leaving for Yale. Do you change your name in court?',
    options: [
      { label: 'Legally become Nikhil', book: true },
      { label: 'Use "Nikhil" as a nickname, keep Gogol on paper', whatIf: 'He tries out Nikhil without erasing Gogol, the way a daknam and a bhalonam were meant to live side by side. The pressure to fit in is still there, but he doesn\'t have to go to court to make himself acceptable.' },
      { label: 'Stay "Gogol" everywhere', whatIf: 'He walks into Yale as Gogol and answers the same jokes and questions every semester. It would take courage, and it would put the work of adjusting on everyone else instead of on him. That is exactly the work that ideological pressure tells immigrants is theirs alone.' },
    ],
    outcome: 'Before leaving for Yale he goes to court and legally changes his name. His parents reluctantly agree. At college he is Nikhil to everyone, but he keeps feeling like he is pretending.',
    lens: 'Internalized', hide: [1],
  },
  11: {
    prompt: 'The phone rings. Ashoke, working temporarily in Ohio, has died suddenly of a heart attack. Someone has to fly to Cleveland to identify him and empty his apartment.',
    options: [
      { label: 'Go to Cleveland alone', book: true },
      { label: 'Bring Maxine with you', whatIf: 'Maxine sees his father\'s small, borrowed apartment and the part of Gogol her family\'s easy world never asked about. Maybe she understands. Or maybe the distance shows sooner, because grief pulls him toward rituals her table has no place for.' },
    ],
    outcome: 'Gogol flies to Cleveland alone. Back home he shaves his head, following Bengali mourning custom, the first tradition he chooses for himself. He drifts away from Maxine.',
    lens: 'Breaking point', hide: [0, 1],
  },
  13: {
    prompt: 'Your marriage is over. Being Nikhil didn\'t fix you, and neither did the "right" Bengali marriage. Christmas is coming, and your mother is selling the house on Pemberton Road. What now?',
    options: [
      { label: 'Start over somewhere no one knows either name', whatIf: 'A new city, a new job, and nobody who can ask about Gogol or Nikhil. It might feel like freedom, but running from both names is still letting other people\'s judgments decide who he is.' },
      { label: 'Go home for the last Christmas Eve party', book: true },
      { label: 'Go all in on "Nikhil" and never look back', whatIf: 'He seals the name change for good and leaves Gogol in the house his mother is selling. Assimilation offers belonging at a price: the story his father gave him stays on a shelf, unread, forever.' },
    ],
    outcome: 'Ashima is selling the house to split her year between Calcutta and America. Gogol goes back to Pemberton Road for her last Christmas Eve party, the house where the book is still waiting.',
    lens: 'Turning point', hide: [],
  },
};

const ORDER = Object.keys(DECISIONS).map(Number).sort((a, b) => a - b);
const FINAL = 14;

interface Pick { k: number; back?: boolean }
type Choices = Record<string, Pick>;

function choices(api: CardApi): Choices {
  const c = api.state.choices;
  if (c && typeof c === 'object') return c as Choices;
  const fresh: Choices = {};
  api.state.choices = fresh;
  return fresh;
}

function nextBtn(i: number, api: CardApi): string {
  const n = api.stations[i + 1];
  return n ? `<button class="btn hot ch-ride" data-go="${i + 1}">Ride on to ${api.esc(n.year)}: ${api.esc(n.title)} →</button>` : '';
}

function decisionHTML(i: number, d: Decision, api: CardApi): string {
  const { esc } = api;
  const pick = choices(api)[i];
  const num = ORDER.indexOf(i) + 1;
  const head = `<div class="ch-head"><span class="ch-label">Your choice · ${num} of ${ORDER.length}</span><span class="ch-lens">${esc(d.lens)}</span></div>`;
  if (!pick || !d.options[pick.k]) {
    return `<section class="ch-box ch-ask" aria-label="Your choice">${head}
      <p class="ch-q">${esc(d.prompt)}</p>
      <div class="ch-opts">${d.options.map((o, k) => `<button class="ch-opt" data-ch-pick="${k}"><span class="ch-k">${String.fromCharCode(65 + k)}</span><span>${esc(o.label)}</span></button>`).join('')}</div>
      <p class="ch-note">Choose before you see what happened.</p></section>`;
  }
  const o = d.options[pick.k];
  const chosen = `<p class="ch-you">You chose: <b>${esc(o.label)}</b></p>`;
  if (o.book) {
    return `<section class="ch-box ch-done ch-match">${head}${chosen}
      <div class="ch-verdict"><span class="ch-tick" aria-hidden="true">✓</span> That's what Gogol did.</div>
      <p class="ch-out">${esc(d.outcome)}</p>
      <div class="ch-acts">${nextBtn(i, api)}</div></section>`;
  }
  const bookOpt = d.options.find((x) => x.book);
  return `<section class="ch-box ch-done ch-branch">${head}${chosen}
    <div class="ch-whatif"><div class="ch-wlabel">What if… <em>(our imagination, not the book)</em></div><p>${esc(o.whatIf || '')}</p></div>
    ${pick.back
      ? `<div class="ch-bookpath"><div class="ch-blabel">The book's path: ${esc(bookOpt ? bookOpt.label : '')}</div><p class="ch-out">${esc(d.outcome)}</p></div><div class="ch-acts">${nextBtn(i, api)}</div>`
      : `<div class="ch-acts"><button class="btn ghost" data-ch-back>Return to the book's path</button></div>`}
  </section>`;
}

function summaryHTML(api: CardApi): string {
  const { esc } = api;
  const c = choices(api);
  const made = ORDER.filter((i) => c[i] && DECISIONS[i].options[c[i].k]);
  const matched = made.filter((i) => DECISIONS[i].options[c[i].k].book).length;
  const rows = ORDER.map((i) => {
    const s = api.stations[i], p = c[i], o = p ? DECISIONS[i].options[p.k] : undefined;
    const mark = !o ? '<span class="ch-m ch-m-skip">–</span>' : o.book ? '<span class="ch-m ch-m-yes">✓</span>' : '<span class="ch-m ch-m-no">?</span>';
    return `<li>${mark}<button class="ch-row" data-go="${i}"><b>${esc(s.year)}</b> ${esc(s.title)}<small>${o ? esc(o.label) + (o.book ? '' : ' · a what-if') : 'not chosen yet'}</small></button></li>`;
  }).join('');
  let line: string;
  if (!made.length) line = 'You rode the line without making a choice. Go back to any stop above and decide for yourself.';
  else if (matched === made.length) line = 'You walked Gogol\'s path every time. Notice how "natural" each choice felt. That is how pressure works: the forms, the classrooms and the stares make one option feel like the only one.';
  else if (matched === 0) line = 'You never chose what Gogol did. Your what-ifs show that other paths were imaginable, and that the book\'s outcomes were shaped by the institutions and people around him, not just by him.';
  else line = 'Sometimes you chose like Gogol, sometimes you didn\'t. Where you broke from him, ask what made his choice feel necessary: a rule, a classroom, a stare, or a voice in his own head.';
  return `<section class="ch-box ch-summary" aria-label="Your path">
    <div class="ch-head"><span class="ch-label">Your path · choose your own adventure</span></div>
    <div class="ch-score"><b>${matched}</b><span>of ${made.length || ORDER.length} choices matched Gogol${made.length < ORDER.length ? ` <small>(${made.length} of ${ORDER.length} made)</small>` : ''}</span></div>
    <ol class="ch-path">${rows}</ol>
    <p class="ch-reflect">${esc(line)}</p>
    ${made.length ? '<div class="ch-acts"><button class="btn ghost sm" data-ch-reset>Clear my choices</button></div>' : ''}
  </section>`;
}

const mod: CardModule = {
  html(i, api) {
    if (i === FINAL) return summaryHTML(api);
    const d = DECISIONS[i];
    return d ? decisionHTML(i, d, api) : '';
  },
  mount(root, i, api) {
    const d = DECISIONS[i];
    const box = root.querySelector<HTMLElement>('.ch-box');
    if (!box) return;
    // Veil the paragraphs that give the outcome away, and put the choice before them.
    if (d && box.classList.contains('ch-ask') && d.hide.length) {
      const story = api.stations[i].story;
      const ps = Array.from(root.querySelectorAll<HTMLParagraphElement>('.panel > p'));
      const veiled = d.hide.map((k) => ps.find((p) => p.textContent === story[k])).filter((p): p is HTMLParagraphElement => !!p);
      if (veiled.length) {
        veiled[0].before(box);
        veiled.forEach((p) => { p.classList.add('ch-veil'); p.setAttribute('aria-hidden', 'true'); });
      }
    }
    const onClick = (e: Event) => {
      const t = (e.target as HTMLElement).closest('button');
      if (!t || !root.contains(t)) return;
      const c = choices(api);
      if (t.dataset.chPick != null && d) {
        const k = +t.dataset.chPick;
        if (!d.options[k]) return;
        c[i] = { k };
        if (d.options[k].book) { api.sfx.chime(); api.toast('That\'s what Gogol did.'); }
        else api.sfx.noise(900, 2, .06, .12);
        api.save(); api.rerender();
      } else if (t.hasAttribute('data-ch-back') && c[i]) {
        c[i] = { ...c[i], back: true };
        api.sfx.thump(); api.save(); api.rerender();
      } else if (t.hasAttribute('data-ch-reset')) {
        for (const k of Object.keys(c)) delete c[k];
        api.save(); api.rerender(); api.toast('Choices cleared.');
      }
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  },
};
export default mod;
