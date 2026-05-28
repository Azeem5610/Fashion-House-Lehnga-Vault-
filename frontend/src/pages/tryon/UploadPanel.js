import React, { useRef, useState, useCallback } from "react";
import { HiUpload, HiPhotograph, HiX, HiUser } from "react-icons/hi";
import API from "../../utils/api";
import { toast } from "react-toastify";

/**
 * UploadPanel — drag-and-drop bride photo upload.
 * Calls /api/virtual-tryon/upload-image, returns { url, public_id } to parent.
 */
const UploadPanel = ({ mode, onModeChange, uploadedImage, onImageUploaded, onImageRemoved }) => {
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFile = useCallback(async (file) => {
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, or WEBP images are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB");
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await API.post("/virtual-tryon/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 85) / e.total);
          setUploadProgress(pct);
        },
      });

      setUploadProgress(100);
      onImageUploaded({ url: res.data.url, public_id: res.data.public_id });
      toast.success("Photo uploaded!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [onImageUploaded]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div className="tryon-upload-panel">
      {/* Mode toggle */}
      <div className="tryon-mode-toggle">
        <button
          id="tryon-mode-photo"
          className={`tryon-mode-btn ${mode === "photo" ? "active" : ""}`}
          onClick={() => onModeChange("photo")}
        >
          <HiUser /> My Photo
        </button>
        <button
          id="tryon-mode-mannequin"
          className={`tryon-mode-btn ${mode === "mannequin" ? "active" : ""}`}
          onClick={() => onModeChange("mannequin")}
        >
          <HiPhotograph /> Mannequin
        </button>
      </div>

      {mode === "photo" && (
        <>
          {/* Uploaded preview */}
          {uploadedImage?.url ? (
            <div className="tryon-uploaded-preview">
              <img src={uploadedImage.url} alt="Uploaded preview" />
              <button
                id="tryon-remove-photo"
                className="tryon-remove-photo"
                onClick={onImageRemoved}
                title="Remove photo"
              >
                <HiX />
              </button>
              <div className="tryon-photo-badge">✓ Photo ready</div>
            </div>
          ) : (
            /* Drop zone */
            <div
              id="tryon-dropzone"
              className={`tryon-dropzone ${dragging ? "dragging" : ""} ${uploading ? "uploading" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={onFileChange}
              />

              {uploading ? (
                <div className="tryon-upload-progress">
                  <div className="tryon-progress-ring">
                    <svg viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="20" />
                      <circle
                        cx="24" cy="24" r="20"
                        style={{ strokeDashoffset: `${125.6 - (uploadProgress / 100) * 125.6}px` }}
                      />
                    </svg>
                    <span>{uploadProgress}%</span>
                  </div>
                  <p>Uploading…</p>
                </div>
              ) : (
                <>
                  <div className="tryon-dropzone-icon">
                    <HiUpload />
                  </div>
                  <div className="tryon-dropzone-title">
                    {dragging ? "Drop it here!" : "Upload Your Photo"}
                  </div>
                  <p className="tryon-dropzone-sub">
                    Drag &amp; drop or <span className="tryon-link">browse</span>
                  </p>
                  <p className="tryon-dropzone-hint">JPG · PNG · WEBP · Max 10 MB</p>
                </>
              )}
            </div>
          )}

          {/* Tips */}
          <div className="tryon-tips">
            <div className="tryon-tip-title">📸 Photo Tips</div>
            <ul>
              <li>Stand upright facing forward</li>
              <li>Use good lighting — avoid shadows</li>
              <li>Wear fitted, plain clothing</li>
              <li>Full-body shot works best</li>
            </ul>
          </div>
        </>
      )}

      {mode === "mannequin" && (
        <div className="tryon-mannequin-info">
          <div className="tryon-mannequin-icon">👗</div>
          <div className="tryon-mannequin-title">Mannequin Preview Mode</div>
          <p>The lehnga will be shown on a standard bridal mannequin. Switch to "My Photo" to try on your own image.</p>
        </div>
      )}
    </div>
  );
};

export default UploadPanel;
