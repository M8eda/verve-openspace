/** Shared GLSL noise helpers (value noise + fbm). Original implementation. */
export const NOISE_GLSL = /* glsl */ `
float hash31(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);

  float n000 = hash31(i);
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));

  return mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z
  );
}

float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * vnoise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    amp *= 0.5;
  }
  return sum;
}

/** Cheap 2-octave variant for the mobile render tier — same shape, roughly
    half the ALU cost per pixel. Used by the haze shader's LOW_QUALITY path. */
float fbm2(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 2; i++) {
    sum += amp * vnoise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    amp *= 0.5;
  }
  return sum;
}

vec3 voronoi3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  vec3 nearestCell = vec3(0.0);
  for (int z = -1; z <= 1; z++) {
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec3 neighbor = vec3(float(x), float(y), float(z));
        vec3 cell = i + neighbor;
        vec3 pt = neighbor + vec3(
          hash31(cell),
          hash31(cell + vec3(45.0, 97.0, 13.0)),
          hash31(cell + vec3(91.0, 23.0, 67.0))
        ) - f;
        float d = dot(pt, pt);
        if (d < d1) { d2 = d1; d1 = d; nearestCell = cell; }
        else if (d < d2) { d2 = d; }
      }
    }
  }
  d1 = sqrt(d1);
  d2 = sqrt(d2);
  return vec3(d1, d2 - d1, hash31(nearestCell));
}
`;
