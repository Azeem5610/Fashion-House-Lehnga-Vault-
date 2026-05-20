import React, { useState, useEffect } from "react";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { HiStar, HiX, HiPhotograph, HiTrash } from "react-icons/hi";
import { toast } from "react-toastify";
import "./ReviewForm.css";

const ReviewForm = ({ productId, onReviewSubmitted }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/reviews/product/${productId}`);
      setReviews(data.reviews || []);
      setStats({ averageRating: data.averageRating, totalReviews: data.totalReviews });

      // Check if current user already reviewed
      if (user) {
        const myReview = (data.reviews || []).find(
          (r) => r.user?._id === user._id || r.user?._id === user.id
        );
        setHasReviewed(!!myReview);
      }
    } catch (err) {
      console.error("Failed to load reviews");
    }
    setLoading(false);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (images.length + files.length > 3) {
      toast.error("Maximum 3 images allowed");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));
      const { data } = await API.post("/reviews/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImages((prev) => [...prev, ...data.images]);
    } catch {
      toast.error("Image upload failed");
    }
    setUploading(false);
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      await API.post("/reviews", {
        productId,
        rating,
        text,
        images,
      });
      toast.success("Review submitted! It will appear after approval.");
      setShowForm(false);
      setRating(0);
      setText("");
      setImages([]);
      setHasReviewed(true);
      fetchReviews();
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit review");
    }
    setSubmitting(false);
  };

  const renderStars = (value, interactive = false) => {
    return (
      <div className="rv-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`rv-star ${
              star <= (interactive ? hoverRating || rating : value) ? "filled" : ""
            } ${interactive ? "interactive" : ""}`}
            onClick={interactive ? () => setRating(star) : undefined}
            onMouseEnter={interactive ? () => setHoverRating(star) : undefined}
            onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
            disabled={!interactive}
          >
            <HiStar />
          </button>
        ))}
      </div>
    );
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="rv-section">
      {/* Header */}
      <div className="rv-header">
        <div className="rv-header-left">
          <h3>Customer Reviews</h3>
          {stats.totalReviews > 0 && (
            <div className="rv-summary">
              <div className="rv-avg-rating">{stats.averageRating}</div>
              {renderStars(stats.averageRating)}
              <span className="rv-count">({stats.totalReviews} reviews)</span>
            </div>
          )}
        </div>
        {user && !hasReviewed && (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "Write a Review"}
          </button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <form className="rv-form" onSubmit={handleSubmit}>
          <div className="rv-form-rating">
            <label className="form-label">Your Rating</label>
            {renderStars(rating, true)}
            {rating > 0 && (
              <span className="rv-rating-text">
                {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Your Review</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Share your experience with this product..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
            />
            <div className="rv-char-count">{text.length}/1000</div>
          </div>

          {/* Image Upload */}
          <div className="rv-image-section">
            <label className="form-label">
              <HiPhotograph style={{ verticalAlign: "middle" }} /> Add Photos (optional, max 3)
            </label>
            <div className="rv-image-grid">
              {images.map((img, idx) => (
                <div key={idx} className="rv-image-preview">
                  <img src={img.url} alt={`Upload ${idx + 1}`} />
                  <button
                    type="button"
                    className="rv-image-remove"
                    onClick={() => removeImage(idx)}
                  >
                    <HiX />
                  </button>
                </div>
              ))}
              {images.length < 3 && (
                <label className="rv-image-add">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                    disabled={uploading}
                  />
                  {uploading ? "..." : <HiPhotograph />}
                  <span>{uploading ? "Uploading" : "Add"}</span>
                </label>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-gold"
            disabled={submitting || rating === 0}
            style={{ width: "100%" }}
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="spinner" />
      ) : reviews.length === 0 ? (
        <div className="rv-empty">
          <HiStar style={{ fontSize: "2rem", opacity: 0.2, color: "var(--rose)" }} />
          <p>No reviews yet. Be the first to review this product!</p>
        </div>
      ) : (
        <div className="rv-list">
          {reviews.map((review, idx) => (
            <div
              key={review._id}
              className="rv-card"
              style={{ animationDelay: `${idx * 0.06}s` }}
            >
              <div className="rv-card-header">
                <div className="rv-avatar">
                  {review.user?.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="rv-user-info">
                  <div className="rv-user-name">{review.user?.name || "Customer"}</div>
                  <div className="rv-date">{formatDate(review.createdAt)}</div>
                </div>
                {renderStars(review.rating)}
              </div>

              {review.text && <p className="rv-text">{review.text}</p>}

              {review.images?.length > 0 && (
                <div className="rv-review-images">
                  {review.images.map((img, i) => (
                    <img
                      key={i}
                      src={img.url}
                      alt={`Review ${i + 1}`}
                      className="rv-review-img"
                    />
                  ))}
                </div>
              )}

              {review.adminResponse && (
                <div className="rv-admin-response">
                  <strong>Fashion House:</strong> {review.adminResponse}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewForm;
