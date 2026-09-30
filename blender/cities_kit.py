"""Small modelling kit shared by the city landmark scripts (cities_india.py, cities_town.py, cities_campus.py).

Everything is authored in *three.js coordinates* (x along the track, y up, z toward the camera; the
track is at z = 0 and the city stands behind it at negative z) and converted to Blender's Z-up frame
on the way in, so the exported glTF (Y-up) lands exactly where it was designed.

Geometry is accumulated per (group, material) into one bmesh each, so a whole landmark set exports as
a handful of meshes: one per material role (Brick, Stone, Plaster, Roof, Glass, Metal, Wood, Foliage,
Lamp, Water ...). Per-vertex colours carry the tint variation; the page multiplies them in.
"""
import math
import random
from contextlib import contextmanager

import bpy  # noqa: F401  (must precede bmesh when running bpy as a module)
import bmesh
import bpy
from mathutils import Matrix, Vector

# three (x, y, z) -> blender (x, -z, y)
C = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))

# material roles: (roughness, metallic)
ROLES = {
    'Brick': (0.9, 0.0), 'Stone': (0.85, 0.0), 'Plaster': (0.9, 0.0), 'Roof': (0.75, 0.0),
    'Glass': (0.25, 0.2), 'Metal': (0.45, 0.6), 'Wood': (0.8, 0.0), 'Foliage': (0.9, 0.0),
    'Lamp': (0.5, 0.0), 'Water': (0.1, 0.0), 'Paint': (0.5, 0.1), 'Thatch': (1.0, 0.0), 'Ground': (1.0, 0.0),
}


def srgb(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(ch * 2 for ch in h)
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((v / 12.92) if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c) + (1.0,)


def jitter(h, amt=0.06, rnd=random):
    r, g, b, a = srgb(h)
    k = 1 + (rnd.random() * 2 - 1) * amt
    return (min(r * k, 1), min(g * k, 1), min(b * k, 1), 1.0)


class Kit:
    def __init__(self):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        self.bms = {}  # (group, mat) -> bmesh
        self.groups = {}  # name -> origin (x, y, z) in three coords
        self.group = None
        self.stack = [Matrix.Identity(4)]
        self.mats = {}

    # ---------- groups & transforms ----------
    def begin(self, name, origin=(0, 0, 0)):
        self.group = name
        self.groups[name] = origin
        self.stack = [Matrix.Translation(Vector(origin)).inverted()]

    @contextmanager
    def at(self, x=0, y=0, z=0, ry=0, s=1):
        m = Matrix.Translation((x, y, z)) @ Matrix.Rotation(ry, 4, 'Y')
        if s != 1:
            m = m @ Matrix.Scale(s, 4)
        self.stack.append(self.stack[-1] @ m)
        try:
            yield
        finally:
            self.stack.pop()

    def _bm(self, mat):
        key = (self.group, mat)
        if key not in self.bms:
            bm = bmesh.new()
            bm.loops.layers.color.new('Color')
            self.bms[key] = bm
        return self.bms[key]

    def _mx(self, local):
        return C @ self.stack[-1] @ local

    def _paint(self, bm, verts, col, smooth=False, faces=None):
        lay = bm.loops.layers.color['Color']
        if isinstance(col, str):
            col = srgb(col)
        fs = faces if faces is not None else {f for v in verts for f in v.link_faces}
        for f in fs:
            f.smooth = smooth
            for l in f.loops:
                l[lay] = col
        return fs

    # ---------- primitives ----------
    def box(self, x0, y0, z0, x1, y1, z1, mat, col, ry=0):
        """Axis-aligned box from min/max corners (in the current frame), optional yaw about its centre."""
        bm = self._bm(mat)
        cx, cy, cz = (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2
        local = Matrix.Translation((cx, cy, cz)) @ Matrix.Rotation(ry, 4, 'Y') @ Matrix.Diagonal((abs(x1 - x0), abs(y1 - y0), abs(z1 - z0), 1))
        r = bmesh.ops.create_cube(bm, size=1, matrix=self._mx(local))
        self._paint(bm, r['verts'], col)

    def bx(self, cx, y0, cz, w, h, d, mat, col, ry=0):
        """Box by base centre + size."""
        self.box(cx - w / 2, y0, cz - d / 2, cx + w / 2, y0 + h, cz + d / 2, mat, col, ry)

    def cyl(self, cx, y0, cz, r, h, mat, col, seg=12, r2=None, caps=True, smooth=True, rz=0, rx=0, sx=1, sz=1, rot0=0):
        """Cylinder / frustum / cone standing on (cx, y0, cz). rz/rx tilt it about its base."""
        bm = self._bm(mat)
        r2 = r if r2 is None else r2
        local = (Matrix.Translation((cx, y0, cz)) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Rotation(rx, 4, 'X')
                 @ Matrix.Diagonal((sx, 1, sz, 1)) @ Matrix.Translation((0, h / 2, 0)) @ Matrix.Rotation(-math.pi / 2, 4, 'X')
                 @ Matrix.Rotation(rot0, 4, 'Z'))
        # create_cone builds along +Z: rotate so it runs along +Y (three up)
        res = bmesh.ops.create_cone(bm, cap_ends=caps, cap_tris=False, segments=seg, radius1=r, radius2=max(r2, 0.0001) if r2 > 0 else 0,
                                    depth=h, matrix=self._mx(local))
        fs = {f for v in res['verts'] for f in v.link_faces}
        for f in fs:
            f.smooth = smooth and len(f.verts) == 4 or (smooth and r2 == 0 and len(f.verts) == 3)
        lay = bm.loops.layers.color['Color']
        c = srgb(col) if isinstance(col, str) else col
        for f in fs:
            for l in f.loops:
                l[lay] = c

    def cone(self, cx, y0, cz, r, h, mat, col, seg=12, smooth=False, rot0=0):
        self.cyl(cx, y0, cz, r, h, mat, col, seg=seg, r2=0, smooth=smooth, rot0=rot0)

    def pyramid(self, cx, y0, cz, w, d, h, mat, col, top=0.0):
        """Four-sided hip/pyramid roof over a w x d footprint (top: size of flat top as fraction)."""
        s = math.sqrt(2) / 2
        self.cyl(cx, y0, cz, s, h, mat, col, seg=4, r2=s * top if top else 0, smooth=False, sx=w, sz=d, rot0=math.pi / 4)

    def dome(self, cx, y0, cz, r, h, mat, col, seg=20, rings=8):
        """Upper hemisphere of radius r squashed/stretched to height h."""
        bm = self._bm(mat)
        local = Matrix.Translation((cx, y0, cz)) @ Matrix.Diagonal((r, h, r, 1)) @ Matrix.Rotation(-math.pi / 2, 4, 'X')
        res = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings * 2, radius=1, matrix=self._mx(local))
        vs = res['verts']
        cy = (C @ self.stack[-1] @ Vector((cx, y0, cz))).z
        kill = [v for v in vs if v.co.z < cy - 1e-4]
        keep = [v for v in vs if v.co.z >= cy - 1e-4]
        bmesh.ops.delete(bm, geom=kill, context='VERTS')
        self._paint(bm, keep, col, smooth=True)

    def ball(self, cx, cy, cz, r, mat, col, sy=1.0, sub=1, smooth=False):
        bm = self._bm(mat)
        local = Matrix.Translation((cx, cy, cz)) @ Matrix.Diagonal((r, r * sy, r, 1))
        res = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1, matrix=self._mx(local))
        self._paint(bm, res['verts'], col, smooth=smooth)

    def prism(self, pts, z0, z1, mat, col, axis='z', smooth=False):
        """Extrude a 2D polygon. axis='z': pts are (x, y), extruded z0..z1. axis='x': pts are (z, y), extruded along x."""
        bm = self._bm(mat)
        if axis == 'z':
            f3 = lambda a, b, c: Vector((a, b, c))
        else:
            f3 = lambda a, b, c: Vector((c, b, a))
        M = self._mx(Matrix.Identity(4))
        front = [bm.verts.new(M @ f3(p[0], p[1], z1)) for p in pts]
        back = [bm.verts.new(M @ f3(p[0], p[1], z0)) for p in pts]
        faces = []
        faces.append(bm.faces.new(front))
        faces.append(bm.faces.new(list(reversed(back))))
        n = len(pts)
        for i in range(n):
            j = (i + 1) % n
            faces.append(bm.faces.new((front[i], back[i], back[j], front[j])))
        bmesh.ops.recalc_face_normals(bm, faces=faces)
        self._paint(bm, None, col, smooth=smooth, faces=faces)

    def quad(self, p0, p1, p2, p3, mat, col, both=False):
        """Single quad (three coords) - winding p0..p3 counter-clockwise seen from its front."""
        bm = self._bm(mat)
        M = self._mx(Matrix.Identity(4))
        vs = [bm.verts.new(M @ Vector(p)) for p in (p0, p1, p2, p3)]
        fs = [bm.faces.new(vs)]
        if both:
            vs2 = [bm.verts.new(M @ Vector(p)) for p in (p3, p2, p1, p0)]
            fs.append(bm.faces.new(vs2))
        self._paint(bm, None, col, faces=fs)

    def gable(self, x0, x1, z0, z1, y0, h, mat, col, axis='x', over=0.3, thick=0.18):
        """Pitched roof with ridge along `axis`, as a thin folded slab with overhang."""
        if axis == 'x':
            zc, hw = (z0 + z1) / 2, (z1 - z0) / 2 + over
            pts = [(zc - hw, y0 - 0.02), (zc, y0 + h), (zc + hw, y0 - 0.02), (zc + hw - 0.01, y0 - 0.02 - thick), (zc, y0 + h - thick * 1.4), (zc - hw + 0.01, y0 - 0.02 - thick)]
            self.prism(pts, x0 - over, x1 + over, mat, col, axis='x')
        else:
            xc, hw = (x0 + x1) / 2, (x1 - x0) / 2 + over
            pts = [(xc - hw, y0 - 0.02), (xc - hw + 0.01, y0 - 0.02 - thick), (xc, y0 + h - thick * 1.4), (xc + hw - 0.01, y0 - 0.02 - thick), (xc + hw, y0 - 0.02), (xc, y0 + h)]
            self.prism(pts, z0 - over, z1 + over, mat, col, axis='z')

    def gable_end(self, x0, x1, z, y0, h, mat, col, t=0.2):
        """Triangular gable wall filling a roof end (in the x/y plane at z)."""
        self.prism([(x0, y0), (x1, y0), ((x0 + x1) / 2, y0 + h)], z - t, z, mat, col)

    def beam(self, p0, p1, t, mat, col, t2=None):
        """Square-section beam between two points (three coords, current frame)."""
        p0, p1 = Vector(p0), Vector(p1)
        dv = p1 - p0
        L = dv.length
        if L < 1e-5:
            return
        d = dv / L
        up = Vector((0, 1, 0)) if abs(d.y) < 0.95 else Vector((0, 0, 1))
        side = d.cross(up).normalized()
        up2 = side.cross(d).normalized()
        t2 = t if t2 is None else t2
        m = Matrix((
            (d.x * L, up2.x * t, side.x * t2, (p0.x + p1.x) / 2),
            (d.y * L, up2.y * t, side.y * t2, (p0.y + p1.y) / 2),
            (d.z * L, up2.z * t, side.z * t2, (p0.z + p1.z) / 2),
            (0, 0, 0, 1)))
        bm = self._bm(mat)
        r = bmesh.ops.create_cube(bm, size=1, matrix=self._mx(m))
        self._paint(bm, r['verts'], col)

    def lathe(self, cx, y0, cz, prof, mat, col, seg=16, smooth=True, sx=1, sz=1):
        """Surface of revolution from a profile [(r, y), ...] bottom to top (r=0 closes a pole)."""
        bm = self._bm(mat)
        M = self._mx(Matrix.Translation((cx, y0, cz)) @ Matrix.Diagonal((sx, 1, sz, 1)))
        rings = []
        for r, y in prof:
            if r <= 1e-6:
                rings.append([bm.verts.new(M @ Vector((0, y, 0)))])
            else:
                rings.append([bm.verts.new(M @ Vector((r * math.cos(a), y, -r * math.sin(a)))) for a in [i / seg * math.tau for i in range(seg)]])
        faces = []
        for a, b in zip(rings, rings[1:]):
            for i in range(seg):
                j = (i + 1) % seg
                if len(a) == 1 and len(b) == 1:
                    continue
                if len(a) == 1:
                    faces.append(bm.faces.new((a[0], b[i], b[j])))
                elif len(b) == 1:
                    faces.append(bm.faces.new((a[i], a[j], b[0])))
                else:
                    faces.append(bm.faces.new((a[i], a[j], b[j], b[i])))
        if len(rings[0]) > 1:
            faces.append(bm.faces.new(list(reversed(rings[0]))))
        if len(rings[-1]) > 1:
            faces.append(bm.faces.new(rings[-1]))
        bmesh.ops.recalc_face_normals(bm, faces=faces)
        self._paint(bm, None, col, smooth=smooth, faces=faces)
        for f in faces:
            if len(f.verts) > 4:
                f.smooth = False

    # ---------- architecture helpers ----------
    def facade(self, x0, x1, y0, floors, fh, cols, mat, col, win_w=0.45, win_h=0.55, sill=0.3, t=0.35,
               glass='Glass', gcol=None, trim='Stone', tcol='#d8d0c0', reveal=0.18, arch=False, lit=0.55, rnd=random,
               sills=True, lintels=True, z=0, mullion=False):
        """A wall in the x/y plane whose outer face is at z (facing +z), from x0..x1, with a window grid.
        win_w/win_h are fractions of the bay width/floor height. Returns top y."""
        bw = (x1 - x0) / cols
        for f in range(floors):
            fy = y0 + f * fh
            wy0 = fy + fh * sill
            wy1 = wy0 + fh * win_h
            # horizontal bands
            self.box(x0, fy, z - t, x1, wy0, z, mat, col)
            self.box(x0, wy1, z - t, x1, fy + fh, z, mat, col)
            ww = bw * win_w
            for c in range(cols + 1):
                # piers
                if c == 0:
                    px0, px1 = x0, x0 + (bw - ww) / 2
                elif c == cols:
                    px0, px1 = x1 - (bw - ww) / 2, x1
                else:
                    cx = x0 + c * bw
                    px0, px1 = cx - (bw - ww) / 2, cx + (bw - ww) / 2
                self.box(px0, wy0, z - t, px1, wy1, z, mat, col)
            for c in range(cols):
                cx = x0 + (c + 0.5) * bw
                gx0, gx1 = cx - ww / 2, cx + ww / 2
                on = rnd.random() < lit
                g = gcol or ((1.0, 0.72, 0.38, 1) if on else (0.08, 0.09, 0.12, 1))
                if not gcol and on:
                    k = 0.6 + rnd.random() * 0.5
                    g = (g[0] * k, g[1] * k, g[2] * k, 1)
                if arch:
                    # arched head: fill the corners above a semicircle with wall
                    rr = ww / 2
                    ay = wy1 - rr
                    pts = [(gx0, wy1)] + [(cx - rr * math.cos(a), ay + rr * math.sin(a)) for a in [i * math.pi / 8 for i in range(9)]] + [(gx1, wy1)]
                    # spandrels left & right
                    left = [(gx0, wy1)] + [(cx - rr * math.cos(a), ay + rr * math.sin(a)) for a in [i * math.pi / 8 for i in range(5)]]
                    right = [(cx + rr * math.cos(a), ay + rr * math.sin(a)) for a in [i * math.pi / 8 for i in range(4, -1, -1)]] + [(gx1, wy1)]
                    self.prism(left, z - t, z, mat, col)
                    self.prism(list(reversed(right)), z - t, z, mat, col)
                self.box(gx0, wy0, z - t, gx1, wy1, z - reveal, glass, g)
                if mullion:
                    self.box(cx - 0.035, wy0, z - reveal, cx + 0.035, wy1, z - reveal + 0.05, trim, tcol)
                if sills:
                    self.box(gx0 - 0.08, wy0 - 0.1, z - 0.05, gx1 + 0.08, wy0, z + 0.12, trim, tcol)
                if lintels and not arch:
                    self.box(gx0 - 0.06, wy1, z - 0.02, gx1 + 0.06, wy1 + 0.16, z + 0.06, trim, tcol)
        return y0 + floors * fh

    def building(self, cx, cz, w, d, floors, fh, mat, col, cols=None, side_cols=None, base=-1.5, back=True, sides='both', **kw):
        """Four walls with windows on front (+z) and both sides; plain back. Origin = footprint centre at ground."""
        cols = cols or max(1, int(w / 2.2))
        side_cols = side_cols or max(1, int(d / 2.4))
        x0, x1, z0, z1 = cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2
        t = kw.get('t', 0.35)
        # foundation below grade so it sits on uneven ground
        self.box(x0, base, z0, x1, 0.02, z1, kw.get('trim', 'Stone'), kw.get('tcol', '#b0a898'))
        top = self.facade(x0, x1, 0, floors, fh, cols, mat, col, z=z1, **kw)
        if sides in ('both', 'right'):
            with self.at(x1, 0, cz, ry=math.pi / 2):
                self.facade(-d / 2 + t, d / 2 - t, 0, floors, fh, side_cols, mat, col, z=0, **kw)
        else:
            self.box(x1 - t, 0, z0, x1, top, z1 - t, mat, col)
        if sides == 'both':
            with self.at(x0, 0, cz, ry=-math.pi / 2):
                self.facade(-d / 2 + t, d / 2 - t, 0, floors, fh, side_cols, mat, col, z=0, **kw)
        else:
            self.box(x0, 0, z0, x0 + t, top, z1 - t, mat, col)
        if back:
            self.box(x0, 0, z0, x1, top, z0 + t, mat, col)
        # ceiling slab hides the hollow inside from above
        self.box(x0, top - 0.3, z0, x1, top, z1, mat, col)
        return top

    def cornice(self, x0, x1, z0, z1, y, mat, col, h=0.35, over=0.3):
        self.box(x0 - over, y, z0 - over, x1 + over, y + h, z1 + over, mat, col)
        self.box(x0 - over * 0.5, y - h * 0.6, z0 - over * 0.5, x1 + over * 0.5, y, z1 + over * 0.5, mat, col)

    def column(self, cx, y0, cz, r, h, mat, col, seg=10, capital=True):
        self.cyl(cx, y0, cz, r * 1.12, h * 0.9, mat, col, seg=seg, r2=r * 0.92)
        if capital:
            self.bx(cx, y0 + h * 0.9, cz, r * 2.8, h * 0.1, r * 2.8, mat, col)
        self.bx(cx, y0, cz, r * 2.6, h * 0.05, r * 2.6, mat, col)

    def arch_wall(self, x0, x1, y0, spring, top, z0, z1, mat, col, seg=10):
        """A wall piece x0..x1 with a round-arched opening springing at `spring` (full width)."""
        cx, rr = (x0 + x1) / 2, (x1 - x0) / 2
        pts = [(x0, top), (x0, spring)] + [(cx - rr * math.cos(a), spring + rr * math.sin(a)) for a in [i * math.pi / seg for i in range(1, seg)]] + [(x1, spring), (x1, top)]
        self.prism(pts, z0, z1, mat, col)

    def gothic_arch(self, x0, x1, y0, spring, top, z0, z1, mat, col, seg=6):
        """Wall piece with a pointed (equilateral) arch opening."""
        w = x1 - x0
        pts = [(x0, top), (x0, spring)]
        # left arc centred at x1, right arc centred at x0, radius w
        a_end = math.acos(0.5)
        for i in range(1, seg + 1):
            a = math.pi - a_end * i / seg  # from pi toward pi - 60deg
            pts.append((x1 + w * math.cos(a), spring + w * math.sin(a)))
        for i in range(seg - 1, 0, -1):
            a = a_end * i / seg
            pts.append((x0 + w * math.cos(a), spring + w * math.sin(a)))
        pts += [(x1, spring), (x1, top)]
        self.prism(pts, z0, z1, mat, col)

    def palm(self, x, z, h=7, lean=0.15, rnd=random, fr='#3f7a36'):
        """Palm: segmented leaning trunk + drooping fronds."""
        segs = 5
        px, py = x, 0.0
        ang = rnd.random() * math.tau
        dx, dz = math.cos(ang), math.sin(ang)
        for i in range(segs):
            t = (i + 1) / segs
            off = lean * h * t * t
            nx, nz = x + dx * off, z + dz * off
            self.cyl(px, py, (z + dz * lean * h * (i / segs) ** 2), 0.28 - 0.1 * t, h / segs + 0.05, 'Wood', jitter('#7a6248', 0.1, rnd), seg=6,
                     rz=-math.atan2((nx - px), h / segs) * 0.9 if False else 0)
            px, py = nx, py + h / segs
        top = (px, py, z + dz * lean * h)
        for k in range(7):
            a = k / 7 * math.tau + rnd.random() * 0.3
            L = 2.6 + rnd.random() * 0.8
            ca, sa = math.cos(a), math.sin(a)
            p0 = Vector(top)
            mid = p0 + Vector((ca * L * 0.55, 0.45, sa * L * 0.55))
            end = p0 + Vector((ca * L, -1.0 - rnd.random() * 0.6, sa * L))
            side = Vector((-sa, 0, ca)) * 0.45
            c = jitter(fr, 0.12, rnd)
            self.quad(p0 + side * 0.3, p0 - side * 0.3, mid - side, mid + side, 'Foliage', c, both=True)
            self.quad(mid + side, mid - side, end, end + side * 0.05, 'Foliage', c, both=True)
        self.ball(top[0], top[1] - 0.1, top[2], 0.35, 'Wood', '#6a5238', sub=1)

    def tree(self, x, z, h=6, r=2.2, rnd=random, col='#4d7a3a', trunk='#5a4632'):
        self.cyl(x, -0.3, z, 0.22, h * 0.5 + 0.3, 'Wood', trunk, seg=6, r2=0.16)
        for k in range(3):
            a = rnd.random() * math.tau
            self.ball(x + math.cos(a) * r * 0.35, h * (0.62 + 0.12 * k), z + math.sin(a) * r * 0.35, r * (0.85 - 0.12 * k), 'Foliage', jitter(col, 0.12, rnd), sy=0.85, sub=1)

    # ---------- output ----------
    def material(self, role):
        if role in self.mats:
            return self.mats[role]
        m = bpy.data.materials.new(role)
        m.use_nodes = True
        nt = m.node_tree
        bsdf = nt.nodes.get('Principled BSDF')
        rough, metal = ROLES.get(role, (0.8, 0.0))
        bsdf.inputs['Roughness'].default_value = rough
        bsdf.inputs['Metallic'].default_value = metal
        attr = nt.nodes.new('ShaderNodeVertexColor')
        attr.layer_name = 'Color'
        nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
        self.mats[role] = m
        return m

    def finish(self):
        """Turn the accumulated bmeshes into objects: one empty per group, one mesh per material under it."""
        empties = {}
        for g, origin in self.groups.items():
            e = bpy.data.objects.new(g, None)
            o = Vector(origin)
            e.location = C.to_3x3() @ o
            bpy.context.scene.collection.objects.link(e)
            empties[g] = e
        for (g, mat), bm in self.bms.items():
            bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
            me = bpy.data.meshes.new(f'{g}_{mat}')
            bm.to_mesh(me)
            bm.free()
            me.materials.append(self.material(mat))
            ob = bpy.data.objects.new(f'{g}_{mat}', me)
            bpy.context.scene.collection.objects.link(ob)
            ob.parent = empties[g]
        self.bms = {}

    def stats(self):
        tris = 0
        for ob in bpy.data.objects:
            if ob.type == 'MESH':
                ob.data.calc_loop_triangles()
                tris += len(ob.data.loop_triangles)
        return tris

    def export(self, path):
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_draco_mesh_compression_enable=True,
                                  export_apply=True, export_vertex_color='ACTIVE', export_normals=True, export_texcoords=False,
                                  export_materials='EXPORT', export_cameras=False, export_lights=False)

    def preview(self, path, cam=(8, 10, 38), look=(-8, 6, -30), lens=32, res=(1200, 700)):
        """Workbench render from roughly the in-game chase camera (three coords)."""
        scene = bpy.context.scene
        # (Workbench needs EGL, which headless containers lack: a few Cycles CPU samples instead)
        scene.render.engine = 'CYCLES'
        scene.cycles.device = 'CPU'
        scene.cycles.samples = 12
        scene.cycles.use_denoising = False
        scene.render.resolution_x, scene.render.resolution_y = res
        world = bpy.data.worlds.new('w')
        world.use_nodes = True
        world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.65, 0.8, 1)
        world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
        scene.world = world
        sd = bpy.data.lights.new('sun', 'SUN')
        sd.energy = 3.5
        so = bpy.data.objects.new('sun', sd)
        so.rotation_euler = (0.9, 0.3, 0.6)
        scene.collection.objects.link(so)
        cd = bpy.data.cameras.new('cam')
        cd.lens = lens
        cd.clip_end = 1000
        co = bpy.data.objects.new('cam', cd)
        scene.collection.objects.link(co)
        p = C.to_3x3() @ Vector(cam)
        t = C.to_3x3() @ Vector(look)
        co.location = p
        co.rotation_euler = (t - p).to_track_quat('-Z', 'Y').to_euler()
        scene.camera = co
        # a ground plane for context
        me = bpy.data.meshes.new('gp')
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=200, matrix=Matrix.Translation((0, -60, -0.01)))
        bm.to_mesh(me)
        gp = bpy.data.objects.new('gp', me)
        scene.collection.objects.link(gp)
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(gp)
        bpy.data.objects.remove(co)
