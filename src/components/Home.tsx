import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTracks } from "../hooks/useTracks";
import { homeApi, type HomeArtist, type HomeAlbum, type HomePlaylist } from "../lib/api";
import TrackGrid, { GridSkeleton } from "./TrackGrid";

const ALBUM_TYPE_RU: Record<string, string> = { album: "альбом", ep: "EP", single: "сингл" };
const NEW_RELEASE_DAYS = 30;

const isNewRelease = (releaseDate: string | null) => {
  if (!releaseDate) return false;
  const ms = Date.now() - new Date(releaseDate).getTime();
  return ms >= 0 && ms < NEW_RELEASE_DAYS * 24 * 60 * 60 * 1000;
};

export default function Home() {
  const { tracks, loading, error } = useTracks();
  const [artist, setArtist] = useState<string | null>(null);
  const [artists, setArtists] = useState<HomeArtist[]>([]);
  const [albums, setAlbums] = useState<HomeAlbum[]>([]);
  const [playlists, setPlaylists] = useState<HomePlaylist[]>([]);

  useEffect(() => {
    homeApi
      .get()
      .then((h) => {
        setArtists(h.artists);
        setAlbums(h.albums);
        setPlaylists(h.playlists);
      })
      .catch(() => {});
  }, []);

  const chipArtists = useMemo(
    () => [...new Set(tracks.map((t) => t.author))].sort(),
    [tracks],
  );
  const shown = artist ? tracks.filter((t) => t.author === artist) : tracks;
  const newReleases = albums.filter((a) => isNewRelease(a.releaseDate));

  if (error)
    return <p className="font-mono text-sm text-accent">не загрузилось: {error}</p>;

  return (
    <div className="flex flex-col gap-8">
      {artists.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl">артисты</h2>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {artists.map((a) => (
              <Link
                key={a.id}
                to={`/artist/${a.slug}`}
                className="group flex w-24 shrink-0 flex-col items-center gap-2 text-center"
              >
                {a.avatar ? (
                  <img
                    src={a.avatar}
                    alt=""
                    className="h-24 w-24 rounded-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-full bg-surface font-display text-2xl transition-transform group-hover:scale-105">
                    {a.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium group-hover:underline">{a.name}</p>
                  <p className="text-xs text-muted">{a.trackCount} треков</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {newReleases.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl">новые релизы</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {newReleases.map((al) => (
              <AlbumCard key={al.id} album={al} isNew />
            ))}
          </div>
        </section>
      )}

      {albums.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl">альбомы</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {albums.map((al) => (
              <AlbumCard key={al.id} album={al} />
            ))}
          </div>
        </section>
      )}

      {playlists.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl">плейлисты</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {playlists.map((p) => (
              <Link
                key={p.id}
                to={`/playlist/${p.id}`}
                className="group flex flex-col rounded-card bg-surface p-2 transition-colors hover:bg-surface-hover"
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
                <div className="px-1 pt-2">
                  <p className="truncate text-sm font-medium group-hover:underline">{p.title}</p>
                  {p.description && (
                    <p className="truncate text-xs text-muted">{p.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl">треки</h2>
        <div className="flex flex-wrap gap-2">
          <Chip label="всё" active={artist === null} onClick={() => setArtist(null)} />
          {chipArtists.map((a) => (
            <Chip key={a} label={a} active={artist === a} onClick={() => setArtist(a)} />
          ))}
        </div>
        {loading ? <GridSkeleton /> : <TrackGrid tracks={shown} />}
      </section>
    </div>
  );
}

function AlbumCard({ album, isNew }: { album: HomeAlbum; isNew?: boolean }) {
  return (
    <Link
      to={`/album/${album.id}`}
      className="group flex flex-col rounded-card bg-surface p-2 transition-colors hover:bg-surface-hover"
    >
      <div className="relative">
        <img
          src={album.cover ?? "/covers/default.jpg"}
          alt=""
          className="aspect-square w-full rounded-md object-cover"
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.endsWith("/covers/default.jpg")) img.src = "/covers/default.jpg";
          }}
        />
        {isNew && (
          <span className="absolute left-1.5 top-1.5 rounded-card bg-accent px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
            новое
          </span>
        )}
      </div>
      <div className="px-1 pt-2">
        <p className="truncate text-sm font-medium group-hover:underline">{album.title}</p>
        <p className="truncate text-xs text-muted">
          {ALBUM_TYPE_RU[album.type] ?? album.type}
          {(album.releaseDate ?? album.year) &&
            ` · ${album.releaseDate?.slice(0, 4) ?? album.year}`}
          {" · "}
          {album.artistName}
        </p>
      </div>
    </Link>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      data-active={active}
      className="rounded-card border border-border bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-hover data-[active=true]:bg-text data-[active=true]:text-bg"
    >
      {label}
    </button>
  );
}
