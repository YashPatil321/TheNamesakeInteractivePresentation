# people.glb

All geometry in `people.glb` is original and generated procedurally by `blender/people.py`
(Blender 5.0, headless). No third-party models, scans or textures are used, so there is no
external license to track; it is covered by this project's own license.

Heads and hair are voxel-fused anatomical masses; the neck, torso, arms and legs are lofts of
tabulated anatomical cross-sections (7.5-head proportions) with muscle and clothing detail
(clavicles, pecs/bust, scapulae, belt, hems, cuffs, folds) displaced along the normal.

Rebuild: `/opt/blendervenv/bin/python blender/people.py`
Preview render: `/opt/blendervenv/bin/python blender/people.py --preview out.png`
