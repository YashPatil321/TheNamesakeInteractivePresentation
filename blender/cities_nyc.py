# New York landmarks. Late 1990s (S_midtown): an avenue of yellow cabs, a brownstone row with stoops and cornices,
# walk-ups with fire escapes and rooftop water towers, and an Empire State- and a Chrysler-like tower rising behind.
# ~2000 (S_bridge): a Brooklyn Bridge-like suspension bridge (gothic stone towers, cable web, necklace lamps)
# over the East River with the lit downtown skyline beyond.
# Run: /opt/blendervenv/bin/python blender/cities_nyc.py  ->  public/models/nyc.glb
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cities_bkit import *

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'models', 'nyc.glb')
YELLOW = '#f2b90f'


def water_tower(b, x, y, z, s=1.0):
    for (dx, dy) in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        b.box(x + dx * 0.9 * s - 0.08, y + dy * 0.9 * s - 0.08, z, x + dx * 0.9 * s + 0.08, y + dy * 0.9 * s + 0.08, z + 1.6 * s, '#2a2a2e', 'Metal')
    b.box(x - 1.2 * s, y - 1.2 * s, z + 1.55 * s, x + 1.2 * s, y + 1.2 * s, z + 1.7 * s, '#3a3a3e', 'Metal')
    b.cyl(x, y, z + 1.7 * s, z + 4.0 * s, 1.15 * s, '#6b4a34', 'Wood', seg=12)
    for k in range(3): b.cyl(x, y, z + (2.1 + k * 0.7) * s, z + (2.17 + k * 0.7) * s, 1.18 * s, '#2a2a2e', 'Metal', seg=12, cap=False)
    b.cone(x, y, z + 4.0 * s, 1.0 * s, 1.25 * s, '#4a3a2e', 'Roof', seg=12)


def fire_escape(b, x0, x1, y, z0, floors, fh):
    blk = '#1c1d22'
    for f in range(floors):
        z = z0 + f * fh
        b.box(x0, y - 1.3, z, x1, y, z + 0.08, blk, 'Metal')
        b.box(x0, y - 1.35, z + 0.95, x1, y - 1.25, z + 1.02, blk, 'Metal')
        for k in range(int((x1 - x0) / 0.5) + 1):
            xx = x0 + k * (x1 - x0) / int((x1 - x0) / 0.5)
            b.box(xx - 0.02, y - 1.33, z, xx + 0.02, y - 1.27, z + 0.98, blk, 'Metal')
        if f < floors - 1:
            b.tube([(x0 + 0.4, y - 0.7, z + 0.1), (x1 - 0.5, y - 0.7, z + fh)], 0.05, blk, 'Metal', seg=4)


def cornice(b, x0, x1, y, z, col):
    b.box(x0 - 0.1, y - 0.7, z, x1 + 0.1, y + 0.2, z + 0.5, col, 'Stone')
    b.box(x0 - 0.2, y - 0.9, z + 0.5, x1 + 0.2, y + 0.2, z + 0.75, col, 'Stone')
    n = int((x1 - x0) / 0.8)
    for k in range(n + 1):
        xx = x0 + (x1 - x0) * k / n
        b.box(xx - 0.08, y - 0.65, z - 0.4, xx + 0.08, y, z, col, 'Stone')


def brownstone(b, x0, w, rnd, floors=4):
    fh = 3.1
    H = 1.6 + floors * fh
    col = hexc(rnd.choice(['#6a4535', '#704a38', '#5e3e30', '#7a5240', '#684838']), 0.05, rnd)
    b.box(x0, 0, 0, x0 + w - 0.05, 12, H, col, 'Stone')
    b.box(x0, -0.1, 0, x0 + w - 0.05, 0.0, 1.6, hexc('#4a3226', 0.05, rnd), 'Stone')
    for f in range(floors):
        z = 1.6 + f * fh
        b.box(x0, -0.12, z - 0.12, x0 + w - 0.05, 0.02, z, hexc('#8a6a54', 0.05, rnd), 'Stone')
        for k in range(3):
            xc = x0 + w * (k + 0.5) / 3
            if f == 0 and k == 0: continue
            hh = 2.2 if f == 0 else 1.9
            b.box(xc - 0.45, -0.08, z + 0.5, xc + 0.45, 0.0, z + 0.5 + hh, win_color(rnd, 0.5), 'Window')
            b.box(xc - 0.6, -0.25, z + 0.55 + hh, xc + 0.6, 0.0, z + 0.8 + hh, hexc('#8a6a54', 0.05, rnd), 'Stone')
    # stoop to the parlour floor, door with a hood, iron railings
    sx = x0 + w / 6
    for s in range(7):
        b.box(sx - 0.8, -4.2 + s * 0.52, 0, sx + 0.8, -3.7 + s * 0.52, 0.25 + s * 0.25, col, 'Stone')
    b.box(sx - 0.9, -0.6, 0, sx + 0.9, 0, 1.75, col, 'Stone')
    b.box(sx - 0.55, -0.1, 1.75, sx + 0.55, 0.0, 4.2, '#2a1a14', 'Wood')
    b.box(sx - 0.8, -0.5, 4.2, sx + 0.8, 0.0, 4.5, hexc('#8a6a54', 0.05, rnd), 'Stone')
    for s in (-1, 1):
        b.tube([(sx + s * 0.85, -4.2, 1.1), (sx + s * 0.85, -0.6, 2.8)], 0.04, '#15161a', 'Metal', seg=4)
    b.box(x0 + 0.2, -2.6, 0, x0 + w - 0.2, -2.5, 1.0, '#15161a', 'Metal')
    cornice(b, x0, x0 + w - 0.05, 0, H, hexc('#3a2a22', 0.1, rnd))
    return H


def walkup(b, x0, w, rnd, floors=6, esc=True):
    fh = 3.0
    H = 1.0 + floors * fh
    col = hexc(rnd.choice(['#8a3e2e', '#7a4a3a', '#9a5a44', '#a0705a', '#6e3a30']), 0.05, rnd)
    b.box(x0, 0, 0, x0 + w - 0.05, 14, H, col, 'Brick')
    b.box(x0, -0.3, 0, x0 + w - 0.05, 0.0, 3.6, '#2a2c30', 'Paint')
    b.box(x0 + 0.4, -0.35, 0.3, x0 + w - 0.45, -0.28, 3.0, win_color(rnd, 0.9), 'Window')
    b.box(x0, -0.6, 3.3, x0 + w - 0.05, -0.2, 3.6, hexc(rnd.choice(['#2a5a3a', '#6a2222', '#22324a']), 0, rnd), 'Paint')
    n = max(3, int(w / 1.9))
    for f in range(1, floors):
        z = 1.0 + f * fh
        for k in range(n):
            xc = x0 + w * (k + 0.5) / n
            b.box(xc - 0.45, -0.08, z + 0.5, xc + 0.45, 0.0, z + 2.3, win_color(rnd, 0.45), 'Window')
            b.box(xc - 0.55, -0.16, z + 0.38, xc + 0.55, 0.0, z + 0.5, '#c8bca8', 'Stone')
    if esc: fire_escape(b, x0 + w * 0.2, x0 + w * 0.8, 0, 1.0 + fh + 0.1, floors - 1, fh)
    cornice(b, x0, x0 + w - 0.05, 0, H, '#5a5048')
    return H


def empire(b, rnd):
    """Stepped art deco tower with a mooring mast (Empire State-like), origin at base centre."""
    st, win = '#c9c2b4', None
    tiers = [(24, 16, 0, 5), (19, 13, 5, 9), (13, 9.5, 9, 36), (10.5, 7.5, 36, 38.5), (8, 6, 38.5, 40.5), (6, 4.6, 40.5, 42.2)]
    for (w, d, z0, z1) in tiers:
        b.box(-w / 2, -d / 2, z0, w / 2, d / 2, z1, hexc(st, 0.02, rnd), 'Stone')
        # vertical window bands on the camera-facing and side faces, split into lit blocks of floors
        nb = max(2, int(w / 1.35))
        for k in range(nb):
            xc = -w / 2 + w * (k + 0.5) / nb
            z = z0 + 0.3
            while z < z1 - 0.4:
                zz = min(z1 - 0.3, z + 2.6 + rnd.random() * 2)
                b.box(xc - 0.3, -d / 2 - 0.06, z, xc + 0.3, -d / 2 + 0.02, zz, win_color(rnd, 0.5), 'Window')
                z = zz + 0.25
        nb = max(2, int(d / 1.35))
        for k in range(nb):
            yc = -d / 2 + d * (k + 0.5) / nb
            z = z0 + 0.3
            while z < z1 - 0.4:
                zz = min(z1 - 0.3, z + 2.6 + rnd.random() * 2)
                b.box(w / 2 - 0.02, yc - 0.3, z, w / 2 + 0.06, yc + 0.3, zz, win_color(rnd, 0.5), 'Window')
                z = zz + 0.25
    # corner wings of the shaft (the chamfered setbacks)
    for s in (-1, 1): b.box(s * 6.5 - 1.2, -3.5, 9, s * 6.5 + 1.2, 3.5, 31, hexc(st, 0.03, rnd), 'Stone')
    # mast: fluted cylinder, lantern, needle with a red aircraft beacon
    b.cyl(0, 0, 42.2, 45.5, 1.5, '#b8b4ac', 'Metal', seg=12, r2=1.2)
    for k in range(8):
        a = k / 8 * math.tau
        b.box(math.cos(a) * 1.45 - 0.1, math.sin(a) * 1.45 - 0.1, 42.2, math.cos(a) * 1.45 + 0.1, math.sin(a) * 1.45 + 0.1, 45.2, '#d0ccc4', 'Metal')
    b.cyl(0, 0, 45.5, 46.8, 1.0, '#fff2c8', 'Lamp', seg=12, r2=0.8)
    b.cyl(0, 0, 46.8, 48.0, 0.8, '#b8b4ac', 'Metal', seg=12, r2=0.3)
    b.cyl(0, 0, 48.0, 53.5, 0.12, '#d8d8dc', 'Metal', seg=5, r2=0.04)
    b.ico(0, 0, 53.6, 0.3, '#ff2a1a', 'Beacon', sub=1)
    # floodlit crown
    b.box(-3.1, -2.4, 41.8, 3.1, -2.3, 42.2, '#fff0c0', 'Lamp')


def chrysler(b, rnd):
    """Art deco tower with a terraced arched steel crown and a needle (Chrysler-like)."""
    brick = '#d8d4cc'
    b.box(-8, -7, 0, 8, 7, 8, brick, 'Stone')
    b.box(-6, -5, 8, 6, 5, 14, brick, 'Stone')
    b.box(-4.2, -4.2, 14, 4.2, 4.2, 30, brick, 'Stone')
    for (w, d, z0, z1) in ((16, 14, 0, 8), (12, 10, 8, 14), (8.4, 8.4, 14, 30)):
        nb = int(w / 1.3)
        for k in range(nb):
            xc = -w / 2 + w * (k + 0.5) / nb
            z = z0 + 0.4
            while z < z1 - 0.5:
                zz = min(z1 - 0.4, z + 2 + rnd.random() * 2)
                b.box(xc - 0.28, -d / 2 - 0.06, z, xc + 0.28, -d / 2 + 0.02, zz, win_color(rnd, 0.5), 'Window')
                z = zz + 0.3
    # dark banding and eagle-corner stubs
    b.box(-4.3, -4.3, 20.5, 4.3, 4.3, 21.0, '#3a3a40', 'Metal')
    for (dx, dy) in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        b.box(dx * 4.3 - 0.4, dy * 4.3 - 0.4, 29.4, dx * 4.3 + 0.4, dy * 4.3 + 0.4, 30.0, '#b8bcc2', 'Metal')
    # crown: five terraces of stacked arches on all four faces, triangular lit windows
    z = 30.0
    for t in range(5):
        hw = 4.0 - t * 0.7
        rise = 2.2 - t * 0.2
        b.box(-hw, -hw, z, hw, hw, z + 0.9, '#c8ccd2', 'Metal')
        # arch plates: semicircles on the -Y and +X faces (the camera sees those)
        seg = 10
        prof = [(hw * math.cos(math.pi * k / seg), z + 0.9 + rise * math.sin(math.pi * k / seg)) for k in range(seg + 1)]
        b.poly_prism(prof, -hw - 0.05, hw + 0.05, '#d4d8de', 'Metal', axis='Y')
        b.poly_prism(prof, -hw - 0.05, hw + 0.05, '#d4d8de', 'Metal', axis='X')
        for k in range(4):
            u = -hw * 0.6 + k * hw * 0.4
            hz = z + 0.9 + rise * math.sin(math.acos(max(-1, min(1, u / hw)))) * 0.75
            b.poly_prism([(u - 0.18, z + 1.0), (u + 0.18, z + 1.0), (u, hz)], -hw - 0.1, -hw - 0.02, '#fff0c8', 'Lamp', axis='Y')
            b.poly_prism([(u - 0.18, z + 1.0), (u + 0.18, z + 1.0), (u, hz)], hw + 0.02, hw + 0.1, '#fff0c8', 'Lamp', axis='X')
        z += 0.9 + rise * 0.6
    b.cyl(0, 0, z, z + 7.5, 0.55, '#dfe3e8', 'Metal', seg=8, r2=0.02, smooth=False)
    b.ico(0, 0, z + 7.3, 0.22, '#ff2a1a', 'Beacon', sub=1)


def tower(b, x, y, w, d, h, rnd, col=None, setbacks=1, cap='flat'):
    col = col or rnd.choice(['#8a8680', '#6c7078', '#9a9284', '#5a6068', '#a8a298', '#4a5260'])
    z = 0
    for s in range(setbacks + 1):
        hh = h * (0.62 if s == 0 and setbacks else (0.38 / setbacks if setbacks else 1))
        b.box(x - w / 2, y - d / 2, z, x + w / 2, y + d / 2, z + hh, hexc(col, 0.04, rnd), 'Stone')
        nb = max(2, int(w / 1.4))
        for k in range(nb):
            xc = x - w / 2 + w * (k + 0.5) / nb
            zz = z + 0.4
            while zz < z + hh - 0.5:
                z2 = min(z + hh - 0.4, zz + 1.6 + rnd.random() * 3)
                b.box(xc - 0.3, y - d / 2 - 0.06, zz, xc + 0.3, y - d / 2 + 0.02, z2, win_color(rnd, 0.45), 'Window')
                zz = z2 + 0.3
        z += hh; w *= 0.72; d *= 0.72
    if cap == 'pyramid': b.hip(x - w / 1.44, y - d / 1.44, x + w / 1.44, y + d / 1.44, z, w * 0.6, '#5a7a6a', 'Metal', over=0)
    if cap == 'mast':
        b.cyl(x, y, z, z + 5, 0.1, '#2a2a2e', 'Metal', seg=4); b.ico(x, y, z + 5.1, 0.2, '#ff2a1a', 'Beacon', sub=0)
    return z


def subway_entrance(b, x, y):
    b.box(x - 1.3, y - 2.5, 0, x + 1.3, y + 2.5, 0.05, '#3a3a3e', 'Concrete')
    for s in (-1, 1):
        b.box(x + s * 1.3 - 0.05, y - 2.5, 0.05, x + s * 1.3 + 0.05, y + 2.5, 1.0, '#1a3a2a', 'Metal')
        b.cyl(x + s * 1.3, y - 2.5, 0, 2.2, 0.06, '#1a3a2a', 'Metal', seg=6)
        b.ico(x + s * 1.3, y - 2.5, 2.35, 0.24, '#5aff8a', 'Lamp', sub=1)
    b.box(x - 1.3, y + 2.45, 0.05, x + 1.3, y + 2.55, 1.0, '#1a3a2a', 'Metal')


def street_lamp(b, x, y, rot=1):
    b.cyl(x, y, 0, 6.5, 0.1, '#3a4a44', 'Metal', seg=6, r2=0.07)
    b.tube([(x, y, 6.4), (x, y - 1.2 * rot, 6.9), (x, y - 2.0 * rot, 6.8)], 0.06, '#3a4a44', 'Metal', seg=4)
    b.box(x - 0.25, y - 2.3 * rot - 0.35, 6.55, x + 0.25, y - 2.3 * rot + 0.35, 6.75, '#fff0c8', 'Lamp')


def midtown(rt):
    rnd = random.Random(12)
    def avenue(b):
        b.box(-50, 11, 0, 16, 19, 0.03, '#35363b', 'Concrete')
        for s in (11, 19): b.box(-50, s - 0.15, 0, 16, s + 0.15, 0.16, '#8a8680', 'Concrete')
        b.box(-50, 19.15, 0, 16, 23.5, 0.14, '#8e8a84', 'Concrete')
        b.box(-50, 11.0, 0, 16, 10.85, 0.14, '#8e8a84', 'Concrete')
        x = -48
        while x < 14: b.box(x, 14.9, 0.03, x + 3, 15.1, 0.045, '#e8e4dc', 'Paint'); x += 6
        for k in range(8): b.box(-14.5 + k * 0.9, 11.2, 0.03, -14.0 + k * 0.9, 18.8, 0.045, '#e8e4dc', 'Paint')
        # yellow cabs (and one bus-grey sedan) in both lanes
        for (x, y, r) in ((-44, 13.0, 0), (-37, 13.1, 0), (-27, 17.0, math.pi), (-9, 13.0, 0), (-2, 17.0, math.pi), (5, 13.0, 0), (-46, 17.0, math.pi), (11, 17.1, math.pi)):
            car(b, x, y, r, YELLOW, rnd, 'cab')
        car(b, -20, 17.0, math.pi, '#2a2c34', rnd, 'sedan')
        subway_entrance(b, -22, 21.2)
        for x in (-46, -32, -18, -2, 12): street_lamp(b, x, 20.5, -1)
        # hot dog cart with a striped umbrella
        b.box(-6.8, 20.4, 0.5, -5.2, 21.4, 1.4, '#c8ccd2', 'Metal'); b.cyl(-6, 20.9, 1.4, 3.0, 0.04, '#888', 'Metal', seg=4)
        b.cone(-6, 20.9, 2.7, 0.6, 1.3, '#2a5ab0', 'Fabric', seg=8)
        # street trees in grates
        for x in (-42, -30, -12, 8): deciduous(b, x, 22.3, 0.9, rnd, ['#5e8b44', '#6a9448'])
    piece('avenue', rt, 0, 0, avenue)

    def row(b):
        x = -48
        k = 0
        while x < 8:
            if k % 4 == 3:
                w = 8 + rnd.random() * 2
                h = walkup(b, x, w, rnd, floors=5)
                water_tower(b, x + w * 0.6, 7, h, 1.1)
            else:
                w = 5.4 + rnd.random() * 0.8
                h = brownstone(b, x, w, rnd, floors=4 if rnd.random() < 0.7 else 5)
                if rnd.random() < 0.25: water_tower(b, x + w / 2, 8, h, 0.8)
            x += w; k += 1
    piece('row', rt, 0, 25, row)

    def walkups(b):
        x = -62
        while x < 14:
            w = 8 + rnd.random() * 4
            h = walkup(b, x, w, rnd, floors=7 + int(rnd.random() * 3))
            water_tower(b, x + w * (0.3 + rnd.random() * 0.4), 6 + rnd.random() * 4, h, 1.2)
            x += w + 0.3

    piece('empire', rt, -44, 118, lambda b: empire(b, rnd)).scale = (0.95, 0.95, 0.95)
    piece('chrysler', rt, -16, 96, lambda b: chrysler(b, rnd)).scale = (0.9, 0.9, 0.9)
    def skyline(b):
        for (x, y, w, h, sb, cap) in ((-38, 6, 10, 20, 1, 'flat'), (-30, 20, 9, 24, 1, 'pyramid'), (2, 6, 10, 22, 2, 'mast'), (10, 26, 10, 26, 1, 'flat'), (-2, 40, 12, 28, 0, 'flat'), (-18, 48, 10, 30, 1, 'flat')):
            tower(b, x, y, w, 9, h, rnd, setbacks=sb, cap=cap)
    piece('skyline12', rt, 0, 80, skyline)


def gothic_tower(b, x, rnd, H=21.0, deck=8.0):
    stone = '#a89a84'
    # pier in the river
    b.box(x - 4.2, -8.2, -3, x + 4.2, 8.2, 0.8, '#8a7e6c', 'Stone')
    Y = [(-7.0, -4.2), (-1.3, 1.3), (4.2, 7.0)]  # three legs across the deck
    spring = 13.0
    for (ya, yb) in Y:
        b.box(x - 3.0, ya, 0.8, x + 3.0, yb, H, hexc(stone, 0.03, rnd), 'Stone')
    # spandrels with pointed arch openings (two, where the roadways pass)
    for (ya, yb) in ((-4.2, -1.3), (1.3, 4.2)):
        w = yb - ya; mid = (ya + yb) / 2
        left = [(ya, spring)] + [(yb + w * math.cos(math.radians(a)), spring + w * math.sin(math.radians(a))) for a in range(170, 119, -10)] + [(mid, spring + 0.866 * w), (mid, H), (ya, H)]
        right = [(yb, spring), (yb, H), (mid, H), (mid, spring + 0.866 * w)] + [(ya + w * math.cos(math.radians(a)), spring + w * math.sin(math.radians(a))) for a in range(60, 9, -10)]
        for poly in (left, right):
            b.poly_prism(poly, x - 3.0, x + 3.0, hexc(stone, 0.02, rnd), 'Stone', axis='X')
    # cornice, cap and saddles
    b.box(x - 3.4, -7.4, H, x + 3.4, 7.4, H + 0.7, '#9a8e7a', 'Stone')
    b.box(x - 3.0, -7.0, H + 0.7, x + 3.0, 7.0, H + 1.6, hexc(stone, 0.02, rnd), 'Stone')
    for (ya, yb) in Y: b.box(x - 3.2, ya - 0.2, 5.0, x + 3.2, yb + 0.2, 5.6, '#9a8e7a', 'Stone')
    # recessed blind panels on the legs
    for (ya, yb) in Y: b.box(x - 3.06, ya + 0.5, 14.5, x - 3.0, yb - 0.5, 19.5, '#8a7e6c', 'Stone')


def parab(xa, za, xb, zb, sag_z, n, y):
    """Points along a cable from (xa, za) to (xb, zb) sagging to sag_z at mid-span."""
    pts = []
    for k in range(n + 1):
        t = k / n
        x = xa + (xb - xa) * t
        base = za + (zb - za) * t
        s = 4 * t * (1 - t)
        pts.append((x, y, base - (min(za, zb) - sag_z) * s if sag_z < min(za, zb) else base))
    return pts


def bridge(rt):
    rnd = random.Random(13)
    T1, T2, A1, A2 = -34.0, 0.0, -48.0, 13.0  # towers and anchorages (x)
    H, DECK = 21.0, 8.0

    def span(b):
        gothic_tower(b, T1, rnd, H, DECK); gothic_tower(b, T2, rnd, H, DECK)
        # anchorages
        for x in (A1, A2):
            b.box(x - 5, -7.5, 0, x + 5, 7.5, DECK + 1.5, '#9a8e7a', 'Stone')
            b.box(x - 5.3, -7.8, DECK + 1.5, x + 5.3, 7.8, DECK + 2.2, '#8a7e6c', 'Stone')
        # deck: road slab with a steel truss on each side
        b.box(A1, -5.6, DECK - 0.8, A2, 5.6, DECK, '#4a4a50', 'Metal')
        b.box(A1, -4.2, DECK, A2, 4.2, DECK + 0.05, '#2e2f34', 'Concrete')
        for yy in (-5.4, 5.4):
            b.box(A1, yy - 0.12, DECK + 1.6, A2, yy + 0.12, DECK + 1.75, '#5a5a60', 'Metal')
            b.box(A1, yy - 0.12, DECK - 0.8, A2, yy + 0.12, DECK - 0.6, '#5a5a60', 'Metal')
            x = A1; k = 0
            while x < A2 - 0.1:
                b.box(x - 0.06, yy - 0.1, DECK - 0.7, x + 0.06, yy + 0.1, DECK + 1.7, '#5a5a60', 'Metal')
                b.tube([(x, yy, DECK - 0.7), (x + 1.6, yy, DECK + 1.65)] if k % 2 == 0 else [(x, yy, DECK + 1.65), (x + 1.6, yy, DECK - 0.7)], 0.05, '#5a5a60', 'Metal', seg=3)
                x += 1.6; k += 1
        # elevated promenade in the middle
        b.box(A1 + 5, -1.1, DECK + 2.0, A2 - 5, 1.1, DECK + 2.15, '#7a6048', 'Wood')
        # main cables (two per side) + suspenders + the diagonal stay web
        for yy in (-5.6, -5.2, 5.2, 5.6):
            main = parab(T1, H + 1.2, T2, H + 1.2, DECK + 1.9, 28, yy)
            b.tube(main, 0.14, '#6a6e74', 'Metal', seg=5)
            b.tube(parab(A1, DECK + 2.0, T1, H + 1.2, 0, 10, yy), 0.14, '#6a6e74', 'Metal', seg=5)
            b.tube(parab(T2, H + 1.2, A2, DECK + 2.0, 0, 10, yy), 0.14, '#6a6e74', 'Metal', seg=5)
            if abs(yy) > 5.4: continue
            for p in main[1:-1]: b.tube([(p[0], yy, p[2]), (p[0], yy, DECK + 1.7)], 0.025, '#6a6e74', 'Metal', seg=3)
            for (tx, sgn) in ((T1, 1), (T2, -1), (T1, -1), (T2, 1)):
                for k in range(1, 7):
                    xe = tx + sgn * k * 2.8
                    if xe < A1 + 3 or xe > A2 - 3: continue
                    b.tube([(tx + sgn * 2.8, yy, H - 0.5), (xe, yy, DECK + 1.7)], 0.025, '#7a7e84', 'Metal', seg=3)
            # necklace lamps along the cables
            for p in main[::2]: b.ico(p[0], yy - 0.15 * (1 if yy < 0 else -1), p[2] + 0.2, 0.22, '#fff0c8', 'Lamp', sub=0)
        # road lamps
        for k in range(12):
            x = A1 + 4 + k * (A2 - A1 - 8) / 11
            b.ico(x, -4.3, DECK + 1.9, 0.18, '#ffd9a0', 'Lamp', sub=0)
    piece('bridge', rt, 0, 48, span)

    def river(b):
        b.box(-50, 22, -0.4, 18, 118, 0.02, '#26394a', 'Water')
        b.box(-52, 18, -0.4, -50, 118, 0.9, '#6a6660', 'Stone'); b.box(18, 18, -0.4, 20, 118, 0.9, '#6a6660', 'Stone')
        # granite embankment with railing and lamps on the near shore
        b.box(-52, 18, 0, 20, 22.3, 0.9, '#6a6660', 'Stone')
        b.box(-52, 21.9, -0.5, 20, 22.3, 0.9, '#5a5650', 'Stone')
        b.box(-52, 21.8, 1.9, 20, 21.95, 2.0, '#1c1d22', 'Metal')
        x = -51
        while x < 19: b.box(x - 0.04, 21.8, 0.9, x + 0.04, 21.95, 1.95, '#1c1d22', 'Metal'); x += 1.2
        for x in range(-48, 18, 11):
            b.cyl(x, 20.5, 0.9, 5.5, 0.08, '#1c1d22', 'Metal', seg=6)
            b.ico(x, 20.5, 5.7, 0.3, '#fff0c8', 'Lamp', sub=1)
        for x in range(-44, 16, 14): b.box(x - 1, 19.0, 0.9, x + 1, 19.5, 1.35, '#5b3f2c', 'Wood')
        for x in (-42, -20, 8): deciduous(b, x, 16.0, 1.0, rnd, ['#5e8b44', '#4f7a3a'])
        # a tug and a ferry on the river
        b.box(-14, 70, 0, -6, 73, 1.4, '#8a2a22', 'Paint'); b.box(-12, 70.5, 1.4, -8.5, 72.5, 3.2, '#e8e4d8', 'Paint')
        b.box(-11.5, 70.4, 2.3, -9, 70.5, 2.9, win_color(rnd, 1), 'Window')
        b.cyl(-7.5, 71.5, 1.4, 4.6, 0.35, '#1a1a1a', 'Metal', seg=8)
        b.box(-46, 84, 0, -30, 90, 1.6, '#e8a020', 'Paint'); b.box(-44, 84.5, 1.6, -32, 89.5, 3.6, '#e8a020', 'Paint')
        for k in range(8): b.box(-43.5 + k * 1.4, 84.4, 2.1, -96.7 + k * 1.4, 84.5, 3.1, win_color(rnd, 0.9), 'Window')
    piece('river', rt, 0, 0, river)

    def downtown(b):
        # lower Manhattan across the water: dense towers of assorted heights, many with lit windows
        x = -52
        while x < 18:
            w = 6 + rnd.random() * 7
            h = 12 + rnd.random() * 20 * (1 - abs(x + 16) / 60)
            tower(b, x + w / 2, rnd.random() * 12, w, 8, h, rnd, setbacks=int(rnd.random() * 2), cap=rnd.choice(['flat', 'flat', 'pyramid', 'mast']))
            x += w + 0.8
        # a pair of tall twin towers (the skyline as it stood in 2000)
        for dx in (-26, -18):
            tower(b, dx, 20, 6.5, 6.5, 44, rnd, col='#a8acb2', setbacks=0)
        b.cyl(-18, 20, 44, 52, 0.18, '#d8d8dc', 'Metal', seg=5); b.ico(-18, 20, 52.1, 0.25, '#ff2a1a', 'Beacon', sub=0)
    piece('downtown', rt, 0, 122, downtown)


reset()
for name, fn in (('S_midtown', midtown), ('S_bridge', bridge)):
    rt = root(name)
    fn(rt)
if '--preview' in sys.argv:
    which = sys.argv[sys.argv.index('--preview') + 1]
    for o in list(bpy.data.objects):
        top = o
        while top.parent: top = top.parent
        if top.name != which: o.hide_render = True
    preview(os.path.join(os.environ.get('PREV', '/tmp'), f'{which}.png'), cam_loc=(40, -60, 18), target=(-40, 80, 18), lens=28)
else:
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    export(OUT)
