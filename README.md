# The Namesake Line

An interactive, animated timeline of Jhumpa Lahiri's *The Namesake*. A steam train rides through Gogol's life from 1961 to 2000 and stops at 15 stations. Each stop opens a ticket with the story, a 4 I's analysis, a hands-on moment at five stations, and a slot for an acted scene video at 7 key stations.

**Our scenes.** The 7 acted scenes are filmed by our group and open automatically, full screen, at their stations.

**Group:** Shiven Swami, Yash Patil, Jonah Luo, Drew Dupart

Built with Next.js (App Router, TypeScript). Every page is static, so there's no server or database to set up.

## Deploy to Vercel (about 2 minutes)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyashpatil321%2Fthenamesakeinteractivepresentation&project-name=the-namesake-line)

Or set it up by hand:
1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Import `yashpatil321/thenamesakeinteractivepresentation`. Vercel detects Next.js by itself, so leave every setting on its default.
3. Click **Deploy**. You get a `*.vercel.app` link, and every push redeploys it.

To deploy a branch other than the default one, change **Settings → Git → Production Branch** in the Vercel project.

## Run it locally
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (what Vercel runs)
npm run lint     # type check
```

## Presenting
1. Open the site on the projector (press `F` for fullscreen).
2. On your laptop, in **the same browser**, open `/presenter` in another window. The ? menu also has a button for it.
3. The remote shows speaker notes, a timer and vote buttons, and it steers the projector screen. A green dot means it's connected.

| Key (main screen) | Does |
|---|---|
| `→` / `Space` / clicker | Next station |
| `←` | Previous station |
| `1` `2` `3` | Story / 4 I's / Scene tab |
| `N` | Flip Gogol ⇄ Nikhil (unlocks at 1986) |
| `A` | Color-code the timeline by the 4 I's |
| `V` | Open the passport |
| `Q` | Ticket inspector quiz |
| `P` | Presenter mode (hides extra buttons) |
| `F` | Fullscreen |
| `M` | Sound on/off |

Link straight to a station with `#s5`, `#s9`, and so on.

## Features
- **The Overcoat intro**: visitors write their name on a "Hello my name is" tag, then the coat swings open.
- **Rewind to 1961**: at the 1968 birth, the "Why Gogol?" button rewinds the train (VHS effect) to the train crash, which plays out in black and white as a 3D derailment seen from outside. Our filmed scene then shows what happens inside the carriage and the flashlight finding the page from "The Overcoat."
- **Track color = identity**: orange for Gogol, blue for Nikhil, and a braided track for both at the end.
- **Name-change stamp**: at 1986 a "PETITION GRANTED" stamp slams down and the Gogol/Nikhil switch unlocks. Flipping it changes the inner-voice text on each ticket.
- **The lost letter**: the envelope that never arrived drifts across the sky. Click it.
- **Class polls** at 1973, 1986 and the 1990s: tap once per raised hand, then reveal what Gogol did.
- **Locked finale**: visit every station, then the book opens and the inscription writes itself, personalized with the visitor's name.
- **Try it moments** at five stations: slip into the suitor's still-warm shoes (1967), fill in the birth certificate while the letter never comes (1968), offer baby Gogol the earth, pen or dollar at his rice ceremony (1968), rub a gravestone by dragging across the paper (1970s), and try to open the Gogol book he shelves for 18 years (1982). The phone call from Cleveland is one of our filmed scenes, so it has no hands-on version.
- **Passenger passport**: every station you visit stamps a passport (the button top right). A star marks each Try it moment you finished. Click any stamp to ride there.
- **Depth**: the scenery shifts with the mouse and the ticket tilts toward the pointer. The intro cycles GOGOL → NIKHIL → the visitor's own name.
- **Ticket inspector quiz**: six questions about the book with instant feedback and a punched-ticket score. Opens from the finale, the passport, or `Q`.
- **Presenter remote** at `/presenter`: speaker notes, a timer, big Back/Next buttons, vote buttons and a jump-to grid that steer the main screen.
- **Saved progress**: stamps and Try it moments survive a refresh. "Start over" in the passport clears them.
- **Scenery**: birds cross the daytime sky, and grass and fence posts rush past in the foreground.
- Sound is made in the browser (whistle, wheel clacks, crash). Scenery changes by place: Calcutta, Cambridge, the suburbs, Yale, New York, the lake, Cleveland.

## Editing
- **Story text, speaker notes and quiz questions** all live in `lib/stations.ts`.
- **Videos** go in `public/videos/` (see `public/videos/README.md`).
- The canvas animation and card UI are in `lib/engine.ts`. The page markup is in `components/NamesakeLine.tsx`, and the remote is in `components/Presenter.tsx`. Styles are in `app/globals.css`.

**Before presenting:** check the quotes and details against the book and add page numbers. The Try it text and the quiz were written from the station text, so double-check those too.
