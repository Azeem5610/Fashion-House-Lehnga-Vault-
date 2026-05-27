import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../utils/api";
import { toast } from "react-toastify";
import { HiShoppingCart, HiLocationMarker, HiPhone, HiChevronRight, HiCheckCircle } from "react-icons/hi";
import { GiDiamondRing } from "react-icons/gi";
import "./CheckoutPage.css";

const CheckoutPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("safepay");

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await API.get(`/orders/${orderId}`);
        setOrder(data);
        if (data.paymentMethod) {
          setPaymentMethod(data.paymentMethod);
        }
        // If order is already completed, redirect immediately
        if (data.paymentStatus === "completed") {
          toast.info("This order has already been paid.");
          navigate(`/payment-status/${orderId}`);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load order details");
        navigate("/my-orders");
      }
      setLoading(false);
    };
    fetchOrder();
  }, [orderId, navigate]);

  const handleConfirmOrder = async () => {
    setProcessing(true);
    try {
      if (paymentMethod === "safepay") {
        // Hit retry/payment session creation API to ensure we have a valid, active checkout session
        const { data } = await API.post(`/payments/retry/${orderId}`);
        if (data.checkoutUrl) {
          toast.info("Redirecting to SafePay secure payment portal...");
          // Delay redirect slightly for premium UX feel
          setTimeout(() => {
            window.location.href = data.checkoutUrl;
          }, 1200);
        } else {
          throw new Error("Unable to obtain checkout URL");
        }
      } else {
        // Confirm COD order via backend
        await API.post(`/payments/cod/${orderId}`);
        toast.success("Order confirmed on Cash on Delivery! 🎉");
        setTimeout(() => {
          navigate(`/payment-status/${orderId}`);
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to initiate payment session");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="checkout-loading-container">
        <div className="checkout-spinner" />
        <p>Preparing secure checkout...</p>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="checkout-page-container">
      <div className="checkout-glass-card">
        {/* Header */}
        <div className="checkout-header">
          <div className="checkout-logo">
            <GiDiamondRing />
          </div>
          <h1>Secure Checkout</h1>
          <p className="checkout-subtitle">Lehnga Vault — Complete Your Order</p>
        </div>

        <div className="checkout-grid">
          {/* Left Column: Summary */}
          <div className="checkout-summary-section">
            <h2 className="section-title">
              <HiShoppingCart /> Order Summary
            </h2>
            <div className="checkout-product-card">
              <div className="product-image-wrapper">
                {order.product?.images?.[0] ? (
                  <img src={order.product.images[0].url} alt={order.product.name} />
                ) : (
                  <div className="product-image-placeholder">No Image</div>
                )}
              </div>
              <div className="product-details-wrapper">
                <h3>{order.product?.name}</h3>
                <span className={`category-badge ${order.product?.category}`}>
                  {order.product?.category}
                </span>
                <p className="product-size">Size: <strong>{order.size || "Standard / Customize Later"}</strong></p>
                <p className="product-qty">Qty: <strong>{order.quantity || 1}</strong></p>
              </div>
            </div>

            <div className="checkout-divider" />

            {/* Price breakdown */}
            <div className="price-breakdown">
              <div className="price-row">
                <span>Subtotal</span>
                <span>Rs. {order.totalPrice?.toLocaleString()}</span>
              </div>
              <div className="price-row">
                <span>Shipping</span>
                <span className="free-shipping">FREE</span>
              </div>
              <div className="price-row total-row">
                <span>Total Amount</span>
                <span>Rs. {order.totalPrice?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Payment & Shipping */}
          <div className="checkout-payment-section">
            <h2 className="section-title">
              <HiLocationMarker /> Shipping Details
            </h2>
            <div className="shipping-details-card">
              <p className="shipping-address">
                <strong>Address:</strong> {order.shippingAddress?.address}
              </p>
              <p className="shipping-city">
                <strong>City:</strong> {order.shippingAddress?.city}
              </p>
              <p className="shipping-phone">
                <HiPhone /> {order.shippingAddress?.phone}
              </p>
            </div>

            <h2 className="section-title" style={{ marginTop: "24px" }}>
              Payment Method
            </h2>

            <div
              className={`payment-method-card ${paymentMethod === "safepay" ? "active" : ""}`}
              onClick={() => setPaymentMethod("safepay")}
              style={{ marginBottom: "12px" }}
            >
              <div className="payment-method-header">
                <HiCheckCircle className="checked-icon" style={{ opacity: paymentMethod === "safepay" ? 1 : 0.2 }} />
                <span className="payment-method-name">SafePay Payment Gateway</span>
              </div>
              <p className="payment-method-desc">
                Pay securely via Credit/Debit card or mobile wallets using SafePay sandbox.
              </p>
            </div>

            <div
              className={`payment-method-card ${paymentMethod === "cod" ? "active" : ""}`}
              onClick={() => setPaymentMethod("cod")}
              style={{ marginBottom: "20px" }}
            >
              <div className="payment-method-header">
                <HiCheckCircle className="checked-icon" style={{ opacity: paymentMethod === "cod" ? 1 : 0.2 }} />
                <span className="payment-method-name">Cash on Delivery (COD)</span>
              </div>
              <p className="payment-method-desc">
                Pay with cash when your gorgeous lehnga is delivered to your doorstep.
              </p>
            </div>

            <button
              className={`btn btn-gold btn-checkout-action ${processing ? "processing" : ""}`}
              onClick={handleConfirmOrder}
              disabled={processing}
            >
              {processing ? (
                <>
                  <span className="spinner-small" /> Finalizing Order...
                </>
              ) : paymentMethod === "safepay" ? (
                <>
                  Pay Securely Rs. {order.totalPrice?.toLocaleString()} <HiChevronRight />
                </>
              ) : (
                <>
                  Confirm Cash on Delivery <HiChevronRight />
                </>
              )}
            </button>
            <p className="checkout-security-notice">
              🔒 Your connection is encrypted. Powered by Lehnga Vault checkout engine.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
