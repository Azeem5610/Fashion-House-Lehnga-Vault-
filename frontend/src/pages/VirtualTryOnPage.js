import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  HiSparkles, HiArrowRight, HiArrowLeft, HiRefresh,
  HiHeart, HiShoppingCart, HiCheck, HiStar,
} from "react-icons/hi";
import API from "../utils/api";
import "./VirtualTryOnPage.css";

/* ─── Quiz Configuration ─────────────────────────────────────── */
const STEPS = [
  {
    id: "occasion",
    question: "What's the occasion?",
    subtitle: "Tell us what you're dressing for",
    icon: "🎊",
    options: [
      { label: "Bridal (Mehndi)",   value: "mehndi",   emoji: "💛", color: "#F59E0B" },
      { label: "Bridal (Barat)",    value: "barat",    emoji: "❤️", color: "#E11D48" },
      { label: "Bridal (Walima)",   value: "walima",   emoji: "💜", color: "#7C3AED" },
      { label: "Wedding Guest",     value: "guest",    emoji: "💐", color: "#059669" },
      { label: "Eid / Festive",     value: "festive",  emoji: "🌙", color: "#0EA5E9" },
      { label: "Party / Reception", value: "party",    emoji: "✨", color: "#D946EF" },
    ],
  },
  {
    id: "color",
    question: "Pick your colour palette",
    subtitle: "Which shades speak to you?",
    icon: "🎨",
    options: [
      { label: "Red & Crimson",    value: "red",    emoji: "🔴", color: "#DC2626" },
      { label: "Pink & Rose",      value: "pink",   emoji: "🌸", color: "#EC4899" },
      { label: "Gold & Beige",     value: "gold",   emoji: "✨", color: "#D97706" },
      { label: "Green & Teal",     value: "green",  emoji: "💚", color: "#059669" },
      { label: "Blue & Navy",      value: "blue",   emoji: "💙", color: "#2563EB" },
      { label: "Purple & Plum",    value: "purple", emoji: "💜", color: "#7C3AED" },
    ],
  },
  {
    id: "budget",
    question: "What's your budget range?",
    subtitle: "We'll show you the best picks in your range",
    icon: "💰",
    options: [
      { label: "Under Rs. 15,000",         value: [0, 15000],       emoji: "💸", color: "#6B7280" },
      { label: "Rs. 15,000 – 30,000",      value: [15000, 30000],   emoji: "💳", color: "#0EA5E9" },
      { label: "Rs. 30,000 – 60,000",      value: [30000, 60000],   emoji: "💎", color: "#7C3AED" },
      { label: "Rs. 60,000 – 1,00,000",    value: [60000, 100000],  emoji: "👑", color: "#D97706" },
      { label: "Above Rs. 1,00,000",       value: [100000, 9999999],emoji: "🌟", color: "#E11D48" },
    ],
  },
  {
    id: "fabric",
    question: "Preferred fabric type?",
    subtitle: "Each fabric has its own elegance",
    icon: "🧵",
    options: [
      { label: "Net (China)",         value: "Net (China)",          emoji: "🕸️", color: "#6B7280" },
      { label: "Pure China Krinkle",  value: "Pure China Krinkle",   emoji: "🌊", color: "#0EA5E9" },
      { label: "Organza",             value: "Organza",              emoji: "🪷", color: "#EC4899" },
      { label: "Velvet (Winter)",     value: "Velvet (Winter)",      emoji: "🟣", color: "#7C3AED" },
      { label: "Tussle Silk",         value: "Tussle Silk",          emoji: "🌸", color: "#D946EF" },
      { label: "Any / Surprise me",   value: "any",                  emoji: "🎲", color: "#D97706" },
    ],
  },
];

/* ─── Utility ─────────────────────────────────────────────────── */
const scoreProduct = (product, answers) => {
  let score = 0;

  // Budget match
  const [minB, maxB] = answers.budget || [0, 9999999];
  if (product.price >= minB && product.price <= maxB) score += 40;
  else if (product.price < minB) score += 10;  // cheaper than budget

  // Fabric match
  if (answers.fabric && answers.fabric !== "any") {
    if (product.fabricType === answers.fabric) score += 35;
  } else {
    score += 25; // "any" gets partial credit
  }

  // Boost if product has images (more presentable)
  if (product.images?.length > 0) score += 10;

  // Popularity boost via random seed per product (stable pseudo-score)
  const seed = (product._id?.charCodeAt(0) || 0) % 15;
  score += seed;

  return score;
};

/* ─── Components ─────────────────────────────────────────────── */

const StepIndicator = ({ current, total }) => (
  <div className="sf-steps">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={`sf-step-dot ${i < current ? "done" : i === current ? "active" : ""}`}
      />
    ))}
  </div>
);

const QuizStep = ({ step, selected, onSelect, onNext, onBack, isFirst, isLast }) => (
  <div className="sf-quiz-slide" id={`sf-step-${step.id}`}>
    <div className="sf-quiz-icon">{step.icon}</div>
    <h2 className="sf-quiz-q">{step.question}</h2>
    <p className="sf-quiz-sub">{step.subtitle}</p>

    <div className="sf-options">
      {step.options.map((opt) => {
        const isSelected = JSON.stringify(selected) === JSON.stringify(opt.value);
        return (
          <button
            key={opt.label}
            id={`sf-opt-${step.id}-${opt.value}`}
            className={`sf-option ${isSelected ? "selected" : ""}`}
            style={{ "--opt-color": opt.color }}
            onClick={() => onSelect(opt.value)}
          >
            <span className="sf-opt-emoji">{opt.emoji}</span>
            <span className="sf-opt-label">{opt.label}</span>
            {isSelected && <HiCheck className="sf-opt-check" />}
          </button>
        );
      })}
    </div>

    <div className="sf-quiz-nav">
      {!isFirst && (
        <button id="sf-back-btn" className="sf-nav-btn sf-back" onClick={onBack}>
          <HiArrowLeft /> Back
        </button>
      )}
      <button
        id="sf-next-btn"
        className="sf-nav-btn sf-next"
        onClick={onNext}
        disabled={selected === undefined || selected === null}
      >
        {isLast ? "Find My Style ✨" : "Next"} <HiArrowRight />
      </button>
    </div>
  </div>
);

const ProductCard = ({ product, rank }) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const img = product.images?.[0]?.url;

  return (
    <div className="sf-product-card" id={`sf-product-${product._id}`}>
      {rank <= 3 && (
        <div className="sf-rank-badge">
          {rank === 1 ? "🏆 Best Match" : rank === 2 ? "🥈 2nd Pick" : "🥉 3rd Pick"}
        </div>
      )}
      <div className="sf-product-img">
        {img
          ? <img src={img} alt={product.name} />
          : <div className="sf-product-placeholder">👗</div>}
        <button
          className={`sf-like-btn ${liked ? "liked" : ""}`}
          onClick={() => { setLiked(!liked); if (!liked) toast.success("Added to wishlist ❤️"); }}
          title="Add to wishlist"
        >
          <HiHeart />
        </button>
      </div>
      <div className="sf-product-body">
        <div className="sf-product-name">{product.name}</div>
        <div className="sf-product-fabric">{product.fabricType}</div>
        <div className="sf-product-footer">
          <div className="sf-product-price">Rs. {(product.price || 0).toLocaleString()}</div>
          <div className="sf-product-stars">
            {[1,2,3,4,5].map(s => (
              <HiStar key={s} style={{ color: s <= 4 ? "#F59E0B" : "#D1D5DB", fontSize: 12 }} />
            ))}
          </div>
        </div>
        {product.sizes?.length > 0 && (
          <div className="sf-product-sizes">
            {product.sizes.map((s) => <span key={s} className="tryon-size-chip">{s}</span>)}
          </div>
        )}
        <button
          id={`sf-view-${product._id}`}
          className="sf-view-btn"
          onClick={() => navigate(`/product/${product._id}`)}
        >
          <HiShoppingCart /> View & Order
        </button>
      </div>
    </div>
  );
};

// ── Main Page ───────────────────────────────────────────────
const StyleFinderPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers]         = useState({});
  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [phase, setPhase]             = useState("quiz"); // "quiz" | "loading" | "results"

  // Load products when entering results phase
  useEffect(() => {
    if (phase !== "loading") return;
    setLoading(true);
    API.get("/products")
      .then((r) => {
        const all = r.data.products || r.data || [];
        setProducts(all);
      })
      .catch(() => toast.error("Could not load products"))
      .finally(() => {
        setLoading(false);
        setPhase("results");
      });
  }, [phase]);

  // Score & sort products
  const recommended = useMemo(() => {
    if (!products.length) return [];
    return [...products]
      .map((p) => ({ ...p, _score: scoreProduct(p, answers) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 9);
  }, [products, answers]);

  const handleSelect = (value) => {
    setAnswers((prev) => ({ ...prev, [STEPS[currentStep].id]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setPhase("loading");
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setAnswers({});
    setProducts([]);
    setPhase("quiz");
  };

  return (
    <div className="sf-page" id="style-finder-page">

      {/* ── Page Header ── */}
      <div className="sf-page-header">
        <div className="sf-header-inner">
          <div className="sf-header-badge"><HiSparkles /> Style Finder</div>
          <h1 className="sf-page-title">
            Find Your <span className="gradient-text">Perfect Lehnga</span>
          </h1>
          <p className="sf-page-subtitle">
            Answer 4 quick questions — we'll match you with your dream design
          </p>
        </div>
        <div className="sf-header-orb sf-orb-1" />
        <div className="sf-header-orb sf-orb-2" />
      </div>

      {/* ── Quiz Phase ── */}
      {phase === "quiz" && (
        <div className="sf-quiz-wrap" id="sf-quiz-container">
          <StepIndicator current={currentStep} total={STEPS.length} />
          <div className="sf-quiz-card">
            <QuizStep
              step={STEPS[currentStep]}
              selected={answers[STEPS[currentStep].id]}
              onSelect={handleSelect}
              onNext={handleNext}
              onBack={handleBack}
              isFirst={currentStep === 0}
              isLast={currentStep === STEPS.length - 1}
            />
          </div>
          <div className="sf-quiz-progress-label">
            Step {currentStep + 1} of {STEPS.length}
          </div>
        </div>
      )}

      {/* ── Loading Phase ── */}
      {phase === "loading" && (
        <div className="sf-loading-wrap" id="sf-loading">
          <div className="sf-loading-orb" />
          <div className="sf-loading-spinner">
            <div className="sf-spinner-ring" />
            <span className="sf-spinner-emoji">✨</span>
          </div>
          <h3 className="sf-loading-title">Finding your perfect match…</h3>
          <p className="sf-loading-sub">Analysing your style preferences</p>
          <div className="sf-loading-tags">
            {Object.values(answers).map((v, i) => (
              <span key={i} className="sf-loading-tag">
                {Array.isArray(v)
                  ? `Rs. ${v[0].toLocaleString()} – ${v[1] > 900000 ? "∞" : v[1].toLocaleString()}`
                  : String(v)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Results Phase ── */}
      {phase === "results" && (
        <div className="sf-results-wrap" id="sf-results">
          {/* Summary banner */}
          <div className="sf-results-banner">
            <div className="sf-banner-left">
              <div className="sf-banner-title">
                🎉 We found <span>{recommended.length}</span> matches for you!
              </div>
              <div className="sf-banner-sub">
                Based on your preferences — sorted by best match
              </div>
            </div>
            <button
              id="sf-restart-btn"
              className="sf-restart-btn"
              onClick={handleRestart}
            >
              <HiRefresh /> Start Over
            </button>
          </div>

          {/* Answer pills */}
          <div className="sf-answer-pills">
            {STEPS.map((step) => {
              const ans = answers[step.id];
              if (!ans) return null;
              const opt = step.options.find(
                (o) => JSON.stringify(o.value) === JSON.stringify(ans)
              );
              return opt ? (
                <span key={step.id} className="sf-answer-pill">
                  {opt.emoji} {opt.label}
                </span>
              ) : null;
            })}
          </div>

          {/* Products grid */}
          {loading ? (
            <div className="sf-results-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 380, borderRadius: 16 }} />
              ))}
            </div>
          ) : recommended.length === 0 ? (
            <div className="sf-empty">
              <div style={{ fontSize: 64 }}>👗</div>
              <h3>No exact matches found</h3>
              <p>Try different preferences — our collection is growing!</p>
              <button className="sf-restart-btn" onClick={handleRestart}>
                <HiRefresh /> Try Again
              </button>
            </div>
          ) : (
            <div className="sf-results-grid" id="sf-results-grid">
              {recommended.map((product, i) => (
                <ProductCard key={product._id} product={product} rank={i + 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StyleFinderPage;
