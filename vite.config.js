import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
export default defineConfig({
    base: "/mulberry/",
    plugins: [react()],
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: "./src/test/setup.ts",
        // `src/lib/supabase/client.ts` validates these at import time, so any suite
        // that transitively imports the API layer fails to even load without them.
        // Placeholders only — tests mock the client; nothing here reaches a network.
        env: {
            VITE_SUPABASE_URL: "https://test.supabase.invalid",
            VITE_SUPABASE_ANON_KEY: "test-anon-key-not-a-real-credential",
        },
    },
});
