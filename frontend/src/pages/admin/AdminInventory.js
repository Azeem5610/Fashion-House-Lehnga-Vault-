import React, { useEffect, useState, useCallback } from "react";
import API from "../../utils/api";
import { HiPlus, HiX, HiTrash, HiPencil, HiSearch, HiExclamation, HiChartBar } from "react-icons/hi";
import { toast } from "react-toastify";
import "./AdminInventory.css";

const CATEGORIES = [
  { value: "all", label: "All Items" },
  { value: "fabric", label: "Fabrics" },
  { value: "accessory", label: "Accessories" },
  { value: "other", label: "Other Materials" },
];

const SUBCATEGORIES = {
  fabric: ["Net (China)", "Pure China Krinkle", "Tussle Silk", "Organza", "Barosha", "Velvet", "Shafon Krinkle"],
  accessory: ["Moti", "Stones", "Pearls", "Lace", "Sitara", "Threads", "Beads", "Tassels"],
  other: ["Dyeing chemicals", "Packaging materials", "Embroidery materials"],
};

const UNITS = ["meters", "yards", "pieces", "grams", "kg", "liters", "packets", "rolls", "boxes"];

const emptyForm = {
  name: "", category: "fabric", subcategory: "Net (China)", quantity: 0,
  unit: "meters", costPerUnit: 0, reorderLevel: 10, location: "", color: "", notes: "",
};

const AdminInventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [stockModal, setStockModal] = useState(null); // { item, type: 'add' | 'use' }
  const [stockQty, setStockQty] = useState(0);
  const [stockReason, setStockReason] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab !== "all") params.category = activeTab;
      if (search) params.search = search;
      if (showLowOnly) params.lowStock = "true";

      const [itemsRes, analyticsRes] = await Promise.all([
        API.get("/inventory", { params }),
        API.get("/inventory/analytics"),
      ]);
      setItems(itemsRes.data.items || []);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load inventory");
    }
    setLoading(false);
  }, [activeTab, search, showLowOnly]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name, category: item.category, subcategory: item.subcategory,
      quantity: item.quantity, unit: item.unit, costPerUnit: item.costPerUnit,
      reorderLevel: item.reorderLevel, location: item.location || "",
      color: item.color || "", notes: item.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await API.put(`/inventory/${editing._id}`, form);
        toast.success("Item updated!");
      } else {
        await API.post("/inventory", form);
        toast.success("Item added!");
      }
      setShowModal(false);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this inventory item?")) return;
    try {
      await API.delete(`/inventory/${id}`);
      toast.success("Item deleted");
      fetchItems();
    } catch (err) { toast.error("Failed to delete"); }
  };

  const handleStockAction = async () => {
    if (!stockModal || stockQty <= 0) return;
    try {
      if (stockModal.type === "add") {
        await API.post(`/inventory/${stockModal.item._id}/add-stock`, { quantity: stockQty });
        toast.success(`Added ${stockQty} ${stockModal.item.unit}`);
      } else {
        await API.post(`/inventory/${stockModal.item._id}/usage`, {
          quantity: stockQty, reason: stockReason,
        });
        toast.success(`Recorded usage of ${stockQty} ${stockModal.item.unit}`);
      }
      setStockModal(null);
      setStockQty(0);
      setStockReason("");
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  const getCategoryBreakdown = (cat) => {
    if (!analytics?.categoryBreakdown) return { count: 0, totalValue: 0 };
    return analytics.categoryBreakdown.find((c) => c._id === cat) || { count: 0, totalValue: 0 };
  };

  const formatCurrency = (val) => `Rs.${(val || 0).toLocaleString()}`;

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="gradient-text">Inventory Management</h1>
        <button className="btn btn-gold" onClick={openNew}>
          <HiPlus /> Add Item
        </button>
      </div>

      {/* Stats */}
      {analytics && (
        <div className="inv-stats">
          <div className="inv-stat-card" style={{ animationDelay: "0.05s" }}>
            <div className="inv-stat-value blue">{analytics.totalItems}</div>
            <div className="inv-stat-label">Total Items</div>
          </div>
          <div className="inv-stat-card" style={{ animationDelay: "0.1s" }}>
            <div className="inv-stat-value gold">{formatCurrency(analytics.totalValue)}</div>
            <div className="inv-stat-label">Total Value</div>
          </div>
          <div className="inv-stat-card" style={{ animationDelay: "0.15s" }}>
            <div className="inv-stat-value red">{analytics.lowStockCount}</div>
            <div className="inv-stat-label">Low Stock Alerts</div>
          </div>
          <div className="inv-stat-card" style={{ animationDelay: "0.2s" }}>
            <div className="inv-stat-value green">{getCategoryBreakdown("fabric").count}</div>
            <div className="inv-stat-label">Fabrics</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="inv-tabs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            className={`inv-tab ${activeTab === cat.value ? "active" : ""}`}
            onClick={() => setActiveTab(cat.value)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="inv-toolbar">
        <div className="inv-search">
          <HiSearch className="inv-search-icon" />
          <input
            placeholder="Search inventory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          className={`btn ${showLowOnly ? "btn-danger" : "btn-outline"} btn-sm`}
          onClick={() => setShowLowOnly(!showLowOnly)}
        >
          <HiExclamation /> {showLowOnly ? "Show All" : "Low Stock Only"}
        </button>
      </div>

      {/* Table */}
      {loading ? <div className="spinner" /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Cost/Unit</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: "center", padding: "40px" }}>
                  No inventory items found
                </td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id}>
                    <td style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                      {item.name}
                      {item.color && <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginLeft: 6 }}>({item.color})</span>}
                    </td>
                    <td>
                      <span className={`inv-category-tag ${item.category}`}>{item.category}</span>
                    </td>
                    <td style={{ fontSize: "0.83rem" }}>{item.subcategory}</td>
                    <td style={{ fontWeight: 700, color: item.quantity <= item.reorderLevel ? "var(--error)" : "var(--text-primary)" }}>
                      {item.quantity}
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{item.unit}</td>
                    <td>{formatCurrency(item.costPerUnit)}</td>
                    <td style={{ fontWeight: 600, color: "var(--gold)" }}>
                      {formatCurrency(item.quantity * item.costPerUnit)}
                    </td>
                    <td>
                      {item.quantity <= item.reorderLevel ? (
                        <span className="low-stock-badge">Low Stock</span>
                      ) : (
                        <span className="stock-ok-badge">In Stock</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-table-actions" style={{ flexWrap: "wrap" }}>
                        <button className="btn-edit" title="Edit" onClick={() => openEdit(item)}><HiPencil /></button>
                        <button className="btn-edit" title="Add Stock" style={{ color: "var(--success)", borderColor: "rgba(52,211,153,0.2)", background: "rgba(52,211,153,0.1)" }}
                          onClick={() => { setStockModal({ item, type: "add" }); setStockQty(0); }}>+</button>
                        <button className="btn-edit" title="Record Usage" style={{ color: "var(--warning)", borderColor: "rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.1)" }}
                          onClick={() => { setStockModal({ item, type: "use" }); setStockQty(0); setStockReason(""); }}>
                          <HiChartBar />
                        </button>
                        <button className="btn-delete" title="Delete" onClick={() => handleDelete(item._id)}><HiTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h2>{editing ? "Edit Inventory Item" : "Add Inventory Item"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><HiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="inv-modal-grid">
                <div className="form-group inv-modal-full">
                  <label className="form-label">Item Name</label>
                  <input className="form-input" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Red Organza Fabric" />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={form.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      setForm({ ...form, category: cat, subcategory: SUBCATEGORIES[cat][0] });
                    }}>
                    <option value="fabric">Fabric</option>
                    <option value="accessory">Accessory</option>
                    <option value="other">Other Material</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Subcategory</label>
                  <select className="form-select" value={form.subcategory}
                    onChange={(e) => setForm({ ...form, subcategory: e.target.value })}>
                    {(SUBCATEGORIES[form.category] || []).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="form-input" type="number" min="0" required value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select className="form-select" value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Cost per Unit (Rs.)</label>
                  <input className="form-input" type="number" min="0" required value={form.costPerUnit}
                    onChange={(e) => setForm({ ...form, costPerUnit: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Reorder Level</label>
                  <input className="form-input" type="number" min="0" value={form.reorderLevel}
                    onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <input className="form-input" value={form.color} placeholder="e.g. Maroon"
                    onChange={(e) => setForm({ ...form, color: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Storage Location</label>
                  <input className="form-input" value={form.location} placeholder="e.g. Shelf A-3"
                    onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="form-group inv-modal-full">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={form.notes} rows={2}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-gold" style={{ width: "100%", marginTop: 16 }} disabled={submitting}>
                {submitting ? "Saving..." : editing ? "Update Item" : "Add Item"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Stock Action Modal */}
      {stockModal && (
        <div className="modal-overlay" onClick={() => setStockModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2>{stockModal.type === "add" ? "Add Stock" : "Record Usage"}</h2>
              <button className="modal-close" onClick={() => setStockModal(null)}><HiX /></button>
            </div>
            <p style={{ color: "var(--text-secondary)", marginBottom: 16, fontSize: "0.9rem" }}>
              <strong style={{ color: "var(--text-primary)" }}>{stockModal.item.name}</strong>
              <br />
              Current Stock: <strong style={{ color: stockModal.item.quantity <= stockModal.item.reorderLevel ? "var(--error)" : "var(--success)" }}>
                {stockModal.item.quantity} {stockModal.item.unit}
              </strong>
            </p>
            <div className="form-group">
              <label className="form-label">Quantity ({stockModal.item.unit})</label>
              <input className="form-input" type="number" min="1" value={stockQty}
                onChange={(e) => setStockQty(Number(e.target.value))} autoFocus />
            </div>
            {stockModal.type === "use" && (
              <div className="form-group">
                <label className="form-label">Reason</label>
                <input className="form-input" value={stockReason} placeholder="e.g. Used in Order #123"
                  onChange={(e) => setStockReason(e.target.value)} />
              </div>
            )}
            <button
              className={`btn ${stockModal.type === "add" ? "btn-gold" : "btn-primary"}`}
              style={{ width: "100%" }}
              onClick={handleStockAction}
              disabled={stockQty <= 0}
            >
              {stockModal.type === "add" ? `Add ${stockQty} ${stockModal.item.unit}` : `Deduct ${stockQty} ${stockModal.item.unit}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventory;
