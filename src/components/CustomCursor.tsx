import { useEffect, useRef } from "react";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isTouch =
      window.matchMedia("(pointer: coarse)").matches ||
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isTouch || prefersReducedMotion) {
      return;
    }

    const dot = dotRef.current;
    const ring = ringRef.current;
    const labelEl = labelRef.current;
    if (!dot || !ring || !labelEl) return;

    document.documentElement.classList.add("custom-cursor-active");

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let isVisible = false;
    let rafId = 0;

    const setHoverState = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        ring.dataset["state"] = "default";
        labelEl.textContent = "";
        return;
      }

      // Preserve native cursor on text inputs & editable areas
      if (target.closest("input, textarea, select, [contenteditable='true']")) {
        dot.style.opacity = "0";
        ring.style.opacity = "0";
        return;
      }

      if (isVisible) {
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }

      const labeledEl = target.closest<HTMLElement>("[data-cursor-label]");
      if (labeledEl) {
        ring.dataset["state"] = "label";
        labelEl.textContent = labeledEl.dataset["cursorLabel"] ?? "";
        return;
      }

      const clickable = target.closest("a, button, [role='button'], [data-cursor='magnetic']");
      if (clickable) {
        ring.dataset["state"] = "pointer";
        labelEl.textContent = "";
        return;
      }

      ring.dataset["state"] = "default";
      labelEl.textContent = "";
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isVisible) {
        isVisible = true;
        ringX = mouseX;
        ringY = mouseY;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      setHoverState(e.target);
    };

    const onMouseLeave = () => {
      isVisible = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    const animate = () => {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);
    rafId = requestAnimationFrame(animate);

    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9999] hidden md:block">
      <div
        ref={dotRef}
        className="fixed left-0 top-0 h-2.5 w-2.5 rounded-full bg-[#7C3AED] opacity-0 transition-opacity duration-200"
      />
      <div
        ref={ringRef}
        data-state="default"
        className="fixed left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border border-[#7C3AED]/70 bg-[#7C3AED]/5 opacity-0 transition-[width,height,background-color,border-color,opacity] duration-200 ease-out data-[state=label]:h-16 data-[state=label]:w-16 data-[state=label]:border-[#7C3AED] data-[state=label]:bg-[#7C3AED] data-[state=pointer]:h-12 data-[state=pointer]:w-12 data-[state=pointer]:border-[#7C3AED] data-[state=pointer]:bg-[#7C3AED]/15"
      >
        <span
          ref={labelRef}
          className="text-[10px] font-semibold uppercase tracking-wider text-white"
        />
      </div>
    </div>
  );
}
