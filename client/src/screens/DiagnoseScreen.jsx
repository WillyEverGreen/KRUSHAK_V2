import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MdAnalytics, MdCameraAlt, MdSearch, MdWarningAmber } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import {
  analyzePlantImage,
  fetchDiseaseCatalog,
  fetchRecentDiagnoses,
  fetchDiseaseAdvisory,
} from "../services/api";
import DataState from "../components/DataState";
import FreshnessTag from "../components/FreshnessTag";
import { buildAnalysisPayload } from "../utils/imagePayload";

function severityColor(severity) {
  if (severity === "High") return "#ef4444";
  if (severity === "Medium") return "#f97316";
  return "#2e7d32";
}

export default function DiagnoseScreen() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [scanError, setScanError] = useState("");
  const fileInputRef = useRef(null);

  const { data: catalogData, isLoading: catalogLoading, error: catalogError } = useQuery({
    queryKey: ["disease-catalog", query],
    queryFn: () => fetchDiseaseCatalog(query),
  });

  const { data: advisoryData } = useQuery({
    queryKey: ["disease-advisory"],
    queryFn: fetchDiseaseAdvisory,
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["recent-diagnoses"],
    queryFn: fetchRecentDiagnoses,
  });

  const analyzeMutation = useMutation({
    mutationFn: analyzePlantImage,
  });

  const diseaseList = catalogData?.diseases || [];

  const headline = useMemo(() => {
    if (!query.trim()) return "Diagnose Disease";
    return `Search Results (${diseaseList.length})`;
  }, [query, diseaseList.length]);

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
      navigate("/diagnose/result", {
        state: {
          analysis: result.analysis || null,
          fromCache: Boolean(result.fromCache),
          fileName: file.name,
          imageHash: result.imageHash || "",
        },
      });
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
        disabled={analyzeMutation.isPending}
        onClick={() => fileInputRef.current?.click()}
      >
        <MdCameraAlt size={20} />
        {analyzeMutation.isPending ? "Analyzing..." : "Scan Your Crop"}
      </button>
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

      {advisoryData?.alerts?.length > 0 && !query.trim() && (
        <div className="card mt-16" style={{ background: "#fff5f5", borderColor: "#fed7d7" }}>
          <div className="row-between">
            <div className="row" style={{ alignItems: "center", color: "#c53030" }}>
              <MdWarningAmber size={20} />
              <div className="text-md" style={{ fontWeight: 800 }}>Seasonal Advisory ({advisoryData.season})</div>
            </div>
            <FreshnessTag generatedAt={advisoryData.generatedAt} />
          </div>
          <div className="mt-8 text-sm muted">{advisoryData.message}</div>
          <div className="mt-8" style={{ display: "grid", gap: 6 }}>
            {advisoryData.alerts.map((a, i) => (
              <div key={i} className="text-sm" style={{ fontWeight: 600 }}>
                • {a.crop}: <span style={{ color: "#c53030" }}>{a.disease}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="row-between mt-16">
        <div className="text-xl" style={{ fontWeight: 800 }}>
          Common Diseases
        </div>
        {catalogData?.generatedAt && (
          <FreshnessTag generatedAt={catalogData.generatedAt} />
        )}
      </div>

      <div className="mt-10" style={{ display: "grid", gap: 10 }}>
        <DataState loading={catalogLoading} error={catalogError} empty={diseaseList.length === 0} emptyMessage="No diseases found.">
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
              <div className="text-sm muted mt-8" style={{ lineHeight: 1.4 }}>{item.symptom}</div>
            </div>
          ))}
        </DataState>
      </div>

      {recent.length > 0 && !query.trim() && (
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
