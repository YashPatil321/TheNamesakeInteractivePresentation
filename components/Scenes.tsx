'use client';

// The "Our Scenes" section: rendered as an overlay inside the app and as the /scenes page.
// Overlay mode talks to the engine through window events:
//   'namesake:scenes-open' / 'namesake:scenes-closed'  (engine -> component)
//   'namesake:scenes-close' and 'namesake:go' (detail: station index)  (component -> engine)
export default function Scenes({ mode }: { mode: 'page' | 'overlay' }) {
  return <div className="scenes" data-mode={mode}>Scenes coming soon</div>;
}
