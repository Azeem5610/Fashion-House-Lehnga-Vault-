import React, { useEffect, useState, useCallback } from "react";
import API from "../../utils/api";
import { HiPlus, HiX, HiTrash, HiPencil, HiSearch, HiCog, HiClock, HiCurrencyDollar, HiExclamation } from "react-icons/hi";
import { toast } from "react-toastify";
import "./AdminMachinery.css";

const MACHINE_TYPES = [
  { value: "embroidery", label: "Embroidery Machine", icon: "🧵" },
  { value: "stitch", label: "Stitch Machine", icon: "🪡" },
  { value: "cutting", label: "Cutting Machine", icon: "✂️" },
  { value: "press", label: "Press Machine", icon: "🔥" },
];

const CONDITIONS = ["excellent", "good", "fair", "needs-repair", "out-of-service"];
const MAINT_TYPES = ["routine", "repair", "emergency", "inspection"];

const emptyForm = {
  name: "", type: "embroidery", serialNumber: "", manufacturer: "", model: "",
  purchaseDate: "", purchaseCost: 0, condition: "good", location: "", notes: "",
};

const emptyMaintForm = {
  type: "routine", description: "", cost: 0, performedBy: "",
  date: new Date().toISOString().split("T")[0], nextScheduled: "",
  partsReplaced: "", downtimeHours: 0, notes: "",
};

const AdminMachinery = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState("cards"); // cards | logs
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [maintLogs, setMaintLogs] = useState([]);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [maintForm, setMaintForm] = useState(emptyMaintForm);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchMachines = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterType) params.type = filterType;
      const [machRes, anaRes] = await Promise.all([
        API.get("/machinery", { params }),
        API.get("/machinery/analytics"),
      ]);
      setMachines(machRes.data.machines || []);
      setAnalytics(anaRes.data);
    } catch (err) {
      toast.error("Failed to load machinery");
    }
    setLoading(false);
  }, [search, filterType]);

  useEffect(() => { fetchMachines(); }, [fetchMachines]);

  const fetchLogs = async (machineId) => {
    setLogsLoading(true);
    try {
      const res = await API.get(`/machinery/${machineId}/maintenance`);
      setMaintLogs(res.data.logs || []);
    } catch { toast.error("Failed to load logs"); }
    setLogsLoading(false);
  };

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (m) => {
    setEditing(m);
    setForm({
      name: m.name, type: m.type, serialNumber: m.serialNumber || "",
      manufacturer: m.manufacturer || "", model: m.model || "",
      purchaseDate: m.purchaseDate ? m.purchaseDate.split("T")[0] : "",
      purchaseCost: m.purchaseCost || 0, condition: m.condition,
      location: m.location || "", notes: m.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await API.put(`/machinery/${editing._id}`, form);
        toast.success("Machine updated!");
      } else {
        await API.post("/machinery", form);
        toast.success("Machine added!");
      }
      setShowModal(false);
      fetchMachines();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this machine and all its maintenance logs?")) return;
    try {
      await API.delete(`/machinery/${id}`);
      toast.success("Machine deleted");
      if (selectedMachine?._id === id) setSelectedMachine(null);
      fetchMachines();
    } catch { toast.error("Failed to delete"); }
  };

  const openMachineLogs = (machine) => {
    setSelectedMachine(machine);
    fetchLogs(machine._id);
    setView("logs");
  };

  const handleMaintSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMachine) return;
    setSubmitting(true);
    try {
      await API.post(`/machinery/${selectedMachine._id}/maintenance`, maintForm);
      toast.success("Maintenance log added!");
      setShowMaintModal(false);
      setMaintForm(emptyMaintForm);
      fetchLogs(selectedMachine._id);
      fetchMachines();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
    setSubmitting(false);
  };

  const deleteMaintLog = async (logId) => {
    if (!window.confirm("Delete this maintenance log?")) return;
    try {
      await API.delete(`/machinery/maintenance/${logId}`);
      toast.success("Log deleted");
      fetchLogs(selectedMachine._id);
    } catch { toast.error("Failed"); }
  };

  const getTypeIcon = (type) => MACHINE_TYPES.find(t => t.value === type)?.icon || "⚙️";
  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" }) : "—";
  const formatCurrency = (v) => `Rs.${(v || 0).toLocaleString()}`;
  const conditionLabel = (c) => c?.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "";

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="gradient-text">Machinery Management</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {view === "logs" && (
            <button className="btn btn-outline" onClick={() => setView("cards")}>← All Machines</button>
          )}
          <button className="btn btn-gold" onClick={openNew}><HiPlus /> Add Machine</button>
        </div>
      </div>

      {/* Stats */}
      {analytics && view === "cards" && (
        <div className="mch-stats">
          <div className="mch-stat-card" style={{ animationDelay: "0.05s" }}>
            <div className="mch-stat-value" style={{ color: "var(--info)" }}>{analytics.totalMachines}</div>
            <div className="mch-stat-label">Total Machines</div>
          </div>
          <div className="mch-stat-card" style={{ animationDelay: "0.1s" }}>
            <div className="mch-stat-value" style={{ color: "var(--success)" }}>{analytics.operational}</div>
            <div className="mch-stat-label">Operational</div>
          </div>
          <div className="mch-stat-card" style={{ animationDelay: "0.15s" }}>
            <div className="mch-stat-value" style={{ color: "var(--error)" }}>{analytics.nonOperational}</div>
            <div className="mch-stat-label">Non-Operational</div>
          </div>
          <div className="mch-stat-card" style={{ animationDelay: "0.2s" }}>
            <div className="mch-stat-value" style={{ color: "var(--warning)" }}>{analytics.maintenanceDue}</div>
            <div className="mch-stat-label">Maintenance Due</div>
          </div>
          <div className="mch-stat-card" style={{ animationDelay: "0.25s" }}>
            <div className="mch-stat-value" style={{ color: "var(--gold)" }}>{formatCurrency(analytics.totalMaintenanceCost)}</div>
            <div className="mch-stat-label">Total Maint. Cost</div>
          </div>
        </div>
      )}

      {view === "cards" && (
        <>
          {/* Toolbar */}
          <div className="mch-toolbar">
            <div className="mch-search">
              <HiSearch className="mch-search-icon" />
              <input placeholder="Search machines..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ width: "auto", minWidth: 160 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {MACHINE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Machine Cards */}
          {loading ? <div className="spinner" /> : (
            machines.length === 0 ? (
              <div className="empty-state"><h3>No machines found</h3><p style={{ color: "var(--text-muted)" }}>Add your first machine to get started.</p></div>
            ) : (
              <div className="mch-grid">
                {machines.map((m, i) => (
                  <div key={m._id} className={`mch-card ${m.condition}`} style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="mch-card-header">
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div className={`mch-card-icon ${m.type}`}>{getTypeIcon(m.type)}</div>
                        <div>
                          <div className="mch-card-name">{m.name}</div>
                          <div className="mch-card-serial">{m.serialNumber}</div>
                        </div>
                      </div>
                      <div className="mch-operational">
                        <span className={`mch-operational-dot ${m.isOperational ? "active" : "inactive"}`} />
                        {m.isOperational ? "Online" : "Offline"}
                      </div>
                    </div>
                    <div className="mch-card-body">
                      <div className="mch-detail">
                        <span className="mch-detail-label">Condition</span>
                        <span className={`mch-condition ${m.condition}`}>{conditionLabel(m.condition)}</span>
                      </div>
                      <div className="mch-detail">
                        <span className="mch-detail-label">Type</span>
                        <span className="mch-detail-value">{MACHINE_TYPES.find(t => t.value === m.type)?.label || m.type}</span>
                      </div>
                      <div className="mch-detail">
                        <span className="mch-detail-label">Purchase Date</span>
                        <span className="mch-detail-value">{formatDate(m.purchaseDate)}</span>
                      </div>
                      <div className="mch-detail">
                        <span className="mch-detail-label">Purchase Cost</span>
                        <span className="mch-detail-value" style={{ color: "var(--gold)" }}>{formatCurrency(m.purchaseCost)}</span>
                      </div>
                      {m.lastMaintenance && (
                        <div className="mch-detail">
                          <span className="mch-detail-label">Last Maintenance</span>
                          <span className="mch-detail-value">{formatDate(m.lastMaintenance)}</span>
                        </div>
                      )}
                      {m.nextMaintenance && (
                        <div className="mch-detail">
                          <span className="mch-detail-label">Next Maintenance</span>
                          <span className="mch-detail-value" style={{ color: new Date(m.nextMaintenance) < new Date() ? "var(--error)" : "var(--text-secondary)" }}>
                            {formatDate(m.nextMaintenance)}
                          </span>
                        </div>
                      )}
                    </div>
                    {m.nextMaintenance && new Date(m.nextMaintenance) < new Date() && (
                      <div className="mch-maint-alert">⚠ Maintenance Overdue</div>
                    )}
                    {m.nextMaintenance && !( new Date(m.nextMaintenance) < new Date()) && new Date(m.nextMaintenance) <= new Date(Date.now() + 7*24*60*60*1000) && (
                      <div className="mch-maint-alert mch-maint-due">🔧 Maintenance Due Soon</div>
                    )}
                    <div className="mch-card-footer">
                      <button className="btn btn-outline btn-sm" onClick={() => openMachineLogs(m)}><HiClock /> Logs</button>
                      <button className="btn-edit" onClick={() => openEdit(m)}><HiPencil /></button>
                      <button className="btn-delete" onClick={() => handleDelete(m._id)}><HiTrash /></button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* Maintenance Logs View */}
      {view === "logs" && selectedMachine && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--text-primary)" }}>
                {getTypeIcon(selectedMachine.type)} {selectedMachine.name}
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{selectedMachine.serialNumber} · Maintenance History</p>
            </div>
            <button className="btn btn-gold btn-sm" onClick={() => { setMaintForm(emptyMaintForm); setShowMaintModal(true); }}>
              <HiPlus /> Add Log
            </button>
          </div>

          {logsLoading ? <div className="spinner" /> : (
            maintLogs.length === 0 ? (
              <div className="empty-state"><h3>No maintenance logs</h3><p style={{ color: "var(--text-muted)" }}>Record the first maintenance activity.</p></div>
            ) : (
              <div className="mch-log-timeline">
                {maintLogs.map((log, i) => (
                  <div key={log._id} className="mch-log-item" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className={`mch-log-dot ${log.type}`} />
                    <div className="mch-log-content">
                      <div className="mch-log-title">
                        <span className={`mch-condition ${log.type === "emergency" ? "needs-repair" : log.type === "repair" ? "fair" : "good"}`} style={{ marginRight: 8 }}>
                          {log.type}
                        </span>
                        {log.description}
                      </div>
                      {log.partsReplaced && <div className="mch-log-desc">Parts: {log.partsReplaced}</div>}
                      {log.notes && <div className="mch-log-desc">{log.notes}</div>}
                      <div className="mch-log-meta">
                        <span>📅 {formatDate(log.date)}</span>
                        {log.cost > 0 && <span><HiCurrencyDollar /> {formatCurrency(log.cost)}</span>}
                        {log.performedBy && <span><HiCog /> {log.performedBy}</span>}
                        {log.downtimeHours > 0 && <span>⏱ {log.downtimeHours}h downtime</span>}
                        {log.nextScheduled && <span>Next: {formatDate(log.nextScheduled)}</span>}
                      </div>
                    </div>
                    <button className="btn-delete" style={{ flexShrink: 0 }} onClick={() => deleteMaintLog(log._id)}><HiTrash /></button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Add/Edit Machine Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h2>{editing ? "Edit Machine" : "Add Machine"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><HiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mch-modal-grid">
                <div className="form-group mch-modal-full">
                  <label className="form-label">Machine Name</label>
                  <input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Brother Embroidery Pro" />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {MACHINE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Serial Number</label>
                  <input className="form-input" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} placeholder="Auto-generated if empty" />
                </div>
                <div className="form-group">
                  <label className="form-label">Manufacturer</label>
                  <input className="form-input" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Model</label>
                  <input className="form-input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Purchase Date</label>
                  <input className="form-input" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Purchase Cost (Rs.)</label>
                  <input className="form-input" type="number" min="0" value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Condition</label>
                  <select className="form-select" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                    {CONDITIONS.map(c => <option key={c} value={c}>{conditionLabel(c)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Factory Floor A" />
                </div>
                <div className="form-group mch-modal-full">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-gold" style={{ width: "100%", marginTop: 16 }} disabled={submitting}>
                {submitting ? "Saving..." : editing ? "Update Machine" : "Add Machine"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Maintenance Log Modal */}
      {showMaintModal && (
        <div className="modal-overlay" onClick={() => setShowMaintModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <div className="modal-header">
              <h2>Add Maintenance Log</h2>
              <button className="modal-close" onClick={() => setShowMaintModal(false)}><HiX /></button>
            </div>
            <form onSubmit={handleMaintSubmit}>
              <div className="mch-modal-grid">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={maintForm.type} onChange={(e) => setMaintForm({ ...maintForm, type: e.target.value })}>
                    {MAINT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-input" type="date" value={maintForm.date} onChange={(e) => setMaintForm({ ...maintForm, date: e.target.value })} />
                </div>
                <div className="form-group mch-modal-full">
                  <label className="form-label">Description</label>
                  <input className="form-input" required value={maintForm.description} onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })} placeholder="What was done?" />
                </div>
                <div className="form-group">
                  <label className="form-label">Cost (Rs.)</label>
                  <input className="form-input" type="number" min="0" value={maintForm.cost} onChange={(e) => setMaintForm({ ...maintForm, cost: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Performed By</label>
                  <input className="form-input" value={maintForm.performedBy} onChange={(e) => setMaintForm({ ...maintForm, performedBy: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Downtime (Hours)</label>
                  <input className="form-input" type="number" min="0" value={maintForm.downtimeHours} onChange={(e) => setMaintForm({ ...maintForm, downtimeHours: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Next Scheduled</label>
                  <input className="form-input" type="date" value={maintForm.nextScheduled} onChange={(e) => setMaintForm({ ...maintForm, nextScheduled: e.target.value })} />
                </div>
                <div className="form-group mch-modal-full">
                  <label className="form-label">Parts Replaced</label>
                  <input className="form-input" value={maintForm.partsReplaced} onChange={(e) => setMaintForm({ ...maintForm, partsReplaced: e.target.value })} placeholder="e.g. Needle, Belt" />
                </div>
                <div className="form-group mch-modal-full">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={2} value={maintForm.notes} onChange={(e) => setMaintForm({ ...maintForm, notes: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-gold" style={{ width: "100%", marginTop: 16 }} disabled={submitting}>
                {submitting ? "Saving..." : "Add Log"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMachinery;
