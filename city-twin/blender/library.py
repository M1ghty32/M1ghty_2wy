import bpy, bmesh, json, math, os
from mathutils import Vector

ROOT = r"C:\Users\Alienware\DeskBox\文档\geren"
JSON_PATH = os.path.join(ROOT, "city-twin", "data", "campus-v2.json")
OUT_DIR = os.path.join(ROOT, ".tmp")
os.makedirs(OUT_DIR, exist_ok=True)

with open(JSON_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

lib = None
for b in data["buildings"]:
    if "图书馆" in b.get("n", ""):
        lib = b
        break
if lib is None:
    raise RuntimeError("library not found")

raw = lib["r"][0]
cx0 = sum(p[0] for p in raw) / len(raw)
cz0 = sum(p[1] for p in raw) / len(raw)
ring = [(p[0] - cx0, -(p[1] - cz0)) for p in raw]
H = 32.0

# clean scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0

def make_mesh(name, verts, faces, mat):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    ob.data.materials.append(mat)
    return ob

def mat_principled(name, color, rough=0.7, metal=0.0, transmission=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    return m

concrete = mat_principled("concrete", (0.72, 0.70, 0.66), 0.75)
glass = mat_principled("glass", (0.16, 0.28, 0.36), 0.08, 0.2, 0.35)
brick = mat_principled("brick", (0.42, 0.19, 0.14), 0.85)
metal = mat_principled("metal", (0.30, 0.32, 0.34), 0.4, 0.7)

# footprint
bm = bmesh.new()
verts = [bm.verts.new((x, y, 0.0)) for x, y in ring]
face = bm.faces.new(verts)
ret = bmesh.ops.extrude_face_region(bm, geom=[face])
top = [e for e in ret["geom"] if isinstance(e, bmesh.types.BMVert)]
bmesh.ops.translate(bm, vec=(0, 0, H), verts=top)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
me = bpy.data.meshes.new("library_body")
bm.to_mesh(me)
bm.free()
body = bpy.data.objects.new("LIB_body", me)
scene.collection.objects.link(body)
body.data.materials.append(concrete)

# windows on facades
win_bm = bmesh.new()
cx = sum(p[0] for p in ring) / len(ring)
cy = sum(p[1] for p in ring) / len(ring)

def inside(px, py):
    ins = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
            ins = not ins
        j = i
    return ins

FLOORS = 7
for i in range(len(ring)):
    a = Vector(ring[i])
    b = Vector(ring[(i + 1) % len(ring)])
    edge = b - a
    length = edge.length
    if length < 1.0:
        continue
    d = edge.normalized()
    n = Vector((-d.y, d.x))
    mid = (a + b) * 0.5 + n * 0.3
    if inside(mid.x, mid.y):
        n = -n
    bays = max(1, int(length / 5.0))
    for bay in range(bays):
        t0 = (bay + 0.18) / bays
        t1 = (bay + 0.82) / bays
        p0 = a + edge * t0
        p1 = a + edge * t1
        for fl in range(FLOORS):
            z0 = 5.0 + fl * 3.9
            z1 = z0 + 2.4
            q = [p0 + n * 0.08, p1 + n * 0.08, p1 + n * 0.08, p0 + n * 0.08]
            v0 = win_bm.verts.new((q[0].x, q[0].y, z0))
            v1 = win_bm.verts.new((q[1].x, q[1].y, z0))
            v2 = win_bm.verts.new((q[2].x, q[2].y, z1))
            v3 = win_bm.verts.new((q[3].x, q[3].y, z1))
            win_bm.faces.new((v0, v1, v2, v3))
win_me = bpy.data.meshes.new("library_windows")
win_bm.to_mesh(win_me)
win_bm.free()
win_obj = bpy.data.objects.new("LIB_windows", win_me)
scene.collection.objects.link(win_obj)
win_obj.data.materials.append(glass)

# horizontal floor ledges
ledge_bm = bmesh.new()
for fl in range(1, FLOORS + 1):
    z = 4.4 + fl * 3.9
    for i in range(len(ring)):
        a = Vector(ring[i]); b = Vector(ring[(i + 1) % len(ring)])
        edge = b - a
        if edge.length < 1:
            continue
        d = edge.normalized(); n = Vector((-d.y, d.x))
        mid = (a + b) * 0.5 + n * 0.35
        if inside(mid.x, mid.y):
            n = -n
        q0 = a + n * 0.38; q1 = b + n * 0.38
        vs = [ledge_bm.verts.new((q0.x, q0.y, z - 0.12)), ledge_bm.verts.new((q1.x, q1.y, z - 0.12)),
              ledge_bm.verts.new((q1.x, q1.y, z + 0.12)), ledge_bm.verts.new((q0.x, q0.y, z + 0.12))]
        ledge_bm.faces.new(vs)
ledge_me = bpy.data.meshes.new("library_ledges")
ledge_bm.to_mesh(ledge_me)
ledge_bm.free()
ledge_obj = bpy.data.objects.new("LIB_ledges", ledge_me)
scene.collection.objects.link(ledge_obj)
ledge_obj.data.materials.append(concrete)

# south red-brick panel (south = plan +z => blender -y)
min_y = min(p[1] for p in ring)
max_y = max(p[1] for p in ring)
panel_w = 20.0
panel_h = 30.0
pnl = bmesh.new()
vs = [pnl.verts.new((-panel_w / 2, min_y - 0.45, 8.0)),
      pnl.verts.new((panel_w / 2, min_y - 0.45, 8.0)),
      pnl.verts.new((panel_w / 2, min_y - 0.45, 2.0 + panel_h)),
      pnl.verts.new((-panel_w / 2, min_y - 0.45, 2.0 + panel_h))]
pnl.faces.new(vs)
bmesh.ops.recalc_face_normals(pnl, faces=pnl.faces)
pnl_me = bpy.data.meshes.new("panel")
pnl.to_mesh(pnl_me)
pnl.free()
pnl_obj = bpy.data.objects.new("LIB_panel", pnl_me)
scene.collection.objects.link(pnl_obj)
pnl_obj.data.materials.append(brick)

# text 图书馆 on panel
font_path = r"C:\Windows\Fonts\simhei.ttf"
if os.path.exists(font_path):
    bpy.ops.object.text_add(location=(0, min_y - 0.62, 25))
    txt = bpy.context.object
    txt.data.body = "圖書館"
    txt.data.size = 3.4
    txt.data.extrude = 0.12
    txt.data.align_x = 'CENTER'
    txt.data.align_y = 'CENTER'
    txt.rotation_euler = (math.pi / 2, 0, 0)
    txt.data.font = bpy.data.fonts.load(font_path)
    txt.data.materials.append(mat_principled("sign", (0.92, 0.90, 0.84), 0.5))

# ground-floor red columns (south)
col_mat = mat_principled("column_red", (0.55, 0.14, 0.10), 0.6)
for i in range(-3, 4):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.45, depth=6.0, location=(i * 6.0, min_y - 1.2, 3.0))
    bpy.context.object.data.materials.append(col_mat)

# parapet
par_bm = bmesh.new()
for i in range(len(ring)):
    a = Vector(ring[i]); b = Vector(ring[(i + 1) % len(ring)])
    if (b - a).length < 0.5:
        continue
    vs = [par_bm.verts.new((a.x, a.y, H)), par_bm.verts.new((b.x, b.y, H)),
          par_bm.verts.new((b.x, b.y, H + 1.0)), par_bm.verts.new((a.x, a.y, H + 1.0))]
    par_bm.faces.new(vs)
par_bm.normal_update()
par_me = bpy.data.meshes.new("parapet")
par_bm.to_mesh(par_me)
par_bm.free()
par_obj = bpy.data.objects.new("LIB_parapet", par_me)
scene.collection.objects.link(par_obj)
par_obj.data.materials.append(concrete)

# entrance canopy (south)
canopy = bmesh.new()
cw, cd = 16.0, 7.0
z = 4.6
vs = [canopy.verts.new((-cw / 2, min_y - cd, z)), canopy.verts.new((cw / 2, min_y - cd, z)),
      canopy.verts.new((cw / 2, min_y, z)), canopy.verts.new((-cw / 2, min_y, z))]
canopy.faces.new(vs)
for x in (-cw / 2 + 1, cw / 2 - 1):
    for y in (min_y - cd + 0.6, min_y - 0.6):
        col = bmesh.ops.create_cone(canopy, cap_ends=True, segments=8, radius1=0.16, radius2=0.16, depth=z)
        bmesh.ops.translate(canopy, vec=(x, y, z / 2), verts=col["verts"])
canopy_me = bpy.data.meshes.new("canopy")
canopy.to_mesh(canopy_me)
canopy.free()
canopy_obj = bpy.data.objects.new("LIB_canopy", canopy_me)
scene.collection.objects.link(canopy_obj)
canopy_obj.data.materials.append(metal)

# lighting & world
world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
bg.inputs[0].default_value = (0.55, 0.70, 0.85, 1.0)
bg.inputs[1].default_value = 1.0

sun_data = bpy.data.lights.new("Sun", type='SUN')
sun_data.energy = 3.5
sun_data.angle = math.radians(1.5)
sun = bpy.data.objects.new("Sun", sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(55), 0, math.radians(35))

# camera 3/4 view
cam_data = bpy.data.cameras.new("Camera")
cam_data.lens = 45
cam = bpy.data.objects.new("Camera", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
target = Vector((0, 0, 15))
cam.location = Vector((88, min_y - 105, 34))
direction = target - cam.location
cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

scene.render.resolution_x = 1280
scene.render.resolution_y = 860
scene.render.film_transparent = False
scene.eevee.taa_render_samples = 32
scene.view_settings.view_transform = 'AgX'

shot = os.path.join(OUT_DIR, "blender-library.png")
scene.render.filepath = shot
bpy.ops.render.render(write_still=True)

# export glb
glb = os.path.join(ROOT, "city-twin", "godot", "assets", "library.glb")
os.makedirs(os.path.dirname(glb), exist_ok=True)
for o in bpy.context.selected_objects:
    o.select_set(False)
for o in bpy.data.objects:
    if o.type in {'MESH', 'FONT'}:
        o.select_set(True)
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True)

print("BLENDER_OK", json.dumps({"shot": shot, "glb": glb, "verts": len(me.vertices)}))
