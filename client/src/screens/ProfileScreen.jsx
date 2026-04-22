import {
  MdChevronRight,
  MdHelpOutline,
  MdLanguage,
  MdLogin,
  MdLogout,
  MdPerson,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "../app/store";
import { useState } from "react";

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
          <div className="text-xs muted" style={{ fontWeight: 700, letterSpacing: 1 }}>
            LANGUAGE
          </div>
          <ProfileItem
            icon={<MdLanguage size={20} color="#757575" />}
            title={`Change Language (${languageCode.toUpperCase()})`}
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
            onClick={() => navigate("/faq")}
          />
        </div>
      </div>
    );
  }

  /* ── Logged-in view ────────────────────────────────────── */
  const initials = user.fullName
    ? user.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "F";

  return (
    <div>
      {/* User badge */}
      <div className="profile-user-badge">
        <div className="profile-user-avatar">
          <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{initials}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="profile-user-name">{user.fullName || "Farmer"}</div>
          <div className="profile-user-email">{user.email || ""}</div>
          {(user.village || user.district) && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.72)", marginTop: 2 }}>
              📍 {[user.village, user.district].filter(Boolean).join(", ")}
            </div>
          )}
        </div>
      </div>

      <div className="card-elevated mt-12">
        <div className="text-xs muted" style={{ fontWeight: 700, letterSpacing: 1 }}>
          SETTINGS
        </div>
        <ProfileItem
          icon={<MdLanguage size={20} color="#757575" />}
          title={`Change Language (${languageCode.toUpperCase()})`}
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
          onClick={() => navigate("/faq")}
        />
        <ProfileItem
          icon={<MdLogout size={20} color="#ef4444" />}
          title="Logout"
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

function ProfileItem({ icon, title, onClick, destructive = false }) {
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
      {icon}
      <span
        style={{
          marginLeft: 16,
          flex: 1,
          textAlign: "left",
          color: destructive ? "#ef4444" : "#1b5e20",
          fontSize: 16,
          fontFamily: "inherit",
        }}
      >
        {title}
      </span>
      {!destructive && <MdChevronRight color="#9ca3af" size={20} />}
    </button>
  );
}
