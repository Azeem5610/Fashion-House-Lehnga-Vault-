import React, { useEffect, useState } from "react";
import API from "../../utils/api";
import { HiPlus, HiX, HiTrash, HiPencil, HiSearch, HiStar, HiLocationMarker, HiPhone, HiClock } from "react-icons/hi";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "react-toastify";

const SPECIALTIES_OPTIONS = [
  "Fabrics", "Embroidery Materials", "Lace & Borders", "Stones & Pearls",
  "Threads", "Dyeing", "Packaging", "Accessories", "Beads & Tassels",
];

const emptyForm = {
  name: "", contactNumber: "", whatsapp: "", location: "",
  notes: "", specialties: [], deliveryTime: "", rating: 0,
};

const AdminVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [viewVendor, setViewVendor] = useState(null);
  const [vendorOrders, setVendorOrders] = useState([]);

  useEffect(() => { fetchVendors(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/vendors", { params: search ? { search } : {} });
      setVendors(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => { fetchVendors(); }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, [search]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (vendor) => {
    setEditing(vendor);
    setForm({
      name: vendor.name, contactNumber: vendor.contactNumber,
      whatsapp: vendor.whatsapp || "", location: vendor.location || "",
      notes: vendor.notes || "", specialties: vendor.specialties || [],
      deliveryTime: vendor.deliveryTime || "", rating: vendor.rating || 0,
    });
    setShowModal(true);
  };

  const viewDetails = async (vendor) => {
    try {
      const { data } = await API.get(`/vendors/${vendor._id}`);
      setViewVendor(data.vendor);
      setVendorOrders(data.recentOrders || []);
    } catch (err) { toast.error("Failed to load vendor details"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await API.put(`/vendors/${editing._id}`, form);
        toast.success("Vendor updated!");
      } else {
        await API.post("/vendors", form);
        toast.success("Vendor added!");
      }
      setShowModal(false);
      fetchVendors();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this vendor?")) return;
    try {
      await API.delete(`/vendors/${id}`);
      toast.success("Vendor deleted");
      fetchVendors();
    } catch (err) { toast.error("Failed to delete"); }
  };

  const openWhatsApp = (vendor) => {
    const phone = (vendor.whatsapp || vendor.contactNumber).replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${phone}`, "_blank");
  };

  const toggleSpecialty = (spec) => {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(spec)
        ? prev.specialties.filter((s) => s !== spec)
        : [...prev.specialties, spec],
    }));
  };

  const renderStars = (rating, interactive = false, size = "1rem") => {
    return (
      <div style={{ display: "flex", gap: 2 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <HiStar
            key={star}
            style={{
              fontSize: size,
              color: star <= rating ? "var(--gold)" : "var(--border-light)",
              cursor: interactive ? "pointer" : "default",
              transition: "color 0.2s",
            }}
            onClick={interactive ? () => setForm({ ...form, rating: star }) : undefined}
          />
        ))}
      </div>
    );
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="gradient-text">Vendor Management</h1>
        <button className="btn btn-gold" onClick={openNew}>
          <HiPlus /> Add Vendor
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 24, position: "relative", maxWidth: 400 }}>
        <HiSearch style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          className="form-input"
          style={{ paddingLeft: 40 }}
          placeholder="Search vendors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Vendor Cards Grid */}
      {loading ? <div className="spinner" /> : (
        vendors.length === 0 ? (
          <div className="empty-state">
            <h3>No vendors yet</h3>
            <p style={{ color: "var(--text-muted)" }}>Add your first vendor to get started</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
            {vendors.map((v) => (
              <div key={v._id} className="card" style={{ padding: 24, cursor: "pointer", position: "relative" }}
                onClick={() => viewDetails(v)}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                      {v.name}
                    </h3>
                    {renderStars(v.rating)}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn-edit" onClick={(e) => { e.stopPropagation(); openEdit(v); }} style={{ padding: "6px 8px" }}>
                      <HiPencil />
                    </button>
                    <button className="btn-delete" onClick={(e) => { e.stopPropagation(); handleDelete(v._id); }} style={{ padding: "6px 8px" }}>
                      <HiTrash />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}>
                    <HiPhone style={{ color: "var(--text-muted)", flexShrink: 0 }} /> {v.contactNumber}
                  </div>
                  {v.location && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}>
                      <HiLocationMarker style={{ color: "var(--text-muted)", flexShrink: 0 }} /> {v.location}
                    </div>
                  )}
                  {v.deliveryTime && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}>
                      <HiClock style={{ color: "var(--text-muted)", flexShrink: 0 }} /> {v.deliveryTime}
                    </div>
                  )}
                </div>

                {/* Specialties */}
                {v.specialties && v.specialties.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                    {v.specialties.map((s) => (
                      <span key={s} style={{
                        padding: "3px 10px", borderRadius: "var(--radius-full)",
                        fontSize: "0.7rem", fontWeight: 600, background: "rgba(212,168,67,0.1)",
                        color: "var(--gold)", border: "1px solid rgba(212,168,67,0.2)",
                      }}>{s}</span>
                    ))}
                  </div>
                )}

                {/* Footer Stats */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: "auto",
                }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Orders: <strong style={{ color: "var(--text-primary)" }}>{v.totalOrders || 0}</strong>
                    {v.totalOrders > 0 && (
                      <span style={{ marginLeft: 8 }}>
                        Performance: <strong style={{ color: v.performance >= 80 ? "var(--success)" : v.performance >= 50 ? "var(--warning)" : "var(--error)" }}>
                          {v.performance || 0}%
                        </strong>
                      </span>
                    )}
                  </div>
                  <button
                    className="btn btn-sm"
                    style={{ background: "#25D366", color: "#fff", border: "none", padding: "6px 12px", fontSize: "0.78rem" }}
                    onClick={(e) => { e.stopPropagation(); openWhatsApp(v); }}
                  >
                    <FaWhatsapp /> Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>{editing ? "Edit Vendor" : "Add Vendor"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><HiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Vendor Name</label>
                  <input className="form-input" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" required value={form.contactNumber}
                    placeholder="923XXXXXXXXX"
                    onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp Number</label>
                  <input className="form-input" value={form.whatsapp}
                    placeholder="Same as phone if empty"
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input className="form-input" value={form.location} placeholder="e.g. Faisalabad"
                    onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Delivery Time</label>
                  <input className="form-input" value={form.deliveryTime} placeholder="e.g. 3-5 days"
                    onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Rating</label>
                  {renderStars(form.rating, true, "1.4rem")}
                </div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Specialties</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {SPECIALTIES_OPTIONS.map((spec) => (
                      <button
                        key={spec} type="button"
                        onClick={() => toggleSpecialty(spec)}
                        style={{
                          padding: "5px 14px", borderRadius: "var(--radius-full)",
                          fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                          transition: "all 0.2s",
                          background: form.specialties.includes(spec) ? "rgba(212,168,67,0.15)" : "var(--bg-tertiary)",
                          color: form.specialties.includes(spec) ? "var(--gold)" : "var(--text-muted)",
                          border: `1px solid ${form.specialties.includes(spec) ? "rgba(212,168,67,0.3)" : "var(--border)"}`,
                        }}
                      >{spec}</button>
                    ))}
                  </div>
                </div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={form.notes} rows={2}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-gold" style={{ width: "100%", marginTop: 8 }} disabled={submitting}>
                {submitting ? "Saving..." : editing ? "Update Vendor" : "Add Vendor"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Vendor Detail Modal */}
      {viewVendor && (
        <div className="modal-overlay" onClick={() => setViewVendor(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>{viewVendor.name}</h2>
              <button className="modal-close" onClick={() => setViewVendor(null)}><HiX /></button>
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Phone</div>
                <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>{viewVendor.contactNumber}</div>
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Location</div>
                <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>{viewVendor.location || "—"}</div>
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Rating</div>
                {renderStars(viewVendor.rating)}
              </div>
            </div>

            {viewVendor.specialties?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>Specialties</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {viewVendor.specialties.map((s) => (
                    <span key={s} className="badge badge-contacted">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Orders */}
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
              Recent Purchase Orders
            </div>
            {vendorOrders.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>No orders yet</p>
            ) : (
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                {vendorOrders.map((o) => (
                  <div key={o._id} style={{
                    padding: "12px 16px", borderBottom: "1px solid var(--border)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    fontSize: "0.85rem",
                  }}>
                    <div>
                      <strong style={{ color: "var(--text-primary)" }}>{o.orderNumber || "PO"}</strong>
                      <span style={{ color: "var(--text-muted)", marginLeft: 8, fontSize: "0.78rem" }}>{formatDate(o.createdAt)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 600, color: "var(--gold)" }}>Rs.{(o.totalCost || 0).toLocaleString()}</span>
                      <span className={`badge badge-${o.status}`}>{o.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn btn-whatsapp"
              style={{ width: "100%", marginTop: 20 }}
              onClick={() => openWhatsApp(viewVendor)}
            >
              <FaWhatsapp /> Contact on WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVendors;
