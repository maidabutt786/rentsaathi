import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { fetchVisitRequests, updateVisitRequest } from "../../lib/listingsApi.js";
import PageHeader from "../../components/layout/PageHeader.jsx";
import VisitList from "../../components/listings/VisitList.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";

export default function LandlordVisitsPage() {
  useDocumentTitle("Visit requests");
  const { profile } = useAuth();
  const { push } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const load = () => {
    if (!profile?.uid) return;
    setLoading(true);
    fetchVisitRequests({ uid: profile.uid, role: "landlord" })
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [profile?.uid]);

  const update = async (id, status) => {
    setUpdatingId(id);
    try {
      await updateVisitRequest(id, status);
      setRequests((current) => current.map((request) => (request.id === id ? { ...request, status } : request)));
      push(status === "accepted" ? "Visit accepted. The student can see it now." : "Visit declined.", "success");
    } catch (error) {
      push(error.message || "Could not update the request.", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Landlord area"
        title="Visit requests"
        subtitle="Accept a time only when you can be there. Students travel to see the room."
      />
      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-36 w-full" />
            <div className="skeleton h-36 w-full" />
          </div>
        ) : requests.length ? (
          <VisitList requests={requests} role="landlord" onUpdate={update} updatingId={updatingId} />
        ) : (
          <EmptyState
            icon={CalendarClock}
            title="No visit requests yet"
            body="When a student asks to see one of your rooms, the request appears here with their phone number."
          />
        )}
      </div>
    </div>
  );
}
