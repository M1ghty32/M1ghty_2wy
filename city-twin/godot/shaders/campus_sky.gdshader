shader_type sky;

uniform vec4 horizon_color : source_color = vec4(0.78, 0.84, 0.88, 1.0);
uniform vec4 zenith_color : source_color = vec4(0.30, 0.53, 0.76, 1.0);
uniform vec4 sun_haze : source_color = vec4(1.0, 0.87, 0.67, 1.0);
uniform vec3 sun_direction = vec3(-0.39, 0.58, 0.71);

float cloud_hash(vec2 point) {
	point = fract(point * vec2(123.34, 456.21));
	point += dot(point, point + 45.32);
	return fract(point.x * point.y);
}

float cloud_noise(vec2 point) {
	vec2 tile = floor(point);
	vec2 edge = fract(point);
	edge = edge * edge * (3.0 - 2.0 * edge);
	return mix(
		mix(cloud_hash(tile), cloud_hash(tile + vec2(1.0, 0.0)), edge.x),
		mix(cloud_hash(tile + vec2(0.0, 1.0)), cloud_hash(tile + vec2(1.0)), edge.x),
		edge.y
	);
}

void sky() {
	float elevation = max(EYEDIR.y, 0.0);
	float facing_sun = max(0.0, dot(EYEDIR, sun_direction));
	vec3 gradient = mix(horizon_color.rgb, zenith_color.rgb, pow(elevation, 0.62));
	float haze = pow(facing_sun, 7.0) * 0.38;
	gradient = mix(gradient, sun_haze.rgb, haze);
	vec2 coords = EYEDIR.xz * vec2(1.46, 2.37) / (elevation + 0.23);
	float shapes = cloud_noise(coords) * 0.71 + cloud_noise(coords * 2.6 + 12.1) * 0.29;
	float clouds = smoothstep(0.54, 0.80, shapes) * smoothstep(0.035, 0.29, elevation);
	vec3 cloud_color = mix(vec3(0.76, 0.80, 0.83), sun_haze.rgb, haze * 0.65);
	vec3 upper = mix(gradient, cloud_color, clouds * 0.57);
	float ground = smoothstep(-0.5, -0.05, EYEDIR.y);
	COLOR = EYEDIR.y < 0.0 ? mix(vec3(0.18, 0.25, 0.20), gradient, ground) : upper;
}
