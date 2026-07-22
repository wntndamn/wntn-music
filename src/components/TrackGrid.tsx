import type { Track } from "../lib/tracks";
import TrackCard from "./TrackCard";

export default function TrackGrid({ tracks }: { tracks: Track[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {tracks.map((t, i) => (
        <div
          key={t.id}
          className="animate-fade-up"
          // brief stagger so a grid appears to settle in rather than pop
          style={{ animationDelay: `${Math.min(i, 12) * 25}ms`, animationFillMode: "backwards" }}
        >
          <TrackCard track={t} queue={tracks} />
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="rounded-card bg-surface p-2">
          <div className="shimmer aspect-square animate-shimmer rounded-md" />
          <div className="shimmer mt-2 h-3 w-2/3 animate-shimmer rounded" />
          <div className="shimmer mt-1.5 h-2.5 w-1/3 animate-shimmer rounded" />
        </div>
      ))}
    </div>
  );
}
