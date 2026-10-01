"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CORE_RADIUS } from "@/lib/constants";
import { isFreeMode } from "@/lib/freeMode";
import { EMBLEM_SCREEN_FRACTION, overviewStrength } from "@/lib/mapVisibility";
import { LOGO_V_OFFSET, LOGO_V_PATH } from "@/lib/logoPath";

const TEXTURE_SIZE = 256;
const EVA_STRENGTH = 0.7;

/** The Verve icon (lime tile, dark V) with a soft phosphor glow. */
function drawEmblem(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext("2d")!;

  const tile = 168;
  const x = (TEXTURE_SIZE - tile) / 2;
  const y = (TEXTURE_SIZE - tile) / 2;

  ctx.shadowColor = "rgba(205, 247, 87, 0.85)";
  ctx.shadowBlur = 34;
  ctx.fillStyle = "#cdf757";
  ctx.beginPath();
  ctx.roundRect(x, y, tile, tile, 26);
  ctx.fill();
  ctx.shadowBlur = 0;

  // The icon is a 190 × 191 box with the V drawn at translate(10, 35).
  const scale = tile / 190;
  ctx.save();
  ctx.translate(x + LOGO_V_OFFSET.x * scale, y + LOGO_V_OFFSET.y * scale);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#010100";
  ctx.fill(new Path2D(LOGO_V_PATH));
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * Brand emblem that hovers over the core on the overview map, so the
 * drone shot reads as "the Verve system" at a glance. Kept at a constant
 * on-screen size however far away the camera is.
 */
export default function CoreEmblem() {
  const spriteRef = useRef<THREE.Sprite>(null);
  const material = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: drawEmblem(),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        opacity: 0,
      }),
    [],
  );

  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material],
  );

  useFrame(({ camera }) => {
    const sprite = spriteRef.current;
    if (!sprite) return;
    const strength = isFreeMode() ? EVA_STRENGTH : overviewStrength();
    sprite.visible = strength > 0.002;
    if (!sprite.visible) return;

    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 38;
    const distance = camera.position.length();
    const size = distance * Math.tan(THREE.MathUtils.degToRad(fov) / 2) * 2 * EMBLEM_SCREEN_FRACTION;
    sprite.scale.setScalar(size);
    sprite.position.set(0, CORE_RADIUS * 1.25 + size * 0.75, 0);
    material.opacity = strength;
  });

  return <sprite ref={spriteRef} material={material} renderOrder={10} visible={false} />;
}
