# The Namesake — Interactive Timeline Brainstorm

Story: *The Namesake* by Jhumpa Lahiri (1968 → 2000, Calcutta ↔ Massachusetts ↔ New York).
Goal: a web timeline that tells the plot, with our own acted-out videos embedded at the big scenes.

---

## 1. The big concept: "The Track"

The whole timeline is a **train track** running left to right. You scroll (or hit arrow keys) and a small
train moves along it, stopping at "stations," which are the major events.

Why a train: the train crash in 1961 is the reason Gogol has his name, and trains keep coming back
(Ashoke's crash, Gogol's train home from Yale when his father finally tells him, Gogol riding
the train between New York and Boston). The track *is* the story.

- **Stations** = major plot events (the ones we act out get a 🎬 video badge)
- **Small signal lights** between stations = minor events or quotes
- **The track changes color** based on which name he's using:
  - Orange = **Gogol**
  - Blue = **Nikhil**
  - Both braided together at the end, when he picks the book back up

---

## 2. Signature interactive mechanics (the "cool" part)

| Mechanic | What it does | Why it fits the book |
|---|---|---|
| **Name Switch** | A toggle in the corner: `GOGOL ⇄ NIKHIL`. Flipping it changes how the text is written (who's "narrating" it) and grays out whatever that identity would avoid. It locks to Gogol before 1986 and unlocks when he legally changes his name. | Identity is the whole book |
| **The Lost Letter** | An envelope from Ashima's grandmother floats across the screen. It never opens, and clicking it says "still in the mail…". At the end it turns into the book inscription. | The good name that never arrives |
| **The Overcoat** | The page opens with a coat you click to "open" (the start button). | "We all came out of Gogol's Overcoat" |
| **Flashback Rewind** | At the 1968 birth station, a "Why this name?" button *rewinds* the train back to **1961**, to the crash, and then it moves forward again. | The book reveals the crash as a flashback |
| **Map Pins** | A mini-map that lights up Calcutta, Cambridge, Pemberton Road, New Haven, NYC, New Hampshire, Cleveland | Moving between cultures |
| **Unlocked Ending** | The final station stays locked until you've visited every station. Then the book opens to the inscription. | Rewards finishing the whole thing |
| **Quiz Stops (optional)** | Quick "What would you do?" choices (for example, "Nikhil or Gogol for kindergarten?"), then it shows what actually happened | Gets the class involved |

---

## 3. Timeline stations (plot in order)

🎬 = scenes we could act out on video

| # | Year | Station | What happens |
|---|---|---|---|
| 0 | 1961 | 🎬 **The Train Crash** | Ashoke reads Gogol's "The Overcoat" on a night train. Ghosh, a stranger, tells him to go see the world. The train derails, and rescuers find Ashoke because of a crumpled page in his hand. |
| 1 | 1967 | **Arranged Marriage** | Ashima tries on Ashoke's shoes during the visit and they marry. She moves to Cambridge, MA. |
| 2 | 1968 | 🎬 **Birth & The Name** | Ashima's snack of Rice Krispies, Planters peanuts, and onion. Gogol is born, but the letter with his real name never arrives. The hospital needs a name, so Ashoke chooses "Gogol." |
| 3 | 1968 | **The Annaprasan** | Rice ceremony. Baby Gogol cries at the choice between money, dirt, and a pen. |
| 4 | 1973 | 🎬 **First Day of Kindergarten** | His parents enroll him as "Nikhil," and he refuses. The principal lets him stay Gogol. |
| 5 | 1970s | **Pemberton Road / Sonia** | Suburban life, Sonia is born, Bengali parties, the cemetery field trip with gravestone rubbings. |
| 6 | 1982 | 🎬 **14th Birthday: The Gift** | Ashoke gives him *The Short Stories of Nikolai Gogol*. Gogol puts it away. Ashoke almost tells him the story, and doesn't. |
| 7 | 1982 | **English Class** | The teacher talks about Nikolai Gogol's strange, miserable life, and Gogol is humiliated. |
| 8 | 1986 | 🎬 **"I'm Nikhil"** | At a party he introduces himself to a girl named Kim as "Nikhil," and it's his first kiss. Soon after, he legally changes his name before leaving for Yale. |
| 9 | 1987 | 🎬 **The Truth on the Drive Home** | His train home stops (a suicide on the tracks). Ashoke picks him up and finally tells him about the crash. *"Do I remind you of that night?" / "You remind me of everything that followed."* |
| 10 | 1990s | **Ruth → Maxine** | College girlfriend Ruth. In New York he dates Maxine, and her family (Gerald and Lydia Ratliff) feels effortless next to his. The lake house in New Hampshire. |
| 11 | 1990s | 🎬 **The Phone Call** | Ashoke dies of a heart attack in Cleveland. Gogol goes alone to clear out the apartment, then shaves his head in mourning. He pulls away from Maxine. |
| 12 | 1990s | **Moushumi** | His mother sets him up with Moushumi, and they marry. |
| 13 | late 1990s | 🎬 **The Affair** | Moushumi's affair with Dimitri comes out and the marriage ends. |
| 14 | 2000 | 🎬 **Last Christmas on Pemberton Road** | Ashima is selling the house. Gogol finds the book, reads the inscription *"The man who gave you his name, from the man who gave you your name,"* and finally starts reading. |

**Suggested scenes to film (pick 5–6 for time):** 0, 2, 4, 9, 11, 14. That set covers the setup, conflict, turning point, and ending.

---

## 4. Video production ideas

- **Length:** 45–90 seconds per scene. Short keeps the timeline moving.
- **Visual code:** Film the **1961 crash** in black & white or with a heavy filter so it reads as a flashback. Use warm color for the Calcutta/family scenes and cooler color for the Nikhil/NYC scenes.
- **Props that pay off everywhere:**
  - A **thin paperback** standing in for *The Overcoat* / the Gogol book (it's in scenes 0, 6, 9, and 14, the thread through the whole thing)
  - An **envelope** for the lost letter
  - A **name tag** that says "Hello my name is ___"
- **Train scene on a budget:** Two rows of chairs, a flashlight swinging for passing lights, shaky camera, a phone playing train sounds. On the "crash": blackout, then a flashlight finding the page in someone's hand.
- **Recurring shot:** Every video ends on a close-up of a name (a birth certificate, name tag, court form, gravestone, the inscription). We can cut these into a montage for the finale.
- **Narration option:** One person voices "adult Gogol" looking back, which ties all the videos together.

---

## 5. Tech plan (simple and reliable)

- **Single web page** (HTML/CSS/JS) with no install. It runs from a USB drive, GitHub Pages, or the classroom projector.
- Horizontal scroll timeline plus **arrow keys / clicker support**, so it works like a slideshow during the presentation.
- Videos: host on YouTube (unlisted) or drop `.mp4`s in a `/videos` folder, and each station links to one.
- Each station opens a **card**: year, title, 2–3 sentence summary, a key quote, the video (if any), and a "theme tag" (Identity / Family / Loss / Belonging).
- Sound: a soft train-clack plays when moving between stations (with a mute button).
- Stretch: a "present mode" that hides the UI and makes the train drive itself.

---

## 6. Presentation flow (how we'd run it in class)

1. Open on the **Overcoat** (click to begin), with Ashima's snack as a quick hook.
2. Hit "Why this name?" to **rewind to 1961** and play the crash video.
3. Ride forward, playing videos at 🎬 stations and narrating the rest live.
4. Flip the **Name Switch** live at 1986, a big visual moment.
5. Play the finale video, the envelope becomes the inscription, and the braided track appears.
6. Optional: classmates vote on a quiz stop.

---

## Next steps

- [ ] Pick which scenes to film and assign roles
- [ ] Write 1-page scripts per scene
- [ ] Build the timeline page skeleton with placeholder video slots
- [ ] Drop in videos once filmed
