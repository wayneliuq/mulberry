import { parseClientEnv } from "./env";

describe("parseClientEnv", () => {
  it("accepts the required client keys", () => {
    expect(
      parseClientEnv({
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toEqual({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_ANON_KEY: "anon-key",
    });
  });

  it("throws when required values are missing", () => {
    expect(() =>
      parseClientEnv({
        VITE_SUPABASE_URL: "",
        VITE_SUPABASE_ANON_KEY: "",
      }),
    ).toThrow();
  });
});
