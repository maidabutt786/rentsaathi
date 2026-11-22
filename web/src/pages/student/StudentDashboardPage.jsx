import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, CalendarClock, Heart, MessageSquare, Search, ShieldCheck } from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { fetchFavorites, fetchVisitRequests, getSavedSearches, subscribeChats } from "../../lib/listingsApi.js";
import { formatDate, formatPKR } from "../../lib/format.js";
import PageHeader from "../../components/layout/PageHeader.jsx";
import StatCard from "../../components/ui/StatCard.jsx";
import ListingCard from "../../components/listings/ListingCard.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { ListingGridSkeleton } from "../../components/ui/Skeletons.jsx";

const VISIT_TONE = { pending: "suspicious", accepted: "verified", declined: "highrisk", completed: "info" };

export default function StudentDashboardPage() {
  useDocumentTitle("Student dashboard");
  const { profile } = useAuth();
  const [state, setState] = useState({ favorites: [], visits: [], searches: [], chats: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return undefined;
    let cancelled = false;
    Promise.all([
      fetchFavorites(profile.uid).catch(() => []),
      fetchVisitRequests({ uid: profile.uid, role: "student" }).catch(() => []),
      getSavedSearches(profile.uid).catch(() => []),
      Promise.resolve([]),
    ]).then(([favorites, visits, searches, chats]) => {
      if (!cancelled) {
        setState({ favorites, visits, searches, chats });
        setLoading(false);
      }
    });
    const unsubscribe = subscribeChats(profile.uid, (chats) => {
      if (!cancelled) setState((current) => ({ ...current, chats }));
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [profile?.uid]);

  const pendingVisits = state.visits.filter((visit) => visit.status === "pending");
  const nextVisit = state.visits.find((visit) => visit.status === "accepted") || pendingVisits[0];

  return (
    <div>
      <PageHeader
        eyebrow="Assalam-o-Alaikum"
        title={profile?.name?.split(" ")[0] || "Student"}
        subtitle="Here is what is happening with your room search."
        actions={
          <Button to="/listings" size="sm">
            <Search className="h-4 w-4" aria-hidden="true" /> Find a room
          </Button>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Favourites" value={state.favorites.length} icon={Heart} />
        <StatCard label="Visit requests" value={state.visits.length} hint={`${pendingVisits.length} pending`} icon={CalendarClock} tone="secondary" />
        <StatCard label="Saved searches" value={state.searches.length} icon={Bookmark} tone="info" />
        <StatCard label="Chats" value={state.chats.length} icon={MessageSquare} tone="verified" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">Your favourite rooms</h2>
            <Link to="/student/favorites" className="text-sm font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-3">
            {loading ? (
              <ListingGridSkeleton count={2} />
            ) : state.favorites.length ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {state.favorites.slice(0, 2).map((favorite) => (
                  <ListingCard key={favorite.id} listing={favorite.listing} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Heart}
                title="No favourites yet"
                body="Tap the heart on any room to keep it here for later."
                action={<Button to="/listings" size="sm">Browse rooms</Button>}
              />
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-base font-semibold">Next visit</h2>
              <Link to="/student/visits" className="text-xs font-semibold text-primary hover:underline">
                All visits
              </Link>
            </div>
            {nextVisit ? (
              <div className="mt-3">
                <Badge tone={VISIT_TONE[nextVisit.status] || "neutral"}>{nextVisit.status}</Badge>
                <p className="mt-2 text-sm font-semibold">{nextVisit.listing?.title || "Listing"}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatDate(nextVisit.preferredDate)} at {nextVisit.preferredTime}
                </p>
                <p className="mt-1 text-xs text-muted">{formatPKR(nextVisit.listing?.price)} / month</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">No visits booked. Open a room and request a time.</p>
            )}
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" /> Student safety
            </h2>
            <ul className="mt-2 space-y-2 text-xs text-muted">
              <li>• Visit with a friend and share your live location.</li>
              <li>• Never pay a deposit before seeing the room.</li>
              <li>• Keep chats inside RentSaathi.</li>
            </ul>
            <Button to="/safety" variant="outline" size="sm" className="mt-3">
              Safety guide
            </Button>
          </section>

          {state.searches.length ? (
            <section className="card p-5">
              <h2 className="font-heading text-base font-semibold">Saved searches</h2>
              <ul className="mt-2 space-y-2 text-sm">
                {state.searches.slice(0, 3).map((search) => (
                  <li key={search.id || search.query}>
                    <Link to={`/listings${search.query || ""}`} className="text-muted hover:text-primary">
                      {search.label || "Saved search"}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
