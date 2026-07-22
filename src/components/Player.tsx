import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
  IconVolume,
  IconVolumeOff,
  IconChevronDown,
  IconChevronUp,
  IconPlaylist,
  IconX,
  IconTrash,
} from "@tabler/icons-react";
import { formatTime, slugify } from "../lib/tracks";
import { usePlayer } from "../hooks/usePlayer";

export default function Player() {
  const { current } = usePlayer();
  const [expanded, setExpanded] = useState(false);

  // a collapsed player must never leave the page scroll-locked
  useEffect(() => {
    document.body.style.overflow = expanded ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [expanded]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (!current) return null;
  return expanded ? (
    <FullPlayer onClose={() => setExpanded(false)} />
  ) : (
    <MiniBar onExpand={() => setExpanded(true)} />
  );
}

function MiniBar({ onExpand }: { onExpand: () => void }) {
  const { current, isPlaying, currentTime, duration, toggle, next, prev } = usePlayer();
  if (!current) return null;
  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      {/* progress hairline doubles as the "how far in" indicator on mobile */}
      <div className="h-0.5 w-full bg-surface-hover">
        <div className="h-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:px-4">
        <button
          onClick={onExpand}
          aria-label="открыть плеер"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <img
            src={current.cover}
            alt=""
            className="h-11 w-11 shrink-0 rounded-md object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.src.endsWith("/covers/default.jpg")) img.src = "/covers/default.jpg";
            }}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{current.title}</p>
            <p className="truncate text-xs text-muted">{current.author}</p>
          </div>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={prev}
            aria-label="назад"
            className="hidden h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-hover hover:text-text sm:grid"
          >
            <IconPlayerSkipBackFilled size={18} />
          </button>
          <button
            onClick={toggle}
            aria-label={isPlaying ? "пауза" : "играть"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-text text-bg transition-transform active:scale-95"
          >
            {isPlaying ? <IconPlayerPauseFilled size={20} /> : <IconPlayerPlayFilled size={20} />}
          </button>
          <button
            onClick={next}
            aria-label="вперёд"
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-hover hover:text-text"
          >
            <IconPlayerSkipForwardFilled size={18} />
          </button>
          <button
            onClick={onExpand}
            aria-label="развернуть"
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-hover hover:text-text"
          >
            <IconChevronUp size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function FullPlayer({ onClose }: { onClose: () => void }) {
  const {
    current,
    isPlaying,
    currentTime,
    duration,
    volume,
    toggle,
    next,
    prev,
    seek,
    setVolume,
  } = usePlayer();
  const [showQueue, setShowQueue] = useState(false);
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onClose}
          aria-label="свернуть"
          className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-hover hover:text-text"
        >
          <IconChevronDown size={20} />
        </button>
        <p className="text-xs uppercase tracking-wide text-muted">сейчас играет</p>
        <button
          onClick={() => setShowQueue((q) => !q)}
          data-active={showQueue}
          aria-label="очередь"
          className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-hover hover:text-text data-[active=true]:text-accent"
        >
          <IconPlaylist size={20} />
        </button>
      </div>

      {showQueue ? (
        <QueueList onClose={() => setShowQueue(false)} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 md:flex-row md:gap-10">
          <img
            src={current.cover}
            alt=""
            className="aspect-square w-full max-w-[min(70vw,340px)] rounded-card object-cover shadow-xl md:max-w-[380px]"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.src.endsWith("/covers/default.jpg")) img.src = "/covers/default.jpg";
            }}
          />
          <div className="flex w-full max-w-md flex-col gap-4">
            <div className="min-w-0 text-center md:text-left">
              <Link
                to={`/track/${current.id}`}
                onClick={onClose}
                className="block truncate font-display text-2xl hover:underline"
              >
                {current.title}
              </Link>
              <Link
                to={`/artist/${slugify(current.author)}`}
                onClick={onClose}
                className="block truncate text-sm text-muted hover:underline"
              >
                {current.author}
              </Link>
            </div>

            <div className="flex flex-col gap-1">
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label="прогресс"
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-hover accent-accent"
              />
              <div className="flex justify-between font-mono text-[11px] text-muted">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-5 md:justify-start">
              <button
                onClick={prev}
                aria-label="назад"
                className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-surface-hover hover:text-text"
              >
                <IconPlayerSkipBackFilled size={24} />
              </button>
              <button
                onClick={toggle}
                aria-label={isPlaying ? "пауза" : "играть"}
                className="grid h-16 w-16 place-items-center rounded-full bg-accent text-white transition-transform active:scale-95"
              >
                {isPlaying ? (
                  <IconPlayerPauseFilled size={28} />
                ) : (
                  <IconPlayerPlayFilled size={28} />
                )}
              </button>
              <button
                onClick={next}
                aria-label="вперёд"
                className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-surface-hover hover:text-text"
              >
                <IconPlayerSkipForwardFilled size={24} />
              </button>
            </div>

            {/* touch devices use hardware volume; a slider there is dead weight */}
            <div className="hidden items-center gap-2 md:flex">
              <button
                onClick={() => setVolume(volume > 0 ? 0 : 1)}
                aria-label={volume > 0 ? "выключить звук" : "включить звук"}
                className="text-muted hover:text-text"
              >
                {volume > 0 ? <IconVolume size={18} /> : <IconVolumeOff size={18} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="громкость"
                className="h-1 w-28 cursor-pointer appearance-none rounded-full bg-surface-hover accent-accent"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QueueList({ onClose }: { onClose: () => void }) {
  const { queue, index, playAt, removeFromQueue, clearQueue } = usePlayer();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg">очередь · {queue.length}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={clearQueue}
            className="flex items-center gap-1 rounded-card border border-border px-2.5 py-1 text-xs text-muted hover:text-accent"
          >
            <IconTrash size={13} /> очистить
          </button>
          <button
            onClick={onClose}
            aria-label="закрыть очередь"
            className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-hover hover:text-text"
          >
            <IconX size={16} />
          </button>
        </div>
      </div>

      <ul className="mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col overflow-y-auto">
        {queue.map((t, i) => (
          <li
            key={`${t.id}-${i}`}
            data-current={i === index}
            className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface data-[current=true]:bg-surface"
          >
            <span className="w-5 text-right font-mono text-xs text-muted">
              {i === index ? "▶" : i + 1}
            </span>
            <img src={t.cover} alt="" className="h-10 w-10 rounded object-cover" />
            <button
              onClick={() => playAt(i)}
              className="min-w-0 flex-1 text-left"
            >
              <p
                data-current={i === index}
                className="truncate text-sm data-[current=true]:font-medium data-[current=true]:text-accent"
              >
                {t.title}
              </p>
              <p className="truncate text-xs text-muted">{t.author}</p>
            </button>
            <button
              onClick={() => removeFromQueue(i)}
              aria-label="убрать из очереди"
              className="grid h-8 w-8 place-items-center rounded-full text-muted opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
            >
              <IconX size={15} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
