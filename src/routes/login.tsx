import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Eye, EyeOff, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "../lib/AuthProvider";
import { AnimatedAuthLayout } from "../components/AnimatedAuthLayout";

const schema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type FormData = z.infer<typeof schema>;

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
    message: typeof search["message"] === "string" ? search["message"] : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signInWithGoogle, getDashboardPath, authStatus, profile } = useAuth();
  const router = useRouter();
  const { redirect, message } = Route.useSearch();
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // Redirect already-authenticated users to their dashboard
  useEffect(() => {
    if (authStatus === "authenticated" && profile) {
      const safeRedirect =
        redirect && redirect.startsWith("/") && !redirect.startsWith("//")
          ? redirect
          : getDashboardPath(profile.role);
      void router.navigate({ to: safeRedirect, replace: true });
    }
  }, [authStatus, profile, redirect, router, getDashboardPath]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (loading || googleLoading) return;
    setErrorMsg("");
    setLoading(true);
    try {
      const profile = await signIn(data.email, data.password);
      const safeRedirect =
        redirect && redirect.startsWith("/") && !redirect.startsWith("//")
          ? redirect
          : getDashboardPath(profile.role);
      router.navigate({ to: safeRedirect });
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : "Login failed";
      setErrorMsg(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading || googleLoading) return;
    setErrorMsg("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle(redirect);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : "Google sign-in failed";
      setErrorMsg(err);
      setGoogleLoading(false);
    }
  };

  return (
    <AnimatedAuthLayout mode="login">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-[#14141B] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <span className="text-xs font-bold uppercase tracking-widest text-[#7C3AED] lg:hidden">
          EVENTRIX
        </span>
      </div>

      <h2 className="text-3xl font-extrabold tracking-tight text-[#14141B] sm:text-4xl">
        Welcome back
      </h2>
      <p className="mt-2 text-sm text-zinc-500">Sign in to continue to your dashboard.</p>

      {message && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {message}
        </div>
      )}

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || loading}
        data-cursor="magnetic"
        className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-xl border border-[#14141B]/12 bg-white px-4 py-3.5 text-sm font-semibold text-[#14141B] transition-all hover:border-[#14141B]/25 hover:shadow-md disabled:opacity-50"
      >
        {googleLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        {googleLoading ? "Connecting..." : "Continue with Google"}
      </button>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#14141B]/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#FAF8F4] px-3 font-semibold tracking-wider text-zinc-400">
            or use email
          </span>
        </div>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-[#14141B]" htmlFor="login-email">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@college.edu"
            className="mt-1.5 block w-full rounded-xl border border-[#14141B]/12 bg-white px-4 py-3 text-sm text-[#14141B] outline-none transition-colors focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs font-medium text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#14141B]" htmlFor="login-password">
            Password
          </label>
          <div className="relative mt-1.5">
            <input
              id="login-password"
              type={showPwd ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="block w-full rounded-xl border border-[#14141B]/12 bg-white px-4 py-3 pr-11 text-sm text-[#14141B] outline-none transition-colors focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-3 flex items-center text-zinc-400 hover:text-[#14141B] transition-colors"
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs font-medium text-red-600">{errors.password.message}</p>
          )}
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || googleLoading}
          data-cursor="magnetic"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#7C3AED] px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#6D28D9] hover:shadow-lg hover:shadow-[#7C3AED]/25 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-center gap-1 text-sm text-zinc-500">
        <span>Don&apos;t have an account?</span>
        <Link
          to="/signup"
          search={{ redirect }}
          className="font-bold text-[#7C3AED] hover:underline"
        >
          Create account
        </Link>
      </div>
    </AnimatedAuthLayout>
  );
}
