import { inflateRawSync } from "node:zlib";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { createHmac, randomUUID } from "node:crypto";
import type { Dataset, Purchase } from "../contracts";
export type RawRow = Record<string, string>;
export async function parseFile(
  bytes: Buffer,
  name: string,
): Promise<RawRow[]> {
  if (bytes.length > 10 * 1024 * 1024)
    throw Error("Limite de 10 MB por arquivo.");
  const ext = name.split(".").pop()?.toLowerCase();
  let rows: RawRow[] = [];
  if (ext === "csv") {
    const result = Papa.parse<RawRow>(
      bytes.toString("utf8").replace(/^\uFEFF/, ""),
      { header: true, skipEmptyLines: "greedy" },
    );
    if (result.errors.length)
      throw Error(`CSV inválido: ${result.errors[0].message}`);
    rows = result.data;
  } else if (ext === "xlsx") {
    // Validate ZIP structure and actual expanded bytes before ExcelJS allocates XML trees.
    let end = -1;
    for (
      let i = bytes.length - 22;
      i >= Math.max(0, bytes.length - 65557);
      i--
    ) {
      if (bytes.readUInt32LE(i) === 0x06054b50) {
        end = i;
        break;
      }
    }
    if (end < 0) throw Error("XLSX não contém um ZIP válido.");
    const entries = bytes.readUInt16LE(end + 10);
    let offset = bytes.readUInt32LE(end + 16),
      expanded = 0;
    if (entries > 300 || entries === 65535)
      throw Error("XLSX tem entradas demais.");
    for (let i = 0; i < entries; i++) {
      if (
        offset + 46 > bytes.length ||
        bytes.readUInt32LE(offset) !== 0x02014b50
      )
        throw Error("Diretório ZIP inválido.");
      const flags = bytes.readUInt16LE(offset + 8),
        method = bytes.readUInt16LE(offset + 10),
        compressed = bytes.readUInt32LE(offset + 20),
        expected = bytes.readUInt32LE(offset + 24),
        nameLength = bytes.readUInt16LE(offset + 28),
        extraLength = bytes.readUInt16LE(offset + 30),
        commentLength = bytes.readUInt16LE(offset + 32),
        local = bytes.readUInt32LE(offset + 42);
      const entryName = bytes
        .subarray(offset + 46, offset + 46 + nameLength)
        .toString("utf8");
      if (
        flags & 1 ||
        ![0, 8].includes(method) ||
        expected > 40 * 1024 * 1024 - expanded ||
        /externalLinks|vbaProject|\.\.\//i.test(entryName)
      )
        throw Error("XLSX com conteúdo não permitido ou expansão excessiva.");
      if (local + 30 > bytes.length || bytes.readUInt32LE(local) !== 0x04034b50)
        throw Error("Entrada ZIP inválida.");
      const start =
        local +
        30 +
        bytes.readUInt16LE(local + 26) +
        bytes.readUInt16LE(local + 28);
      if (start + compressed > bytes.length)
        throw Error("Entrada ZIP truncada.");
      const content = bytes.subarray(start, start + compressed);
      const actual =
        method === 0
          ? content.length
          : inflateRawSync(content, {
              maxOutputLength: 40 * 1024 * 1024 - expanded,
            }).length;
      if (actual !== expected) throw Error("Tamanho ZIP inconsistente.");
      expanded += actual;
      if (expanded > 40 * 1024 * 1024)
        throw Error("XLSX excede o limite de 40 MB descompactados.");
      offset += 46 + nameLength + extraLength + commentLength;
    }
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(bytes as never);
    const sheet = book.worksheets[0];
    if (!sheet) throw Error("Planilha vazia.");
    if (sheet.rowCount > 50001 || sheet.columnCount > 100)
      throw Error("Planilha excede 50.000 linhas ou 100 colunas.");
    const headers: string[] = [];
    sheet
      .getRow(1)
      .eachCell((c, i) => (headers[i] = String(c.value ?? "").trim()));
    if (
      new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length
    )
      throw Error("Cabeçalhos duplicados.");
    sheet.eachRow((r, n) => {
      if (n === 1) return;
      const row: RawRow = {};
      r.eachCell((c, i) => {
        if (!headers[i]) return;
        if (c.type === ExcelJS.ValueType.Formula)
          throw Error("Remova fórmulas da planilha antes de importar.");
        row[headers[i]] =
          c.value instanceof Date
            ? c.value.toISOString().slice(0, 10)
            : String(c.value ?? "");
      });
      rows.push(row);
    });
  } else if (ext === "xml") {
    const xml = bytes.toString("utf8");
    if (/<!DOCTYPE|<!ENTITY|SYSTEM\s|PUBLIC\s|<\?xml-stylesheet/i.test(xml))
      throw Error(
        "XML com DTD, entidades externas ou instruções não é permitido.",
      );
    if (XMLValidator.validate(xml) !== true) throw Error("XML inválido.");
    const tree = new XMLParser({
      ignoreAttributes: false,
      ignoreDeclaration: true,
      parseTagValue: false,
      processEntities: false,
    }).parse(xml);
    const visit = (v: unknown, depth = 0) => {
      if (depth > 20) throw Error("XML muito profundo.");
      if (Array.isArray(v)) {
        v.forEach((x) => visit(x, depth + 1));
        return;
      }
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        if (Object.values(o).every((x) => typeof x !== "object")) {
          if (!Object.keys(o).some((k) => k.startsWith("?")))
            rows.push(
              Object.fromEntries(
                Object.entries(o).map(([k, x]) => [k, String(x)]),
              ),
            );
        } else Object.values(o).forEach((x) => visit(x, depth + 1));
      }
    };
    visit(tree);
  } else throw Error("Envie CSV, XLSX ou XML.");
  if (!rows.length || rows.length > 50000)
    throw Error("O arquivo deve conter de 1 a 50.000 linhas.");
  if (Object.keys(rows[0]).length > 100) throw Error("Máximo de 100 colunas.");
  if (rows.some((r) => Object.values(r).some((v) => v.length > 2000)))
    throw Error("Célula muito longa (máximo 2.000 caracteres).");
  return rows;
}
export function numberValue(raw: string, locale: string) {
  let s = raw.trim().replace(/R\$|\s|\$/g, "");
  if (locale === "pt-BR") s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s);
}
function dateValue(raw: string, locale: string) {
  let s = raw.trim();
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m)
    s =
      locale === "pt-BR"
        ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
        : `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  s = s.slice(0, 10);
  const d = new Date(s + "T00:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    !Number.isFinite(+d) ||
    d.toISOString().slice(0, 10) !== s
  )
    throw Error("data inválida");
  return s;
}
export function normalize(
  rows: RawRow[],
  mapping: Record<string, string>,
  locale: string,
  salt: string,
  name: string,
): Dataset {
  for (const key of [
    "order_id",
    "purchased_at",
    "product",
    "quantity",
    "unit_price",
  ])
    if (!mapping[key]) throw Error(`Mapeie ${key}.`);
  const selected = Object.values(mapping).filter(Boolean);
  if (new Set(selected).size !== selected.length)
    throw Error("Uma coluna não pode mapear dois campos.");
  const dataset: Dataset = {
    id: randomUUID(),
    name,
    version: randomUUID(),
    createdAt: new Date().toISOString(),
    referenceDate: "",
    purchases: [],
    profiles: [],
    mapping,
    synthetic: false,
    quality: {
      total: rows.length,
      accepted: 0,
      duplicates: 0,
      rejected: 0,
      unidentified: 0,
      issues: [],
    },
  };
  const seen = new Set<string>();
  const hash = (s: string) =>
    createHmac("sha256", salt)
      .update(s.normalize("NFKC").trim())
      .digest("hex")
      .slice(0, 20);
  rows.forEach((row, index) => {
    const val = (key: string) => (row[mapping[key]] ?? "").trim();
    try {
      const quantity = numberValue(val("quantity"), locale),
        unitPrice = numberValue(val("unit_price"), locale);
      if (
        !val("order_id") ||
        !val("product") ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      )
        throw Error("pedido, produto, quantidade ou preço ausente/inválido");
      const purchasedAt = dateValue(val("purchased_at"), locale);
      const customerId = val("customer_id")
        ? "C-" + hash(val("customer_id"))
        : undefined;
      const orderId = "O-" + hash(val("order_id"));
      const purchase: Purchase = {
        id: randomUUID(),
        customerId,
        orderId,
        purchasedAt,
        product: val("product"),
        category: val("category") || undefined,
        quantity,
        unitPrice,
      };
      const key = JSON.stringify([
        customerId,
        orderId,
        purchasedAt,
        purchase.product,
        quantity,
        unitPrice,
      ]);
      if (seen.has(key)) {
        dataset.quality.duplicates++;
        return;
      }
      seen.add(key);
      if (!customerId) dataset.quality.unidentified++;
      dataset.purchases.push(purchase);
    } catch (e) {
      dataset.quality.rejected++;
      if (dataset.quality.issues.length < 20)
        dataset.quality.issues.push(
          `Linha ${index + 2}: ${(e as Error).message}`,
        );
    }
  });
  dataset.quality.accepted = dataset.purchases.length;
  dataset.referenceDate =
    dataset.purchases
      .map((p) => p.purchasedAt)
      .sort()
      .at(-1) ?? "";
  if (!dataset.purchases.length)
    throw Error(
      "Nenhuma linha válida. Revise o mapeamento e o formato regional.",
    );
  return dataset;
}
