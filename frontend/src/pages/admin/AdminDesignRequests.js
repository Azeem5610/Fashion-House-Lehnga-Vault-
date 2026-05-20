import React, { useEffect, useState } from "react";
import API from "../../utils/api";
import { HiCurrencyDollar, HiCheck, HiX, HiChat, HiShoppingCart } from "react-icons/hi";
import { toast } from "react-toastify";

const STATUSES = ["pending", "contacted", "quoted", "approved", "in-production", "completed", "rejected"];

const STATUS_STYLES = {
  pending: { bg: "rgba(245,158,11,0.1)", color: "#F59E0B" },
  contacted: { bg: "rgba(59,130,246,0.1)", color: "#3B82F6" },
  quoted: { bg: "rgba(156,39,176,0.1)", color: "#9C27B0" },
  approved: { bg: "rgba(46,125,50,0.1)", color: "#2E7D32" },
  "in-production": { bg: "rgba(194,24,91,0.1)", color: "#C2185B" },
  completed: { bg: "rgba(16,185,129,0.1)", color: "#10B981" },
  rejected: { bg: "rgba(239,68,68,0.1)", color: "#EF4444" },
};

const AdminDesignRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quoteModal, setQuoteModal] = useState(null); // request object or null
  const [quoteForm, setQuoteForm] = useState({ quotedPrice: "", estimatedDays: "", adminNotes: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/design-requests");
      setRequests(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    try {
      await API.put(`/design-requests/${id}/status`, { status });
      toast.success(`Request marked as ${status}`);
      fetchRequests();
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  const openQuoteModal = (request) => {
    setQuoteForm({
      quotedPrice: request.quotedPrice || "",
      estimatedDays: request.estimatedDays || "",
      adminNotes: request.adminNotes || "",
    });
    setQuoteModal(request);
  };

  const sendQuote = async () => {
    if (!quoteForm.quotedPrice || Number(quoteForm.quotedPrice) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    setSubmitting(true);
    try {
      await API.put(`/design-requests/${quoteModal._id}/quote`, {
        quotedPrice: Number(quoteForm.quotedPrice),
        estimatedDays: Number(quoteForm.estimatedDays) || 0,
        adminNotes: quoteForm.adminNotes,
      });
      toast.success("Price quote sent to customer!");
      setQuoteModal(null);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
    setSubmitting(false);
  };

  const convertToOrder = async (requestId) => {
    if (!window.confirm("Convert this design request into an order? The customer will be notified.")) return;
    try {
      await API.post(`/design-requests/${requestId}/convert`);
      toast.success("Design request converted to order!");
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to convert");
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

  const getStatusBadge = (status) => {
    const s = STATUS_STYLES[status] || { bg: "rgba(107,76,59,0.1)", color: "#6B4C3B" };
    return {
      background: s.bg, color: s.color, border: `1px solid ${s.color}20`,
      padding: "4px 10px", borderRadius: "50px", fontSize: "0.72rem",
      fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em",
    };
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="gradient-text">Design Requests</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{requests.length} total</span>
      </div>

      {loading ? <div className="spinner" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {requests.length === 0 ? (
            <div className="empty-state" style={{ padding: 60 }}><h3>No design requests yet</h3></div>
          ) : (
            requests.map((r) => (
              <div key={r._id} style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 12, overflow: "hidden",
              }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", flexWrap: "wrap" }}>
                  {/* Images */}
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {r.images?.slice(0, 3).map((img, i) => (
                      <img key={i} src={img.url} alt=""
                        style={{ width: 50, height: 50, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)" }} />
                    ))}
                    {r.images?.length > 3 && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>
                        +{r.images.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Customer info */}
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>{r.user?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.user?.email} · {r.user?.phone || "—"}</div>
                  </div>

                  {/* Type badge */}
                  <span style={{
                    background: r.requestType === 'exact-copy' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)',
                    color: r.requestType === 'exact-copy' ? '#3B82F6' : '#8B5CF6',
                    padding: "4px 10px", borderRadius: "50px", fontSize: "0.72rem", fontWeight: 700,
                  }}>
                    {r.requestType === 'exact-copy' ? 'Exact Copy' : 'With Changes'}
                  </span>

                  <span style={getStatusBadge(r.status)}>{r.status}</span>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>{formatDate(r.createdAt)}</div>
                </div>

                {/* Details row */}
                <div style={{ padding: "0 20px 16px", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                  {/* Description */}
                  <div style={{ flex: 2, minWidth: 200 }}>
                    {r.description && (
                      <div style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 8 }}>
                        <strong>Description:</strong> {r.description}
                      </div>
                    )}
                    {r.adminNotes && (
                      <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                        <HiChat style={{ verticalAlign: "middle" }} /> Admin: {r.adminNotes}
                      </div>
                    )}
                    {r.quotedPrice > 0 && (
                      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--rose)", marginTop: 6 }}>
                        Quoted: Rs.{r.quotedPrice.toLocaleString()}
                        {r.estimatedDays > 0 && <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>({r.estimatedDays} days est.)</span>}
                      </div>
                    )}
                    {r.convertedOrder && (
                      <div style={{ fontSize: "0.8rem", color: "var(--info)", marginTop: 4 }}>
                        <HiShoppingCart style={{ verticalAlign: "middle" }} /> Converted to Order · Status: {r.convertedOrder.status}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <select
                      className="form-select"
                      value={r.status}
                      onChange={(e) => updateStatus(r._id, e.target.value)}
                      style={{ width: '145px', padding: '6px 10px', fontSize: '0.78rem' }}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <button className="btn btn-sm btn-outline" onClick={() => openQuoteModal(r)}
                      style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <HiCurrencyDollar /> Quote
                    </button>

                    {r.quotedPrice > 0 && !r.convertedOrder && (
                      <button className="btn btn-sm btn-gold" onClick={() => convertToOrder(r._id)}
                        style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <HiCheck /> Convert to Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Quote Modal */}
      {quoteModal && (
        <div className="modal-overlay" onClick={() => setQuoteModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>Send Price Quote</h2>
              <button className="modal-close" onClick={() => setQuoteModal(null)}><HiX /></button>
            </div>
            <div style={{ marginBottom: 8, fontSize: "0.84rem", color: "var(--text-secondary)" }}>
              Customer: <strong>{quoteModal.user?.name}</strong> · {quoteModal.requestType}
            </div>
            <div className="form-group">
              <label className="form-label">Price (Rs.)</label>
              <input className="form-input" type="number" min="1" required
                value={quoteForm.quotedPrice}
                onChange={(e) => setQuoteForm({ ...quoteForm, quotedPrice: e.target.value })}
                placeholder="e.g. 75000" />
            </div>
            <div className="form-group">
              <label className="form-label">Estimated Days</label>
              <input className="form-input" type="number" min="1"
                value={quoteForm.estimatedDays}
                onChange={(e) => setQuoteForm({ ...quoteForm, estimatedDays: e.target.value })}
                placeholder="e.g. 30" />
            </div>
            <div className="form-group">
              <label className="form-label">Notes to Customer</label>
              <textarea className="form-textarea" rows={3}
                value={quoteForm.adminNotes}
                onChange={(e) => setQuoteForm({ ...quoteForm, adminNotes: e.target.value })}
                placeholder="Any details about pricing, materials, timeline..." />
            </div>
            <button className="btn btn-gold" style={{ width: "100%" }} onClick={sendQuote} disabled={submitting}>
              {submitting ? "Sending..." : "Send Quote to Customer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDesignRequests;
