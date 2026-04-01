import React, { useEffect, useState } from "react";
import API from "../../utils/api";
import { HiPlus } from "react-icons/hi";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "react-toastify";

const FABRIC_TYPES = [
  "Net (China)", "Pure China Krinkle", "Tussle Silk",
  "Organza", "Barosha", "Velvet (Winter)", "Shafon Krinkle",
];

const STATUSES = ["pending", "ordered", "received"];

const AdminPurchaseOrders = () => {
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vendor: "", fabricType: FABRIC_TYPES[0], length: 25 });
  const [submitting, setSubmitting] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, vendorsRes] = await Promise.all([
        API.get("/purchase-orders"),
        API.get("/vendors"),
      ]);
      setOrders(ordersRes.data);
      setVendors(vendorsRes.data);
      if (vendorsRes.data.length > 0) {
        setForm((prev) => ({ ...prev, vendor: vendorsRes.data[0]._id }));
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendor) {
      toast.error("Please add a vendor first");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await API.post("/purchase-orders", form);
      toast.success("Purchase order created!");
      setWhatsappLink(data.whatsappLink);
      setShowForm(false);
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

  const formatDate = (d) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

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
          background: 'rgba(37, 211, 102, 0.08)',
          border: '1px solid rgba(37, 211, 102, 0.2)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <span style={{ color: 'var(--success)', fontSize: '0.9rem' }}>
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
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '20px' }}>Create Purchase Order</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
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
              <label className="form-label">Fabric Type</label>
              <select className="form-select" value={form.fabricType} onChange={(e) => setForm({ ...form, fabricType: e.target.value })}>
                {FABRIC_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Length</label>
              <select className="form-select" value={form.length} onChange={(e) => setForm({ ...form, length: Number(e.target.value) })}>
                <option value={25}>25 meters</option>
                <option value={50}>50 meters</option>
              </select>
            </div>
            <button type="submit" className="btn btn-gold" disabled={submitting}>
              {submitting ? "Creating..." : "Create & Get WhatsApp Link"}
            </button>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? <div className="spinner" /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Fabric</th>
                <th>Length</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No purchase orders yet</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o._id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{o.vendor?.name}</td>
                    <td>{o.fabricType}</td>
                    <td>{o.length}m</td>
                    <td style={{ fontSize: '0.8rem' }}>{formatDate(o.createdAt)}</td>
                    <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                    <td>
                      <select
                        className="form-select"
                        value={o.status}
                        onChange={(e) => updateStatus(o._id, e.target.value)}
                        style={{ width: '120px', padding: '6px 10px', fontSize: '0.8rem' }}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
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
