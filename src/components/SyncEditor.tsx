import { useRef, useState } from "react";
import { IconPlayerPlayFilled, IconPlayerPauseFilled, IconClockPlus } from "@tabler/icons-react";
import { trackApi, manageApi } from "../lib/api";

function lrcTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.floor((sec % 1) * 100);
  const p = (n: number) => String(n).padStart(2, "0");
  return `[${p(m)}:${p(s)}.${p(cs)}]`;
}

// Paste plain lyrics, then play the track and tap each line in time to stamp
// LRC timestamps (karaoke). Saves the result via the lyrics API.
export default function SyncEditor({ trackId }: { trackId: string }) {
  const [raw, setRaw] = useState("");
  const [mode, setMode] = useState<"edit" | "sync">("edit");
  const [lines, setLines] = useState<string[]>([]);
  const [stamps, setStamps] = useState<Record<number, number>>({});
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startSync = async () => {
    const ls = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!ls.length) return;
    setStatus("загрузка аудио…");
    try {
      const d = await trackApi.get(trackId);
      const v = d.versions.find((x) => x.isPrimary) ?? d.versions[0];
      if (!v?.url) {
        setStatus("у трека нет аудио — сначала залей версию");
        return;
      }
      const audio = new Audio(v.url);
      audioRef.current = audio;
      audio.addEventListener("play", () => setPlaying(true));
      audio.addEventListener("pause", () => setPlaying(false));
      setLines(ls);
      setStamps({});
      setIdx(0);
      setMode("sync");
      setStatus(null);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "ошибка");
    }
  };

  const tap = () => {
    const audio = audioRef.current;
    if (!audio || idx >= lines.length) return;
    setStamps((s) => ({ ...s, [idx]: audio.currentTime }));
    setIdx((i) => Math.min(i + 1, lines.length));
  };

  const buildLrc = () =>
    lines.map((l, i) => (stamps[i] != null ? `${lrcTime(stamps[i])}${l}` : l)).join("\n");

  const save = async (content: string) => {
    setStatus("сохранение…");
    try {
      const { synced } = await manageApi.putLyrics(trackId, content);
      setStatus(synced ? "сохранено (синхро) ✓" : "сохранено ✓");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "ошибка");
    }
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => {});
    else a.pause();
  };

  if (mode === "edit") {
    return (
      <div className="flex flex-col gap-2">
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={"вставь текст (строка = строка), или готовый LRC"}
          rows={6}
          className="rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm outline-none focus:border-accent"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => save(raw)}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            сохранить как есть
          </button>
          <button
            onClick={startSync}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-hover"
          >
            ⏱ разметить синхронно
          </button>
        </div>
        {status && <p className="font-mono text-xs text-muted">{status}</p>}
      </div>
    );
  }

  const done = idx >= lines.length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          aria-label={playing ? "пауза" : "играть"}
          className="grid h-9 w-9 place-items-center rounded-full bg-text text-bg"
        >
          {playing ? <IconPlayerPauseFilled size={18} /> : <IconPlayerPlayFilled size={18} />}
        </button>
        <button
          onClick={tap}
          disabled={done}
          className="flex flex-1 items-center justify-center gap-2 rounded-card bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          <IconClockPlus size={18} /> {done ? "все строки размечены" : "отметить строку"}
        </button>
      </div>

      <div className="flex max-h-60 flex-col gap-1 overflow-y-auto rounded-md border border-border bg-bg p-2">
        {lines.map((l, i) => (
          <div
            key={i}
            data-cur={i === idx}
            className="flex items-baseline gap-2 rounded px-2 py-1 font-mono text-sm data-[cur=true]:bg-surface-hover"
          >
            <span className="w-16 shrink-0 text-xs text-muted">
              {stamps[i] != null ? lrcTime(stamps[i]) : "—"}
            </span>
            <span className={i === idx ? "text-text" : "text-muted"}>{l}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => save(buildLrc())}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          сохранить LRC
        </button>
        <button
          onClick={() => {
            audioRef.current?.pause();
            setMode("edit");
          }}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-hover"
        >
          назад
        </button>
        {status && <span className="font-mono text-xs text-muted">{status}</span>}
      </div>
    </div>
  );
}
