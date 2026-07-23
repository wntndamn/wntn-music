import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { db, client } from "./db";
import { artists, tracks, trackVersions } from "./db/schema";
import { newId, slugify, contentSlug, shortIdFor } from "./types";
import { ensureBucket, objectExists, putObject } from "./storage";

// One-time import: public/track-list.json -> artists/tracks/versions, and pushes
// the existing mp3s into S3 storage. Idempotent — safe to re-run.

type Raw = { id: string; title: string; author: string; cover: string; song: string };

const PUBLIC_DIR = resolve(process.cwd(), "..", "public");

async function ensureArtist(name: string): Promise<string> {
  const slug = slugify(name);
  const found = await db.select().from(artists).where(eq(artists.slug, slug)).limit(1);
  if (found[0]) return found[0].id;
  const id = newId();
  await db.insert(artists).values({ id, slug, name });
  return id;
}

// Upload public/<song> to S3 under its key, if not already there.
async function uploadAudio(song: string): Promise<string> {
  const key = song.replace(/^\//, "");
  if (!(await objectExists(key))) {
    const filePath = resolve(PUBLIC_DIR, key);
    if (existsSync(filePath)) {
      await putObject(key, readFileSync(filePath), "audio/mpeg");
    }
  }
  return key;
}

async function main() {
  await ensureBucket();
  const raw = JSON.parse(readFileSync(resolve(PUBLIC_DIR, "track-list.json"), "utf8")) as Raw[];

  let uploaded = 0;
  for (const t of raw) {
    const artistId = await ensureArtist(t.author);
    await db
      .insert(tracks)
      .values({
        id: t.id,
        slug: contentSlug(t.title),
        shortId: shortIdFor(t.id),
        title: t.title,
        artistId,
        cover: t.cover,
      })
      .onConflictDoNothing();

    const audioKey = await uploadAudio(t.song);
    uploaded++;

    const existing = await db
      .select({ id: trackVersions.id })
      .from(trackVersions)
      .where(eq(trackVersions.trackId, t.id))
      .limit(1);
    if (!existing[0]) {
      const versionId = newId();
      await db.insert(trackVersions).values({
        id: versionId,
        trackId: t.id,
        kind: "release",
        audioKey,
        isPrimary: true,
      });
      await db.update(tracks).set({ primaryVersionId: versionId }).where(eq(tracks.id, t.id));
    }
  }

  console.log(`seeded ${raw.length} tracks, audio synced to S3 (${uploaded} files checked)`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
