import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env";
import { authRoutes } from "./routes/auth";
import { trackRoutes } from "./routes/tracks";
import { audioRoutes } from "./routes/audio";
import { coverRoutes } from "./routes/cover";
import { avatarRoutes } from "./routes/avatar";
import { homeRoutes } from "./routes/home";
import { searchRoutes } from "./routes/search";
import { clipRoutes } from "./routes/clip";
import { commentRoutes } from "./routes/comments";
import { adminRoutes } from "./routes/admin";
import { artistRoutes } from "./routes/artists";
import { albumRoutes } from "./routes/albums";
import { playlistRoutes } from "./routes/playlists";
import { meRoutes } from "./routes/me";
import { manageRoutes } from "./routes/manage";
import { lyricsRoutes } from "./routes/lyrics";
import { userRoutes } from "./routes/users";
import { bootstrapRoots } from "./auth";
import { backfillTrackSlugs } from "./backfill";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

// same-origin in prod (Caddy serves both), but keep CORS correct for any
// configured domain — echo back only origins we know.
app.use(
  "*",
  cors({
    origin: (origin) => (env.webOrigins.includes(origin) ? origin : env.webOrigins[0]),
    credentials: true,
  }),
);
app.get("/api/health", (c) => c.json({ ok: true }));

app.route("/api/auth", authRoutes);
app.route("/api/tracks", trackRoutes);
app.route("/api/audio", audioRoutes);
app.route("/api/cover", coverRoutes);
app.route("/api/avatar", avatarRoutes);
app.route("/api/home", homeRoutes);
app.route("/api/search", searchRoutes);
app.route("/api/clip", clipRoutes);
app.route("/api/comments", commentRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/artists", artistRoutes);
app.route("/api/albums", albumRoutes);
app.route("/api/playlists", playlistRoutes);
app.route("/api/me", meRoutes);
app.route("/api/manage", manageRoutes);
app.route("/api/lyrics", lyricsRoutes);
app.route("/api/users", userRoutes);

bootstrapRoots().catch((e) => console.error("bootstrapRoots failed:", e));
backfillTrackSlugs().catch((e) => console.error("backfillTrackSlugs failed:", e));

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`wntn api on :${info.port}`);
});
