import { Hono } from "hono";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { bodyLimit } from "hono/body-limit";
import { db } from "../db";
import { playlists, playlistTracks, tracks } from "../db/schema";
import { requireAuth, currentUserId } from "../auth";
import { putObject } from "../storage";
import { readImageForm } from "../upload";
import { newId, param, type AppEnv } from "../types";

export const playlistRoutes = new Hono<AppEnv>();

// GET /api/playlists/:id — public, or own
playlistRoutes.get("/:id", async (c) => {
  const id = param(c, "id");
  const found = await db.select().from(playlists).where(eq(playlists.id, id)).limit(1);
  const pl = found[0];
  if (!pl) return c.json({ error: "not found" }, 404);
  if (!pl.isPublic && (await currentUserId(c)) !== pl.userId)
    return c.json({ error: "forbidden" }, 403);

  const items = await db
    .select({ id: tracks.id, title: tracks.title, cover: tracks.cover, position: playlistTracks.position })
    .from(playlistTracks)
    .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
    .where(eq(playlistTracks.playlistId, id));
  items.sort((a, b) => a.position - b.position);
  return c.json({ ...pl, tracks: items });
});

const createSchema = z.object({
  title: z.string().min(1).max(120),
  isPublic: z.boolean().optional(),
});

playlistRoutes.post("/", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = createSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid input" }, 400);
  const id = newId();
  await db.insert(playlists).values({
    id,
    userId,
    title: body.data.title,
    isPublic: body.data.isPublic ?? true,
  });
  return c.json({ id });
});

async function ownsPlaylist(playlistId: string, userId: string) {
  const found = await db
    .select({ userId: playlists.userId })
    .from(playlists)
    .where(eq(playlists.id, playlistId))
    .limit(1);
  return found[0]?.userId === userId;
}

// POST /api/playlists/:id/cover — owner uploads a custom cover
playlistRoutes.post(
  "/:id/cover",
  requireAuth,
  bodyLimit({ maxSize: 10 * 1024 * 1024 }),
  async (c) => {
    const id = param(c, "id");
    if (!(await ownsPlaylist(id, c.get("userId")))) return c.json({ error: "forbidden" }, 403);
    const img = await readImageForm(c);
    if (!img) return c.json({ error: "image only (jpg/png/webp)" }, 400);
    const coverKey = `covers/playlist/${id}.${img.ext}`;
    await putObject(coverKey, img.bytes, img.contentType);
    await db
      .update(playlists)
      .set({ coverKey, cover: `/api/cover/playlist/${id}` })
      .where(eq(playlists.id, id));
    return c.json({ cover: `/api/cover/playlist/${id}` });
  },
);

// DELETE /api/playlists/:id — owner or admin
playlistRoutes.delete("/:id", requireAuth, async (c) => {
  const id = param(c, "id");
  const isMod = c.get("role") === "admin" || c.get("role") === "root";
  if (!isMod && !(await ownsPlaylist(id, c.get("userId"))))
    return c.json({ error: "forbidden" }, 403);
  await db.delete(playlists).where(eq(playlists.id, id));
  return c.json({ ok: true });
});

playlistRoutes.post("/:id/tracks", requireAuth, async (c) => {
  const userId = c.get("userId");
  const id = param(c, "id");
  if (!(await ownsPlaylist(id, userId))) return c.json({ error: "forbidden" }, 403);
  const body = z.object({ trackId: z.string() }).safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid input" }, 400);
  const count = await db
    .select({ id: playlistTracks.trackId })
    .from(playlistTracks)
    .where(eq(playlistTracks.playlistId, id));
  await db
    .insert(playlistTracks)
    .values({ playlistId: id, trackId: body.data.trackId, position: count.length })
    .onConflictDoNothing();
  return c.json({ ok: true });
});

playlistRoutes.delete("/:id/tracks/:trackId", requireAuth, async (c) => {
  const userId = c.get("userId");
  const id = param(c, "id");
  if (!(await ownsPlaylist(id, userId))) return c.json({ error: "forbidden" }, 403);
  await db
    .delete(playlistTracks)
    .where(
      and(eq(playlistTracks.playlistId, id), eq(playlistTracks.trackId, param(c, "trackId"))),
    );
  return c.json({ ok: true });
});
