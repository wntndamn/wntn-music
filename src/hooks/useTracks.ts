import { useEffect, useState } from "react";
import { loadTracks, type Track } from "../lib/tracks";

export function useTracks() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadTracks()
      .then((t) => alive && setTracks(t))
      .catch((e) => alive && setError(String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { tracks, loading, error };
}
