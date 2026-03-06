import { createClient } from "@supabase/supabase-js";
import { getClientEnv } from "../env";

const clientEnv = getClientEnv();

export const supabase = createClient(
  clientEnv.VITE_SUPABASE_URL,
  clientEnv.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
    },
  },
);
