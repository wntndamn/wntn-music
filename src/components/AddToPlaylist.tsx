import { useEffect, useState } from "react";
import { IconPlaylistAdd } from "@tabler/icons-react";
import { useAuth } from "../hooks/useAuth";
import { meApi, playlistApi, type PlaylistMeta } from "../lib/api";

// Compact "add this track to a playlist" control. Hidden for logged-out users.
export default function AddToPlaylist({ trackId }: { trackId: string }) {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<PlaylistMeta[]>([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (open && user && playlists.length === 0)
      meApi.library().then((l) => setPlaylists(l.playlists)).catch(() => {});
  }, [open, user, playlists.length]);

  if (!user) return null;

  const add = async (id: string) => {
    try {
      await playlistApi.addTrack(id, trackId);
      setStatus("добавлено ✓");
      setOpen(false);
    } catch {
      setStatus("ошибка");
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-card border border-border bg-surface px-3 py-2.5 text-sm font-medium hover:bg-surface-hover"
      >
        <IconPlaylistAdd size={18} /> в плейлист
      </button>
      {open && (
        <div className="absolute z-10 mt-1 flex min-w-44 flex-col gap-0.5 rounded-card border border-border bg-bg p-1 shadow-lg">
          {playlists.length === 0 ? (
            <span className="px-3 py-2 text-sm text-muted">нет плейлистов</span>
          ) : (
            playlists.map((p) => (
              <button
                key={p.id}
                onClick={() => add(p.id)}
                className="truncate rounded-md px-3 py-2 text-left text-sm hover:bg-surface-hover"
              >
                {p.title}
              </button>
            ))
          )}
        </div>
      )}
      {status && <p className="mt-1 font-mono text-xs text-muted">{status}</p>}
    </div>
  );
}
