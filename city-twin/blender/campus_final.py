import bpy, bmesh, json, math, os, sys, random
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

ROOT = r"C:\Users\Alienware\DeskBox\文档\geren"
DATA = os.path.join(ROOT, "city-twin", "data")
ASSETS = os.path.join(ROOT, "city-twin", "godot", "assets")
os.makedirs(ASSETS, exist_ok=True)
random.seed(19)
with open(os.path.join(DATA, "campus-v2.json"), encoding="utf-8") as f:
    data = json.load(f)
with open(os.path.join(DATA, "campus-surfaces.json"), encoding="utf-8") as f:
    surfaces = json.load(f)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'

def material(name, color, rough=0.75, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    return m

def pbr(name, color, file, scale=0.2, rough=0.8):
    m = material(name, color, rough)
    nt = m.node_tree
    p = nt.nodes.get("Principled BSDF")
    if os.path.exists(file):
        im = nt.nodes.new("ShaderNodeTexImage")
        im.image = bpy.data.images.load(file, check_existing=True)
        tc = nt.nodes.new("ShaderNodeTexCoord")
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (scale * 3.0, scale * 3.0, scale * 3.0)
        nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
        nt.links.new(mp.outputs["Vector"], im.inputs["Vector"])
        nt.links.new(im.outputs["Color"], p.inputs["Base Color"])
        normal = file.replace("_diff", "_nor_gl").replace("_normal", "_nor_gl")
        if os.path.exists(normal):
            nm = nt.nodes.new("ShaderNodeTexImage")
            nm.image = bpy.data.images.load(normal, check_existing=True)
            nm.image.colorspace_settings.name = 'Non-Color'
            nt.links.new(mp.outputs["Vector"], nm.inputs["Vector"])
            norm = nt.nodes.new("ShaderNodeNormalMap")
            norm.inputs["Strength"].default_value = 0.35
            nt.links.new(nm.outputs["Color"], norm.inputs["Color"])
            nt.links.new(norm.outputs["Normal"], p.inputs["Normal"])
    return m

M = {}
M["grass"] = pbr("grass", (0.26,0.35,0.18), os.path.join(ROOT,'.tools/assets/grass_green.jpg'), 0.035)
M["asphalt"] = pbr("asphalt", (0.24,0.26,0.28), os.path.join(ROOT,'.tools/assets/asphalt_diff.jpg'), 0.1, 0.88)
M["paving"] = pbr("paving", (0.55,0.53,0.48), os.path.join(ROOT,'.tools/assets/concrete_diff.jpg'), 0.18)
M["wall"] = pbr("wall", (0.7,0.66,0.57), os.path.join(ROOT,'.tools/assets/concrete_diff.jpg'), 0.3)
M["wall_warm"] = material("wall_warm", (0.62,0.47,0.32), 0.82)
M["wall_white"] = material("wall_white", (0.73,0.73,0.68), 0.7)
M["glass"] = material("glass", (0.08,0.18,0.24), 0.16, 0.55)
M["glass_blue"] = material("glass_blue", (0.13,0.28,0.36), 0.18, 0.35)
M["roof"] = material("roof", (0.22,0.25,0.26), 0.9)
M["trim"] = material("trim", (0.72,0.72,0.68), 0.55, 0.15)
M["brick"] = material("brick", (0.38,0.12,0.075), 0.85)
M["base"] = material("base", (0.20,0.22,0.23), 0.85)
M["roadline"] = material("roadline", (0.8,0.78,0.66), 0.75)
M["water"] = material("water", (0.055,0.22,0.30), 0.12, 0.45)
M["bank"] = material("bank", (0.38,0.36,0.29), 0.85)
M["trunk"] = material("trunk", (0.22,0.14,0.08), 0.95)
M["leaf"] = material("leaf", (0.16,0.29,0.095), 0.9)
M["leaf_light"] = material("leaf_light", (0.25,0.38,0.12), 0.9)
M["metal"] = material("metal", (0.32,0.36,0.38), 0.4, 0.65)
M["track"] = material("track", (0.47,0.13,0.075), 0.85)
M["field"] = material("field", (0.12,0.28,0.12), 0.95)
M["court"] = material("court", (0.13,0.32,0.28), 0.85)
M["court_alt"] = material("court_alt", (0.10,0.25,0.38), 0.85)
M["line"] = material("line", (0.86,0.87,0.81), 0.75)
M["seat"] = material("seat", (0.22,0.28,0.33), 0.8)

# Objects are merged per semantic category/material for web performance.
buckets = {}
def add_obj(name, verts, faces, mat):
    if not verts or not faces:
        return
    key = name.split("__")[0] + "|" + mat.name
    if key not in buckets:
        buckets[key] = [name, [], [], mat]
    b = buckets[key]
    off = len(b[1])
    b[1].extend([tuple(v) for v in verts])
    b[2].extend([tuple(i + off for i in f) for f in faces])

def face(b, verts, mat):
    b[1].extend(verts)
    b[2].append(tuple(range(len(b[1])-len(verts),len(b[1]))))

def area_xy(ring):
    return sum(ring[i][0] * ring[(i + 1) % len(ring)][1] - ring[(i + 1) % len(ring)][0] * ring[i][1] for i in range(len(ring))) * 0.5

def ccw(ring):
    return ring if area_xy(ring) > 0 else list(reversed(ring))

def triangulated(ring, y, mat, name):
    if ring and isinstance(ring[0][0], (list, tuple)):
        ring = ring[0]
    vecs = [Vector((p[0], -p[1], y)) for p in ccw(ring)]
    if len(vecs) < 3: return
    for tri in tessellate_polygon([vecs]):
        if tri and isinstance(tri[0], int):
            tri = [vecs[i] for i in tri]
        if len(tri) == 3:
            cross = (tri[1] - tri[0]).cross(tri[2] - tri[0])
            if cross.z < 0:
                tri = [tri[0], tri[2], tri[1]]
        add_obj(name, [tuple(v) for v in tri], [(0,1,2)], mat)

def box(name, center, size, mat):
    x,y,z=center; sx,sy,sz=[v/2 for v in size]
    vs=[(x+dx*sx,y+dy*sy,z+dz*sz) for dx,dy,dz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    fs=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    add_obj(name,vs,fs,mat)

def rod(name,a,b,r,mat,sides=6):
    a=Vector(a); b=Vector(b); d=(b-a).normalized(); up=Vector((0,0,1))
    if abs(d.z)>0.95: up=Vector((1,0,0))
    u=d.cross(up).normalized()*r; v=d.cross(u).normalized()*r
    vs=[]
    for p in (a,b):
        for i in range(sides):
            q=p+u*math.cos(i*math.tau/sides)+v*math.sin(i*math.tau/sides)
            vs.append(tuple(q))
    fs=[]
    for i in range(sides): fs.append((i,(i+1)%sides,(i+1)%sides+sides,i+sides))
    fs.extend([tuple(range(sides-1,-1,-1)),tuple(range(sides,2*sides))])
    add_obj(name,vs,fs,mat)

def solid_poly(name, ring, h, mat, base=0.0):
    if ring and isinstance(ring[0][0], (list, tuple)):
        ring = ring[0]
    ring = ccw(ring)
    n=len(ring)
    vs=[(x,y,base) for x,y in ring]+[(x,y,base+h) for x,y in ring]
    fs=[]
    for i in range(n):
        j=(i+1)%n; fs.append((i,j,j+n,i+n))
    fs.append(tuple(range(n,2*n)))
    add_obj(name,vs,fs,mat)

def edge_band(ring,z,width,height,mat,name="TRIM"):
    ring = ccw(ring)
    for i in range(len(ring)):
        a=Vector(ring[i]); b=Vector(ring[(i+1)%len(ring)])
        d=(b-a).normalized(); n=Vector((d.y,-d.x))*width
        vs=[(a.x,a.y,z-height/2),(b.x,b.y,z-height/2),(b.x+n.x,b.y+n.y,z+height/2),(a.x+n.x,a.y+n.y,z+height/2)]
        add_obj(name,vs,[(0,3,2,1)],mat)

def ribbon(name,points,width,mat,y=0.08):
    for i in range(len(points)-1):
        a=Vector(points[i]); b=Vector(points[i+1]); d=(b-a).normalized(); n=Vector((-d.y,d.x))*width/2
        vs=[(a.x-n.x,a.y-n.y,y),(a.x+n.x,a.y+n.y,y),(b.x+n.x,b.y+n.y,y),(b.x-n.x,b.y-n.y,y)]
        add_obj(name,vs,[(0,1,2,3)],mat)

# Ground / official land-use polygons
box("GROUND", (190,190,-0.20), (6000,6000,0.25), M["grass"])
for poly in surfaces.get("green",[]): triangulated(poly["r"],0.025,M["grass"],"GREEN")
for poly in surfaces.get("paving",[]): triangulated(poly["r"],0.055,M["paving"],"PAVING")
for poly in surfaces.get("parkingAreas",[]): triangulated(poly["r"],0.075,M["asphalt"],"PARKING")
for poly in surfaces.get("parkingBays",[]):
    ring=poly["r"]; solid_poly("PARKLINE",ring,0.018,M["line"],0.08)

# Roads: sidewalks and asphalt, widths from official road class.
for road in data["roads"]:
    w={"primary":11,"secondary":9,"tertiary":8,"living_street":6,"service":5,"path":3,"pedestrian":3}.get(road.get("w",""),4)
    for line in road["l"]:
        pts=[(p[0],-p[1]) for p in line]
        ribbon("SIDEWALK",pts,w+1.8,M["paving"],0.07)
        ribbon("ROAD",pts,w,M["asphalt"],0.095)
        if w>=6:
            ribbon("ROADLINE",pts,0.12,M["roadline"],0.105)

# Water and banks
for ring in data["water"]:
    edge_band([(p[0],-p[1]) for p in ring],0.08,1.8,0.12,M["bank"],"BANK")
    triangulated(ring,0.035,M["water"],"WATER")

# Buildings: solid walls + independent roofs, vertical piers, horizontal floor ledges.
for idx,b in enumerate(data["buildings"]):
    ring=[(p[0],-p[1]) for p in b["r"][0]]
    h=float(b.get("h",12) or 12)
    name=b.get("n","")
    if "明德楼" in name or "立德楼" in name: h=21
    if "图书馆" in name: h=32
    h=max(4,h)
    kind=b.get("k","")
    wall=M["wall_warm"] if kind=="student_bedroom" else M["wall_white"] if kind in ("library","teaching","hospital") else M["wall"]
    solid_poly("BLD_WALL",ring,h,wall)
    solid_poly("BLD_BASE",ring,0.75,M["base"])
    solid_poly("BLD_ROOF",ring,0.32,M["roof"],h)
    edge_band(ring,h+0.5,0.38,0.75,M["trim"])
    edge_band(ring,0.7,0.12,0.2,M["trim"])
    floors=max(1,int((h-1.2)/3.6))
    for fl in range(1,floors+1):
        z=1.1+fl*3.6
        if z>h-0.5: break
        edge_band(ring,z,0.22,0.16,M["trim"])
    # Vertical facade ribs: real geometry at regular structural bays.
    for i in range(len(ring)):
        a=Vector(ring[i]); c=Vector(ring[(i+1)%len(ring)]); d=c-a
        length=d.length
        if length<1: continue
        n=Vector((d.y,-d.x)).normalized()*0.12
        bays=max(1,int(length/4.2))
        for j in range(bays+1):
            p=a+d*(j/bays)
            vs=[(p.x,p.y,1.0),(p.x+n.x,p.y+n.y,1.0),(p.x+n.x,p.y+n.y,h-0.2),(p.x,p.y,h-0.2)]
            add_obj("FACADE_RIB",vs,[(0,1,2,3)],M["trim"])
        # Real windows: one framed opening per structural bay and floor.
        for bay in range(bays):
            for fl in range(max(1, floors)):
                z0=1.5+fl*3.6
                if z0+2.1>h-0.4: continue
                p0=a+d*((bay+0.18)/bays)+n*0.8
                p1=a+d*((bay+0.82)/bays)+n*0.8
                vs=[(p0.x,p0.y,z0),(p1.x,p1.y,z0),(p1.x,p1.y,z0+2.1),(p0.x,p0.y,z0+2.1)]
                add_obj("WINDOW_GLASS",vs,[(0,1,2,3)],M["glass_blue"] if kind in ("library","gymnasium","teaching") else M["glass"])
                for t in (0.0,2.1):
                    rod("WINDOW_FRAME",(p0.x,p0.y,z0+t),(p1.x,p1.y,z0+t),0.035,M["trim"],4)
                for p in (p0,p1):
                    rod("WINDOW_FRAME",(p.x,p.y,z0),(p.x,p.y,z0+2.1),0.035,M["trim"],4)
    # Rooftop parapet and small utility equipment.
    cx=sum(p[0] for p in ring)/len(ring); cy=sum(p[1] for p in ring)/len(ring)
    if h>14:
        box("ROOF_UNIT",(cx,cy,h+0.85),(5.0,3.0,1.1),M["metal"])
    if kind=="student_bedroom":
        for fl in range(2,floors+1):
            z=1.0+fl*3.6
            edge_band(ring,z,0.85,0.14,M["trim"],"BALCONY")
    # Entrance portico, on the south facade, supported by two posts.
    miny=min(p[1] for p in ring); minx=min(p[0] for p in ring); maxx=max(p[0] for p in ring)
    if maxx-minx>14 and h>8:
        ex=(minx+maxx)/2
        box("ENTRANCE_ROOF",(ex,miny-2.0,3.4),(min(13,(maxx-minx)*0.35),4.2,0.28),M["trim"])
        for x in (ex-4,ex+4): rod("ENTRANCE_POST",(x,miny-3.5,0.1),(x,miny-3.5,3.3),0.12,M["metal"])
    # Library's characteristic red central brick panel.
    if "图书馆" in name:
        box("LIBRARY_PANEL",(cx,miny-0.35,h/2),(20,0.7,h-3),M["brick"])

# Sports complex generated as actual track/court geometry.
try:
    sys.path.insert(0,os.path.join(ROOT,"city-twin","blender"))
    from sports import build_sports
    build_sports(add_obj, {"track":M["track"],"field":M["field"],"line":M["line"],"court":M["court"],"court_alt":M["court_alt"],"metal":M["metal"],"seat":M["seat"]})
except Exception as e:
    print("SPORTS_ERROR",repr(e))

# Main south gate and secondary gates.
def gate(x,z,w=24):
    y=-z
    for sx in (-1,1):
        box("GATE_PILLAR",(x+sx*w/2,y,3.4),(2.2,2.2,6.8),M["wall_warm"])
    box("GATE_BEAM",(x,y,6.8),(w+2,2.3,1.0),M["trim"])
    for i in range(-5,6): rod("GATE_RAIL",(x+i*w/12,y,0.2),(x+i*w/12,y,2.0),0.06,M["metal"])
    rod("GATE_RAIL",(x-w/2,y,1.8),(x+w/2,y,1.8),0.06,M["metal"])
gate(204.7,442.1,28)
gate(-62,-830,18)
gate(688,322,18)

# Vegetation: two crowns per tree, varied scales; denser along official tree points.
for i,t in enumerate(data["trees"]):
    x,y=t[0],-t[1]; s=0.85+random.random()*0.5; h=4.0*s
    rod("TREE_TRUNK",(x,y,0),(x,y,h),0.16*s,M["trunk"],7)
    for j in range(2):
        cx=x+(j-0.5)*0.7*s; cy=y+(0.5-j)*0.45*s; cz=h+1.0*s+j*0.8*s
        vs=[]; fs=[]; seg=9; rings=5; r=(2.1-j*0.25)*s
        for a in range(rings+1):
            phi=math.pi*a/rings
            for q in range(seg):
                th=math.tau*q/seg
                vs.append((cx+r*math.sin(phi)*math.cos(th),cy+r*math.sin(phi)*math.sin(th),cz+r*math.cos(phi)*0.85))
        for a in range(rings):
            for q in range(seg): fs.append((a*seg+q,a*seg+(q+1)%seg,(a+1)*seg+(q+1)%seg,(a+1)*seg+q))
        add_obj("TREE_CROWN",vs,fs,M["leaf_light"] if (i+j)%3==0 else M["leaf"])

# Street lamps and benches along the central axis.
for z in range(-180,401,40):
    for x in (148,262):
        rod("LAMP_POST",(x,-z,0),(x,-z,5.8),0.075,M["metal"],8)
        rod("LAMP_ARM",(x,-z,5.8),(x+1.2,-z,5.8),0.055,M["metal"],8)
        box("LAMP_HEAD",(x+1.2,-z,5.75),(0.65,0.32,0.18),M["trim"])
    if z%80==20:
        for x in (142,268):
            box("BENCH_SEAT",(x,-z,0.48),(2.0,0.55,0.12),M["seat"])
            for dx in (-0.7,0.7): rod("BENCH_LEG",(x+dx,-z,0.1),(x+dx,-z,0.45),0.05,M["metal"])

# Merge and export
for key,(name,verts,faces,mat) in buckets.items():
    me=bpy.data.meshes.new(name)
    me.from_pydata(verts,[],faces)
    for poly in me.polygons:
        if name.startswith('TREE_CROWN'):
            poly.use_smooth = True
    me.update()
    # Only horizontal surfaces need winding normalization. Never mirror the scene.
    for poly in me.polygons:
        if abs(poly.normal.z) > 0.7 and poly.normal.z < 0:
            poly.flip()
    me.update()
    ob=bpy.data.objects.new(name,me)
    scene.collection.objects.link(ob)
    ob.data.materials.append(mat)

# Natural sky for preview
world=bpy.data.worlds.new("World")
scene.world=world
world.use_nodes=True
bg=world.node_tree.nodes.get("Background")
hdr=os.path.join(ROOT,'.tools/assets/park.hdr')
if os.path.exists(hdr):
    tex=world.node_tree.nodes.new("ShaderNodeTexEnvironment")
    tex.image=bpy.data.images.load(hdr)
    world.node_tree.links.new(tex.outputs["Color"],bg.inputs["Color"])
else:
    bg.inputs["Color"].default_value=(0.55,0.68,0.82,1)
bg.inputs["Strength"].default_value=0.45
sun_data=bpy.data.lights.new("Sun",type='SUN'); sun_data.energy=2.2; sun_data.angle=math.radians(3)
sun=bpy.data.objects.new("Sun",sun_data); scene.collection.objects.link(sun); sun.rotation_euler=(math.radians(45),0,math.radians(125))

# Aerial preview
cam_data=bpy.data.cameras.new("Camera")
cam_data.type='ORTHO'
cam_data.ortho_scale=1650
cam=bpy.data.objects.new("Camera",cam_data); scene.collection.objects.link(cam); scene.camera=cam
cam.location=Vector((190,-1450,760)); target=Vector((190,-160,0))
cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='BLENDER_EEVEE'; scene.render.resolution_x=1600; scene.render.resolution_y=1000
scene.eevee.taa_render_samples=32; scene.view_settings.view_transform='AgX'
scene.render.filepath=os.path.join(ROOT,'.tmp','campus-final-aerial.png')
bpy.ops.render.render(write_still=True)

for o in bpy.context.selected_objects: o.select_set(False)
for o in scene.objects:
    if o.type=='MESH': o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(ASSETS,'campus.glb'),export_format='GLB',use_selection=True)
print("BLENDER_OK",json.dumps({"objects":len(scene.objects),"vertices":sum(len(v) for _,v,_,_ in buckets.values())}))
