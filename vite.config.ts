// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// These are public connection values (the same values shipped to every browser),
// not privileged credentials. Lovable injects them automatically, while external
// hosts such as Vercel do not. Keep fallbacks so auth and SSR can start there too.
const publicBackendUrl = "https://qghhqkizrktuauwfenqf.supabase.co";
const publicBackendKey = "sb_publishable_BYxP2DBHJsh8cdK_voxeVQ_vEouwxEV";

export default defineConfig({
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        process.env["VITE_SUPABASE_URL"] ?? publicBackendUrl,
      ),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? publicBackendKey,
      ),
      "process.env.SUPABASE_URL": JSON.stringify(
        process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? publicBackendUrl,
      ),
      "process.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        process.env["SUPABASE_PUBLISHABLE_KEY"] ??
          process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
          publicBackendKey,
      ),
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
