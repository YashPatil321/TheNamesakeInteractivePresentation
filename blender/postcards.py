"""The Namesake Line: one illustrated postcard per station, rendered with Cycles from the landmark GLBs.

Run headless:
  /opt/blendervenv/bin/python blender/postcards.py            # all 15 stations
  /opt/blendervenv/bin/python blender/postcards.py 3 7        # only these stations
  POSTCARD_SAMPLES=24 POSTCARD_SCALE=50 ... (quick drafts)

Each station gets its own Blender process (fresh scene, no state leaks between renders). It loads the
region's landmark GLB, keeps only that station's set (the same set the site mounts, see lib/world3d/cities),
adds the train from train.glb, a ground plane, a stretch of track, a sky gradient from the station's `sky`
colours (lib/stations.ts), a sun or moon matching the time of day, and snow or rain where the story has it.
Writes public/postcards/sNN.webp (1200x675).
"""
import bpy, math, os, sys, random, subprocess
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.join(HERE, '..', 'public', 'models')
OUT = os.path.join(HERE, '..', 'public', 'postcards')

# region, kept set nodes, sky (top, horizon), light preset, camera (pos, target, lens), extras
# light: (sun elevation deg, sun azimuth deg, sun strength, sun colour, world strength, night)
S = [
    dict(r='india', keep=['village', 'village_far'], sky=('#04060c', '#1b2133'), light=(28, -40, 0.7, '#9fb4ff', 0.75, True),
         cam=((16, -21, 3.2), (-8, 26, 6), 30)),
    dict(r='india', keep=['calcutta', 'calcutta_far', 'calcutta_tram', 'calcutta_boats'], sky=('#2a1640', '#c86b4a'), light=(9, -55, 3.4, '#ff9a5c', 1.1, False),
         cam=((15, -22, 4.0), (-10, 30, 7), 30)),
    dict(r='town', keep=['camA', 'camA_river', 'camA_far'], sky=('#10223d', '#e59a5c'), light=(10, 50, 3.2, '#ffb07a', 1.1, False),
         cam=((-17, -21, 3.6), (8, 28, 7), 30)),
    dict(r='town', keep=['camB'], sky=('#1d2b52', '#f1b56b'), light=(16, -45, 3.6, '#ffc684', 1.1, False),
         cam=((15, -20, 3.8), (-9, 26, 7), 32)),
    dict(r='suburb', keep=['S_school'], sky=('#3a6fa8', '#c9e0f0'), light=(42, -35, 4.2, '#fff4e2', 1.2, False),
         cam=((14, -19, 3.4), (-10, 28, 6), 30)),
    dict(r='suburb', keep=['S_cemetery'], sky=('#27447a', '#9cc3e0'), light=(30, 40, 3.8, '#fff0d6', 1.1, False),
         cam=((-15, -19, 7.5), (4, 30, 0.5), 30)),
    dict(r='suburb', keep=['S_street'], sky=('#2a1d45', '#e08a6a'), light=(8, -60, 3.2, '#ff9466', 1.1, False),
         cam=((14, -18, 3.0), (-10, 24, 5), 30)),
    dict(r='suburb', keep=['S_highschool'], sky=('#3b4a6b', '#b8c2d6'), light=(35, 30, 1.6, '#e8eef8', 1.7, False),
         cam=((-14, -20, 3.6), (4, 30, 8), 30)),
    dict(r='town', keep=['court', 'court_flag'], sky=('#120b2a', '#5b2a6e'), light=(30, -40, 0.5, '#b9a4ff', 0.7, True),
         cam=((15, -21, 3.4), (-6, 28, 9), 30)),
    dict(r='campus', keep=['yale', 'yale_tower'], sky=('#070b18', '#27304f'), light=(35, -40, 0.9, '#a8b8ff', 0.9, True),
         cam=((14, -21, 3.2), (-10, 30, 10), 30)),
    dict(r='lake', keep=['S_lake'], sky=('#0e2a4a', '#f0c27a'), light=(10, -60, 3.4, '#ffbe73', 1.1, False),
         cam=((16, -20, 6.5), (-12, 30, 3), 30)),
    dict(r='cleveland', keep=['S_cleveland'], sky=('#15171f', '#3d4250'), light=(40, 20, 0.8, '#c8d0e0', 1.6, False), rain=True,
         cam=((-14, -21, 3.4), (4, 32, 12), 30)),
    dict(r='nyc', keep=['S_midtown'], sky=('#1a2440', '#b06a7a'), light=(8, -55, 2.6, '#ff8f7a', 1.1, False),
         cam=((14, -22, 3.0), (-12, 34, 16), 28)),
    dict(r='nyc', keep=['S_bridge'], sky=('#0b0d16', '#2c2238'), light=(30, 40, 0.9, '#a49cff', 0.95, True),
         cam=((-16, -22, 3.2), (8, 36, 12), 28)),
    dict(r='suburb', keep=['S_christmas'], sky=('#0a1430', '#2d3d6b'), light=(32, -40, 0.5, '#b4c6ff', 0.7, True), snow=True,
         cam=((14, -19, 3.2), (-10, 26, 5), 30)),
]


def lin(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c) + (1.0,)


def mat(name, col, rough=0.8, emit=None, strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = lin(col)
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = lin(emit)
        b.inputs['Emission Strength'].default_value = strength
    return m


def box(name, loc, size, m):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    o.data.materials.append(m)
    return o


def descend(o):
    yield o
    for c in o.children:
        yield from descend(c)


def render_station(i):
    cfg = S[i]
    random.seed(100 + i)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    night = cfg['light'][5]

    # ---- landmarks: keep only this station's set
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS, cfg['r'] + '.glb'))
    for root in [o for o in sc.objects if o.parent is None]:
        if root.name not in cfg['keep']:
            for o in list(descend(root)):
                bpy.data.objects.remove(o, do_unlink=True)
    # windows / lamps glow after dark (materials named like Glass / Window / Lamp / Lantern)
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        b = m.node_tree.nodes.get('Principled BSDF')
        if not b:
            continue
        n = m.name.lower()
        if any(k in n for k in ('glass', 'window', 'lamp', 'lantern', 'light', 'glow', 'fire', 'neon')):
            b.inputs['Emission Color'].default_value = lin('#ffc77a')
            b.inputs['Emission Strength'].default_value = 3.0 if night else 0.4

    # ---- train (three.js nodes at the origin; place them like lib/world3d/train.ts does: loco ahead, coach, van)
    before = set(sc.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS, 'train.glb'))
    tr = [o for o in sc.objects if o not in before]
    byname = {o.name: o for o in tr}
    for k in ('WheelDriver', 'WheelSmall', 'CouplingRod'):
        if k in byname:
            bpy.data.objects.remove(byname[k], do_unlink=True)
    span = {}
    for k in ('Loco', 'Coach', 'Van'):
        o = byname.get(k)
        if o:
            xs = [(o.matrix_world @ Vector(c)).x for c in o.bound_box]
            span[k] = (min(xs), max(xs))
    x = 6.0
    for k in ('Loco', 'Coach', 'Van'):
        if k in span:
            o = byname[k]
            o.location.x += x - span[k][1]
            x -= (span[k][1] - span[k][0]) + 0.6
    for m in bpy.data.materials:
        b = m.node_tree.nodes.get('Principled BSDF') if m.use_nodes else None
        if not b:
            continue
        if m.name.startswith('LiveryDark'):
            b.inputs['Base Color'].default_value = lin('#3a1712')
        elif m.name.startswith('Livery'):
            b.inputs['Base Color'].default_value = lin('#7a2a1e')
        elif m.name.startswith('Lens'):
            b.inputs['Base Color'].default_value = lin('#e08a2e')
        elif m.name.startswith('Lamp') or m.name.startswith('Glass'):
            b.inputs['Emission Color'].default_value = lin('#ffd08a')
            b.inputs['Emission Strength'].default_value = 5.0 if night else 0.12
        elif m.name.startswith('TailLamp'):
            b.inputs['Emission Color'].default_value = lin('#ff3020')
            b.inputs['Emission Strength'].default_value = 5.0

    # ---- ground, ballast and track
    GROUND = {'india': '#8b6b47', 'town': '#56603c', 'suburb': '#5b7d45', 'campus': '#4f6c3f', 'nyc': '#4a4b50', 'lake': '#44643f', 'cleveland': '#514d46'}  # scenery.ts
    gcol = '#e8edf5' if cfg.get('snow') else ('#34373d' if cfg.get('rain') else GROUND[cfg['r']])
    bpy.ops.mesh.primitive_plane_add(size=600, location=(0, 120, -0.02))
    g = bpy.context.object
    g.data.materials.append(mat('Ground', gcol, 0.35 if cfg.get('rain') else 0.95))
    if cfg['r'] == 'lake':  # the lake itself is laid by scenery.ts on the site
        bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 61, 0.03))
        wtr = bpy.context.object
        wtr.scale = (68, 98, 1)
        wtr.data.materials.append(mat('LakeWater', '#1d3f55', 0.06))
    ballast = mat('Ballast', '#6b6258' if not cfg.get('snow') else '#cfd6e2', 1.0)
    steel = mat('Rail', '#8a8f96', 0.3)
    steel.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = 1.0
    wood = mat('Sleeper', '#3b2c22', 0.9)
    box('Ballast', (0, 0, 0.1), (240, 3.4, 0.24), ballast)
    for z in (-0.72, 0.72):
        box('Rail', (0, z, 0.52), (240, 0.12, 0.14), steel)
    for k in range(-60, 61):
        box('Sleeper', (k * 1.0, 0, 0.3), (0.35, 2.4, 0.16), wood)

    # ---- weather
    if cfg.get('snow'):
        flake = mat('Snow', '#ffffff', 0.6, '#ffffff', 0.6)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.06)
        proto = bpy.context.object
        proto.data.materials.append(flake)
        for _ in range(700):
            o = proto.copy()
            o.location = (random.uniform(-40, 30), random.uniform(-6, 40), random.uniform(0.2, 16))
            s = random.uniform(0.6, 1.8)
            o.scale = (s, s, s)
            sc.collection.objects.link(o)
        bpy.data.objects.remove(proto, do_unlink=True)
    if cfg.get('rain'):
        drop = mat('Rain', '#c8d4e8', 0.2, '#c8d4e8', 0.25)
        drop.blend_method = 'BLEND'
        bpy.ops.mesh.primitive_cylinder_add(vertices=4, radius=0.008, depth=0.9)
        proto = bpy.context.object
        proto.data.materials.append(drop)
        proto.rotation_euler = (0.18, 0.0, 0)
        for _ in range(900):
            o = proto.copy()
            o.location = (random.uniform(-26, 26), random.uniform(-16, 22), random.uniform(0.3, 12))
            sc.collection.objects.link(o)
        bpy.data.objects.remove(proto, do_unlink=True)

    # ---- sky gradient world + atmosphere
    top, hor = cfg['sky']
    w = bpy.data.worlds.new('Sky')
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    bg = nt.nodes.new('ShaderNodeBackground')
    out = nt.nodes.new('ShaderNodeOutputWorld')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    nt.links.new(sep.outputs['Z'], ramp.inputs['Fac'])
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = lin(hor)
    ramp.color_ramp.elements[1].position = 0.55
    ramp.color_ramp.elements[1].color = lin(top)
    nt.links.new(ramp.outputs['Color'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = cfg['light'][4]
    nt.links.new(bg.outputs[0], out.inputs['Surface'])

    # stars on clear nights
    if night and not cfg.get('snow'):
        star = mat('Star', '#ffffff', 1, '#fff6e0', 8.0)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.35)
        proto = bpy.context.object
        proto.data.materials.append(star)
        for _ in range(260):
            th = random.uniform(-0.2, 1.4) * math.pi / 2 + math.pi / 2 * 0.6
            o = proto.copy()
            az = random.uniform(math.radians(40), math.radians(140))
            el = random.uniform(math.radians(8), math.radians(55))
            r = 380
            o.location = (r * math.cos(az) * math.cos(el), r * math.sin(az) * math.cos(el), r * math.sin(el))
            s = random.uniform(0.4, 1.3)
            o.scale = (s, s, s)
            sc.collection.objects.link(o)
        bpy.data.objects.remove(proto, do_unlink=True)

    el, az, strength, scol = cfg['light'][0], cfg['light'][1], cfg['light'][2], cfg['light'][3]
    bpy.ops.object.light_add(type='SUN')
    sun = bpy.context.object
    sun.data.energy = strength
    sun.data.color = lin(scol)[:3]
    sun.data.angle = math.radians(2.0 if not night else 0.8)
    sun.rotation_euler = (math.radians(90 - el), 0, math.radians(az))
    if night:
        # warm lamp glow by the train, so the foreground reads
        bpy.ops.object.light_add(type='POINT', location=(8.5, -3.5, 3.2))
        p = bpy.context.object
        p.data.energy = 900
        p.data.color = lin('#ffbe6e')[:3]
        p.data.shadow_soft_size = 1.5

    # ---- camera
    (cp, ct, lens) = cfg['cam']
    bpy.ops.object.camera_add(location=cp)
    cam = bpy.context.object
    d = Vector(ct) - Vector(cp)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = lens
    cam.data.dof.use_dof = True
    cam.data.dof.focus_distance = (Vector((0, 0, 2)) - Vector(cp)).length
    cam.data.dof.aperture_fstop = 8.0
    sc.camera = cam

    # ---- render
    r = sc.render
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = int(os.environ.get('POSTCARD_SAMPLES', '40'))
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 4
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Medium High Contrast'
    sc.view_settings.exposure = 0.3 if night else 0.0
    r.resolution_x, r.resolution_y = 1200, 675
    r.resolution_percentage = int(os.environ.get('POSTCARD_SCALE', '100'))
    r.image_settings.file_format = 'WEBP'
    r.image_settings.quality = 78
    r.film_transparent = False
    os.makedirs(OUT, exist_ok=True)
    r.filepath = os.path.abspath(os.path.join(OUT, f's{i:02d}.webp'))
    bpy.ops.render.render(write_still=True)
    print('POSTCARD', i, r.filepath)


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a.lstrip('-').isdigit()]
    if os.environ.get('POSTCARD_CHILD'):
        render_station(int(args[0]))
    else:
        todo = [int(a) for a in args] or list(range(len(S)))
        for i in todo:
            subprocess.run([sys.executable, os.path.abspath(__file__), str(i)], env={**os.environ, 'POSTCARD_CHILD': '1'}, check=True)
