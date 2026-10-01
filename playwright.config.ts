import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.SMOKE_PORT ?? 3100);

/**
 * Smoke tests run against a production build (`npm run build` first), on
 * their own port so they never collide with a dev server on :3000.
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  // The home tests render WebGL in software; several at once starve the CPU.
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Software WebGL so the 3D scene renders on machines/CI without a GPU.
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
