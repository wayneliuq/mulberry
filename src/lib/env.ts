import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
});

export type ClientEnv = z.infer<typeof envSchema>;

export function parseClientEnv(
  source: Record<string, string | undefined>,
): ClientEnv {
  return envSchema.parse(source);
}

let cachedClientEnv: ClientEnv | null = null;

export function getClientEnv(): ClientEnv {
  if (!cachedClientEnv) {
    cachedClientEnv = parseClientEnv(import.meta.env);
  }

  return cachedClientEnv;
}
