import type { Context } from "hono";

export type AppEnv = { Variables: { userId: string; role: "user" | "admin" | "root" } };

// Hono types param() as string|undefined for non-literal keys; routes guarantee presence.
export function param(c: Context, name: string): string {
  const v = c.req.param(name);
  if (v === undefined) throw new Error(`missing route param: ${name}`);
  return v;
}

export const newId = () => crypto.randomUUID();

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
