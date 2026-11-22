import { Outlet } from "react-router-dom";
import { Bookmark, CalendarClock, Heart, LayoutDashboard, MessageSquare } from "lucide-react";

import DashboardShell from "./DashboardShell.jsx";

const NAV = [
  { to: "/student", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/student/favorites", label: "Favourites", icon: Heart },
  { to: "/student/saved-searches", label: "Saved searches", icon: Bookmark },
  { to: "/student/visits", label: "Visit requests", icon: CalendarClock },
  { to: "/student/chats", label: "Messages", icon: MessageSquare },
];

export default function StudentLayout() {
  return (
    <DashboardShell title="Student area" subtitle="Rooms, visits and chats" nav={NAV} badge="Student">
      <Outlet />
    </DashboardShell>
  );
}
