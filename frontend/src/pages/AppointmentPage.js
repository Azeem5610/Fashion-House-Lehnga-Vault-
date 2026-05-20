import React, { useEffect, useState, useCallback } from "react";
import API from "../utils/api";
import { HiCalendar, HiClock, HiX } from "react-icons/hi";
import { toast } from "react-toastify";
import "./AppointmentPage.css";

const PURPOSES = [
  "Bridal consultation", "Fabric selection", "Measurement session",
  "Design discussion", "Fitting appointment", "Follow-up meeting", "Other",
];

const TIME_SLOTS = [
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "02:00 PM", "02:30 PM",
  "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
  "05:00 PM", "05:30 PM",
];

const AppointmentPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    date: "", time: "", type: "physical", purpose: "Bridal consultation", notes: "",
  });

  const fetchMyAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/appointments/my");
      setAppointments(res.data.appointments || []);
    } catch { toast.error("Failed to load appointments"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMyAppointments(); }, [fetchMyAppointments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.time) { toast.error("Please select date and time"); return; }
    setSubmitting(true);
    try {
      await API.post("/appointments/book", form);
      toast.success("Appointment booked! Awaiting approval.");
      setForm({ date: "", time: "", type: "physical", purpose: "Bridal consultation", notes: "" });
      fetchMyAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to book");
    }
    setSubmitting(false);
  };

  const cancelAppointment = async (id) => {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      await API.put(`/appointments/cancel/${id}`);
      toast.success("Appointment cancelled");
      fetchMyAppointments();
    } catch { toast.error("Failed to cancel"); }
  };

  const getDay = (d) => new Date(d).getDate();
  const getMonth = (d) => new Date(d).toLocaleDateString("en-PK", { month: "short" });
  const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  return (
    <div className="appointment-page">
      <div className="page-header">
        <h1 style={{ fontFamily: "var(--font-display)" }}>
          Book a <span className="gradient-text">Consultation</span>
        </h1>
        <p>Schedule your bridal consultation with our design experts</p>
      </div>

      {/* Booking Form */}
      <div className="apt-book-card">
        <div className="apt-book-title">Schedule Appointment</div>
        <div className="apt-book-subtitle">Choose your preferred date, time, and meeting type</div>
        <form onSubmit={handleSubmit}>
          <div className="apt-form-grid">
            <div className="form-group">
              <label className="form-label"><HiCalendar style={{ verticalAlign: "middle" }} /> Date</label>
              <input className="form-input" type="date" required min={getMinDate()} value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label"><HiClock style={{ verticalAlign: "middle" }} /> Time Slot</label>
              <select className="form-select" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}>
                <option value="">Select time</option>
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group apt-form-full">
              <label className="form-label">Meeting Type</label>
              <div className="apt-type-selector">
                <div className={`apt-type-option ${form.type === "physical" ? "selected" : ""}`}
                  onClick={() => setForm({ ...form, type: "physical" })}>
                  <div className="apt-type-option-icon">🏠</div>
                  <div className="apt-type-option-label">In-Person Visit</div>
                  <div className="apt-type-option-desc">Visit our studio</div>
                </div>
                <div className={`apt-type-option ${form.type === "online" ? "selected" : ""}`}
                  onClick={() => setForm({ ...form, type: "online" })}>
                  <div className="apt-type-option-icon">💻</div>
                  <div className="apt-type-option-label">Online Meeting</div>
                  <div className="apt-type-option-desc">Video consultation</div>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Purpose</label>
              <select className="form-select" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
                {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes (Optional)</label>
              <input className="form-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any specific requirements..." />
            </div>
          </div>
          <button type="submit" className="btn btn-gold btn-lg" style={{ width: "100%", marginTop: 20 }} disabled={submitting}>
            {submitting ? "Booking..." : "Book Appointment"}
          </button>
        </form>
      </div>

      {/* Appointment History */}
      <div className="apt-history-title"><HiCalendar /> My Appointments</div>
      {loading ? <div className="spinner" /> : (
        appointments.length === 0 ? (
          <div className="empty-state"><h3>No appointments yet</h3><p style={{ color: "var(--text-muted)" }}>Book your first consultation above.</p></div>
        ) : (
          <div className="apt-history-list">
            {appointments.map((apt, i) => (
              <div key={apt._id} className="apt-history-card" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="apt-h-date-block">
                  <div className="apt-h-date-day">{getDay(apt.date)}</div>
                  <div className="apt-h-date-month">{getMonth(apt.date)}</div>
                </div>
                <div className="apt-h-info">
                  <div className="apt-h-info-top">
                    {apt.purpose}
                    <span className={`apt-status ${apt.status}`} style={{ marginLeft: 10 }}>{apt.status}</span>
                  </div>
                  <div className="apt-h-info-detail">
                    <span>🕐 {apt.time}</span>
                    <span className={`apt-type-tag ${apt.type}`}>{apt.type === "online" ? "💻" : "🏠"} {apt.type}</span>
                  </div>
                  {apt.adminNotes && <div className="apt-h-info-notes">Admin: {apt.adminNotes}</div>}
                  {apt.meetingLink && (
                    <div style={{ marginTop: 4 }}>
                      <a href={apt.meetingLink} target="_blank" rel="noreferrer"
                        style={{ fontSize: "0.8rem", color: "var(--info)" }}>Join Meeting ↗</a>
                    </div>
                  )}
                </div>
                {(apt.status === "pending" || apt.status === "approved") && (
                  <button className="btn btn-danger btn-sm" onClick={() => cancelAppointment(apt._id)}>
                    <HiX /> Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default AppointmentPage;
