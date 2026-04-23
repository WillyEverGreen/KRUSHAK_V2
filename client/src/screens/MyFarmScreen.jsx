import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MdAdd,
  MdAccessTime,
  MdCalendarToday,
  MdCheckCircle,
  MdClose,
  MdDelete,
  MdEdit,
  MdGrass,
  MdHealthAndSafety,
  MdLogin,
  MdNotificationsActive,
  MdNotes,
  MdWaterDrop,
  MdPets,
  MdPlaylistAdd,
  MdRestaurant,
  MdStraighten,
  MdWarningAmber,
  MdBolt,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "../app/store";
import {
  addCrop,
  addLivestock,
  addLivestockFeedReminder,
  addReminder,
  deleteLivestock,
  deleteReminder,
  fetchCrops,
  fetchFarmData,
  toggleReminder,
  updateLivestock,
} from "../services/api";
import DataState from "../components/DataState";
import FreshnessTag from "../components/FreshnessTag";

/* ─── Helpers ──────────────────────────────────────────────── */

const STAGE_META = {
  Sowing: { emoji: "🌱", color: "#a5d6a7", bg: "#e8f5e9" },
  Germination: { emoji: "🌿", color: "#66bb6a", bg: "#c8e6c9" },
  Vegetative: { emoji: "🍃", color: "#43a047", bg: "#dcedc8" },
  Flowering: { emoji: "🌸", color: "#ec407a", bg: "#fce4ec" },
  Fruiting: { emoji: "🍎", color: "#f57c00", bg: "#fff3e0" },
  Harvest: { emoji: "🌾", color: "#f9a825", bg: "#fff8e1" },
};

const LIVESTOCK_META = {
  Cow: { emoji: "🐄", tint: "#e8f5e9" },
  Buffalo: { emoji: "🐃", tint: "#e8f5e9" },
  Goat: { emoji: "🐐", tint: "#eef8ff" },
  Sheep: { emoji: "🐑", tint: "#eef8ff" },
  Chicken: { emoji: "🐓", tint: "#fff8e1" },
  Duck: { emoji: "🦆", tint: "#fff8e1" },
  Pig: { emoji: "🐖", tint: "#fdf2f8" },
  Horse: { emoji: "🐎", tint: "#f5f5f5" },
  Rabbit: { emoji: "🐇", tint: "#f5f5f5" },
};

const QUICK_REMINDER_FALLBACK = [
  {
    id: "irrigation-evening",
    title: "Irrigation Check",
    task: "Check irrigation channels and moisture",
    dueAtLabel: "Today 6:00 PM",
    category: "irrigation",
    priority: "medium",
  },
  {
    id: "spray-morning",
    title: "Pest Spray",
    task: "Inspect pest level and prepare spray",
    dueAtLabel: "Tomorrow 6:00 AM",
    category: "spray",
    priority: "high",
  },
  {
    id: "feed-livestock",
    title: "Feed Livestock",
    task: "Feed livestock and refill water trough",
    dueAtLabel: "Today 7:00 PM",
    category: "livestock-feed",
    priority: "high",
  },
];

const STAGES = [
  "Sowing",
  "Germination",
  "Vegetative",
  "Flowering",
  "Fruiting",
  "Harvest",
];

const LIVESTOCK_TYPES = Object.keys(LIVESTOCK_META);

function priorityColor(priority) {
  if (priority === "high") return "#e53935";
  if (priority === "low") return "#2e7d32";
  return "#f57c00";
}

function healthColor(h) {
  if (h >= 0.75) return "#43a047";
  if (h >= 0.5) return "#f57c00";
  return "#e53935";
}

function healthLabel(h) {
  if (h >= 0.75) return "Healthy";
  if (h >= 0.5) return "Fair";
  return "Poor";
}

/* ─── Main Component ───────────────────────────────────────── */

export default function MyFarmScreen() {
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [showAddCrop, setShowAddCrop] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [showAddLivestock, setShowAddLivestock] = useState(false);

  const [coords, setCoords] = useState(null);
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        () => setCoords(null),
        { timeout: 8000 },
      );
    }
  }, []);

  const {
    data: farmData,
    isLoading: farmLoading,
    error: farmError,
  } = useQuery({
    queryKey: ["farm-data", coords?.latitude, coords?.longitude],
    queryFn: () =>
      fetchFarmData({ lat: coords?.latitude, lon: coords?.longitude }),
    enabled: Boolean(user),
    staleTime: 3 * 60 * 1000,
  });

  const {
    data: cropData,
    isLoading: cropsLoading,
    error: cropsError,
  } = useQuery({
    queryKey: ["crops", coords?.latitude, coords?.longitude],
    queryFn: () =>
      fetchCrops({ lat: coords?.latitude, lon: coords?.longitude }),
    enabled: Boolean(user),
    staleTime: 3 * 60 * 1000,
  });

  const addReminderMutation = useMutation({
    mutationFn: addReminder,
    onSuccess: () => queryClient.invalidateQueries(["farm-data"]),
  });

  const toggleMutation = useMutation({
    mutationFn: toggleReminder,
    onSuccess: () => queryClient.invalidateQueries(["farm-data"]),
  });

  const deleteReminderMutation = useMutation({
    mutationFn: deleteReminder,
    onSuccess: () => queryClient.invalidateQueries(["farm-data"]),
  });

  const addLivestockMutation = useMutation({
    mutationFn: addLivestock,
    onSuccess: () => queryClient.invalidateQueries(["farm-data"]),
  });

  const updateLivestockMutation = useMutation({
    mutationFn: ({ id, payload }) => updateLivestock(id, payload),
    onSuccess: () => queryClient.invalidateQueries(["farm-data"]),
  });

  const deleteLivestockMutation = useMutation({
    mutationFn: deleteLivestock,
    onSuccess: () => queryClient.invalidateQueries(["farm-data"]),
  });

  const addFeedReminderMutation = useMutation({
    mutationFn: ({ id, dueAtLabel }) =>
      addLivestockFeedReminder(id, { dueAtLabel }),
    onSuccess: () => queryClient.invalidateQueries(["farm-data"]),
  });

  const reminders = farmData?.reminders || [];
  const livestock = farmData?.livestock || [];
  const livestockTips = farmData?.livestockTips || [];
  const quickReminderTemplates =
    farmData?.quickReminderTemplates?.length > 0
      ? farmData.quickReminderTemplates
      : QUICK_REMINDER_FALLBACK;
  const latestDiagnosis =
    farmData?.latestDiagnosis || "No recent diagnosis yet";
  const crops = cropData?.crops || [];
  const weatherSummary = farmData?.weatherSummary;

  const pendingReminders = useMemo(
    () => reminders.filter((r) => !r.done).length,
    [reminders],
  );
  const avgHealth = useMemo(
    () =>
      crops.length
        ? crops.reduce((s, c) => s + c.health, 0) / crops.length
        : null,
    [crops],
  );

  const livestockAvgHealth = useMemo(() => {
    if (!livestock.length) return null;
    const weighted = livestock.reduce(
      (acc, item) => {
        const count = Number(item.count || 0);
        return {
          score: acc.score + (item.healthScore || 0.8) * count,
          count: acc.count + count,
        };
      },
      { score: 0, count: 0 },
    );

    if (!weighted.count) return null;
    return weighted.score / weighted.count;
  }, [livestock]);

  const livestockTotal = useMemo(
    () => livestock.reduce((sum, item) => sum + Number(item.count || 0), 0),
    [livestock],
  );

  const TABS = [
    { label: "All Crops", icon: MdGrass, badge: crops.length || null },
    {
      label: "Reminders",
      icon: MdNotificationsActive,
      badge: pendingReminders || null,
    },
    { label: "Livestock", icon: MdPets, badge: livestock.length || null },
  ];

  if (!user) {
    return (
      <div className="farm-screen">
        <div className="farm-header">
          <div className="farm-header-left">
            <div className="farm-header-icon">🌾</div>
            <div>
              <div className="farm-header-title">My Farm</div>
              <div className="farm-header-sub">
                Sign in to manage crops, livestock, and reminders
              </div>
            </div>
          </div>
        </div>

        <div className="card-elevated mt-12" style={{ borderRadius: 18 }}>
          <div
            className="text-lg"
            style={{ fontWeight: 800, color: "#1b5e20" }}
          >
            Login Required
          </div>
          <div className="text-sm muted mt-8" style={{ lineHeight: 1.45 }}>
            My Farm is fully personalized. Login or register to add crops,
            schedule reminders, and track livestock health.
          </div>
          <button
            className="btn btn-primary mt-16"
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              gap: 8,
            }}
            onClick={() => navigate("/login")}
          >
            <MdLogin size={18} />
            Login / Register
          </button>
        </div>
      </div>
    );
  }

  function createQuickReminder(template) {
    addReminderMutation.mutate({
      task: template.task,
      dueAtLabel: template.dueAtLabel,
      category: template.category || "general",
      priority: template.priority || "medium",
    });
  }

  function nudgeLivestockHealth(item, delta) {
    const current = Number(item.healthScore || 0.8);
    const next = Math.max(0.2, Math.min(1, current + delta));
    updateLivestockMutation.mutate({
      id: item._id,
      payload: { healthScore: Number(next.toFixed(2)) },
    });
  }

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
              {tab.badge ? (
                <span className="farm-tab-badge">{tab.badge}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* ── Context-aware Add Button ─────────────────────────── */}
      {activeTab === 0 && (
        <button
          className="farm-action-btn farm-action-btn--solo"
          onClick={() => setShowAddCrop(true)}
          id="farm-add-crop-btn"
        >
          <MdAdd size={16} />
          <span>Add Crop</span>
        </button>
      )}
      {activeTab === 1 && (
        <button
          className="farm-action-btn farm-action-btn--solo"
          onClick={() => setShowAddReminder(true)}
          id="farm-add-reminder-btn"
        >
          <MdNotificationsActive size={16} />
          <span>Add Reminder</span>
        </button>
      )}
      {activeTab === 2 && (
        <button
          className="farm-action-btn farm-action-btn--solo"
          onClick={() => setShowAddLivestock(true)}
          id="farm-add-livestock-btn"
        >
          <MdPets size={16} />
          <span>Add Livestock</span>
        </button>
      )}

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
            <DataState
              loading={cropsLoading}
              error={cropsError}
              empty={crops.length === 0}
              emptyMessage="No crops added yet. Tap '+ Add Crop' to start tracking your farm."
              emptyAction={{
                label: "+ Add Your First Crop",
                onClick: () => setShowAddCrop(true),
              }}
            >
              <div className="farm-crops-grid">
                {crops.map((crop) => {
                  const meta = STAGE_META[crop.stage] || STAGE_META.Sowing;
                  const hPct = Math.round(crop.health * 100);
                  return (
                    <div
                      className="farm-crop-card"
                      key={crop._id}
                      id={`crop-card-${crop._id}`}
                    >
                      {/* Card header */}
                      <div className="farm-crop-header">
                        <div className="farm-crop-emoji">{meta.emoji}</div>
                        <div className="farm-crop-info">
                          <div className="farm-crop-name">{crop.name}</div>
                          {crop.variety && (
                            <div className="farm-crop-variety">
                              {crop.variety}
                            </div>
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
                            style={{
                              width: `${hPct}%`,
                              background: healthColor(crop.health),
                            }}
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
                        {crop.notes && (
                          <div className="farm-detail-row">
                            <MdNotes size={13} color="#757575" />
                            <span>{crop.notes}</span>
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
            emptyAction={{
              label: "Add Reminder",
              onClick: () => setShowAddReminder(true),
            }}
          >
            <div className="farm-quick-strip">
              {quickReminderTemplates.map((template) => (
                <button
                  key={template.id}
                  className="farm-quick-btn"
                  disabled={addReminderMutation.isPending}
                  onClick={() => createQuickReminder(template)}
                >
                  <MdPlaylistAdd size={14} />
                  <span>{template.title}</span>
                </button>
              ))}
            </div>

            <div className="farm-reminders-list">
              {reminders.map((item, idx) => (
                <div
                  className={`farm-reminder-card ${item.done ? "done" : ""}`}
                  key={item._id}
                  id={`reminder-${item._id}`}
                >
                  {/* Timeline dot */}
                  <div className="farm-reminder-dot-col">
                    <div
                      className={`farm-reminder-dot ${item.done ? "done" : ""}`}
                    />
                    {idx < reminders.length - 1 && (
                      <div className="farm-reminder-line" />
                    )}
                  </div>

                  <div className="farm-reminder-body">
                    <div className="farm-reminder-top">
                      <div
                        className="farm-reminder-task"
                        style={{
                          textDecoration: item.done ? "line-through" : "none",
                        }}
                      >
                        {item.task}
                      </div>
                      <div className="row" style={{ gap: 6 }}>
                        <button
                          className={`farm-reminder-toggle ${item.done ? "undo" : "done-btn"}`}
                          disabled={toggleMutation.isPending}
                          onClick={() => toggleMutation.mutate(item._id)}
                        >
                          {item.done ? "Undo" : "Done"}
                        </button>
                        <button
                          className="farm-reminder-delete"
                          disabled={deleteReminderMutation.isPending}
                          onClick={() =>
                            deleteReminderMutation.mutate(item._id)
                          }
                          aria-label="Delete reminder"
                        >
                          <MdDelete size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="farm-reminder-meta">
                      <MdCalendarToday size={11} />
                      <span>{item.dueAtLabel}</span>
                      <span
                        style={{
                          marginLeft: 4,
                          color: priorityColor(item.priority),
                          fontWeight: 700,
                        }}
                      >
                        {(item.priority || "medium").toUpperCase()}
                      </span>
                      {item.done && (
                        <span className="farm-reminder-completed-badge">
                          ✓ Completed
                        </span>
                      )}
                    </div>

                    {(item.category || "").trim() && (
                      <div
                        className="text-xs muted mt-8"
                        style={{ textTransform: "capitalize" }}
                      >
                        Category: {String(item.category).replace(/-/g, " ")}
                      </div>
                    )}

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
            empty={livestock.length === 0}
            emptyMessage="No livestock added yet. Add your first entry to track health and feeding reminders."
            emptyAction={{
              label: "Add Livestock",
              onClick: () => setShowAddLivestock(true),
            }}
          >
            <div className="card" style={{ borderRadius: 16 }}>
              <div className="row-between">
                <div
                  className="text-sm"
                  style={{ fontWeight: 800, color: "#1b5e20" }}
                >
                  Herd Overview
                </div>
                <div className="chip">{livestockTotal} animals</div>
              </div>
              <div className="text-xs muted mt-8">
                Average health:{" "}
                {livestockAvgHealth !== null
                  ? `${Math.round(livestockAvgHealth * 100)}%`
                  : "N/A"}
              </div>
            </div>

            <div className="farm-livestock-grid">
              {livestock.map((item) => {
                const meta = LIVESTOCK_META[item.type] || {
                  emoji: "🐾",
                  tint: "#f5f5f5",
                };
                const health = Number(item.healthScore || 0.8);
                const healthPct = Math.round(health * 100);

                return (
                  <div className="farm-livestock-card" key={item._id}>
                    <div
                      className="row-between"
                      style={{ alignItems: "flex-start" }}
                    >
                      <div
                        className="row"
                        style={{ alignItems: "center", gap: 10 }}
                      >
                        <div
                          className="farm-livestock-icon"
                          style={{ background: meta.tint }}
                        >
                          {meta.emoji}
                        </div>
                        <div>
                          <div className="farm-livestock-title">
                            {item.name || item.type}
                          </div>
                          <div className="text-xs muted">
                            {item.type} · {item.count} animals
                          </div>
                        </div>
                      </div>

                      <button
                        className="farm-reminder-delete"
                        disabled={deleteLivestockMutation.isPending}
                        onClick={() => deleteLivestockMutation.mutate(item._id)}
                        aria-label="Delete livestock"
                      >
                        <MdDelete size={15} />
                      </button>
                    </div>

                    <div className="farm-health-row mt-8">
                      <div className="farm-health-bar-wrap">
                        <div
                          className="farm-health-bar-fill"
                          style={{
                            width: `${healthPct}%`,
                            background: healthColor(health),
                          }}
                        />
                      </div>
                      <div
                        className="farm-health-pct"
                        style={{ color: healthColor(health) }}
                      >
                        {healthPct}%
                      </div>
                      <span
                        className="farm-health-label"
                        style={{ color: healthColor(health) }}
                      >
                        {healthLabel(health)}
                      </span>
                    </div>

                    <div className="farm-crop-details">
                      {item.lastFedAtLabel && (
                        <div className="farm-detail-row">
                          <MdRestaurant size={13} color="#2e7d32" />
                          <span>Last fed: {item.lastFedAtLabel}</span>
                        </div>
                      )}
                      <div className="farm-detail-row">
                        <MdAccessTime size={13} color="#2e7d32" />
                        <span>
                          Feed every {item.feedIntervalHours || 12} hours
                        </span>
                      </div>
                      {item.notes && (
                        <div className="farm-detail-row">
                          <MdNotes size={13} color="#757575" />
                          <span>{item.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="farm-livestock-actions">
                      <button
                        className="farm-action-mini"
                        disabled={addFeedReminderMutation.isPending}
                        onClick={() =>
                          addFeedReminderMutation.mutate({
                            id: item._id,
                            dueAtLabel: "Today 7:00 PM",
                          })
                        }
                      >
                        <MdNotificationsActive size={14} />
                        Feed Reminder
                      </button>
                      <button
                        className="farm-action-mini"
                        disabled={updateLivestockMutation.isPending}
                        onClick={() => nudgeLivestockHealth(item, -0.1)}
                      >
                        -10% Health
                      </button>
                      <button
                        className="farm-action-mini"
                        disabled={updateLivestockMutation.isPending}
                        onClick={() => nudgeLivestockHealth(item, 0.1)}
                      >
                        +10% Health
                      </button>
                    </div>
                  </div>
                );
              })}

              {livestockTips.length > 0 && (
                <div className="farm-livestock-advisory">
                  <div className="farm-advisory-heading">
                    📋 Daily Livestock Checklist
                  </div>
                  {livestockTips.map((item) => (
                    <div key={item.title} className="farm-advisory-item">
                      <MdCheckCircle size={14} color="#4caf50" />
                      <span>
                        <strong>{item.title}:</strong> {item.tip}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DataState>
        )}
      </div>

      {/* ── Add Crop Modal ────────────────────────────────────── */}
      {showAddCrop && (
        <AddCropModal
          onClose={() => setShowAddCrop(false)}
          onAdd={() => {
            queryClient.invalidateQueries(["crops"]);
            queryClient.invalidateQueries(["farm-data"]);
          }}
        />
      )}

      {showAddReminder && (
        <AddReminderModal
          onClose={() => setShowAddReminder(false)}
          onAdd={() => queryClient.invalidateQueries(["farm-data"])}
          quickTemplates={quickReminderTemplates}
        />
      )}

      {showAddLivestock && (
        <AddLivestockModal
          onClose={() => setShowAddLivestock(false)}
          onAdd={(payload) => {
            addLivestockMutation.mutate(payload, {
              onSuccess: () => {
                setShowAddLivestock(false);
              },
            });
          }}
        />
      )}
    </div>
  );
}

/* ─── Add Crop Modal ───────────────────────────────────────── */

function AddCropModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [variety, setVariety] = useState("");
  const [stage, setStage] = useState("Sowing");
  const [sowingDate, setSowingDate] = useState("");
  const [fieldSize, setFieldSize] = useState("1");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

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
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        "Could not add crop. Please login first.";
      window.alert(msg);
      console.error(error);
      setLoading(false);
    }
  }

  const meta = STAGE_META[stage] || STAGE_META.Sowing;

  return (
    <div
      className="farm-modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="farm-modal">
        {/* Modal header */}
        <div className="farm-modal-header">
          <div className="farm-modal-title">
            <span>{meta.emoji}</span>
            <span>Add New Crop</span>
          </div>
          <button
            className="farm-modal-close"
            onClick={onClose}
            id="modal-close-btn"
          >
            <MdClose size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="farm-modal-form"
          id="add-crop-form"
        >
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
            <label className="farm-label">🌱 Growth Stage</label>
            <div className="farm-stage-grid">
              {STAGES.map((s) => {
                const m = STAGE_META[s];
                return (
                  <button
                    key={s}
                    type="button"
                    className={`farm-stage-btn ${stage === s ? "active" : ""}`}
                    style={
                      stage === s
                        ? {
                            background: m.bg,
                            borderColor: m.color,
                            color: m.color,
                          }
                        : {}
                    }
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

function AddReminderModal({ onClose, onAdd, quickTemplates = [] }) {
  const [task, setTask] = useState("");
  const [dueAtLabel, setDueAtLabel] = useState("Today 6:00 PM");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!task.trim()) return;
    setLoading(true);
    try {
      await addReminder({
        task: task.trim(),
        dueAtLabel: dueAtLabel.trim() || "Today 6:00 PM",
        category,
        priority,
      });
      onAdd();
      onClose();
    } catch (error) {
      const msg =
        error?.response?.data?.message || "Could not create reminder.";
      window.alert(msg);
      setLoading(false);
    }
  }

  function applyTemplate(template) {
    setTask(template.task || "");
    setDueAtLabel(template.dueAtLabel || "Today 6:00 PM");
    setCategory(template.category || "general");
    setPriority(template.priority || "medium");
  }

  return (
    <div
      className="farm-modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="farm-modal">
        <div className="farm-modal-header">
          <div className="farm-modal-title">
            <span>⏰</span>
            <span>Add Reminder</span>
          </div>
          <button className="farm-modal-close" onClick={onClose}>
            <MdClose size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="farm-modal-form">
          {quickTemplates.length > 0 && (
            <div className="farm-field">
              <label className="farm-label">⚡ Quick Templates</label>
              <div className="farm-quick-strip">
                {quickTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="farm-quick-btn"
                    onClick={() => applyTemplate(template)}
                  >
                    <MdPlaylistAdd size={14} />
                    <span>{template.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="farm-field">
            <label className="farm-label">
              <MdEdit size={14} /> Task *
            </label>
            <input
              className="farm-input"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. Spray pest control in tomato plot"
              required
            />
          </div>

          <div className="farm-two-col">
            <div className="farm-field">
              <label className="farm-label">
                <MdCalendarToday size={14} /> Due Label
              </label>
              <input
                className="farm-input"
                value={dueAtLabel}
                onChange={(e) => setDueAtLabel(e.target.value)}
                placeholder="Today 6:00 PM"
              />
            </div>

            <div className="farm-field">
              <label className="farm-label">
                <MdWarningAmber size={14} /> Priority
              </label>
              <select
                className="farm-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="farm-field">
            <label className="farm-label">
              <MdNotificationsActive size={14} /> Category
            </label>
            <select
              className="farm-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="general">General</option>
              <option value="crop">Crop</option>
              <option value="irrigation">Irrigation</option>
              <option value="spray">Spray</option>
              <option value="harvest">Harvest</option>
              <option value="livestock-feed">Livestock Feed</option>
              <option value="livestock-health">Livestock Health</option>
            </select>
          </div>

          <button
            type="submit"
            className="farm-submit-btn"
            disabled={loading || !task.trim()}
          >
            {loading ? "Saving reminder…" : "⏰ Save Reminder"}
          </button>
        </form>
      </div>
    </div>
  );
}

function AddLivestockModal({ onClose, onAdd }) {
  const [type, setType] = useState("Cow");
  const [name, setName] = useState("");
  const [count, setCount] = useState("1");
  const [healthScore, setHealthScore] = useState("0.8");
  const [feedIntervalHours, setFeedIntervalHours] = useState("12");
  const [lastFedAtLabel, setLastFedAtLabel] = useState("Today 7:00 AM");
  const [notes, setNotes] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onAdd({
      type,
      name: name.trim(),
      count: Math.max(1, Number(count || 1)),
      healthScore: Number(healthScore || 0.8),
      feedIntervalHours: Math.max(1, Number(feedIntervalHours || 12)),
      lastFedAtLabel: lastFedAtLabel.trim(),
      notes: notes.trim(),
    });
  }

  const typeMeta = LIVESTOCK_META[type] || { emoji: "🐾" };

  return (
    <div
      className="farm-modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="farm-modal">
        <div className="farm-modal-header">
          <div className="farm-modal-title">
            <span>{typeMeta.emoji}</span>
            <span>Add Livestock</span>
          </div>
          <button className="farm-modal-close" onClick={onClose}>
            <MdClose size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="farm-modal-form">
          <div className="farm-two-col">
            <div className="farm-field">
              <label className="farm-label">
                <MdPets size={14} /> Type
              </label>
              <select
                className="farm-input"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {LIVESTOCK_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {LIVESTOCK_META[item].emoji} {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="farm-field">
              <label className="farm-label">
                <MdEdit size={14} /> Nickname (optional)
              </label>
              <input
                className="farm-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dairy Group A"
              />
            </div>
          </div>

          <div className="farm-two-col">
            <div className="farm-field">
              <label className="farm-label">
                <MdAdd size={14} /> Count
              </label>
              <input
                type="number"
                min="1"
                className="farm-input"
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </div>

            <div className="farm-field">
              <label className="farm-label">
                <MdHealthAndSafety size={14} /> Health
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                className="farm-input"
                value={healthScore}
                onChange={(e) => setHealthScore(e.target.value)}
              />
            </div>
          </div>

          <div className="farm-two-col">
            <div className="farm-field">
              <label className="farm-label">
                <MdRestaurant size={14} /> Feed Interval (hours)
              </label>
              <input
                type="number"
                min="1"
                max="48"
                className="farm-input"
                value={feedIntervalHours}
                onChange={(e) => setFeedIntervalHours(e.target.value)}
              />
            </div>

            <div className="farm-field">
              <label className="farm-label">
                <MdCalendarToday size={14} /> Last Fed Label
              </label>
              <input
                className="farm-input"
                value={lastFedAtLabel}
                onChange={(e) => setLastFedAtLabel(e.target.value)}
                placeholder="Today 7:00 AM"
              />
            </div>
          </div>

          <div className="farm-field">
            <label className="farm-label">
              <MdNotes size={14} /> Notes (optional)
            </label>
            <textarea
              className="farm-input farm-textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Breed, age group, special care needs…"
            />
          </div>

          <button type="submit" className="farm-submit-btn">
            {typeMeta.emoji} Save Livestock
          </button>
        </form>
      </div>
    </div>
  );
}
