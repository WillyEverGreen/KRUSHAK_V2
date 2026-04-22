import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  MdAnalytics,
  MdCameraAlt,
  MdSearch,
  MdWarningAmber,
} from "react-icons/md";
import {
  analyzePlantImage,
  fetchDiseaseCatalog,
  fetchRecentDiagnoses,
  fetchDiseaseAdvisory,
} from "../services/api";
import DataState from "../components/DataState";
import FreshnessTag from "../components/FreshnessTag";

function severityColor(severity) {
  if (severity === "High") return "#ef4444";
  if (severity === "Medium") return "#f97316";
  return "#2e7d32";
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dataUrlToImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function buildAnalysisPayload(file) {
  const originalDataUrl = await fileToDataUrl(file);

  // Convert to JPEG so the model receives a consistent, well-supported format.
  const img = await dataUrlToImage(originalDataUrl);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      imageBase64: originalDataUrl,
      mimeType: file.type || "image/jpeg",
    };
  }

  ctx.drawImage(img, 0, 0, width, height);
  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.9);

  return {
    imageBase64: jpegDataUrl,
    mimeType: "image/jpeg",
  };
}

function prettyList(items) {
  if (!items || items.length === 0) return "Not available";
  return items.join(", ");
}

export default function DiagnoseScreen() {
  const [query, setQuery] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [scanError, setScanError] = useState("");
  const [lastFileName, setLastFileName] = useState("");
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

  const isUnknownResult =
    analysis && (analysis.crop === "Unknown" || analysis.disease === "Unknown");

  async function handleImagePicked(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setScanError("");
    setLastFileName(file.name);

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

      setAnalysis(result);
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

      {analysis && (
        <div className="card mt-12">
          <div className="row-between">
            <div className="text-lg" style={{ fontWeight: 800 }}>
              Latest AI Diagnosis
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
          {lastFileName && (
            <div className="text-sm mt-8 muted">Image: {lastFileName}</div>
          )}
          <div className="text-md mt-8" style={{ color: "#1b5e20" }}>
            Crop: <strong>{analysis.crop}</strong>
          </div>
          <div className="text-md mt-8" style={{ color: "#1b5e20" }}>
            Disease: <strong>{analysis.disease}</strong>
          </div>
          <div className="text-sm mt-8 muted">{analysis.reasoning}</div>
          <div className="text-sm mt-8 muted">
            Symptoms: {prettyList(analysis.symptoms)}
          </div>
          <div className="text-sm mt-8 muted">
            Causes: {prettyList(analysis.causes)}
          </div>
          <div className="text-sm mt-8 muted">
            Treatment: {prettyList(analysis.treatment)}
          </div>
          <div className="text-sm mt-8 muted">
            Prevention: {prettyList(analysis.prevention)}
          </div>
        </div>
      )}

      {isUnknownResult && (
        <div className="card mt-10" style={{ color: "#1b5e20" }}>
          <div className="text-md" style={{ fontWeight: 700 }}>
            Improve Scan Accuracy
          </div>
          <div className="text-sm mt-8 muted">
            Capture one affected leaf in close-up.
          </div>
          <div className="text-sm mt-6 muted">
            Use daylight and avoid blur or strong shadows.
          </div>
          <div className="text-sm mt-6 muted">
            Keep symptoms clearly visible in the center of the image.
          </div>
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
