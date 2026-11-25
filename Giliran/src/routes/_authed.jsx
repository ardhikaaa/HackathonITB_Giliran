import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { AuthGateError, requireSignedIn } from "@/components/auth/AuthGate";

export const Route = createFileRoute("/_authed")({
  ssr: false,
  beforeLoad: requireSignedIn,
  errorComponent: AuthGateError,
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="no-print sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Link to="/acara" className="flex items-baseline gap-2.5">
            <span className="wordmark text-lg font-semibold uppercase text-foreground sm:text-xl">Giliran</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">panitia</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[12rem] truncate text-sm text-muted-foreground sm:block">{user?.email}</span>
            <Button variant="outline" size="sm" className="h-10 rounded-full px-4 text-sm font-semibold" onClick={logout}>
              Keluar
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}