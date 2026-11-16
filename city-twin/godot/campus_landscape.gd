extends Node3D

const CELL_SIZE := 48.0
const DETAIL_CELL_SIZE := 160.0
const MAX_TREES := 320
const MAX_SHRUBS := 350
const MAX_GROUND_COVER := 450
const ARRIVAL_PATHS := [
	Rect2(190.0, 345.0, 27.0, 58.0),
	Rect2(201.5, 336.0, 5.5, 74.0),
	Rect2(185.7, 400.9, 39.6, 3.3),
]

const ROAD_WIDTHS := {
	"primary": 11.0, "secondary": 9.0, "tertiary": 8.0,
	"living_street": 6.0, "service": 5.0, "path": 3.0, "pedestrian": 3.0
}
const GREEN_TINTS := [
	Color("#98ac79"), Color("#a1ad71"), Color("#84a66e"), Color("#8eb083")
]
const AUTUMN_TINTS := [Color("#cda05c"), Color("#cb8e55"), Color("#b5ab67")]

enum Plant { BROADLEAF, GINKGO, CONIFER, SHRUB, TUFT }

var rng := RandomNumberGenerator.new()
var blocked: Dictionary = {}
var trees: Dictionary = {}
var batches: Dictionary = {}
var tree_count := 0
var shrub_count := 0
var cover_count := 0

func build(campus: Dictionary, surfaces: Dictionary) -> void:
	rng.seed = 20261116
	_index_obstacles(campus, surfaces)
	# The campus GLB already supplies the original trees at official point positions.
	for point in campus.get("trees", []):
		_track_tree(Vector2(point[0], point[1]))
	for parcel in surfaces.get("green", []):
		var rings: Array = parcel.get("r", [])
		if rings.is_empty():
			continue
		var outer := _polygon(rings[0])
		if outer.size() < 3:
			continue
		var holes: Array[PackedVector2Array] = []
		for index in range(1, rings.size()):
			holes.append(_polygon(rings[index]))
		_plant_parcel(outer, holes)
	_make_batches()
	blocked.clear()
	trees.clear()
	batches.clear()

func _polygon(points: Array) -> PackedVector2Array:
	var polygon := PackedVector2Array()
	for point in points:
		polygon.append(Vector2(point[0], point[1]))
	if polygon.size() > 1 and polygon[0] == polygon[-1]:
		polygon.remove_at(polygon.size() - 1)
	return polygon

func _bounds(polygon: PackedVector2Array) -> Rect2:
	var rect := Rect2(polygon[0], Vector2.ZERO)
	for point in polygon:
		rect = rect.expand(point)
	return rect

func _cell(point: Vector2, size: float) -> Vector2i:
	return Vector2i(floori(point.x / size), floori(point.y / size))

func _index(bounds: Rect2, item: Dictionary) -> void:
	var first := _cell(bounds.position, CELL_SIZE)
	var last := _cell(bounds.end, CELL_SIZE)
	for y in range(first.y, last.y + 1):
		for x in range(first.x, last.x + 1):
			var cell := Vector2i(x, y)
			if not blocked.has(cell):
				blocked[cell] = []
			blocked[cell].append(item)

func _block_polygon(points: Array, edge: float = 0.0) -> void:
	var polygon := _polygon(points)
	if polygon.size() < 3:
		return
	var bounds := _bounds(polygon).grow(edge + 4.0)
	_index(bounds, {"polygon": polygon, "bounds": bounds, "edge": edge})

func _index_obstacles(campus: Dictionary, surfaces: Dictionary) -> void:
	for area_type in ["buildings", "sports"]:
		for item in campus.get(area_type, []):
			# Small field markings sit in the footprints of the outer play areas.
			if area_type == "sports" and item.get("cat", "") == "inner":
				continue
			var rings: Array = item.get("r", [])
			if not rings.is_empty():
				_block_polygon(rings[0], 0.7)
	for ring in campus.get("water", []):
		_block_polygon(ring, 1.5)
	for area_type in ["paving", "parkingAreas"]:
		for item in surfaces.get(area_type, []):
			var rings: Array = item.get("r", [])
			if not rings.is_empty():
				_block_polygon(rings[0])
	for road in campus.get("roads", []):
		# The GLB adds 1.8 m of sidewalk to the width of each road.
		var margin: float = float(ROAD_WIDTHS.get(road.get("w", ""), 4.0)) * 0.5 + 1.0
		for line in road.get("l", []):
			for index in range(1, line.size()):
				var a := Vector2(line[index - 1][0], line[index - 1][1])
				var b := Vector2(line[index][0], line[index][1])
				var bounds := Rect2(a, Vector2.ZERO).expand(b).grow(margin + 4.0)
				_index(bounds, {"a": a, "b": b, "bounds": bounds, "edge": margin})

func _near_edge(point: Vector2, polygon: PackedVector2Array, radius: float) -> bool:
	var limit := radius * radius
	for index in polygon.size():
		var closest := Geometry2D.get_closest_point_to_segment(
			point, polygon[index], polygon[(index + 1) % polygon.size()]
		)
		if point.distance_squared_to(closest) < limit:
			return true
	return false

func _fits(point: Vector2, radius: float, outer: PackedVector2Array, holes: Array[PackedVector2Array]) -> bool:
	for path in ARRIVAL_PATHS:
		if path.grow(radius).has_point(point):
			return false
	if not Geometry2D.is_point_in_polygon(point, outer) or _near_edge(point, outer, radius):
		return false
	for hole in holes:
		if Geometry2D.is_point_in_polygon(point, hole) or _near_edge(point, hole, radius):
			return false
	for feature in blocked.get(_cell(point, CELL_SIZE), []):
		var bounds: Rect2 = feature.bounds
		if not bounds.has_point(point):
			continue
		var clearance: float = radius + feature.edge
		if feature.has("polygon"):
			var polygon: PackedVector2Array = feature.polygon
			if Geometry2D.is_point_in_polygon(point, polygon) or _near_edge(point, polygon, clearance):
				return false
		else:
			var nearest := Geometry2D.get_closest_point_to_segment(point, feature.a, feature.b)
			if point.distance_squared_to(nearest) < clearance * clearance:
				return false
	return true

func _track_tree(point: Vector2) -> void:
	var cell := _cell(point, CELL_SIZE)
	if not trees.has(cell):
		trees[cell] = []
	trees[cell].append(point)

func _tree_clear(point: Vector2, spacing: float) -> bool:
	var first := _cell(point - Vector2.ONE * spacing, CELL_SIZE)
	var last := _cell(point + Vector2.ONE * spacing, CELL_SIZE)
	for y in range(first.y, last.y + 1):
		for x in range(first.x, last.x + 1):
			for existing in trees.get(Vector2i(x, y), []):
				if point.distance_squared_to(existing) < spacing * spacing:
					return false
	return true

func _sample(bounds: Rect2) -> Vector2:
	return Vector2(rng.randf_range(bounds.position.x, bounds.end.x), rng.randf_range(bounds.position.y, bounds.end.y))

func _district(point: Vector2) -> int:
	if point.y > 245.0 and point.x > 35.0 and point.x < 375.0:
		return 0 # South campus entrance and academic approach
	if point.y > -175.0 and point.y < 130.0 and point.x > 115.0 and point.x < 460.0:
		return 1 # Library and lakeside
	if point.y < -270.0:
		return 2 # Residence courts
	return 3

func _plant_parcel(outer: PackedVector2Array, holes: Array[PackedVector2Array]) -> void:
	var bounds := _bounds(outer)
	var area := 0.0
	for index in outer.size():
		area += outer[index].cross(outer[(index + 1) % outer.size()])
	area = absf(area) * 0.5
	var district := _district(bounds.get_center())
	if district == 0 and bounds.encloses(ARRIVAL_PATHS[0]):
		_plant_arrival_edges(outer, holes)
	var tree_spacing := 9.0 if district == 2 else 12.0
	var tree_density := [1050.0, 1220.0, 1530.0, 2180.0]
	var tree_target := mini(34, floori(area / tree_density[district]))
	if area > 140.0 and area < 1200.0 and rng.randf() < area / 1200.0:
		tree_target = maxi(1, tree_target)
	var placed := 0
	for attempt in tree_target * 8:
		if placed >= tree_target or tree_count >= MAX_TREES:
			break
		var point := _sample(bounds)
		var size := rng.randf_range(0.72, 1.25)
		if not _tree_clear(point, tree_spacing * size) or not _fits(point, 3.1 * size, outer, holes):
			continue
		var chance := rng.randf()
		var ginkgo_share := 0.30 if district <= 1 else 0.10
		var species := Plant.GINKGO if chance < ginkgo_share else Plant.CONIFER if chance > 0.79 else Plant.BROADLEAF
		var color: Color = Color("#a5ad86") if species == Plant.CONIFER else GREEN_TINTS[rng.randi_range(0, GREEN_TINTS.size() - 1)]
		if species == Plant.GINKGO and rng.randf() < 0.68:
			color = AUTUMN_TINTS[rng.randi_range(0, AUTUMN_TINTS.size() - 1)]
		_add_plant(species, point, Vector3(size, size * rng.randf_range(0.90, 1.18), size), color, rng.randf_range(0.0, TAU))
		_track_tree(point)
		placed += 1
		tree_count += 1

	if (district == 0 or district == 2) and area > 30.0 and area < 1600.0:
		_plant_hedge(outer, holes)
	var patch_target := mini(6, floori(area / (460.0 if district <= 1 else 980.0)))
	for attempt in patch_target * 2:
		if shrub_count >= MAX_SHRUBS and cover_count >= MAX_GROUND_COVER:
			break
		var point := _sample(bounds)
		if not _fits(point, 1.15, outer, holes):
			continue
		for member in rng.randi_range(2, 4):
			var angle := rng.randf_range(0.0, TAU)
			var position := point + Vector2.from_angle(angle) * rng.randf_range(0.5, 2.8)
			var shrub := member == 0 or (member == 1 and district != 1)
			if (shrub and shrub_count >= MAX_SHRUBS) or (not shrub and cover_count >= MAX_GROUND_COVER):
				continue
			var size := rng.randf_range(0.60, 1.24)
			if not _fits(position, size * (1.08 if shrub else 0.46), outer, holes):
				continue
			var color: Color = GREEN_TINTS[rng.randi_range(0, GREEN_TINTS.size() - 1)]
			if shrub:
				_add_plant(Plant.SHRUB, position, Vector3(size, size, size), color, angle)
				shrub_count += 1
			else:
				_add_plant(Plant.TUFT, position, Vector3(size, rng.randf_range(0.65, 1.4), size), color, angle)
				cover_count += 1

func _plant_arrival_edges(outer: PackedVector2Array, holes: Array[PackedVector2Array]) -> void:
	var path: Rect2 = ARRIVAL_PATHS[0]
	# This long lawn has narrow planted edges and a clear route through the center.
	for index in 6:
		var point := Vector2(path.end.x + 4.0, path.position.y + 3.0 + index * 9.1)
		var size := rng.randf_range(0.65, 0.80)
		if tree_count >= MAX_TREES or not _tree_clear(point, 7.0) or not _fits(point, 3.1 * size, outer, holes):
			continue
		var species := Plant.GINKGO if index % 3 == 1 else Plant.BROADLEAF
		var tint: Color = AUTUMN_TINTS[index % AUTUMN_TINTS.size()] if species == Plant.GINKGO else GREEN_TINTS[index % GREEN_TINTS.size()]
		_add_plant(species, point, Vector3(size, size * 1.1, size), tint, rng.randf_range(0.0, TAU))
		_track_tree(point)
		tree_count += 1
	for index in 16:
		var x := path.position.x - 2.0 if index % 2 == 0 else path.end.x + 2.1
		var row := floori(index * 0.5)
		var point := Vector2(x, path.position.y + 4.0 + row * 6.8)
		if shrub_count < MAX_SHRUBS and _fits(point, 0.94, outer, holes):
			_add_plant(Plant.SHRUB, point, Vector3(0.85, 0.76, 0.77), GREEN_TINTS[index % GREEN_TINTS.size()], 0.5)
			shrub_count += 1

func _plant_hedge(outer: PackedVector2Array, holes: Array[PackedVector2Array]) -> void:
	var longest := 0.0
	var start := Vector2.ZERO
	var end := Vector2.ZERO
	for index in outer.size():
		var a := outer[index]
		var b := outer[(index + 1) % outer.size()]
		var length := a.distance_to(b)
		if length > longest:
			longest = length
			start = a
			end = b
	if longest < 10.0:
		return
	var direction := (end - start) / longest
	var inward := Vector2(-direction.y, direction.x)
	if not Geometry2D.is_point_in_polygon(start.lerp(end, 0.5) + inward * 1.5, outer):
		inward = -inward
	var count := mini(7, floori((longest - 4.0) / 1.8))
	var first := start.lerp(end, 0.5) - direction * (count - 1) * 0.9 + inward * 1.5
	for index in count:
		if shrub_count >= MAX_SHRUBS:
			return
		var point := first + direction * (index * 1.8)
		if _fits(point, 1.24, outer, holes):
			_add_plant(Plant.SHRUB, point, Vector3(1.16, 0.79, 0.76), Color("#879d6e"), -direction.angle())
			shrub_count += 1

func _add_plant(kind: int, point: Vector2, scale: Vector3, color: Color, yaw: float) -> void:
	var tile := Vector2i.ZERO if kind <= Plant.CONIFER else _cell(point, DETAIL_CELL_SIZE)
	var key := Vector3i(kind, tile.x, tile.y)
	if not batches.has(key):
		batches[key] = []
	var basis := Basis(Vector3.UP, yaw) * Basis.from_scale(scale)
	batches[key].append([Transform3D(basis, Vector3(point.x, 0.026, point.y)), color])

func _make_batches() -> void:
	var material := StandardMaterial3D.new()
	material.roughness = 0.96
	material.vertex_color_use_as_albedo = true
	material.cull_mode = BaseMaterial3D.CULL_DISABLED
	var meshes: Array[ArrayMesh] = []
	for kind in range(Plant.size()):
		meshes.append(_plant_mesh(kind, material))
	for key: Vector3i in batches:
		var samples: Array = batches[key]
		var group := MultiMesh.new()
		group.transform_format = MultiMesh.TRANSFORM_3D
		group.use_colors = true
		group.mesh = meshes[key.x]
		group.instance_count = samples.size()
		for index in samples.size():
			group.set_instance_transform(index, samples[index][0])
			group.set_instance_color(index, samples[index][1])
		var instance := MultiMeshInstance3D.new()
		instance.multimesh = group
		if key.x == Plant.TUFT or key.x == Plant.SHRUB:
			instance.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			instance.visibility_range_end = 175.0 if key.x == Plant.TUFT else 330.0
		add_child(instance)

func _plant_mesh(kind: int, material: Material) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_material(material)
	var leaf := Color("#82ac53")
	var bark := Color("#756149")
	if kind == Plant.BROADLEAF:
		_wood(st, Vector3.ZERO, Vector3(0.18, 4.1, -0.12), 0.24, 0.10, bark)
		_wood(st, Vector3(0.11, 2.28, 0.0), Vector3(-1.55, 3.74, 0.44), 0.11, 0.042, bark)
		_wood(st, Vector3(0.15, 2.84, 0.0), Vector3(1.58, 4.05, 0.16), 0.10, 0.036, bark)
		_lobe(st, Vector3(0.0, 4.67, -0.25), Vector3(2.1, 1.89, 1.8), leaf)
		_lobe(st, Vector3(-1.37, 3.72, 0.28), Vector3(1.47, 1.24, 1.44), leaf.darkened(0.13))
		_lobe(st, Vector3(1.35, 4.27, 0.34), Vector3(1.36, 1.47, 1.21), leaf.lightened(0.04))
		_lobe(st, Vector3(0.14, 4.96, 1.04), Vector3(1.28, 1.17, 1.32), leaf.darkened(0.04))
	elif kind == Plant.GINKGO:
		_wood(st, Vector3.ZERO, Vector3(-0.20, 5.4, 0.04), 0.20, 0.065, bark)
		_wood(st, Vector3(-0.10, 2.58, 0.04), Vector3(1.43, 4.29, -0.22), 0.10, 0.026, bark)
		leaf = Color("#c2be89")
		_lobe(st, Vector3(-0.24, 5.33, 0.12), Vector3(1.44, 2.24, 1.43), leaf)
		_lobe(st, Vector3(0.99, 4.20, -0.16), Vector3(1.36, 1.44, 1.17), leaf.darkened(0.09))
		_lobe(st, Vector3(-1.03, 4.57, 0.53), Vector3(1.16, 1.57, 1.05), leaf.lightened(0.025))
	elif kind == Plant.CONIFER:
		_wood(st, Vector3.ZERO, Vector3(0.04, 5.6, 0.01), 0.19, 0.035, bark)
		var needle := Color("#527751")
		for tier in 3:
			var base := 1.65 + tier * 1.36
			var width := 1.98 - tier * 0.43
			_wood(st, Vector3(0.0, base, 0.0), Vector3(0.05, base + 2.85, -0.07), width, 0.06, needle.lightened(0.035 * tier))
	elif kind == Plant.SHRUB:
		_lobe(st, Vector3(0.0, 0.44, 0.0), Vector3(0.67, 0.49, 0.57), leaf.darkened(0.18))
		_lobe(st, Vector3(-0.43, 0.35, 0.08), Vector3(0.54, 0.41, 0.49), leaf.darkened(0.23))
		_lobe(st, Vector3(0.46, 0.39, -0.05), Vector3(0.50, 0.48, 0.47), leaf.darkened(0.12))
	else:
		for index in 6:
			var heading := Vector2.from_angle(index * TAU / 6.0)
			var base := Vector3(heading.x, 0.0, heading.y) * 0.07
			var side := Vector3(-heading.y, 0.0, heading.x) * 0.07
			var middle := base + Vector3(heading.x * 0.19, 0.34, heading.y * 0.19)
			var tip := base + Vector3(heading.x * 0.31, 0.48 + 0.04 * posmod(index, 3), heading.y * 0.31)
			var stem := leaf.darkened(0.25)
			_triangle(st, base - side, base + side, middle + side * 0.50, stem, leaf)
			_triangle(st, base - side, middle + side * 0.50, middle - side * 0.50, stem, leaf)
			_triangle(st, middle - side * 0.50, middle + side * 0.50, tip, leaf, leaf.lightened(0.15))
	return st.commit()

func _lobe(st: SurfaceTool, center: Vector3, radii: Vector3, color: Color) -> void:
	const SEGMENTS := 7
	const RINGS := 4
	for row in RINGS:
		for column in SEGMENTS:
			var a := _sphere_point(row, column, RINGS, SEGMENTS)
			var b := _sphere_point(row, column + 1, RINGS, SEGMENTS)
			var c := _sphere_point(row + 1, column + 1, RINGS, SEGMENTS)
			var d := _sphere_point(row + 1, column, RINGS, SEGMENTS)
			if row > 0:
				_leaf_vertex(st, a, center, radii, color)
				_leaf_vertex(st, b, center, radii, color)
				_leaf_vertex(st, c, center, radii, color)
			if row < RINGS - 1:
				_leaf_vertex(st, a, center, radii, color)
				_leaf_vertex(st, c, center, radii, color)
				_leaf_vertex(st, d, center, radii, color)

func _sphere_point(row: int, column: int, rings: int, segments: int) -> Vector3:
	var latitude := PI * (float(row) / rings - 0.5)
	var longitude := TAU * posmod(column, segments) / segments
	return Vector3(cos(longitude) * cos(latitude), sin(latitude), sin(longitude) * cos(latitude))

func _leaf_vertex(st: SurfaceTool, direction: Vector3, center: Vector3, ellipsoid: Vector3, color: Color) -> void:
	var roughness := 1.0 + 0.085 * sin(direction.x * 14.0 + direction.y * 9.0 + direction.z * 12.0)
	st.set_normal((direction / ellipsoid).normalized())
	st.set_color(color.darkened(0.26 * (1.0 - direction.y) * 0.5))
	st.add_vertex(center + direction * ellipsoid * roughness)

func _wood(st: SurfaceTool, start: Vector3, end: Vector3, base: float, tip: float, color: Color) -> void:
	var axis := (end - start).normalized()
	var u := axis.cross(Vector3.FORWARD).normalized()
	var v := axis.cross(u)
	for side in 7:
		var first := TAU * float(side) / 7.0
		var next := TAU * float(side + 1) / 7.0
		var a := u * cos(first) + v * sin(first)
		var b := u * cos(next) + v * sin(next)
		var bottom := color.darkened(0.27 if base > 1.0 else 0.13)
		_triangle(st, start + a * base, end + a * tip, start + b * base, bottom, color)
		_triangle(st, start + b * base, end + a * tip, end + b * tip, color, color)
		if base >= 0.85:
			# Evergreens have full lower skirts so they stay opaque from below.
			_triangle(st, start, start + a * base, start + b * base, bottom, bottom)

func _triangle(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, base: Color, top: Color) -> void:
	st.set_normal((c - a).cross(b - a).normalized())
	st.set_color(base)
	st.add_vertex(a)
	st.set_color(top)
	st.add_vertex(b)
	st.add_vertex(c)
