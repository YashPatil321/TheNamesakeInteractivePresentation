"""New Haven campus landmarks -> public/models/campus.glb

Groups (station-local three.js coords):
  yale        station 9 (1987): collegiate-gothic halls with crenellations, pointed windows, oriels,
              a gate tower with an archway into a courtyard, elms, lamps
  yale_tower  a tall tiered gothic bell tower (after Yale's Harkness Tower) - ground-following

Run: /opt/blendervenv/bin/python blender/cities_campus.py [--preview GROUP]
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from cities_kit import Kit, jitter  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'public', 'models', 'campus.glb')
rnd = random.Random(1987)
K = Kit()

STONE = ['#9a9080', '#a69c8a', '#8e8574', '#b0a690', '#978b78']
TRIM = '#c9c0ac'
SLATE = '#4a4c54'
LIT = (1.0, 0.7, 0.36, 1)
DARK = (0.08, 0.09, 0.12, 1)


def lit():
    if rnd.random() < 0.62:
        k = rnd.uniform(0.7, 1.1)
        return (LIT[0] * k, LIT[1] * k, LIT[2] * k, 1)
    return DARK


def gothic_window(cx, y0, w, h, z, col, t=0.4, g=None):
    """Pointed-arch window set into a wall face at z (facing +z): stone surround, recessed glass, tracery mullion."""
    spring = y0 + h - w * 0.866
    g = g or lit()
    K.gothic_arch(cx - w / 2, cx + w / 2, y0, spring, y0 + h + 0.25, z - t, z + 0.02, 'Stone', col, seg=4)
    K.box(cx - w / 2, y0, z - t, cx + w / 2, spring, z - 0.25, 'Glass', g)
    K.prism([(cx - w / 2, spring), (cx + w / 2, spring), (cx, y0 + h)], z - t, z - 0.25, 'Glass', g)
    K.box(cx - 0.05, y0, z - 0.25, cx + 0.05, y0 + h - 0.2, z - 0.2, 'Stone', TRIM)
    K.box(cx - w / 2 - 0.12, y0 - 0.15, z - 0.05, cx + w / 2 + 0.12, y0, z + 0.12, 'Stone', TRIM)


def crenellate(x0, x1, z0, z1, y, col, h=0.9, merlon=0.7):
    """Parapet with merlons along the front edge (z1) and the sides."""
    K.box(x0 - 0.15, y, z1 - 0.4, x1 + 0.15, y + 0.4, z1 + 0.15, 'Stone', TRIM)
    x = x0
    while x < x1 - 0.1:
        K.box(x, y + 0.4, z1 - 0.35, min(x + merlon, x1), y + h, z1 + 0.05, 'Stone', col)
        x += merlon * 2


def hall(cx, cz, w, d, floors, col=None, gable=True, oriel=None, chimneys=2):
    """Collegiate-gothic range: stone walls, pointed windows in a grid, string courses, slate roof, crenellated or gabled."""
    col = col or jitter(rnd.choice(STONE), 0.04, rnd)
    fh = 3.4
    top = floors * fh
    with K.at(cx, 0, cz):
        K.box(-w / 2, -1.5, -d / 2, w / 2, top, d / 2 - 0.4, 'Stone', col)
        # front wall made of piers + windows so the windows are truly recessed
        n = max(2, int(w / 2.6))
        bw = w / n
        for f in range(floors):
            y0 = f * fh
            for c in range(n):
                x = -w / 2 + (c + 0.5) * bw
                if oriel is not None and abs(x - oriel) < bw:
                    continue
                gothic_window(x, y0 + 0.8, bw * 0.46, fh * 0.62, d / 2, col)
            K.box(-w / 2, y0, d / 2 - 0.4, w / 2, y0 + 0.8, d / 2, 'Stone', col)
            K.box(-w / 2 - 0.05, y0 + fh - 0.12, d / 2 - 0.1, w / 2 + 0.05, y0 + fh, d / 2 + 0.1, 'Stone', TRIM)
            for c in range(n + 1):
                x = -w / 2 + c * bw
                hw = bw * 0.27
                K.box(max(-w / 2, x - hw), y0 + 0.8, d / 2 - 0.4, min(w / 2, x + hw), y0 + fh - 0.12, d / 2, 'Stone', col)
        # buttresses
        for c in range(n + 1):
            x = -w / 2 + c * bw
            K.box(x - 0.3, -0.5, d / 2, x + 0.3, top * 0.7, d / 2 + 0.7, 'Stone', col)
            K.prism([(d / 2, top * 0.7), (d / 2 + 0.7, top * 0.7), (d / 2, top * 0.7 + 1.2)], x - 0.3, x + 0.3, 'Stone', TRIM, axis='x')
        # right side windows (the side the camera sees)
        m = max(1, int(d / 3))
        with K.at(w / 2, 0, 0, ry=math.pi / 2):
            for f in range(floors):
                for c in range(m):
                    gothic_window(-d / 2 + (c + 0.5) * d / m, f * fh + 0.8, 1.1, fh * 0.62, 0.02, col)
        if oriel is not None:
            # a two-storey bay window
            K.box(oriel - 1.6, fh * 0.6, d / 2, oriel + 1.6, top - 0.6, d / 2 + 1.3, 'Stone', col)
            K.prism([(d / 2, fh * 0.6), (d / 2 + 1.3, fh * 0.6), (d / 2, fh * 0.6 - 1.4)], oriel - 1.6, oriel + 1.6, 'Stone', col, axis='x')
            for f in range(floors):
                K.box(oriel - 1.3, f * fh + fh * 0.7 + (0.4 if f == 0 else 0.2), d / 2 + 1.28, oriel + 1.3, f * fh + fh * 0.7 + fh * 0.62, d / 2 + 1.36, 'Glass', lit())
            crenellate(oriel - 1.6, oriel + 1.6, d / 2, d / 2 + 1.3, top - 0.6, col, h=0.6, merlon=0.4)
        if gable:
            K.gable(-w / 2, w / 2, -d / 2, d / 2, top, d * 0.45, 'Roof', SLATE, axis='x', over=0.25)
            for s in (-1, 1):
                K.prism([(-d / 2 - 0.3, top), (d / 2 + 0.3, top), (0, top + d * 0.45 + 0.3)], s * w / 2 - 0.3, s * w / 2 + 0.3, 'Stone', col, axis='x')
                K.cone(s * w / 2, top + d * 0.45 + 0.2, 0, 0.35, 1.6, 'Stone', TRIM, seg=4)
            # dormers
            for c in range(1, n, 2):
                x = -w / 2 + c * bw
                K.box(x - 0.8, top, d / 4 - 0.5, x + 0.8, top + 1.8, d / 4 + 0.6, 'Stone', col)
                K.box(x - 0.45, top + 0.3, d / 4 + 0.6, x + 0.45, top + 1.4, d / 4 + 0.68, 'Glass', lit())
                K.gable(x - 0.8, x + 0.8, d / 4 - 0.5, d / 4 + 0.6, top + 1.8, 0.9, 'Roof', SLATE, axis='z', over=0.1, thick=0.12)
        else:
            K.box(-w / 2, top - 0.3, -d / 2, w / 2, top, d / 2, 'Roof', SLATE)
            crenellate(-w / 2, w / 2, -d / 2, d / 2, top, col)
        for k in range(chimneys):
            x = -w / 2 + (k + 0.5) * w / chimneys + 1
            K.box(x - 0.5, top, -d / 4 - 0.5, x + 0.5, top + d * 0.45 + 2.2, -d / 4 + 0.5, 'Stone', col)
            K.box(x - 0.65, top + d * 0.45 + 2.2, -d / 4 - 0.65, x + 0.65, top + d * 0.45 + 2.5, -d / 4 + 0.65, 'Stone', TRIM)
    return top


def gate_tower(cx, cz, w=8, d=10, h=17):
    """Gatehouse tower with a pointed carriage arch through to the courtyard, turrets at the corners."""
    col = '#8e8574'
    with K.at(cx, 0, cz):
        # arch walls front and back, side piers
        for zf in (d / 2, -d / 2 + 0.8):
            K.gothic_arch(-2.2, 2.2, 0, 3.6, h, zf - 0.8, zf, 'Stone', col, seg=6)
        K.box(-w / 2, -1.5, -d / 2, -2.2, h, d / 2, 'Stone', col)
        K.box(2.2, -1.5, -d / 2, w / 2, h, d / 2, 'Stone', col)
        K.box(-2.2, 7.6, -d / 2, 2.2, h, d / 2, 'Stone', col)
        K.box(-2.2, 0, -d / 2 + 0.8, 2.2, 0.05, d / 2 - 0.8, 'Stone', '#6a6458')
        # a warm lantern hanging in the arch
        K.cyl(0, 5.2, d / 2 - 1.5, 0.03, 2.2, 'Metal', '#1a1a1a', seg=4)
        K.cyl(0, 4.7, d / 2 - 1.5, 0.28, 0.6, 'Lamp', '#ffd08a', seg=6, r2=0.22)
        # upper windows & niches
        gothic_window(0, 10, 2.0, 4.2, d / 2 + 0.02, col, g=LIT)
        K.box(-w / 2 - 0.1, 9.2, -d / 2 - 0.1, w / 2 + 0.1, 9.5, d / 2 + 0.1, 'Stone', TRIM)
        # corner turrets (octagonal) rising above the parapet
        for sx in (-1, 1):
            for sz in (-1, 1):
                K.cyl(sx * w / 2, -1.5, sz * d / 2, 0.9, h + 3.5, 'Stone', col, seg=8, smooth=False)
                K.cyl(sx * w / 2, h + 2, sz * d / 2, 1.05, 0.35, 'Stone', TRIM, seg=8, smooth=False)
                for k in range(4):
                    a = k / 4 * math.tau + math.pi / 8
                    K.bx(sx * w / 2 + math.cos(a) * 0.8, h + 2.35, sz * d / 2 - math.sin(a) * 0.8, 0.35, 0.7, 0.35, 'Stone', col)
        crenellate(-w / 2, w / 2, -d / 2, d / 2, h, col)
        K.box(-w / 2, h - 0.2, -d / 2, w / 2, h, d / 2, 'Roof', SLATE)


def pinnacle(x, y, z, s=1.0, col='#a69c8a'):
    K.bx(x, y, z, 0.7 * s, 1.6 * s, 0.7 * s, 'Stone', col)
    K.cone(x, y + 1.6 * s, z, 0.5 * s, 2.6 * s, 'Stone', col, seg=4, rot0=math.pi / 4)
    K.ball(x, y + 4.25 * s, z, 0.14 * s, 'Stone', col, sub=0)


def harkness(cx, cz):
    """Tiered gothic bell tower: square shaft with angle buttresses, belfry stages that step in, openwork crown and pinnacles."""
    col = '#a39985'
    col2 = '#b3a994'
    with K.at(cx, 0, cz):
        # base
        W = 11.0
        K.bx(0, -4, 0, W, 28, W, 'Stone', col)
        for sx in (-1, 1):
            for sz in (-1, 1):
                # stepped angle buttresses
                for k, (bh, bo) in enumerate([(12, 1.3), (20, 0.9), (27, 0.5)]):
                    K.bx(sx * (W / 2 + bo / 2 - 0.2), -4, sz * (W / 2 - 0.9), bo + 0.2, bh + 4, 1.4, 'Stone', col)
                    K.bx(sx * (W / 2 - 0.9), -4, sz * (W / 2 + bo / 2 - 0.2), 1.4, bh + 4, bo + 0.2, 'Stone', col)
        # tall lancet windows on the shaft (front and right faces)
        for ry in (0, math.pi / 2):
            with K.at(0, 0, 0, ry=ry):
                gothic_window(0, 4, 2.6, 10, W / 2 + 0.02, col)
                gothic_window(0, 17, 2.2, 8, W / 2 + 0.02, col)
                for sx in (-2.6, 2.6):
                    gothic_window(sx, 18, 1.0, 6, W / 2 + 0.02, col)
                # clock face
                K.cyl(0, 26.2, W / 2 + 0.05, 1.5, 0.12, 'Stone', '#e4dcc8', seg=20, rx=math.pi / 2)
                K.beam((0, 26.2, W / 2 + 0.2), (0, 27.2, W / 2 + 0.2), 0.09, 'Metal', '#1a1a1a')
                K.beam((0, 26.2, W / 2 + 0.2), (0.7, 25.8, W / 2 + 0.2), 0.09, 'Metal', '#1a1a1a')
        K.box(-W / 2 - 0.2, 28, -W / 2 - 0.2, W / 2 + 0.2, 28.6, W / 2 + 0.2, 'Stone', col2)
        # belfry stage 1
        W2 = 9.0
        K.bx(0, 28.6, 0, W2, 11, W2, 'Stone', col)
        for ry in (0, math.pi / 2, math.pi, -math.pi / 2):
            with K.at(0, 0, 0, ry=ry):
                for sx in (-2.1, 2.1):
                    K.gothic_arch(sx - 1.3, sx + 1.3, 29.6, 35.5, 37.8, W2 / 2 - 0.3, W2 / 2 + 0.05, 'Stone', col, seg=4)
                    K.box(sx - 1.3, 29.6, W2 / 2 - 0.5, sx + 1.3, 36.5, W2 / 2 - 0.3, 'Glass', (1.0, 0.66, 0.3, 1))
        K.box(-W2 / 2 - 0.2, 39.6, -W2 / 2 - 0.2, W2 / 2 + 0.2, 40.2, W2 / 2 + 0.2, 'Stone', col2)
        for sx in (-1, 1):
            for sz in (-1, 1):
                pinnacle(sx * W2 / 2, 40.2, sz * W2 / 2, 1.1, col2)
                pinnacle(sx * (W / 2 + 0.3), 28.6, sz * (W / 2 + 0.3), 0.9, col2)
        # stage 2 (octagon with tall lancets)
        K.cyl(0, 40.2, 0, 3.6, 8, 'Stone', col, seg=8, smooth=False, rot0=math.pi / 8)
        for i in range(8):
            a = i / 8 * math.tau
            with K.at(0, 0, 0, ry=a):
                K.box(-0.7, 41.5, 3.1, 0.7, 46.5, 3.4, 'Glass', (0.9, 0.6, 0.28, 1))
                K.bx(3.4 * math.cos(math.pi / 8) * 0 + 0, 40.2, 3.55, 0.5, 8.4, 0.5, 'Stone', col2)
        K.cyl(0, 48.2, 0, 4.0, 0.5, 'Stone', col2, seg=8, smooth=False, rot0=math.pi / 8)
        # openwork crown: ring of pinnacles around a short spirelet
        for i in range(8):
            a = i / 8 * math.tau
            pinnacle(3.5 * math.cos(a), 48.7, -3.5 * math.sin(a), 0.9, col2)
        K.cyl(0, 48.7, 0, 2.4, 3.2, 'Stone', col, seg=8, smooth=False)
        K.cone(0, 51.9, 0, 2.2, 5.5, 'Stone', col2, seg=8)
        K.cyl(0, 57.4, 0, 0.05, 1.5, 'Metal', '#c9a040', seg=4)
        # a warm light in the belfry (the tower reads at night)
        K.bx(0, 30, 0, 6.5, 6, 6.5, 'Lamp', '#ffb866')


def elm(x, z):
    """Vase-shaped New England elm."""
    K.cyl(x, -0.3, z, 0.35, 4.3, 'Wood', '#4a3e32', seg=6, r2=0.25)
    for k in range(4):
        a = k / 4 * math.tau + rnd.random()
        K.beam((x, 3.8, z), (x + math.cos(a) * 2.6, 7.5, z + math.sin(a) * 2.6), 0.28, 'Wood', '#4a3e32')
    for k in range(7):
        a = rnd.random() * math.tau
        r = rnd.uniform(1.5, 3.8)
        K.ball(x + math.cos(a) * r, rnd.uniform(8, 10.5), z + math.sin(a) * r, rnd.uniform(2.0, 2.8), 'Foliage', jitter('#4a6e34', 0.12, rnd), sy=0.7)


def yale():
    K.begin('yale')
    # the street wall: halls either side of a gate tower
    hall(-40, -23, 16, 10, 3, gable=True, oriel=-2)
    hall(-23, -24, 14, 10, 3, gable=False)
    gate_tower(-11, -24)
    hall(0.5, -24, 15, 10, 3, gable=True, oriel=3)
    hall(16, -23, 12, 10, 3, gable=False)
    hall(30, -24, 14, 10, 4, gable=True)
    # courtyard behind the gate: lawn, paths, second range of halls
    K.box(-34, 0.0, -44, 22, 0.06, -29, 'Foliage', '#4e6e38')
    K.box(-12.5, 0.06, -44, -9.5, 0.09, -29, 'Stone', '#9e9684')
    hall(-24, -52, 22, 11, 4, gable=True, oriel=4, chimneys=3)
    hall(10, -54, 20, 11, 4, gable=True, chimneys=2)
    # sidewalk, low wall and iron railings, lamps, elms
    K.box(-60, 0, -18.2, 42, 0.12, -14.5, 'Stone', '#8a8478')
    K.box(-60, 0, -18.4, 42, 0.9, -17.8, 'Stone', '#8e8574')
    for px in range(-54, 42, 10):
        K.cyl(px, 0, -15.2, 0.09, 3.8, 'Metal', '#1a1c1e', seg=6)
        K.cyl(px, 3.8, -15.2, 0.24, 0.55, 'Lamp', '#ffd08a', seg=6, r2=0.3)
        K.cone(px, 4.35, -15.2, 0.36, 0.35, 'Metal', '#1a1c1e', seg=6)
    for ex in (-50, -31, -3, 23, 38):
        elm(ex + rnd.uniform(-1, 1), -13.2 + rnd.uniform(-0.6, 0.6))

    K.begin('yale_tower', origin=(-20, 0, -82))
    with K.at(-20, 0, -82, s=0.7):
        harkness(0, 0)
    # the tower's own flanking ranges
    with K.at(0, 0, 0):
        hall(-36, -70, 18, 11, 4, gable=True, chimneys=2)
        hall(-4, -71, 16, 11, 4, gable=True, chimneys=2)


yale()
K.finish()
print('triangles', K.stats())
os.makedirs(os.path.dirname(OUT), exist_ok=True)
if '--preview' in sys.argv:
    tag = sys.argv[sys.argv.index('--preview') + 1]
    import bpy
    for ob in bpy.data.objects:
        if ob.type == 'EMPTY' and not ob.name.startswith(tag):
            ob.location.z -= 500
    K.preview(os.path.join(os.environ.get('PREVIEW_DIR', '/tmp'), f'prev_{tag}.png'), cam=(14, 12, 50), look=(-12, 10, 0), lens=24)
else:
    K.export(OUT)
    print('wrote', OUT, os.path.getsize(OUT))
