"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { services } from "@/data/services";
import { getPlanetPosition } from "@/lib/planetPositions";
import { isFreeMode, subscribeFreeMode, closeFreeMode } from "@/lib/freeMode";
import { playGlassHover, playGlassClick } from "@/lib/audio";

export default function PlanetLabels() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isFreeMode());
    return subscribeFreeMode(setActive);
  }, []);

  if (!active) return null;

  return (
    <>
      {services.map((s) => (
        <SingleLabel
          key={s.slug}
          slug={s.slug}
          name={s.name}
          radius={s.visual.planetRadius}
        />
      ))}
    </>
  );
}

function SingleLabel({
  slug,
  name,
  radius,
}: {
  slug: string;
  name: string;
  radius: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const target = getPlanetPosition(slug);
  const router = useRouter();
  const lastPosition = useMemo(() => new THREE.Vector3(Number.NaN, Number.NaN, Number.NaN), []);

  useFrame(() => {
    if (!groupRef.current) return;

    const nextY = target.y + radius * 2.4;
    if (
      lastPosition.x === target.x &&
      lastPosition.y === nextY &&
      lastPosition.z === target.z
    ) {
      return;
    }

    groupRef.current.position.set(target.x, nextY, target.z);
    lastPosition.set(target.x, nextY, target.z);
  });

  return (
    <group ref={groupRef}>
      <Html center zIndexRange={[50, 0]} pointerEvents="auto">
        <button
          type="button"
          aria-label={`Open ${name} service page`}
          onMouseEnter={() => playGlassHover()}
          onClick={() => {
            playGlassClick();
            closeFreeMode();
            router.push(`/services/${slug}`);
          }}
          style={{
            padding: "0.4rem 0.9rem",
            background: "rgba(12, 14, 24, 0.82)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: "1px solid rgba(205, 247, 87, 0.55)",
            borderRadius: "999px",
            color: "#eef3ef",
            fontSize: "0.78rem",
            fontWeight: 600,
            letterSpacing: "0.01em",
            cursor: "pointer",
            whiteSpace: "nowrap",
            boxShadow:
              "0 0 14px rgba(205, 247, 87, 0.28), inset 0 1px 0 rgba(255,255,255,0.15)",
            fontFamily: "inherit",
          }}
        >
          {name} →
        </button>
      </Html>
    </group>
  );
}
