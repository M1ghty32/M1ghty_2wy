shader_type spatial;
render_mode cull_disabled, unshaded;

uniform vec4 deep_color : source_color = vec4(0.10, 0.29, 0.31, 1.0);
uniform vec4 shallow_color : source_color = vec4(0.19, 0.43, 0.41, 1.0);
uniform vec4 sky_color : source_color = vec4(0.60, 0.73, 0.78, 1.0);
uniform vec3 sun_direction = vec3(-0.39, 0.58, 0.71);
varying vec2 lake_xz;

void vertex() {
	lake_xz = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xz;
}

void fragment() {
	vec2 p = lake_xz;
	float ripple_a = dot(p, vec2(0.63, 1.54)) + TIME * 0.47;
	float ripple_b = dot(p, vec2(-1.38, 0.37)) - TIME * 0.29 + sin(p.y * 0.17);
	float smooth_a = dot(p, vec2(0.33, -0.19)) - TIME * 0.25;
	vec3 surface_normal = normalize(vec3(
		cos(ripple_a) * 0.034 + cos(ripple_b) * 0.042,
		1.0,
		cos(smooth_a) * 0.038 + cos(ripple_a) * 0.045
	));
	vec3 facing = normalize((INV_VIEW_MATRIX * vec4(VIEW, 0.0)).xyz);
	float reflected_sky = pow(1.0 - clamp(dot(surface_normal, facing), 0.0, 1.0), 4.0);
	float detail = 1.0 - smoothstep(85.0, 430.0, length(VERTEX));
	float band = 0.53 + detail * (0.15 * sin(smooth_a) + 0.10 * sin(ripple_a) * cos(ripple_b));
	vec3 base = mix(deep_color.rgb, shallow_color.rgb, band);
	vec3 shade = mix(base, sky_color.rgb, reflected_sky * 0.70);
	float spotlight = pow(max(0.0, dot(facing, reflect(-sun_direction, surface_normal))), 80.0);
	float rippled_glints = spotlight * (0.42 + 0.58 * pow(max(0.0, sin(ripple_b)), 4.0));
	ALBEDO = shade + vec3(0.33, 0.23, 0.14) * rippled_glints * detail;
}
