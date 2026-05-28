import React, { useEffect, useState, useCallback } from "react";
import API from "../utils/api";
import { HiPlus, HiX, HiTrash, HiPencil, HiArrowLeft, HiPhotograph, HiGlobe, HiLockClosed } from "react-icons/hi";
import { toast } from "react-toastify";
import "./MoodboardPage.css";

const emptyForm = { name: "", description: "", notes: "", isPublic: false, tags: "" };

const MoodboardPage = () => {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageCaption, setImageCaption] = useState("");

  const fetchBoards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/moodboards/my");
      setBoards(res.data.moodboards || []);
    } catch { toast.error("Failed to load moodboards"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBoards(); }, [fetchBoards]);

  const openBoard = async (board) => {
    setDetailLoading(true);
    try {
      const res = await API.get(`/moodboards/${board._id}`);
      setSelectedBoard(res.data);
    } catch { toast.error("Failed to load board"); }
    setDetailLoading(false);
  };

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = () => {
    if (!selectedBoard) return;
    setEditing(selectedBoard);
    setForm({
      name: selectedBoard.name,
      description: selectedBoard.description || "",
      notes: selectedBoard.notes || "",
      isPublic: selectedBoard.isPublic || false,
      tags: (selectedBoard.tags || []).join(", "),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      ...form,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
    };
    try {
      if (editing) {
        const res = await API.put(`/moodboards/${editing._id}`, payload);
        setSelectedBoard(res.data);
        toast.success("Board updated!");
      } else {
        await API.post("/moodboards", payload);
        toast.success("Board created!");
      }
      setShowModal(false);
      fetchBoards();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
    setSubmitting(false);
  };

  const deleteBoard = async (id) => {
    if (!window.confirm("Delete this moodboard?")) return;
    try {
      await API.delete(`/moodboards/${id}`);
      toast.success("Board deleted");
      setSelectedBoard(null);
      fetchBoards();
    } catch { toast.error("Failed"); }
  };

  const addImage = async () => {
    if (!imageUrl.trim() || !selectedBoard) return;
    try {
      const res = await API.post(`/moodboards/${selectedBoard._id}/images`, {
        url: imageUrl, caption: imageCaption,
      });
      setSelectedBoard(res.data);
      setImageUrl("");
      setImageCaption("");
      toast.success("Image added!");
    } catch { toast.error("Failed"); }
  };

  const removeImage = async (imageId) => {
    try {
      const res = await API.delete(`/moodboards/${selectedBoard._id}/images/${imageId}`);
      setSelectedBoard(res.data);
    } catch { toast.error("Failed"); }
  };

  const removeProduct = async (productId) => {
    try {
      const res = await API.delete(`/moodboards/${selectedBoard._id}/products/${productId}`);
      setSelectedBoard(res.data);
    } catch { toast.error("Failed"); }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" }); // eslint-disable-line no-unused-vars
  if (!selectedBoard) {
    return (
      <div className="moodboard-page">
        <div className="page-header">
          <h1 style={{ fontFamily: "var(--font-display)" }}>
            My <span className="gradient-text">Moodboards</span>
          </h1>
          <p>Create inspiration boards for your dream bridal look</p>
        </div>

        {loading ? <div className="spinner" /> : (
          <div className="mb-board-grid">
            {/* New Board Card */}
            <div className="mb-new-card" onClick={openNew}>
              <div className="mb-new-icon"><HiPlus /></div>
              <div className="mb-new-label">Create New Board</div>
            </div>

            {boards.map((board, i) => (
              <div key={board._id} className="mb-board-card" style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => openBoard(board)}>
                <div className="mb-board-preview">
                  {board.images?.length > 0 ? (
                    board.images.slice(0, 4).map((img, idx) => (
                      <img key={idx} src={img.url} alt={img.caption || `Image ${idx + 1}`} />
                    ))
                  ) : (
                    <div className="mb-board-preview-empty">✨</div>
                  )}
                </div>
                <div className="mb-board-body">
                  <div className="mb-board-name">{board.name}</div>
                  {board.description && <div className="mb-board-desc">{board.description}</div>}
                  <div className="mb-board-meta">
                    <span>{board.images?.length || 0} images · {board.products?.length || 0} products</span>
                    <span>{board.isPublic ? <HiGlobe style={{ verticalAlign: "middle" }} /> : <HiLockClosed style={{ verticalAlign: "middle" }} />}</span>
                  </div>
                  {board.tags?.length > 0 && (
                    <div className="mb-board-tags" style={{ marginTop: 8 }}>
                      {board.tags.map(tag => <span key={tag} className="mb-tag">{tag}</span>)}
                    </div>
                  )}
                </div>
                <div className="mb-board-footer" onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-sm btn-outline" style={{ flex: 1 }} onClick={() => openBoard(board)}>Open</button>
                  <button className="btn-delete" onClick={() => deleteBoard(board._id)}><HiTrash /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <div className="modal-header">
                <h2>{editing ? "Edit Board" : "Create Moodboard"}</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}><HiX /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Board Name</label>
                  <input className="form-input" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Dream Wedding Look" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" rows={2} value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What's this board about?" />
                </div>
                <div className="form-group">
                  <label className="form-label">Tags (comma separated)</label>
                  <input className="form-input" value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. red, bridal, velvet" />
                </div>
                <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="checkbox" id="isPublic" checked={form.isPublic}
                    onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} style={{ accentColor: "var(--gold)" }} />
                  <label htmlFor="isPublic" className="form-label" style={{ margin: 0 }}>
                    <HiGlobe style={{ verticalAlign: "middle" }} /> Make this board public
                  </label>
                </div>
                <button type="submit" className="btn btn-gold" style={{ width: "100%" }} disabled={submitting}>
                  {submitting ? "Saving..." : editing ? "Update Board" : "Create Board"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Board Detail View ──
  return (
    <div className="moodboard-page">
      {detailLoading ? <div className="spinner" /> : (
        <>
          <div className="mb-detail-header">
            <div>
              <button className="btn btn-outline btn-sm" style={{ marginBottom: 12 }}
                onClick={() => setSelectedBoard(null)}>
                <HiArrowLeft /> All Boards
              </button>
              <div className="mb-detail-title">{selectedBoard.name}</div>
              {selectedBoard.description && <div className="mb-detail-desc">{selectedBoard.description}</div>}
              {selectedBoard.tags?.length > 0 && (
                <div className="mb-board-tags" style={{ marginTop: 8 }}>
                  {selectedBoard.tags.map(tag => <span key={tag} className="mb-tag">{tag}</span>)}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={openEdit}><HiPencil /> Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => deleteBoard(selectedBoard._id)}><HiTrash /></button>
            </div>
          </div>

          {/* Add Image */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
              <HiPhotograph style={{ verticalAlign: "middle" }} /> Add Inspiration Image
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input className="form-input" style={{ flex: 2, minWidth: 200 }} value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL..." />
              <input className="form-input" style={{ flex: 1, minWidth: 120 }} value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)} placeholder="Caption (optional)" />
              <button className="btn btn-gold btn-sm" onClick={addImage} disabled={!imageUrl.trim()}>
                <HiPlus /> Add
              </button>
            </div>
          </div>

          {/* Image Gallery */}
          {selectedBoard.images?.length > 0 && (
            <div className="mb-gallery">
              {selectedBoard.images.map((img, i) => (
                <div key={img._id || i} className="mb-gallery-item" style={{ animationDelay: `${i * 0.04}s` }}>
                  <img src={img.url} alt={img.caption || "Moodboard image"} />
                  <div className="mb-gallery-item-overlay">
                    <span className="mb-gallery-caption">{img.caption}</span>
                    <button className="mb-gallery-remove" onClick={() => removeImage(img._id)}>
                      <HiX />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Linked Products */}
          {selectedBoard.products?.length > 0 && (
            <div>
              <div className="mb-products-title">Linked Products</div>
              <div className="mb-products-grid">
                {selectedBoard.products.map((p) => (
                  <div key={p._id} className="wl-product-card" style={{ position: "relative" }}>
                    <button className="wl-remove-btn" onClick={() => removeProduct(p._id)}><HiX /></button>
                    {p.images?.[0]?.url ? (
                      <img src={p.images[0].url} alt={p.name} className="wl-product-img" style={{ height: 160 }} />
                    ) : (
                      <div className="wl-product-img-placeholder" style={{ height: 160 }}>👗</div>
                    )}
                    <div className="wl-product-body">
                      <div className="wl-product-name">{p.name}</div>
                      <div className="wl-product-price">Rs.{(p.price || 0).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {selectedBoard.notes && (
            <div className="mb-notes">
              <div className="mb-notes-label">Notes</div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.6 }}>{selectedBoard.notes}</p>
            </div>
          )}

          {/* Edit Modal (reuse) */}
          {showModal && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
                <div className="modal-header">
                  <h2>Edit Board</h2>
                  <button className="modal-close" onClick={() => setShowModal(false)}><HiX /></button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">Board Name</label>
                    <input className="form-input" required value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-textarea" rows={2} value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea className="form-textarea" rows={3} value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tags (comma separated)</label>
                    <input className="form-input" value={form.tags}
                      onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="checkbox" id="isPublicEdit" checked={form.isPublic}
                      onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} style={{ accentColor: "var(--gold)" }} />
                    <label htmlFor="isPublicEdit" className="form-label" style={{ margin: 0 }}>Make public</label>
                  </div>
                  <button type="submit" className="btn btn-gold" style={{ width: "100%" }} disabled={submitting}>
                    {submitting ? "Saving..." : "Update Board"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MoodboardPage;
