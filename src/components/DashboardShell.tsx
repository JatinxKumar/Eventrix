import { Link, useRouter } from "@tanstack/react-router";
import { ReactNode, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  type LucideIcon,
} from "lucide-react";
import { useAuth, type UserRole } from "../lib/AuthProvider";

export interface DashboardNavItem {
  label: string;
  icon: LucideIcon;
  to?: string;
  active?: boolean;
}

interface DashboardShellProps {
  requiredRole: UserRole;
  workspaceName: string;
  navItems: DashboardNavItem[];
  children: ReactNode;
}

export function DashboardShell({
  requiredRole,
  workspaceName,
  navItems,
  children,
}: DashboardShellProps) {
  const { user, profile, authStatus, authError, retryAuth, signOut } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    if (authStatus === "initializing" || authStatus === "error") return;
    if (authStatus === "unauthenticated" || !user || !profile) {
      router.navigate({ to: "/login", replace: true });
      return;
    }
    if (profile.role !== requiredRole) {
      router.navigate({ to: `/dashboard/${profile.role}`, replace: true });
    }
  }, [authStatus, user, profile, requiredRole, router]);

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
          <h1 className="text-lg font-semibold text-red-400">Session Verification Failed</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {authError || "Could not verify your workspace permissions."}
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

  if (!user || !profile || profile.role !== requiredRole) {
    return null;
  }

  const displayName = profile.full_name || user.email || "User";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await signOut();
    router.navigate({ to: "/login" });
  };

  const renderNav = (isMobile = false) => (
    <nav className="mt-6 flex-1 space-y-1.5 px-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isImplemented = Boolean(item.to);
        if (isImplemented && item.to) {
          return (
            <Link
              key={item.label}
              to={item.to}
              onClick={() => isMobile && setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                item.active
                  ? "bg-[#7C3AED] text-white"
                  : "text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {(!collapsed || isMobile) && <span>{item.label}</span>}
            </Link>
          );
        }

        return (
          <div
            key={item.label}
            aria-disabled="true"
            className="flex cursor-not-allowed items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-500"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4 shrink-0" />
              {(!collapsed || isMobile) && <span>{item.label}</span>}
            </div>
            {(!collapsed || isMobile) && (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Soon
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#FAF8F4] text-[#14141B]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden flex-col border-r border-white/10 bg-[#0D0D12] text-white transition-all duration-200 md:flex ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <Link to="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED] text-sm font-black text-white">
              E
            </span>
            {!collapsed && <span>EVENTRIX</span>}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {!collapsed && (
          <div className="px-4 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#FACC15]">
              {workspaceName}
            </p>
          </div>
        )}

        {renderNav(false)}

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-red-500/15 hover:text-red-300"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex w-64 flex-col bg-[#0D0D12] text-white">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <span className="text-lg font-bold">EVENTRIX</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close sidebar"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 pt-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#FACC15]">
                {workspaceName}
              </p>
            </div>
            {renderNav(true)}
            <div className="border-t border-white/10 p-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-red-500/15 hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Topbar */}
        <header className="flex items-center justify-between border-b border-[#14141B]/10 bg-white px-6 py-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open sidebar"
              className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
              <span className="text-zinc-400">Dashboard</span>
              <span className="text-zinc-300">/</span>
              <span className="font-semibold text-[#14141B]">{workspaceName}</span>
            </nav>
          </div>

          {/* Profile Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((o) => !o)}
              className="flex items-center gap-3 rounded-full border border-[#14141B]/10 bg-[#FAF8F4] py-1.5 pl-1.5 pr-3.5 text-left transition-colors hover:border-[#7C3AED]/40"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7C3AED] text-xs font-bold text-white">
                {initials}
              </span>
              <div className="hidden sm:block">
                <p className="text-xs font-bold leading-none text-[#14141B]">{displayName}</p>
                <p className="mt-0.5 text-[11px] font-medium capitalize text-[#7C3AED]">
                  {profile.role}
                </p>
              </div>
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#14141B]/10 bg-white p-2 shadow-lg">
                <div className="border-b border-[#14141B]/10 px-3 py-2">
                  <p className="text-xs font-bold text-[#14141B]">{displayName}</p>
                  <p className="text-[11px] text-zinc-500">{user.email}</p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#7C3AED]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#7C3AED]">
                    <UserIcon className="h-3 w-3" />
                    {profile.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
