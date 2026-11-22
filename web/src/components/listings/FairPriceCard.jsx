import { Calculator, Info } from "lucide-react";

import { formatPKR } from "../../lib/format.js";

export default function FairPriceCard({ fairPrice }) {
  if (fairPrice?.min && fairPrice?.max) {
    return (
      <section className="card p-5" aria-labelledby="fair-price-heading">
        <h2 id="fair-price-heading" className="flex items-center gap-2 font-heading text-base font-semibold">
          <Calculator className="h-4 w-4 text-secondary" aria-hidden="true" />
          Fair price estimate
        </h2>
        <p className="mt-3 font-heading text-2xl font-semibold text-secondary">
          {formatPKR(fairPrice.min)} – {formatPKR(fairPrice.max)}
        </p>
        <p className="mt-2 text-sm text-muted">
          Based on similar rooms nearby. {fairPrice.flag ? <span className="font-medium">{fairPrice.flag}</span> : null}
        </p>
      </section>
    );
  }

  return (
    <section className="card border-dashed p-5" aria-labelledby="fair-price-heading">
      <h2 id="fair-price-heading" className="flex items-center gap-2 font-heading text-base font-semibold">
        <Calculator className="h-4 w-4 text-secondary" aria-hidden="true" />
        Fair price
      </h2>
      <p className="mt-2 text-sm text-muted">
        Our fair-price model is being trained in the next part of this project. It will compare this room with similar
        rooms near the same university and show a typical range.
      </p>
      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary-soft px-2.5 py-1 text-xs font-semibold text-secondary">
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
        Coming soon
      </p>
    </section>
  );
}
