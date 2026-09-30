// Animated 3D clapperboard shown in place of a scene that hasn't been filmed yet.
import type { Scene } from '@/lib/scenes';

export default function Clapper({ scene, checking }: { scene: Scene; checking: boolean }) {
  const num = String(scene.n).padStart(2, '0');
  return (
    <div className="sc-clapwrap">
      <div className="sc-clap" aria-hidden="true">
        <div className="sc-clap-rig">
          <div className="sc-clap-stick sc-clap-top"><i /></div>
          <div className="sc-clap-stick sc-clap-base"><i /></div>
          <div className="sc-clap-board">
            <div className="sc-clap-row sc-clap-prod"><span>Prod.</span><b>The Namesake Line</b></div>
            <div className="sc-clap-grid">
              <div><span>Scene</span><b>{num}</b></div>
              <div><span>Take</span><b className="sc-clap-hand">1</b></div>
              <div><span>Year</span><b>{scene.year}</b></div>
            </div>
            <div className="sc-clap-row sc-clap-title"><b className="sc-clap-hand">{scene.title}</b></div>
          </div>
          <div className="sc-clap-back" />
        </div>
        <div className="sc-clap-shadow" />
      </div>
      <p className="sc-clap-note">
        <strong>{checking ? 'Checking the reel…' : 'Not filmed yet'}</strong>
        <span>Drop <code>public/videos/{scene.file}</code> <span className="sc-nb">in to add it</span></span>
      </p>
    </div>
  );
}
