import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Penerima", segment: "penerima" },
  { label: "Gelombang", segment: "gelombang" },
  { label: "Kupon", segment: "kupon" },
  { label: "Stok", segment: "stok" },
  { label: "Laporan", segment: "laporan" },
];

const SECONDARY = [
  { label: "Insiden", segment: "insiden" },
  { label: "Log", segment: "log" },
];

export function EventTabs({ eventId }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const activeSegment = pathname.split("/").filter(Boolean).pop();

  return (
    <div className="no-print space-y-2">
      <nav aria-label="Tab acara" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1 rounded-full border border-border bg-card p-1">
          {TABS.map((tab) => {
            const active = activeSegment === tab.segment;
            return (
              <li key={tab.segment}>
                <Link
                  to={`/acara/$eventId/${tab.segment}`}
                  params={{ eventId }}
                  className={cn(
                    "block rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="flex items-center gap-4 px-1">
        {SECONDARY.map((item) => {
          const active = activeSegment === item.segment;
          return (
            <Link
              key={item.segment}
              to={`/acara/$eventId/${item.segment}`}
              params={{ eventId }}
              className={cn(
                "text-sm font-semibold transition-colors",
                active ? "text-primary underline underline-offset-4" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SectionCard({ title, description, children, className, action }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6", className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}