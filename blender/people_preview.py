# Preview renderer for people.py (exec'd by it with --preview out.png): assembles a few figures and renders with Cycles.
P = {o.name: o for o in parts}


def place(name, pos, rot=(0, 0, 0), tint=None, ox=0.0):
    src = P[name]
    o = bpy.data.objects.new(name + '_i', src.data.copy())
    scene.collection.objects.link(o)
    if tint:
        for i, m in enumerate(o.data.materials):
            if m.name in tint:
                mm = m.copy(); mm.node_tree.nodes['Mix'].inputs['A'].default_value = (*hexcol(tint[m.name]), 1)
                mm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*hexcol(tint[m.name]), 1)
                o.data.materials[i] = mm
    o.matrix_world = TO_B @ Matrix.Translation(Vector(pos) + Vector((ox, 0, 0))) @ Euler(rot, 'XYZ').to_matrix().to_4x4() @ TO_B.inverted()
    return o


def person(ox, fem, hair, torso_, t, armz=0.08, extra=()):
    hip = 0.92
    for n in [f'head_{"f" if fem else "m"}', f'face_{"f" if fem else "m"}', hair, *extra]:
        place(n, (0, hip + 0.635, 0), tint=t, ox=ox)
    place('neck_f' if fem else 'neck_m', (0, hip + 0.6, 0), tint=t, ox=ox)
    place(torso_, (0, hip, 0), tint=t, ox=ox)
    if 'shirt' in torso_ and not fem:
        place('collar', (0, hip, 0), tint=t, ox=ox)
    sw = 0.165 / 0.185 if fem else 1.0
    for s in (-1, 1):
        place('arm_upper', (s * 0.185 * sw, hip + 0.505, 0), (0, 0, s * armz), tint=t, ox=ox)
        ex, ey = s * 0.185 * sw + math.sin(s * armz) * 0.28, hip + 0.505 - math.cos(armz) * 0.28
        place('arm_fore', (ex, ey, 0), (-0.2, 0, s * armz), tint=t, ox=ox)
        place('hand_' + ('R' if s > 0 else 'L'), (ex, ey, 0), (-0.2, 0, s * armz), tint=t, ox=ox)
        place('leg_standing', (s * 0.1, 0, 0), tint=t, ox=ox)


person(-0.55, False, 'hair_part', 'torso_shirt_m', {'Skin': '#8c5b3c', 'Hair': '#15110f', 'Top': '#d9d2bf', 'Bottom': '#3a3a44', 'Collar': '#bfb8a4'}, extra=('glasses',))
person(0.0, True, 'hair_long', 'torso_sweater_f', {'Skin': '#e0ac86', 'Hair': '#5a3a1e', 'Top': '#c23d7a', 'Bottom': '#2d3e5e'})
person(0.55, False, 'hair_curly', 'torso_sweater_m', {'Skin': '#5e3a28', 'Hair': '#14100d', 'Top': '#1f8a8a', 'Bottom': '#2d3e5e'})
person(1.1, False, 'hair_fringe', 'torso_shirt_m', {'Skin': '#8c5b3c', 'Hair': '#3a3434', 'Top': '#e8e4da', 'Bottom': '#3a3a44', 'Collar': '#e8e4da'}, extra=('moustache',))
person(1.65, True, 'hair_bob', 'torso_top_f', {'Skin': '#f1c9a5', 'Hair': '#c9a25a', 'Top': '#d9a431', 'Bottom': '#2d3e5e'})
for o in parts:
    o.hide_render = True

world = bpy.data.worlds.new('w'); scene.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.35, 0.37, 0.42, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
for loc, e, size in [((-3, -4, 4), 400, 2.5), ((4, -2, 2.5), 120, 2), ((0, 4, 3), 200, 2)]:
    L = bpy.data.lights.new('l', 'AREA'); L.energy = e; L.size = size
    lo = bpy.data.objects.new('l', L); lo.location = loc; scene.collection.objects.link(lo)
    lo.rotation_euler = (Vector((0.55, 0, 1.2)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = 24
scene.cycles.use_denoising = False
scene.view_settings.view_transform = 'AgX'


def shoot(out, tgt, dist, lens, w, h):
    cam = bpy.data.cameras.new('c'); cam.lens = lens
    co = bpy.data.objects.new('c', cam); scene.collection.objects.link(co); scene.camera = co
    co.location = Vector(tgt) + Vector((0.15 * dist, -dist, 0.05 * dist))
    co.rotation_euler = (Vector(tgt) - co.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.resolution_x = w; scene.render.resolution_y = h
    scene.render.filepath = out
    bpy.ops.render.render(write_still=True)


shoot(PREVIEW, (0.55, 0, 1.0), 4.2, 40, 900, 600)
shoot(PREVIEW.replace('.png', '_faces.png'), (0.27, 0, 1.63), 1.1, 60, 900, 450)
shoot(PREVIEW.replace('.png', '_chest.png'), (1.1, 0, 1.45), 1.3, 50, 700, 600)
