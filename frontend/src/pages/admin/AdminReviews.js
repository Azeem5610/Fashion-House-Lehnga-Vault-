import React, { useEffect, useState, useCallback } from "react";
import API from "../../utils/api";
import {
  HiStar,
  HiCheck,
  HiX,
  HiTrash,
  HiReply,
} from "react-icons/hi";
import { toast } from "react-toastify";
import "./AdminReviews.css";

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [respondModal, setRespondModal] = useState(null);
  const [adminResponse, setAdminResponse] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (ratingFilter) params.rating = ratingFilter;
      const [revRes, anaRes] = await Promise.all([
        API.get("/reviews/admin/all", { params }),
        API.get("/reviews/admin/analytics"),
      ]);
      setReviews(revRes.data);
      setAnalytics(anaRes.data);
    } catch {
      toast.error("Failed to load reviews");
    }
    setLoading(false);
  }, [statusFilter, ratingFilter]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleModerate = async (id, isApproved) => {
    try {
      await API.put(`/reviews/admin/${id}/moderate`, { isApproved });
      toast.success(isApproved ? "Review approved" : "Review rejected");
      fetchAll();
    } catch {
      toast.error("Failed to moderate");
    }
  };

  const handleRespond = async () => {
    if (!respondModal) return;
    try {
      await API.put(`/reviews/admin/${respondModal._id}/moderate`, {
        isApproved: respondModal.isApproved,
        adminResponse,
      });
      toast.success("Response saved");
      setRespondModal(null);
      setAdminResponse("");
      fetchAll();
    } catch {
      toast.error("Failed to save response");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this review permanently?")) return;
    try {
      await API.delete(`/reviews/${id}`);
      toast.success("Review deleted");
      fetchAll();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const renderStars = (value) => (
    <div className="arv-stars">
      {[1, 2, 3, 4, 5].map((s) => (
        <HiStar key={s} className={`arv-star ${s <= value ? "filled" : ""}`} />
      ))}
    </div>
  );

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="gradient-text">Reviews</h1>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="arv-stats">
          {[
            { label: "Total", value: analytics.total, color: "var(--info)" },
            { label: "Pending", value: analytics.pending, color: "var(--warning)" },
            { label: "Approved", value: analytics.approved, color: "var(--success)" },
            { label: "Avg Rating", value: analytics.avgRating, color: "#FBBF24" },
            { label: "With Photos", value: analytics.withImages, color: "#8B5CF6" },
          ].map((s, i) => (
            <div key={s.label} className="arv-stat-card" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="arv-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="arv-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Rating Distribution */}
      {analytics && (
        <div className="arv-distribution">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = analytics.ratingDistribution?.[star] || 0;
            const pct = analytics.total > 0 ? (count / analytics.total) * 100 : 0;
            return (
              <div key={star} className="arv-dist-row">
                <span className="arv-dist-label">{star} ★</span>
                <div className="arv-dist-bar">
                  <div className="arv-dist-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="arv-dist-count">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      <div className="arv-toolbar">
        <select
          className="form-select arv-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
        </select>
        <select
          className="form-select arv-filter"
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
        >
          <option value="">All Ratings</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>{r} Stars</option>
          ))}
        </select>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="spinner" />
      ) : reviews.length === 0 ? (
        <div className="empty-state">
          <HiStar style={{ fontSize: "3rem" }} />
          <h3>No Reviews Found</h3>
          <p>Reviews from customers will appear here for moderation.</p>
        </div>
      ) : (
        <div className="arv-list">
          {reviews.map((review, i) => (
            <div
              key={review._id}
              className={`arv-card ${review.isApproved ? "approved" : "pending"}`}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className="arv-card-top">
                {/* Product Image */}
                <div className="arv-product-thumb">
                  {review.product?.images?.[0] ? (
                    <img src={review.product.images[0].url} alt={review.product.name} />
                  ) : (
                    <div className="arv-thumb-placeholder">📦</div>
                  )}
                </div>

                {/* Review Content */}
                <div className="arv-card-content">
                  <div className="arv-card-row1">
                    <div className="arv-reviewer">
                      <div className="arv-avatar">
                        {review.user?.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div className="arv-reviewer-name">{review.user?.name || "Customer"}</div>
                        <div className="arv-reviewer-email">{review.user?.email}</div>
                      </div>
                    </div>
                    <div className="arv-meta">
                      {renderStars(review.rating)}
                      <span className="arv-date">{formatDate(review.createdAt)}</span>
                    </div>
                  </div>

                  <div className="arv-product-name">
                    Re: <strong>{review.product?.name || "Product"}</strong>
                    {review.product?.price && (
                      <span className="arv-price"> — Rs. {review.product.price.toLocaleString()}</span>
                    )}
                  </div>

                  {review.text && <p className="arv-text">{review.text}</p>}

                  {review.images?.length > 0 && (
                    <div className="arv-images">
                      {review.images.map((img, idx) => (
                        <img key={idx} src={img.url} alt={`Review ${idx}`} className="arv-img" />
                      ))}
                    </div>
                  )}

                  {review.adminResponse && (
                    <div className="arv-response-display">
                      <strong>Your response:</strong> {review.adminResponse}
                    </div>
                  )}
                </div>

                {/* Status & Actions */}
                <div className="arv-card-actions">
                  <span className={`arv-status ${review.isApproved ? "approved" : "pending"}`}>
                    {review.isApproved ? "Approved" : "Pending"}
                  </span>

                  <div className="arv-action-btns">
                    {!review.isApproved && (
                      <button
                        className="btn btn-sm"
                        style={{
                          background: "rgba(46,125,50,0.1)",
                          color: "var(--success)",
                          border: "1px solid rgba(46,125,50,0.2)",
                        }}
                        onClick={() => handleModerate(review._id, true)}
                        title="Approve"
                      >
                        <HiCheck /> Approve
                      </button>
                    )}
                    {review.isApproved && (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => handleModerate(review._id, false)}
                        title="Unapprove"
                      >
                        <HiX /> Unapprove
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        setRespondModal(review);
                        setAdminResponse(review.adminResponse || "");
                      }}
                      title="Respond"
                    >
                      <HiReply /> Respond
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(review._id)}
                      title="Delete"
                    >
                      <HiTrash />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Respond Modal */}
      {respondModal && (
        <div className="modal-overlay" onClick={() => setRespondModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2>Respond to Review</h2>
              <button className="modal-close" onClick={() => setRespondModal(null)}>
                <HiX />
              </button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                {renderStars(respondModal.rating)}
                <strong>{respondModal.user?.name}</strong>
              </div>
              {respondModal.text && (
                <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", fontStyle: "italic" }}>
                  "{respondModal.text}"
                </p>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Your Response</label>
              <textarea
                className="form-textarea"
                rows={4}
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Thank you for your feedback..."
              />
            </div>
            <button className="btn btn-gold" style={{ width: "100%" }} onClick={handleRespond}>
              Save Response
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
