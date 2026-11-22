import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  CheckCircle2,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { useI18n } from "../../i18n/index.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { fetchFeaturedListings, fetchListings } from "../../lib/listingsApi.js";
import { ROOM_TYPES, UNIVERSITIES } from "../../lib/constants.js";
import ListingCard from "../../components/listings/ListingCard.jsx";
import { ListingGridSkeleton } from "../../components/ui/Skeletons.jsx";
import Button from "../../components/ui/Button.jsx";
import TrustBadge from "../../components/listings/TrustBadge.jsx";
import Logo from "../../components/ui/Logo.jsx";

const STEPS = [
  { icon: Search, key: "home.step1" },
  { icon: ShieldCheck, key: "home.step2" },
  { icon: BadgeCheck, key: "home.step3" },
];

const SAFETY_TIPS = ["home.safety1", "home.safety2", "home.safety3", "home.safety4"];

export default function HomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  useDocumentTitle(null);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ listings: 0, verified: 0 });
  const [search, setSearch] = useState({ keyword: "", universityId: "", roomType: "" });

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchFeaturedListings(6), fetchListings({ pageSize: 200 })])
      .then(([items, all]) => {
        if (cancelled) return;
        setFeatured(items);
        setStats({
          listings: all.total,
          verified: all.items.filter((listing) => listing.ai?.fraudLabel === "verified").length,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submitSearch = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.keyword) params.set("keyword", search.keyword);
    if (search.universityId) params.set("universityId", search.universityId);
    if (search.roomType) params.set("roomType", search.roomType);
    navigate(`/listings${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary-soft/70 blur-2xl" aria-hidden="true" />
        <div className="absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-secondary-soft/80 blur-2xl" aria-hidden="true" />
        <div className="container-page relative grid gap-12 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {t("hero.eyebrow")}
            </p>
            <h1 className="mt-5 max-w-2xl font-heading text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">{t("hero.subtitle")}</p>

            <form onSubmit={submitSearch} className="card mt-7 grid gap-3 p-4 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
              <label className="relative">
                <span className="sr-only">{t("hero.searchPlaceholder")}</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  value={search.keyword}
                  onChange={(event) => setSearch({ ...search, keyword: event.target.value })}
                  placeholder={t("hero.searchPlaceholder")}
                  className="input-base pl-9"
                />
              </label>
              <label>
                <span className="sr-only">{t("hero.anyUniversity")}</span>
                <select
                  value={search.universityId}
                  onChange={(event) => setSearch({ ...search, universityId: event.target.value })}
                  className="input-base"
                >
                  <option value="">{t("hero.anyUniversity")}</option>
                  {UNIVERSITIES.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">{t("hero.anyRoomType")}</span>
                <select
                  value={search.roomType}
                  onChange={(event) => setSearch({ ...search, roomType: event.target.value })}
                  className="input-base"
                >
                  <option value="">{t("hero.anyRoomType")}</option>
                  {ROOM_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" size="md" className="sm:px-6">
                {t("hero.search")}
              </Button>
            </form>

            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-muted">{t("hero.verifiedListings")}</dt>
                <dd className="font-heading text-xl font-semibold text-primary">{stats.verified}+</dd>
              </div>
              <div>
                <dt className="text-muted">rooms on the platform</dt>
                <dd className="font-heading text-xl font-semibold text-secondary">{stats.listings}+</dd>
              </div>
              <div>
                <dt className="text-muted">{t("hero.studentsHelped")}</dt>
                <dd className="font-heading text-xl font-semibold text-primary">500+</dd>
              </div>
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -left-4 top-8 h-24 w-24 rounded-2xl bg-secondary-soft" aria-hidden="true" />
            <div className="card relative p-5">
              <div className="flex items-center justify-between">
                <Logo height={40} />
                <span className="rounded-full bg-subtle px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Trust preview
                </span>
              </div>
              <div className="mt-5 overflow-hidden rounded-xl bg-secondary-soft">
                <img
                  src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80"
                  alt="Bright student room with a sofa and a large window"
                  className="h-44 w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-lg font-semibold text-primary">Rs 18,000<span className="text-xs font-normal text-muted">/month</span></p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                    <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Gujrat · 0.8 km to campus
                  </p>
                </div>
                <TrustBadge ai={{ fraudLabel: "verified", fraudScore: 12 }} size="sm" />
              </div>
              <div className="mt-4 space-y-2 rounded-xl bg-subtle p-3 text-xs text-muted">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-status-verified" aria-hidden="true" /> No reused photos found
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-status-verified" aria-hidden="true" /> Rent is typical for this area
                </p>
              </div>
            </div>
            <div className="absolute -bottom-5 -right-3 rounded-2xl border border-line bg-surface p-3 shadow-card">
              <p className="flex items-center gap-2 text-xs font-semibold">
                <Camera className="h-4 w-4 text-primary" aria-hidden="true" />
                Photo reuse check
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-semibold sm:text-3xl">{t("home.featured")}</h2>
            <p className="mt-2 text-sm text-muted">{t("home.featuredSubtitle")}</p>
          </div>
          <Button to="/listings" variant="outline" size="sm">
            {t("home.viewAll")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-7">
          {loading ? (
            <ListingGridSkeleton count={3} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-subtle py-14">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-2xl font-semibold sm:text-3xl">{t("home.howItWorks")}</h2>
            <p className="mt-2 text-sm text-muted">{t("home.howItWorksSubtitle")}</p>
          </div>
          <ol className="mt-9 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.key} className="card p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft">
                      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    </span>
                    <span className="font-heading text-3xl font-bold text-line">0{index + 1}</span>
                  </div>
                  <h3 className="mt-4 font-heading text-lg font-semibold">{t(`${step.key}.title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t(`${step.key}.body`)}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="container-page grid gap-8 py-14 lg:grid-cols-2 lg:items-center">
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary-hover p-8 text-white">
            <ShieldCheck className="h-10 w-10" aria-hidden="true" />
            <h2 className="mt-4 font-heading text-2xl font-semibold">Our own AI, not a black box</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              Every listing is checked by a model we host ourselves. It compares photos with our image index, looks for
              unusual prices and explains each result in plain English. No OpenAI, no Google Vision, no outside AI APIs.
            </p>
            <Link to="/about" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white underline">
              How the checks work <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid grid-cols-3 divide-x divide-line bg-surface text-center">
            <div className="p-4">
              <p className="font-heading text-xl font-semibold text-primary">3</p>
              <p className="text-xs text-muted">checks per listing</p>
            </div>
            <div className="p-4">
              <p className="font-heading text-xl font-semibold text-primary">0-100</p>
              <p className="text-xs text-muted">fraud score</p>
            </div>
            <div className="p-4">
              <p className="font-heading text-xl font-semibold text-primary">Always</p>
              <p className="text-xs text-muted">plain-English reasons</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-heading text-2xl font-semibold sm:text-3xl">{t("home.safety")}</h2>
          <p className="mt-2 text-sm text-muted">{t("home.safetySubtitle")}</p>
          <ul className="mt-5 space-y-3">
            {SAFETY_TIPS.map((key) => (
              <li key={key} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-status-verified" aria-hidden="true" />
                <span className="text-muted">{t(key)}</span>
              </li>
            ))}
          </ul>
          <Button to="/safety" variant="outline" size="sm" className="mt-5">
            {t("home.safetyLink")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </section>

      <section className="container-page pb-14">
        <div className="relative overflow-hidden rounded-2xl border border-secondary/15 bg-secondary-soft p-8 sm:p-10">
          <Users className="absolute -right-6 -top-6 h-32 w-32 text-secondary/10" aria-hidden="true" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="font-heading text-2xl font-semibold text-secondary">{t("home.landlordCta")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-secondary/80">{t("home.landlordBody")}</p>
            </div>
            <Button to="/signup?role=landlord" variant="secondary" size="lg">
              {t("home.landlordButton")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
