import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, BrainCircuit, RefreshCw } from "lucide-react";

import { useDocumentTitle } from "../../hooks/useUi.js";
import { fetchAllListingsForAdmin, fetchAllUsers, fetchFlaggedQueue } from "../../lib/listingsApi.js";
import { fetchModelMetrics } from "../../lib/metrics.js";
import { formatNumber, formatPKR } from "../../lib/format.js";
import PageHeader from "../../components/layout/PageHeader.jsx";
import StatCard from "../../components/ui/StatCard.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";

const CHART = ["#A20224", "#764002", "#D9A066", "#E8B4BD", "#8C6D5A", "#2E7D32"];
const TOOLTIP = {
  contentStyle: { borderRadius: 12, border: "1px solid #EADFD8", fontSize: 12, color: "#2B1B14" },
  labelStyle: { fontWeight: 600 },
};
const AXIS = { tick: { fontSize: 11, fill: "#6B5B53" }, axisLine: { stroke: "#EADFD8" }, tickLine: false };

const monthKey = (value) => {
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export default function AnalyticsPage() {
  useDocumentTitle("Reports & analytics");
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [flags, setFlags] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchAllListingsForAdmin().catch(() => []),
      fetchAllUsers().catch(() => []),
      fetchFlaggedQueue().catch(() => []),
      fetchModelMetrics().catch(() => ({ available: false, mode: "bootstrap" })),
    ]).then(([listingItems, userItems, flagItems, modelMetrics]) => {
      setListings(listingItems);
      setUsers(userItems);
      setFlags(flagItems);
      setMetrics(modelMetrics);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const cityData = useMemo(() => {
    const map = new Map();
    listings.forEach((listing) => {
      const city = listing.city || "Unknown";
      const entry = map.get(city) || { city, count: 0, priceSum: 0, ppsfSum: 0, ppsfCount: 0, flagged: 0 };
      entry.count += 1;
      entry.priceSum += Number(listing.price || 0);
      if (listing.areaSqft) {
        entry.ppsfSum += Number(listing.price || 0) / Number(listing.areaSqft);
        entry.ppsfCount += 1;
      }
      if (listing.ai && listing.ai.fraudLabel !== "verified") entry.flagged += 1;
      map.set(city, entry);
    });
    return [...map.values()]
      .map((entry) => ({
        city: entry.city,
        count: entry.count,
        avgPrice: Math.round(entry.priceSum / entry.count),
        avgPpsf: entry.ppsfCount ? Math.round(entry.ppsfSum / entry.ppsfCount) : 0,
        flagged: entry.flagged,
      }))
      .sort((a, b) => b.count - a.count);
  }, [listings]);

  const timeline = useMemo(() => {
    const map = new Map();
    listings.forEach((listing) => {
      const key = monthKey(listing.createdAt);
      const entry = map.get(key) || { month: key, total: 0, flagged: 0 };
      entry.total += 1;
      if (listing.ai && listing.ai.fraudLabel !== "verified") entry.flagged += 1;
      map.set(key, entry);
    });
    return [...map.values()]
      .filter((entry) => entry.month !== "Unknown")
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((entry) => ({ ...entry, rate: entry.total ? Math.round((entry.flagged / entry.total) * 100) : 0 }));
  }, [listings]);

  const verdicts = useMemo(() => {
    const verified = listings.filter((listing) => listing.ai?.fraudLabel === "verified").length;
    const suspicious = listings.filter((listing) => listing.ai?.fraudLabel === "suspicious").length;
    const high = listings.filter((listing) => listing.ai?.fraudLabel === "high_risk").length;
    const analyzing = listings.filter((listing) => !listing.ai).length;
    return [
      { name: "Verified", value: verified, color: "#2E7D32" },
      { name: "Suspicious", value: suspicious, color: "#B7791F" },
      { name: "High risk", value: high, color: "#C62828" },
      { name: "Analyzing", value: analyzing, color: "#8C6D5A" },
    ].filter((item) => item.value > 0);
  }, [listings]);

  const totals = useMemo(() => {
    const flagged = listings.filter((listing) => listing.ai && listing.ai.fraudLabel !== "verified").length;
    const avgRent = listings.length
      ? Math.round(listings.reduce((sum, listing) => sum + Number(listing.price || 0), 0) / listings.length)
      : 0;
    return {
      listings: listings.length,
      users: users.length,
      flagged,
      flagRate: listings.length ? Math.round((flagged / listings.length) * 100) : 0,
      avgRent,
    };
  }, [listings, users]);

  const metricRows = useMemo(() => {
    if (!metrics?.available) return [];
    const source = metrics.metrics || metrics;
    const keys = ["accuracy", "precision", "recall", "f1", "f1_score", "roc_auc", "auc"];
    return keys
      .filter((key) => typeof source[key] === "number")
      .map((key) => ({ key, value: source[key] }));
  }, [metrics]);

  const confusion = metrics?.confusion_matrix || metrics?.metrics?.confusion_matrix;

  return (
    <div>
      <PageHeader
        eyebrow="Admin console"
        title="Reports & analytics"
        subtitle="Marketplace health and model performance. All charts use the RentSaathi brand palette."
        actions={
          <Button variant="outline" size="sm" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
          </Button>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Listings analysed" value={totals.listings} icon={BarChart3} />
        <StatCard label="Flagged listings" value={totals.flagged} hint={`${totals.flagRate}% of all listings`} icon={BrainCircuit} tone="suspicious" />
        <StatCard label="Average rent" value={formatPKR(totals.avgRent)} tone="secondary" />
        <StatCard label="Open flags" value={flags.length} hint={`${users.length} users`} tone="highrisk" />
      </div>

      {loading ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="skeleton h-72 w-full" />
          <div className="skeleton h-72 w-full" />
          <div className="skeleton h-72 w-full" />
          <div className="skeleton h-72 w-full" />
        </div>
      ) : listings.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={BarChart3} title="No data yet" body="Analytics appear after listings and users exist. Run the seed script to explore the dashboard." />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="font-heading text-base font-semibold">Listings per city</h2>
              <p className="mt-1 text-xs text-muted">Count of all listings, including paused.</p>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cityData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EADFD8" vertical={false} />
                    <XAxis dataKey="city" {...AXIS} />
                    <YAxis allowDecimals={false} {...AXIS} />
                    <Tooltip {...TOOLTIP} />
                    <Bar dataKey="count" name="Listings" fill={CHART[0]} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="card p-5">
              <h2 className="font-heading text-base font-semibold">Average rent per sqft</h2>
              <p className="mt-1 text-xs text-muted">Higher values mean students pay more for each square foot.</p>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cityData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EADFD8" vertical={false} />
                    <XAxis dataKey="city" {...AXIS} />
                    <YAxis {...AXIS} />
                    <Tooltip {...TOOLTIP} formatter={(value) => `Rs ${formatNumber(value)}`} />
                    <Bar dataKey="avgPpsf" name="Rs per sqft" fill={CHART[1]} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="card p-5">
              <h2 className="font-heading text-base font-semibold">Fraud-flag rate over time</h2>
              <p className="mt-1 text-xs text-muted">Share of listings flagged as suspicious or high risk, by month created.</p>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeline} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EADFD8" vertical={false} />
                    <XAxis dataKey="month" {...AXIS} />
                    <YAxis unit="%" domain={[0, 100]} {...AXIS} />
                    <Tooltip {...TOOLTIP} formatter={(value) => `${value}%`} />
                    <Line type="monotone" dataKey="rate" name="Flag rate" stroke={CHART[0]} strokeWidth={2.5} dot={{ r: 3, fill: CHART[0] }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="card p-5">
              <h2 className="font-heading text-base font-semibold">AI verdicts</h2>
              <p className="mt-1 text-xs text-muted">Current trust label on every listing.</p>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={verdicts} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {verdicts.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip {...TOOLTIP} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="card mt-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-base font-semibold">Model performance</h2>
                <p className="mt-1 text-xs text-muted">Read from the self-hosted AI service at GET /metrics.</p>
              </div>
              {metrics?.available ? (
                <Badge tone="verified">Trained model</Badge>
              ) : (
                <Badge tone="suspicious">Bootstrap mode</Badge>
              )}
            </div>

            {metrics?.available ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_260px]">
                <div>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {metricRows.map((row) => (
                      <div key={row.key} className="rounded-xl bg-subtle p-3">
                        <dt className="text-xs uppercase tracking-wide text-muted">{row.key.replace("_", " ")}</dt>
                        <dd className="mt-1 font-heading text-xl font-semibold">{(row.value * 100).toFixed(1)}%</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-xs text-muted">
                    Mode: {metrics.mode || "trained"}
                    {metrics.model_version ? ` · version ${metrics.model_version}` : ""}
                    {metrics.trained_at ? ` · trained ${metrics.trained_at}` : ""}
                  </p>
                </div>
                {Array.isArray(confusion) ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Confusion matrix</p>
                    <table className="mt-2 w-full text-center text-sm">
                      <tbody>
                        {confusion.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((value, columnIndex) => (
                              <td key={columnIndex} className="border border-line bg-subtle px-3 py-2 font-medium">
                                {value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-line bg-subtle p-5">
                <p className="font-semibold">No trained model yet — running bootstrap checks</p>
                <p className="mt-1 max-w-3xl text-sm text-muted">
                  The service is using pretrained CNN embeddings, perceptual hashing and a synthetic-data anomaly model.
                  There is no fine-tuned classifier, so we do not report accuracy or ROC-AUC here. After you collect a
                  dataset and run <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">python train.py</code>,
                  restart the service and this panel will show precision, recall, F1 and the confusion matrix.
                </p>
                {metrics?.error ? <p className="mt-2 text-xs text-muted">{metrics.error}</p> : null}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
