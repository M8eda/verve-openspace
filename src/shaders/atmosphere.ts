/**
 * Atmosphere halo drawn on a slightly larger back-facing shell. Density is
 * worked out from how close each view ray passes to the planet centre, so
 * the glow hugs the limb and fades to nothing at the shell edge, brighter
 * on the side facing the core.
 */
export const atmosphereVertex = /* glsl */ `
varying vec3 vWorld;
varying vec3 vCenter;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const atmosphereFragment = /* glsl */ `
uniform vec3 uTint;
uniform vec3 uLightDir;
uniform float uPlanetRadius;
uniform float uAtmoRadius;
uniform float uStrength;

varying vec3 vWorld;
varying vec3 vCenter;

void main() {
  vec3 ray = normalize(vWorld - cameraPosition);
  vec3 L = normalize(uLightDir);
  float tca = dot(vCenter - cameraPosition, ray);
  vec3 closest = cameraPosition + ray * tca;
  float b = length(closest - vCenter);

  float shell = clamp((b - uPlanetRadius) / (uAtmoRadius - uPlanetRadius), 0.0, 1.0);
  float density = pow(1.0 - shell, 2.4) * smoothstep(uPlanetRadius * 0.97, uPlanetRadius, b);

  vec3 s = normalize(closest - vCenter);
  float lit = smoothstep(-0.35, 0.5, dot(s, L));
  // Looking at the night limb towards the core lights the haze from behind.
  float backlit = pow(max(dot(ray, L), 0.0), 6.0) * 0.8;

  gl_FragColor = vec4(uTint * density * uStrength * (lit + backlit), 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
