import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, FileCheck2, Phone, ShieldCheck, UserCheck } from "lucide-react";

import { useDocumentTitle } from "../../hooks/useUi.js";
import Button from "../../components/ui/Button.jsx";

const BEFORE = [
  "Ask for the exact address and check it on the map before you travel.",
  "Take a friend or family member with you for the first visit.",
  "Meet the landlord in person and ask for their CNIC.",
  "Match the CNIC name with the ownership papers or the utility bill.",
  "Look at the room, bathroom, water supply, electricity backup and locks.",
  "Ask what the rent includes: electricity, gas, water, Wi-Fi, cleaning.",
  "Ask how many students share the bathroom and kitchen.",
  "Read the tenancy terms and take a photo of anything you sign.",
];

const RED_FLAGS = [
  "The landlord asks for a deposit before you visit the room.",
  "The rent is far below every other room in the same area.",
  "The photos look like a hotel or a model home, not a lived-in room.",
  "The same photo appears in other listings (our AI badge will warn you).",
  "The landlord refuses to show the CNIC or ownership papers.",
  "The landlord pushes you to pay quickly or says 'another student is coming today'.",
  "The chat moves to another app before you have seen the room.",
  "The account was created today and has no other listings or reviews.",
];

const PAYMENT = [
  "Pay only after you have visited and agreed on the terms.",
  "Use a bank transfer or a written receipt; avoid cash without a receipt.",
  "Write down the deposit amount, the monthly rent and the notice period.",
  "Keep a photo of the receipt and the landlord's CNIC (with their consent).",
  "Never pay for a 'booking fee' to hold a room you have not seen.",
];

export default function SafetyPage() {
  useDocumentTitle("Safety guidelines");
  return (
    <div className="container-page py-12">
      <div className="max-w-3xl">
        <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Safety guidelines
        </p>
        <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Rent safely, visit confidently.</h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Most students never have a problem, but a few simple habits prevent almost every scam. These guidelines are
          written for students in Pakistan and are used by our admin team when reviewing reports.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-heading text-xl font-semibold">
            <FileCheck2 className="h-5 w-5 text-primary" aria-hidden="true" /> Before you visit
          </h2>
          <ul className="mt-4 space-y-3">
            {BEFORE.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-verified" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-heading text-xl font-semibold">
            <AlertTriangle className="h-5 w-5 text-status-highrisk" aria-hidden="true" /> Red flags
          </h2>
          <ul className="mt-4 space-y-3">
            {RED_FLAGS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-highrisk" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-heading text-xl font-semibold">
            <UserCheck className="h-5 w-5 text-secondary" aria-hidden="true" /> At the visit
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-muted">
            <li>Share your live location with a friend before you enter the building.</li>
            <li>Check that the room number and building match the listing photos.</li>
            <li>Ask to see the kitchen, bathroom, water tank and electricity meter.</li>
            <li>Speak to another student living there if possible.</li>
            <li>Do not hand over cash during the first visit. Take time to decide.</li>
          </ol>
        </section>

        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-heading text-xl font-semibold">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" /> Payments and paperwork
          </h2>
          <ul className="mt-4 space-y-3">
            {PAYMENT.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-verified" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-status-info/25 bg-status-info/5 p-6">
        <h2 className="font-heading text-xl font-semibold text-status-info">If something goes wrong</h2>
        <div className="mt-3 grid gap-4 text-sm text-muted sm:grid-cols-3">
          <div>
            <p className="font-semibold text-ink">Police emergency</p>
            <p className="mt-1 flex items-center gap-2">
              <Phone className="h-4 w-4 text-status-info" aria-hidden="true" /> 15
            </p>
          </div>
          <div>
            <p className="font-semibold text-ink">Rescue and ambulance</p>
            <p className="mt-1 flex items-center gap-2">
              <Phone className="h-4 w-4 text-status-info" aria-hidden="true" /> 1122
            </p>
          </div>
          <div>
            <p className="font-semibold text-ink">Report a listing</p>
            <p className="mt-1">
              Use the{" "}
              <Link to="/contact" className="font-semibold text-status-info underline">
                contact form
              </Link>{" "}
              with the listing link. Our admin team reviews reports within 24 hours.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button to="/listings">Browse verified rooms</Button>
        <Button to="/faq" variant="outline">
          Read the FAQ
        </Button>
      </div>
    </div>
  );
}
