import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, ExternalLink, Search, Trash2 } from "lucide-react";

import { useToast } from "../../context/ToastContext.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { fetchAllListingsForAdmin, setListingStatus } from "../../lib/listingsApi.js";
import { formatPKR, timeAgo } from "../../lib/format.js";
import PageHeader from "../../components/layout/PageHeader.jsx";
import TrustBadge from "../../components/listings/TrustBadge.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { TableSkeleton } from "../../components/ui/Skeletons.jsx";

export default function AdminListingsPage() {
  useDocumentTitle("All listings");
  const { push } = useToast();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [labelFilter, setLabelFilter] = useState("");
  const [toRemove, setToRemove] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    fetchAllListingsForAdmin()
      .then(setListings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(
    () =>
      listings
        .filter((listing) => (statusFilter ? listing.status === statusFilter : true))
        .filter((listing) => (labelFilter ? (listing.ai?.fraudLabel || "analyzing") === labelFilter : true))
        .filter((listing) => {
          if (!query) return true;
          return `${listing.title} ${listing.city} ${listing.ownerName} ${listing.id}`.toLowerCase().includes(query.toLowerCase());
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [listings, statusFilter, labelFilter, query],
  );

  const remove = async () => {
    if (!toRemove) return;
    setBusyId(toRemove.id);
    try {
      await setListingStatus(toRemove.id, "removed");
      setListings((current) => current.map((item) => (item.id === toRemove.id ? { ...item, status: "removed" } : item)));
      push("Listing removed from public view.", "success");
      setToRemove(null);
    } catch (error) {
      push(error.message || "Could not remove the listing.", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Admin console"
        title="All listings"
        subtitle="Every room on the platform, including paused and removed listings."
      />

      <div className="mt-5 flex flex-wrap gap-3">
        <label className="relative flex-1 sm:max-w-sm">
          <span className="sr-only">Search listings</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, city, owner or id" className="input-base pl-9" />
        </label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input-base max-w-[160px]">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="removed">Removed</option>
        </select>
        <select value={labelFilter} onChange={(event) => setLabelFilter(event.target.value)} className="input-base max-w-[170px]">
          <option value="">All AI results</option>
          <option value="verified">Verified</option>
          <option value="suspicious">Suspicious</option>
          <option value="high_risk">High risk</option>
          <option value="analyzing">Analyzing</option>
        </select>
      </div>

      <div className="mt-5">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : visible.length === 0 ? (
          <EmptyState icon={Building2} title="No listings found" body="Try another search or clear the filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-1">Listing</th>
                  <th className="px-3 py-1">Owner</th>
                  <th className="px-3 py-1">Rent</th>
                  <th className="px-3 py-1">Status</th>
                  <th className="px-3 py-1">AI check</th>
                  <th className="px-3 py-1 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((listing) => (
                  <tr key={listing.id} className="bg-surface shadow-sm [&>td]:border-y [&>td]:border-line [&>td]:px-3 [&>td]:py-3 [&>td:first-child]:rounded-l-xl [&>td:first-child]:border-l [&>td:last-child]:rounded-r-xl [&>td:last-child]:border-r">
                    <td>
                      <div className="flex items-center gap-3">
                        {listing.images?.[0] ? (
                          <img src={listing.images[0]} alt="" className="h-12 w-16 rounded-lg object-cover" loading="lazy" />
                        ) : (
                          <div className="h-12 w-16 rounded-lg bg-subtle" />
                        )}
                        <div className="min-w-0">
                          <Link to={`/listings/${listing.id}`} className="line-clamp-1 font-medium hover:text-primary">
                            {listing.title}
                          </Link>
                          <p className="mt-0.5 text-xs text-muted">{listing.city} · {timeAgo(listing.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted">{listing.ownerName || listing.ownerId}</td>
                    <td className="whitespace-nowrap font-medium">{formatPKR(listing.price)}</td>
                    <td>
                      <Badge tone={listing.status === "active" ? "verified" : listing.status === "paused" ? "suspicious" : "highrisk"}>
                        {listing.status}
                      </Badge>
                    </td>
                    <td><TrustBadge ai={listing.ai} size="sm" showScore={false} /></td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button to={`/listings/${listing.id}`} variant="ghost" size="sm" aria-label={`Open ${listing.title}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        {listing.status !== "removed" ? (
                          <Button variant="ghost" size="sm" onClick={() => setToRemove(listing)} aria-label={`Remove ${listing.title}`}>
                            <Trash2 className="h-4 w-4 text-status-highrisk" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(toRemove)}
        onClose={() => setToRemove(null)}
        title="Remove this listing?"
        description="It will disappear from the public site. The landlord can edit and resubmit it for review."
        footer={
          <>
            <Button variant="ghost" onClick={() => setToRemove(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={busyId === toRemove?.id} onClick={remove}>
              Remove listing
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{toRemove?.title}</p>
      </Modal>
    </div>
  );
}
