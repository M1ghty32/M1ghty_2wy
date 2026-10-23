import bpy, bmesh, math, os, json
from mathutils import Vector

ROOT = r"C:\Users\Alienware\DeskBox\文档\geren"
OUT = os.path.join(ROOT, "city-twin", "godot", "assets")
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def mat(name, color, rough=0.6, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m

skin = mat("skin", (0.87, 0.66, 0.50), 0.5)
shirt = mat("shirt", (0.20, 0.40, 0.62), 0.7)
collar = mat("collar", (0.92, 0.93, 0.95), 0.65)
pants = mat("pants", (0.17, 0.20, 0.26), 0.75)
shoe = mat("shoe", (0.14, 0.16, 0.19), 0.55)
sole = mat("sole", (0.90, 0.91, 0.93), 0.6)
hair = mat("hair", (0.10, 0.07, 0.05), 0.85)
eyewhite = mat("eyewhite", (0.95, 0.95, 0.94), 0.35)
pupil = mat("pupil", (0.05, 0.05, 0.06), 0.25)
mouth = mat("mouth", (0.55, 0.30, 0.28), 0.6)
bag = mat("bag", (0.22, 0.28, 0.34), 0.75)

parts = []

def add(kind, group, material, loc=(0, 0, 0), scale=(1, 1, 1), bevel=0.0, **kw):
    bm = bmesh.new()
    if kind == 'sphere':
        bmesh.ops.create_uvsphere(bm, u_segments=kw.get('u', 20), v_segments=kw.get('v', 12), radius=kw.get('r', 0.1))
    elif kind == 'cyl':
        bmesh.ops.create_cone(bm, cap_ends=True, segments=kw.get('seg', 14),
                              radius1=kw.get('r1', 0.05), radius2=kw.get('r2', 0.05), depth=kw.get('h', 0.3))
    else:
        bmesh.ops.create_cube(bm, size=1.0)
        if bevel > 0:
            bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=2, affect='EDGES')
    for v in bm.verts:
        v.co.x *= scale[0]; v.co.y *= scale[1]; v.co.z *= scale[2]
        v.co.x += loc[0]; v.co.y += loc[1]; v.co.z += loc[2]
    bm.verts.index_update()
    verts = [tuple(v.co) for v in bm.verts]
    faces = [tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    parts.append((verts, faces, group, material))

def capsule(group, material, x, z_top, z_bot, r_top, r_bot):
    h = z_top - z_bot
    add('cyl', group, material, (x, 0, (z_top + z_bot) / 2), (1, 1, 1), r1=r_bot, r2=r_top, h=max(0.01, h - r_top - r_bot))
    add('sphere', group, material, (x, 0, z_top), (1, 1, 0.8), r=r_top)
    add('sphere', group, material, (x, 0, z_bot), (1, 1, 0.8), r=r_bot)

# ---------- armature ----------
arm_data = bpy.data.armatures.new("rig")
rig = bpy.data.objects.new("RIG", arm_data)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')

def bone(name, head, tail, parent=None):
    b = arm_data.edit_bones.new(name)
    b.head = Vector(head); b.tail = Vector(tail)
    if parent: b.parent = arm_data.edit_bones[parent]

bone("hips", (0, 0, 0.96), (0, 0, 1.06))
bone("spine", (0, 0, 1.06), (0, 0, 1.40), "hips")
bone("head", (0, 0, 1.40), (0, 0, 1.80), "spine")
for side, sgn in (("L", 1), ("R", -1)):
    x = 0.235 * sgn
    bone("upperarm." + side, (x, 0, 1.44), (x, 0, 1.16), "spine")
    bone("lowerarm." + side, (x, 0, 1.16), (x, 0, 0.92), "upperarm." + side)
    bone("thigh." + side, (x * 0.48, 0, 0.94), (x * 0.48, 0, 0.50), "hips")
    bone("shin." + side, (x * 0.48, 0, 0.50), (x * 0.48, 0, 0.10), "thigh." + side)
bpy.ops.object.mode_set(mode='OBJECT')

# ---------- body ----------
# head + face
add('sphere', "head", skin, (0, -0.005, 1.625), (1.0, 0.94, 1.12), r=0.112)
add('sphere', "head", skin, (0, -0.02, 1.545), (0.92, 0.9, 0.7), r=0.09)   # jaw
add('sphere', "head", skin, (0, -0.105, 1.60), (0.45, 0.55, 0.5), r=0.03)   # nose
for sgn in (-1, 1):
    add('sphere', "head", skin, (sgn * 0.105, -0.01, 1.63), (0.35, 0.6, 0.8), r=0.03)  # ears
    add('sphere', "head", eyewhite, (sgn * 0.042, -0.098, 1.646), (1, 0.5, 1), r=0.020)
    add('sphere', "head", pupil, (sgn * 0.042, -0.112, 1.646), (1, 0.5, 1), r=0.010)
    add('cube', "head", hair, (sgn * 0.042, -0.108, 1.672), (0.036, 0.008, 0.007), bevel=0.002)  # brow
add('cube', "head", mouth, (0, -0.104, 1.565), (0.035, 0.006, 0.006), bevel=0.002)
add('cyl', "head", skin, (0, 0, 1.475), (1, 1, 1), r1=0.048, r2=0.055, h=0.09)  # neck

# hair cap + fringe
add('sphere', "head", hair, (0, 0.012, 1.665), (1.04, 1.0, 0.92), r=0.118)
add('cube', "head", hair, (0, -0.085, 1.70), (0.19, 0.05, 0.05), bevel=0.02)
add('cube', "head", hair, (0, 0.06, 1.60), (0.16, 0.05, 0.10), bevel=0.02)

# torso
add('sphere', "spine", shirt, (0, 0, 1.30), (1.0, 0.62, 1.05), r=0.185)
add('sphere', "spine", shirt, (0, 0, 1.13), (0.92, 0.62, 0.62), r=0.165)
add('cube', "spine", shirt, (0, 0, 1.045), (0.30, 0.19, 0.05), bevel=0.02)
add('cube', "spine", collar, (0, -0.055, 1.445), (0.13, 0.06, 0.035), bevel=0.01)
for sgn in (-1, 1):
    add('sphere', "spine", shirt, (sgn * 0.205, 0, 1.425), (1, 0.85, 0.85), r=0.082)
add('sphere', "hips", pants, (0, 0, 0.97), (1.0, 0.72, 0.65), r=0.175)

# backpack
add('cube', "spine", bag, (0, 0.175, 1.24), (0.26, 0.13, 0.32), bevel=0.03)
add('cube', "spine", bag, (0, 0.25, 1.24), (0.18, 0.04, 0.16), bevel=0.02)

# arms
for side, sgn in (("L", 1), ("R", -1)):
    x = 0.235 * sgn
    add('sphere', "upperarm." + side, shirt, (x, 0, 1.44), (1, 1, 1), r=0.068)
    capsule("upperarm." + side, shirt, x, 1.44, 1.16, 0.066, 0.054)
    capsule("lowerarm." + side, skin, x, 1.16, 0.93, 0.050, 0.042)
    add('cube', "lowerarm." + side, skin, (x, -0.005, 0.895), (0.075, 0.055, 0.085), bevel=0.025)  # hand
    add('cube', "lowerarm." + side, skin, (x - sgn * 0.045, -0.02, 0.90), (0.03, 0.035, 0.05), bevel=0.012)  # thumb

# legs
for side, sgn in (("L", 1), ("R", -1)):
    x = 0.235 * 0.48 * sgn
    capsule("thigh." + side, pants, x, 0.94, 0.50, 0.085, 0.068)
    capsule("shin." + side, pants, x, 0.50, 0.10, 0.064, 0.050)
    add('cube', "shin." + side, shoe, (x, -0.045, 0.075), (0.145, 0.265, 0.085), bevel=0.03)
    add('cube', "shin." + side, sole, (x, -0.045, 0.028), (0.15, 0.275, 0.035), bevel=0.012)

# ---------- build mesh ----------
mesh = bpy.data.meshes.new("player_mesh")
all_verts, all_faces, ranges = [], [], []
offset = 0
for verts, faces, group, material in parts:
    all_verts.extend(verts)
    all_faces.extend([tuple(i + offset for i in f) for f in faces])
    ranges.append((group, offset, offset + len(verts), material, len(faces)))
    offset += len(verts)
mesh.from_pydata(all_verts, [], all_faces)
mesh.update()
for p in mesh.polygons:
    p.use_smooth = True

obj = bpy.data.objects.new("PLAYER", mesh)
scene.collection.objects.link(obj)
obj.data.materials.clear()
for _, _, _, material, _ in ranges:
    if material.name not in [m.name for m in obj.data.materials]:
        obj.data.materials.append(material)
idx = 0
for _, _, _, material, nf in ranges:
    mi = [m.name for m in obj.data.materials].index(material.name)
    for _ in range(nf):
        obj.data.polygons[idx].material_index = mi
        idx += 1
for group, start, end, _, _ in ranges:
    if group not in obj.vertex_groups:
        obj.vertex_groups.new(name=group)
    obj.vertex_groups[group].add(list(range(start, end)), 1.0, 'REPLACE')
sub = obj.modifiers.new("Subsurf", 'SUBSURF')
sub.levels = 1
sub.render_levels = 1
mod = obj.modifiers.new("Armature", 'ARMATURE')
mod.object = rig
obj.parent = rig

# ---------- animations ----------
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')
for pb in rig.pose.bones:
    pb.rotation_mode = 'XYZ'

def make_action(name):
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    if rig.animation_data is None:
        rig.animation_data_create()
    rig.animation_data.action = act
    return act

def key(bone_name, frame, rot):
    pb = rig.pose.bones[bone_name]
    pb.rotation_euler = rot
    pb.keyframe_insert("rotation_euler", frame=frame)

# idle
make_action("idle")
for f, s in ((1, 0), (40, 1), (80, 0)):
    key("spine", f, (math.radians(1.2) * s, 0, 0))
    key("head", f, (0, 0, math.radians(1.5) * s))
    key("upperarm.L", f, (math.radians(2) * s, 0, math.radians(4)))
    key("upperarm.R", f, (math.radians(2) * s, 0, math.radians(-4)))

# walk
make_action("walk")
sw = math.radians(27)
for f, s in ((1, 1), (8, 0), (15, -1), (22, 0), (29, 1)):
    key("thigh.L", f, (sw * s, 0, 0))
    key("thigh.R", f, (-sw * s, 0, 0))
    key("shin.L", f, (math.radians(20) * (0.5 - 0.5 * s), 0, 0))
    key("shin.R", f, (math.radians(20) * (0.5 + 0.5 * s), 0, 0))
    key("upperarm.L", f, (-sw * s * 0.7, 0, math.radians(4)))
    key("upperarm.R", f, (sw * s * 0.7, 0, math.radians(-4)))
    key("lowerarm.L", f, (math.radians(12), 0, 0))
    key("lowerarm.R", f, (math.radians(12), 0, 0))
    key("spine", f, (0, 0, math.radians(2.5) * s))
    key("head", f, (0, 0, math.radians(-1.5) * s))

# run
make_action("run")
sw = math.radians(46)
for f, s in ((1, 1), (6, 0), (11, -1), (16, 0), (21, 1)):
    key("thigh.L", f, (sw * s, 0, 0))
    key("thigh.R", f, (-sw * s, 0, 0))
    key("shin.L", f, (math.radians(38) * (0.5 - 0.5 * s), 0, 0))
    key("shin.R", f, (math.radians(38) * (0.5 + 0.5 * s), 0, 0))
    key("upperarm.L", f, (-sw * s * 0.85, 0, math.radians(6)))
    key("upperarm.R", f, (sw * s * 0.85, 0, math.radians(-6)))
    key("lowerarm.L", f, (math.radians(55), 0, 0))
    key("lowerarm.R", f, (math.radians(55), 0, 0))
    key("spine", f, (math.radians(9), 0, math.radians(3) * s))

bpy.ops.object.mode_set(mode='OBJECT')
rig.animation_data.action = bpy.data.actions.get("idle")

glb = os.path.join(OUT, "player.glb")
for o in bpy.context.selected_objects:
    o.select_set(False)
obj.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True,
                          export_animations=True, export_animation_mode='ACTIONS', export_apply=True)
print("BLENDER_OK", json.dumps({"glb": glb}))
