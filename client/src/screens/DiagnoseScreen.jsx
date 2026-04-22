import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MdAnalytics,
  MdCameraAlt,
  MdSearch,
  MdWarningAmber,
} from "react-icons/md";
import { fetchDiseaseCatalog, fetchRecentDiagnoses } from "../services/api";

function severityColor(severity) {
  if (severity === "High") return "#ef4444";
  if (severity === "Medium") return "#f97316";
  return "#2e7d32";
}

export default function DiagnoseScreen() {
  const [query, setQuery] = useState("");

  const { data: diseaseList = [] } = useQuery({
    queryKey: ["disease-catalog", query],
    queryFn: () => fetchDiseaseCatalog(query),
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["recent-diagnoses"],
    queryFn: fetchRecentDiagnoses,
  });

  const headline = useMemo(() => {
    if (!query.trim()) return "Diagnose Disease";
    return `Search Results (${diseaseList.length})`;
  }, [query, diseaseList.length]);

  return (
    <div>
      <div className="page-header">
        <div className="text-xxl" style={{ fontWeight: 800 }}>
          {headline}
        </div>
        <div className="mt-12" style={{ position: "relative" }}>
          <MdSearch
            style={{
              position: "absolute",
              left: 12,
              top: 12,
              color: "rgba(255,255,255,0.9)",
            }}
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input"
            style={{ paddingLeft: 34 }}
            placeholder="Search crops or diseases..."
          />
        </div>
      </div>

      <button
        className="btn btn-primary mt-16"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
        onClick={() =>
          window.alert(
            "Cloud image scan integration will be connected in the next milestone.",
          )
        }
      >
        <MdCameraAlt size={20} />
        Scan Your Crop
      </button>

      {/* Local pest alerts moved to News/Advisory module; remove static village alert */}

      <div className="text-xl mt-16" style={{ fontWeight: 800 }}>
        Common Diseases
      </div>
      <div className="mt-10" style={{ display: "grid", gap: 10 }}>
        {diseaseList.map((item) => (
          <div className="card" key={`${item.name}-${item.crop}`}>
            <div className="row-between">
              <div className="text-lg" style={{ fontWeight: 700 }}>
                {item.name}
              </div>
              <div
                className="text-sm"
                style={{ fontWeight: 700, color: severityColor(item.severity) }}
              >
                {item.severity}
              </div>
            </div>
            <div className="text-sm mt-8 muted" style={{ fontWeight: 600 }}>
              Crop: {item.crop}
            </div>
            <div className="text-sm muted mt-8">{item.symptom}</div>
          </div>
        ))}
      </div>

      {recent.length > 0 && (
        <>
          <div className="text-lg mt-16" style={{ fontWeight: 800 }}>
            Recent AI Diagnoses
          </div>
          <div className="mt-8" style={{ display: "grid", gap: 8 }}>
            {recent.map((item) => (
              <div
                className="card"
                key={item._id}
                style={{ display: "flex", gap: 10, alignItems: "center" }}
              >
                <MdAnalytics size={20} color="#2e7d32" />
                <div className="text-md" style={{ color: "#1b5e20" }}>
                  {item.diseaseName} - {Math.round(item.confidence * 100)}%
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
