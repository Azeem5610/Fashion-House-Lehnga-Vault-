import React, { useState, useEffect } from "react";
import { HiShieldCheck, HiX, HiChevronDown, HiChevronUp } from "react-icons/hi";
import "./CookieConsent.css";

const COOKIE_KEY = "fh_cookie_consent"; // fh = Fashion House

/**
 * CookieConsentBanner
 *
 * Displays a GDPR-style cookie consent banner on first visit.
 * Persists user choice to localStorage under "fh_cookie_consent":
 *   - "accepted"  → user opted in to all cookies
 *   - "declined"  → user opted out (only essential cookies)
 *   - (absent)    → banner is shown
 */
const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);

  // On mount: check if user has already made a choice
  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_KEY);
    if (!saved) {
      // Small delay so the banner slides in after the page loads
      const timer = setTimeout(() => setVisible(true), 900);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = (choice) => {
    setAnimateOut(true);
    setTimeout(() => {
      localStorage.setItem(COOKIE_KEY, choice);
      setVisible(false);
      setAnimateOut(false);
    }, 400);
  };

  const handleAccept = () => dismiss("accepted");
  const handleDecline = () => dismiss("declined");

  if (!visible) return null;

  return (
    <div
      className={`cookie-overlay ${animateOut ? "cookie-overlay--out" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Cookie consent"
      id="cookie-consent-banner"
    >
      <div className="cookie-banner">
        {/* ── Left accent line ── */}
        <div className="cookie-accent-bar" />

        {/* ── Icon ── */}
        <div className="cookie-icon-wrap">
          <HiShieldCheck className="cookie-shield-icon" />
        </div>

        {/* ── Content ── */}
        <div className="cookie-content">
          <h3 className="cookie-title">Your Privacy Matters 🍪</h3>
          <p className="cookie-desc">
            We use cookies to personalise your experience, remember your
            preferences, and keep your account secure. By continuing, you agree
            to our use of cookies.
          </p>

          {/* Expandable details */}
          <button
            className="cookie-details-toggle"
            onClick={() => setExpanded((p) => !p)}
            aria-expanded={expanded}
            id="cookie-details-toggle"
          >
            {expanded ? "Hide details" : "What cookies do we use?"}
            {expanded ? (
              <HiChevronUp className="cookie-chevron" />
            ) : (
              <HiChevronDown className="cookie-chevron" />
            )}
          </button>

          {expanded && (
            <div className="cookie-details" id="cookie-details">
              <div className="cookie-detail-item">
                <span className="cookie-badge cookie-badge--essential">Essential</span>
                <span>
                  Authentication tokens &amp; session cookies — required for
                  login and secure access. <strong>Always active.</strong>
                </span>
              </div>
              <div className="cookie-detail-item">
                <span className="cookie-badge cookie-badge--functional">Functional</span>
                <span>
                  Wishlist, cart state, and theme preferences so you don't lose
                  your selections between visits.
                </span>
              </div>
              <div className="cookie-detail-item">
                <span className="cookie-badge cookie-badge--analytics">Analytics</span>
                <span>
                  Anonymous page-view data that helps us improve the shopping
                  experience. No personal data is shared.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="cookie-actions">
          <button
            id="cookie-accept-btn"
            className="cookie-btn cookie-btn--accept"
            onClick={handleAccept}
          >
            Accept All
          </button>
          <button
            id="cookie-decline-btn"
            className="cookie-btn cookie-btn--decline"
            onClick={handleDecline}
          >
            Essential Only
          </button>
        </div>

        {/* ── Close (dismiss without choice — treated as decline) ── */}
        <button
          className="cookie-close"
          onClick={handleDecline}
          aria-label="Close cookie banner"
          id="cookie-close-btn"
        >
          <HiX />
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;
