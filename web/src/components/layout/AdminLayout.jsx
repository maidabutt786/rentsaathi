import { NavLink, Outlet } from "react-router-dom";
import { BarChart3, Building2, Flag, LayoutDashboard, ShieldCheck, Users } from "lucide-react";

import Logo from "../ui/Logo.jsx";
import Avatar from "../ui/Avatar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/verification", label: "Verification queue", icon: ShieldCheck },
  { to: "/admin/flagged", label: "Flagged listings", icon: Flag },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/listings", label: "All listings", icon: Building2 },
  { to: "/admin/analytics", label: "Reports & analytics", icon: BarChart3 },
];

export default function AdminLayout() {
  const { profile } = useAuth();
  return (
    <div className="bg-subtle/50">
      <div className="container-page grid gap-6 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="card p-4">
            <Logo height={38} />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-primary">Admin console</p>
            <nav className="mt-2 flex gap-1 overflow-x-auto lg:flex-col" aria-label="Admin navigation">
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive ? "bg-primary-soft text-primary" : "text-muted hover:bg-subtle hover:text-ink"
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
              <Avatar name={profile?.name} size={32} />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{profile?.name}</p>
                <p className="text-[11px] text-muted">Administrator</p>
              </div>
            </div>
          </div>
        </aside>
        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
