export type LyricLine = { time: number | null; text: string };
export type ParsedLyrics = { synced: boolean; lines: LyricLine[] };

const TAG = /\[(\d+):(\d+)(?:[.:](\d+))?\]/g;

// Parse an LRC string. Lines with [mm:ss.xx] tags become synced; plain lines
// keep time=null. A single LRC line may carry several tags (repeated chorus).
export function parseLyrics(raw: string): ParsedLyrics {
  const lines: LyricLine[] = [];
  let synced = false;

  for (const line of raw.split(/\r?\n/)) {
    const tags = [...line.matchAll(TAG)];
    const text = line.replace(TAG, "").trim();
    if (tags.length) {
      synced = true;
      for (const t of tags) {
        const min = Number(t[1]);
        const sec = Number(t[2]);
        const frac = t[3] ? Number((t[3] + "00").slice(0, 2)) / 100 : 0;
        lines.push({ time: min * 60 + sec + frac, text });
      }
    } else if (text) {
      lines.push({ time: null, text });
    }
  }

  lines.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
  return { synced, lines };
}

// Index of the active line for a given playback time (-1 before the first tag).
export function activeLineIndex(lines: LyricLine[], time: number): number {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].time;
    if (t !== null && t <= time) idx = i;
    else if (t !== null && t > time) break;
  }
  return idx;
}
