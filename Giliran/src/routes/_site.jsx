import { Outlet, createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/_site")({
  component: SiteLayout,
});

function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}