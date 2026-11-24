import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Sparkles, Users, QrCode, Award, Mail, Trophy, Calendar, MapPin, ArrowRight, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EVENTRIX — Smart Campus Event Platform" },
      { name: "description", content: "Discover campus events, join hackathons, build teams and get digital certificates with EVENTRIX." },
      { property: "og:title", content: "EVENTRIX — Smart Campus Event Platform" },
      { property: "og:description", content: "Discover campus events, join hackathons, build teams and get digital certificates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const nav = [
  { href: "#events", label: "Explore Events" },
  { href: "#how", label: "How It Works" },
  { href: "#about", label: "About" },
];

const events = [
  { tag: "Hackathon", title: "BuildFest 2026", date: "Dec 12–14", place: "Innovation Lab", seats: "48 teams" },
  { tag: "Workshop", title: "Design Systems Deep Dive", date: "Dec 03", place: "Hall B", seats: "120 seats" },
  { tag: "Competition", title: "CodeSprint Finals", date: "Dec 20", place: "Main Auditorium", seats: "200 seats" },
];

const features = [
  { icon: Users, title: "Team registration", text: "Register solo or form teams with invite codes." },
  { icon: Trophy, title: "Hackathon tools", text: "Rounds, judging and leaderboards in one place." },
  { icon: QrCode, title: "QR attendance", text: "Check-in in seconds at the venue door." },
  { icon: MessageSquare, title: "Mentor feedback", text: "Submit work and get reviewed by mentors." },
  { icon: Mail, title: "Auto emails", text: "Reminders and updates sent automatically." },
  { icon: Award, title: "PDF certificates", text: "Digital certificates issued after every event." },
];

const steps = [
  { n: "01", t: "Discover", d: "Browse events by category, date and department." },
  { n: "02", t: "Register", d: "Join individually or with your team in one click." },
  { n: "03", t: "Attend", d: "Scan your QR pass and take part." },
  { n: "04", t: "Get certified", d: "Receive your certificate straight to your inbox." },
];

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
      { threshold: 0.15 },
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary shadow-elegant">
        <Sparkles className="h-4 w-4 text-primary-foreground" />
      </span>
      EVENTRIX
    </a>
  );
}

const btnPrimary = "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-elegant transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110";
const btnGhost = "inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent";

function Index() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useReveal();
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 10);
    f();
    window.addEventListener("scroll", f);
    return () => window.removeEventListener("scroll", f);
  }, []);

  return (
    <div id="top" className="min-h-screen overflow-x-hidden font-sans">
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled || open ? "glass" : ""}`}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            {nav.map((n) => <a key={n.href} href={n.href} className="transition-colors hover:text-foreground">{n.label}</a>)}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Login</a>
            <a href="#cta" className={btnPrimary + " px-5 py-2"}>Get Started</a>
          </div>
          <button aria-label="Toggle menu" className="md:hidden" onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
        <div className={`grid overflow-hidden transition-all duration-300 md:hidden ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className="min-h-0">
            <div className="flex flex-col gap-4 px-5 pb-6 pt-2">
              {nav.map((n) => <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="text-muted-foreground">{n.label}</a>)}
              <a href="#" className="text-muted-foreground">Login</a>
              <a href="#cta" onClick={() => setOpen(false)} className={btnPrimary}>Get Started</a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-36 pb-24">
        <div className="bg-grid absolute inset-0 -z-10" />
        <div className="absolute left-1/2 top-24 -z-10 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
        <div className="mx-auto max-w-6xl px-5 text-center">
          <span className="animate-rise glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-glow" /> Built for modern campuses
          </span>
          <h1 className="animate-rise mx-auto mt-6 max-w-4xl font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl" style={{ animationDelay: ".1s" }}>
            Your Campus. Your Events. <span className="text-gradient">Your Experience.</span>
          </h1>
          <p className="animate-rise mx-auto mt-6 max-w-xl text-lg text-muted-foreground" style={{ animationDelay: ".2s" }}>
            Discover campus events, join hackathons, build teams and turn every opportunity into an unforgettable experience.
          </p>
          <div className="animate-rise mt-10 flex flex-col justify-center gap-3 sm:flex-row" style={{ animationDelay: ".3s" }}>
            <a href="#events" className={btnPrimary}>Explore Events <ArrowRight className="h-4 w-4" /></a>
            <a href="#cta" className={btnGhost}>Host an Event</a>
          </div>

          <div className="relative mx-auto mt-20 hidden h-56 max-w-4xl md:block">
            <div className="animate-float glass absolute left-0 top-6 w-64 rounded-2xl p-4 text-left">
              <p className="text-xs text-primary-glow">Hackathon · Live</p>
              <p className="mt-1 font-display font-semibold">BuildFest 2026</p>
              <p className="mt-3 text-xs text-muted-foreground">36 teams registered</p>
            </div>
            <div className="animate-float glass absolute left-1/2 top-0 w-60 -translate-x-1/2 rounded-2xl p-4 text-left" style={{ animationDelay: "1.5s" }}>
              <div className="flex items-center gap-3"><QrCode className="h-8 w-8 text-primary" /><div><p className="font-display font-semibold">Checked in</p><p className="text-xs text-muted-foreground">Hall B · 10:02 AM</p></div></div>
            </div>
            <div className="animate-float glass absolute right-0 top-10 w-64 rounded-2xl p-4 text-left" style={{ animationDelay: "3s" }}>
              <div className="flex items-center gap-3"><Award className="h-8 w-8 text-primary-glow" /><div><p className="font-display font-semibold">Certificate ready</p><p className="text-xs text-muted-foreground">Sent to your inbox</p></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* Events */}
      <section id="events" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="reveal flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm text-primary-glow">Upcoming</p>
              <h2 className="mt-2 font-display text-4xl font-bold tracking-tight">Happening on campus</h2>
            </div>
            <a href="#" className="group inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">View all <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></a>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {events.map((e, i) => (
              <article key={e.title} className="reveal group glass relative overflow-hidden rounded-2xl p-6 transition-all duration-500 hover:-translate-y-2 hover:border-primary/50 hover:shadow-elegant" style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/20 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                <span className="rounded-full bg-accent px-3 py-1 text-xs">{e.tag}</span>
                <h3 className="mt-6 font-display text-xl font-semibold">{e.title}</h3>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2"><Calendar className="h-4 w-4" />{e.date}</p>
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{e.place}</p>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm">
                  <span className="text-muted-foreground">{e.seats}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-primary-glow">Register <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="about" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="reveal max-w-2xl">
            <p className="text-sm text-primary-glow">Everything in one place</p>
            <h2 className="mt-2 font-display text-4xl font-bold tracking-tight">From sign-up to certificate.</h2>
            <p className="mt-4 text-muted-foreground">One platform for admins, organizers, volunteers and participants.</p>
          </div>
          <div className="mt-12 grid overflow-hidden rounded-2xl border border-border sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="reveal group border-border p-7 transition-colors duration-300 hover:bg-accent/40 [&:not(:last-child)]:border-b lg:border-r">
                <f.icon className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                <h3 className="mt-5 font-display font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="reveal font-display text-4xl font-bold tracking-tight">How it works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.n} className="reveal" style={{ transitionDelay: `${i * 100}ms` }}>
                <span className="font-display text-4xl font-bold text-gradient">{s.n}</span>
                <h3 className="mt-3 font-display text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="scroll-mt-20 py-24">
        <div className="reveal glass relative mx-auto max-w-5xl overflow-hidden rounded-3xl px-6 py-16 text-center">
          <div className="absolute inset-x-0 -top-24 mx-auto h-48 w-96 rounded-full bg-primary/30 blur-3xl" />
          <h2 className="relative font-display text-4xl font-bold tracking-tight md:text-5xl">Ready to make campus <span className="text-gradient">unforgettable?</span></h2>
          <p className="relative mx-auto mt-4 max-w-md text-muted-foreground">Join EVENTRIX and run your next event in minutes.</p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#" className={btnPrimary}>Get Started <ArrowRight className="h-4 w-4" /></a>
            <a href="#" className={btnGhost}>Host an Event</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-sm text-muted-foreground md:flex-row">
          <Logo />
          <p>© 2026 EVENTRIX. Built for campuses.</p>
        </div>
      </footer>
    </div>
  );
}
