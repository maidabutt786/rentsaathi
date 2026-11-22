import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { isFavorite, setFavorite } from "../../lib/listingsApi.js";

export default function FavoriteButton({ listingId, className = "", size = "md" }) {
  const { user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [favorite, setFavoriteState] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user?.uid) {
      setFavoriteState(false);
      return () => {
        cancelled = true;
      };
    }
    isFavorite(user.uid, listingId)
      .then((value) => {
        if (!cancelled) setFavoriteState(value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [listingId, user?.uid]);

  const toggle = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      push("Log in to save rooms to your favourites.", "info");
      navigate(`/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`);
      return;
    }
    setBusy(true);
    try {
      const next = !favorite;
      await setFavorite(user.uid, listingId, next);
      setFavoriteState(next);
      push(next ? "Saved to your favourites." : "Removed from favourites.", "success");
    } catch (error) {
      push(error.message || "Could not update favourites.", "error");
    } finally {
      setBusy(false);
    }
  };

  const dimension = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={favorite}
      aria-label={favorite ? "Remove from favourites" : "Save to favourites"}
      className={`inline-flex ${dimension} items-center justify-center rounded-full border border-line bg-surface/95 text-muted shadow-sm backdrop-blur transition hover:border-primary/40 hover:text-primary disabled:opacity-60 ${className}`}
    >
      <Heart className={`${iconSize} ${favorite ? "fill-primary text-primary" : ""}`} aria-hidden="true" />
    </button>
  );
}
