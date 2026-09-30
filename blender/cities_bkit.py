# Shared modelling kit for the suburb / NYC / lake / Cleveland landmark sets (bpy 5.0, headless).
# Every set is one .glb: a root empty per station ("S_<name>"), with pieces parented under it.
# Blender axes: +X = along the track, +Y = away from the camera (three.js -z), +Z = up. Origin = the station's track centre.
# Geometry is built with bmesh; colour lives in a corner colour attribute, materials are named by role
# (Brick, Clapboard, Roof, Stone, Wood, Metal, Foliage, Window, Lights, Beacon, Glow, ...) so the site can
# swap in its own shaders (glowing windows at night, twinkling lights).
import bpy, bmesh, math, random
from mathutils import Matrix, Vector, Color

ROLES = ['Brick', 'Clapboard', 'Trim', 'Roof', 'Stone', 'Concrete', 'Wood', 'Metal', 'Paint', 'Foliage', 'Bark',
         'Snow', 'Ground', 'Window', 'Lights', 'Lamp', 'Beacon', 'Glow', 'Fabric', 'Water']


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for r in ROLES:
        m = bpy.data.materials.new(r)
        m.use_nodes = True
        # show vertex colour in the material too (keeps the glTF export self-describing)
        nt = m.node_tree
        bsdf = nt.nodes.get('Principled BSDF')
        attr = nt.nodes.new('ShaderNodeVertexColor'); attr.layer_name = 'Color'
        nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
        bsdf.inputs['Roughness'].default_value = 0.4 if r in ('Metal', 'Window') else 0.85
        if r == 'Metal': bsdf.inputs['Metallic'].default_value = 0.6


def hexc(h, jitter=0.0, rnd=random):
    if isinstance(h, (tuple, list)): c = list(h)
    else:
        h = h.lstrip('#')
        if len(h) == 3: h = ''.join(ch * 2 for ch in h)
        c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    if jitter:
        k = 1 + (rnd.random() - 0.5) * 2 * jitter
        c = [min(1, max(0, v * k)) for v in c]
    return (c[0], c[1], c[2], 1.0)


class B:
    """Accumulates one mesh object: faces carry a role (material) and a colour."""

    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.col = self.bm.loops.layers.color.new('Color')
        self.roles = []

    def _slot(self, role):
        if role not in self.roles: self.roles.append(role)
        return self.roles.index(role)

    def _finish(self, verts, color, role, smooth=False, faces=None):
        if faces is None:
            faces = {f for v in verts for f in v.link_faces}
        c = hexc(color) if not (isinstance(color, tuple) and len(color) == 4) else color
        idx = self._slot(role)
        for f in faces:
            f.material_index = idx
            f.smooth = smooth
            for l in f.loops: l[self.col] = c
        return faces

    # ---- primitives ----
    def box(self, x0, y0, z0, x1, y1, z1, color, role='Paint'):
        m = Matrix.Translation(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ Matrix.Diagonal((abs(x1 - x0), abs(y1 - y0), abs(z1 - z0), 1))
        r = bmesh.ops.create_cube(self.bm, size=1, matrix=m)
        return self._finish(r['verts'], color, role)

    def boxc(self, cx, cy, z0, w, d, h, color, role='Paint', rot=0.0):
        m = Matrix.Translation((cx, cy, z0 + h / 2)) @ Matrix.Rotation(rot, 4, 'Z') @ Matrix.Diagonal((w, d, h, 1))
        r = bmesh.ops.create_cube(self.bm, size=1, matrix=m)
        return self._finish(r['verts'], color, role)

    def cyl(self, x, y, z0, z1, r1, color, role='Paint', seg=12, r2=None, smooth=True, cap=True, axis='Z'):
        h = z1 - z0
        if axis == 'Z': m = Matrix.Translation((x, y, z0 + h / 2))
        elif axis == 'X': m = Matrix.Translation((z0 + h / 2, x, y)) @ Matrix.Rotation(math.pi / 2, 4, 'Y')
        else: m = Matrix.Translation((x, z0 + h / 2, y)) @ Matrix.Rotation(-math.pi / 2, 4, 'X')
        r = bmesh.ops.create_cone(self.bm, cap_ends=cap, cap_tris=False, segments=seg, radius1=r1, radius2=r1 if r2 is None else r2, depth=h, matrix=m)
        faces = self._finish(r['verts'], color, role, smooth)
        if smooth:
            for f in faces:
                if abs(f.normal.dot(Vector((0, 0, 1)) if axis == 'Z' else Vector((1, 0, 0)) if axis == 'X' else Vector((0, 1, 0)))) > 0.95: f.smooth = False
        return faces

    def cone(self, x, y, z0, h, r, color, role='Paint', seg=8, smooth=False):
        return self.cyl(x, y, z0, z0 + h, r, color, role, seg, r2=0.0, smooth=smooth)

    def ico(self, x, y, z, r, color, role='Foliage', sub=1, sx=1, sy=1, sz=1):
        m = Matrix.Translation((x, y, z)) @ Matrix.Diagonal((sx, sy, sz, 1))
        res = bmesh.ops.create_icosphere(self.bm, subdivisions=sub, radius=r, matrix=m)
        return self._finish(res['verts'], color, role)

    def poly_prism(self, pts, y0, y1, color, role='Roof', axis='Y'):
        """Extrude a 2D profile (list of (u, z)) along Y (u = x) or along X (u = y)."""
        vs0, vs1 = [], []
        for (u, z) in pts:
            if axis == 'Y':
                vs0.append(self.bm.verts.new((u, y0, z))); vs1.append(self.bm.verts.new((u, y1, z)))
            else:
                vs0.append(self.bm.verts.new((y0, u, z))); vs1.append(self.bm.verts.new((y1, u, z)))
        n = len(pts)
        faces = [self.bm.faces.new(vs0[::-1]), self.bm.faces.new(vs1)]
        for i in range(n):
            j = (i + 1) % n
            faces.append(self.bm.faces.new((vs0[i], vs0[j], vs1[j], vs1[i])))
        # normals outward
        bmesh.ops.recalc_face_normals(self.bm, faces=faces)
        return self._finish(None, color, role, faces=set(faces))

    def gable(self, x0, y0, x1, y1, z, h, color, role='Roof', along='X', over=0.35, thick=0.18):
        """Pitched roof: ridge along X (spanning y) or along Y (spanning x)."""
        if along == 'X':
            cy, hw = (y0 + y1) / 2, (y1 - y0) / 2 + over
            pts = [(cy - hw, z - thick), (cy + hw, z - thick), (cy + hw, z), (cy, z + h + thick * 0.7), (cy - hw, z)]
            return self.poly_prism(pts, x0 - over * 0.6, x1 + over * 0.6, color, role, axis='X')
        cx, hw = (x0 + x1) / 2, (x1 - x0) / 2 + over
        pts = [(cx - hw, z - thick), (cx + hw, z - thick), (cx + hw, z), (cx, z + h + thick * 0.7), (cx - hw, z)]
        return self.poly_prism(pts, y0 - over * 0.6, y1 + over * 0.6, color, role, axis='Y')

    def gable_wall(self, x0, y0, x1, y1, z, h, color, role='Clapboard', along='X'):
        """Triangular wall infill under a gable roof."""
        if along == 'X':
            pts = [(y0, z), (y1, z), ((y0 + y1) / 2, z + h)]
            return self.poly_prism(pts, x0, x1, color, role, axis='X')
        pts = [(x0, z), (x1, z), ((x0 + x1) / 2, z + h)]
        return self.poly_prism(pts, y0, y1, color, role, axis='Y')

    def hip(self, x0, y0, x1, y1, z, h, color, role='Roof', over=0.3):
        x0 -= over; y0 -= over; x1 += over; y1 += over
        ins = min(x1 - x0, y1 - y0) / 2 * 0.95
        bm = self.bm
        a = [bm.verts.new(p) for p in ((x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z))]
        t = [bm.verts.new(p) for p in ((x0 + ins, y0 + ins, z + h), (x1 - ins, y0 + ins, z + h), (x1 - ins, y1 - ins, z + h), (x0 + ins, y1 - ins, z + h))]
        fs = [bm.faces.new((a[i], a[(i + 1) % 4], t[(i + 1) % 4], t[i])) for i in range(4)]
        fs.append(bm.faces.new(t)); fs.append(bm.faces.new(a[::-1]))
        bmesh.ops.recalc_face_normals(bm, faces=fs)
        return self._finish(None, color, role, faces=set(fs))

    def tube(self, pts, r, color, role='Metal', seg=5):
        """Chain of thin cylinders through points (cables, rails)."""
        for p, q in zip(pts[:-1], pts[1:]):
            p, q = Vector(p), Vector(q)
            d = q - p; L = d.length
            if L < 1e-5: continue
            rot = d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
            m = Matrix.Translation((p + q) / 2) @ rot
            res = bmesh.ops.create_cone(self.bm, cap_ends=False, segments=seg, radius1=r, radius2=r, depth=L, matrix=m)
            self._finish(res['verts'], color, role, smooth=True)

    def windows_x(self, x0, x1, y, z0, z1, n, rows, w, h, rnd, lit=0.45, facing=-1, inset=0.06, frame=None):
        """Grid of window panes on a wall facing -Y (facing=-1) or +Y at plane y."""
        for rI in range(rows):
            zc = z0 + (z1 - z0) * (rI + 0.5) / rows
            for k in range(n):
                xc = x0 + (x1 - x0) * (k + 0.5) / n
                c = win_color(rnd, lit)
                yy = y + facing * inset
                self.box(xc - w / 2, yy - 0.04, zc - h / 2, xc + w / 2, yy + 0.04, zc + h / 2, c, 'Window')
                if frame:
                    self.box(xc - w / 2 - 0.08, yy - 0.06 * -facing, zc - h / 2 - 0.12, xc + w / 2 + 0.08, yy + facing * 0.08, zc - h / 2 - 0.02, frame, 'Trim')

    def windows_y(self, y0, y1, x, z0, z1, n, rows, w, h, rnd, lit=0.45, facing=-1, inset=0.06):
        for rI in range(rows):
            zc = z0 + (z1 - z0) * (rI + 0.5) / rows
            for k in range(n):
                yc = y0 + (y1 - y0) * (k + 0.5) / n
                c = win_color(rnd, lit)
                xx = x + facing * inset
                self.box(xx - 0.04, yc - w / 2, zc - h / 2, xx + 0.04, yc + w / 2, zc + h / 2, c, 'Window')

    def to_object(self, parent=None, loc=(0, 0, 0)):
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me); self.bm.free()
        me.color_attributes.active_color_name = 'Color'
        for r in self.roles: me.materials.append(bpy.data.materials[r])
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(ob)
        ob.location = loc
        if parent is not None: ob.parent = parent
        return ob


def win_color(rnd, lit):
    """Window vertex colour: warm (lit at night) or dark glass (stays dark). The site maps both to glass by day."""
    if rnd.random() < lit:
        return hexc(rnd.choice(['#ffd9a0', '#ffe4b8', '#ffcf8a', '#fff0d0', '#ffc070']))
    return hexc(rnd.choice(['#1c2430', '#232a36', '#1a1f28']))


def root(name):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    return e


def piece(name, parent, x, y, build):
    """Build a piece in local coordinates (origin at its base) and place it at (x, y) under parent."""
    b = B(name)
    build(b)
    return b.to_object(parent, (x, y, 0))


def count_tris():
    n = 0
    for o in bpy.data.objects:
        if o.type == 'MESH':
            for p in o.data.polygons: n += len(p.vertices) - 2
    return n


def export(path):
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_draco_mesh_compression_enable=True,
                              export_apply=True, export_vertex_color='ACTIVE', export_all_vertex_colors=False,
                              export_materials='EXPORT', export_yup=True, export_extras=False, export_cameras=False, export_lights=False)
    print('exported', path, 'tris', count_tris())


def preview(path, cam_loc=(40, -70, 30), target=(0, 30, 6), lens=35, res=(900, 520)):
    """Workbench preview roughly from the site's camera side."""
    sc = bpy.context.scene
    # Workbench needs a GPU context; headless containers have none, so preview with a few Cycles CPU samples
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'; sc.cycles.samples = 12; sc.cycles.use_denoising = False
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 4.0; sun.rotation_euler = (math.radians(50), 0, math.radians(30))
    sc.render.resolution_x, sc.render.resolution_y = res
    cam_d = bpy.data.cameras.new('cam'); cam_d.lens = lens; cam_d.clip_end = 2000
    cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam)
    cam.location = cam_loc
    d = Vector(target) - Vector(cam_loc)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    w = sc.world or bpy.data.worlds.new('w'); sc.world = w
    w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.5, 0.6, 0.75, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.8
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)


# ---------------- reusable set pieces ----------------

def deciduous(b, x, y, s, rnd, palette, trunk='#5a4332', bare=False, snow=False):
    b.cyl(x, y, 0, 2.2 * s, 0.22 * s, trunk, 'Bark', seg=6, r2=0.15 * s)
    if bare:
        for k in range(5):
            a = k * 1.3 + rnd.random()
            p0 = (x, y, 1.8 * s)
            p1 = (x + math.cos(a) * 1.6 * s, y + math.sin(a) * 1.6 * s, (3.2 + rnd.random()) * s)
            b.tube([p0, p1], 0.09 * s, trunk, 'Bark', seg=4)
        if snow: b.ico(x, y, 3.3 * s, 1.1 * s, '#e8edf3', 'Snow', sub=1, sz=0.35)
        return
    for k in range(4):
        a = k * 1.9 + rnd.random()
        rr = (1.2 + rnd.random() * 0.6) * s
        b.ico(x + math.cos(a) * 0.8 * s, y + math.sin(a) * 0.8 * s, (3.0 + rnd.random() * 1.1) * s, rr, hexc(rnd.choice(palette), 0.08, rnd), 'Foliage', sub=1)
    b.ico(x, y, 4.3 * s, 1.3 * s, hexc(rnd.choice(palette), 0.08, rnd), 'Foliage', sub=1)


def pine(b, x, y, s, rnd, col='#2f4f37', snow=False):
    b.cyl(x, y, 0, 1.4 * s, 0.18 * s, '#4a3526', 'Bark', seg=5)
    for k in range(4):
        z = (1.0 + k * 1.15) * s
        r = (1.7 - k * 0.36) * s
        c = hexc(col, 0.1, rnd)
        b.cone(x, y, z, 1.9 * s, r, c, 'Foliage', seg=7)
        if snow: b.cone(x, y, z + 0.9 * s, 1.0 * s, r * 0.55, '#eef2f7', 'Snow', seg=7)


def car(b, x, y, rot, body, rnd, kind='sedan', snow=False):
    """Small car / cab along X (rot 0) or Y (rot pi/2)."""
    c, s = math.cos(rot), math.sin(rot)
    def R(u, v): return (x + u * c - v * s, y + u * s + v * c)
    L = 4.6 if kind != 'wagon' else 5.0
    cx, cy = R(0, 0)
    b.boxc(cx, cy, 0.35, L, 1.8, 0.75, body, 'Paint', rot)
    cx2, cy2 = R(-0.2 if kind != 'wagon' else -0.5, 0)
    b.boxc(cx2, cy2, 1.1, 2.4 if kind != 'wagon' else 3.2, 1.62, 0.62, '#1c232c', 'Window', rot)
    b.boxc(cx2, cy2, 1.7, 2.3 if kind != 'wagon' else 3.1, 1.55, 0.08, body if not snow else '#eef2f7', 'Paint' if not snow else 'Snow', rot)
    for u in (-1.45, 1.45):
        for v in (-0.85, 0.85):
            wx, wy = R(u, v)
            b.boxc(wx, wy, 0.0, 0.72, 0.28, 0.72, '#15161a', 'Metal', rot)
    if kind == 'cab':
        tx, ty = R(-0.3, 0)
        b.boxc(tx, ty, 1.78, 0.6, 0.3, 0.22, '#fff6c8', 'Lights', rot)
    # head / tail lights
    for v in (-0.6, 0.6):
        hx, hy = R(L / 2, v); b.boxc(hx, hy, 0.65, 0.06, 0.3, 0.16, '#fff3d0', 'Lights', rot)
        tx, ty = R(-L / 2, v); b.boxc(tx, ty, 0.65, 0.06, 0.3, 0.16, '#ff3a2a', 'Lights', rot)
