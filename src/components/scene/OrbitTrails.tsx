"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { services, type Service } from "@/data/services";
import { fixedOrbitTime, orbitAngle, orbitPointAt } from "@/lib/orbit";
import { isFreeMode } from "@/lib/freeMode";
import { overviewStrength } from "@/lib/mapVisibility";
import { coreStrength, finale, FINALE_ORDER } from "@/lib/finale";

const SEGMENTS = 240;
const TAU = Math.PI * 2;
/** Trails stay up in EVA, but quieter, so free roam still reads as a map. */
const EVA_STRENGTH = 0.5;
/** Steady brightness of an orbit the finale has checked off. */
const FINALE_STRENGTH = 0.7;
/** How fast a check-off flash dies away (per second, exponential). */
const FLASH_DECAY = 2.4;

const trailVertex = /* glsl */ `
attribute float aAngle;
varying float vAngle;
void main() {
  vAngle = aAngle;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Faint full orbit plus a comet tail that is brightest at the planet and
// fades out over the trailing half of the orbit. uFlash lights the whole
// ring evenly, hot enough to bloom, when the finale checks it off.
const trailFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uHead;
uniform float uOpacity;
uniform float uFlash;
varying float vAngle;
void main() {
  float behind = mod(uHead - vAngle, 6.28318530718) / 6.28318530718;
  float tail = pow(1.0 - behind, 3.2);
  float alpha = min(1.0, uOpacity * (0.14 + 0.86 * tail) + uFlash * 0.8);
  gl_FragColor = vec4(uColor * (0.75 + 0.6 * tail + uFlash * 1.6), alpha);
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

/**
 * Each planet's real orbit, drawn in its own colour: the overview map, and
 * the finale, where the core's systems check lights them one at a time from
 * the outside in.
 */
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
            uFlash: { value: 0 },
          },
        });
        const line = new THREE.Line(buildGeometry(service), material);
        line.frustumCulled = false;
        // Finale state: position in the systems check, eased 0..1 lit level,
        // and the flash from the moment it was checked off.
        const rank = FINALE_ORDER.indexOf(service);
        return { service, line, material, rank, level: 0, flash: 0, on: false };
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

  useFrame(({ clock }, delta) => {
    const free = isFreeMode();
    const strength = free ? EVA_STRENGTH : overviewStrength();
    const core = free ? 0 : coreStrength();
    const dt = Math.min(delta, 0.05);
    const group = groupRef.current;
    if (!group) return;

    let any = strength > 0.002;
    for (const trail of trails) {
      const on = core > 0 && trail.rank < finale.lit;
      // Flash only when checked off live; a revisit just shows them lit.
      if (on && !trail.on && !finale.instant && !reduceMotion) trail.flash = 1;
      trail.on = on;
      trail.level =
        reduceMotion || finale.instant
          ? Number(on)
          : THREE.MathUtils.damp(trail.level, Number(on), on ? 6 : 3, dt);
      trail.flash *= Math.exp(-FLASH_DECAY * dt);
      if (trail.level > 0.002) any = true;
    }
    group.visible = any;
    if (!any) return;

    for (const { service, material, level, flash } of trails) {
      const t = reduceMotion ? fixedOrbitTime(service) : clock.elapsedTime;
      material.uniforms.uHead.value = orbitAngle(service, t) % TAU;
      material.uniforms.uOpacity.value = Math.max(strength * 0.85, core * level * FINALE_STRENGTH);
      material.uniforms.uFlash.value = core * flash;
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
