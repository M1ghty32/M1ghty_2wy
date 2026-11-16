extends Node3D

const PLAYER_SCENE: PackedScene = preload("res://assets/player.glb")
const CAMPUS_SCENE: PackedScene = preload("res://assets/campus.glb")
const WATER_SHADER: Shader = preload("res://shaders/campus_water.gdshader")
const GRASS_SHADER: Shader = preload("res://shaders/campus_grass.gdshader")
const SKY_SHADER: Shader = preload("res://shaders/campus_sky.gdshader")
const WALL_SHADER: Shader = preload("res://shaders/campus_wall.gdshader")
const GRASS_TEXTURE: Texture2D = preload("res://assets/campus_grass_green.jpg")
const ASPHALT_TEXTURE: Texture2D = preload("res://assets/campus_asphalt_diff.jpg")
const PAVING_TEXTURE: Texture2D = preload("res://assets/campus_concrete_diff.jpg")
const SUN_ANGLE := Vector3(-39.0, -32.0, 0.0)
const FOLLOW_DISTANCE := 4.1
const DETAIL_LAYER := 2
const WALK_KEYS := "WASD Move   Shift Run   Space Jump   M Free Camera"
const SHORE_SCENERY = preload("res://campus_shore.gd")
const STREET_SCENERY = preload("res://campus_streets.gd")
const LANDSCAPE_SCENERY = preload("res://campus_landscape.gd")


var camp: Dictionary = {}
var player: CharacterBody3D
var cam: Camera3D
var pitch: float = -0.11
var frames: int = 0
var shot_path: String = ""
var use_glb: bool = false
var anim_player: AnimationPlayer
var free_cam: Camera3D
var free_on: bool = false
var free_target := Vector3(125, 0, -65)
var free_yaw := 0.45
var free_pitch := 0.84
var free_dist := 1570.0
var hud: Label
var water_material: ShaderMaterial
var anim_walk := ""
var anim_idle := ""
var anim_run := ""

func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	for i in args.size():
		if args[i] == "--shot" and i + 1 < args.size():
			shot_path = args[i + 1]

	var text := FileAccess.get_file_as_string("res://data/campus-v2.json")
	camp = JSON.parse_string(text)

	_build_environment()
	use_glb = _load_campus_glb()
	_build_hud()
	_build_ground()
	if not use_glb:
		_build_water()
		_build_roads()
	_build_buildings(not use_glb)
	if not use_glb:
		_build_trees()
	_build_scenery()
	_build_player()

func _window_texture() -> ImageTexture:
	var size := 128
	var img := Image.create(size, size, false, Image.FORMAT_RGB8)
	for y in size:
		for x in size:
			var fx := float(x) / size
			var fy := float(y) / size
			var col := Color(0.80, 0.79, 0.75)
			var cell_y := fmod(fy * 4.0, 1.0)
			if cell_y < 0.14:
				col = Color(0.66, 0.64, 0.60)
			else:
				var wx := fmod(fx * 4.0, 1.0)
				var wy := (cell_y - 0.14) / 0.86
				if wx > 0.10 and wx < 0.90 and wy > 0.18 and wy < 0.86:
					var lit := fmod(fx * 31.0 + fy * 17.0, 1.0)
					col = Color(0.10, 0.15, 0.20)
					if lit > 0.86:
						col = Color(0.90, 0.78, 0.52)
					elif lit > 0.70:
						col = Color(0.35, 0.48, 0.58)
				else:
					col = Color(0.86, 0.85, 0.82)
			img.set_pixel(x, y, col)
	return ImageTexture.create_from_image(img)

func _ground_texture() -> ImageTexture:
	var img := Image.create(128, 128, false, Image.FORMAT_RGB8)
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	for y in 128:
		for x in 128:
			var v := 0.82 + rng.randf() * 0.30
			img.set_pixel(x, y, Color(0.52 * v, 0.62 * v, 0.38 * v))
	return ImageTexture.create_from_image(img)

func _load_campus_glb() -> bool:
	var path := "res://assets/campus.glb"
	var packed: PackedScene = CAMPUS_SCENE
	var root: Node = null
	if packed:
		root = packed.instantiate()
	else:
		var doc := GLTFDocument.new()
		var state := GLTFState.new()
		var err := doc.append_from_file(path, state)
		if err != OK:
			return false
		root = doc.generate_scene(state)
	if root == null:
		return false
	add_child(root)
	_fix_glb_materials(root)
	return true


func _surface_material(texture: Texture2D, tint: Color, tile_metres: float) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = tint
	mat.albedo_texture = texture
	mat.roughness = 0.93
	mat.uv1_triplanar = true
	mat.uv1_world_triplanar = true
	mat.uv1_scale = Vector3.ONE / tile_metres
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	return mat

func _sun_direction() -> Vector3:
	return Basis.from_euler(SUN_ANGLE * PI / 180.0).z.normalized()

func _make_grass() -> ShaderMaterial:
	var mat := ShaderMaterial.new()
	mat.shader = GRASS_SHADER
	mat.set_shader_parameter("grass_image", GRASS_TEXTURE)
	return mat

func _make_water() -> ShaderMaterial:
	if water_material == null:
		water_material = ShaderMaterial.new()
		water_material.shader = WATER_SHADER
		water_material.set_shader_parameter("sun_direction", _sun_direction())
	return water_material

func _fix_glb_materials(root: Node) -> void:
	# The ground is mesh-batched by surface type and uses world-space texture mapping.
	var grass := _make_grass()
	var asphalt := _surface_material(ASPHALT_TEXTURE, Color(0.71, 0.73, 0.75), 7.0)
	var paving := _surface_material(PAVING_TEXTURE, Color(0.89, 0.86, 0.78), 3.2)
	var bank := _surface_material(PAVING_TEXTURE, Color(0.67, 0.64, 0.54), 2.5)
	var glass := StandardMaterial3D.new()
	glass.albedo_color = Color(0.21, 0.32, 0.37)
	glass.metallic = 0.11
	glass.metallic_specular = 0.29
	glass.roughness = 0.41
	var roof := StandardMaterial3D.new()
	roof.albedo_color = Color("#676e6c")
	roof.metallic_specular = 0.09
	roof.roughness = 0.93
	var markings := StandardMaterial3D.new()
	markings.albedo_color = Color("#ddd6bb")
	markings.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	for leaf in root.find_children("*", "MeshInstance3D", true, false):
		var mi := leaf as MeshInstance3D
		var n := String(mi.name)
		if n.begins_with("BLD_WALL") or n.begins_with("LIBRARY_PANEL"):
			var old_material := mi.get_active_material(0) as StandardMaterial3D
			var wall := ShaderMaterial.new()
			wall.shader = WALL_SHADER
			if old_material != null:
				var tint := old_material.albedo_color.darkened(0.12)
				wall.set_shader_parameter("base_color", tint)
			mi.material_override = wall
		elif n.begins_with("BLD_ROOF"):
			mi.material_override = roof
		elif n == "SPORTS_LINE":
			# The source's secondary tracks are overlapping filled polygons. Preserve
			# their vector borders and rebuild only the innermost fill as turf.
			mi.hide()
		elif n == "SPORTS_MARKING":
			mi.material_override = markings
			mi.position.y += 0.037
			mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		elif n.begins_with("WINDOW_FRAME") or n.begins_with("FACADE") or n.begins_with("TRIM"):
			mi.layers = DETAIL_LAYER
		elif n.begins_with("WATER"):
			mi.material_override = _make_water()
			mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		elif n.begins_with("BANK"):
			mi.material_override = bank
		elif n.begins_with("CURTAIN") or n.begins_with("WINDOW_GLASS"):
			mi.material_override = glass
		elif n.begins_with("GROUND") or n.begins_with("GREEN"):
			mi.material_override = grass
		elif n.begins_with("ROAD_") or n == "ROAD" or n.begins_with("PARKING"):
			mi.material_override = asphalt
		elif n.begins_with("PAVING") or n.begins_with("SIDEWALK"):
			mi.material_override = paving

func _build_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sky_material := ShaderMaterial.new()
	sky_material.shader = SKY_SHADER
	sky_material.set_shader_parameter("sun_direction", _sun_direction())
	sky.sky_material = sky_material
	sky.radiance_size = Sky.RADIANCE_SIZE_128
	env.sky = sky
	env.background_energy_multiplier = 0.90
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.79, 0.85, 0.94)
	env.ambient_light_energy = 0.54
	env.ambient_light_sky_contribution = 0.0
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 0.88
	env.fog_enabled = true
	env.fog_light_color = Color(0.73, 0.79, 0.82)
	env.fog_density = 0.00013
	env.fog_sky_affect = 0.0
	var world := WorldEnvironment.new()
	world.environment = env
	add_child(world)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = SUN_ANGLE
	sun.light_energy = 0.81
	sun.light_color = Color(1.0, 0.89, 0.74)
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 310.0
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
	add_child(sun)

func _build_ground() -> void:
	var far_ground := MeshInstance3D.new()
	var far_plane := PlaneMesh.new()
	far_plane.size = Vector2(12000, 12000)
	far_ground.mesh = far_plane
	var far_mat := StandardMaterial3D.new()
	far_mat.albedo_color = Color(0.29, 0.38, 0.26)
	far_mat.roughness = 0.95
	far_ground.material_override = far_mat
	far_ground.position = Vector3(190, -0.32, -190)
	add_child(far_ground)
	var floor_body := StaticBody3D.new()
	var floor_shape := CollisionShape3D.new()
	var floor_box := BoxShape3D.new()
	floor_box.size = Vector3(3000, 1, 3000)
	floor_shape.shape = floor_box
	floor_body.add_child(floor_shape)
	floor_body.position = Vector3(250, -0.6, 500)
	add_child(floor_body)
	if use_glb:
		return
	var plane := PlaneMesh.new()
	plane.size = Vector2(3000, 3000)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.55, 0.62, 0.45)
	mat.albedo_texture = _ground_texture()
	mat.uv1_triplanar = true
	mat.uv1_scale = Vector3(0.04, 0.04, 0.04)
	mat.roughness = 0.95
	var mi := MeshInstance3D.new()
	mi.mesh = plane
	mi.material_override = mat
	add_child(mi)

func _build_water() -> void:
	for ring in camp.get("water", []):
		var mesh := _polygon_mesh(ring, 0.06, _make_water())
		if mesh:
			mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			add_child(mesh)

func _build_roads() -> void:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.30, 0.31, 0.33)
	mat.roughness = 0.95
	for road in camp.get("roads", []):
		var w: float = 5.0
		match road.get("w", ""):
			"primary": w = 11.0
			"secondary": w = 9.0
			"tertiary": w = 8.0
			"living_street": w = 6.0
			"service": w = 5.0
			"path", "pedestrian": w = 3.0
			_: w = 4.0
		for line in road.get("l", []):
			var mesh := _ribbon_mesh(line, w, mat)
			if mesh:
				add_child(mesh)

func _ribbon_mesh(points: Array, width: float, mat: Material) -> MeshInstance3D:
	if points.size() < 2:
		return null
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for i in range(points.size() - 1):
		var a := Vector2(points[i][0], points[i][1])
		var b := Vector2(points[i + 1][0], points[i + 1][1])
		var d := (b - a).normalized()
		var n := Vector2(-d.y, d.x) * width * 0.5
		var y := 0.06
		var a1 := Vector3(a.x - n.x, y, a.y - n.y)
		var a2 := Vector3(a.x + n.x, y, a.y + n.y)
		var b1 := Vector3(b.x - n.x, y, b.y - n.y)
		var b2 := Vector3(b.x + n.x, y, b.y + n.y)
		_tri(st, a1, b1, b2)
		_tri(st, a1, b2, a2)
	st.generate_normals()
	var mesh := st.commit()
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	return mi

func _polygon_mesh(ring: Array, y: float, mat: Material) -> MeshInstance3D:
	if ring.size() < 3:
		return null
	var poly := PackedVector2Array()
	for p in ring:
		poly.append(Vector2(p[0], p[1]))
	var idx := Geometry2D.triangulate_polygon(poly)
	if idx.size() < 3:
		return null
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for i in range(0, idx.size(), 3):
		var p1 := poly[idx[i]]
		var p2 := poly[idx[i + 1]]
		var p3 := poly[idx[i + 2]]
		_tri(st, Vector3(p1.x, y, p1.y), Vector3(p3.x, y, p3.y), Vector3(p2.x, y, p2.y))
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	mi.material_override = mat
	return mi

func _build_buildings(visual: bool = true) -> void:
	var palette := {
		"library": Color(0.62, 0.60, 0.55),
		"teaching": Color(0.66, 0.68, 0.70),
		"student_bedroom": Color(0.60, 0.52, 0.40),
		"gymnasium": Color(0.62, 0.66, 0.68),
		"canteen": Color(0.64, 0.55, 0.42),
		"experiment_building": Color(0.56, 0.62, 0.66),
		"administration": Color(0.66, 0.61, 0.52),
		"hospital": Color(0.70, 0.71, 0.71),
		"service_building": Color(0.60, 0.57, 0.52)
	}
	for b in camp.get("buildings", []):
		var rings: Array = b.get("r", [])
		var east_surface := false
		if rings.size() == 2:
			for ring in rings:
				for p in ring:
					if p[0] > 500:
						east_surface = true
		if b.get("n", "") == "运动场" or east_surface:
			continue
		if rings.is_empty() or rings[0].size() < 3:
			continue
		var h: float = max(4.0, float(b.get("h", 12)))
		var kind: String = b.get("k", "")
		var col: Color = palette.get(kind, Color(0.82, 0.84, 0.86))
		var mat := StandardMaterial3D.new()
		mat.albedo_color = col
		mat.albedo_texture = _window_texture()
		mat.uv1_triplanar = true
		mat.uv1_scale = Vector3(0.12, 0.12, 0.12)
		mat.roughness = 0.7
		mat.metallic = 0.08
		mat.emission_enabled = true
		mat.emission_texture = mat.albedo_texture
		mat.emission = Color(1.0, 0.88, 0.68)
		mat.emission_energy_multiplier = 0.12
		mat.cull_mode = BaseMaterial3D.CULL_DISABLED
		var mesh = _extrude_mesh(rings[0], h) if visual else null
		if mesh:
			var mi := MeshInstance3D.new()
			mi.mesh = mesh
			mi.material_override = mat
			mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
			add_child(mi)
		_add_box_collision(rings[0], h)

func _extrude_mesh(ring: Array, h: float) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var n := ring.size()
	for i in n:
		var a := Vector2(ring[i][0], ring[i][1])
		var bb := Vector2(ring[(i + 1) % n][0], ring[(i + 1) % n][1])
		var a0 := Vector3(a.x, 0, a.y)
		var b0 := Vector3(bb.x, 0, bb.y)
		var a1 := Vector3(a.x, h, a.y)
		var b1 := Vector3(bb.x, h, bb.y)
		_tri(st, a0, b0, b1)
		_tri(st, a0, b1, a1)
	# roof
	var poly := PackedVector2Array()
	for p in ring:
		poly.append(Vector2(p[0], p[1]))
	var idx := Geometry2D.triangulate_polygon(poly)
	for i in range(0, idx.size(), 3):
		var p1 := poly[idx[i]]
		var p2 := poly[idx[i + 1]]
		var p3 := poly[idx[i + 2]]
		_tri(st, Vector3(p1.x, h, p1.y), Vector3(p3.x, h, p3.y), Vector3(p2.x, h, p2.y))
	st.generate_normals()
	return st.commit()

func _add_box_collision(ring: Array, h: float) -> void:
	var minx := INF
	var maxx := -INF
	var minz := INF
	var maxz := -INF
	for p in ring:
		minx = min(minx, p[0]); maxx = max(maxx, p[0])
		minz = min(minz, p[1]); maxz = max(maxz, p[1])
	var body := StaticBody3D.new()
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(maxx - minx, h, maxz - minz)
	shape.shape = box
	body.add_child(shape)
	body.position = Vector3((minx + maxx) * 0.5, h * 0.5, (minz + maxz) * 0.5)
	add_child(body)

func _build_trees() -> void:
	var trees: Array = camp.get("trees", [])
	if trees.is_empty():
		return
	var trunk := CylinderMesh.new()
	trunk.top_radius = 0.18
	trunk.bottom_radius = 0.28
	trunk.height = 4.0
	trunk.radial_segments = 6
	var crown := SphereMesh.new()
	crown.radius = 2.0
	crown.height = 4.0
	crown.radial_segments = 8
	crown.rings = 6
	var trunk_mat := StandardMaterial3D.new()
	trunk_mat.albedo_color = Color(0.22, 0.16, 0.11)
	var crown_mat := StandardMaterial3D.new()
	crown_mat.albedo_color = Color(0.14, 0.24, 0.11)
	crown_mat.roughness = 0.95
	var trunk_mi := MultiMeshInstance3D.new()
	var trunk_mm := MultiMesh.new()
	trunk_mm.transform_format = MultiMesh.TRANSFORM_3D
	trunk_mm.mesh = trunk
	trunk_mm.instance_count = trees.size()
	trunk_mi.multimesh = trunk_mm
	trunk_mi.material_override = trunk_mat
	add_child(trunk_mi)
	var crown_mi := MultiMeshInstance3D.new()
	var crown_mm := MultiMesh.new()
	crown_mm.transform_format = MultiMesh.TRANSFORM_3D
	crown_mm.mesh = crown
	crown_mm.instance_count = trees.size()
	crown_mi.multimesh = crown_mm
	crown_mi.material_override = crown_mat
	add_child(crown_mi)
	for i in trees.size():
		var p: Array = trees[i]
		var s := 0.8 + float(i % 5) * 0.08
		var t := Transform3D(Basis().scaled(Vector3(s, s, s)), Vector3(p[0], 1.6 * s, p[1]))
		trunk_mm.set_instance_transform(i, t)
		var c := Transform3D(Basis().scaled(Vector3(s, s, s)), Vector3(p[0], 4.2 * s, p[1]))
		crown_mm.set_instance_transform(i, c)

func _build_player() -> void:
	player = CharacterBody3D.new()
	player.position = Vector3(204, 0.12, 380)
	var col := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.42
	cap.height = 1.8
	col.shape = cap
	col.position.y = 0.9
	player.add_child(col)
	var body := MeshInstance3D.new()
	var capsule := CapsuleMesh.new()
	capsule.radius = 0.42
	capsule.height = 1.8
	body.mesh = capsule
	var bmat := StandardMaterial3D.new()
	bmat.albedo_color = Color(0.18, 0.36, 0.58)
	body.material_override = bmat
	body.position.y = 0.9
	player.add_child(body)
	var model := _load_player_model()
	if model:
		player.add_child(model)
		body.visible = false
	cam = Camera3D.new()
	cam.position = Vector3(0.45, 1.94, FOLLOW_DISTANCE)
	cam.fov = 64
	cam.near = 0.12
	cam.far = 2700.0
	cam.rotation.x = pitch
	player.add_child(cam)
	add_child(player)
	if model:
		_normalize_player_model(model)
	_start_walk_view()

func _normalize_player_model(model: Node3D) -> void:
	var ymin := INF
	var ymax := -INF
	for mi in model.find_children("*", "MeshInstance3D", true, false):
		var box: AABB = mi.get_aabb()
		var gt: Transform3D = mi.global_transform
		var p0: Vector3 = gt * box.position
		var p1: Vector3 = gt * box.end
		ymin = min(ymin, p0.y, p1.y)
		ymax = max(ymax, p0.y, p1.y)
	if ymax <= ymin:
		return
	# The importer pre-scales Soldier's root by 100; use the measured human scale.
	model.scale = Vector3.ONE
	model.rotation = Vector3.ZERO
	model.position.y = 0.0

func _load_player_model() -> Node3D:
	var path := "res://assets/player.glb"
	var root: Node = null
	var packed: PackedScene = PLAYER_SCENE
	if packed:
		root = packed.instantiate()
	else:
		var doc := GLTFDocument.new()
		var st := GLTFState.new()
		if doc.append_from_file(path, st) != OK:
			return null
		root = doc.generate_scene(st)
	if root == null:
		return null
	anim_player = root.find_child("*AnimationPlayer*", true, false) as AnimationPlayer
	if anim_player:
		for an in anim_player.get_animation_list():
			var low := String(an).to_lower()
			if low == "walking_a" or low == "walk":
				anim_walk = an
			elif low == "running_a" or low == "run":
				anim_run = an
			elif low == "idle":
				anim_idle = an
		if anim_walk == "":
			for an in anim_player.get_animation_list():
				if String(an).to_lower().contains("walk"):
					anim_walk = an
					break
		if anim_run == "":
			for an in anim_player.get_animation_list():
				if String(an).to_lower().contains("run"):
					anim_run = an
					break
		if anim_idle == "":
			for an in anim_player.get_animation_list():
				if String(an).to_lower().contains("idle"):
					anim_idle = an
					break
		if anim_idle != "":
			anim_player.play(anim_idle)
	return root as Node3D

func _tri(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3) -> void:
	st.add_vertex(a)
	st.add_vertex(b)
	st.add_vertex(c)

func _toggle_free_cam() -> void:
	free_on = not free_on
	if free_on:
		if free_cam == null:
			free_cam = Camera3D.new()
			free_cam.fov = 55
			add_child(free_cam)
		free_cam.current = true
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		hud.text = "Free Camera: RMB drag rotate | Wheel zoom | WASD pan | Q/E height | M back"
	else:
		if free_cam:
			free_cam.current = false
		cam.current = true
		_start_walk_view()

func _start_walk_view() -> void:
	# Browsers require a direct canvas gesture before locking the pointer.
	if OS.has_feature("web"):
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		hud.text = WALK_KEYS + "   Click to look"
	else:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		hud.text = WALK_KEYS + "   Mouse Look"

func _build_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	var panel := PanelContainer.new()
	panel.position = Vector2(18, 16)
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var surface := StyleBoxFlat.new()
	surface.bg_color = Color(0.035, 0.07, 0.087, 0.86)
	surface.border_color = Color(0.51, 0.70, 0.64, 0.60)
	surface.set_border_width_all(1)
	surface.set_corner_radius_all(8)
	surface.content_margin_left = 13
	surface.content_margin_right = 13
	surface.content_margin_top = 8
	surface.content_margin_bottom = 8
	panel.add_theme_stylebox_override("panel", surface)
	layer.add_child(panel)
	var rows := VBoxContainer.new()
	rows.mouse_filter = Control.MOUSE_FILTER_IGNORE
	rows.add_theme_constant_override("separation", 2)
	panel.add_child(rows)
	var title := Label.new()
	title.text = "GUC  /  CAMPUS"
	title.add_theme_font_size_override("font_size", 13)
	title.add_theme_color_override("font_color", Color("#aad5bd"))
	rows.add_child(title)
	hud = Label.new()
	hud.add_theme_font_size_override("font_size", 14)
	hud.add_theme_color_override("font_color", Color("#eff6f4"))
	hud.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	rows.add_child(hud)
	var fit_hud := func() -> void:
		var available := get_viewport().get_visible_rect().size.x - panel.position.x * 2.0
		var font := hud.get_theme_font("font")
		var font_size := hud.get_theme_font_size("font_size")
		var text_width := font.get_string_size(hud.text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x
		var padding := surface.content_margin_left + surface.content_margin_right
		var preferred := maxf(128.0, ceilf(text_width) + padding + 1.0)
		panel.size = Vector2(minf(preferred, available), panel.get_combined_minimum_size().y)
	get_viewport().size_changed.connect(fit_hud, CONNECT_DEFERRED)
	hud.minimum_size_changed.connect(fit_hud, CONNECT_DEFERRED)
	fit_hud.call()

func _refine_sports_infields() -> void:
	var infields: Array[Dictionary] = []
	for feature in camp.get("sports", []):
		if feature.get("cat") != "secondary":
			continue
		for ring in feature.get("r", []):
			if ring.size() < 4:
				continue
			var outline := PackedVector2Array()
			var center := Vector2.ZERO
			for vertex in ring:
				var position := Vector2(vertex[0], vertex[1])
				outline.append(position)
				center += position
			center /= float(ring.size())
			var area := 0.0
			for i in outline.size():
				area += outline[i].cross(outline[(i + 1) % outline.size()])
			infields.append({"ring": ring, "outline": outline, "center": center, "area": absf(area)})
	infields.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return a.area < b.area)
	var centers: Array[Vector2] = []
	var field := StandardMaterial3D.new()
	field.albedo_color = Color("#49643b")
	field.metallic_specular = 0.15
	field.roughness = 0.95
	field.cull_mode = BaseMaterial3D.CULL_DISABLED
	for entry in infields:
		# Each facility has nested secondary rings. Its smallest ring is the infield.
		var has_infield := false
		for center in centers:
			if Geometry2D.is_point_in_polygon(center, entry.outline):
				has_infield = true
				break
		if has_infield:
			continue
		var ring: Array = entry.ring.duplicate()
		if ring[0] == ring[-1]:
			ring.pop_back()
		var mesh := _polygon_mesh(ring, 0.187, field)
		if mesh:
			mesh.name = "Sports infield"
			mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			add_child(mesh)
			centers.append(entry.center)

func _build_scenery() -> void:
	var data: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://data/campus-surfaces.json"))
	var surfaces: Dictionary = data if data is Dictionary else {}
	if use_glb:
		_refine_sports_infields()
	var shore := SHORE_SCENERY.new()
	shore.name = "Lakeshores"
	add_child(shore)
	shore.build(camp)
	var streets := STREET_SCENERY.new()
	streets.name = "Walkways and street furniture"
	add_child(streets)
	streets.build(camp, surfaces)
	var landscape := LANDSCAPE_SCENERY.new()
	landscape.name = "Campus planting"
	add_child(landscape)
	landscape.build(camp, surfaces)

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_M:
		_toggle_free_cam()
	if not free_on and event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
			hud.text = WALK_KEYS + "   Mouse Look"
	if free_on and event is InputEventMouseMotion and (event.button_mask & MOUSE_BUTTON_MASK_RIGHT):
		free_yaw -= event.relative.x * 0.005
		free_pitch = clamp(free_pitch - event.relative.y * 0.005, 0.12, 1.5)
	if free_on and event is InputEventMouseButton:
		if event.pressed and event.button_index == MOUSE_BUTTON_WHEEL_UP:
			free_dist = max(80.0, free_dist * 0.88)
		if event.pressed and event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			free_dist = min(3200.0, free_dist * 1.12)
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED and not free_on:
		player.rotate_y(-event.relative.x * 0.0022)
		pitch = clamp(pitch - event.relative.y * 0.0018, -0.9, 0.4)
		cam.rotation.x = pitch

func _physics_process(delta: float) -> void:
	if free_on:
		player.velocity = Vector3.ZERO
		var fwd := Vector3(-sin(free_yaw), 0, -cos(free_yaw))
		var right := Vector3(cos(free_yaw), 0, -sin(free_yaw))
		var spd := 260.0 * delta
		if Input.is_key_pressed(KEY_W): free_target += fwd * spd
		if Input.is_key_pressed(KEY_S): free_target -= fwd * spd
		if Input.is_key_pressed(KEY_D): free_target += right * spd
		if Input.is_key_pressed(KEY_A): free_target -= right * spd
		if Input.is_key_pressed(KEY_E): free_target.y += spd
		if Input.is_key_pressed(KEY_Q): free_target.y -= spd
		var off := Vector3(cos(free_pitch) * sin(free_yaw), sin(free_pitch), cos(free_pitch) * cos(free_yaw)) * free_dist
		free_cam.set_cull_mask_value(DETAIL_LAYER, free_dist < 675.0)
		free_cam.near = maxf(1.0, free_dist * 0.033)
		free_cam.far = maxf(2300.0, free_dist + 1950.0)
		free_cam.global_position = free_target + off
		free_cam.look_at(free_target, Vector3.UP)
		return
	var input := Vector3.ZERO
	if Input.is_key_pressed(KEY_W): input.z -= 1
	if Input.is_key_pressed(KEY_S): input.z += 1
	if Input.is_key_pressed(KEY_A): input.x -= 1
	if Input.is_key_pressed(KEY_D): input.x += 1
	if input.length() > 0:
		input = input.normalized()
	var dir := player.transform.basis * input
	var speed := 5.0
	if Input.is_key_pressed(KEY_SHIFT): speed = 9.0
	player.velocity.x = dir.x * speed
	player.velocity.z = dir.z * speed
	if not player.is_on_floor():
		player.velocity.y -= 20.0 * delta
	if Input.is_key_pressed(KEY_SPACE) and player.is_on_floor():
		player.velocity.y = 6.0
	player.move_and_slide()
	if anim_player:
		var moving_now := input.length() > 0.1
		var target_anim := anim_idle if not moving_now else (anim_run if Input.is_key_pressed(KEY_SHIFT) else anim_walk)
		if moving_now:
			anim_player.speed_scale = clamp(speed / 4.6, 0.8, 1.6)
		if target_anim != "" and anim_player.current_animation != target_anim:
			anim_player.play(target_anim)

func _update_camera_collision() -> void:
	if cam == null or player == null:
		return
	var space := get_world_3d().direct_space_state
	var from := player.global_position + Vector3(0, 1.88, 0)
	var back := player.global_transform.basis.z.normalized()
	var want := FOLLOW_DISTANCE
	var to := from + back * want
	var query := PhysicsRayQueryParameters3D.create(from, to, 1, [player.get_rid()])
	var hit := space.intersect_ray(query)
	if hit.is_empty():
		cam.position.z = lerp(cam.position.z, want, 0.25)
	else:
		var dist: float = from.distance_to(hit.position) - 0.35
		cam.position.z = lerp(cam.position.z, clamp(dist, 0.9, want), 0.35)

func _process(_delta: float) -> void:
	if not free_on:
		_update_camera_collision()
	frames += 1
	if shot_path != "" and frames == 25 and anim_player and anim_walk != "":
		anim_player.play(anim_walk)
		anim_player.seek(0.35, true)
	if shot_path != "" and frames == 45:
		await RenderingServer.frame_post_draw
		var img := get_viewport().get_texture().get_image()
		img.save_png(shot_path)
		get_tree().quit()
