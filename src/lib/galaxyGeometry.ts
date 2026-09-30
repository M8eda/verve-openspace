import { mulberry32 } from "./random";

const TAU = Math.PI * 2;
const ARM_COUNT = 4;
const WIND_TURNS = 1.5;
const R_MIN = 3;
const R_MAX = 72;
const ARM_WIDTH = 14;
const DISC_THICKNESS = 2.0;

function gaussRand(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-10);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(TAU * u2);
}

/**
 * Galaxy stars laid out in the XZ plane (y = vertical thickness).
 * Matches the galaxy disc mesh orientation in Galaxy.tsx.
 */
export function buildGalaxyGeometry(count: number, seed = 42) {
  const rand = mulberry32(seed);

  const armStars = Math.floor(count * 0.78);
  const bulgeStars = count - armStars;

  const position = new Float32Array(count * 3);
  const color = new Float32Array(count * 3);
  const brightness = new Float32Array(count);
  const scale = new Float32Array(count);
  const depthSeed = new Float32Array(count);
  const phase = new Float32Array(count);
  const rate = new Float32Array(count);

  let idx = 0;

  for (let i = 0; i < armStars; i++) {
    const arm = Math.floor(rand() * ARM_COUNT);
    const armAngle = (arm * TAU) / ARM_COUNT;

    const t = Math.pow(rand(), 0.65);
    const r = R_MIN + (R_MAX - R_MIN) * t;
    const theta = t * WIND_TURNS * TAU + armAngle;

    const scatter = gaussRand(rand) * ARM_WIDTH * (0.2 + 0.8 * t) * 0.3;
    const yScatter = gaussRand(rand) * DISC_THICKNESS * (1 - t * 0.4);

    const tx = -Math.sin(theta);
    const tz = Math.cos(theta);

    // XZ plane: x and z are the spiral, y is vertical thickness
    position[idx * 3] = r * Math.cos(theta) + scatter * tz;
    position[idx * 3 + 1] = yScatter;
    position[idx * 3 + 2] = r * Math.sin(theta) - scatter * tx;

    const warmth = 1 - t;
    const c = rand();
    if (c < 0.2) {
      color[idx * 3] = 0.5 + warmth * 0.3;
      color[idx * 3 + 1] = 0.92 + rand() * 0.08;
      color[idx * 3 + 2] = 0.3 + (1 - warmth) * 0.35;
    } else if (c < 0.55) {
      color[idx * 3] = 0.88 + rand() * 0.12;
      color[idx * 3 + 1] = 0.84 + rand() * 0.12;
      color[idx * 3 + 2] = 0.72 + rand() * 0.15;
    } else {
      color[idx * 3] = 0.68 + rand() * 0.15;
      color[idx * 3 + 1] = 0.78 + rand() * 0.12;
      color[idx * 3 + 2] = 0.92 + rand() * 0.08;
    }

    const dist = Math.abs(scatter) / (ARM_WIDTH * 0.5);
    brightness[idx] =
      (0.35 + 0.65 * Math.pow(rand(), 1.6)) * (1 - dist * 0.4);

    scale[idx] = 1.2 + rand() * 2.5;
    depthSeed[idx] = rand();
    phase[idx] = rand() * TAU;
    rate[idx] = 0.25 + rand() * 1.6;

    idx++;
  }

  for (let i = 0; i < bulgeStars; i++) {
    const r = Math.pow(rand(), 2.2) * R_MAX * 0.4;
    const theta = rand() * TAU;
    const yScatter =
      gaussRand(rand) * DISC_THICKNESS * 2.0 * (1 - r / (R_MAX * 0.4));

    position[idx * 3] = r * Math.cos(theta);
    position[idx * 3 + 1] = yScatter;
    position[idx * 3 + 2] = r * Math.sin(theta);

    const warmFactor = 1 - r / (R_MAX * 0.4);
    color[idx * 3] = 0.92 + rand() * 0.08;
    color[idx * 3 + 1] = 0.78 + warmFactor * 0.15 + rand() * 0.07;
    color[idx * 3 + 2] = 0.55 + warmFactor * 0.2 + rand() * 0.15;

    brightness[idx] = (0.4 + 0.6 * rand()) * (0.5 + 0.5 * warmFactor);
    scale[idx] = 1.0 + rand() * 2.0;
    depthSeed[idx] = rand();
    phase[idx] = rand() * TAU;
    rate[idx] = 0.25 + rand() * 1.6;

    idx++;
  }

  return { position, color, brightness, scale, depthSeed, phase, rate };
}
