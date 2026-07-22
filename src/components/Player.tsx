import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
  IconVolume,
  IconVolume2,
  IconVolumeOff,
  IconChevronDown,
  IconChevronUp,
  IconPlaylist,
  IconMicrophone2,
  IconArrowsShuffle,
  IconRepeat,
  IconRepeatOnce,
  IconX,
  IconTrash,
} from "@tabler/icons-react";
import { formatTime, slugify } from "../lib/tracks";
import { usePlayer } from "../hooks/usePlayer";
import { useVirtualList } from "../hooks/useVirtualList";
import { trackApi } from "../lib/api";
import LikeButton from "./LikeButton";
import LyricsPanel from "./LyricsPanel";
import EqBars from "./EqBars";

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

/** shuffle · prev · play · next · repeat — shared by both layouts */
function TransportControls({ size = "sm" }: { size?: "sm" | "lg" }) {
  const {
    isPlaying,
    toggle,
    next,
    prev,
    shuffle,
    toggleShuffle,
    repeat,
    cycleRepeat,
  } = usePlayer();
  const big = size === "lg";
  const side = big ? "h-11 w-11" : "h-9 w-9";
  const icon = big ? 22 : 18;

  return (
    <div className={"flex items-center " + (big ? "gap-3" : "gap-1")}>
      <button
        onClick={toggleShuffle}
        data-active={shuffle}
        aria-label="перемешать"
        title="перемешать"
        className={`grid ${side} place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-text data-[active=true]:text-accent`}
      >
        <IconArrowsShuffle size={icon} />
      </button>
      <button
        onClick={prev}
        aria-label="назад"
        className={`grid ${side} place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-text`}
      >
        <IconPlayerSkipBackFilled size={icon} />
      </button>
      <button
        onClick={toggle}
        aria-label={isPlaying ? "пауза" : "играть"}
        className={
          "grid shrink-0 place-items-center rounded-full bg-accent text-white shadow-lg transition-transform hover:bg-accent-hover active:scale-95 " +
          (big ? "h-16 w-16" : "h-10 w-10")
        }
      >
        {isPlaying ? (
          <IconPlayerPauseFilled size={big ? 28 : 20} />
        ) : (
          <IconPlayerPlayFilled size={big ? 28 : 20} />
        )}
      </button>
      <button
        onClick={next}
        aria-label="вперёд"
        className={`grid ${side} place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-text`}
      >
        <IconPlayerSkipForwardFilled size={icon} />
      </button>
      <button
        onClick={cycleRepeat}
        data-active={repeat !== "off"}
        aria-label="повтор"
        title={repeat === "one" ? "повтор трека" : repeat === "all" ? "повтор очереди" : "повтор выключен"}
        className={`grid ${side} place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-text data-[active=true]:text-accent`}
      >
        {repeat === "one" ? <IconRepeatOnce size={icon} /> : <IconRepeat size={icon} />}
      </button>
    </div>
  );
}

function VolumeControl() {
  const { volume, setVolume } = usePlayer();
  const Icon = volume === 0 ? IconVolumeOff : volume < 0.5 ? IconVolume2 : IconVolume;
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setVolume(volume > 0 ? 0 : 1)}
        aria-label={volume > 0 ? "выключить звук" : "включить звук"}
        className="text-muted transition-colors hover:text-text"
      >
        <Icon size={18} />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        aria-label="громкость"
        className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-surface-hover accent-accent"
      />
    </div>
  );
}

const SWIPE_THRESHOLD = 60;

function MiniBar({ onExpand }: { onExpand: () => void }) {
  const { current, isPlaying, currentTime, duration, toggle, next, prev } = usePlayer();
  const touch = useRef<{ x: number; y: number } | null>(null);
  // the offset lives in a ref: touchend must read the final value, and state
  // updates are async, so a fast flick would otherwise read a stale 0
  const dragRef = useRef(0);
  const [drag, setDrag] = useState(0);

  if (!current) return null;
  const progress = duration ? (currentTime / duration) * 100 : 0;

  // On phones the bar carries play/pause only; swiping it left/right changes
  // track, and everything else lives in the expanded player.
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
    dragRef.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touch.current || !e.touches[0]) return;
    const t = e.touches[0];
    const dx = t.clientX - touch.current.x;
    // ignore mostly-vertical gestures so page scrolling still works
    if (Math.abs(dx) > Math.abs(t.clientY - touch.current.y)) {
      dragRef.current = dx;
      setDrag(dx);
    }
  };
  const onTouchEnd = () => {
    const dx = dragRef.current;
    if (dx <= -SWIPE_THRESHOLD) next();
    else if (dx >= SWIPE_THRESHOLD) prev();
    touch.current = null;
    dragRef.current = 0;
    setDrag(0);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 animate-fade-up overflow-hidden border-t border-border bg-bg/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="h-0.5 w-full bg-surface-hover">
        <div className="h-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: drag ? `translateX(${drag / 3}px)` : undefined }}
        className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 transition-transform sm:px-4"
      >
        <button
          onClick={onExpand}
          aria-label="открыть плеер"
          className="group flex min-w-0 flex-1 items-center gap-3 text-left md:w-64 md:flex-none"
        >
          <div className="relative shrink-0">
            <img
              src={current.cover}
              alt=""
              className="h-11 w-11 rounded-md object-cover transition-transform group-hover:scale-105"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.endsWith("/covers/default.jpg")) img.src = "/covers/default.jpg";
              }}
            />
            {isPlaying && (
              <span className="absolute inset-0 grid place-items-center rounded-md bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <EqBars />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{current.title}</p>
            <p className="truncate text-xs text-muted">
              {drag ? (drag < 0 ? "следующий →" : "← предыдущий") : current.author}
            </p>
          </div>
        </button>

        {/* phones: play/pause only — swipe handles skipping */}
        <button
          onClick={toggle}
          aria-label={isPlaying ? "пауза" : "играть"}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-white transition-transform active:scale-95 md:hidden"
        >
          {isPlaying ? <IconPlayerPauseFilled size={20} /> : <IconPlayerPlayFilled size={20} />}
        </button>

        <div className="hidden flex-1 items-center justify-center gap-1 md:flex">
          <TransportControls />
          <div className="ml-1">
            <LikeButton trackId={current.id} size={17} />
          </div>
        </div>

        <div className="hidden items-center justify-end gap-2 md:flex md:w-64">
          <div className="hidden lg:block">
            <VolumeControl />
          </div>
          <button
            onClick={onExpand}
            aria-label="развернуть"
            className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-text"
          >
            <IconChevronUp size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

const DISMISS_THRESHOLD = 110;

function FullPlayer({ onClose }: { onClose: () => void }) {
  const { current, isPlaying, currentTime, duration, seek } = usePlayer();
  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState<string | null>(null);

  // pull-down-to-dismiss (phones): offset in a ref so touchend reads the final
  // value; scrollable children opt out via data-noswipe so lists still scroll
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const [pull, setPull] = useState(0);

  // lyrics live on the track detail, not on the queue entry
  const trackId = current?.id;
  useEffect(() => {
    if (!trackId) return;
    setLyrics(null);
    trackApi
      .get(trackId)
      .then((d) => setLyrics(d.lyrics?.content ?? null))
      .catch(() => setLyrics(null));
  }, [trackId]);

  if (!current) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("[data-noswipe]")) return;
    startY.current = e.touches[0].clientY;
    pullRef.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null || !e.touches[0]) return;
    const dy = e.touches[0].clientY - startY.current;
    // downward only — dragging up shouldn't lift the sheet off screen
    if (dy > 0) {
      pullRef.current = dy;
      setPull(dy);
    }
  };
  const onTouchEnd = () => {
    if (pullRef.current >= DISMISS_THRESHOLD) onClose();
    startY.current = null;
    pullRef.current = 0;
    setPull(0);
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        transform: pull ? `translateY(${pull * 0.5}px)` : undefined,
        opacity: pull ? Math.max(0.6, 1 - pull / 500) : undefined,
      }}
      className="fixed inset-0 z-40 flex animate-slide-up flex-col bg-bg pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] transition-[transform,opacity]"
    >
      {/* grab handle: the phone affordance for "drag me down" */}
      <button
        onClick={onClose}
        aria-label="свернуть"
        className="mx-auto mt-2 flex h-8 w-full max-w-[120px] shrink-0 items-center justify-center lg:hidden"
      >
        <span className="h-1 w-10 rounded-full bg-muted/40" />
      </button>
      <button
        onClick={onClose}
        aria-label="свернуть"
        className="absolute right-4 top-4 z-10 hidden h-11 w-11 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:bg-surface-hover hover:text-text lg:grid"
      >
        <IconChevronDown size={20} />
      </button>

      <div className="flex min-h-0 flex-1 items-center justify-center gap-10 px-4 pb-4 lg:px-10 lg:py-6">
        <div className="flex w-full max-w-sm flex-col items-center justify-center gap-5">
          <div className="group relative w-full">
            <img
              src={current.cover}
              alt=""
              className="aspect-square w-full rounded-card object-cover shadow-2xl"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.endsWith("/covers/default.jpg")) img.src = "/covers/default.jpg";
              }}
            />
            {/* controls float over the artwork, like the reference player */}
            <div className="absolute inset-0 grid place-items-center rounded-card bg-gradient-to-t from-black/55 via-black/10 to-black/25">
              <div className="[&_button]:text-white/80 [&_button:hover]:bg-white/15 [&_button:hover]:text-white">
                <TransportControls size="lg" />
              </div>
            </div>
            <button
              onClick={() => setShowQueue((q) => !q)}
              data-active={showQueue}
              aria-label="очередь"
              className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white/85 backdrop-blur transition-colors hover:bg-black/65 hover:text-white data-[active=true]:text-accent"
            >
              <IconPlaylist size={20} />
            </button>
            <div className="absolute bottom-3 left-3 grid h-10 w-10 place-items-center rounded-full bg-black/45 backdrop-blur">
              <LikeButton trackId={current.id} size={18} />
            </div>
          </div>

          {/* title, seek bar and sheet toggles travel together as one block */}
          <div className="flex w-full flex-col gap-3">
          <div className="w-full text-center">
            <Link
              to={`/track/${current.id}`}
              onClick={onClose}
              className="block truncate font-display text-xl hover:underline"
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

          <div className="flex w-full flex-col gap-1" data-noswipe>
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

          <div className="hidden md:block">
            <VolumeControl />
          </div>

          {/* phones: reach the queue and lyrics without hunting the artwork */}
          <div className="flex w-full gap-2 lg:hidden">
            <button
              onClick={() => setShowQueue((q) => !q)}
              data-active={showQueue}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-card border border-border bg-surface py-2.5 text-sm text-muted transition-colors active:scale-[0.98] data-[active=true]:text-accent"
            >
              <IconPlaylist size={17} /> очередь
            </button>
            {lyrics && (
              <button
                onClick={() => setShowLyrics((s) => !s)}
                data-active={showLyrics}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-card border border-border bg-surface py-2.5 text-sm text-muted transition-colors active:scale-[0.98] data-[active=true]:text-accent"
              >
                <IconMicrophone2 size={17} /> текст
              </button>
            )}
          </div>
          </div>
        </div>

        {/* side panel: queue if toggled, otherwise lyrics when the track has them */}
        {showQueue ? (
          <div className="hidden min-h-0 w-full max-w-md lg:flex lg:flex-col">
            <QueueList onClose={() => setShowQueue(false)} />
          </div>
        ) : (
          lyrics && (
            <div className="hidden min-h-0 w-full max-w-md flex-col gap-3 lg:flex">
              <h2 className="text-xs uppercase tracking-wide text-muted">текст</h2>
              <LyricsPanel content={lyrics} active />
            </div>
          )
        )}
      </div>

      {/* narrow screens get the queue and lyrics as sheets, one at a time */}
      {showQueue && (
        <div className="flex min-h-0 flex-1 flex-col lg:hidden" data-noswipe>
          <QueueList onClose={() => setShowQueue(false)} />
        </div>
      )}
      {!showQueue && showLyrics && lyrics && (
        <div
          className="flex max-h-[38vh] flex-col gap-2 overflow-hidden px-4 pb-4 lg:hidden"
          data-noswipe
        >
          <h2 className="text-xs uppercase tracking-wide text-muted">текст</h2>
          <LyricsPanel content={lyrics} active />
        </div>
      )}
      {isPlaying && <span className="sr-only">играет</span>}
    </div>
  );
}

const QUEUE_ROW_H = 56;

function QueueList({ onClose }: { onClose: () => void }) {
  const { queue, index, isPlaying, playAt, removeFromQueue, clearQueue } = usePlayer();
  const { scrollRef, start, end, padTop, padBottom } = useVirtualList({
    count: queue.length,
    rowHeight: QUEUE_ROW_H,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg">очередь · {queue.length}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={clearQueue}
            className="flex items-center gap-1 rounded-card border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:text-accent"
          >
            <IconTrash size={13} /> очистить
          </button>
          <button
            onClick={onClose}
            aria-label="закрыть очередь"
            className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-text"
          >
            <IconX size={16} />
          </button>
        </div>
      </div>

      {/* virtualized: the queue can hold the whole catalog */}
      <div
        ref={scrollRef}
        data-noswipe
        className="mx-auto min-h-0 w-full max-w-2xl flex-1 overflow-y-auto"
      >
        <div style={{ paddingTop: padTop, paddingBottom: padBottom }}>
          <ul className="flex flex-col">
            {queue.slice(start, end).map((t, n) => {
              const i = start + n;
              return (
                <li
                  key={`${t.id}-${i}`}
                  data-current={i === index}
                  style={{ height: QUEUE_ROW_H }}
                  className="group flex items-center gap-3 rounded-md px-2 transition-colors hover:bg-surface data-[current=true]:bg-surface"
                >
                  <span className="flex w-5 justify-end font-mono text-xs text-muted">
                    {i === index ? <EqBars playing={isPlaying} /> : i + 1}
                  </span>
                  <img src={t.cover} alt="" className="h-10 w-10 rounded object-cover" />
                  <button onClick={() => playAt(i)} className="min-w-0 flex-1 text-left">
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
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
