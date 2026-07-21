import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";

export const albumType = pgEnum("album_type", ["album", "ep", "single"]);
export const versionKind = pgEnum("version_kind", [
  "demo",
  "release",
  "remaster",
  "live",
  "other",
]);
export const claimStatus = pgEnum("claim_status", ["pending", "approved", "rejected"]);
export const userRole = pgEnum("user_role", ["user", "admin", "root"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  avatar: text("avatar"),
  avatarKey: text("avatar_key"),
  role: userRole("role").notNull().default("user"),
  bannedAt: timestamp("banned_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const artists = pgTable("artists", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  bio: text("bio"),
  avatar: text("avatar"),
  avatarKey: text("avatar_key"),
  headerImage: text("header_image"),
  genres: text("genres").array().notNull().default([]),
  links: text("links").array().notNull().default([]), // arbitrary URLs: site, telegram, instagram...
});

export const albums = pgTable("albums", {
  id: text("id").primaryKey(),
  artistId: text("artist_id")
    .notNull()
    .references(() => artists.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  cover: text("cover"),
  coverKey: text("cover_key"),
  year: integer("year"),
  releaseDate: text("release_date"), // ISO yyyy-mm-dd
  description: text("description"),
  genres: text("genres").array().notNull().default([]),
  copyright: text("copyright"), // e.g. "℗ 2026 Artist Name"
  type: albumType("type").notNull().default("album"),
});

export const tracks = pgTable("tracks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  artistId: text("artist_id")
    .notNull()
    .references(() => artists.id, { onDelete: "cascade" }),
  albumId: text("album_id").references(() => albums.id, { onDelete: "set null" }),
  cover: text("cover"), // display URL: static path or /api/cover/:id
  coverKey: text("cover_key"), // S3 key when the cover was uploaded
  duration: integer("duration"),
  genres: text("genres").array().notNull().default([]),
  explicit: boolean("explicit").notNull().default(false),
  trackNumber: integer("track_number"),
  plays: integer("plays").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  primaryVersionId: text("primary_version_id"),
});

export const trackVersions = pgTable("track_versions", {
  id: text("id").primaryKey(),
  trackId: text("track_id")
    .notNull()
    .references(() => tracks.id, { onDelete: "cascade" }),
  kind: versionKind("kind").notNull().default("release"),
  label: text("label"),
  audioKey: text("audio_key").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const trackArtists = pgTable(
  "track_artists",
  {
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.trackId, t.artistId] })],
);

export const lyrics = pgTable("lyrics", {
  trackId: text("track_id")
    .primaryKey()
    .references(() => tracks.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isSynced: boolean("is_synced").notNull().default(false),
});

export const playlists = pgTable("playlists", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  cover: text("cover"),
  coverKey: text("cover_key"),
  description: text("description"),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const playlistTracks = pgTable(
  "playlist_tracks",
  {
    playlistId: text("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.playlistId, t.trackId] })],
);

export const likes = pgTable(
  "likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.trackId] })],
);

export const follows = pgTable(
  "follows",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.artistId] })],
);

export const claimRequests = pgTable("claim_requests", {
  id: text("id").primaryKey(),
  artistId: text("artist_id")
    .notNull()
    .references(() => artists.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  message: text("message"),
  status: claimStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Community lyrics edits (genius-style): anyone proposes, artist owner or admin approves.
export const lyricsEdits = pgTable("lyrics_edits", {
  id: text("id").primaryKey(),
  trackId: text("track_id")
    .notNull()
    .references(() => tracks.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  status: claimStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: text("id").primaryKey(),
  trackId: text("track_id")
    .notNull()
    .references(() => tracks.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
