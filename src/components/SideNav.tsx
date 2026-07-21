import type { ReactNode } from "react";

// Sidebar navigation for edit surfaces (studio, admin, track panel).
// Vertical on desktop, horizontal scroll strip on mobile.
export default function SideNav<T extends string>({
  items,
  active,
  onChange,
}: {
  items: { key: T; label: string; icon?: ReactNode }[];
  active: T;
  onChange: (t: T) => void;
}) {
  return (
    <nav className="flex shrink-0 gap-1 overflow-x-auto md:w-44 md:flex-col md:overflow-visible">
      {items.map((i) => (
        <button
          key={i.key}
          onClick={() => onChange(i.key)}
          data-active={active === i.key}
          className="flex items-center gap-2 whitespace-nowrap rounded-card px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface-hover hover:text-text data-[active=true]:bg-surface data-[active=true]:font-medium data-[active=true]:text-text"
        >
          {i.icon}
          {i.label}
        </button>
      ))}
    </nav>
  );
}
