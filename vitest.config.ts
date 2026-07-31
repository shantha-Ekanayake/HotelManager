import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  // tsconfig.json sets jsx:"preserve" which OXC (vite 8 default transformer)
  // also honours, leaving JSX untransformed.  Override it here so component
  // tests can import .tsx files without "invalid JS syntax" errors.
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.api.test.ts", "tests/**/*.component.test.tsx"],
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
      "@": path.resolve(__dirname, "client/src"),
    },
    // Ensure SESSION_SECRET is always set for the auth module
    env: {
      SESSION_SECRET: process.env.SESSION_SECRET ?? "test-jwt-secret-for-vitest-runs",
      SMTP_HOST: "", // Intentionally empty to exercise the no-op path
    },
  },
});
