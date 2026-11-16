shader_type spatial;
render_mode diffuse_burley;

uniform vec4 base_color : source_color = vec4(0.76, 0.75, 0.70, 1.0);
uniform float grain_amount = 0.055;
varying vec3 world_surface;

void vertex() {
	world_surface = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float flecks = sin(world_surface.x * 8.3 + world_surface.z * 7.1) *
	               cos(world_surface.y * 21.6 - world_surface.z * 6.7);
	float construction = sin(world_surface.y * 1.84) * 0.033;
	float broad_tone = sin(world_surface.x * 0.052 + world_surface.z * 0.041) * 0.037;
	float base_shadow = 0.13 * (1.0 - smoothstep(0.05, 4.0, world_surface.y));
	float in_range = 1.0 - smoothstep(42.0, 125.0, length(VERTEX));
	ALBEDO = base_color.rgb * (1.0 + broad_tone + construction + flecks * grain_amount * in_range - base_shadow);
	ROUGHNESS = 0.91;
}
