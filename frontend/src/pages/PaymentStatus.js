import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import API from "../utils/api";
import { toast } from "react-toastify";
import { HiCheckCircle, HiXCircle, HiClock, HiExclamationCircle, HiChevronRight, HiShoppingBag } from "react-icons/hi";
import "./PaymentStatus.css";

const PaymentStatus = () => {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("verifying"); // verifying, completed, failed, expired, pending
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const verifyPayment = async () => {
      const sig = searchParams.get("sig");
      const tracker = searchParams.get("tracker");

      try {
        // Construct query string if redirect parameters exist
        let url = `/payments/verify/${orderId}`;
        if (sig && tracker) {
          url += `?sig=${encodeURIComponent(sig)}&tracker=${encodeURIComponent(tracker)}`;
        }

        const { data } = await API.get(url);
        
        setStatus(data.payment?.status || "pending");
        setPaymentDetails(data.payment);
        setOrderDetails(data.order);

        if (data.payment?.status === "completed") {
          toast.success("Payment verified successfully! 🎉");
        } else if (data.payment?.status === "failed") {
          toast.error("Payment attempt failed.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Error verifying payment signature");
        setStatus("failed");
      }
    };

    verifyPayment();
  }, [orderId, searchParams]);

  const handleRetryPayment = async () => {
    setRetrying(true);
    try {
      const { data } = await API.post(`/payments/retry/${orderId}`);
      if (data.checkoutUrl) {
        toast.info("Opening new secure payment session...");
        setTimeout(() => {
          window.location.href = data.checkoutUrl;
        }, 1000);
      } else {
        throw new Error("Unable to create payment retry session");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to retry payment");
      setRetrying(false);
    }
  };

  const renderStatusContent = () => {
    switch (status) {
      case "verifying":
        return (
          <div className="status-card-inner verifying">
            <div className="status-spinner" />
            <h2>Verifying Transaction</h2>
            <p>Please wait while we verify your payment signature with SafePay securely...</p>
          </div>
        );
      case "completed":
        return (
          <div className="status-card-inner success-state">
            <HiCheckCircle className="status-icon success" />
            <h2>Payment Successful!</h2>
            <p className="status-message">
              Thank you! Your payment of <strong>Rs. {paymentDetails?.amount?.toLocaleString()}</strong> was processed successfully.
            </p>
            <div className="details-box">
              <div className="detail-row">
                <span>Transaction ID:</span>
                <span className="mono">{paymentDetails?.transactionId || paymentDetails?.safepayTracker}</span>
              </div>
              <div className="detail-row">
                <span>Payment Method:</span>
                <span>{paymentDetails?.paymentMethod?.toUpperCase() || "Card"}</span>
              </div>
              <div className="detail-row">
                <span>Order Status:</span>
                <span className="badge-confirmed">Confirmed</span>
              </div>
            </div>
            <div className="status-actions">
              <button className="btn btn-gold" onClick={() => navigate("/my-orders")}>
                <HiShoppingBag /> View My Orders
              </button>
            </div>
          </div>
        );
      case "failed":
        return (
          <div className="status-card-inner error-state">
            <HiXCircle className="status-icon error" />
            <h2>Payment Failed</h2>
            <p className="status-message">
              We couldn't process your payment. This could be due to insufficient funds, an invalid card number, or cancellation.
            </p>
            <div className="status-actions">
              <button className="btn btn-gold" onClick={handleRetryPayment} disabled={retrying}>
                {retrying ? "Creating Session..." : "Try Payment Again"} <HiChevronRight />
              </button>
              <button className="btn btn-outline" onClick={() => navigate("/my-orders")}>
                Go to Orders
              </button>
            </div>
          </div>
        );
      case "expired":
        return (
          <div className="status-card-inner warning-state">
            <HiExclamationCircle className="status-icon warning" />
            <h2>Checkout Session Expired</h2>
            <p className="status-message">
              The secure checkout session has expired because it wasn't completed within 30 minutes.
            </p>
            <div className="status-actions">
              <button className="btn btn-gold" onClick={handleRetryPayment} disabled={retrying}>
                {retrying ? "Creating Session..." : "Start New Payment"} <HiChevronRight />
              </button>
              <button className="btn btn-outline" onClick={() => navigate("/my-orders")}>
                Go to Orders
              </button>
            </div>
          </div>
        );
      case "refunded":
        return (
          <div className="status-card-inner info-state">
            <HiExclamationCircle className="status-icon info" style={{ color: "#d97706" }} />
            <h2>Payment Refunded</h2>
            <p className="status-message">
              Your payment of <strong>Rs. {paymentDetails?.amount?.toLocaleString()}</strong> has been fully refunded.
            </p>
            {paymentDetails?.refund && (
              <div className="details-box">
                <div className="detail-row">
                  <span>Refund Reason:</span>
                  <span>{paymentDetails.refund.reason || "N/A"}</span>
                </div>
                <div className="detail-row">
                  <span>Refund Date:</span>
                  <span>{new Date(paymentDetails.refund.refundedAt).toLocaleDateString()}</span>
                </div>
              </div>
            )}
            <div className="status-actions">
              <button className="btn btn-gold" onClick={() => navigate("/my-orders")}>
                View My Orders
              </button>
            </div>
          </div>
        );
      case "verification-failed":
        return (
          <div className="status-card-inner error-state">
            <HiXCircle className="status-icon error" />
            <h2>Verification Failed</h2>
            <p className="status-message">
              The signature or token verified from SafePay does not match. If you completed payment but see this error, please contact customer support.
            </p>
            <div className="status-actions">
              <button className="btn btn-gold" onClick={handleRetryPayment} disabled={retrying}>
                {retrying ? "Creating Session..." : "Retry Payment Session"} <HiChevronRight />
              </button>
              <button className="btn btn-outline" onClick={() => navigate("/my-orders")}>
                Go to Orders
              </button>
            </div>
          </div>
        );
      case "cod_pending":
        return (
          <div className="status-card-inner success-state">
            <HiCheckCircle className="status-icon success" style={{ color: "var(--gold)" }} />
            <h2>Order Placed Successfully!</h2>
            <p className="status-message">
              Thank you! Your order has been registered using <strong>Cash on Delivery (COD)</strong>.
            </p>
            <div className="details-box">
              <div className="detail-row">
                <span>Amount to Pay:</span>
                <strong>Rs. {orderDetails?.totalPrice?.toLocaleString() || paymentDetails?.amount?.toLocaleString()}</strong>
              </div>
              <div className="detail-row">
                <span>Payment Method:</span>
                <span>Cash on Delivery (COD)</span>
              </div>
              <div className="detail-row">
                <span>Order Status:</span>
                <span className="badge-confirmed" style={{ background: "rgba(245,127,23,0.08)", color: "#F57F17", border: "1px solid rgba(245,127,23,0.15)", borderRadius: "50px", padding: "4px 12px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>Pending Confirmation</span>
              </div>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "14px", lineHeight: "1.4" }}>
              Our team will contact you shortly to confirm your delivery details before dispatching your package.
            </p>
            <div className="status-actions" style={{ marginTop: "20px" }}>
              <button className="btn btn-gold" onClick={() => navigate("/my-orders")}>
                <HiShoppingBag /> View My Orders
              </button>
            </div>
          </div>
        );
      default: // pending
        return (
          <div className="status-card-inner pending-state">
            <HiClock className="status-icon pending" />
            <h2>Payment Awaiting Processing</h2>
            <p className="status-message">
              We are waiting for the final response from SafePay. It might take a few moments to sync.
            </p>
            <div className="details-box">
              <p className="pending-text">
                If you have completed the payment, your order tracking dashboard will update shortly.
              </p>
            </div>
            <div className="status-actions">
              <button className="btn btn-gold" onClick={() => navigate("/my-orders")}>
                Go to My Orders
              </button>
              <button className="btn btn-outline" onClick={() => window.location.reload()}>
                Refresh Status
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="payment-status-container">
      <div className="status-glass-card">
        {renderStatusContent()}
      </div>
    </div>
  );
};

export default PaymentStatus;
