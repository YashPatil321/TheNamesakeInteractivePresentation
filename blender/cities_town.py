"""Cambridge / Boston landmarks -> public/models/town.glb

Groups (station-local three.js coords):
  camA        station 2 (1968, Cambridge): triple-deckers with stacked porches, white Georgian church steeple, brick hospital
  camA_far    across the Charles: a domed neoclassical university building (ground-following)
  camA_river  the Charles River basin with a sculling boat
  camB        station 3 (1968, Cambridge): red-brick bowfront row houses, a small green, brick clock tower with a cupola
  court       station 8 (1986, near Boston): classical granite courthouse with portico and dome, brownstone rows
  court_flag  the flag on the courthouse (animated by the page)

Run: /opt/blendervenv/bin/python blender/cities_town.py [--preview GROUP]
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from cities_kit import Kit, jitter  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'public', 'models', 'town.glb')
rnd = random.Random(1968)
K = Kit()

CLAP = ['#c9d3d8', '#e6dcc2', '#b8c7b0', '#d9c0a8', '#aebccb', '#e9e6dc', '#c7b59a', '#9fb0a0']
BRICK = ['#8e3f2e', '#9a4a36', '#7f3a2c', '#a4553c', '#874433']
TREE = ['#4d7a3a', '#5e8a3e', '#c77a2a', '#b8502a', '#d49a2a', '#4f6e36']


def tree(x, z, h=None):
    K.tree(x, z, h=h or rnd.uniform(6.5, 9), r=rnd.uniform(2.2, 3.0), rnd=rnd, col=rnd.choice(TREE))


def street_lamp(x, z):
    K.cyl(x, 0, z, 0.08, 3.6, 'Metal', '#1e2224', seg=6)
    K.cyl(x, 3.6, z, 0.22, 0.5, 'Lamp', '#ffd89a', seg=6, r2=0.28)
    K.cone(x, 4.1, z, 0.34, 0.3, 'Metal', '#1e2224', seg=6)


# ------------------------------------------------------------------ building types
def triple_decker(cx, cz, w=6.5, d=9):
    """New England three-decker: clapboard box, stacked front porches with columns, bracketed flat roof or front gable."""
    col = jitter(rnd.choice(CLAP), 0.04, rnd)
    fh = 2.9
    gable = rnd.random() < 0.5
    with K.at(cx, 0, cz):
        top = K.building(0, 0, w, d, 3, fh, 'Wood', col, cols=2, side_cols=3, sides='right', win_w=0.4, win_h=0.55, sill=0.28, trim='Paint', tcol='#f4f1ea', lit=0.5, rnd=rnd)
        # clapboard shadow lines (every other course) on the front and right side
        for i in range(1, 10):
            y = i * top / 10
            K.box(-w / 2 - 0.02, y - 0.03, d / 2, w / 2 + 0.02, y, d / 2 + 0.04, 'Wood', tuple(v * 0.82 for v in col[:3]) + (1,))
        # porches: floor slabs, columns, railings, roof
        px0, px1 = -w / 2, -w / 2 + w * 0.55
        for f in range(3):
            y = f * fh
            K.box(px0, y, d / 2, px1, y + 0.2, d / 2 + 2.0, 'Paint', '#efece4')
            for x in (px0 + 0.12, px1 - 0.12, (px0 + px1) / 2):
                K.cyl(x, y + 0.2, d / 2 + 1.85, 0.1, fh - 0.2, 'Paint', '#f4f1ea', seg=6)
            if f > 0:
                K.box(px0, y + 0.95, d / 2 + 1.9, px1, y + 1.05, d / 2 + 2.0, 'Paint', '#f4f1ea')
                x = px0
                while x < px1:
                    K.box(x, y + 0.2, d / 2 + 1.92, x + 0.05, y + 0.95, d / 2 + 1.97, 'Paint', '#f4f1ea')
                    x += 0.34
        K.box(px0 - 0.1, top, d / 2, px1 + 0.1, top + 0.2, d / 2 + 2.15, 'Roof', '#4a4a4c')
        K.box(-0.4 + px0 + 0.5, 0, d / 2 - 0.05, px0 + 1.3, 2.2, d / 2 + 0.02, 'Wood', '#5a3a2a')  # front door
        # steps
        for i in range(3):
            K.box(px0 + 0.3, 0, d / 2 + 2.0 + i * 0.3, px0 + 1.6, 0.6 - i * 0.2, d / 2 + 2.3 + i * 0.3, 'Stone', '#9a948a')
        if gable:
            K.gable(-w / 2, w / 2, -d / 2, d / 2, top, 2.6, 'Roof', jitter('#4a4f58', 0.05, rnd), axis='z', over=0.35)
            K.gable_end(-w / 2, w / 2, d / 2 + 0.01, top, 2.5, 'Wood', col)
            K.box(-0.5, top + 0.5, d / 2 + 0.02, 0.5, top + 1.5, d / 2 + 0.08, 'Glass', (0.08, 0.09, 0.12, 1) if rnd.random() < 0.5 else (1.0, 0.72, 0.4, 1))
        else:
            K.cornice(-w / 2, w / 2, -d / 2, d / 2, top, 'Paint', '#f4f1ea', h=0.35, over=0.35)
            for x in [(-w / 2 + i * w / 6) for i in range(7)]:
                K.box(x - 0.08, top - 0.45, d / 2 + 0.05, x + 0.08, top, d / 2 + 0.3, 'Paint', '#f4f1ea')  # brackets


def bowfront(cx, cz, w=5.2, d=9, floors=4, mansard=True):
    """Red-brick bowfront row house: curved bay, black shutters, white trim, stoop with iron rail, mansard with dormers."""
    col = jitter(rnd.choice(BRICK), 0.05, rnd)
    fh = 3.1
    with K.at(cx, 0, cz):
        top = K.building(0, 0, w, d, floors, fh, 'Brick', col, cols=2, side_cols=2, sides='none', win_w=0.38, win_h=0.58, sill=0.25, trim='Stone', tcol='#ece6da', lit=0.55, rnd=rnd)
        # the bow: half-cylinder bay on the right half, windows as glass strips
        bx = w * 0.2
        K.cyl(bx, 0.9, d / 2, w * 0.3, top - 0.9, 'Brick', col, seg=14, sz=0.55)
        for f in range(floors):
            y = f * fh + fh * 0.25 + 0.9 * (f == 0)
            for a in (-0.9, 0, 0.9):
                gx, gz = bx + math.sin(a) * w * 0.3, d / 2 + math.cos(a) * w * 0.3 * 0.55
                K.box(gx - 0.35, y, gz - 0.05, gx + 0.35, y + fh * 0.55 - 0.2 * (f == 0), gz + 0.06, 'Glass', (1.0, 0.72, 0.4, 1) if rnd.random() < 0.55 else (0.08, 0.09, 0.12, 1), ry=a)
            K.cyl(bx, f * fh + fh * 0.2, d / 2, w * 0.3 + 0.05, 0.12, 'Stone', '#ece6da', seg=14, sz=0.58)
        K.cyl(bx, 0, d / 2, w * 0.31, 0.9, 'Stone', '#a8a090', seg=14, sz=0.56)
        # shutters on the flat half
        for f in range(floors):
            y = f * fh + fh * 0.25
            x = -w / 2 + w / 4
            for s in (-1, 1):
                K.box(x + s * (w * 0.19) - 0.22, y, d / 2 + 0.02, x + s * (w * 0.19) + 0.22, y + fh * 0.58, d / 2 + 0.08, 'Wood', '#1f2a24')
        # stoop, door, iron railing
        K.box(-w / 2 + 0.3, 0, d / 2, -w / 2 + 1.8, 1.2, d / 2 + 1.6, 'Stone', '#9e968a')
        for i in range(4):
            K.box(-w / 2 + 0.3, 0, d / 2 + 1.6 + i * 0.35, -w / 2 + 1.8, 1.2 - (i + 1) * 0.3, d / 2 + 1.95 + i * 0.35, 'Stone', '#9e968a')
        K.box(-w / 2 + 0.45, 1.2, d / 2 - 0.05, -w / 2 + 1.65, 3.6, d / 2 + 0.03, 'Wood', '#23231f')
        K.box(-w / 2 + 0.35, 3.6, d / 2, -w / 2 + 1.75, 3.9, d / 2 + 0.12, 'Glass', (1.0, 0.8, 0.5, 1))
        for s in (0.3, 1.8):
            K.beam((-w / 2 + s, 2.1, d / 2 + 0.1), (-w / 2 + s, 0.9, d / 2 + 3.0), 0.06, 'Metal', '#141414')
        K.cornice(-w / 2, w / 2, -d / 2, d / 2, top, 'Stone', '#ece6da', h=0.3, over=0.25)
        if mansard:
            K.prism([(d / 2 + 0.05, top + 0.3), (d / 2 - 1.2, top + 3.0), (-d / 2 + 1.2, top + 3.0), (-d / 2 - 0.05, top + 0.3)], -w / 2, w / 2, 'Roof', '#3d4248', axis='x')
            for x in (-w / 4, w / 4):
                K.box(x - 0.6, top + 0.6, d / 2 - 0.8, x + 0.6, top + 2.4, d / 2 - 0.2, 'Roof', '#3d4248')
                K.box(x - 0.4, top + 0.9, d / 2 - 0.25, x + 0.4, top + 2.1, d / 2 - 0.15, 'Glass', (1.0, 0.72, 0.4, 1) if rnd.random() < 0.5 else (0.08, 0.09, 0.12, 1))
                K.gable(x - 0.6, x + 0.6, d / 2 - 1.0, d / 2 - 0.15, top + 2.4, 0.6, 'Roof', '#3d4248', axis='z', over=0.08, thick=0.1)
        # chimneys on the party walls
        for s in (-1, 1):
            K.box(s * w / 2 - 0.4, top, -1.0, s * w / 2 + 0.4, top + 4.0, 0.2, 'Brick', col)


def brownstone(cx, cz, w=5.8, d=10, floors=4):
    """Brownstone: warm brown sandstone, high stoop, square bay, heavy bracketed cornice."""
    col = jitter(rnd.choice(['#6b4a38', '#7a5642', '#5f4234', '#83604a']), 0.04, rnd)
    fh = 3.3
    with K.at(cx, 0, cz):
        top = K.building(0, 0, w, d, floors, fh, 'Stone', col, cols=2, side_cols=2, sides='none', win_w=0.4, win_h=0.58, sill=0.25, trim='Stone', tcol='#a8876a', lit=0.6, rnd=rnd, base=-1.0)
        # square bay on the right half, two floors
        bx0, bx1 = 0.1, w / 2 - 0.4
        K.box(bx0, 1.6, d / 2, bx1, 2 * fh + 0.2, d / 2 + 1.0, 'Stone', col)
        for f in range(2):
            y = f * fh + fh * 0.3 + (1.0 if f == 0 else 0)
            K.box(bx0 + 0.3, y, d / 2 + 0.95, bx1 - 0.3, y + fh * 0.5, d / 2 + 1.05, 'Glass', (1.0, 0.72, 0.4, 1) if rnd.random() < 0.6 else (0.08, 0.09, 0.12, 1))
        K.box(bx0 - 0.1, 2 * fh + 0.2, d / 2 - 0.1, bx1 + 0.1, 2 * fh + 0.5, d / 2 + 1.2, 'Stone', '#4a3428')
        # high stoop
        K.box(-w / 2 + 0.3, 0, d / 2, -w / 2 + 2.0, 1.8, d / 2 + 1.2, 'Stone', col)
        for i in range(5):
            K.box(-w / 2 + 0.3, 0, d / 2 + 1.2 + i * 0.4, -w / 2 + 2.0, 1.8 - (i + 1) * 0.34, d / 2 + 1.6 + i * 0.4, 'Stone', col)
        K.box(-w / 2 + 0.5, 1.8, d / 2 - 0.05, -w / 2 + 1.8, 4.4, d / 2 + 0.03, 'Wood', '#2a1c14')
        K.prism([(-w / 2 + 0.3, 4.4), (-w / 2 + 2.0, 4.4), (-w / 2 + 1.15, 5.0)], d / 2, d / 2 + 0.3, 'Stone', '#4a3428')
        for s in (0.3, 2.0):
            K.beam((-w / 2 + s, 2.7, d / 2 + 0.1), (-w / 2 + s, 0.9, d / 2 + 3.2), 0.07, 'Metal', '#141414')
        # heavy cornice with brackets
        K.box(-w / 2 - 0.05, top - 0.8, d / 2, w / 2 + 0.05, top, d / 2 + 0.25, 'Stone', '#3a2a22')
        K.box(-w / 2 - 0.1, top, d / 2 - 0.2, w / 2 + 0.1, top + 0.3, d / 2 + 0.7, 'Stone', '#3a2a22')
        for i in range(6):
            x = -w / 2 + 0.3 + i * (w - 0.6) / 5
            K.box(x - 0.1, top - 0.7, d / 2 + 0.2, x + 0.1, top, d / 2 + 0.6, 'Stone', '#3a2a22')


def georgian_church(cx, cz, rot=0):
    """White clapboard meeting house with a tiered Georgian steeple (belfry, clock stage, lantern, spire)."""
    white = '#f1efe8'
    with K.at(cx, 0, cz, ry=rot):
        # nave (gable end faces the street)
        K.building(0, -9, 10, 16, 1, 7.5, 'Wood', white, cols=3, side_cols=5, win_w=0.4, win_h=0.72, sill=0.15, arch=True, trim='Paint', tcol='#ffffff', lit=0.45, rnd=rnd)
        K.gable(-5, 5, -17, -1, 7.5, 4.2, 'Roof', '#3a3f48', axis='z', over=0.4)
        K.gable_end(-5, 5, -0.99, 7.5, 4.1, 'Wood', white)
        K.prism([(-5.6, 7.3), (5.6, 7.3), (0, 11.9)], -0.9, -0.6, 'Paint', '#ffffff')
        # tower base (porch) in front
        K.bx(0, 0, 1.2, 5.0, 10.5, 4.4, 'Wood', white)
        K.box(-1.0, 0, 3.39, 1.0, 3.2, 3.5, 'Wood', '#2d3a4a')  # door
        K.lathe(0, 3.2, 3.42, [(1.0, 0), (0.7, 0.7), (0.0, 1.0)], 'Paint', '#ffffff', seg=10, sz=0.1)
        for s in (-1, 1):
            K.cyl(s * 1.6, 0, 3.6, 0.2, 4.0, 'Paint', '#ffffff', seg=8)
        K.box(-1.9, 4.0, 3.2, 1.9, 4.5, 3.9, 'Paint', '#ffffff')
        K.prism([(-2.1, 4.5), (2.1, 4.5), (0, 5.6)], 3.2, 3.9, 'Paint', '#ffffff')
        K.box(-0.6, 6.2, 3.39, 0.6, 8.6, 3.46, 'Glass', (1.0, 0.72, 0.4, 1))
        K.cornice(-2.5, 2.5, -1.0, 3.4, 10.5, 'Paint', '#ffffff', h=0.3, over=0.2)
        # clock stage
        K.bx(0, 10.8, 1.2, 3.8, 3.2, 3.8, 'Wood', white)
        K.cyl(0, 12.4, 3.12, 1.05, 0.08, 'Paint', '#f8f6ee', seg=20, rx=math.pi / 2)
        K.beam((0, 12.45, 3.2), (0, 13.2, 3.2), 0.07, 'Metal', '#141414')
        K.beam((0, 12.45, 3.2), (0.55, 12.45, 3.2), 0.07, 'Metal', '#141414')
        K.cornice(-1.9, 1.9, -0.7, 3.1, 14.0, 'Paint', '#ffffff', h=0.25, over=0.15)
        # open belfry: corner posts and arches
        K.bx(0, 14.3, 1.2, 3.2, 0.3, 3.2, 'Paint', '#ffffff')
        for sx in (-1.4, 1.4):
            for sz in (-1.4, 1.4):
                K.cyl(sx, 14.6, 1.2 + sz, 0.16, 2.6, 'Paint', '#ffffff', seg=8)
        for ry in (0, math.pi / 2, math.pi, -math.pi / 2):
            with K.at(0, 0, 1.2, ry=ry):
                K.arch_wall(-1.4, 1.4, 14.6, 16.0, 17.4, 1.35, 1.6, 'Paint', '#ffffff')
        K.box(-0.5, 14.6, 0.7, 0.5, 15.6, 1.7, 'Metal', '#6a5a3a')  # bell
        K.cornice(-1.6, 1.6, -0.4, 2.8, 17.4, 'Paint', '#ffffff', h=0.2, over=0.15)
        # octagonal lantern and spire
        K.cyl(0, 17.8, 1.2, 1.2, 2.2, 'Paint', '#ffffff', seg=8, smooth=False)
        for i in range(8):
            a = i / 8 * math.tau + math.pi / 8
            K.box(math.cos(a) * 1.15 - 0.2, 18.2, 1.2 - math.sin(a) * 1.15 - 0.2, math.cos(a) * 1.15 + 0.2, 19.5, 1.2 - math.sin(a) * 1.15 + 0.2, 'Glass', (1.0, 0.75, 0.42, 1))
        K.cyl(0, 20.0, 1.2, 1.35, 0.25, 'Paint', '#ffffff', seg=8, smooth=False)
        K.cone(0, 20.25, 1.2, 1.1, 8.5, 'Paint', '#f7f5ef', seg=8)
        K.ball(0, 28.9, 1.2, 0.18, 'Metal', '#c9a040', sub=1)
        K.cyl(0, 28.9, 1.2, 0.04, 1.2, 'Metal', '#c9a040', seg=4)


def hospital(cx, cz):
    """Five-storey brick hospital block with a stone base and a central entrance canopy."""
    with K.at(cx, 0, cz):
        top = K.building(0, 0, 22, 12, 5, 3.2, 'Brick', '#8a4a38', cols=9, side_cols=4, win_w=0.5, win_h=0.55, trim='Stone', tcol='#e0d8c8', lit=0.75, rnd=rnd)
        K.box(-11.05, 0, -6.05, 11.05, 3.2, 6.05, 'Stone', '#c9c0ae')
        K.cornice(-11, 11, -6, 6, top, 'Stone', '#e0d8c8', h=0.4, over=0.3)
        K.bx(0, top, 0, 6, 2.4, 6, 'Brick', '#8a4a38')
        K.box(-3, 3.2, 6, 3, 3.6, 8.5, 'Stone', '#d8d0c0')
        for s in (-2.7, 2.7):
            K.cyl(s, 0, 8.2, 0.14, 3.2, 'Metal', '#303030', seg=6)
        K.box(-1.4, 0, 5.95, 1.4, 2.6, 6.05, 'Glass', (1.0, 0.85, 0.6, 1))


def dome_hall(cx, cz):
    """Neoclassical university building on the far bank: long colonnaded front, portico, great low dome."""
    stone = '#d9d3c6'
    with K.at(cx, 0, cz):
        K.box(-36, -4, -12, 36, 0.4, 14, 'Stone', '#bdb6a8')
        for s in (-1, 1):
            with K.at(s * 20, 0.4, 0):
                K.building(0, 0, 30, 14, 4, 3.3, 'Stone', stone, cols=11, side_cols=4, win_w=0.45, trim='Stone', tcol='#ece6da', lit=0.55, rnd=rnd, base=0)
                K.cornice(-15, 15, -7, 7, 13.2, 'Stone', stone, h=0.45, over=0.35)
        with K.at(0, 0.4, 0):
            K.bx(0, 0, 0, 14, 14, 16, 'Stone', stone)
            for i in range(10):
                K.column(-6.3 + i * 1.4, 0, 9.4, 0.42, 11.5, 'Stone', '#efe9dc')
            K.bx(0, 11.5, 8.9, 14.6, 1.4, 2.6, 'Stone', stone)
            K.prism([(-7.3, 12.9), (7.3, 12.9), (0, 15.6)], 7.6, 10.2, 'Stone', '#cfc8b8')
            for i in range(6):
                K.box(-6 + i * 2.1, 0, 8.0, -5.4 + i * 2.1, 8, 8.12, 'Glass', (1.0, 0.72, 0.4, 1))
            K.cyl(0, 14, -1, 9.5, 3.2, 'Stone', stone, seg=32)
            K.cyl(0, 17.2, -1, 9.9, 0.5, 'Stone', '#efe9dc', seg=32)
            K.lathe(0, 17.7, -1, [(9.2, 0), (9.0, 1.6), (7.8, 3.8), (5.6, 5.7), (2.8, 6.9), (1.2, 7.2), (0, 7.3)], 'Metal', '#8ea4a0', seg=32)
            K.cyl(0, 24.9, -1, 1.1, 1.4, 'Stone', '#efe9dc', seg=12)
            K.cone(0, 26.3, -1, 1.2, 1.0, 'Metal', '#8ea4a0', seg=12)


def clock_tower(cx, cz):
    """Red-brick Georgian revival tower with white stone quoins, clock faces and a blue-and-gold cupola."""
    brick = '#8e4030'
    white = '#efe9dc'
    with K.at(cx, 0, cz):
        K.bx(0, -3, 0, 7, 21, 7, 'Brick', brick)
        for sx in (-1, 1):
            for sz in (-1, 1):
                for k in range(10):
                    K.bx(sx * 3.45, k * 1.8, sz * 3.45, 0.9 if k % 2 else 0.6, 0.9, 0.6 if k % 2 else 0.9, 'Stone', white)
        for f in range(3):
            y = 3 + f * 5
            K.box(-0.9, y, 3.49, 0.9, y + 2.8, 3.56, 'Glass', (1.0, 0.72, 0.4, 1) if f != 1 else (0.08, 0.09, 0.12, 1))
            K.box(-1.1, y - 0.2, 3.5, 1.1, y, 3.8, 'Stone', white)
            K.box(3.49, y, -0.9, 3.56, y + 2.8, 0.9, 'Glass', (1.0, 0.72, 0.4, 1) if f != 2 else (0.08, 0.09, 0.12, 1))
        K.cornice(-3.5, 3.5, -3.5, 3.5, 18, 'Stone', white, h=0.4, over=0.3)
        # clock stage
        K.bx(0, 18.4, 0, 6, 4.6, 6, 'Brick', brick)
        for ry in (0, math.pi / 2):
            with K.at(0, 0, 0, ry=ry):
                K.cyl(0, 20.7, 3.0, 1.9, 0.12, 'Stone', white, seg=24, rx=math.pi / 2)
                K.cyl(0, 20.7, 3.1, 1.6, 0.06, 'Glass', (1.0, 0.92, 0.7, 1), seg=24, rx=math.pi / 2)
                K.beam((0, 20.7, 3.2), (0, 21.9, 3.2), 0.1, 'Metal', '#141414')
                K.beam((0, 20.7, 3.2), (0.8, 20.3, 3.2), 0.1, 'Metal', '#141414')
        K.cornice(-3, 3, -3, 3, 23.0, 'Stone', white, h=0.4, over=0.3)
        # balustrade & belfry
        K.box(-3.2, 23.4, -3.2, 3.2, 24.2, 3.2, 'Stone', white)
        K.cyl(0, 24.2, 0, 2.3, 3.6, 'Paint', white, seg=8, smooth=False)
        for i in range(8):
            a = i / 8 * math.tau + math.pi / 8
            K.box(math.cos(a) * 2.25 - 0.35, 24.8, -math.sin(a) * 2.25 - 0.35, math.cos(a) * 2.25 + 0.35, 27.2, -math.sin(a) * 2.25 + 0.35, 'Glass', (1.0, 0.75, 0.42, 1))
        K.cyl(0, 27.8, 0, 2.5, 0.3, 'Paint', white, seg=8, smooth=False)
        # blue cupola with gold finial
        K.lathe(0, 28.1, 0, [(2.2, 0), (2.2, 0.6), (1.9, 1.8), (1.2, 2.8), (0.5, 3.4), (0.25, 3.9), (0, 4.0)], 'Paint', '#3a5a8a', seg=16)
        K.cyl(0, 32.1, 0, 0.08, 1.4, 'Metal', '#d4a83a', seg=6)
        K.ball(0, 33.0, 0, 0.3, 'Metal', '#d4a83a')


def courthouse(cx, cz):
    """Granite courthouse: rusticated podium, broad steps, hexastyle portico and pediment, wings, drum and dome."""
    g = '#c7c3ba'
    with K.at(cx, 0, cz):
        K.bx(0, -3, 0, 44, 5, 22, 'Stone', '#a9a59c')  # podium (3 below ground)
        for k in range(4):
            K.box(-22.05, 0.4 + k * 0.45, -11.05, 22.05, 0.45 + k * 0.45, 11.05, 'Stone', '#9a968e')  # rustication lines
        for i in range(8):
            K.bx(0, 0, 11 + i * 0.55, 16 - i * 0.2, 2 - i * 0.25, 0.6, 'Stone', '#b5b1a8')
        with K.at(0, 2, 0):
            # wings
            for s in (-1, 1):
                with K.at(s * 13.5, 0, -1):
                    top = K.building(0, 0, 15, 18, 2, 5.0, 'Stone', g, cols=4, side_cols=5, win_w=0.45, win_h=0.62, arch=True, trim='Stone', tcol='#dedad2', lit=0.5, rnd=rnd, base=0)
                    K.cornice(-7.5, 7.5, -9, 9, top, 'Stone', '#dedad2', h=0.5, over=0.4)
                    K.box(-7.5, top + 0.5, 8.6, 7.5, top + 1.3, 9, 'Stone', g)
                    for i in range(4):
                        K.box(-7.5 + i * 5 - 0.35, 0, 8.95, -7.5 + i * 5 + 0.35, top, 9.25, 'Stone', '#dedad2')  # pilasters
            # centre block & portico
            K.bx(0, 0, -1, 12, 12, 18, 'Stone', g)
            K.box(-1.4, 0, 7.95, 1.4, 5.0, 8.05, 'Wood', '#3a2c20')
            K.box(-1.4, 5.3, 7.95, 1.4, 7.5, 8.05, 'Glass', (1.0, 0.72, 0.4, 1))
            for i in range(6):
                K.column(-5.5 + i * 2.2, 0, 10.2, 0.48, 10.5, 'Stone', '#e4e0d8', seg=12)
            K.bx(0, 10.5, 9.7, 13.6, 1.5, 3.4, 'Stone', '#dedad2')
            K.prism([(-7.0, 12.0), (7.0, 12.0), (0, 15.2)], 8.0, 11.4, 'Stone', '#d2cec6')
            K.prism([(-7.4, 12.0), (-7.4, 12.25), (0, 15.5), (7.4, 12.25), (7.4, 12.0), (0, 15.2)], 11.2, 11.6, 'Stone', '#e4e0d8')
            # drum and dome
            K.cyl(0, 12, -2, 5.2, 3.6, 'Stone', g, seg=24)
            for i in range(12):
                a = i / 12 * math.tau
                K.cyl(5.35 * math.cos(a), 12, -2 - 5.35 * math.sin(a), 0.22, 3.6, 'Stone', '#e4e0d8', seg=6)
            K.cyl(0, 15.6, -2, 5.6, 0.4, 'Stone', '#e4e0d8', seg=24)
            K.lathe(0, 16, -2, [(5.2, 0), (5.0, 1.2), (4.1, 2.8), (2.6, 4.0), (1.0, 4.6), (0, 4.7)], 'Metal', '#7f9a90', seg=24)
            K.cyl(0, 20.5, -2, 0.7, 1.2, 'Stone', '#e4e0d8', seg=8)
            K.cone(0, 21.7, -2, 0.8, 0.7, 'Metal', '#7f9a90', seg=8)
            # flagpole on the lawn
        K.cyl(19, 0, 16, 0.12, 14, 'Metal', '#d8d8d8', seg=6)
        K.ball(19, 14.1, 16, 0.22, 'Metal', '#c9a040')
        # lawn and lamp standards
        K.box(-24, -0.5, 11.5, 24, 0.05, 20, 'Foliage', '#557a3a')
        for s in (-1, 1):
            K.cyl(s * 9, 0, 16.5, 0.1, 4.2, 'Metal', '#1e2224', seg=6)
            K.ball(s * 9, 4.4, 16.5, 0.35, 'Lamp', '#fff0c8')


# ------------------------------------------------------------------ station sets
def camA():
    K.begin('camA')
    x = -46
    while x < 32:
        w = rnd.uniform(6.2, 7.2)
        if -21 < x + w / 2 < -12:  # church lot
            x = -11
            continue
        triple_decker(x + w / 2, -21.5 - rnd.uniform(0, 1.5), w, 9)
        if rnd.random() < 0.6:
            tree(x + w + 0.8, -15 - rnd.uniform(0, 2))
        x += w + rnd.uniform(1.6, 2.8)
    georgian_church(-16.5, -22)
    hospital(20, -42)
    for px in range(-44, 32, 11):
        street_lamp(px, -13.5)
    K.box(-60, 0.0, -15.8, 40, 0.04, -12.0, 'Stone', '#56565a')  # street

    K.begin('camA_river')
    K.box(-90, -1.0, -76, 60, 0.12, -54, 'Water', '#4a6878')
    K.box(-90, -2, -54.5, 60, 0.35, -52.8, 'Stone', '#8f8a80')  # embankment
    for i in range(14):
        tree(-84 + i * 10 + rnd.uniform(-2, 2), -50.5 + rnd.uniform(-1, 1), h=rnd.uniform(6, 8))
    # a sculling shell
    with K.at(-18, 0.12, -64, ry=0.05):
        K.lathe(0, 0, 0, [(0.001, 0), (0.25, 0.08), (0.3, 0.2)], 'Paint', '#e6e0d0', seg=8, sx=16, sz=1)
        for i in range(4):
            K.beam((-4.5 + i * 3, 0.3, -1.3), (-4.5 + i * 3, 0.3, 1.3), 0.06, 'Metal', '#2a2a2a')

    K.begin('camA_far', origin=(-24, 0, -92))
    dome_hall(-24, -92)


def camB():
    K.begin('camB')
    x = -48
    while x < 34:
        w = rnd.uniform(5.0, 5.8)
        mid = x + w / 2
        if -14 < mid < 2:  # the green in front of the tower
            x += 2
            continue
        bowfront(mid, -21.5, w, 9, floors=3 if -30 < mid < 18 else 4)
        x += w
    # the green: lawn, paths, benches, elms, lamps, iron fence
    K.box(-14, 0.0, -30, 2, 0.08, -14, 'Foliage', '#5e8a3e')
    K.box(-7, 0.08, -30, -5, 0.1, -14, 'Stone', '#b5aa92')
    for tx, tz in [(-12, -18), (0, -19), (-11, -27), (-1.5, -26)]:
        tree(tx, tz, h=rnd.uniform(8, 10))
    for s in (-14, 2):
        K.box(s - 0.05, 0.08, -30, s + 0.05, 1.1, -14, 'Metal', '#141414')
    K.box(-14, 1.0, -14.05, 2, 1.1, -13.95, 'Metal', '#141414')
    x = -14
    while x <= 2:
        K.box(x - 0.03, 0.08, -14.03, x + 0.03, 1.1, -13.97, 'Metal', '#141414')
        x += 0.3
    for px in (-9, -3):
        street_lamp(px, -15.2)
    for px in range(-44, 34, 9):
        street_lamp(px, -13.2)
    K.box(-60, 0.0, -15.8, 40, 0.04, -12.0, 'Stone', '#56565a')
    # quadrangle ranges behind and the clock tower
    for bx, bz, w in [(-34, -44, 20), (14, -46, 22)]:
        K.building(bx, bz, w, 12, 4, 3.2, 'Brick', '#8a4232', cols=int(w / 2.4), side_cols=4, win_w=0.42, trim='Stone', tcol='#efe9dc', lit=0.6, rnd=rnd)
        K.cornice(bx - w / 2, bx + w / 2, bz - 6, bz + 6, 12.8, 'Stone', '#efe9dc', h=0.35, over=0.25)
        K.gable(bx - w / 2, bx + w / 2, bz - 6, bz + 6, 13.1, 3.2, 'Roof', '#3d4248', axis='x', over=0.3)
        for k in range(3):
            K.box(bx - w / 2 + 3 + k * (w - 6) / 2 - 0.5, 13, bz - 1, bx - w / 2 + 3 + k * (w - 6) / 2 + 0.5, 17.5, bz + 1, 'Brick', '#8a4232')
    clock_tower(-8, -48)


def court():
    K.begin('court')
    x = -50
    while x < 32:
        w = rnd.uniform(5.4, 6.2)
        mid = x + w / 2
        if -26 < mid < 6:  # the courthouse square
            x = 6
            continue
        brownstone(mid, -21.5, w, 10, floors=4)
        x += w
    for px in range(-46, 32, 10):
        street_lamp(px, -13.2)
    K.box(-60, 0.0, -15.8, 40, 0.04, -12.0, 'Stone', '#4c4c50')
    courthouse(-10, -44)
    for tx in (-28, -24, 4, 8):
        tree(tx, -28, h=8)
    # taller commercial blocks behind, Boston-style
    for bx, bz, w, fl in [(-46, -52, 14, 7), (28, -54, 16, 8), (40, -70, 12, 11)]:
        K.building(bx, bz, w, 12, fl, 3.2, 'Brick', jitter('#9a6a52', 0.08, rnd), cols=int(w / 2), side_cols=4, win_w=0.5, trim='Stone', tcol='#d8cfc0', lit=0.6, rnd=rnd)
        K.cornice(bx - w / 2, bx + w / 2, bz - 6, bz + 6, fl * 3.2, 'Stone', '#d8cfc0', h=0.45, over=0.35)

    K.begin('court_flag', origin=(9, 12.2, -28))
    # (pole is at courthouse-local (19, 16) -> station-local (9, -28))
    K.quad((9, 13.8, -28), (9, 11.6, -28), (12.8, 11.6, -28), (12.8, 13.8, -28), 'Paint', '#b8323a', both=True)
    for i in range(1, 7, 2):
        y0 = 13.8 - i * 2.2 / 7
        K.quad((9, y0, -27.98), (9, y0 - 2.2 / 7, -27.98), (12.8, y0 - 2.2 / 7, -27.98), (12.8, y0, -27.98), 'Paint', '#f2f0ea', both=True)
    K.quad((9, 13.8, -27.96), (9, 12.6, -27.96), (10.7, 12.6, -27.96), (10.7, 13.8, -27.96), 'Paint', '#2a3a6a', both=True)


camA()
camB()
court()
K.finish()
print('triangles', K.stats())
os.makedirs(os.path.dirname(OUT), exist_ok=True)
if '--preview' in sys.argv:
    tag = sys.argv[sys.argv.index('--preview') + 1]
    import bpy
    for ob in bpy.data.objects:
        if ob.type == 'EMPTY' and not ob.name.startswith(tag):
            ob.location.z -= 500
    K.preview(os.path.join(os.environ.get('PREVIEW_DIR', '/tmp'), f'prev_{tag}.png'), cam=(14, 12, 50), look=(-12, 6, 0), lens=24)
else:
    K.export(OUT)
    print('wrote', OUT, os.path.getsize(OUT))
