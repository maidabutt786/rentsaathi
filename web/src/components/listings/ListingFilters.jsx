import { SlidersHorizontal, X } from "lucide-react";

import { GENDER_RULES, ROOM_TYPES, UNIVERSITIES } from "../../lib/constants.js";
import Button from "../ui/Button.jsx";
import { Input, Select } from "../ui/Field.jsx";

const EMPTY = {
  minPrice: "",
  maxPrice: "",
  roomType: "",
  genderRule: "",
  universityId: "",
  maxDistance: "",
};

export default function ListingFilters({ filters, onChange, onClear, resultCount }) {
  const set = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <aside className="card h-fit p-5 lg:sticky lg:top-24" aria-label="Listing filters">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
          <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
          Filters
        </h2>
        <button
          type="button"
          onClick={() => onClear(EMPTY)}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted transition hover:text-primary"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear all
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">{resultCount} rooms match</p>

      <div className="mt-5 space-y-4">
        <div>
          <span className="label-base">Monthly rent (PKR)</span>
          <div className="grid grid-cols-2 gap-2">
            <Input
              aria-label="Minimum rent"
              type="number"
              min="0"
              step="1000"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(event) => set("minPrice", event.target.value)}
            />
            <Input
              aria-label="Maximum rent"
              type="number"
              min="0"
              step="1000"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(event) => set("maxPrice", event.target.value)}
            />
          </div>
        </div>

        <Select label="Room type" value={filters.roomType} onChange={(event) => set("roomType", event.target.value)}>
          <option value="">Any room type</option>
          {ROOM_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>

        <Select label="Who can live here" value={filters.genderRule} onChange={(event) => set("genderRule", event.target.value)}>
          <option value="">Any student</option>
          {GENDER_RULES.map((rule) => (
            <option key={rule.value} value={rule.value}>
              {rule.label}
            </option>
          ))}
        </Select>

        <Select label="University" value={filters.universityId} onChange={(event) => set("universityId", event.target.value)}>
          <option value="">Any university</option>
          {UNIVERSITIES.map((university) => (
            <option key={university.id} value={university.id}>
              {university.name}
            </option>
          ))}
        </Select>

        <div>
          <label className="label-base" htmlFor="max-distance">
            Max distance from campus
          </label>
          <input
            id="max-distance"
            type="range"
            min="0"
            max="15"
            step="0.5"
            value={filters.maxDistance || 15}
            onChange={(event) => set("maxDistance", event.target.value === "15" ? "" : event.target.value)}
            className="w-full accent-primary"
          />
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>{filters.maxDistance ? `${filters.maxDistance} km` : "Any distance"}</span>
            <span>15 km</span>
          </div>
        </div>
      </div>

      <Button variant="soft" size="sm" className="mt-5 w-full" onClick={() => onClear(EMPTY)}>
        Reset filters
      </Button>
    </aside>
  );
}

export { EMPTY as EMPTY_FILTERS };
