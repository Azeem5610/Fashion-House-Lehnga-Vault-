import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import { HiArrowLeft, HiCloudUpload, HiX } from "react-icons/hi";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "react-toastify";
import "./DesignFromPicPage.css";

const ADMIN_WHATSAPP = "923152850971";

const DesignFromPicPage = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [description, setDescription] = useState("");
  const [requestType, setRequestType] = useState("exact-copy");
  const [submitting, setSubmitting] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [submittedDescription, setSubmittedDescription] = useState("");
  const [submittedRequestType, setSubmittedRequestType] = useState("exact-copy");

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (files.length + selected.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    const newFiles = [...files, ...selected];
    setFiles(newFiles);

    const newPreviews = selected.map((file) => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeFile = (idx) => {
    const newFiles = files.filter((_, i) => i !== idx);
    const newPreviews = previews.filter((_, i) => i !== idx);
    URL.revokeObjectURL(previews[idx]);
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error("Please upload at least one reference image");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));
      formData.append("description", description);
      formData.append("requestType", requestType);

      await API.post("/design-requests", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Design request submitted successfully!");
      // Save for WhatsApp dialog, then show dialog
      setSubmittedDescription(description);
      setSubmittedRequestType(requestType);
      setShowWhatsAppDialog(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit");
    }
    setSubmitting(false);
  };

  const handleWhatsApp = () => {
    const typeText = submittedRequestType === "exact-copy" ? "exact copy" : "with customizations";
    const message = `Hi! I want to order a lehnga (${typeText}).\n\n${submittedDescription ? `My requirements:\n${submittedDescription}` : "I'll share reference images here."}\n\nI've also submitted a design request on your website.`;
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="design-page">
      <div className="container">
        <button className="fabric-back" onClick={() => navigate("/")}>
          <HiArrowLeft /> Back to Home
        </button>

        <div className="page-header">
          <h1 className="gradient-text">Design from Picture</h1>
          <p>Upload a reference image and we'll create it for you</p>
        </div>

        <div className="design-card">
          <h2>Upload Your Design</h2>
          <p>Share reference photos of the lehnga you want and we'll bring your vision to life.</p>

          <form onSubmit={handleSubmit}>
            {/* Upload Area */}
            <div className="upload-area">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
              />
              <div className="upload-icon"><HiCloudUpload /></div>
              <h4>Click or drag images here</h4>
              <p>Upload up to 5 reference images (JPG, PNG, WebP)</p>
            </div>

            {/* Previews */}
            {previews.length > 0 && (
              <div className="upload-previews">
                {previews.map((preview, idx) => (
                  <div key={idx} className="preview-item">
                    <img src={preview} alt={`Preview ${idx + 1}`} />
                    <button
                      type="button"
                      className="preview-remove"
                      onClick={() => removeFile(idx)}
                    >
                      <HiX />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Request Type */}
            <label className="form-label">What do you want?</label>
            <div className="request-type-options">
              <div
                className={`request-type-btn ${requestType === "exact-copy" ? "active" : ""}`}
                onClick={() => setRequestType("exact-copy")}
              >
                <h4>Exact Copy</h4>
                <p>Recreate exactly as shown</p>
              </div>
              <div
                className={`request-type-btn ${requestType === "with-customization" ? "active" : ""}`}
                onClick={() => setRequestType("with-customization")}
              >
                <h4>With Customizations</h4>
                <p>Modify fabric, color, design, etc.</p>
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">
                {requestType === "with-customization"
                  ? "Describe your customizations"
                  : "Any additional notes (optional)"}
              </label>
              <textarea
                className="form-textarea"
                placeholder={
                  requestType === "with-customization"
                    ? "E.g., I want this design but in red color with Organza fabric..."
                    : "Any specific details or preferences..."
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="design-actions">
              <button
                type="submit"
                className="btn btn-gold btn-lg"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* WhatsApp Dialog */}
      {showWhatsAppDialog && (
        <div className="wa-dialog-overlay">
          <div className="wa-dialog">
            <div className="wa-dialog-icon">✅</div>
            <h3>Request Submitted!</h3>
            <p>Your design request has been received. Would you also like to discuss it directly with us on WhatsApp for faster assistance?</p>
            <div className="wa-dialog-actions">
              <button
                className="btn btn-whatsapp btn-lg"
                onClick={() => {
                  handleWhatsApp();
                  setShowWhatsAppDialog(false);
                  navigate("/my-orders");
                }}
              >
                <FaWhatsapp /> Discuss on WhatsApp
              </button>
              <button
                className="btn btn-outline btn-lg"
                onClick={() => {
                  setShowWhatsAppDialog(false);
                  navigate("/my-orders");
                }}
              >
                No Thanks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignFromPicPage;
