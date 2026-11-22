import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, Home, X } from "lucide-react";

export default function ImageGallery({ images = [], title = "Listing" }) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const count = images.length;

  useEffect(() => {
    if (!lightbox) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setLightbox(false);
      if (event.key === "ArrowRight") setIndex((value) => (value + 1) % count);
      if (event.key === "ArrowLeft") setIndex((value) => (value - 1 + count) % count);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, count]);

  if (count === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-line bg-subtle text-muted">
        <Home className="mr-2 h-6 w-6" aria-hidden="true" /> Photos coming soon
      </div>
    );
  }

  const go = (delta) => setIndex((value) => (value + delta + count) % count);

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-subtle">
        <img
          src={images[index]}
          alt={`${title} — photo ${index + 1} of ${count}`}
          className="h-[300px] w-full object-cover sm:h-[420px]"
        />
        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-surface/90 p-2 text-ink shadow-sm transition hover:bg-surface"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-surface/90 p-2 text-ink shadow-sm transition hover:bg-surface"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-surface/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-sm"
        >
          <Expand className="h-3.5 w-3.5" aria-hidden="true" /> View larger
        </button>
        <span className="absolute bottom-3 left-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-medium text-white">
          {index + 1} / {count}
        </span>
      </div>

      {count > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {images.map((image, position) => (
            <button
              key={`${image}-${position}`}
              type="button"
              onClick={() => setIndex(position)}
              className={`overflow-hidden rounded-lg border-2 transition ${
                position === index ? "border-primary" : "border-transparent opacity-80 hover:opacity-100"
              }`}
              aria-label={`Show photo ${position + 1}`}
              aria-current={position === index}
            >
              <img src={image} alt="" className="h-16 w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}

      {lightbox ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/90 p-4" role="dialog" aria-modal="true" aria-label="Photo viewer">
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute right-4 top-4 rounded-full bg-surface/20 p-2 text-white transition hover:bg-surface/30"
            aria-label="Close photo viewer"
          >
            <X className="h-6 w-6" />
          </button>
          <img src={images[index]} alt={`${title} — enlarged photo ${index + 1}`} className="max-h-[88vh] max-w-full rounded-xl object-contain" />
          {count > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-surface/20 p-3 text-white transition hover:bg-surface/30"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-surface/20 p-3 text-white transition hover:bg-surface/30"
                aria-label="Next photo"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
