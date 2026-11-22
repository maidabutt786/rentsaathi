import { Link } from "react-router-dom";
import { BrainCircuit, Database, GraduationCap, Layers, Lock, ShieldCheck, Smartphone, Sparkles } from "lucide-react";

import { useDocumentTitle } from "../../hooks/useUi.js";
import Button from "../../components/ui/Button.jsx";
import Logo from "../../components/ui/Logo.jsx";

const LAYERS = [
  { icon: Smartphone, title: "Presentation", body: "React website now, Flutter app later. Both share one design system and one data model." },
  { icon: Layers, title: "Application", body: "Firebase Auth, Firestore, Storage and Cloud Functions handle accounts, listings and the AI hand-off." },
  { icon: BrainCircuit, title: "AI layer", body: "A self-hosted FastAPI service with our own trained weights. No external AI provider is called." },
  { icon: Database, title: "Data", body: "Firestore for app data, Cloud Storage for photos, and a versioned dataset folder for training." },
];

const MODULES = [
  { name: "Fake and duplicate listing detection", status: "Live in this part", tone: "text-status-verified" },
  { name: "Fair price regression", status: "Contract ready, training in Part 3", tone: "text-status-suspicious" },
  { name: "Fake review detection (NLP)", status: "Contract ready, training in Part 4", tone: "text-status-suspicious" },
  { name: "Content-based recommender", status: "Contract ready, training in Part 4", tone: "text-status-suspicious" },
];

export default function AboutPage() {
  useDocumentTitle("About");
  return (
    <div className="container-page py-12">
      <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> About RentSaathi
          </p>
          <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Safer student renting, built in Pakistan.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
            Students moving to a new city often rely on forwarded photos and phone numbers. The same room photo can appear
            in five listings, and the rent can change after a deposit. RentSaathi brings verified listings, clear trust
            signals and a safe place to talk — all in one platform.
          </p>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
            This is a final-year project. The website and the first AI module are working now. The mobile app and the
            remaining AI models are planned in later parts, using the same contracts and data model.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="card p-5">
              <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="mt-3 font-heading text-lg font-semibold">Our promise to students</h2>
              <p className="mt-1 text-sm text-muted">
                Every listing shows a plain-English AI verdict. We never hide a suspicious result behind a colour alone.
              </p>
            </div>
            <div className="card p-5">
              <GraduationCap className="h-6 w-6 text-secondary" aria-hidden="true" />
              <h2 className="mt-3 font-heading text-lg font-semibold">Our promise to landlords</h2>
              <p className="mt-1 text-sm text-muted">
                Verification is free, your documents stay private, and you only hear from students who are serious.
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <Logo height={56} />
          <p className="mt-4 text-sm leading-relaxed text-muted">
            The logo is a crimson house with a smiling figure: a safe home and a friendly guide. The wordmark pairs
            "Rent" in crimson with "saathi" (companion) in brown.
          </p>
          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-muted">Project</dt>
              <dd className="font-medium">Final year project · Part 1</dd>
            </div>
            <div>
              <dt className="text-muted">Focus cities</dt>
              <dd className="font-medium">Gujrat, Lahore, Islamabad</dd>
            </div>
            <div>
              <dt className="text-muted">AI policy</dt>
              <dd className="font-medium">Self-hosted models only</dd>
            </div>
          </dl>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="font-heading text-2xl font-semibold">How the platform is built</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">Four layers, one shared data model. The mobile app will reuse all of it.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LAYERS.map((layer) => {
            const Icon = layer.icon;
            return (
              <div key={layer.title} className="card p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </span>
                <h3 className="mt-3 font-heading text-base font-semibold">{layer.title}</h3>
                <p className="mt-1 text-sm text-muted">{layer.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-heading text-xl font-semibold">The four AI models</h2>
          <ul className="mt-4 space-y-3">
            {MODULES.map((module) => (
              <li key={module.name} className="flex items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                <span className="text-sm font-medium">{module.name}</span>
                <span className={`shrink-0 text-right text-xs font-semibold ${module.tone}`}>{module.status}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="flex items-center gap-2 font-heading text-xl font-semibold">
            <Lock className="h-5 w-5 text-secondary" aria-hidden="true" /> Privacy and honest limits
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            <li>Documents are stored in a private folder. Only admins can open them during verification.</li>
            <li>Photos are used for duplicate detection. We do not send them to any external AI service.</li>
            <li>AI scores help you decide; they are not proof of fraud or proof of honesty.</li>
            <li>In bootstrap mode we report what the model can actually do. We do not claim accuracy we have not measured.</li>
            <li>You can ask us to delete your account and listing data by contacting support.</li>
          </ul>
          <Button to="/contact" variant="outline" size="sm" className="mt-4">
            Ask a question
          </Button>
        </div>
      </section>

      <section className="mt-14 rounded-2xl bg-subtle p-8 text-center">
        <h2 className="font-heading text-2xl font-semibold">Want to help us test?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
          We are collecting real room photos with consent to train the next version of the image model. If you are a
          student or landlord in Gujrat, Lahore or Islamabad, we would love to talk.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button to="/contact">Contact the team</Button>
          <Button to="/listings" variant="outline">
            Browse rooms
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted">
          Read our{" "}
          <Link to="/safety" className="font-semibold text-primary hover:underline">
            safety guidelines
          </Link>{" "}
          before your first visit.
        </p>
      </section>
    </div>
  );
}
