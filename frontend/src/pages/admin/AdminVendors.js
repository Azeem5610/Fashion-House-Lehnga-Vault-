import React, { useEffect, useState } from "react";
import API from "../../utils/api";
import { HiPlus, HiX, HiTrash, HiPencil } from "react-icons/hi";
import { toast } from "react-toastify";

const AdminVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", contactNumber: "", location: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchVendors(); }, []);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/vendors");
      setVendors(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", contactNumber: "", location: "", notes: "" });
    setShowModal(true);
  };

  const openEdit = (vendor) => {
    setEditing(vendor);
    setForm({ name: vendor.name, contactNumber: vendor.contactNumber, location: vendor.location || "", notes: vendor.notes || "" });
    setShowModal(true);
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

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="gradient-text">Vendors</h1>
        <button className="btn btn-gold" onClick={openNew}>
          <HiPlus /> Add Vendor
        </button>
      </div>

      {loading ? <div className="spinner" /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>No vendors yet</td></tr>
              ) : (
                vendors.map((v) => (
                  <tr key={v._id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v.name}</td>
                    <td>{v.contactNumber}</td>
                    <td>{v.location || "—"}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.notes || "—"}
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        <button className="btn-edit" onClick={() => openEdit(v)}><HiPencil /></button>
                        <button className="btn-delete" onClick={() => handleDelete(v._id)}><HiTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? "Edit Vendor" : "Add Vendor"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><HiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Vendor Name</label>
                <input className="form-input" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input className="form-input" required value={form.contactNumber}
                  placeholder="923XXXXXXXXX"
                  onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
              <button type="submit" className="btn btn-gold" style={{ width: '100%' }} disabled={submitting}>
                {submitting ? "Saving..." : editing ? "Update Vendor" : "Add Vendor"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVendors;
