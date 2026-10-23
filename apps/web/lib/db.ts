import "server-only";
import { encodeRecord, decodeRecord } from "./storage-codec";
import { supabaseAdmin, storageFailure } from "./supabase";
import type { Json } from "./supabase.types";

const table = "simula_records";
function scope(workspace: string, kind?: string) {
  if (!/^[a-f0-9]{64}$/.test(workspace)) throw Error("Workspace inválido.");
  if (kind !== undefined && !/^[a-z_]{1,40}$/.test(kind))
    throw Error("Tipo de registro inválido.");
}
export async function put(
  workspace: string,
  kind: string,
  id: string,
  data: unknown,
) {
  scope(workspace, kind);
  const { error } = await supabaseAdmin()
    .from(table)
    .upsert(
      { workspace, kind, id, data: encodeRecord(data) },
      { onConflict: "workspace,kind,id" },
    );
  if (error) storageFailure(error);
}
export async function get<T>(
  workspace: string,
  kind: string,
  id: string,
): Promise<T | undefined> {
  scope(workspace, kind);
  const { data, error } = await supabaseAdmin()
    .from(table)
    .select("data")
    .eq("workspace", workspace)
    .eq("kind", kind)
    .eq("id", id)
    .maybeSingle();
  if (error) storageFailure(error);
  return data ? decodeRecord<T>(data.data) : undefined;
}
export async function list<T>(workspace: string, kind: string): Promise<T[]> {
  scope(workspace, kind);
  const result: { id: string; data: Json; created_at: string }[] = [];
  // Keyset pagination handles Supabase's response cap without silently dropping records.
  let cursor: string | undefined;
  while (true) {
    let query = supabaseAdmin()
      .from(table)
      .select("id,data,created_at")
      .eq("workspace", workspace)
      .eq("kind", kind)
      .order("id", { ascending: true })
      .limit(100);
    if (cursor !== undefined) query = query.gt("id", cursor);
    const { data, error } = await query;
    if (error) storageFailure(error);
    if (!data?.length) break;
    result.push(...data);
    cursor = data[data.length - 1].id;
  }
  return result
    .sort(
      (a, b) =>
        a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
    )
    .map((row) => decodeRecord<T>(row.data));
}
export async function remove(workspace: string, kind?: string) {
  scope(workspace, kind);
  let query = supabaseAdmin().from(table).delete().eq("workspace", workspace);
  if (kind !== undefined) query = query.eq("kind", kind);
  const { error } = await query;
  if (error) storageFailure(error);
}
