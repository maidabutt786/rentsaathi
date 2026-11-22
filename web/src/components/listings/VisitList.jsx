import { Link } from "react-router-dom";
import { CalendarClock, Check, MessageSquare, Phone, X } from "lucide-react";

import { formatDate, formatPKR } from "../../lib/format.js";
import Badge from "../ui/Badge.jsx";
import Button from "../ui/Button.jsx";

const TONE = { pending: "suspicious", accepted: "verified", declined: "highrisk", completed: "info" };

export default function VisitList({ requests, role = "student", onUpdate, updatingId }) {
  return (
    <ul className="grid gap-4">
      {requests.map((request) => (
        <li key={request.id} className="card overflow-hidden">
          <div className="grid sm:grid-cols-[140px_1fr]">
            <Link to={`/listings/${request.listingId}`} className="block bg-subtle">
              {request.listing?.images?.[0] ? (
                <img
                  src={request.listing.images[0]}
                  alt={`${request.listing.title} main photo`}
                  className="h-32 w-full object-cover sm:h-full"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-32 items-center justify-center text-muted sm:h-full">No photo</div>
              )}
            </Link>
            <div className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/listings/${request.listingId}`} className="font-semibold hover:text-primary">
                    {request.listing?.title || "Listing"}
                  </Link>
                  <p className="mt-1 text-xs text-muted">
                    {request.listing ? `${formatPKR(request.listing.price)} / month · ${request.listing.city}` : ""}
                  </p>
                </div>
                <Badge tone={TONE[request.status] || "neutral"}>{request.status}</Badge>
              </div>

              <div className="mt-3 grid gap-1.5 text-sm text-muted sm:grid-cols-2">
                <p className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
                  {formatDate(request.preferredDate)} at {request.preferredTime}
                </p>
                {role === "landlord" ? (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
                    {request.studentName} · {request.studentPhone || "No phone"}
                  </p>
                ) : (
                  <p className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
                    Landlord: {request.listing?.ownerName || "—"}
                  </p>
                )}
              </div>

              {request.message ? <p className="mt-2 rounded-lg bg-subtle p-2 text-sm text-muted">“{request.message}”</p> : null}

              {role === "landlord" && request.status === "pending" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    loading={updatingId === request.id}
                    onClick={() => onUpdate(request.id, "accepted")}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="danger-outline"
                    loading={updatingId === request.id}
                    onClick={() => onUpdate(request.id, "declined")}
                  >
                    <X className="h-4 w-4" aria-hidden="true" /> Decline
                  </Button>
                  <Button size="sm" variant="ghost" to="/landlord/chats">
                    <MessageSquare className="h-4 w-4" aria-hidden="true" /> Message
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
