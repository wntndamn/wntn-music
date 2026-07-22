import { Hono } from "hono";
import { eq, desc, asc, count, sql } from "drizzle-orm";
import { db } from "../db";
import { artists, albums, tracks, playlists } from "../db/schema";

export const homeRoutes = new Hono();

// GET /api/home — everything the landing page needs in one shot
homeRoutes.get("/", async (c) => {
  const [artistRows, albumRows, playlistRows] = await Promise.all([
    db
      .select({
        id: artists.id,
        slug: artists.slug,
        name: artists.name,
        avatar: artists.avatar,
        trackCount: count(tracks.id),
      })
      .from(artists)
      .leftJoin(tracks, eq(tracks.artistId, artists.id))
      .groupBy(artists.id)
      .orderBy(desc(count(tracks.id))),
    db
      .select({
        id: albums.id,
        title: albums.title,
        cover: albums.cover,
        type: albums.type,
        year: albums.year,
        releaseDate: albums.releaseDate,
        artistName: artists.name,
        artistSlug: artists.slug,
      })
      .from(albums)
      .innerJoin(artists, eq(albums.artistId, artists.id))
      // newest first; albums with no release date sink below dated ones
      .orderBy(
        asc(sql`${albums.releaseDate} is null`),
        desc(albums.releaseDate),
        desc(albums.year),
      ),
    db
      .select({
        id: playlists.id,
        title: playlists.title,
        cover: playlists.cover,
        description: playlists.description,
      })
      .from(playlists)
      .where(eq(playlists.isPublic, true))
      .orderBy(desc(playlists.createdAt))
      .limit(12),
  ]);
  return c.json({ artists: artistRows, albums: albumRows, playlists: playlistRows });
});
