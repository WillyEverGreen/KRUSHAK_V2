import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MdAdd, MdClose } from "react-icons/md";
import { fetchFarmData, fetchCrops, addCrop, toggleReminder } from "../services/api";
import DataState from "../components/DataState";
import FreshnessTag from "../components/FreshnessTag";

export default function MyFarmScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [showAddCrop, setShowAddCrop] = useState(false);

  /* Geolocation for weather-informed crops */
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
  });

  const { data: cropData, isLoading: cropsLoading, error: cropsError } = useQuery({
    queryKey: ["crops", coords?.latitude, coords?.longitude],
    queryFn: () => fetchCrops({ lat: coords?.latitude, lon: coords?.longitude }),
  });

  const toggleMutation = useMutation({
    mutationFn: toggleReminder,
    onSuccess: () => queryClient.invalidateQueries(["farm-data"]),
  });

  const reminders = farmData?.reminders || [];
  const livestockTips = farmData?.livestockTips || [];
  const latestDiagnosis = farmData?.latestDiagnosis || "No recent diagnosis yet";
  const crops = cropData?.crops || [];

  const reminderCount = useMemo(() => reminders.filter((item) => !item.done).length, [reminders]);

  return (
    <div>
      <div className="page-header row-between" style={{ alignItems: "center" }}>
        <div>
          <div className="text-xxl" style={{ fontWeight: 800 }}>My Farm</div>
          <div className="text-sm" style={{ color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
            {farmData?.weatherSummary || "Loading weather..."}
          </div>
        </div>
        <button
          className="btn"
          style={{ background: "#fff", color: "#1b5e20", display: "flex", alignItems: "center", gap: 6 }}
          onClick={() => setShowAddCrop(true)}
        >
          <MdAdd size={20} /> Add Crop
        </button>
      </div>

      <div className="tab-strip mt-14">
        {["All Crops", `Reminders (${reminderCount})`, "Livestock"].map((label, index) => (
          <button
            key={label}
            className={`tab-chip ${activeTab === index ? "active" : ""}`}
            onClick={() => setActiveTab(index)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="row-between mt-12">
        <div className="text-sm muted" style={{ background: "#fff", padding: "6px 10px", borderRadius: 8, border: "1px solid #e5ece7" }}>
          {latestDiagnosis}
        </div>
        {activeTab === 0 && cropData?.generatedAt && (
          <FreshnessTag generatedAt={cropData.generatedAt} />
        )}
      </div>

      <div className="mt-12" style={{ display: "grid", gap: 10 }}>
        {activeTab === 0 && (
          <DataState loading={cropsLoading} error={cropsError} empty={crops.length === 0} emptyMessage="No crops added yet." emptyAction={{ label: "Add Crop", onClick: () => setShowAddCrop(true) }}>
            {crops.map((crop) => (
              <div className="card" key={crop._id}>
                <div className="row-between">
                  <div className="text-xl" style={{ fontWeight: 700 }}>{crop.name}</div>
                  <span className="chip">{crop.stage}</span>
                </div>
                <div className="row mt-10" style={{ alignItems: "center" }}>
                  <div className="health-bar" style={{ flex: 1 }}>
                    <span style={{ width: `${Math.round(crop.health * 100)}%` }} />
                  </div>
                  <div style={{ fontWeight: 700, color: "#1b5e20" }}>{Math.round(crop.health * 100)}%</div>
                </div>
                <div className="text-sm muted mt-10" style={{ lineHeight: 1.4 }}>
                  <strong>Water:</strong> {crop.water} <br/>
                  <strong>Action:</strong> {crop.action}
                </div>
              </div>
            ))}
          </DataState>
        )}

        {activeTab === 1 && (
          <DataState loading={farmLoading} error={farmError} empty={reminders.length === 0} emptyMessage="No reminders.">
            {farmData?.isDemo && (
              <div className="card" style={{ background: "#e8f5e9", border: "1px solid #c8e6c9" }}>
                <div className="text-sm" style={{ color: "#2e7d32", fontWeight: 600 }}>💡 Add your first real reminder below. Showing demo data.</div>
              </div>
            )}
            {reminders.map((item) => (
              <div className="card" key={item._id} style={{ opacity: item.done ? 0.6 : 1 }}>
                <div className="row-between">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-lg" style={{ fontWeight: 700, textDecoration: item.done ? "line-through" : "none" }}>
                      {item.task}
                    </div>
                    <div className="row" style={{ marginTop: 8, gap: 10, alignItems: "center" }}>
                      <div className="text-sm muted">{item.dueAtLabel}</div>
                      {item.skipWarning && !item.done && (
                        <div className="text-xs" style={{ color: "#c53030", background: "#fed7d7", padding: "2px 6px", borderRadius: 4 }}>
                          {item.skipWarning}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    className="btn btn-subtle"
                    disabled={toggleMutation.isPending}
                    onClick={() => {
                      if (item._id.startsWith("demo")) {
                        window.alert("Please login to manage real reminders.");
                        return;
                      }
                      toggleMutation.mutate(item._id);
                    }}
                  >
                    {item.done ? "Undo" : "Done"}
                  </button>
                </div>
              </div>
            ))}
          </DataState>
        )}

        {activeTab === 2 && (
          <DataState loading={farmLoading} error={farmError} empty={livestockTips.length === 0}>
            {livestockTips.map((item) => (
              <div className="card" key={item.title}>
                <div className="text-lg" style={{ fontWeight: 700 }}>{item.title}</div>
                <div className="text-sm muted mt-8" style={{ lineHeight: 1.35 }}>{item.tip}</div>
              </div>
            ))}
          </DataState>
        )}
      </div>

      {showAddCrop && <AddCropModal onClose={() => setShowAddCrop(false)} onAdd={() => queryClient.invalidateQueries(["crops"])} />}
    </div>
  );
}

function AddCropModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [stage, setStage] = useState("Sowing");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      await addCrop({ name, stage });
      onAdd();
      onClose();
    } catch (err) {
      window.alert("Error adding crop. Please login first.");
      console.error(err);
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="card-elevated" style={{ width: "100%", maxWidth: 360 }}>
        <div className="row-between" style={{ marginBottom: 16 }}>
          <div className="text-lg" style={{ fontWeight: 800 }}>Add Crop</div>
          <button className="btn btn-subtle" onClick={onClose} style={{ padding: 6 }}><MdClose size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input className="search-input" placeholder="Crop Name (e.g. Wheat)" value={name} onChange={(e) => setName(e.target.value)} required />
          <select className="search-input" value={stage} onChange={(e) => setStage(e.target.value)}>
            {["Sowing", "Germination", "Vegetative", "Flowering", "Fruiting", "Harvest"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }} disabled={loading}>
            {loading ? "Adding..." : "Add Crop"}
          </button>
        </form>
      </div>
    </div>
  );
}
