import { Loader2, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";

import { AI_LABELS } from "../../lib/constants.js";

const STYLES = {
  verified: "border-status-verified/30 bg-status-verified/10 text-status-verified",
  suspicious: "border-status-suspicious/30 bg-status-suspicious/10 text-status-suspicious",
  highrisk: "border-status-highrisk/30 bg-status-highrisk/10 text-status-highrisk",
  info: "border-status-info/30 bg-status-info/10 text-status-info",
};

const ICONS = {
  verified: ShieldCheck,
  suspicious: ShieldAlert,
  highrisk: ShieldX,
};

export default function TrustBadge({ ai, size = "md", showScore = true, className = "" }) {
  const label = ai?.fraudLabel;
  const meta = AI_LABELS[label] || AI_LABELS.analyzing;
  const Icon = label ? ICONS[label] || ShieldAlert : Loader2;
  const tone = meta.tone;
  const dimension = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const score = typeof ai?.fraudScore === "number" ? Math.round(ai.fraudScore) : null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${STYLES[tone]} ${dimension} ${className}`}
      aria-label={`AI trust status: ${meta.label}${score !== null && showScore ? `, fraud score ${score} out of 100` : ""}`}
    >
      <Icon className={`${iconSize} ${!label ? "animate-spin" : ""}`} aria-hidden="true" />
      <span>{meta.label}</span>
      {showScore && score !== null ? <span className="font-normal opacity-80">· {score}/100</span> : null}
    </span>
  );
}
