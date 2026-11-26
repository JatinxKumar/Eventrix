import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "../lib/AuthProvider";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { authStatus, authError, user, profile, retryAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authStatus === "initializing" || authStatus === "error") return;
    if (authStatus === "unauthenticated" || !user || !profile) {
      void router.navigate({ to: "/login", replace: true });
    }
  }, [authStatus, user, profile, router]);

  if (authStatus === "initializing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D0D12] text-sm font-medium text-zinc-400">
        Verifying workspace session...
      </div>
    );
  }

  if (authStatus === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D0D12] px-4">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-red-400">Workspace Error</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {authError || "Unable to verify your workspace."}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void retryAuth()}
              className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Retry
            </button>
            <a
              href="/login"
              className="rounded-full bg-[#7C3AED] px-6 py-2 text-sm font-bold text-white hover:bg-[#6D28D9]"
            >
              Back to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return <Outlet />;
}
