import { useEffect, useMemo, useRef } from "react";
import { parseLyrics, activeLineIndex } from "../lib/lyrics";
import { usePlayer } from "../hooks/usePlayer";

// Renders lyrics passed from the track API. Synced (LRC) lines highlight by
// playback time when this track is the active one; plain text just scrolls.
export default function LyricsPanel({
  content,
  active,
}: {
  content: string | null;
  active: boolean;
}) {
  const { currentTime } = usePlayer();
  const containerRef = useRef<HTMLDivElement>(null);
  const parsed = useMemo(() => (content ? parseLyrics(content) : null), [content]);

  const idx =
    parsed?.synced && active ? activeLineIndex(parsed.lines, currentTime) : -1;

  useEffect(() => {
    if (idx < 0 || !containerRef.current) return;
    containerRef.current
      .querySelector<HTMLElement>(`[data-line="${idx}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [idx]);

  if (!parsed) return <p className="font-mono text-sm text-muted">текста пока нет</p>;

  return (
    <div ref={containerRef} className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto pr-2">
      {parsed.lines.map((line, i) => (
        <p
          key={i}
          data-line={i}
          className={
            "font-mono text-base transition-colors " +
            (parsed.synced
              ? i === idx
                ? "font-medium text-text"
                : "text-muted/60"
              : "text-text")
          }
        >
          {line.text || " "}
        </p>
      ))}
    </div>
  );
}
