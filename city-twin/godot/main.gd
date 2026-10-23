extends Node3D

var camp: Dictionary = {}
var player: CharacterBody3D
var cam: Camera3D
var pitch: float = -0.06
var frames: int = 0
var shot_path: String = ""
var use_glb: bool = false
var anim_player: AnimationPlayer
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
	_build_ground()
	if not use_glb:
		_build_water()
		_build_roads()
	_build_buildings(not use_glb)
	if not use_glb:
		_build_trees()
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
	if not FileAccess.file_exists(path):
		return false
	var doc := GLTFDocument.new()
	var state := GLTFState.new()
	var err := doc.append_from_file(path, state)
	if err != OK:
		push_warning("GLB load failed: " + str(err))
		return false
	var root := doc.generate_scene(state)
	if root == null:
		return false
	add_child(root)
	_fix_glb_materials(root)
	return true


func _fix_glb_materials(root: Node) -> void:
	for mi in root.find_children("*", "MeshInstance3D", true, false):
		var n := String(mi.name)
		var mat := StandardMaterial3D.new()
		if n.begins_with("WATER"):
			mat.albedo_color = Color(0.13, 0.32, 0.42)
			mat.metallic = 0.35
			mat.roughness = 0.12
		elif n.begins_with("ROAD"):
			mat.albedo_color = Color(0.30, 0.31, 0.33)
			mat.roughness = 0.95
		elif n.begins_with("PARAPET") or n.begins_with("PAR_"):
			mat.albedo_color = Color(0.72, 0.72, 0.70)
			mat.roughness = 0.8
		elif n.begins_with("BLD"):
			mat.albedo_color = Color(0.90, 0.88, 0.84)
			mat.albedo_texture = _window_texture()
			mat.uv1_triplanar = true
			mat.uv1_scale = Vector3(0.075, 0.075, 0.075)
			mat.roughness = 0.7
		elif n.begins_with("Cylinder"):
			mat.albedo_color = Color(0.26, 0.18, 0.12)
			mat.roughness = 0.95
		elif n.begins_with("Icosphere"):
			mat.albedo_color = Color(0.17, 0.30, 0.13).lerp(Color(0.30, 0.42, 0.16), fmod(float(n.length()) * 0.37, 1.0))
			mat.roughness = 0.95
		elif n.begins_with("Plane"):
			mat.albedo_color = Color(0.95, 0.95, 0.95)
			mat.albedo_texture = _ground_texture()
			mat.uv1_triplanar = true
			mat.uv1_scale = Vector3(0.09, 0.09, 0.09)
			mat.roughness = 0.95
		else:
			continue
		mi.material_override = mat

func _build_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color(0.16, 0.38, 0.62)
	sky_mat.sky_horizon_color = Color(0.72, 0.83, 0.90)
	sky_mat.ground_bottom_color = Color(0.22, 0.26, 0.22)
	sky_mat.ground_horizon_color = Color(0.55, 0.62, 0.55)
	sky.sky_material = sky_mat
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.95
	env.ssao_enabled = true
	env.ssao_intensity = 1.6
	env.ssao_radius = 1.2
	env.glow_enabled = true
	env.glow_intensity = 0.35
	env.glow_bloom = 0.12
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = 0.82
	env.fog_enabled = true
	env.fog_light_color = Color(0.72, 0.82, 0.90)
	env.fog_density = 0.0008
	env.fog_sky_affect = 0.3
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-48, -32, 0)
	sun.light_energy = 1.6
	sun.light_color = Color(1.0, 0.95, 0.87)
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 420.0
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
	add_child(sun)
	var fill := DirectionalLight3D.new()
	fill.rotation_degrees = Vector3(-35, 150, 0)
	fill.light_energy = 0.5
	fill.light_color = Color(0.72, 0.82, 0.95)
	fill.shadow_enabled = false
	add_child(fill)

func _build_ground() -> void:
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
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.13, 0.34, 0.44)
	mat.metallic = 0.45
	mat.roughness = 0.08
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color.a = 0.92
	for ring in camp.get("water", []):
		var mesh := _polygon_mesh(ring, 0.06, mat)
		if mesh:
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
	player.position = Vector3(204, 1.2, 350)
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
	cam.position = Vector3(0.55, 2.05, 4.4)
	cam.fov = 64
	cam.rotation.x = -0.06
	player.add_child(cam)
	add_child(player)
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _load_player_model() -> Node3D:
	var path := "res://assets/player.glb"
	if not FileAccess.file_exists(path):
		return null
	var doc := GLTFDocument.new()
	var st := GLTFState.new()
	if doc.append_from_file(path, st) != OK:
		return null
	var root := doc.generate_scene(st)
	if root == null:
		return null
	anim_player = root.find_child("*AnimationPlayer*", true, false) as AnimationPlayer
	if anim_player:
		for an in anim_player.get_animation_list():
			var low := String(an).to_lower()
			if low.contains("walk"):
				anim_walk = an
			elif low.contains("run"):
				anim_run = an
			elif low.contains("idle"):
				anim_idle = an
		if anim_idle != "":
			anim_player.play(anim_idle)
	return root

func _tri(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3) -> void:
	st.add_vertex(a)
	st.add_vertex(b)
	st.add_vertex(c)

func _input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		player.rotate_y(-event.relative.x * 0.0022)
		pitch = clamp(pitch - event.relative.y * 0.0018, -0.9, 0.4)
		cam.rotation.x = pitch

func _physics_process(delta: float) -> void:
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
		if target_anim != "" and anim_player.current_animation != target_anim:
			anim_player.play(target_anim)

func _update_camera_collision() -> void:
	if cam == null or player == null:
		return
	var space := get_world_3d().direct_space_state
	var from := player.global_position + Vector3(0, 1.55, 0)
	var back := player.global_transform.basis.z.normalized()
	var want := 4.4
	var to := from + back * want
	var query := PhysicsRayQueryParameters3D.create(from, to, 1, [player.get_rid()])
	var hit := space.intersect_ray(query)
	if hit.is_empty():
		cam.position.z = lerp(cam.position.z, want, 0.25)
	else:
		var dist: float = from.distance_to(hit.position) - 0.35
		cam.position.z = lerp(cam.position.z, clamp(dist, 0.9, want), 0.35)

func _process(_delta: float) -> void:
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
