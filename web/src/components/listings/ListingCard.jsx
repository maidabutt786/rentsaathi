import { Link } from "react-router-dom";
import { BedDouble, Eye, MapPin, Ruler, Users } from "lucide-react";

import TrustBadge from "./TrustBadge.jsx";
import FavoriteButton from "./FavoriteButton.jsx";
import { formatPKR, truncate } from "../../lib/format.js";
import { GENDER_RULES, ROOM_TYPES } from "../../lib/constants.js";

const roomLabel = (value) => ROOM_TYPES.find((item) => item.value === value)?.label || value || "Room";
const genderLabel = (value) => GENDER_RULES.find((item) => item.value === value)?.label || value || "";

export default function ListingCard({ listing }) {
  const cover = listing.images?.[0];
  return (
    <article className="card group relative overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative h-52 overflow-hidden bg-secondary-soft">
        <Link to={`/listings/${listing.id}`} aria-label={`View ${listing.title}`}>
          {cover ? (
            <img
              src={cover}
              alt={`${listing.title} — main photo`}
              loading="lazy"
              className="h-52 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-52 items-center justify-center bg-gradient-to-br from-primary-soft to-secondary-soft text-secondary">
              <BedDouble className="h-12 w-12" aria-hidden="true" />
            </div>
          )}
        </Link>
        <div className="absolute left-3 top-3">
          <TrustBadge ai={listing.ai} size="sm" showScore={false} />
        </div>
        <FavoriteButton listingId={listing.id} size="sm" className="absolute right-3 top-3" />
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-heading text-xl font-semibold text-primary">
            {formatPKR(listing.price)}
            <span className="ml-1 font-sans text-xs font-normal text-muted">/month</span>
          </p>
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            {listing.viewCount || 0}
          </span>
        </div>
        <h3 className="mt-2 line-clamp-2 font-heading text-base font-semibold leading-snug">
          <Link to={`/listings/${listing.id}`} className="hover:text-primary">
            {listing.title}
          </Link>
        </h3>
        <p className="mt-2 flex items-start gap-1.5 text-sm text-muted">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="line-clamp-1">
            {listing.address ? `${listing.address}, ` : ""}
            {listing.city}
          </span>
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="chip">
            <BedDouble className="h-3.5 w-3.5" aria-hidden="true" />
            {roomLabel(listing.roomType)}
          </span>
          <span className="chip">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {genderLabel(listing.genderRule)}
          </span>
          <span className="chip">
            <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
            {listing.areaSqft} sqft
          </span>
        </div>
        <p className="mt-3 text-sm text-muted">{truncate(listing.description, 110)}</p>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
          <span>{listing.distanceToUniversityKm} km to campus</span>
          <Link to={`/listings/${listing.id}`} className="font-semibold text-primary hover:text-primary-hover">
            View details →
          </Link>
        </div>
      </div>
    </article>
  );
}
