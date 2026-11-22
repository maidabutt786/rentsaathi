import { useState } from "react";
import { Clock, Mail, MapPin, MessageSquare, Phone, Send } from "lucide-react";

import { useDocumentTitle } from "../../hooks/useUi.js";
import { useToast } from "../../context/ToastContext.jsx";
import Button from "../../components/ui/Button.jsx";
import { Input, Select, Textarea } from "../../components/ui/Field.jsx";

const TOPICS = ["General question", "Report a listing", "Landlord verification", "Technical problem", "Partnership"];

export default function ContactPage() {
  useDocumentTitle("Contact");
  const { push } = useToast();
  const [form, setForm] = useState({ name: "", email: "", topic: TOPICS[0], message: "" });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = "Tell us your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Enter a valid email address.";
    if (form.message.trim().length < 20) next.message = "Please write at least 20 characters so we can help.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSending(true);
    const subject = `[RentSaathi] ${form.topic}`;
    const body = `Name: ${form.name}\nEmail: ${form.email}\nTopic: ${form.topic}\n\n${form.message}`;
    window.location.href = `mailto:hello@rentsaathi.pk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setTimeout(() => {
      setSending(false);
      push("Your email app should open with the message ready to send.", "info");
    }, 400);
  };

  return (
    <div className="container-page py-12">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> Contact us
          </p>
          <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">We are here to help</h1>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Report a suspicious listing, ask about landlord verification, or tell us about a problem with the website.
            We read every message.
          </p>

          <ul className="mt-7 space-y-3">
            <li className="card flex items-start gap-3 p-4">
              <Mail className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">Email</p>
                <a href="mailto:hello@rentsaathi.pk" className="text-sm text-muted hover:text-primary">
                  hello@rentsaathi.pk
                </a>
              </div>
            </li>
            <li className="card flex items-start gap-3 p-4">
              <Phone className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">Phone and WhatsApp</p>
                <a href="tel:+923001112233" className="text-sm text-muted hover:text-primary">
                  +92 300 1112233
                </a>
              </div>
            </li>
            <li className="card flex items-start gap-3 p-4">
              <MapPin className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">Office</p>
                <p className="text-sm text-muted">Hafiz Hayat Campus Road, Gujrat, Punjab</p>
              </div>
            </li>
            <li className="card flex items-start gap-3 p-4">
              <Clock className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">Response time</p>
                <p className="text-sm text-muted">Monday to Saturday, 9 am to 6 pm. Reports are reviewed within 24 hours.</p>
              </div>
            </li>
          </ul>

          <div className="mt-6 rounded-xl border border-status-highrisk/25 bg-status-highrisk/5 p-4 text-sm">
            <p className="font-semibold text-status-highrisk">In an emergency</p>
            <p className="mt-1 text-muted">
              Call police at <strong>15</strong> or rescue at <strong>1122</strong>. Do not wait for an online reply.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="card p-6" noValidate>
          <h2 className="font-heading text-xl font-semibold">Send a message</h2>
          <p className="mt-1 text-sm text-muted">This opens your email app with the details filled in.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input
              label="Your name"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              error={errors.name}
              required
              autoComplete="name"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => set("email", event.target.value)}
              error={errors.email}
              required
              autoComplete="email"
            />
            <Select label="Topic" value={form.topic} onChange={(event) => set("topic", event.target.value)} className="sm:col-span-2">
              {TOPICS.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </Select>
            <Textarea
              className="sm:col-span-2"
              label="Message"
              rows={6}
              value={form.message}
              onChange={(event) => set("message", event.target.value)}
              error={errors.message}
              hint="Include the listing link if you are reporting a room."
              required
              maxLength={1500}
            />
          </div>
          <Button type="submit" className="mt-5" loading={sending}>
            <Send className="h-4 w-4" aria-hidden="true" /> Open email draft
          </Button>
          <p className="mt-3 text-xs text-muted">
            We never ask for your password or a deposit. If someone claims to be from RentSaathi and asks for money,
            report it immediately.
          </p>
        </form>
      </div>
    </div>
  );
}
