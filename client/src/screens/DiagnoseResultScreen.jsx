import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  MdAccessTime,
  MdAnalytics,
  MdBiotech,
  MdBugReport,
  MdCameraAlt,
  MdCheckCircle,
  MdMedication,
  MdVerifiedUser,
} from "react-icons/md";
import { useLocation, useNavigate } from "react-router-dom";
import { analyzePlantImage } from "../services/api";
import { buildAnalysisPayload } from "../utils/imagePayload";

function severityColor(severity) {
  if (severity === "High") return "#ef4444";
  if (severity === "Medium") return "#f97316";
  return "#2e7d32";
}

function DiagnosisListSection({ title, items, Icon, accent }) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];

  return (
    <div
      className="mt-10"
      style={{
        borderRadius: 14,
        border: `1px solid ${accent}33`,
        background: "#f8fbf8",
        padding: 12,
      }}
    >
      <div className="row" style={{ alignItems: "center", color: accent }}>
        <Icon size={18} />
        <div className="text-sm" style={{ fontWeight: 800 }}>
          {title}
        </div>
      </div>

      {safeItems.length === 0 ? (
        <div className="text-sm muted mt-8">No clear points detected.</div>
      ) : (
        <div className="mt-8" style={{ display: "grid", gap: 7 }}>
          {safeItems.map((item, index) => (
            <div
              key={`${title}-${index}`}
              className="row"
              style={{ alignItems: "flex-start" }}
            >
              <MdCheckCircle
                size={14}
                color={accent}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <div className="text-sm muted" style={{ lineHeight: 1.45 }}>
                {item}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DiagnoseResultScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [analysis, setAnalysis] = useState(location.state?.analysis || null);
  const [analysisFromCache, setAnalysisFromCache] = useState(
    Boolean(location.state?.fromCache),
  );
  const [lastFileName, setLastFileName] = useState(
    location.state?.fileName || "",
  );
  const [scanError, setScanError] = useState("");

  const analyzeMutation = useMutation({
    mutationFn: analyzePlantImage,
  });

  useEffect(() => {
    if (!location.state?.analysis) {
      return;
    }

    setAnalysis(location.state.analysis);
    setAnalysisFromCache(Boolean(location.state.fromCache));
    setLastFileName(location.state.fileName || "");
  }, [location.state]);

  const isUnknownResult =
    analysis && (analysis.crop === "Unknown" || analysis.disease === "Unknown");

  async function handleImagePicked(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setScanError("");

    if (!file.type.startsWith("image/")) {
      setScanError("Please choose a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setScanError("Image size should be less than 5MB.");
      return;
    }

    try {
      const payload = await buildAnalysisPayload(file);
      const result = await analyzeMutation.mutateAsync(payload);

      setAnalysis(result.analysis || null);
      setAnalysisFromCache(Boolean(result.fromCache));
      setLastFileName(file.name);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Unable to analyze this image right now. Please try again.";
      setScanError(message);
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImagePicked}
        style={{ display: "none" }}
      />

      {scanError && (
        <div className="card mt-12" style={{ color: "#ef4444" }}>
          {scanError}
        </div>
      )}

      {!analysis && (
        <div className="card mt-12">
          <div className="text-md" style={{ fontWeight: 700 }}>
            No analysis available yet.
          </div>
          <div className="text-sm muted mt-8">
            Upload a plant image from Diagnose page or use Scan Again here.
          </div>
          <button
            className="btn btn-subtle mt-12"
            onClick={() => navigate("/diagnose")}
          >
            Go To Diagnose
          </button>
        </div>
      )}

      {analysis && (
        <div
          className="card mt-8"
          style={{
            borderRadius: 0,
            padding: 18,
            marginLeft: -16,
            marginRight: -16,
            borderLeft: "none",
            borderRight: "none",
          }}
        >
          <div className="row-between">
            <div className="row" style={{ alignItems: "center" }}>
              <MdAnalytics size={20} color="#2e7d32" />
              <div className="text-lg" style={{ fontWeight: 800 }}>
                Latest AI Diagnosis
              </div>
            </div>
            <div
              className="text-sm"
              style={{
                fontWeight: 700,
                color: severityColor(analysis.confidence),
              }}
            >
              {analysis.confidence}
            </div>
          </div>

          <div className="row mt-8" style={{ flexWrap: "wrap" }}>
            {lastFileName && <div className="chip">Image: {lastFileName}</div>}
          </div>

          <div
            className="mt-10"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 8,
            }}
          >
            <div
              className="card"
              style={{
                background: "#f7fbf7",
                borderColor: "#d9ead8",
                padding: 12,
                minHeight: 72,
              }}
            >
              <div className="text-xs muted">Crop</div>
              <div
                className="text-md"
                style={{ color: "#1b5e20", fontWeight: 700 }}
              >
                {analysis.crop}
              </div>
            </div>
            <div
              className="card"
              style={{
                background: "#f7fbf7",
                borderColor: "#d9ead8",
                padding: 12,
                minHeight: 72,
              }}
            >
              <div className="text-xs muted">Disease</div>
              <div
                className="text-md"
                style={{ color: "#1b5e20", fontWeight: 700 }}
              >
                {analysis.disease}
              </div>
            </div>
          </div>

          <div
            className="mt-10"
            style={{
              borderRadius: 12,
              border: "1px solid #dfe9de",
              background: "#fbfefb",
              padding: 12,
              minHeight: 128,
            }}
          >
            <div
              className="text-xs"
              style={{ fontWeight: 800, color: "#2e7d32" }}
            >
              Model Reasoning
            </div>
            <div className="text-sm muted mt-8" style={{ lineHeight: 1.45 }}>
              {analysis.reasoning}
            </div>
          </div>

          <DiagnosisListSection
            title="Symptoms"
            items={analysis.symptoms}
            Icon={MdBugReport}
            accent="#dc2626"
          />
          <DiagnosisListSection
            title="Causes"
            items={analysis.causes}
            Icon={MdBiotech}
            accent="#b45309"
          />
          <DiagnosisListSection
            title="Treatment"
            items={analysis.treatment}
            Icon={MdMedication}
            accent="#2563eb"
          />
          <DiagnosisListSection
            title="Prevention"
            items={analysis.prevention}
            Icon={MdVerifiedUser}
            accent="#15803d"
          />

          {isUnknownResult && (
            <div className="card mt-10" style={{ color: "#1b5e20" }}>
              <div className="text-md" style={{ fontWeight: 700 }}>
                Improve Scan Accuracy
              </div>
              <div className="text-sm mt-8 muted">
                Capture one affected leaf in close-up.
              </div>
              <div className="text-sm mt-8 muted">
                Use daylight and avoid blur or strong shadows.
              </div>
              <div className="text-sm mt-8 muted">
                Keep symptoms clearly visible in the center of the image.
              </div>
            </div>
          )}
        </div>
      )}

      <div
        className="mt-12"
        style={{ display: "flex", justifyContent: "center" }}
      >
        <button
          className="btn btn-primary"
          disabled={analyzeMutation.isPending}
          onClick={() => fileInputRef.current?.click()}
          style={{
            minWidth: 220,
            width: "78%",
            maxWidth: 300,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            borderRadius: 14,
            fontWeight: 700,
          }}
        >
          <MdCameraAlt size={20} />
          {analyzeMutation.isPending ? "Analyzing..." : "Scan Again"}
        </button>
      </div>
    </div>
  );
}
