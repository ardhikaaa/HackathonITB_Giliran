import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  ok: { box: "bg-ok-bg text-ok border-ok/30", Icon: CheckCircle2 },
  warn: { box: "bg-warn-bg text-warn border-warn/40", Icon: AlertTriangle },
  bad: { box: "bg-bad-bg text-bad border-bad/30", Icon: XCircle },
  info: { box: "bg-secondary text-secondary-foreground border-border", Icon: Info },
};

export function StatusPill({ variant = "info", children, className }) {
  const { box, Icon } = VARIANTS[variant] ?? VARIANTS.info;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        box,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}

export const EVENT_STATUS_VARIANT = { draf: "info", siap: "warn", berjalan: "ok", ditutup: "info" };