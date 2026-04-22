import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchFarmData, fetchRecentDiagnoses } from "../services/api";

const fallbackCareGuide = {
  water: "Water every 2-3 days, keep soil moist but not waterlogged.",
  sunlight: "6-8 hours of direct sunlight daily.",
  fertilizer: "Use organic fertilizer every 2 weeks during growing season.",
  pests:
    "Inspect regularly for aphids and caterpillars. Use neem oil if needed.",
};

export default function CareGuidesScreen() {
  const [selectedCrop, setSelectedCrop] = useState(null);

  const { data: farmData } = useQuery({
    queryKey: ["care-farm-data"],
    queryFn: fetchFarmData,
  });

  const { data: recentDiagnoses = [] } = useQuery({
    queryKey: ["care-recent-diagnoses"],
    queryFn: fetchRecentDiagnoses,
  });

  const crops = farmData?.cropCards || [];

  return (
    <div>
      <div className="text-xl" style={{ fontWeight: 800 }}>
        My Plants and Care Guides
      </div>

      {crops.length === 0 ? (
        <div className="card mt-16">
          <div className="text-md muted">No crops found yet.</div>
        </div>
      ) : (
        <>
          <div
            className="row mt-16"
            style={{ overflowX: "auto", paddingBottom: 4 }}
          >
            {crops.map((crop) => {
              const selected =
                selectedCrop?.name === crop.name ||
                (!selectedCrop && crop === crops[0]);
              return (
                <button
                  key={crop.name}
                  className="card"
                  style={{
                    minWidth: 122,
                    borderColor: selected ? "#4caf50" : "#e5ece7",
                    boxShadow: selected
                      ? "0 0 0 2px rgba(76,175,80,0.2)"
                      : "none",
                  }}
                  onClick={() => setSelectedCrop(crop)}
                >
                  <div
                    className="text-md"
                    style={{ fontWeight: 700, color: "#1b5e20" }}
                  >
                    {crop.name}
                  </div>
                  <div className="text-xs muted mt-8">{crop.stage}</div>
                </button>
              );
            })}
          </div>

          <div className="card-elevated mt-16">
            <div className="text-xl" style={{ fontWeight: 700 }}>
              Care Guide
            </div>
            <GuideLine label="Water" text={fallbackCareGuide.water} />
            <GuideLine label="Sunlight" text={fallbackCareGuide.sunlight} />
            <GuideLine label="Fertilizer" text={fallbackCareGuide.fertilizer} />
            <GuideLine label="Pests" text={fallbackCareGuide.pests} />
          </div>
        </>
      )}

      <div className="text-xl mt-20" style={{ fontWeight: 800 }}>
        Recent Diagnosis History
      </div>
      <div className="mt-12" style={{ display: "grid", gap: 10 }}>
        {recentDiagnoses.length === 0 && (
          <div className="card">
            <div className="text-sm muted">
              No diagnosis history available yet.
            </div>
          </div>
        )}

        {recentDiagnoses.map((record) => (
          <div className="card" key={record._id}>
            <div
              className="text-md"
              style={{ fontWeight: 700, color: "#2e7d32" }}
            >
              Diagnosis: {record.diseaseName}
            </div>
            <div className="text-sm muted mt-8">
              {Math.round(record.confidence * 100)}% confidence
            </div>
            <div className="text-xs muted mt-8">
              {new Date(record.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GuideLine({ label, text }) {
  return (
    <div
      className="text-sm mt-12"
      style={{ color: "#1f2937", lineHeight: 1.45 }}
    >
      <strong>{label}:</strong> {text}
    </div>
  );
}
