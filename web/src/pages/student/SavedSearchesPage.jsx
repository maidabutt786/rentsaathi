import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Search, Trash2 } from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { getSavedSearches, removeSavedSearch } from "../../lib/listingsApi.js";
import PageHeader from "../../components/layout/PageHeader.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";

export default function SavedSearchesPage() {
  useDocumentTitle("Saved searches");
  const { profile } = useAuth();
  const { push } = useToast();
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return undefined;
    getSavedSearches(profile.uid)
      .then(setSearches)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile?.uid]);

  const remove = async (search) => {
    try {
      await removeSavedSearch(profile.uid, search);
      setSearches((current) => current.filter((item) => item.id !== search.id));
      push("Saved search removed.", "success");
    } catch (error) {
      push(error.message || "Could not remove the search.", "error");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Student area"
        title="Saved searches"
        subtitle="Jump back to the filters you use most."
        actions={<Button to="/listings" size="sm" variant="outline"><Search className="h-4 w-4" aria-hidden="true" /> New search</Button>}
      />

      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-20 w-full" />
            <div className="skeleton h-20 w-full" />
          </div>
        ) : searches.length ? (
          <ul className="grid gap-3">
            {searches.map((search) => (
              <li key={search.id || search.query} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    <Bookmark className="h-4 w-4 text-primary" aria-hidden="true" />
                    {search.label || "Saved search"}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-muted">{search.query}</p>
                </div>
                <div className="flex gap-2">
                  <Button to={`/listings${search.query || ""}`} size="sm" variant="soft">
                    Open results
                  </Button>
                  <button
                    type="button"
                    onClick={() => remove(search)}
                    className="rounded-lg border border-line p-2 text-muted transition hover:border-status-highrisk/40 hover:text-status-highrisk"
                    aria-label="Delete saved search"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Bookmark}
            title="No saved searches"
            body="Run a search on the listings page and choose Save search to keep it here."
            action={
              <Button to="/listings" size="sm">
                Start searching
              </Button>
            }
          />
        )}
      </div>
      <p className="mt-5 text-xs text-muted">
        Saved searches are stored on your profile. You can remove them at any time from this page.
      </p>
      <p className="mt-2 text-xs text-muted">
        Looking for something else?{" "}
        <Link to="/student" className="font-semibold text-primary hover:underline">
          Back to your dashboard
        </Link>
      </p>
    </div>
  );
}
