import React, { useEffect, useState, useCallback } from "react";
import API from "../../utils/api";
import {
  HiCheck,
  HiClock,
  HiTruck,
  HiExclamationCircle,
  HiRefresh,
  HiPlus,
  HiX,
  HiTrash,
  HiChevronDown,
  HiChevronUp,
  HiAnnotation,
} from "react-icons/hi";
import { toast } from "react-toastify";
import "./AdminOrderTracking.css";

const STAGE_NAMES = [
  "Order Placed",
  "Fabric Purchased",
  "Dyeing",
  "Embroidery",
  "Stitching",
  "Finishing",
  "Quality Check",
  "Delivered",
];

const AdminOrderTracking = () => {
  const [trackings, setTrackings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orders, setOrders] = useState([]);
  const [createForm, setCreateForm] = useState({ orderId: "", estimatedCompletion: "" });
  const [stageNotes, setStageNotes] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterStage) params.stage = filterStage;
      const [trackRes, anaRes] = await Promise.all([
        API.get("/order-tracking", { params }),
        API.get("/order-tracking/analytics"),
      ]);
      setTrackings(trackRes.data);
      setAnalytics(anaRes.data);
    } catch {
      toast.error("Failed to load tracking data");
    }
    setLoading(false);
  }, [filterStatus, filterStage]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const fetchOrders = async () => {
    try {
      const { data } = await API.get("/orders");
      // Filter orders that don't already have tracking
      const trackingOrderIds = trackings.map((t) => t.order?._id);
      const untracked = data.filter((o) => !trackingOrderIds.includes(o._id));
      setOrders(untracked);
    } catch {
      toast.error("Failed to load orders");
    }
  };

  const handleCreate = async () => {
    if (!createForm.orderId) {
      toast.error("Please select an order");
      return;
    }
    try {
      await API.post("/order-tracking", createForm);
      toast.success("Tracking created");
      setShowCreateModal(false);
      setCreateForm({ orderId: "", estimatedCompletion: "" });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create tracking");
    }
  };

  const handleUpdateStage = async (trackingId, stageName, status) => {
    try {
      await API.put(`/order-tracking/${trackingId}/stage`, {
        stageName,
        status,
        notes: stageNotes || undefined,
      });
      toast.success(`"${stageName}" → ${status}`);
      setStageNotes("");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update stage");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this tracking record?")) return;
    try {
      await API.delete(`/order-tracking/${id}`);
      toast.success("Tracking deleted");
      fetchAll();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
  };

  const getStageIcon = (status) => {
    switch (status) {
      case "completed": return <HiCheck />;
      case "in-progress": return <HiClock />;
      case "skipped": return <HiExclamationCircle />;
      default: return <span className="ot-pending-dot" />;
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="gradient-text">Order Tracking</h1>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="ot-stats">
          {[
            { label: "Total", value: analytics.total, color: "var(--info)" },
            { label: "In Progress", value: analytics.inProgress, color: "var(--warning)" },
            { label: "Completed", value: analytics.completed, color: "var(--success)" },
            { label: "Overdue", value: analytics.overdue, color: "var(--error)" },
            { label: "Avg. Days", value: analytics.avgCompletionDays, color: "#8B5CF6" },
          ].map((s, i) => (
            <div key={s.label} className="ot-stat-card" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="ot-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="ot-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="ot-toolbar">
        <select className="form-select ot-filter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select className="form-select ot-filter" value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
          <option value="">All Stages</option>
          {STAGE_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-gold btn-sm" style={{ marginLeft: "auto" }} onClick={() => { setShowCreateModal(true); fetchOrders(); }}>
          <HiPlus /> New Tracking
        </button>
      </div>

      {/* Tracking List */}
      {loading ? (
        <div className="spinner" />
      ) : trackings.length === 0 ? (
        <div className="empty-state">
          <HiTruck style={{ fontSize: "3rem" }} />
          <h3>No Tracked Orders</h3>
          <p>Create tracking for an order to start monitoring production stages.</p>
        </div>
      ) : (
        <div className="ot-list">
          {trackings.map((t, i) => {
            const isExpanded = expandedId === t._id;
            return (
              <div key={t._id} className="ot-card" style={{ animationDelay: `${i * 0.04}s` }}>
                {/* Summary Row */}
                <div className="ot-card-header" onClick={() => setExpandedId(isExpanded ? null : t._id)}>
                  <div className="ot-card-image">
                    {t.order?.product?.images?.[0] ? (
                      <img src={t.order.product.images[0].url} alt={t.order.product.name} />
                    ) : (
                      <div className="ot-card-placeholder">📦</div>
                    )}
                  </div>
                  <div className="ot-card-info">
                    <div className="ot-card-name">
                      {t.order?.product?.name || "Order"}
                      <span className="ot-order-id">#{t.order?._id?.slice(-6).toUpperCase()}</span>
                    </div>
                    <div className="ot-card-detail">
                      <span>👤 {t.order?.user?.name || "Customer"}</span>
                      <span>📅 {formatDate(t.order?.createdAt)}</span>
                      {t.estimatedCompletion && <span>⏰ Est: {formatDate(t.estimatedCompletion)}</span>}
                    </div>
                  </div>
                  <div className="ot-card-progress">
                    <div className="ot-progress-bar">
                      <div className="ot-progress-fill" style={{ width: `${t.progress}%` }} />
                    </div>
                    <span className="ot-progress-text">{t.progress}%</span>
                  </div>
                  <div className={`ot-stage-badge ${t.isComplete ? "complete" : "active"}`}>
                    {t.isComplete ? "✅ Complete" : t.currentStage}
                  </div>
                  <div className="ot-expand-btn">
                    {isExpanded ? <HiChevronUp /> : <HiChevronDown />}
                  </div>
                </div>

                {/* Expanded Stages */}
                {isExpanded && (
                  <div className="ot-stages-panel">
                    <div className="ot-stages-grid">
                      {t.stages.map((stage, idx) => (
                        <div key={stage.name} className={`ot-stage-row ${stage.status}`}>
                          <div className="ot-stage-icon">{getStageIcon(stage.status)}</div>
                          <div className="ot-stage-info">
                            <div className="ot-stage-name">{stage.name}</div>
                            <div className="ot-stage-dates">
                              {stage.startDate && <span>Start: {formatDate(stage.startDate)}</span>}
                              {stage.completedDate && <span>Done: {formatDate(stage.completedDate)}</span>}
                            </div>
                            {stage.notes && <div className="ot-stage-note">{stage.notes}</div>}
                          </div>
                          <div className="ot-stage-actions">
                            {stage.status === "pending" && (
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => handleUpdateStage(t._id, stage.name, "in-progress")}
                              >
                                Start
                              </button>
                            )}
                            {stage.status === "in-progress" && (
                              <button
                                className="btn btn-sm btn-gold"
                                onClick={() => handleUpdateStage(t._id, stage.name, "completed")}
                              >
                                <HiCheck /> Complete
                              </button>
                            )}
                            {(stage.status === "pending" || stage.status === "in-progress") && (
                              <button
                                className="btn btn-sm btn-ghost"
                                onClick={() => handleUpdateStage(t._id, stage.name, "skipped")}
                                title="Skip this stage"
                              >
                                Skip
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick notes + Delete */}
                    <div className="ot-panel-footer">
                      <div className="ot-notes-input">
                        <HiAnnotation />
                        <input
                          className="form-input"
                          placeholder="Add note to next stage update..."
                          value={stageNotes}
                          onChange={(e) => setStageNotes(e.target.value)}
                        />
                      </div>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t._id)}>
                        <HiTrash /> Delete Tracking
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Order Tracking</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <HiX />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Select Order</label>
              <select
                className="form-select"
                value={createForm.orderId}
                onChange={(e) => setCreateForm({ ...createForm, orderId: e.target.value })}
              >
                <option value="">— Select an order —</option>
                {orders.map((o) => (
                  <option key={o._id} value={o._id}>
                    #{o._id.slice(-6).toUpperCase()} — {o.product?.name || "Product"} — {o.user?.name || "Customer"}
                  </option>
                ))}
              </select>
              {orders.length === 0 && (
                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 6 }}>
                  All orders already have tracking records.
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Estimated Completion</label>
              <input
                className="form-input"
                type="date"
                value={createForm.estimatedCompletion}
                onChange={(e) => setCreateForm({ ...createForm, estimatedCompletion: e.target.value })}
              />
            </div>

            <button className="btn btn-gold" style={{ width: "100%" }} onClick={handleCreate}>
              <HiPlus /> Create Tracking
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrderTracking;
