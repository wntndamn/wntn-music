import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { IconPlayerPlayFilled, IconHeadphones } from "@tabler/icons-react";
import { albumApi, type AlbumDetail } from "../lib/api";
import { usePlayer } from "../hooks/usePlayer";
import type { Track } from "../lib/tracks";

const TYPE_RU: Record<string, string> = { album: "альбом", ep: "EP", single: "сингл" };

export default function AlbumPage() {
  const { id } = useParams();
  const { play } = usePlayer();
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setAlbum(null);
    albumApi
      .get(id)
      .then(setAlbum)
      .catch(() => setError("альбом не найден"));
  }, [id]);

  if (error)
    return (
      <div className="flex flex-col gap-2">
        <p className="font-mono text-sm text-accent">{error}</p>
        <Link to="/" className="text-sm text-accent hover:underline">← на главную</Link>
      </div>
    );
  if (!album) return <p className="font-mono text-sm text-muted">загрузка…</p>;

  const playable: Track[] = album.tracks
    .filter((t) => t.song)
    .map((t) => ({
      id: t.id,
      title: t.title,
      author: album.artistName,
      cover: t.cover ?? album.cover ?? "/covers/default.jpg",
      description: "",
      song: t.song as string,
      plays: t.plays,
    }));

  const year = album.releaseDate?.slice(0, 4) ?? album.year;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-4">
        <img
          src={album.cover ?? "/covers/default.jpg"}
          alt=""
          className="h-36 w-36 rounded-card object-cover"
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.endsWith("/covers/default.jpg")) img.src = "/covers/default.jpg";
          }}
        />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs uppercase tracking-wide text-muted">
            {TYPE_RU[album.type] ?? album.type}
            {year && ` · ${year}`}
          </p>
          <h1 className="truncate font-display text-3xl">{album.title}</h1>
          <Link
            to={`/artist/${album.artistSlug}`}
            className="text-sm text-muted hover:underline"
          >
            {album.artistName}
          </Link>
          {album.releaseDate && (
            <p className="text-xs text-muted">
              релиз: {new Date(album.releaseDate).toLocaleDateString("ru")}
            </p>
          )}
          {album.genres.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {album.genres.map((g) => (
                <span
                  key={g}
                  className="rounded-card border border-border bg-surface px-2 py-0.5 text-xs text-muted"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={() => playable[0] && play(playable[0], playable)}
            disabled={!playable.length}
            className="mt-2 flex w-fit items-center gap-2 rounded-card bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            <IconPlayerPlayFilled size={16} /> слушать
          </button>
        </div>
      </div>

      {album.description && (
        <p className="max-w-2xl whitespace-pre-wrap text-sm text-muted">{album.description}</p>
      )}

      {album.tracks.length === 0 ? (
        <p className="text-sm text-muted">треков пока нет</p>
      ) : (
        <ul className="flex flex-col">
          {album.tracks.map((t, i) => {
            const pt = playable.find((x) => x.id === t.id);
            return (
              <li
                key={t.id}
                className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface"
              >
                <span className="w-5 text-right font-mono text-xs text-muted">{i + 1}</span>
                <img
                  src={t.cover ?? album.cover ?? "/covers/default.jpg"}
                  alt=""
                  className="h-10 w-10 rounded object-cover"
                />
                <Link
                  to={`/track/${t.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm hover:underline"
                >
                  {t.title}
                  {t.explicit && (
                    <span
                      title="explicit"
                      className="rounded border border-border px-1 font-mono text-[10px] text-muted"
                    >
                      E
                    </span>
                  )}
                </Link>
                <span className="flex items-center gap-1 font-mono text-xs text-muted">
                  <IconHeadphones size={13} /> {t.plays}
                </span>
                {pt && (
                  <button
                    onClick={() => play(pt, playable)}
                    aria-label="играть"
                    className="grid h-8 w-8 place-items-center rounded-full text-muted opacity-0 transition-opacity hover:bg-surface-hover hover:text-text group-hover:opacity-100"
                  >
                    <IconPlayerPlayFilled size={16} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
