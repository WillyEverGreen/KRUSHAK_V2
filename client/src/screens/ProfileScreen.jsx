import { useMemo, useState } from "react";
import {
  MdChevronRight,
  MdHelpOutline,
  MdLanguage,
  MdLogin,
  MdLocationOn,
  MdLogout,
  MdShield,
  MdTune,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "../app/store";

const languages = [
  { code: "en", nativeName: "English" },
  { code: "hi", nativeName: "Hindi" },
  { code: "mr", nativeName: "Marathi" },
  { code: "te", nativeName: "Telugu" },
  { code: "ta", nativeName: "Tamil" },
  { code: "kn", nativeName: "Kannada" },
  { code: "bn", nativeName: "Bengali" },
  { code: "pa", nativeName: "Punjabi" },
];

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { user, clearSession, languageCode, setLanguageCode } = useSessionStore();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const activeLanguage =
    languages.find((lang) => lang.code === languageCode)?.nativeName ||
    languageCode.toUpperCase();

  const profileCompletion = useMemo(() => {
    if (!user) return 0;
    const checks = [user.fullName, user.email, user.village, user.district];
    const filled = checks.filter((value) => Boolean(String(value || "").trim())).length;
    return Math.round((filled / checks.length) * 100);
  }, [user]);

  const locationLabel = [user?.village, user?.district].filter(Boolean).join(", ");

  /* ── Logged-out view ───────────────────────────────────── */
  if (!user) {
    return (
      <div>
        <div className="profile-login-cta">
          <div className="profile-login-cta-icon">🌾</div>
          <div className="profile-login-cta-title">Welcome to Krushak</div>
          <div className="profile-login-cta-sub">
            Login or create a free account to save your crops, set reminders,
            and get personalised farming advice.
          </div>
          <button
            className="profile-login-btn"
            onClick={() => navigate("/login")}
            id="profile-login-btn"
          >
            <MdLogin size={20} />
            Login / Register
          </button>
        </div>

        {/* Language picker still available without login */}
        <div className="card-elevated mt-16">
          <div
            className="text-xs muted"
            style={{ fontWeight: 700, letterSpacing: 1 }}
          >
            LANGUAGE
          </div>
          <ProfileItem
            icon={<MdLanguage size={20} color="#757575" />}
            title={`Change Language (${languageCode.toUpperCase()})`}
            subtitle={`Current: ${activeLanguage}`}
            onClick={() => setShowLanguagePicker((p) => !p)}
          />
          {showLanguagePicker && (
            <div style={{ marginTop: 6, display: "grid", gap: 8 }}>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  className="btn"
                  style={{
                    background: lang.code === languageCode ? "#e8f5e9" : "#f8faf8",
                    color: "#1b5e20",
                    textAlign: "left",
                    border: "1px solid #e5ece7",
                      fontWeight: 600,
                  }}
                  onClick={() => {
                    setLanguageCode(lang.code);
                    setShowLanguagePicker(false);
                  }}
                >
                  {lang.nativeName}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card-elevated mt-16">
          <div className="text-xs muted" style={{ fontWeight: 700, letterSpacing: 1 }}>
            SUPPORT
          </div>
          <ProfileItem
            icon={<MdHelpOutline size={20} color="#757575" />}
            title="Help and FAQ"
            subtitle="Get answers about diagnostics, reminders, and account"
            onClick={() => navigate("/faq")}
          />
        </div>
      </div>
    );
  }

  /* ── Logged-in view ────────────────────────────────────── */
  const initials = user.fullName
    ? user.fullName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "F";

  return (
    <div>
      <div
        className="profile-user-badge"
        style={{
          marginBottom: 12,
          background:
            "linear-gradient(135deg, rgba(46,125,50,0.97), rgba(67,160,71,0.95))",
          boxShadow: "0 10px 22px rgba(46,125,50,0.2)",
        }}
      >
        <div className="profile-user-avatar">
          <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
            {initials}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="profile-user-name">{user.fullName || "Farmer"}</div>
          <div className="profile-user-email">{user.email || ""}</div>
          {locationLabel && (
            <div
              style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 4 }}
            >
              <MdLocationOn
                size={12}
                style={{ marginRight: 4, verticalAlign: "text-top" }}
              />
              {locationLabel}
            </div>
          )}
        </div>
      </div>

      <div
        className="card"
        style={{
          borderRadius: 18,
          borderColor: "#dce7dc",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fcf8 100%)",
        }}
      >
        <div className="row-between" style={{ alignItems: "center" }}>
          <div className="text-sm" style={{ fontWeight: 800, color: "#1b5e20" }}>
            Profile Strength
          </div>
          <div className="chip">{profileCompletion}% Complete</div>
        </div>
        <div className="health-bar mt-8">
          <span style={{ width: `${profileCompletion}%` }} />
        </div>
        <div className="text-xs muted mt-8" style={{ lineHeight: 1.4 }}>
          Complete village and district to get more local and accurate advisory results.
        </div>
      </div>

      <div className="mt-12" style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <ProfileQuickStat
          icon={<MdLanguage size={16} color="#2e7d32" />}
          label="Language"
          value={activeLanguage}
        />
        <ProfileQuickStat
          icon={<MdShield size={16} color="#2e7d32" />}
          label="Session"
          value="Secure"
        />
      </div>

      <div className="card-elevated mt-16">
        <div
          className="text-xs muted"
          style={{ fontWeight: 700, letterSpacing: 1 }}
        >
          SETTINGS
        </div>
        <ProfileItem
          icon={<MdTune size={20} color="#757575" />}
          title={`Change Language (${languageCode.toUpperCase()})`}
          subtitle="Switch the app language for labels and tips"
          onClick={() => setShowLanguagePicker((p) => !p)}
        />
        {showLanguagePicker && (
          <div style={{ marginTop: 6, display: "grid", gap: 8 }}>
            {languages.map((lang) => (
              <button
                key={lang.code}
                className="btn"
                style={{
                  background: lang.code === languageCode ? "#e8f5e9" : "#f8faf8",
                  color: "#1b5e20",
                  textAlign: "left",
                  border: "1px solid #e5ece7",
                  fontWeight: 600,
                }}
                onClick={() => {
                  setLanguageCode(lang.code);
                  setShowLanguagePicker(false);
                }}
              >
                {lang.nativeName}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card-elevated mt-16">
        <div
          className="text-xs muted"
          style={{ fontWeight: 700, letterSpacing: 1 }}
        >
          SUPPORT
        </div>
        <ProfileItem
          icon={<MdHelpOutline size={20} color="#757575" />}
          title="Help and FAQ"
          subtitle="Find walkthroughs and common issue fixes"
          onClick={() => navigate("/faq")}
        />
        <ProfileItem
          icon={<MdLogout size={20} color="#ef4444" />}
          title="Logout"
          subtitle="Sign out from this device"
          destructive
          onClick={() => {
            clearSession();
            navigate("/login", { replace: true });
          }}
        />
      </div>
    </div>
  );
}

function ProfileQuickStat({ icon, label, value }) {
  return (
    <div
      className="card"
      style={{
        borderRadius: 14,
        padding: 10,
        background: "#fbfefb",
      }}
    >
      <div className="row" style={{ alignItems: "center" }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
            background: "#e8f5e9",
          }}
        >
          {icon}
        </div>
        <div className="text-xs muted" style={{ marginLeft: 8, fontWeight: 700 }}>
          {label}
        </div>
      </div>
      <div className="text-sm" style={{ marginTop: 8, fontWeight: 700, color: "#1b5e20" }}>
        {value}
      </div>
    </div>
  );
}

function ProfileItem({
  icon,
  title,
  subtitle,
  onClick,
  destructive = false,
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        background: "transparent",
        border: "none",
        padding: "12px 0",
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 10,
          display: "grid",
          placeItems: "center",
          background: destructive ? "#fff1f2" : "#f4f8f4",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          marginLeft: 16,
          flex: 1,
          textAlign: "left",
        }}
      >
        <div
          style={{
            color: destructive ? "#ef4444" : "#1b5e20",
            fontSize: 16,
            fontFamily: "inherit",
            fontWeight: 600,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div className="text-xs muted" style={{ marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </div>
      {!destructive && <MdChevronRight color="#9ca3af" size={20} />}
    </button>
  );
}
