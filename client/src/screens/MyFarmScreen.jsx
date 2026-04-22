import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MdAdd,
  MdClose,
  MdGrass,
  MdWaterDrop,
  MdNotificationsActive,
  MdPets,
  MdWarningAmber,
  MdCheckCircle,
  MdCalendarToday,
  MdStraighten,
  MdNotes,
  MdDelete,
  MdEdit,
  MdArrowForward,
  MdBolt,
} from "react-icons/md";
import { fetchFarmData, fetchCrops, addCrop, toggleReminder } from "../services/api";
import DataState from "../components/DataState";
import FreshnessTag from "../components/FreshnessTag";

/* ─── Helpers ──────────────────────────────────────────────── */

const STAGE_META = {
  Sowing:      { emoji: "🌱", color: "#a5d6a7", bg: "#e8f5e9" },
  Germination: { emoji: "🌿", color: "#66bb6a", bg: "#c8e6c9" },
  Vegetative:  { emoji: "🍃", color: "#43a047", bg: "#dcedc8" },
  Flowering:   { emoji: "🌸", color: "#ec407a", bg: "#fce4ec" },
  Fruiting:    { emoji: "🍎", color: "#f57c00", bg: "#fff3e0" },
  Harvest:     { emoji: "🌾", color: "#f9a825", bg: "#fff8e1" },
};

function healthColor(h) {
  if (h >= 0.75) return "#43a047";
  if (h >= 0.5)  return "#f57c00";
  return "#e53935";
}

function healthLabel(h) {
  if (h >= 0.75) return "Healthy";
  if (h >= 0.5)  return "Fair";
  return "Poor";
}

const LIVESTOCK_ICONS = ["🐄", "🐐", "🐑", "🐓", "🐖"];

/* ─── Main Component ───────────────────────────────────────── */

export default function MyFarmScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [showAddCrop, setShowAddCrop] = useState(false);

  const [coords, setCoords] = useState(null);
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => setCoords(null),
        { timeout: 8000 }
      );
    }
  }, []);

  const { data: farmData, isLoading: farmLoading, error: farmError } = useQuery({
    queryKey: ["farm-data"],
    queryFn: fetchFarmData,
    staleTime: 3 * 60 * 1000,
  });

  const { data: cropData, isLoading: cropsLoading, error: cropsError } = useQuery({
    queryKey: ["crops", coords?.latitude, coords?.longitude],
    queryFn: () => fetchCrops({ lat: coords?.latitude, lon: coords?.longitude }),
    staleTime: 3 * 60 * 1000,
  });

  const toggleMutation = useMutation({
    mutationFn: toggleReminder,
    onSuccess: () => queryClient.invalidateQueries(["farm-data"]),
  });

  const reminders    = farmData?.reminders || [];
  const livestockTips = farmData?.livestockTips || [];
  const latestDiagnosis = farmData?.latestDiagnosis || "No recent diagnosis yet";
  const crops        = cropData?.crops || [];
  const weatherSummary = farmData?.weatherSummary;

  const pendingReminders = useMemo(() => reminders.filter((r) => !r.done).length, [reminders]);
  const avgHealth = useMemo(() =>
    crops.length ? crops.reduce((s, c) => s + c.health, 0) / crops.length : null,
    [crops]
  );

  const TABS = [
    { label: "All Crops",  icon: MdGrass,               badge: crops.length || null },
    { label: "Reminders",  icon: MdNotificationsActive,  badge: pendingReminders || null },
    { label: "Livestock",  icon: MdPets,                 badge: null },
  ];

  return (
    <div className="farm-screen">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="farm-header">
        <div className="farm-header-left">
          <div className="farm-header-icon">🌾</div>
          <div>
            <div className="farm-header-title">My Farm</div>
            <div className="farm-header-sub">
              {weatherSummary || "Fetching weather…"}
              {avgHealth !== null && (
                <span className="farm-header-avg">
                  &nbsp;·&nbsp;💪 {Math.round(avgHealth * 100)}% avg health
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          className="farm-add-btn"
          onClick={() => setShowAddCrop(true)}
          id="farm-add-crop-btn"
        >
          <MdAdd size={18} />
          <span>Add Crop</span>
        </button>
      </div>

      {/* ── Diagnosis banner ─────────────────────────────────── */}
      {latestDiagnosis !== "No recent diagnosis yet" ? (
        <div className="farm-diagnosis-banner farm-diagnosis-banner--found">
          <MdCheckCircle size={16} />
          <span>{latestDiagnosis}</span>
        </div>
      ) : (
        <div className="farm-diagnosis-banner">
          <MdBolt size={16} />
          <span>No recent diagnosis — scan a crop to get started</span>
        </div>
      )}

      {/* ── Tab strip ────────────────────────────────────────── */}
      <div className="farm-tab-strip">
        {TABS.map((tab, index) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.label}
              className={`farm-tab ${activeTab === index ? "active" : ""}`}
              onClick={() => setActiveTab(index)}
              id={`farm-tab-${index}`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge ? <span className="farm-tab-badge">{tab.badge}</span> : null}
            </button>
          );
        })}
      </div>

      {/* ── Content panels ───────────────────────────────────── */}
      <div className="farm-panel-area">

        {/* ── Crops Tab ─────────────────────────── */}
        {activeTab === 0 && (
          <>
            {cropData?.generatedAt && (
              <div className="farm-freshness-row">
                <FreshnessTag generatedAt={cropData.generatedAt} />
              </div>
            )}
            {(farmData?.isDemo || cropData?.isDemo) && (
              <div className="farm-demo-banner">
                <span>🔒</span>
                <div>
                  <div className="farm-demo-title">Preview Mode</div>
                  <div className="farm-demo-sub">Login to save and track your real crops. Showing demo data.</div>
                </div>
              </div>
            )}
            <DataState
              loading={cropsLoading}
              error={cropsError}
              empty={crops.length === 0}
              emptyMessage="No crops added yet. Tap '+ Add Crop' to start tracking your farm."
              emptyAction={{ label: "+ Add Your First Crop", onClick: () => setShowAddCrop(true) }}
            >
              <div className="farm-crops-grid">
                {crops.map((crop) => {
                  const meta = STAGE_META[crop.stage] || STAGE_META.Sowing;
                  const hPct = Math.round(crop.health * 100);
                  return (
                    <div className="farm-crop-card" key={crop._id} id={`crop-card-${crop._id}`}>
                      {/* Card header */}
                      <div className="farm-crop-header">
                        <div className="farm-crop-emoji">{meta.emoji}</div>
                        <div className="farm-crop-info">
                          <div className="farm-crop-name">{crop.name}</div>
                          {crop.variety && (
                            <div className="farm-crop-variety">{crop.variety}</div>
                          )}
                        </div>
                        <div
                          className="farm-stage-chip"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {crop.stage}
                        </div>
                      </div>

                      {/* Health bar */}
                      <div className="farm-health-row">
                        <div className="farm-health-bar-wrap">
                          <div
                            className="farm-health-bar-fill"
                            style={{ width: `${hPct}%`, background: healthColor(crop.health) }}
                          />
                        </div>
                        <div
                          className="farm-health-pct"
                          style={{ color: healthColor(crop.health) }}
                        >
                          {hPct}%
                        </div>
                        <span
                          className="farm-health-label"
                          style={{ color: healthColor(crop.health) }}
                        >
                          {healthLabel(crop.health)}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="farm-crop-details">
                        <div className="farm-detail-row">
                          <MdWaterDrop size={13} color="#2e7d32" />
                          <span>{crop.water}</span>
                        </div>
                        <div className="farm-detail-row farm-detail-action">
                          <MdBolt size={13} color="#f57c00" />
                          <span>{crop.action}</span>
                        </div>
                        {crop.fieldSizeAcres && (
                          <div className="farm-detail-row">
                            <MdStraighten size={13} color="#757575" />
                            <span>{crop.fieldSizeAcres} acres</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </DataState>
          </>
        )}

        {/* ── Reminders Tab ─────────────────────── */}
        {activeTab === 1 && (
          <DataState
            loading={farmLoading}
            error={farmError}
            empty={reminders.length === 0}
            emptyMessage="No reminders scheduled. Add one to stay on top of your farm tasks."
          >
            {farmData?.isDemo && (
              <div className="farm-demo-banner">
                <span>🔒</span>
                <div>
                  <div className="farm-demo-title">Demo Reminders</div>
                  <div className="farm-demo-sub">Login to create and manage your own reminders.</div>
                </div>
              </div>
            )}
            <div className="farm-reminders-list">
              {reminders.map((item, idx) => (
                <div
                  className={`farm-reminder-card ${item.done ? "done" : ""}`}
                  key={item._id}
                  id={`reminder-${item._id}`}
                >
                  {/* Timeline dot */}
                  <div className="farm-reminder-dot-col">
                    <div className={`farm-reminder-dot ${item.done ? "done" : ""}`} />
                    {idx < reminders.length - 1 && <div className="farm-reminder-line" />}
                  </div>

                  <div className="farm-reminder-body">
                    <div className="farm-reminder-top">
                      <div className="farm-reminder-task" style={{ textDecoration: item.done ? "line-through" : "none" }}>
                        {item.task}
                      </div>
                      <button
                        className={`farm-reminder-toggle ${item.done ? "undo" : "done-btn"}`}
                        disabled={toggleMutation.isPending}
                        onClick={() => {
                          if (String(item._id).startsWith("demo")) {
                            window.alert("Login to manage your real reminders.");
                            return;
                          }
                          toggleMutation.mutate(item._id);
                        }}
                      >
                        {item.done ? "Undo" : "Done"}
                      </button>
                    </div>

                    <div className="farm-reminder-meta">
                      <MdCalendarToday size={11} />
                      <span>{item.dueAtLabel}</span>
                      {item.done && <span className="farm-reminder-completed-badge">✓ Completed</span>}
                    </div>

                    {item.skipWarning && !item.done && (
                      <div className="farm-skip-warning">
                        <MdWarningAmber size={13} />
                        <span>{item.skipWarning}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </DataState>
        )}

        {/* ── Livestock Tab ──────────────────────── */}
        {activeTab === 2 && (
          <DataState
            loading={farmLoading}
            error={farmError}
            empty={livestockTips.length === 0}
            emptyMessage="No livestock tips available right now."
          >
            <div className="farm-livestock-grid">
              {livestockTips.map((item, idx) => (
                <div className="farm-livestock-card" key={item.title}>
                  <div className="farm-livestock-icon">{LIVESTOCK_ICONS[idx % LIVESTOCK_ICONS.length]}</div>
                  <div className="farm-livestock-title">{item.title}</div>
                  <div className="farm-livestock-tip">{item.tip}</div>
                </div>
              ))}

              {/* Static general livestock advisory */}
              <div className="farm-livestock-advisory">
                <div className="farm-advisory-heading">📋 Daily Livestock Checklist</div>
                {[
                  "Check water troughs — clean & fill",
                  "Inspect for injuries or illness",
                  "Provide mineral supplements",
                  "Record milk yield / weight gain",
                  "Ensure proper shelter & ventilation",
                ].map((tip) => (
                  <div key={tip} className="farm-advisory-item">
                    <MdCheckCircle size={14} color="#4caf50" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </DataState>
        )}

      </div>

      {/* ── Add Crop Modal ────────────────────────────────────── */}
      {showAddCrop && (
        <AddCropModal
          onClose={() => setShowAddCrop(false)}
          onAdd={() => queryClient.invalidateQueries(["crops"])}
        />
      )}
    </div>
  );
}

/* ─── Add Crop Modal ───────────────────────────────────────── */

const STAGES = ["Sowing", "Germination", "Vegetative", "Flowering", "Fruiting", "Harvest"];

function AddCropModal({ onClose, onAdd }) {
  const [name, setName]               = useState("");
  const [variety, setVariety]         = useState("");
  const [stage, setStage]             = useState("Sowing");
  const [sowingDate, setSowingDate]   = useState("");
  const [fieldSize, setFieldSize]     = useState("1");
  const [notes, setNotes]             = useState("");
  const [loading, setLoading]         = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await addCrop({
        name: name.trim(),
        variety: variety.trim(),
        stage,
        sowingDate: sowingDate || null,
        fieldSizeAcres: parseFloat(fieldSize) || 1,
        notes: notes.trim(),
      });
      onAdd();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || "Could not add crop. Please login first.";
      window.alert(msg);
      console.error(err);
      setLoading(false);
    }
  }

  const meta = STAGE_META[stage] || STAGE_META.Sowing;

  return (
    <div className="farm-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="farm-modal">
        {/* Modal header */}
        <div className="farm-modal-header">
          <div className="farm-modal-title">
            <span>{meta.emoji}</span>
            <span>Add New Crop</span>
          </div>
          <button className="farm-modal-close" onClick={onClose} id="modal-close-btn">
            <MdClose size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="farm-modal-form" id="add-crop-form">

          {/* Crop name */}
          <div className="farm-field">
            <label className="farm-label">
              <MdGrass size={14} /> Crop Name *
            </label>
            <input
              className="farm-input"
              placeholder="e.g. Wheat, Tomato, Rice…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              id="crop-name-input"
            />
          </div>

          {/* Variety */}
          <div className="farm-field">
            <label className="farm-label">
              <MdEdit size={14} /> Variety / Type
            </label>
            <input
              className="farm-input"
              placeholder="e.g. HD-2967, Cherry, Basmati…"
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              id="crop-variety-input"
            />
          </div>

          {/* Stage selector */}
          <div className="farm-field">
            <label className="farm-label">
              🌱 Growth Stage
            </label>
            <div className="farm-stage-grid">
              {STAGES.map((s) => {
                const m = STAGE_META[s];
                return (
                  <button
                    key={s}
                    type="button"
                    className={`farm-stage-btn ${stage === s ? "active" : ""}`}
                    style={stage === s ? { background: m.bg, borderColor: m.color, color: m.color } : {}}
                    onClick={() => setStage(s)}
                  >
                    <span>{m.emoji}</span>
                    <span>{s}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sowing date + field size */}
          <div className="farm-two-col">
            <div className="farm-field">
              <label className="farm-label">
                <MdCalendarToday size={14} /> Sowing Date
              </label>
              <input
                type="date"
                className="farm-input"
                value={sowingDate}
                onChange={(e) => setSowingDate(e.target.value)}
                id="crop-sowing-date"
              />
            </div>
            <div className="farm-field">
              <label className="farm-label">
                <MdStraighten size={14} /> Field Size (acres)
              </label>
              <input
                type="number"
                className="farm-input"
                min="0.1"
                max="10000"
                step="0.1"
                placeholder="1"
                value={fieldSize}
                onChange={(e) => setFieldSize(e.target.value)}
                id="crop-field-size"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="farm-field">
            <label className="farm-label">
              <MdNotes size={14} /> Notes (optional)
            </label>
            <textarea
              className="farm-input farm-textarea"
              placeholder="Any observations, soil type, previous yield…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              id="crop-notes"
            />
          </div>

          <button
            type="submit"
            className="farm-submit-btn"
            disabled={loading || !name.trim()}
            id="crop-submit-btn"
          >
            {loading ? "Adding crop…" : `${meta.emoji} Add ${name || "Crop"}`}
          </button>
        </form>
      </div>
    </div>
  );
}
