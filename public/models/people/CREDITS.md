# People

The first-person rooms' people are no longer a model file. They are built at runtime by
`lib/fp/people.ts` (three.js, procedural): a stylised, rounded "diorama" style that matches the
low-poly cities and the toy-like train. No third-party models, scans or textures are used, so there
is no external license to track; it is covered by this project's own license.

- Bodies are lofted superellipse rings (torso, pelvis, collar band, saree skirt and pallu).
- Limbs are tapered capsules whose end spheres sit on their pivots with matching radii, so shoulders,
  elbows and knees bend without seams. Hands are simple mittens.
- Heads are a shaped sphere with a minimal face (two small dark eyes, a nose bump, ears).
- Hair is a sculpted shell around the skull, masked to a hairline per style
  (short, part, fringe, curly, long, bob, bun, bald).

The earlier Blender pipeline (`blender/people.py` -> `people.glb`) was retired in favour of this.
