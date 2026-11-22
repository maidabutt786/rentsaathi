import { useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck, UserX } from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { fetchAllUsers, setUserRole, suspendUser, setUserVerification } from "../../lib/listingsApi.js";
import { formatDate } from "../../lib/format.js";
import PageHeader from "../../components/layout/PageHeader.jsx";
import Avatar from "../../components/ui/Avatar.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { TableSkeleton } from "../../components/ui/Skeletons.jsx";

const ROLES = ["student", "landlord", "admin"];

export default function UsersPage() {
  useDocumentTitle("User management");
  const { profile } = useAuth();
  const { push } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [busyUid, setBusyUid] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    fetchAllUsers()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(
    () =>
      users
        .filter((user) => (roleFilter ? user.role === roleFilter : true))
        .filter((user) => {
          if (!query) return true;
          return `${user.name} ${user.email} ${user.phone}`.toLowerCase().includes(query.toLowerCase());
        }),
    [users, roleFilter, query],
  );

  const updateLocal = (uid, changes) => {
    setUsers((current) => current.map((user) => (user.uid === uid ? { ...user, ...changes } : user)));
  };

  const changeRole = async (user, role) => {
    if (user.uid === profile?.uid) {
      push("You cannot change your own admin role.", "warning");
      return;
    }
    setBusyUid(user.uid);
    try {
      await setUserRole(user.uid, role);
      updateLocal(user.uid, { role });
      push(`${user.name} is now a ${role}.`, "success");
    } catch (error) {
      push(error.message || "Could not change the role.", "error");
    } finally {
      setBusyUid(null);
    }
  };

  const approve = async (user) => {
    setBusyUid(user.uid);
    try {
      await setUserVerification(user.uid, "approved");
      updateLocal(user.uid, { verificationStatus: "approved" });
      push(`${user.name} is verified.`, "success");
    } catch (error) {
      push(error.message || "Could not verify the user.", "error");
    } finally {
      setBusyUid(null);
    }
  };

  const toggleSuspension = async () => {
    if (!confirm) return;
    setBusyUid(confirm.uid);
    try {
      await suspendUser(confirm.uid, !confirm.suspended);
      updateLocal(confirm.uid, { suspended: !confirm.suspended });
      push(confirm.suspended ? "Account restored." : "Account suspended.", "success");
      setConfirm(null);
    } catch (error) {
      push(error.message || "Could not update the account.", "error");
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Admin console" title="Users" subtitle="Search accounts, verify landlords and suspend unsafe users." />

      <div className="mt-5 flex flex-wrap gap-3">
        <label className="relative flex-1 sm:max-w-sm">
          <span className="sr-only">Search users</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or phone" className="input-base pl-9" />
        </label>
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="input-base max-w-[170px]">
          <option value="">All roles</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : visible.length === 0 ? (
          <EmptyState icon={Search} title="No users found" body="Try a different name or clear the role filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-1">User</th>
                  <th className="px-3 py-1">Role</th>
                  <th className="px-3 py-1">Verification</th>
                  <th className="px-3 py-1">Joined</th>
                  <th className="px-3 py-1 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((user) => (
                  <tr key={user.uid} className="bg-surface shadow-sm [&>td]:border-y [&>td]:border-line [&>td]:px-3 [&>td]:py-3 [&>td:first-child]:rounded-l-xl [&>td:first-child]:border-l [&>td:last-child]:rounded-r-xl [&>td:last-child]:border-r">
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} size={36} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {user.name} {user.uid === profile?.uid ? <span className="text-xs text-muted">(you)</span> : null}
                          </p>
                          <p className="truncate text-xs text-muted">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <select
                        value={user.role}
                        disabled={busyUid === user.uid || user.uid === profile?.uid}
                        onChange={(event) => changeRole(user, event.target.value)}
                        className="rounded-lg border border-line bg-surface px-2 py-1 text-xs font-medium"
                        aria-label={`Role for ${user.name}`}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <Badge
                        tone={
                          user.verificationStatus === "approved"
                            ? "verified"
                            : user.verificationStatus === "rejected"
                              ? "highrisk"
                              : "suspicious"
                        }
                      >
                        {user.verificationStatus || "pending"}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap text-muted">{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {user.role === "landlord" && user.verificationStatus !== "approved" ? (
                          <Button size="sm" variant="soft" loading={busyUid === user.uid} onClick={() => approve(user)}>
                            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verify
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant={user.suspended ? "outline" : "danger-outline"}
                          disabled={user.uid === profile?.uid}
                          onClick={() => setConfirm(user)}
                        >
                          <UserX className="h-3.5 w-3.5" aria-hidden="true" /> {user.suspended ? "Restore" : "Suspend"}
                        </Button>
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
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.suspended ? "Restore this account?" : "Suspend this account?"}
        description={
          confirm?.suspended
            ? "The user will be able to sign in and use dashboards again."
            : "The user will be blocked from dashboards and messaging. Their active listings will be paused and hidden from students."
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant={confirm?.suspended ? "primary" : "danger"} loading={busyUid === confirm?.uid} onClick={toggleSuspension}>
              {confirm?.suspended ? "Restore account" : "Suspend account"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {confirm?.name} · {confirm?.email}
        </p>
      </Modal>
    </div>
  );
}
