import { Trophy } from "lucide-react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Menu,
  X,
  ArrowRight,
  Calendar,
  MapPin,
  Users,
  QrCode,
  Award,
  Layers,
  Sparkles,
  ShieldCheck,
  ClipboardCheck,
  Compass,
  Link2,
  BarChart3,
  MessageSquare,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  Plus,
  Minus,
  HelpCircle,
} from "lucide-react";
import { CustomCursor } from "../components/CustomCursor";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EVENTRIX — Great Events. Seamlessly Managed." },
      {
        name: "description",
        content:
          "EVENTRIX connects administrators, organizing teams, and student participants in one intelligent institutional event management platform.",
      },
      { property: "og:title", content: "EVENTRIX — Great Events. Seamlessly Managed." },
      {
        property: "og:description",
        content:
          "Manage college events from registration to recognition: team signups, QR attendance, competition rounds, scoring, and digital certificates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

interface PublishedEvent {
  id: string;
  title: string;
  category: string;
  venue: string;
  cover_image: string | null;
  start_date: string;
  registration_type: string;
  status: string;
}

const navLinks = [
  { href: "#home", label: "Home" },
  { href: "#events", label: "Explore Events" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
  { href: "#about", label: "About" },
];

const capabilities = [
  { icon: ClipboardCheck, label: "Smart Registration" },
  { icon: Users, label: "Team Management" },
  { icon: QrCode, label: "QR Attendance" },
  { icon: Sparkles, label: "Event Automation" },
  { icon: Award, label: "Digital Certificates" },
  { icon: Trophy, label: "Live Leaderboards" },
  { icon: BarChart3, label: "Event Analytics" },
];

const problemsSolved = [
  {
    title: "Scattered registration forms",
    description:
      "Replace disconnected spreadsheets and ad-hoc forms with one structured, shareable registration flow.",
    image:
      "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcQAsJZ9dzHVjSQ0W3oEBvaaqTJ9nBjjaYaClRgHy2k9nWvt2CgXdG1mRohz4tm5aEU_aouRKq023c4HMOg",
    alt: "Students collaborating at a campus event registration desk",
    accent: "bg-[#7C3AED]",
  },
  {
    title: "Manual attendance & check-ins",
    description:
      "Eliminate paper sign-in sheets with instant QR-based verification at the venue entrance.",
    image:
      "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcTvRyaLKT3AYFR44qSx6zOD_WJx1ZCrOvA7OXf62CQeXzmXi3q-zdphhxmSqD3NZyalm2G1B3gsVgvkGqw",
    alt: "College auditorium filled with event attendees",
    accent: "bg-[#FACC15]",
  },
  {
    title: "Disconnected organizing teams",
    description:
      "Give admins and assigned organizers a shared command center for rounds, scoring, and certificates.",
    image:
      "https://encrypted-tbn1.gstatic.com/licensed-image?q=tbn:ANd9GcTmH6POV1bMKmftmRh5xrXUrDu1qbIwZ8o6UMUYpq4U-_e8ve1TWE8i3Yck93SY724fav6JWBTaDw_CucY",
    alt: "Organizing team discussing event logistics",
    accent: "bg-[#38BDF8]",
  },
];

const lifecycleSteps = [
  {
    step: "01",
    title: "Create and assign an event",
    detail:
      "Administrators set up the institutional event and assign authorized organizers or organizing teams.",
    accent: "bg-[#FEF3C7] border-[#F59E0B]/30",
  },
  {
    step: "02",
    title: "Publish and share the registration link",
    detail:
      "Organizers configure capacity, deadlines, and team rules, then share a unique link via WhatsApp, email, or student groups.",
    accent: "bg-[#EDE9FE] border-[#7C3AED]/30",
  },
  {
    step: "03",
    title: "Register participants and teams",
    detail:
      "Students discover the event and register individually or form teams with invite codes.",
    accent: "bg-[#E0F2FE] border-[#0284C7]/30",
  },
  {
    step: "04",
    title: "Manage attendance and competition rounds",
    detail:
      "Organizers scan QR codes at check-in, advance teams through rounds, and record judge scores and feedback.",
    accent: "bg-[#FCE7F3] border-[#DB2777]/30",
  },
  {
    step: "05",
    title: "Publish results and issue certificates",
    detail:
      "Results go live, eligible participants download verified digital certificates, and admins review analytics.",
    accent: "bg-[#ECFDF5] border-[#059669]/30",
  },
];

const roles = [
  {
    icon: ShieldCheck,
    role: "Admin",
    tagline: "Institutional Oversight",
    description:
      "Create institutional events, assign authorized organizers, and review campus-wide participation analytics.",
    bg: "bg-[#14141B] text-white border-white/10",
    badge: "bg-[#7C3AED] text-white",
  },
  {
    icon: Layers,
    role: "Organizer",
    tagline: "Event Execution",
    description:
      "Configure registration, share unique links, verify QR attendance, manage rounds, and publish results.",
    bg: "bg-[#FBF7EE] text-[#14141B] border-[#14141B]/10",
    badge: "bg-[#FACC15] text-[#14141B]",
  },
  {
    icon: Compass,
    role: "Participant",
    tagline: "Discover & Compete",
    description:
      "Explore published campus events, register solo or with a team, track rounds, and download certificates.",
    bg: "bg-[#14141B] text-white border-white/10",
    badge: "bg-[#38BDF8] text-[#14141B]",
  },
];

const featureGrid = [
  {
    icon: Calendar,
    title: "Event management",
    desc: "Structured lifecycle from draft and publication to completion.",
  },
  {
    icon: Link2,
    title: "Shareable registration links",
    desc: "Unique event URLs ready for WhatsApp, email, and campus groups.",
  },
  {
    icon: Users,
    title: "Individual & team registration",
    desc: "Flexible solo signups or multi-member team formation.",
  },
  {
    icon: QrCode,
    title: "QR attendance",
    desc: "Fast, reliable check-in verification at the venue.",
  },
  {
    icon: Layers,
    title: "Round management",
    desc: "Organize multi-stage hackathons, quizzes, and competitions.",
  },
  {
    icon: MessageSquare,
    title: "Scoring & feedback",
    desc: "Capture mentor and judge evaluations per round.",
  },
  {
    icon: Award,
    title: "Automated certificates",
    desc: "Generate downloadable certificates for eligible participants.",
  },
  {
    icon: BarChart3,
    title: "Event analytics",
    desc: "Track registrations, attendance rates, and completion metrics.",
  },
];

const faqItems = [
  {
    number: "01",
    question: "What is EVENTRIX?",
    answer:
      "EVENTRIX is an institutional college event management platform connecting administrators, organizing teams, and student participants in one unified system — covering event creation, organizer assignment, registration, digital passes, and workspace dashboards.",
  },
  {
    number: "02",
    question: "How can I register for an event?",
    answer:
      "Browse published events on the Explore Events page or open a shared event link, then click Register Now. After signing in as a participant, your registration is validated against capacity and deadlines and confirmed with a digital pass.",
  },
  {
    number: "03",
    question: "Can I participate as a team?",
    answer:
      "Yes. For team-based events, you can create a new team to generate a unique invite code or join an existing team using a teammate's code. Once the team meets the event's size requirements, the team leader can finalize registration.",
  },
  {
    number: "04",
    question: "How does QR attendance work?",
    answer:
      "Each confirmed registration generates a unique attendance token and QR pass in your Participant workspace. Database support for attendance check-in is in place, and live organizer QR scanning workflows are actively being rolled out.",
  },
  {
    number: "05",
    question: "How do I become an event organizer?",
    answer:
      "All public signups default to Participant accounts for security. An institutional Administrator can promote your participant account to Organizer from the Admin Control Center and assign you to specific events.",
  },
  {
    number: "06",
    question: "How can I download my certificate?",
    answer:
      "The database schema includes dedicated tables for rounds, results, and certificates. Certificate generation and participant download views will appear in your dashboard once an event's results and certificates module is enabled.",
  },
  {
    number: "07",
    question: "Can I sign in using Google?",
    answer:
      "Yes. Both the Login and Sign Up pages support Continue with Google via Supabase OAuth. New Google users automatically receive a Participant profile, while returning users keep their existing authorized role.",
  },
  {
    number: "08",
    question: "Do I need separate accounts for different roles?",
    answer:
      "No. You sign in with a single email or Google account, and EVENTRIX automatically detects your role from your database profile and routes you to the matching Admin, Organizer, or Participant workspace.",
  },
];

function Index() {
  const { user, profile, authStatus, signOut, getDashboardPath } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [publishedEvents, setPublishedEvents] = useState<PublishedEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const isAuthenticated = authStatus === "authenticated" && Boolean(user && profile);
  const isInitializing = authStatus === "initializing";
  const dashboardPath = profile ? getDashboardPath(profile.role) : "/dashboard";
  const displayName = profile?.full_name || user?.email || "User";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined);
  const roleLabel = profile
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : "Participant";

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    setMenuOpen(false);
    await signOut();
    void router.navigate({ to: "/" });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
          }
        });
      },
      { threshold: 0.12 },
    );

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    const loadEvents = async () => {
      if (!isSupabaseConfigured) {
        if (active) setEventsLoading(false);
        return;
      }
      try {
        const { data, error } = await getSupabaseClient()
          .from("events")
          .select("id, title, category, venue, cover_image, start_date, registration_type, status")
          .eq("status", "published")
          .order("start_date", { ascending: true })
          .limit(6);

        if (!error && data && active) {
          setPublishedEvents(data);
        }
      } catch {
        // Keep empty state gracefully if Supabase is unreachable
      } finally {
        if (active) setEventsLoading(false);
      }
    };

    loadEvents();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      id="home"
      className="min-h-screen bg-[#0D0D12] text-white selection:bg-[#7C3AED] selection:text-white"
    >
      <CustomCursor />

      {/* 1. NAVIGATION */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0D0D12]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="#home" className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C3AED] text-sm font-black text-white">
              E
            </span>
            <span>EVENTRIX</span>
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {isInitializing ? (
              <>
                <div className="h-9 w-20 animate-pulse rounded-full bg-white/10" />
                <div className="h-9 w-28 animate-pulse rounded-full bg-white/10" />
              </>
            ) : isAuthenticated && profile ? (
              <div className="relative flex items-center gap-3">
                <Link
                  to={dashboardPath}
                  data-cursor="magnetic"
                  className="inline-flex items-center gap-2 rounded-full bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03] hover:bg-[#6D28D9]"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  aria-label="Open profile menu"
                  aria-expanded={profileMenuOpen}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1 pr-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#7C3AED] text-xs font-bold text-white">
                      {initials}
                    </span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-white/10 bg-[#14141B] p-3 shadow-2xl">
                    <div className="border-b border-white/10 px-2 pb-3">
                      <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                      <p className="truncate text-xs text-zinc-400">{user?.email}</p>
                      <span className="mt-2 inline-block rounded-full bg-[#7C3AED]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#A78BFA]">
                        {roleLabel}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <Link
                        to={dashboardPath}
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <LayoutDashboard className="h-4 w-4 text-[#A78BFA]" />
                        Go to Dashboard
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleLogout()}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-full px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  data-cursor="magnetic"
                  className="rounded-full bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03] hover:bg-[#6D28D9]"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-300 hover:bg-white/10 md:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 bg-[#0D0D12] px-6 py-5 md:hidden">
            <div className="flex flex-col gap-4">
              {navLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-base font-medium text-zinc-200 hover:text-white"
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-3 border-t border-white/10 pt-4">
                {isInitializing ? (
                  <div className="h-10 w-full animate-pulse rounded-full bg-white/10" />
                ) : isAuthenticated && profile ? (
                  <>
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#7C3AED] text-xs font-bold text-white">
                          {initials}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                        <p className="truncate text-xs text-zinc-400">
                          {roleLabel} · {user?.email}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={dashboardPath}
                      onClick={() => setMenuOpen(false)}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#7C3AED] px-4 py-2.5 text-center text-sm font-semibold text-white"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Go to Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-red-500/30 px-4 py-2.5 text-center text-sm font-medium text-red-400"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-full border border-white/20 px-4 py-2.5 text-center text-sm font-medium text-white"
                    >
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-full bg-[#7C3AED] px-4 py-2.5 text-center text-sm font-semibold text-white"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden bg-[#0D0D12] px-6 pb-20 pt-14 md:pb-28 md:pt-20">
        {/* Hand-drawn decorative SVG accents */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-8 top-12 h-14 w-14 text-[#FACC15]/70"
          viewBox="0 0 64 64"
          fill="none"
        >
          <path
            d="M32 6L37 25L56 30L37 35L32 54L27 35L8 30L27 25L32 6Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute bottom-10 left-1/3 h-12 w-24 text-[#7C3AED]/70"
          viewBox="0 0 120 48"
          fill="none"
        >
          <path
            d="M4 36C24 12 42 12 58 28C74 44 92 20 114 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>

        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#FACC15]">
              <span>Institutional Event Platform</span>
            </div>
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Great Events. <span className="text-[#A78BFA]">Seamlessly</span> Managed.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-300">
              EVENTRIX connects administrators, organizing teams, and student participants in one
              intelligent platform — from shareable registration links and QR attendance to
              competition rounds and verified digital certificates.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                to="/events"
                data-cursor="magnetic"
                className="inline-flex items-center gap-2 rounded-full bg-[#7C3AED] px-7 py-3.5 text-base font-semibold text-white transition-transform hover:scale-[1.03] hover:bg-[#6D28D9]"
              >
                Explore Events
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={isAuthenticated ? dashboardPath : "/signup"}
                data-cursor="magnetic"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                {isAuthenticated ? "Go to Dashboard" : "Get Started"}
              </Link>
            </div>
          </div>

          {/* Asymmetric Collage with Arch-Shaped Containers */}
          <div className="relative lg:col-span-6">
            <div className="grid grid-cols-12 items-end gap-4">
              <div
                data-cursor-label="Explore"
                className="col-span-6 overflow-hidden rounded-t-full rounded-b-3xl border-4 border-[#FACC15] bg-zinc-900"
              >
                <img
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSvEB8FKSDvHzIDiukeJpc3jc_hVCJkHaDS6tWd76fAhg&s=10"
                  alt="Students participating in a campus tech event"
                  className="h-72 w-full object-cover transition-transform duration-500 hover:scale-105 sm:h-88"
                />
              </div>
              <div className="col-span-6 flex flex-col gap-4">
                <div
                  data-cursor-label="View"
                  className="overflow-hidden rounded-t-full rounded-b-3xl border-4 border-[#38BDF8] bg-zinc-900"
                >
                  <img
                    src="https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=700&q=80"
                    alt="Event organizers coordinating a workshop"
                    className="h-44 w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
                <div className="rounded-3xl bg-[#FBF7EE] p-5 text-[#14141B]">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#7C3AED]">
                    End-to-End Lifecycle
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-snug">
                    Registration, QR check-in, rounds, scoring &amp; certificates in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PLATFORM CAPABILITIES STRIP */}
      <section
        aria-label="Platform capabilities"
        className="eventrix-marquee relative overflow-hidden border-y border-[#14141B]/10 bg-[#FBF7EE] py-6 text-[#14141B]"
      >
        <div className="eventrix-marquee-track">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
              className="eventrix-marquee-group flex shrink-0 items-center"
            >
              {capabilities.map((cap) => {
                const Icon = cap.icon;

                return (
                  <div
                    key={cap.label}
                    className="eventrix-marquee-item flex shrink-0 items-center gap-2.5 whitespace-nowrap text-sm font-bold tracking-tight"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/10 text-[#7C3AED]">
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    </span>

                    <span>{cap.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="eventrix-marquee-fade pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#FBF7EE] to-transparent sm:w-12" />
        <div className="eventrix-marquee-fade pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[#FBF7EE] to-transparent sm:w-12" />
      </section>

      {/* 4. ABOUT EVENTRIX */}
      <section id="about" className="bg-[#FAF8F4] px-6 py-24 text-[#14141B]">
        <div className="mx-auto max-w-7xl">
          <div className="reveal grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="text-xs font-bold uppercase tracking-widest text-[#7C3AED]">
                Why EVENTRIX
              </p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                Built to replace campus event chaos with clarity.
              </h2>
            </div>
            <p className="text-base leading-relaxed text-zinc-600 lg:col-span-5">
              College events often suffer from scattered registration forms, manual attendance,
              disconnected organizing teams, difficult participant management, and delayed results
              and certificates. EVENTRIX unifies every stage.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {problemsSolved.map((item) => (
              <article
                key={item.title}
                data-cursor-label="View"
                className="reveal group overflow-hidden rounded-3xl border border-[#14141B]/10 bg-white transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="relative h-60 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.alt}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span
                    className={`absolute left-4 top-4 h-3 w-10 rounded-full ${item.accent}`}
                    aria-hidden="true"
                  />
                </div>
                <div className="p-7">
                  <h3 className="text-xl font-bold tracking-tight">{item.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-zinc-600">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 5. UPCOMING EVENTS */}
      <section id="events" className="bg-[#0D0D12] px-6 py-24 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="reveal flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#FACC15]">
                Event Discovery
              </p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                Upcoming Events
              </h2>
            </div>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Join as Participant
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {eventsLoading ? (
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-80 animate-pulse rounded-3xl border border-white/10 bg-white/5"
                />
              ))}
            </div>
          ) : publishedEvents.length > 0 ? (
            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {publishedEvents.map((ev) => (
                <article
                  key={ev.id}
                  data-cursor-label="View"
                  className="reveal group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#16161F]"
                >
                  <div className="relative h-52 overflow-hidden bg-zinc-900">
                    {ev.cover_image ? (
                      <img
                        src={ev.cover_image}
                        alt={ev.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#7C3AED]/20 text-sm font-semibold text-[#A78BFA]">
                        {ev.category}
                      </div>
                    )}
                    <span className="absolute left-4 top-4 rounded-full bg-[#0D0D12]/85 px-3 py-1 text-xs font-semibold text-[#FACC15]">
                      {ev.category}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#A78BFA]" />
                        {new Date(ev.start_date).toLocaleDateString()}
                      </span>
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-emerald-300">
                        Open ({ev.registration_type})
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-bold text-white">{ev.title}</h3>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-zinc-400">
                      <MapPin className="h-4 w-4 text-zinc-500" />
                      {ev.venue}
                    </p>
                    <div className="mt-6 pt-4 border-t border-white/10">
                      <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-[#A78BFA] hover:text-white"
                      >
                        View Event
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="reveal mt-12 rounded-3xl border border-dashed border-white/20 bg-[#14141C] p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7C3AED]/15 text-[#A78BFA]">
                <Clock className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-2xl font-bold text-white">No published events yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
                Published campus events will appear here automatically as soon as administrators and
                organizers make them live.
              </p>
              <div className="mt-6">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full bg-[#7C3AED] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#6D28D9]"
                >
                  Sign in to Workspace
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. HOW IT WORKS */}
      <section id="how-it-works" className="bg-[#FAF8F4] px-6 py-24 text-[#14141B]">
        <div className="mx-auto max-w-5xl">
          <div className="reveal text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#7C3AED]">
              Platform Workflow
            </p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              How EVENTRIX Works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-600">
              A structured five-stage lifecycle connecting institutional admins, organizing teams,
              and student participants.
            </p>
          </div>

          <div className="mt-14 space-y-5">
            {lifecycleSteps.map((item) => (
              <div
                key={item.step}
                className={`reveal flex flex-col gap-4 rounded-3xl border p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7 ${item.accent}`}
              >
                <div className="flex items-start gap-5">
                  <span className="text-2xl font-black tracking-tight text-[#14141B]/40 sm:text-3xl">
                    {item.step}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold tracking-tight sm:text-xl">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-700">{item.detail}</p>
                  </div>
                </div>
                <CheckCircle2 className="hidden h-6 w-6 shrink-0 text-[#14141B]/40 sm:block" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. ROLE-BASED EXPERIENCE */}
      <section className="bg-[#FBF7EE] px-6 py-24 text-[#14141B] border-t border-[#14141B]/10">
        <div className="mx-auto max-w-7xl">
          <div className="reveal max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-[#7C3AED]">
              Tailored Workspaces
            </p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              One platform, three dedicated experiences.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {roles.map((r) => {
              const Icon = r.icon;
              return (
                <div
                  key={r.role}
                  className={`reveal flex flex-col justify-between rounded-3xl border p-8 ${r.bg}`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`rounded-full px-3.5 py-1 text-xs font-bold ${r.badge}`}>
                        {r.tagline}
                      </span>
                      <Icon className="h-6 w-6 opacity-80" />
                    </div>
                    <h3 className="mt-6 text-3xl font-extrabold tracking-tight">{r.role}</h3>
                    <p className="mt-3 text-sm leading-relaxed opacity-80">{r.description}</p>
                  </div>
                  <div className="mt-8">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 text-sm font-bold underline-offset-4 hover:underline"
                    >
                      Access {r.role} Login
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. FEATURES SHOWCASE */}
      <section id="features" className="bg-[#0D0D12] px-6 py-24 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="reveal max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-[#38BDF8]">
              Capabilities
            </p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Everything required to run institutional events.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featureGrid.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="reveal rounded-3xl border border-white/10 bg-[#15151E] p-6 transition-colors hover:border-[#7C3AED]/60"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7C3AED]/15 text-[#A78BFA]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold">{feat.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. FAQ / QUICK ANSWERS */}
      <section id="faq" className="bg-[#FAF8F4] px-6 py-24 text-[#14141B]">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left Editorial Column */}
          <div className="reveal lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <p className="text-xs font-bold uppercase tracking-widest text-[#7C3AED]">
                QUICK ANSWERS
              </p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                Everything you need to know.
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-600">
                From your first registration to your final certificate — find answers to common
                questions about EVENTRIX.
              </p>

              {/* Minimal CSS & Lucide Help Illustration */}
              <div className="mt-10 rounded-3xl border border-[#14141B]/10 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7C3AED]/10 text-[#7C3AED]">
                      <HelpCircle className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#14141B]">Platform Guide</p>
                      <p className="text-xs text-zinc-500">01 — 08 Key Questions</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#FACC15]/30 px-3 py-1 text-xs font-bold text-[#14141B]">
                    FAQ
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="h-2 rounded-full bg-[#7C3AED]/80" />
                  <div className="h-2 rounded-full bg-[#7C3AED]/30" />
                  <div className="h-2 rounded-full bg-[#14141B]/10" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Interactive Accordion Column */}
          <div className="reveal space-y-3 lg:col-span-7">
            {faqItems.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              const panelId = `faq-panel-${item.number}`;
              const buttonId = `faq-button-${item.number}`;
              return (
                <div
                  key={item.number}
                  className={`rounded-2xl border bg-white transition-all duration-300 ${
                    isOpen
                      ? "border-[#7C3AED] shadow-md shadow-[#7C3AED]/10"
                      : "border-[#14141B]/10 hover:border-[#7C3AED]/40"
                  }`}
                >
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-xs font-extrabold tracking-widest transition-colors ${
                          isOpen ? "text-[#7C3AED]" : "text-zinc-400"
                        }`}
                      >
                        {item.number}
                      </span>
                      <span className="text-base font-bold text-[#14141B] sm:text-lg">
                        {item.question}
                      </span>
                    </div>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                        isOpen
                          ? "bg-[#7C3AED] text-white"
                          : "bg-[#14141B]/5 text-[#14141B] group-hover:bg-[#7C3AED]/10"
                      }`}
                    >
                      {isOpen ? (
                        <Minus className="h-4 w-4 transition-transform duration-300" />
                      ) : (
                        <Plus className="h-4 w-4 transition-transform duration-300" />
                      )}
                    </span>
                  </button>

                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={`grid transition-all duration-300 ease-in-out ${
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-6 pl-14 text-sm leading-relaxed text-zinc-600">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. FINAL CTA */}
      <section className="bg-[#0D0D12] px-6 py-20 text-white">
        <div className="reveal mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#181824] border border-white/10 p-10 sm:p-16">
          <div className="grid items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <p className="text-xs font-bold uppercase tracking-widest text-[#FACC15]">
                Ready to Begin
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
                Bring structure and speed to your next campus event.
              </h2>
              <p className="mt-4 max-w-xl text-base text-zinc-300">
                Explore live events or sign in to your Admin, Organizer, or Participant workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 lg:col-span-4 lg:justify-end">
              <a
                href="#events"
                data-cursor="magnetic"
                className="rounded-full bg-[#FACC15] px-6 py-3.5 text-sm font-bold text-[#14141B] transition-transform hover:scale-[1.03]"
              >
                Explore Events
              </a>
              <Link
                to={isAuthenticated ? dashboardPath : "/login"}
                data-cursor="magnetic"
                className="rounded-full bg-[#7C3AED] px-6 py-3.5 text-sm font-bold text-white transition-transform hover:scale-[1.03]"
              >
                {isAuthenticated ? "Go to Dashboard" : "Access Workspace"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="border-t border-white/10 bg-[#0A0A0E] px-6 py-12 text-zinc-400">
        <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold text-white">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#7C3AED] text-xs font-black text-white">
                E
              </span>
              EVENTRIX
            </div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-400">
              Institutional college event management and automation platform.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Platform</h4>
            <ul className="mt-3 space-y-2 text-sm">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Access</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/login" className="hover:text-white">
                  Admin &amp; Organizer Login
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-white">
                  Participant Sign Up
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col justify-between text-xs">
            <p>© {new Date().getFullYear()} EVENTRIX. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
