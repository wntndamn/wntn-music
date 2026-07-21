import type { Context } from "hono";

// Parses a multipart image upload; returns null when invalid (caller sends 400).
export async function readImageForm(
  c: Context,
): Promise<{ bytes: Uint8Array; ext: string; contentType: string } | null> {
  const form = await c.req.parseBody();
  const file = form["file"];
  if (!(file instanceof File)) return null;
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  if (!/^[a-z0-9]{1,5}$/.test(ext)) return null;
  const contentType = file.type || "image/jpeg";
  if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) return null;
  return { bytes: new Uint8Array(await file.arrayBuffer()), ext, contentType };
}
