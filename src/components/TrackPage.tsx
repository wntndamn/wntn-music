import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconHeadphones,
  IconPlus,
  IconArrowBarToRight,
} from "@tabler/icons-react";
import { slugify, type Track } from "../lib/tracks";
import { trackApi, meApi, type TrackDetail } from "../lib/api";
import { usePlayer } from "../hooks/usePlayer";
import { useAuth } from "../hooks/useAuth";
import LyricsPanel from "./LyricsPanel";
import LyricsEdits from "./LyricsEdits";
import LikeButton from "./LikeButton";
import AddToPlaylist from "./AddToPlaylist";
import Comments from "./Comments";

const KIND_RU: Record<string, string> = {
  demo: "демо",
  release: "релиз",
  remaster: "ремастер",
  live: "лайв",
  other: "другое",
};

export default function TrackPage() {
  const { id } = useParams();
  const { current, isPlaying, play, toggle, addToQueue, playNext } = usePlayer();
  const { user } = useAuth();
  const [detail, setDetail] = useState<TrackDetail | null>(null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [myArtistSlug, setMyArtistSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setDetail(null);
    trackApi
      .get(id)
      .then((d) => {
        setDetail(d);
        setVersionId(d.primaryVersionId ?? d.versions[0]?.id ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "ошибка"));
  }, [id]);

  useEffect(() => {
    if (user) meApi.myArtist().then(({ artist }) => setMyArtistSlug(artist?.slug ?? null)).catch(() => {});
    else setMyArtistSlug(null);
  }, [user]);

  const reloadLyrics = () => {
    if (id) trackApi.get(id).then(setDetail).catch(() => {});
  };

  if (error)
    return (
      <div className="flex flex-col gap-2">
        <p className="font-mono text-sm text-accent">{error}</p>
        <Link to="/" className="text-sm text-accent hover:underline">← на главную</Link>
      </div>
    );
  if (!detail) return <p className="font-mono text-sm text-muted">загрузка…</p>;

  const version = detail.versions.find((v) => v.id === versionId) ?? detail.versions[0];
  const active = current?.id === detail.id;
  const cover = detail.cover ?? "/covers/default.jpg";

  const asTrack = (song: string): Track => ({
    id: detail.id,
    title: detail.title,
    author: detail.author,
    cover,
    description: "",
    song,
  });

  const playSelected = () => {
    if (!version?.url) return;
    const t = asTrack(version.url);
    play(t, [t]);
  };

  return (
    <div className="flex flex-col gap-6 md:flex-row md:gap-8">
      <div className="flex flex-col gap-4 md:w-72 md:shrink-0">
        <img
          src={cover}
          alt={detail.title}
          className="aspect-square w-full rounded-card object-cover"
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.endsWith("/covers/default.jpg")) img.src = "/covers/default.jpg";
          }}
        />
        <div>
          <h1 className="font-display text-2xl leading-tight">{detail.title}</h1>
          <p className="text-sm text-muted">
            <Link to={`/artist/${slugify(detail.author)}`} className="hover:underline">
              {detail.author}
            </Link>
            {detail.features?.length > 0 && (
              <>
                {" feat. "}
                {detail.features.map((f, i) => (
                  <span key={f.id}>
                    {i > 0 && ", "}
                    <Link to={`/artist/${f.slug}`} className="hover:underline">
                      {f.name}
                    </Link>
                  </span>
                ))}
              </>
            )}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted">
            <IconHeadphones size={14} /> {detail.plays} прослушиваний
          </p>
        </div>

        {detail.versions.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {detail.versions.map((v) => (
              <button
                key={v.id}
                onClick={() => setVersionId(v.id)}
                data-active={v.id === version?.id}
                className="rounded-card border border-border bg-surface px-2.5 py-1 text-xs hover:bg-surface-hover data-[active=true]:bg-text data-[active=true]:text-bg"
              >
                {v.label || KIND_RU[v.kind] || v.kind}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => (active ? toggle() : playSelected())}
            disabled={!version?.url}
            className="flex flex-1 items-center justify-center gap-2 rounded-card bg-accent px-4 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {active && isPlaying ? (
              <>
                <IconPlayerPauseFilled size={18} /> пауза
              </>
            ) : (
              <>
                <IconPlayerPlayFilled size={18} /> играть
              </>
            )}
          </button>
          <div className="grid h-11 w-11 place-items-center rounded-card border border-border bg-surface">
            <LikeButton trackId={detail.id} size={20} />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => version?.url && playNext(asTrack(version.url))}
            disabled={!version?.url}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-card border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-hover disabled:opacity-50"
          >
            <IconArrowBarToRight size={16} /> следующим
          </button>
          <button
            onClick={() => version?.url && addToQueue(asTrack(version.url))}
            disabled={!version?.url}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-card border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-hover disabled:opacity-50"
          >
            <IconPlus size={16} /> в очередь
          </button>
        </div>
        <AddToPlaylist trackId={detail.id} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-wide text-muted">текст</h2>
          <LyricsPanel content={detail.lyrics?.content ?? null} active={active} />
          <LyricsEdits
            trackId={detail.id}
            current={detail.lyrics?.content ?? null}
            canModerate={Boolean(user?.isAdmin) || (!!myArtistSlug && myArtistSlug === detail.authorSlug)}
            onApplied={reloadLyrics}
          />
        </div>
        <Comments trackId={detail.id} />
      </div>
    </div>
  );
}
