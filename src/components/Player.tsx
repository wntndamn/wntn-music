import { Link } from "react-router-dom";
import {
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
  IconVolume,
} from "@tabler/icons-react";
import { formatTime } from "../lib/tracks";
import { usePlayer } from "../hooks/usePlayer";

export default function Player() {
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

  if (!current) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4">
        <Link to={`/track/${current.id}`} className="flex min-w-0 items-center gap-3">
          <img
            src={current.cover}
            alt=""
            className="h-12 w-12 shrink-0 rounded-md object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.src.endsWith("/covers/default.jpg")) img.src = "/covers/default.jpg";
            }}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{current.title}</p>
            <p className="truncate text-xs text-muted">{current.author}</p>
          </div>
        </Link>

        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <IconBtn onClick={prev} label="назад">
              <IconPlayerSkipBackFilled size={18} />
            </IconBtn>
            <button
              onClick={toggle}
              aria-label={isPlaying ? "пауза" : "играть"}
              className="grid h-10 w-10 place-items-center rounded-full bg-text text-bg transition-transform active:scale-95"
            >
              {isPlaying ? (
                <IconPlayerPauseFilled size={20} />
              ) : (
                <IconPlayerPlayFilled size={20} />
              )}
            </button>
            <IconBtn onClick={next} label="вперёд">
              <IconPlayerSkipForwardFilled size={18} />
            </IconBtn>
          </div>
          <div className="flex w-full max-w-md items-center gap-2">
            <span className="w-9 text-right font-mono text-[11px] text-muted">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="прогресс"
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-surface-hover accent-accent"
            />
            <span className="w-9 font-mono text-[11px] text-muted">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <IconVolume size={18} className="text-muted" />
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
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-text"
    >
      {children}
    </button>
  );
}
