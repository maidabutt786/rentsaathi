import { ChevronDown, HelpCircle } from "lucide-react";

import { useDocumentTitle } from "../../hooks/useUi.js";
import Button from "../../components/ui/Button.jsx";

const FAQS = [
  {
    q: "Is RentSaathi free for students?",
    a: "Yes. Searching, saving favourites, messaging landlords and requesting visits are free for students. We never ask students to pay a platform fee.",
  },
  {
    q: "What does the AI trust badge mean?",
    a: "Our self-hosted AI compares listing photos with all other listings, checks perceptual hashes, and looks at price and room details. It returns a score from 0 to 100 and a label: Verified (below 35), Suspicious (35 to 65) or High risk (above 65). The detail page lists the reasons in plain English.",
  },
  {
    q: "Does a Verified badge guarantee the room is real?",
    a: "No. It means our automated checks did not find reused photos or unusual details. A person can still misrepresent a room. Always visit in person and check the landlord's documents.",
  },
  {
    q: "Why is the fair price card marked coming soon?",
    a: "The fair price model is part of a later project part. The API contract and the Firestore field are already reserved, so the card will switch on without a redesign once the model is trained.",
  },
  {
    q: "How do landlords get verified?",
    a: "A landlord uploads an ownership document or utility bill and their CNIC from the dashboard. An admin reviews the documents and approves or rejects the account. Only approved landlords show a Verified landlord badge.",
  },
  {
    q: "Can I use the platform without Google Maps?",
    a: "Yes. The map falls back to a clean area preview with pins, and the listing form lets you enter coordinates or pick a city centre. Add a Google Maps key later for the interactive map.",
  },
  {
    q: "How do you handle fake reviews?",
    a: "Review authenticity checks are planned for Part 4 (NLP module). For now, reviews are tied to a student account and the detail page marks the check as not yet active.",
  },
  {
    q: "What happens when a listing is flagged?",
    a: "It enters the admin queue with its photos, fraud score, reasons and the matched duplicate listing side by side. An admin can approve it, remove it, or suspend the owner's account.",
  },
  {
    q: "Which cities are supported?",
    a: "The demo data covers Gujrat, Lahore and Islamabad. Landlords can add a listing in any city; filters and analytics group by city automatically.",
  },
  {
    q: "Is my data safe?",
    a: "Passwords are handled by Firebase Authentication. Documents are stored in a private folder readable only by admins. We do not send photos or messages to any external AI provider.",
  },
];

export default function FaqPage() {
  useDocumentTitle("FAQ");
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl">
        <p className="inline-flex items-center gap-2 rounded-full bg-secondary-soft px-3 py-1.5 text-xs font-semibold text-secondary">
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" /> Frequently asked questions
        </p>
        <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Questions students ask us</h1>
        <p className="mt-3 text-base text-muted">
          If your question is not here, send it through the contact page and we will add it.
        </p>

        <div className="mt-8 space-y-3">
          {FAQS.map((item, index) => (
            <details key={item.q} className="card group p-0" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium">
                <span>{item.q}</span>
                <ChevronDown className="h-5 w-5 shrink-0 text-muted transition group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="border-t border-line px-5 py-4 text-sm leading-relaxed text-muted">{item.a}</div>
            </details>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button to="/contact">Ask a different question</Button>
          <Button to="/safety" variant="outline">
            Safety guidelines
          </Button>
        </div>
      </div>
    </div>
  );
}
