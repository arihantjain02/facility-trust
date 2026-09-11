import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Public browser connection values. External hosts do not receive Lovable's
// managed environment injection, so these keep authentication available there.
const publicBackendUrl = "https://qghhqkizrktuauwfenqf.supabase.co";
const publicBackendKey = "sb_publishable_BYxP2DBHJsh8cdK_voxeVQ_vEouwxEV";
const isVercel = Boolean(process.env["VERCEL"]);

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
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
  ...(isVercel ? { nitro: { preset: "vercel" } } : {}),
});
