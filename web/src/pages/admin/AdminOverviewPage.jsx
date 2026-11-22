import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Building2, Flag, ShieldAlert, ShieldCheck, Users } from "lucide-react";

import { useDocumentTitle } from "../../hooks/useUi.js";
import { fetchAllListingsForAdmin, fetchAllUsers, fetchFlaggedQueue } from "../../lib/listingsApi.js";
import { fetchModelMetrics } from "../../lib/metrics.js";
import { formatDate } from "../../lib/format.js";
import PageHeader from "../../components/layout/PageHeader.jsx";
import StatCard from "../../components/ui/StatCard.jsx";
import TrustBadge from "../../components/listings/TrustBadge.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import { TableSkeleton } from "../../components/ui/Skeletons.jsx";

export default function AdminOverviewPage() {
  useDocumentTitle("Admin overview");
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [flags, setFlags] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchAllUsers().catch(() => []),
      fetchAllListingsForAdmin().catch(() => []),
      fetchFlaggedQueue().catch(() => []),
      fetchModelMetrics().catch(() => ({ available: false, mode: "bootstrap" })),
    ]).then(([userItems, listingItems, flagItems, modelMetrics]) => {
      if (cancelled) return;
      setUsers(userItems);
      setListings(listingItems);
      setFlags(flagItems);
      setMetrics(modelMetrics);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingLandlords = users.filter((user) => user.role === "landlord" && user.verificationStatus !== "approved");
  const highRisk = listings.filter((listing) => listing.ai?.fraudLabel === "high_risk");
  const suspicious = listings.filter((listing) => listing.ai?.fraudLabel === "suspicious");

  return (
    <div>
      <PageHeader
        eyebrow="Admin console"
        title="Platform overview"
        subtitle="Verification, safety flags and model health at a glance."
        actions={
          <Button to="/admin/flagged" size="sm" variant="outline">
            <Flag className="h-4 w-4" aria-hidden="true" /> Review flags
          </Button>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value={users.length} hint={`${users.filter((user) => user.role === "landlord").length} landlords`} icon={Users} />
        <StatCard label="Listings" value={listings.length} hint={`${listings.filter((listing) => listing.status === "active").length} active`} icon={Building2} tone="secondary" />
        <StatCard label="Pending verification" value={pendingLandlords.length} icon={ShieldCheck} tone="suspicious" />
        <StatCard label="Open AI flags" value={flags.length} hint={`${highRisk.length} high risk`} icon={ShieldAlert} tone="highrisk" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">Listings needing review</h2>
            <Link to="/admin/flagged" className="text-sm font-semibold text-primary hover:underline">
              Open queue
            </Link>
          </div>
          {loading ? (
            <div className="mt-3"><TableSkeleton rows={3} /></div>
          ) : flags.length === 0 ? (
            <p className="mt-3 rounded-xl bg-subtle p-4 text-sm text-muted">No open flags. The queue is clear.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {flags.slice(0, 4).map((flag) => (
                <li key={flag.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
                  {flag.images?.[0] ? (
                    <img src={flag.images[0]} alt="" className="h-14 w-20 rounded-lg object-cover" loading="lazy" />
                  ) : (
                    <div className="h-14 w-20 rounded-lg bg-subtle" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link to={`/listings/${flag.listingId}`} className="line-clamp-1 text-sm font-semibold hover:text-primary">
                      {flag.title || flag.listing?.title || flag.listingId}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {flag.city || flag.listing?.city} · score {flag.fraudScore ?? "—"}
                    </p>
                  </div>
                  <TrustBadge ai={{ fraudLabel: flag.fraudLabel, fraudScore: flag.fraudScore }} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-5">
          <section className="card p-5">
            <h2 className="font-heading text-base font-semibold">Model status</h2>
            {metrics?.available ? (
              <div className="mt-2 space-y-2 text-sm">
                <Badge tone="verified" icon={BadgeCheck}>Trained model available</Badge>
                <p className="text-muted">Mode: {metrics.mode || "trained"}</p>
                {metrics.model_version ? <p className="text-xs text-muted">Version: {metrics.model_version}</p> : null}
              </div>
            ) : (
              <div className="mt-2">
                <Badge tone="suspicious">Bootstrap mode</Badge>
                <p className="mt-2 text-sm text-muted">
                  No trained image model yet. Duplicate and anomaly checks are running. Metrics appear after training.
                </p>
                <p className="mt-2 text-xs text-muted">{metrics?.error || "GET /metrics did not return a trained report."}</p>
              </div>
            )}
            <Button to="/admin/analytics" variant="outline" size="sm" className="mt-3">
              Full analytics
            </Button>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-base font-semibold">Verification queue</h2>
              <Link to="/admin/verification" className="text-xs font-semibold text-primary hover:underline">
                Review
              </Link>
            </div>
            {pendingLandlords.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {pendingLandlords.slice(0, 3).map((user) => (
                  <li key={user.uid} className="flex items-center justify-between gap-2 rounded-lg bg-subtle px-3 py-2">
                    <span className="truncate">{user.name}</span>
                    <Badge tone="suspicious">{user.verificationStatus || "pending"}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No landlords waiting.</p>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-heading text-base font-semibold">Recent sign-ups</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {users.slice(0, 4).map((user) => (
                <li key={user.uid} className="flex items-center justify-between gap-2">
                  <span className="truncate text-muted">{user.name}</span>
                  <span className="shrink-0 text-xs text-muted">{formatDate(user.createdAt)}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-4 text-center">
          <p className="font-heading text-2xl font-bold text-status-verified">{listings.filter((listing) => listing.ai?.fraudLabel === "verified").length}</p>
          <p className="text-xs text-muted">Verified listings</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-heading text-2xl font-bold text-status-suspicious">{suspicious.length}</p>
          <p className="text-xs text-muted">Suspicious listings</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-heading text-2xl font-bold text-status-highrisk">{highRisk.length}</p>
          <p className="text-xs text-muted">High-risk listings</p>
        </div>
      </div>
    </div>
  );
}
