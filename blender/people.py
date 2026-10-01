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
  neck                     neck pivot (Skin)
  torso_shirt_m, torso_sweater_m, torso_top_f, torso_sweater_f   torso pivot at the hips (Top / Bottom)
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
    s.ell((0, 0.064, 0.026), (0.06 * k, 0.074, 0.068), seg=32, rings=24)             # face mass
    jw = 0.04 if fem else 0.046
    for x in (-1, 1):
        s.ell((x * jw, 0.04, 0.0), (0.018, 0.024, 0.036), rot=(0.3, 0, 0))             # jaw angles
        s.ell((x * 0.042, 0.088, 0.05), (0.018, 0.014, 0.02), rot=(0, x * 0.4, 0))      # cheekbones
        s.ell((x * 0.076, 0.094, -0.006), (0.011, 0.029, 0.019), rot=(0, x * -0.35, 0))   # ears
        s.ell((x * 0.07, 0.084, -0.0), (0.008, 0.012, 0.01))                               # tragus/lobe root
        # lids: upper fold and lower lid, fused into the face
        s.ell((x * EYE_X, EYE_Y + 0.0085, EYE_Z + 0.001), (0.0152, 0.0072, 0.0128))
        s.ell((x * EYE_X, EYE_Y - 0.0105, EYE_Z + 0.002), (0.0145, 0.0042, 0.0118))
        s.ell((x * 0.011, 0.07, 0.096), (0.0085, 0.0075, 0.0085))                          # nostril wings
    s.ell((0, 0.12, 0.07), (0.056 * k, 0.013 if fem else 0.016, 0.018), rot=(0.25, 0, 0))  # brow ridge
    s.ell((0, 0.105, 0.088), (0.009, 0.014, 0.008))                                     # glabella
    s.cap((0, 0.104, 0.091), (0, 0.075, 0.107), 0.0072, 0.0095 if fem else 0.011, seg=14)  # nose bridge
    s.ell((0, 0.071, 0.106), (0.011, 0.0105, 0.011))                                    # nose tip
    s.ell((0, 0.046, 0.071), (0.029, 0.024, 0.021))                                    # muzzle
    lip = 1.15 if fem else 1.0
    s.ell((0, 0.047, 0.09), (0.02, 0.0062 * lip, 0.0085 * lip), rot=(-0.2, 0, 0))     # upper lip
    s.ell((0, 0.034, 0.087), (0.018, 0.0072 * lip, 0.0092 * lip), rot=(0.25, 0, 0))   # lower lip
    s.ell((0, 0.013, 0.07), (0.017 if fem else 0.021, 0.016, 0.016))                   # chin
    s.ell((0, 0.028, 0.03), (0.042 * k, 0.025, 0.036))                                   # under jaw
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

    o = sculpt(name, s, cut, voxel=0.0016, smooth=6, tris=2400, blend=0.005)
    cavity_colors(o, strength=5.0, tint=tint)
    assign(o, ['Skin'])
    return o


def face(name, fem):
    s = Shape()
    for x in (-1, 1):
        s.ell((x * EYE_X, EYE_Y, EYE_Z), (EYE_R, EYE_R, EYE_R), seg=20, rings=14)
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
    brows = sculpt(name + '_b', b, voxel=0.0009, smooth=2, tris=500)
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
    s.ell((0, 0.131 + top, -0.016), (0.079 * k, 0.093 + top, 0.103 * k), seg=40, rings=28)


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


# ---------------------------------------------------------------- neck, torso, arms, hands, legs
def neck():
    s = Shape()
    s.cap((0, -0.06, -0.005), (0, 0.14, 0.008), 0.056, 0.048, seg=24)
    for x in (-1, 1):
        s.cap((x * 0.03, 0.12, -0.0), (x * 0.012, -0.02, 0.035), 0.012, 0.012, seg=12)   # sternocleidomastoid
    o = sculpt('neck', s, voxel=0.003, smooth=4, tris=400, blend=0.01)
    cavity_colors(o, 5)
    assign(o, ['Skin'])
    return o


def torso(name, fem, kind):
    s = Shape()
    if fem:
        s.ell((0, 0.06, 0), (0.155, 0.09, 0.1))                       # hips
        s.ell((0, 0.2, 0.0), (0.12, 0.12, 0.085))                     # waist
        s.ell((0, 0.4, 0.0), (0.15, 0.14, 0.098))                     # ribcage
        for x in (-1, 1):
            s.ell((x * 0.05, 0.395, 0.06), (0.055, 0.052, 0.045))     # bust
            s.ell((x * 0.165, 0.525, -0.005), (0.052, 0.05, 0.052))   # shoulders
        s.ell((0, 0.565, -0.02), (0.105, 0.045, 0.06))
        s.ell((0, 0.535, 0.015), (0.115, 0.045, 0.065))             # trapezius
    else:
        s.ell((0, 0.06, 0), (0.155, 0.09, 0.1))
        s.ell((0, 0.21, 0.008), (0.145, 0.13, 0.098))
        s.ell((0, 0.4, 0.0), (0.172, 0.15, 0.108))
        for x in (-1, 1):
            s.ell((x * 0.062, 0.445, 0.062), (0.07, 0.05, 0.04))      # pecs
            s.ell((x * 0.19, 0.525, -0.005), (0.06, 0.055, 0.06))     # deltoids
            s.ell((x * 0.09, 0.4, -0.06), (0.07, 0.11, 0.05))         # lats/back
        s.ell((0, 0.57, -0.02), (0.12, 0.05, 0.068))
        s.ell((0, 0.54, 0.02), (0.13, 0.05, 0.07))
    if kind == 'sweater':
        s.ell((0, 0.04, 0), (0.16, 0.05, 0.103))  # ribbed hem
    cut = Shape()
    cut.ell((0, 0.6, 0.0), (0.05, 0.03, 0.045))  # neck hole

    def post(me):
        # fabric folds: soft horizontal drag lines around the waist and under the arms
        p = verts_three(me); n = normals_three(me)
        w = gauss(p[:, 1:2].repeat(3, 1) * np.array([0, 1, 0]), (0, 0.17, 0), (1, 0.09, 1))
        d = 0.0022 * np.sin(p[:, 1] * 140 + np.sin(p[:, 0] * 30) * 2) * w
        for x in (-1, 1):
            d += 0.002 * np.sin((p[:, 1] - p[:, 0] * x * 0.8) * 160) * gauss(p, (x * 0.13, 0.4, 0), (0.04, 0.08, 0.2))
        if kind == 'sweater':
            rib = gauss(p, (0, 0.03, 0), (1, 0.03, 1)) + gauss(p, (0, 0.585, 0), (1, 0.012, 1))
            d += 0.0012 * np.sign(np.sin(np.arctan2(p[:, 0], p[:, 2]) * 90)) * rib
        set_verts_three(me, p + n * d[:, None])
    o = sculpt(name, s, cut, voxel=0.004, smooth=6, tris=1300, post=post, blend=0.035)
    cavity_colors(o, 5)
    belt = 0.045 if kind == 'shirt' else -1
    assign(o, ['Top', 'Bottom'], lambda c, n: (c[:, 1] < belt).astype(int))
    return o


def collar():
    s = Shape()
    for x in (-1, 1):
        for i in range(7):
            t = i / 6
            a = x * (0.35 + t * 2.4)
            # band round the neck, opening at the front with points
            p = (math.sin(a) * 0.056, 0.588 + 0.006 * t, math.cos(a) * 0.05 - 0.004)
            s.ell(p, (0.016, 0.014, 0.006), rot=(0, a, 0), seg=10, rings=6)
        s.ell((x * 0.03, 0.565, 0.058), (0.02, 0.026, 0.004), rot=(-0.35, x * 0.45, x * 0.6), seg=12, rings=8)  # collar points
    o = sculpt('collar', s, voxel=0.0018, smooth=2, tris=600)
    cavity_colors(o, 5)
    assign(o, ['Collar'])
    return o


def arm_upper():
    s = Shape()
    s.ell((0, -0.01, 0), (0.055, 0.058, 0.056))
    s.cap((0, -0.03, 0), (0, -0.27, 0.0), 0.05, 0.043)
    s.ell((0, -0.25, -0.01), (0.044, 0.045, 0.044))

    def post(me):
        p = verts_three(me); n = normals_three(me)
        d = 0.0016 * np.sin(p[:, 1] * 120 + p[:, 2] * 40) * gauss(p, (0, -0.2, 0.03), (0.06, 0.07, 0.04))
        set_verts_three(me, p + n * d[:, None])
    o = sculpt('arm_upper', s, voxel=0.003, smooth=4, tris=380, post=post, blend=0.012)
    cavity_colors(o, 4)
    assign(o, ['Top'])
    return o


def arm_fore():
    s = Shape()
    s.cap((0, 0.0, 0), (0, -0.215, 0.003), 0.043, 0.034)
    s.cap((0, -0.21, 0.003), (0, -0.236, 0.003), 0.037, 0.037)        # cuff
    s.ell((0, -0.05, 0.005), (0.047, 0.06, 0.046))                    # sleeve bunching at the elbow
    o = sculpt('arm_fore', s, voxel=0.003, smooth=3, tris=380, blend=0.01)
    cavity_colors(o, 4)
    assign(o, ['Top'])
    return o


def hand(side):
    """Relaxed hand at the wrist (y -0.24 in the elbow pivot), palm facing the body. side: +1 right, -1 left."""
    s = Shape()
    x = side
    s.cap((0, -0.228, 0), (0, -0.258, 0.002), 0.027, 0.025, seg=14)                          # wrist
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
    o = sculpt('hand_' + ('R' if side > 0 else 'L'), s, voxel=0.0014, smooth=3, tris=900, blend=0.003)
    cavity_colors(o, 6)
    assign(o, ['Skin'])
    return o


def leg(name, seated):
    s = Shape()
    if seated:
        s.cap((0, 0.47, -0.02), (0, 0.46, 0.4), 0.082, 0.058)
        s.ell((0, 0.455, 0.42), (0.058, 0.062, 0.06))
        s.cap((0, 0.44, 0.43), (0, 0.1, 0.43), 0.055, 0.042)
        s.cap((0, 0.12, 0.43), (0, 0.075, 0.43), 0.048, 0.048)
        heel = (0, 0.045, 0.415); toe = (0, 0.035, 0.55)
    else:
        s.cap((0, 0.95, 0), (0, 0.5, 0.012), 0.082, 0.058)
        s.ell((0, 0.49, 0.015), (0.058, 0.06, 0.06))
        s.cap((0, 0.48, 0.012), (0, 0.11, 0.0), 0.055, 0.042)
        s.cap((0, 0.12, 0.0), (0, 0.075, 0.0), 0.048, 0.048)
        heel = (0, 0.045, -0.015); toe = (0, 0.035, 0.12)

    def post(me):
        p = verts_three(me); n = normals_three(me)
        d = 0.0018 * np.sin((p[:, 1] + p[:, 2]) * 110) * gauss(p, (0, 0.45 if not seated else 0.44, 0.42 if seated else 0.02), (0.08, 0.08, 0.08))
        set_verts_three(me, p + n * d[:, None])
    o = sculpt(name, s, voxel=0.004, smooth=5, tris=700, post=post, blend=0.015)
    cavity_colors(o, 4)
    assign(o, ['Bottom'])
    sh = Shape()
    sh.cap(heel, toe, 0.042, 0.04, seg=16)
    sh.ell(((heel[0]), heel[1] + 0.012, heel[2] + 0.03), (0.045, 0.045, 0.06))
    sh.box((0, heel[1] - 0.038, (heel[2] + toe[2]) / 2 + 0.01), (0.092, 0.016, toe[2] - heel[2] + 0.1))
    so = sculpt(name + '_shoe', sh, voxel=0.003, smooth=3, tris=400)
    cavity_colors(so, 4)
    assign(so, ['Shoe'])
    # join shoe into the leg object
    with bpy.context.temp_override(active_object=o, selected_editable_objects=[o, so], selected_objects=[o, so]):
        bpy.ops.object.join()
    return o


# ---------------------------------------------------------------- build
parts = []
print('heads'); parts += [head('head_m', False), head('head_f', True)]
print('faces'); parts += [face('face_m', False), face('face_f', True), moustache(), glasses()]
print('hair')
parts += [hair_short('hair_short'), hair_short('hair_part', part=True), hair_long('hair_long', 0.24), hair_long('hair_bob', 0.13, bangs=True),
          hair_curly('hair_curly'), hair_fringe('hair_fringe')]
print('body')
parts += [neck(), torso('torso_shirt_m', False, 'shirt'), torso('torso_sweater_m', False, 'sweater'),
          torso('torso_top_f', True, 'shirt'), torso('torso_sweater_f', True, 'sweater'), collar(),
          arm_upper(), arm_fore(), hand(1), hand(-1), leg('leg_seated', True), leg('leg_standing', False)]

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
