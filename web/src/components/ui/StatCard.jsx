export default function StatCard({ label, value, hint, icon: Icon, tone = "primary" }) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    secondary: "bg-secondary-soft text-secondary",
    verified: "bg-status-verified/10 text-status-verified",
    suspicious: "bg-status-suspicious/10 text-status-suspicious",
    highrisk: "bg-status-highrisk/10 text-status-highrisk",
    info: "bg-status-info/10 text-status-info",
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 font-heading text-2xl font-bold">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.primary}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
    </div>
  );
}
