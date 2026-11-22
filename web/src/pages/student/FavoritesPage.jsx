import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { fetchFavorites } from "../../lib/listingsApi.js";
import PageHeader from "../../components/layout/PageHeader.jsx";
import ListingCard from "../../components/listings/ListingCard.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { ListingGridSkeleton } from "../../components/ui/Skeletons.jsx";

export default function FavoritesPage() {
  useDocumentTitle("Favourites");
  const { profile } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return undefined;
    let cancelled = false;
    fetchFavorites(profile.uid)
      .then((items) => {
        if (!cancelled) setFavorites(items);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.uid]);

  return (
    <div>
      <PageHeader
        eyebrow="Student area"
        title="Your favourites"
        subtitle="Rooms you saved. Prices and AI results update automatically when a landlord edits a listing."
      />
      <div className="mt-5">
        {loading ? (
          <ListingGridSkeleton count={3} />
        ) : favorites.length ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {favorites.map((favorite) => (
              <ListingCard key={favorite.id} listing={favorite.listing} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Heart}
            title="No saved rooms yet"
            body="When you see a room you like, tap the heart. It will be waiting here when you are ready to compare."
            action={<Button to="/listings">Find a room</Button>}
          />
        )}
      </div>
    </div>
  );
}
