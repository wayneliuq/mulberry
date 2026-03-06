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
  const { data, error } = await supabase.functions.invoke<TResponse>(
    "admin-write",
    {
      body: payload,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
