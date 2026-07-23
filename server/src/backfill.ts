import { isNull } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { tracks } from "./db/schema";
import { contentSlug, shortIdFor } from "./types";

// Fill slug + shortId for tracks that predate those columns. shortId is a
// deterministic hash of the id, so running this repeatedly is a no-op.
export async function backfillTrackSlugs() {
  const rows = await db
    .select({ id: tracks.id, title: tracks.title })
    .from(tracks)
    .where(isNull(tracks.shortId));
  if (!rows.length) return;
  for (const r of rows) {
    await db
      .update(tracks)
      .set({ slug: contentSlug(r.title), shortId: shortIdFor(r.id) })
      .where(eq(tracks.id, r.id));
  }
  console.log(`backfilled slugs for ${rows.length} tracks`);
}
