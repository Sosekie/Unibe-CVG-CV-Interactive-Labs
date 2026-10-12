import vinext from "vinext";
import { defineConfig } from "vite";

// LABS_API_URL: course API for votes and answer releases (lib/labs-api.ts).
// LABS_BASE_PATH: this lab's folder on the course site (next.config.ts).
// Tailwind runs through postcss.config.mjs.
export default defineConfig({
  define: {
    "process.env.LABS_API_URL": JSON.stringify(process.env.LABS_API_URL ?? ""),
    "process.env.LABS_BASE_PATH": JSON.stringify(process.env.LABS_BASE_PATH ?? ""),
  },
  server: { host: "127.0.0.1", allowedHosts: ["localhost", "127.0.0.1"] },
  plugins: [vinext()],
});
