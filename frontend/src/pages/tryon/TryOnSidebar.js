import React, { useState, useEffect, useCallback } from "react";
import {
  HiHeart, HiPhotograph, HiShoppingCart, HiDownload,
  HiBookmark, HiChevronRight, HiSparkles, HiX, HiCheck,
  HiClock, HiTrash,
} from "react-icons/hi";
import API from "../../utils/api";
import { toast } from "react-toastify";

/**
 * TryOnSidebar — right panel.
 * Shows: selected lehnga card, live price, action buttons, past sessions.
 */
const TryOnSidebar = ({
  selectedProduct,
  sessionId,
  sessionFlags,           // { addedToWishlist, addedToMoodboard, convertedToOrder }
  onSavePreview,          // async fn — triggers canvas export + backend save
  onDownload,             // fn — triggers download
  onSelectProduct,        // fn(product) — open product picker
  onFlagUpdate,           // fn(flags) — update parent flags after ERP action
  sessions,               // past try-on sessions[]
  sessionsLoading,
  onSessionClick,         // fn(session)
  onSessionDelete,        // fn(sessionId)
}) => {
  const [moodboards, setMoodboards]         = useState([]);
  const [showMoodModal, setShowMoodModal]   = useState(false);
  const [selectedMoodId, setSelectedMoodId] = useState("");
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [savingPreview, setSavingPreview]   = useState(false);
  const [addingWishlist, setAddingWishlist] = useState(false);
  const [addingMood, setAddingMood]         = useState(false);
  const [placingOrder, setPlacingOrder]     = useState(false);
  const [orderForm, setOrderForm]           = useState({
    size: "", quantity: 1,
    address: "", city: "", phone: "", notes: "",
  });

  // Load user's moodboards when modal opens
  useEffect(() => {
    if (!showMoodModal) return;
    API.get("/moodboards/my")
      .then((r) => setMoodboards(r.data.moodboards || []))
      .catch(() => toast.error("Could not load moodboards"));
  }, [showMoodModal]);

  // ── Save preview ──
  const handleSavePreview = async () => {
    if (!sessionId) { toast.warn("Start a session first"); return; }
    setSavingPreview(true);
    await onSavePreview?.();
    setSavingPreview(false);
  };

  // ── Add to Wishlist ──
  const handleWishlist = useCallback(async () => {
    if (!sessionId || !selectedProduct) { toast.warn("Select a lehnga first"); return; }
    setAddingWishlist(true);
    try {
      await API.post(`/virtual-tryon/${sessionId}/wishlist`);
      toast.success("Added to wishlist ❤️");
      onFlagUpdate?.({ addedToWishlist: true });
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed");
    }
    setAddingWishlist(false);
  }, [sessionId, selectedProduct, onFlagUpdate]);

  // ── Add to Moodboard ──
  const handleAddMoodboard = useCallback(async () => {
    if (!selectedMoodId) { toast.warn("Choose a moodboard"); return; }
    setAddingMood(true);
    try {
      await API.post(`/virtual-tryon/${sessionId}/moodboard`, { moodboardId: selectedMoodId });
      toast.success("Preview saved to moodboard ✨");
      onFlagUpdate?.({ addedToMoodboard: true });
      setShowMoodModal(false);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed — save a preview first");
    }
    setAddingMood(false);
  }, [sessionId, selectedMoodId, onFlagUpdate]);

  // ── Place Order ──
  const handlePlaceOrder = useCallback(async () => {
    if (!orderForm.address || !orderForm.city || !orderForm.phone) {
      toast.warn("Fill in shipping details");
      return;
    }
    setPlacingOrder(true);
    try {
      await API.post(`/virtual-tryon/${sessionId}/order`, {
        size: orderForm.size,
        quantity: orderForm.quantity,
        shippingAddress: {
          address: orderForm.address,
          city:    orderForm.city,
          phone:   orderForm.phone,
        },
        notes: orderForm.notes,
      });
      toast.success("Order placed! 🎉");
      onFlagUpdate?.({ convertedToOrder: true });
      setShowOrderModal(false);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to place order");
    }
    setPlacingOrder(false);
  }, [sessionId, orderForm, onFlagUpdate]);

  return (
    <div className="tryon-sidebar" id="tryon-sidebar">

      {/* ── Selected Lehnga Card ── */}
      <div className="tryon-sidebar-section">
        <div className="tryon-section-label">
          <HiSparkles /> Selected Design
        </div>

        {selectedProduct ? (
          <div className="tryon-lehnga-card" id="tryon-selected-lehnga">
            <div className="tryon-lehnga-img-wrap">
              {selectedProduct.images?.[0]?.url ? (
                <img src={selectedProduct.images[0].url} alt={selectedProduct.name} />
              ) : (
                <div className="tryon-lehnga-placeholder">👗</div>
              )}
            </div>
            <div className="tryon-lehnga-info">
              <div className="tryon-lehnga-name">{selectedProduct.name}</div>
              <div className="tryon-lehnga-fabric">{selectedProduct.fabricType}</div>
              <div className="tryon-lehnga-price">
                Rs.{(selectedProduct.price || 0).toLocaleString()}
              </div>
              {selectedProduct.sizes?.length > 0 && (
                <div className="tryon-lehnga-sizes">
                  {selectedProduct.sizes.map((s) => (
                    <span key={s} className="tryon-size-chip">{s}</span>
                  ))}
                </div>
              )}
            </div>
            <button
              id="tryon-change-design"
              className="tryon-change-btn"
              onClick={onSelectProduct}
              title="Change design"
            >
              <HiChevronRight />
            </button>
          </div>
        ) : (
          <button
            id="tryon-pick-design"
            className="tryon-pick-design-btn"
            onClick={onSelectProduct}
          >
            <HiPhotograph />
            <span>Pick a Lehnga Design</span>
          </button>
        )}
      </div>

      {/* ── Action Buttons ── */}
      <div className="tryon-sidebar-section">
        <div className="tryon-section-label">Actions</div>
        <div className="tryon-actions">

          {/* Save Preview */}
          <button
            id="tryon-save-preview"
            className={`tryon-action-btn tryon-action-save ${savingPreview ? "loading" : ""}`}
            onClick={handleSavePreview}
            disabled={!sessionId || savingPreview}
          >
            {savingPreview ? <span className="tryon-btn-spinner" /> : <HiBookmark />}
            {savingPreview ? "Saving…" : "Save Preview"}
          </button>

          {/* Download */}
          <button
            id="tryon-download"
            className="tryon-action-btn tryon-action-download"
            onClick={onDownload}
            disabled={!sessionId}
          >
            <HiDownload /> Download PNG
          </button>

          {/* Add to Wishlist */}
          <button
            id="tryon-add-wishlist"
            className={`tryon-action-btn tryon-action-wishlist ${sessionFlags?.addedToWishlist ? "done" : ""}`}
            onClick={handleWishlist}
            disabled={!sessionId || !selectedProduct || addingWishlist || sessionFlags?.addedToWishlist}
          >
            {addingWishlist ? <span className="tryon-btn-spinner" /> : sessionFlags?.addedToWishlist ? <HiCheck /> : <HiHeart />}
            {sessionFlags?.addedToWishlist ? "In Wishlist" : addingWishlist ? "Adding…" : "Add to Wishlist"}
          </button>

          {/* Add to Moodboard */}
          <button
            id="tryon-add-moodboard"
            className={`tryon-action-btn tryon-action-mood ${sessionFlags?.addedToMoodboard ? "done" : ""}`}
            onClick={() => setShowMoodModal(true)}
            disabled={!sessionId || sessionFlags?.addedToMoodboard}
          >
            {sessionFlags?.addedToMoodboard ? <HiCheck /> : <HiPhotograph />}
            {sessionFlags?.addedToMoodboard ? "In Moodboard" : "Save to Moodboard"}
          </button>

          {/* Place Order */}
          <button
            id="tryon-place-order"
            className={`tryon-action-btn tryon-action-order ${sessionFlags?.convertedToOrder ? "done" : ""}`}
            onClick={() => setShowOrderModal(true)}
            disabled={!sessionId || !selectedProduct || sessionFlags?.convertedToOrder}
          >
            {sessionFlags?.convertedToOrder ? <HiCheck /> : <HiShoppingCart />}
            {sessionFlags?.convertedToOrder ? "Order Placed" : "Place Order"}
          </button>
        </div>
      </div>

      {/* ── Past Sessions ── */}
      <div className="tryon-sidebar-section">
        <div className="tryon-section-label">
          <HiClock /> My Try-Ons
        </div>

        {sessionsLoading ? (
          <div className="tryon-sessions-skeleton">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8, marginBottom: 8 }} />
            ))}
          </div>
        ) : sessions?.length > 0 ? (
          <div className="tryon-sessions-list" id="tryon-sessions-list">
            {sessions.map((s) => (
              <div
                key={s._id}
                className={`tryon-session-item ${sessionId === s._id ? "active" : ""}`}
                id={`tryon-session-${s._id}`}
              >
                <div
                  className="tryon-session-thumb"
                  onClick={() => onSessionClick?.(s)}
                >
                  {s.finalPreview?.url ? (
                    <img src={s.finalPreview.url} alt={s.sessionName} />
                  ) : s.lehnga?.images?.[0]?.url ? (
                    <img src={s.lehnga.images[0].url} alt={s.sessionName} />
                  ) : (
                    <span>👗</span>
                  )}
                </div>
                <div className="tryon-session-meta" onClick={() => onSessionClick?.(s)}>
                  <div className="tryon-session-name">{s.sessionName}</div>
                  <div className="tryon-session-sub">
                    {s.lehnga?.name || "No design"} · {new Date(s.updatedAt).toLocaleDateString("en-PK", { month: "short", day: "numeric" })}
                  </div>
                </div>
                <button
                  className="tryon-session-delete"
                  onClick={(e) => { e.stopPropagation(); onSessionDelete?.(s._id); }}
                  title="Delete session"
                >
                  <HiTrash />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="tryon-sessions-empty">
            No saved try-ons yet.<br />
            Start trying on designs!
          </div>
        )}
      </div>

      {/* ── Moodboard Modal ── */}
      {showMoodModal && (
        <div className="modal-overlay" onClick={() => setShowMoodModal(false)}>
          <div className="modal-content tryon-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Save to Moodboard</h2>
              <button className="modal-close" onClick={() => setShowMoodModal(false)}><HiX /></button>
            </div>
            <p className="tryon-modal-sub">Choose which moodboard to save your try-on preview to.</p>
            {moodboards.length === 0 ? (
              <div className="tryon-no-boards">
                No moodboards found.{" "}
                <a href="/moodboard" target="_blank" rel="noreferrer">Create one →</a>
              </div>
            ) : (
              <div className="tryon-mood-list">
                {moodboards.map((b) => (
                  <div
                    key={b._id}
                    className={`tryon-mood-item ${selectedMoodId === b._id ? "active" : ""}`}
                    onClick={() => setSelectedMoodId(b._id)}
                  >
                    <div className="tryon-mood-preview">
                      {b.images?.[0]?.url
                        ? <img src={b.images[0].url} alt={b.name} />
                        : <span>✨</span>}
                    </div>
                    <div>
                      <div className="tryon-mood-name">{b.name}</div>
                      <div className="tryon-mood-meta">{b.images?.length || 0} images</div>
                    </div>
                    {selectedMoodId === b._id && <HiCheck className="tryon-mood-check" />}
                  </div>
                ))}
              </div>
            )}
            <button
              className="btn btn-gold"
              style={{ width: "100%", marginTop: 16 }}
              onClick={handleAddMoodboard}
              disabled={addingMood || !selectedMoodId}
            >
              {addingMood ? "Saving…" : "Save to Moodboard"}
            </button>
          </div>
        </div>
      )}

      {/* ── Order Modal ── */}
      {showOrderModal && (
        <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="modal-content tryon-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Place Order</h2>
              <button className="modal-close" onClick={() => setShowOrderModal(false)}><HiX /></button>
            </div>
            {selectedProduct && (
              <div className="tryon-order-summary">
                <span>{selectedProduct.name}</span>
                <span className="tryon-order-price">Rs.{selectedProduct.price?.toLocaleString()}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Size</label>
              <select
                className="form-select"
                value={orderForm.size}
                onChange={(e) => setOrderForm({ ...orderForm, size: e.target.value })}
              >
                <option value="">Select size</option>
                {["S", "M", "L", "XL"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input type="number" className="form-input" min={1} max={10}
                value={orderForm.quantity}
                onChange={(e) => setOrderForm({ ...orderForm, quantity: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Delivery Address *</label>
              <input className="form-input" placeholder="Street address"
                value={orderForm.address}
                onChange={(e) => setOrderForm({ ...orderForm, address: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="form-label">City *</label>
                <input className="form-input" placeholder="City"
                  value={orderForm.city}
                  onChange={(e) => setOrderForm({ ...orderForm, city: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Phone *</label>
                <input className="form-input" placeholder="03xx-xxxxxxx"
                  value={orderForm.phone}
                  onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea className="form-textarea" rows={2}
                value={orderForm.notes}
                onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                placeholder="Customization notes, embroidery preferences…"
              />
            </div>

            <div className="tryon-order-total">
              <span>Total</span>
              <span>Rs.{((selectedProduct?.price || 0) * orderForm.quantity).toLocaleString()}</span>
            </div>
            <button
              className="btn btn-gold"
              style={{ width: "100%", marginTop: 16 }}
              onClick={handlePlaceOrder}
              disabled={placingOrder}
            >
              {placingOrder ? "Placing Order…" : "Confirm Order"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TryOnSidebar;
