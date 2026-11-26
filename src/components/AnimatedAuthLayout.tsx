// src/components/AnimatedAuthLayout.tsx
import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { CustomCursor } from "./CustomCursor";

interface AnimatedAuthLayoutProps {
  mode: "login" | "signup";
  children: ReactNode;
}

const AUTH_IMAGES = [
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
];

function useReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return prefersReduced;
}

export function AnimatedAuthLayout({ mode, children }: AnimatedAuthLayoutProps) {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [currentImage] = useState(
    () => AUTH_IMAGES[Math.floor(Math.random() * AUTH_IMAGES.length)],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLogin = mode === "login";
  const duration = reducedMotion ? "duration-0" : "duration-700";
  const easing = "ease-[cubic-bezier(0.4,0,0.2,1)]";

  return (
    <div className="min-h-screen bg-[#0D0D12] text-white overflow-hidden">
      <CustomCursor />

      {/* Mobile layout */}
      <div className="lg:hidden flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#14141C]">
          <Link to="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#7C3AED] text-xs font-black text-white">
              E
            </span>
            <span>EVENTRIX</span>
          </Link>
        </div>
        {/* Mobile form */}
        <div className="flex-1 flex flex-col justify-center bg-[#FAF8F4] px-6 py-10 text-[#14141B]">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </div>
      </div>

      {/* Desktop layout with animation */}
      <div className="hidden lg:grid lg:grid-cols-2 min-h-screen relative">
        {/* Image panel — slides between left and right */}
        <div
          className={`absolute inset-y-0 w-1/2 z-20 transition-transform ${duration} ${easing} ${
            mounted ? "" : ""
          }`}
          style={{
            transform: isLogin ? "translateX(0%)" : "translateX(100%)",
            transition: mounted ? undefined : "none",
          }}
        >
          <div className="relative h-full w-full overflow-hidden bg-[#14141C]">
            <img
              src={currentImage}
              alt="College event atmosphere"
              className="absolute inset-0 h-full w-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D12] via-[#0D0D12]/60 to-transparent" />

            {/* Branding overlay */}
            <div className="relative z-10 flex h-full flex-col justify-between p-12">
              <Link to="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C3AED] text-sm font-black text-white">
                  E
                </span>
                <span>EVENTRIX</span>
              </Link>

              <div className="space-y-5">
                <span className="inline-block rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-[#FACC15]">
                  Campus Event Platform
                </span>
                <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
                  One platform. Every campus event, seamlessly managed.
                </h1>
                <p className="max-w-sm text-sm leading-relaxed text-zinc-300">
                  Create, organize, participate, and earn certificates — all from a single
                  dashboard.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-7 w-7 rounded-full border-2 border-[#0D0D12] bg-gradient-to-br from-[#7C3AED] to-[#FACC15]"
                    />
                  ))}
                </div>
                <span>Trusted by institutions nationwide</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form column — Login (left side, visible when mode=signup i.e. image slides right) */}
        {/* Form column — Signup (right side, visible when mode=login i.e. image slides left) */}

        {/* Left column: Login form (revealed when image moves to right = signup mode) */}
        <div
          className={`flex flex-col justify-center bg-[#FAF8F4] px-12 xl:px-20 text-[#14141B] transition-opacity ${duration} ${easing}`}
          style={{ opacity: isLogin ? 0 : 1, pointerEvents: isLogin ? "none" : "auto" }}
        >
          {/* This side shows signup content when active, but we render forms by mode */}
        </div>

        {/* Right column: Signup form (revealed when image moves to left = login mode) */}
        <div
          className={`flex flex-col justify-center bg-[#FAF8F4] px-12 xl:px-20 text-[#14141B] transition-opacity ${duration} ${easing}`}
          style={{ opacity: isLogin ? 1 : 0, pointerEvents: isLogin ? "auto" : "none" }}
        >
          {/* This side shows login content when active */}
        </div>

        {/* Actual form content — positioned absolutely over the correct column */}
        <div
          className={`absolute inset-y-0 w-1/2 z-10 flex flex-col justify-center px-12 xl:px-20 text-[#14141B] transition-all ${duration} ${easing}`}
          style={{
            left: isLogin ? "50%" : "0%",
            transition: mounted ? undefined : "none",
          }}
        >
          <div className="mx-auto w-full max-w-xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
