import { NOISE_GLSL } from "./noise";

export const planetVertex = /* glsl */ `
varying vec3 vLocal;
varying vec3 vNormalW;
varying vec3 vViewPos;

void main() {
  vLocal = position;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

export const planetFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform vec3 uLightDir;

varying vec3 vLocal;
varying vec3 vNormalW;
varying vec3 vViewPos;

${NOISE_GLSL}

vec3 palette(float t, vec3 base, vec3 accent) {
  vec3 deep = base * 0.22;
  vec3 mid = base;
  vec3 bright = mix(base, accent, 0.65);
  vec3 c = mix(deep, mid, smoothstep(0.0, 0.55, t));
  return mix(c, bright, smoothstep(0.55, 1.0, t));
}

float rectMask(vec2 p, vec2 origin, vec2 size, float edge) {
  vec2 a = smoothstep(origin, origin + edge, p);
  vec2 b = 1.0 - smoothstep(origin + size - edge, origin + size, p);
  return a.x * a.y * b.x * b.y;
}

float rectOutline(vec2 p, vec2 origin, vec2 size, float edge) {
  float outer = rectMask(p, origin, size, edge);
  float inner = rectMask(p, origin + vec2(edge * 2.4), size - vec2(edge * 4.8), edge);
  return clamp(outer - inner, 0.0, 1.0);
}

float circleMask(vec2 p, vec2 center, float radius, float edge) {
  return 1.0 - smoothstep(radius, radius + edge, distance(p, center));
}

float ringMask(vec2 p, vec2 center, float radius, float width) {
  return 1.0 - smoothstep(width, width * 1.8, abs(distance(p, center) - radius));
}

float arcMask(vec2 p, vec2 center, float radius, float width, float progress) {
  vec2 d = p - center;
  float a = atan(d.y, d.x) / 6.2831853 + 0.5;
  return ringMask(p, center, radius, width) * step(a, progress);
}

float segmentMask(vec2 p, vec2 a, vec2 b, float width) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return 1.0 - smoothstep(width, width * 1.8, length(pa - ba * h));
}

float checkMask(vec2 p, vec2 origin, float scale, float width) {
  return segmentMask(p, origin + vec2(0.00, 0.04) * scale, origin + vec2(0.08, -0.04) * scale, width)
       + segmentMask(p, origin + vec2(0.08, -0.04) * scale, origin + vec2(0.23, 0.12) * scale, width);
}

float chevronMask(vec2 p, vec2 origin, float scale, float width) {
  return segmentMask(p, origin + vec2(0.00, -0.08) * scale, origin + vec2(0.11, 0.00) * scale, width)
       + segmentMask(p, origin + vec2(0.11, 0.00) * scale, origin + vec2(0.00, 0.08) * scale, width);
}

void main() {
  vec3 n = normalize(vLocal);
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(vViewPos);

  float t;
  bool customColor = false;
  vec3 finalSurface = vec3(0.0);

#if SURFACE_MODE == 1
  {
    float warp = fbm(n * 2.0) * 0.35;
    float band = sin((n.y + warp) * 10.0);
    t = 0.5 + 0.5 * band;
    t = mix(t, fbm(n * 5.0), 0.15);
  }
#elif SURFACE_MODE == 2
  {
    vec3 drift = n * 3.0 + vec3(uTime * 0.02, 0.0, uTime * 0.015);
    t = fbm(drift) * 0.7 + fbm(drift * 2.1) * 0.3;
  }
#elif SURFACE_MODE == 3
  {
    customColor = true;

    // --- Spherical UV Projection for Web Development Cybersphere ---
    float theta = acos(clamp(n.y, -1.0, 1.0));
    float phi = atan(n.z, n.x);
    float uCoord = phi / 6.2831853 + 0.5;
    float vCoord = theta / 3.14159265;

#if QUALITY_TIER == 0
    // Mobile optimized web layout grid + syntax stream
    vec2 uvGrid = vec2(uCoord * 20.0, vCoord * 10.0);
    vec2 cellId = floor(uvGrid);
    vec2 cellF = fract(uvGrid);
    vec2 dEdge = min(cellF, 1.0 - cellF);
    float cardBorder = 1.0 - smoothstep(0.02, 0.08, min(dEdge.x, dEdge.y));

    float lineF = fract(cellF.y * 4.0);
    float isLine = step(0.2, lineF) * (1.0 - step(0.8, lineF));
    float indent = 0.15;
    float lineLen = 0.55;
    float codeSpan = step(indent, cellF.x) * (1.0 - step(indent + lineLen, cellF.x));
    float codeToken = isLine * codeSpan * step(0.2, fract(cellF.x * 8.0));

    vec3 col = vec3(0.006, 0.014, 0.028);
    col += vec3(0.12, 0.58, 0.95) * cardBorder * 1.2;
    col += vec3(0.4, 0.85, 1.0) * codeToken * 1.4;
    t = cardBorder * 0.7 + codeToken;
    finalSurface = col;
#else
    // Desktop: Full High-Tech Web Development Bento Layout + Syntax Streams + Network Packets
    vec2 gridScale = vec2(28.0, 14.0);
    vec2 uvGrid = vec2(uCoord, vCoord) * gridScale;
    vec2 cellId = floor(uvGrid);
    vec2 cellF = fract(uvGrid);

    float cellRand = hash31(vec3(cellId, 4.2));
    float cellRand2 = hash31(vec3(cellId, 17.8));

    // Modular component card borders (CSS Grid / Flexbox containers)
    vec2 dEdge = min(cellF, 1.0 - cellF);
    float cardBorder = 1.0 - smoothstep(0.02, 0.065, min(dEdge.x, dEdge.y));

    // Deep dark code editor background
    vec3 col = vec3(0.005, 0.012, 0.025);
    vec3 cardFill = mix(vec3(0.010, 0.022, 0.042), vec3(0.018, 0.038, 0.070), cellRand * 0.85);
    col = mix(col, cardFill, 1.0 - cardBorder);

    // Procedural syntax code lines inside component cards
    float numLines = 5.0;
    float lineF = fract(cellF.y * numLines);
    float lineIdx = floor(cellF.y * numLines);
    float inLineY = smoothstep(0.18, 0.26, lineF) * (1.0 - smoothstep(0.74, 0.82, lineF));

    // Indentation simulating nested HTML / JSX tags / CSS rule blocks
    float indent = 0.12 + 0.18 * floor(hash31(vec3(cellId, lineIdx + 1.0)) * 2.8);
    float lineLen = 0.35 + 0.45 * hash31(vec3(cellId, lineIdx + 9.5));
    float inLineX = smoothstep(indent - 0.02, indent, cellF.x) * (1.0 - smoothstep(indent + lineLen, indent + lineLen + 0.02, cellF.x));

    // Code token segments (keywords, tags, attributes)
    float tokenGaps = step(0.18, fract((cellF.x - indent) * 12.0));
    float codeBlock = inLineY * inLineX * tokenGaps;

    // Syntax highlight color tokens:
    // Cyan: HTML tags / JSX components (<div>, <header>, <Navbar />)
    // White/Ice: Attributes and props
    // Emerald: Strings and status values ("active", "200 OK")
    // Purple/Violet: Functions and hooks (useState, useEffect)
    float tokenType = hash31(vec3(cellId, lineIdx * 3.7 + floor(cellF.x * 12.0)));
    vec3 syntaxCyan = vec3(0.15, 0.72, 1.0);
    vec3 syntaxIce = vec3(0.75, 0.92, 1.0);
    vec3 syntaxEmerald = vec3(0.8, 0.98, 0.35);
    vec3 syntaxPurple = vec3(0.72, 0.52, 1.0);

    vec3 tokenColor = syntaxCyan;
    if (tokenType > 0.75) tokenColor = syntaxEmerald;
    else if (tokenType > 0.5) tokenColor = syntaxPurple;
    else if (tokenType > 0.25) tokenColor = syntaxIce;

    // Blinking terminal cursor at the end of active code lines
    float cursorActive = step(0.7, cellRand);
    float isCursorLine = step(abs(lineIdx - 2.0), 0.1);
    float cursorX = indent + lineLen + 0.04;
    float cursorBox = inLineY * isCursorLine * step(cursorX, cellF.x) * (1.0 - step(cursorX + 0.035, cellF.x));
    float cursorBlink = step(0.5, sin(uTime * 5.0 + cellRand * 10.0));
    vec3 cursorColor = vec3(0.9, 1.0, 1.0) * cursorBox * cursorBlink * cursorActive * 2.0;

    // Render code syntax inside code editor / component cards
    float hasCode = step(0.2, cellRand2);
    col += tokenColor * codeBlock * hasCode * 1.4;
    col += cursorColor;

    // Component card borders: Glowing web wireframe cyan/blue
    vec3 gridCyan = vec3(0.12, 0.60, 0.95);
    col += gridCyan * cardBorder * 1.15;

    // Fiber-optic API data packets traveling along web network bus lines
    float busSpeed = uTime * 0.65;
    float hPacket = exp(-pow(fract(uCoord * 7.0 - busSpeed + cellId.y * 0.15) - 0.5, 2.0) * 80.0);
    float vPacket = exp(-pow(fract(vCoord * 5.0 + busSpeed * 0.8 + cellId.x * 0.12) - 0.5, 2.0) * 80.0);
    float networkPacket = (hPacket + vPacket) * cardBorder;
    vec3 packetColor = vec3(0.4, 0.95, 1.0) * networkPacket * 2.5;
    col += packetColor;

    // Glowing corner anchor nodes at card intersections
    float cornerNode = (1.0 - smoothstep(0.0, 0.15, length(dEdge))) * (0.8 + 0.4 * sin(uTime * 3.0 + cellRand * 20.0));
    col += vec3(0.5, 0.9, 1.0) * cornerNode * 1.6;

    t = cardBorder * 0.6 + codeBlock + networkPacket * 0.8;
    finalSurface = col;
#endif
  }
#elif SURFACE_MODE == 4
  {
    float stripe = sin(dot(n, vec3(3.0, 1.0, 0.0)) * 14.0 + fbm(n * 3.0) * 3.0);
    t = 0.5 + 0.5 * stripe;
    float spec = pow(max(dot(reflect(-uLightDir, N), V), 0.0), 24.0);
    t = clamp(t + spec * 0.6, 0.0, 1.0);
  }
#elif SURFACE_MODE == 5
  {
    t = fbm(n * 1.6 + vec3(0.0, uTime * 0.01, 0.0));
    t = smoothstep(0.25, 0.85, t);
  }
#elif SURFACE_MODE == 6
  {
    float crust = fbm(n * 4.0);
    float crack = 1.0 - smoothstep(0.0, 0.06, abs(crust - 0.5));
    t = crust * 0.35 + crack * 0.9;
  }
#elif SURFACE_MODE == 7
  {
    customColor = true;

    // 1. Spherical UV Projection (Technique from Web Dev branch)
    float theta = acos(clamp(n.y, -1.0, 1.0));
    float phi = atan(n.z, n.x);
    float uCoord = phi / 6.2831853 + 0.5;
    float vCoord = theta / 3.14159265;

    // 2. Faceted Glass Background using voronoi3D
    #if QUALITY_TIER == 0
    // Mobile: Coarser facets, flat shading
    vec3 v = voronoi3D(n * 3.5);
    float cellId = v.z;
    vec3 baseCol = mix(vec3(0.05, 0.01, 0.20), vec3(0.28, 0.08, 0.55), hash31(vec3(cellId)));
    vec3 surface = baseCol;
    #else
    // Desktop: Detailed facets with normal perturbation for light catching
    vec3 v = voronoi3D(n * 6.2);
    float cellId = v.z;
    float distToEdge = v.y;

    // Perturb normal per facet to catch rim light differently
    vec3 rng = vec3(
      hash31(vec3(cellId, 1.2, 4.2)),
      hash31(vec3(cellId, 3.8, 7.1)),
      hash31(vec3(cellId, 9.4, 2.5))
    );
    vec3 facetN = normalize(N + (rng - 0.5) * 0.35);

    vec3 deep  = vec3(0.05, 0.01, 0.20);
    vec3 mid   = vec3(0.28, 0.08, 0.55);
    vec3 bright = vec3(0.52, 0.22, 0.78);
    vec3 baseCol = mix(deep, bright, hash31(vec3(cellId)));

    // Add subtle glow to facet edges
    baseCol = mix(baseCol, mid * 1.2, (1.0 - smoothstep(0.0, 0.08, distToEdge)) * 0.3);
    vec3 surface = baseCol;
    #endif

    // 3. North Star / Compass Glyph
    // Stability Fix: use View Space normal to keep the star camera-facing and stable during rotation
    vec3 nV = normalize(mat3(viewMatrix) * N);

    // Angular distance from the camera-facing center of the disc
    float poleDist = acos(clamp(dot(nV, V), -1.0, 1.0));

    float pulse = 0.88 + 0.12 * sin(uTime * 2.8);
    float starGlow = exp(-poleDist * 14.0) * pulse; // Central core

    #if QUALITY_TIER == 1
    // 8-point star burst (Desktop)
    // Use view-space coordinates to keep spikes aligned to screen 'up'
    float angle = atan(nV.x, nV.y);

    // Shape Fix: wider spikes (lower exponents), cardinal points emphasized over intercardinal
    float spikes = pow(max(0.0, cos(angle * 4.0)), 10.0) * exp(-poleDist * 2.5);
    float spikes2 = pow(max(0.0, cos(angle * 4.0 + 0.785)), 16.0) * exp(-poleDist * 4.5);
    starGlow += (spikes + spikes2 * 0.55) * pulse * 2.2;

    // Concentric "Sonar" Ring Pulses
    float wave = fract(uTime * 0.35 - poleDist * 0.65);
    float ring = smoothstep(0.0, 0.08, wave) * (1.0 - smoothstep(0.08, 0.16, wave)) * exp(-poleDist * 1.2);
    starGlow += ring * 0.7;
    #endif

    // 4. Final Shading with uAccent rim lighting logic
    #if QUALITY_TIER == 1
    float diffuse = max(dot(facetN, uLightDir), 0.0);
    #else
    float diffuse = max(dot(N, uLightDir), 0.0);
    #endif

    // Rim only on the lit side — matches the other surfaces, which gate
    // rim by max(dot(N, uLightDir), 0). The old 0.4 base kept the rim
    // visible even when unlit, contributing to the "always lit" look.
    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.5) * max(dot(N, uLightDir), 0.0);
    vec3 rimCol = vec3(0.60, 0.30, 0.95);

    // Ambient floor dropped from 0.25 to 0.05 so the facet background goes
    // dark on the unlit side. Star glyph is now gated by diffuse so it dims
    // when the surface point facing camera is in shadow, instead of staying
    // at full brightness from every angle.
    vec3 finalColor = surface * (diffuse * 0.9 + 0.05)
                    + uAccent * starGlow * 0.6 * (diffuse * 0.85 + 0.15)
                    + rimCol * rim * 0.8;

    gl_FragColor = vec4(finalColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    return;
  }
#elif SURFACE_MODE == 8
  {
    customColor = true;

    // Accessibility / UX planet: high-contrast UI cards, focus rings,
    // cursor paths and tab-order checkpoints wrapped around the sphere.
    float theta = acos(clamp(n.y, -1.0, 1.0));
    float phi = atan(n.z, n.x);
    float uCoord = phi / 6.2831853 + 0.5;
    float vCoord = theta / 3.14159265;

    #if QUALITY_TIER == 0
    vec2 gridScale = vec2(8.0, 4.0);
    float anim = 0.0;
    #else
    vec2 gridScale = vec2(12.0, 6.0);
    float anim = uTime;
    #endif

    vec2 uvGrid = vec2(uCoord, vCoord) * gridScale;
    vec2 cellId = floor(uvGrid);
    vec2 cellF = fract(uvGrid);
    float cellRand = hash31(vec3(cellId, 6.8));
    float cellRand2 = hash31(vec3(cellId, 13.1));

    vec3 ink = vec3(0.018, 0.015, 0.004);
    vec3 gold = vec3(1.0, 0.82, 0.12);
    vec3 cream = vec3(1.0, 0.96, 0.70);
    vec3 focusBlue = vec3(0.25, 0.80, 1.0);
    vec3 passGreen = vec3(0.62, 1.0, 0.36);

    vec3 col = ink;
    col += uColor * (0.05 + 0.08 * smoothstep(-0.75, 0.8, n.y));

    float viewport = rectOutline(cellF, vec2(0.08, 0.12), vec2(0.84, 0.74), 0.014);
    float header = rectMask(cellF, vec2(0.12, 0.76), vec2(0.30, 0.035), 0.01);
    float hero = rectMask(cellF, vec2(0.14, 0.56), vec2(0.42, 0.11), 0.012);
    float textA = rectMask(cellF, vec2(0.14, 0.42), vec2(0.58, 0.030), 0.008);
    float textB = rectMask(cellF, vec2(0.14, 0.35), vec2(0.40, 0.025), 0.008);
    float button = rectMask(cellF, vec2(0.59, 0.23), vec2(0.22, 0.10), 0.012);
    float buttonOutline = rectOutline(cellF, vec2(0.59, 0.23), vec2(0.22, 0.10), 0.012);

    // Focus rings travel across controls like visible keyboard navigation.
    float focusPhase = fract(anim * 0.28 + cellRand * 0.62 + cellId.x * 0.04);
    float focusPulse = smoothstep(0.02, 0.14, focusPhase) * (1.0 - smoothstep(0.24, 0.42, focusPhase));
    float focusTarget = rectOutline(cellF, vec2(0.575, 0.215), vec2(0.25, 0.13), 0.018);
    float focusHalo = rectOutline(cellF, vec2(0.55, 0.19), vec2(0.30, 0.18), 0.020) * focusPulse;

    // Pointer path and tab-order checkpoints communicate usability testing.
    float pathLine = 1.0 - smoothstep(0.012, 0.035, abs(cellF.y - mix(0.24, 0.70, cellF.x)));
    pathLine *= smoothstep(0.12, 0.24, cellF.x) * (1.0 - smoothstep(0.78, 0.90, cellF.x));
    float nodeA = circleMask(cellF, vec2(0.22, 0.34), 0.035, 0.018);
    float nodeB = circleMask(cellF, vec2(0.52, 0.50), 0.030, 0.016);
    float nodeC = circleMask(cellF, vec2(0.78, 0.66), 0.040, 0.018);

    float contrastSplit = step(0.52, cellF.x) * rectMask(cellF, vec2(0.10, 0.16), vec2(0.80, 0.62), 0.012);
    float activeCell = step(0.46, cellRand2);

    col = mix(col, vec3(0.10, 0.085, 0.020), viewport * 0.75);
    col = mix(col, vec3(0.92, 0.72, 0.04), contrastSplit * 0.22);
    col += gold * viewport * (0.60 + activeCell * 0.35);
    col += cream * (header + hero * 0.55 + textA * 0.45 + textB * 0.36);
    col += ink * button * 0.70;
    col += passGreen * buttonOutline * 0.95;
    col += focusBlue * focusTarget * 0.80;
    col += focusBlue * focusHalo * 1.65;
    col += passGreen * pathLine * 0.45;
    col += cream * (nodeA + nodeB + nodeC) * 0.70;

    #if QUALITY_TIER == 1
    float scan = 1.0 - smoothstep(0.0, 0.02, abs(fract(vCoord * 18.0 - anim * 0.16) - 0.5));
    col += focusBlue * scan * 0.045;
    #endif

    t = viewport + focusHalo + buttonOutline + nodeA + nodeB + nodeC;
    finalSurface = col;
  }
#elif SURFACE_MODE == 9
  {
    customColor = true;

    // Web development planet: browser windows, component layers, code braces
    // and shipping routes instead of another analytics/dashboard face.
    float theta = acos(clamp(n.y, -1.0, 1.0));
    float phi = atan(n.z, n.x);
    float uCoord = phi / 6.2831853 + 0.5;
    float vCoord = theta / 3.14159265;

    #if QUALITY_TIER == 0
    vec2 gridScale = vec2(6.0, 3.0);
    float anim = 0.0;
    #else
    vec2 gridScale = vec2(8.0, 4.0);
    float anim = uTime;
    #endif

    vec2 uvGrid = vec2(uCoord, vCoord) * gridScale;
    vec2 cellId = floor(uvGrid);
    vec2 cellF = fract(uvGrid);
    float cellRand = hash31(vec3(cellId, 21.4));

    vec3 deepWeb = vec3(0.002, 0.018, 0.040);
    vec3 cyan = vec3(0.00, 0.94, 1.0);
    vec3 magenta = vec3(1.0, 0.22, 0.76);
    vec3 lime = vec3(0.55, 1.0, 0.34);
    vec3 ice = vec3(0.82, 0.96, 1.0);

    vec3 col = deepWeb + uColor * (0.06 + 0.08 * smoothstep(-0.65, 0.88, n.y));

    float browser = rectMask(cellF, vec2(0.10, 0.14), vec2(0.80, 0.70), 0.020);
    float browserEdge = rectOutline(cellF, vec2(0.10, 0.14), vec2(0.80, 0.70), 0.014);
    float chrome = rectMask(cellF, vec2(0.12, 0.77), vec2(0.76, 0.050), 0.010);
    float tab = rectMask(cellF, vec2(0.20, 0.785), vec2(0.18, 0.020), 0.006);
    float dotA = circleMask(cellF, vec2(0.145, 0.795), 0.010, 0.006);
    float dotB = circleMask(cellF, vec2(0.170, 0.795), 0.010, 0.006);
    float dotC = circleMask(cellF, vec2(0.195, 0.795), 0.010, 0.006);

    float nav = rectMask(cellF, vec2(0.16, 0.69), vec2(0.50, 0.028), 0.007);
    float hero = rectMask(cellF, vec2(0.16, 0.52), vec2(0.36, 0.105), 0.014);
    float aside = rectMask(cellF, vec2(0.58, 0.50), vec2(0.18, 0.13), 0.014);
    float card1 = rectOutline(cellF, vec2(0.17, 0.31), vec2(0.17, 0.105), 0.009);
    float card2 = rectOutline(cellF, vec2(0.39, 0.31), vec2(0.17, 0.105), 0.009);
    float card3 = rectOutline(cellF, vec2(0.61, 0.31), vec2(0.17, 0.105), 0.009);

    float leftBrace = segmentMask(cellF, vec2(0.24, 0.24), vec2(0.18, 0.28), 0.006)
                    + segmentMask(cellF, vec2(0.18, 0.28), vec2(0.24, 0.32), 0.006)
                    + segmentMask(cellF, vec2(0.24, 0.32), vec2(0.18, 0.36), 0.006)
                    + segmentMask(cellF, vec2(0.18, 0.36), vec2(0.24, 0.40), 0.006);
    float rightBrace = segmentMask(cellF, vec2(0.72, 0.24), vec2(0.78, 0.28), 0.006)
                     + segmentMask(cellF, vec2(0.78, 0.28), vec2(0.72, 0.32), 0.006)
                     + segmentMask(cellF, vec2(0.72, 0.32), vec2(0.78, 0.36), 0.006)
                     + segmentMask(cellF, vec2(0.78, 0.36), vec2(0.72, 0.40), 0.006);
    float componentRoot = circleMask(cellF, vec2(0.49, 0.46), 0.025, 0.010);
    float componentA = circleMask(cellF, vec2(0.36, 0.38), 0.018, 0.008);
    float componentB = circleMask(cellF, vec2(0.62, 0.38), 0.018, 0.008);
    float componentLinks = segmentMask(cellF, vec2(0.49, 0.46), vec2(0.36, 0.38), 0.006)
                         + segmentMask(cellF, vec2(0.49, 0.46), vec2(0.62, 0.38), 0.006);

    float deployRoute = segmentMask(cellF, vec2(0.13, 0.18), vec2(0.88, 0.74), 0.008);
    float deployPulse = exp(-pow(fract(cellF.x * 0.84 + cellF.y * 0.30 - anim * 0.32 - cellRand) - 0.5, 2.0) * 80.0) * deployRoute;
    float viewportGlyph = rectOutline(cellF, vec2(0.69, 0.665), vec2(0.11, 0.055), 0.006)
                        + rectOutline(cellF, vec2(0.80, 0.648), vec2(0.045, 0.075), 0.005);

    col = mix(col, vec3(0.006, 0.038, 0.075), browser * 0.84);
    col += cyan * browserEdge * 0.90;
    col += ice * chrome * 0.24;
    col += magenta * tab * 0.72;
    col += vec3(1.0, 0.38, 0.48) * dotA * 0.80;
    col += vec3(1.0, 0.82, 0.30) * dotB * 0.75;
    col += lime * dotC * 0.75;
    col += ice * nav * 0.55;
    col += cyan * hero * 0.38;
    col += magenta * aside * 0.34;
    col += uAccent * (card1 + card2 + card3) * 0.70;
    col += ice * (leftBrace + rightBrace) * 0.95;
    col += lime * (componentRoot + componentA + componentB + componentLinks) * 1.10;
    col += cyan * deployRoute * 0.22 + magenta * deployPulse * 1.25;
    col += ice * viewportGlyph * 0.70;

    #if QUALITY_TIER == 1
    float sourceScan = 1.0 - smoothstep(0.010, 0.026, abs(fract(vCoord * 22.0 + uCoord * 4.0 - anim * 0.28) - 0.5));
    col += cyan * sourceScan * browser * 0.045;
    #endif

    t = browserEdge + hero + aside + card1 + card2 + card3 + deployPulse + componentRoot;
    finalSurface = col;
  }
#elif SURFACE_MODE == 10
  {
    customColor = true;

    // Mobile app planet: native app screens and gesture ripples, paired
    // with the custom cross-platform iOS/Android twin rings.
    float theta = acos(clamp(n.y, -1.0, 1.0));
    float phi = atan(n.z, n.x);
    float uCoord = phi / 6.2831853 + 0.5;
    float vCoord = theta / 3.14159265;

    #if QUALITY_TIER == 0
    vec2 gridScale = vec2(7.0, 3.5);
    float anim = 0.0;
    #else
    vec2 gridScale = vec2(10.0, 5.0);
    float anim = uTime;
    #endif

    vec2 uvGrid = vec2(uCoord, vCoord) * gridScale;
    vec2 cellId = floor(uvGrid);
    vec2 cellF = fract(uvGrid);
    float cellRand = hash31(vec3(cellId, 31.7));

    vec3 deep = vec3(0.020, 0.014, 0.060);
    vec3 purple = vec3(0.34, 0.22, 0.95);
    vec3 iosBlue = vec3(0.22, 0.60, 1.0);
    vec3 androidGreen = vec3(0.43, 1.0, 0.35);
    vec3 glass = vec3(0.82, 0.86, 1.0);

    vec3 col = deep + uColor * (0.08 + smoothstep(-0.65, 0.8, n.y) * 0.08);

    // Rounded-phone silhouette approximation using nested soft rectangles.
    float phoneBody = rectMask(cellF, vec2(0.20, 0.08), vec2(0.60, 0.84), 0.045);
    float screen = rectMask(cellF, vec2(0.24, 0.15), vec2(0.52, 0.70), 0.030);
    float phoneEdge = rectOutline(cellF, vec2(0.20, 0.08), vec2(0.60, 0.84), 0.026);
    float notch = rectMask(cellF, vec2(0.42, 0.82), vec2(0.16, 0.025), 0.012);
    float home = rectMask(cellF, vec2(0.43, 0.115), vec2(0.14, 0.012), 0.006);

    float cardA = rectMask(cellF, vec2(0.29, 0.61), vec2(0.24, 0.11), 0.014);
    float cardB = rectMask(cellF, vec2(0.55, 0.61), vec2(0.16, 0.11), 0.014);
    float list1 = rectMask(cellF, vec2(0.30, 0.47), vec2(0.36, 0.035), 0.009);
    float list2 = rectMask(cellF, vec2(0.30, 0.39), vec2(0.30, 0.030), 0.009);
    float list3 = rectMask(cellF, vec2(0.30, 0.32), vec2(0.42, 0.028), 0.009);

    float navBack = rectMask(cellF, vec2(0.28, 0.18), vec2(0.44, 0.065), 0.018);
    float nav1 = circleMask(cellF, vec2(0.35, 0.213), 0.018, 0.010);
    float nav2 = circleMask(cellF, vec2(0.50, 0.213), 0.020, 0.010);
    float nav3 = circleMask(cellF, vec2(0.65, 0.213), 0.018, 0.010);

    float tileGrid = rectOutline(cellF, vec2(0.30, 0.54), vec2(0.095, 0.070), 0.008)
                   + rectOutline(cellF, vec2(0.42, 0.54), vec2(0.095, 0.070), 0.008)
                   + rectOutline(cellF, vec2(0.54, 0.54), vec2(0.095, 0.070), 0.008);

    // Touch ripple suggests native, gesture-first interaction.
    vec2 touchPoint = vec2(0.62 + sin(cellRand * 6.283) * 0.08, 0.40 + cos(cellRand * 6.283) * 0.07);
    float wave = fract(anim * 0.55 + cellRand);
    float ripple = ringMask(cellF, touchPoint, 0.04 + wave * 0.18, 0.010) * (1.0 - wave);
    float swipe = segmentMask(cellF, vec2(0.32, 0.28), vec2(0.68, 0.70), 0.010);
    float swipePulse = exp(-pow(fract(cellF.x - anim * 0.25 + cellRand) - 0.5, 2.0) * 70.0) * swipe;

    float platformSplit = step(0.50, cellF.x) * screen;
    col = mix(col, vec3(0.055, 0.055, 0.125), phoneBody * 0.85);
    col = mix(col, vec3(0.025, 0.030, 0.070), screen * 0.90);
    col = mix(col, purple * 0.42, platformSplit * 0.22);
    col += glass * phoneEdge * 0.72;
    col += vec3(0.0) * notch;
    col += glass * home * 0.35;
    col += iosBlue * (cardA + list1 * 0.65 + list3 * 0.38 + nav1) * 0.95;
    col += androidGreen * (cardB + list2 * 0.68 + nav3) * 0.92;
    col += uAccent * (navBack * 0.22 + nav2 * 0.95 + tileGrid * 0.72);
    col += iosBlue * swipePulse * 0.80;
    col += androidGreen * ripple * 1.10;

    #if QUALITY_TIER == 1
    float appSpark = circleMask(cellF, vec2(0.27 + cellRand * 0.46, 0.27 + hash31(vec3(cellId, 9.2)) * 0.48), 0.014, 0.010);
    col += mix(iosBlue, androidGreen, cellRand) * appSpark * (0.45 + 0.45 * sin(anim * 2.0 + cellRand * 9.0));
    #endif

    t = phoneEdge + screen + cardA + cardB + nav1 + nav2 + nav3 + ripple + swipePulse;
    finalSurface = col;
  }
#elif SURFACE_MODE == 11
  {
    customColor = true;

    // SEO planet: ranked SERP lanes, keyword nodes and an upward climb line.
    float theta = acos(clamp(n.y, -1.0, 1.0));
    float phi = atan(n.z, n.x);
    float uCoord = phi / 6.2831853 + 0.5;
    float vCoord = theta / 3.14159265;

    #if QUALITY_TIER == 0
    vec2 gridScale = vec2(7.0, 4.0);
    float anim = 0.0;
    #else
    vec2 gridScale = vec2(10.0, 5.0);
    float anim = uTime;
    #endif

    vec2 uvGrid = vec2(uCoord, vCoord) * gridScale;
    vec2 cellId = floor(uvGrid);
    vec2 cellF = fract(uvGrid);
    float cellRand = hash31(vec3(cellId, 41.2));

    vec3 darkGreen = vec3(0.004, 0.026, 0.018);
    vec3 serpGreen = vec3(0.30, 1.0, 0.54);
    vec3 mint = vec3(0.78, 1.0, 0.86);
    vec3 gold = vec3(0.95, 0.86, 0.32);

    vec3 col = darkGreen + uColor * (0.08 + 0.05 * smoothstep(-0.6, 0.8, n.y));
    float panel = rectMask(cellF, vec2(0.09, 0.12), vec2(0.82, 0.74), 0.018);
    float panelEdge = rectOutline(cellF, vec2(0.09, 0.12), vec2(0.82, 0.74), 0.014);
    col = mix(col, vec3(0.015, 0.065, 0.045), panel * 0.80);

    float searchBar = rectMask(cellF, vec2(0.17, 0.73), vec2(0.48, 0.055), 0.016);
    float magnifier = ringMask(cellF, vec2(0.215, 0.758), 0.018, 0.004)
                    + segmentMask(cellF, vec2(0.228, 0.744), vec2(0.247, 0.726), 0.004);
    float result1 = rectMask(cellF, vec2(0.18, 0.58), vec2(0.56, 0.034), 0.008);
    float result2 = rectMask(cellF, vec2(0.18, 0.49), vec2(0.44, 0.030), 0.008);
    float result3 = rectMask(cellF, vec2(0.18, 0.41), vec2(0.60, 0.026), 0.008);
    float snippet = rectMask(cellF, vec2(0.18, 0.35), vec2(0.38, 0.018), 0.006);

    float climb = segmentMask(cellF, vec2(0.20, 0.24), vec2(0.40, 0.35), 0.009)
                + segmentMask(cellF, vec2(0.40, 0.35), vec2(0.56, 0.53), 0.009)
                + segmentMask(cellF, vec2(0.56, 0.53), vec2(0.78, 0.70), 0.009);
    float rankNodeA = circleMask(cellF, vec2(0.20, 0.24), 0.028, 0.012);
    float rankNodeB = circleMask(cellF, vec2(0.40, 0.35), 0.024, 0.010);
    float rankNodeC = circleMask(cellF, vec2(0.56, 0.53), 0.026, 0.010);
    float rankNodeD = circleMask(cellF, vec2(0.78, 0.70), 0.034, 0.012);

    float pulse = exp(-pow(fract(cellF.x * 0.85 + cellF.y * 0.22 - anim * 0.28 - cellRand) - 0.5, 2.0) * 72.0) * climb;
    float keywordDots = circleMask(cellF, vec2(0.72, 0.28), 0.020, 0.012)
                      + circleMask(cellF, vec2(0.80, 0.36), 0.016, 0.010)
                      + circleMask(cellF, vec2(0.67, 0.44), 0.014, 0.010);

    col += serpGreen * panelEdge * 0.82;
    col += mint * searchBar * 0.42;
    col += serpGreen * magnifier * 1.4;
    col += mint * (result1 + result2 * 0.75 + result3 * 0.60 + snippet * 0.45) * 0.82;
    col += gold * climb * 0.75 + gold * pulse * 1.35;
    col += serpGreen * (rankNodeA + rankNodeB + rankNodeC + rankNodeD + keywordDots) * 0.95;

    t = panelEdge + searchBar + climb + keywordDots;
    finalSurface = col;
  }
#elif SURFACE_MODE == 12
  {
    customColor = true;

    // Digital marketing planet: full-funnel channel dashboard and broadcast waves.
    float theta = acos(clamp(n.y, -1.0, 1.0));
    float phi = atan(n.z, n.x);
    float uCoord = phi / 6.2831853 + 0.5;
    float vCoord = theta / 3.14159265;

    #if QUALITY_TIER == 0
    vec2 gridScale = vec2(6.0, 3.5);
    float anim = 0.0;
    #else
    vec2 gridScale = vec2(9.0, 5.0);
    float anim = uTime;
    #endif

    vec2 uvGrid = vec2(uCoord, vCoord) * gridScale;
    vec2 cellF = fract(uvGrid);
    vec2 cellId = floor(uvGrid);
    float cellRand = hash31(vec3(cellId, 52.4));

    vec3 ember = vec3(0.060, 0.018, 0.004);
    vec3 orange = vec3(1.0, 0.42, 0.08);
    vec3 peach = vec3(1.0, 0.78, 0.46);
    vec3 magenta = vec3(1.0, 0.20, 0.48);
    vec3 violet = vec3(0.60, 0.38, 1.0);

    vec3 col = ember + uColor * (0.08 + 0.07 * smoothstep(-0.7, 0.9, n.y));
    float dashboard = rectMask(cellF, vec2(0.08, 0.13), vec2(0.84, 0.72), 0.018);
    float dashEdge = rectOutline(cellF, vec2(0.08, 0.13), vec2(0.84, 0.72), 0.014);
    col = mix(col, vec3(0.10, 0.035, 0.012), dashboard * 0.75);

    float funnelTop = segmentMask(cellF, vec2(0.20, 0.70), vec2(0.80, 0.70), 0.012);
    float funnelLeft = segmentMask(cellF, vec2(0.20, 0.70), vec2(0.42, 0.38), 0.012);
    float funnelRight = segmentMask(cellF, vec2(0.80, 0.70), vec2(0.58, 0.38), 0.012);
    float funnelStem = rectMask(cellF, vec2(0.45, 0.24), vec2(0.10, 0.16), 0.010);
    float funnel = funnelTop + funnelLeft + funnelRight + funnelStem;

    float channelA = circleMask(cellF, vec2(0.21, 0.30), 0.038, 0.014);
    float channelB = circleMask(cellF, vec2(0.35, 0.22), 0.030, 0.012);
    float channelC = circleMask(cellF, vec2(0.66, 0.24), 0.036, 0.014);
    float channelD = circleMask(cellF, vec2(0.80, 0.33), 0.028, 0.012);
    float connections = segmentMask(cellF, vec2(0.21, 0.30), vec2(0.48, 0.48), 0.007)
                      + segmentMask(cellF, vec2(0.35, 0.22), vec2(0.48, 0.48), 0.007)
                      + segmentMask(cellF, vec2(0.66, 0.24), vec2(0.52, 0.48), 0.007)
                      + segmentMask(cellF, vec2(0.80, 0.33), vec2(0.52, 0.48), 0.007);

    float wave = ringMask(cellF, vec2(0.50, 0.48), 0.12 + fract(anim * 0.28 + cellRand) * 0.26, 0.010)
               * (1.0 - fract(anim * 0.28 + cellRand));
    float bars = rectMask(cellF, vec2(0.18, 0.78), vec2(0.12, 0.026), 0.006)
               + rectMask(cellF, vec2(0.34, 0.78), vec2(0.19, 0.026), 0.006)
               + rectMask(cellF, vec2(0.58, 0.78), vec2(0.24, 0.026), 0.006);

    col += orange * dashEdge * 0.85;
    col += peach * bars * 0.75;
    col += orange * funnel * 0.95;
    col += magenta * (channelA + channelC) * 1.00;
    col += violet * (channelB + channelD) * 0.95;
    col += peach * connections * 0.55;
    col += uAccent * wave * 0.80;

    t = dashEdge + funnel + channelA + channelB + channelC + channelD + wave;
    finalSurface = col;
  }
#elif SURFACE_MODE == 13
  {
    customColor = true;

    // Paid ads planet: targeting reticle, conversion funnel and ROAS bars.
    float theta = acos(clamp(n.y, -1.0, 1.0));
    float phi = atan(n.z, n.x);
    float uCoord = phi / 6.2831853 + 0.5;
    float vCoord = theta / 3.14159265;

    #if QUALITY_TIER == 0
    vec2 gridScale = vec2(7.0, 3.5);
    float anim = 0.0;
    #else
    vec2 gridScale = vec2(10.0, 5.0);
    float anim = uTime;
    #endif

    vec2 uvGrid = vec2(uCoord, vCoord) * gridScale;
    vec2 cellF = fract(uvGrid);
    vec2 cellId = floor(uvGrid);
    float cellRand = hash31(vec3(cellId, 63.8));

    vec3 darkRed = vec3(0.050, 0.004, 0.014);
    vec3 red = vec3(1.0, 0.16, 0.30);
    vec3 rose = vec3(1.0, 0.62, 0.70);
    vec3 gold = vec3(1.0, 0.78, 0.24);
    vec3 mint = vec3(0.50, 1.0, 0.58);

    vec3 col = darkRed + uColor * (0.07 + 0.06 * smoothstep(-0.65, 0.85, n.y));
    float panel = rectMask(cellF, vec2(0.10, 0.12), vec2(0.80, 0.74), 0.018);
    float panelEdge = rectOutline(cellF, vec2(0.10, 0.12), vec2(0.80, 0.74), 0.014);
    col = mix(col, vec3(0.105, 0.012, 0.032), panel * 0.72);

    vec2 target = vec2(0.48, 0.58);
    float reticle = ringMask(cellF, target, 0.18, 0.010) + ringMask(cellF, target, 0.095, 0.008);
    reticle += segmentMask(cellF, target + vec2(-0.24, 0.0), target + vec2(-0.10, 0.0), 0.006)
             + segmentMask(cellF, target + vec2(0.10, 0.0), target + vec2(0.24, 0.0), 0.006)
             + segmentMask(cellF, target + vec2(0.0, -0.24), target + vec2(0.0, -0.10), 0.006)
             + segmentMask(cellF, target + vec2(0.0, 0.10), target + vec2(0.0, 0.24), 0.006);
    float bullseye = circleMask(cellF, target, 0.036, 0.014);

    float funnel = segmentMask(cellF, vec2(0.20, 0.34), vec2(0.78, 0.34), 0.010)
                 + segmentMask(cellF, vec2(0.28, 0.26), vec2(0.70, 0.26), 0.010)
                 + segmentMask(cellF, vec2(0.38, 0.18), vec2(0.60, 0.18), 0.010);
    float bars = rectMask(cellF, vec2(0.66, 0.50), vec2(0.045, 0.10), 0.006)
               + rectMask(cellF, vec2(0.73, 0.45), vec2(0.045, 0.15), 0.006)
               + rectMask(cellF, vec2(0.80, 0.39), vec2(0.045, 0.21), 0.006);
    float spark = exp(-pow(fract(cellF.y + anim * 0.35 + cellRand) - 0.5, 2.0) * 82.0) * reticle;

    col += red * panelEdge * 0.82;
    col += rose * reticle * 0.74;
    col += gold * bullseye * 1.55;
    col += red * spark * 1.20;
    col += mint * bars * 0.95;
    col += gold * funnel * 0.85;
    col += rose * checkMask(cellF, vec2(0.22, 0.74), 0.36, 0.006) * 0.9;

    t = panelEdge + reticle + bullseye + funnel + bars + spark;
    finalSurface = col;
  }
#elif SURFACE_MODE == 14
  {
    customColor = true;

    // Email marketing planet: a bold envelope-first inbox with lifecycle
    // segmentation and outbound signal waves.
    float theta = acos(clamp(n.y, -1.0, 1.0));
    float phi = atan(n.z, n.x);
    float uCoord = phi / 6.2831853 + 0.5;
    float vCoord = theta / 3.14159265;

    #if QUALITY_TIER == 0
    vec2 gridScale = vec2(6.0, 3.0);
    float anim = 0.0;
    #else
    vec2 gridScale = vec2(8.0, 4.0);
    float anim = uTime;
    #endif

    vec2 uvGrid = vec2(uCoord, vCoord) * gridScale;
    vec2 cellF = fract(uvGrid);
    vec2 cellId = floor(uvGrid);
    float cellRand = hash31(vec3(cellId, 74.9));

    vec3 tealDeep = vec3(0.002, 0.045, 0.050);
    vec3 teal = vec3(0.12, 0.86, 0.75);
    vec3 pink = vec3(1.0, 0.36, 0.70);
    vec3 paper = vec3(0.84, 1.0, 0.95);
    vec3 amber = vec3(1.0, 0.72, 0.24);

    vec3 col = tealDeep + uColor * (0.08 + 0.06 * smoothstep(-0.72, 0.90, n.y));

    float inbox = rectMask(cellF, vec2(0.09, 0.12), vec2(0.82, 0.74), 0.018);
    float inboxEdge = rectOutline(cellF, vec2(0.09, 0.12), vec2(0.82, 0.74), 0.014);
    col = mix(col, vec3(0.010, 0.085, 0.088), inbox * 0.74);

    // Keep the envelope as the primary read, larger and clearer than before.
    float envelopeBody = rectMask(cellF, vec2(0.20, 0.46), vec2(0.60, 0.30), 0.018);
    float envelopeEdge = rectOutline(cellF, vec2(0.20, 0.46), vec2(0.60, 0.30), 0.012);
    float flap = segmentMask(cellF, vec2(0.20, 0.76), vec2(0.50, 0.57), 0.009)
               + segmentMask(cellF, vec2(0.80, 0.76), vec2(0.50, 0.57), 0.009)
               + segmentMask(cellF, vec2(0.20, 0.46), vec2(0.47, 0.61), 0.008)
               + segmentMask(cellF, vec2(0.80, 0.46), vec2(0.53, 0.61), 0.008);

    // Segmentation chips and lifecycle path below the envelope.
    float chipA = rectMask(cellF, vec2(0.18, 0.30), vec2(0.16, 0.050), 0.014);
    float chipB = rectMask(cellF, vec2(0.42, 0.24), vec2(0.16, 0.050), 0.014);
    float chipC = rectMask(cellF, vec2(0.66, 0.30), vec2(0.16, 0.050), 0.014);
    float lifecycle = segmentMask(cellF, vec2(0.26, 0.30), vec2(0.50, 0.24), 0.007)
                    + segmentMask(cellF, vec2(0.50, 0.24), vec2(0.74, 0.30), 0.007);
    float nodeA = circleMask(cellF, vec2(0.26, 0.30), 0.022, 0.010);
    float nodeB = circleMask(cellF, vec2(0.50, 0.24), 0.024, 0.010);
    float nodeC = circleMask(cellF, vec2(0.74, 0.30), 0.022, 0.010);

    // Outbound broadcast arcs make it feel like always-on automation.
    float wavePhase = fract(anim * 0.24 + cellRand);
    float waveA = ringMask(cellF, vec2(0.50, 0.61), 0.21 + wavePhase * 0.22, 0.008) * (1.0 - wavePhase);
    float waveB = ringMask(cellF, vec2(0.50, 0.61), 0.33 + wavePhase * 0.18, 0.006) * (0.7 - wavePhase * 0.5);
    float sendPulse = exp(-pow(fract(cellF.x * 0.9 - anim * 0.30 + cellRand) - 0.5, 2.0) * 80.0) * lifecycle;

    col += teal * inboxEdge * 0.75;
    col = mix(col, paper, envelopeBody * 0.18);
    col += paper * envelopeEdge * 0.98;
    col += pink * flap * 1.05;
    col += teal * (chipA + chipC) * 0.72;
    col += pink * chipB * 0.66;
    col += amber * (nodeA + nodeB + nodeC) * 0.85;
    col += teal * lifecycle * 0.46 + pink * sendPulse * 1.20;
    col += uAccent * (waveA + waveB) * 0.55;

    #if QUALITY_TIER == 1
    float unreadDot = circleMask(cellF, vec2(0.76, 0.72), 0.028, 0.012);
    col += amber * unreadDot * (0.7 + 0.3 * sin(anim * 2.4 + cellRand));
    #endif

    t = inboxEdge + envelopeEdge + flap + lifecycle + nodeA + nodeB + nodeC + waveA + sendPulse;
    finalSurface = col;
  }
#elif SURFACE_MODE == 15
  {
    customColor = true;

    // Cloud/DevOps planet: infrastructure mesh, containers and rollout checks.
    float theta = acos(clamp(n.y, -1.0, 1.0));
    float phi = atan(n.z, n.x);
    float uCoord = phi / 6.2831853 + 0.5;
    float vCoord = theta / 3.14159265;

    #if QUALITY_TIER == 0
    vec2 gridScale = vec2(7.0, 3.5);
    float anim = 0.0;
    #else
    vec2 gridScale = vec2(10.0, 5.0);
    float anim = uTime;
    #endif

    vec2 uvGrid = vec2(uCoord, vCoord) * gridScale;
    vec2 cellF = fract(uvGrid);
    vec2 cellId = floor(uvGrid);
    float cellRand = hash31(vec3(cellId, 86.5));

    vec3 deepBlue = vec3(0.004, 0.016, 0.045);
    vec3 cyan = vec3(0.10, 0.76, 1.0);
    vec3 ice = vec3(0.76, 0.94, 1.0);
    vec3 green = vec3(0.35, 1.0, 0.52);
    vec3 violet = vec3(0.56, 0.48, 1.0);

    vec3 col = deepBlue + uColor * (0.06 + 0.08 * smoothstep(-0.7, 0.85, n.y));
    float gridA = 1.0 - smoothstep(0.008, 0.020, min(abs(fract(cellF.x * 4.0) - 0.5), abs(fract(cellF.y * 4.0) - 0.5)));

    float nodeA = circleMask(cellF, vec2(0.24, 0.62), 0.035, 0.014);
    float nodeB = circleMask(cellF, vec2(0.48, 0.72), 0.030, 0.012);
    float nodeC = circleMask(cellF, vec2(0.72, 0.58), 0.036, 0.014);
    float nodeD = circleMask(cellF, vec2(0.38, 0.34), 0.032, 0.012);
    float nodeE = circleMask(cellF, vec2(0.66, 0.30), 0.030, 0.012);
    float links = segmentMask(cellF, vec2(0.24, 0.62), vec2(0.48, 0.72), 0.007)
                + segmentMask(cellF, vec2(0.48, 0.72), vec2(0.72, 0.58), 0.007)
                + segmentMask(cellF, vec2(0.24, 0.62), vec2(0.38, 0.34), 0.007)
                + segmentMask(cellF, vec2(0.38, 0.34), vec2(0.66, 0.30), 0.007)
                + segmentMask(cellF, vec2(0.72, 0.58), vec2(0.66, 0.30), 0.007);

    float containerA = rectOutline(cellF, vec2(0.28, 0.45), vec2(0.16, 0.11), 0.008);
    float containerB = rectOutline(cellF, vec2(0.48, 0.43), vec2(0.16, 0.11), 0.008);
    float containerC = rectOutline(cellF, vec2(0.40, 0.24), vec2(0.16, 0.10), 0.008);
    float pulse = exp(-pow(fract(cellF.x + cellF.y * 0.4 - anim * 0.30 - cellRand) - 0.5, 2.0) * 76.0) * links;
    float health = checkMask(cellF, vec2(0.70, 0.73), 0.42, 0.006);

    col += cyan * gridA * 0.07;
    col += cyan * links * 0.50 + uAccent * pulse * 1.20;
    col += ice * (containerA + containerB + containerC) * 0.75;
    col += green * (nodeA + nodeB + nodeC + nodeD + nodeE + health) * 0.95;
    col += violet * ringMask(cellF, vec2(0.50, 0.50), 0.34 + fract(anim * 0.16 + cellRand) * 0.10, 0.006) * 0.25;

    t = gridA + links + nodeA + nodeB + nodeC + nodeD + nodeE + containerA + containerB + containerC;
    finalSurface = col;
  }
#else
  {
    float base = fbm(n * 2.6);
    float pit = vnoise(n * 11.0);
    t = base * 0.6 + smoothstep(0.6, 0.9, pit) * 0.5;
  }
#endif

  float diffuse = max(dot(N, uLightDir), 0.0);
  diffuse = pow(diffuse, 0.85);

  float ambient = 0.015;
  vec3 surfaceColor = customColor ? finalSurface : palette(clamp(t, 0.0, 1.0), uColor, uAccent);

  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0) * max(dot(N, uLightDir), 0.0);

  vec3 color = customColor
    ? surfaceColor * (diffuse * 0.9 + 0.05) + uAccent * rim * 0.4
    : surfaceColor * (diffuse + ambient) + uAccent * rim * 0.4;

  // Output in linear space; ToneMapping pass in EffectComposer handles final ACES compression
  gl_FragColor = vec4(color, 1.0);
}
`;
