"""The Namesake Line: steam locomotive, passenger coach and mail van.

Run headless:  /opt/blendervenv/bin/python blender/train.py [out.glb]
Writes public/models/train.glb (Draco). Coordinates below are written in the site's
three.js frame (x along the track, y up, z across) and converted to Blender (x, -z, y) on the way in.

Exported nodes (all at the origin, positioned by lib/world3d/train.ts):
  Loco, Coach, Van          one mesh each, one primitive per material
  WheelDriver, WheelSmall   unit-radius wheels in the XY plane, axle on +z (outer face +z)
  CouplingRod               centred on the middle driver's crank pin
Material names are the contract with train.ts: Livery / LiveryDark are tinted at runtime with the era
colour, Lens is the name-colour stripe, Glass glows at night, Lamp is the headlight, TailLamp the red lamps.
"""
import bpy, bmesh, math, os, sys, random
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else os.path.join(HERE, '..', 'public', 'models', 'train.glb')
random.seed(7)

bpy.ops.wm.read_factory_settings(use_empty=True)

RAIL_TOP = 0.58
PI = math.pi


def srgb2lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hexcol(h):
    h = h.lstrip('#')
    return [srgb2lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)]


MAT_DEFS = {
    'Livery': ('#ffffff', 0.15, 0.38),
    'LiveryDark': ('#9c9c9c', 0.15, 0.38),
    'Trim': ('#e8d3a0', 0.2, 0.4),
    'Iron': ('#24262d', 0.55, 0.5),
    'Smokebox': ('#18191e', 0.4, 0.6),
    'BufferBeam': ('#9a2424', 0.1, 0.45),
    'Steel': ('#a3a8b0', 0.85, 0.3),
    'WheelPaint': ('#5e1a1c', 0.2, 0.45),
    'Brass': ('#d4ab5c', 0.95, 0.28),
    'Glass': ('#2a1c10', 0.0, 0.3),
    'Lens': ('#f2a33a', 0.0, 0.4),
    'Roof': ('#2b2d36', 0.1, 0.7),
    'Lamp': ('#fff4d0', 0.0, 0.2),
    'TailLamp': ('#ff3020', 0.0, 0.3),
    'Shadow': ('#140e0e', 0.0, 0.9),
    'Coal': ('#101014', 0.0, 0.9),
    'Bellows': ('#1b1c21', 0.0, 0.9),
}
MATS = {}
for name, (hx, metal, rough) in MAT_DEFS.items():
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    bsdf = m.node_tree.nodes.get('Principled BSDF') if m.node_tree else None
    col = hexcol(hx)
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (*col, 1)
        bsdf.inputs['Metallic'].default_value = metal
        bsdf.inputs['Roughness'].default_value = rough
    m.diffuse_color = (*col, 1)
    m.metallic = metal
    m.roughness = rough
    MATS[name] = m

# three (x, y, z) -> blender (x, -z, y)
TO_BL = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
AX = {'x': Matrix.Rotation(PI / 2, 4, 'Y'), 'y': Matrix.Rotation(-PI / 2, 4, 'X'), 'z': Matrix.Identity(4)}


class Unit:
    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.mi = {}

    def add(self, tb, mat):
        bmesh.ops.recalc_face_normals(tb, faces=tb.faces[:])
        idx = self.mi.setdefault(mat, len(self.mi))
        vmap = {}
        for v in tb.verts:
            vmap[v] = self.bm.verts.new(TO_BL @ v.co)
        for f in tb.faces:
            try:
                nf = self.bm.faces.new([vmap[v] for v in f.verts])
                nf.material_index = idx
            except ValueError:
                pass
        tb.free()

    def finish(self, sharp=0.6):
        bm = self.bm
        bm.normal_update()
        for f in bm.faces:
            f.smooth = True
        for e in bm.edges:
            if len(e.link_faces) != 2 or e.calc_face_angle(PI) > sharp:
                e.smooth = False
        me = bpy.data.meshes.new(self.name)
        bm.to_mesh(me)
        bm.free()
        for name, _ in sorted(self.mi.items(), key=lambda kv: kv[1]):
            me.materials.append(MATS[name])
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(ob)
        print(f'{self.name}: {len(me.polygons)} faces, {sum(len(p.vertices) - 2 for p in me.polygons)} tris, mats {list(self.mi)}')
        return ob


U: Unit = None


def xf(bm, m):
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts[:])


def bevel_sharp(bm, off, seg=1, ang=0.7):
    edges = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > ang]
    if edges:
        bmesh.ops.bevel(bm, geom=edges, offset=off, segments=seg, profile=0.5, affect='EDGES', clamp_overlap=True)


def box(x0, y0, z0, x1, y1, z1, mat, bev=0.018, seg=1):
    x0, x1 = min(x0, x1), max(x0, x1)
    y0, y1 = min(y0, y1), max(y0, y1)
    z0, z1 = min(z0, z1), max(z0, z1)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    sx, sy, sz = x1 - x0, y1 - y0, z1 - z0
    xf(bm, Matrix.Translation(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ Matrix.Diagonal((sx, sy, sz, 1)))
    if bev > 0:
        b = min(bev, min(sx, sy, sz) * 0.45)
        if b > 0.002:
            bevel_sharp(bm, b, seg)
    U.add(bm, mat)


def boxm(x0, y0, z0, x1, y1, z1, mat, **kw):
    """box on both sides (mirrored in z)"""
    box(x0, y0, z0, x1, y1, z1, mat, **kw)
    box(x0, y0, -z0, x1, y1, -z1, mat, **kw)


def cyl(axis, c, r, length, mat, seg=16, r2=None, bev=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=length)
    if bev > 0:
        bevel_sharp(bm, bev, 1, 0.9)
    xf(bm, Matrix.Translation(c) @ AX[axis])
    U.add(bm, mat)


def lathe(profile, c, mat, seg=20, axis='y', closed=False, scale=(1, 1)):
    bm = bmesh.new()
    rings = []
    for r, h in profile:
        r *= scale[0]
        h *= scale[1]
        if r < 1e-5:
            rings.append([bm.verts.new((0, 0, h))])
        else:
            rings.append([bm.verts.new((r * math.cos(2 * PI * k / seg), r * math.sin(2 * PI * k / seg), h)) for k in range(seg)])
    pairs = list(zip(rings[:-1], rings[1:]))
    if closed:
        pairs.append((rings[-1], rings[0]))
    for a, b in pairs:
        for k in range(seg):
            k2 = (k + 1) % seg
            if len(a) == 1 and len(b) == 1:
                continue
            if len(a) == 1:
                bm.faces.new((a[0], b[k], b[k2]))
            elif len(b) == 1:
                bm.faces.new((a[k], b[0], a[k2]))
            else:
                bm.faces.new((a[k], b[k], b[k2], a[k2]))
    # cap an open first ring
    if not closed and len(rings[0]) > 1:
        bm.faces.new(rings[0])
    if not closed and len(rings[-1]) > 1:
        bm.faces.new(rings[-1])
    xf(bm, Matrix.Translation(c) @ AX[axis])
    U.add(bm, mat)


def torus(axis, c, R, r, mat, su=32, sv=6):
    prof = [(R + r * math.cos(2 * PI * k / sv), r * math.sin(2 * PI * k / sv)) for k in range(sv)]
    lathe(prof, c, mat, seg=su, axis=axis, closed=True)


def sphere(c, r, mat, scale=(1, 1, 1), u=12, v=8):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=r)
    xf(bm, Matrix.Translation(c) @ Matrix.Diagonal((*scale, 1)))
    U.add(bm, mat)


def rod(p0, p1, r, mat, seg=8):
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r, depth=d.length)
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    xf(bm, Matrix.Translation((p0 + p1) / 2) @ rot)
    U.add(bm, mat)


def poly(pts, r, mat, seg=8):
    for a, b in zip(pts[:-1], pts[1:]):
        rod(a, b, r, mat, seg)
    for p in pts[1:-1]:
        sphere(p, r, mat, u=seg, v=4)


def arch(x0, x1, base, hw, h, mat, seg=18):
    """half-elliptic prism along x (a curved roof), closed underneath"""
    bm = bmesh.new()
    ends = []
    for x in (x0, x1):
        ends.append([bm.verts.new((x, base + h * math.sin(PI * k / seg), hw * math.cos(PI * k / seg))) for k in range(seg + 1)])
    a, b = ends
    for k in range(seg):
        bm.faces.new((a[k], a[k + 1], b[k + 1], b[k]))
    bm.faces.new((a[seg], a[0], b[0], b[seg]))
    bm.faces.new(a)
    bm.faces.new(b[::-1])
    U.add(bm, mat)


def sector(c, r0, r1, a0, a1, z0, z1, mat, seg=12):
    """annular sector in the XY plane, thickness along z (wheel counterweight)"""
    bm = bmesh.new()
    rings = []
    for z in (z0, z1):
        inner = [bm.verts.new((c[0] + r0 * math.cos(a0 + (a1 - a0) * k / seg), c[1] + r0 * math.sin(a0 + (a1 - a0) * k / seg), z)) for k in range(seg + 1)]
        outer = [bm.verts.new((c[0] + r1 * math.cos(a0 + (a1 - a0) * k / seg), c[1] + r1 * math.sin(a0 + (a1 - a0) * k / seg), z)) for k in range(seg + 1)]
        rings.append((inner, outer))
    (i0, o0), (i1, o1) = rings
    for k in range(seg):
        bm.faces.new((i1[k], o1[k], o1[k + 1], i1[k + 1]))
        bm.faces.new((i0[k + 1], o0[k + 1], o0[k], i0[k]))
        bm.faces.new((o0[k], o0[k + 1], o1[k + 1], o1[k]))
        bm.faces.new((i0[k + 1], i0[k], i1[k], i1[k + 1]))
    bm.faces.new((i0[0], o0[0], o1[0], i1[0]))
    bm.faces.new((i1[seg], o1[seg], o0[seg], i0[seg]))
    U.add(bm, mat)


def rivet(p, r=0.028):
    sphere(p, r, 'Iron', u=6, v=4)


# ============================================================ locomotive
U = Unit('Loco')
DRV_R, SML_R = 0.78, 0.45
DRV_Y, SML_Y = RAIL_TOP + DRV_R, RAIL_TOP + SML_R
BY = 3.1  # boiler axis height

# frames, running board, valance (lens stripe)
boxm(-4.3, 0.95, 0.5, 4.05, 2.16, 0.6, 'Iron', bev=0.01)
box(-4.2, 1.0, -0.5, 4.0, 1.3, 0.5, 'Iron', bev=0)
box(-1.6, 2.16, -1.2, 4.02, 2.22, 1.2, 'Iron', bev=0.01)
boxm(-1.6, 2.04, 1.165, 4.02, 2.16, 1.205, 'Lens', bev=0.008)
# boiler + lined bands
cyl('x', (0.7, BY, 0), 0.95, 4.6, 'Livery', seg=44)
for bx in (-1.1, 0.35, 1.85):
    torus('x', (bx, BY, 0), 0.953, 0.03, 'Brass', su=44, sv=6)
    for o in (-0.085, 0.085):
        torus('x', (bx + o, BY, 0), 0.95, 0.011, 'Trim', su=44, sv=4)
torus('x', (2.97, BY, 0), 0.975, 0.035, 'Brass', su=44, sv=6)
# smokebox, door, hinges, dart, rivets
cyl('x', (3.525, BY, 0), 1.0, 1.05, 'Smokebox', seg=44)
sphere((4.03, BY, 0), 0.86, 'Smokebox', scale=(0.19, 1, 1), u=36, v=16)
torus('x', (4.05, BY, 0), 0.875, 0.04, 'Brass', su=40, sv=6)
for hy in (BY + 0.36, BY - 0.36):
    box(4.1, hy - 0.045, -0.05, 4.17, hy + 0.045, 0.76, 'Steel', bev=0.012)
    cyl('y', (4.13, hy, 0.78), 0.05, 0.16, 'Steel', seg=10)
cyl('x', (4.22, BY, 0), 0.055, 0.16, 'Steel', seg=12)
box(4.28, BY - 0.03, -0.2, 4.32, BY + 0.03, 0.2, 'Steel', bev=0.01)
sphere((4.19, BY - 0.6, 0), 0.13, 'Brass', scale=(0.25, 1, 1), u=16, v=8)  # number disc
for rx in (3.06, 3.99):
    for k in range(27):
        a = math.radians(-40 + k * 10)
        rivet((rx, BY + 1.0 * math.sin(a), 1.0 * math.cos(a)))
# smokebox front handrail
rod((4.16, BY + 0.72, -0.42), (4.16, BY + 0.72, 0.42), 0.022, 'Brass')
for z in (-0.42, 0.42):
    rod((4.08, BY + 0.72, z), (4.16, BY + 0.72, z), 0.016, 'Brass', seg=6)
# chimney (flared, capped)
CH = (3.45, 3.82, 0)
lathe([(0.46, 0), (0.37, 0.22), (0.31, 0.55), (0.31, 0.85), (0.38, 1.08), (0.47, 1.24), (0.53, 1.33), (0.54, 1.42), (0.47, 1.44), (0.35, 1.32), (0.0, 1.32)], CH, 'Smokebox', seg=32)
torus('y', (3.45, 5.21, 0), 0.535, 0.032, 'Brass', su=32, sv=6)
torus('y', (3.45, 4.05, 0), 0.37, 0.03, 'Smokebox', su=32, sv=6)
# steam dome (brass), sand dome (livery), safety valves, whistle
lathe([(0.58, 0), (0.48, 0.07), (0.43, 0.24), (0.43, 0.55), (0.4, 0.72), (0.31, 0.86), (0.16, 0.93), (0, 0.95)], (1.35, 3.84, 0), 'Brass', seg=32)
lathe([(0.47, 0), (0.39, 0.06), (0.35, 0.18), (0.35, 0.36), (0.3, 0.5), (0.18, 0.6), (0, 0.63)], (-0.2, 3.88, 0), 'Livery', seg=28)
torus('y', (-0.2, 4.08, 0), 0.355, 0.02, 'Brass', su=28, sv=5)
lathe([(0.26, 0), (0.16, 0.1), (0.11, 0.25), (0.11, 0.35), (0.17, 0.5), (0.2, 0.56), (0.15, 0.59), (0, 0.59)], (-1.15, 3.95, 0), 'Brass', seg=20)
for z in (-0.07, 0.07):
    cyl('y', (-1.15, 4.62, z), 0.045, 0.12, 'Brass', seg=10)
rod((-1.45, 3.97, 0.35), (-1.45, 4.5, 0.35), 0.025, 'Brass')
lathe([(0.06, 0), (0.075, 0.05), (0.075, 0.24), (0.05, 0.28), (0.02, 0.33), (0, 0.33)], (-1.45, 4.48, 0.35), 'Brass', seg=12)
# handrails along the boiler
for s in (-1, 1):
    rod((-1.5, 3.56, s * 0.99), (3.95, 3.56, s * 0.99), 0.022, 'Brass')
    for hx in (-1.0, 0.6, 2.2, 3.6):
        rod((hx, 3.56, s * 0.82), (hx, 3.56, s * 0.99), 0.016, 'Brass', seg=6)
    # sandboxes, reversing rod, sand pipe
    box(0.35, 2.22, s * 0.9, 0.95, 2.55, s * 1.15, 'Livery', bev=0.03)
    box(0.33, 2.52, s * 0.88, 0.97, 2.57, s * 1.17, 'Trim', bev=0.01)
    rod((-1.6, 2.62, s * 1.1), (0.9, 2.34, s * 1.1), 0.022, 'Iron', seg=6)
    rod((0.7, 2.18, s * 1.02), (0.72, 0.76, s * 0.8), 0.02, 'Iron', seg=6)
# cylinders, valve chests, slide bars, motion bracket
for s in (-1, 1):
    cyl('x', (2.55, 1.5, s * 1.0), 0.34, 1.2, 'Iron', seg=28, bev=0.02)
    for cx in (1.96, 3.14):
        cyl('x', (cx, 1.5, s * 1.0), 0.365, 0.07, 'Brass', seg=28)
    sphere((3.19, 1.5, s * 1.0), 0.24, 'Iron', scale=(0.35, 1, 1), u=20, v=8)
    box(2.0, 1.84, s * 0.8, 3.1, 2.16, s * 1.2, 'Iron', bev=0.03)
    rod((1.95, 1.5, s * 0.97), (1.4, 1.5, s * 0.97), 0.035, 'Steel')
    for yy in (1.36, 1.64):
        box(0.95, yy - 0.02, s * 0.93, 1.96, yy + 0.02, s * 1.01, 'Steel', bev=0.006)
    box(0.9, 1.3, s * 0.62, 0.98, 2.16, s * 0.88, 'Iron', bev=0.01)
    for k in range(6):
        a = 2 * PI * k / 6
        rivet((3.2, 1.5 + 0.3 * math.sin(a), s * (1.0 + 0.3 * math.cos(a))), 0.022)
# cab: lower panel, waist band, posts, window surrounds, roof
box(-4.3, 1.55, -1.18, -1.6, 2.4, 1.18, 'Livery', bev=0.03)
box(-4.32, 2.4, -1.2, -1.58, 2.5, 1.2, 'Trim', bev=0.015)
box(-4.3, 2.5, -1.18, -3.9, 4.45, 1.18, 'Livery', bev=0.03)
box(-2.0, 2.5, -1.18, -1.6, 4.45, 1.18, 'Livery', bev=0.03)
box(-3.9, 2.5, -1.18, -2.0, 2.95, 1.18, 'Livery', bev=0.02)
box(-3.9, 3.95, -1.18, -2.0, 4.45, 1.18, 'Livery', bev=0.02)
box(-3.9, 2.95, -1.12, -2.0, 3.95, 1.12, 'Glass', bev=0)
# the crew, silhouetted in the cab windows
for s, cx in ((1, -2.55), (-1, -3.3)):
    sphere((cx, 3.62, s * 1.135), 0.15, 'Shadow', scale=(1, 1.1, 0.2), u=10, v=6)
    sphere((cx, 3.1, s * 1.135), 1.0, 'Shadow', scale=(0.3, 0.36, 0.03), u=12, v=6)
    box(cx - 0.17, 3.6, s * 1.11, cx + 0.19, 3.66, s * 1.145, 'Shadow', bev=0)  # cap brim
for s in (-1, 1):
    # brass window beading
    box(-3.93, 3.93, s * 1.17, -1.97, 3.98, s * 1.2, 'Brass', bev=0.008)
    box(-3.93, 2.92, s * 1.17, -1.97, 2.97, s * 1.2, 'Brass', bev=0.008)
    box(-3.95, 2.92, s * 1.17, -3.9, 3.98, s * 1.2, 'Brass', bev=0.008)
    box(-2.0, 2.92, s * 1.17, -1.95, 3.98, s * 1.2, 'Brass', bev=0.008)
    # lining panel round the nameplate + stripe
    for (a, b, c, d) in ((-4.2, 1.68, -1.7, 1.71), (-4.2, 2.27, -1.7, 2.3), (-4.2, 1.68, -4.17, 2.3), (-1.73, 1.68, -1.7, 2.3)):
        box(a, b, s * 1.175, c, d, s * 1.19, 'Trim', bev=0)
    box(-4.3, 1.55, s * 1.17, -1.6, 1.64, s * 1.192, 'Lens', bev=0.006)
    # front spectacles
    cyl('x', (-1.585, 3.95, s * 0.74), 0.2, 0.03, 'Glass', seg=20)
    torus('x', (-1.575, 3.95, s * 0.74), 0.2, 0.025, 'Brass', su=20, sv=5)
    # grab rails at the cab back, steps
    rod((-4.37, 1.75, s * 1.08), (-4.37, 3.9, s * 1.08), 0.022, 'Brass')
    for yy in (1.75, 3.9):
        rod((-4.3, yy, s * 1.08), (-4.37, yy, s * 1.08), 0.016, 'Brass', seg=6)
    box(-4.25, 1.16, s * 1.0, -3.8, 1.21, s * 1.3, 'Iron', bev=0.01)
    box(-4.25, 0.84, s * 1.05, -3.8, 0.89, s * 1.3, 'Iron', bev=0.01)
    box(-4.24, 0.84, s * 1.25, -4.2, 1.55, s * 1.29, 'Iron', bev=0)
    box(-3.85, 0.84, s * 1.25, -3.81, 1.55, s * 1.29, 'Iron', bev=0)
    # rain strip
    rod((-4.5, 4.64, s * 1.1), (-1.4, 4.64, s * 1.1), 0.02, 'Roof', seg=6)
arch(-4.58, -1.35, 4.45, 1.34, 0.32, 'Roof', seg=20)
box(-4.6, 4.42, -1.36, -1.33, 4.46, 1.36, 'Roof', bev=0.01)
box(-3.3, 4.72, -0.32, -2.5, 4.84, 0.32, 'Roof', bev=0.03)
# bunker + coal, rear buffer beam and buffers
box(-4.68, 1.55, -1.05, -4.3, 3.05, 1.05, 'Livery', bev=0.03)
box(-4.71, 3.0, -1.08, -4.28, 3.08, 1.08, 'Trim', bev=0.01)
for k in range(14):
    sphere((-4.5 + random.uniform(-0.12, 0.12), 3.08 + random.uniform(0, 0.12), random.uniform(-0.85, 0.85)), random.uniform(0.1, 0.17), 'Coal', scale=(1, 0.6, 1), u=6, v=4)
box(-4.75, 1.1, -1.22, -4.55, 1.6, 1.22, 'BufferBeam', bev=0.02)


def buffers(xface, dirn, y, zs=(-0.85, 0.85), reach=0.25):
    for z in zs:
        cyl('x', (xface + dirn * reach * 0.45, y, z), 0.09, reach * 0.9, 'Iron', seg=12)
        cyl('x', (xface + dirn * 0.06, y, z), 0.13, 0.12, 'Iron', seg=12)
        cyl('x', (xface + dirn * (reach - 0.02), y, z), 0.19, 0.045, 'Steel', seg=18, bev=0.01)


buffers(-4.75, -1, 1.35, reach=0.24)
# front buffer beam, buffers, coupling hook, rivets
box(4.05, 1.1, -1.22, 4.25, 1.65, 1.22, 'BufferBeam', bev=0.02)
buffers(4.25, 1, 1.38, reach=0.3)
box(4.25, 1.31, -0.05, 4.48, 1.43, 0.05, 'Iron', bev=0.01)
torus('z', (4.52, 1.37, 0), 0.06, 0.018, 'Iron', su=10, sv=4)
for k in range(9):
    z = -1.0 + k * 0.25
    rivet((4.255, 1.58, z), 0.022)
    rivet((4.255, 1.17, z), 0.022)
# cowcatcher
tops, bots = [], []
for k in range(9):
    z = -1.0 + k * 0.25
    tops.append((4.27, 1.08, z))
    bots.append((5.12 - 0.42 * abs(z), 0.66, z * 0.92))
    rod(tops[-1], bots[-1], 0.03, 'Iron', seg=6)
poly(tops, 0.035, 'Iron', seg=6)
poly(bots, 0.035, 'Iron', seg=6)
# headlamp on the smokebox top
cyl('x', (3.93, 4.33, 0), 0.25, 0.28, 'Iron', seg=24, bev=0.015)
cyl('x', (4.08, 4.33, 0), 0.2, 0.025, 'Lamp', seg=24)
torus('x', (4.075, 4.33, 0), 0.215, 0.03, 'Brass', su=24, sv=6)
lathe([(0.1, 0), (0.1, 0.08), (0.14, 0.1), (0.05, 0.18), (0, 0.18)], (3.93, 4.56, 0), 'Iron', seg=12)
box(3.8, 4.05, -0.14, 4.02, 4.1, 0.14, 'Iron', bev=0.01)
loco = U.finish()

# ============================================================ carriages (shared parts)


def underframe(van=False):
    box(-4.0, 1.06, -0.55, 4.0, 1.42, 0.55, 'Iron', bev=0.01)
    boxm(-4.2, 1.28, 0.95, 4.2, 1.42, 1.08, 'Iron', bev=0.01)
    for sx in (-1, 1):
        box(sx * 4.2, 1.1, -1.2, sx * 4.32, 1.46, 1.2, 'BufferBeam' if van else 'Iron', bev=0.015)
        buffers(sx * 4.32, sx, 1.3, zs=(-0.85, 0.85), reach=0.18)
        box(sx * 4.32, 1.24, -0.05, sx * 4.48, 1.36, 0.05, 'Iron', bev=0.01)
    # truss rods, queen posts, vacuum cylinder
    for z in (-0.72, 0.72):
        poly([(-3.2, 1.08, z), (-1.5, 0.8, z), (1.5, 0.8, z), (3.2, 1.08, z)], 0.024, 'Iron', seg=6)
        for qx in (-1.5, 1.5):
            rod((qx, 0.8, z), (qx, 1.08, z), 0.028, 'Iron', seg=6)
    cyl('z', (0, 0.9, 0), 0.2, 0.7, 'Iron', seg=16)
    # bogies
    for bx in (-2.85, 2.85):
        for s in (-1, 1):
            box(bx - 1.05, 0.95, s * 0.84, bx + 1.05, 1.18, s * 0.92, 'Iron', bev=0.02)
            for ax in (-0.7, 0.7):
                box(bx + ax - 0.13, 0.86, s * 0.88, bx + ax + 0.13, 1.14, s * 1.0, 'Iron', bev=0.02)
                cyl('z', (bx + ax, 1.0, s * 1.005), 0.07, 0.02, 'Steel', seg=10)
            for k in range(3):
                box(bx - 0.36 + k * 0.04, 1.19 + k * 0.03, s * 0.85, bx + 0.36 - k * 0.04, 1.22 + k * 0.03, s * 0.95, 'Steel', bev=0.006)
        box(bx - 0.25, 1.0, -0.84, bx + 0.25, 1.1, 0.84, 'Iron', bev=0.01)


def gangway(sx):
    box(sx * 4.2, 1.62, -0.55, sx * 4.42, 3.4, 0.55, 'Bellows', bev=0.03)
    for k in range(3):
        xx = sx * (4.25 + k * 0.07)
        box(xx - 0.015, 1.58, -0.59, xx + 0.015, 3.44, 0.59, 'Bellows', bev=0.008)
    box(sx * 4.42, 1.6, -0.6, sx * 4.46, 3.42, 0.6, 'Iron', bev=0.01)


def lining(x0, y0, x1, y1, z, w=0.034):
    for s in (-1, 1):
        for (a, b, c, d) in ((x0, y0, x1, y0 + w), (x0, y1 - w, x1, y1), (x0, y0, x0 + w, y1), (x1 - w, y0, x1, y1)):
            box(a, b, s * z, c, d, s * (z + 0.016), 'Trim', bev=0)


# ============================================================ passenger coach
U = Unit('Coach')
underframe()
WIN = [-2.68, -1.34, 0.0, 1.34, 2.68]
DOOR = [-3.72, 3.72]
box(-4.2, 1.42, -1.16, 4.2, 2.3, 1.16, 'LiveryDark', bev=0.03)
box(-4.21, 2.3, -1.172, 4.21, 2.42, 1.172, 'Trim', bev=0.012)
box(-4.21, 2.2, -1.168, 4.21, 2.28, 1.168, 'Lens', bev=0.006)
box(-4.2, 3.28, -1.16, 4.2, 3.55, 1.16, 'Livery', bev=0.03)
box(-4.21, 3.26, -1.168, 4.21, 3.29, 1.168, 'Brass', bev=0)
openings = sorted([(x - 0.44, x + 0.44) for x in WIN] + [(x - 0.17, x + 0.17) for x in DOOR])
edges = [-4.2]
for a, b in openings:
    edges += [a, b]
edges.append(4.2)
for k in range(0, len(edges), 2):
    box(edges[k], 2.42, -1.16, edges[k + 1], 3.28, 1.16, 'Livery', bev=0.035, seg=2)
for x in DOOR:  # door windows are droplights: fill the lower part
    box(x - 0.17, 2.42, -1.15, x + 0.17, 2.62, 1.15, 'Livery', bev=0.02)
box(-4.1, 2.42, -1.1, 4.1, 3.28, 1.1, 'Glass', bev=0)
for x in WIN:
    lining(x - 0.46, 1.52, x + 0.46, 2.14, 1.16)
for x in DOOR:
    lining(x - 0.27, 1.52, x + 0.27, 2.14, 1.16)
    for s in (-1, 1):
        for gx in (x - 0.31, x + 0.31):
            box(gx - 0.012, 1.46, s * 1.16, gx + 0.012, 3.5, s * 1.166, 'Shadow', bev=0)
        cyl('z', (x + 0.2 * (1 if x > 0 else -1), 2.36, s * 1.19), 0.03, 0.06, 'Brass', seg=8)
        gx = x + 0.4 * (1 if x > 0 else -1)
        rod((gx, 1.95, s * 1.21), (gx, 3.0, s * 1.21), 0.018, 'Brass', seg=6)
        for yy in (1.95, 3.0):
            rod((gx, yy, s * 1.16), (gx, yy, s * 1.21), 0.013, 'Brass', seg=6)
# passengers in the windows
for k, x in enumerate(WIN):
    if k == 2:
        continue
    for s in (-1, 1):
        px = x + (0.14 if (k + (s > 0)) % 2 else -0.14)
        sphere((px, 3.0, s * 1.11), 0.14, 'Shadow', scale=(1, 1.1, 0.25), u=10, v=6)
        cyl('y', (px, 2.63, s * 1.11), 0.24, 0.42, 'Shadow', seg=10, r2=0.12)
# footboards
boxm(-3.9, 1.26, 1.16, 3.9, 1.31, 1.32, 'Iron', bev=0.01)
# roof, clerestory with lights, torpedo vents, gutters
arch(-4.35, 4.35, 3.55, 1.28, 0.42, 'Roof', seg=22)
box(-4.37, 3.52, -1.3, 4.37, 3.56, 1.3, 'Roof', bev=0.01)
box(-3.0, 3.8, -0.46, 3.0, 4.18, 0.46, 'Roof', bev=0.03)
boxm(-2.8, 3.92, 0.455, 2.8, 4.08, 0.47, 'Glass', bev=0)
for k in range(8):
    xx = -2.8 + 0.1 + k * 0.7
    boxm(xx - 0.03, 3.92, 0.46, xx + 0.03, 4.08, 0.475, 'Roof', bev=0)
box(-3.12, 4.18, -0.55, 3.12, 4.24, 0.55, 'Roof', bev=0.02)
for vx in (-3.6, -1.9, 1.9, 3.6):
    for z in (-0.75, 0.75):
        lathe([(0.09, 0), (0.11, 0.06), (0.11, 0.15), (0.06, 0.2), (0, 0.21)], (vx, 3.84, z), 'Iron', seg=10)
for s in (-1, 1):
    rod((-4.35, 3.58, s * 1.26), (4.35, 3.58, s * 1.26), 0.02, 'Roof', seg=6)
for sx in (-1, 1):
    gangway(sx)
    for s in (-1, 1):
        rod((sx * 4.24, 1.6, s * 0.95), (sx * 4.24, 3.3, s * 0.95), 0.018, 'Brass', seg=6)
coach = U.finish()

# ============================================================ mail / baggage van
U = Unit('Van')
underframe(van=True)
box(-4.2, 1.42, -1.1, 4.2, 3.7, 1.1, 'LiveryDark', bev=0.02)
PW = 0.3
for k in range(28):
    x = -4.2 + k * PW
    if -1.05 < x + PW / 2 < 1.05:
        continue
    boxm(x + 0.004, 1.45, 1.1, x + PW - 0.004, 3.66, 1.16, 'Livery', bev=0.014)
boxm(-4.21, 1.98, 1.1, 4.21, 2.06, 1.172, 'Lens', bev=0.006)
for dx in (-0.95, 0.05):
    boxm(dx, 1.52, 1.1, dx + 0.9, 3.4, 1.19, 'LiveryDark', bev=0.02)
    for k in range(1, 4):  # planked door
        xx = dx + k * 0.225
        boxm(xx - 0.008, 1.55, 1.185, xx + 0.008, 3.37, 1.195, 'Shadow', bev=0)
    for (a, b, c, d) in ((dx, 1.52, dx + 0.9, 1.6), (dx, 3.32, dx + 0.9, 3.4), (dx, 1.52, dx + 0.07, 3.4), (dx + 0.83, 1.52, dx + 0.9, 3.4), (dx, 2.42, dx + 0.9, 2.5)):
        boxm(a, b, 1.19, c, d, 1.21, 'Trim', bev=0.008)
    for s in (-1, 1):
        rod((dx + 0.1, 1.62, s * 1.215), (dx + 0.8, 2.4, s * 1.215), 0.022, 'Trim', seg=6)
        rod((dx + 0.1, 2.52, s * 1.215), (dx + 0.8, 3.3, s * 1.215), 0.022, 'Trim', seg=6)
        hx = dx + (0.16 if dx < 0 else 0.74)
        rod((hx, 2.2, s * 1.23), (hx, 2.72, s * 1.23), 0.022, 'Brass', seg=6)
boxm(-1.12, 3.42, 1.1, 1.12, 3.5, 1.23, 'Iron', bev=0.01)
boxm(-1.12, 1.42, 1.1, 1.12, 1.5, 1.23, 'Iron', bev=0.01)
for wx in (-3.4, 3.4):
    boxm(wx - 0.3, 2.7, 1.1, wx + 0.3, 3.2, 1.175, 'Glass', bev=0)
    for (a, b, c, d) in ((wx - 0.35, 2.65, wx + 0.35, 2.7), (wx - 0.35, 3.2, wx + 0.35, 3.25), (wx - 0.35, 2.65, wx - 0.3, 3.25), (wx + 0.3, 2.65, wx + 0.35, 3.25)):
        boxm(a, b, 1.16, c, d, 1.185, 'Trim', bev=0.006)
    for bx2 in (-0.1, 0.1):
        boxm(wx + bx2 - 0.012, 2.7, 1.17, wx + bx2 + 0.012, 3.2, 1.18, 'Iron', bev=0)
# mail badge
boxm(-2.55, 2.68, 1.16, -1.3, 3.12, 1.18, 'Trim', bev=0.015)
lining(-2.5, 2.73, -1.35, 3.07, 1.18, w=0.018)
for s in (-1, 1):
    cyl('z', (-1.925, 2.9, s * 1.19), 0.13, 0.03, 'Brass', seg=20)
    cyl('z', (-2.25, 2.9, s * 1.186), 0.07, 0.02, 'BufferBeam', seg=14)
    cyl('z', (-1.6, 2.9, s * 1.186), 0.07, 0.02, 'BufferBeam', seg=14)
# footboards, cornice, roof, vents
boxm(-3.9, 1.26, 1.1, 3.9, 1.31, 1.3, 'Iron', bev=0.01)
box(-4.26, 3.66, -1.2, 4.26, 3.74, 1.2, 'Iron', bev=0.015)
arch(-4.3, 4.3, 3.72, 1.3, 0.26, 'Roof', seg=20)
for vx in (-2.6, 0.0, 2.6):
    lathe([(0.16, 0), (0.2, 0.14), (0.2, 0.24), (0.14, 0.3), (0, 0.32)], (vx, 3.9, 0), 'Iron', seg=14)
for s in (-1, 1):
    rod((-4.3, 3.73, s * 1.27), (4.3, 3.73, s * 1.27), 0.02, 'Roof', seg=6)
# rear end (-x): guard's windows, tail lamps, handrails. front end: gangway
for s in (-1, 1):
    box(-4.225, 2.8, s * 0.3, -4.2, 3.2, s * 0.7, 'Glass', bev=0)
    for (a, b, c, d) in ((2.75, 0.25, 2.8, 0.75), (3.2, 0.25, 3.25, 0.75), (2.75, 0.25, 3.25, 0.3), (2.75, 0.7, 3.25, 0.75)):
        box(-4.235, a, s * b, -4.2, c, s * d, 'Trim', bev=0)
    cyl('x', (-4.3, 3.3, s * 0.8), 0.13, 0.18, 'Iron', seg=16, bev=0.01)
    cyl('x', (-4.395, 3.3, s * 0.8), 0.1, 0.03, 'TailLamp', seg=16)
    lathe([(0.05, 0), (0.05, 0.08), (0, 0.12)], (-4.3, 3.43, s * 0.8), 'Iron', seg=8)
    rod((-4.27, 1.6, s * 1.02), (-4.27, 3.5, s * 1.02), 0.02, 'Brass', seg=6)
    for yy in (1.6, 3.5):
        rod((-4.2, yy, s * 1.02), (-4.27, yy, s * 1.02), 0.014, 'Brass', seg=6)
gangway(1)
van = U.finish()

# ============================================================ wheels (unit radius, XY plane, axle +z)


def wheel(name, spokes, spoke_w, hub_r, seg, driver):
    global U
    U = Unit(name)
    lathe([(0.86, -0.08), (1.075, -0.08), (1.075, -0.055), (1.0, -0.035), (1.0, 0.08), (0.86, 0.08)], (0, 0, 0), 'Steel', seg=seg, axis='z', closed=True)
    lathe([(0.76, -0.05), (0.87, -0.05), (0.87, 0.065), (0.76, 0.065)], (0, 0, 0), 'WheelPaint', seg=seg, axis='z', closed=True)
    for k in range(spokes):
        a = 2 * PI * (k + 0.5) / spokes
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1)
        for v in bm.verts:  # taper toward the rim
            t = v.co.x + 0.5
            v.co.y *= (1.0 - 0.35 * t)
        xf(bm, Matrix.Rotation(a, 4, 'Z') @ Matrix.Translation(((hub_r + 0.8) / 2, 0, 0.01)) @ Matrix.Diagonal((0.8 - hub_r + 0.04, spoke_w, 0.07, 1)))
        U.add(bm, 'WheelPaint')
    lathe([(hub_r, -0.06), (hub_r, 0.07), (hub_r * 0.8, 0.1), (0.1, 0.1), (0.1, 0.14), (0, 0.14)], (0, 0, 0), 'WheelPaint', seg=20, axis='z')
    cyl('z', (0, 0, 0.135), 0.07, 0.03, 'Steel', seg=12)
    if driver:
        sector((0, 0), 0.24, 0.77, PI - 0.8, PI + 0.8, -0.035, 0.075, 'WheelPaint', seg=14)
        cyl('z', (0.436, 0, 0.06), 0.13, 0.13, 'WheelPaint', seg=16)
        cyl('z', (0.436, 0, 0.19), 0.06, 0.16, 'Steel', seg=12)
    return U.finish(sharp=0.8)


wd = wheel('WheelDriver', 16, 0.085, 0.2, 36, True)
ws = wheel('WheelSmall', 10, 0.13, 0.26, 22, False)

# ============================================================ coupling rod (centred on the middle crank pin)
U = Unit('CouplingRod')
box(-1.6, -0.06, -0.03, 1.6, 0.06, 0.03, 'Steel', bev=0.015)
for x in (-1.6, 0.0, 1.6):
    cyl('z', (x, 0, 0), 0.115, 0.075, 'Steel', seg=16, bev=0.012)
    cyl('z', (x, 0, 0.045), 0.05, 0.03, 'Iron', seg=10)
rod_ob = U.finish()

os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=os.path.abspath(OUT), export_format='GLB', export_draco_mesh_compression_enable=True,
                          export_apply=True, export_materials='EXPORT', export_yup=True)
print('wrote', os.path.abspath(OUT), os.path.getsize(os.path.abspath(OUT)))

# optional preview render: TRAIN_PREVIEW=/path/prefix
PREV = os.environ.get('TRAIN_PREVIEW')
if PREV:
    MATS['Livery'].diffuse_color = (*hexcol('#7a2230'), 1)
    MATS['LiveryDark'].diffuse_color = (*[c * 0.35 for c in hexcol('#7a2230')], 1)
    coach.location.x = -9.55
    van.location.x = -18.6
    for ob, xs, y, zs, r in ((wd, (-3.35, -1.75, -0.15), DRV_Y, (0.74, -0.74), DRV_R), (ws, (2.15, 3.35), SML_Y, (0.74, -0.74), SML_R)):
        for x in xs:
            for z in zs:
                c = ob.copy()
                bpy.context.scene.collection.objects.link(c)
                c.location = (x, -z, y)
                c.scale = (r, 1, r)
                if z < 0:
                    c.rotation_euler = (0, 0, PI)
    for cx in (-9.55, -18.6):
        for x in (-3.55, -2.15, 2.15, 3.55):
            for z in (0.74, -0.74):
                c = ws.copy()
                bpy.context.scene.collection.objects.link(c)
                c.location = (cx + x, -z, SML_Y)
                c.scale = (SML_R, 1, SML_R)
                if z < 0:
                    c.rotation_euler = (0, 0, PI)
    for z in (0.9, -0.9):
        c = rod_ob.copy()
        bpy.context.scene.collection.objects.link(c)
        c.location = (-1.75 + 0.34, -z, DRV_Y)
        if z < 0:
            c.rotation_euler = (0, 0, PI)
    wd.hide_render = ws.hide_render = rod_ob.hide_render = True
    sc = bpy.context.scene
    # Cycles on the CPU (no GPU context in headless bpy); livery previewed in maroon
    for nm, f in (('Livery', 1.0), ('LiveryDark', 0.6)):
        b = MATS[nm].node_tree.nodes.get('Principled BSDF')
        b.inputs['Base Color'].default_value = (*[c * f for c in hexcol('#7a2230')], 1)
    for nm in ('Lamp', 'Glass', 'TailLamp'):
        b = MATS[nm].node_tree.nodes.get('Principled BSDF')
        b.inputs['Emission Color'].default_value = (1, 0.7, 0.35, 1) if nm != 'TailLamp' else (1, 0.1, 0.05, 1)
        b.inputs['Emission Strength'].default_value = 2.0
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = int(os.environ.get('TRAIN_SAMPLES', '24'))
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 1280, 720
    world = bpy.data.worlds.new('w')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.55, 0.62, 0.72, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 0.8
    sc.world = world
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3.5
    sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(-35))
    sc.collection.objects.link(sun)
    ground = bpy.data.meshes.new('g')
    gb = bmesh.new(); bmesh.ops.create_grid(gb, x_segments=1, y_segments=1, size=60); gb.to_mesh(ground)
    gob = bpy.data.objects.new('ground', ground); gob.location.z = RAIL_TOP - 0.02; sc.collection.objects.link(gob)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    sc.camera = cam
    views = {
        'loco': ((9, -9, 4.5), (0.5, 0, 2.6), 38),
        'side': ((-9, -26, 3.2), (-9, 0, 2.4), 50),
        'rear': ((-26, -7, 5), (-17, 0, 2.2), 45),
        'front': ((9.5, -2.2, 3.0), (3, 0, 2.6), 45),
        'wheels': ((0.5, -6.5, 1.6), (-1.2, 0, 1.4), 40),
    }
    only = os.environ.get('TRAIN_VIEWS')
    for vname, (loc, tgt, lens) in views.items():
        if only and vname not in only.split(','):
            continue
        cam.location = loc
        d = Vector(tgt) - Vector(loc)
        cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        cam.data.lens = lens
        sc.render.filepath = f'{PREV}_{vname}.png'
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)
