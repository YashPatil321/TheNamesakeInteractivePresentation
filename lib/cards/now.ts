// Card add-on: "Then & Now". The book event beside a real, recent news story (data in ../news.ts).
// Returns '' for stations without a verified story, which hides the tab.
import type { CardModule } from './types';
import { NEWS } from '../news';
import { vignetteHTML, mountVignette } from './vignettes';
import { animBadge } from '../media';

const mod: CardModule = {
  html(i, api) {
    const n = NEWS[i];
    const s = api.stations[i];
    if (!n || !s) return '';
    const e = api.esc;
    const stat = n.stat
      ? `<div class="now-stat"><b>${e(n.stat.n)}</b><span><em>Did you know?</em> ${e(n.stat.text)}</span></div>`
      : '';
    return `<div class="now">
      <p class="now-intro">The book is set from 1961 to 2000. How does what Gogol's family faced compare with the news today?</p>
      ${vignetteHTML(i, e, animBadge('Animated', 'sm', 'A computer animation we made to illustrate the news story. Not footage.'))}
      <div class="now-grid">
        <section class="now-then" aria-label="In the book">
          <div class="now-kicker">Then · ${e(s.year)}</div>
          <h4>In the book</h4>
          <p>${e(n.then)}</p>
          <div class="now-src"><i>The Namesake</i> · ${e(s.title)}</div>
        </section>
        <div class="now-link" aria-label="Connection">
          <span class="now-type">${e(n.kind)}</span>
          <span class="now-arrow" aria-hidden="true"></span>
        </div>
        <article class="now-clip" aria-label="In the news">
          <div class="now-kicker">Now · ${e(n.year)}</div>
          <div class="now-mast"><span>${e(n.outlet)}</span><time>${e(n.date)}</time></div>
          ${n.sourceKind ? `<div class="now-kind">${e(n.sourceKind)}</div>` : ''}
          <h4 class="now-head">${e(n.headline)}</h4>
          <p>${e(n.now)}</p>
          <a class="now-read" href="${e(n.url)}" target="_blank" rel="noopener noreferrer">Read the article <span aria-hidden="true">↗</span><span class="now-sr"> (opens in a new tab)</span></a>
        </article>
      </div>
      <p class="now-conn"><b>Connection · ${e(n.kind)}</b> ${e(n.link)}</p>
      ${stat}
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
