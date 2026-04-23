import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MdAccessTime,
  MdCalendarToday,
  MdCheckCircle,
  MdGrass,
  MdStraighten,
  MdTune,
  MdWaterDrop,
} from "react-icons/md";
import {
  fetchFarmData,
  fetchRecentDiagnoses,
} from "../services/api";

const fallbackCareGuide = {
  water: "Water every 2-3 days, keep soil moist but not waterlogged.",
  sunlight: "6-8 hours of direct sunlight daily.",
  fertilizer: "Use organic fertilizer every 2 weeks during growing season.",
  pests:
    "Inspect regularly for aphids and caterpillars. Use neem oil if needed.",
};

const STATIC_IRRIGATION_GUIDE = {
  intro:
    "This is a standard irrigation template for daily farm operations. Use this as baseline guidance and adjust only after field moisture checks.",
  today:
    "Maintain your planned irrigation cycle and do a quick morning soil-moisture check before opening full flow.",
  timing: "Best window: 5:30 AM to 8:00 AM. Use evening cycle only when needed.",
  frequency: "Irrigate every 2-3 days for most field crops under normal conditions.",
  waterDepth: "Apply about 18-25 mm water per cycle for established crops.",
  method:
    "Prefer root-zone irrigation (drip or controlled furrow) to reduce evaporation and foliage disease risk.",
  adjustment:
    "If top 5 cm soil stays wet, delay next cycle by 12-24 hours. If leaves droop before noon, advance next cycle.",
  checklist: [
    "Check 5 cm soil depth in 3 field spots before irrigation.",
    "Avoid midday irrigation to reduce evaporation loss.",
    "Inspect channels/emitters weekly for uniform flow.",
    "Prevent standing water in low patches after each cycle.",
    "Keep mulch around root zone to preserve moisture.",
  ],
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
  const activeCrop = selectedCrop || crops[0] || null;

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
                  <div className="row" style={{ alignItems: "center", gap: 8 }}>
                    <MdGrass size={16} color="#2e7d32" />
                    <div
                      className="text-md"
                      style={{ fontWeight: 700, color: "#1b5e20" }}
                    >
                      {crop.name}
                    </div>
                  </div>
                  <div className="text-xs muted mt-8">{crop.stage}</div>
                </button>
              );
            })}
          </div>

          <div className="card-elevated mt-16">
            <div className="row" style={{ alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "#e3f5ea",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <MdWaterDrop size={18} color="#2e7d32" />
              </div>
              <div className="text-xl" style={{ fontWeight: 700 }}>
                Irrigation Guide
              </div>
            </div>
            <div className="text-sm muted mt-8">
              {activeCrop
                ? `${activeCrop.name} (static template)`
                : "General static template"}
            </div>
            <div className="text-sm mt-12" style={{ color: "#33513a", lineHeight: 1.45 }}>
              {STATIC_IRRIGATION_GUIDE.intro}
            </div>

            <GuideLine
              icon={MdWaterDrop}
              label="Today"
              text={STATIC_IRRIGATION_GUIDE.today}
            />
            <GuideLine
              icon={MdAccessTime}
              label="Timing"
              text={STATIC_IRRIGATION_GUIDE.timing}
            />
            <GuideLine
              icon={MdCalendarToday}
              label="Frequency"
              text={STATIC_IRRIGATION_GUIDE.frequency}
            />
            <GuideLine
              icon={MdStraighten}
              label="Water Depth"
              text={STATIC_IRRIGATION_GUIDE.waterDepth}
            />
            <GuideLine
              icon={MdTune}
              label="Method"
              text={STATIC_IRRIGATION_GUIDE.method}
            />
            <GuideLine
              icon={MdGrass}
              label="Adjustment"
              text={STATIC_IRRIGATION_GUIDE.adjustment}
            />

            <div
              className="mt-12"
              style={{
                background: "#f2f9f3",
                border: "1px solid #dbeedc",
                borderRadius: 12,
                padding: "10px 12px",
              }}
            >
              <div
                className="row"
                style={{ alignItems: "center", gap: 8, color: "#1b5e20" }}
              >
                <MdCheckCircle size={16} />
                <div className="text-sm" style={{ fontWeight: 700 }}>
                  Field Checklist
                </div>
              </div>
              {STATIC_IRRIGATION_GUIDE.checklist.map((item) => (
                <div
                  key={item}
                  className="row mt-8"
                  style={{ alignItems: "flex-start", gap: 8 }}
                >
                  <MdCheckCircle
                    size={13}
                    color="#43a047"
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <div className="text-xs" style={{ color: "#33513a", lineHeight: 1.45 }}>
                    {item}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-elevated mt-16">
            <div className="text-xl" style={{ fontWeight: 700 }}>
              Care Guide
            </div>
            <GuideLine
              icon={MdWaterDrop}
              label="Water"
              text={`${STATIC_IRRIGATION_GUIDE.frequency} ${STATIC_IRRIGATION_GUIDE.adjustment}`}
            />
            <GuideLine
              icon={MdAccessTime}
              label="Sunlight"
              text={fallbackCareGuide.sunlight}
            />
            <GuideLine
              icon={MdTune}
              label="Fertilizer"
              text={fallbackCareGuide.fertilizer}
            />
            <GuideLine
              icon={MdCheckCircle}
              label="Pests"
              text={fallbackCareGuide.pests}
            />
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

function GuideLine({ icon: Icon, label, text }) {
  return (
    <div
      className="row mt-12"
      style={{ alignItems: "flex-start", gap: 10 }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 8,
          background: "#edf7ef",
          display: "grid",
          placeItems: "center",
          marginTop: 1,
          flexShrink: 0,
        }}
      >
        {Icon ? <Icon size={14} color="#2e7d32" /> : null}
      </div>
      <div style={{ color: "#1f2937", lineHeight: 1.45 }}>
        <div className="text-sm" style={{ fontWeight: 700 }}>
          {label}
        </div>
        <div className="text-sm">{text}</div>
      </div>
    </div>
  );
}
