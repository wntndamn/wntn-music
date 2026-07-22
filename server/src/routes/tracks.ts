import { Hono } from "hono";
import { eq, desc, inArray } from "drizzle-orm";
import { db } from "../db";
import { tracks, artists, trackVersions, lyrics, trackArtists } from "../db/schema";
import { redis } from "../redis";
import { param } from "../types";

// Audio is streamed via GET /api/audio/:versionId (302 -> presigned S3 URL),
// so the catalog only needs to expose the version id, not storage details.
const audioUrl = (versionId: string | null) =>
  versionId ? `/api/audio/${versionId}` : null;

export const trackRoutes = new Hono();

// GET /api/tracks?artist=<slug>
trackRoutes.get("/", async (c) => {
  const slug = c.req.query("artist");
  const rows = await db
    .select({
      id: tracks.id,
      title: tracks.title,
      cover: tracks.cover,
      plays: tracks.plays,
      author: artists.name,
      authorSlug: artists.slug,
      primaryVersionId: tracks.primaryVersionId,
    })
    .from(tracks)
    .innerJoin(artists, eq(tracks.artistId, artists.id))
    .orderBy(desc(tracks.createdAt));

  const filtered = slug ? rows.filter((r) => r.authorSlug === slug) : rows;

  // featured artists for the whole page in one query, then grouped in memory
  const featRows = filtered.length
    ? await db
        .select({
          trackId: trackArtists.trackId,
          name: artists.name,
          slug: artists.slug,
        })
        .from(trackArtists)
        .innerJoin(artists, eq(trackArtists.artistId, artists.id))
        .where(inArray(trackArtists.trackId, filtered.map((r) => r.id)))
    : [];
  const featByTrack = new Map<string, { name: string; slug: string }[]>();
  for (const f of featRows) {
    const list = featByTrack.get(f.trackId) ?? [];
    list.push({ name: f.name, slug: f.slug });
    featByTrack.set(f.trackId, list);
  }

  const list = filtered.map(({ primaryVersionId, ...r }) => ({
    ...r,
    features: featByTrack.get(r.id) ?? [],
    song: audioUrl(primaryVersionId),
  }));
  return c.json(list);
});

// GET /api/tracks/:id  -> track + versions + lyrics
trackRoutes.get("/:id", async (c) => {
  const id = param(c, "id");
  const found = await db
    .select({
      id: tracks.id,
      title: tracks.title,
      cover: tracks.cover,
      plays: tracks.plays,
      author: artists.name,
      authorSlug: artists.slug,
      primaryVersionId: tracks.primaryVersionId,
      albumId: tracks.albumId,
      genres: tracks.genres,
      explicit: tracks.explicit,
    })
    .from(tracks)
    .innerJoin(artists, eq(tracks.artistId, artists.id))
    .where(eq(tracks.id, id))
    .limit(1);
  const track = found[0];
  if (!track) return c.json({ error: "not found" }, 404);

  const versions = await db
    .select()
    .from(trackVersions)
    .where(eq(trackVersions.trackId, id));
  const lyr = await db.select().from(lyrics).where(eq(lyrics.trackId, id)).limit(1);
  const features = await db
    .select({ id: artists.id, name: artists.name, slug: artists.slug })
    .from(trackArtists)
    .innerJoin(artists, eq(trackArtists.artistId, artists.id))
    .where(eq(trackArtists.trackId, id));

  // live play count: Redis buffer may be ahead of the DB (flushes every 20)
  const buffered = Number((await redis.get(`plays:${id}`)) ?? 0);

  return c.json({
    ...track,
    features,
    plays: Math.max(track.plays, buffered),
    versions: versions.map((v) => ({
      id: v.id,
      kind: v.kind,
      label: v.label,
      isPrimary: v.isPrimary,
      url: audioUrl(v.id),
    })),
    lyrics: lyr[0] ? { content: lyr[0].content, synced: lyr[0].isSynced } : null,
  });
});

// POST /api/play/:id  — buffer in Redis, flush to Postgres every 20 plays.
// ponytail: cron flush would catch the trailing <20; fine for a friends' site.
trackRoutes.post("/play/:id", async (c) => {
  const id = param(c, "id");
  // only count real tracks: an unchecked INCR lets anyone fill Redis with keys
  const exists = await db.select({ id: tracks.id }).from(tracks).where(eq(tracks.id, id)).limit(1);
  if (!exists.length) return c.json({ error: "not found" }, 404);

  const n = await redis.incr(`plays:${id}`);
  if (n % 20 === 0) {
    await db
      .update(tracks)
      .set({ plays: n })
      .where(eq(tracks.id, id));
  }
  return c.json({ plays: n });
});
