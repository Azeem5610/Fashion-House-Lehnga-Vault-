import React, {
  useState, useRef, useCallback, useEffect, useMemo,
} from "react";
import { toast } from "react-toastify";
import { HiSparkles, HiX, HiSearch, HiFilter, HiRefresh } from "react-icons/hi";

import UploadPanel        from "./tryon/UploadPanel";
import TryOnCanvas        from "./tryon/TryOnCanvas";
import AdjustmentControls from "./tryon/AdjustmentControls";
import TryOnSidebar       from "./tryon/TryOnSidebar";
import API                from "../utils/api";
import "./VirtualTryOnPage.css";

// Default slider values
const DEFAULT_TRANSFORMS = {
  opacity:       100,
  bodyHeight:    100,
  bodyWidth:     100,
  shoulderWidth: 100,
  rotation:      0,
  skinToneFilter: "none",
};

// ── Product Picker Modal ────────────────────────────────────────────
const ProductPicker = ({ onSelect, onClose }) => {
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [fabricFilter, setFabric] = useState("");

  const FABRICS = [
    "Net (China)", "Pure China Krinkle", "Tussle Silk",
    "Organza", "Barosha", "Velvet (Winter)", "Shafon Krinkle",
  ];

  useEffect(() => {
    API.get("/products")
      .then((r) => setProducts(r.data.products || r.data || []))
      .catch(() => toast.error("Could not load products"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch  = !search  || p.name.toLowerCase().includes(search.toLowerCase());
      const matchFabric  = !fabricFilter || p.fabricType === fabricFilter;
      return matchSearch && matchFabric;
    });
  }, [products, search, fabricFilter]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content tryon-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Choose a Lehnga Design</h2>
          <button className="modal-close" onClick={onClose}><HiX /></button>
        </div>

        {/* Filters */}
        <div className="tryon-picker-filters">
          <div className="input-wrapper" style={{ flex: 1 }}>
            <HiSearch className="input-icon" />
            <input
              id="tryon-picker-search"
              className="form-input"
              placeholder="Search designs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="input-wrapper">
            <HiFilter className="input-icon" />
            <select
              id="tryon-picker-fabric"
              className="form-select"
              style={{ paddingLeft: 38, minWidth: 160 }}
              value={fabricFilter}
              onChange={(e) => setFabric(e.target.value)}
            >
              <option value="">All Fabrics</option>
              {FABRICS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="tryon-picker-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 200, borderRadius: 10 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="tryon-picker-empty">
            <span>👗</span>
            <p>No designs found</p>
          </div>
        ) : (
          <div className="tryon-picker-grid" id="tryon-picker-grid">
            {filtered.map((p) => (
              <div
                key={p._id}
                id={`tryon-pick-${p._id}`}
                className="tryon-picker-card"
                onClick={() => onSelect(p)}
              >
                {p.images?.[0]?.url ? (
                  <img src={p.images[0].url} alt={p.name} />
                ) : (
                  <div className="tryon-picker-placeholder">👗</div>
                )}
                <div className="tryon-picker-info">
                  <div className="tryon-picker-name">{p.name}</div>
                  <div className="tryon-picker-fabric">{p.fabricType}</div>
                  <div className="tryon-picker-price">Rs.{p.price?.toLocaleString()}</div>
                </div>
                <div className="tryon-picker-overlay">
                  <span>Try On</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Page ───────────────────────────────────────────────────────
const VirtualTryOnPage = () => {
  const canvasRef = useRef(null);

  // Core state
  const [mode, setMode]                   = useState("mannequin"); // "photo" | "mannequin"
  const [uploadedImage, setUploadedImage] = useState(null);        // { url, public_id }
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [transforms, setTransforms]       = useState({ ...DEFAULT_TRANSFORMS });
  const [showPicker, setShowPicker]       = useState(false);

  // Session state
  const [sessionId, setSessionId]         = useState(null);
  const [sessionFlags, setSessionFlags]   = useState({
    addedToWishlist: false, addedToMoodboard: false, convertedToOrder: false,
  });

  // Past sessions
  const [sessions, setSessions]           = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Canvas ready flag
  const [canvasReady, setCanvasReady]     = useState(false);

  // ── Load past sessions on mount ──
  useEffect(() => {
    API.get("/virtual-tryon")
      .then((r) => setSessions(r.data.sessions || []))
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }, []);

  // ── Auto-create session when mode / product / image changes ──
  const ensureSession = useCallback(async (overrides = {}) => {
    try {
      if (sessionId) {
        // Update existing session
        await API.patch(`/virtual-tryon/${sessionId}`, {
          mode,
          uploadedImage: uploadedImage || { url: "", public_id: "" },
          lehnga: selectedProduct?._id || null,
          transformData: { ...transforms, ...overrides },
        });
      } else {
        // Create new session
        const res = await API.post("/virtual-tryon", {
          mode,
          uploadedImage: uploadedImage || { url: "", public_id: "" },
          lehnga: selectedProduct?._id || null,
          transformData: { ...transforms, ...overrides },
          sessionName: selectedProduct
            ? `${selectedProduct.name} Try-On`
            : `Try-On ${new Date().toLocaleDateString("en-PK")}`,
        });
        setSessionId(res.data._id);
        setSessions((prev) => [res.data, ...prev]);
      }
    } catch (_) { /* silent — session tracking non-blocking */ }
  }, [sessionId, mode, uploadedImage, selectedProduct, transforms]);

  // ── Handle mode change ──
  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
  }, []);

  // ── Handle image upload ──
  const handleImageUploaded = useCallback((imgData) => {
    setUploadedImage(imgData);
    setMode("photo");
  }, []);

  const handleImageRemoved = useCallback(() => {
    setUploadedImage(null);
    setMode("mannequin");
  }, []);

  // ── Handle product selection ──
  const handleProductSelect = useCallback(async (product) => {
    setSelectedProduct(product);
    setShowPicker(false);
    toast.success(`"${product.name}" selected ✨`);
    // Trigger session creation/update
    setTimeout(() => ensureSession(), 300);
  }, [ensureSession]);

  // ── Handle transform changes (from sliders) ──
  const handleTransformChange = useCallback((newTransforms) => {
    setTransforms((prev) => ({ ...prev, ...newTransforms }));
  }, []);

  // ── Reset transforms ──
  const handleReset = useCallback(() => {
    setTransforms({ ...DEFAULT_TRANSFORMS });
    canvasRef.current?.resetTransform();
    toast.info("Adjustments reset");
  }, []);

  // ── Save final preview to Cloudinary ──
  const handleSavePreview = useCallback(async () => {
    if (!canvasRef.current) return;

    await ensureSession();
    if (!sessionId) { toast.warn("Session not ready"); return; }

    const dataUrl = canvasRef.current.exportDataURL();
    if (!dataUrl) { toast.error("Canvas export failed"); return; }

    try {
      await API.patch(`/virtual-tryon/${sessionId}/preview`, { dataUrl });
      toast.success("Preview saved to your profile! 📸");
      // Refresh sessions
      const r = await API.get("/virtual-tryon");
      setSessions(r.data.sessions || []);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to save preview");
    }
  }, [sessionId, ensureSession]);

  // ── Download canvas as PNG ──
  const handleDownload = useCallback(() => {
    const dataUrl = canvasRef.current?.exportDataURL();
    if (!dataUrl) { toast.error("Canvas not ready"); return; }

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `tryon-${selectedProduct?.name || "preview"}-${Date.now()}.png`;
    a.click();
    toast.success("Downloaded!");
  }, [selectedProduct]);

  // ── Load a past session ──
  const handleSessionClick = useCallback(async (session) => {
    try {
      const res = await API.get(`/virtual-tryon/${session._id}`);
      const s   = res.data;
      setSessionId(s._id);
      setMode(s.mode || "mannequin");
      setUploadedImage(s.uploadedImage?.url ? s.uploadedImage : null);
      setSelectedProduct(s.lehnga || null);
      setTransforms({
        ...DEFAULT_TRANSFORMS,
        ...(s.transformData || {}),
      });
      setSessionFlags({
        addedToWishlist:  s.addedToWishlist  || false,
        addedToMoodboard: s.addedToMoodboard || false,
        convertedToOrder: s.convertedToOrder || false,
      });
      toast.success("Session loaded");
    } catch {
      toast.error("Could not load session");
    }
  }, []);

  // ── Delete a past session ──
  const handleSessionDelete = useCallback(async (id) => {
    if (!window.confirm("Delete this try-on session?")) return;
    try {
      await API.delete(`/virtual-tryon/${id}`);
      setSessions((prev) => prev.filter((s) => s._id !== id));
      if (sessionId === id) {
        setSessionId(null);
        setSelectedProduct(null);
        setUploadedImage(null);
        setTransforms({ ...DEFAULT_TRANSFORMS });
        setMode("mannequin");
        setSessionFlags({ addedToWishlist: false, addedToMoodboard: false, convertedToOrder: false });
      }
      toast.success("Session deleted");
    } catch {
      toast.error("Failed to delete session");
    }
  }, [sessionId]);

  // The lehnga image to show on canvas — use first product image
  const lehngaImageUrl = selectedProduct?.images?.[0]?.url || null;

  return (
    <div className="tryon-page" id="virtual-tryon-page">

      {/* ── Page Header ── */}
      <div className="tryon-page-header">
        <div className="tryon-header-inner">
          <div className="tryon-header-badge">
            <HiSparkles /> Virtual Try-On
          </div>
          <h1 className="tryon-page-title">
            Discover Your <span className="gradient-text">Dream Look</span>
          </h1>
          <p className="tryon-page-subtitle">
            Upload your photo, select a lehnga, and see how it looks — instantly
          </p>
        </div>
        <div className="tryon-header-orb tryon-orb-1" />
        <div className="tryon-header-orb tryon-orb-2" />
      </div>

      {/* ── Three-Column Layout ── */}
      <div className="tryon-layout" id="tryon-layout">

        {/* LEFT — Upload + Adjustments */}
        <div className="tryon-left-panel" id="tryon-left-panel">
          <UploadPanel
            mode={mode}
            onModeChange={handleModeChange}
            uploadedImage={uploadedImage}
            onImageUploaded={handleImageUploaded}
            onImageRemoved={handleImageRemoved}
          />
          <AdjustmentControls
            transforms={transforms}
            onChange={handleTransformChange}
            onReset={handleReset}
          />
        </div>

        {/* CENTER — Canvas */}
        <div className="tryon-center-panel" id="tryon-center-panel">
          <div className="tryon-canvas-card">
            <div className="tryon-canvas-toolbar">
              <span className="tryon-toolbar-label">
                {mode === "photo" && uploadedImage
                  ? "📸 Your Photo"
                  : "👗 Mannequin Preview"}
              </span>
              <div className="tryon-toolbar-actions">
                <button
                  id="tryon-toolbar-reset"
                  className="tryon-toolbar-btn"
                  onClick={handleReset}
                  title="Reset adjustments"
                >
                  <HiRefresh />
                </button>
              </div>
            </div>

            <TryOnCanvas
              ref={canvasRef}
              mode={mode}
              brideImageUrl={uploadedImage?.url}
              lehngaImageUrl={lehngaImageUrl}
              transforms={transforms}
              onTransformChange={handleTransformChange}
              canvasReady={() => setCanvasReady(true)}
            />
          </div>

          {/* Instruction strip */}
          <div className="tryon-instructions">
            <span>🖱 Drag to move</span>
            <span>⤢ Corner handles to resize</span>
            <span>🔄 Top handle to rotate</span>
          </div>
        </div>

        {/* RIGHT — Sidebar */}
        <div className="tryon-right-panel" id="tryon-right-panel">
          <TryOnSidebar
            selectedProduct={selectedProduct}
            sessionId={sessionId}
            sessionFlags={sessionFlags}
            onSavePreview={handleSavePreview}
            onDownload={handleDownload}
            onSelectProduct={() => setShowPicker(true)}
            onFlagUpdate={(flags) => setSessionFlags((prev) => ({ ...prev, ...flags }))}
            sessions={sessions}
            sessionsLoading={sessionsLoading}
            onSessionClick={handleSessionClick}
            onSessionDelete={handleSessionDelete}
          />
        </div>
      </div>

      {/* Product Picker Modal */}
      {showPicker && (
        <ProductPicker
          onSelect={handleProductSelect}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
};

export default VirtualTryOnPage;
