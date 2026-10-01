import { NOISE_GLSL } from "./noise";
import { PLANET_COMMON_GLSL } from "./planetCommon";

export const planetVertex = /* glsl */ `
varying vec3 vLocal;
varying vec3 vNormalW;
varying vec3 vWorld;

void main() {
  vLocal = position;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

/**
 * Service planets. Every world is lit by the core: a soft day/night
 * terminator, bump-mapped relief, specular where it makes sense and an
 * atmosphere rim. Each SURFACE_MODE is a look that tells its service's
 * story; the old UI-panel art survives as night-side city lights.
 * Detail is sampled in 3D (or per cube face), so nothing pinches at the
 * poles. QUALITY_TIER 0 drops octaves, domain warping and voronoi.
 */
export const planetFragment = /* glsl */ `
uniform float uTime;
uniform float uRadius;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform vec3 uLightDir;

varying vec3 vLocal;
varying vec3 vNormalW;
varying vec3 vWorld;

${NOISE_GLSL}
${PLANET_COMMON_GLSL}

#if QUALITY_TIER == 0
  #define FBM fbm2
#else
  #define FBM fbm
#endif

vec3 rotAxis(vec3 v, vec3 k, float a) {
  float c = cos(a);
  float s = sin(a);
  return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
}

// Rounded app/UI cards scattered over the cube faces: night-side city lights.
float panelGrid(vec3 n, float cells, float seed) {
  float face;
  vec2 uv = cubeUV(n, face) * cells;
  vec2 id = floor(uv);
  vec2 f = fract(uv) - 0.5;
  float on = step(0.55, hash31(vec3(id, face + seed)));
  vec2 q = abs(f);
  float outline = 1.0 - smoothstep(0.03, 0.08, abs(max(q.x, q.y) - 0.34));
  float pip = 1.0 - smoothstep(0.05, 0.1, length(f));
  return on * max(outline * 0.6, pip);
}

// Circuit traces: random horizontal/vertical runs joined by solder pads.
float circuit(vec3 n, float cells) {
  float face;
  vec2 uv = cubeUV(n, face) * cells;
  vec2 id = floor(uv);
  vec2 f = fract(uv) - 0.5;
  float r1 = hash31(vec3(id, face + 3.1));
  float r2 = hash31(vec3(id, face + 7.9));
  float hTrace = (1.0 - smoothstep(0.035, 0.07, abs(f.y))) * step(0.45, r1);
  float vTrace = (1.0 - smoothstep(0.035, 0.07, abs(f.x))) * step(0.55, r2);
  float pad = (1.0 - smoothstep(0.1, 0.16, length(f))) * step(0.5, r1 * r2 * 2.2);
  return max(max(hTrace, vTrace) * 0.7, pad);
}

// A great circle of dashed light with a packet running along it.
float lane(vec3 n, vec3 axis, float speed, float offset) {
  vec3 b = normalize(cross(axis, vec3(0.31, 0.12, 0.94)));
  vec3 c = cross(axis, b);
  float line = 1.0 - smoothstep(0.004, 0.011, abs(dot(n, axis)));
  float along = atan(dot(n, c), dot(n, b)) / 6.2831853 + 0.5;
  float dash = step(0.35, fract(along * 40.0));
  float packet = exp(-pow(fract(along - uTime * speed + offset) - 0.5, 2.0) * 260.0);
  return line * (dash * 0.35 + packet * 1.6);
}

void main() {
  vec3 n = normalize(vLocal);
  vec3 Ng = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(uLightDir);
  float ndl = dot(Ng, L);
  float night = nightSide(ndl);

  vec3 albedo = uColor * 0.4;
  float height = 0.0;
  float bump = 0.0;        // relief depth as a fraction of the radius
  float shininess = 20.0;
  float specular = 0.04;
  vec3 emissive = vec3(0.0);
  float cloud = 0.0;
  vec3 cloudColor = vec3(0.92, 0.95, 1.0);
  vec3 atmoTint = uColor;
  float atmo = 0.9;

#if SURFACE_MODE == 8
  {
    // UI/UX: a calm gas giant. Soft, even bands and one pale focus storm.
    vec3 q = rotY(n, uTime * 0.012);
    float warp = FBM(q * vec3(1.6, 5.0, 1.6)) - 0.5;
    float lat = n.y + warp * 0.08;
    float bands = 0.5 + 0.5 * sin(lat * 13.0);
    float fine = 0.5 + 0.5 * sin(lat * 41.0 + warp * 3.0);
    albedo = mix(uColor * 0.3, mix(uColor, uAccent, 0.5) * 0.85, bands);
    albedo = mix(albedo, uAccent * 0.8, fine * 0.1);
    albedo *= 0.7 + 0.3 * sqrt(max(1.0 - n.y * n.y, 0.0));

    vec3 stormDir = normalize(vec3(0.75, -0.32, 0.58));
    float sd = length((q - stormDir) * vec3(1.0, 2.2, 1.0));
    float storm = 1.0 - smoothstep(0.1, 0.2, sd);
    float stormRing = 1.0 - smoothstep(0.012, 0.03, abs(sd - 0.2));
    albedo = mix(albedo, uAccent * 0.95, storm * 0.7);
    albedo = mix(albedo, uColor * 0.25, stormRing * 0.5);

    height = bands * 0.3 + fine * 0.1;
    bump = 0.004;
    specular = 0.02;
    shininess = 8.0;
    emissive += uAccent * panelGrid(n, 5.0, 8.0) * night * 0.035;
    atmo = 1.2;
  }
#elif SURFACE_MODE == 9
  {
    // Web development: a dark rocky world wired with circuit-grid cities.
    float h = FBM(n * 2.8);
    float grit = vnoise(n * 18.0);
    height = h + grit * 0.12;
    bump = 0.03;
    albedo = mix(vec3(0.03, 0.034, 0.042), vec3(0.15, 0.155, 0.16), smoothstep(0.3, 0.72, h));
    albedo *= 0.85 + grit * 0.3;
    albedo += uColor * 0.012;

    float basins = 1.0 - smoothstep(0.42, 0.56, h);
    float grid = circuit(n, 9.0) * basins;
    #if QUALITY_TIER == 1
    float shimmer = 0.75 + 0.25 * sin(uTime * 2.0 + hash31(floor(n * 12.0)) * 6.2831853);
    #else
    float shimmer = 1.0;
    #endif
    emissive += uColor * grid * shimmer * (night * 1.5 + 0.05);
    specular = 0.08;
    shininess = 30.0;
    atmo = 0.45;
    atmoTint = mix(uColor, vec3(0.6), 0.5);
  }
#elif SURFACE_MODE == 10
  {
    // Mobile: tidally locked. A scorched dayside always faces the core, the
    // far side is ice, and the habitable twilight ring glows with app grids.
    float h = FBM(n * 3.2);
    height = h;
    bump = 0.02;
    float zone = ndl + (h - 0.5) * 0.2;
    vec3 scorched = mix(uColor * 0.5, uAccent * 0.75, h);
    vec3 temperate = mix(uColor * 0.22, vec3(0.16, 0.12, 0.14), h);
    vec3 ice = mix(vec3(0.62, 0.66, 0.78), uAccent * 0.8, 0.3) * (0.8 + 0.2 * h);
    albedo = mix(ice, temperate, smoothstep(-0.25, 0.0, zone));
    albedo = mix(albedo, scorched, smoothstep(0.35, 0.75, zone));
    float twilight = exp(-pow((ndl + 0.08) / 0.14, 2.0));
    emissive += uAccent * panelGrid(n, 14.0, 10.0) * twilight * 0.7;
    atmo = 0.7;
  }
#elif SURFACE_MODE == 11
  {
    // SEO: terraced highlands. Every contour line is a rank climbed.
    float h = FBM(n * 2.2) + vnoise(n * 8.0) * 0.1;
    float c = h * 10.0;
    float level = floor(c);
    float riser = smoothstep(0.78, 1.0, fract(c));
    float sea = 0.42;
    float land = smoothstep(sea - 0.005, sea + 0.005, h);
    height = max((level + riser) / 10.0, sea);
    bump = 0.04;

    float alt = clamp((h - sea) / 0.35, 0.0, 1.0);
    vec3 ground = mix(uColor * 0.28, mix(uColor * 0.55, vec3(0.62, 0.6, 0.5), 0.35), smoothstep(0.0, 0.6, alt));
    ground = mix(ground, mix(uAccent, vec3(0.95), 0.5), smoothstep(0.75, 0.95, alt));
    ground *= 0.86 + 0.14 * fract(level * 0.618);
    vec3 water = mix(vec3(0.008, 0.03, 0.04), uColor * 0.08, smoothstep(sea - 0.12, sea, h));

    float d = abs(fract(c - 0.5) - 0.5);
    float contour = (1.0 - smoothstep(0.0, fwidth(c) * 1.3, d)) * land;
    albedo = mix(water, ground, land) * (1.0 - contour * 0.35);
    specular = mix(0.28, 0.03, land);
    shininess = mix(70.0, 12.0, land);
    emissive += uAccent * contour * night * 0.35;
    emissive += uAccent * smoothstep(0.9, 0.97, alt) * night * 1.2;
    atmo = 0.85;
  }
#elif SURFACE_MODE == 12
  {
    // Digital marketing: a stormy multicolour giant, its belts swirled by a
    // great storm, with lightning flickering on the night side.
    vec3 stormDir = normalize(vec3(0.55, 0.28, 0.79));
    float sd = distance(n, stormDir);
    vec3 p = rotAxis(n, stormDir, (1.0 - smoothstep(0.0, 0.45, sd)) * 3.0);
    p = rotY(p, uTime * 0.02);
    #if QUALITY_TIER == 0
    float warp = fbm2(p * 3.0);
    #else
    float warp = fbm(p * 3.0 + fbm(p * 2.0 + uTime * 0.02) * 1.5);
    #endif
    float lat = p.y + (warp - 0.5) * 0.35;
    float bands = 0.5 + 0.5 * sin(lat * 16.0);
    vec3 belt = vec3(0.32, 0.06, 0.24);
    vec3 jet = vec3(0.05, 0.1, 0.22);
    albedo = mix(belt, uColor * 0.7, smoothstep(0.2, 0.8, 0.5 + 0.5 * sin(lat * 7.0)));
    albedo = mix(albedo, uAccent * 0.8, smoothstep(0.55, 0.95, bands) * 0.7);
    albedo = mix(albedo, jet, smoothstep(0.6, 0.9, 0.5 + 0.5 * sin(lat * 4.0 + 1.7)) * 0.6);
    albedo = mix(albedo, uAccent * 0.9, (1.0 - smoothstep(0.12, 0.4, sd)) * 0.35);
    albedo = mix(albedo, belt * 0.5, 1.0 - smoothstep(0.05, 0.1, sd));
    height = warp;
    bump = 0.008;

    #if QUALITY_TIER == 1
    vec3 cellP = p * 9.0;
    float strike = step(0.985, hash31(floor(cellP) + floor(uTime * 4.0)));
    float flash = strike * (1.0 - smoothstep(0.0, 0.45, length(fract(cellP) - 0.5)));
    emissive += mix(uAccent, vec3(1.0), 0.6) * flash * night * 2.5;
    #endif
    emissive += uAccent * panelGrid(n, 8.0, 12.0) * night * 0.05;
    atmo = 1.1;
  }
#elif SURFACE_MODE == 13
  {
    // Paid ads: a lava world with a bullseye impact crater. Target, hit.
    vec3 bullDir = normalize(vec3(0.42, 0.3, 0.86));
    float ang = acos(clamp(dot(n, bullDir), -1.0, 1.0));
    #if QUALITY_TIER == 0
    float edge = abs(fbm2(n * 4.0) - 0.5) * 0.6;
    #else
    float edge = voronoi3D(n * 4.5).y + (fbm2(n * 12.0) - 0.5) * 0.08;
    #endif
    float cracks = 1.0 - smoothstep(0.0, 0.07, edge);
    float plate = smoothstep(0.0, 0.18, edge);

    float crater = 1.0 - smoothstep(0.42, 0.48, ang);
    float rings = 0.5 + 0.5 * cos(ang * 40.0);
    float rim = exp(-pow((ang - 0.47) / 0.03, 2.0));
    float centre = 1.0 - smoothstep(0.05, 0.08, ang);
    float lava = max(cracks * (1.0 - crater), max(smoothstep(0.75, 0.95, rings) * crater, centre));

    float rough = vnoise(n * 20.0);
    albedo = mix(vec3(0.05, 0.035, 0.032), vec3(0.11, 0.08, 0.07), rough);
    albedo = mix(albedo, uColor * 0.05, crater * 0.4) * (1.0 - lava);
    height = plate * 0.6 + rough * 0.2 + rim * 0.8 - (1.0 - rings) * crater * 0.2;
    bump = 0.03;

    #if QUALITY_TIER == 1
    float heat = 0.75 + 0.25 * sin(uTime * 1.3 + ang * 10.0);
    #else
    float heat = 0.9;
    #endif
    emissive += mix(uColor, uAccent, smoothstep(0.5, 1.0, lava)) * lava * heat * (1.4 + night * 0.6);
    atmo = 0.6;
    atmoTint = mix(uColor, uAccent, 0.3);
  }
#elif SURFACE_MODE == 14
  {
    // Email: an ocean world. Scattered islands, sun glint on the water and
    // inbox lanes running packets across the dark side.
    float h = FBM(n * 2.6 + vec3(4.0));
    float land = smoothstep(0.6, 0.62, h);
    vec3 ocean = mix(uColor * 0.05 + vec3(0.0, 0.006, 0.02), mix(uColor * 0.2, uAccent * 0.3, 0.4), smoothstep(0.48, 0.6, h));
    vec3 ground = mix(vec3(0.16, 0.14, 0.1), vec3(0.08, 0.16, 0.08), vnoise(n * 10.0));
    albedo = mix(ocean, ground, land);
    float waves = vnoise(n * 40.0 + uTime * 0.3);
    height = land * (h - 0.6) * 4.0 + (1.0 - land) * waves * 0.15;
    bump = 0.012;
    specular = mix(0.9, 0.04, land);
    shininess = mix(90.0, 10.0, land);

    float lanes = lane(n, normalize(vec3(0.2, 1.0, 0.1)), 0.05, 0.0)
                + lane(n, normalize(vec3(0.9, 0.35, -0.2)), 0.04, 0.33)
                + lane(n, normalize(vec3(-0.3, 0.45, 0.85)), 0.06, 0.66);
    emissive += uAccent * lanes * night * (1.0 - land) * 0.8;
    emissive += uAccent * panelGrid(n, 12.0, 14.0) * land * night * 0.5;

    vec3 cq = rotY(n, uTime * 0.025);
    cloud = smoothstep(0.52, 0.72, FBM(cq * 3.4 + vec3(9.0))) * 0.85;
    atmo = 1.15;
  }
#elif SURFACE_MODE == 15
  {
    // Cloud: a world under a thick deck of cloud, its data centres glowing
    // through the gaps on the night side.
    vec3 cq = rotY(n, uTime * 0.018);
    #if QUALITY_TIER == 0
    float deck = fbm2(cq * vec3(2.5, 5.0, 2.5));
    #else
    float deck = fbm(cq * vec3(2.2, 4.4, 2.2) + fbm(cq * 3.0 + uTime * 0.01) * 0.8);
    #endif
    float bands = 0.5 + 0.5 * sin(n.y * 7.0 + deck * 4.0);
    float density = clamp(deck * 1.2 + bands * 0.15, 0.0, 1.0);
    albedo = mix(uColor * 0.5, mix(vec3(0.95, 0.97, 1.0), uAccent, 0.3), smoothstep(0.35, 0.8, density));
    height = density;
    bump = 0.012;
    float gaps = 1.0 - smoothstep(0.3, 0.48, density);
    emissive += uAccent * circuit(n, 10.0) * gaps * (night * 1.2 + 0.04);
    specular = 0.03;
    shininess = 6.0;
    atmo = 1.3;
    atmoTint = mix(uColor, uAccent, 0.4);
  }
#else
  {
    float base = FBM(n * 2.6);
    float t = base * 0.6 + smoothstep(0.6, 0.9, vnoise(n * 11.0)) * 0.5;
    albedo = mix(uColor * 0.15, mix(uColor, uAccent, 0.4) * 0.8, t);
    height = t;
    bump = 0.02;
  }
#endif

  vec3 N = perturbNormal(Ng, vWorld, height * bump * uRadius);
  vec3 color = litSurface(albedo, N, L, V, ndl, shininess, specular);
  if (cloud > 0.0) {
    color = mix(color, cloudColor * (max(ndl, 0.0) * 1.05 + 0.015), cloud);
    emissive *= 1.0 - cloud * 0.85;
  }
  color += emissive;
  color += atmosphereGlow(Ng, V, ndl, atmoTint, atmo);

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** Small cratered moons, lit by the core like their planet. */
export const moonFragment = /* glsl */ `
uniform vec3 uLightDir;
uniform vec3 uTint;
uniform float uRadius;

varying vec3 vLocal;
varying vec3 vNormalW;
varying vec3 vWorld;

${NOISE_GLSL}
${PLANET_COMMON_GLSL}

void main() {
  vec3 n = normalize(vLocal);
  vec3 Ng = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(uLightDir);
  float ndl = dot(Ng, L);

  float h = fbm2(n * 4.0);
  float pits = smoothstep(0.62, 0.8, vnoise(n * 7.0 + 3.0));
  vec3 albedo = mix(vec3(0.16, 0.15, 0.16), vec3(0.42, 0.4, 0.42), h);
  albedo *= mix(vec3(1.0), uTint, 0.25) * (1.0 - pits * 0.35);
  vec3 N = perturbNormal(Ng, vWorld, (h - pits * 0.5) * 0.06 * uRadius);

  gl_FragColor = vec4(litSurface(albedo, N, L, V, ndl, 10.0, 0.02), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
