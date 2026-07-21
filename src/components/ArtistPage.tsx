import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { IconId, IconPlayerPlayFilled, IconHeadphones } from "@tabler/icons-react";
import { useTracks } from "../hooks/useTracks";
import { useAuth } from "../hooks/useAuth";
import { usePlayer } from "../hooks/usePlayer";
import { slugify } from "../lib/tracks";
import { artistApi, type ArtistProfile } from "../lib/api";
import TrackGrid, { GridSkeleton } from "./TrackGrid";
import FollowButton from "./FollowButton";

export default function ArtistPage() {
  const { slug } = useParams();
  const { tracks, loading } = useTracks();
  const [profile, setProfile] = useState<ArtistProfile | null>(null);

  useEffect(() => {
    if (slug) artistApi.get(slug).then(setProfile).catch(() => setProfile(null));
  }, [slug]);

  const { play } = usePlayer();
  const mine = tracks.filter((t) => slugify(t.author) === slug);
  const name = profile?.name ?? mine[0]?.author ?? slug;
  // spotify-style "popular": top 5 by play count (only when plays are known)
  const popular = [...mine]
    .filter((t) => (t.plays ?? 0) > 0)
    .sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end gap-4">
        {profile?.avatar ? (
          <img src={profile.avatar} alt="" className="h-24 w-24 rounded-card object-cover" />
        ) : (
          <div className="grid h-24 w-24 place-items-center rounded-card bg-surface font-display text-3xl">
            {(name ?? "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Link to="/" className="text-xs text-muted hover:underline">
            ← все треки
          </Link>
          <h1 className="font-display text-3xl">{name}</h1>
          {(profile?.genres?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile!.genres.map((g) => (
                <span
                  key={g}
                  className="rounded-card border border-border bg-surface px-2 py-0.5 text-xs text-muted"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
          {profile?.bio && <p className="max-w-lg text-sm text-muted">{profile.bio}</p>}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">{mine.length} треков</span>
            {profile && (
              <FollowButton
                artistId={profile.id}
                initialFollowing={profile.isFollowing}
                initialCount={profile.followerCount}
              />
            )}
          </div>
          {profile?.claimable && <ClaimControl slug={profile.slug} pending={profile.pendingClaim} />}
        </div>
      </div>
      {(profile?.albums.length ?? 0) > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs uppercase tracking-wide text-muted">альбомы</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {profile!.albums.map((al) => (
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
              </Link>
            ))}
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs uppercase tracking-wide text-muted">популярные</h2>
          <ul className="flex flex-col">
            {popular.map((t, i) => (
              <li key={t.id} className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface">
                <span className="w-5 text-right font-mono text-xs text-muted">{i + 1}</span>
                <img src={t.cover} alt="" className="h-10 w-10 rounded object-cover" />
                <Link
                  to={`/track/${t.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 truncate text-sm hover:underline"
                >
                  {t.title}
                </Link>
                <span className="flex items-center gap-1 font-mono text-xs text-muted">
                  <IconHeadphones size={13} /> {t.plays}
                </span>
                <button
                  onClick={() => play(t, mine)}
                  aria-label="играть"
                  className="grid h-8 w-8 place-items-center rounded-full text-muted opacity-0 transition-opacity hover:bg-surface-hover hover:text-text group-hover:opacity-100"
                >
                  <IconPlayerPlayFilled size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-wide text-muted">все треки</h2>
        {loading ? <GridSkeleton /> : <TrackGrid tracks={mine} />}
      </section>
    </div>
  );
}

function ClaimControl({ slug, pending }: { slug: string; pending: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sent, setSent] = useState(pending);
  const [error, setError] = useState<string | null>(null);

  if (sent)
    return (
      <p className="font-mono text-xs text-muted">
        запрос на владение отправлен — ждёт модерации
      </p>
    );

  const request = async () => {
    if (!user) return navigate("/login");
    try {
      await artistApi.requestClaim(slug);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ошибка");
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={request}
        className="flex w-fit items-center gap-1.5 rounded-card border border-accent/40 bg-surface px-3 py-1.5 text-sm font-medium text-accent hover:bg-surface-hover"
      >
        <IconId size={16} /> это я — запросить доступ
      </button>
      {error && <p className="font-mono text-xs text-accent">{error}</p>}
    </div>
  );
}
