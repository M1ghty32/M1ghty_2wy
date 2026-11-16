shader_type spatial;
render_mode diffuse_lambert_wrap, specular_disabled;

uniform sampler2D grass_image : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform vec4 meadow_color : source_color = vec4(0.43, 0.51, 0.28, 1.0);
uniform vec4 turf_color : source_color = vec4(0.27, 0.42, 0.23, 1.0);
varying vec2 ground_xz;

void vertex() {
	ground_xz = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xz;
}

void fragment() {
	vec2 pos = ground_xz;
	vec2 texture_coordinates = vec2(pos.x * 0.88 + pos.y * 0.47, -pos.x * 0.47 + pos.y * 0.88) / 5.6;
	vec3 detail = texture(grass_image, texture_coordinates).rgb;
	float grain = dot(detail, vec3(0.29, 0.55, 0.16));
	float canopy = sin(pos.x * 0.047 + sin(pos.y * 0.06)) *
	               cos(pos.y * 0.042 + sin(pos.x * 0.076)) * 0.38 + 0.48;
	float micro = sin(pos.x * 1.46 + pos.y * 0.52) * cos(pos.y * 1.81 - pos.x * 0.68);
	float distance_to_camera = length(VERTEX);
	float near_fade = 1.0 - smoothstep(28.0, 92.0, distance_to_camera);
	float campus = 1.0 - smoothstep(540.0, 1020.0, length((pos - vec2(4.0, -120.0)) * vec2(0.92, 0.81)));
	float variation = mix(0.42, mix(0.45, canopy, 0.28 + 0.72 * near_fade), campus);
	grain = mix(0.44, grain, 1.0 - smoothstep(55.0, 260.0, distance_to_camera));
	ALBEDO = mix(turf_color.rgb, meadow_color.rgb, variation) * (0.72 + grain * 0.52 + micro * near_fade * 0.025);
	ROUGHNESS = 0.96;
}
