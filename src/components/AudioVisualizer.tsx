import { useEffect, useRef } from "react";

/**
 * Yandex-style equalizer bars. Playback audio is served cross-origin (presigned
 * S3), so a real AnalyserNode would be tainted and read zeros — instead each bar
 * is driven by a couple of detuned sines, which reads as a spectrum and can
 * never break playback. Bars ease toward a flat floor when paused.
 */
export default function AudioVisualizer({
  playing,
  bars = 48,
  className = "",
}: {
  playing: boolean;
  bars?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // per-bar oscillator params, fixed for the component's life
    const seed = Array.from({ length: bars }, (_, i) => ({
      f1: 0.6 + (i % 7) * 0.22,
      f2: 1.3 + ((i * 3) % 5) * 0.31,
      phase: (i * 1.7) % (Math.PI * 2),
      // a gentle bell so the middle of the spectrum is taller than the edges
      weight: 0.35 + 0.65 * Math.sin((i / (bars - 1)) * Math.PI),
    }));
    const level = new Float32Array(bars); // smoothed current height 0..1

    let raf = 0;
    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#ed2236";

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (ms: number) => {
      const t = ms / 1000;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const gap = 2;
      const bw = (w - gap * (bars - 1)) / bars;
      const on = playingRef.current;

      for (let i = 0; i < bars; i++) {
        const s = seed[i];
        // target amplitude: two sines beating against each other
        const osc = (Math.sin(t * s.f1 * 3 + s.phase) + Math.sin(t * s.f2 * 3.7 + s.phase)) / 2;
        const target = on ? Math.max(0.06, (0.5 + 0.5 * osc) * s.weight) : 0.05;
        // asymmetric smoothing: snappy rise, softer fall (like a real meter)
        const k = target > level[i] ? 0.35 : 0.12;
        level[i] += (target - level[i]) * k;

        const bh = Math.max(2, level[i] * h);
        const x = i * (bw + gap);
        const y = h - bh;
        const g = ctx.createLinearGradient(0, y, 0, h);
        g.addColorStop(0, accent);
        g.addColorStop(1, accent + "55");
        ctx.fillStyle = g;
        const r = Math.min(bw / 2, 2);
        ctx.beginPath();
        ctx.roundRect(x, y, bw, bh, [r, r, 0, 0]);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [bars]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`h-full w-full ${className}`}
    />
  );
}
