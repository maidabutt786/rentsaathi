import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Flag, RefreshCw, ShieldAlert, Trash2, UserX } from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { fetchFlaggedQueue, resolveFlag, rerunAnalysis } from "../../lib/listingsApi.js";
import { formatPKR } from "../../lib/format.js";
import PageHeader from "../../components/layout/PageHeader.jsx";
import TrustBadge from "../../components/listings/TrustBadge.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Modal from "../../components/ui/Modal.jsx";

const TABS = [
  { value: "all", label: "All open" },
  { value: "high_risk", label: "High risk" },
  { value: "suspicious", label: "Suspicious" },
];

export default function FlaggedListingsPage() {
  useDocumentTitle("Flagged listings");
  const { profile } = useAuth();
  const { push } = useToast();
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = () => {
    setLoading(true);
    fetchFlaggedQueue()
      .then(setFlags)
      .catch((error) => push(error.message || "Could not load flags.", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const visible = useMemo(
    () => (tab === "all" ? flags : flags.filter((flag) => flag.fraudLabel === tab)),
    [flags, tab],
  );

  const act = async (flag, action) => {
    setBusyId(flag.id);
    try {
      await resolveFlag(flag, action, profile?.uid);
      setFlags((current) => current.filter((item) => item.id !== flag.id));
      const messages = {
        approve: "Listing approved and removed from the queue.",
        remove: "Listing removed from the public site.",
        suspend: "Owner suspended and listing removed.",
      };
      push(messages[action], "success");
      setConfirm(null);
    } catch (error) {
      push(error.message || "Could not complete the action.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const rerun = async (flag) => {
    setBusyId(flag.id);
    try {
      await rerunAnalysis(flag.listingId);
      push("Re-analysis requested. Refresh in a few seconds to see the new verdict.", "info");
    } catch (error) {
      push(error.message || "Could not request re-analysis.", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Admin console"
        title="Flagged listings"
        subtitle="Compare the listing with the matched duplicate, read the reasons, then decide."
        actions={
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
          </Button>
        }
      />

      <div className="mt-5 inline-flex rounded-xl border border-line bg-surface p-1" role="tablist" aria-label="Flag severity">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => setTab(item.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tab === item.value ? "bg-primary text-white" : "text-muted hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-4">
            <div className="skeleton h-64 w-full" />
            <div className="skeleton h-64 w-full" />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Flag}
            title="No open flags"
            body="Every flagged listing has been reviewed. New AI flags will appear here automatically."
            action={<Button to="/admin" size="sm" variant="outline">Back to overview</Button>}
          />
        ) : (
          <ul className="grid gap-5">
            {visible.map((flag) => (
              <li key={flag.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-subtle px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <TrustBadge ai={{ fraudLabel: flag.fraudLabel, fraudScore: flag.fraudScore }} />
                    <Badge tone="neutral">{flag.listing?.city || flag.city}</Badge>
                    <Badge tone="neutral">Owner: {flag.ownerId}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" loading={busyId === flag.id} onClick={() => rerun(flag)}>
                      <RefreshCw className="h-4 w-4" aria-hidden="true" /> Re-run AI
                    </Button>
                    <Button size="sm" onClick={() => act(flag, "approve")} loading={busyId === flag.id}>
                      Approve
                    </Button>
                    <Button size="sm" variant="danger-outline" onClick={() => setConfirm({ flag, action: "remove" })}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setConfirm({ flag, action: "suspend" })}>
                      <UserX className="h-4 w-4" aria-hidden="true" /> Suspend owner
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 p-5 lg:grid-cols-2">
                  <div className="rounded-xl border border-line p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-status-highrisk">Flagged listing</p>
                      <Link to={`/listings/${flag.listingId}`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        Open <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    </div>
                    {flag.images?.length ? (
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        {flag.images.slice(0, 3).map((image, index) => (
                          <img key={`${image}-${index}`} src={image} alt={`Flagged listing photo ${index + 1}`} className="h-20 w-full rounded-lg object-cover" loading="lazy" />
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 flex h-20 items-center justify-center rounded-lg bg-subtle text-xs text-muted">No photos</div>
                    )}
                    <p className="mt-2 text-sm font-semibold">{flag.listing?.title || flag.title || flag.listingId}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {flag.listing?.price ? `${formatPKR(flag.listing.price)} / month · ` : ""}
                      {flag.listing?.address || ""}
                    </p>
                  </div>

                  <div className="rounded-xl border border-line p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Matched duplicate</p>
                      {flag.duplicate ? (
                        <Link to={`/listings/${flag.duplicate.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                          Open <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      ) : null}
                    </div>
                    {flag.duplicate?.images?.length ? (
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        {flag.duplicate.images.slice(0, 3).map((image, index) => (
                          <img key={`${image}-${index}`} src={image} alt={`Duplicate listing photo ${index + 1}`} className="h-20 w-full rounded-lg object-cover" loading="lazy" />
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 flex h-20 items-center justify-center rounded-lg bg-subtle text-xs text-muted">
                        No duplicate match stored
                      </div>
                    )}
                    <p className="mt-2 text-sm font-semibold">{flag.duplicate?.title || "No duplicate found"}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {flag.duplicate ? `${flag.duplicate.city} · ${flag.duplicate.ownerName || ""}` : "The flag was raised by price or metadata signals."}
                    </p>
                  </div>
                </div>

                <div className="border-t border-line px-5 py-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldAlert className="h-4 w-4 text-status-highrisk" aria-hidden="true" /> Reasons
                  </p>
                  <ul className="mt-2 grid gap-1.5 text-sm text-muted sm:grid-cols-2">
                    {(flag.reasons || flag.listing?.ai?.reasons || []).map((reason) => (
                      <li key={reason}>• {reason}</li>
                    ))}
                  </ul>
                  {flag.duplicateOf ? (
                    <p className="mt-2 text-xs text-muted">
                      Duplicate listing id: <span className="font-mono">{flag.duplicateOf}</span>
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.action === "suspend" ? "Suspend this owner?" : "Remove this listing?"}
        description={
          confirm?.action === "suspend"
            ? "The owner will not be able to sign in to dashboards or manage listings. Their listings will be removed from public view."
            : "The listing will be removed from the public site. The owner keeps their account."
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busyId === confirm?.flag?.id}
              onClick={() => act(confirm.flag, confirm.action)}
            >
              {confirm?.action === "suspend" ? "Suspend owner" : "Remove listing"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{confirm?.flag?.listing?.title || confirm?.flag?.title}</p>
      </Modal>
    </div>
  );
}
