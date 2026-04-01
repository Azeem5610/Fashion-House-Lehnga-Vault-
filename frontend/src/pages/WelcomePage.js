import React from "react";
import { Link } from "react-router-dom";
import { GiDress, GiSewingMachine, GiPhotoCamera } from "react-icons/gi";
import { HiArrowRight, HiSparkles, HiShieldCheck, HiChatAlt2, HiHeart } from "react-icons/hi";
import "./WelcomePage.css";

const WelcomePage = () => {
  return (
    <div className="welcome-page">
      {/* Hero */}
      <section className="welcome-hero">
        <div className="container">
          <div className="welcome-hero-badge">
            <HiSparkles /> Premium Bridal Collection
          </div>
          <h1>
            Discover Your Dream<br />
            <span className="gold">Bridal Lehnga</span>
          </h1>
          <p>
            Handcrafted with love, designed for your most special day.
            Choose from ready-made, customized, or create from your vision.
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="welcome-categories">
        <div className="container">
          <div className="welcome-categories-title">
            <h2 className="gradient-text">Explore Our Collections</h2>
            <p>Three ways to find your perfect bridal lehnga</p>
          </div>

          <div className="categories-grid">
            <Link to="/category/ready-made/fabrics" className="category-card animate-slideUp">
              <div className="category-card-visual">
                <div className="category-card-gradient ready-made">
                  <GiDress />
                </div>
              </div>
              <div className="category-card-body">
                <h3>Ready-Made Collection</h3>
                <p>Browse our exquisite collection of ready-made bridal lehngas. Choose your size and place your order instantly.</p>
                <span className="category-card-link">
                  Browse Collection <HiArrowRight />
                </span>
              </div>
            </Link>

            <Link to="/category/customized/fabrics" className="category-card animate-slideUp" style={{ animationDelay: '0.1s' }}>
              <div className="category-card-visual">
                <div className="category-card-gradient customized">
                  <GiSewingMachine />
                </div>
              </div>
              <div className="category-card-body">
                <h3>Customized Designs</h3>
                <p>Explore our finest designs and get them tailored with your personal customizations via WhatsApp.</p>
                <span className="category-card-link">
                  View Designs <HiArrowRight />
                </span>
              </div>
            </Link>

            <Link to="/design-from-picture" className="category-card animate-slideUp" style={{ animationDelay: '0.2s' }}>
              <div className="category-card-visual">
                <div className="category-card-gradient design-pic">
                  <GiPhotoCamera />
                </div>
              </div>
              <div className="category-card-body">
                <h3>Design from Picture</h3>
                <p>Upload a picture of any lehnga you love. We&apos;ll recreate it exactly or with your custom modifications.</p>
                <span className="category-card-link">
                  Upload Design <HiArrowRight />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="welcome-features">
        <div className="container">
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon"><HiSparkles /></div>
              <h4>Premium Quality</h4>
              <p>Finest fabrics & craftsmanship</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><GiSewingMachine /></div>
              <h4>Custom Tailoring</h4>
              <p>Perfect fit guaranteed</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><HiChatAlt2 /></div>
              <h4>WhatsApp Support</h4>
              <p>Direct communication</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><HiShieldCheck /></div>
              <h4>Trusted Quality</h4>
              <p>100% satisfaction</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-brand">Fashion House</div>
          <p>&copy; {new Date().getFullYear()} Fashion House. All rights reserved.</p>
          <div className="footer-links">
            <a href="https://wa.me/923152850971" target="_blank" rel="noreferrer">
              <HiChatAlt2 style={{ marginRight: 4 }} /> WhatsApp
            </a>
            <span style={{ color: 'var(--text-muted)' }}>
              <HiHeart style={{ marginRight: 4 }} /> Made with love
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WelcomePage;
