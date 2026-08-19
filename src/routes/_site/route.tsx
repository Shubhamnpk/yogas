import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/_site")({
  component: SiteLayout,
  ssr: true,
});

function SiteLayout() {
  return (
    <>
      <SiteHeader />
      <main className="w-full">
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}
