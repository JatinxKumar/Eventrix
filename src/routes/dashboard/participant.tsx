import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Compass, ClipboardCheck, Users, Award, User } from "lucide-react";
import { DashboardShell, type DashboardNavItem } from "../../components/DashboardShell";

export const Route = createFileRoute("/dashboard/participant")({
  component: ParticipantLayout,
});

function ParticipantLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const participantNav: DashboardNavItem[] = [
    {
      label: "Overview",
      icon: LayoutDashboard,
      to: "/dashboard/participant",
      active: pathname === "/dashboard/participant" || pathname === "/dashboard/participant/",
    },
    { label: "Explore Events", icon: Compass, to: "/dashboard/participant/events" },
    {
      label: "My Registrations",
      icon: ClipboardCheck,
      to: "/dashboard/participant/registrations",
      active: pathname.startsWith("/dashboard/participant/registrations"),
    },
    {
      label: "My Teams",
      icon: Users,
      to: "/dashboard/participant/teams",
      active: pathname.startsWith("/dashboard/participant/teams"),
    },
    { label: "My Certificates", icon: Award },
    {
      label: "Profile",
      icon: User,
      to: "/dashboard/participant/profile",
      active: pathname.startsWith("/dashboard/participant/profile"),
    },
  ];

  return (
    <DashboardShell
      requiredRole="participant"
      workspaceName="Participant Workspace"
      navItems={participantNav}
    >
      <Outlet />
    </DashboardShell>
  );
}
