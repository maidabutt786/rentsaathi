import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Bookmark, CalendarClock, LogOut, Save, ShieldQuestion } from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { ROLE_HOME, UNIVERSITIES } from "../../lib/constants.js";
import { formatDate } from "../../lib/format.js";
import { getSavedSearches } from "../../lib/listingsApi.js";
import Avatar from "../../components/ui/Avatar.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import { Input, Select } from "../../components/ui/Field.jsx";
import PageHeader from "../../components/layout/PageHeader.jsx";

export default function ProfilePage() {
  useDocumentTitle("Your profile");
  const { profile, user, updateUserProfile, logout } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState({ name: "", phone: "", university: "" });
  const [savedSearches, setSavedSearches] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || "",
        phone: profile.phone || "",
        university: profile.university || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.uid) getSavedSearches(profile.uid).then(setSavedSearches).catch(() => {});
  }, [profile?.uid]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    if (form.name.trim().length < 3) {
      push("Enter your full name.", "warning");
      return;
    }
    if (form.phone && !/^[0-9+\-\s()]{7,20}$/.test(form.phone)) {
      push("Enter a valid phone number.", "warning");
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        university: form.university,
      });
      push("Profile updated.", "success");
    } catch (error) {
      push(error.message || "Could not update your profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Account"
        title="Your profile"
        subtitle="Keep your contact details current so landlords and students can reach you."
        actions={
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
          </Button>
        }
      />

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={save} className="card p-6">
          <div className="flex items-center gap-4">
            <Avatar name={profile.name} size={64} />
            <div>
              <p className="font-heading text-xl font-semibold">{profile.name}</p>
              <p className="text-sm text-muted">{profile.email}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge tone="primary">{profile.role}</Badge>
                {profile.verificationStatus === "approved" ? (
                  <Badge tone="verified" icon={BadgeCheck}>
                    Verified
                  </Badge>
                ) : (
                  <Badge tone="suspicious" icon={ShieldQuestion}>
                    {profile.verificationStatus || "pending"}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Input label="Full name" value={form.name} onChange={(event) => set("name", event.target.value)} required />
            <Input
              label="Email"
              value={profile.email}
              readOnly
              disabled
              hint="Email changes need a new sign-up for now."
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(event) => set("phone", event.target.value)}
              placeholder="+92 3XX XXXXXXX"
            />
            {profile.role === "student" ? (
              <Select
                label="University"
                value={form.university}
                onChange={(event) => set("university", event.target.value)}
              >
                <option value="">Choose your university</option>
                {UNIVERSITIES.map((university) => (
                  <option key={university.id} value={university.name}>
                    {university.name}
                  </option>
                ))}
                {UNIVERSITIES.every((university) => university.name !== form.university) && form.university ? (
                  <option value={form.university}>{form.university}</option>
                ) : null}
              </Select>
            ) : (
              <Input label="Account created" value={formatDate(profile.createdAt)} readOnly disabled />
            )}
          </div>

          <Button type="submit" className="mt-5" loading={saving}>
            <Save className="h-4 w-4" aria-hidden="true" /> Save changes
          </Button>
        </form>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="font-heading text-base font-semibold">Quick links</h2>
            <div className="mt-3 grid gap-2">
              {profile.role === "student" ? (
                <>
                  <Button to="/student/favorites" variant="outline" size="sm">
                    <Bookmark className="h-4 w-4" aria-hidden="true" /> Favourites
                  </Button>
                  <Button to="/student/visits" variant="outline" size="sm">
                    <CalendarClock className="h-4 w-4" aria-hidden="true" /> Visit requests
                  </Button>
                </>
              ) : null}
              <Button to={ROLE_HOME[profile.role] || "/"} variant="soft" size="sm">
                Open dashboard
              </Button>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-heading text-base font-semibold">Saved searches</h2>
            {savedSearches.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {savedSearches.slice(0, 4).map((search) => (
                  <li key={search.id || search.query}>
                    <Link to={`/listings${search.query || ""}`} className="text-muted hover:text-primary">
                      {search.label || "Saved search"}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No saved searches yet. Save one from the listings page.</p>
            )}
          </div>

          <div className="rounded-xl border border-line bg-subtle p-4 text-xs text-muted">
            Signed in as <span className="font-mono">{user?.uid}</span>
            {profile.suspended ? (
              <p className="mt-2 font-semibold text-status-highrisk">This account is suspended.</p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
