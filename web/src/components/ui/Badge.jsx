const TONES = {
  neutral: "border-line bg-subtle text-muted",
  primary: "border-primary/20 bg-primary-soft text-primary",
  secondary: "border-secondary/20 bg-secondary-soft text-secondary",
  verified: "border-status-verified/25 bg-status-verified/10 text-status-verified",
  suspicious: "border-status-suspicious/25 bg-status-suspicious/10 text-status-suspicious",
  highrisk: "border-status-highrisk/25 bg-status-highrisk/10 text-status-highrisk",
  info: "border-status-info/25 bg-status-info/10 text-status-info",
};

export default function Badge({ children, tone = "neutral", icon: Icon, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${TONES[tone] || TONES.neutral} ${className}`}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export { TONES as BADGE_TONES };
