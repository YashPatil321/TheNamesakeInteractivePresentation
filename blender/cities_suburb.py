# Pemberton Road landmarks: elementary school (1973), cemetery + the Gangulis' house (1970s),
# the family house in autumn (1982), the high school (1985), the house on Christmas Eve (2000).
# Run: /opt/blendervenv/bin/python blender/cities_suburb.py  ->  public/models/suburb.glb
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cities_bkit import *

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'models', 'suburb.glb')
AUTUMN = ['#c8541e', '#d9782a', '#e0a030', '#b8401e', '#c96a26', '#9a3a1c', '#d8b040']
SUMMER = ['#4f7a3a', '#5e8b44', '#456e37', '#6a9448']


def clapboard(b, x0, y0, x1, y1, z0, z1, col, rnd, step=0.34):
    z = z0; k = 0
    while z < z1 - 1e-3:
        e = 0.035 if k % 2 == 0 else 0.0
        zz = min(z1, z + step)
        b.box(x0 - e, y0 - e, z, x1 + e, y1 + e, zz, hexc(col, 0.03, rnd) if k % 2 else col, 'Clapboard')
        z = zz; k += 1


def colonial(b, rnd, wall='#e9e4d8', roof='#3f4550', shutter='#2f4a3a', door='#7a2a22', snow=False, lit=0.35,
             lights=False, garage=True, porch=True, wide=10.0):
    """Two-storey New England colonial facing -Y, centred on x = 0, front wall at y = 0."""
    W, D, H = wide, 7.5, 5.8
    x0, x1, y0, y1 = -W / 2, W / 2, 0.0, D
    b.box(x0 - 0.2, y0 - 0.2, 0, x1 + 0.2, y1 + 0.2, 0.55, '#8a847a', 'Stone')  # foundation
    clapboard(b, x0, y0, x1, y1, 0.55, H, wall, rnd)
    # corner boards + frieze
    for x in (x0, x1):
        for y in (y0, y1): b.box(x - 0.12, y - 0.12, 0.5, x + 0.12, y + 0.12, H, '#f4f1ea', 'Trim')
    b.box(x0 - 0.1, y0 - 0.1, H - 0.35, x1 + 0.1, y1 + 0.1, H, '#f4f1ea', 'Trim')
    roofc = '#eef2f7' if snow else roof
    b.gable(x0, y0, x1, y1, H, 3.1, roofc, 'Snow' if snow else 'Roof', along='X', over=0.45)
    b.gable_wall(x0 + 0.02, y0, x1 - 0.02, y1, H, 3.05, wall, 'Clapboard', along='X')
    # chimney
    b.box(x1 - 1.6, 3.2, 0, x1 - 0.6, 4.2, H + 4.2, '#7a3d2e', 'Brick')
    b.box(x1 - 1.7, 3.1, H + 4.0, x1 - 0.5, 4.3, H + 4.3, '#6a3326', 'Brick')
    # front windows with shutters: 2 rows x 4 (door in the middle below)
    for row, zc in ((0, 1.9), (1, 4.3)):
        for k, xc in enumerate((-3.6, -1.5, 1.5, 3.6)):
            c = win_color(rnd, lit)
            b.box(xc - 0.55, -0.1, zc - 0.8, xc + 0.55, 0.0, zc + 0.8, c, 'Window')
            b.box(xc - 0.68, -0.16, zc - 0.92, xc + 0.68, -0.02, zc - 0.82, '#f4f1ea', 'Trim')
            b.box(xc - 0.68, -0.16, zc + 0.82, xc + 0.68, -0.02, zc + 0.95, '#f4f1ea', 'Trim')
            b.box(xc - 0.02, -0.13, zc - 0.8, xc + 0.02, -0.03, zc + 0.8, '#f4f1ea', 'Trim')  # muntin
            b.box(xc - 0.55, -0.13, zc - 0.02, xc + 0.55, -0.03, zc + 0.02, '#f4f1ea', 'Trim')
            for s in (-1, 1):
                b.box(xc + s * 0.62 - 0.22, -0.18, zc - 0.85, xc + s * 0.62 + 0.22, -0.06, zc + 0.85, shutter, 'Paint')
    # centre upstairs window + door
    b.box(-0.5, -0.1, 3.6, 0.5, 0.0, 5.0, win_color(rnd, lit), 'Window')
    b.box(-0.65, -0.14, 0.55, 0.65, -0.02, 2.75, door, 'Paint')
    b.box(-0.95, -0.2, 0.55, -0.7, -0.02, 2.9, '#f4f1ea', 'Trim'); b.box(0.7, -0.2, 0.55, 0.95, -0.02, 2.9, '#f4f1ea', 'Trim')
    b.box(-1.1, -0.3, 2.85, 1.1, -0.02, 3.05, '#f4f1ea', 'Trim')
    b.gable(-1.1, -0.35, 1.1, -0.05, 3.05, 0.45, '#f4f1ea', 'Trim', along='Y', over=0.05, thick=0.08)
    # side windows
    for x in (x0, x1):
        for zc in (1.9, 4.3):
            for yc in (2.0, 5.5):
                b.box(x - 0.05, yc - 0.5, zc - 0.75, x + 0.05, yc + 0.5, zc + 0.75, win_color(rnd, lit), 'Window')
        b.box(x - 0.05, 3.2, H + 0.6, x + 0.05, 4.2, H + 1.8, win_color(rnd, lit), 'Window')
    # dormers on the front slope
    for xc in (-2.6, 2.6):
        yd = 1.1
        b.box(xc - 0.85, yd - 0.2, H + 0.2, xc + 0.85, yd + 1.8, H + 1.9, wall, 'Clapboard')
        b.box(xc - 0.5, yd - 0.26, H + 0.5, xc + 0.5, yd - 0.18, H + 1.6, win_color(rnd, lit), 'Window')
        b.gable(xc - 0.85, yd - 0.2, xc + 0.85, yd + 1.8, H + 1.9, 0.8, roofc, 'Snow' if snow else 'Roof', along='Y', over=0.18, thick=0.12)
    # porch
    if porch:
        b.box(-3.0, -2.6, 0, 3.0, 0, 0.55, '#a8a39a', 'Stone')
        for s in range(3): b.box(-1.0, -3.0 - s * 0.35, 0, 1.0, -2.6, 0.45 - s * 0.15, '#b0aaa0', 'Stone')
        for xc in (-2.8, -1.0, 1.0, 2.8): b.cyl(xc, -2.4, 0.55, 3.1, 0.13, '#f4f1ea', 'Trim', seg=8)
        b.box(-3.2, -2.75, 3.1, 3.2, 0.0, 3.3, '#f4f1ea', 'Trim')
        b.poly_prism([(-2.95, 3.28), (0.02, 3.28), (0.02, 3.9), (-2.95, 3.45)], -3.35, 3.35, '#eef2f7' if snow else roof, 'Snow' if snow else 'Roof', axis='X')
        for xc in [-2.8 + k * 0.4 for k in range(15)]:
            if abs(xc) > 1.0: b.box(xc - 0.04, -2.45, 0.55, xc + 0.04, -2.37, 1.35, '#f4f1ea', 'Trim')
        b.box(-2.9, -2.5, 1.3, -1.0, -2.3, 1.42, '#f4f1ea', 'Trim'); b.box(1.0, -2.5, 1.3, 2.9, -2.3, 1.42, '#f4f1ea', 'Trim')
    # attached garage wing
    if garage:
        gx0, gx1 = x1, x1 + 6.2
        b.box(gx0, 1.0, 0, gx1, 7.5, 0.3, '#8a847a', 'Stone')
        clapboard(b, gx0, 1.0, gx1, 7.5, 0.3, 3.2, wall, rnd)
        b.gable(gx0, 1.0, gx1, 7.5, 3.2, 1.8, roofc, 'Snow' if snow else 'Roof', along='X', over=0.35)
        b.gable_wall(gx0 + 0.02, 1.0, gx1, 7.5, 3.2, 1.75, wall, 'Clapboard', along='X')
        b.box(gx0 + 0.6, 0.9, 0.05, gx1 - 0.6, 1.0, 2.5, '#f0ede4', 'Paint')
        for k in range(5): b.box(gx0 + 0.6, 0.86, 0.3 + k * 0.45, gx1 - 0.6, 0.9, 0.34 + k * 0.45, '#c9c4b8', 'Paint')
        b.box(gx0 + 0.3, 0.8, 2.5, gx1 - 0.3, 1.0, 2.7, '#f4f1ea', 'Trim')
        # driveway
        b.box(gx0 + 0.3, -7.6, 0.0, gx1 - 0.3, 1.0, 0.04, '#e3e8ee' if snow else '#5a5a5e', 'Snow' if snow else 'Concrete')
    # front walk
    b.box(-0.7, -6.3, 0, 0.7, -2.6, 0.035, '#e3e8ee' if snow else '#a8a39a', 'Snow' if snow else 'Concrete')
    # shrubs along the foundation
    for xc in (-4.4, -3.4, 3.4, 4.4):
        b.ico(xc, -0.8, 0.5, 0.75, '#e8edf3' if snow else hexc('#2f5a34', 0.1, rnd), 'Snow' if snow else 'Foliage', sub=1, sz=0.8)
    if lights:
        cols = ['#ff3a3a', '#3aff6a', '#3a8aff', '#ffcc33', '#ff7a2a', '#ff4ad0']
        # along the front eave, the porch roof, the garage eave and the gable rakes
        def run(p, q, n):
            for k in range(n + 1):
                t = k / n
                x = p[0] + (q[0] - p[0]) * t; y = p[1] + (q[1] - p[1]) * t; z = p[2] + (q[2] - p[2]) * t - 0.12 * math.sin(t * n * math.pi) ** 2
                b.ico(x, y, z, 0.16, hexc(cols[k % len(cols)]), 'Lights', sub=0)
        run((x0 - 0.4, -0.5, H - 0.05), (x1 + 0.4, -0.5, H - 0.05), 44)
        run((-3.3, -2.85, 3.25), (3.3, -2.85, 3.25), 26)
        if garage: run((x1 + 0.1, 0.55, 3.15), (x1 + 6.5, 0.55, 3.15), 24)
        run((x0 - 0.5, -0.3, H), (x0 - 0.5, D / 2, H + 3.1), 18); run((x0 - 0.5, D / 2, H + 3.1), (x0 - 0.5, D + 0.3, H), 18)
        run((x1 + 0.5, -0.3, H), (x1 + 0.5, D / 2, H + 3.1), 18)
        # wreath on the door
        for k in range(14):
            a = k / 14 * math.tau
            b.ico(math.cos(a) * 0.38, -0.2, 2.05 + math.sin(a) * 0.38, 0.13, '#1f4a2a', 'Foliage', sub=0)
        b.ico(0, -0.25, 1.72, 0.09, '#d02020', 'Lights', sub=0)
    return (x0, x1, y1, H)


def mailbox(b, x, y, col='#2a2d33', flag=True):
    b.box(x - 0.06, y - 0.06, 0, x + 0.06, y + 0.06, 1.05, '#6a5038', 'Wood')
    b.box(x - 0.3, y - 0.12, 1.05, x + 0.3, y + 0.12, 1.1, '#6a5038', 'Wood')
    b.box(x - 0.24, y - 0.4, 1.1, x + 0.24, y + 0.2, 1.42, col, 'Metal')
    b.cyl(x, 1.42, y - 0.4, y + 0.2, 0.24, col, 'Metal', seg=10, axis='Y')
    if flag: b.box(x + 0.25, y - 0.1, 1.2, x + 0.28, y + 0.05, 1.62, '#c8281e', 'Paint')


def street(b, x0, x1, y, snow=False):
    """Road parallel to the track with curbs, sidewalk and grass strip."""
    b.box(x0, y - 3.5, 0, x1, y + 3.5, 0.03, '#d9dfe7' if snow else '#44454b', 'Snow' if snow else 'Concrete')
    for s in (-1, 1):
        b.box(x0, y + s * 3.5 - 0.15, 0, x1, y + s * 3.5 + 0.15, 0.14, '#e8edf3' if snow else '#9a968e', 'Snow' if snow else 'Concrete')
        b.box(x0, y + s * 5.2 - 0.8, 0, x1, y + s * 5.2 + 0.8, 0.06, '#e3e8ee' if snow else '#a9a59c', 'Snow' if snow else 'Concrete')
    if not snow:
        x = x0 + 1
        while x < x1 - 3: b.box(x, y - 0.08, 0.03, x + 2.6, y + 0.08, 0.045, '#d8b848', 'Paint'); x += 6


def leaves(b, x, y, rnd, n=10, r=1.4):
    for k in range(n):
        a = rnd.random() * math.tau; d = rnd.random() * r
        b.ico(x + math.cos(a) * d, y + math.sin(a) * d, 0.05, 0.35 + rnd.random() * 0.3, hexc(rnd.choice(AUTUMN), 0.1, rnd), 'Foliage', sub=0, sz=0.35)


# ------------------------------------------------------------ stations

def school(rt):
    rnd = random.Random(4)
    def main(b):
        # long one-storey brick wings, a two-storey centre pavilion with a white portico and a cupola
        brick, trim = '#9a4a36', '#f2eee4'
        for (xa, xb) in ((-18, -4), (4, 18)):
            b.box(xa, 0, 0, xb, 11, 4.6, brick, 'Brick')
            b.box(xa - 0.15, -0.15, 4.4, xb + 0.15, 11.15, 5.0, trim, 'Trim')
            b.hip(xa, 0, xb, 11, 5.0, 1.8, '#4a4f58', 'Roof', over=0.4)
            n = int((xb - xa) / 2.3)
            for k in range(n):
                xc = xa + (xb - xa) * (k + 0.5) / n
                b.box(xc - 0.8, -0.08, 1.1, xc + 0.8, 0.0, 3.7, win_color(rnd, 0.2), 'Window')
                b.box(xc - 0.9, -0.16, 0.95, xc + 0.9, 0.02, 1.1, '#e0dccf', 'Stone')
                b.box(xc - 0.02, -0.12, 1.1, xc + 0.02, -0.02, 3.7, trim, 'Trim')
                b.box(xc - 0.8, -0.12, 2.4, xc + 0.8, -0.02, 2.46, trim, 'Trim')
        b.box(-4, -1, 0, 4, 11, 8.2, brick, 'Brick')
        b.box(-4.2, -1.2, 8.0, 4.2, 11.2, 8.5, trim, 'Trim')
        b.gable(-4, -1, 4, 11, 8.5, 2.6, '#4a4f58', 'Roof', along='Y', over=0.35)
        b.gable_wall(-4, -1.05, 4, -0.9, 8.5, 2.55, trim, 'Trim', along='Y')
        # portico
        b.box(-3.6, -4.2, 0, 3.6, -1, 0.6, '#cfcabe', 'Stone')
        for s in range(3): b.box(-2.2, -4.6 - s * 0.35, 0, 2.2, -4.2, 0.45 - s * 0.15, '#c4bfb2', 'Stone')
        for xc in (-3.0, -1.1, 1.1, 3.0): b.cyl(xc, -3.7, 0.6, 5.6, 0.28, trim, 'Trim', seg=12)
        b.box(-3.6, -4.2, 5.6, 3.6, -1, 6.2, trim, 'Trim')
        b.gable_wall(-3.6, -4.2, 3.6, -4.1, 6.2, 1.6, trim, 'Trim', along='Y')
        b.gable(-3.6, -4.2, 3.6, -1, 6.2, 1.6, '#4a4f58', 'Roof', along='Y', over=0.25, thick=0.12)
        b.box(-1.1, -1.08, 0.6, 1.1, -0.98, 3.4, '#27404f', 'Paint')
        b.box(-1.3, -1.12, 3.4, 1.3, -0.98, 4.2, win_color(rnd, 0.9), 'Window')
        for xc in (-2.6, 2.6): b.box(xc - 0.6, -1.08, 5.4, xc + 0.6, -0.98, 7.4, win_color(rnd, 0.4), 'Window')
        b.box(-0.7, -1.08, 5.6, 0.7, -0.98, 7.6, win_color(rnd, 0.4), 'Window')
        # cupola with bell
        cz = 8.5 + 1.4
        b.box(-1.4, 3.6, 8.5, 1.4, 6.4, cz + 0.9, trim, 'Trim')
        for (dx, dy) in ((-1, -1), (1, -1), (-1, 1), (1, 1)): b.box(dx * 1.05 - 0.22, 5 + dy * 1.05 - 0.22, cz + 0.9, dx * 1.05 + 0.22, 5 + dy * 1.05 + 0.22, cz + 3.2, trim, 'Trim')
        b.cone(0, 5, cz + 1.0, 1.4, 0.55, '#b8943a', 'Metal', seg=10)
        b.box(-1.5, 3.5, cz + 3.2, 1.5, 6.5, cz + 3.5, trim, 'Trim')
        b.cyl(0, 5, cz + 3.5, cz + 4.4, 1.1, '#3f6a5a', 'Metal', seg=8, r2=0.6)
        b.cone(0, 5, cz + 4.4, 2.2, 0.6, '#3f6a5a', 'Metal', seg=8)
        b.cyl(0, 5, cz + 6.6, cz + 7.6, 0.04, '#2a2a2a', 'Metal', seg=4)
        b.box(-0.5, 4.97, cz + 7.2, 0.5, 5.03, cz + 7.25, '#2a2a2a', 'Metal')
        # chimney
        b.box(12, 7, 0, 13.2, 8.2, 9.5, '#8a3f2e', 'Brick')
    piece('school', rt, -24, 31, main)

    def yard(b):
        # flagpole with a striped flag
        b.box(-0.8, -0.8, 0, 0.8, 0.8, 0.3, '#cfcabe', 'Stone')
        b.cyl(0, 0, 0.3, 12.5, 0.1, '#d8dade', 'Metal', seg=8, r2=0.06)
        b.ico(0, 0, 12.6, 0.16, '#d8b848', 'Metal', sub=1)
        fx0, fz1 = 0.1, 12.1
        for k in range(7):
            z1 = fz1 - k * 0.3
            b.box(fx0, -0.02, z1 - 0.3, fx0 + 3.6, 0.02, z1, '#b8322a' if k % 2 == 0 else '#f4f1ea', 'Fabric')
        b.box(fx0, -0.04, fz1 - 1.2, fx0 + 1.5, 0.04, fz1, '#2a3a6a', 'Fabric')
        # school bus
        bx, by = 7.5, -7.0
        yellow = '#f0b020'
        b.box(bx - 5.2, by - 1.25, 0.55, bx + 3.8, by + 1.25, 3.0, yellow, 'Paint')
        b.box(bx + 3.8, by - 1.2, 0.55, bx + 5.6, by + 1.2, 1.85, yellow, 'Paint')
        b.box(bx - 5.25, by - 1.3, 3.0, bx + 3.85, by + 1.3, 3.25, '#e8e4d8', 'Paint')
        for z in (1.2, 1.9): b.box(bx - 5.25, by - 1.28, z, bx + 3.85, by + 1.28, z + 0.1, '#1a1a1a', 'Paint')
        for k in range(8):
            xc = bx - 4.6 + k * 1.05
            b.box(xc, by - 1.3, 2.1, xc + 0.85, by + 1.3, 2.8, '#1f2833', 'Window')
        b.box(bx + 3.82, by - 1.1, 1.95, bx + 3.9, by + 1.1, 2.85, '#1f2833', 'Window')
        b.box(bx + 5.6, by - 1.0, 0.5, bx + 5.75, by + 1.0, 0.9, '#2a2a2a', 'Metal')
        for v in (-0.8, 0.8): b.box(bx + 5.55, by + v - 0.2, 1.2, bx + 5.65, by + v + 0.2, 1.45, '#fff2c8', 'Lights')
        for v in (-0.9, 0.9): b.box(bx + 3.6, by + v - 0.18, 3.25, bx + 3.9, by + v + 0.18, 3.45, '#ff3a2a', 'Lights')
        for u in (-3.8, 2.4, 4.2):
            for v in (-1.2, 1.2): b.cyl(bx + u, 0.55, by + v - 0.2, by + v + 0.2, 0.52, '#15161a', 'Metal', seg=10, axis='Y')
        # swing set + slide
        sx, sy = -50, 2
        for x in (sx - 3, sx + 3):
            b.tube([(x, sy - 1.2, 0), (x, sy, 3.0)], 0.07, '#c8322a'); b.tube([(x, sy + 1.2, 0), (x, sy, 3.0)], 0.07, '#c8322a')
        b.tube([(sx - 3, sy, 3.0), (sx + 3, sy, 3.0)], 0.08, '#c8322a')
        for x in (sx - 1.5, sx + 1.5):
            b.tube([(x - 0.3, sy, 3.0), (x - 0.3, sy, 0.7)], 0.02, '#888'); b.tube([(x + 0.3, sy, 3.0), (x + 0.3, sy, 0.7)], 0.02, '#888')
            b.box(x - 0.4, sy - 0.15, 0.62, x + 0.4, sy + 0.15, 0.7, '#2a2a2a', 'Paint')
        b.box(sx + 6, sy - 0.5, 0, sx + 6.2, sy + 0.5, 3.0, '#3a6ab0', 'Metal')
        b.poly_prism([(sx + 6.2, 3.0), (sx + 10.5, 0.2), (sx + 10.5, 0.35), (sx + 6.2, 3.15)], sy - 0.5, sy + 0.5, '#d8d0c0', 'Metal', axis='Y')
        for k in range(7): b.box(sx + 5.6, sy - 0.45, k * 0.42, sx + 6.0, sy + 0.45, k * 0.42 + 0.06, '#3a6ab0', 'Metal')
        # a path from the street to the portico, lawn edging
        b.box(-25.8, -1.8, 0, -22.2, 1.0, 0.035, '#b0aba0', 'Concrete')
        for x in (-44, -38, -2, 6): deciduous(b, x, 16 + rnd.random() * 6, 1.3 + rnd.random() * 0.3, rnd, SUMMER + ['#c8741e'])
        for x in (-46, -14, 10): deciduous(b, x, 42 + rnd.random() * 6, 1.5, rnd, SUMMER)
    piece('schoolyard', rt, 0, 27, yard)
    street_piece(rt, -48, 16, 20, False, 'street4')


def cemetery(rt):
    rnd = random.Random(5)
    def yard(b):
        # fieldstone wall around the burying ground
        X0, X1, Y0, Y1 = -26, 6, 0, 22
        def wall(p, q):
            L = math.dist(p, q); n = int(L / 0.9)
            for k in range(n):
                t0, t1 = k / n, (k + 1) / n
                x0 = p[0] + (q[0] - p[0]) * t0; x1 = p[0] + (q[0] - p[0]) * t1
                y0 = p[1] + (q[1] - p[1]) * t0; y1 = p[1] + (q[1] - p[1]) * t1
                h = 0.9 + rnd.random() * 0.25
                b.box(min(x0, x1) - 0.35, min(y0, y1) - 0.35, 0, max(x0, x1) + 0.35, max(y0, y1) + 0.35, h, hexc('#8a857a', 0.12, rnd), 'Stone')
        wall((X0, Y0), (-12.5, Y0)); wall((-7.5, Y0), (X1, Y0))
        wall((X0, Y0), (X0, Y1)); wall((X1, Y0), (X1, Y1)); wall((X0, Y1), (X1, Y1))
        # granite gate posts and an iron arch
        for x in (-12.5, -7.5):
            b.box(x - 0.5, -0.5, 0, x + 0.5, 0.5, 2.6, '#9a968c', 'Stone'); b.box(x - 0.6, -0.6, 2.6, x + 0.6, 0.6, 2.85, '#8a867c', 'Stone')
        pts = [(-12.5 + 5 * k / 16, 0, 2.85 + 1.3 * math.sin(math.pi * k / 16)) for k in range(17)]
        b.tube(pts, 0.06, '#1c1d20', 'Metal', seg=4)
        for k in range(1, 16, 2): b.tube([(pts[k][0], 0, 2.85), pts[k]], 0.03, '#1c1d20', 'Metal', seg=4)
        # rows of old headstones: slate tablets with round shoulders, marble obelisks, low box tombs
        for row in range(5):
            y = 3.5 + row * 3.6
            x = X0 + 2 + rnd.random()
            while x < X1 - 1.5:
                kind = rnd.random()
                tilt = (rnd.random() - 0.5) * 0.25
                col = hexc(rnd.choice(['#4a4e55', '#55585e', '#3f4349', '#8f8c86', '#a8a49c']), 0.08, rnd)
                if kind < 0.7:
                    w, h = 0.9 + rnd.random() * 0.5, 1.0 + rnd.random() * 0.8
                    b.boxc(x, y + tilt, 0, w, 0.16, h, col, 'Stone')
                    b.cyl(x, h - 0.05, y + tilt - 0.08, y + tilt + 0.08, w * 0.36, col, 'Stone', seg=10, axis='Y')
                    for s in (-1, 1): b.cyl(x + s * w * 0.42, h - 0.1, y + tilt - 0.08, y + tilt + 0.08, w * 0.12, col, 'Stone', seg=6, axis='Y')
                elif kind < 0.82:
                    b.boxc(x, y, 0, 1.0, 1.0, 0.5, '#9a968e', 'Stone'); b.boxc(x, y, 0.5, 0.7, 0.7, 0.4, '#a8a49c', 'Stone')
                    b.cyl(x, y, 0.9, 3.4, 0.3, '#b0aca4', 'Stone', seg=4, r2=0.18, smooth=False); b.cone(x, y, 3.4, 0.35, 0.2, '#b0aca4', 'Stone', seg=4)
                else:
                    b.boxc(x, y + 0.6, 0, 1.2, 2.2, 0.75, col, 'Stone'); b.boxc(x, y + 0.6, 0.75, 1.35, 2.35, 0.1, col, 'Stone')
                x += 1.7 + rnd.random() * 1.6
        # old trees inside and outside the wall
        for (x, y, s) in ((-22, 18, 1.8), (2, 20, 1.6), (-3, 9, 1.4), (-30, 8, 1.7)):
            deciduous(b, x, y, s, rnd, ['#6a7a3a', '#8a7a34', '#a0662a', '#5d7438'])
        for (x, y) in ((-20, 26), (-10, 28), (0, 30), (-28, 30)): pine(b, x, y, 1.5 + rnd.random() * 0.5, rnd)
    piece('cemetery', rt, -16, 28, yard)

    def gangulis(b):
        colonial(b, rnd, wall='#c9d6e0', roof='#3a3f48', shutter='#1f2a3a', door='#2a3a5a', lit=0.35)
        for x in (-9.8, -9.0, -8.2):
            mailbox(b, x, -6.9, rnd.choice(['#2a2d33', '#1f3a5a', '#5a2a22']), flag=(x == -9.0))
        deciduous(b, -8, 4, 1.4, rnd, SUMMER); deciduous(b, 12, 11, 1.5, rnd, SUMMER)
        car(b, 8.1, -4.5, math.pi / 2, '#6a7a54', rnd, 'sedan')
    piece('gangulis', rt, 6, 32, gangulis)
    street_piece(rt, -48, 16, 20, False, 'street5')


def street_piece(rt, x0, x1, y, snow, name):
    piece(name, rt, 0, 0, lambda b: street(b, x0, x1, y, snow))


def family_street(rt):
    rnd = random.Random(6)
    def home(b):
        colonial(b, rnd, wall='#e6d3a8', roof='#4a3a32', shutter='#3a2a22', door='#6a2a1e', lit=0.35)
        # station wagon in the driveway (woodgrain side panel), basketball hoop over the garage
        car(b, 8.1, -4.5, math.pi / 2, '#8a6a44', rnd, 'wagon')
        b.box(7.2, -6.5, 0.55, 7.25, -2.8, 0.95, '#5a3a22', 'Wood'); b.box(8.95, -6.5, 0.55, 9.0, -2.8, 0.95, '#5a3a22', 'Wood')
        b.box(7.4, 0.8, 3.1, 8.8, 0.9, 4.1, '#f4f1ea', 'Paint'); b.cyl(8.1, 0.3, 3.1, 3.14, 0.4, '#d8501e', 'Metal', seg=10, cap=False)
        for (x, y, s) in ((-8, -4, 1.5), (-4.5, -4.8, 1.1), (15, 4, 1.3), (-12, 7, 1.6)):
            deciduous(b, x, y, s, rnd, AUTUMN); leaves(b, x + 1, y - 1.5, rnd, 12, 2.2)
        mailbox(b, -2.2, -6.9, '#2a2d33')
        # a rake leaning on the porch
        b.tube([(3.2, -2.2, 0.1), (3.4, -2.6, 1.9)], 0.03, '#8a6a44', 'Wood')
    piece('home', rt, -16, 31, home)
    piece_house(rt, 'nbrL', -40, 33, '#f0ece2', '#39404a', '#2f4a3a', rnd, AUTUMN)
    piece_house(rt, 'nbrR', 7, 33, '#b8c9b0', '#5a4038', '#3a2a22', rnd, AUTUMN)
    street_piece(rt, -48, 16, 20, False, 'street6')


def piece_house(rt, name, x, y, wall, roof, shutter, rnd, pal, snow=False, lights=False, lit=0.35):
    def f(b):
        colonial(b, rnd, wall=wall, roof=roof, shutter=shutter, door=shutter, snow=snow, lights=lights, lit=lit, garage=False, porch=rnd.random() < 0.5, wide=9.0)
        mailbox(b, -2, -6.9)
        if pal:
            for (dx, dy) in ((-7, -5), (6, 8)):
                if snow: pine(b, dx, dy, 1.3, rnd, snow=True)
                else: deciduous(b, dx, dy, 1.3, rnd, pal)
    return piece(name, rt, x, y, f)


def high_school(rt):
    rnd = random.Random(7)
    def main(b):
        brick, lime = '#8a3e2e', '#d8d0bc'
        # three-storey main block with a centre tower, flat roof, limestone bands
        X0, X1 = -24, 24
        b.box(X0, 0, 0, X1, 14, 11.5, brick, 'Brick')
        for z in (0.0, 3.8, 7.6, 11.2): b.box(X0 - 0.12, -0.12, z, X1 + 0.12, 14.12, z + 0.35, lime, 'Stone')
        b.box(X0 - 0.3, -0.3, 11.5, X1 + 0.3, 14.3, 12.2, lime, 'Stone')
        for k in range(20):
            xc = X0 + 1.2 + k * 2.4
            if abs(xc) < 5: continue
            for zc in (2.0, 5.8, 9.5):
                b.box(xc - 0.8, -0.1, zc - 1.2, xc + 0.8, 0.0, zc + 1.2, win_color(rnd, 0.3), 'Window')
                b.box(xc - 0.02, -0.14, zc - 1.2, xc + 0.02, -0.02, zc + 1.2, '#efe9dc', 'Trim')
        # entrance tower
        b.box(-5, -2, 0, 5, 14, 17.5, brick, 'Brick')
        b.box(-5.3, -2.3, 17.5, 5.3, 14.3, 18.3, lime, 'Stone')
        for x in (-5, 5): b.box(x - 0.5, -2.4, 0, x + 0.5, -1.6, 18.3, lime, 'Stone')
        b.box(-3.2, -2.1, 0, 3.2, -1.9, 0.6, lime, 'Stone')
        b.box(-2.4, -2.12, 0.6, 2.4, -1.95, 4.2, '#2a3440', 'Window')
        b.box(-3.0, -2.3, 4.2, 3.0, -1.9, 5.0, lime, 'Stone')
        b.box(-2.2, -2.1, 6.0, 2.2, -1.98, 13.5, win_color(rnd, 0.8), 'Window')
        for x in (-1.1, 0, 1.1): b.box(x - 0.05, -2.16, 6.0, x + 0.05, -2.0, 13.5, lime, 'Stone')
        # a round clock face (no numerals) and a copper-roofed cupola on the tower
        b.cyl(0, 15.6, -2.3, -1.9, 1.3, '#efe9dc', 'Trim', seg=20, axis='Y')
        b.box(-0.05, -2.45, 15.5, 0.05, -2.3, 16.6, '#1a1a1a', 'Metal'); b.box(-0.05, -2.45, 15.55, 0.8, -2.3, 15.65, '#1a1a1a', 'Metal')
        b.box(-2.4, 3.6, 18.3, 2.4, 8.4, 21.0, lime, 'Stone')
        for (dx, dy) in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
            b.box(dx * 1.9 - 0.3, 6 + dy * 1.9 - 0.3, 21.0, dx * 1.9 + 0.3, 6 + dy * 1.9 + 0.3, 23.2, lime, 'Stone')
        b.box(-2.6, 3.4, 23.2, 2.6, 8.6, 23.7, lime, 'Stone')
        b.cyl(0, 6, 23.7, 26.5, 2.2, '#4f8a74', 'Metal', seg=8, r2=0.3, smooth=False)
        b.cyl(0, 6, 26.5, 28.2, 0.06, '#2a2a2a', 'Metal', seg=4)
        # gym wing with a barrel roof
        b.box(24, 2, 0, 38, 16, 8.5, brick, 'Brick')
        for k in range(12):
            a0, a1 = math.pi * k / 12, math.pi * (k + 1) / 12
            b.poly_prism([(31 - 7.2 * math.cos(a0), 8.5 + 2.2 * math.sin(a0)), (31 - 7.2 * math.cos(a1), 8.5 + 2.2 * math.sin(a1)), (31 - 7.2 * math.cos(a1), 8.3 + 2.2 * math.sin(a1)), (31 - 7.2 * math.cos(a0), 8.3 + 2.2 * math.sin(a0))], 1.7, 16.3, '#5a6068', 'Roof', axis='Y')
        for k in range(5): b.box(25.5 + k * 2.6, 1.9, 5.0, 27.3 + k * 2.6, 2.0, 7.8, win_color(rnd, 0.3), 'Window')
        b.box(-22, 9, 11.5, -19, 11, 14.5, brick, 'Brick')
    piece('highschool', rt, -24, 55, main)

    def field(b):
        # football field with yard lines, goalposts and bleachers, a red running track around it
        FX0, FX1, FY0, FY1 = -34, 14, 0, 16
        b.box(FX0 - 3, FY0 - 3, 0, FX1 + 3, FY1 + 3, 0.05, '#a8442e', 'Concrete')
        b.box(FX0, FY0, 0, FX1, FY1, 0.07, '#4f8a3a', 'Ground')
        for k in range(11):
            x = FX0 + 4 + k * 4
            b.box(x - 0.08, FY0 + 0.3, 0.07, x + 0.08, FY1 - 0.3, 0.085, '#f4f4f0', 'Paint')
        for (x, s) in ((FX0 + 1.2, 1), (FX1 - 1.2, -1)):
            b.cyl(x, 8, 0, 3.0, 0.1, '#e8c83a', 'Metal', seg=6)
            b.box(x - 0.08, 6.2, 3.0, x + 0.08, 9.8, 3.15, '#e8c83a', 'Metal')
            for y in (6.2, 9.8): b.cyl(x, y, 3.0, 8.5, 0.07, '#e8c83a', 'Metal', seg=6)
        for r in range(6):
            b.box(FX0 + 8, FY1 + 3.8 + r * 0.7, 0, FX1 - 8, FY1 + 4.5 + r * 0.7, 0.45 + r * 0.45, '#b8bcc2' if r % 2 else '#9aa0a8', 'Metal')
        b.box(FX0 + 8, FY1 + 8.3, 0, FX1 - 8, FY1 + 8.5, 3.4, '#6a7078', 'Metal')
        b.box(-12, FY1 + 7.5, 3.4, -4, FY1 + 9.5, 6.2, '#e8e4d8', 'Paint'); b.box(-11.5, FY1 + 7.4, 4.2, -4.5, FY1 + 7.5, 5.8, win_color(rnd, 0.9), 'Window')
        # light towers
        for (x, y) in ((FX0 - 2, -2), (FX1 + 2, -2), (FX0 - 2, 18), (FX1 + 2, 18)):
            b.cyl(x, y, 0, 13, 0.18, '#7a8088', 'Metal', seg=6)
            b.box(x - 1.2, y - 0.2, 13, x + 1.2, y + 0.2, 14.2, '#fff6dc', 'Lights')
        for (x, y) in ((-44, 6), (20, 12), (24, -2)): deciduous(b, x, y, 1.5, rnd, ['#6a8a3a', '#a07a2a', '#c8641e'])
        # parked cars along the road
        for k in range(7): car(b, -40 + k * 5.2 + rnd.random(), -6.0, 0, rnd.choice(['#6a2a22', '#2a4a6a', '#8a8470', '#3a5a3a', '#c8b890', '#5a5e66']), rnd)
    piece('field', rt, -2, 28, field)
    street_piece(rt, -48, 16, 20, False, 'street7')


def christmas(rt):
    rnd = random.Random(14)
    def home(b):
        colonial(b, rnd, wall='#e6d3a8', roof='#4a3a32', shutter='#3a2a22', door='#6a2a1e', snow=True, lights=True, lit=0.95)
        car(b, 8.1, -4.5, math.pi / 2, '#5a2a2a', rnd, 'sedan', snow=True)
        # snowman
        for (z, r) in ((0.7, 0.8), (1.85, 0.58), (2.75, 0.4)): b.ico(-5.5, -4.5, z, r, '#f2f5fa', 'Snow', sub=2)
        b.cone(-5.5, -4.9, 2.75, 0.4, 0.07, '#e07020', 'Paint', seg=5)
        b.cyl(-5.5, -4.5, 3.05, 3.55, 0.3, '#1a1a1a', 'Fabric', seg=10)
        b.cyl(-5.5, -4.5, 3.05, 3.1, 0.48, '#1a1a1a', 'Fabric', seg=10)
        # a decorated spruce in the yard, strung with lights
        pine(b, -9.5, -3, 1.7, rnd, '#2a4a32', snow=True)
        cols = ['#ff3a3a', '#3aff6a', '#3a8aff', '#ffcc33', '#ff7a2a']
        for k in range(70):
            t = k / 70; a = t * 9 * math.pi; rr = (2.6 - 2.2 * t) * 1.0; z = 1.2 + t * 6.2
            b.ico(-9.5 + math.cos(a) * rr, -3 + math.sin(a) * rr, z, 0.15, hexc(cols[k % 5]), 'Lights', sub=0)
        b.ico(-9.5, -3, 8.2, 0.3, '#fff2a0', 'Lights', sub=1)
        # a lit tree inside the front window
        b.cone(-3.6, 0.6, 1.1, 1.5, 0.5, '#2a5a32', 'Foliage', seg=6)
        for k in range(8): b.ico(-3.6 + (rnd.random() - 0.5) * 0.6, 0.35, 1.3 + rnd.random() * 1.1, 0.07, hexc(cols[k % 5]), 'Lights', sub=0)
        # snow drifts
        for (x, y, r) in ((-6, -1.5, 2.4), (5, -1.2, 2.0), (12, 9, 3.0), (-12, 5, 3.2)):
            b.ico(x, y, 0, r, '#eef2f7', 'Snow', sub=1, sz=0.25)
        mailbox(b, -2.2, -6.9, '#2a2d33', flag=False)
        b.box(-2.5, -7.2, 1.45, -1.9, -6.6, 1.6, '#f2f5fa', 'Snow')
    piece('home_xmas', rt, -16, 31, home)
    piece_house(rt, 'nbrL_x', -40, 33, '#f0ece2', '#39404a', '#2f4a3a', rnd, AUTUMN, snow=True, lights=True, lit=0.8)
    piece_house(rt, 'nbrR_x', 7, 33, '#b8c9b0', '#5a4038', '#3a2a22', rnd, AUTUMN, snow=True, lights=False, lit=0.7)
    def pines(b):
        for k in range(10):
            pine(b, -48 + k * 6.5 + rnd.random() * 3, 48 + rnd.random() * 10, 1.6 + rnd.random() * 0.7, rnd, snow=True)
    piece('pines_x', rt, 0, 0, pines)
    street_piece(rt, -48, 16, 20, True, 'street14')


reset()
for name, fn in (('S_school', school), ('S_cemetery', cemetery), ('S_street', family_street), ('S_highschool', high_school), ('S_christmas', christmas)):
    rt = root(name)
    fn(rt)
if '--preview' in sys.argv:
    which = sys.argv[sys.argv.index('--preview') + 1]
    for o in list(bpy.data.objects):
        top = o
        while top.parent: top = top.parent
        if top.name != which: o.hide_render = True
    preview(os.path.join(os.environ.get('PREV', '/tmp'), f'{which}.png'), cam_loc=(38, -75, 30), target=(-14, 30, 4))
else:
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    export(OUT)
