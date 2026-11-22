import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, GraduationCap, Home, Info, UserPlus } from "lucide-react";

import { useAuth, friendlyAuthError } from "../../context/AuthContext.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { ROLE_HOME, UNIVERSITIES } from "../../lib/constants.js";
import { demoMode } from "../../lib/firebase.js";
import Logo from "../../components/ui/Logo.jsx";
import Button from "../../components/ui/Button.jsx";
import { Input, Select } from "../../components/ui/Field.jsx";

const ROLES = [
  {
    value: "student",
    title: "I am a student",
    body: "Find rooms, save favourites, message landlords and request visits.",
    icon: GraduationCap,
  },
  {
    value: "landlord",
    title: "I am a landlord",
    body: "List rooms, upload documents for verification and manage enquiries.",
    icon: Home,
  },
];

export default function SignupPage() {
  useDocumentTitle("Create an account");
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState(searchParams.get("role") === "landlord" ? "landlord" : "student");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    university: "",
    password: "",
    confirm: "",
    terms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 3) next.name = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Enter a valid email address.";
    if (!/^[0-9+\-\s()]{7,20}$/.test(form.phone)) next.phone = "Enter a phone number students can reach.";
    if (role === "student" && !form.university) next.university = "Choose your university.";
    if (form.password.length < 8) next.password = "Use at least 8 characters.";
    if (form.password !== form.confirm) next.confirm = "Passwords do not match.";
    if (!form.terms) next.terms = "Please accept the safety rules and terms.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!validate()) return;
    setSaving(true);
    try {
      await signup({
        name: form.name,
        email: form.email,
        password: form.password,
        role,
        phone: form.phone,
        university: role === "student" ? UNIVERSITIES.find((item) => item.id === form.university)?.name || form.university : "",
      });
      navigate(role === "landlord" ? "/landlord/verification" : ROLE_HOME[role], { replace: true });
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-2xl">
        <Logo height={50} />
        <h1 className="mt-6 font-heading text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-muted">Free for students and landlords. Choose your role to get the right dashboard.</p>

        {demoMode ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-status-info/25 bg-status-info/5 p-3 text-xs text-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-status-info" aria-hidden="true" />
            Preview mode: the account is stored only in this browser. Connect Firebase to create real accounts.
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Account type">
          {ROLES.map((option) => {
            const Icon = option.icon;
            const selected = role === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setRole(option.value)}
                className={`rounded-xl border p-4 text-left transition ${
                  selected ? "border-primary bg-primary-soft" : "border-line bg-surface hover:border-primary/30"
                }`}
              >
                <Icon className={`h-5 w-5 ${selected ? "text-primary" : "text-muted"}`} aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold">{option.title}</p>
                <p className="mt-1 text-xs text-muted">{option.body}</p>
              </button>
            );
          })}
        </div>

        <form onSubmit={submit} className="card mt-5 space-y-4 p-6" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              error={errors.name}
              autoComplete="name"
              required
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(event) => set("phone", event.target.value)}
              error={errors.phone}
              placeholder="+92 3XX XXXXXXX"
              autoComplete="tel"
              required
            />
            <Input
              className="sm:col-span-2"
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => set("email", event.target.value)}
              error={errors.email}
              autoComplete="email"
              required
            />
            {role === "student" ? (
              <Select
                className="sm:col-span-2"
                label="University"
                value={form.university}
                onChange={(event) => set("university", event.target.value)}
                error={errors.university}
                required
              >
                <option value="">Choose your university</option>
                {UNIVERSITIES.map((university) => (
                  <option key={university.id} value={university.id}>
                    {university.name} · {university.city}
                  </option>
                ))}
              </Select>
            ) : null}
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => set("password", event.target.value)}
                error={errors.password}
                hint="At least 8 characters."
                autoComplete="new-password"
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
            <Input
              label="Confirm password"
              type={showPassword ? "text" : "password"}
              value={form.confirm}
              onChange={(event) => set("confirm", event.target.value)}
              error={errors.confirm}
              autoComplete="new-password"
              required
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={form.terms}
              onChange={(event) => set("terms", event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-line accent-primary"
            />
            <span>
              I agree to the{" "}
              <Link to="/safety" className="font-medium text-primary hover:underline">
                safety rules
              </Link>{" "}
              and confirm the information I provide is accurate.
            </span>
          </label>
          {errors.terms ? <p className="text-xs font-medium text-status-highrisk">{errors.terms}</p> : null}

          {error ? (
            <p className="rounded-lg bg-status-highrisk/10 px-3 py-2 text-sm font-medium text-status-highrisk" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" size="lg" loading={saving}>
            <UserPlus className="h-4 w-4" aria-hidden="true" /> Create account
          </Button>
          <p className="text-center text-xs text-muted">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
