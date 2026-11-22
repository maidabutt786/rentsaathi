import { useMemo } from "react";
import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from "@react-google-maps/api";
import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";

import { googleMapsKey } from "../../lib/firebase.js";
import { formatPKR } from "../../lib/format.js";

const CONTAINER_STYLE = { width: "100%", height: "100%" };

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: true,
  clickableIcons: false,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#faf6f3" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#6b5b53" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#fffcf8" }] },
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#dce8ea" }] },
  ],
};

const PIN_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48"><path fill="#A20224" d="M20 0C8.95 0 0 8.95 0 20c0 15 20 28 20 28s20-13 20-28C40 8.95 31.05 0 20 0z"/><circle cx="20" cy="19" r="7" fill="#fff"/></svg>`,
);

function markerIcon() {
  if (typeof window === "undefined" || !window.google) return undefined;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${PIN_SVG}`,
    scaledSize: new window.google.maps.Size(32, 38),
    anchor: new window.google.maps.Point(16, 38),
  };
}

function GoogleMapCanvas({ listings, selectedId, onSelect, height }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "rentsaathi-google-maps",
    googleMapsApiKey: googleMapsKey,
  });
  const center = useMemo(() => {
    if (listings.length === 0) return { lat: 30.3753, lng: 69.3451 };
    if (listings.length === 1) return listings[0].location;
    const lat = listings.reduce((sum, item) => sum + Number(item.location?.lat || 0), 0) / listings.length;
    const lng = listings.reduce((sum, item) => sum + Number(item.location?.lng || 0), 0) / listings.length;
    return { lat, lng };
  }, [listings]);

  if (loadError) return <MapFallback listings={listings} selectedId={selectedId} onSelect={onSelect} height={height} error />;
  if (!isLoaded) {
    return (
      <div style={{ height }} className="flex items-center justify-center rounded-2xl border border-line bg-subtle text-sm text-muted">
        Loading map…
      </div>
    );
  }

  const selected = listings.find((listing) => listing.id === selectedId);

  return (
    <GoogleMap
      mapContainerStyle={CONTAINER_STYLE}
      mapContainerClassName="rounded-2xl overflow-hidden"
      center={center}
      zoom={listings.length === 1 ? 15 : 11}
      options={MAP_OPTIONS}
    >
      {listings.map((listing) =>
        listing.location ? (
          <Marker
            key={listing.id}
            position={listing.location}
            icon={markerIcon()}
            title={listing.title}
            onClick={() => onSelect?.(listing.id)}
          />
        ) : null,
      )}
      {selected ? (
        <InfoWindow position={selected.location} onCloseClick={() => onSelect?.(null)}>
          <div className="max-w-[220px] p-1">
            <p className="text-sm font-semibold text-ink">{selected.title}</p>
            <p className="mt-1 text-sm font-semibold text-primary">{formatPKR(selected.price)} / month</p>
            <Link to={`/listings/${selected.id}`} className="mt-1 inline-block text-xs font-semibold text-primary underline">
              View listing
            </Link>
          </div>
        </InfoWindow>
      ) : null}
    </GoogleMap>
  );
}

function MapFallback({ listings, selectedId, onSelect, height, error = false }) {
  const points = useMemo(() => {
    if (listings.length === 0) return [];
    const lats = listings.map((item) => Number(item.location?.lat || 0));
    const lngs = listings.map((item) => Number(item.location?.lng || 0));
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return listings.map((listing) => ({
      listing,
      x: 12 + ((Number(listing.location?.lng || 0) - minLng) / Math.max(0.0001, maxLng - minLng)) * 76,
      y: 12 + ((maxLat - Number(listing.location?.lat || 0)) / Math.max(0.0001, maxLat - minLat)) * 70,
    }));
  }, [listings]);

  return (
    <div
      style={{ height }}
      className="relative overflow-hidden rounded-2xl border border-line bg-[#FAF6F3]"
      role="img"
      aria-label="Map preview of listings"
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(#eadfd8 1px, transparent 1px), linear-gradient(90deg, #eadfd8 1px, transparent 1px)",
          backgroundSize: "38px 38px",
        }}
      />
      {points.map(({ listing, x, y }) => (
        <button
          key={listing.id}
          type="button"
          onClick={() => onSelect?.(listing.id === selectedId ? null : listing.id)}
          style={{ left: `${x}%`, top: `${y}%` }}
          className={`absolute -translate-x-1/2 -translate-y-full rounded-full p-1 transition ${
            listing.id === selectedId ? "scale-110" : "hover:scale-110"
          }`}
          aria-label={`Show ${listing.title} on the map`}
        >
          <MapPin className={`h-8 w-8 drop-shadow ${listing.id === selectedId ? "fill-primary text-primary" : "fill-primary/80 text-primary/80"}`} />
        </button>
      ))}
      {listings.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">No rooms to map yet.</div>
      ) : null}
      <div className="absolute inset-x-3 bottom-3 rounded-xl border border-line bg-surface/95 px-3 py-2 text-xs text-muted shadow-sm">
        <span className="font-semibold text-ink">Area preview.</span>{" "}
        {error
          ? "Google Maps could not load. Check the API key and enabled APIs."
          : "Add VITE_GOOGLE_MAPS_API_KEY to enable the interactive Google map."}
      </div>
    </div>
  );
}

export default function MapView({ listings = [], selectedId = null, onSelect, height = 420 }) {
  const usable = listings.filter((listing) => listing.location?.lat && listing.location?.lng);
  if (!googleMapsKey) {
    return <MapFallback listings={usable} selectedId={selectedId} onSelect={onSelect} height={height} />;
  }
  return <GoogleMapCanvas listings={usable} selectedId={selectedId} onSelect={onSelect} height={height} />;
}
