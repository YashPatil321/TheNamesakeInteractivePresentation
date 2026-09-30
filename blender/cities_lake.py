# The Ratliffs' lake house in New Hampshire (1990s): a shingled summer house with a wraparound screened porch and
# fieldstone chimney, Adirondack chairs on the lawn, a plank dock with a red canoe, a swim float, a pine island, rocks.
# The scenery already lays the water (centred on the station, x +-33, z -12..-108 in three.js; Blender Y 12..108).
# Run: /opt/blendervenv/bin/python blender/cities_lake.py  ->  public/models/lake.glb
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cities_bkit import *
import bmesh

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'models', 'lake.glb')
SHINGLE = '#6e5a48'
TRIM = '#ece6d8'
ROOFG = '#3c4a3e'


def shingles(b, x0, y0, x1, y1, z0, z1, rnd, step=0.45):
    z = z0; k = 0
    while z < z1 - 1e-3:
        zz = min(z1, z + step); e = 0.04 if k % 2 == 0 else 0.0
        b.box(x0 - e, y0 - e, z, x1 + e, y1 + e, zz, hexc(SHINGLE, 0.06, rnd), 'Clapboard')
        z = zz; k += 1


def canoe(b, x, y, z, L=5.2, W=0.9, col='#c8321e', rot=0.0):
    bm = b.bm
    res = bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=8, radius=1.0,
                                    matrix=Matrix.Translation((x, y, z)) @ Matrix.Rotation(rot, 4, 'Z') @ Matrix.Diagonal((L / 2, W / 2, 0.42, 1)))
    vs = res['verts']
    top = [v for v in vs if v.co.z > z + 1e-4]
    faces = {f for v in vs for f in v.link_faces}
    bmesh.ops.delete(bm, geom=top, context='VERTS')
    faces = {f for f in faces if f.is_valid}
    b._finish(None, col, 'Paint', smooth=True, faces=faces)
    # gunwales + thwart
    b.box(x - 0.05, y - 0.45, z - 0.02, x + 0.05, y + 0.45, z + 0.04, '#8a6a44', 'Wood')
    for s in (-1, 1): b.box(x + s * 0.9 - 0.3, y - 0.36, z - 0.12, x + s * 0.9 + 0.3, y + 0.36, z - 0.06, '#8a6a44', 'Wood')


def adirondack(b, x, y, rot, col):
    c, s = math.cos(rot), math.sin(rot)
    def R(u, v): return (x + u * c - v * s, y + u * s + v * c)
    cx, cy = R(0, 0)
    b.boxc(cx, cy, 0.4, 0.75, 0.8, 0.08, col, 'Paint', rot)
    bx, by = R(0, 0.45)
    for k in range(5):
        px, py = R(-0.3 + k * 0.15, 0.5)
        b.boxc(px, py, 0.4, 0.11, 0.08, 0.95, col, 'Paint', rot)
    for u in (-0.45, 0.45):
        ax, ay = R(u, 0.05)
        b.boxc(ax, ay, 0.65, 0.14, 0.9, 0.05, col, 'Paint', rot)
        for v in (-0.35, 0.35):
            lx, ly = R(u, v); b.boxc(lx, ly, 0, 0.07, 0.07, 0.65, col, 'Paint', rot)


def lake(rt):
    rnd = random.Random(10)

    def house(b):
        # main block (long side faces the lake, +X), with gambrel-ish tall roof, dormers, porch round two sides
        X0, X1, Y0, Y1 = -6, 6, -5, 5
        H = 6.2
        b.box(X0 - 0.3, Y0 - 0.3, -1.0, X1 + 0.3, Y1 + 0.3, 0.7, '#7a746a', 'Stone')
        shingles(b, X0, Y0, X1, Y1, 0.7, H, rnd)
        for x in (X0, X1):
            for y in (Y0, Y1): b.box(x - 0.13, y - 0.13, 0.7, x + 0.13, y + 0.13, H, TRIM, 'Trim')
        b.gable(X0, Y0, X1, Y1, H, 3.6, ROOFG, 'Roof', along='Y', over=0.5)
        b.gable_wall(X0, Y0 + 0.02, X1, Y1 - 0.02, H, 3.55, SHINGLE, 'Clapboard', along='Y')
        # windows: lake side (+X) and the camera side (-Y)
        for yc in (-3.0, -1.0, 1.0, 3.0):
            for zc in (2.0, 4.6):
                b.box(X1 - 0.02, yc - 0.45, zc - 0.7, X1 + 0.08, yc + 0.45, zc + 0.7, win_color(rnd, 0.55), 'Window')
                b.box(X1, yc - 0.55, zc + 0.7, X1 + 0.14, yc + 0.55, zc + 0.85, TRIM, 'Trim')
        for xc in (-3.5, 0.0, 3.5):
            for zc in (2.0, 4.6):
                b.box(xc - 0.5, Y0 - 0.08, zc - 0.7, xc + 0.5, Y0 + 0.02, zc + 0.7, win_color(rnd, 0.55), 'Window')
                b.box(xc - 0.62, Y0 - 0.14, zc + 0.7, xc + 0.62, Y0, zc + 0.85, TRIM, 'Trim')
        b.box(-0.8, Y0 - 0.08, H + 0.6, 0.8, Y0 + 0.02, H + 2.2, win_color(rnd, 0.7), 'Window')
        # dormer towards the lake
        b.box(X1 - 1.2, -1.2, H - 0.1, X1 + 0.1, 1.2, H + 1.9, SHINGLE, 'Clapboard')
        b.box(X1 + 0.06, -0.7, H + 0.4, X1 + 0.14, 0.7, H + 1.6, win_color(rnd, 0.8), 'Window')
        b.gable(X1 - 1.2, -1.2, X1 + 0.1, 1.2, H + 1.9, 0.9, ROOFG, 'Roof', along='X', over=0.2, thick=0.12)
        # fieldstone chimney
        for k in range(16):
            z = k * 0.7
            b.box(X0 - 1.4 + (k % 2) * 0.05, -1.0, z, X0 + 0.2, 1.0, z + 0.7, hexc('#8a8478', 0.14, rnd), 'Stone')
        for k in range(4): b.box(X0 - 1.1, -0.7, 11.2 + k * 0.6, X0 - 0.1, 0.7, 11.8 + k * 0.6, hexc('#8a8478', 0.14, rnd), 'Stone')
        # wraparound screened porch: floor, posts, screens (dark), low roof
        PX = X1 + 3.2
        b.box(X0 - 0.2, Y0 - 3.0, 0.2, PX, Y0, 0.7, '#8a6a4a', 'Wood')
        b.box(X1, Y0, 0.2, PX, Y1 + 0.2, 0.7, '#8a6a4a', 'Wood')
        for yc in [Y0 - 2.9 + k * 2.0 for k in range(7)]:
            b.box(PX - 0.14, yc - 0.1, 0.7, PX, yc + 0.1, 3.3, TRIM, 'Trim')
        for xc in [X0 + k * 2.3 for k in range(7)]:
            if xc < PX: b.box(xc - 0.1, Y0 - 2.95, 0.7, xc + 0.1, Y0 - 2.8, 3.3, TRIM, 'Trim')
        b.box(PX - 0.06, Y0 - 2.9, 1.0, PX - 0.03, Y1 + 0.1, 3.1, '#2a3238', 'Window')
        b.box(X0, Y0 - 2.92, 1.0, PX, Y0 - 2.89, 3.1, '#2a3238', 'Window')
        b.box(X0 - 0.2, Y0 - 3.0, 0.7, PX, Y0 - 2.8, 1.1, TRIM, 'Trim')
        b.box(PX - 0.2, Y0 - 3.0, 0.7, PX, Y1 + 0.2, 1.1, TRIM, 'Trim')
        b.poly_prism([(X1 - 0.1, 3.9), (PX + 0.4, 3.2), (PX + 0.4, 3.35), (X1 - 0.1, 4.1)], Y0 - 3.3, Y1 + 0.5, ROOFG, 'Roof', axis='Y')
        b.poly_prism([(Y0 + 0.1, 3.9), (Y0 - 3.4, 3.2), (Y0 - 3.4, 3.35), (Y0 + 0.1, 4.1)], X0 - 0.5, PX + 0.4, ROOFG, 'Roof', axis='X')
        # steps down to the lawn, lanterns
        for s in range(3): b.box(PX, -1.0, 0, PX + 0.4 + s * 0.4, 1.0, 0.55 - s * 0.18, '#7a746a', 'Stone')
        b.ico(PX - 0.3, -1.3, 2.8, 0.18, '#ffd9a0', 'Lamp', sub=1)
    piece('lakehouse', rt, -19, 33, house)

    def shore(b):
        # grassy point running into the water where the house sits (the lake bed dips under it), rocks along the edge
        pts = [(-34, 10.5), (-6, 10.5), (-3.5, 14), (-2.5, 22), (-3.5, 30), (-5, 38), (-9, 46), (-16, 51), (-26, 53), (-34, 54)]
        bm = b.bm
        top = [bm.verts.new((x, y, 0.12)) for (x, y) in pts]
        bot = [bm.verts.new((x * 1.0 + (2.5 if x > -30 else 0), y + (0 if y < 12 else 2.0), -1.0)) for (x, y) in pts]
        fs = [bm.faces.new(top[::-1])]
        for i in range(len(pts) - 1): fs.append(bm.faces.new((top[i], top[i + 1], bot[i + 1], bot[i])))
        bmesh.ops.recalc_face_normals(bm, faces=fs)
        b._finish(None, '#5d7a45', 'Ground', faces=set(fs))
        for k in range(len(pts) - 1):
            x = (pts[k][0] + pts[k + 1][0]) / 2 + 1.0; y = (pts[k][1] + pts[k + 1][1]) / 2
            if x > -30: b.ico(x, y, -0.1, 0.9 + rnd.random() * 0.6, hexc('#6a665e', 0.12, rnd), 'Stone', sub=1, sz=0.55)
        # lawn chairs and a fire ring facing the lake
        for (x, y, c) in ((-6.5, 27, '#c8321e'), (-6.2, 29.5, '#2a6a8a'), (-6.8, 32, '#e8c83a')):
            adirondack(b, x, y, -math.pi / 2, c)
        for k in range(10):
            a = k / 10 * math.tau
            b.ico(-9.5 + math.cos(a) * 0.9, 38.5 + math.sin(a) * 0.9, 0.1, 0.25, hexc('#6a665e', 0.1, rnd), 'Stone', sub=0)
        b.ico(-9.5, 38.5, 0.2, 0.4, '#ff9a3a', 'Glow', sub=0, sz=0.5)
        # dock: posts, planks with gaps, a ladder; canoe tied alongside
        DY = 26.0
        for x in [-2 + k * 2.4 for k in range(6)]:
            for y in (DY - 1.1, DY + 1.1): b.cyl(x, y, -1.5, 0.75, 0.12, '#5a4632', 'Wood', seg=6)
        x = -4.0
        while x < 10.4:
            b.box(x, DY - 1.2, 0.5, x + 0.26, DY + 1.2, 0.62, hexc('#9a7a58', 0.1, rnd), 'Wood'); x += 0.32
        b.box(9.6, DY - 3.2, 0.5, 10.4, DY + 3.2, 0.62, '#9a7a58', 'Wood')
        for s in (-1, 1): b.tube([(10.0, DY + s * 0.4, -0.5), (10.0, DY + s * 0.4, 1.4)], 0.04, '#b8bcc2', 'Metal', seg=4)
        canoe(b, 4, DY - 2.2, 0.15, col='#c8321e')
        canoe(b, -7.5, 16, 0.37, col='#2a6a4a', rot=0.4)
        # swim float and a rowboat mooring
        b.box(12, 40, 0.0, 15, 43, 0.45, '#d8d0c0', 'Wood')
        b.tube([(12.2, 40.2, 0.45), (12.2, 40.2, 1.3)], 0.03, '#b8bcc2')
        b.ico(16, 30, 0.1, 0.3, '#e85a1a', 'Paint', sub=1)
        # pine island
        b.ico(14, 74, -0.6, 6.5, '#5a564e', 'Stone', sub=2, sz=0.25)
        for (x, y, s) in ((12, 73, 2.2), (16, 75, 1.8), (14.5, 71.5, 1.5), (10.5, 76, 1.4)): pine(b, x, y, s, rnd, '#2a4a32')
        # tall pines around the house
        for (x, y, s) in ((-31, 18, 2.4), (-31, 30, 2.8), (-30, 42, 2.6), (-24, 47, 2.4), (-14, 47, 2.0), (-32, 50, 3.0), (-20, 51, 2.2)):
            pine(b, x, y, s, rnd, '#2c4c34')
        # birches at the water's edge
        for (x, y) in ((-4.5, 34), (-6, 42)):
            b.cyl(x, y, 0, 6.5, 0.16, '#e8e4dc', 'Bark', seg=6, r2=0.08)
            for k in range(3): b.ico(x + (rnd.random() - 0.5), y + (rnd.random() - 0.5), 5.2 + k * 0.8, 1.1, hexc('#8ab04a', 0.1, rnd), 'Foliage', sub=1)
    piece('shore', rt, 0, 0, shore)


reset()
rt = root('S_lake')
lake(rt)
if '--preview' in sys.argv:
    preview(os.path.join(os.environ.get('PREV', '/tmp'), 'S_lake.png'), cam_loc=(20, -40, 22), target=(-35, 35, 2), lens=30)
else:
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    export(OUT)
