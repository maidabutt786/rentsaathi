import { Loader2 } from "lucide-react";

export default function Spinner({ label = "Loading", className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 text-sm text-muted ${className}`} role="status">
      <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function PageLoader({ label = "Loading RentSaathi…" }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}
