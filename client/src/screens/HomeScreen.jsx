import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MdCheckCircleOutline,
  MdChatBubbleOutline,
  MdCloud,
  MdEco,
  MdHandyman,
  MdLocationOn,
  MdNewspaper,
  MdOpacity,
  MdSearch,
  MdShowChart,
  MdWarningAmber,
  MdWaterDrop,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import InstallBanner from "../components/InstallBanner";
import DataState from "../components/DataState";
import FreshnessTag from "../components/FreshnessTag";
import { fetchHomeData } from "../services/api";

function riskColor(value) {
  if (value > 70) return "#ef4444";
  if (value > 40) return "#f97316";
  return "#4caf50";
}

function getWeatherEmoji(summary = "") {
  const s = summary.toLowerCase();
  if (s.includes("rain") || s.includes("shower") || s.includes("drizzle") || s.includes("thunder")) return "🌧️";
  if (s.includes("snow") || s.includes("flurr")) return "❄️";
  if (s.includes("cloud") && s.includes("part")) return "⛅";
  if (s.includes("cloud") || s.includes("overcast")) return "☁️";
  if (s.includes("sun") || s.includes("clear") || s.includes("hot")) return "☀️";
  return "🌤️";
}

function renderTemperature(value) {
  const s = value === null || value === undefined ? "" : String(value).trim();
  const m = s.match(/^(-?\d+(?:\.\d+)?)(?:\s*°?\s*([CFcf]))?$/);
  let num = s;
  let unit = "C";
  if (m) {
    num = m[1];
    unit = (m[2] || "C").toUpperCase();
  }
  return (
    <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{num}</span>
      <sup style={{ fontSize: 12, fontWeight: 700, lineHeight: 1 }}>{`°${unit}`}</sup>
    </span>
  );
}

export default function HomeScreen() {
  const navigate = useNavigate();

  // undefined = still waiting for GPS, null = denied/unavailable, object = resolved
  const [coords, setCoords] = useState(undefined);

  useEffect(() => {
    if (!navigator.geolocation) {
      setCoords(null); // browser doesn't support — fall back immediately
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => setCoords(null), // denied / timed out — fall back to server default
      { timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  // Don't fire the API call until we know whether we have coords or not
  const geoReady = coords !== undefined;

  /* Home data from server (includes weather, instructions, risk meters) */
  const { data, isLoading, error } = useQuery({
    queryKey: ["home-data", coords?.latitude ?? null, coords?.longitude ?? null],
    queryFn: () => fetchHomeData({ lat: coords?.latitude, lon: coords?.longitude }),
    enabled: geoReady, // wait for geolocation to resolve first
    staleTime: 5 * 60 * 1000, // 5 minutes
  });


  const quickTools = [
    { title: "Plant Identifier",  icon: MdEco,              color: "#D9F2DA", onTap: () => navigate("/diagnose") },
    { title: "Diagnose Disease",  icon: MdSearch,           color: "#E3F2FD", onTap: () => navigate("/diagnose") },
    { title: "Irrigation Guide",  icon: MdWaterDrop,        color: "#E0F7FA", onTap: () => navigate("/care-guides") },
    { title: "Profit Optimizer",  icon: MdShowChart,        color: "#FFF3E0", onTap: () => navigate("/market") },
    { title: "Agri News",         icon: MdNewspaper,        color: "#E8F5E9", onTap: () => navigate("/news") },
    { title: "AI Chat",           icon: MdChatBubbleOutline,color: "#EDE7F6", onTap: () => navigate("/chat") },
  ];

  return (
    <DataState loading={isLoading} error={error} empty={!data}>
      {data && (
        <div>
          <div className="hero-card">
            <div className="row-between" style={{ alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: 16,
                      background: "#fff",
                      display: "grid", placeItems: "center", flexShrink: 0,
                      overflow: "hidden"
                    }}
                  >
                    <img src="/logo.png" alt="Krushak Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                  <p className="hero-subtitle" style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {data.greeting}
                  </p>
                </div>
                
                <h1 className="hero-title" style={{ fontSize: 24, lineHeight: 1.1, marginBottom: 8, wordBreak: "break-word" }}>
                  {data.dashboardTitle}
                </h1>
                
                <div className="row" style={{ alignItems: "center", color: "rgba(255,255,255,0.86)" }}>
                  <MdLocationOn size={14} />
                  <span className="text-sm" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{data.location}</span>
                </div>
              </div>

              {/* ── Weather Chip ── */}
              <div 
                className="weather-chip" 
                style={{ 
                  flexShrink: 0, 
                  background: "rgba(255, 255, 255, 0.16)",
                  backdropFilter: "blur(8px)",
                  borderRadius: 20,
                  padding: "12px 14px",
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "flex-end",
                  minWidth: 100,
                  maxWidth: 120
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{getWeatherEmoji(data.weather.summary)}</span>
                  {renderTemperature(data.weather.value)}
                </div>
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.9)", marginTop: 6, textAlign: "right", lineHeight: 1.2 }}>
                  {data.weather.summary}
                </div>
                {data.weather.precipitation !== undefined && (
                  <div
                    className="row"
                    style={{
                      marginTop: 6, gap: 3,
                      color: "rgba(255,255,255,0.75)", fontSize: 11,
                      justifyContent: "flex-end"
                    }}
                  >
                    <MdOpacity size={12} />
                    <span>{data.weather.precipitation} mm</span>
                  </div>
                )}
                <div style={{ marginTop: 8, width: "100%", display: "flex", justifyContent: "flex-end" }}>
                  <FreshnessTag 
                    generatedAt={data.weather.generatedAt} 
                    stale={data.weather.stale}
                    style={{ 
                      background: "rgba(0,0,0,0.15)", 
                      color: "white", 
                      backdropFilter: "blur(4px)",
                      border: "1px solid rgba(255,255,255,0.1)"
                    }} 
                  />
                </div>
              </div>
            </div>

            <div className="row mt-16" style={{ gap: 12 }}>
              <button 
                className="btn" 
                style={{ flex: 1, background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 14 }} 
                onClick={() => navigate("/diagnose")}
              >
                Scan Crop
              </button>
              <button 
                className="btn" 
                style={{ flex: 1, background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 14 }} 
                onClick={() => navigate("/market")}
              >
                Market
              </button>
            </div>
          </div>

          <InstallBanner />

          <div className="card-elevated mt-16">
            <div className="row-between">
              <div className="text-xl" style={{ fontWeight: 800 }}>
                Today&apos;s AI Instructions
              </div>
              <FreshnessTag generatedAt={data.generatedAt} />
            </div>
            <div className="mt-12" style={{ display: "grid", gap: 10 }}>
              {data.instructions.map((instruction) => (
                <div
                  key={instruction}
                  style={{
                    background: "rgba(232,245,233,0.65)",
                    borderRadius: 14, padding: 12,
                    display: "flex", gap: 10,
                  }}
                >
                  <MdCheckCircleOutline size={18} color="#2E7D32" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div className="text-md" style={{ color: "#1b5e20", lineHeight: 1.35 }}>
                    {instruction}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section-title mt-16">
            <MdWarningAmber />
            <span>Risk Meters</span>
          </div>
          <div className="risk-grid">
            {[
              { label: "Water Stress", key: "waterStress", icon: MdWaterDrop },
              { label: "Pest Alert",   key: "pestAlert",   icon: MdSearch },
              { label: "Weather Risk", key: "weatherRisk", icon: MdCloud },
            ].map((item) => {
              const value = data.riskMeters[item.key];
              const Icon = item.icon;
              return (
                <div key={item.label} className="risk-card">
                  <Icon size={28} color="#2E7D32" />
                  <div className="health-bar mt-8">
                    <span style={{ width: `${value}%`, background: riskColor(value) }} />
                  </div>
                  <div className="text-lg mt-8" style={{ fontWeight: 700 }}>
                    {value}%
                  </div>
                  <div className="text-xs muted">{item.label}</div>
                </div>
              );
            })}
          </div>


          <div className="section-title mt-18">
            <MdHandyman />
            <span>Quick Tools</span>
          </div>
          <div className="grid-3">
            {quickTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button key={tool.title} className="quick-tool" onClick={tool.onTap}>
                  <div className="quick-tool-icon" style={{ background: tool.color }}>
                    <Icon size={22} />
                  </div>
                  <div className="text-xs" style={{ fontWeight: 600, textAlign: "center", color: "#1b5e20" }}>
                    {tool.title}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </DataState>
  );
}
