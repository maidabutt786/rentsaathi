import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CalendarCheck, CheckCircle2 } from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { createVisitRequest } from "../../lib/listingsApi.js";
import Button from "../ui/Button.jsx";
import { Input, Textarea } from "../ui/Field.jsx";

const today = () => new Date().toISOString().slice(0, 10);

export default function VisitRequestForm({ listing }) {
  const { user, profile } = useAuth();
  const { push } = useToast();
  const location = useLocation();
  const [form, setForm] = useState({ date: today(), time: "16:00", message: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  if (!user) {
    return (
      <section id="visit-form" className="card p-5">
        <h2 className="font-heading text-base font-semibold">Request a visit</h2>
        <p className="mt-2 text-sm text-muted">Log in as a student to ask the landlord for a viewing time.</p>
        <Button to={`/login?next=${encodeURIComponent(location.pathname)}`} className="mt-4" size="sm">
          Log in to request a visit
        </Button>
      </section>
    );
  }

  if (profile?.role !== "student") {
    return (
      <section id="visit-form" className="card p-5">
        <h2 className="font-heading text-base font-semibold">Request a visit</h2>
        <p className="mt-2 text-sm text-muted">Visit requests are made by student accounts. Landlords manage them in the dashboard.</p>
      </section>
    );
  }

  if (done) {
    return (
      <section id="visit-form" className="card p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-status-verified" aria-hidden="true" />
          <div>
            <h2 className="font-heading text-base font-semibold">Visit request sent</h2>
            <p className="mt-1 text-sm text-muted">
              The landlord can accept or suggest another time. You will see the status in{" "}
              <Link to="/student/visits" className="font-semibold text-primary hover:underline">
                My visit requests
              </Link>
              .
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setDone(false)}>
              Request another time
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    if (!form.date || !form.time) {
      setError("Choose a date and time.");
      return;
    }
    if (form.date < today()) {
      setError("Choose today or a future date.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await createVisitRequest({
        listingId: listing.id,
        studentId: user.uid,
        landlordId: listing.ownerId,
        studentName: profile?.name || "Student",
        studentPhone: profile?.phone || "",
        preferredDate: form.date,
        preferredTime: form.time,
        message: form.message.trim(),
      });
      setDone(true);
      push("Visit request sent to the landlord.", "success");
    } catch (err) {
      push(err.message || "Could not send the request.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="visit-form" className="card p-5">
      <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
        <CalendarCheck className="h-4 w-4 text-primary" aria-hidden="true" />
        Request a visit
      </h2>
      <p className="mt-1 text-sm text-muted">Always visit in person before paying anything.</p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Preferred date"
            type="date"
            min={today()}
            value={form.date}
            onChange={(event) => set("date", event.target.value)}
            required
          />
          <Input
            label="Preferred time"
            type="time"
            value={form.time}
            onChange={(event) => set("time", event.target.value)}
            required
          />
        </div>
        <Textarea
          label="Message (optional)"
          rows={3}
          value={form.message}
          onChange={(event) => set("message", event.target.value)}
          placeholder="Tell the landlord who is coming and if you will bring a friend."
          error={error}
          maxLength={400}
        />
        <Button type="submit" loading={saving} className="w-full">
          Send visit request
        </Button>
      </form>
    </section>
  );
}
