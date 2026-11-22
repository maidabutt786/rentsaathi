import { useState } from "react";
import { Link } from "react-router-dom";
import { MailCheck, Send } from "lucide-react";

import { useAuth, friendlyAuthError } from "../../context/AuthContext.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { demoMode } from "../../lib/firebase.js";
import Logo from "../../components/ui/Logo.jsx";
import Button from "../../components/ui/Button.jsx";
import { Input } from "../../components/ui/Field.jsx";

export default function ForgotPasswordPage() {
  useDocumentTitle("Reset password");
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter the email you used to sign up.");
      return;
    }
    setSaving(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <Logo height={48} />
        <h1 className="mt-6 font-heading text-2xl font-bold">Reset your password</h1>
        <p className="mt-2 text-sm text-muted">We will email you a secure link to choose a new password.</p>

        {sent ? (
          <div className="card mt-6 p-6">
            <MailCheck className="h-8 w-8 text-status-verified" aria-hidden="true" />
            <h2 className="mt-3 font-heading text-lg font-semibold">Check your inbox</h2>
            <p className="mt-2 text-sm text-muted">
              {demoMode
                ? "Preview mode: no email was sent. In a real deployment Firebase sends a reset link."
                : `If an account exists for ${email}, a reset link is on its way. Check spam too.`}
            </p>
            <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
              Back to log in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="card mt-6 space-y-4 p-6" noValidate>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={error}
              autoComplete="email"
              required
            />
            <Button type="submit" className="w-full" loading={saving}>
              <Send className="h-4 w-4" aria-hidden="true" /> Send reset link
            </Button>
            <p className="text-center text-xs text-muted">
              Remembered it?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Log in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
