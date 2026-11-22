import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BadgeCheck, Building2, Eye, MessageSquare, PlusCircle, TrendingUp, Users } from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { fetchOwnerListings, fetchVisitRequests, subscribeChats } from "../../lib/listingsApi.js";
import { formatDate, formatPKR } from "../../lib/format.js";
import PageHeader from "../../components/layout/PageHeader.jsx";
import StatCard from "../../components/ui/StatCard.jsx";
import TrustBadge from "../../components/listings/TrustBadge.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { TableSkeleton } from "../../components/ui/Skeletons.jsx";

const VISIT_TONE = { pending: "suspicious", accepted: "verified", declined: "highrisk", completed: "info" };

export default function LandlordDashboardPage() {
  useDocumentTitle("Landlord dashboard");
  const { profile } = useAuth();
  const [listings, setListings] = useState([]);
  const [visits, setVisits] = useState([]);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return undefined;
    let cancelled = false;
    Promise.all([
      fetchOwnerListings(profile.uid).catch(() => []),
      fetchVisitRequests({ uid: profile.uid, role: "landlord" }).catch(() => []),
    ]).then(([items, visitItems]) => {
      if (!cancelled) {
        setListings(items);
        setVisits(visitItems);
        setLoading(false);
      }
    });
    const unsubscribe = subscribeChats(profile.uid, (items) => {
      if (!cancelled) setChats(items);
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [profile?.uid]);

  const active = listings.filter((listing) => listing.status === "active");
  const views = listings.reduce((sum, listing) => sum + Number(listing.viewCount || 0), 0);
  const enquiries = listings.reduce((sum, listing) => sum + Number(listing.enquiryCount || 0), 0);
  const flagged = listings.filter((listing) => listing.ai && listing.ai.fraudLabel !== "verified");
  const pendingVisits = visits.filter((visit) => visit.status === "pending");

  return (
    <div>
      <PageHeader
        eyebrow="Landlord area"
        title={profile?.name?.split(" ")[0] || "Landlord"}
        subtitle="Your rooms, enquiries and AI results in one place."
        actions={
          <Button to="/landlord/listings/new" size="sm">
            <PlusCircle className="h-4 w-4" aria-hidden="true" /> Add a listing
          </Button>
        }
      />

      {profile?.verificationStatus !== "approved" ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-suspicious/30 bg-status-suspicious/10 p-4">
          <p className="flex items-center gap-2 text-sm text-status-suspicious">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Your account is {profile?.verificationStatus || "not verified"}. Upload your documents to get the verified badge.
          </p>
          <Button to="/landlord/verification" size="sm" variant="outline">
            Upload documents
          </Button>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active listings" value={active.length} hint={`${listings.length} total`} icon={Building2} />
        <StatCard label="Total views" value={views} icon={Eye} tone="secondary" />
        <StatCard label="Enquiries" value={enquiries} icon={Users} tone="info" />
        <StatCard label="AI flagged" value={flagged.length} hint="Need your attention" icon={AlertTriangle} tone="suspicious" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">Your rooms</h2>
            <Link to="/landlord/listings" className="text-sm font-semibold text-primary hover:underline">
              Manage all
            </Link>
          </div>
          <div className="mt-3">
            {loading ? (
              <TableSkeleton rows={3} />
            ) : listings.length ? (
              <ul className="space-y-3">
                {listings.slice(0, 4).map((listing) => (
                  <li key={listing.id} className="card flex flex-wrap items-center gap-3 p-3">
                    {listing.images?.[0] ? (
                      <img src={listing.images[0]} alt="" className="h-14 w-20 rounded-lg object-cover" loading="lazy" />
                    ) : (
                      <div className="h-14 w-20 rounded-lg bg-subtle" />
                    )}
                    <div className="min-w-0 flex-1">
                      <Link to={`/listings/${listing.id}`} className="line-clamp-1 text-sm font-semibold hover:text-primary">
                        {listing.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatPKR(listing.price)} / month · {listing.status}
                      </p>
                    </div>
                    <TrustBadge ai={listing.ai} size="sm" showScore={false} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Building2}
                title="No listings yet"
                body="Add your first room. You will need at least three clear photos."
                action={<Button to="/landlord/listings/new" size="sm">Add a listing</Button>}
              />
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-base font-semibold">Visit requests</h2>
              <Link to="/landlord/visits" className="text-xs font-semibold text-primary hover:underline">
                All requests
              </Link>
            </div>
            {pendingVisits.length ? (
              <ul className="mt-3 space-y-3">
                {pendingVisits.slice(0, 3).map((visit) => (
                  <li key={visit.id} className="rounded-lg border border-line p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{visit.studentName}</p>
                      <Badge tone={VISIT_TONE[visit.status]}>{visit.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {formatDate(visit.preferredDate)} at {visit.preferredTime}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-muted">{visit.listing?.title}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No pending visits.</p>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-heading text-base font-semibold">AI analysis</h2>
            <p className="mt-1 text-xs text-muted">
              Listings are checked when you save them. A badge appears on the public page and here.
            </p>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-subtle p-3 text-sm">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" /> Chats
              </span>
              <span className="font-semibold">{chats.length}</span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-subtle p-3 text-sm">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" /> Enquiries
              </span>
              <span className="font-semibold">{enquiries}</span>
            </div>
          </section>

          <section className="rounded-xl border border-secondary/20 bg-secondary-soft p-4 text-sm text-secondary">
            <p className="flex items-center gap-2 font-semibold">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Get the verified badge
            </p>
            <p className="mt-1 text-secondary/80">
              Verified landlords get more enquiries. Upload your CNIC and ownership paper once.
            </p>
            <Button to="/landlord/verification" variant="secondary" size="sm" className="mt-3">
              Verification
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}
