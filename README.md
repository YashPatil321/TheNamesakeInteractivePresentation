# The Namesake Line

An interactive, animated timeline of Jhumpa Lahiri's *The Namesake*. A steam train rides through Gogol's life from 1961 to 2000 and stops at 15 stations. Each stop opens a ticket with the story, a 4 I's analysis, and a slot for an acted scene video at 4 key stations.

**Group:** Shiven Swami, Yash Patil, Jonah Luo, Drew Dupart

## Run it
Double-click `index.html`. No install needed. For the class presentation, turn on GitHub Pages (Settings → Pages → deploy from this branch) and open the link on the projector.

## Presenting
| Key | Does |
|---|---|
| `→` / `Space` / clicker | Next station |
| `←` | Previous station |
| `1` `2` `3` | Story / 4 I's / Scene tab |
| `N` | Flip Gogol ⇄ Nikhil (unlocks at 1986) |
| `A` | Color-code the timeline by the 4 I's |
| `P` | Presenter mode (hides extra buttons) |
| `F` | Fullscreen |
| `M` | Sound on/off |
| `V` | Open the passport |

Link straight to a station with `#s5`, `#s9`, and so on.

## Features
- **The Overcoat intro**: visitors write their name on a "Hello my name is" tag, then the coat swings open.
- **Rewind to 1961**: at the 1968 birth, the "Why Gogol?" button rewinds the train (VHS effect) to the train crash, which plays out in black and white with a flashlight finding the page from "The Overcoat."
- **Track color = identity**: orange for Gogol, blue for Nikhil, and a braided track for both at the end.
- **Name-change stamp**: at 1986 a "PETITION GRANTED" stamp slams down and the Gogol/Nikhil switch unlocks. Flipping it changes the inner-voice text on each ticket.
- **The lost letter**: the envelope that never arrived drifts across the sky. Click it.
- **Class polls** at 1973, 1986 and the 1990s: tap once per raised hand, then reveal what Gogol did.
- **Locked finale**: visit every station, then the book opens and the inscription writes itself, personalized with the visitor's name.
- **Try it moments** at six stations: slip into the suitor's still-warm shoes (1967), fill in the birth certificate while the letter never comes (1968), offer baby Gogol the earth, pen or dollar at his rice ceremony (1968), rub a gravestone by dragging across the paper (1970s), try to open the Gogol book he shelves for 18 years (1982), and answer the phone call from Cleveland (1990s).
- **Passenger passport**: every station you visit stamps a passport (the button top right). A star marks each Try it moment you finished. Click any stamp to ride there.
- **Depth**: the scenery shifts with the mouse and the ticket tilts toward the pointer. The intro cycles GOGOL → NIKHIL → the visitor's own name.
- Sound is made in the browser (whistle, wheel clacks, crash). Scenery changes by place: Calcutta, Cambridge, the suburbs, Yale, New York, the lake, Cleveland.

## Editing
All story text lives in the `STATIONS` list near the top of the `<script>` in `index.html`. Videos go in `videos/` (see `videos/README.md`).

**Before presenting:** check the quotes and details against the book and add page numbers.
