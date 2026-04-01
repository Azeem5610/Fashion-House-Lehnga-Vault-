import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import { HiArrowLeft, HiCube, HiPhotograph, HiCalendar } from "react-icons/hi";
import { GiDress } from "react-icons/gi";
import "./MyOrdersPage.css";

const MyOrdersPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [designReqs, setDesignReqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, designRes] = await Promise.all([
        API.get("/orders/my"),
        API.get("/design-requests/my"),
      ]);
      setOrders(ordersRes.data);
      setDesignReqs(designRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const getStatusClass = (status) => {
    return `badge badge-${status}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="my-orders-page">
      <div className="container">
        <button className="fabric-back" onClick={() => navigate("/")}>
          <HiArrowLeft /> Back to Home
        </button>

        <div className="page-header">
          <h1 className="gradient-text">My Orders</h1>
          <p>Track your orders and design requests</p>
        </div>

        <div className="orders-tabs">
          <button
            className={`orders-tab ${tab === "orders" ? "active" : ""}`}
            onClick={() => setTab("orders")}
          >
            Orders ({orders.length})
          </button>
          <button
            className={`orders-tab ${tab === "designs" ? "active" : ""}`}
            onClick={() => setTab("designs")}
          >
            Design Requests ({designReqs.length})
          </button>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : tab === "orders" ? (
          <div className="order-list">
            {orders.length === 0 ? (
              <div className="empty-state">
                <GiDress style={{ fontSize: '3rem' }} />
                <h3>No orders yet</h3>
                <p>Browse our collection and place your first order!</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order._id} className="order-card">
                  <div className="order-card-image">
                    {order.product?.images?.[0] ? (
                      <img src={order.product.images[0].url} alt={order.product.name} />
                    ) : (
                      <div className="product-card-placeholder" style={{ height: '100%' }}>
                        <GiDress />
                      </div>
                    )}
                  </div>
                  <div className="order-card-details">
                    <h3>{order.product?.name || "Product"}</h3>
                    <div className="order-meta">
                      <span><HiCube /> Size: {order.size}</span>
                      <span><HiCalendar /> {formatDate(order.createdAt)}</span>
                    </div>
                    <div className="order-meta">
                      <span>📍 {order.shippingAddress?.city}</span>
                    </div>
                  </div>
                  <div className="order-card-right">
                    <span className={getStatusClass(order.status)}>{order.status}</span>
                    <div className="order-price">Rs. {order.totalPrice?.toLocaleString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="order-list">
            {designReqs.length === 0 ? (
              <div className="empty-state">
                <HiPhotograph style={{ fontSize: '3rem' }} />
                <h3>No design requests yet</h3>
                <p>Upload a reference image to get started!</p>
              </div>
            ) : (
              designReqs.map((req) => (
                <div key={req._id} className="design-req-card">
                  <div className="design-req-images">
                    {req.images?.map((img, idx) => (
                      <img key={idx} src={img.url} alt={`Design ${idx + 1}`} />
                    ))}
                  </div>
                  <div className="design-req-info">
                    <div>
                      <p>{req.description || "No description provided"}</p>
                      <div className="design-req-type">
                        {req.requestType === "exact-copy" ? "Exact Copy" : "With Customizations"}
                        {" · "}
                        {formatDate(req.createdAt)}
                      </div>
                    </div>
                    <span className={getStatusClass(req.status)}>{req.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrdersPage;
