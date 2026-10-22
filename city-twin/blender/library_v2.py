import bpy, bmesh, json, math, os
from mathutils import Vector

ROOT = r"C:\Users\Alienware\DeskBox\文档\geren"
JSON_PATH = os.path.join(ROOT, "city-twin", "data", "campus-v2.json")
OUT_DIR = os.path.join(ROOT, ".tmp")
os.makedirs(OUT_DIR, exist_ok=True)

with open(JSON_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

lib = next((b for b in data["buildings"] if "图书馆" in b.get("n", "")), None)
if lib is None:
    raise RuntimeError("library not found")

raw = lib["r"][0]
cx0 = sum(p[0] for p in raw) / len(raw)
cz0 = sum(p[1] for p in raw) / len(raw)
ring = [(p[0] - cx0, -(p[1] - cz0)) for p in raw]

H = 32.0
GROUND = 4.6
FLOORS = 7

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0

def principled(name, color, rough=0.65, metal=0.0, transmission=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    return m

def brick_material():
    m = bpy.data.materials.new("brick")
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    brick = nt.nodes.new("ShaderNodeTexBrick")
    brick.inputs["Scale"].default_value = 9.0
    brick.inputs["Mortar Size"].default_value = 0.01
    brick.inputs["Color1"].default_value = (0.34, 0.13, 0.09, 1)
    brick.inputs["Color2"].default_value = (0.45, 0.19, 0.12, 1)
    brick.inputs["Mortar"].default_value = (0.52, 0.34, 0.26, 1)
    brick.inputs["Brick Width"].default_value = 0.35
    brick.inputs["Row Height"].default_value = 0.12
    nt.links.new(coord.outputs["Object"], brick.inputs["Vector"])
    nt.links.new(brick.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.85
    return m

concrete = principled("concrete", (0.80, 0.79, 0.76), 0.62)
slat = principled("slat", (0.88, 0.88, 0.86), 0.35, 0.45)
glass = principled("glass", (0.10, 0.16, 0.19), 0.06, 0.35, 0.15)
brick = brick_material()
red_col = principled("red_col", (0.46, 0.10, 0.07), 0.55)
metal = principled("metal", (0.32, 0.34, 0.36), 0.4, 0.6)

def ring_at(s):
    return [(x * s, y * s) for x, y in ring]

n = len(ring)

def outward_normal(a, b):
    d = Vector((b[0] - a[0], b[1] - a[1]))
    if d.length < 1e-6:
        return Vector((0.0, 0.0))
    d.normalize()
    return Vector((-d.y, d.x))

levels = [(0.0, 0.90), (GROUND, 0.985), (H - 6.0, 1.0), (H, 1.045)]

def scale_at(z):
    for i in range(len(levels) - 1):
        z0, s0 = levels[i]
        z1, s1 = levels[i + 1]
        if z0 <= z <= z1:
            t = (z - z0) / max(1e-6, z1 - z0)
            return s0 + (s1 - s0) * t
    return levels[-1][1]

# body
bm = bmesh.new()
loops = []
for z, s in levels:
    loops.append([bm.verts.new((x, y, z)) for x, y in ring_at(s)])
for li in range(len(loops) - 1):
    A, B = loops[li], loops[li + 1]
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((A[i], A[j], B[j], B[i]))
bm.faces.new(list(reversed(loops[0])))
bm.faces.new(loops[-1])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
body_me = bpy.data.meshes.new("body")
bm.to_mesh(body_me)
bm.free()
body = bpy.data.objects.new("LIB_body", body_me)
scene.collection.objects.link(body)
body.data.materials.append(concrete)

# glass bands
gb = bmesh.new()
for fl in range(FLOORS):
    z0 = GROUND + fl * ((H - GROUND - 2.2) / FLOORS) + 0.35
    z1 = z0 + 2.6
    s = scale_at((z0 + z1) * 0.5) + 0.02
    pts = ring_at(s)
    for i in range(n):
        j = (i + 1) % n
        mx = (pts[i][0] + pts[j][0]) * 0.5
        my = (pts[i][1] + pts[j][1]) * 0.5
        nv_dir = outward_normal(pts[i], pts[j])
        if nv_dir.y < -0.4 and abs(mx) < 10.8 and my < -10:
            continue
        nv = outward_normal(pts[i], pts[j]) * 0.06
        v0 = gb.verts.new((pts[i][0] + nv.x, pts[i][1] + nv.y, z0))
        v1 = gb.verts.new((pts[j][0] + nv.x, pts[j][1] + nv.y, z0))
        v2 = gb.verts.new((pts[j][0] + nv.x, pts[j][1] + nv.y, z1))
        v3 = gb.verts.new((pts[i][0] + nv.x, pts[i][1] + nv.y, z1))
        gb.faces.new((v0, v1, v2, v3))
gb.normal_update()
glass_me = bpy.data.meshes.new("glass")
gb.to_mesh(glass_me)
gb.free()
glass_obj = bpy.data.objects.new("LIB_glass", glass_me)
scene.collection.objects.link(glass_obj)
glass_obj.data.materials.append(glass)

# louver bands
lb = bmesh.new()
def louver_band(z, s, protrude=1.15, thick=0.28):
    inner = ring_at(s)
    outer = []
    for i in range(n):
        j = (i + 1) % n
        nv = outward_normal(inner[i], inner[j]) * protrude
        outer.append((inner[i][0] + nv.x, inner[i][1] + nv.y))
    for i in range(n):
        j = (i + 1) % n
        mx = (inner[i][0] + inner[j][0]) * 0.5
        my = (inner[i][1] + inner[j][1]) * 0.5
        nv_dir = outward_normal(inner[i], inner[j])
        if nv_dir.y < -0.4 and abs(mx) < 10.8 and my < -10:
            continue
        zi0 = (inner[i][0], inner[i][1])
        zi1 = (inner[j][0], inner[j][1])
        zo0 = outer[i]
        zo1 = outer[j]
        v = [
            lb.verts.new((zi0[0], zi0[1], z - thick / 2)), lb.verts.new((zi0[0], zi0[1], z + thick / 2)),
            lb.verts.new((zi1[0], zi1[1], z + thick / 2)), lb.verts.new((zi1[0], zi1[1], z - thick / 2)),
            lb.verts.new((zo0[0], zo0[1], z - thick / 2)), lb.verts.new((zo0[0], zo0[1], z + thick / 2)),
            lb.verts.new((zo1[0], zo1[1], z + thick / 2)), lb.verts.new((zo1[0], zo1[1], z - thick / 2))
        ]
        lb.faces.new((v[0], v[1], v[2], v[3]))
        lb.faces.new((v[4], v[7], v[6], v[5]))
        lb.faces.new((v[3], v[2], v[6], v[7]))
        lb.faces.new((v[0], v[4], v[5], v[1]))
for fl in range(FLOORS + 1):
    z = GROUND + fl * ((H - GROUND - 2.2) / FLOORS) - 0.2
    if z > H + 0.2:
        break
    louver_band(z, scale_at(z) + 0.05)
louver_band(H, scale_at(H) + 0.05, protrude=1.6, thick=0.5)
lb.normal_update()
lb_me = bpy.data.meshes.new("louvers")
lb.to_mesh(lb_me)
lb.free()
louver_obj = bpy.data.objects.new("LIB_louvers", lb_me)
scene.collection.objects.link(louver_obj)
louver_obj.data.materials.append(slat)

# roof overhang
rb = bmesh.new()
top = ring_at(1.075)
for i in range(n):
    j = (i + 1) % n
    a = top[i]
    b = top[j]
    vs = [rb.verts.new((a[0], a[1], H + 0.5)), rb.verts.new((b[0], b[1], H + 0.5)),
          rb.verts.new((b[0], b[1], H + 1.4)), rb.verts.new((a[0], a[1], H + 1.4))]
    rb.faces.new(vs)
rb.normal_update()
rb_me = bpy.data.meshes.new("roof")
rb.to_mesh(rb_me)
rb.free()
roof_obj = bpy.data.objects.new("LIB_roof", rb_me)
scene.collection.objects.link(roof_obj)
roof_obj.data.materials.append(concrete)

# brick panel
min_y = min(p[1] for p in ring)
panel_w, panel_d = 21.0, 1.4
front = min_y - 0.35
pz0, pz1 = 2.0, H - 1.0
pb = bmesh.new()
vs = [
    pb.verts.new((-panel_w / 2, front, pz0)), pb.verts.new((panel_w / 2, front, pz0)),
    pb.verts.new((panel_w / 2, front, pz1)), pb.verts.new((-panel_w / 2, front, pz1)),
    pb.verts.new((-panel_w / 2, front + panel_d, pz0)), pb.verts.new((panel_w / 2, front + panel_d, pz0)),
    pb.verts.new((panel_w / 2, front + panel_d, pz1)), pb.verts.new((-panel_w / 2, front + panel_d, pz1))
]
for f in [(0, 1, 2, 3), (5, 4, 7, 6), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]:
    pb.faces.new([vs[i] for i in f])
pb.normal_update()
pb_me = bpy.data.meshes.new("panel")
pb.to_mesh(pb_me)
pb.free()
panel_obj = bpy.data.objects.new("LIB_panel", pb_me)
scene.collection.objects.link(panel_obj)
panel_obj.data.materials.append(brick)

# lettering
font_path = r"C:\Windows\Fonts\simhei.ttf"
if os.path.exists(font_path):
    bpy.ops.object.text_add(location=(0, front - 0.06, H - 9.0))
    txt = bpy.context.object
    txt.data.body = "圖書館"
    txt.data.size = 2.6
    txt.data.extrude = 0.08
    txt.data.align_x = 'CENTER'
    txt.data.align_y = 'CENTER'
    txt.rotation_euler = (math.pi / 2, 0, 0)
    txt.data.font = bpy.data.fonts.load(font_path)
    txt.data.materials.append(principled("letters", (0.92, 0.90, 0.85), 0.5))

# red columns
for i in range(-3, 4):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.42, depth=GROUND + 0.4, location=(i * 5.6, min_y - 1.4, (GROUND + 0.4) / 2))
    bpy.context.object.data.materials.append(red_col)

# canopy
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, min_y - 4.2, GROUND + 0.4))
canopy = bpy.context.object
canopy.name = "LIB_canopy"
canopy.scale = (23, 8.4, 0.35)
canopy.data.materials.append(metal)

# ground & trees
bpy.ops.mesh.primitive_plane_add(size=260, location=(0, 0, -0.05))
ground = bpy.context.object
ground.data.materials.append(principled("grass", (0.20, 0.30, 0.15), 0.95))

for i in range(8):
    x = -63 + (i % 8) * 18
    y = min_y - 26
    bpy.ops.mesh.primitive_cylinder_add(radius=0.28, depth=4.5, location=(x, y, 2.25))
    bpy.context.object.data.materials.append(principled("trunk", (0.22, 0.16, 0.10), 0.9))
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=2.6, location=(x, y, 5.6))
    bpy.context.object.data.materials.append(principled("crown", (0.55, 0.45, 0.10), 0.85))

# world
world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
nt = world.node_tree
bg = nt.nodes.get("Background")
bg.inputs["Color"].default_value = (0.62, 0.74, 0.86, 1.0)
bg.inputs["Strength"].default_value = 0.85

sun_data = bpy.data.lights.new("Sun", type='SUN')
sun_data.energy = 3.2
sun_data.angle = math.radians(2.5)
sun_data.color = (1.0, 0.95, 0.88)
sun = bpy.data.objects.new("Sun", sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(52), 0, math.radians(125))

cam_data = bpy.data.cameras.new("Camera")
cam_data.lens = 55
cam = bpy.data.objects.new("Camera", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
target = Vector((0, min_y - 2, 14))
cam.location = Vector((94, min_y - 104, 32))
cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()

scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1400
scene.render.resolution_y = 900
scene.eevee.taa_render_samples = 64
scene.view_settings.view_transform = 'AgX'
try:
    scene.view_settings.look = 'AgX - Medium High Contrast'
except Exception:
    pass

shot = os.path.join(OUT_DIR, "blender-library-v2.png")
scene.render.filepath = shot
bpy.ops.render.render(write_still=True)

print("BLENDER_OK", json.dumps({"shot": shot}))
