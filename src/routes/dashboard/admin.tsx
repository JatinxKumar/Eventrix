import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Calendar, Users, UserCheck, BarChart3, Settings } from "lucide-react";
import { DashboardShell, type DashboardNavItem } from "../../components/DashboardShell";

export const Route = createFileRoute("/dashboard/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const adminNav: DashboardNavItem[] = [
    {
      label: "Overview",
      icon: LayoutDashboard,
      to: "/dashboard/admin",
      active: pathname === "/dashboard/admin" || pathname === "/dashboard/admin/",
    },
    {
      label: "Events",
      icon: Calendar,
      to: "/dashboard/admin/events",
      active: pathname.startsWith("/dashboard/admin/events"),
    },
    {
      label: "Organizing Teams",
      icon: Users,
      to: "/dashboard/admin/organizers",
      active: pathname.startsWith("/dashboard/admin/organizers"),
    },
    { label: "Participants", icon: UserCheck },
    { label: "Analytics", icon: BarChart3 },
    { label: "Settings", icon: Settings },
  ];

  return (
    <DashboardShell requiredRole="admin" workspaceName="Admin Workspace" navItems={adminNav}>
      <Outlet />
    </DashboardShell>
  );
}
