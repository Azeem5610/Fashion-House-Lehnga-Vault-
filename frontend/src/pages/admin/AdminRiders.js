import React, { useEffect, useState } from "react";
import API from "../../utils/api";
import { HiSearch, HiPlus, HiPencil, HiTrash } from "react-icons/hi";
import { toast } from "react-toastify";
import "./AdminRiders.css";

const VEHICLE_ICONS = { bike: "🏍️", car: "🚗", van: "🚐" };

const EMPTY_FORM = {
  name: "",
  phone: "",
  cnic: "",
  vehicleType: "bike",
  vehicleNumber: "",
  area: "",
  notes: "",
};

const AdminRiders = () => {
  const [riders, setRiders] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, available: 0, onDelivery: 0, totalDeliveries: 0 });
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingRider, setEditingRider] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRiders();
    fetchStats();
  }, []);

  const fetchRiders = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/riders");
      setRiders(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const { data } = await API.get("/riders/stats");
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const openAddModal = () => {
    setEditingRider(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (rider) => {
    setEditingRider(rider);
    setForm({
      name: rider.name || "",
      phone: rider.phone || "",
      cnic: rider.cnic || "",
      vehicleType: rider.vehicleType || "bike",
      vehicleNumber: rider.vehicleNumber || "",
      area: rider.area || "",
      notes: rider.notes || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRider(null);
    setForm(EMPTY_FORM);
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    setSaving(true);
    try {
      if (editingRider) {
        await API.put(`/riders/${editingRider._id}`, form);
        toast.success("Rider updated successfully! ✅");
      } else {
        await API.post("/riders", form);
        toast.success("Rider added successfully! 🏍️");
      }
      closeModal();
      fetchRiders();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save rider");
    }
    setSaving(false);
  };

  const handleDelete = async (riderId) => {
    if (!window.confirm("Are you sure you want to deactivate this rider?")) return;
    try {
      await API.delete(`/riders/${riderId}`);
      toast.success("Rider deactivated");
      fetchRiders();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate rider");
    }
  };

  const handleStatusChange = async (riderId, newStatus) => {
    try {
      await API.put(`/riders/${riderId}`, { status: newStatus });
      toast.success("Status updated");
      fetchRiders();
      fetchStats();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

  // Filter + search
  let filtered = riders;
  if (filterStatus) filtered = filtered.filter((r) => r.status === filterStatus);
  if (searchText) {
    const q = searchText.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.phone?.includes(q) ||
        r.area?.toLowerCase().includes(q) ||
        r.vehicleNumber?.toLowerCase().includes(q)
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="gradient-text">Riders</h1>
        <button className="btn btn-gold" onClick={openAddModal}>
          <HiPlus /> Add Rider
        </button>
      </div>

      {/* Stats Cards */}
      <div className="riders-stats-grid">
        <div className="riders-stat-card">
          <div className="riders-stat-value">{stats.active}</div>
          <div className="riders-stat-label">Active Riders</div>
        </div>
        <div className="riders-stat-card">
          <div className="riders-stat-value">{stats.available}</div>
          <div className="riders-stat-label">Available</div>
        </div>
        <div className="riders-stat-card">
          <div className="riders-stat-value">{stats.onDelivery}</div>
          <div className="riders-stat-label">On Delivery</div>
        </div>
        <div className="riders-stat-card">
          <div className="riders-stat-value">{stats.totalDeliveries}</div>
          <div className="riders-stat-label">Total Deliveries</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="riders-toolbar">
        <div className="riders-search-box">
          <HiSearch style={{ color: "var(--text-muted)" }} />
          <input
            className="form-input"
            placeholder="Search by name, phone, area, or plate..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <select
          className="form-select"
          style={{ maxWidth: 180 }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="on-delivery">On Delivery</option>
          <option value="off-duty">Off Duty</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Vehicle</th>
                <th>Plate</th>
                <th>Area</th>
                <th>Deliveries</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "40px" }}>
                    No riders found
                  </td>
                </tr>
              ) : (
                filtered.map((rider) => (
                  <tr key={rider._id}>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{rider.name}</td>
                    <td>{rider.phone}</td>
                    <td>
                      <span className="rider-vehicle-badge">
                        {VEHICLE_ICONS[rider.vehicleType] || "🏍️"} {rider.vehicleType}
                      </span>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>
                      {rider.vehicleNumber || "—"}
                    </td>
                    <td>{rider.area || "—"}</td>
                    <td style={{ fontWeight: 700, color: "var(--rose)" }}>{rider.totalDeliveries}</td>
                    <td>
                      <select
                        value={rider.status}
                        onChange={(e) => handleStatusChange(rider._id, e.target.value)}
                        className="form-select"
                        style={{
                          fontSize: "0.78rem",
                          padding: "4px 8px",
                          borderRadius: 6,
                          width: "auto",
                          cursor: "pointer",
                          fontWeight: 600,
                          color:
                            rider.status === "available"
                              ? "#2E7D32"
                              : rider.status === "on-delivery"
                              ? "#F57F17"
                              : "#787878",
                        }}
                      >
                        <option value="available">Available</option>
                        <option value="on-delivery">On Delivery</option>
                        <option value="off-duty">Off Duty</option>
                      </select>
                    </td>
                    <td style={{ fontSize: "0.8rem" }}>{formatDate(rider.createdAt)}</td>
                    <td>
                      <div className="rider-actions-cell">
                        <button onClick={() => openEditModal(rider)} title="Edit">
                          <HiPencil />
                        </button>
                        <button className="btn-delete" onClick={() => handleDelete(rider._id)} title="Deactivate">
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="rider-modal-overlay" onClick={closeModal}>
          <div className="rider-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingRider ? "Edit Rider" : "Add New Rider"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="rider-form-grid">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    className="form-input"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Rider name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone *</label>
                  <input
                    className="form-input"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="03XX-XXXXXXX"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">CNIC</label>
                  <input
                    className="form-input"
                    name="cnic"
                    value={form.cnic}
                    onChange={handleChange}
                    placeholder="XXXXX-XXXXXXX-X"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle Type</label>
                  <select className="form-select" name="vehicleType" value={form.vehicleType} onChange={handleChange}>
                    <option value="bike">🏍️ Bike</option>
                    <option value="car">🚗 Car</option>
                    <option value="van">🚐 Van</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle Number</label>
                  <input
                    className="form-input"
                    name="vehicleNumber"
                    value={form.vehicleNumber}
                    onChange={handleChange}
                    placeholder="ABC-1234"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Coverage Area</label>
                  <input
                    className="form-input"
                    name="area"
                    value={form.area}
                    onChange={handleChange}
                    placeholder="City / area"
                  />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-input"
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Optional notes..."
                  />
                </div>
              </div>
              <div className="rider-modal-actions">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold" disabled={saving}>
                  {saving ? "Saving..." : editingRider ? "Update Rider" : "Add Rider"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRiders;
