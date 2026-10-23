"use client";
import type { ReactNode } from "react";
export const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n,
  );
export const count = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Notice({ children }: { children: ReactNode }) {
  return <div className="notice">{children}</div>;
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="empty">
      <div className="empty-icon">◇</div>
      <h2>{title}</h2>
      <p>{children}</p>
    </Card>
  );
}
export function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card>
      <span className="muted">{label}</span>
      <strong className="metric">{value}</strong>
      {detail && <small>{detail}</small>}
    </Card>
  );
}
export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(
    "/api/" + path,
    body instanceof FormData
      ? { method: "POST", body }
      : body === undefined
        ? {}
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
  );
  const data = await response.json();
  if (!response.ok)
    throw Error(data.error ?? "Não foi possível completar a ação.");
  return data;
}
