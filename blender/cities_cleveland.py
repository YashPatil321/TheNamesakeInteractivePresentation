# Cleveland, Ohio in the 1990s (rain): a steel mill on the near bank (sheds, blast furnace with hot stoves, stacks,
# ore bridge), the Cuyahoga winding away from the line under a vertical-lift bridge and a high-level arch bridge,
# and downtown beyond with a Terminal Tower-like skyscraper (stepped shaft, colonnaded crown, lantern and mast).
# Run: /opt/blendervenv/bin/python blender/cities_cleveland.py  ->  public/models/cleveland.glb
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cities_bkit import *

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'models', 'cleveland.glb')
RUST = '#7a4a34'
STEEL = '#5a5e64'

# river centre line (x at a given Blender y): runs away from the camera, bending left
def river_x(y):
    return -19 - 4 * math.sin((y - 20) / 30)


def mill(rt, rnd):
    def f(b):
        # long casting sheds with monitor roofs, corrugated walls
        for (x0, x1, y0, y1, h) in ((-6, 15, 15, 25, 7.5), (-2, 15, 27, 35, 10.0)):
            b.box(x0, y0, 0, x1, y1, h, hexc('#6a6058', 0.04, rnd), 'Metal')
            k = x0
            while k < x1 - 0.1:
                b.box(k, y0 - 0.08, 0.2, k + 0.12, y0, h, '#4a4440', 'Metal'); k += 1.2
            b.gable(x0, y0, x1, y1, h, 2.2, '#4a4e54', 'Roof', along='X', over=0.4)
            b.box(x0, (y0 + y1) / 2 - 1.2, h + 2.0, x1, (y0 + y1) / 2 + 1.2, h + 3.0, '#3a3e44', 'Metal')
            b.gable(x0, (y0 + y1) / 2 - 1.4, x1, (y0 + y1) / 2 + 1.4, h + 3.0, 0.8, '#4a4e54', 'Roof', along='X', over=0.2, thick=0.1)
            for k in range(int((x1 - x0) / 3)):
                xc = x0 + 1.5 + k * 3
                b.box(xc - 0.9, y0 - 0.1, h * 0.55, xc + 0.9, y0 - 0.02, h * 0.85, '#ffb060' if k % 3 == 0 else '#3a2e28', 'Glow' if k % 3 == 0 else 'Window')
        # the shed's open door with the pour glowing inside
        b.box(0, 14.9, 0.2, 5, 15.0, 5.0, '#ff8a2a', 'Glow')
        # blast furnace: shell, bustle pipe, downcomers, top rigging
        FX, FY = -4, 44
        b.cyl(FX, FY, 0, 4, 4.2, RUST, 'Metal', seg=14)
        b.cyl(FX, FY, 4, 16, 3.6, '#6a3e2e', 'Metal', seg=14, r2=2.6)
        b.cyl(FX, FY, 16, 19, 2.6, RUST, 'Metal', seg=12, r2=1.6)
        b.cyl(FX, FY, 5.5, 6.3, 4.4, '#4a3a30', 'Metal', seg=14, cap=False)
        for k in range(4):
            a = k / 4 * math.tau + 0.4
            b.tube([(FX + math.cos(a) * 1.5, FY + math.sin(a) * 1.5, 19), (FX + math.cos(a) * 2.2, FY + math.sin(a) * 2.2, 24), (FX + math.cos(a) * 5.5, FY + math.sin(a) * 5.5, 22), (FX + math.cos(a) * 6, FY + math.sin(a) * 6, 4)], 0.45, '#5a3a2a', 'Metal', seg=6)
        for (dx, dy) in ((-2, -2), (2, -2), (-2, 2), (2, 2)):
            b.tube([(FX + dx * 2.2, FY + dy * 2.2, 0), (FX + dx * 0.5, FY + dy * 0.5, 27)], 0.18, '#3a3a3e', 'Metal', seg=4)
        b.box(FX - 1.5, FY - 1.5, 26, FX + 1.5, FY + 1.5, 28, '#3a3a3e', 'Metal')
        b.box(FX - 3, FY - 4.4, 1.8, FX + 3, FY - 4.2, 3.2, '#ff7a1a', 'Glow')  # tap hole glow
        # skip incline
        b.tube([(FX + 16, FY + 6, 0), (FX + 1.5, FY + 1, 24)], 0.35, STEEL, 'Metal', seg=4)
        b.tube([(FX + 16, FY + 7, 0), (FX + 1.5, FY + 2, 24)], 0.35, STEEL, 'Metal', seg=4)
        # hot-blast stoves with domes
        for k in range(3):
            sx = FX + 6 + k * 5.0
            b.cyl(sx, FY + 12, 0, 17, 2.2, '#5a5a5e', 'Metal', seg=12)
            b.ico(sx, FY + 12, 17, 2.2, '#5a5a5e', 'Metal', sub=2, sz=0.6)
            for z in (4, 9, 14): b.cyl(sx, FY + 12, z, z + 0.25, 2.28, '#3a3a3e', 'Metal', seg=12, cap=False)
        b.tube([(FX + 16, FY + 9.6, 6), (FX + 1, FY + 9.6, 6), (FX + 1, FY + 3.4, 6)], 0.6, '#4a4a4e', 'Metal', seg=8)
        # stacks with glowing tops (smoke is added by the scenery)
        for (x, y, h) in ((5, 39, 26), (9, 39, 24), (13, 39, 26)):
            b.cyl(x, y, 0, h, 1.2, '#4a3a34', 'Brick', seg=12, r2=0.9)
            for z in (h * 0.55, h - 1.5): b.cyl(x, y, z, z + 0.8, 0.98 if z > h * 0.6 else 1.08, '#d8d4cc', 'Paint', seg=12, cap=False)
            b.cyl(x, y, h - 0.1, h + 0.1, 0.8, '#ff8a3a', 'Glow', seg=12)
        # gas holder and ore piles
        GX, GY = 10, 66
        b.cyl(GX, GY, 0, 12, 5.5, '#6a6e74', 'Metal', seg=16)
        for k in range(16):
            a = k / 16 * math.tau
            b.box(GX + math.cos(a) * 5.55 - 0.1, GY + math.sin(a) * 5.55 - 0.1, 0, GX + math.cos(a) * 5.55 + 0.1, GY + math.sin(a) * 5.55 + 0.1, 12.5, '#4a4e54', 'Metal')
        b.cyl(GX, GY, 12, 12.8, 5.6, '#5a5e64', 'Metal', seg=16, r2=4.5)
        for (x, y, r) in ((-10, 20, 3.2), (-9, 30, 2.8)):
            b.cone(x, y, 0, r * 0.9, r, hexc('#6a3a26', 0.1, rnd), 'Ground', seg=10, smooth=False)
        # ore bridge gantry along the river bank
        for x in (-26, -6):
            for y in (20, 34): b.box(x - 0.3, y - 0.3, 0, x + 0.3, y + 0.3, 14, STEEL, 'Metal')
            b.tube([(x, 20, 0), (x, 34, 14)], 0.15, STEEL, 'Metal', seg=4)
        for y in (20, 34): b.box(-29, y - 0.6, 14, -3, y + 0.6, 15.5, '#8a6a2a', 'Metal')
        b.box(-20, 19, 15.5, -17, 35, 17, '#b8902a', 'Metal')
        # rail siding with hopper cars
        for k in range(3):
            x = -2 + k * 5.4
            b.box(x, 9.4, 0.5, x + 4.8, 11.4, 2.8, '#4a2a22', 'Metal')
            b.box(x - 0.2, 9.3, 2.6, x + 5.0, 11.5, 2.8, '#3a2018', 'Metal')
            b.ico(x + 2.4, 10.4, 2.9, 1.1, '#2a2622', 'Ground', sub=1, sz=0.35)
    piece('mill', rt, 0, 0, f)


def river(rt, rnd):
    def f(b):
        # the river as a strip of quads following the bend, with sheet-pile banks
        n = 22
        prev = None
        for k in range(n + 1):
            y = 16 + k * 4.5
            cx = river_x(y); hw = 5.0 + k * 0.05
            if prev:
                py, pcx, phw = prev
                bm = b.bm
                vs = [bm.verts.new(p) for p in ((pcx - phw, py, -0.35), (pcx + phw, py, -0.35), (cx + hw, y, -0.35), (cx - hw, y, -0.35))]
                fc = bm.faces.new(vs)
                b._finish(None, '#34424c', 'Water', faces={fc})
                for s in (-1, 1):
                    ws = [bm.verts.new(p) for p in ((pcx + s * phw, py, -1.2), (cx + s * hw, y, -1.2), (cx + s * hw, y, 0.4), (pcx + s * phw, py, 0.4))]
                    fw = bm.faces.new(ws if s > 0 else ws[::-1])
                    b._finish(None, '#4a4238', 'Stone', faces={fw})
                    wt = [bm.verts.new(p) for p in ((pcx + s * phw, py, 0.4), (cx + s * hw, y, 0.4), (cx + s * (hw + 1.2), y, 0.02), (pcx + s * (phw + 1.2), py, 0.02))]
                    ft = bm.faces.new(wt if s < 0 else wt[::-1])
                    b._finish(None, '#5a5248', 'Stone', faces={ft})
            prev = (y, cx, hw)
        # a lake freighter moored at the bank
        y0 = 56; cx = river_x(y0) + 3.0
        b.box(cx - 1.6, y0, -0.4, cx + 1.6, y0 + 26, 2.2, '#6a2a22', 'Paint')
        b.box(cx - 1.65, y0, 2.2, cx + 1.65, y0 + 26, 2.5, '#2a2a2e', 'Paint')
        b.box(cx - 1.4, y0 + 22, 2.5, cx + 1.4, y0 + 25.5, 6.0, '#e8e4d8', 'Paint')
        b.box(cx - 1.45, y0 + 22.2, 4.6, cx + 1.45, y0 + 22.3, 5.4, win_color(rnd, 1), 'Window')
        b.box(cx - 1.4, y0 + 0.5, 2.5, cx + 1.4, y0 + 3, 4.8, '#e8e4d8', 'Paint')
        b.cyl(cx, y0 + 24, 6, 7.6, 0.45, '#2a2a2e', 'Metal', seg=8)
    piece('river', rt, 0, 0, f)


def lift_bridge(rt, rnd):
    """Vertical-lift railroad bridge: two lattice towers either side of the river, a truss span raised between them."""
    def f(b):
        y = 46
        cx = river_x(y)
        L, R = cx - 8, cx + 8
        for x in (L, R):
            for (dx, dy) in ((-1.2, -1.6), (1.2, -1.6), (-1.2, 1.6), (1.2, 1.6)):
                b.box(x + dx - 0.2, y + dy - 0.2, 0, x + dx + 0.2, y + dy + 0.2, 26, '#4a4e56', 'Metal')
            for z in range(0, 26, 3):
                for s in (-1, 1):
                    b.tube([(x - 1.2, y + s * 1.6, z), (x + 1.2, y + s * 1.6, z + 3)], 0.07, '#4a4e56', 'Metal', seg=3)
                    b.tube([(x + s * 1.2, y - 1.6, z), (x + s * 1.2, y + 1.6, z + 3)], 0.07, '#4a4e56', 'Metal', seg=3)
            b.box(x - 1.8, y - 2.2, 26, x + 1.8, y + 2.2, 27.6, '#3a3e44', 'Metal')
            b.cyl(x, 26.8, y - 2.4, y + 2.4, 1.4, '#2a2c30', 'Metal', seg=12, axis='Y')
            b.box(x - 1.6, y - 1.8, 0, x + 1.6, y + 1.8, 1.2, '#6a6660', 'Concrete')
            b.ico(x, y, 27.9, 0.25, '#ff2a1a', 'Beacon', sub=0)
        # raised span (Warren truss)
        z0, z1 = 16.0, 20.0
        for s in (-1, 1):
            b.box(L + 1.4, y + s * 1.6 - 0.15, z0, R - 1.4, y + s * 1.6 + 0.15, z0 + 0.4, '#5a5e66', 'Metal')
            b.box(L + 1.4, y + s * 1.6 - 0.15, z1 - 0.4, R - 1.4, y + s * 1.6 + 0.15, z1, '#5a5e66', 'Metal')
            n = 8
            for k in range(n):
                xa = L + 1.4 + (R - L - 2.8) * k / n; xb = L + 1.4 + (R - L - 2.8) * (k + 1) / n
                b.tube([(xa, y + s * 1.6, z0), ((xa + xb) / 2, y + s * 1.6, z1)], 0.12, '#5a5e66', 'Metal', seg=4)
                b.tube([((xa + xb) / 2, y + s * 1.6, z1), (xb, y + s * 1.6, z0)], 0.12, '#5a5e66', 'Metal', seg=4)
        b.box(L + 1.4, y - 1.6, z0, R - 1.4, y + 1.6, z0 + 0.25, '#3a3e44', 'Metal')
        # counterweight cables
        for x in (L, R):
            for s in (-1, 1): b.tube([(x + (1 if x == L else -1) * 1.2, y + s * 1.6, 26.5), (x + (1 if x == L else -1) * 1.4, y + s * 1.6, z1)], 0.04, '#1a1a1e', 'Metal', seg=3)
        # approach tracks on trestles
        for (xa, xb) in ((L - 6, L), (R, R + 8)):
            b.box(xa, y - 1.4, 6.0, xb, y + 1.4, 6.6, '#4a4e56', 'Metal')
            x = xa
            while x <= xb: b.box(x - 0.3, y - 1.2, 0, x + 0.3, y + 1.2, 6.0, '#5a5e66', 'Metal'); x += 3.5
    piece('liftbridge', rt, 0, 0, f)


def arch_bridge(rt, rnd):
    """High-level concrete bridge on open-spandrel arches (Detroit-Superior / Hope Memorial-like), with pylons."""
    def f(b):
        y = 84
        cx = river_x(y)
        X0, X1 = cx - 12, cx + 30
        DZ = 13.0
        conc = '#b8b0a2'
        b.box(X0, y - 3.2, DZ, X1, y + 3.2, DZ + 1.1, conc, 'Concrete')
        b.box(X0, y - 3.4, DZ + 1.1, X1, y - 3.1, DZ + 2.0, '#a8a092', 'Concrete')
        b.box(X0, y + 3.1, DZ + 1.1, X1, y + 3.4, DZ + 2.0, '#a8a092', 'Concrete')
        spans = [(X0, cx - 6), (cx - 6, cx + 12), (cx + 12, X1)]
        for (a, c) in spans:
            w = c - a
            rise = min(DZ - 2, w * 0.45)
            seg = 14
            for k in range(seg):
                t0, t1 = k / seg, (k + 1) / seg
                xa, xb = a + w * t0, a + w * t1
                za, zb = rise * math.sin(math.pi * t0), rise * math.sin(math.pi * t1)
                for s in (-2.2, 2.2):
                    b.poly_prism([(xa, za), (xb, zb), (xb, zb + 0.9), (xa, za + 0.9)], y + s - 0.5, y + s + 0.5, conc, 'Concrete', axis='Y')
                # spandrel columns
                if k % 2 == 0:
                    for s in (-2.2, 2.2): b.box(xa - 0.2, y + s - 0.3, za + 0.9, xa + 0.2, y + s + 0.3, DZ, conc, 'Concrete')
            b.box(a - 1.0, y - 3.4, -1, a + 1.0, y + 3.4, DZ, '#a8a092', 'Concrete')
        b.box(X1 - 1.0, y - 3.4, -1, X1 + 1.0, y + 3.4, DZ, '#a8a092', 'Concrete')
        # art deco pylons at the ends, lamp posts along the deck
        for x in (X0 + 1, X1 - 1):
            for s in (-1, 1):
                b.box(x - 0.8, y + s * 3.4 - 0.8, DZ + 1.1, x + 0.8, y + s * 3.4 + 0.8, DZ + 6.5, '#c8c0b0', 'Stone')
                b.box(x - 1.0, y + s * 3.4 - 1.0, DZ + 6.5, x + 1.0, y + s * 3.4 + 1.0, DZ + 7.0, '#b8b0a0', 'Stone')
        for k in range(10):
            x = X0 + 3 + k * (X1 - X0 - 6) / 9
            b.cyl(x, y - 3.25, DZ + 2.0, DZ + 5.0, 0.07, '#2a2a2e', 'Metal', seg=4)
            b.ico(x, y - 3.25, DZ + 5.1, 0.2, '#ffd9a0', 'Lamp', sub=0)
        # traffic
        for (x, c) in ((X0 + 10, '#8a2a22'), (cx, '#2a3a5a'), (X1 - 12, '#c8c0a8')): car(b, x, y - 1.2, 0, c, rnd)
    piece('archbridge', rt, 0, 0, f)


def downtown(rt, rnd):
    def terminal(b):
        stone = '#c8bca2'
        # Tower City base block
        b.box(-16, -7, 0, 16, 7, 9, hexc('#b8ac92', 0.02, rnd), 'Stone')
        for k in range(14):
            xc = -15 + k * 2.3
            for zc in (2.5, 6.0): b.box(xc - 0.55, -7.08, zc - 1.1, xc + 0.55, -7.0, zc + 1.1, win_color(rnd, 0.5), 'Window')
        b.box(-16.3, -7.3, 9, 16.3, 7.3, 9.6, '#a89c84', 'Stone')
        # shaft with piers
        b.box(-6, -6, 9.6, 6, 6, 36, hexc(stone, 0.02, rnd), 'Stone')
        for k in range(9):
            xc = -5.1 + k * 1.275
            b.box(xc - 0.18, -6.12, 10, xc + 0.18, -5.95, 35.5, '#d8ccb2', 'Stone')
            if k < 8:
                z = 10.4
                while z < 35.2:
                    zz = min(35.2, z + 2 + rnd.random() * 3)
                    b.box(xc + 0.22, -6.06, z, xc + 1.05, -5.98, zz, win_color(rnd, 0.5), 'Window'); z = zz + 0.3
        for k in range(9):
            yc = -5.1 + k * 1.275
            if k < 8:
                z = 10.4
                while z < 35.2:
                    zz = min(35.2, z + 2 + rnd.random() * 3)
                    b.box(5.98, yc + 0.22, z, 6.06, yc + 1.05, zz, win_color(rnd, 0.5), 'Window'); z = zz + 0.3
        # setbacks with corner turrets
        b.box(-4.6, -4.6, 36, 4.6, 4.6, 40, stone, 'Stone')
        for (dx, dy) in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
            b.box(dx * 5.2 - 0.7, dy * 5.2 - 0.7, 36, dx * 5.2 + 0.7, dy * 5.2 + 0.7, 38.2, stone, 'Stone')
            b.cone(dx * 5.2, dy * 5.2, 38.2, 1.2, 0.7, '#a89c84', 'Stone', seg=4)
        # colonnaded drum (tempietto)
        b.cyl(0, 0, 40, 40.6, 4.2, '#b8ac92', 'Stone', seg=16)
        b.cyl(0, 0, 40.6, 45.0, 2.8, '#d8ccb2', 'Lamp', seg=16)
        for k in range(12):
            a = k / 12 * math.tau
            b.cyl(math.cos(a) * 3.6, math.sin(a) * 3.6, 40.6, 45.0, 0.26, stone, 'Stone', seg=6)
        b.cyl(0, 0, 45, 45.8, 4.1, '#b8ac92', 'Stone', seg=16)
        b.cyl(0, 0, 45.8, 48.2, 2.6, stone, 'Stone', seg=16, r2=2.0)
        b.cyl(0, 0, 48.2, 50.2, 1.9, '#a89c84', 'Stone', seg=12, r2=0.9)
        b.cyl(0, 0, 50.2, 51.6, 0.7, '#fff0c0', 'Lamp', seg=10, r2=0.5)
        b.cyl(0, 0, 51.6, 56.5, 0.1, '#d8d8dc', 'Metal', seg=5, r2=0.04)
        b.ico(0, 0, 56.6, 0.28, '#ff2a1a', 'Beacon', sub=1)
    piece('terminal', rt, -14, 112, terminal).scale = (0.8, 0.8, 0.8)

    def skyline(b):
        # Key Tower-like: tall, pyramid-capped with a spire
        kx, ky = 8, 132
        b.box(kx - 5, ky - 5, 0, kx + 5, ky + 5, 44, '#a8a49a', 'Stone')
        for k in range(7):
            xc = kx - 4.3 + k * 1.43
            b.box(xc - 0.35, ky - 5.06, 1, xc + 0.35, ky - 4.98, 43, win_color(rnd, 0.4), 'Window')
        b.box(kx - 3.8, ky - 3.8, 44, kx + 3.8, ky + 3.8, 48, '#a8a49a', 'Stone')
        b.hip(kx - 3.8, ky - 3.8, kx + 3.8, ky + 3.8, 48, 6, '#8a8a8c', 'Metal', over=0)
        b.cyl(kx, ky, 54, 60, 0.12, '#d8d8dc', 'Metal', seg=4); b.ico(kx, ky, 60.1, 0.25, '#ff2a1a', 'Beacon', sub=0)
        for (x, y, w, d, h, col) in ((-28, 128, 10, 9, 26, '#6a6e76'), (6, 104, 12, 10, 24, '#5a6068'), (-2, 118, 9, 9, 30, '#4a5260'),
                                     (14, 118, 10, 9, 20, '#8a8478'), (-24, 100, 8, 8, 16, '#7a7068')):
            b.box(x - w / 2, y - d / 2, 0, x + w / 2, y + d / 2, h, hexc(col, 0.04, rnd), 'Stone')
            nb = int(w / 1.4)
            for k in range(nb):
                xc = x - w / 2 + w * (k + 0.5) / nb
                z = 0.5
                while z < h - 0.6:
                    zz = min(h - 0.4, z + 1.5 + rnd.random() * 3)
                    b.box(xc - 0.3, y - d / 2 - 0.06, z, xc + 0.3, y - d / 2 + 0.02, zz, win_color(rnd, 0.45), 'Window'); z = zz + 0.3
            b.box(x - w / 2 - 0.2, y - d / 2 - 0.2, h, x + w / 2 + 0.2, y + d / 2 + 0.2, h + 0.5, '#3a3a3e', 'Metal')
        # warehouses (the Flats) on the far bank
        for k in range(4):
            x = -8 + k * 7.0 + rnd.random() * 1.5
            y = 94 + rnd.random() * 3
            if abs(x - river_x(y)) < 8: continue
            h = 7 + rnd.random() * 6
            b.box(x - 3.2, y - 4, 0, x + 3.2, y + 4, h, hexc(rnd.choice(['#7a4a3a', '#8a5a44', '#6a4a3e']), 0.05, rnd), 'Brick')
            for zc in range(2, int(h) - 1, 3):
                for j in range(3): b.box(x - 2.4 + j * 1.8, y - 4.08, zc, x - 1.6 + j * 1.8, y - 4.0, zc + 1.6, win_color(rnd, 0.4), 'Window')
    piece('skyline', rt, 0, 0, skyline)


reset()
rt = root('S_cleveland')
rnd = random.Random(11)
mill(rt, rnd); river(rt, rnd); lift_bridge(rt, rnd); arch_bridge(rt, rnd); downtown(rt, rnd)
if '--preview' in sys.argv:
    preview(os.path.join(os.environ.get('PREV', '/tmp'), 'S_cleveland.png'), cam_loc=(40, -60, 22), target=(-40, 70, 14), lens=28)
else:
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    export(OUT)
