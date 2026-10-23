import { createDecipheriv } from "node:crypto";
import "server-only";
import { StorageError } from "./supabase";
import type { Json } from "./supabase.types";

// New records require no application encryption key.
export function encodeRecord(value: unknown): Json {
  return { v: 2, content: JSON.parse(JSON.stringify(value)) as Json };
}

export function decodeRecord<T>(value: unknown): T {
  if (!value || typeof value !== "object")
    throw new StorageError("Registro com formato inválido.");
  const record = value as Record<string, unknown>;
  if (record.v === 2 && "content" in record) return record.content as T;
  if (
    record.v !== 1 ||
    typeof record.iv !== "string" ||
    typeof record.tag !== "string" ||
    typeof record.content !== "string"
  ) throw new StorageError("Registro com formato inválido.");

  // Read-only compatibility for data written before encryption was removed.
  const secret = process.env.SIMULA_ENCRYPTION_KEY;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) {
    throw new StorageError(
      "Este registro antigo está criptografado e precisa da chave original para ser lido. Novos workspaces não precisam de chave.",
    );
  }
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm", Buffer.from(secret, "hex"), Buffer.from(record.iv, "hex"),
    );
    decipher.setAuthTag(Buffer.from(record.tag, "hex"));
    return JSON.parse(Buffer.concat([
      decipher.update(Buffer.from(record.content, "base64")),
      decipher.final(),
    ]).toString("utf8")) as T;
  } catch {
    throw new StorageError("Não foi possível ler o registro antigo com a chave disponível.");
  }
}
