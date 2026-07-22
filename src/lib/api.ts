// Thin typed client for the wntn backend. All calls send the session cookie.
async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: opts.method ?? "GET",
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type Role = "user" | "admin" | "root";

export type User = {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  role?: Role;
  isAdmin?: boolean;
  isRoot?: boolean;
};

export type PlaylistMeta = {
  id: string;
  title: string;
  cover: string | null;
  description?: string | null;
  isPublic: boolean;
};

export type LibraryTrack = { id: string; title: string; cover: string | null };

// --- auth ---
export const authApi = {
  me: () => api<{ user: User | null }>("/auth/me"),
  signup: (b: { username: string; email: string; password: string }) =>
    api<{ id: string; username: string }>("/auth/signup", { method: "POST", body: b }),
  login: (b: { login: string; password: string }) =>
    api<{ id: string; username: string }>("/auth/login", { method: "POST", body: b }),
  logout: () => api<{ ok: true }>("/auth/logout", { method: "POST" }),
};

// --- tracks ---
export type TrackVersion = {
  id: string;
  kind: string;
  label: string | null;
  isPrimary: boolean;
  url: string | null;
};
export type TrackDetail = {
  id: string;
  title: string;
  cover: string | null;
  plays: number;
  author: string;
  authorSlug: string;
  primaryVersionId: string | null;
  albumId: string | null;
  genres: string[];
  explicit: boolean;
  versions: TrackVersion[];
  lyrics: { content: string; synced: boolean } | null;
};
export const trackApi = {
  get: (id: string) => api<TrackDetail>(`/tracks/${id}`),
  play: (id: string) =>
    api<{ plays: number }>(`/tracks/play/${id}`, { method: "POST" }).catch(() => null),
};

// --- library / likes / playlists ---
export type MyArtist = {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  avatar?: string | null;
};

export type FollowedArtist = { slug: string; name: string; avatar: string | null };
export type SavedAlbum = {
  id: string;
  title: string;
  cover: string | null;
  artistName: string;
  artistSlug: string;
};
export type SavedPlaylist = { id: string; title: string; cover: string | null; ownerUsername: string };

export const meApi = {
  library: () =>
    api<{
      likes: LibraryTrack[];
      playlists: PlaylistMeta[];
      following: FollowedArtist[];
      savedAlbums: SavedAlbum[];
      savedPlaylists: SavedPlaylist[];
    }>("/me/library"),
  myArtist: () => api<{ artist: MyArtist | null }>("/me/artist"),
  toggleFollow: (artistId: string) =>
    api<{ following: boolean }>(`/me/follows/${artistId}`, { method: "POST" }),
  toggleLike: (trackId: string) =>
    api<{ liked: boolean }>(`/me/likes/${trackId}`, { method: "POST" }),
  toggleSavedAlbum: (albumId: string) =>
    api<{ saved: boolean }>(`/me/saved-albums/${albumId}`, { method: "POST" }),
  renamePlaylist: (
    id: string,
    b: { title?: string; isPublic?: boolean; description?: string | null },
  ) => api<{ ok: true }>(`/me/playlists/${id}`, { method: "PUT", body: b }),
  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return uploadForm<{ avatar: string }>("/me/avatar", fd);
  },
};

export const playlistApi = {
  get: (id: string) =>
    api<
      PlaylistMeta & {
        userId: string;
        ownerUsername: string | null;
        saved: boolean;
        tracks: (LibraryTrack & { position: number })[];
      }
    >(`/playlists/${id}`),
  toggleSave: (id: string) => api<{ saved: boolean }>(`/playlists/${id}/save`, { method: "POST" }),
  reorder: (id: string, trackIds: string[]) =>
    api<{ ok: true }>(`/playlists/${id}/reorder`, { method: "PUT", body: { trackIds } }),
  create: (b: { title: string; isPublic?: boolean }) =>
    api<{ id: string }>("/playlists", { method: "POST", body: b }),
  addTrack: (id: string, trackId: string) =>
    api<{ ok: true }>(`/playlists/${id}/tracks`, { method: "POST", body: { trackId } }),
  removeTrack: (id: string, trackId: string) =>
    api<{ ok: true }>(`/playlists/${id}/tracks/${trackId}`, { method: "DELETE" }),
  remove: (id: string) => api<{ ok: true }>(`/playlists/${id}`, { method: "DELETE" }),
  uploadCover: (id: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return uploadForm<{ cover: string }>(`/playlists/${id}/cover`, fd);
  },
};

// --- home ---
export type HomeArtist = {
  id: string;
  slug: string;
  name: string;
  avatar: string | null;
  trackCount: number;
};
export type HomeAlbum = {
  id: string;
  title: string;
  cover: string | null;
  type: "album" | "ep" | "single";
  year: number | null;
  releaseDate: string | null;
  artistName: string;
  artistSlug: string;
};
export type HomePlaylist = {
  id: string;
  title: string;
  cover: string | null;
  description: string | null;
};
export const homeApi = {
  get: () =>
    api<{ artists: HomeArtist[]; albums: HomeAlbum[]; playlists: HomePlaylist[] }>("/home"),
};

// --- artist / studio ---
export type ArtistProfile = {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  avatar: string | null;
  genres: string[];
  links: string[];
  userId: string | null;
  albums: { id: string; title: string; cover?: string | null; type?: string }[];
  tracks: LibraryTrack[];
  followerCount: number;
  isFollowing: boolean;
  claimable: boolean;
  pendingClaim: boolean;
};

export const artistApi = {
  get: (slug: string) => api<ArtistProfile>(`/artists/${slug}`),
  claim: (b: { name: string; bio?: string }) =>
    api<{ id: string; slug: string }>("/artists", { method: "POST", body: b }),
  requestClaim: (slug: string, message?: string) =>
    api<{ id: string; status: string }>(`/artists/${slug}/claim`, {
      method: "POST",
      body: { message },
    }),
  update: (slug: string, b: { name?: string; bio?: string; genres?: string[]; links?: string[] }) =>
    api<{ ok: true }>(`/artists/${slug}`, { method: "PUT", body: b }),
};

export type ClaimRequest = {
  id: string;
  message: string | null;
  createdAt: string;
  artistName: string;
  artistSlug: string;
  username: string;
};
export type AdminUser = {
  id: string;
  username: string;
  displayName: string | null;
  role: Role;
  bannedAt: string | null;
  createdAt: string;
  artistSlug: string | null;
  artistName: string | null;
};
export type AdminArtist = {
  id: string;
  slug: string;
  name: string;
  ownerId: string;
  ownerUsername: string;
};
export const adminApi = {
  claims: () => api<ClaimRequest[]>("/admin/claims"),
  approve: (id: string) => api<{ ok: true }>(`/admin/claims/${id}/approve`, { method: "POST" }),
  reject: (id: string) => api<{ ok: true }>(`/admin/claims/${id}/reject`, { method: "POST" }),
  users: (q?: string) =>
    api<AdminUser[]>(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  setRole: (id: string, role: "user" | "admin") =>
    api<{ ok: true }>(`/admin/users/${id}/role`, { method: "POST", body: { role } }),
  ban: (id: string) => api<{ ok: true }>(`/admin/users/${id}/ban`, { method: "POST" }),
  unban: (id: string) => api<{ ok: true }>(`/admin/users/${id}/unban`, { method: "POST" }),
  artists: () => api<AdminArtist[]>("/admin/artists"),
  revokeArtist: (id: string) =>
    api<{ ok: true }>(`/admin/artists/${id}/revoke`, { method: "POST" }),
};

// --- public user profiles ---
export type UserProfile = {
  username: string;
  displayName: string | null;
  avatar: string | null;
  createdAt: string;
  banned: boolean;
  playlists: { id: string; title: string; cover: string | null }[];
  artist: { slug: string; name: string } | null;
};
export const userApi = {
  profile: (username: string) => api<UserProfile>(`/users/${encodeURIComponent(username)}`),
};

// --- community lyrics edits (genius-style) ---
export type LyricsEdit = { id: string; content: string; createdAt: string; username: string };
export const lyricsApi = {
  propose: (trackId: string, content: string) =>
    api<{ id?: string; applied?: boolean; status?: string }>(`/lyrics/${trackId}/edits`, {
      method: "POST",
      body: { content },
    }),
  edits: (trackId: string) => api<LyricsEdit[]>(`/lyrics/${trackId}/edits`),
  approve: (id: string) => api<{ ok: true }>(`/lyrics/edits/${id}/approve`, { method: "POST" }),
  reject: (id: string) => api<{ ok: true }>(`/lyrics/edits/${id}/reject`, { method: "POST" }),
};

export type AlbumDetail = {
  id: string;
  title: string;
  cover: string | null;
  year: number | null;
  releaseDate: string | null;
  description: string | null;
  genres: string[];
  copyright: string | null;
  type: "album" | "ep" | "single";
  artistId: string;
  artistName: string;
  artistSlug: string;
  canManage: boolean;
  saved: boolean;
  tracks: {
    id: string;
    title: string;
    cover: string | null;
    plays: number;
    explicit: boolean;
    trackNumber: number | null;
    song: string | null;
  }[];
};
export const albumApi = {
  get: (id: string) => api<AlbumDetail>(`/albums/${id}`),
  create: (b: { artistId: string; title: string; year?: number; type?: "album" | "ep" | "single" }) =>
    api<{ id: string }>("/albums", { method: "POST", body: b }),
  update: (
    id: string,
    b: {
      title?: string;
      year?: number | null;
      releaseDate?: string | null;
      description?: string | null;
      genres?: string[];
      copyright?: string | null;
      type?: "album" | "ep" | "single";
    },
  ) => api<{ ok: true }>(`/albums/${id}`, { method: "PUT", body: b }),
  remove: (id: string) => api<{ ok: true }>(`/albums/${id}`, { method: "DELETE" }),
  reorder: (id: string, trackIds: string[]) =>
    api<{ ok: true }>(`/albums/${id}/reorder`, { method: "PUT", body: { trackIds } }),
  uploadCover: (id: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return uploadForm<{ cover: string }>(`/albums/${id}/cover`, fd);
  },
};

// multipart POST through the api (same-origin — no S3 CORS, keys stay server-side)
async function uploadForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`/api${path}`, { method: "POST", body: form, credentials: "include" });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const manageApi = {
  createTrack: (b: { title: string; artistId: string; cover?: string }) =>
    api<{ id: string }>("/manage/tracks", { method: "POST", body: b }),
  uploadVersion: (
    trackId: string,
    file: File,
    opts: {
      kind: "demo" | "release" | "remaster" | "live" | "other";
      label?: string;
      makePrimary?: boolean;
    },
  ) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", opts.kind);
    if (opts.label) fd.append("label", opts.label);
    if (opts.makePrimary) fd.append("makePrimary", "true");
    return uploadForm<{ versionId: string }>(`/manage/tracks/${trackId}/versions`, fd);
  },
  uploadCover: (trackId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return uploadForm<{ ok: true }>(`/manage/tracks/${trackId}/cover`, fd);
  },
  putLyrics: (trackId: string, content: string) =>
    api<{ ok: true; synced: boolean }>(`/manage/tracks/${trackId}/lyrics`, {
      method: "PUT",
      body: { content },
    }),
  updateTrack: (
    trackId: string,
    b: { title?: string; albumId?: string | null; genres?: string[]; explicit?: boolean },
  ) => api<{ ok: true }>(`/manage/tracks/${trackId}`, { method: "PUT", body: b }),
  deleteTrack: (trackId: string) =>
    api<{ ok: true }>(`/manage/tracks/${trackId}`, { method: "DELETE" }),
  setPrimaryVersion: (versionId: string) =>
    api<{ ok: true }>(`/manage/versions/${versionId}/primary`, { method: "POST" }),
  updateVersion: (
    versionId: string,
    b: { kind?: "demo" | "release" | "remaster" | "live" | "other"; label?: string | null },
  ) => api<{ ok: true }>(`/manage/versions/${versionId}`, { method: "PUT", body: b }),
  deleteVersion: (versionId: string) =>
    api<{ ok: true }>(`/manage/versions/${versionId}`, { method: "DELETE" }),
  uploadArtistAvatar: (artistId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return uploadForm<{ avatar: string }>(`/manage/artists/${artistId}/avatar`, fd);
  },
};

// --- comments ---
export type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: string | null;
  username: string;
  mine: boolean;
};
export const commentApi = {
  list: (trackId: string) => api<Comment[]>(`/comments/${trackId}`),
  add: (trackId: string, content: string) =>
    api<{ id: string }>(`/comments/${trackId}`, { method: "POST", body: { content } }),
  remove: (commentId: string) =>
    api<{ ok: true }>(`/comments/id/${commentId}`, { method: "DELETE" }),
};
