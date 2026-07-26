import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.api.test.ts"],
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
