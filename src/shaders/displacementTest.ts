import { NOISE_GLSL } from "./noise";

export const displacementTestVertex = /* glsl */ `
  ${NOISE_GLSL}

  uniform float uTime;
  uniform float uDisplacementScale;

  varying vec3 vNormal;
  varying vec3 vDisplacedNormal;
  varying vec3 vViewPosition;
  varying float vHeight;

  void main() {
    // Very gentle, low-amplitude bumps — mostly smooth sphere
    float bump = fbm(normal * 0.6) * 0.6 + fbm(normal * 1.4) * 0.4;
    bump = clamp(bump, 0.0, 1.0);
    vHeight = bump;

    vec3 displacedPosition = position + normal * bump * uDisplacementScale;

    // Finite-difference normal
    float eps = 0.01;
    vec3 helper = abs(normal.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangent   = normalize(cross(helper, normal));
    vec3 bitangent = cross(normal, tangent);

    vec3 n1 = normalize(position + tangent * eps);
    vec3 n2 = normalize(position + bitangent * eps);
    float h1 = clamp(fbm(n1 * 0.6) * 0.6 + fbm(n1 * 1.4) * 0.4, 0.0, 1.0);
    float h2 = clamp(fbm(n2 * 0.6) * 0.6 + fbm(n2 * 1.4) * 0.4, 0.0, 1.0);

    float R = length(position);
    vec3 dp1 = n1 * (R + h1 * uDisplacementScale);
    vec3 dp2 = n2 * (R + h2 * uDisplacementScale);
    vec3 newNormal = normalize(cross(dp1 - displacedPosition, dp2 - displacedPosition));

    vDisplacedNormal = normalize(normalMatrix * newNormal);
    vNormal = normalize(normalMatrix * normal);

    vec4 mvPosition = modelViewMatrix * vec4(displacedPosition, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const displacementTestFragment = /* glsl */ `
  uniform vec3 uLightDir;

  varying vec3 vNormal;
  varying vec3 vDisplacedNormal;
  varying vec3 vViewPosition;
  varying float vHeight;

  void main() {
    vec3 normal   = normalize(vDisplacedNormal);
    vec3 viewDir  = normalize(vViewPosition);
    vec3 lightDir = normalize(uLightDir);

    float diff    = max(0.0, dot(normal, lightDir));
    float ambient = 0.30;

    // Rim glow
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0) * 0.18;

    // Pure lush-green palette — no grey, no white, no rock
    vec3 shadow = vec3(0.06, 0.20, 0.04);   // deep shadow green
    vec3 mid    = vec3(0.14, 0.46, 0.08);   // main grass
    vec3 bright = vec3(0.22, 0.62, 0.12);   // lit hill
    vec3 crown  = vec3(0.30, 0.72, 0.18);   // sunlit crown

    vec3 col = mix(shadow, mid,    smoothstep(0.10, 0.40, vHeight));
    col      = mix(col,    bright, smoothstep(0.40, 0.65, vHeight));
    col      = mix(col,    crown,  smoothstep(0.65, 0.85, vHeight));

    vec3 finalColor = col * (diff + ambient);
    finalColor += vec3(0.15, 0.70, 0.10) * rim;

    // Subtle specular
    vec3 h = normalize(lightDir + viewDir);
    finalColor += vec3(0.8, 1.0, 0.7) * pow(max(dot(normal, h), 0.0), 28.0) * 0.18;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
