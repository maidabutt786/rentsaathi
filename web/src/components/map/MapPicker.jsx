import { useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { MapPin } from "lucide-react";

import { googleMapsKey } from "../../lib/firebase.js";
import { Input } from "../ui/Field.jsx";

const OPTIONS = { disableDefaultUI: true, zoomControl: true, clickableIcons: false };

const CITY_CENTERS = {
  Gujrat: { lat: 32.5736, lng: 74.0789 },
  Lahore: { lat: 31.5204, lng: 74.3587 },
  Islamabad: { lat: 33.6844, lng: 73.0479 },
};

function GooglePicker({ value, onChange }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "rentsaathi-google-maps",
    googleMapsApiKey: googleMapsKey,
  });
  if (loadError) return <PinInputs value={value} onChange={onChange} note="Google Maps could not load." />;
  if (!isLoaded) return <div className="skeleton h-64 w-full" />;
  return (
    <GoogleMap
      mapContainerClassName="h-64 w-full rounded-xl overflow-hidden border border-line"
      center={value}
      zoom={14}
      options={OPTIONS}
      onClick={(event) => onChange({ lat: event.latLng.lat(), lng: event.latLng.lng() })}
    >
      <Marker
        position={value}
        draggable
        onDragEnd={(event) => onChange({ lat: event.latLng.lat(), lng: event.latLng.lng() })}
      />
    </GoogleMap>
  );
}

function PinInputs({ value, onChange, note }) {
  return (
    <div className="rounded-xl border border-line bg-subtle p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
        Pin location
      </p>
      <p className="mt-1 text-xs text-muted">
        {note || "Add VITE_GOOGLE_MAPS_API_KEY for a draggable map. For now, enter the coordinates or pick a city."}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Input
          label="Latitude"
          type="number"
          step="0.0001"
          value={value.lat}
          onChange={(event) => onChange({ ...value, lat: Number(event.target.value) })}
        />
        <Input
          label="Longitude"
          type="number"
          step="0.0001"
          value={value.lng}
          onChange={(event) => onChange({ ...value, lng: Number(event.target.value) })}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(CITY_CENTERS).map(([city, center]) => (
          <button
            key={city}
            type="button"
            onClick={() => onChange(center)}
            className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted transition hover:border-primary/40 hover:text-primary"
          >
            {city}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MapPicker({ value = { lat: 32.5736, lng: 74.0789 }, onChange }) {
  const [error, setError] = useState("");
  const handleChange = (next) => {
    if (!Number.isFinite(next.lat) || !Number.isFinite(next.lng)) {
      setError("Latitude and longitude must be numbers.");
      return;
    }
    setError("");
    onChange(next);
  };
  return (
    <div>
      {googleMapsKey ? (
        <GooglePicker value={value} onChange={handleChange} />
      ) : (
        <PinInputs value={value} onChange={handleChange} />
      )}
      {error ? <p className="mt-1 text-xs font-medium text-status-highrisk">{error}</p> : null}
    </div>
  );
}
