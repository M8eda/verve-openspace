/**
 * Shared planet shading: cube projection for tiled detail (no pole
 * pinching), derivative bump mapping, core-lit day/night shading and the
 * atmosphere rim. Needs NOISE_GLSL included before it.
 */
export const PLANET_COMMON_GLSL = /* glsl */ `
vec3 rotY(vec3 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

// Projects onto the cube face the normal points at. Tiled art and grids
// use this instead of latitude/longitude, which pinches at the poles.
vec2 cubeUV(vec3 n, out float face) {
  vec3 a = abs(n);
  if (a.x >= a.y && a.x >= a.z) {
    face = n.x > 0.0 ? 0.0 : 1.0;
    return n.zy / a.x;
  }
  if (a.y >= a.z) {
    face = n.y > 0.0 ? 2.0 : 3.0;
    return n.xz / a.y;
  }
  face = n.z > 0.0 ? 4.0 : 5.0;
  return n.xy / a.z;
}

// Bump mapping from screen-space derivatives of a height value, so any
// procedural height gets relief without extra noise samples.
vec3 perturbNormal(vec3 N, vec3 pos, float h) {
  vec3 dpdx = dFdx(pos);
  vec3 dpdy = dFdy(pos);
  float dhdx = dFdx(h);
  float dhdy = dFdy(h);
  vec3 r1 = cross(dpdy, N);
  vec3 r2 = cross(N, dpdx);
  float det = dot(dpdx, r1);
  vec3 bent = abs(det) * N - sign(det) * (dhdx * r1 + dhdy * r2);
  return dot(bent, bent) > 1e-20 ? normalize(bent) : N;
}

// Diffuse + specular lit by the core. ndlGeo is the smooth-sphere term:
// bumps can't light what the planet itself shadows.
vec3 litSurface(vec3 albedo, vec3 N, vec3 L, vec3 V, float ndlGeo, float shininess, float specular) {
  float selfShadow = smoothstep(-0.05, 0.12, ndlGeo);
  float diffuse = max(dot(N, L), 0.0) * selfShadow;
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), shininess) * specular * selfShadow;
  return albedo * (diffuse * 1.1 + 0.018) + vec3(spec);
}

// 1 on the night side, fading out across the terminator.
float nightSide(float ndl) {
  return 1.0 - smoothstep(-0.22, 0.06, ndl);
}

// Fresnel rim on the lit limb, a faint daytime haze and a thin twilight
// band along the terminator.
vec3 atmosphereGlow(vec3 N, vec3 V, float ndl, vec3 tint, float strength) {
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  float lit = smoothstep(-0.3, 0.45, ndl);
  float twilight = exp(-pow((ndl + 0.04) / 0.16, 2.0));
  return tint * strength * (fres * lit * 0.9 + max(ndl, 0.0) * 0.035 + twilight * 0.05);
}
`;
