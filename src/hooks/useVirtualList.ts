import { useEffect, useRef, useState } from "react";

/**
 * Windowed rendering for long, fixed-row lists (the play queue can hold every
 * track in the catalog). Only the visible slice plus a small overscan is
 * mounted; spacer divs above and below keep the scrollbar honest.
 *
 * Rows must be a known, uniform height — that's what makes the maths trivial
 * and avoids pulling in a virtualization library.
 */
export function useVirtualList({
  count,
  rowHeight,
  overscan = 6,
}: {
  count: number;
  rowHeight: number;
  overscan?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ start: 0, end: Math.min(count, 20) });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const measure = () => {
      const visible = Math.ceil(el.clientHeight / rowHeight) + overscan * 2;
      const start = Math.max(0, Math.floor(el.scrollTop / rowHeight) - overscan);
      setRange({ start, end: Math.min(count, start + visible) });
    };

    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [count, rowHeight, overscan]);

  return {
    scrollRef,
    start: range.start,
    end: range.end,
    padTop: range.start * rowHeight,
    padBottom: Math.max(0, (count - range.end) * rowHeight),
  };
}
