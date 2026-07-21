import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") await signup(username, email, password);
      else await login(username, password);
      navigate("/library");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ошибка");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-5 pt-8">
      <h1 className="font-display text-2xl">
        {mode === "signup" ? "регистрация" : "вход"}
      </h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field
          label={mode === "signup" ? "юзернейм" : "юзернейм или email"}
          value={username}
          onChange={setUsername}
          autoComplete="username"
        />
        {mode === "signup" && (
          <Field
            label="email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
        )}
        <Field
          label="пароль"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
        {error && <p className="font-mono text-sm text-accent">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-1 rounded-card bg-accent px-4 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? "…" : mode === "signup" ? "создать аккаунт" : "войти"}
        </button>
      </form>
      <p className="text-sm text-muted">
        {mode === "signup" ? (
          <>
            уже есть аккаунт?{" "}
            <Link to="/login" className="text-accent hover:underline">
              войти
            </Link>
          </>
        ) : (
          <>
            нет аккаунта?{" "}
            <Link to="/signup" className="text-accent hover:underline">
              регистрация
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="rounded-card border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}
