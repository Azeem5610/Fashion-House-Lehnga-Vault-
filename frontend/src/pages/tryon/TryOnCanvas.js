import React, { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { fabric } from "fabric";

// Mannequin placeholder — inline SVG encoded as data URL
const MANNEQUIN_URL = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 700" width="400" height="700">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFF8F0"/>
      <stop offset="100%" style="stop-color:#FCE4EC"/>
    </linearGradient>
    <linearGradient id="skin" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#F5D6C8"/>
      <stop offset="100%" style="stop-color:#E8B89A"/>
    </linearGradient>
    <linearGradient id="body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#E8D0C0"/>
      <stop offset="100%" style="stop-color:#D4A888"/>
    </linearGradient>
  </defs>
  <rect width="400" height="700" fill="url(#bg)" rx="12"/>
  <!-- Head -->
  <ellipse cx="200" cy="75" rx="42" ry="50" fill="url(#skin)"/>
  <!-- Neck -->
  <rect x="185" y="120" width="30" height="32" rx="6" fill="url(#skin)"/>
  <!-- Shoulders -->
  <ellipse cx="130" cy="162" rx="38" ry="18" fill="url(#body)"/>
  <ellipse cx="270" cy="162" rx="38" ry="18" fill="url(#body)"/>
  <!-- Torso -->
  <path d="M148 152 Q200 158 252 152 L265 320 Q200 334 135 320 Z" fill="url(#body)"/>
  <!-- Arms -->
  <path d="M148 155 Q108 200 102 300 Q96 320 100 340" stroke="url(#skin)" stroke-width="30" stroke-linecap="round" fill="none"/>
  <path d="M252 155 Q292 200 298 300 Q304 320 300 340" stroke="url(#skin)" stroke-width="30" stroke-linecap="round" fill="none"/>
  <!-- Hands -->
  <ellipse cx="100" cy="348" rx="16" ry="20" fill="url(#skin)"/>
  <ellipse cx="300" cy="348" rx="16" ry="20" fill="url(#skin)"/>
  <!-- Hips -->
  <ellipse cx="200" cy="325" rx="72" ry="22" fill="url(#body)" opacity="0.8"/>
  <!-- Legs -->
  <path d="M148 330 Q142 450 138 580 Q138 620 150 640" stroke="#C8A090" stroke-width="42" stroke-linecap="round" fill="none"/>
  <path d="M252 330 Q258 450 262 580 Q262 620 250 640" stroke="#C8A090" stroke-width="42" stroke-linecap="round" fill="none"/>
  <!-- Feet -->
  <ellipse cx="148" cy="648" rx="26" ry="12" fill="#B08060"/>
  <ellipse cx="252" cy="648" rx="26" ry="12" fill="#B08060"/>
  <!-- Face details -->
  <ellipse cx="183" cy="68" rx="6" ry="7" fill="#8B6A5A" opacity="0.8"/>
  <ellipse cx="217" cy="68" rx="6" ry="7" fill="#8B6A5A" opacity="0.8"/>
  <path d="M188 90 Q200 100 212 90" stroke="#C2185B" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <!-- Hair -->
  <ellipse cx="200" cy="42" rx="44" ry="28" fill="#3D2314"/>
  <path d="M158 55 Q150 90 155 115" stroke="#3D2314" stroke-width="8" stroke-linecap="round" fill="none"/>
  <path d="M242 55 Q250 90 245 115" stroke="#3D2314" stroke-width="8" stroke-linecap="round" fill="none"/>
  <!-- Stand base -->
  <rect x="172" y="650" width="56" height="12" rx="4" fill="#D4A888"/>
  <rect x="148" y="660" width="104" height="10" rx="5" fill="#C2185B" opacity="0.3"/>
  <!-- Subtle gold trim -->
  <text x="200" y="690" text-anchor="middle" font-size="11" fill="#C2185B" opacity="0.5" font-family="serif">✦ Bridal Mannequin ✦</text>
</svg>
`)}`;

// Skin tone CSS filters applied to the bride photo layer
const SKIN_FILTERS = {
  none:    "",
  warm:    "sepia(0.18) saturate(1.1) hue-rotate(-8deg) brightness(1.02)",
  cool:    "saturate(0.88) hue-rotate(12deg) brightness(1.02)",
  neutral: "saturate(0.95) brightness(1.03) contrast(0.98)",
};

/**
 * TryOnCanvas — fabric.js canvas that composites:
 *   • background: bride photo OR mannequin SVG
 *   • overlay:    selected lehnga product image (draggable / resizable / rotatable)
 *
 * Exposes via ref:
 *   • exportDataURL()   → base64 PNG of the full canvas
 *   • resetTransform()  → snap lehnga back to default position
 */
const TryOnCanvas = forwardRef(function TryOnCanvas(
  {
    mode,                 // "photo" | "mannequin"
    brideImageUrl,        // Cloudinary URL of uploaded photo
    lehngaImageUrl,       // Product image URL (transparent PNG preferred)
    transforms,           // { opacity, bodyHeight, bodyWidth, shoulderWidth, skinToneFilter, rotation }
    onTransformChange,    // callback(newTransforms) — fired on drag/resize/rotate
    canvasReady,          // callback() — fired once canvas is initialized
  },
  ref
) {
  const canvasElRef   = useRef(null);
  const fabricRef     = useRef(null);   // fabric.Canvas instance
  const bgRef         = useRef(null);   // background fabric object
  const lehngaRef     = useRef(null);   // lehnga overlay fabric object
  const containerRef  = useRef(null);

  // ── Expose imperative API ──
  useImperativeHandle(ref, () => ({
    exportDataURL: () => {
      if (!fabricRef.current) return null;
      return fabricRef.current.toDataURL({ format: "png", quality: 1, multiplier: 2 });
    },
    resetTransform: () => {
      const canvas = fabricRef.current;
      const lehnga = lehngaRef.current;
      if (!canvas || !lehnga) return;
      const cW = canvas.getWidth();
      const cH = canvas.getHeight();
      lehnga.set({
        left: cW / 2,
        top: cH * 0.55,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        opacity: 1,
      });
      lehnga.setCoords();
      canvas.renderAll();
      onTransformChange?.({ opacity: 100, rotation: 0 });
    },
  }), [onTransformChange]);

  // ── Initialise fabric canvas once ──
  useEffect(() => {
    const el = canvasElRef.current;
    if (!el || fabricRef.current) return;

    const container = containerRef.current;
    const W = container?.offsetWidth  || 520;
    const H = container?.offsetHeight || 680;

    const canvas = new fabric.Canvas(el, {
      width: W,
      height: H,
      selection: false,
      backgroundColor: "#FFFBF5",
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    // Fire transform changes on object modified
    canvas.on("object:modified", (e) => {
      const obj = e.target;
      if (!obj || obj !== lehngaRef.current) return;
      onTransformChange?.({
        x:       Math.round(obj.left),
        y:       Math.round(obj.top),
        scaleX:  Math.round(obj.scaleX * 100) / 100,
        scaleY:  Math.round(obj.scaleY * 100) / 100,
        rotation: Math.round(obj.angle),
      });
    });

    canvasReady?.();
    return () => { canvas.dispose(); fabricRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load background when mode / brideImageUrl changes ──
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const url = mode === "photo" && brideImageUrl ? brideImageUrl : MANNEQUIN_URL;

    fabric.Image.fromURL(url, (img) => {
      if (canvas !== fabricRef.current || !fabricRef.current) return;
      if (!img) return;
      const cW = canvas.getWidth();
      const cH = canvas.getHeight();
      const scale = Math.min(cW / img.width, cH / img.height);
      img.set({
        left: cW / 2,
        top:  cH / 2,
        originX: "center",
        originY: "center",
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false,
        hoverCursor: "default",
      });

      // Apply skin tone filter to bride photo
      if (mode === "photo" && transforms?.skinToneFilter && transforms.skinToneFilter !== "none") {
        const canvasEl = img.getElement();
        canvasEl.style.filter = SKIN_FILTERS[transforms.skinToneFilter] || "";
      }

      if (bgRef.current) canvas.remove(bgRef.current);
      bgRef.current = img;
      canvas.add(img);
      canvas.sendToBack(img);
      canvas.renderAll();
    }, { crossOrigin: "anonymous" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, brideImageUrl]);

  // ── Load lehnga overlay when product image changes ──
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (lehngaRef.current) {
      canvas.remove(lehngaRef.current);
      lehngaRef.current = null;
    }
    if (!lehngaImageUrl) { canvas.renderAll(); return; }

    fabric.Image.fromURL(lehngaImageUrl, (img) => {
      if (canvas !== fabricRef.current || !fabricRef.current) return;
      if (!img) return;
      const cW = canvas.getWidth();
      const cH = canvas.getHeight();

      // Scale lehnga to ~55% canvas height by default
      const targetH = cH * 0.55;
      const scale   = targetH / img.height;

      const bodyScaleX = (transforms?.bodyWidth    ?? 100) / 100;
      const bodyScaleY = (transforms?.bodyHeight   ?? 100) / 100;
      const shoulderSX = (transforms?.shoulderWidth ?? 100) / 100;

      img.set({
        left:    cW / 2,
        top:     cH * 0.55,
        originX: "center",
        originY: "center",
        scaleX:  scale * bodyScaleX * shoulderSX,
        scaleY:  scale * bodyScaleY,
        opacity: (transforms?.opacity ?? 100) / 100,
        angle:   transforms?.rotation ?? 0,
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        borderColor: "#C2185B",
        cornerColor: "#C2185B",
        cornerStyle: "circle",
        cornerSize: 10,
        transparentCorners: false,
      });

      lehngaRef.current = img;
      canvas.add(img);
      canvas.bringToFront(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    }, { crossOrigin: "anonymous" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lehngaImageUrl]);

  // ── Sync slider transforms onto existing lehnga object ──
  useEffect(() => {
    const canvas = fabricRef.current;
    const lehnga = lehngaRef.current;
    if (!canvas || !lehnga || !transforms) return;

    const cH       = canvas.getHeight();
    const targetH  = cH * 0.55;
    const baseScale = targetH / (lehnga.height || 1);

    const bodyScaleX  = (transforms.bodyWidth    ?? 100) / 100;
    const bodyScaleY  = (transforms.bodyHeight   ?? 100) / 100;
    const shoulderSX  = (transforms.shoulderWidth ?? 100) / 100;

    lehnga.set({
      scaleX:  baseScale * bodyScaleX * shoulderSX,
      scaleY:  baseScale * bodyScaleY,
      opacity: (transforms.opacity  ?? 100) / 100,
      angle:   transforms.rotation ?? 0,
    });
    lehnga.setCoords();
    canvas.renderAll();
  }, [transforms]);

  // ── Apply skin tone filter to background ──
  useEffect(() => {
    const canvas = fabricRef.current;
    const bg     = bgRef.current;
    if (!canvas || !bg || mode !== "photo") return;

    const el = bg.getElement?.();
    if (el) {
      el.style.filter = SKIN_FILTERS[transforms?.skinToneFilter] || "";
      canvas.renderAll();
    }
  }, [transforms?.skinToneFilter, mode]);

  return (
    <div ref={containerRef} className="tryon-canvas-wrapper" id="tryon-canvas-container">
      <canvas ref={canvasElRef} id="tryon-fabric-canvas" />

      {!lehngaImageUrl && (
        <div className="tryon-canvas-hint">
          <span>← Select a lehnga from the sidebar to begin</span>
        </div>
      )}
    </div>
  );
});

export default TryOnCanvas;
