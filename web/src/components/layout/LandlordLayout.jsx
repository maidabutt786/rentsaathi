import { Outlet } from "react-router-dom";
import { BadgeCheck, CalendarClock, LayoutDashboard, MessageSquare, PlusCircle, Building2 } from "lucide-react";

import DashboardShell from "./DashboardShell.jsx";

const NAV = [
  { to: "/landlord", label: "Overview", icon: LayoutDashboard, end: true },
  {
    to: "/landlord/listings",
    label: "My listings",
    icon: Building2,
    match: (path) => path === "/landlord/listings" || (path.startsWith("/landlord/listings/") && !path.endsWith("/new")),
  },
  { to: "/landlord/listings/new", label: "Add a listing", icon: PlusCircle, end: true },
  { to: "/landlord/visits", label: "Visit requests", icon: CalendarClock },
  { to: "/landlord/chats", label: "Messages", icon: MessageSquare },
  { to: "/landlord/verification", label: "Verification", icon: BadgeCheck },
];

export default function LandlordLayout() {
  return (
    <DashboardShell title="Landlord area" subtitle="Listings, documents and students" nav={NAV} badge="Landlord">
      <Outlet />
    </DashboardShell>
  );
}
