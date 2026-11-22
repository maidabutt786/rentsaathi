import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, Menu, UserRound, X } from "lucide-react";

import Logo from "../ui/Logo.jsx";
import Avatar from "../ui/Avatar.jsx";
import Button from "../ui/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useI18n } from "../../i18n/index.jsx";
import { ROLE_HOME } from "../../lib/constants.js";

const PUBLIC_LINKS = [
  { to: "/", key: "nav.home", end: true },
  { to: "/listings", key: "nav.listings" },
  { to: "/safety", key: "nav.safety" },
  { to: "/faq", key: "nav.faq" },
  { to: "/about", key: "nav.about" },
  { to: "/contact", key: "nav.contact" },
];

function navClass({ isActive }) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-primary-soft text-primary" : "text-ink/80 hover:bg-subtle hover:text-ink"
  }`;
}

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const dashboardPath = profile?.role ? ROLE_HOME[profile.role] : null;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-background/90 backdrop-blur">
      <div className="container-page flex h-[68px] items-center justify-between gap-4">
        <Logo height={42} />

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main navigation">
          {PUBLIC_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
              {t(link.key)}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <label className="sr-only" htmlFor="locale-select">
            {t("nav.language")}
          </label>
          <select
            id="locale-select"
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-medium text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="en">EN</option>
            <option value="ur">اردو</option>
          </select>

          {user ? (
            <>
              {dashboardPath ? (
                <Button to={dashboardPath} variant="ghost" size="sm">
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  {t("nav.dashboard")}
                </Button>
              ) : null}
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition hover:bg-subtle"
                aria-label="Open your profile"
              >
                <Avatar name={profile?.name || user.displayName || user.email} size={34} />
                <span className="max-w-[120px] truncate text-sm font-medium">{profile?.name || "Profile"}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg p-2 text-muted transition hover:bg-subtle hover:text-primary"
                aria-label={t("nav.logout")}
                title={t("nav.logout")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Button to="/login" variant="ghost" size="sm">
                {t("nav.login")}
              </Button>
              <Button to="/signup" size="sm">
                {t("nav.signup")}
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-xl border border-line bg-surface p-2 text-ink lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? t("nav.closeMenu") : t("nav.menu")}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div id="mobile-menu" className="border-t border-line bg-surface px-4 pb-5 pt-3 lg:hidden">
          <nav className="grid gap-1" aria-label="Mobile navigation">
            {PUBLIC_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
                {t(link.key)}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            {user ? (
              <>
                {dashboardPath ? (
                  <Button to={dashboardPath} variant="soft" size="sm">
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    {t("nav.dashboard")}
                  </Button>
                ) : null}
                <Button to="/profile" variant="outline" size="sm">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  Profile
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  {t("nav.logout")}
                </Button>
              </>
            ) : (
              <>
                <Button to="/login" variant="outline" size="sm">
                  {t("nav.login")}
                </Button>
                <Button to="/signup" size="sm">
                  {t("nav.signup")}
                </Button>
              </>
            )}
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value)}
              aria-label={t("nav.language")}
              className="ml-auto rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-medium text-muted"
            >
              <option value="en">English</option>
              <option value="ur">اردو</option>
            </select>
          </div>
        </div>
      ) : null}
    </header>
  );
}
