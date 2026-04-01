import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { HiArrowLeft } from "react-icons/hi";
import { FaWhatsapp } from "react-icons/fa";
import { GiDress } from "react-icons/gi";
import { toast } from "react-toastify";
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
  const [orderData, setOrderData] = useState({ address: "", city: "", phone: "" });
  const [ordering, setOrdering] = useState(false);

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

  const handleOrder = async (e) => {
    e.preventDefault();
    if (!selectedSize) {
      toast.error("Please select a size");
      return;
    }
    setOrdering(true);
    try {
      await API.post("/orders", {
        productId: product._id,
        size: selectedSize,
        quantity: 1,
        shippingAddress: orderData,
      });
      toast.success("Order placed successfully!");
      setShowOrderForm(false);
      navigate("/my-orders");
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

            {/* Customized: WhatsApp CTA */}
            {product.category === "customized" && (
              <div className="whatsapp-contact">
                <p>
                  Love this design? Contact us on WhatsApp to discuss customizations
                  like size, color, fabric, design modifications, and more.
                </p>
                <button className="btn btn-whatsapp btn-lg" onClick={handleWhatsAppCustomize}>
                  <FaWhatsapp /> Order via WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
