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

skin = mat("skin", (0.85, 0.62, 0.45), 0.6)
shirt = mat("shirt", (0.15, 0.32, 0.55), 0.75)
pants = mat("pants", (0.16, 0.19, 0.24), 0.8)
shoe = mat("shoe", (0.08, 0.09, 0.10), 0.6)
hair = mat("hair", (0.07, 0.06, 0.05), 0.9)

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
    return b

bone("hips", (0, 0, 0.95), (0, 0, 1.08))
bone("spine", (0, 0, 1.08), (0, 0, 1.38), "hips")
bone("head", (0, 0, 1.38), (0, 0, 1.78), "spine")
for side in ("L", "R"):
    x = 0.28 if side == "L" else -0.28
    bone("upperarm." + side, (x, 0, 1.42), (x, 0, 1.12), "spine")
    bone("lowerarm." + side, (x, 0, 1.12), (x, 0, 0.86), "upperarm." + side)
    bone("thigh." + side, (x * 0.45, 0, 0.92), (x * 0.45, 0, 0.5), "hips")
    bone("shin." + side, (x * 0.45, 0, 0.5), (x * 0.45, 0, 0.06), "thigh." + side)
bpy.ops.object.mode_set(mode='OBJECT')

# ---------- mesh parts with vertex groups ----------
parts = []  # (verts, faces, group, material)
def box(cx, cy, cz, sx, sy, sz, group, material):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x = v.co.x * sx + cx
        v.co.y = v.co.y * sy + cy
        v.co.z = v.co.z * sz + cz
    verts = [tuple(v.co) for v in bm.verts]
    bm.verts.index_update()
    faces = [tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    parts.append((verts, faces, group, material))

box(0, 0, 1.22, 0.44, 0.26, 0.46, "spine", shirt)
box(0, 0, 1.62, 0.30, 0.28, 0.30, "head", skin)
box(0, 0.02, 1.74, 0.32, 0.30, 0.12, "head", hair)
for side, sign in (("L", 1), ("R", -1)):
    x = 0.28 * sign
    box(x, 0, 1.27, 0.14, 0.16, 0.30, "upperarm." + side, shirt)
    box(x, 0, 0.99, 0.12, 0.14, 0.26, "lowerarm." + side, skin)
    box(x * 0.45, 0, 0.71, 0.17, 0.19, 0.42, "thigh." + side, pants)
    box(x * 0.45, 0, 0.28, 0.15, 0.17, 0.40, "shin." + side, pants)
    box(x * 0.45, -0.05, 0.05, 0.17, 0.28, 0.10, "shin." + side, shoe)

mesh = bpy.data.meshes.new("player_mesh")
all_verts = []
all_faces = []
ranges = []
offset = 0
for verts, faces, group, material in parts:
    all_verts.extend(verts)
    all_faces.extend([tuple(i + offset for i in f) for f in faces])
    ranges.append((group, offset, offset + len(verts), material))
    offset += len(verts)
mesh.from_pydata(all_verts, [], all_faces)
mesh.update()
obj = bpy.data.objects.new("PLAYER", mesh)
scene.collection.objects.link(obj)

for group, start, end, material in ranges:
    if group not in obj.vertex_groups:
        obj.vertex_groups.new(name=group)
    obj.vertex_groups[group].add(list(range(start, end)), 1.0, 'REPLACE')

# assign materials per face by part
for idx, (group, start, end, material) in enumerate(ranges):
    # find material slot
    if material.name not in [m.name for m in obj.data.materials]:
        obj.data.materials.append(material)
    mi = [m.name for m in obj.data.materials].index(material.name)
    # faces created in order per part
    pass

# simpler: assign by vertex position (top -> hair/skin etc.) - use material slots per part ranges
obj.data.materials.clear()
for _, _, _, material in ranges:
    if material.name not in [m.name for m in obj.data.materials]:
        obj.data.materials.append(material)
# rebuild face material indices using offsets: faces are in part order
face_offset = 0
for group, start, end, material in ranges:
    n_faces = 0
    for v, faces, g, m in parts:
        pass
# direct: parts faces count in same order
idx = 0
for verts, faces, group, material in parts:
    mi = [m.name for m in obj.data.materials].index(material.name)
    for f in range(len(faces)):
        obj.data.polygons[idx].material_index = mi
        idx += 1

# armature modifier
mod = obj.modifiers.new("Armature", 'ARMATURE')
mod.object = rig
obj.parent = rig

# ---------- animations ----------
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')
for pb in rig.pose.bones:
    pb.rotation_mode = 'XYZ'

action = bpy.data.actions.new("walk")
rig.animation_data_create()
rig.animation_data.action = action

def key(bone_name, frame, rot):
    pb = rig.pose.bones[bone_name]
    pb.rotation_euler = rot
    pb.keyframe_insert("rotation_euler", frame=frame)

swing = math.radians(28)
for f, s in ((1, 1), (11, -1), (21, 1)):
    key("thigh.L", f, (swing * s, 0, 0))
    key("thigh.R", f, (-swing * s, 0, 0))
    key("upperarm.L", f, (-swing * s * 0.8, 0, 0))
    key("upperarm.R", f, (swing * s * 0.8, 0, 0))
    key("lowerarm.L", f, (math.radians(10), 0, 0))
    key("lowerarm.R", f, (math.radians(10), 0, 0))
    key("shin.L", f, (math.radians(12) * (1 - s) * 0.5, 0, 0))
    key("shin.R", f, (math.radians(12) * (1 + s) * 0.5, 0, 0))
    key("hips", f, (0, 0, math.radians(2) * s))

action.use_fake_user = True

bpy.ops.object.mode_set(mode='OBJECT')

glb = os.path.join(OUT, "player.glb")
for o in bpy.context.selected_objects:
    o.select_set(False)
obj.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_animations=True)
print("BLENDER_OK", json.dumps({"glb": glb}))
