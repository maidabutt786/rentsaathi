import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Eye,
  GraduationCap,
  MapPin,
  Ruler,
  Share2,
  ShieldAlert,
  Users,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { demoMode } from "../../lib/firebase.js";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { fetchListing, fetchListingsByIds, fetchOwnerListings, fetchUser, incrementView } from "../../lib/listingsApi.js";
import { GENDER_RULES, ROOM_TYPES, UNIVERSITIES } from "../../lib/constants.js";
import { formatDate, formatPKR, timeAgo } from "../../lib/format.js";
import { useToast } from "../../context/ToastContext.jsx";
import ImageGallery from "../../components/listings/ImageGallery.jsx";
import TrustBadge from "../../components/listings/TrustBadge.jsx";
import TrustPanel from "../../components/listings/TrustPanel.jsx";
import FairPriceCard from "../../components/listings/FairPriceCard.jsx";
import LandlordCard from "../../components/listings/LandlordCard.jsx";
import VisitRequestForm from "../../components/listings/VisitRequestForm.jsx";
import ReviewSection from "../../components/listings/ReviewSection.jsx";
import FavoriteButton from "../../components/listings/FavoriteButton.jsx";
import MapView from "../../components/map/MapView.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { DetailSkeleton } from "../../components/ui/Skeletons.jsx";

const roomLabel = (value) => ROOM_TYPES.find((item) => item.value === value)?.label || value;
const genderLabel = (value) => GENDER_RULES.find((item) => item.value === value)?.label || value;

export default function ListingDetailPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const { push } = useToast();
  const [listing, setListing] = useState(null);
  const [landlord, setLandlord] = useState(null);
  const [listingCount, setListingCount] = useState(null);
  const [duplicate, setDuplicate] = useState(null);
  const [loading, setLoading] = useState(true);
  const viewed = useRef(null);

  useDocumentTitle(listing?.title || "Listing");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchListing(id)
      .then(async (data) => {
        if (cancelled) return;
        setListing(data);
        if (!data) return;
        if (viewed.current !== id) {
          viewed.current = id;
          incrementView(id);
        }
        const canReadOwner = demoMode || profile?.role === "admin" || profile?.uid === data.ownerId;
        const [owner, ownerListings, duplicates] = await Promise.all([
          canReadOwner ? fetchUser(data.ownerId).catch(() => null) : Promise.resolve(null),
          fetchOwnerListings(data.ownerId, { activeOnly: true }).catch(() => []),
          data.ai?.duplicateOf ? fetchListingsByIds([data.ai.duplicateOf]).catch(() => []) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setLandlord(owner);
        setListingCount(ownerListings.length);
        setDuplicate(duplicates[0] || null);
      })
      .catch(() => {
        if (!cancelled) setListing(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, profile?.role, profile?.uid]);

  const university = useMemo(
    () => UNIVERSITIES.find((item) => item.id === listing?.universityId),
    [listing?.universityId],
  );

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      push("Link copied to your clipboard.", "success");
    } catch {
      push("Could not copy the link. Copy it from your browser address bar.", "warning");
    }
  };

  if (loading) return <DetailSkeleton />;

  if (!listing) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={MapPin}
          title="This listing is not available"
          body="It may have been removed by the landlord or the admin team. Browse other verified rooms near your university."
          action={<Button to="/listings">Browse rooms</Button>}
        />
      </div>
    );
  }

  const landlordForCard = {
    ...(landlord || {}),
    name: landlord?.name || listing.ownerName,
    listingCount,
    memberSince: landlord?.createdAt ? new Date(landlord.createdAt).getFullYear() : null,
  };

  return (
    <div className="container-page py-8 lg:py-10">
      <Link to="/listings" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to rooms
      </Link>

      {listing.status !== "active" ? (
        <div className="mt-4 rounded-xl border border-status-suspicious/30 bg-status-suspicious/10 p-3 text-sm text-status-suspicious">
          This listing is currently <strong>{listing.status}</strong>. You can still read the details, but it is not open
          for new enquiries.
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TrustBadge ai={listing.ai} size="sm" />
            {listing.ai?.duplicateOf ? (
              <Badge tone="highrisk" icon={ShieldAlert}>
                Possible reused photo
              </Badge>
            ) : null}
          </div>
          <h1 className="mt-3 max-w-3xl font-heading text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            {listing.title}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              {listing.address ? `${listing.address}, ` : ""}
              {listing.city}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-4 w-4" aria-hidden="true" /> {listing.viewCount || 0} views
            </span>
            <span>Listed {timeAgo(listing.createdAt)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FavoriteButton listingId={listing.id} />
          <Button variant="outline" size="sm" onClick={share}>
            <Share2 className="h-4 w-4" aria-hidden="true" /> Share
          </Button>
        </div>
      </div>

      <div className="mt-7 grid gap-8 lg:grid-cols-[1.65fr_1fr]">
        <div className="min-w-0 space-y-6">
          <ImageGallery images={listing.images || []} title={listing.title} />

          <section className="card p-5">
            <h2 className="font-heading text-lg font-semibold">About this room</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{listing.description}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-xl bg-subtle p-3 text-sm">
                <BedDouble className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="text-muted">Room type</span>
                <span className="ml-auto font-medium">{roomLabel(listing.roomType)}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-subtle p-3 text-sm">
                <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="text-muted">Who can live here</span>
                <span className="ml-auto font-medium">{genderLabel(listing.genderRule)}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-subtle p-3 text-sm">
                <Ruler className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="text-muted">Area</span>
                <span className="ml-auto font-medium">{listing.areaSqft} sqft</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-subtle p-3 text-sm">
                <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="text-muted">Campus distance</span>
                <span className="ml-auto font-medium">{listing.distanceToUniversityKm} km</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-subtle p-3 text-sm sm:col-span-2">
                <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="text-muted">Added on</span>
                <span className="ml-auto font-medium">{formatDate(listing.createdAt)}</span>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-heading text-lg font-semibold">Facilities</h2>
            {listing.facilities?.length ? (
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {listing.facilities.map((facility) => (
                  <li key={facility} className="flex items-center gap-2 rounded-lg bg-subtle px-3 py-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-status-verified" aria-hidden="true" />
                    {facility}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">The landlord has not listed facilities yet.</p>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-heading text-lg font-semibold">Location</h2>
            <p className="mt-1 text-sm text-muted">
              Approximate area shown. Exact address is shared when you arrange a visit.
            </p>
            <div className="mt-4">
              <MapView listings={[listing]} selectedId={listing.id} height={320} />
            </div>
            {university ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted">
                <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
                {listing.distanceToUniversityKm} km from {university.name}
              </p>
            ) : null}
          </section>

          {duplicate ? (
            <section className="card border-status-highrisk/30 p-5">
              <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-status-highrisk">
                <ShieldAlert className="h-5 w-5" aria-hidden="true" /> Photo matches another listing
              </h2>
              <p className="mt-2 text-sm text-muted">
                Our image check found a {Math.round((listing.ai?.duplicateSimilarity || 0) * 100)}% match with another
                listing. Compare both before you visit.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="overflow-hidden rounded-xl border border-line">
                  <img src={listing.images?.[0]} alt={`${listing.title} main photo`} className="h-32 w-full object-cover" loading="lazy" />
                  <div className="p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-status-highrisk">This listing</p>
                    <p className="mt-1 line-clamp-2 text-sm font-medium">{listing.title}</p>
                    <p className="mt-1 text-xs text-muted">{listing.city}</p>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-line">
                  <img src={duplicate.images?.[0]} alt={`${duplicate.title} main photo`} className="h-32 w-full object-cover" loading="lazy" />
                  <div className="p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Existing listing</p>
                    <Link to={`/listings/${duplicate.id}`} className="mt-1 line-clamp-2 text-sm font-medium hover:text-primary">
                      {duplicate.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted">{duplicate.city}</p>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <TrustPanel ai={listing.ai} />
          <ReviewSection listingId={listing.id} />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
          <section className="card p-5">
            <p className="text-sm text-muted">Monthly rent</p>
            <p className="mt-1 font-heading text-3xl font-bold text-primary">
              {formatPKR(listing.price)}
              <span className="ml-1 font-sans text-sm font-normal text-muted">/month</span>
            </p>
            <p className="mt-1 text-xs text-muted">Ask the landlord what the rent includes (bills, Wi-Fi, water).</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <TrustBadge ai={listing.ai} size="sm" />
              <Badge tone="neutral">{listing.enquiryCount || 0} enquiries</Badge>
            </div>
          </section>

          <LandlordCard listing={listing} landlord={landlordForCard} />
          <VisitRequestForm listing={listing} />
          <FairPriceCard fairPrice={listing.aiFairPrice} />

          <section className="rounded-xl border border-status-info/25 bg-status-info/5 p-4 text-sm text-muted">
            <p className="font-semibold text-status-info">Before you pay</p>
            <p className="mt-1">
              Visit the room, meet the landlord, and check the CNIC and ownership papers. Never transfer a deposit from a
              message alone.
            </p>
            <Link to="/safety" className="mt-2 inline-block text-xs font-semibold text-status-info underline">
              Safety checklist
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
