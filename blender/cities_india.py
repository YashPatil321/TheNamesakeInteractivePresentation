"""India landmarks -> public/models/india.glb

Groups (station-local three.js coords: x along the track relative to the station, z<0 behind the track):
  village        station 0 (1961, rural night near Jamshedpur): mud huts, thatch, banyan, shrine, lanterns, paddies
  village_far    steelworks silhouette on the horizon (origin on the ground; the page drops it onto the terrain)
  calcutta       station 1 (1967): colonial street, Hooghly ghats, cantilever bridge
  calcutta_far   white domed memorial on the far bank maidan (ground-following)
  calcutta_tram  a tram that trundles along the street (animated by the page)
  calcutta_boats country boats on the river (bob on the water)

Run: /opt/blendervenv/bin/python blender/cities_india.py [--preview]
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from cities_kit import Kit, jitter  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'public', 'models', 'india.glb')
rnd = random.Random(1967)
K = Kit()

PLASTER = ['#d9b27c', '#e3c9a0', '#c98f6a', '#d7a7a0', '#b9c4b0', '#e6d8b8', '#c9a0a8', '#a9b8c4']
SHUTTER = ['#3f6b4a', '#2f5a52', '#51704a', '#6a4a36']


# ---------------------------------------------------------------- Calcutta
def colonial(cx, cz, w, d, floors, rot=0):
    """Three-storey Calcutta house: plaster, green shutters, balconies with railings, cornice, parapet, water tank."""
    col = jitter(rnd.choice(PLASTER), 0.05, rnd)
    sh = rnd.choice(SHUTTER)
    fh = 3.2
    with K.at(cx, 0, cz, ry=rot):
        top = K.building(0, 0, w, d, floors, fh, 'Plaster', col, cols=max(2, int(w / 2.4)), sides='right', win_w=0.42, win_h=0.62, sill=0.18,
                         arch=rnd.random() < 0.5, trim='Stone', tcol='#efe6d2', lit=0.6, rnd=rnd)
        bw = w / max(2, int(w / 2.4))
        n = max(2, int(w / 2.4))
        # shutters flanking the windows (half open)
        for f in range(floors):
            y0 = f * fh + fh * 0.18
            for c in range(n):
                x = -w / 2 + (c + 0.5) * bw
                ww = bw * 0.42
                for s in (-1, 1):
                    K.box(x + s * ww / 2 - (0.02 if s > 0 else 0.26) * 1, y0, d / 2 + 0.02, x + s * ww / 2 + (0.26 if s > 0 else 0.02), y0 + fh * 0.62, d / 2 + 0.09, 'Wood', sh)
        # balconies on upper floors
        for f in range(1, floors):
            y = f * fh
            if rnd.random() < 0.75:
                bx0, bx1 = -w / 2 + 0.4, w / 2 - 0.4
                K.box(bx0, y - 0.18, d / 2, bx1, y, d / 2 + 1.1, 'Stone', '#e8dfcc')
                # brackets
                for x in [bx0 + 0.2 + i * 1.6 for i in range(int((bx1 - bx0) / 1.6) + 1)]:
                    K.prism([(d / 2, y - 0.18), (d / 2 + 0.9, y - 0.18), (d / 2, y - 0.9)], x - 0.08, x + 0.08, 'Stone', '#e8dfcc', axis='x')
                # railing
                K.box(bx0, y + 0.95, d / 2 + 1.0, bx1, y + 1.05, d / 2 + 1.1, 'Metal', '#2c3a34')
                K.box(bx0, y + 0.15, d / 2 + 1.0, bx1, y + 0.22, d / 2 + 1.1, 'Metal', '#2c3a34')
                x = bx0
                while x <= bx1:
                    K.box(x - 0.03, y, d / 2 + 1.02, x + 0.03, y + 1.0, d / 2 + 1.08, 'Metal', '#2c3a34')
                    x += 0.28
                for s in (-1, 1):
                    K.box(s * (w / 2 - 0.4) - 0.04, y, d / 2 + 0.05, s * (w / 2 - 0.4) + 0.04, y + 1.05, d / 2 + 1.1, 'Metal', '#2c3a34')
        # cornice + parapet with balusters
        K.cornice(-w / 2, w / 2, -d / 2, d / 2, top, 'Stone', '#efe6d2', h=0.3, over=0.25)
        K.box(-w / 2, top + 0.3, d / 2 - 0.2, w / 2, top + 1.1, d / 2, 'Plaster', col)
        K.box(-w / 2, top + 0.3, -d / 2, -w / 2 + 0.2, top + 1.1, d / 2, 'Plaster', col)
        K.box(w / 2 - 0.2, top + 0.3, -d / 2, w / 2, top + 1.1, d / 2, 'Plaster', col)
        if rnd.random() < 0.6:
            K.cyl(rnd.uniform(-w / 4, w / 4), top, -d / 4, 0.7, 1.3, 'Plaster', '#3a3a3a', seg=10)
        # ground floor shopfront awning
        if rnd.random() < 0.6:
            K.prism([(d / 2, 3.0), (d / 2 + 1.4, 2.5), (d / 2 + 1.4, 2.4), (d / 2, 2.9)], -w / 2 + 0.3, w / 2 - 0.3, 'Paint',
                    rnd.choice(['#b8503a', '#2f6a78', '#c7a23a', '#7a3a5a']), axis='x')
    return top


def taxi(x, z, rot=0):
    """Ambassador-style yellow taxi: rounded body, black roof band."""
    with K.at(x, 0, z, ry=rot):
        K.box(-1.9, 0.35, -0.8, 1.9, 1.05, 0.8, 'Paint', '#e8b820')
        K.box(-1.95, 0.55, -0.82, -1.6, 0.9, 0.82, 'Metal', '#c9ccd0')  # bumpers
        K.box(1.6, 0.55, -0.82, 1.95, 0.9, 0.82, 'Metal', '#c9ccd0')
        K.box(-0.9, 1.05, -0.72, 0.8, 1.65, 0.72, 'Paint', '#e8b820')
        K.box(-0.85, 1.1, -0.74, 0.75, 1.55, 0.74, 'Glass', '#1a2230')
        K.box(-0.95, 1.65, -0.7, 0.85, 1.72, 0.7, 'Paint', '#1a1a1a')
        for wx in (-1.2, 1.2):
            for wz in (-0.78, 0.78):
                K.cyl(wx, 0.38, wz, 0.38, 0.22, 'Metal', '#161616', seg=10, rx=math.pi / 2)


def cantilever_bridge(cx, cz, rot):
    """Cantilever truss bridge after Kolkata's Howrah Bridge: two tall towers, anchor arms, suspended span."""
    Ht, T, A = 34.0, 22.0, 40.0  # tower height, tower x, anchor end x
    deck = 3.2
    W = 4.2  # half-width between truss planes
    steel = '#a9b1b4'
    dark = '#7d868a'

    def top_y(x):
        ax = abs(x)
        if ax >= T:  # anchor arm: from tower top down to the anchor pier
            t = (ax - T) / (A - T)
            return deck + 2 + (Ht - deck - 2) * (1 - t) ** 1.25
        # cantilever arm to the suspended span (which has a shallow arch between +-8)
        if ax > 8:
            t = (T - ax) / (T - 8)
            return Ht - (Ht - 17.5) * math.sin(t * math.pi / 2)
        return 17.5 - 1.2 * (1 - (ax / 8) ** 2) * -1

    with K.at(cx, 0, cz, ry=rot):
        xs = []
        x = -A
        while x <= A + 1e-6:
            xs.append(x)
            x += 2.5
        for s in (-1, 1):
            z = s * W
            # chords
            for a, b in zip(xs, xs[1:]):
                K.beam((a, top_y(a), z), (b, top_y(b), z), 0.45, 'Metal', steel)
                K.beam((a, deck, z), (b, deck, z), 0.7, 'Metal', dark)
            # verticals & diagonals
            for i, a in enumerate(xs):
                if abs(abs(a) - T) < 0.1:
                    continue
                K.beam((a, deck, z), (a, top_y(a), z), 0.22, 'Metal', steel)
                if i + 1 < len(xs):
                    b = xs[i + 1]
                    if a < 0:
                        K.beam((a, deck, z), (b, top_y(b), z), 0.16, 'Metal', steel)
                    else:
                        K.beam((a, top_y(a), z), (b, deck, z), 0.16, 'Metal', steel)
            # towers: tapering legs
            for tx in (-T, T):
                K.beam((tx - 1.3, -1, z), (tx - 0.35, Ht + 0.5, z), 0.75, 'Metal', steel)
                K.beam((tx + 1.3, -1, z), (tx + 0.35, Ht + 0.5, z), 0.75, 'Metal', steel)
                for yy in range(4, int(Ht) - 4, 8):
                    K.beam((tx - 1.1, yy, z), (tx + 1.0, yy + 7.5, z), 0.2, 'Metal', steel)
                    K.beam((tx + 1.1, yy, z), (tx - 1.0, yy + 7.5, z), 0.2, 'Metal', steel)
        # portal & lateral bracing across the two truss planes
        for tx in (-T, T):
            for yy in (deck + 5.5, 16, 24, Ht):
                K.beam((tx, yy, -W), (tx, yy, W), 0.6, 'Metal', steel)
            K.beam((tx, deck + 5.5, -W), (tx, Ht, W), 0.35, 'Metal', steel)
            K.beam((tx, deck + 5.5, W), (tx, Ht, -W), 0.35, 'Metal', steel)
            # aircraft lamp on the tower top
            K.ball(tx, Ht + 0.9, 0, 0.35, 'Lamp', '#ff5a3a')
        for a in xs[::4]:
            K.beam((a, top_y(a), -W), (a, top_y(a), W), 0.28, 'Metal', steel)
        # deck, footpaths, rails
        K.box(-A - 3, deck - 0.5, -W - 1.6, A + 3, deck, W + 1.6, 'Stone', '#6d6a66')
        for s in (-1, 1):
            K.box(-A - 3, deck, s * (W + 1.5) - 0.05, A + 3, deck + 0.9, s * (W + 1.5) + 0.05, 'Metal', dark)
        # lamps along the deck
        for a in xs[1::4]:
            for s in (-1, 1):
                K.box(a - 0.05, deck, s * (W + 1.3) - 0.05, a + 0.05, deck + 2.4, s * (W + 1.3) + 0.05, 'Metal', '#303438')
                K.ball(a, deck + 2.5, s * (W + 1.3), 0.2, 'Lamp', '#ffd49a')
        # piers under the towers and anchor abutments
        for tx in (-T, T):
            K.bx(tx, -1.5, 0, 5.5, deck + 1.0, 2 * W + 3, 'Stone', '#9a9184')
        for tx in (-A - 1, A + 1):
            K.bx(tx, -1.5, 0, 6, deck + 2.5, 2 * W + 3.4, 'Stone', '#a49a8a')


def ghats(x0, x1, z, y_top=0.5, y_water=0.2):
    """River steps and quay along the near bank (steps descend toward -z)."""
    n = 5
    for i in range(n):
        y = y_top - (y_top - y_water + 0.3) * (i / n)
        K.box(x0, -1.0, z - i * 0.7 - 0.7, x1, y, z - i * 0.7, 'Stone', jitter('#b4a58a', 0.04, rnd))
    # small bathing pavilion (a chhatri) at the ghat
    for gx in (x0 + 12, x1 - 18):
        K.bx(gx, y_top, z + 1.5, 4, 0.4, 4, 'Stone', '#d8ccb4')
        for sx in (-1.5, 1.5):
            for sz in (-1.5, 1.5):
                K.cyl(gx + sx, y_top + 0.4, z + 1.5 + sz, 0.16, 2.6, 'Stone', '#e8dcc6', seg=8)
        K.bx(gx, y_top + 3.0, z + 1.5, 4.2, 0.35, 4.2, 'Stone', '#e0d4bc')
        K.lathe(gx, y_top + 3.35, z + 1.5, [(1.7, 0), (1.75, 0.5), (1.4, 1.3), (0.7, 1.9), (0.15, 2.3), (0, 2.9)], 'Stone', '#f0e6d2', seg=14)


def calcutta():
    K.begin('calcutta')
    # --- street row of colonial houses behind the depot (z ~ -15 .. -24)
    x = -34
    while x < 30:
        w = rnd.uniform(6.5, 9.5)
        d = rnd.uniform(6, 8)
        mid = x + w / 2
        if -12 < mid < 8:  # a lane down to the ghats behind the platform
            x += 4
            continue
        floors = 2 if -40 < mid < 18 else rnd.choice([3, 3, 4])
        colonial(mid, -16.5 - d / 2 - rnd.uniform(0, 1.5), w, d, floors)
        x += w + rnd.uniform(0.2, 1.2)
    # --- street: asphalt, tram rails, kerb, lamp posts, taxis
    K.box(-60, 0.0, -15.5, 36, 0.05, -11.0, 'Stone', '#4a4744')
    for zz in (-13.75, -12.75):
        K.box(-60, 0.05, zz - 0.06, 36, 0.1, zz + 0.06, 'Metal', '#9aa0a6')
    for px in range(-56, 34, 12):
        K.cyl(px, 0, -15.8, 0.08, 5.4, 'Metal', '#2a2e2c', seg=6)
        K.beam((px, 5.2, -15.8), (px, 5.2, -13.3), 0.08, 'Metal', '#2a2e2c')  # tram wire bracket
        K.ball(px, 5.35, -15.8, 0.28, 'Lamp', '#ffcf8a')
    K.beam((-60, 5.2, -13.3), (36, 5.2, -13.3), 0.04, 'Metal', '#202020')
    taxi(-33, -11.8, 0.03)
    taxi(18, -12.2, math.pi + 0.05)
    taxi(26.5, -11.9, math.pi)
    # --- river Hooghly: ghats, water, far embankment
    ghats(-70, 42, -27.5)
    K.box(-90, -1.0, -62, 60, 0.18, -30.9, 'Water', '#4d6a6a')
    K.box(-90, -2.0, -64.5, 60, 1.6, -62, 'Stone', '#9c9282')
    # --- the bridge, turned three-quarters toward the camera
    with K.at(-6, 0, -44, ry=-0.62, s=0.7):
        cantilever_bridge(0, 0, 0)
    # palms along the ghats
    for px in (-66, -58, -40, 4, 30, 38):
        K.palm(px + rnd.uniform(-1, 1), -25.6 + rnd.uniform(-0.8, 0.8), h=rnd.uniform(6, 8.5), rnd=rnd)

    # --- far bank: the white memorial on its maidan
    K.begin('calcutta_far', origin=(-38, 0, -102))
    memorial(-38, -102)
    # far-bank city blocks either side
    for bx, bz, w, h in [(-78, -80, 12, 9), (0, -80, 9, 12), (12, -82, 12, 10), (26, -80, 12, 12), (-90, -86, 10, 16)]:
        K.building(bx, bz, w, 8, int(h / 3.2), 3.2, 'Plaster', jitter(rnd.choice(PLASTER), 0.05, rnd), cols=int(w / 2.4), win_w=0.4, lit=0.5, rnd=rnd, base=-4)
        K.cornice(bx - w / 2, bx + w / 2, bz - 4, bz + 4, int(h / 3.2) * 3.2, 'Stone', '#efe6d2', h=0.3, over=0.2)
    for i in range(16):
        tx = rnd.uniform(-80, 45)
        if abs(tx + 38) < 28:
            continue
        K.tree(tx, rnd.uniform(-70, -74), h=rnd.uniform(6, 9), r=rnd.uniform(2.2, 3), rnd=rnd, col='#4f7a38')

    # --- tram: its own group so the page can run it along the street
    K.begin('calcutta_tram', origin=(0, 0, -13.25))
    with K.at(0, 0, -13.25):
        K.box(-4.6, 0.35, -1.15, 4.6, 1.3, 1.15, 'Paint', '#2f5f8a')
        K.box(-4.6, 1.3, -1.15, 4.6, 2.45, 1.15, 'Paint', '#e8dfc8')
        for i in range(8):
            xx = -4.0 + i * 1.08
            K.box(xx, 1.45, 1.13, xx + 0.8, 2.3, 1.18, 'Glass', (1.0, 0.75, 0.42, 1))
            K.box(xx, 1.45, -1.18, xx + 0.8, 2.3, -1.13, 'Glass', (1.0, 0.75, 0.42, 1))
        K.box(-4.7, 2.45, -1.25, 4.7, 2.7, 1.25, 'Paint', '#6a6a66')
        K.lathe(0, 2.7, 0, [(0.9, 0), (0.9, 0.12), (0, 0.2)], 'Paint', '#6a6a66', seg=4, sx=5.0, sz=1.3)
        K.beam((-1.5, 2.8, 0), (-3.5, 5.1, 0), 0.07, 'Metal', '#202020')  # trolley pole
        K.box(-4.75, 1.4, -0.6, -4.6, 2.3, 0.6, 'Glass', (1.0, 0.8, 0.5, 1))
        K.box(4.6, 1.4, -0.6, 4.75, 2.3, 0.6, 'Glass', (1.0, 0.8, 0.5, 1))
        K.ball(4.75, 1.0, 0, 0.18, 'Lamp', '#fff0c0')

    # --- country boats
    K.begin('calcutta_boats', origin=(0, 0.2, -45))
    for bx, bz, r in [(-46, -38, 0.2), (8, -54, -0.3), (22, -36, 2.9), (-30, -57, 3.3)]:
        with K.at(bx, 0.2, bz, ry=r):
            K.lathe(0, -0.3, 0, [(0.001, 0), (0.9, 0.2), (1.0, 0.75), (0.95, 0.8)], 'Wood', '#4a3424', seg=10, sx=3.6, sz=0.95)
            K.prism([(-1.1, 0.7), (1.1, 0.7), (1.1, 1.5), (0, 2.0), (-1.1, 1.5)], -0.85, 0.85, 'Thatch', '#8a7348')
            K.cyl(1.6, 0.6, 0, 0.06, 4.5, 'Wood', '#3a2a1c', seg=5)
            K.quad((1.65, 1.4, 0), (1.65, 4.8, 0), (3.0, 4.3, 0), (3.2, 1.6, 0), 'Paint', '#c9b48a', both=True)


def memorial(cx, cz):
    """White marble memorial with a great central dome and corner cupolas (after Kolkata's Victoria Memorial)."""
    marble = '#eeeae2'
    shade = '#dcd6ca'
    with K.at(cx, 0, cz):
        # maidan lawn & reflecting pool in front
        K.box(-40, -3.5, -26, 40, 0.3, 30, 'Foliage', '#5f8a3e')
        K.box(-5, 0.3, 14, 5, 0.42, 28, 'Water', '#6f9aa6')
        K.box(-5.5, 0.28, 13.5, 5.5, 0.38, 28.5, 'Stone', '#d9d2c2')
        # terrace plinth with steps
        K.bx(0, 0.3, 0, 46, 1.8, 24, 'Stone', shade)
        for i in range(4):
            K.bx(0, 0.3, 12 + i * 0.5, 12 - i * 0.2, 1.8 - i * 0.45, 2, 'Stone', shade)
    with K.at(cx, 2.1, cz):
        K.building(0, 0, 40, 18, 2, 4.2, 'Stone', marble, cols=12, side_cols=5, win_w=0.45, win_h=0.55, arch=True, trim='Stone', tcol='#f6f2ea', lit=0.35, rnd=rnd, base=0)
        top = 8.4
        K.cornice(-20, 20, -9, 9, top, 'Stone', marble, h=0.5, over=0.4)
        K.box(-20, top + 0.5, 8.4, 20, top + 1.4, 9, 'Stone', marble)
        # corner pavilions: raised blocks with cupolas
        for sx in (-1, 1):
            for sz in (-1, 1):
                px, pz = sx * 17.5, sz * 6.5
                K.bx(px, top, pz, 5, 3.2, 5, 'Stone', marble)
                K.cornice(px - 2.5, px + 2.5, pz - 2.5, pz + 2.5, top + 3.2, 'Stone', marble, h=0.3, over=0.2)
                for kx in (-1.8, 1.8):
                    for kz in (-1.8, 1.8):
                        K.cyl(px + kx, top + 3.5, pz + kz, 0.2, 2.2, 'Stone', marble, seg=8)
                K.bx(px, top + 5.7, pz, 4.4, 0.35, 4.4, 'Stone', marble)
                K.lathe(px, top + 6.05, pz, [(1.9, 0), (2.1, 0.8), (1.8, 1.8), (1.0, 2.6), (0.3, 3.0), (0.12, 3.6), (0, 3.8)], 'Stone', marble, seg=16)
        # central portico with columns and pediment
        for i in range(6):
            K.column(-5 + i * 2, 0, 10.4, 0.36, 7.4, 'Stone', marble)
        K.bx(0, 7.4, 10.2, 12.4, 1.0, 2.4, 'Stone', marble)
        K.prism([(-6.4, 8.4), (6.4, 8.4), (0, 10.6)], 9.0, 11.4, 'Stone', shade)
        # drum and the great dome
        K.cyl(0, top, 0, 8.2, 1.2, 'Stone', marble, seg=28)
        K.cyl(0, top + 1.2, 0, 7.0, 4.6, 'Stone', shade, seg=28)
        for i in range(16):
            a = i / 16 * math.tau
            K.cyl(7.25 * math.cos(a), top + 1.2, -7.25 * math.sin(a), 0.3, 4.6, 'Stone', marble, seg=8)
            if i % 2 == 0:
                K.box(7.05 * math.cos(a) - 0.5, top + 2.2, -7.05 * math.sin(a) - 0.5, 7.05 * math.cos(a) + 0.5, top + 4.8, -7.05 * math.sin(a) + 0.5, 'Glass', (1.0, 0.8, 0.5, 1))
        K.cyl(0, top + 5.8, 0, 7.6, 0.6, 'Stone', marble, seg=28)
        K.lathe(0, top + 6.4, 0, [(7.0, 0), (7.1, 1.5), (6.6, 3.8), (5.4, 6.0), (3.6, 7.8), (1.7, 9.0), (0.6, 9.5), (0, 9.6)], 'Stone', marble, seg=32)
        # lantern and the figure on top
        K.cyl(0, top + 15.6, 0, 1.0, 1.4, 'Stone', marble, seg=12)
        K.lathe(0, top + 17.0, 0, [(1.1, 0), (0.9, 0.8), (0.3, 1.4), (0, 1.6)], 'Stone', marble, seg=12)
        K.cyl(0, top + 18.4, 0, 0.12, 1.4, 'Metal', '#2a2622', seg=6)
        K.ball(0, top + 20.0, 0, 0.45, 'Metal', '#2a2622', sy=1.6)
        K.quad((-1.2, top + 20.3, 0), (0, top + 19.6, 0), (0, top + 21.0, 0), (-1.0, top + 21.5, 0), 'Metal', '#2a2622', both=True)
        # formal garden trees flanking
        for sx in (-1, 1):
            for i in range(3):
                K.cone(sx * (26 + i * 4), -2, 10 - i * 5, 1.4, 7.5, 'Foliage', jitter('#3f6a34', 0.1, rnd), seg=8)
                K.cyl(sx * (26 + i * 4), -2, 10 - i * 5, 0.2, 2.5, 'Wood', '#5a4632', seg=5)


# ---------------------------------------------------------------- Village (1961, night)
def hut(x, z, w, d, rot=0, lantern=True):
    wall = jitter('#a9714a', 0.08, rnd)
    with K.at(x, 0, z, ry=rot):
        K.bx(0, -0.6, 0, w + 0.4, 0.9, d + 0.4, 'Plaster', '#8a5e40')  # raised plinth
        K.bx(0, 0.3, 0, w, 2.3, d, 'Plaster', wall)
        K.box(-w / 2 - 0.01, 0.3, -d / 2 - 0.01, w / 2 + 0.01, 0.8, d / 2 + 0.01, 'Plaster', '#e2d6bc')  # lime-washed band
        K.box(-0.5, 0.3, d / 2 - 0.1, 0.5, 2.0, d / 2 + 0.03, 'Wood', '#2a1c14')  # door
        K.box(w / 4, 1.2, d / 2 - 0.1, w / 4 + 0.6, 1.8, d / 2 + 0.03, 'Glass', (1.0, 0.62, 0.28, 1) if rnd.random() < 0.7 else (0.05, 0.04, 0.03, 1))
        if rnd.random() < 0.5:
            K.pyramid(0, 2.5, 0, w + 1.6, d + 1.6, 2.3, 'Thatch', jitter('#9c8250', 0.08, rnd))
        else:
            K.gable(-w / 2, w / 2, -d / 2, d / 2, 2.55, 1.9, 'Thatch', jitter('#9c8250', 0.08, rnd), over=0.8, thick=0.3)
            K.gable_end(-w / 2, w / 2, 0, 2.6, 1.7, 'Plaster', wall) if False else None
        # veranda posts
        for px in (-w / 2 - 0.4, w / 2 + 0.4):
            K.cyl(px, 0.3, d / 2 + 0.6, 0.08, 2.2, 'Wood', '#4a3424', seg=5)
        if lantern:
            K.beam((0.9, 2.2, d / 2 + 0.05), (0.9, 2.2, d / 2 + 0.55), 0.05, 'Metal', '#222222')
            K.ball(0.9, 1.9, d / 2 + 0.55, 0.16, 'Lamp', '#ffb050')


def banyan(x, z):
    K.cyl(x, -0.5, z, 1.2, 5.5, 'Wood', '#5b4a3a', seg=10, r2=0.8)
    for i in range(7):
        a = i / 7 * math.tau
        K.beam((x, 4.5, z), (x + math.cos(a) * 6, 6.5, z + math.sin(a) * 4), 0.5, 'Wood', '#5b4a3a')
        # aerial roots
        for k in range(2):
            rx, rz = x + math.cos(a) * (3 + k * 2.5), z + math.sin(a) * (2 + k * 1.6)
            K.cyl(rx, -0.3, rz, 0.09 + 0.05 * k, 6.3, 'Wood', '#6a5846', seg=4)
    for i in range(14):
        a = rnd.random() * math.tau
        rr = rnd.uniform(1, 7.5)
        K.ball(x + math.cos(a) * rr, rnd.uniform(7, 9.5), z + math.sin(a) * rr * 0.65, rnd.uniform(2.2, 3.4), 'Foliage', jitter('#34552c', 0.1, rnd), sy=0.6)


def shrine(x, z):
    """Small whitewashed village temple with a curved tower (rekha deul) and a saffron pennant."""
    with K.at(x, 0, z):
        K.bx(0, -0.5, 0, 5.2, 1.2, 5.2, 'Stone', '#c8bca8')
        K.bx(0, 0.7, 0, 3.6, 2.8, 3.6, 'Plaster', '#efe8da')
        K.box(-0.6, 0.7, 1.75, 0.6, 2.6, 1.85, 'Glass', (1.0, 0.55, 0.2, 1))
        prof = [(2.1, 0), (2.05, 1.5), (1.8, 3.0), (1.3, 4.3), (0.7, 5.0), (0.9, 5.2), (0.9, 5.5), (0.4, 5.7), (0.08, 6.4), (0, 6.6)]
        K.lathe(0, 3.5, 0, prof, 'Plaster', '#f2ecde', seg=8, smooth=False)
        K.cyl(0, 9.9, 0, 0.04, 1.8, 'Wood', '#3a2a1a', seg=4)
        K.quad((0, 11.6, 0), (0, 11.0, 0), (1.3, 11.3, 0), (1.3, 11.3, 0.01), 'Paint', '#f07a1a', both=True)
        # oil lamps on the steps
        for lx in (-1.2, 1.2):
            K.ball(lx, 0.8, 2.4, 0.13, 'Lamp', '#ffa040')


def village():
    K.begin('village')
    # huts in a loose cluster behind the halt, avoiding the wreck area in front
    spots = [(-50, -19), (-43, -24), (-36, -17.5), (-30, -26), (-12, -30), (-4, -24), (6, -28), (14, -20), (22, -25), (30, -18.5), (-58, -28)]
    for hx, hz in spots:
        hut(hx + rnd.uniform(-1, 1), hz, rnd.uniform(4, 5.5), rnd.uniform(3.2, 4.2), rot=rnd.uniform(-0.25, 0.25), lantern=rnd.random() < 0.75)
    banyan(-22, -21)
    shrine(-5, -38)
    # palms and bamboo
    for i in range(16):
        px = rnd.uniform(-64, 34)
        pz = rnd.uniform(-16, -44)
        K.palm(px, pz, h=rnd.uniform(6.5, 10), rnd=rnd, fr='#2f5a2a')
    # haystacks & a bullock cart & a well
    for hx, hz in [(-40, -30), (-38, -31.5), (18, -30), (8, -19)]:
        K.lathe(hx, 0, hz, [(1.3, 0), (1.4, 1.2), (1.1, 2.2), (0.5, 2.9), (0.05, 3.2), (0, 3.25)], 'Thatch', '#b89a5a', seg=10)
    with K.at(-26, 0, -30, ry=0.4):
        K.box(-1.6, 0.9, -0.8, 1.6, 1.05, 0.8, 'Wood', '#5a4430')
        for s in (-1, 1):
            K.cyl(0, 0.85, s * 0.9, 0.85, 0.12, 'Wood', '#3a2c20', seg=12, rx=math.pi / 2, smooth=False)
        K.beam((1.6, 1.0, 0), (3.6, 0.9, 0), 0.12, 'Wood', '#5a4430')
    K.cyl(10, -0.3, -33, 1.1, 1.2, 'Stone', '#9a8a76', seg=12)
    K.beam((9.2, 0.9, -33), (9.2, 2.6, -33), 0.1, 'Wood', '#4a3424')
    K.beam((10.8, 0.9, -33), (10.8, 2.6, -33), 0.1, 'Wood', '#4a3424')
    K.beam((9.1, 2.6, -33), (10.9, 2.6, -33), 0.1, 'Wood', '#4a3424')
    # paddy fields with bunds and standing water (catches the moon)
    for fx in range(-66, 40, 14):
        for fz in (-46, -58):
            wet = rnd.random() < 0.55
            K.box(fx, 0.0, fz - 5.5, fx + 13, 0.06, fz + 5.5, 'Water' if wet else 'Foliage', '#3e5a4a' if wet else jitter('#58783a', 0.1, rnd))
            K.box(fx - 0.35, 0.0, fz - 5.8, fx, 0.3, fz + 5.8, 'Plaster', '#6a5038')
            K.box(fx, 0.0, fz + 5.5, fx + 13, 0.3, fz + 5.85, 'Plaster', '#6a5038')
    # cooking fires in the yards
    for fx, fz in [(-47, -15.5), (-8, -20), (19, -16), (27, -22.5)]:
        for k in range(7):
            ang = k / 7 * math.tau
            K.ball(fx + math.cos(ang) * 0.6, 0.1, fz + math.sin(ang) * 0.6, 0.18, 'Stone', '#6a625a', sub=0)
        K.cone(fx, 0, fz, 0.35, 0.9, 'Lamp', '#ff8a2a', seg=6)
        K.ball(fx, 0.15, fz, 0.3, 'Lamp', '#ff5a18', sub=0)
    # signal post with an oil lamp at the halt
    K.cyl(-30, 0, -6.5, 0.1, 6.5, 'Metal', '#2a2a2a', seg=6)
    K.box(-30.05, 5.2, -6.4, -29.95, 5.6, -5.0, 'Paint', '#b02a20')
    K.ball(-30, 6.6, -6.5, 0.2, 'Lamp', '#ff5030')

    # steelworks on the horizon: chimneys and blast furnaces, furnace glow
    K.begin('village_far', origin=(-84, 0, -165))
    with K.at(-84, 0, -165, s=0.8):
        for i, (cx, h) in enumerate([(-14, 34), (-10, 38), (-6, 34), (6, 40), (10, 36)]):
            K.cyl(cx, -3, 0, 1.3, h + 3, 'Brick', '#4a3a36', seg=10, r2=0.8)
            K.cyl(cx, h - 2, 0, 0.9, 0.8, 'Paint', '#8a2a20', seg=10)
            K.ball(cx, h + 0.4, 0, 0.35, 'Lamp', '#ff3a20')
        for bx in (-22, 18):
            K.cyl(bx, -3, 4, 4, 18, 'Metal', '#3a3634', seg=12, r2=3)
            K.cyl(bx, 15, 4, 1.4, 10, 'Metal', '#3a3634', seg=8)
            K.box(bx - 2, 0, 7.9, bx + 2, 3, 8.1, 'Lamp', '#ff7a2a')
        K.box(-26, -3, -6, 26, 7, 8, 'Metal', '#2c2a2a')
        K.gable(-26, 26, -6, 8, 7, 3, 'Roof', '#242222', over=0.4)
        for i in range(0, 10, 3):
            K.box(-24 + i * 4.8, 2, 8.01, -23 + i * 4.8, 4.5, 8.12, 'Glass', (0.8, 0.4, 0.18, 1))


calcutta()
village()
K.finish()
print('triangles', K.stats())
os.makedirs(os.path.dirname(OUT), exist_ok=True)
if '--preview' in sys.argv:
    tag = sys.argv[sys.argv.index('--preview') + 1] if len(sys.argv) > sys.argv.index('--preview') + 1 else 'calcutta'
    import bpy
    from mathutils import Vector
    offs = {'calcutta': 0, 'village': 0}
    # hide groups not being previewed
    for ob in bpy.data.objects:
        if ob.type == 'EMPTY' and not ob.name.startswith(tag):
            ob.location.z -= 500
    K.preview(os.path.join(os.environ.get('PREVIEW_DIR', '/tmp'), f'prev_{tag}.png'))
else:
    K.export(OUT)
    print('wrote', OUT, os.path.getsize(OUT))
