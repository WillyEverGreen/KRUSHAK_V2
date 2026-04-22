import { useState } from "react";
import {
  MdAutoAwesome,
  MdChevronRight,
  MdHelpOutline,
  MdLanguage,
  MdLogout,
  MdPerson,
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
  const { user, clearSession, languageCode, setLanguageCode } =
    useSessionStore();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const name = user?.fullName || "Farmer User";
  const village = user?.village || "Village Name";
  const district = user?.district || "District";

  return (
    <div>
      <div style={{ height: 20 }} />
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          background: "#e5e7eb",
          border: "3px solid #d1d5db",
          margin: "0 auto",
          display: "grid",
          placeItems: "center",
        }}
      >
        <MdPerson size={52} color="#9ca3af" />
      </div>
      <div style={{ textAlign: "center" }} className="mt-16">
        <div className="text-xxl" style={{ fontWeight: 700 }}>
          {name}
        </div>
        <div className="text-sm muted">
          {village}, {district}
        </div>
      </div>

      <div className="card-elevated mt-20">
        <div
          className="text-xs muted"
          style={{ fontWeight: 700, letterSpacing: 1 }}
        >
          SETTINGS
        </div>
        <ProfileItem
          icon={<MdLanguage size={20} color="#757575" />}
          title={`Change Language (${languageCode.toUpperCase()})`}
          onClick={() => setShowLanguagePicker((prev) => !prev)}
        />
        <ProfileItem
          icon={<MdAutoAwesome size={20} color="#757575" />}
          title="AI Autopilot"
          onClick={() =>
            window.alert(
              "Autopilot flow can be connected in the next milestone.",
            )
          }
        />

        {showLanguagePicker && (
          <div style={{ marginTop: 6, display: "grid", gap: 8 }}>
            {languages.map((lang) => (
              <button
                key={lang.code}
                className="btn"
                style={{
                  background:
                    lang.code === languageCode ? "#e8f5e9" : "#f8faf8",
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
        <div
          className="text-xs muted"
          style={{ fontWeight: 700, letterSpacing: 1 }}
        >
          SUPPORT
        </div>
        <ProfileItem
          icon={<MdHelpOutline size={20} color="#757575" />}
          title="Help and FAQ"
          onClick={() => navigate("/chat")}
        />
        <ProfileItem
          icon={<MdLogout size={20} color="#ef4444" />}
          title="Logout"
          destructive
          onClick={() => {
            clearSession();
            window.alert("Logged out from local session.");
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
        }}
      >
        {title}
      </span>
      {!destructive && <MdChevronRight color="#9ca3af" size={20} />}
    </button>
  );
}
