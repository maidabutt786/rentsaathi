import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Info, LogIn } from "lucide-react";

import { useAuth, friendlyAuthError } from "../../context/AuthContext.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { DEMO_CREDENTIALS, ROLE_HOME } from "../../lib/constants.js";
import { demoMode } from "../../lib/firebase.js";
import Logo from "../../components/ui/Logo.jsx";
import Button from "../../components/ui/Button.jsx";
import { Input } from "../../components/ui/Field.jsx";

export default function LoginPage() {
  useDocumentTitle("Log in");
  const { login, user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const next = searchParams.get("next") || location.state?.next;

  useEffect(() => {
    if (user && profile) {
      const destination = next || ROLE_HOME[profile.role] || "/";
      navigate(destination, { replace: true });
    }
  }, [user, profile, next, navigate]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.email || !form.password) {
      setError("Enter your email and password.");
      return;
    }
    setSaving(true);
    try {
      const account = await login(form.email, form.password);
      const role = account?.role || profile?.role;
      navigate(next || ROLE_HOME[role] || "/", { replace: true });
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-2 lg:items-center">
      <div className="mx-auto w-full max-w-md">
        <Logo height={52} />
        <h1 className="mt-6 font-heading text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">Log in to manage your rooms, chats and visit requests.</p>

        {demoMode ? (
          <div className="mt-5 rounded-xl border border-status-info/25 bg-status-info/5 p-4 text-xs text-muted">
            <p className="flex items-center gap-2 font-semibold text-status-info">
              <Info className="h-4 w-4" aria-hidden="true" /> Preview mode
            </p>
            <p className="mt-1">
              Firebase keys are not configured, so this build uses local demo data. Use any account below.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DEMO_CREDENTIALS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => setForm({ email: account.email, password: account.password })}
                  className="rounded-full border border-line bg-surface px-2.5 py-1 font-medium text-ink transition hover:border-primary/40 hover:text-primary"
                >
                  {account.label || account.role}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="you@example.com"
            required
          />
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-[34px] rounded-md p-1 text-muted hover:text-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error ? (
            <p className="rounded-lg bg-status-highrisk/10 px-3 py-2 text-sm font-medium text-status-highrisk" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="font-medium text-primary hover:underline">
              Forgot your password?
            </Link>
          </div>

          <Button type="submit" className="w-full" loading={saving} size="lg">
            <LogIn className="h-4 w-4" aria-hidden="true" /> Log in
          </Button>
        </form>

        <p className="mt-5 text-sm text-muted">
          New to RentSaathi?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>

      <div className="hidden lg:block">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-soft via-background to-secondary-soft p-10">
          <Logo height={60} linked={false} />
          <h2 className="mt-8 max-w-sm font-heading text-2xl font-semibold">
            One account for saved rooms, visit requests and chats.
          </h2>
          <ul className="mt-6 space-y-3 text-sm text-muted">
            <li>• Students save favourites and keep every conversation in one inbox.</li>
            <li>• Landlords manage listings, documents and AI results in a dashboard.</li>
            <li>• Admins review flagged listings with the evidence side by side.</li>
          </ul>
          <p className="mt-8 text-xs text-muted">
            Protected by Firebase Authentication. We never see or store your password.
          </p>
        </div>
      </div>
    </div>
  );
}
