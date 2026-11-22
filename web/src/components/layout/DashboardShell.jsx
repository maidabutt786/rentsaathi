import { NavLink, useLocation } from "react-router-dom";

import Logo from "../ui/Logo.jsx";

export default function DashboardShell({ title, subtitle, nav = [], badge, children }) {
  const { pathname } = useLocation();
  return (
    <div className="container-page py-8 lg:py-10">
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside>
          <div className="mb-5 hidden lg:block">
            <Logo height={40} />
          </div>
          <div className="card p-3">
            <div className="mb-2 px-2 py-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{badge || "Dashboard"}</p>
              <p className="mt-1 font-heading text-lg font-semibold">{title}</p>
              {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
            </div>
            <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label={`${title} navigation`}>
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => {
                      const active = item.match ? item.match(pathname) : isActive;
                      return `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        active ? "bg-primary-soft text-primary" : "text-muted hover:bg-subtle hover:text-ink"
                      }`;
                    }}
                  >
                    {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
                    <span className="whitespace-nowrap">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
