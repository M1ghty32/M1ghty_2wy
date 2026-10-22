import bpy, bmesh, math, os, json
from mathutils import Vector

ROOT = r"C:\Users\Alienware\DeskBox\文档\geren"
OUT = os.path.join(ROOT, "city-twin", "godot", "assets")
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'

def mat(name, color, rough=0.7):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    return m

skin = mat("skin", (0.86, 0.64, 0.47), 0.55)
shirt = mat("shirt", (0.16, 0.34, 0.58), 0.75)
pants = mat("pants", (0.15, 0.18, 0.23), 0.8)
shoe = mat("shoe", (0.09, 0.10, 0.12), 0.6)
sole = mat("sole", (0.85, 0.86, 0.88), 0.7)
hair = mat("hair", (0.06, 0.05, 0.04), 0.95)
eye = mat("eye", (0.05, 0.05, 0.06), 0.4)

parts = []

def add_prim(kind, group, material, loc=(0, 0, 0), scale=(1, 1, 1), **kw):
    bm = bmesh.new()
    if kind == 'sphere':
        bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=kw.get('r', 0.1))
    elif kind == 'cyl':
        bmesh.ops.create_cone(bm, cap_ends=True, segments=12,
                              radius1=kw.get('r1', 0.05), radius2=kw.get('r2', 0.05),
                              depth=kw.get('h', 0.3))
    else:
        bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= scale[0]
        v.co.y *= scale[1]
        v.co.z *= scale[2]
        v.co.x += loc[0]
        v.co.y += loc[1]
        v.co.z += loc[2]
    bm.verts.index_update()
    verts = [tuple(v.co) for v in bm.verts]
    faces = [tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    parts.append((verts, faces, group, material))

# ---------- armature ----------
arm_data = bpy.data.armatures.new("rig")
rig = bpy.data.objects.new("RIG", arm_data)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')

def bone(name, head, tail, parent=None):
    b = arm_data.edit_bones.new(name)
    b.head = Vector(head)
    b.tail = Vector(tail)
    if parent:
        b.parent = arm_data.edit_bones[parent]

bone("hips", (0, 0, 0.98), (0, 0, 1.08))
bone("spine", (0, 0, 1.08), (0, 0, 1.42), "hips")
bone("head", (0, 0, 1.42), (0, 0, 1.80), "spine")
for side, sgn in (("L", 1), ("R", -1)):
    x = 0.24 * sgn
    bone("upperarm." + side, (x, 0, 1.46), (x, 0, 1.16), "spine")
    bone("lowerarm." + side, (x, 0, 1.16), (x, 0, 0.90), "upperarm." + side)
    bone("thigh." + side, (x * 0.48, 0, 0.96), (x * 0.48, 0, 0.52), "hips")
    bone("shin." + side, (x * 0.48, 0, 0.52), (x * 0.48, 0, 0.08), "thigh." + side)
bpy.ops.object.mode_set(mode='OBJECT')

# ---------- body ----------
add_prim('sphere', "head", skin, (0, 0, 1.63), (1, 0.94, 1.1), r=0.115)
add_prim('sphere', "head", hair, (0, 0.01, 1.68), (1.05, 0.98, 0.85), r=0.118)
add_prim('sphere', "head", hair, (0, 0.055, 1.70), (1.0, 0.55, 0.45), r=0.11)
add_prim('cyl', "head", skin, (0, 0, 1.49), (1, 1, 1), r1=0.052, r2=0.058, h=0.08)
for sx in (-0.045, 0.045):
    add_prim('sphere', "head", eye, (sx, -0.095, 1.64), (1, 0.5, 0.7), r=0.018)

add_prim('cube', "spine", shirt, (0, 0, 1.30), (0.40, 0.23, 0.36))
add_prim('cube', "spine", shirt, (0, 0, 1.10), (0.33, 0.21, 0.12))
add_prim('cube', "spine", skin, (0, -0.005, 1.455), (0.20, 0.20, 0.06))
for sgn in (-1, 1):
    add_prim('sphere', "spine", shirt, (sgn * 0.21, 0, 1.44), (1, 0.9, 0.8), r=0.085)
add_prim('cube', "hips", pants, (0, 0, 0.99), (0.34, 0.22, 0.14))

for side, sgn in (("L", 1), ("R", -1)):
    x = 0.24 * sgn
    add_prim('cyl', "upperarm." + side, shirt, (x, 0, 1.31), (1, 1, 1), r1=0.062, r2=0.052, h=0.28)
    add_prim('cyl', "lowerarm." + side, skin, (x, 0, 1.03), (1, 1, 1), r1=0.048, r2=0.042, h=0.24)
    add_prim('sphere', "lowerarm." + side, skin, (x, 0, 0.90), (0.9, 0.8, 1.1), r=0.05)
    lx = x * 0.48
    add_prim('cyl', "thigh." + side, pants, (lx, 0, 0.74), (1, 1, 1), r1=0.085, r2=0.072, h=0.42)
    add_prim('cyl', "shin." + side, pants, (lx, 0, 0.30), (1, 1, 1), r1=0.062, r2=0.05, h=0.40)
    add_prim('cube', "shin." + side, shoe, (lx, -0.04, 0.075), (0.15, 0.27, 0.09))
    add_prim('cube', "shin." + side, sole, (lx, -0.04, 0.02), (0.155, 0.28, 0.035))

# ---------- mesh ----------
mesh = bpy.data.meshes.new("player_mesh")
all_verts = []
all_faces = []
ranges = []
offset = 0
for verts, faces, group, material in parts:
    all_verts.extend(verts)
    all_faces.extend([tuple(i + offset for i in f) for f in faces])
    ranges.append((group, offset, offset + len(verts), material, len(faces)))
    offset += len(verts)
mesh.from_pydata(all_verts, [], all_faces)
mesh.update()
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

sw = math.radians(30)
act = make_action("walk")
for f, s in ((1, 1), (11, -1), (21, 1)):
    key("thigh.L", f, (sw * s, 0, 0))
    key("thigh.R", f, (-sw * s, 0, 0))
    key("shin.L", f, (math.radians(18) * (0.5 - 0.5 * s), 0, 0))
    key("shin.R", f, (math.radians(18) * (0.5 + 0.5 * s), 0, 0))
    key("upperarm.L", f, (-sw * s * 0.75, 0, 0))
    key("upperarm.R", f, (sw * s * 0.75, 0, 0))
    key("lowerarm.L", f, (math.radians(14), 0, 0))
    key("lowerarm.R", f, (math.radians(14), 0, 0))
    key("spine", f, (0, 0, math.radians(2) * s))
    key("head", f, (0, 0, math.radians(-1.5) * s))

act = make_action("run")
sw = math.radians(48)
for f, s in ((1, 1), (9, -1), (17, 1)):
    key("thigh.L", f, (sw * s, 0, 0))
    key("thigh.R", f, (-sw * s, 0, 0))
    key("shin.L", f, (math.radians(35) * (0.5 - 0.5 * s), 0, 0))
    key("shin.R", f, (math.radians(35) * (0.5 + 0.5 * s), 0, 0))
    key("upperarm.L", f, (-sw * s * 0.85, 0, 0))
    key("upperarm.R", f, (sw * s * 0.85, 0, 0))
    key("lowerarm.L", f, (math.radians(45), 0, 0))
    key("lowerarm.R", f, (math.radians(45), 0, 0))
    key("spine", f, (math.radians(8), 0, math.radians(3) * s))

act = make_action("idle")
for f, s in ((1, 0), (30, 1), (60, 0)):
    key("spine", f, (math.radians(1.5) * s, 0, math.radians(1) * s))
    key("head", f, (0, 0, math.radians(2) * s))
    key("upperarm.L", f, (math.radians(3) * s, 0, math.radians(3)))
    key("upperarm.R", f, (math.radians(3) * s, 0, math.radians(-3)))

bpy.ops.object.mode_set(mode='OBJECT')
rig.animation_data.action = bpy.data.actions.get("idle")

glb = os.path.join(OUT, "player.glb")
for o in bpy.context.selected_objects:
    o.select_set(False)
obj.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True,
                          export_animations=True, export_animation_mode='ACTIONS')
print("BLENDER_OK", json.dumps({"glb": glb}))
