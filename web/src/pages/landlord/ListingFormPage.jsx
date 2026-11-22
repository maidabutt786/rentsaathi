import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImagePlus, Info, Save, Trash2, UploadCloud } from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { createListing, fetchListing, updateListing } from "../../lib/listingsApi.js";
import { uploadListingImages } from "../../lib/storage.js";
import { CITIES, FACILITIES, GENDER_RULES, ROOM_TYPES, UNIVERSITIES } from "../../lib/constants.js";
import { demoMode } from "../../lib/firebase.js";
import PageHeader from "../../components/layout/PageHeader.jsx";
import MapPicker from "../../components/map/MapPicker.jsx";
import Button from "../../components/ui/Button.jsx";
import { Input, Select, Textarea } from "../../components/ui/Field.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";

const EMPTY = {
  title: "",
  description: "",
  price: "",
  roomType: "single",
  genderRule: "any",
  areaSqft: "",
  facilities: [],
  address: "",
  city: "Gujrat",
  location: { lat: 32.5736, lng: 74.0789 },
  distanceToUniversityKm: "",
  universityId: "ug-gujrat",
  status: "active",
};

export default function ListingFormPage() {
  const { id } = useParams();
  const editMode = Boolean(id);
  useDocumentTitle(editMode ? "Edit listing" : "Add a listing");
  const { profile } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(editMode);
  const [notMine, setNotMine] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const fileInput = useRef(null);

  useEffect(() => {
    if (!editMode) return;
    let cancelled = false;
    fetchListing(id)
      .then((listing) => {
        if (cancelled) return;
        if (!listing) {
          setNotMine(true);
          return;
        }
        if (listing.ownerId !== profile?.uid) {
          setNotMine(true);
          return;
        }
        setForm({
          title: listing.title || "",
          description: listing.description || "",
          price: listing.price ?? "",
          roomType: listing.roomType || "single",
          genderRule: listing.genderRule || "any",
          areaSqft: listing.areaSqft ?? "",
          facilities: listing.facilities || [],
          address: listing.address || "",
          city: listing.city || "Gujrat",
          location: listing.location || EMPTY.location,
          distanceToUniversityKm: listing.distanceToUniversityKm ?? "",
          universityId: listing.universityId || "ug-gujrat",
          status: listing.status || "active",
        });
        setImages(listing.images || []);
      })
      .catch(() => setNotMine(true))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editMode, id, profile?.uid]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const toggleFacility = (facility) => {
    setForm((current) => ({
      ...current,
      facilities: current.facilities.includes(facility)
        ? current.facilities.filter((item) => item !== facility)
        : [...current.facilities, facility],
    }));
  };

  const addFiles = (fileList) => {
    const accepted = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    if (accepted.length === 0) {
      push("Choose JPG, PNG or WebP photos.", "warning");
      return;
    }
    setFiles((current) => [...current, ...accepted].slice(0, 8));
  };

  const totalImages = images.length + files.length;

  const validate = () => {
    const next = {};
    if (form.title.trim().length < 10) next.title = "Write a clear title (at least 10 characters).";
    if (form.description.trim().length < 40) next.description = "Describe the room in at least 40 characters.";
    if (!Number(form.price) || Number(form.price) < 1000) next.price = "Enter a monthly rent of at least Rs 1,000.";
    if (!Number(form.areaSqft) || Number(form.areaSqft) < 50) next.areaSqft = "Enter the room area in square feet.";
    if (form.address.trim().length < 5) next.address = "Add the street or area.";
    if (form.distanceToUniversityKm === "" || Number(form.distanceToUniversityKm) < 0) {
      next.distanceToUniversityKm = "Enter the distance from campus in km.";
    }
    if (!form.universityId) next.universityId = "Choose the nearest university.";
    if (totalImages === 0) next.images = "Add at least one photo. Three or more helps students trust the listing.";
    if (totalImages > 8) next.images = "Use up to 8 photos.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) {
      push("Please fix the highlighted fields.", "warning");
      return;
    }
    setSaving(true);
    try {
      let uploaded = [];
      if (files.length) {
        uploaded = await uploadListingImages(files, profile.uid, (done, total) =>
          setProgress(`Uploading photo ${done} of ${total}…`),
        );
      }
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        roomType: form.roomType,
        genderRule: form.genderRule,
        areaSqft: Number(form.areaSqft),
        facilities: form.facilities,
        address: form.address.trim(),
        city: form.city,
        location: {
          lat: Number(form.location.lat),
          lng: Number(form.location.lng),
        },
        distanceToUniversityKm: Number(form.distanceToUniversityKm),
        universityId: form.universityId,
        images: [...images, ...uploaded],
        status: form.status,
        ownerName: profile.name,
        ownerVerificationStatus: profile.verificationStatus,
      };
      if (editMode) {
        await updateListing(id, payload);
        push("Listing updated. The AI check will run again.", "success");
      } else {
        await createListing(profile.uid, payload);
        push("Listing created. AI analysis is starting.", "success");
      }
      navigate("/landlord/listings");
    } catch (error) {
      push(error.message || "Could not save the listing.", "error");
    } finally {
      setSaving(false);
      setProgress("");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-1/2" />
        <div className="skeleton h-96 w-full" />
      </div>
    );
  }

  if (notMine) {
    return (
      <EmptyState
        icon={Info}
        title="Listing not found"
        body="This listing does not exist or belongs to another landlord."
        action={<Button to="/landlord/listings">Back to my listings</Button>}
      />
    );
  }

  return (
    <div>
      <Link to="/landlord/listings" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to listings
      </Link>
      <div className="mt-3">
        <PageHeader
          eyebrow="Landlord area"
          title={editMode ? "Edit listing" : "Add a listing"}
          subtitle="Clear photos and honest details get more serious enquiries."
        />
      </div>

      {demoMode ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-status-info/25 bg-status-info/5 p-3 text-xs text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-status-info" aria-hidden="true" />
          Preview mode stores photos in this browser only. With Firebase and the AI service running, the Cloud Function
          sends each new listing for analysis and writes the verdict back.
        </p>
      ) : null}

      <form onSubmit={submit} className="mt-5 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="font-heading text-base font-semibold">Basic details</h2>
            <div className="mt-4 space-y-4">
              <Input
                label="Listing title"
                value={form.title}
                onChange={(event) => set("title", event.target.value)}
                placeholder="Bright single room 5 minutes from campus"
                error={errors.title}
                required
              />
              <Textarea
                label="Description"
                rows={5}
                value={form.description}
                onChange={(event) => set("description", event.target.value)}
                placeholder="Describe the room, bathroom, kitchen, bills, rules and who else lives there."
                error={errors.description}
                hint={`${form.description.length} characters. Be specific; students can tell when a listing is vague.`}
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Monthly rent (PKR)"
                  type="number"
                  min="1000"
                  step="500"
                  value={form.price}
                  onChange={(event) => set("price", event.target.value)}
                  error={errors.price}
                  required
                />
                <Input
                  label="Area (sqft)"
                  type="number"
                  min="50"
                  step="10"
                  value={form.areaSqft}
                  onChange={(event) => set("areaSqft", event.target.value)}
                  error={errors.areaSqft}
                  required
                />
                <Select label="Room type" value={form.roomType} onChange={(event) => set("roomType", event.target.value)}>
                  {ROOM_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
                <Select label="Who can live here" value={form.genderRule} onChange={(event) => set("genderRule", event.target.value)}>
                  {GENDER_RULES.map((rule) => (
                    <option key={rule.value} value={rule.value}>
                      {rule.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-heading text-base font-semibold">Photos</h2>
            <p className="mt-1 text-xs text-muted">
              Add real photos of the room, bathroom and kitchen. Reused or stock photos lower the AI trust score.
            </p>
            {errors.images ? <p className="mt-2 text-xs font-medium text-status-highrisk">{errors.images}</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {images.map((url, index) => (
                <div key={`${url}-${index}`} className="group relative overflow-hidden rounded-xl border border-line">
                  <img src={url} alt={`Saved listing photo ${index + 1}`} className="h-24 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((current) => current.filter((_, position) => position !== index))}
                    className="absolute right-1 top-1 rounded-full bg-surface/90 p-1 text-status-highrisk shadow-sm"
                    aria-label={`Remove saved photo ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {previews.map((url, index) => (
                <div key={url} className="relative overflow-hidden rounded-xl border border-primary/30">
                  <img src={url} alt={`New photo ${index + 1} preview`} className="h-24 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFiles((current) => current.filter((_, position) => position !== index))}
                    className="absolute right-1 top-1 rounded-full bg-surface/90 p-1 text-status-highrisk shadow-sm"
                    aria-label={`Remove new photo ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <span className="absolute bottom-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    New
                  </span>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex h-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-subtle text-muted transition hover:border-primary/40 hover:text-primary"
              >
                <ImagePlus className="h-5 w-5" aria-hidden="true" />
                <span className="mt-1 text-xs font-medium">Add photos</span>
              </button>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <p className="mt-2 text-xs text-muted">{totalImages} of 8 photos · JPG, PNG or WebP, up to 8 MB each.</p>
            {progress ? (
              <p className="mt-2 flex items-center gap-2 text-xs font-medium text-primary">
                <UploadCloud className="h-4 w-4 animate-pulse" aria-hidden="true" /> {progress}
              </p>
            ) : null}
          </section>

          <section className="card p-5">
            <h2 className="font-heading text-base font-semibold">Facilities</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FACILITIES.map((facility) => (
                <label key={facility} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.facilities.includes(facility)}
                    onChange={() => toggleFacility(facility)}
                    className="h-4 w-4 rounded border-line accent-primary"
                  />
                  {facility}
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card p-5">
            <h2 className="font-heading text-base font-semibold">Location</h2>
            <div className="mt-3 space-y-3">
              <Select label="City" value={form.city} onChange={(event) => set("city", event.target.value)}>
                {CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </Select>
              <Input
                label="Street or area"
                value={form.address}
                onChange={(event) => set("address", event.target.value)}
                placeholder="House 14, Street 6, Hafiz Hayat Road"
                error={errors.address}
                required
              />
              <Select
                label="Nearest university"
                value={form.universityId}
                onChange={(event) => set("universityId", event.target.value)}
                error={errors.universityId}
              >
                {UNIVERSITIES.map((university) => (
                  <option key={university.id} value={university.id}>
                    {university.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Distance from campus (km)"
                type="number"
                min="0"
                step="0.1"
                value={form.distanceToUniversityKm}
                onChange={(event) => set("distanceToUniversityKm", event.target.value)}
                error={errors.distanceToUniversityKm}
                required
              />
              <div>
                <span className="label-base">Map pin</span>
                <MapPicker value={form.location} onChange={(location) => set("location", location)} />
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-heading text-base font-semibold">Visibility</h2>
            <Select label="Listing status" value={form.status} onChange={(event) => set("status", event.target.value)}>
              <option value="active">Active — visible to students</option>
              <option value="paused">Paused — hidden for now</option>
            </Select>
            <p className="mt-2 text-xs text-muted">
              New and edited listings are checked by the AI service automatically. The badge appears on the public page.
            </p>
          </section>

          <Button type="submit" size="lg" className="w-full" loading={saving}>
            <Save className="h-4 w-4" aria-hidden="true" /> {editMode ? "Save changes" : "Publish listing"}
          </Button>
        </aside>
      </form>
    </div>
  );
}
