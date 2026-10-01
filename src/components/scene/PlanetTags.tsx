"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BODIES, bodyLabel, bodyNumber, type Body } from "@/lib/bodies";
import { getBodyPosition } from "@/lib/planetPositions";
import { isFreeMode } from "@/lib/freeMode";
import { EMBLEM_SCREEN_FRACTION, overviewStrength } from "@/lib/mapVisibility";
import { CORE_ID, focusBody, getFocus, planetHover } from "@/lib/planetFocus";
import { playGlassClick, playGlassHover } from "@/lib/audio";
import { trackEvent } from "@/lib/analytics";

/** Gap between the top of a body and its tag, in px. */
const TAG_GAP = 8;

type Tag = {
  body: Body;
  el: HTMLButtonElement;
  last: string;
  shown: boolean;
};

/**
 * Terminal-style name tags pinned above each planet: read-only on the
 * overview map, clickable "fly to" targets in EVA. Plain DOM positioned
 * from the 3D scene every frame, mounted outside .content so it survives
 * EVA hiding the page layer.
 */
export default function PlanetTags() {
  const tags = useRef<Tag[]>([]);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const scratch = useRef({ world: new THREE.Vector3(), ndc: new THREE.Vector3() });

  useEffect(() => {
    const layer = document.createElement("div");
    layer.className = "map-tags";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
    layerRef.current = layer;

    tags.current = BODIES.map((body) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "map-tag";
      el.tabIndex = -1;
      el.style.display = "none";
      el.dataset.id = body.id;
      el.style.setProperty("--tag", body.color);
      const num = document.createElement("span");
      num.className = "map-tag-num";
      num.textContent = bodyNumber(body);
      const name = document.createElement("span");
      name.className = "map-tag-name";
      name.textContent = bodyLabel(body);
      el.append(num, name);
      el.addEventListener("mouseenter", () => {
        if (isFreeMode()) playGlassHover();
      });
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!isFreeMode()) return;
        playGlassClick();
        trackEvent("eva_fly_to", { target: body.id, source: "map_tag" });
        focusBody(body.id);
      });
      layer.appendChild(el);
      return { body, el, last: "", shown: false };
    });

    return () => {
      layer.remove();
      layerRef.current = null;
      tags.current = [];
    };
  }, []);

  useFrame(({ camera, size }) => {
    const layer = layerRef.current;
    if (!layer) return;
    const free = isFreeMode();
    const strength = free ? 1 : overviewStrength();
    layer.style.opacity = strength.toFixed(3);
    layer.classList.toggle("is-live", free);
    if (strength <= 0.002) {
      layer.style.visibility = "hidden";
      return;
    }
    layer.style.visibility = "";

    const { world, ndc } = scratch.current;
    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 38;
    const focus = getFocus();
    const pxPerUnit = size.height / 2 / Math.tan(THREE.MathUtils.degToRad(fov) / 2);

    for (const tag of tags.current) {
      const { body, el } = tag;
      getBodyPosition(body.id, world);
      ndc.copy(world).project(camera);
      const distance = world.distanceTo(camera.position);
      // The core has the brand emblem on the overview; its tag is EVA-only.
      // A focused body already has the terminal naming it.
      const visible =
        ndc.z < 1 && distance > body.radius * 1.5 && (free || body.id !== CORE_ID) && body.id !== focus;
      if (visible !== tag.shown) {
        tag.shown = visible;
        el.style.display = visible ? "" : "none";
      }
      if (!visible) continue;

      const x = (ndc.x * 0.5 + 0.5) * size.width;
      const radiusPx = (body.radius / distance) * pxPerUnit;
      // The core tag clears the brand emblem floating above it.
      const lift = body.id === CORE_ID ? size.height * EMBLEM_SCREEN_FRACTION * 1.5 : 0;
      const y = (-ndc.y * 0.5 + 0.5) * size.height - radiusPx - TAG_GAP - lift;
      const next = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      if (next !== tag.last) {
        el.style.transform = next;
        tag.last = next;
      }
      el.classList.toggle("is-hover", planetHover.id === body.id);
    }
  });

  return null;
}
