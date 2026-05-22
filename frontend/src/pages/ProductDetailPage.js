import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { HiArrowLeft, HiHeart, HiOutlineHeart, HiBookmark } from "react-icons/hi";
import { FaWhatsapp } from "react-icons/fa";
import { GiDress } from "react-icons/gi";
import { toast } from "react-toastify";
import ReviewForm from "../components/ReviewForm";
import "./ProductDetailPage.css";

const ADMIN_WHATSAPP = "923152850971";

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderData, setOrderData] = useState({ address: "", city: "", phone: "", notes: "" });
  const [ordering, setOrdering] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [moodboards, setMoodboards] = useState([]);
  const [showMbDropdown, setShowMbDropdown] = useState(false);
  const [orderPlacedSuccess, setOrderPlacedSuccess] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await API.get(`/products/${id}`);
        setProduct(data);
        if (data.sizes?.length > 0) setSelectedSize(data.sizes[0]);
      } catch (err) {
        toast.error("Product not found");
        navigate("/");
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id, navigate]);

  // Check wishlist status
  useEffect(() => {
    if (user && id) {
      API.get(`/wishlist/check/${id}`).then(r => setInWishlist(r.data.inWishlist)).catch(() => {});
    }
  }, [id, user]);

  const toggleWishlist = async () => {
    setWishlistLoading(true);
    try {
      if (inWishlist) {
        await API.delete(`/wishlist/remove/${id}`);
        setInWishlist(false);
        toast.success("Removed from wishlist");
      } else {
        await API.post("/wishlist/add", { productId: id });
        setInWishlist(true);
        toast.success("Added to wishlist!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
    setWishlistLoading(false);
  };

  const fetchMoodboards = async () => {
    try {
      const res = await API.get("/moodboards/my");
      setMoodboards(res.data.moodboards || []);
      setShowMbDropdown(true);
    } catch { toast.error("Failed to load moodboards"); }
  };

  const addToMoodboard = async (boardId) => {
    try {
      await API.post(`/moodboards/${boardId}/products`, { productId: id });
      toast.success("Added to moodboard!");
      setShowMbDropdown(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Already in moodboard");
    }
  };

  const handleOrder = async (e) => {
    e.preventDefault();
    if (product.category === "ready-made" && !selectedSize) {
      toast.error("Please select a size");
      return;
    }
    setOrdering(true);
    try {
      await API.post("/orders", {
        productId: product._id,
        size: selectedSize || "",
        quantity: 1,
        shippingAddress: { address: orderData.address, city: orderData.city, phone: orderData.phone },
        notes: orderData.notes || "",
      });
      toast.success("Order placed successfully!");
      setShowOrderForm(false);
      if (product.category === "customized") {
        setOrderPlacedSuccess(true);
      } else {
        navigate("/my-orders");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to place order");
    }
    setOrdering(false);
  };

  const handleWhatsAppCustomize = () => {
    const message = `Hi! I'm interested in the "${product.name}" (${product.fabricType}) from Fashion House.\n\nI would like to discuss customization options.\n\nProduct: ${product.name}\nFabric: ${product.fabricType}\nPrice: Rs. ${product.price?.toLocaleString()}`;
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank");
  };

  if (loading) return <div className="spinner" />;
  if (!product) return null;

  return (
    <div className="product-detail-page">
      <div className="container">
        <button className="fabric-back" onClick={() => navigate(-1)}>
          <HiArrowLeft /> Back
        </button>

        <div className="product-detail">
          {/* Gallery */}
          <div className="product-gallery">
            <div className="product-main-image">
              {product.images?.length > 0 ? (
                <img src={product.images[selectedImage]?.url} alt={product.name} />
              ) : (
                <div className="product-card-placeholder"><GiDress /></div>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="product-thumbnails">
                {product.images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`product-thumb ${idx === selectedImage ? "active" : ""}`}
                    onClick={() => setSelectedImage(idx)}
                  >
                    <img src={img.url} alt={`${product.name} ${idx + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="product-info">
            <span className={`product-info-category ${product.category}`}>
              {product.category}
            </span>
            <h1>{product.name}</h1>
            <div className="product-info-fabric">{product.fabricType}</div>
            <div className="product-info-price">
              Rs. {product.price?.toLocaleString()} <span>PKR</span>
            </div>

            {/* Wishlist + Moodboard actions */}
            <div style={{ display: "flex", gap: 10, margin: "14px 0" }}>
              <button
                className={`btn btn-sm ${inWishlist ? "btn-gold" : "btn-outline"}`}
                onClick={toggleWishlist}
                disabled={wishlistLoading}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                {inWishlist ? <HiHeart /> : <HiOutlineHeart />}
                {inWishlist ? "In Wishlist" : "Add to Wishlist"}
              </button>
              <div style={{ position: "relative" }}>
                <button className="btn btn-sm btn-outline" onClick={fetchMoodboards} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <HiBookmark /> Save to Moodboard
                </button>
                {showMbDropdown && (
                  <div style={{
                    position: "absolute", top: "110%", left: 0, background: "var(--bg-card)",
                    border: "1px solid var(--border)", borderRadius: 10, padding: 8, minWidth: 200,
                    zIndex: 50, boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                  }}>
                    {moodboards.length === 0 ? (
                      <div style={{ padding: 12, fontSize: "0.82rem", color: "var(--text-muted)" }}>No moodboards yet. Create one first.</div>
                    ) : (
                      moodboards.map(mb => (
                        <div key={mb._id}
                          onClick={() => addToMoodboard(mb._id)}
                          style={{
                            padding: "8px 12px", cursor: "pointer", borderRadius: 6,
                            fontSize: "0.84rem", color: "var(--text-primary)",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={e => e.target.style.background = "var(--bg-hover)"}
                          onMouseLeave={e => e.target.style.background = "transparent"}
                        >
                          {mb.name}
                        </div>
                      ))
                    )}
                    <div style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 4 }}>
                      <div
                        onClick={() => setShowMbDropdown(false)}
                        style={{ padding: "6px 12px", cursor: "pointer", fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center" }}
                      >Close</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {product.description && (
              <div className="product-info-desc">{product.description}</div>
            )}

            {/* Ready-Made: Size selector + Order */}
            {product.category === "ready-made" && (
              <>
                {product.sizes?.length > 0 && (
                  <div className="size-section">
                    <h4>Select Size</h4>
                    <div className="size-options">
                      {product.sizes.map((size) => (
                        <button
                          key={size}
                          className={`size-btn ${selectedSize === size ? "active" : ""}`}
                          onClick={() => setSelectedSize(size)}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!showOrderForm ? (
                  <button
                    className="btn btn-gold btn-lg"
                    style={{ width: "100%" }}
                    onClick={() => setShowOrderForm(true)}
                  >
                    Place Order
                  </button>
                ) : (
                  <form className="order-form" onSubmit={handleOrder}>
                    <h3>Shipping Details</h3>
                    <div className="form-group">
                      <label className="form-label">Address</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="Full address"
                        required
                        value={orderData.address}
                        onChange={(e) => setOrderData({ ...orderData, address: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="City"
                        required
                        value={orderData.city}
                        onChange={(e) => setOrderData({ ...orderData, city: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="03XX-XXXXXXX"
                        required
                        value={orderData.phone}
                        onChange={(e) => setOrderData({ ...orderData, phone: e.target.value })}
                      />
                    </div>
                    <div className="order-actions">
                      <button type="submit" className="btn btn-gold btn-lg" disabled={ordering} style={{ flex: 1 }}>
                        {ordering ? "Placing..." : "Confirm Order"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setShowOrderForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            {/* Customized: Order Form + WhatsApp CTA */}
            {product.category === "customized" && (
              <>
                {orderPlacedSuccess ? (
                  <div className="order-success-whatsapp" style={{
                    background: "rgba(76, 175, 80, 0.08)",
                    border: "1px solid rgba(76, 175, 80, 0.2)",
                    borderRadius: "var(--radius-lg)",
                    padding: 20,
                    marginTop: 15,
                    animation: "fadeInUp 0.3s ease both"
                  }}>
                    <h3 style={{ color: "#4CAF50", display: "flex", alignItems: "center", gap: 8, fontSize: "1.1rem", marginBottom: 10 }}>
                      🎉 Order Placed!
                    </h3>
                    <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
                      Your order for customized design has been created.
                      To discuss sizing, color preferences, and other customization details, please message us on WhatsApp with your order reference.
                    </p>
                    <button className="btn btn-whatsapp btn-lg" style={{ width: "100%", marginBottom: 10 }} onClick={handleWhatsAppCustomize}>
                      <FaWhatsapp /> Discuss on WhatsApp
                    </button>
                    <button className="btn btn-outline btn-lg" style={{ width: "100%" }} onClick={() => navigate("/my-orders")}>
                      View My Orders
                    </button>
                  </div>
                ) : !showOrderForm ? (
                  <div className="whatsapp-contact">
                    <p>
                      Love this design? Place your order directly to start production, and you can coordinate details with us afterward.
                    </p>
                    <button
                      className="btn btn-gold btn-lg"
                      style={{ width: "100%" }}
                      onClick={() => setShowOrderForm(true)}
                    >
                      Place Order
                    </button>
                  </div>
                ) : (
                  <form className="order-form" onSubmit={handleOrder}>
                    <h3>Order Details</h3>
                    <div className="form-group">
                      <label className="form-label">Customization Notes</label>
                      <textarea
                        className="form-textarea"
                        placeholder="Describe any customizations (size, color, fabric changes, etc.)"
                        rows={3}
                        value={orderData.notes || ""}
                        onChange={(e) => setOrderData({ ...orderData, notes: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Address</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="Full address"
                        required
                        value={orderData.address}
                        onChange={(e) => setOrderData({ ...orderData, address: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="City"
                        required
                        value={orderData.city}
                        onChange={(e) => setOrderData({ ...orderData, city: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="03XX-XXXXXXX"
                        required
                        value={orderData.phone}
                        onChange={(e) => setOrderData({ ...orderData, phone: e.target.value })}
                      />
                    </div>
                    <div className="order-actions">
                      <button type="submit" className="btn btn-gold btn-lg" disabled={ordering} style={{ flex: 1 }}>
                        {ordering ? "Placing..." : "Confirm Order"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setShowOrderForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <ReviewForm productId={id} />
      </div>
    </div>
  );
};

export default ProductDetailPage;
