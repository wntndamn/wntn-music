import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  IconChevronDown,
  IconChevronUp,
  IconTrash,
  IconStarFilled,
  IconMusic,
  IconDisc,
  IconUserCircle,
} from "@tabler/icons-react";
import { useAuth } from "../hooks/useAuth";
import {
  meApi,
  artistApi,
  albumApi,
  manageApi,
  trackApi,
  type MyArtist,
  type ArtistProfile,
  type TrackDetail,
  type AlbumDetail,
} from "../lib/api";
import SyncEditor from "./SyncEditor";
import SideNav from "./SideNav";
import Select from "./Select";
import { useDialogs } from "./Dialogs";

const KIND_RU: Record<string, string> = {
  demo: "демо",
  release: "релиз",
  remaster: "ремастер",
  live: "лайв",
  other: "другое",
};
const KIND_OPTIONS = Object.entries(KIND_RU).map(([value, label]) => ({ value, label }));
type Kind = "demo" | "release" | "remaster" | "live" | "other";

const ALBUM_TYPE_OPTIONS = [
  { value: "album", label: "альбом" },
  { value: "ep", label: "EP" },
  { value: "single", label: "сингл" },
];

const parseGenres = (s: string) =>
  s
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 10);

export default function Studio() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<MyArtist | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user)
      meApi
        .myArtist()
        .then((r) => setArtist(r.artist))
        .catch(() => setArtist(null))
        .finally(() => setReady(true));
  }, [user]);

  if (loading || !user || !ready) return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl">студия</h1>
      {artist ? <Dashboard artist={artist} /> : <ClaimForm onClaimed={setArtist} />}
    </div>
  );
}

function ClaimForm({ onClaimed }: { onClaimed: (a: MyArtist) => void }) {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const { id, slug } = await artistApi.claim({ name, bio: bio || undefined });
      onClaimed({ id, slug, name, bio: bio || null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "ошибка");
    }
  };

  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-3">
      <p className="text-sm text-muted">заведи профиль артиста, чтобы заливать треки</p>
      <Input value={name} onChange={setName} placeholder="имя артиста" required />
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="био (необязательно)"
        rows={3}
        className="rounded-card border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {error && <p className="font-mono text-sm text-accent">{error}</p>}
      <button type="submit" className="rounded-card bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-hover">
        стать артистом
      </button>
    </form>
  );
}

type StudioTab = "tracks" | "albums" | "profile";

function Dashboard({ artist }: { artist: MyArtist }) {
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [tab, setTab] = useState<StudioTab>("tracks");

  const reload = useCallback(() => {
    artistApi.get(artist.slug).then(setProfile).catch(() => {});
  }, [artist.slug]);
  useEffect(reload, [reload]);

  const albums = profile?.albums ?? [];
  const tracks = profile?.tracks ?? [];

  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-6">
      <SideNav
        items={[
          { key: "tracks", label: `треки · ${tracks.length}`, icon: <IconMusic size={16} /> },
          { key: "albums", label: `альбомы · ${albums.length}`, icon: <IconDisc size={16} /> },
          { key: "profile", label: "профиль", icon: <IconUserCircle size={16} /> },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div className="min-w-0 flex-1">
        {tab === "profile" && <ProfileEditor artist={artist} />}
        {tab === "albums" && (
          <AlbumsSection artistId={artist.id} albums={albums} onChange={reload} />
        )}
        {tab === "tracks" && (
          <TracksSection artistId={artist.id} tracks={tracks} albums={albums} onChange={reload} />
        )}
      </div>
    </div>
  );
}

function ProfileEditor({ artist }: { artist: MyArtist }) {
  const [name, setName] = useState(artist.name);
  const [bio, setBio] = useState(artist.bio ?? "");
  const [genres, setGenres] = useState("");
  const [avatar, setAvatar] = useState(artist.avatar ?? null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    artistApi
      .get(artist.slug)
      .then((p) => setGenres(p.genres.join(", ")))
      .catch(() => {});
  }, [artist.slug]);

  const save = async () => {
    setStatus("сохранение…");
    try {
      await artistApi.update(artist.slug, { name, bio, genres: parseGenres(genres) });
      setStatus("сохранено ✓");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "ошибка");
    }
  };

  const uploadAvatar = async (file: File) => {
    setStatus("загрузка аватарки…");
    try {
      const r = await manageApi.uploadArtistAvatar(artist.id, file);
      setAvatar(`${r.avatar}?t=${Date.now()}`);
      setStatus("аватарка обновлена ✓");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "ошибка");
    }
  };

  return (
    <section className="flex max-w-md flex-col gap-3">
      <div className="flex items-center gap-3">
        {avatar ? (
          <img src={avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-full bg-surface font-display text-xl">
            {artist.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <FileButton label="сменить аватарку" accept="image/*" onPick={uploadAvatar} />
      </div>
      <Input value={name} onChange={setName} placeholder="имя" />
      <Input value={genres} onChange={setGenres} placeholder="жанры через запятую" />
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="био"
        rows={3}
        className="rounded-card border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="flex items-center gap-3">
        <button onClick={save} className="self-start rounded-card bg-text px-3 py-2 text-sm font-medium text-bg">
          сохранить
        </button>
        {status && <span className="font-mono text-xs text-muted">{status}</span>}
      </div>
    </section>
  );
}

function AlbumsSection({
  artistId,
  albums,
  onChange,
}: {
  artistId: string;
  albums: { id: string; title: string }[];
  onChange: () => void;
}) {
  const [title, setTitle] = useState("");

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await albumApi.create({ artistId, title: title.trim() });
      setTitle("");
      onChange();
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <form onSubmit={create} className="flex max-w-md gap-2">
        <Input value={title} onChange={setTitle} placeholder="название альбома" />
        <button type="submit" className="rounded-card bg-text px-3 py-2 text-sm font-medium text-bg">
          создать
        </button>
      </form>
      <div className="flex flex-col gap-3">
        {albums.map((a) => (
          <AlbumManageRow key={a.id} albumId={a.id} title={a.title} onChange={onChange} />
        ))}
      </div>
    </section>
  );
}

function AlbumManageRow({
  albumId,
  title,
  onChange,
}: {
  albumId: string;
  title: string;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [draft, setDraft] = useState({
    title,
    type: "album",
    releaseDate: "",
    genres: "",
    description: "",
    copyright: "",
  });
  const [status, setStatus] = useState<string | null>(null);
  const { confirm } = useDialogs();

  const load = useCallback(() => {
    albumApi
      .get(albumId)
      .then((al) => {
        setAlbum(al);
        setDraft({
          title: al.title,
          type: al.type,
          releaseDate: al.releaseDate ?? "",
          genres: al.genres.join(", "),
          description: al.description ?? "",
          copyright: al.copyright ?? "",
        });
      })
      .catch(() => {});
  }, [albumId]);

  useEffect(() => {
    if (open && !album) load();
  }, [open, album, load]);

  const save = async () => {
    setStatus("сохранение…");
    try {
      await albumApi.update(albumId, {
        title: draft.title.trim() || undefined,
        type: draft.type as "album" | "ep" | "single",
        releaseDate: draft.releaseDate || null,
        genres: parseGenres(draft.genres),
        description: draft.description.trim() || null,
        copyright: draft.copyright.trim() || null,
      });
      setStatus("сохранено ✓");
      onChange();
      load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "ошибка");
    }
  };

  const uploadCover = async (file: File) => {
    setStatus("загрузка обложки…");
    try {
      await albumApi.uploadCover(albumId, file);
      setStatus("обложка загружена ✓");
      load();
      onChange();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "ошибка");
    }
  };

  const remove = async () => {
    if (!(await confirm(`удалить альбом «${title}»? треки останутся без альбома`, "удалить")))
      return;
    await albumApi.remove(albumId).catch(() => {});
    onChange();
  };

  return (
    <div className="rounded-card border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-3">
        <img
          src={album?.cover ?? "/covers/default.jpg"}
          alt=""
          className="h-10 w-10 rounded-md object-cover"
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.endsWith("/covers/default.jpg")) img.src = "/covers/default.jpg";
          }}
        />
        <Link
          to={`/album/${albumId}`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 truncate text-sm font-medium hover:underline"
        >
          {album?.title ?? title}
        </Link>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-hover"
        >
          {open ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />} управление
        </button>
        <button
          onClick={() => void remove()}
          aria-label="удалить альбом"
          className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted hover:text-accent"
        >
          <IconTrash size={15} />
        </button>
      </div>

      {open && (
        <div className="mt-3 flex max-w-md flex-col gap-3 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">обложка:</span>
            <FileButton label="загрузить" accept="image/*" onPick={uploadCover} />
          </div>
          <Input
            value={draft.title}
            onChange={(v) => setDraft((d) => ({ ...d, title: v }))}
            placeholder="название"
          />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">тип:</span>
            <Select
              value={draft.type}
              options={ALBUM_TYPE_OPTIONS}
              onChange={(v) => setDraft((d) => ({ ...d, type: v }))}
            />
            <span className="text-muted">релиз:</span>
            <input
              type="date"
              value={draft.releaseDate}
              onChange={(e) => setDraft((d) => ({ ...d, releaseDate: e.target.value }))}
              className="rounded-card border border-border bg-surface px-3 py-1.5 text-sm outline-none [color-scheme:inherit] focus:border-accent"
            />
          </div>
          <Input
            value={draft.genres}
            onChange={(v) => setDraft((d) => ({ ...d, genres: v }))}
            placeholder="жанры через запятую (hyperpop, cloud rap)"
          />
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="описание альбома"
            rows={3}
            className="rounded-card border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <Input
            value={draft.copyright}
            onChange={(v) => setDraft((d) => ({ ...d, copyright: v }))}
            placeholder="копирайт (℗ 2026 Артист)"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => void save()}
              className="w-fit rounded-card bg-text px-3 py-2 text-sm font-medium text-bg"
            >
              сохранить
            </button>
            {status && <span className="font-mono text-xs text-muted">{status}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function TracksSection({
  artistId,
  tracks,
  albums,
  onChange,
}: {
  artistId: string;
  tracks: { id: string; title: string; cover: string | null }[];
  albums: { id: string; title: string }[];
  onChange: () => void;
}) {
  const [title, setTitle] = useState("");

  const createTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await manageApi.createTrack({ title: title.trim(), artistId });
      setTitle("");
      onChange();
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <form onSubmit={createTrack} className="flex max-w-md gap-2">
        <Input value={title} onChange={setTitle} placeholder="название нового трека" />
        <button type="submit" className="rounded-card bg-text px-3 py-2 text-sm font-medium text-bg">
          добавить
        </button>
      </form>
      <div className="flex flex-col gap-3">
        {tracks.length === 0 ? (
          <p className="text-sm text-muted">треков пока нет</p>
        ) : (
          tracks.map((t) => (
            <TrackManageRow key={t.id} track={t} albums={albums} onChange={onChange} />
          ))
        )}
      </div>
    </section>
  );
}

function TrackManageRow({
  track,
  albums,
  onChange,
}: {
  track: { id: string; title: string; cover: string | null };
  albums: { id: string; title: string }[];
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"about" | "versions" | "lyrics">("about");
  const [detail, setDetail] = useState<TrackDetail | null>(null);
  const [title, setTitle] = useState(track.title);
  const [genres, setGenres] = useState("");
  const [explicit, setExplicit] = useState(false);
  const [kind, setKind] = useState<Kind>("release");
  const [status, setStatus] = useState<string | null>(null);
  const { confirm } = useDialogs();

  const reloadDetail = useCallback(() => {
    trackApi
      .get(track.id)
      .then((d) => {
        setDetail(d);
        setGenres(d.genres.join(", "));
        setExplicit(d.explicit);
      })
      .catch(() => {});
  }, [track.id]);

  useEffect(() => {
    if (open && !detail) reloadDetail();
  }, [open, detail, reloadDetail]);

  const run = async (label: string, fn: () => Promise<unknown>, refreshList = false) => {
    setStatus(`${label}…`);
    try {
      await fn();
      setStatus(`${label} ✓`);
      reloadDetail();
      if (refreshList) onChange();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "ошибка");
    }
  };

  const removeTrack = async () => {
    if (!(await confirm(`удалить трек «${track.title}» со всеми версиями?`, "удалить"))) return;
    await manageApi.deleteTrack(track.id).catch(() => {});
    onChange();
  };

  return (
    <div className="rounded-card border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-3">
        <img
          src={track.cover ?? "/covers/default.jpg"}
          alt=""
          className="h-10 w-10 rounded-md object-cover"
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.endsWith("/covers/default.jpg")) img.src = "/covers/default.jpg";
          }}
        />
        <Link
          to={`/track/${track.id}`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 truncate text-sm font-medium hover:underline"
        >
          {track.title}
        </Link>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-hover"
        >
          {open ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />} управление
        </button>
        <button
          onClick={() => void removeTrack()}
          aria-label="удалить трек"
          className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted hover:text-accent"
        >
          <IconTrash size={15} />
        </button>
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-4 border-t border-border pt-3 md:flex-row md:gap-5">
          <SideNav
            items={[
              { key: "about", label: "о треке" },
              { key: "versions", label: `версии · ${detail?.versions.length ?? 0}` },
              { key: "lyrics", label: "текст" },
            ]}
            active={panel}
            onChange={setPanel}
          />
          <div className="min-w-0 flex-1">
            {panel === "about" && (
              <div className="flex flex-col gap-3">
                <div className="flex max-w-md flex-col gap-2">
                  <Input value={title} onChange={setTitle} placeholder="название" />
                  <Input
                    value={genres}
                    onChange={setGenres}
                    placeholder="жанры через запятую (hyperpop, cloud rap)"
                  />
                  <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={explicit}
                      onChange={(e) => setExplicit(e.target.checked)}
                      className="accent-accent"
                    />
                    explicit (ненормативная лексика)
                  </label>
                  <button
                    onClick={() =>
                      run(
                        "сохранение",
                        () =>
                          manageApi.updateTrack(track.id, {
                            title: title.trim(),
                            genres: parseGenres(genres),
                            explicit,
                          }),
                        true,
                      )
                    }
                    className="w-fit rounded-md bg-text px-3 py-1.5 text-sm font-medium text-bg"
                  >
                    сохранить
                  </button>
                </div>
                {albums.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted">альбом:</span>
                    <Select
                      value={detail?.albumId ?? ""}
                      options={[
                        { value: "", label: "— без альбома —" },
                        ...albums.map((a) => ({ value: a.id, label: a.title })),
                      ]}
                      onChange={(v) =>
                        run("альбом", () => manageApi.updateTrack(track.id, { albumId: v || null }))
                      }
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">обложка:</span>
                  <FileButton
                    label="загрузить"
                    accept="image/*"
                    onPick={(f) => run("загрузка обложки", () => manageApi.uploadCover(track.id, f), true)}
                  />
                </div>
              </div>
            )}

            {panel === "versions" && (
              <div className="flex flex-col gap-2">
                {!detail?.versions.length ? (
                  <p className="text-sm text-muted">версий пока нет — залей аудио</p>
                ) : (
                  detail.versions.map((v) => (
                    <div key={v.id} className="flex flex-wrap items-center gap-2 text-sm">
                      {v.isPrimary && <IconStarFilled size={13} className="text-accent" />}
                      <span className={v.isPrimary ? "font-medium" : ""}>
                        {v.label || KIND_RU[v.kind] || v.kind}
                      </span>
                      {!v.isPrimary && (
                        <button
                          onClick={() => run("основная", () => manageApi.setPrimaryVersion(v.id))}
                          className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-hover"
                        >
                          сделать основной
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (await confirm("удалить версию?", "удалить"))
                            void run("удаление версии", () => manageApi.deleteVersion(v.id));
                        }}
                        className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-accent"
                      >
                        удалить
                      </button>
                    </div>
                  ))
                )}
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
                  <Select
                    value={kind}
                    options={KIND_OPTIONS}
                    onChange={(v) => setKind(v as Kind)}
                  />
                  <FileButton
                    label="залить аудио"
                    accept="audio/*"
                    onPick={(f) =>
                      run(
                        "загрузка аудио",
                        () =>
                          manageApi.uploadVersion(track.id, f, {
                            kind,
                            makePrimary: !detail?.versions.length,
                          }),
                        true,
                      )
                    }
                    solid
                  />
                </div>
              </div>
            )}

            {panel === "lyrics" && <SyncEditor trackId={track.id} />}
            {status && <p className="mt-2 font-mono text-xs text-muted">{status}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function FileButton({
  label,
  accept,
  onPick,
  solid,
}: {
  label: string;
  accept: string;
  onPick: (f: File) => void;
  solid?: boolean;
}) {
  return (
    <label
      className={
        "cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium " +
        (solid ? "bg-text text-bg" : "border border-border hover:bg-surface-hover")
      }
    >
      {label}
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="flex-1 rounded-card border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
    />
  );
}
