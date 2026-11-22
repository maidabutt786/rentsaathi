import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Eye, Pause, Pencil, Play, PlusCircle, Trash2, Users } from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { deleteListing, setListingStatus, subscribeOwnerListings } from "../../lib/listingsApi.js";
import { formatPKR, timeAgo } from "../../lib/format.js";
import PageHeader from "../../components/layout/PageHeader.jsx";
import TrustBadge from "../../components/listings/TrustBadge.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { TableSkeleton } from "../../components/ui/Skeletons.jsx";

export default function LandlordListingsPage() {
  useDocumentTitle("My listings");
  const { profile } = useAuth();
  const { push } = useToast();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    if (!profile?.uid) return undefined;
    setLoading(true);
    const unsubscribe = subscribeOwnerListings(profile.uid, (items) => {
      setListings([...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setLoading(false);
    });
    return () => unsubscribe?.();
  }, [profile?.uid]);

  const toggleStatus = async (listing) => {
    setBusyId(listing.id);
    const next = listing.status === "active" ? "paused" : "active";
    try {
      await setListingStatus(listing.id, next);
      setListings((current) => current.map((item) => (item.id === listing.id ? { ...item, status: next } : item)));
      push(next === "active" ? "Listing is active again." : "Listing paused. Students cannot see it.", "success");
    } catch (error) {
      push(error.message || "Could not update the listing.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setBusyId(toDelete.id);
    try {
      await deleteListing(toDelete.id);
      setListings((current) => current.filter((item) => item.id !== toDelete.id));
      push("Listing deleted.", "success");
      setToDelete(null);
    } catch (error) {
      push(error.message || "Could not delete the listing.", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Landlord area"
        title="My listings"
        subtitle="Pause a room when it is taken. Edit photos and the AI check runs again automatically."
        actions={
          <Button to="/landlord/listings/new" size="sm">
            <PlusCircle className="h-4 w-4" aria-hidden="true" /> Add a listing
          </Button>
        }
      />

      <div className="mt-5">
        {loading ? (
          <TableSkeleton rows={5} />
        ) : listings.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No listings yet"
            body="Add your first room with clear photos, an honest description and a fair rent."
            action={<Button to="/landlord/listings/new">Add a listing</Button>}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-3 py-1">Room</th>
                    <th className="px-3 py-1">Rent</th>
                    <th className="px-3 py-1">Status</th>
                    <th className="px-3 py-1">AI check</th>
                    <th className="px-3 py-1">Views</th>
                    <th className="px-3 py-1">Enquiries</th>
                    <th className="px-3 py-1 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => (
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
                      <td className="whitespace-nowrap font-medium">{formatPKR(listing.price)}</td>
                      <td>
                        <Badge tone={listing.status === "active" ? "verified" : listing.status === "paused" ? "suspicious" : "highrisk"}>
                          {listing.status}
                        </Badge>
                      </td>
                      <td>
                        <TrustBadge ai={listing.ai} size="sm" showScore={false} />
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 text-muted">
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" /> {listing.viewCount || 0}
                        </span>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 text-muted">
                          <Users className="h-3.5 w-3.5" aria-hidden="true" /> {listing.enquiryCount || 0}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Button to={`/landlord/listings/${listing.id}/edit`} variant="ghost" size="sm" aria-label={`Edit ${listing.title}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={busyId === listing.id}
                            onClick={() => toggleStatus(listing)}
                            aria-label={listing.status === "active" ? `Pause ${listing.title}` : `Activate ${listing.title}`}
                          >
                            {listing.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setToDelete(listing)} aria-label={`Delete ${listing.title}`}>
                            <Trash2 className="h-4 w-4 text-status-highrisk" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="grid gap-3 md:hidden">
              {listings.map((listing) => (
                <li key={listing.id} className="card p-4">
                  <div className="flex gap-3">
                    {listing.images?.[0] ? (
                      <img src={listing.images[0]} alt="" className="h-16 w-20 rounded-lg object-cover" loading="lazy" />
                    ) : (
                      <div className="h-16 w-20 rounded-lg bg-subtle" />
                    )}
                    <div className="min-w-0 flex-1">
                      <Link to={`/listings/${listing.id}`} className="line-clamp-2 text-sm font-semibold hover:text-primary">
                        {listing.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted">{formatPKR(listing.price)} / month</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge tone={listing.status === "active" ? "verified" : "suspicious"}>{listing.status}</Badge>
                        <TrustBadge ai={listing.ai} size="sm" showScore={false} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                    <Button to={`/landlord/listings/${listing.id}/edit`} size="sm" variant="outline">
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleStatus(listing)}>
                      {listing.status === "active" ? "Pause" : "Activate"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setToDelete(listing)}>
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Delete this listing?"
        description="Students will no longer see it. This cannot be undone from the dashboard."
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Keep listing
            </Button>
            <Button variant="danger" loading={busyId === toDelete?.id} onClick={confirmDelete}>
              Delete listing
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{toDelete?.title}</p>
      </Modal>
    </div>
  );
}
