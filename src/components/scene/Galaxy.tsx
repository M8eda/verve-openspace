"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildGalaxyGeometry } from "@/lib/galaxyGeometry";
import { galaxyVertex, galaxyFragment } from "@/shaders/galaxy";
import { galaxyDiscVertex, galaxyDiscFragment } from "@/shaders/galaxyDisc";
import { pagerPosition } from "@/lib/journeyPager";
import { isWeakGPU } from "@/lib/device";

export default function Galaxy({ reduceMotion = false }: { reduceMotion?: boolean }) {
  const isWeak = useMemo(() => isWeakGPU(), []);
  const starCount = isWeak ? 2400 : 3200;
  const groupRef = useRef<THREE.Group>(null);

  const { starGeo, starMat, discMat } = useMemo(() => {
    const data = buildGalaxyGeometry(starCount);

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(data.position, 3));
    starGeo.setAttribute("aColor", new THREE.BufferAttribute(data.color, 3));
    starGeo.setAttribute("aBrightness", new THREE.BufferAttribute(data.brightness, 1));
    starGeo.setAttribute("aScale", new THREE.BufferAttribute(data.scale, 1));
    starGeo.setAttribute("aDepthSeed", new THREE.BufferAttribute(data.depthSeed, 1));
    starGeo.setAttribute("aPhase", new THREE.BufferAttribute(data.phase, 1));
    starGeo.setAttribute("aRate", new THREE.BufferAttribute(data.rate, 1));

    const starMat = new THREE.ShaderMaterial({
      vertexShader: galaxyVertex,
      fragmentShader: galaxyFragment,
      uniforms: {
        uExpansion: { value: 0 },
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });

    const discMat = new THREE.ShaderMaterial({
      vertexShader: galaxyDiscVertex,
      fragmentShader: galaxyDiscFragment,
      uniforms: {
        uTime: { value: 0 },
        uExpansion: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide,
    });

    return { starGeo, starMat, discMat };
  }, [starCount]);

  useFrame(({ clock, gl }) => {
    const expansion = THREE.MathUtils.clamp(pagerPosition(), 0, 1);
    const t = reduceMotion ? 0 : clock.elapsedTime;

    starMat.uniforms.uExpansion.value = expansion;
    starMat.uniforms.uTime.value = t;
    starMat.uniforms.uPixelRatio.value = gl.getPixelRatio();

    discMat.uniforms.uExpansion.value = expansion;
    discMat.uniforms.uTime.value = t;

    if (groupRef.current) {
      groupRef.current.rotation.y = reduceMotion ? 0 : t * 0.025;
      groupRef.current.visible = expansion < 1;
    }
  });

  useEffect(
    () => () => {
      starGeo.dispose();
      starMat.dispose();
      discMat.dispose();
    },
    [starGeo, starMat, discMat],
  );

  return (
    <group ref={groupRef}>
      {/* Galaxy nebula disc — CircleGeometry is XY, rotate to XZ */}
      <mesh material={discMat} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-5}>
        <circleGeometry args={[82, 128]} />
      </mesh>

      {/* Individual stars scattered along the spiral arms (already in XZ) */}
      <points geometry={starGeo} material={starMat} frustumCulled={false} />
    </group>
  );
}
