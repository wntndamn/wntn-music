import { Hono } from "hono";
import { z } from "zod";
import { eq, and, count } from "drizzle-orm";
import { db } from "../db";
import { artists, albums, tracks, follows, claimRequests } from "../db/schema";
import { requireAuth, currentUserId } from "../auth";
import { newId, slugify, param, type AppEnv } from "../types";

export const artistRoutes = new Hono<AppEnv>();

// GET /api/artists/:slug -> profile + albums + tracks
artistRoutes.get("/:slug", async (c) => {
  const slug = param(c, "slug");
  const found = await db
    .select()
    .from(artists)
    .where(eq(artists.slug, slug))
    .limit(1);
  const artist = found[0];
  if (!artist) return c.json({ error: "not found" }, 404);

  const uid = await currentUserId(c);
  const [artistAlbums, artistTracks, followers, mine, pending] = await Promise.all([
    db.select().from(albums).where(eq(albums.artistId, artist.id)),
    db
      .select({ id: tracks.id, title: tracks.title, cover: tracks.cover })
      .from(tracks)
      .where(eq(tracks.artistId, artist.id)),
    db.select({ n: count() }).from(follows).where(eq(follows.artistId, artist.id)),
    uid
      ? db
          .select()
          .from(follows)
          .where(and(eq(follows.userId, uid), eq(follows.artistId, artist.id)))
          .limit(1)
      : Promise.resolve([]),
    uid
      ? db
          .select({ id: claimRequests.id })
          .from(claimRequests)
          .where(
            and(
              eq(claimRequests.artistId, artist.id),
              eq(claimRequests.userId, uid),
              eq(claimRequests.status, "pending"),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);

  return c.json({
    ...artist,
    albums: artistAlbums,
    tracks: artistTracks,
    followerCount: followers[0]?.n ?? 0,
    isFollowing: mine.length > 0,
    claimable: artist.userId === null,
    pendingClaim: pending.length > 0,
  });
});

const claimSchema = z.object({
  name: z.string().min(1).max(64),
  bio: z.string().max(2000).optional(),
});

// POST /api/artists — claim/create an artist profile owned by current user
artistRoutes.post("/", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = claimSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid input" }, 400);

  const slug = slugify(body.data.name);
  const exists = await db
    .select({ id: artists.id })
    .from(artists)
    .where(eq(artists.slug, slug))
    .limit(1);
  if (exists.length) return c.json({ error: "slug taken" }, 409);

  const id = newId();
  await db.insert(artists).values({ id, userId, slug, name: body.data.name, bio: body.data.bio });
  return c.json({ id, slug });
});

// POST /api/artists/:slug/claim — request ownership of an existing unowned artist
artistRoutes.post("/:slug/claim", requireAuth, async (c) => {
  const userId = c.get("userId");
  const slug = param(c, "slug");
  const found = await db.select().from(artists).where(eq(artists.slug, slug)).limit(1);
  const artist = found[0];
  if (!artist) return c.json({ error: "not found" }, 404);
  if (artist.userId !== null) return c.json({ error: "артист уже занят" }, 409);

  const owned = await db
    .select({ id: artists.id })
    .from(artists)
    .where(eq(artists.userId, userId))
    .limit(1);
  if (owned.length) return c.json({ error: "у вас уже есть профиль артиста" }, 409);

  const dup = await db
    .select({ id: claimRequests.id })
    .from(claimRequests)
    .where(
      and(
        eq(claimRequests.artistId, artist.id),
        eq(claimRequests.userId, userId),
        eq(claimRequests.status, "pending"),
      ),
    )
    .limit(1);
  if (dup.length) return c.json({ error: "запрос уже отправлен" }, 409);

  const body = z
    .object({ message: z.string().max(500).optional() })
    .safeParse(await c.req.json().catch(() => ({})));
  const id = newId();
  await db.insert(claimRequests).values({
    id,
    artistId: artist.id,
    userId,
    message: body.success ? body.data.message : undefined,
  });
  return c.json({ id, status: "pending" });
});

// bare "t.me/foo" is friendlier to type than a full https:// URL
const linkSchema = z
  .string()
  .trim()
  .max(300)
  .transform((s) => (/^https?:\/\//i.test(s) ? s : `https://${s}`))
  .refine((s) => z.string().url().safeParse(s).success, "invalid URL");

const updateSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  bio: z.string().max(2000).optional(),
  genres: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  links: z.array(linkSchema).max(10).optional(),
  headerImage: z.string().url().optional(),
});

// PUT /api/artists/:slug — owner edits profile
artistRoutes.put("/:slug", requireAuth, async (c) => {
  const userId = c.get("userId");
  const slug = param(c, "slug");
  const found = await db.select().from(artists).where(eq(artists.slug, slug)).limit(1);
  const artist = found[0];
  if (!artist) return c.json({ error: "not found" }, 404);
  if (artist.userId !== userId) return c.json({ error: "forbidden" }, 403);

  const body = updateSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return c.json({ error: "invalid input" }, 400);
  await db.update(artists).set(body.data).where(eq(artists.id, artist.id));
  return c.json({ ok: true });
});
