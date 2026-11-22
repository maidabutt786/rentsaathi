export function ListingCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton h-52 w-full rounded-none" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-5 w-4/5" />
        <div className="skeleton h-4 w-2/3" />
        <div className="flex gap-2 pt-2">
          <div className="skeleton h-8 w-20" />
          <div className="skeleton h-8 w-20" />
        </div>
      </div>
    </div>
  );
}

export function ListingGridSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <ListingCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton h-14 w-full" />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="container-page py-10" aria-hidden="true">
      <div className="skeleton h-8 w-2/3" />
      <div className="mt-4 skeleton h-5 w-1/3" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="skeleton h-96 w-full" />
        <div className="space-y-4">
          <div className="skeleton h-32 w-full" />
          <div className="skeleton h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
