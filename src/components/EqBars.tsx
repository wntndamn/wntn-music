// Three bars bouncing while a track plays — replaces the static "▶" marker in
// track lists. Frozen (not hidden) on pause so the row doesn't jump.
export default function EqBars({ playing = true }: { playing?: boolean }) {
  return (
    <span aria-hidden className="flex h-3 items-end gap-[2px]">
      {[0, 0.3, 0.15].map((delay, i) => (
        <span
          key={i}
          className="w-[3px] origin-bottom rounded-sm bg-accent"
          style={{
            height: "100%",
            animation: playing ? `eq .9s ease-in-out ${delay}s infinite` : undefined,
            transform: playing ? undefined : "scaleY(0.35)",
          }}
        />
      ))}
    </span>
  );
}
