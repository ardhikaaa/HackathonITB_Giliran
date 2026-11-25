import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

export function SiteHeader({ compact = false }) {
  const { isAuthenticated } = useAuth();
  return (
    <header className="no-print sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <Link to="/" className="flex items-baseline gap-2.5">
          <span className="wordmark text-lg font-semibold uppercase text-foreground sm:text-xl">Giliran</span>
          {!compact && (
            <span className="hidden text-xs text-muted-foreground sm:inline">buku besar penyerahan bantuan</span>
          )}
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/tiket"
            search={{ t: undefined }}
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Lihat tiket
          </Link>
          <Button asChild size="sm" className="h-10 rounded-full px-4 text-sm font-semibold">
            <Link to="/acara">{isAuthenticated ? "Acara saya" : "Masuk sebagai Admin"}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}