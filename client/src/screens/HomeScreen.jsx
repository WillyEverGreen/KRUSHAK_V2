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
import { fetchHomeData, sendChatMessage } from "../services/api";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

function getWeatherEmoji(summary = "") {
  const s = summary.toLowerCase();
  if (s.includes("rain") || s.includes("shower") || s.includes("drizzle") || s.includes("thunder")) return "🌧️";
  if (s.includes("snow") || s.includes("flurr")) return "❄️";
  if (s.includes("cloud") && s.includes("part")) return "⛅";
  if (s.includes("cloud") || s.includes("overcast")) return "☁️";
  if (s.includes("sun") || s.includes("clear") || s.includes("hot")) return "☀️";
  return "🌤️";
}

function formatTemperature(value) {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  if (s.includes("°")) return s; // already has degree
  // match number with optional unit (C or F)
  const m = s.match(/^(-?\d+(?:\.\d+)?)(?:\s*([CFcf]))?$/);
  if (m) {
    const num = m[1];
    const unit = (m[2] || "C").toUpperCase();
    return `${num}°${unit}`;
  }
  return s;
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
      <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{num}</span>
      <sup style={{ fontSize: 12, fontWeight: 700, lineHeight: 1 }}>{`°${unit}`}</sup>
    </span>
  );
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const { data = fallbackData } = useQuery({
    queryKey: ["home-data"],
    queryFn: fetchHomeData,
  });

  const [chatInput, setChatInput] = useState("");
  const [lastReply, setLastReply] = useState(null);

  const chatMutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (replyData) => {
      setLastReply(replyData.reply || replyData);
    },
    onError: () => {
      setLastReply("Sorry, I could not process your request right now. Please try again.");
    },
  });

  const handleQuickChat = () => {
    if (!chatInput.trim()) return;
    setLastReply("Thinking...");
    chatMutation.mutate({ message: chatInput, history: [] });
    setChatInput("");
  };

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
            <div style={{ fontWeight: 700, fontSize: 22, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22 }}>{getWeatherEmoji(data.weather.summary)}</span>
              {renderTemperature(data.weather.value)}
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

      <div className="section-title mt-16">
        <MdChatBubbleOutline />
        <span>Quick AI Chat</span>
      </div>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {lastReply && (
          <div style={{ background: "#F1F8E9", padding: 12, borderRadius: 8, fontSize: 14, color: "#1b5e20", lineHeight: 1.4 }}>
            <strong>AI:</strong>
            <div style={{ marginTop: 8 }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ node, ...props }) => (
                    <div style={{ overflowX: "auto", margin: "12px 0", borderRadius: "8px", border: "1px solid #c8e6c9", backgroundColor: "#fff" }}>
                      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "14px" }} {...props} />
                    </div>
                  ),
                  th: ({ node, ...props }) => (
                    <th style={{ borderBottom: "2px solid #a5d6a7", padding: "10px", textAlign: "left", color: "#1b5e20", fontWeight: 700 }} {...props} />
                  ),
                  td: ({ node, ...props }) => (
                    <td style={{ borderBottom: "1px solid #e8f5e9", padding: "10px", verticalAlign: "top" }} {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p style={{ margin: "8px 0", lineHeight: "1.5" }} {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul style={{ paddingLeft: "20px", margin: "8px 0" }} {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol style={{ paddingLeft: "20px", margin: "8px 0" }} {...props} />
                  ),
                }}
              >
                {lastReply}
              </ReactMarkdown>
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="search-input"
            style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #ccc" }}
            placeholder="Ask KisanAI a quick question..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleQuickChat();
              }
            }}
          />
          <button 
            className="btn btn-primary" 
            onClick={handleQuickChat}
            disabled={chatMutation.isPending || !chatInput.trim()}
            style={{ padding: "0 16px" }}
          >
            {chatMutation.isPending ? "..." : "Ask"}
          </button>
        </div>
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

      {/* Village Alert removed - now provided via News/Advisory pipeline with source attribution */}
    </div>
  );
}
