import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BookmarkPlus, List, Map as MapIcon, Search, SlidersHorizontal } from "lucide-react";

import { useDocumentTitle, useDebouncedValue } from "../../hooks/useUi.js";
import { fetchListings, saveSearch } from "../../lib/listingsApi.js";
import { UNIVERSITIES } from "../../lib/constants.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import ListingCard from "../../components/listings/ListingCard.jsx";
import ListingFilters, { EMPTY_FILTERS } from "../../components/listings/ListingFilters.jsx";
import MapView from "../../components/map/MapView.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { ListingGridSkeleton } from "../../components/ui/Skeletons.jsx";

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Lowest rent" },
  { value: "price_desc", label: "Highest rent" },
  { value: "distance", label: "Closest to campus" },
  { value: "popular", label: "Most viewed" },
];

export default function ListingsPage() {
  useDocumentTitle("Find a room");
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { push } = useToast();

  const [keyword, setKeyword] = useState(() => searchParams.get("keyword") || "");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [filters, setFilters] = useState(() => ({
    ...EMPTY_FILTERS,
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    roomType: searchParams.get("roomType") || "",
    genderRule: searchParams.get("genderRule") || "",
    universityId: searchParams.get("universityId") || "",
    maxDistance: searchParams.get("maxDistance") || "",
  }));
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [page, setPage] = useState(1);
  const [view, setView] = useState("list");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [data, setData] = useState({ items: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedKeyword) params.set("keyword", debouncedKeyword);
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== undefined && value !== null) params.set(key, value);
    });
    if (sort !== "newest") params.set("sort", sort);
    return params.toString();
  }, [debouncedKeyword, filters, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchListings({ filters: { ...filters, keyword: debouncedKeyword }, sort, page });
      setData(result);
    } catch (err) {
      setError(err.message || "Could not load listings.");
    } finally {
      setLoading(false);
    }
  }, [debouncedKeyword, filters, page, sort]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, filters, sort]);

  const updateFilters = (next) => {
    setFilters(next);
    setPage(1);
  };

  const clearAll = () => {
    setKeyword("");
    setFilters(EMPTY_FILTERS);
    setSort("newest");
  };

  const saveCurrentSearch = async () => {
    if (!profile || profile.role !== "student") {
      push("Log in as a student to save a search.", "info");
      return;
    }
    const university = UNIVERSITIES.find((item) => item.id === filters.universityId)?.name;
    const label = [university || "All universities", filters.maxPrice ? `under Rs ${filters.maxPrice}` : null]
      .filter(Boolean)
      .join(" · ");
    try {
      await saveSearch(profile.uid, {
        label,
        query: `?${queryString}`,
        createdAt: new Date().toISOString(),
      });
      push("Search saved. Open it from your student dashboard.", "success");
    } catch (err) {
      push(err.message || "Could not save this search.", "error");
    }
  };

  const activeFilterCount = Object.values(filters).filter((value) => value !== "" && value !== undefined).length;

  return (
    <div className="container-page py-8 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Find a room</h1>
          <p className="mt-1 text-sm text-muted">
            {loading ? "Searching…" : `${data.total} room${data.total === 1 ? "" : "s"} match your search`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={saveCurrentSearch}>
            <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
            Save search
          </Button>
          <div className="inline-flex rounded-xl border border-line bg-surface p-1" role="group" aria-label="View mode">
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                view === "list" ? "bg-primary text-white" : "text-muted hover:text-ink"
              }`}
            >
              <List className="h-3.5 w-3.5" aria-hidden="true" /> List
            </button>
            <button
              type="button"
              onClick={() => setView("map")}
              aria-pressed={view === "map"}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                view === "map" ? "bg-primary text-white" : "text-muted hover:text-ink"
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" aria-hidden="true" /> Map
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search rooms</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search by area, city, landlord or university"
            className="input-base pl-9"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((value) => !value)}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium text-ink lg:hidden"
            aria-expanded={showFilters}
          >
            <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
            Filters
            {activeFilterCount ? (
              <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-white">{activeFilterCount}</span>
            ) : null}
          </button>
          <label className="flex-1 sm:flex-none">
            <span className="sr-only">Sort listings</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="input-base min-w-[170px]">
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 grid gap-7 lg:grid-cols-[280px_1fr]">
        <div className={`${showFilters ? "block" : "hidden"} lg:block`}>
          <ListingFilters filters={filters} onChange={updateFilters} onClear={clearAll} resultCount={data.total} />
        </div>

        <div className="min-w-0">
          {error ? (
            <div className="card border-status-highrisk/30 p-6">
              <h2 className="font-semibold text-status-highrisk">Listings could not load</h2>
              <p className="mt-1 text-sm text-muted">{error}</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={load}>
                Try again
              </Button>
            </div>
          ) : loading ? (
            <ListingGridSkeleton count={6} />
          ) : data.items.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No rooms match your filters yet"
              body="Try a higher rent limit, a wider distance, or clear the university filter. New rooms are added every week."
              action={
                <Button onClick={clearAll} variant="primary" size="sm">
                  Clear all filters
                </Button>
              }
            />
          ) : view === "map" ? (
            <div>
              <MapView listings={data.items} selectedId={selectedId} onSelect={setSelectedId} height={480} />
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {data.items.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {data.items.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {!loading && !error ? <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} /> : null}
        </div>
      </div>
    </div>
  );
}
