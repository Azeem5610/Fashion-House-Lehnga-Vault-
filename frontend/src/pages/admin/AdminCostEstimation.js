import React, { useEffect, useState, useCallback } from "react";
import API from "../../utils/api";
import {
  HiPlus, HiX, HiTrash, HiPencil, HiSearch,
  HiCurrencyDollar, HiCalculator, HiTrendingUp, HiChartPie,
} from "react-icons/hi";
import { toast } from "react-toastify";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import "./AdminCostEstimation.css";

const COST_COLORS = ["#C2185B", "#9C27B0", "#1565C0", "#F57F17", "#00897B", "#6D4C41"];

const emptyForm = {
  title: "",
  fabricCost: 0,
  embroideryCost: 0,
  laborCost: 0,
  accessoriesCost: 0,
  dyeingCost: 0,
  extraCosts: [],
  profitMarginPercent: 20,
  sellingPrice: 0,
  notes: "",
};

const AdminCostEstimation = () => {
  const [estimations, setEstimations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;

      const [estRes, anaRes] = await Promise.all([
        API.get("/cost-estimations", { params }),
        API.get("/cost-estimations/analytics"),
      ]);
      setEstimations(estRes.data);
      setAnalytics(anaRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Form helpers ──
  const computeBase = (f) => {
    const extras = (f.extraCosts || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return (Number(f.fabricCost) || 0) + (Number(f.embroideryCost) || 0) +
      (Number(f.laborCost) || 0) + (Number(f.accessoriesCost) || 0) +
      (Number(f.dyeingCost) || 0) + extras;
  };

  const computeProfit = (f) => {
    const base = computeBase(f);
    if (f.sellingPrice > 0) return f.sellingPrice - base;
    return (base * (Number(f.profitMarginPercent) || 0)) / 100;
  };

  const computeTotal = (f) => {
    const base = computeBase(f);
    if (f.sellingPrice > 0) return f.sellingPrice;
    return base + (base * (Number(f.profitMarginPercent) || 0)) / 100;
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (est) => {
    setEditing(est);
    setForm({
      title: est.title,
      fabricCost: est.fabricCost || 0,
      embroideryCost: est.embroideryCost || 0,
      laborCost: est.laborCost || 0,
      accessoriesCost: est.accessoriesCost || 0,
      dyeingCost: est.dyeingCost || 0,
      extraCosts: est.extraCosts || [],
      profitMarginPercent: est.profitMarginPercent || 0,
      sellingPrice: est.sellingPrice || 0,
      notes: est.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        fabricCost: Number(form.fabricCost),
        embroideryCost: Number(form.embroideryCost),
        laborCost: Number(form.laborCost),
        accessoriesCost: Number(form.accessoriesCost),
        dyeingCost: Number(form.dyeingCost),
        profitMarginPercent: Number(form.profitMarginPercent),
        sellingPrice: Number(form.sellingPrice),
        extraCosts: (form.extraCosts || []).map(ec => ({
          label: ec.label,
          amount: Number(ec.amount) || 0,
          notes: ec.notes || "",
        })),
      };

      if (editing) {
        await API.put(`/cost-estimations/${editing._id}`, payload);
        toast.success("Estimation updated!");
      } else {
        await API.post("/cost-estimations", payload);
        toast.success("Estimation created!");
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this cost estimation?")) return;
    try {
      await API.delete(`/cost-estimations/${id}`);
      toast.success("Deleted");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  // ── Extra cost helpers ──
  const addExtra = () => {
    setForm({ ...form, extraCosts: [...(form.extraCosts || []), { label: "", amount: 0, notes: "" }] });
  };

  const updateExtra = (idx, field, value) => {
    const updated = [...form.extraCosts];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, extraCosts: updated });
  };

  const removeExtra = (idx) => {
    setForm({ ...form, extraCosts: form.extraCosts.filter((_, i) => i !== idx) });
  };

  // ── Card helper: compute from raw est object ──
  const getEstBase = (est) => {
    const extras = (est.extraCosts || []).reduce((s, e) => s + (e.amount || 0), 0);
    return (est.fabricCost || 0) + (est.embroideryCost || 0) + (est.laborCost || 0) +
      (est.accessoriesCost || 0) + (est.dyeingCost || 0) + extras;
  };

  const getEstProfit = (est) => {
    const base = getEstBase(est);
    if (est.sellingPrice > 0) return est.sellingPrice - base;
    return (base * (est.profitMarginPercent || 0)) / 100;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 8, padding: "10px 14px", boxShadow: "var(--shadow-md)",
      }}>
        <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "0.85rem" }}>
          {payload[0].name}: Rs {payload[0].value?.toLocaleString()}
        </p>
      </div>
    );
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="gradient-text">Cost Estimation Engine</h1>
        <button className="btn btn-gold" onClick={openNew}>
          <HiPlus /> New Estimation
        </button>
      </div>

      {/* Analytics Stats */}
      {analytics && (
        <div className="ce-stats">
          <div className="ce-stat-card">
            <div className="ce-stat-value" style={{ color: "var(--rose)" }}>
              {analytics.totalEstimations}
            </div>
            <div className="ce-stat-label">Total Estimations</div>
          </div>
          <div className="ce-stat-card">
            <div className="ce-stat-value" style={{ color: "var(--info)" }}>
              Rs {(analytics.totalBaseCost || 0).toLocaleString()}
            </div>
            <div className="ce-stat-label">Total Cost</div>
          </div>
          <div className="ce-stat-card">
            <div className="ce-stat-value" style={{ color: "var(--text-primary)" }}>
              Rs {(analytics.totalSellingPrice || 0).toLocaleString()}
            </div>
            <div className="ce-stat-label">Total Revenue</div>
          </div>
          <div className="ce-stat-card">
            <div className="ce-stat-value" style={{ color: analytics.totalProfit >= 0 ? "var(--success)" : "var(--error)" }}>
              Rs {(analytics.totalProfit || 0).toLocaleString()}
            </div>
            <div className="ce-stat-label">Total Profit</div>
          </div>
          <div className="ce-stat-card">
            <div className="ce-stat-value" style={{ color: "var(--warning)" }}>
              {analytics.avgProfitMargin}%
            </div>
            <div className="ce-stat-label">Avg Margin</div>
          </div>
        </div>
      )}

      {/* Cost Breakdown Chart */}
      {analytics?.costBreakdown?.length > 0 && (
        <div className="ce-chart-card">
          <div className="ce-chart-title">
            <HiChartPie style={{ marginRight: 8, verticalAlign: "middle" }} />
            Cost Distribution
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={analytics.costBreakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                paddingAngle={3}
                strokeWidth={0}
                label={({ name, value }) => `${name}: Rs ${value.toLocaleString()}`}
              >
                {analytics.costBreakdown.map((_, i) => (
                  <Cell key={i} fill={COST_COLORS[i % COST_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Search */}
      <div className="ce-toolbar">
        <div className="ce-search">
          <HiSearch className="ce-search-icon" />
          <input
            placeholder="Search estimations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Estimation Cards */}
      {loading ? <div className="spinner" /> : (
        estimations.length === 0 ? (
          <div className="empty-state">
            <HiCalculator />
            <h3>No cost estimations yet</h3>
            <p style={{ color: "var(--text-muted)" }}>Create your first estimation to calculate profit</p>
          </div>
        ) : (
          <div className="ce-grid">
            {estimations.map((est, idx) => {
              const base = getEstBase(est);
              const profit = getEstProfit(est);
              const costItems = [
                { label: "Fabric", value: est.fabricCost, color: "#C2185B" },
                { label: "Embroidery", value: est.embroideryCost, color: "#9C27B0" },
                { label: "Labor", value: est.laborCost, color: "#1565C0" },
                { label: "Accessories", value: est.accessoriesCost, color: "#F57F17" },
                { label: "Dyeing", value: est.dyeingCost, color: "#00897B" },
              ].filter(c => c.value > 0);

              return (
                <div key={est._id} className="ce-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="ce-card-header">
                    <div>
                      <div className="ce-card-title">{est.title}</div>
                      <div className="ce-card-date">
                        {new Date(est.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <div className="ce-card-actions">
                      <button className="btn-edit" onClick={() => openEdit(est)} title="Edit" style={{ padding: "5px 7px" }}>
                        <HiPencil />
                      </button>
                      <button className="btn-delete" onClick={() => handleDelete(est._id)} title="Delete" style={{ padding: "5px 7px" }}>
                        <HiTrash />
                      </button>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="ce-breakdown">
                    {costItems.map((c, i) => (
                      <div key={i} className="ce-breakdown-row">
                        <span className="ce-breakdown-label">
                          <span className="ce-dot" style={{ background: c.color }} />
                          {c.label}
                        </span>
                        <span className="ce-breakdown-value">Rs {c.value.toLocaleString()}</span>
                      </div>
                    ))}
                    {(est.extraCosts || []).map((ec, i) => (
                      <div key={`ex-${i}`} className="ce-breakdown-row">
                        <span className="ce-breakdown-label">
                          <span className="ce-dot" style={{ background: "#6D4C41" }} />
                          {ec.label || "Extra"}
                        </span>
                        <span className="ce-breakdown-value">Rs {(ec.amount || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="ce-totals">
                    <div className="ce-totals-row base">
                      <span>Base Cost</span>
                      <span>Rs {base.toLocaleString()}</span>
                    </div>
                    {est.profitMarginPercent > 0 && (
                      <div className="ce-totals-row margin">
                        <span>Margin ({est.profitMarginPercent}%)</span>
                        <span>Rs {((base * est.profitMarginPercent) / 100).toLocaleString()}</span>
                      </div>
                    )}
                    {est.sellingPrice > 0 && (
                      <div className="ce-totals-row selling">
                        <span>Selling Price</span>
                        <span>Rs {est.sellingPrice.toLocaleString()}</span>
                      </div>
                    )}
                    <div className={`ce-totals-row profit ${profit >= 0 ? "positive" : "negative"}`}>
                      <span><HiTrendingUp style={{ verticalAlign: "middle", marginRight: 4 }} />Profit</span>
                      <span>Rs {profit.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h2>{editing ? "Edit Estimation" : "New Cost Estimation"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><HiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              {/* Title */}
              <div className="form-group">
                <label className="form-label">Estimation Title</label>
                <input
                  className="form-input"
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Bridal Lehenga — Zardozi Heavy"
                />
              </div>

              {/* Cost Inputs */}
              <div className="ce-cost-section">
                <div className="ce-cost-section-title">Cost Breakdown</div>
                <div className="ce-modal-grid">
                  <div className="form-group">
                    <label className="form-label">Fabric Cost (Rs)</label>
                    <input className="form-input" type="number" min="0" value={form.fabricCost}
                      onChange={e => setForm({ ...form, fabricCost: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Embroidery Cost (Rs)</label>
                    <input className="form-input" type="number" min="0" value={form.embroideryCost}
                      onChange={e => setForm({ ...form, embroideryCost: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Labor Cost (Rs)</label>
                    <input className="form-input" type="number" min="0" value={form.laborCost}
                      onChange={e => setForm({ ...form, laborCost: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Accessories Cost (Rs)</label>
                    <input className="form-input" type="number" min="0" value={form.accessoriesCost}
                      onChange={e => setForm({ ...form, accessoriesCost: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dyeing Cost (Rs)</label>
                    <input className="form-input" type="number" min="0" value={form.dyeingCost}
                      onChange={e => setForm({ ...form, dyeingCost: Number(e.target.value) })} />
                  </div>
                </div>
              </div>

              {/* Extra Costs */}
              <div className="ce-cost-section">
                <div className="ce-cost-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  Extra Costs
                  <button type="button" className="btn btn-outline btn-sm" onClick={addExtra} style={{ height: 28, padding: "0 10px", fontSize: "0.72rem" }}>
                    <HiPlus /> Add
                  </button>
                </div>
                {(form.extraCosts || []).map((ec, idx) => (
                  <div key={idx} className="ce-extra-row">
                    <input
                      className="form-input"
                      placeholder="Label"
                      value={ec.label}
                      onChange={e => updateExtra(idx, "label", e.target.value)}
                      style={{ flex: 2 }}
                    />
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      placeholder="Amount"
                      value={ec.amount}
                      onChange={e => updateExtra(idx, "amount", Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="ce-extra-remove" onClick={() => removeExtra(idx)}>
                      <HiX />
                    </button>
                  </div>
                ))}
              </div>

              {/* Profit & Selling */}
              <div className="ce-modal-grid" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Profit Margin (%)</label>
                  <input className="form-input" type="number" min="0" max="100" value={form.profitMarginPercent}
                    onChange={e => setForm({ ...form, profitMarginPercent: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Selling Price (Rs) <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>optional override</span></label>
                  <input className="form-input" type="number" min="0" value={form.sellingPrice}
                    onChange={e => setForm({ ...form, sellingPrice: Number(e.target.value) })} />
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" rows={2} value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>

              {/* Live Preview */}
              <div className="ce-live-preview">
                <div className="ce-live-preview-title">
                  <HiCurrencyDollar style={{ verticalAlign: "middle", marginRight: 4 }} />
                  Live Calculation
                </div>
                <div className="ce-live-row">
                  <span>Base Cost</span>
                  <span style={{ fontWeight: 600 }}>Rs {computeBase(form).toLocaleString()}</span>
                </div>
                <div className="ce-live-row">
                  <span>Profit ({form.sellingPrice > 0 ? "from selling price" : `${form.profitMarginPercent}%`})</span>
                  <span style={{ fontWeight: 600, color: computeProfit(form) >= 0 ? "var(--success)" : "var(--error)" }}>
                    Rs {computeProfit(form).toLocaleString()}
                  </span>
                </div>
                <div className="ce-live-row total">
                  <span>Total / Selling Price</span>
                  <span>Rs {computeTotal(form).toLocaleString()}</span>
                </div>
              </div>

              <button type="submit" className="btn btn-gold" style={{ width: "100%", marginTop: 16 }} disabled={submitting}>
                {submitting ? "Saving..." : editing ? "Update Estimation" : "Create Estimation"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCostEstimation;
