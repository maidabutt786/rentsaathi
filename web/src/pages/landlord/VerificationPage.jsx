import { useState } from "react";
import { BadgeCheck, FileText, Lock, ShieldAlert, UploadCloud } from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { uploadVerificationDocuments } from "../../lib/storage.js";
import PageHeader from "../../components/layout/PageHeader.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";

const STATUS = {
  approved: {
    tone: "verified",
    title: "Your account is verified",
    body: "Students see a Verified landlord badge on your listings. Keep your documents current.",
  },
  pending: {
    tone: "suspicious",
    title: "Documents are under review",
    body: "An admin will check your CNIC and ownership document. This usually takes 1–2 working days.",
  },
  rejected: {
    tone: "highrisk",
    title: "Verification was rejected",
    body: "Upload a clearer document or one that matches your name. Contact support if you need help.",
  },
};

export default function VerificationPage() {
  useDocumentTitle("Landlord verification");
  const { profile, updateUserProfile } = useAuth();
  const { push } = useToast();
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");

  const status = STATUS[profile?.verificationStatus] || {
    tone: "neutral",
    title: "Verification not started",
    body: "Upload a CNIC and an ownership document or utility bill to apply for the verified badge.",
  };

  const submit = async (event) => {
    event.preventDefault();
    if (files.length === 0) {
      push("Choose at least one document first.", "warning");
      return;
    }
    setSaving(true);
    try {
      setProgress("Uploading documents…");
      const urls = await uploadVerificationDocuments(files, profile.uid);
      await updateUserProfile({
        documents: [...(profile.documents || []), ...urls],
        verificationStatus: "pending",
      });
      setFiles([]);
      push("Documents submitted. An admin will review them.", "success");
    } catch (error) {
      push(error.message || "Could not upload the documents.", "error");
    } finally {
      setSaving(false);
      setProgress("");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Landlord area"
        title="Verification"
        subtitle="Verified landlords get more enquiries and a badge on every listing."
      />

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <section className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge tone={status.tone}>{profile?.verificationStatus || "not started"}</Badge>
                <h2 className="mt-2 font-heading text-lg font-semibold">{status.title}</h2>
                <p className="mt-1 max-w-xl text-sm text-muted">{status.body}</p>
              </div>
              <BadgeCheck className={`h-9 w-9 ${profile?.verificationStatus === "approved" ? "text-status-verified" : "text-line"}`} aria-hidden="true" />
            </div>
          </section>

          <form onSubmit={submit} className="card p-5">
            <h2 className="font-heading text-base font-semibold">Upload documents</h2>
            <p className="mt-1 text-sm text-muted">
              Add a clear photo or PDF of your CNIC (front and back) and one ownership document: registry, allotment
              letter, or a recent electricity bill in your name.
            </p>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-subtle px-4 py-8 text-center transition hover:border-primary/40">
              <UploadCloud className="h-7 w-7 text-primary" aria-hidden="true" />
              <span className="mt-2 text-sm font-semibold">Choose documents</span>
              <span className="mt-1 text-xs text-muted">JPG, PNG, WebP or PDF · up to 10 MB each</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                multiple
                className="sr-only"
                onChange={(event) => {
                  setFiles(Array.from(event.target.files || []));
                  event.target.value = "";
                }}
              />
            </label>
            {files.length ? (
              <ul className="mt-3 space-y-2">
                {files.map((file) => (
                  <li key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{Math.round(file.size / 1024)} KB</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {progress ? <p className="mt-2 text-xs font-medium text-primary">{progress}</p> : null}
            <Button type="submit" className="mt-4" loading={saving}>
              Submit for review
            </Button>
          </form>

          {profile?.documents?.length ? (
            <section className="card p-5">
              <h2 className="font-heading text-base font-semibold">Your submitted documents</h2>
              <ul className="mt-3 space-y-2">
                {profile.documents.map((document, index) => (
                  <li key={`${document}-${index}`} className="flex items-center gap-2 rounded-lg bg-subtle px-3 py-2 text-sm">
                    <FileText className="h-4 w-4 text-secondary" aria-hidden="true" />
                    <span className="truncate">
                      {document.startsWith("http") ? (
                        <a href={document} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          Document {index + 1}
                        </a>
                      ) : (
                        document
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
              <Lock className="h-4 w-4 text-secondary" aria-hidden="true" /> Privacy
            </h2>
            <p className="mt-2 text-sm text-muted">
              Documents are stored in a private folder. Only admin accounts can open them during review. They are never
              shown to students or included in public listing data.
            </p>
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
              <ShieldAlert className="h-4 w-4 text-status-suspicious" aria-hidden="true" /> What we check
            </h2>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              <li>• The CNIC name matches your account name.</li>
              <li>• The ownership document matches the listing address.</li>
              <li>• The document is readable and not expired.</li>
              <li>• The account has no unresolved safety reports.</li>
            </ul>
          </section>

          <p className="text-xs text-muted">
            Never send original documents through chat. Upload them here so they stay in the protected review folder.
          </p>
        </aside>
      </div>
    </div>
  );
}
