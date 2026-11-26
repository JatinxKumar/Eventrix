import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useAuth } from "../../lib/AuthProvider";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndexRedirect,
});

function DashboardIndexRedirect() {
  const { authStatus, profile, getDashboardPath } = useAuth();
  const router = useRouter();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (authStatus === "authenticated" && profile && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      void router.navigate({ to: getDashboardPath(profile.role), replace: true });
    }
  }, [authStatus, profile, router, getDashboardPath]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D0D12] text-sm font-medium text-zinc-400">
      Redirecting to your workspace...
    </div>
  );
}
