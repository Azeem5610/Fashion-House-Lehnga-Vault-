import React, { useEffect, useState } from "react";
import API from "../../utils/api";
import { GiDress } from "react-icons/gi";
import { HiSearch } from "react-icons/hi";
import { toast } from "react-toastify";

const STATUSES = [
  "pending",
  "confirmed",
  "in-production",
  "fabric-purchased",
  "dyeing",
  "embroidery",
  "stitching",
  "finishing",
  "quality-check",
  "shipped",
  "delivered",
  "cancelled",
];

const STATUS_COLORS = {
  "pending": { bg: "rgba(245,127,23,0.08)", color: "#F57F17", border: "rgba(245,127,23,0.15)" },
  "confirmed": { bg: "rgba(21,101,192,0.08)", color: "#1565C0", border: "rgba(21,101,192,0.15)" },
  "in-production": { bg: "rgba(194,24,91,0.08)", color: "#C2185B", border: "rgba(194,24,91,0.15)" },
  "fabric-purchased": { bg: "rgba(121,85,72,0.08)", color: "#795548", border: "rgba(121,85,72,0.15)" },
  "dyeing": { bg: "rgba(156,39,176,0.08)", color: "#9C27B0", border: "rgba(156,39,176,0.15)" },
  "embroidery": { bg: "rgba(255,143,0,0.08)", color: "#FF8F00", border: "rgba(255,143,0,0.15)" },
  "stitching": { bg: "rgba(0,137,123,0.08)", color: "#00897B", border: "rgba(0,137,123,0.15)" },
  "finishing": { bg: "rgba(63,81,181,0.08)", color: "#3F51B5", border: "rgba(63,81,181,0.15)" },
  "quality-check": { bg: "rgba(139,195,74,0.08)", color: "#689F38", border: "rgba(139,195,74,0.15)" },
  "shipped": { bg: "rgba(139,92,246,0.08)", color: "#8B5CF6", border: "rgba(139,92,246,0.15)" },
  "delivered": { bg: "rgba(46,125,50,0.08)", color: "#2E7D32", border: "rgba(46,125,50,0.15)" },
  "cancelled": { bg: "rgba(211,47,47,0.08)", color: "#D32F2F", border: "rgba(211,47,47,0.15)" },
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [searchText, setSearchText] = useState("");

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/orders");
      setOrders(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await API.put(`/orders/${orderId}/status`, { status });
      toast.success("Order status updated! 🚚");
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update order status");
    }
  };

  const handleUpdatePaymentStatus = async (orderId, paymentStatus) => {
    try {
      await API.put(`/orders/${orderId}/status`, { paymentStatus });
      toast.success("Payment status updated successfully! 💳");
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update payment status");
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

  const getStatusStyle = (status) => { // eslint-disable-line no-unused-vars
    const s = STATUS_COLORS[status] || { bg: "rgba(160,119,106,0.08)", color: "#A0776A", border: "rgba(160,119,106,0.15)" };
    return { background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: "4px 12px", borderRadius: "50px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" };
  };

  // Filter + search
  let filtered = orders;
  if (filterStatus) filtered = filtered.filter(o => o.status === filterStatus);
  if (searchText) {
    const q = searchText.toLowerCase();
    filtered = filtered.filter(o =>
      o.user?.name?.toLowerCase().includes(q) ||
      o.user?.email?.toLowerCase().includes(q) ||
      o.product?.name?.toLowerCase().includes(q) ||
      o._id.includes(q)
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="gradient-text">Orders</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{orders.length} total</span>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 200, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 12px" }}>
          <HiSearch style={{ color: "var(--text-muted)" }} />
          <input
            className="form-input"
            style={{ border: "none", background: "transparent", paddingLeft: 0, boxShadow: "none" }}
            placeholder="Search by customer, product, or order ID..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <select className="form-select" style={{ maxWidth: 200 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <div className="spinner" /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Customer</th>
                <th>Size</th>
                <th>Price</th>
                <th>City</th>
                <th>Date</th>
                <th>Payment Status</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>No orders found</td></tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o._id}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {o.product?.images?.[0] ? (
                        <img src={o.product.images[0].url} alt="" className="admin-table-image" />
                      ) : <GiDress />}
                      <div>
                        <span style={{ color: 'var(--text-primary)' }}>{o.product?.name}</span>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          #{o._id.slice(-6).toUpperCase()}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{o.user?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{o.user?.email}</div>
                    </td>
                    <td>{o.size || "—"}</td>
                    <td style={{ color: 'var(--rose)', fontWeight: 600 }}>Rs. {o.totalPrice?.toLocaleString()}</td>
                    <td>{o.shippingAddress?.city || "—"}</td>
                    <td style={{ fontSize: '0.8rem' }}>{formatDate(o.createdAt)}</td>
                    <td>
                      <select
                        value={o.paymentStatus || "pending"}
                        onChange={(e) => handleUpdatePaymentStatus(o._id, e.target.value)}
                        className="form-select"
                        style={{
                          fontSize: "0.8rem",
                          padding: "4px 8px",
                          borderRadius: 6,
                          fontWeight: 600,
                          cursor: "pointer",
                          width: "auto",
                          color: o.paymentStatus === "completed" ? "#2E7D32" : "#F57F17",
                          borderColor: o.paymentStatus === "completed" ? "rgba(46,125,50,0.3)" : "rgba(245,127,23,0.3)",
                          background: o.paymentStatus === "completed" ? "rgba(46,125,50,0.05)" : "rgba(245,127,23,0.05)"
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="cod_pending">COD Pending</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="expired">Expired</option>
                        <option value="refunded">Refunded</option>
                        <option value="verification-failed">Verification Failed</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={o.status}
                        onChange={(e) => handleUpdateOrderStatus(o._id, e.target.value)}
                        className="form-select"
                        style={{
                          fontSize: "0.8rem",
                          padding: "4px 8px",
                          borderRadius: 6,
                          width: "auto",
                          cursor: "pointer"
                        }}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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

export default AdminOrders;
