import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import "server-only";
import { StorageError } from "./supabase";
let cached: Buffer | undefined;
function key() {
  if (cached) return cached;
  const secret = process.env.SIMULA_ENCRYPTION_KEY;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) {
    throw new StorageError(
      "Configure SIMULA_ENCRYPTION_KEY com 64 caracteres hexadecimais. A chave deve ser preservada para ler os dados no Supabase.",
    );
  }
  return (cached = Buffer.from(secret, "hex"));
}
export function encrypt(value: unknown) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  const content = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return {
    v: 1,
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    content: content.toString("base64"),
  };
}
export function decrypt<T>(value: unknown): T {
  const v = value as ReturnType<typeof encrypt>;
  if (v.v !== 1) throw Error("Registro com formato inválido.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(v.iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(v.tag, "hex"));
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(v.content, "base64")),
      decipher.final(),
    ]).toString("utf8"),
  );
}
