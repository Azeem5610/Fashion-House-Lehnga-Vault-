import React, { useEffect, useState, useCallback } from "react";
import API from "../utils/api";
import { HiHeart, HiX, HiSwitchHorizontal } from "react-icons/hi";
import { toast } from "react-toastify";
import "./WishlistPage.css";

const WishlistPage = () => {
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // all | compare
  const [compareItems, setCompareItems] = useState([]);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/wishlist");
      setWishlist(res.data);
    } catch { toast.error("Failed to load wishlist"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const removeProduct = async (productId) => {
    try {
      const res = await API.delete(`/wishlist/remove/${productId}`);
      setWishlist(res.data);
      setCompareItems(prev => prev.filter(p => p._id !== productId));
      toast.success("Removed from wishlist");
    } catch { toast.error("Failed"); }
  };



  const toggleCompare = (product) => {
    setCompareItems(prev => {
      const exists = prev.find(p => p._id === product._id);
      if (exists) return prev.filter(p => p._id !== product._id);
      if (prev.length >= 4) { toast.warning("Max 4 items for comparison"); return prev; }
      return [...prev, product];
    });
  };

  const getImg = (product) => product?.images?.[0]?.url || null;
  const formatCurrency = (v) => `Rs.${(v || 0).toLocaleString()}`;

  const products = wishlist?.products || [];

  const ProductCard = ({ product, showRemove = true }) => (
    <div className="wl-product-card">
      {showRemove && (
        <button className="wl-remove-btn" onClick={() => removeProduct(product._id)}>
          <HiX />
        </button>
      )}
      {getImg(product) ? (
        <img src={getImg(product)} alt={product.name} className="wl-product-img" />
      ) : (
        <div className="wl-product-img-placeholder">👗</div>
      )}
      <div className="wl-product-body">
        <div className="wl-product-name">{product.name}</div>
        <div className="wl-product-meta">{product.fabricType} · {product.category}</div>
        <div className="wl-product-price">{formatCurrency(product.price)}</div>
        <div className="wl-product-actions">
          {activeTab !== "compare" && (
            <button className={`btn btn-sm ${compareItems.find(p => p._id === product._id) ? "btn-gold" : "btn-outline"}`}
              onClick={() => toggleCompare(product)}>
              <HiSwitchHorizontal /> {compareItems.find(p => p._id === product._id) ? "Comparing" : "Compare"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="wishlist-page">
      <div className="page-header">
        <h1 style={{ fontFamily: "var(--font-display)" }}>
          My <span className="gradient-text">Wishlist</span>
        </h1>
        <p>{products.length} saved items</p>
      </div>

      {/* Tabs */}
      <div className="wl-tabs">
        <button className={`wl-tab ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>
          <HiHeart style={{ verticalAlign: "middle" }} /> All Favorites ({products.length})
        </button>
        {compareItems.length > 0 && (
          <button className={`wl-tab ${activeTab === "compare" ? "active" : ""}`} onClick={() => setActiveTab("compare")}>
            <HiSwitchHorizontal style={{ verticalAlign: "middle" }} /> Compare ({compareItems.length})
          </button>
        )}
      </div>

      {loading ? <div className="spinner" /> : (
        <>
          {/* All Favorites */}
          {activeTab === "all" && (
            products.length === 0 ? (
              <div className="empty-state">
                <h3>Your wishlist is empty</h3>
                <p style={{ color: "var(--text-muted)" }}>Browse our collection and save your favorite lehngas</p>
              </div>
            ) : (
              <div className="wl-grid">
                {products.map((p, i) => (
                  <ProductCard key={p._id} product={p} style={{ animationDelay: `${i * 0.05}s` }} />
                ))}
              </div>
            )
          )}



          {/* Compare View */}
          {activeTab === "compare" && (
            compareItems.length < 2 ? (
              <div className="empty-state"><h3>Select at least 2 items to compare</h3><p style={{ color: "var(--text-muted)" }}>Go to "All Favorites" and click "Compare" on items you want to compare</p></div>
            ) : (
              <div className="wl-compare">
                {compareItems.map((p, i) => (
                  <div key={p._id} className="wl-compare-card" style={{ animationDelay: `${i * 0.08}s` }}>
                    {getImg(p) ? (
                      <img src={getImg(p)} alt={p.name} className="wl-compare-img" />
                    ) : (
                      <div className="wl-product-img-placeholder" style={{ height: 200, borderRadius: 8, marginBottom: 14 }}>👗</div>
                    )}
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", marginBottom: 12, color: "var(--text-primary)" }}>{p.name}</h3>
                    <div className="wl-compare-field"><span className="wl-compare-label">Price</span><span className="wl-compare-value" style={{ color: "var(--gold)" }}>{formatCurrency(p.price)}</span></div>
                    <div className="wl-compare-field"><span className="wl-compare-label">Fabric</span><span className="wl-compare-value">{p.fabricType}</span></div>
                    <div className="wl-compare-field"><span className="wl-compare-label">Category</span><span className="wl-compare-value">{p.category}</span></div>
                    <div className="wl-compare-field"><span className="wl-compare-label">In Stock</span><span className="wl-compare-value">{p.inStock ? "✅ Yes" : "❌ No"}</span></div>
                    <button className="btn btn-outline btn-sm" style={{ width: "100%", marginTop: 12 }} onClick={() => toggleCompare(p)}>
                      <HiX /> Remove
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
};

export default WishlistPage;
