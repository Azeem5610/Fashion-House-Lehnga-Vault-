import React, { useCallback } from "react";
import {
  HiAdjustments, HiArrowsExpand, HiRefresh,
} from "react-icons/hi";

/**
 * AdjustmentControls — left-panel sliders that drive canvas transforms.
 * All values live in the parent; this component is fully controlled.
 */

const sliders = [
  {
    key: "opacity",
    label: "Lehnga Opacity",
    icon: "◐",
    min: 10, max: 100, step: 1,
    unit: "%",
    description: "Transparency of the lehnga overlay",
  },
  {
    key: "bodyHeight",
    label: "Height Scale",
    icon: "↕",
    min: 50, max: 160, step: 1,
    unit: "%",
    description: "Stretch or compress the lehnga vertically",
  },
  {
    key: "bodyWidth",
    label: "Body Width",
    icon: "↔",
    min: 50, max: 160, step: 1,
    unit: "%",
    description: "Widen or narrow the lehnga body",
  },
  {
    key: "shoulderWidth",
    label: "Shoulder Width",
    icon: "⇔",
    min: 60, max: 140, step: 1,
    unit: "%",
    description: "Adjust the shoulder span of the overlay",
  },
  {
    key: "rotation",
    label: "Rotation",
    icon: "↻",
    min: -180, max: 180, step: 1,
    unit: "°",
    description: "Rotate the lehnga overlay",
  },
];

const SKIN_TONES = [
  { value: "none",    label: "Original", color: "#F5D6C8" },
  { value: "warm",    label: "Warm",     color: "#E8A870" },
  { value: "cool",    label: "Cool",     color: "#D4C0B8" },
  { value: "neutral", label: "Neutral",  color: "#C8A898" },
];

const AdjustmentControls = ({ transforms, onChange, onReset }) => {
  const handleSlider = useCallback((key, value) => {
    onChange({ ...transforms, [key]: Number(value) });
  }, [transforms, onChange]);

  const handleSkinTone = useCallback((value) => {
    onChange({ ...transforms, skinToneFilter: value });
  }, [transforms, onChange]);

  const getTrackGradient = (slider) => {
    const val = transforms?.[slider.key] ?? (slider.key === "rotation" ? 0 : 100);
    const pct = ((val - slider.min) / (slider.max - slider.min)) * 100;
    return `linear-gradient(to right, var(--rose) ${pct}%, var(--border) ${pct}%)`;
  };

  return (
    <div className="tryon-adjustments" id="tryon-adjustment-controls">
      {/* Header */}
      <div className="tryon-adj-header">
        <HiAdjustments className="tryon-adj-icon" />
        <span>Adjustments</span>
        <button
          id="tryon-reset-btn"
          className="tryon-reset-btn"
          onClick={onReset}
          title="Reset all to defaults"
        >
          <HiRefresh /> Reset
        </button>
      </div>

      {/* Sliders */}
      {sliders.map((slider) => {
        const val = transforms?.[slider.key] ?? (slider.key === "rotation" ? 0 : 100);
        return (
          <div key={slider.key} className="tryon-slider-group">
            <div className="tryon-slider-label">
              <span className="tryon-slider-icon">{slider.icon}</span>
              <span>{slider.label}</span>
              <span className="tryon-slider-value">{val}{slider.unit}</span>
            </div>
            <input
              id={`tryon-slider-${slider.key}`}
              type="range"
              className="tryon-slider"
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={val}
              onChange={(e) => handleSlider(slider.key, e.target.value)}
              style={{ background: getTrackGradient(slider) }}
            />
            <div className="tryon-slider-minmax">
              <span>{slider.min}{slider.unit}</span>
              <span>{slider.max}{slider.unit}</span>
            </div>
          </div>
        );
      })}

      {/* Skin tone filter */}
      <div className="tryon-slider-group">
        <div className="tryon-slider-label">
          <span className="tryon-slider-icon">🎨</span>
          <span>Skin Tone Filter</span>
        </div>
        <div className="tryon-skin-tones" id="tryon-skin-tones">
          {SKIN_TONES.map((tone) => (
            <button
              key={tone.value}
              id={`tryon-skin-${tone.value}`}
              className={`tryon-skin-btn ${transforms?.skinToneFilter === tone.value ? "active" : ""}`}
              style={{ background: tone.color }}
              onClick={() => handleSkinTone(tone.value)}
              title={tone.label}
            >
              {transforms?.skinToneFilter === tone.value && (
                <span className="tryon-skin-check">✓</span>
              )}
            </button>
          ))}
        </div>
        <div className="tryon-skin-labels">
          {SKIN_TONES.map((t) => (
            <span
              key={t.value}
              className={transforms?.skinToneFilter === t.value ? "tryon-skin-active-label" : ""}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* Canvas interaction tip */}
      <div className="tryon-canvas-tip">
        <HiArrowsExpand />
        <span>Drag, resize &amp; rotate directly on the canvas</span>
      </div>
    </div>
  );
};

export default AdjustmentControls;
