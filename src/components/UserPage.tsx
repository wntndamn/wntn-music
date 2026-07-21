import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { IconUserCircle, IconMicrophone2 } from "@tabler/icons-react";
import { userApi, meApi, type UserProfile } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

export default function UserPage() {
  const { username } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    setProfile(null);
    setError(null);
    userApi
      .profile(username)
      .then((p) => {
        setProfile(p);
        setAvatar(p.avatar);
      })
      .catch(() => setError("пользователь не найден"));
  }, [username]);

  const isMe = Boolean(user && profile && user.username === profile.username);

  const uploadAvatar = async (file: File) => {
    setStatus("загрузка…");
    try {
      const r = await meApi.uploadAvatar(file);
      setAvatar(`${r.avatar}?t=${Date.now()}`);
      setStatus(null);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "ошибка");
    }
  };

  if (error)
    return (
      <div className="flex flex-col gap-2">
        <p className="font-mono text-sm text-accent">{error}</p>
        <Link to="/" className="text-sm text-accent hover:underline">← на главную</Link>
      </div>
    );
  if (!profile) return <p className="font-mono text-sm text-muted">загрузка…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        {avatar ? (
          <img src={avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <IconUserCircle size={64} className="text-muted" />
        )}
        <div>
          <h1 className="font-display text-2xl">
            {profile.displayName ?? profile.username}
            {profile.banned && (
              <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 align-middle text-xs text-accent">
                бан
              </span>
            )}
          </h1>
          <p className="text-sm text-muted">
            @{profile.username} · с {new Date(profile.createdAt).toLocaleDateString("ru")}
          </p>
          {profile.artist && (
            <Link
              to={`/artist/${profile.artist.slug}`}
              className="mt-1 inline-flex items-center gap-1 text-sm text-accent hover:underline"
            >
              <IconMicrophone2 size={14} /> {profile.artist.name}
            </Link>
          )}
          {isMe && (
            <div className="mt-1 flex items-center gap-2">
              <label className="w-fit cursor-pointer rounded-card border border-border px-3 py-1.5 text-xs hover:bg-surface-hover">
                сменить аватарку
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadAvatar(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {status && <span className="font-mono text-xs text-muted">{status}</span>}
            </div>
          )}
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl">публичные плейлисты</h2>
        {profile.playlists.length === 0 ? (
          <p className="text-sm text-muted">пока пусто</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profile.playlists.map((p) => (
              <Link
                key={p.id}
                to={`/playlist/${p.id}`}
                className="rounded-card border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-hover"
              >
                {p.title}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
