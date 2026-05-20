import React, { useEffect, useState, useCallback } from "react";
import API from "../../utils/api";
import { HiCheck, HiX, HiTrash, HiCalendar, HiPhone, HiMail, HiAnnotation } from "react-icons/hi";
import { toast } from "react-toastify";
import "./AdminAppointments.css";

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [noteModal, setNoteModal] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [meetingLink, setMeetingLink] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      const [aptRes, anaRes] = await Promise.all([
        API.get("/appointments", { params }),
        API.get("/appointments/analytics"),
      ]);
      setAppointments(aptRes.data.appointments || []);
      setAnalytics(anaRes.data);
    } catch { toast.error("Failed to load appointments"); }
    setLoading(false);
  }, [statusFilter, typeFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateStatus = async (id, status) => {
    try {
      await API.put(`/appointments/${id}/status`, { status });
      toast.success(`Appointment ${status}`);
      fetchAll();
    } catch { toast.error("Failed to update"); }
  };

  const submitNotes = async () => {
    if (!noteModal) return;
    try {
      await API.put(`/appointments/${noteModal._id}/status`, {
        status: "approved",
        adminNotes,
        meetingLink,
      });
      toast.success("Appointment approved with notes");
      setNoteModal(null);
      setAdminNotes("");
      setMeetingLink("");
      fetchAll();
    } catch { toast.error("Failed"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this appointment?")) return;
    try {
      await API.delete(`/appointments/${id}`);
      toast.success("Deleted");
      fetchAll();
    } catch { toast.error("Failed"); }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
  const getDay = (d) => new Date(d).getDate();
  const getMonth = (d) => new Date(d).toLocaleDateString("en-PK", { month: "short" });

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="gradient-text">Appointments</h1>
      </div>

      {analytics && (
        <div className="apt-stats">
          {[
            { label: "Total", value: analytics.total, color: "var(--info)" },
            { label: "Pending", value: analytics.pending, color: "var(--warning)" },
            { label: "Approved", value: analytics.approved, color: "var(--success)" },
            { label: "Today", value: analytics.todayCount, color: "var(--gold)" },
            { label: "This Week", value: analytics.weekCount, color: "#8B5CF6" },
            { label: "Completed", value: analytics.completed, color: "var(--rose-gold)" },
          ].map((s, i) => (
            <div key={s.label} className="apt-stat-card" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="apt-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="apt-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="apt-toolbar">
        <select className="apt-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {["pending", "approved", "rejected", "completed", "cancelled"].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select className="apt-filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="online">Online</option>
          <option value="physical">Physical</option>
        </select>
      </div>

      {loading ? <div className="spinner" /> : (
        appointments.length === 0 ? (
          <div className="empty-state"><h3>No appointments found</h3></div>
        ) : (
          <div className="apt-list">
            {appointments.map((apt, i) => (
              <div key={apt._id} className="apt-card" style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="apt-date-block">
                  <div className="apt-date-day">{getDay(apt.date)}</div>
                  <div className="apt-date-month">{getMonth(apt.date)}</div>
                </div>
                <div className="apt-info">
                  <div className="apt-info-name">
                    {apt.customer?.name || "Customer"}
                    <span className={`apt-status ${apt.status}`} style={{ marginLeft: 10 }}>{apt.status}</span>
                  </div>
                  <div className="apt-info-detail">
                    <span><HiCalendar style={{ verticalAlign: "middle" }} /> {apt.time}</span>
                    <span className={`apt-type-tag ${apt.type}`}>{apt.type === "online" ? "💻" : "🏠"} {apt.type}</span>
                    <span>{apt.purpose}</span>
                    {apt.customer?.phone && <span><HiPhone style={{ verticalAlign: "middle" }} /> {apt.customer.phone}</span>}
                    {apt.customer?.email && <span><HiMail style={{ verticalAlign: "middle" }} /> {apt.customer.email}</span>}
                  </div>
                  {apt.notes && <div className="apt-info-notes">"{apt.notes}"</div>}
                  {apt.adminNotes && <div className="apt-info-notes" style={{ color: "var(--gold)" }}>Admin: {apt.adminNotes}</div>}
                  {apt.meetingLink && <div style={{ fontSize: "0.78rem" }}><a href={apt.meetingLink} target="_blank" rel="noreferrer" style={{ color: "var(--info)" }}>Meeting Link ↗</a></div>}
                </div>
                <div className="apt-actions">
                  {apt.status === "pending" && (
                    <>
                      <button className="btn btn-sm" style={{ background: "rgba(52,211,153,0.15)", color: "var(--success)", border: "1px solid rgba(52,211,153,0.25)" }}
                        onClick={() => { setNoteModal(apt); setAdminNotes(""); setMeetingLink(""); }}>
                        <HiCheck /> Approve
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => updateStatus(apt._id, "rejected")}>
                        <HiX /> Reject
                      </button>
                    </>
                  )}
                  {apt.status === "approved" && (
                    <button className="btn btn-sm" style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.25)" }}
                      onClick={() => updateStatus(apt._id, "completed")}>
                      ✓ Complete
                    </button>
                  )}
                  <button className="btn-delete" onClick={() => handleDelete(apt._id)}><HiTrash /></button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Approve with notes modal */}
      {noteModal && (
        <div className="modal-overlay" onClick={() => setNoteModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>Approve Appointment</h2>
              <button className="modal-close" onClick={() => setNoteModal(null)}><HiX /></button>
            </div>
            <p style={{ color: "var(--text-secondary)", marginBottom: 16, fontSize: "0.9rem" }}>
              <strong style={{ color: "var(--text-primary)" }}>{noteModal.customer?.name}</strong> — {formatDate(noteModal.date)} at {noteModal.time}
            </p>
            <div className="form-group">
              <label className="form-label"><HiAnnotation style={{ verticalAlign: "middle" }} /> Admin Notes</label>
              <textarea className="form-textarea" rows={3} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Any notes for the customer..." />
            </div>
            {noteModal.type === "online" && (
              <div className="form-group">
                <label className="form-label">Meeting Link</label>
                <input className="form-input" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/..." />
              </div>
            )}
            <button className="btn btn-gold" style={{ width: "100%" }} onClick={submitNotes}>Approve Appointment</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAppointments;
