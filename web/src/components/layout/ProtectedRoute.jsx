import { Navigate, useLocation } from "react-router-dom";
import { ShieldX } from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { PageLoader } from "../ui/Spinner.jsx";
import Button from "../ui/Button.jsx";
import EmptyState from "../ui/EmptyState.jsx";

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Checking your account…" />;

  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (profile?.suspended) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={ShieldX}
          title="This account is suspended"
          body="Contact support if you think this is a mistake. For everyone's safety, suspended accounts cannot use dashboards or messaging."
          action={<Button to="/contact">Contact support</Button>}
        />
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={ShieldX}
          title="You do not have access to this page"
          body="This area is restricted to a different account type. If you think this is a mistake, contact the RentSaathi team."
          action={<Button to="/">Go to the home page</Button>}
        />
      </div>
    );
  }

  return children ?? null;
}
