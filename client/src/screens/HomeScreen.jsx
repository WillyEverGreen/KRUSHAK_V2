import { useQuery } from "@tanstack/react-query";
import {
  MdCampaign,
  MdCheckCircleOutline,
  MdChatBubbleOutline,
  MdCloud,
  MdEco,
  MdHandyman,
  MdLocationOn,
  MdNewspaper,
  MdSearch,
  MdShowChart,
  MdWarningAmber,
  MdWaterDrop,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import InstallBanner from "../components/InstallBanner";
import { fetchHomeData } from "../services/api";

const fallbackData = {
  greeting: "Good Morning",
  dashboardTitle: "KisanAI Dashboard",
  location: "Pune, Maharashtra",
  weather: { value: "31C", summary: "Partly cloudy" },
  instructions: [
    "Check irrigation level in morning and avoid overwatering.",
    "Inspect lower leaves for early pest signs before noon.",
    "Plan fertilizer for tomorrow if rain probability is low.",
  ],
  riskMeters: { waterStress: 25, pestAlert: 50, weatherRisk: 40 },
  villageAlert:
    "Pest activity rising in nearby farms. Inspect mustard and tomato leaves today.",
};

function riskColor(value) {
  if (value > 70) return "#ef4444";
  if (value > 40) return "#f97316";
  return "#4caf50";
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const { data = fallbackData } = useQuery({
    queryKey: ["home-data"],
    queryFn: fetchHomeData,
  });

  const quickTools = [
    {
      title: "Plant Identifier",
      icon: MdEco,
      color: "#D9F2DA",
      onTap: () => navigate("/diagnose"),
    },
    {
      title: "Diagnose Disease",
      icon: MdSearch,
      color: "#E3F2FD",
      onTap: () => navigate("/diagnose"),
    },
    {
      title: "Irrigation Guide",
      icon: MdWaterDrop,
      color: "#E0F7FA",
      onTap: () => navigate("/care-guides"),
    },
    {
      title: "Profit Optimizer",
      icon: MdShowChart,
      color: "#FFF3E0",
      onTap: () => navigate("/market"),
    },
    {
      title: "Agri News",
      icon: MdNewspaper,
      color: "#E8F5E9",
      onTap: () => navigate("/news"),
    },
    {
      title: "AI Chat",
      icon: MdChatBubbleOutline,
      color: "#EDE7F6",
      onTap: () => navigate("/chat"),
    },
  ];

  return (
    <div>
      <div className="hero-card">
        <div className="hero-row">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              background: "rgba(255,255,255,0.35)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <MdEco size={26} />
          </div>
          <div>
            <p className="hero-subtitle" style={{ marginBottom: 2 }}>
              {data.greeting}
            </p>
            <h1 className="hero-title">{data.dashboardTitle}</h1>
            <div
              className="row"
              style={{ alignItems: "center", color: "rgba(255,255,255,0.86)" }}
            >
              <MdLocationOn size={14} />
              <span className="text-sm">{data.location}</span>
            </div>
          </div>
          <div className="weather-chip">
            <div style={{ fontWeight: 700, fontSize: 22 }}>
              {data.weather.value}
            </div>
            <div
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.86)" }}
            >
              {data.weather.summary}
            </div>
          </div>
        </div>

        <div className="row mt-16">
          <button
            className="btn btn-outline"
            style={{ flex: 1 }}
            onClick={() => navigate("/diagnose")}
          >
            Scan Crop
          </button>
          <button
            className="btn btn-outline"
            style={{ flex: 1 }}
            onClick={() => navigate("/market")}
          >
            Market
          </button>
        </div>
      </div>

      <InstallBanner />

      <div className="card-elevated mt-16">
        <div className="text-xl" style={{ fontWeight: 800 }}>
          Today&apos;s AI Instructions
        </div>
        <div className="mt-12" style={{ display: "grid", gap: 10 }}>
          {data.instructions.map((instruction) => (
            <div
              key={instruction}
              style={{
                background: "rgba(232,245,233,0.65)",
                borderRadius: 14,
                padding: 12,
                display: "flex",
                gap: 10,
              }}
            >
              <MdCheckCircleOutline
                size={18}
                color="#2E7D32"
                style={{ marginTop: 2 }}
              />
              <div
                className="text-md"
                style={{ color: "#1b5e20", lineHeight: 1.35 }}
              >
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
          { label: "Pest Alert", key: "pestAlert", icon: MdSearch },
          { label: "Weather Risk", key: "weatherRisk", icon: MdCloud },
        ].map((item) => {
          const value = data.riskMeters[item.key];
          const Icon = item.icon;
          return (
            <div key={item.label} className="risk-card">
              <Icon size={28} color="#2E7D32" />
              <div className="health-bar mt-8">
                <span
                  style={{ width: `${value}%`, background: riskColor(value) }}
                />
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
            <button
              key={tool.title}
              className="quick-tool"
              onClick={tool.onTap}
            >
              <div
                className="quick-tool-icon"
                style={{ background: tool.color }}
              >
                <Icon size={22} />
              </div>
              <div
                className="text-xs"
                style={{
                  fontWeight: 600,
                  textAlign: "center",
                  color: "#1b5e20",
                }}
              >
                {tool.title}
              </div>
            </button>
          );
        })}
      </div>

      <div className="card mt-18" style={{ display: "flex", gap: 12 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: "#FFF4E5",
            display: "grid",
            placeItems: "center",
          }}
        >
          <MdCampaign color="#f97316" size={22} />
        </div>
        <div>
          <div className="text-lg" style={{ fontWeight: 700 }}>
            Village Alert
          </div>
          <div className="text-md muted">{data.villageAlert}</div>
        </div>
      </div>
    </div>
  );
}
