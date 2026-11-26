// src/routes/auth/callback.tsx
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/AuthProvider";
import { isSupabaseConfigured } from "../../lib/supabaseClient";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
    error: typeof search["error"] === "string" ? search["error"] : undefined,
    error_description:
      typeof search["error_description"] === "string" ? search["error_description"] : undefined,
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const { authStatus, authError, profile, retryAuth, getDashboardPath } = useAuth();
  const router = useRouter();
  const { redirect, error: oauthError, error_description: oauthErrorDesc } = Route.useSearch();
  const [localError, setLocalError] = useState<string | null>(null);
  const hasNavigatedRef = useRef(false);

  // Bounded 10s timeout so callback never spins indefinitely
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasNavigatedRef.current && authStatus === "initializing") {
        setLocalError("Authentication timed out. Please try signing in again.");
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [authStatus]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLocalError("Supabase is not configured.");
      return;
    }

    if (oauthError || oauthErrorDesc) {
      setLocalError(oauthErrorDesc || oauthError || "Google authentication was cancelled.");
      return;
    }

    if (authStatus === "initializing") return;

    if (authStatus === "error") {
      setLocalError(authError || "Failed to load your account profile.");
      return;
    }

    if (authStatus === "authenticated" && profile && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      const safeRedirect =
        redirect && redirect.startsWith("/") && !redirect.startsWith("//")
          ? redirect
          : getDashboardPath(profile.role);

      if (import.meta.env.DEV) {
        console.debug("[EVENTRIX AuthCallback] Navigating to", {
          role: profile.role,
          target: safeRedirect,
        });
      }
      router.navigate({ to: safeRedirect, replace: true }).catch((err: unknown) => {
        hasNavigatedRef.current = false;
        setLocalError(err instanceof Error ? err.message : "Failed to navigate to dashboard.");
      });
      return;
    }

    if (authStatus === "unauthenticated" && !hasNavigatedRef.current) {
      setLocalError("No active session was found. Please sign in again.");
    }
  }, [
    authStatus,
    authError,
    profile,
    redirect,
    oauthError,
    oauthErrorDesc,
    router,
    getDashboardPath,
  ]);

  if (localError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D0D12] px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-red-400">Authentication Error</h1>
          <p className="mt-2 text-sm text-zinc-400">{localError}</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                hasNavigatedRef.current = false;
                setLocalError(null);
                void retryAuth();
              }}
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D0D12]">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#7C3AED] border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-zinc-400">Completing authentication...</p>
      </div>
    </div>
  );
}
