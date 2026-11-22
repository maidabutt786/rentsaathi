import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Info, Loader2, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";

import { AI_LABELS } from "../../lib/constants.js";
import { formatDate } from "../../lib/format.js";

const TONE = {
  verified: { text: "text-status-verified", bg: "bg-status-verified/10", ring: "stroke-status-verified", Icon: ShieldCheck },
  suspicious: { text: "text-status-suspicious", bg: "bg-status-suspicious/10", ring: "stroke-status-suspicious", Icon: ShieldAlert },
  highrisk: { text: "text-status-highrisk", bg: "bg-status-highrisk/10", ring: "stroke-status-highrisk", Icon: ShieldX },
  info: { text: "text-status-info", bg: "bg-status-info/10", ring: "stroke-status-info", Icon: Info },
};

export default function TrustPanel({ ai }) {
  const label = ai?.fraudLabel;
  const meta = AI_LABELS[label] || AI_LABELS.analyzing;
  const tone = TONE[meta.tone] || TONE.info;
  const Icon = tone.Icon;
  const score = typeof ai?.fraudScore === "number" ? Math.round(ai.fraudScore) : null;
  const circumference = 2 * Math.PI * 34;

  return (
    <section className="card overflow-hidden" aria-labelledby="trust-heading">
      <div className="border-b border-line bg-subtle px-5 py-4">
        <h2 id="trust-heading" className="font-heading text-base font-semibold">
          AI trust check
        </h2>
        <p className="mt-1 text-xs text-muted">Photo reuse and listing-detail checks run on our own server.</p>
      </div>

      <div className="p-5">
        {!ai ? (
          <div className="flex items-start gap-3">
            <div className={`rounded-xl p-2.5 ${TONE.info.bg}`}>
              <Loader2 className="h-5 w-5 animate-spin text-status-info" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold">Analyzing this listing…</p>
              <p className="mt-1 text-sm text-muted">
                The photos are being compared with our image index. This usually takes a few seconds after a listing is
                saved.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90" aria-hidden="true">
                  <circle cx="40" cy="40" r="34" fill="none" strokeWidth="8" className="stroke-line" />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (Math.min(100, Math.max(0, score ?? 0)) / 100) * circumference}
                    className={tone.ring}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-xl font-bold ${tone.text}`}>{score}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted">of 100</span>
                </div>
              </div>
              <div className="min-w-0">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${tone.bg} ${tone.text}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {meta.label}
                </span>
                <p className="mt-2 text-sm text-muted">{meta.description}</p>
              </div>
            </div>

            {ai.duplicateOf ? (
              <div className="mt-4 rounded-xl border border-status-highrisk/25 bg-status-highrisk/5 p-3 text-sm">
                <p className="font-semibold text-status-highrisk">Similar photo found in another listing</p>
                <p className="mt-1 text-muted">
                  Match: <span className="font-mono text-xs">{ai.duplicateOf}</span> · similarity{" "}
                  {Math.round((ai.duplicateSimilarity || 0) * 100)}%
                </p>
              </div>
            ) : null}

            <h3 className="mt-5 text-sm font-semibold">What our checks found</h3>
            <ul className="mt-2 space-y-2">
              {(ai.reasons || []).map((reason) => (
                <li key={reason} className="flex items-start gap-2 text-sm text-muted">
                  {label === "verified" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-verified" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${tone.text}`} aria-hidden="true" />
                  )}
                  <span>{reason}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs">
              <div>
                <dt className="text-muted">Check mode</dt>
                <dd className="mt-0.5 font-medium">
                  {ai.mode === "trained" ? "Trained model" : "Bootstrap checks"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Analyzed</dt>
                <dd className="mt-0.5 font-medium">{formatDate(ai.analyzedAt)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted">Model version</dt>
                <dd className="mt-0.5 break-all font-mono text-[11px]">{ai.modelVersion || "—"}</dd>
              </div>
            </dl>
          </>
        )}

        <p className="mt-5 rounded-xl bg-subtle p-3 text-xs leading-relaxed text-muted">
          AI checks help you spot reused photos and unusual prices, but they are not a guarantee. Always visit the room
          and never pay before you see it.{" "}
          <Link to="/safety" className="font-semibold text-primary hover:underline">
            Read the safety guide
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
