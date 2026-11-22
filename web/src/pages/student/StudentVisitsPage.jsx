import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { fetchVisitRequests } from "../../lib/listingsApi.js";
import PageHeader from "../../components/layout/PageHeader.jsx";
import VisitList from "../../components/listings/VisitList.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Button from "../../components/ui/Button.jsx";

export default function StudentVisitsPage() {
  useDocumentTitle("My visit requests");
  const { profile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return undefined;
    let cancelled = false;
    fetchVisitRequests({ uid: profile.uid, role: "student" })
      .then((items) => {
        if (!cancelled) setRequests(items);
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
        title="My visit requests"
        subtitle="Track every viewing you asked for. The landlord can accept or decline in their dashboard."
      />
      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-36 w-full" />
            <div className="skeleton h-36 w-full" />
          </div>
        ) : requests.length ? (
          <VisitList requests={requests} role="student" />
        ) : (
          <EmptyState
            icon={CalendarClock}
            title="No visit requests yet"
            body="Open a room you like and use the Request a visit form. Always visit before paying."
            action={<Button to="/listings">Find a room</Button>}
          />
        )}
      </div>
    </div>
  );
}
