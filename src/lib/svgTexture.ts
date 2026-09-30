import * as THREE from "three";

/**
 * Loads an SVG from a URL and rasterizes it onto a CanvasTexture.
 * Useful for using SVGs as textures in Three.js.
 */
export async function loadSvgAsTexture(
  url: string,
  size: number = 512
): Promise<THREE.CanvasTexture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Maintain aspect ratio while fitting into the square canvas
      const aspect = img.width / img.height;
      let drawW, drawH;
      if (aspect > 1) {
        drawW = size;
        drawH = size / aspect;
      } else {
        drawH = size;
        drawW = size * aspect;
      }

      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, (size - drawW) / 2, (size - drawH) / 2, drawW, drawH);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      resolve(texture);
    };
    img.onerror = () => reject(new Error(`Failed to load SVG from ${url}`));
    img.src = url;
  });
}
