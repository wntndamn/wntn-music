import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IconPlus, IconX, IconLock } from "@tabler/icons-react";
import { useAuth } from "../hooks/useAuth";
import { useTracks } from "../hooks/useTracks";
import {
  meApi,
  playlistApi,
  type PlaylistMeta,
  type FollowedArtist,
  type SavedAlbum,
  type SavedPlaylist,
} from "../lib/api";
import TrackGrid, { GridSkeleton } from "./TrackGrid";
import { useDialogs } from "./Dialogs";

export default function Library() {
  const { user, loading: authLoading, likes } = useAuth();
  const { tracks, loading: tracksLoading } = useTracks();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<PlaylistMeta[]>([]);
  const [following, setFollowing] = useState<FollowedArtist[]>([]);
  const [savedAlbums, setSavedAlbums] = useState<SavedAlbum[]>([]);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newPublic, setNewPublic] = useState(true);
  const { confirm } = useDialogs();

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user)
      meApi
        .library()
        .then((l) => {
          setPlaylists(l.playlists);
          setFollowing(l.following);
          setSavedAlbums(l.savedAlbums);
          setSavedPlaylists(l.savedPlaylists);
        })
        .catch(() => {});
  }, [user]);

  if (authLoading || !user) return null;

  const likedTracks = tracks.filter((t) => likes.has(t.id));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const { id } = await playlistApi.create({ title: newTitle.trim(), isPublic: newPublic });
      setPlaylists((p) => [...p, { id, title: newTitle.trim(), cover: null, isPublic: newPublic }]);
      setNewTitle("");
    } catch {
      /* ignore */
    }
  };

  const removePlaylist = async (id: string, title: string) => {
    if (!(await confirm(`удалить плейлист «${title}»?`, "удалить"))) return;
    await playlistApi.remove(id).catch(() => {});
    setPlaylists((p) => p.filter((x) => x.id !== id));
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl">плейлисты</h2>
        <form onSubmit={create} className="flex gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="новый плейлист"
            className="flex-1 rounded-card border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <label className="flex cursor-pointer items-center gap-1.5 rounded-card border border-border bg-surface px-3 text-sm text-muted">
            <input
              type="checkbox"
              checked={!newPublic}
              onChange={(e) => setNewPublic(!e.target.checked)}
              className="accent-accent"
            />
            приватный
          </label>
          <button
            type="submit"
            className="flex items-center gap-1 rounded-card bg-text px-3 py-2 text-sm font-medium text-bg"
          >
            <IconPlus size={16} /> создать
          </button>
        </form>
        {playlists.length === 0 ? (
          <p className="text-sm text-muted">пока пусто</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {playlists.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-1.5 rounded-card border border-border bg-surface pr-1.5 text-sm hover:bg-surface-hover"
              >
                <Link to={`/playlist/${p.id}`} className="flex items-center gap-1.5 py-2 pl-3">
                  {!p.isPublic && <IconLock size={13} className="text-muted" />}
                  {p.title}
                </Link>
                <button
                  onClick={() => void removePlaylist(p.id, p.title)}
                  aria-label="удалить"
                  className="grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-surface hover:text-accent"
                >
                  <IconX size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {savedPlaylists.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl">сохранённые плейлисты</h2>
          <div className="flex flex-wrap gap-3">
            {savedPlaylists.map((p) => (
              <Link
                key={p.id}
                to={`/playlist/${p.id}`}
                className="group flex w-32 shrink-0 flex-col rounded-card bg-surface p-2 transition-colors hover:bg-surface-hover"
              >
                <img
                  src={p.cover ?? "/covers/default.jpg"}
                  alt=""
                  className="aspect-square w-full rounded-md object-cover"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.src.endsWith("/covers/default.jpg")) img.src = "/covers/default.jpg";
                  }}
                />
                <p className="truncate px-1 pt-2 text-sm font-medium group-hover:underline">
                  {p.title}
                </p>
                <p className="truncate px-1 text-xs text-muted">@{p.ownerUsername}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {savedAlbums.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl">сохранённые альбомы</h2>
          <div className="flex flex-wrap gap-3">
            {savedAlbums.map((al) => (
              <Link
                key={al.id}
                to={`/album/${al.id}`}
                className="group flex w-32 shrink-0 flex-col rounded-card bg-surface p-2 transition-colors hover:bg-surface-hover"
              >
                <img
                  src={al.cover ?? "/covers/default.jpg"}
                  alt=""
                  className="aspect-square w-full rounded-md object-cover"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.src.endsWith("/covers/default.jpg")) img.src = "/covers/default.jpg";
                  }}
                />
                <p className="truncate px-1 pt-2 text-sm font-medium group-hover:underline">
                  {al.title}
                </p>
                <p className="truncate px-1 text-xs text-muted">{al.artistName}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {following.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl">подписки</h2>
          <div className="flex flex-wrap gap-2">
            {following.map((a) => (
              <Link
                key={a.slug}
                to={`/artist/${a.slug}`}
                className="rounded-card border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-hover"
              >
                {a.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl">лайки</h2>
        {tracksLoading ? (
          <GridSkeleton />
        ) : likedTracks.length ? (
          <TrackGrid tracks={likedTracks} />
        ) : (
          <p className="text-sm text-muted">пока нет лайкнутых треков</p>
        )}
      </section>
    </div>
  );
}
