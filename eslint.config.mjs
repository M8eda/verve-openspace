import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // react-three-fiber is imperative by design: materials and uniforms are
    // created once in useMemo and written to every frame in useFrame. The
    // React Compiler's immutability rule reads that as a bug, so it's off
    // for the 3D scene only.
    files: ["src/components/scene/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
  {
    // Reading browser-only state (localStorage, matchMedia, URL) after mount
    // is how these components stay hydration-safe. Kept visible as a warning:
    // the cleaner long-term fix is useSyncExternalStore.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "test-results/**", "playwright-report/**"]),
]);

export default eslintConfig;
