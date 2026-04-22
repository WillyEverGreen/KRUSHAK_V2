import { useState } from "react";
import {
  MdEco,
  MdEmail,
  MdLock,
  MdPerson,
  MdVisibility,
  MdVisibilityOff,
  MdArrowBack,
  MdLocationCity,
  MdHome,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { login, register } from "../services/api";
import { useSessionStore } from "../app/store";

/* ─── AuthScreen ───────────────────────────────────────────── */
export default function AuthScreen() {
  const [tab, setTab] = useState("login"); // "login" | "register"

  return (
    <div className="auth-screen">
      {/* Background blobs */}
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />

      <div className="auth-card">
        {/* Logo / branding */}
        <div className="auth-logo">
          <div className="auth-logo-icon" style={{ padding: 0, overflow: "hidden", background: "#fff" }}>
            <img src="/logo.png" alt="Krushak Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div>
            <div className="auth-logo-title">Krushak</div>
            <div className="auth-logo-sub">Smart Farming Assistant</div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="auth-tab-strip">
          <button
            className={`auth-tab ${tab === "login" ? "active" : ""}`}
            onClick={() => setTab("login")}
            id="auth-tab-login"
          >
            Login
          </button>
          <button
            className={`auth-tab ${tab === "register" ? "active" : ""}`}
            onClick={() => setTab("register")}
            id="auth-tab-register"
          >
            Register
          </button>
        </div>

        {tab === "login" ? <LoginForm /> : <RegisterForm onSuccess={() => setTab("login")} />}
      </div>

      {/* Skip login */}
      <div className="auth-skip">
        <span>Just exploring? </span>
        <a href="/home" className="auth-skip-link">Continue without login →</a>
      </div>
    </div>
  );
}

/* ─── Login Form ───────────────────────────────────────────── */
function LoginForm() {
  const navigate = useNavigate();
  const setSession = useSessionStore((s) => s.setSession);

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login({ email: email.trim(), password });
      setSession({ token: data.token, user: data.user });
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleLogin} id="login-form">
      <div className="auth-welcome">
        <div className="auth-welcome-title">Welcome back 👋</div>
        <div className="auth-welcome-sub">Login to manage your farm</div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <AuthField icon={<MdEmail size={18} />} label="Email / Mobile">
        <input
          type="email"
          className="auth-input"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          id="login-email"
        />
      </AuthField>

      <AuthField icon={<MdLock size={18} />} label="Password">
        <div className="auth-pass-wrap">
          <input
            type={showPass ? "text" : "password"}
            className="auth-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            id="login-password"
          />
          <button
            type="button"
            className="auth-eye-btn"
            onClick={() => setShowPass((p) => !p)}
            tabIndex={-1}
          >
            {showPass ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
          </button>
        </div>
      </AuthField>

      <button
        type="submit"
        className="auth-submit-btn"
        disabled={loading}
        id="login-submit"
      >
        {loading ? (
          <span className="auth-btn-loading">
            <span className="auth-spinner" /> Logging in…
          </span>
        ) : (
          "🔑 Login to My Farm"
        )}
      </button>
    </form>
  );
}

/* ─── Register Form ────────────────────────────────────────── */
function RegisterForm({ onSuccess }) {
  const [fullName, setFullName]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });
      setSuccess(true);
      setTimeout(() => onSuccess(), 1800);
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-success">
        <div className="auth-success-icon">✅</div>
        <div className="auth-success-title">Account Created!</div>
        <div className="auth-success-sub">Redirecting you to login…</div>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleRegister} id="register-form">
      <div className="auth-welcome">
        <div className="auth-welcome-title">Join Krushak 🌱</div>
        <div className="auth-welcome-sub">Create your free farmer account</div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <AuthField icon={<MdPerson size={18} />} label="Full Name">
        <input
          type="text"
          className="auth-input"
          placeholder="e.g. Ramesh Kumar"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          id="reg-name"
        />
      </AuthField>

      <AuthField icon={<MdEmail size={18} />} label="Email">
        <input
          type="email"
          className="auth-input"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          id="reg-email"
        />
      </AuthField>

      <div className="auth-two-col">
        <AuthField icon={<MdLock size={18} />} label="Password">
          <div className="auth-pass-wrap">
            <input
              type={showPass ? "text" : "password"}
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              id="reg-password"
            />
            <button
              type="button"
              className="auth-eye-btn"
              onClick={() => setShowPass((p) => !p)}
              tabIndex={-1}
            >
              {showPass ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
            </button>
          </div>
        </AuthField>

        <AuthField icon={<MdLock size={18} />} label="Confirm">
          <input
            type="password"
            className="auth-input"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            id="reg-confirm"
          />
        </AuthField>
      </div>

      <button
        type="submit"
        className="auth-submit-btn"
        disabled={loading}
        id="register-submit"
      >
        {loading ? (
          <span className="auth-btn-loading">
            <span className="auth-spinner" /> Creating account…
          </span>
        ) : (
          "🌾 Create My Account"
        )}
      </button>

      <div className="auth-terms">
        By registering you agree to our{" "}
        <a href="/faq" className="auth-link">Terms of Use</a>.
        Your data is stored securely on MongoDB Atlas.
      </div>
    </form>
  );
}

/* ─── Reusable field wrapper ────────────────────────────────── */
function AuthField({ icon, label, children }) {
  return (
    <div className="auth-field">
      <label className="auth-label">
        {icon}
        <span>{label}</span>
      </label>
      {children}
    </div>
  );
}
