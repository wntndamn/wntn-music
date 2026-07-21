import { Hono } from "hono";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { bodyLimit } from "hono/body-limit";
import { db } from "../db";
import { likes, playlists, tracks, artists, follows, users } from "../db/schema";
import { requireAuth } from "../auth";
import { putObject } from "../storage";
import { readImageForm } from "../upload";
import { param, type AppEnv } from "../types";

export const meRoutes = new Hono<AppEnv>();
meRoutes.use("*", requireAuth);

// POST /api/me/avatar — multipart image, becomes the user's avatar
meRoutes.post("/avatar", bodyLimit({ maxSize: 10 * 1024 * 1024 }), async (c) => {
  const userId = c.get("userId");
  const img = await readImageForm(c);
  if (!img) return c.json({ error: "image only (jpg/png/webp)" }, 400);
  const avatarKey = `avatars/user/${userId}.${img.ext}`;
  await putObject(avatarKey, img.bytes, img.contentType);
  await db
    .update(users)
    .set({ avatarKey, avatar: `/api/avatar/user/${userId}` })
    .where(eq(users.id, userId));
  return c.json({ avatar: `/api/avatar/user/${userId}` });
});

// GET /api/me/library — liked tracks + own playlists + followed artists
meRoutes.get("/library", async (c) => {
  const userId = c.get("userId");
  const [liked, myPlaylists, following] = await Promise.all([
    db
      .select({ id: tracks.id, title: tracks.title, cover: tracks.cover })
      .from(likes)
      .innerJoin(tracks, eq(likes.trackId, tracks.id))
      .where(eq(likes.userId, userId)),
    db.select().from(playlists).where(eq(playlists.userId, userId)),
    db
      .select({ slug: artists.slug, name: artists.name, avatar: artists.avatar })
      .from(follows)
      .innerJoin(artists, eq(follows.artistId, artists.id))
      .where(eq(follows.userId, userId)),
  ]);
  return c.json({ likes: liked, playlists: myPlaylists, following });
});

// POST /api/me/follows/:artistId — toggle follow
meRoutes.post("/follows/:artistId", async (c) => {
  const userId = c.get("userId");
  const artistId = param(c, "artistId");
  const existing = await db
    .select()
    .from(follows)
    .where(and(eq(follows.userId, userId), eq(follows.artistId, artistId)))
    .limit(1);
  if (existing.length) {
    await db
      .delete(follows)
      .where(and(eq(follows.userId, userId), eq(follows.artistId, artistId)));
    return c.json({ following: false });
  }
  await db.insert(follows).values({ userId, artistId }).onConflictDoNothing();
  return c.json({ following: true });
});

// GET /api/me/artist — the artist profile this user owns, if any
meRoutes.get("/artist", async (c) => {
  const userId = c.get("userId");
  const found = await db
    .select()
    .from(artists)
    .where(eq(artists.userId, userId))
    .limit(1);
  return c.json({ artist: found[0] ?? null });
});

// POST /api/me/likes/:trackId — toggle
meRoutes.post("/likes/:trackId", async (c) => {
  const userId = c.get("userId");
  const trackId = param(c, "trackId");
  const existing = await db
    .select()
    .from(likes)
    .where(and(eq(likes.userId, userId), eq(likes.trackId, trackId)))
    .limit(1);
  if (existing.length) {
    await db
      .delete(likes)
      .where(and(eq(likes.userId, userId), eq(likes.trackId, trackId)));
    return c.json({ liked: false });
  }
  await db.insert(likes).values({ userId, trackId }).onConflictDoNothing();
  return c.json({ liked: true });
});

// PUT /api/me/playlists/:id — rename / visibility
meRoutes.put("/playlists/:id", async (c) => {
  const userId = c.get("userId");
  const id = param(c, "id");
  const body = z
    .object({
      title: z.string().min(1).max(120).optional(),
      isPublic: z.boolean().optional(),
      description: z.string().max(1000).nullable().optional(),
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid input" }, 400);
  await db
    .update(playlists)
    .set(body.data)
    .where(and(eq(playlists.id, id), eq(playlists.userId, userId)));
  return c.json({ ok: true });
});
