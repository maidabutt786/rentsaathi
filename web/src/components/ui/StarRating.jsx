import { Star } from "lucide-react";

export function StarRating({ value = 0, max = 5, size = "md", className = "" }) {
  const dimension = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${value} out of ${max} stars`}>
      {Array.from({ length: max }).map((_, index) => (
        <Star
          key={index}
          className={`${dimension} ${index < Math.round(value) ? "fill-status-suspicious text-status-suspicious" : "text-line"}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange, label = "Your rating" }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const star = index + 1;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            onClick={() => onChange(star)}
            className="rounded-md p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Star
              className={`h-7 w-7 transition ${star <= value ? "fill-status-suspicious text-status-suspicious" : "text-line hover:text-status-suspicious"}`}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
