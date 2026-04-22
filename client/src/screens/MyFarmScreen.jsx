import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MdAdd } from "react-icons/md";
import { fetchFarmData } from "../services/api";

export default function MyFarmScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const { data } = useQuery({
    queryKey: ["farm-data"],
    queryFn: fetchFarmData,
  });

  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    if (data?.reminders) {
      setReminders(data.reminders.map((item) => ({ ...item, done: Boolean(item.done) })));
    }
  }, [data]);

  const cropCards = data?.cropCards || [];
  const livestockTips = data?.livestockTips || [];
  const latestDiagnosis = data?.latestDiagnosis || "No recent diagnosis yet";

  const reminderCount = useMemo(() => reminders.filter((item) => !item.done).length, [reminders]);

  function addLocalReminder() {
    const task = window.prompt("Reminder task");
    if (!task) return;
    const dueAtLabel = window.prompt("Time label", "Tomorrow 6:00 AM") || "Tomorrow";

    setReminders((prev) => [
      {
        _id: `local-${Date.now()}`,
        task,
        dueAtLabel,
        done: false,
      },
      ...prev,
    ]);
  }

  return (
    <div>
      <div className="page-header row-between" style={{ alignItems: "center" }}>
        <div className="text-xxl" style={{ fontWeight: 800 }}>My Farm</div>
        <button className="btn" style={{ background: "#fff", color: "#1b5e20", display: "flex", alignItems: "center", gap: 6 }} onClick={addLocalReminder}>
          <MdAdd size={20} />
          Add Crop
        </button>
      </div>

      <div className="tab-strip mt-14" style={{ marginTop: 14 }}>
        {["All Crops", `Reminders (${reminderCount})`, "Livestock"].map((label, index) => (
          <button key={label} className={`tab-chip ${activeTab === index ? "active" : ""}`} onClick={() => setActiveTab(index)}>
            {label}
          </button>
        ))}
      </div>

      <div className="card mt-12">
        <div className="text-sm muted">{latestDiagnosis}</div>
      </div>

      <div className="mt-12" style={{ display: "grid", gap: 10 }}>
        {activeTab === 0 &&
          cropCards.map((crop) => (
            <div className="card" key={crop.name}>
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
              <div className="text-sm muted mt-10">Water: {crop.water} - {crop.action}</div>
            </div>
          ))}

        {activeTab === 1 &&
          reminders.map((item) => (
            <div className="card" key={item._id} style={{ opacity: item.done ? 0.6 : 1 }}>
              <div className="row-between">
                <div>
                  <div className="text-lg" style={{ fontWeight: 700, textDecoration: item.done ? "line-through" : "none" }}>{item.task}</div>
                  <div className="text-sm muted mt-8">{item.dueAtLabel}</div>
                </div>
                <button className="btn btn-subtle" onClick={() => setReminders((prev) => prev.map((r) => (r._id === item._id ? { ...r, done: !r.done } : r)))}>
                  {item.done ? "Undo" : "Done"}
                </button>
              </div>
            </div>
          ))}

        {activeTab === 2 &&
          livestockTips.map((item) => (
            <div className="card" key={item.title}>
              <div className="text-lg" style={{ fontWeight: 700 }}>{item.title}</div>
              <div className="text-sm muted mt-8" style={{ lineHeight: 1.35 }}>{item.tip}</div>
            </div>
          ))}
      </div>
    </div>
  );
}
