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
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

app.use("*", cors({ origin: env.webOrigin, credentials: true }));
app.get("/api/health", (c) => c.json({ ok: true }));

app.route("/api/auth", authRoutes);
app.route("/api/tracks", trackRoutes);
app.route("/api/audio", audioRoutes);
app.route("/api/cover", coverRoutes);
app.route("/api/avatar", avatarRoutes);
app.route("/api/home", homeRoutes);
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

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`wntn api on :${info.port}`);
});
