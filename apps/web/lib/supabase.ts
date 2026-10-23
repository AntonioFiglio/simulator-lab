import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase.types";

export class StorageError extends Error {
  readonly status = 503;
}
let client: SupabaseClient<Database> | undefined;

/** Administrative client: never import into a browser component. All access is scoped in db.ts. */
export function supabaseAdmin() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const secret =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) {
    throw new StorageError(
      "Configure SUPABASE_URL e SUPABASE_SECRET_KEY em apps/web/.env.local. O Simula utiliza exclusivamente Supabase.",
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new StorageError("SUPABASE_URL inválida.");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new StorageError(
      "SUPABASE_URL deve ser uma URL HTTPS do projeto hospedado.",
    );
  }
  client = createClient<Database>(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
        }),
    },
  });
  return client;
}

export function storageFailure(error: {
  code?: string;
  message?: string;
}): never {
  if (["42P01", "PGRST205"].includes(error.code ?? "")) {
    throw new StorageError(
      "A estrutura do Supabase não foi criada. Aplique a migration em supabase/migrations.",
    );
  }
  if (["42501", "PGRST301", "PGRST302"].includes(error.code ?? "")) {
    throw new StorageError(
      "Acesso ao Supabase recusado. Confira a chave de servidor e as permissões da migration.",
    );
  }
  // Do not expose upstream request details, URLs, payloads or credentials.
  throw new StorageError(
    "Não foi possível acessar o Supabase. Confira a conexão e o status do projeto e tente novamente.",
  );
}
