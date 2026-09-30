import { NOISE_GLSL } from "./noise";

export const frostedGlassVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const frostedGlassFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uLightDir;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  ${NOISE_GLSL}

  float screenDither(vec2 p) {
    return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
  }

  void main() {
    vec3 viewNormal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    vec3 worldNormal = normalize(vWorldNormal);
    vec3 worldViewDir = normalize(cameraPosition - vWorldPosition);
    vec3 lightDir = normalize(uLightDir);

    // Fresnel: facing is 1.0 at center, 0.0 at edge.
    float facing = clamp(dot(worldNormal, worldViewDir), 0.0, 1.0);
    float viewFacing = clamp(dot(viewNormal, viewDir), 0.0, 1.0);

    // Frosted at the rim, clearer through the logo-facing center.
    float edgeFrosted = pow(1.0 - facing, 1.55);
    float clearWindow = smoothstep(0.24, 0.92, viewFacing);

    // Soft wrapped terminator removes the visible light/dark banding line.
    float rawDiff = dot(worldNormal, lightDir);
    float diff = smoothstep(-0.20, 0.82, rawDiff);
    float shade = 0.10 + pow(diff, 0.78) * 0.95;
    float terminatorBloom = exp(-pow(rawDiff * 2.4, 2.0)) * (0.18 + edgeFrosted * 0.35);

    // Slow drifting frost suspended in the glass, with finer crystalline speckles.
    vec3 driftA = worldNormal * 2.6 + vec3(uTime * 0.022, -uTime * 0.015, uTime * 0.030);
    vec3 refracted = refract(-worldViewDir, worldNormal, 0.72);

    #if QUALITY_TIER == 0
    float frost1 = fbm2(driftA);
    float frost2 = fbm2(worldNormal * 5.0 + vec3(-uTime * 0.028, uTime * 0.020, uTime * 0.012));
    float fineFrost = vnoise(worldNormal * 24.0);
    vec3 facet = voronoi3D(worldNormal * 3.2);
    #else
    vec3 driftB = worldNormal * 8.0 + vec3(-uTime * 0.052, uTime * 0.035, uTime * 0.018);
    float frost1 = fbm(driftA);
    float frost2 = fbm(driftB + refracted * 0.8);
    float fineFrost = vnoise(worldNormal * 58.0 + refracted * 5.0);
    vec3 facet = voronoi3D(worldNormal * 5.4 + vec3(0.0, uTime * 0.018, 0.0));
    #endif

    // Voronoi facets give the sphere a polished, cut-glass body without hard stripes.
    float facetEdge = 1.0 - smoothstep(0.0, 0.065, facet.y);
    float facetBody = hash31(vec3(facet.z, 2.1, 8.4));

    // Frost gathers toward the silhouette and in organic clouds instead of UV bands.
    float upperCatch = smoothstep(0.18, 0.92, worldNormal.y * 0.5 + 0.5) * 0.20;
    float rimMist = edgeFrosted * 0.62;
    float frostField = clamp(frost1 * 0.48 + frost2 * 0.30 + rimMist + upperCatch, 0.0, 1.0);
    float speckles = smoothstep(0.70, 0.96, fineFrost + frost2 * 0.22 + facetEdge * 0.12);

    // Sea-glass palette with dense milky inclusions and subtle emerald depth.
    vec3 deepGlass = vec3(0.10, 0.24, 0.20);
    vec3 seaGlass = vec3(0.48, 0.94, 0.78);
    vec3 milkGlass = vec3(0.92, 1.0, 0.94);
    vec3 coolShadow = vec3(0.020, 0.055, 0.050);

    vec3 bodyColor = mix(deepGlass, seaGlass, 0.55 + frost1 * 0.22 + facetBody * 0.16);
    bodyColor = mix(bodyColor, milkGlass, frostField * 0.48 + speckles * 0.22);
    bodyColor += vec3(0.16, 0.50, 0.30) * facetEdge * (0.16 + diff * 0.24);

    // Layered glass response: lit rim, inner caustic glints, and a soft emerald terminator.
    float rim = pow(1.0 - facing, 2.2) * (0.18 + diff * 0.82);
    float sharpRim = pow(1.0 - facing, 6.5) * diff;
    float glint = pow(max(dot(reflect(-lightDir, worldNormal), worldViewDir), 0.0), 42.0) * diff;

    #if QUALITY_TIER == 0
    float secondaryGlint = 0.0;
    float caustic = smoothstep(0.72, 0.98, frost2 + facetEdge * 0.18) * (0.12 + clearWindow * 0.18) * diff;
    #else
    float secondaryGlint = pow(max(dot(reflect(lightDir, worldNormal), worldViewDir), 0.0), 18.0) * edgeFrosted;
    float caustic = smoothstep(0.70, 0.98, fbm(refracted * 11.0 + worldNormal * 2.0 + vec3(uTime * 0.06))) * (0.20 + clearWindow * 0.28) * diff;
    #endif

    vec3 finalColor = mix(coolShadow, bodyColor, shade);
    finalColor += vec3(0.58, 1.0, 0.74) * rim * 0.36;
    finalColor += vec3(0.88, 1.0, 0.82) * sharpRim * 0.25;
    finalColor += vec3(0.95, 1.0, 0.82) * glint * 0.48;
    finalColor += vec3(0.42, 1.0, 0.68) * secondaryGlint * 0.18;
    finalColor += vec3(0.28, 0.78, 0.52) * caustic * 0.22;
    finalColor += vec3(0.16, 0.38, 0.24) * terminatorBloom * 0.16;

    // Opacity: clearer around the mark, denser at the rim and in frosted inclusions.
    float alpha = mix(0.13, 0.58, edgeFrosted);
    alpha += frostField * 0.20 + speckles * 0.11 + facetEdge * 0.08;
    alpha -= clearWindow * 0.06;
    alpha = clamp(alpha, 0.12, 0.82);

    // Subtle screen-space dither breaks up posterization in the dark-to-light gradient.
    float dither = screenDither(gl_FragCoord.xy) - 0.5;
    finalColor = max(finalColor + dither * 0.0045, vec3(0.0));
    alpha = clamp(alpha + dither * 0.010, 0.10, 0.84);

    gl_FragColor = vec4(finalColor, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
