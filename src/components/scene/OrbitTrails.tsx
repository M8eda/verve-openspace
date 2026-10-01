"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { services, type Service } from "@/data/services";
import { fixedOrbitTime, orbitAngle, orbitPointAt } from "@/lib/orbit";
import { isFreeMode } from "@/lib/freeMode";
import { overviewStrength } from "@/lib/mapVisibility";

const SEGMENTS = 240;
const TAU = Math.PI * 2;
/** Trails stay up in EVA, but quieter, so free roam still reads as a map. */
const EVA_STRENGTH = 0.5;

const trailVertex = /* glsl */ `
attribute float aAngle;
varying float vAngle;
void main() {
  vAngle = aAngle;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Faint full orbit plus a comet tail that is brightest at the planet and
// fades out over the trailing half of the orbit.
const trailFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uHead;
uniform float uOpacity;
varying float vAngle;
void main() {
  float behind = mod(uHead - vAngle, 6.28318530718) / 6.28318530718;
  float tail = pow(1.0 - behind, 3.2);
  float alpha = uOpacity * (0.14 + 0.86 * tail);
  gl_FragColor = vec4(uColor * (0.75 + 0.6 * tail), alpha);
  #include <colorspace_fragment>
}
`;

function buildGeometry(service: Service) {
  const positions = new Float32Array((SEGMENTS + 1) * 3);
  const angles = new Float32Array(SEGMENTS + 1);
  const p = new THREE.Vector3();
  for (let i = 0; i <= SEGMENTS; i++) {
    const a = (i / SEGMENTS) * TAU;
    orbitPointAt(service, a, p);
    positions.set([p.x, p.y, p.z], i * 3);
    angles[i] = a;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aAngle", new THREE.BufferAttribute(angles, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

/** Each planet's real orbit, drawn in its own colour, for the overview map. */
export default function OrbitTrails({ reduceMotion = false }: { reduceMotion?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  const trails = useMemo(
    () =>
      services.map((service) => {
        const material = new THREE.ShaderMaterial({
          vertexShader: trailVertex,
          fragmentShader: trailFragment,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
          uniforms: {
            uColor: { value: new THREE.Color(service.visual.color) },
            uHead: { value: 0 },
            uOpacity: { value: 0 },
          },
        });
        const line = new THREE.Line(buildGeometry(service), material);
        line.frustumCulled = false;
        return { service, line, material };
      }),
    [],
  );

  useEffect(
    () => () => {
      for (const { line, material } of trails) {
        line.geometry.dispose();
        material.dispose();
      }
    },
    [trails],
  );

  useFrame(({ clock }) => {
    const strength = isFreeMode() ? EVA_STRENGTH : overviewStrength();
    const group = groupRef.current;
    if (!group) return;
    group.visible = strength > 0.002;
    if (!group.visible) return;

    for (const { service, material } of trails) {
      const t = reduceMotion ? fixedOrbitTime(service) : clock.elapsedTime;
      material.uniforms.uHead.value = orbitAngle(service, t) % TAU;
      material.uniforms.uOpacity.value = strength * 0.85;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {trails.map(({ service, line }) => (
        <primitive key={service.slug} object={line} />
      ))}
    </group>
  );
}
