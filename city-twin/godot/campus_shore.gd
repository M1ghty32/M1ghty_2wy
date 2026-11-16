extends Node3D

const PLANT_LIMIT := 145
const WATER_LEVEL := 0.036

func build(campus: Dictionary) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 61203
	var road_sections := _road_sections(campus.get("roads", []))
	var reeds: Array[Transform3D] = []
	var stones: Array[Transform3D] = []
	var reed_colors: Array[Color] = []
	for ring in campus.get("water", []):
		var polygon := PackedVector2Array()
		for vertex in ring:
			polygon.append(Vector2(vertex[0], vertex[1]))
		if polygon.size() < 3 or absf(_signed_area(polygon)) < 1400.0:
			continue
		var distance_to_cluster := rng.randf_range(2.0, 7.0)
		for i in polygon.size():
			var a := polygon[i]
			var b := polygon[(i + 1) % polygon.size()]
			var length := a.distance_to(b)
			if length < 0.01:
				continue
			var direction := (b - a) / length
			var bank_normal := direction.orthogonal()
			while distance_to_cluster < length and reeds.size() < PLANT_LIMIT:
				var edge := a + direction * distance_to_cluster
				distance_to_cluster += rng.randf_range(5.7, 12.8)
				var in_water := edge + bank_normal * 0.92
				if not Geometry2D.is_point_in_polygon(in_water, polygon):
					in_water = edge - bank_normal * 0.92
				if not Geometry2D.is_point_in_polygon(in_water, polygon) or _near_road(in_water, road_sections):
					continue
				var height := rng.randf_range(0.48, 1.21)
				var reed_transform := Basis(Vector3.UP, rng.randf_range(0, TAU)).scaled(Vector3(height, height, height))
				reeds.append(Transform3D(reed_transform, Vector3(in_water.x, WATER_LEVEL, in_water.y)))
				reed_colors.append(Color("#729047").lerp(Color("#b9aa58"), rng.randf()))
				if rng.randf() < 0.42:
					var scale_factor := rng.randf_range(0.21, 0.52)
					var stone_scale := Vector3(1.6, 0.64, 1.05) * scale_factor
					stones.append(Transform3D(Basis(Vector3.UP, rng.randf_range(0, TAU)).scaled(stone_scale),
						Vector3(edge.x + 0.18, 0.11, edge.y - 0.16)))
			distance_to_cluster -= length
	if not reeds.is_empty():
		var reed_mat := StandardMaterial3D.new()
		reed_mat.albedo_color = Color.WHITE
		reed_mat.vertex_color_use_as_albedo = true
		reed_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
		reed_mat.roughness = 0.95
		_add_batch("Lakeside reeds", _reed_mesh(), reed_mat, reeds, reed_colors)
	if not stones.is_empty():
		var stone := SphereMesh.new()
		stone.radius = 1.0
		stone.height = 2.0
		stone.radial_segments = 7
		stone.rings = 4
		var stone_mat := StandardMaterial3D.new()
		stone_mat.albedo_color = Color("#89867a")
		stone_mat.roughness = 0.96
		_add_batch("Bank stones", stone, stone_mat, stones)

func _signed_area(polygon: PackedVector2Array) -> float:
	var total := 0.0
	for i in polygon.size():
		total += polygon[i].cross(polygon[(i + 1) % polygon.size()])
	return total * 0.5

func _road_sections(roads: Array) -> Array[Vector4]:
	var sections: Array[Vector4] = []
	for road in roads:
		for road_line in road.get("l", []):
			for i in range(road_line.size() - 1):
				var a: Array = road_line[i]
				var b: Array = road_line[i + 1]
				sections.append(Vector4(a[0], a[1], b[0], b[1]))
	return sections

func _near_road(point: Vector2, roads: Array[Vector4]) -> bool:
	for road in roads:
		if point.x < minf(road.x, road.z) - 7.0 or point.x > maxf(road.x, road.z) + 7.0:
			continue
		if point.y < minf(road.y, road.w) - 7.0 or point.y > maxf(road.y, road.w) + 7.0:
			continue
		var nearest := Geometry2D.get_closest_point_to_segment(point, Vector2(road.x, road.y), Vector2(road.z, road.w))
		if point.distance_squared_to(nearest) < 49.0:
			return true
	return false

func _reed_mesh() -> ArrayMesh:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	for i in 8:
		var angle := TAU * i / 8.0
		var axis := Vector3(sin(angle), 0.0, cos(angle))
		var across := Vector3(-axis.z, 0.0, axis.x)
		var root := axis * (0.12 + float(i % 3) * 0.022)
		var height := 0.69 + 0.27 * float(i % 4) / 3.0
		var middle := root + axis * 0.17 + Vector3.UP * height * 0.54
		var tip := root + axis * (0.33 if i % 3 != 0 else 0.48) + Vector3.UP * height
		surface.add_vertex(root - across * 0.032)
		surface.add_vertex(root + across * 0.032)
		surface.add_vertex(middle - across * 0.029)
		surface.add_vertex(root + across * 0.032)
		surface.add_vertex(middle + across * 0.029)
		surface.add_vertex(middle - across * 0.029)
		surface.add_vertex(middle - across * 0.029)
		surface.add_vertex(middle + across * 0.029)
		surface.add_vertex(tip)
	surface.generate_normals()
	return surface.commit()

func _add_batch(label: String, geometry: Mesh, material: Material, transforms: Array[Transform3D],
		colors: Array[Color] = []) -> void:
	var batch := MultiMesh.new()
	batch.transform_format = MultiMesh.TRANSFORM_3D
	batch.use_colors = not colors.is_empty()
	batch.mesh = geometry
	batch.instance_count = transforms.size()
	for i in transforms.size():
		batch.set_instance_transform(i, transforms[i])
		if batch.use_colors:
			batch.set_instance_color(i, colors[i])
	var instances := MultiMeshInstance3D.new()
	instances.name = label
	instances.multimesh = batch
	instances.material_override = material
	instances.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(instances)
