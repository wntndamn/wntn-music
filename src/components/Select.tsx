import { useEffect, useRef, useState } from "react";
import { IconChevronDown, IconCheck } from "@tabler/icons-react";

// Styled replacement for the native <select> — our borders, radius, hover.
export default function Select({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-card border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:bg-surface-hover"
      >
        <span className={current ? "" : "text-muted"}>{current?.label ?? placeholder ?? "—"}</span>
        <IconChevronDown
          size={14}
          className={"text-muted transition-transform " + (open ? "rotate-180" : "")}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-full overflow-hidden rounded-card border border-border bg-bg shadow-xl">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 whitespace-nowrap px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover"
            >
              {o.label}
              {o.value === value && <IconCheck size={14} className="text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
