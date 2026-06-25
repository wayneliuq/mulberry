import { supabase } from "../supabase/client";
import type { AdminWriteAction } from "./types";

type AdminLoginResponse = {
  ok: boolean;
  error?: string;
};

type AdminWritePayload<TAction extends AdminWriteAction> = {
  action: TAction;
  password: string;
} & Record<string, unknown>;

function readErrorMessageFromInvokeBody(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  if (typeof record.error === "string" && record.error.trim().length > 0) {
    return record.error;
  }

  return null;
}

function formatFunctionsInvokeError(error: unknown, data: unknown): string {
  const bodyMessage = readErrorMessageFromInvokeBody(data);
  if (bodyMessage) {
    return bodyMessage;
  }

  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: unknown }).context;
    const contextMessage = readErrorMessageFromInvokeBody(context);
    if (contextMessage) {
      return contextMessage;
    }

    if (context && typeof context === "object" && "json" in context) {
      const json = (context as { json?: unknown }).json;
      const jsonMessage = readErrorMessageFromInvokeBody(json);
      if (jsonMessage) {
        return jsonMessage;
      }
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Admin request failed.";
}

export async function verifyAdminPassword(password: string) {
  const { data, error } = await supabase.functions.invoke<AdminLoginResponse>(
    "admin-login",
    {
      body: {
        password,
      },
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.ok) {
    throw new Error(data?.error ?? "Invalid admin password");
  }
}

export async function adminWrite<
  TAction extends AdminWriteAction,
  TResponse = unknown,
>(payload: AdminWritePayload<TAction>) {
  const { data, error } = await supabase.functions.invoke<
    TResponse & { error?: string }
  >("admin-write", {
    body: payload,
  });

  const bodyError = readErrorMessageFromInvokeBody(data);
  if (error || bodyError) {
    throw new Error(formatFunctionsInvokeError(error, data));
  }

  return data;
}
