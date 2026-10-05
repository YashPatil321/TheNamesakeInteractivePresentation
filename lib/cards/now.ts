// Card add-on: "Then & Now". The book event beside a real, recent news story (data in ../news.ts).
// Returns '' for stations without a verified story, which hides the tab.
import type { CardModule } from './types';
import { NEWS } from '../news';
import { vignetteHTML, mountVignette } from './vignettes';

const mod: CardModule = {
  html(i, api) {
    const n = NEWS[i];
    const s = api.stations[i];
    if (!n || !s) return '';
    const e = api.esc;
    // kept simple: one sentence from the book, one from the news, one line on how they connect
    const first = (t: string) => { const m = t.match(/^.*?[.!?](?=\s|$)/); return m ? m[0] : t; };
    return `<div class="now now-simple">
      ${vignetteHTML(i, e, '')}
      <div class="now-grid">
        <section class="now-then" aria-label="In the book">
          <div class="now-kicker">In the book · ${e(s.year)}</div>
          <p>${e(first(n.then))}</p>
        </section>
        <div class="now-link" aria-label="Connection">
          <span class="now-type">${e(n.kind)}</span>
          <span class="now-arrow" aria-hidden="true"></span>
        </div>
        <article class="now-clip" aria-label="In the news">
          <div class="now-kicker">In the news · ${e(n.year)}</div>
          <h4 class="now-head">${e(n.headline)}</h4>
          <p>${e(first(n.now))}</p>
          <a class="now-read" href="${e(n.url)}" target="_blank" rel="noopener noreferrer">Read it <span aria-hidden="true">↗</span><span class="now-sr"> (opens in a new tab)</span></a>
        </article>
      </div>
      <p class="now-conn"><b>Same problem, then and now:</b> ${e(n.link)}</p>
    </div>`;
  },
  mount(root, i, api) {
    // only while the Then & Now panel is showing (the vignette autoplays when the tab opens)
    if (!root.querySelector('.now')) return;
    void api;
    return mountVignette(root, i);
  },
};
export default mod;
