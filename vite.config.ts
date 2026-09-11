import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    define: {
      "process.env.SUPABASE_URL": JSON.stringify(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      "process.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    },
  },
  // Ensure Nitro uses the correct preset for Vercel deployments
  nitro: {
    preset: process.env.VERCEL ? "vercel" : undefined,
  },
});
