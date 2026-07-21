export type Track = {
  id: string;
  title: string;
  author: string;
  cover: string;
  description: string;
  song: string;
  plays?: number;
};

type RawTrack = {
  id: string;
  title: string;
  author: string;
  cover: string;
  decription?: string; // legacy typo from the python generator
  description?: string;
  song: string;
};

export async function fetchTracks(): Promise<Track[]> {
  const res = await fetch("/track-list.json");
  if (!res.ok) throw new Error(`track-list.json ${res.status}`);
  const raw = (await res.json()) as RawTrack[];
  return raw.map((t) => ({
    id: t.id,
    title: t.title,
    author: t.author,
    cover: t.cover,
    description: t.description ?? t.decription ?? "",
    song: t.song,
  }));
}

type ApiTrack = {
  id: string;
  title: string;
  cover: string | null;
  author: string;
  song: string | null;
  plays?: number;
};

// Prefer the backend; fall back to the static json so the site works either way.
export async function loadTracks(): Promise<Track[]> {
  try {
    const res = await fetch("/api/tracks");
    if (res.ok) {
      const rows = (await res.json()) as ApiTrack[];
      if (Array.isArray(rows) && rows.length) {
        return rows
          .filter((r) => r.song)
          .map((r) => ({
            id: r.id,
            title: r.title,
            author: r.author,
            cover: r.cover ?? "/covers/default.jpg",
            description: "",
            song: r.song as string,
            plays: r.plays,
          }));
      }
    }
  } catch {
    // network/api down — use static catalog
  }
  return fetchTracks();
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
