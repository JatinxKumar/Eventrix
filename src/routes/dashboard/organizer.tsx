import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, CalendarDays, ClipboardList, QrCode, Trophy, Award } from "lucide-react";
import { DashboardShell, type DashboardNavItem } from "../../components/DashboardShell";

export const Route = createFileRoute("/dashboard/organizer")({
  component: OrganizerLayout,
});

function OrganizerLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const organizerNav: DashboardNavItem[] = [
    {
      label: "Overview",
      icon: LayoutDashboard,
      to: "/dashboard/organizer",
      active: pathname === "/dashboard/organizer" || pathname === "/dashboard/organizer/",
    },
    {
      label: "Assigned Events",
      icon: CalendarDays,
      to: "/dashboard/organizer/events",
      active: pathname.startsWith("/dashboard/organizer/events"),
    },
    { label: "Registrations", icon: ClipboardList },
    { label: "Attendance", icon: QrCode },
    { label: "Rounds & Results", icon: Trophy },
    { label: "Certificates", icon: Award },
  ];

  return (
    <DashboardShell
      requiredRole="organizer"
      workspaceName="Organizer Workspace"
      navItems={organizerNav}
    >
      <Outlet />
    </DashboardShell>
  );
}
