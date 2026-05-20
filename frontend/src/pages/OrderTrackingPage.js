import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../utils/api";
import {
  HiArrowLeft,
  HiClock,
  HiCheckCircle,
  HiExclamationCircle,
  HiCalendar,
  HiTruck,
} from "react-icons/hi";
import { GiDress, GiSewingMachine, GiThread, GiGemChain } from "react-icons/gi";
import { toast } from "react-toastify";
import { useNotifications } from "../context/NotificationContext";
import "./OrderTrackingPage.css";

const STAGE_ICONS = {
  "Order Placed": "📋",
  "Fabric Purchased": "🧵",
  "Dyeing": "🎨",
  "Embroidery": "✨",
  "Stitching": "🪡",
  "Finishing": "💎",
  "Quality Check": "✅",
  "Delivered": "📦",
};

const OrderTrackingPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useNotifications();

  useEffect(() => {
    fetchTracking();
  }, [orderId]);

  // Listen for real-time stage updates via socket
  useEffect(() => {
    if (!socket) return;
    
    const handleNotification = (data) => {
      // If notification is about this specific order's production
      if (data.type === "production" && data.data?.orderId === orderId) {
        fetchTracking(); // re-fetch the tracking data to update UI
      }
    };

    socket.on("notification", handleNotification);
    return () => {
      socket.off("notification", handleNotification);
    };
  }, [socket, orderId]);

  const fetchTracking = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/order-tracking/order/${orderId}`);
      setTracking(data);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.info("No tracking available for this order yet");
      } else {
        toast.error("Failed to load tracking");
      }
    }
    setLoading(false);
  };

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStageStatusClass = (status) => {
    const map = {
      completed: "stage-completed",
      "in-progress": "stage-in-progress",
      pending: "stage-pending",
      skipped: "stage-skipped",
    };
    return map[status] || "stage-pending";
  };

  if (loading) return <div className="spinner" />;

  if (!tracking) {
    return (
      <div className="order-tracking-page">
        <div className="container">
          <button className="fabric-back" onClick={() => navigate("/my-orders")}>
            <HiArrowLeft /> Back to Orders
          </button>
          <div className="empty-state" style={{ marginTop: 60 }}>
            <HiTruck style={{ fontSize: "3rem" }} />
            <h3>No Tracking Available</h3>
            <p>Tracking will be available once your order enters production.</p>
            <Link to="/my-orders" className="btn btn-outline" style={{ marginTop: 16 }}>
              View My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const order = tracking.order;
  const product = order?.product;

  return (
    <div className="order-tracking-page">
      <div className="container">
        <button className="fabric-back" onClick={() => navigate("/my-orders")}>
          <HiArrowLeft /> Back to Orders
        </button>

        <div className="page-header">
          <h1 className="gradient-text">Order Tracking</h1>
          <p>Follow your order's journey from design to delivery</p>
        </div>

        {/* Order Info Card */}
        <div className="tracking-order-info">
          <div className="tracking-order-image">
            {product?.images?.[0] ? (
              <img src={product.images[0].url} alt={product.name} />
            ) : (
              <div className="tracking-placeholder"><GiDress /></div>
            )}
          </div>
          <div className="tracking-order-details">
            <h3>{product?.name || "Order"}</h3>
            <div className="tracking-order-meta">
              <span><HiCalendar /> Ordered: {formatDate(order?.createdAt)}</span>
              {tracking.estimatedCompletion && (
                <span className="tracking-estimated">
                  <HiClock /> Est. Completion: {formatDate(tracking.estimatedCompletion)}
                </span>
              )}
            </div>
            <div className="tracking-order-id">Order #{order?._id?.slice(-8).toUpperCase()}</div>
          </div>
          <div className="tracking-progress-ring">
            <svg viewBox="0 0 36 36" className="progress-circle">
              <path
                className="progress-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="progress-fill"
                strokeDasharray={`${tracking.progress}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="progress-text">{tracking.progress}%</div>
          </div>
        </div>

        {/* Current Stage Banner */}
        <div className={`tracking-current-stage ${tracking.isComplete ? "complete" : ""}`}>
          <div className="tracking-current-icon">
            {tracking.isComplete ? <HiCheckCircle /> : <GiSewingMachine />}
          </div>
          <div>
            <div className="tracking-current-label">
              {tracking.isComplete ? "Order Complete!" : "Current Stage"}
            </div>
            <div className="tracking-current-name">
              {tracking.isComplete ? "Your order has been delivered" : tracking.currentStage}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="tracking-timeline">
          {tracking.stages.map((stage, idx) => (
            <div
              key={stage.name}
              className={`tracking-stage ${getStageStatusClass(stage.status)}`}
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              <div className="tracking-stage-line">
                <div className="tracking-stage-dot">
                  {stage.status === "completed" ? (
                    <HiCheckCircle />
                  ) : stage.status === "in-progress" ? (
                    <div className="stage-pulse" />
                  ) : stage.status === "skipped" ? (
                    <HiExclamationCircle />
                  ) : (
                    <div className="stage-empty" />
                  )}
                </div>
                {idx < tracking.stages.length - 1 && (
                  <div className={`tracking-connector ${
                    stage.status === "completed" || stage.status === "skipped" ? "filled" : ""
                  }`} />
                )}
              </div>

              <div className="tracking-stage-content">
                <div className="tracking-stage-header">
                  <span className="tracking-stage-emoji">{STAGE_ICONS[stage.name]}</span>
                  <h4>{stage.name}</h4>
                  <span className={`tracking-stage-badge ${stage.status}`}>
                    {stage.status}
                  </span>
                </div>
                <div className="tracking-stage-dates">
                  {stage.startDate && <span>Started: {formatDate(stage.startDate)}</span>}
                  {stage.completedDate && <span>Completed: {formatDate(stage.completedDate)}</span>}
                </div>
                {stage.notes && (
                  <div className="tracking-stage-notes">{stage.notes}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingPage;
