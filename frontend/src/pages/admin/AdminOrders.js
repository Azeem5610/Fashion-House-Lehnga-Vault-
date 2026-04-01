import React, { useEffect, useState } from "react";
import API from "../../utils/api";
import { GiDress } from "react-icons/gi";
import { toast } from "react-toastify";

const STATUSES = ["pending", "confirmed", "shipped", "delivered"];

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/orders");
      setOrders(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    try {
      await API.put(`/orders/${id}/status`, { status });
      toast.success(`Order marked as ${status}`);
      fetchOrders();
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="gradient-text">Orders</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{orders.length} total</span>
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
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>No orders yet</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o._id}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {o.product?.images?.[0] ? (
                        <img src={o.product.images[0].url} alt="" className="admin-table-image" />
                      ) : <GiDress />}
                      <span style={{ color: 'var(--text-primary)' }}>{o.product?.name}</span>
                    </td>
                    <td>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{o.user?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{o.user?.email}</div>
                    </td>
                    <td>{o.size}</td>
                    <td style={{ color: 'var(--gold)', fontWeight: 600 }}>Rs. {o.totalPrice?.toLocaleString()}</td>
                    <td>{o.shippingAddress?.city}</td>
                    <td style={{ fontSize: '0.8rem' }}>{formatDate(o.createdAt)}</td>
                    <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                    <td>
                      <select
                        className="form-select"
                        value={o.status}
                        onChange={(e) => updateStatus(o._id, e.target.value)}
                        style={{ width: '130px', padding: '6px 10px', fontSize: '0.8rem' }}
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

export default AdminOrders;
