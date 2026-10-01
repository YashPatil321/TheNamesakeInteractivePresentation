"""The Namesake Line: a kit of sculpted body parts for the first-person rooms' people.

Run headless:  /opt/blendervenv/bin/python blender/people.py [--preview out.png]
Writes public/models/people/people.glb (Draco). Built procedurally: every organic part is a union of
ellipsoids and capsules (an anatomy "armature" of masses), voxel-remeshed into one surface, carved where
needed (eye sockets, face openings in hair), relaxed with a volume-preserving smooth, hair grooved, then
decimated. A baked cavity term is stored in COLOR_0 (multiplied with the runtime tint) so creases, eye
sockets, lips and fabric folds read without textures.

Coordinates are written in the site's three.js frame (x right, y up, z forward: people face +z) and
converted to Blender (x, -z, y) on the way in. Every part sits at the origin of its pivot in
lib/fp/kit.ts `figure()`:
  head_m / head_f          head pivot (skull centre at y 0.1); includes ears and lids
  face_m / face_f          eyes (Sclera / Iris / Pupil) and brows (Hair) in head space
  moustache, glasses       head space (Hair / Frame)
  hair_short, hair_part, hair_long, hair_bob, hair_curly, hair_fringe   head space (Hair)
  neck_m / neck_f          neck pivot (Skin); the body parts below are lofted anatomical cross-sections
  torso_shirt_m, torso_sweater_m, torso_top_f, torso_sweater_f   torso pivot at the hips (Skin / Top / Bottom [/ Shoe belt, Frame buckle])
  collar                   shirt collar, torso space (Collar)
  arm_upper                shoulder pivot, hangs down -y (Top)
  arm_fore                 elbow pivot (Top)
  hand_R / hand_L          elbow pivot, hand at the wrist (Skin)
  leg_seated, leg_standing one leg centred on x = 0 in root space (Bottom / Shoe)
Material names are the contract with kit.ts: Skin, Top, Bottom, Hair, Shoe, Collar, Sclera, Iris, Pupil, Frame.
"""
import bpy, bmesh, math, os, sys, random
import numpy as np
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'public', 'models', 'people', 'people.glb')
PREVIEW = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
random.seed(11)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# three (x, y, z) -> blender (x, -z, y)
TO_B = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))


def srgb2lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hexcol(h):
    h = h.lstrip('#')
    return [srgb2lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)]


MAT_DEFS = {
    'Skin': ('#b07a55', 0.55), 'Top': ('#3b5fa8', 0.85), 'Bottom': ('#2d3e5e', 0.85), 'Hair': ('#231a14', 0.5),
    'Shoe': ('#1b1a20', 0.45), 'Collar': ('#e8e4da', 0.8), 'Sclera': ('#ece6dc', 0.25), 'Iris': ('#4a2c18', 0.2),
    'Pupil': ('#08070a', 0.1), 'Frame': ('#26221f', 0.35),
}
MATS = {}
for n, (c, r) in MAT_DEFS.items():
    m = bpy.data.materials.new(n)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*hexcol(c), 1)
    b.inputs['Roughness'].default_value = r
    # multiply by the cavity colour so previews show it (and the exporter keeps COLOR_0)
    va = m.node_tree.nodes.new('ShaderNodeVertexColor'); va.layer_name = 'Col'
    mix = m.node_tree.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1.0
    mix.inputs['A'].default_value = (*hexcol(c), 1)
    m.node_tree.links.new(va.outputs['Color'], mix.inputs['B'])
    m.node_tree.links.new(mix.outputs['Result'], b.inputs['Base Color'])
    if n == 'Skin':
        b.inputs['Subsurface Weight'].default_value = 0.15
        b.inputs['Subsurface Radius'].default_value = (0.9, 0.35, 0.2)
        b.inputs['Subsurface Scale'].default_value = 0.01
    MATS[n] = m


# ---------------------------------------------------------------- primitives (three frame)
class Shape:
    """Accumulates closed primitives into one bmesh (three frame)."""

    def __init__(self):
        self.bm = bmesh.new()

    def ell(self, c, r, rot=(0, 0, 0), seg=24, rings=16):
        m = Matrix.Translation(Vector(c)) @ Euler(rot, 'XYZ').to_matrix().to_4x4() @ Matrix.Diagonal((*r, 1))
        bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=rings, radius=1.0, matrix=m)
        return self

    def cap(self, a, b, ra, rb, seg=20):
        a, b = Vector(a), Vector(b)
        d = b - a
        L = d.length
        q = Vector((0, 0, 1)).rotation_difference(d.normalized())
        m = Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4()
        bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=ra, radius2=rb, depth=L, matrix=m)
        self.ell(a, (ra, ra, ra), seg=seg, rings=12)
        self.ell(b, (rb, rb, rb), seg=seg, rings=12)
        return self

    def box(self, c, s, rot=(0, 0, 0)):
        m = Matrix.Translation(Vector(c)) @ Euler(rot, 'XYZ').to_matrix().to_4x4() @ Matrix.Diagonal((*s, 1))
        bmesh.ops.create_cube(self.bm, size=1.0, matrix=m)
        return self

    def obj(self, name):
        me = bpy.data.meshes.new(name)
        self.bm.transform(TO_B)
        self.bm.to_mesh(me)
        self.bm.free()
        o = bpy.data.objects.new(name, me)
        scene.collection.objects.link(o)
        return o


def evaluate(o, name):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    old = o.data
    for m in list(o.modifiers):
        o.modifiers.remove(m)
    o.data = me
    bpy.data.meshes.remove(old)
    me.name = name
    return o


def sculpt(name, add, cut=None, voxel=0.003, smooth=6, tris=1500, groove=None, post=None, blend=0.0):
    o = add.obj(name)
    r = o.modifiers.new('r', 'REMESH'); r.mode = 'VOXEL'; r.voxel_size = voxel
    evaluate(o, name)
    if blend:
        # morphological closing (grow, union, shrink): fills the creases between masses with fillets of radius `blend`
        for sgn in (1, -1):
            d = o.modifiers.new('d', 'DISPLACE'); d.direction = 'NORMAL'; d.mid_level = 0; d.strength = sgn * blend
            r = o.modifiers.new('r', 'REMESH'); r.mode = 'VOXEL'; r.voxel_size = voxel
            evaluate(o, name)
    if cut is not None:
        c = cut.obj(name + '_cut')
        cr = c.modifiers.new('r', 'REMESH'); cr.mode = 'VOXEL'; cr.voxel_size = voxel  # union overlapping cutters
        evaluate(c, name + '_cut')
        b =o.modifiers.new('b', 'BOOLEAN'); b.operation = 'DIFFERENCE'; b.object = c; b.solver = 'EXACT'
        r = o.modifiers.new('r2', 'REMESH'); r.mode = 'VOXEL'; r.voxel_size = voxel
        evaluate(o, name)
        bpy.data.objects.remove(c)
    if smooth:
        s = o.modifiers.new('s', 'LAPLACIANSMOOTH'); s.iterations = smooth; s.lambda_factor = 0.8; s.use_volume_preserve = True
        evaluate(o, name)
    if groove:
        groove(o.data)
    if post:
        post(o.data)
    n = len(o.data.polygons) * 2  # quads from remesh
    if n > tris:
        d = o.modifiers.new('d', 'DECIMATE'); d.ratio = tris / n
        evaluate(o, name)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def verts_three(me):
    co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    return np.stack([co[:, 0], co[:, 2], -co[:, 1]], 1)  # blender -> three


def set_verts_three(me, p):
    b = np.stack([p[:, 0], -p[:, 2], p[:, 1]], 1)
    me.vertices.foreach_set('co', b.ravel())
    me.update()


def normals_three(me):
    n = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('normal', n)
    n = n.reshape(-1, 3)
    return np.stack([n[:, 0], n[:, 2], -n[:, 1]], 1)


def cavity_colors(o, strength=6.0, tint=None, floor=0.55):
    """COLOR_0 = cavity occlusion (concave creases darker) x optional regional tint(p) -> rgb."""
    me = o.data
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    cav = np.zeros(len(bm.verts))
    for v in bm.verts:
        if not v.link_edges:
            continue
        avg = sum((e.other_vert(v).co for e in v.link_edges), Vector()) / len(v.link_edges)
        L = sum((e.other_vert(v).co - v.co).length for e in v.link_edges) / len(v.link_edges) + 1e-6
        cav[v.index] = (avg - v.co).dot(v.normal) / L
    # blur over neighbours twice
    for _ in range(3):
        nc = cav.copy()
        for v in bm.verts:
            if v.link_edges:
                nc[v.index] = 0.5 * cav[v.index] + 0.5 * np.mean([cav[e.other_vert(v).index] for e in v.link_edges])
        cav = nc
    bm.free()
    ao = np.clip(1 - np.clip(cav, 0, None) * strength, floor, 1) * np.clip(1 + np.clip(-cav, 0, None) * 0.6, 1, 1.08)
    rgb = np.stack([ao, ao, ao], 1)
    if tint is not None:
        rgb *= tint(verts_three(me))
    rgb = np.clip(rgb, 0, 1)
    col = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    rgba = np.concatenate([rgb, np.ones((len(rgb), 1))], 1)
    col.data.foreach_set('color', rgba.ravel())
    me.color_attributes.active_color = col


def assign(o, matnames, pick=None):
    """Material slots; pick(face_centers_three, normals_three) -> slot index per face."""
    for n in matnames:
        o.data.materials.append(MATS[n])
    if pick is not None and len(matnames) > 1:
        me = o.data
        c = np.empty(len(me.polygons) * 3); me.polygons.foreach_get('center', c); c = c.reshape(-1, 3)
        nn = np.empty(len(me.polygons) * 3); me.polygons.foreach_get('normal', nn); nn = nn.reshape(-1, 3)
        c3 = np.stack([c[:, 0], c[:, 2], -c[:, 1]], 1)
        n3 = np.stack([nn[:, 0], nn[:, 2], -nn[:, 1]], 1)
        idx = pick(c3, n3).astype(np.int32)
        me.polygons.foreach_set('material_index', idx)
        me.update()


def gauss(p, c, r):
    d = (p - np.array(c)) / np.array(r)
    return np.exp(-np.sum(d * d, 1))


# ---------------------------------------------------------------- heads
EYE_Y, EYE_Z, EYE_X, EYE_R = 0.1, 0.064, 0.031, 0.0122


def head(name, fem):
    s = Shape()
    k = 0.94 if fem else 1.0
    s.ell((0, 0.127, -0.014), (0.073 * k, 0.088, 0.097 * k), seg=40, rings=28)        # cranium
    s.ell((0, 0.066, 0.024), (0.056 * k, 0.072, 0.064), seg=32, rings=24)           # face mass
    jw = 0.042 if fem else 0.049
    for x in (-1, 1):
        s.ell((x * 0.047, 0.09, 0.034), (0.011, 0.011, 0.016), rot=(0, x * 0.5, 0))        # zygomatic arch (soft)
        s.ell((x * 0.076, 0.094, -0.006), (0.011, 0.029, 0.019), rot=(0, x * -0.35, 0))   # ears
        s.ell((x * 0.07, 0.084, -0.0), (0.008, 0.012, 0.01))                               # tragus/lobe root
        # lids: upper fold and lower lid, fused into the face
        s.ell((x * EYE_X, EYE_Y + 0.0085, EYE_Z + 0.001), (0.0152, 0.0072, 0.0128))
        s.ell((x * EYE_X, EYE_Y - 0.0095, EYE_Z + 0.0), (0.0135, 0.0036, 0.011))
        s.ell((x * 0.011, 0.07, 0.096), (0.0085, 0.0075, 0.0085))                          # nostril wings
    s.ell((0, 0.12, 0.07), (0.056 * k, 0.013 if fem else 0.016, 0.018), rot=(0.25, 0, 0))  # brow ridge
    s.ell((0, 0.105, 0.088), (0.009, 0.014, 0.008))                                     # glabella
    s.cap((0, 0.104, 0.091), (0, 0.075, 0.107), 0.0072, 0.0095 if fem else 0.011, seg=14)  # nose bridge
    s.ell((0, 0.071, 0.106), (0.011, 0.0105, 0.011))                                    # nose tip
    s.ell((0, 0.047, 0.07), (0.025, 0.022, 0.019))                                     # muzzle
    lip = 1.15 if fem else 1.0
    s.ell((0, 0.047, 0.09), (0.02, 0.0062 * lip, 0.0085 * lip), rot=(-0.2, 0, 0))     # upper lip
    s.ell((0, 0.034, 0.087), (0.018, 0.0072 * lip, 0.0092 * lip), rot=(0.25, 0, 0))   # lower lip
    s.ell((0, 0.013, 0.07), (0.017 if fem else 0.021, 0.016, 0.016))                   # chin
    s.ell((0, 0.036, 0.012), (jw, 0.026, 0.054), rot=(0.32, 0, 0))                       # mandible
    cut = Shape()
    for x in (-1, 1):
        cut.ell((x * EYE_X, EYE_Y - 0.001, EYE_Z + 0.0135), (0.0135, 0.0048, 0.011))      # eye opening
        cut.ell((x * 0.0745 + x * 0.006, 0.097, -0.004), (0.006, 0.016, 0.011))           # concha
    cut.ell((0, 0.0405, 0.098), (0.016, 0.0016, 0.012))                                 # mouth line
    for x in (-1, 1):
        cut.ell((x * 0.0095, 0.066, 0.104), (0.0035, 0.0022, 0.004))                       # nostrils

    def tint(p):
        t = np.ones((len(p), 3))
        lips = gauss(p, (0, 0.04, 0.09), (0.02, 0.011, 0.02))
        t *= 1 - lips[:, None] * np.array([0.08, 0.3, 0.26])
        cheeks = gauss(p, (0.035, 0.07, 0.065), (0.02, 0.018, 0.03)) + gauss(p, (-0.035, 0.07, 0.065), (0.02, 0.018, 0.03))
        t *= 1 - cheeks[:, None] * np.array([0.0, 0.08, 0.07])
        lids = gauss(p, (EYE_X, EYE_Y + 0.008, EYE_Z), (0.016, 0.008, 0.03)) + gauss(p, (-EYE_X, EYE_Y + 0.008, EYE_Z), (0.016, 0.008, 0.03))
        t *= 1 - lids[:, None] * np.array([0.2, 0.22, 0.2])
        under = gauss(p, (EYE_X, EYE_Y - 0.014, EYE_Z), (0.016, 0.006, 0.03)) + gauss(p, (-EYE_X, EYE_Y - 0.014, EYE_Z), (0.016, 0.006, 0.03))
        t *= 1 - under[:, None] * np.array([0.08, 0.1, 0.06])
        return t

    o = sculpt(name, s, cut, voxel=0.0016, smooth=6, tris=1900, blend=0.007)
    st = skin_tint(1.0, [((0, 0.07, 0.1), (0.014, 0.014, 0.02), 0.8), ((0.045, 0.07, 0.06), (0.02, 0.02, 0.03), 0.6),
                         ((-0.045, 0.07, 0.06), (0.02, 0.02, 0.03), 0.6), ((0.077, 0.09, -0.006), (0.01, 0.03, 0.02), 0.8),
                         ((-0.077, 0.09, -0.006), (0.01, 0.03, 0.02), 0.8)])
    cavity_colors(o, strength=5.0, tint=lambda p: tint(p) * st(p))
    assign(o, ['Skin'])
    return o


def face(name, fem):
    s = Shape()
    for x in (-1, 1):
        s.ell((x * EYE_X, EYE_Y, EYE_Z), (EYE_R, EYE_R, EYE_R), seg=16, rings=10)
    eyes = s.obj(name)
    me = eyes.data

    # brows: a row of overlapping flattened ellipsoids following the brow ridge, fused
    b = Shape()
    for x in (-1, 1):
        for i in range(11):
            t = i / 10
            bx = x * (0.013 + t * 0.035)
            by = EYE_Y + 0.0185 + math.sin(t * math.pi * 0.85) * (0.0055 if fem else 0.0038) - t * 0.002
            bz = 0.0858 - t * t * 0.023
            th = (0.0024 if fem else 0.0034) * (1 - 0.5 * t)
            b.ell((bx, by, bz), (0.005, th, 0.0026), rot=(-0.35, x * (0.35 + t * 0.6), x * (-0.1 + t * 0.25)), seg=10, rings=6)
    brows = sculpt(name + '_b', b, voxel=0.0009, smooth=2, tris=320)
    for p in me.polygons:
        p.use_smooth = True

    def pick(c, n):
        out = np.zeros(len(c))
        for x in (-1, 1):
            d = c - np.array([x * EYE_X, EYE_Y, EYE_Z])
            d /= np.linalg.norm(d, axis=1)[:, None]
            near = np.abs(c[:, 0] - x * EYE_X) < 0.02
            out[(d[:, 2] > 0.86) & near] = 1
            out[(d[:, 2] > 0.965) & near] = 2
        return out
    assign(eyes, ['Sclera', 'Iris', 'Pupil'], pick)
    brows.data.materials.append(MATS['Hair'])
    for o in (eyes, brows):
        col = o.data.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        col.data.foreach_set('color', np.ones(len(o.data.vertices) * 4))
    # join brows into the eyes object
    with bpy.context.temp_override(active_object=eyes, selected_editable_objects=[eyes, brows], selected_objects=[eyes, brows]):
        bpy.ops.object.join()
    return eyes


def moustache():
    s = Shape()
    for x in (-1, 1):
        for i in range(5):
            t = i / 4
            s.ell((x * (0.004 + t * 0.02), 0.054 - t * t * 0.01, 0.096 - t * 0.011), (0.007, 0.0045, 0.006), rot=(0.3, 0, x * 0.3 * t))
    o = sculpt('moustache', s, voxel=0.0012, smooth=3, tris=500, groove=lambda me: groove(me, 0.0005, 220, axis='x'))
    cavity_colors(o, 4)
    assign(o, ['Hair'])
    return o


def glasses():
    # build rims as tubes with a curve
    cu = bpy.data.curves.new('glasses', 'CURVE'); cu.dimensions = '3D'
    cu.bevel_depth = 0.0016; cu.bevel_resolution = 2
    def poly(pts, closed=False):
        sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
        for i, p in enumerate(pts):
            b = TO_B @ Vector(p)
            sp.points[i].co = (b.x, b.y, b.z, 1)
        sp.use_cyclic_u = closed
    for x in (-1, 1):
        pts = []
        for i in range(28):
            a = i / 28 * math.pi * 2
            # rounded-rectangle 1980s frames
            cx, cy = math.cos(a), math.sin(a)
            ex = math.copysign(abs(cx) ** 0.7, cx) * 0.0195
            ey = math.copysign(abs(cy) ** 0.8, cy) * 0.0155 - (0.002 if cy < 0 else 0)
            pts.append((x * EYE_X + ex, EYE_Y - 0.001 + ey, 0.093 - abs(ex) * 0.12 * (1 if x * cx > 0 else 0.2)))
        poly(pts, True)
        poly([(x * (EYE_X + 0.0195), EYE_Y + 0.008, 0.09), (x * 0.07, EYE_Y + 0.008, 0.075), (x * 0.077, EYE_Y + 0.004, 0.0), (x * 0.074, EYE_Y - 0.012, -0.015)])
    poly([(-EYE_X + 0.0195 * 0.75, EYE_Y + 0.006, 0.0935), (0, EYE_Y + 0.009, 0.097), (EYE_X - 0.0195 * 0.75, EYE_Y + 0.006, 0.0935)])
    o = bpy.data.objects.new('glasses', cu); scene.collection.objects.link(o)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    bpy.data.objects.remove(o)
    o = bpy.data.objects.new('glasses', me); scene.collection.objects.link(o)
    for p in me.polygons:
        p.use_smooth = True
    col = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT'); col.data.foreach_set('color', np.ones(len(me.vertices) * 4))
    assign(o, ['Frame'])
    return o


# ---------------------------------------------------------------- hair
def groove(me, amp, freq, axis='y', seed=0):
    """Combed strands: displace along the normal with a ridged noise that runs along `axis`."""
    p = verts_three(me); n = normals_three(me)
    rs = np.random.RandomState(seed)
    ph = rs.uniform(0, 6.28, 4)
    if axis == 'y':      # strands run front-to-back over the scalp and down the sides
        a = np.arctan2(p[:, 0], p[:, 2] + 0.03) * freq / 40 + np.sin(p[:, 1] * 40 + ph[0]) * 0.6
    elif axis == 'down':  # long hair falling: grooves around the head
        a = np.arctan2(p[:, 0], p[:, 2] + 0.02) * freq / 25 + np.sin(p[:, 1] * 25 + ph[1]) * 0.8
    else:
        a = p[:, 0] * freq
    d = amp * (np.abs(np.sin(a)) * 2 - 1 + 0.35 * np.sin(a * 2.7 + ph[2]))
    set_verts_three(me, p + n * d[:, None])


def hair_base(s, k=1.0, top=0.0):
    s.ell((0, 0.133 + top, -0.017), (0.081 * k, 0.096 + top, 0.106 * k), seg=40, rings=28)


def face_cut(c, sides=0.083, back=0.04, fringe=0.17):
    # everything in front of/below the hairline
    c.box((0, -0.02, 0.15), (0.3, 0.3, 0.16), rot=(0, 0, 0))           # below eyes front
    c.ell((0, 0.075, 0.12), (0.075, fringe - 0.075, 0.1), rot=(-0.15, 0, 0))   # forehead window
    c.box((0, sides - 0.15, 0.03), (0.3, 0.3, 0.12))                   # below sideburns
    c.box((0, back - 0.15, -0.1), (0.3, 0.3, 0.2))                    # nape


def hair_short(name, part=False, fringe=0.168):
    s = Shape(); hair_base(s)
    s.ell((0.012 if part else 0, 0.2, 0.035), (0.066, 0.035, 0.06), rot=(0.25, 0, 0))   # volume at the front
    if part:
        s.ell((0.02, 0.19, 0.06), (0.06, 0.03, 0.045), rot=(0.3, 0, -0.2))
    c = Shape(); face_cut(c, sides=0.075, back=0.045, fringe=fringe)
    for x in (-1, 1):
        c.ell((x * 0.085, 0.09, 0.0), (0.012, 0.024, 0.025))   # around the ears
    if part:
        c.box((-0.03, 0.235, 0.02), (0.004, 0.02, 0.12), rot=(0.35, 0, 0.2))
    o = sculpt(name, s, c, voxel=0.0022, smooth=4, tris=1300, blend=0.006, groove=lambda me: groove(me, 0.0011, 200))
    cavity_colors(o, 5, floor=0.45)
    assign(o, ['Hair'])
    return o


def hair_fringe(name):
    """Receding / balding: a horseshoe of short hair round the back and sides (Ghosh)."""
    s = Shape(); hair_base(s, 1.0)
    c = Shape(); face_cut(c, sides=0.072, back=0.04, fringe=0.17)
    c.ell((0, 0.2, 0.03), (0.07, 0.07, 0.11), rot=(0.4, 0, 0))
    for x in (-1, 1):
        c.ell((x * 0.085, 0.09, 0.0), (0.012, 0.024, 0.025))
    o = sculpt(name, s, c, voxel=0.0022, smooth=4, tris=900, groove=lambda me: groove(me, 0.0007, 220))
    cavity_colors(o, 5, floor=0.45)
    assign(o, ['Hair'])
    return o


def hair_long(name, length=0.2, bangs=True):
    s = Shape(); hair_base(s, 1.04, 0.004)
    s.ell((0, 0.205, 0.02), (0.07, 0.03, 0.07))
    bot = 0.13 - length
    s.ell((0, (0.12 + bot) / 2, -0.055), (0.083, (0.12 - bot) / 2 + 0.03, 0.065))   # back drape
    for x in (-1, 1):
        s.ell((x * 0.07, (0.12 + bot) / 2 + 0.01, -0.005), (0.026, (0.12 - bot) / 2 + 0.03, 0.055), rot=(0, 0, x * 0.08))  # side curtains
    if bangs:
        s.ell((0.008, 0.162, 0.078), (0.06, 0.026, 0.026), rot=(0.4, 0, 0.05))
    c = Shape()
    c.ell((0, 0.06, 0.1), (0.064, 0.098 if bangs else 0.11, 0.075))          # face window
    c.box((0, -0.02, 0.15), (0.3, 0.26, 0.18))
    c.box((0, bot - 0.15, 0), (0.4, 0.3, 0.4))                                # cut the ends level
    o = sculpt(name, s, c, voxel=0.0025, smooth=5, tris=1600, blend=0.01, groove=lambda me: groove(me, 0.0016, 260, 'down', 3))
    cavity_colors(o, 5, floor=0.45)
    assign(o, ['Hair'])
    return o


def hair_curly(name):
    s = Shape(); hair_base(s, 1.05, 0.006)
    rs = random.Random(5)
    for i in range(110):
        # points on the upper back hemisphere of the scalp
        u, v = rs.uniform(0, 2 * math.pi), rs.uniform(-0.25, 1)
        x, y, z = math.cos(u) * math.sqrt(1 - v * v), v, math.sin(u) * math.sqrt(1 - v * v)
        if z > 0.55 and y < 0.55:
            continue
        p = (x * 0.085, 0.13 + y * 0.1, -0.016 + z * 0.108)
        r = rs.uniform(0.014, 0.022)
        s.ell(p, (r, r, r), seg=12, rings=8)
    c = Shape(); face_cut(c, sides=0.08, back=0.04, fringe=0.172)
    for x in (-1, 1):
        c.ell((x * 0.09, 0.09, 0.0), (0.012, 0.024, 0.025))
    o = sculpt(name, s, c, voxel=0.0025, smooth=2, tris=1600)
    cavity_colors(o, 7, floor=0.35)
    assign(o, ['Hair'])
    return o


# ---------------------------------------------------------------- lofted body (neck, torso, arms, legs)
# The body is not a union of blobs: every limb and the trunk is a loft of anatomical cross-sections along a
# path (a "skeleton" polyline), with tabulated widths/depths per section, so silhouettes are continuous and
# proportions are explicit (7.5-head figure: head ~0.225 m, shoulders ~0.40 m biacromial, waist narrower than
# chest and hips). Muscle and clothing detail (pecs/bust, clavicles, scapulae, belt, hems, cuffs, folds) is
# added as displacement along the normal afterwards.
def _frames(C):
    n = len(C)
    T = [(C[min(i + 1, n - 1)] - C[max(i - 1, 0)]).normalized() for i in range(n)]
    N = []
    prev = Vector((1, 0, 0))
    for t in T:
        v = prev - prev.dot(t) * t
        if v.length < 1e-6:
            v = Vector((0, 0, 1)) - Vector((0, 0, 1)).dot(t) * t
        N.append(v.normalized()); prev = N[-1]
    return T, N


def tube(name, C, prof, seg=32, cap0=True, cap1=True, fwd=(0, 0, 1)):
    """Loft rings along centre points C (three frame). prof(i, theta) -> (u, v): u along +x-ish, v along `fwd`-ish."""
    C = [Vector(c) for c in C]
    T, N = _frames(C)
    B = [t.cross(nv) for t, nv in zip(T, N)]
    sg = 1 if B[0].dot(Vector(fwd)) >= 0 else -1
    bm = bmesh.new()
    rows = []
    for i, c in enumerate(C):
        row = []
        for j in range(seg):
            u, v = prof(i, 2 * math.pi * j / seg)
            row.append(bm.verts.new(c + N[i] * u + B[i] * (v * sg)))
        rows.append(row)
    for i in range(len(rows) - 1):
        for j in range(seg):
            bm.faces.new((rows[i][j], rows[i][(j + 1) % seg], rows[i + 1][(j + 1) % seg], rows[i + 1][j]))
    for ok, row, k in ((cap0, rows[0], 0), (cap1, rows[-1], len(C) - 1)):
        if ok:
            ctr = sum((v.co for v in row), Vector()) / seg
            cv = bm.verts.new(ctr)
            for j in range(seg):
                bm.faces.new((row[j], row[(j + 1) % seg], cv))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.transform(TO_B)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    for p in me.polygons:
        p.use_smooth = True
    return o


def relax(o, it=2, lam=0.5):
    if it:
        s = o.modifiers.new('s', 'LAPLACIANSMOOTH'); s.iterations = it; s.lambda_factor = lam; s.use_volume_preserve = True
        evaluate(o, o.name)
        for p in o.data.polygons:
            p.use_smooth = True


def displace(o, fn):
    me = o.data
    me.update()
    p = verts_three(me); n = normals_three(me)
    set_verts_three(me, p + n * fn(p, n)[:, None])


def sect(table, y):
    """Interpolate a table of rows (y, *params) at y with a smooth (monotone-cubic-ish) blend."""
    t = np.array(table, dtype=float)
    t = t[np.argsort(t[:, 0])]
    ys = t[:, 0]
    out = []
    for k in range(1, t.shape[1]):
        out.append(float(np.interp(y, ys, t[:, k])))
    return out


def superell(a, bf, bb, n, th):
    c, s = math.cos(th), math.sin(th)
    u = a * math.copysign(abs(c) ** (2 / n), c)
    v = (bf if s > 0 else bb) * math.copysign(abs(s) ** (2 / n), s)
    return u, v


def rings(y0, y1, step, extra=()):
    ys = set(np.round(np.arange(y0, y1 + 1e-9, step), 4))
    ys |= {round(e, 4) for e in extra}
    return sorted(ys)


def seg_line(a, b, c, w):
    """distance-based ridge weight along segment a->b (3d points, arrays), gaussian width w."""
    a, b = np.array(a), np.array(b)
    ab = b - a
    t = np.clip(((c - a) @ ab) / (ab @ ab), 0, 1)
    d = c - (a + t[:, None] * ab)
    return np.exp(-np.sum(d * d, 1) / (w * w))


def skin_tint(scale=1.0, flush=()):
    """Subtle skin variation: low-frequency mottling plus warm flush spots [(centre, radius, amount)]."""
    def f(p):
        t = np.ones((len(p), 3))
        m = (np.sin(p[:, 0] * 91 + 1.3) * np.sin(p[:, 1] * 77 + 0.4) * np.sin(p[:, 2] * 83 + 2.1)
             + 0.5 * np.sin(p[:, 0] * 211 + p[:, 1] * 173) * np.sin(p[:, 2] * 199 + 0.7)) * 0.025 * scale
        t *= (1 + m)[:, None]
        for c, r, a in flush:
            g = gauss(p, c, r)
            t *= 1 + g[:, None] * np.array([0.03, -0.07, -0.07]) * a
        return t
    return f


def neck(name, fem):
    k = 0.88 if fem else 1.0
    tab = [  # y, half-width, front, back, z-centre
        (-0.07, 0.10, 0.07, 0.075, -0.012),
        (-0.03, 0.078, 0.06, 0.068, -0.01),
        (0.00, 0.064 * k, 0.056 * k, 0.062 * k, -0.007),
        (0.04, 0.058 * k, 0.054 * k, 0.057 * k, -0.002),
        (0.08, 0.055 * k, 0.054 * k, 0.055 * k, 0.003),
        (0.125, 0.05 * k, 0.05 * k, 0.05 * k, 0.004),
    ]
    Y = rings(-0.07, 0.125, 0.016)
    C = [(0, y, sect(tab, y)[3]) for y in Y]

    def prof(i, th):
        a, bf, bb, _ = sect(tab, Y[i])
        return superell(a, bf, bb, 2.1, th)
    o = tube(name, C, prof, seg=22)

    def fn(p, n):
        d = np.zeros(len(p))
        for x in (-1, 1):  # sternocleidomastoids: behind the ear down to the sternal notch
            d += 0.006 * seg_line((x * 0.046 * k, 0.12, -0.01), (x * 0.014, -0.02, 0.05 * k), p, 0.011)
        d -= 0.004 * gauss(p, (0, -0.01, 0.06 * k), (0.012, 0.014, 0.02))   # jugular notch
        if not fem:
            d += 0.006 * gauss(p, (0, 0.055, 0.056), (0.008, 0.012, 0.012))  # larynx
        d += 0.004 * gauss(p, (0, -0.02, -0.07), (0.04, 0.05, 0.03))       # trapezius at the nape
        return d
    displace(o, fn)
    relax(o, 2)
    cavity_colors(o, 5, tint=skin_tint(flush=[((0, 0.06, 0.05), (0.03, 0.04, 0.03), 0.4)]))
    assign(o, ['Skin'])
    return o


# torso tables: y (from the hip joints), half-width, front depth, back depth, superellipse exponent
TORSO_M = [
    (-0.085, 0.07, 0.04, 0.05, 2.0),
    (-0.065, 0.135, 0.07, 0.09, 2.3),
    (-0.02, 0.168, 0.098, 0.112, 2.5),   # trochanters / seat
    (0.03, 0.170, 0.100, 0.108, 2.5),
    (0.09, 0.160, 0.100, 0.092, 2.4),    # iliac crest, belt
    (0.16, 0.150, 0.098, 0.085, 2.3),    # waist
    (0.23, 0.152, 0.100, 0.086, 2.3),
    (0.31, 0.160, 0.106, 0.092, 2.35),   # lower ribs
    (0.39, 0.168, 0.112, 0.098, 2.45),   # chest
    (0.45, 0.170, 0.112, 0.100, 2.55),   # armpits
    (0.50, 0.168, 0.100, 0.098, 2.6),
    (0.535, 0.158, 0.085, 0.088, 2.6),   # acromion level
    (0.565, 0.128, 0.072, 0.074, 2.4),   # trapezius slope
    (0.595, 0.088, 0.064, 0.066, 2.2),
    (0.615, 0.068, 0.058, 0.062, 2.1),   # neck base
    (0.63, 0.04, 0.035, 0.04, 2.0),
]
TORSO_F = [
    (-0.085, 0.07, 0.04, 0.052, 2.0),
    (-0.065, 0.14, 0.07, 0.095, 2.3),
    (-0.02, 0.176, 0.096, 0.118, 2.5),
    (0.03, 0.172, 0.094, 0.110, 2.5),
    (0.09, 0.150, 0.088, 0.090, 2.4),
    (0.17, 0.124, 0.080, 0.076, 2.2),    # waist
    (0.24, 0.128, 0.082, 0.078, 2.2),
    (0.31, 0.138, 0.088, 0.084, 2.3),
    (0.38, 0.146, 0.092, 0.088, 2.4),
    (0.44, 0.150, 0.094, 0.090, 2.5),
    (0.49, 0.150, 0.088, 0.088, 2.6),
    (0.525, 0.142, 0.076, 0.080, 2.6),
    (0.555, 0.112, 0.064, 0.066, 2.4),
    (0.585, 0.076, 0.056, 0.058, 2.2),
    (0.605, 0.058, 0.05, 0.054, 2.1),
    (0.62, 0.035, 0.03, 0.035, 2.0),
]


def torso(name, fem, kind):
    tab = TORSO_F if fem else TORSO_M
    hem = 0.105 if kind == 'sweater' else 0.115            # sweater hem / shirt tuck line (belt top)
    belt = (0.082, 0.115) if (kind == 'shirt' and not fem) else None
    edges = [hem, hem - 0.001, hem + 0.001, 0.07, 0.072]
    if belt:
        edges += [belt[0], belt[0] - 0.001, belt[1] + 0.001]
    Y = rings(-0.085, tab[-1][0], 0.017, edges)

    def prof(i, th):
        a, bf, bb, n = sect(tab, Y[i])
        return superell(a, bf, bb, n, th)
    o = tube(name, [(0, y, 0) for y in Y], prof, seg=36)
    relax(o, 1)

    def fn(p, n):
        y = p[:, 1]
        front = np.clip(n[:, 2] * 1.6, 0, 1)
        back = np.clip(-n[:, 2] * 1.6, 0, 1)
        d = np.zeros(len(p))
        for x in (-1, 1):
            if fem:
                d += 0.03 * gauss(p, (x * 0.056, 0.395, 0.1), (0.05, 0.048, 0.06)) * front     # bust
                d -= 0.004 * gauss(p, (x * 0.07, 0.35, 0.09), (0.05, 0.012, 0.05)) * front    # under-bust fold
            else:
                d += 0.011 * gauss(p, (x * 0.075, 0.44, 0.11), (0.06, 0.045, 0.06)) * front    # pecs
                d -= 0.003 * gauss(p, (x * 0.085, 0.395, 0.1), (0.06, 0.01, 0.05)) * front     # lower pec edge
            # clavicles (a ridge with a hollow below) from the sternal notch to the acromion
            cl = seg_line((x * 0.02, 0.6, 0.06), (x * 0.15, 0.548, 0.035), p, 0.008)
            d += 0.004 * cl * front
            d -= 0.0025 * seg_line((x * 0.04, 0.578, 0.07), (x * 0.13, 0.535, 0.06), p, 0.01) * front
            d += 0.006 * gauss(p, (x * 0.085, 0.45, -0.1), (0.045, 0.06, 0.05)) * back            # scapulae
            d += 0.004 * gauss(p, (x * 0.11, 0.25, 0.0), (0.03, 0.12, 0.08)) * (1 - front)       # obliques/lats
        d -= 0.004 * np.exp(-(p[:, 0] / 0.012) ** 2) * gauss(p, (0, 0.33, -0.1), (1, 0.16, 0.06)) * back  # spine
        d -= 0.003 * np.exp(-(p[:, 0] / 0.01) ** 2) * gauss(p, (0, 0.45, 0.1), (1, 0.08, 0.06)) * front   # sternum
        d -= 0.006 * np.exp(-(p[:, 0] / 0.012) ** 2) * gauss(p, (0, -0.04, -0.11), (1, 0.05, 0.05)) * back  # seat cleft
        # fabric
        if kind == 'sweater' or fem:
            # hem: a ribbed band that stands slightly proud, a soft fold line just above it
            band = ((y > hem - 0.035) & (y < hem)).astype(float)
            d += 0.006 * band + 0.0012 * band * np.sign(np.sin(np.arctan2(p[:, 0], p[:, 2]) * 44))
            d -= 0.0018 * np.exp(-((y - hem - 0.006) / 0.004) ** 2)
            d += 0.004 * gauss(p, (0, hem + 0.03, 0), (1, 0.025, 1))
            if kind == 'sweater':  # crew-neck rib
                d += 0.004 * ((y > 0.585 if not fem else y > 0.57)).astype(float) * np.clip(1 - np.abs(p[:, 0]) / 0.1, 0, 1)
        else:
            d += 0.005 * gauss(p, (0, hem + 0.03, 0), (1, 0.022, 1)) * (1 + 0.5 * np.sin(np.arctan2(p[:, 0], p[:, 2]) * 13))  # blousing over the belt
        if belt:
            bb = ((y > belt[0]) & (y < belt[1])).astype(float)
            d += 0.0045 * bb
            d += 0.004 * bb * gauss(p, (0, 0.098, 0.12), (0.02, 1, 0.04))  # buckle
        # drag folds: waist creases and diagonal pulls from the armpits
        d += 0.0016 * np.sin(y * 150 + np.sin(p[:, 0] * 30) * 2) * gauss(p, (0, 0.2, 0), (1, 0.06, 1))
        for x in (-1, 1):
            d += 0.0018 * np.sin((y - p[:, 0] * x * 0.9) * 130) * gauss(p, (x * 0.13, 0.36, 0.0), (0.04, 0.07, 0.2))
        return d
    displace(o, fn)
    relax(o, 1, 0.3)

    flush = [((0, 0.56, 0.08), (0.07, 0.04, 0.05), 0.5)]
    cavity_colors(o, 5, tint=skin_tint(0.6, flush))

    def pick(c, nn):
        y, x, z = c[:, 1], c[:, 0], c[:, 2]
        out = np.where(y < hem, 2, 1)          # Bottom below the hem/tuck line, Top above
        if belt:
            out = np.where((y > belt[0]) & (y < belt[1]), 3, out)
            out = np.where((y > belt[0] + 0.003) & (y < belt[1] - 0.003) & (np.abs(x) < 0.02) & (z > 0.05), 4, out)
        # neckline: skin shows above it (open collar V for shirts, scoop for women's tops, crew neck sweaters)
        if fem and kind == 'shirt':
            neckline = 0.5 + 0.075 * (np.abs(x) / 0.1) ** 2
            out = np.where((y > neckline) & (z > 0.0) & (np.abs(x) < 0.11), 0, out)
        elif not fem and kind == 'shirt':
            neckline = 0.545 + np.abs(x) * 1.4
            out = np.where((y > neckline) & (z > 0.02), 0, out)
        out = np.where(y > 0.618 if not fem else y > 0.6, 0, out) if kind == 'sweater' else out
        return out
    names = ['Skin', 'Top', 'Bottom'] + (['Shoe', 'Frame'] if belt else [])
    assign(o, names, pick)
    return o


def collar():
    """Shirt collar: a stand hugging the neck base, folded over into a leaf that drops to points at the
    throat, open at the front. Built directly as a swept, folded cross-section (crisp fabric edges)."""
    bm = bmesh.new()
    n = 26
    gap = 0.2
    rows = []
    for i in range(n + 1):
        a = gap + (2 * math.pi - 2 * gap) * i / n          # 0 = front centre
        fr = max(math.cos(a), 0) ** 3                        # 1 at the throat
        r0 = 0.07 + 0.006 * fr
        y0 = 0.6 - 0.012 * fr                                # the stand dips at the front
        stand = 0.026 - 0.008 * fr
        drop = 0.03 + 0.03 * fr                              # leaf length: points at the front
        flare = 0.012 + 0.026 * fr
        sec = [(r0, y0), (r0, y0 + stand), (r0 + 0.004, y0 + stand + 0.002),   # inner stand, fold
               (r0 + 0.009, y0 + stand - 0.002), (r0 + flare, y0 + stand - drop),  # leaf outer face
               (r0 + flare - 0.003, y0 + stand - drop - 0.001), (r0 + 0.0035, y0 + 0.004)]  # leaf underside
        row = []
        for (r, y) in sec:
            row.append(bm.verts.new((math.sin(a) * r, y, math.cos(a) * r * 0.92 - 0.004)))
        rows.append(row)
    m = len(rows[0])
    for i in range(n):
        for j in range(m):
            bm.faces.new((rows[i][j], rows[i][(j + 1) % m], rows[i + 1][(j + 1) % m], rows[i + 1][j]))
    for row in (rows[0], rows[-1]):
        bm.faces.new(row)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    bm.transform(TO_B)
    me = bpy.data.meshes.new('collar'); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('collar', me); scene.collection.objects.link(o)
    sub = o.modifiers.new('sub', 'SUBSURF'); sub.levels = 1
    evaluate(o, 'collar')
    for p in o.data.polygons:
        p.use_smooth = True
    cavity_colors(o, 5)
    assign(o, ['Collar'])
    return o


def arm_upper():
    # shoulder pivot; hangs along -y. deltoid cap rounds over the top so raised arms stay closed.
    tab = [  # y, half-width (x), front, back
        (0.03, 0.012, 0.01, 0.01),
        (0.022, 0.03, 0.024, 0.024),
        (0.005, 0.045, 0.038, 0.038),
        (-0.03, 0.049, 0.044, 0.043),     # deltoid
        (-0.07, 0.047, 0.045, 0.043),
        (-0.12, 0.043, 0.045, 0.042),     # biceps
        (-0.2, 0.041, 0.042, 0.04),
        (-0.26, 0.04, 0.04, 0.039),
        (-0.3, 0.038, 0.038, 0.038),
        (-0.315, 0.02, 0.02, 0.02),
    ]
    Y = rings(-0.315, 0.03, 0.02, [0.027, 0.015, 0.0, -0.305])[::-1]

    def prof(i, th):
        a, bf, bb = sect(tab, Y[i])
        return superell(a, bf, bb, 2.05, th)
    o = tube('arm_upper', [(0, y, 0) for y in Y], prof, seg=18, fwd=(0, 0, 1))

    def fn(p, n):
        y = p[:, 1]
        d = 0.0016 * np.sin(y * 120 + p[:, 2] * 40) * gauss(p, (0, -0.24, 0.035), (0.05, 0.05, 0.03))  # crook folds
        d += 0.0012 * np.sin(np.arctan2(p[:, 0], p[:, 2]) * 3 + y * 30) * gauss(p, (0, -0.1, 0), (1, 0.08, 1))
        return d
    displace(o, fn)
    relax(o, 1)
    cavity_colors(o, 4)
    assign(o, ['Top'])
    return o


def arm_fore():
    tab = [  # y (elbow pivot), half-width, front, back
        (0.035, 0.02, 0.02, 0.02),
        (0.02, 0.036, 0.036, 0.036),
        (-0.01, 0.041, 0.04, 0.041),
        (-0.06, 0.04, 0.039, 0.038),      # forearm bulk
        (-0.14, 0.035, 0.033, 0.032),
        (-0.195, 0.031, 0.029, 0.029),
        (-0.2, 0.032, 0.031, 0.031),      # cuff
        (-0.228, 0.032, 0.031, 0.031),
        (-0.2295, 0.024, 0.023, 0.023),
    ]
    Y = [0.035, 0.03, 0.02, 0.005, -0.01, -0.035, -0.06, -0.085, -0.11, -0.14, -0.165, -0.19, -0.195, -0.2, -0.214, -0.228, -0.2295]

    def prof(i, th):
        a, bf, bb = sect(tab, Y[i])
        return superell(a, bf, bb, 2.1, th)
    o = tube('arm_fore', [(0, y, 0.002) for y in Y], prof, seg=18)

    def fn(p, n):
        y = p[:, 1]
        d = 0.002 * np.sin(y * 150 + p[:, 0] * 50) * gauss(p, (0, -0.0, 0.03), (0.05, 0.04, 0.03))   # bunching at the elbow
        d += 0.0012 * np.sin(np.arctan2(p[:, 0], p[:, 2]) * 4 + y * 50) * gauss(p, (0, -0.17, 0), (1, 0.03, 1))
        return d
    displace(o, fn)
    cavity_colors(o, 4)
    assign(o, ['Top'])
    return o


def _bezier_path(pts, rad, step=0.015):
    """Polyline through pts with rounded corners of radius rad, resampled every `step`."""
    P = [Vector(p) for p in pts]
    out = [P[0]]
    for i in range(1, len(P) - 1):
        a, b, c = P[i - 1], P[i], P[i + 1]
        p0 = b + (a - b).normalized() * rad; p2 = b + (c - b).normalized() * rad
        out.append(p0)
        for k in range(1, 8):
            t = k / 8
            out.append((1 - t) ** 2 * p0 + 2 * (1 - t) * t * b + t * t * p2)
        out.append(p2)
    out.append(P[-1])
    # resample
    L = [0.0]
    for i in range(1, len(out)):
        L.append(L[-1] + (out[i] - out[i - 1]).length)
    s = np.arange(0, L[-1], step).tolist() + [L[-1]]
    res = []
    for si in s:
        j = max(0, min(len(L) - 2, int(np.searchsorted(L, si) - 1)))
        t = (si - L[j]) / max(L[j + 1] - L[j], 1e-9)
        res.append(out[j].lerp(out[j + 1], min(max(t, 0), 1)))
    return res, np.array(s) / L[-1], L[-1]


def leg(name, seated):
    # (fraction along the leg from the hip, half-width, front, back): trousers over thigh, knee, calf, ankle
    if seated:
        pts = [(0, 0.475, -0.04), (0, 0.46, 0.42), (0, 0.06, 0.43)]
        heel = (0, 0.045, 0.415); toe = (0, 0.035, 0.55)
    else:
        pts = [(0, 0.965, 0.0), (0, 0.5, 0.012), (0, 0.06, 0.0)]
        heel = (0, 0.045, -0.015); toe = (0, 0.035, 0.12)
    C, S, Ltot = _bezier_path(pts, 0.07 if seated else 0.0001, 0.022)
    knee = (Vector(pts[0]) - Vector(pts[1])).length / Ltot
    tab = [
        (0.0, 0.078, 0.08, 0.082),
        (0.12, 0.074, 0.074, 0.076),
        (knee * 0.6, 0.068, 0.066, 0.066),
        (knee, 0.056, 0.058, 0.058),
        (knee + 0.12, 0.054, 0.054, 0.056),   # calf
        (0.86, 0.046, 0.046, 0.046),
        (0.97, 0.048, 0.05, 0.05),             # trouser hem breaks over the shoe
        (1.0, 0.049, 0.051, 0.051),
    ]

    def prof(i, th):
        a, bf, bb = sect(tab, S[i])
        return superell(a, bf, bb, 2.05, th)
    o = tube(name, C, prof, seg=20, cap1=True, fwd=(0, 0, 1) if not seated else (0, 1, 0))

    def fn(p, n):
        kp = np.array(pts[1])
        d = 0.0018 * np.sin((p[:, 1] + p[:, 2]) * 110) * gauss(p, kp, (0.08, 0.08, 0.08))      # folds at the knee
        d += 0.0015 * np.sin(p[:, 1] * 90 + p[:, 0] * 30) * gauss(p, (0, 0.08, pts[2][2]), (1, 0.04, 0.1))  # break at the hem
        return d
    displace(o, fn)
    relax(o, 1)
    cavity_colors(o, 4)
    assign(o, ['Bottom'])
    sh = Shape()
    sh.cap(heel, toe, 0.04, 0.038, seg=16)
    sh.ell(((heel[0]), heel[1] + 0.012, heel[2] + 0.03), (0.043, 0.045, 0.06))
    sh.box((0, heel[1] - 0.038, (heel[2] + toe[2]) / 2 + 0.01), (0.088, 0.016, toe[2] - heel[2] + 0.1))
    so = sculpt(name + '_shoe', sh, voxel=0.003, smooth=3, tris=400)
    cavity_colors(so, 4)
    assign(so, ['Shoe'])
    with bpy.context.temp_override(active_object=o, selected_editable_objects=[o, so], selected_objects=[o, so]):
        bpy.ops.object.join()
    return o


def hand(side):
    """Relaxed hand at the wrist (y -0.24 in the elbow pivot), palm facing the body. side: +1 right, -1 left."""
    s = Shape()
    x = side
    s.cap((0, -0.21, 0), (0, -0.258, 0.002), 0.0245, 0.023, seg=14)                          # wrist
    s.ell((-x * 0.002, -0.292, 0.004), (0.016, 0.042, 0.036))                                 # palm
    s.ell((-x * 0.006, -0.3, -0.018), (0.012, 0.03, 0.014))                                   # heel / pinky edge
    fz = (0.024, 0.009, -0.006, -0.02)
    fl = (0.072, 0.08, 0.075, 0.06)
    for i, (z, L) in enumerate(zip(fz, fl)):
        base = Vector((-x * 0.002, -0.33, z))
        curl = 0.35 + i * 0.12
        seg = [L * 0.45, L * 0.32, L * 0.23]
        p = base; ang = 0.15
        r = 0.0092 - i * 0.0007
        for j, sl in enumerate(seg):
            ang += curl
            q = p + Vector((-x * math.sin(ang) * sl, -math.cos(ang) * sl, -z * 0.08))
            s.cap(p, q, r, r * 0.9, seg=10)
            p = q; r *= 0.9
    # thumb: from the base of the palm, forward and across
    p0 = Vector((-x * 0.01, -0.272, 0.028))
    p1 = p0 + Vector((-x * 0.016, -0.026, 0.016))
    p2 = p1 + Vector((-x * 0.016, -0.022, 0.006))
    p3 = p2 + Vector((-x * 0.01, -0.018, -0.002))
    s.cap(p0, p1, 0.013, 0.011, seg=10); s.cap(p1, p2, 0.0105, 0.0095, seg=10); s.cap(p2, p3, 0.0092, 0.0085, seg=10)
    o = sculpt('hand_' + ('R' if side > 0 else 'L'), s, voxel=0.0014, smooth=3, tris=520, blend=0.003)
    cavity_colors(o, 6, tint=skin_tint(1.0, [((0, -0.36, 0), (0.03, 0.05, 0.04), 0.7)]))
    assign(o, ['Skin'])
    return o




# ---------------------------------------------------------------- build
parts = []
print('heads'); parts += [head('head_m', False), head('head_f', True)]
print('faces'); parts += [face('face_m', False), face('face_f', True), moustache(), glasses()]
print('hair')
parts += [hair_short('hair_short'), hair_short('hair_part', part=True), hair_long('hair_long', 0.24), hair_long('hair_bob', 0.13, bangs=True),
          hair_curly('hair_curly'), hair_fringe('hair_fringe')]
print('body')
parts += [neck('neck_m', False), neck('neck_f', True), torso('torso_shirt_m', False, 'shirt'), torso('torso_sweater_m', False, 'sweater'),
          torso('torso_top_f', True, 'shirt'), torso('torso_sweater_f', True, 'sweater'), collar(),
          arm_upper(), arm_fore(), hand(1), hand(-1), leg('leg_seated', True), leg('leg_standing', False)]

HEAD_SCALE = 1.04  # head height ~0.225 m: a 7.5-head figure
for o in parts:
    if o.name.startswith(('head_', 'face_', 'hair_', 'moustache', 'glasses')):
        o.data.transform(Matrix.Diagonal((HEAD_SCALE,) * 3 + (1,)))
tot = 0
for o in parts:
    me = o.data
    me.calc_loop_triangles()
    t = len(me.loop_triangles); tot += t
    print(f'  {o.name:18s} {t:6d} tris')
print('total', tot)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
if not PREVIEW:
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=False, export_yup=True,
                              export_apply=True, export_normals=True, export_texcoords=False,
                              export_vertex_color='ACTIVE', export_all_vertex_colors=False,
                              export_active_vertex_color_when_no_material=True,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
                              export_draco_position_quantization=14, export_draco_normal_quantization=10,
                              export_draco_color_quantization=8, export_materials='EXPORT')
    print('wrote', OUT, os.path.getsize(OUT))
else:
    exec(open(os.path.join(HERE, 'people_preview.py')).read())
