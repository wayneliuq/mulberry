import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@4";
import { corsHeaders } from "./cors.ts";

const adminPayloadSchema = z.object({
  password: z.string().trim().min(1),
});

export type AdminClient = SupabaseClient;

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export function methodNotAllowedResponse() {
  return jsonResponse({ error: "Method not allowed" }, 405);
}

export function invalidRequestResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Invalid request";
  return jsonResponse({ error: message }, 400);
}

export function serverErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Server error";
  return jsonResponse({ error: message }, 500);
}

export function assertEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export async function createAdminClient() {
  const supabaseUrl = assertEnv("SUPABASE_URL");
  const serviceRoleKey = assertEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

export async function verifyAdminPassword(
  supabase: AdminClient,
  password: string,
) {
  const { data, error } = await supabase.rpc("verify_admin_password", {
    candidate: password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    const invalidError = new Error("Invalid admin password");
    invalidError.name = "UnauthorizedError";
    throw invalidError;
  }
}

export async function createVerifiedAdminClient(
  payload: unknown,
): Promise<{ payload: z.infer<typeof adminPayloadSchema>; supabase: AdminClient }> {
  const parsedPayload = adminPayloadSchema.parse(payload);
  const supabase = await createAdminClient();

  await verifyAdminPassword(supabase, parsedPayload.password);

  return {
    payload: parsedPayload,
    supabase,
  };
}

export async function insertAuditLog(
  supabase: AdminClient,
  eventType: string,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>,
) {
  const { error } = await supabase.from("audit_log").insert({
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
    payload,
  });

  if (error) {
    throw new Error(error.message);
  }
}
