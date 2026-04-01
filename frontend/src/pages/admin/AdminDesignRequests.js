import React, { useEffect, useState } from "react";
import API from "../../utils/api";
import { toast } from "react-toastify";

const STATUSES = ["pending", "contacted", "in-progress", "completed"];

const AdminDesignRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const formatDate = (d) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="gradient-text">Design Requests</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{requests.length} total</span>
      </div>

      {loading ? <div className="spinner" /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Images</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Description</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>No design requests yet</td></tr>
              ) : (
                requests.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {r.images?.slice(0, 3).map((img, i) => (
                          <img key={i} src={img.url} alt="" className="admin-table-image" />
                        ))}
                        {r.images?.length > 3 && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                            +{r.images.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.user?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.user?.email}</div>
                    </td>
                    <td>
                      <span className={`badge ${r.requestType === 'exact-copy' ? 'badge-confirmed' : 'badge-shipped'}`}>
                        {r.requestType === 'exact-copy' ? 'Exact Copy' : 'Customized'}
                      </span>
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.description || "—"}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{formatDate(r.createdAt)}</td>
                    <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                    <td>
                      <select
                        className="form-select"
                        value={r.status}
                        onChange={(e) => updateStatus(r._id, e.target.value)}
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

export default AdminDesignRequests;
