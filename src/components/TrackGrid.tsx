import type { Track } from "../lib/tracks";
import TrackCard from "./TrackCard";

export default function TrackGrid({ tracks }: { tracks: Track[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {tracks.map((t) => (
        <TrackCard key={t.id} track={t} queue={tracks} />
      ))}
    </div>
  );
}

export function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="rounded-card bg-surface p-2">
          <div className="aspect-square animate-pulse rounded-md bg-surface-hover" />
          <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-surface-hover" />
          <div className="mt-1.5 h-2.5 w-1/3 animate-pulse rounded bg-surface-hover" />
        </div>
      ))}
    </div>
  );
}
