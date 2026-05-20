import React, { useEffect, useState, useCallback } from "react";
import API from "../../utils/api";
import {
  HiPlus, HiX, HiTrash, HiPencil, HiSearch,
  HiCurrencyDollar, HiOfficeBuilding, HiCalendar, HiCheckCircle, HiExclamation,
} from "react-icons/hi";
import { toast } from "react-toastify";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import "./AdminRentals.css";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank-transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "online", label: "Online" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = ["pending", "paid", "partial", "overdue"];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const emptyForm = {
  month: `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
  rentAmount: 0,
  shopName: "Main Shop",
  landlordName: "",
  landlordPhone: "",
  status: "pending",
  paidAmount: 0,
  paymentDate: "",
  paymentMethod: "cash",
  receiptNumber: "",
  utilities: 0,
  maintenance: 0,
  notes: "",
};

const AdminRentals = () => {
  const [rentals, setRentals] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(String(currentYear));
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (yearFilter) params.year = yearFilter;
      if (statusFilter) params.status = statusFilter;

      const [rentalRes, anaRes] = await Promise.all([
        API.get("/rentals", { params }),
        API.get("/rentals/analytics", { params: { year: yearFilter } }),
      ]);
      setRentals(rentalRes.data);
      setAnalytics(anaRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [yearFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      month: r.month,
      rentAmount: r.rentAmount || 0,
      shopName: r.shopName || "Main Shop",
      landlordName: r.landlordName || "",
      landlordPhone: r.landlordPhone || "",
      status: r.status || "pending",
      paidAmount: r.paidAmount || 0,
      paymentDate: r.paymentDate ? r.paymentDate.split("T")[0] : "",
      paymentMethod: r.paymentMethod || "cash",
      receiptNumber: r.receiptNumber || "",
      utilities: r.utilities || 0,
      maintenance: r.maintenance || 0,
      notes: r.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        rentAmount: Number(form.rentAmount),
        paidAmount: Number(form.paidAmount),
        utilities: Number(form.utilities),
        maintenance: Number(form.maintenance),
        paymentDate: form.paymentDate || undefined,
      };

      if (editing) {
        await API.put(`/rentals/${editing._id}`, payload);
        toast.success("Rental record updated!");
      } else {
        await API.post("/rentals", payload);
        toast.success("Rental record created!");
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this rental record?")) return;
    try {
      await API.delete(`/rentals/${id}`);
      toast.success("Deleted");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const formatMonth = (m) => {
    const [y, mo] = m.split("-");
    return new Date(y, parseInt(mo) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const liveTotal = (Number(form.rentAmount) || 0) + (Number(form.utilities) || 0) + (Number(form.maintenance) || 0);
  const liveBalance = liveTotal - (Number(form.paidAmount) || 0);

  const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 8, padding: "10px 14px", boxShadow: "var(--shadow-md)",
      }}>
        <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontWeight: 700, fontSize: "0.85rem" }}>
            {p.name}: Rs {p.value?.toLocaleString()}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="gradient-text">Shop Rental Records</h1>
        <button className="btn btn-gold" onClick={openNew}>
          <HiPlus /> Add Record
        </button>
      </div>

      {/* Analytics Stats */}
      {analytics && (
        <div className="rnt-stats">
          <div className="rnt-stat-card">
            <div className="rnt-stat-value" style={{ color: "var(--rose)" }}>
              {analytics.totalRecords}
            </div>
            <div className="rnt-stat-label">Records</div>
          </div>
          <div className="rnt-stat-card">
            <div className="rnt-stat-value" style={{ color: "var(--text-primary)" }}>
              Rs {(analytics.totalExpense || 0).toLocaleString()}
            </div>
            <div className="rnt-stat-label">Total Expense</div>
          </div>
          <div className="rnt-stat-card">
            <div className="rnt-stat-value" style={{ color: "var(--success)" }}>
              Rs {(analytics.totalPaid || 0).toLocaleString()}
            </div>
            <div className="rnt-stat-label">Total Paid</div>
          </div>
          <div className="rnt-stat-card">
            <div className="rnt-stat-value" style={{ color: analytics.totalBalance > 0 ? "var(--error)" : "var(--success)" }}>
              Rs {(analytics.totalBalance || 0).toLocaleString()}
            </div>
            <div className="rnt-stat-label">Balance Due</div>
          </div>
          <div className="rnt-stat-card">
            <div className="rnt-stat-value" style={{ color: "var(--warning)" }}>
              {analytics.pendingCount + analytics.overdueCount}
            </div>
            <div className="rnt-stat-label">Pending/Overdue</div>
          </div>
        </div>
      )}

      {/* Monthly Chart */}
      {analytics?.monthlyData?.length > 0 && (
        <div className="rnt-chart-card">
          <div className="rnt-chart-title">
            <HiCalendar style={{ marginRight: 8, verticalAlign: "middle" }} />
            Monthly Rental Expenses — {yearFilter}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: "0.78rem" }} />
              <Bar dataKey="rent" name="Rent" fill="#C2185B" radius={[4, 4, 0, 0]} barSize={22} />
              <Bar dataKey="utilities" name="Utilities" fill="#1565C0" radius={[4, 4, 0, 0]} barSize={22} />
              <Bar dataKey="maintenance" name="Maintenance" fill="#F57F17" radius={[4, 4, 0, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="rnt-toolbar">
        <select
          className="form-select rnt-year-select"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          className="form-select rnt-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Rental Table */}
      {loading ? <div className="spinner" /> : (
        rentals.length === 0 ? (
          <div className="empty-state">
            <HiOfficeBuilding />
            <h3>No rental records yet</h3>
            <p style={{ color: "var(--text-muted)" }}>Add your first monthly rent record</p>
          </div>
        ) : (
          <div className="rnt-table-wrap">
            <table className="rnt-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Shop</th>
                  <th>Rent</th>
                  <th>Utilities</th>
                  <th>Maint.</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rentals.map((r, idx) => {
                  const total = (r.rentAmount || 0) + (r.utilities || 0) + (r.maintenance || 0);
                  const balance = total - (r.paidAmount || 0);
                  return (
                    <tr key={r._id} style={{ animationDelay: `${idx * 0.03}s` }}>
                      <td className="rnt-month">{formatMonth(r.month)}</td>
                      <td>{r.shopName}</td>
                      <td className="rnt-amount">Rs {(r.rentAmount || 0).toLocaleString()}</td>
                      <td>Rs {(r.utilities || 0).toLocaleString()}</td>
                      <td>Rs {(r.maintenance || 0).toLocaleString()}</td>
                      <td className="rnt-amount">Rs {total.toLocaleString()}</td>
                      <td style={{ color: "var(--success)", fontWeight: 600 }}>Rs {(r.paidAmount || 0).toLocaleString()}</td>
                      <td style={{ color: balance > 0 ? "var(--error)" : "var(--success)", fontWeight: 600 }}>
                        Rs {balance.toLocaleString()}
                      </td>
                      <td><span className={`rnt-status ${r.status}`}>{r.status}</span></td>
                      <td style={{ textTransform: "capitalize", fontSize: "0.8rem" }}>{r.paymentMethod}</td>
                      <td>
                        <div className="rnt-table-actions">
                          <button className="btn-edit" onClick={() => openEdit(r)} title="Edit" style={{ padding: "5px 7px" }}>
                            <HiPencil />
                          </button>
                          <button className="btn-delete" onClick={() => handleDelete(r._id)} title="Delete" style={{ padding: "5px 7px" }}>
                            <HiTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>{editing ? "Edit Rental Record" : "New Rental Record"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><HiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              {/* Month & Shop */}
              <div className="rnt-modal-grid">
                <div className="form-group">
                  <label className="form-label">Month</label>
                  <input className="form-input" type="month" required value={form.month}
                    onChange={e => setForm({ ...form, month: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Shop Name</label>
                  <input className="form-input" value={form.shopName}
                    onChange={e => setForm({ ...form, shopName: e.target.value })} />
                </div>
              </div>

              {/* Landlord Info */}
              <div className="rnt-landlord-info">
                <div className="rnt-landlord-title">Landlord Info</div>
                <div className="rnt-modal-grid">
                  <div className="form-group">
                    <label className="form-label">Landlord Name</label>
                    <input className="form-input" value={form.landlordName}
                      onChange={e => setForm({ ...form, landlordName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Landlord Phone</label>
                    <input className="form-input" value={form.landlordPhone}
                      onChange={e => setForm({ ...form, landlordPhone: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Amounts */}
              <div className="rnt-modal-grid">
                <div className="form-group">
                  <label className="form-label">Rent Amount (Rs)</label>
                  <input className="form-input" type="number" min="0" required value={form.rentAmount}
                    onChange={e => setForm({ ...form, rentAmount: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Utilities (Rs)</label>
                  <input className="form-input" type="number" min="0" value={form.utilities}
                    onChange={e => setForm({ ...form, utilities: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Maintenance (Rs)</label>
                  <input className="form-input" type="number" min="0" value={form.maintenance}
                    onChange={e => setForm({ ...form, maintenance: Number(e.target.value) })} />
                </div>
              </div>

              {/* Payment */}
              <div className="rnt-modal-grid">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}>
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Paid Amount (Rs)</label>
                  <input className="form-input" type="number" min="0" value={form.paidAmount}
                    onChange={e => setForm({ ...form, paidAmount: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Date</label>
                  <input className="form-input" type="date" value={form.paymentDate}
                    onChange={e => setForm({ ...form, paymentDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select className="form-select" value={form.paymentMethod}
                    onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
                    {PAYMENT_METHODS.map(pm => (
                      <option key={pm.value} value={pm.value}>{pm.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Receipt Number</label>
                <input className="form-input" value={form.receiptNumber}
                  onChange={e => setForm({ ...form, receiptNumber: e.target.value })}
                  placeholder="Optional — receipt or reference number" />
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" rows={2} value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>

              {/* Live Total */}
              <div className="rnt-live-total">
                <div className="rnt-live-row">
                  <span>Rent</span>
                  <span>Rs {(Number(form.rentAmount) || 0).toLocaleString()}</span>
                </div>
                <div className="rnt-live-row">
                  <span>Utilities</span>
                  <span>Rs {(Number(form.utilities) || 0).toLocaleString()}</span>
                </div>
                <div className="rnt-live-row">
                  <span>Maintenance</span>
                  <span>Rs {(Number(form.maintenance) || 0).toLocaleString()}</span>
                </div>
                <div className="rnt-live-row total">
                  <span>Total</span>
                  <span>Rs {liveTotal.toLocaleString()}</span>
                </div>
                <div className="rnt-live-row" style={{ fontWeight: 700, color: liveBalance > 0 ? "var(--error)" : "var(--success)" }}>
                  <span>Balance</span>
                  <span>Rs {liveBalance.toLocaleString()}</span>
                </div>
              </div>

              <button type="submit" className="btn btn-gold" style={{ width: "100%", marginTop: 12 }} disabled={submitting}>
                {submitting ? "Saving..." : editing ? "Update Record" : "Add Record"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRentals;
