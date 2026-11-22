import { useEffect, useMemo, useState } from "react";
import { FileText, Search, ShieldCheck, UserCheck, UserX } from "lucide-react";

import { useToast } from "../../context/ToastContext.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { fetchAllUsers, setUserVerification } from "../../lib/listingsApi.js";
import { formatDate } from "../../lib/format.js";
import PageHeader from "../../components/layout/PageHeader.jsx";
import Avatar from "../../components/ui/Avatar.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Modal from "../../components/ui/Modal.jsx";

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function VerificationQueuePage() {
  useDocumentTitle("Verification queue");
  const { push } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [query, setQuery] = useState("");
  const [busyUid, setBusyUid] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    fetchAllUsers()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const landlords = useMemo(
    () =>
      users
        .filter((user) => user.role === "landlord")
        .filter((user) => (tab === "pending" ? user.verificationStatus !== "approved" && user.verificationStatus !== "rejected" : user.verificationStatus === tab))
        .filter((user) => {
          if (!query) return true;
          const haystack = `${user.name} ${user.email} ${user.phone}`.toLowerCase();
          return haystack.includes(query.toLowerCase());
        }),
    [users, tab, query],
  );

  const decide = async (user, status) => {
    setBusyUid(user.uid);
    try {
      await setUserVerification(user.uid, status);
      setUsers((current) => current.map((item) => (item.uid === user.uid ? { ...item, verificationStatus: status } : item)));
      push(status === "approved" ? `${user.name} is now verified.` : `${user.name}'s verification was rejected.`, "success");
      setConfirm(null);
    } catch (error) {
      push(error.message || "Could not update verification.", "error");
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Admin console"
        title="Landlord verification"
        subtitle="Check that the CNIC name matches the account and the ownership document matches the listing."
      />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-line bg-surface p-1" role="tablist" aria-label="Verification status">
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
        <label className="relative flex-1 sm:max-w-xs">
          <span className="sr-only">Search landlords</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" className="input-base pl-9" />
        </label>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-40 w-full" />
            <div className="skeleton h-40 w-full" />
          </div>
        ) : landlords.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={`No ${tab} landlords`}
            body="When a landlord submits documents, the account appears here for review."
          />
        ) : (
          <ul className="grid gap-4">
            {landlords.map((user) => (
              <li key={user.uid} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={user.name} size={48} />
                    <div>
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm text-muted">{user.email}</p>
                      <p className="text-sm text-muted">{user.phone || "No phone"}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge tone={user.verificationStatus === "approved" ? "verified" : user.verificationStatus === "rejected" ? "highrisk" : "suspicious"}>
                          {user.verificationStatus || "pending"}
                        </Badge>
                        <Badge tone="neutral">Joined {formatDate(user.createdAt)}</Badge>
                        {user.suspended ? <Badge tone="highrisk">Suspended</Badge> : null}
                      </div>
                    </div>
                  </div>
                  {user.verificationStatus !== "approved" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" loading={busyUid === user.uid} onClick={() => decide(user, "approved")}>
                        <UserCheck className="h-4 w-4" aria-hidden="true" /> Approve
                      </Button>
                      <Button size="sm" variant="danger-outline" onClick={() => setConfirm({ user, status: "rejected" })}>
                        <UserX className="h-4 w-4" aria-hidden="true" /> Reject
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setConfirm({ user, status: "rejected" })}>
                      Revoke verification
                    </Button>
                  )}
                </div>

                <div className="mt-4 rounded-xl bg-subtle p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Documents</p>
                  {user.documents?.length ? (
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                      {user.documents.map((document, index) => (
                        <li key={`${document}-${index}`} className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
                          <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                          {document.startsWith("http") ? (
                            <a href={document} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">
                              Open document {index + 1}
                            </a>
                          ) : (
                            <span className="truncate">{document}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-muted">No documents uploaded yet.</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.status === "approved" ? "Approve this landlord?" : "Reject this verification?"}
        description="The landlord will see the new status in their dashboard."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={confirm?.status === "approved" ? "primary" : "danger"}
              loading={busyUid === confirm?.user?.uid}
              onClick={() => decide(confirm.user, confirm.status)}
            >
              {confirm?.status === "approved" ? "Approve landlord" : "Reject verification"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{confirm?.user?.name} · {confirm?.user?.email}</p>
        <p className="mt-2 text-sm text-muted">
          {confirm?.status === "approved"
            ? "A Verified landlord badge will appear on their listings."
            : "They can upload clearer documents and submit again."}
        </p>
      </Modal>
    </div>
  );
}
