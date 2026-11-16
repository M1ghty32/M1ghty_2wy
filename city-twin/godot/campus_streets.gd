extends Node3D

const STONE_TEXTURE: Texture2D = preload("res://assets/campus_concrete_diff.jpg")

const WALK_X := 204.4
const WALK_EDGE := 1.55
const NORTH_END := 335.45
const SOUTH_END := 409.65
const WEST_CROSS_Z := 402.8
const EAST_CROSS_Z := 402.3
const PALETTE := {
	"Walkway": Color(0.76, 0.74, 0.67),
	"Joints": Color(0.48, 0.45, 0.40),
	"Edge stone": Color(0.37, 0.35, 0.31),
	"Traffic paint": Color(0.88, 0.87, 0.76),
	"Tactile paving": Color(0.73, 0.50, 0.18),
	"Sandstone": Color(0.55, 0.49, 0.40),
	"Enamel": Color(0.075, 0.15, 0.18),
	"Timber": Color(0.49, 0.27, 0.15),
	"Brass": Color(0.80, 0.58, 0.28),
}
const FLAT_BATCHES := ["Walkway", "Joints", "Traffic paint", "Tactile paving"]
var _parts: Dictionary = {}


func build(campus: Dictionary, surfaces: Dictionary) -> void:
	if not _in_lawn(Vector2(204.0, 380.0), surfaces):
		return

	_lawn_walkway()
	_seat(Vector3(199.5, 0.09, 371.6), PI * 0.5)
	_seat(Vector3(209.5, 0.09, 367.0), -PI * 0.5)
	_main_sign(Vector3(198.6, 0.03, 365.9))
	_direction_sign(Vector3(209.4, 0.03, 345.3))

	for z in [351.7, 392.0]:
		_bollard(Vector3(WALK_X - 1.87, 0.03, z))
		_bollard(Vector3(WALK_X + 1.87, 0.03, z))

	_add_crossing(campus, WEST_CROSS_Z, 182.9, false)
	_add_crossing(campus, EAST_CROSS_Z, 228.2, false)
	_add_crossing(campus, WALK_X, 332.8, true)
	_emit_batches()


func _in_lawn(point: Vector2, surfaces: Dictionary) -> bool:
	for feature in surfaces.get("green", []):
		var rings: Array = feature.get("r", [])
		if rings.is_empty() or not _in_ring(point, rings[0]):
			continue
		var in_hole := false
		for i in range(1, rings.size()):
			if _in_ring(point, rings[i]):
				in_hole = true
				break
		if not in_hole:
			return true
	return false


func _in_ring(point: Vector2, ring: Array) -> bool:
	var polygon := PackedVector2Array()
	for vertex in ring:
		polygon.append(Vector2(vertex[0], vertex[1]))
	return Geometry2D.is_point_in_polygon(point, polygon)


func _slab(material: String, x0: float, x1: float, z0: float, z1: float, top: float, depth: float) -> void:
	_box(material, Vector3(x1 - x0, depth, z1 - z0),
		Vector3((x0 + x1) * 0.5, top - depth * 0.5, (z0 + z1) * 0.5))


func _lawn_walkway() -> void:
	var left := WALK_X - WALK_EDGE
	var right := WALK_X + WALK_EDGE
	_slab("Walkway", left, right, NORTH_END, SOUTH_END, 0.091, 0.09)
	_slab("Walkway", 197.9, left, 369.4, 373.8, 0.091, 0.09)
	_slab("Walkway", right, 211.1, 364.8, 369.2, 0.091, 0.09)
	_slab("Walkway", 185.6, left, 401.55, 404.05, 0.091, 0.09)
	_slab("Walkway", right, 225.5, 401.05, 403.55, 0.091, 0.09)

	for span in [Vector2(NORTH_END, 369.4), Vector2(373.8, 401.55), Vector2(404.05, SOUTH_END)]:
		_slab("Edge stone", left - 0.12, left, span.x, span.y, 0.109, 0.10)
	for span in [Vector2(NORTH_END, 364.8), Vector2(369.2, 401.05), Vector2(403.55, SOUTH_END)]:
		_slab("Edge stone", right, right + 0.12, span.x, span.y, 0.109, 0.10)

	for band in range(1, 26):
		var z := NORTH_END + 2.8 * band
		_slab("Joints", left, right, z, z + 0.027, 0.094, 0.004)
	_slab("Joints", WALK_X - 0.015, WALK_X + 0.015, NORTH_END, SOUTH_END, 0.094, 0.004)

	# Low contrast warm inlays pick out the two seating bays without implying another traffic lane.
	_slab("Tactile paving", 197.98, 198.09, 369.5, 373.7, 0.095, 0.006)
	_slab("Tactile paving", 210.91, 211.02, 364.9, 369.1, 0.095, 0.006)


func _seat(origin: Vector3, yaw: float) -> void:
	var basis := Basis(Vector3.UP, yaw)
	for leg in [-0.85, 0.85]:
		_box("Enamel", Vector3(0.10, 0.40, 0.46), origin + basis * Vector3(leg, 0.22, 0), yaw)
		_box("Enamel", Vector3(0.07, 0.56, 0.08), origin + basis * Vector3(leg, 0.63, -0.25), yaw)
	for slat in [-0.193, -0.064, 0.064, 0.193]:
		_box("Timber", Vector3(2.15, 0.075, 0.106), origin + basis * Vector3(0, 0.44, slat), yaw)
	for height in [0.62, 0.76, 0.90]:
		_box("Timber", Vector3(2.15, 0.099, 0.068), origin + basis * Vector3(0, height, -0.25), yaw)

	# The furniture is outside the walk, with one shape per seat to keep contact faithful.
	var body := StaticBody3D.new()
	body.name = "Bench collision"
	body.position = origin + Vector3(0, 0.44, 0)
	body.rotation.y = yaw
	var box := BoxShape3D.new()
	box.size = Vector3(2.15, 0.84, 0.53)
	var collider := CollisionShape3D.new()
	collider.shape = box
	body.add_child(collider)
	add_child(body)


func _main_sign(origin: Vector3) -> void:
	_box("Sandstone", Vector3(3.97, 0.16, 0.68), origin + Vector3(0, 0.08, 0))
	_box("Enamel", Vector3(3.63, 1.37, 0.20), origin + Vector3(0, 1.15, 0))
	for post in [-1.37, 1.37]:
		_box("Enamel", Vector3(0.12, 1.38, 0.13), origin + Vector3(post, 0.70, 0))
	_box("Brass", Vector3(3.35, 0.037, 0.013), origin + Vector3(0, 1.16, 0.109))
	_label("CAMPUS WALK", origin + Vector3(0, 1.48, 0.123), 0.0064)
	_label("LIBRARY  ↑     SOUTH GATE  ↓", origin + Vector3(0, 0.89, 0.123), 0.0032)


func _direction_sign(origin: Vector3) -> void:
	_box("Sandstone", Vector3(0.96, 0.13, 0.58), origin + Vector3(0, 0.065, 0))
	_box("Enamel", Vector3(0.12, 2.04, 0.14), origin + Vector3(0, 1.02, 0))
	_box("Enamel", Vector3(2.66, 0.50, 0.14), origin + Vector3(0, 1.79, 0))
	_box("Brass", Vector3(0.17, 0.50, 0.018), origin + Vector3(-1.245, 1.79, 0.083))
	_label("LIBRARY   ↑", origin + Vector3(0.02, 1.79, 0.093), 0.0035)


func _label(copy: String, point: Vector3, metres_per_pixel: float) -> void:
	var label := Label3D.new()
	label.text = copy
	label.font_size = 64
	label.pixel_size = metres_per_pixel
	label.outline_size = 0
	label.modulate = Color(0.95, 0.92, 0.81)
	label.position = point
	label.visibility_range_end = 34.0
	label.visibility_range_end_margin = 2.0
	add_child(label)


func _bollard(origin: Vector3) -> void:
	_box("Sandstone", Vector3(0.36, 0.13, 0.36), origin + Vector3(0, 0.065, 0))
	_box("Enamel", Vector3(0.20, 0.84, 0.20), origin + Vector3(0, 0.52, 0))
	_box("Brass", Vector3(0.204, 0.060, 0.204), origin + Vector3(0, 0.84, 0))


func _add_crossing(campus: Dictionary, station: float, expected: float, main_road: bool) -> void:
	var actual := _road_coordinate(campus, station, expected, main_road)
	if is_inf(actual):
		return
	var center := Vector2(station, actual) if main_road else Vector2(actual, station)
	var across := Vector2.DOWN if main_road else Vector2.RIGHT
	var yaw := PI * 0.5 if main_road else 0.0
	for index in range(6):
		var stripe := center + across * ((float(index) - 2.5) * 0.82)
		_box("Traffic paint", Vector3(0.43, 0.014, 2.35), Vector3(stripe.x, 0.115, stripe.y), yaw)
	for side in [-1.0, 1.0]:
		var landing := center + across * (float(side) * 3.02)
		_box("Tactile paving", Vector3(0.47, 0.029, 1.63), Vector3(landing.x, 0.086, landing.y), yaw)
		for dot in range(8):
			var inset := (float(dot) - 3.5) * 0.17
			var marker := landing + Vector2(-across.y, across.x) * inset
			_box("Sandstone", Vector3(0.10, 0.022, 0.10), Vector3(marker.x, 0.106, marker.y), yaw)


func _road_coordinate(campus: Dictionary, station: float, expected: float, main_road: bool) -> float:
	var coordinate := INF
	var closest := 1.3
	for road in campus.get("roads", []):
		if road.get("w") != "service" or (main_road and road.get("n") != "中环南路"):
			continue
		for line in road.get("l", []):
			for i in range(line.size() - 1):
				var a := Vector2(line[i][0], line[i][1])
				var b := Vector2(line[i + 1][0], line[i + 1][1])
				var from := a.x if main_road else a.y
				var to := b.x if main_road else b.y
				if is_equal_approx(from, to) or station < minf(from, to) or station > maxf(from, to):
					continue
				var match_coordinate := lerpf(a.y if main_road else a.x, b.y if main_road else b.x, (station - from) / (to - from))
				var delta := absf(match_coordinate - expected)
				if delta < closest:
					closest = delta
					coordinate = match_coordinate
	return coordinate


func _box(batch: String, size: Vector3, point: Vector3, yaw: float = 0.0) -> void:
	if not _parts.has(batch):
		_parts[batch] = []
	var transform := Transform3D(Basis(Vector3.UP, yaw) * Basis.from_scale(size), point)
	_parts[batch].append(transform)


func _emit_batches() -> void:
	for key in _parts:
		var transforms: Array = _parts[key]
		var material := StandardMaterial3D.new()
		material.albedo_color = PALETTE[key]
		material.roughness = 0.90
		if key in ["Walkway", "Edge stone", "Sandstone"]:
			material.albedo_texture = STONE_TEXTURE
			material.uv1_triplanar = true
			material.uv1_world_triplanar = true
			material.uv1_scale = Vector3.ONE / 2.2
			material.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
		var mesh := BoxMesh.new()
		mesh.size = Vector3.ONE
		mesh.material = material
		var instances := MultiMesh.new()
		instances.transform_format = MultiMesh.TRANSFORM_3D
		instances.mesh = mesh
		instances.instance_count = transforms.size()
		for i in range(transforms.size()):
			instances.set_instance_transform(i, transforms[i])
		var node := MultiMeshInstance3D.new()
		node.name = key
		node.multimesh = instances
		if key in FLAT_BATCHES:
			node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		node.visibility_range_end = 175.0
		add_child(node)
	_parts.clear()
