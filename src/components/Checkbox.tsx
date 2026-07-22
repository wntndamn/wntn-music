import { IconCheck } from "@tabler/icons-react";

// Native checkboxes ignore our tokens, so the real input stays visually hidden
// (still focusable and keyboard-operable) and a styled box renders next to it.
export default function Checkbox({
  checked,
  onChange,
  label,
  hint,
  className = "",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label
      className={`group flex cursor-pointer items-start gap-2.5 text-sm select-none ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        data-checked={checked}
        className="mt-[1px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[6px] border border-border bg-surface text-white transition-all group-hover:border-muted data-[checked=true]:border-accent data-[checked=true]:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40"
      >
        <IconCheck
          size={13}
          stroke={3}
          className={"transition-all " + (checked ? "scale-100 opacity-100" : "scale-50 opacity-0")}
        />
      </span>
      <span className="min-w-0">
        {label}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}
