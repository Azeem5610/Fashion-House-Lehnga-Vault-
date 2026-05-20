import React, { useEffect, useState } from "react";
import API from "../../utils/api";
import { HiPlus, HiX, HiTrash } from "react-icons/hi";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "react-toastify";

const STATUSES = ["draft", "pending", "ordered", "shipped", "received", "cancelled"];
const UNITS = ["meters", "yards", "pieces", "grams", "kg", "liters", "packets", "rolls"];

const emptyItem = { name: "", quantity: 1, unit: "meters", unitCost: 0 };

const AdminPurchaseOrders = () => {
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vendor: "", items: [{ ...emptyItem }], expectedDelivery: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const [ordersRes, vendorsRes] = await Promise.all([
        API.get("/purchase-orders", { params }),
        API.get("/vendors"),
      ]);
      setOrders(ordersRes.data.orders || ordersRes.data);
      setVendors(vendorsRes.data);
      if (vendorsRes.data.length > 0 && !form.vendor) {
        setForm((prev) => ({ ...prev, vendor: vendorsRes.data[0]._id }));
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // eslint-disable-next-line
  useEffect(() => { fetchData(); }, [statusFilter]);

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
  };

  const removeItem = (idx) => {
    if (form.items.length <= 1) return;
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  };

  const getOrderTotal = () => {
    return form.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendor) { toast.error("Please select a vendor"); return; }
    if (form.items.some((i) => !i.name)) { toast.error("All items need a name"); return; }
    setSubmitting(true);
    try {
      const { data } = await API.post("/purchase-orders", form);
      toast.success("Purchase order created!");
      setWhatsappLink(data.whatsappLink);
      setShowForm(false);
      setForm({ vendor: vendors[0]?._id || "", items: [{ ...emptyItem }], expectedDelivery: "", notes: "" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
    setSubmitting(false);
  };

  const updateStatus = async (id, status) => {
    try {
      await API.put(`/purchase-orders/${id}/status`, { status });
      toast.success(`Order marked as ${status}`);
      fetchData();
    } catch (err) { toast.error("Failed to update"); }
  };

  const deletePO = async (id) => {
    if (!window.confirm("Delete this purchase order?")) return;
    try {
      await API.delete(`/purchase-orders/${id}`);
      toast.success("Deleted");
      fetchData();
    } catch (err) { toast.error("Failed to delete"); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const formatCurrency = (v) => `Rs.${(v || 0).toLocaleString()}`;

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="gradient-text">Purchase Orders</h1>
        <button className="btn btn-gold" onClick={() => { setShowForm(!showForm); setWhatsappLink(""); }}>
          <HiPlus /> New Order
        </button>
      </div>

      {/* WhatsApp link notification */}
      {whatsappLink && (
        <div style={{
          background: "rgba(37, 211, 102, 0.08)", border: "1px solid rgba(37, 211, 102, 0.2)",
          borderRadius: "var(--radius-lg)", padding: "16px 20px", marginBottom: 24,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
        }}>
          <span style={{ color: "var(--success)", fontSize: "0.9rem" }}>
            ✅ Purchase order created! Send it to the vendor via WhatsApp:
          </span>
          <a href={whatsappLink} target="_blank" rel="noreferrer" className="btn btn-whatsapp btn-sm">
            <FaWhatsapp /> Send on WhatsApp
          </a>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)", padding: 24, marginBottom: 24,
        }}>
          <h3 style={{ fontFamily: "var(--font-display)", marginBottom: 20 }}>Create Purchase Order</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Vendor</label>
                <select className="form-select" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })}>
                  {vendors.length === 0 ? (
                    <option value="">No vendors — add one first</option>
                  ) : (
                    vendors.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)
                  )}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Expected Delivery</label>
                <input className="form-input" type="date" value={form.expectedDelivery}
                  onChange={(e) => setForm({ ...form, expectedDelivery: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Notes</label>
                <input className="form-input" value={form.notes} placeholder="Optional notes"
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            {/* Items */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <label className="form-label" style={{ marginBottom: 0, fontWeight: 700 }}>Order Items</label>
                <button type="button" className="btn btn-outline btn-sm" onClick={addItem}>
                  <HiPlus /> Add Item
                </button>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} style={{
                  display: "grid", gridTemplateColumns: "2fr 80px 100px 100px 36px",
                  gap: 10, alignItems: "end", marginBottom: 10,
                }}>
                  <div>
                    {idx === 0 && <label className="form-label" style={{ fontSize: "0.72rem" }}>Item Name</label>}
                    <input className="form-input" required value={item.name} placeholder="e.g. Red Organza"
                      onChange={(e) => updateItem(idx, "name", e.target.value)} style={{ padding: "8px 12px" }} />
                  </div>
                  <div>
                    {idx === 0 && <label className="form-label" style={{ fontSize: "0.72rem" }}>Qty</label>}
                    <input className="form-input" type="number" min="1" value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} style={{ padding: "8px 12px" }} />
                  </div>
                  <div>
                    {idx === 0 && <label className="form-label" style={{ fontSize: "0.72rem" }}>Unit</label>}
                    <select className="form-select" value={item.unit}
                      onChange={(e) => updateItem(idx, "unit", e.target.value)} style={{ padding: "8px 12px" }}>
                      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    {idx === 0 && <label className="form-label" style={{ fontSize: "0.72rem" }}>Rs/Unit</label>}
                    <input className="form-input" type="number" min="0" value={item.unitCost}
                      onChange={(e) => updateItem(idx, "unitCost", Number(e.target.value))} style={{ padding: "8px 12px" }} />
                  </div>
                  <button type="button" className="btn-delete" style={{ padding: 8, height: 36 }}
                    onClick={() => removeItem(idx)} disabled={form.items.length <= 1}>
                    <HiX />
                  </button>
                </div>
              ))}
              <div style={{ textAlign: "right", fontWeight: 700, color: "var(--gold)", fontSize: "1rem", marginTop: 8 }}>
                Total: {formatCurrency(getOrderTotal())}
              </div>
            </div>

            <button type="submit" className="btn btn-gold" disabled={submitting} style={{ width: "100%" }}>
              {submitting ? "Creating..." : "Create & Get WhatsApp Link"}
            </button>
          </form>
        </div>
      )}

      {/* Status Filter */}
      <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className={`btn btn-sm ${!statusFilter ? "btn-gold" : "btn-outline"}`} onClick={() => setStatusFilter("")}>
          All
        </button>
        {STATUSES.map((s) => (
          <button key={s} className={`btn btn-sm ${statusFilter === s ? "btn-gold" : "btn-outline"}`}
            onClick={() => setStatusFilter(s)} style={{ textTransform: "capitalize" }}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? <div className="spinner" /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Vendor</th>
                <th>Items</th>
                <th>Total</th>
                <th>Date</th>
                <th>Expected</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(orders) ? orders : []).length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: "center", padding: 40 }}>No purchase orders</td></tr>
              ) : (
                (Array.isArray(orders) ? orders : []).map((o) => (
                  <tr key={o._id}>
                    <td style={{ color: "var(--gold)", fontWeight: 700, fontFamily: "var(--font-heading)", fontSize: "0.85rem" }}>
                      {o.orderNumber || "—"}
                    </td>
                    <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{o.vendor?.name || "—"}</td>
                    <td style={{ fontSize: "0.82rem" }}>
                      {o.items?.map((item, i) => (
                        <div key={i} style={{ lineHeight: 1.6 }}>
                          {item.name} × {item.quantity} {item.unit}
                        </div>
                      )) || "—"}
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--gold)" }}>{formatCurrency(o.totalCost)}</td>
                    <td style={{ fontSize: "0.8rem" }}>{formatDate(o.createdAt)}</td>
                    <td style={{ fontSize: "0.8rem" }}>{formatDate(o.expectedDelivery)}</td>
                    <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <select
                          className="form-select"
                          value={o.status}
                          onChange={(e) => updateStatus(o._id, e.target.value)}
                          style={{ width: 120, padding: "6px 10px", fontSize: "0.78rem" }}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button className="btn-delete" onClick={() => deletePO(o._id)} style={{ padding: "6px 8px" }}>
                          <HiTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPurchaseOrders;
