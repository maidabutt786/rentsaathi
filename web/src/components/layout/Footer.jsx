import { Link } from "react-router-dom";
import { Mail, MapPin, Phone } from "lucide-react";

import Logo from "../ui/Logo.jsx";
import { demoMode } from "../../lib/firebase.js";
import { useI18n } from "../../i18n/index.jsx";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { to: "/listings", label: "Find a room" },
      { to: "/safety", label: "Safety guidelines" },
      { to: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "For landlords",
    links: [
      { to: "/signup?role=landlord", label: "List your property" },
      { to: "/landlord/verification", label: "Get verified" },
      { to: "/about", label: "How it works" },
    ],
  },
  {
    title: "RentSaathi",
    links: [
      { to: "/about", label: "About us" },
      { to: "/contact", label: "Contact" },
      { to: "/about", label: "Trust & transparency" },
    ],
  },
];

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-20 border-t border-line bg-subtle">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_2fr]">
        <div>
          <Logo height={48} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{t("brand.tagline")}</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">{t("footer.built")}</p>
          <ul className="mt-5 space-y-2 text-sm text-muted">
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" /> Gujrat · Lahore · Islamabad
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
              <a className="hover:text-primary" href="mailto:hello@rentsaathi.pk">
                hello@rentsaathi.pk
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
              <a className="hover:text-primary" href="tel:+923001112233">
                +92 300 1112233
              </a>
            </li>
          </ul>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="text-sm font-semibold text-ink">{column.title}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.to}`}>
                    <Link to={link.to} className="text-muted transition hover:text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} RentSaathi. {t("footer.rights")}
          </p>
          <p>
            Built with our own self-hosted AI. No third-party AI APIs.
            {demoMode ? <span className="ml-2 rounded-full bg-secondary-soft px-2 py-0.5 text-secondary">Preview mode</span> : null}
          </p>
        </div>
      </div>
    </footer>
  );
}
