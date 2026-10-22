import bpy, bmesh, json, math, os
from mathutils import Vector

ROOT = r"C:\Users\Alienware\DeskBox\文档\geren"
JSON_PATH = os.path.join(ROOT, "city-twin", "data", "campus-v2.json")
OUT = os.path.join(ROOT, ".tmp")
os.makedirs(OUT, exist_ok=True)

with open(JSON_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'

# ---------- facade texture (window grid) ----------
img = bpy.data.images.new("facade_grid", 64, 64)
px = [0.0] * (64 * 64 * 4)
for y in range(64):
    for x in range(64):
        i = (y * 64 + x) * 4
        win = (x % 16 < 6) and (y % 18 < 7)
        if win:
            px[i:i + 4] = [0.10, 0.16, 0.20, 1.0]
        else:
            px[i:i + 4] = [0.78, 0.78, 0.76, 1.0]
img.pixels = px
img.pack()

def facade_material(name, tint):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.extension = 'REPEAT'
    tex.interpolation = 'Closest'
    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (0.36, 0.36, 0.36)
    nt.links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], tex.inputs["Vector"])
    mix = nt.nodes.new("ShaderNodeMixRGB")
    mix.blend_type = 'MULTIPLY'
    mix.inputs["Fac"].default_value = 1.0
    mix.inputs["Color2"].default_value = (*tint, 1.0)
    nt.links.new(tex.outputs["Color"], mix.inputs["Color1"])
    nt.links.new(mix.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.68
    return m

mat_conc = facade_material("facade_light", (1.0, 0.98, 0.94))
mat_warm = facade_material("facade_warm", (1.0, 0.92, 0.80))
mat_blue = facade_material("facade_blue", (0.82, 0.90, 1.0))
mat_glass = facade_material("facade_glass", (0.60, 0.78, 0.95))
mat_brick = bpy.data.materials.new("brick")
mat_brick.use_nodes = True
bsdf = mat_brick.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Base Color"].default_value = (0.36, 0.14, 0.10, 1)
bsdf.inputs["Roughness"].default_value = 0.85

mat_road = bpy.data.materials.new("road")
mat_road.use_nodes = True
mat_road.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (0.24, 0.25, 0.27, 1)

mat_water = bpy.data.materials.new("water")
mat_water.use_nodes = True
bw = mat_water.node_tree.nodes.get("Principled BSDF")
bw.inputs["Base Color"].default_value = (0.10, 0.24, 0.32, 1)
bw.inputs["Roughness"].default_value = 0.12
bw.inputs["Metallic"].default_value = 0.3

mat_grass = bpy.data.materials.new("grass")
mat_grass.use_nodes = True
mat_grass.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (0.20, 0.29, 0.16, 1)

KIND_MAT = {
    "library": mat_conc, "teaching": mat_conc, "student_bedroom": mat_warm,
    "gymnasium": mat_glass, "canteen": mat_warm, "experiment_building": mat_blue,
    "administration": mat_conc, "hospital": mat_conc, "service_building": mat_conc,
}

def add_obj(name, verts, faces, mat):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    ob.data.materials.append(mat)
    return ob

def extrude(ring, h):
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, 0)) for x, y in ring]
    face = bm.faces.new(vs)
    ret = bmesh.ops.extrude_face_region(bm, geom=[face])
    top = [e for e in ret["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0, h), verts=top)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new("m")
    bm.to_mesh(me)
    bm.free()
    return me

count = 0
for b in data["buildings"]:
    rings = b.get("r", [])
    if not rings or len(rings[0]) < 3:
        continue
    h = float(b.get("h", 12) or 12)
    name = b.get("n", "")
    if "明德楼" in name or "立德楼" in name:
        h = 21.0
    if h < 4:
        h = 4
    ring = [(p[0], -p[1]) for p in rings[0]]
    me = extrude(ring, h)
    ob = bpy.data.objects.new(f"BLD_{count:02d}_{name[:8]}", me)
    scene.collection.objects.link(ob)
    kind = b.get("k", "")
    ob.data.materials.append(KIND_MAT.get(kind, mat_conc))
    # parapet
    if h > 10:
        pb = bmesh.new()
        for i in range(len(ring)):
            a = ring[i]; c = ring[(i + 1) % len(ring)]
            vs2 = [pb.verts.new((a[0], a[1], h)), pb.verts.new((c[0], c[1], h)),
                   pb.verts.new((c[0], c[1], h + 0.9)), pb.verts.new((a[0], a[1], h + 0.9))]
            pb.faces.new(vs2)
        pb.normal_update()
        pm = bpy.data.meshes.new("p")
        pb.to_mesh(pm)
        pb.free()
        po = bpy.data.objects.new(f"PAR_{count:02d}", pm)
        scene.collection.objects.link(po)
        po.data.materials.append(mat_conc)
    count += 1

# roads
for road in data.get("roads", []):
    for line in road.get("l", []):
        if len(line) < 2:
            continue
        verts = []
        faces = []
        for i in range(len(line) - 1):
            a = Vector((line[i][0], -line[i][1]))
            c = Vector((line[i + 1][0], -line[i + 1][1]))
            d = (c - a).normalized()
            n = Vector((-d.y, d.x)) * 3.0
            idx = len(verts)
            verts += [(a.x - n.x, a.y - n.y, 0.05), (a.x + n.x, a.y + n.y, 0.05),
                      (c.x - n.x, c.y - n.y, 0.05), (c.x + n.x, c.y + n.y, 0.05)]
            faces.append((idx, idx + 1, idx + 3, idx + 2))
        add_obj(f"ROAD_{len(verts)}", verts, faces, mat_road)

# water
for ring in data.get("water", []):
    poly = [(p[0], -p[1]) for p in ring]
    if len(poly) < 3:
        continue
    faces = [tuple(range(len(poly)))]
    add_obj("WATER", [(x, y, 0.02) for x, y in poly], faces, mat_water)

# trees
for i, t in enumerate(data.get("trees", [])[:120]):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.25, depth=4.0, location=(t[0], -t[1], 2.0))
    bpy.context.object.data.materials.append(mat_grass)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=2.2, location=(t[0], -t[1], 5.2))
    bpy.context.object.data.materials.append(mat_grass)

# ground
bpy.ops.mesh.primitive_plane_add(size=2400, location=(250, 500, -0.02))
bpy.context.object.data.materials.append(mat_grass)

# lighting
world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
bg.inputs["Color"].default_value = (0.62, 0.74, 0.86, 1.0)
bg.inputs["Strength"].default_value = 0.9

sun_data = bpy.data.lights.new("Sun", type='SUN')
sun_data.energy = 3.4
sun_data.angle = math.radians(2.0)
sun_data.color = (1.0, 0.95, 0.88)
sun = bpy.data.objects.new("Sun", sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = (math.radians(50), 0, math.radians(120))

# camera aerial
xs = [p[0] for b in data["buildings"] for ring in b["r"] for p in ring]
zs = [p[1] for b in data["buildings"] for ring in b["r"] for p in ring]
cx = (min(xs) + max(xs)) / 2
cz = -(min(zs) + max(zs)) / 2

cam_data = bpy.data.cameras.new("Camera")
cam_data.lens = 35
cam = bpy.data.objects.new("Camera", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
cam.location = Vector((cx + 780, cz + 980, 760))
target = Vector((cx, cz, 30))
cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()

scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1600
scene.render.resolution_y = 1000
scene.eevee.taa_render_samples = 32
scene.view_settings.view_transform = 'AgX'

shot = os.path.join(OUT, "blender-campus.png")
scene.render.filepath = shot
bpy.ops.render.render(write_still=True)

glb = os.path.join(ROOT, "city-twin", "godot", "assets", "campus.glb")
os.makedirs(os.path.dirname(glb), exist_ok=True)
for o in bpy.context.selected_objects:
    o.select_set(False)
for o in bpy.data.objects:
    if o.type == 'MESH':
        o.select_set(True)
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True)
print("BLENDER_OK", json.dumps({"shot": shot, "glb": glb, "buildings": count}))
