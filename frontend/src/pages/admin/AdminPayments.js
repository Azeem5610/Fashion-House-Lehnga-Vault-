import React, { useEffect, useState } from "react";
import API from "../../utils/api";
import { toast } from "react-toastify";
import { HiSearch, HiRefresh, HiDownload, HiCalendar, HiX, HiCurrencyDollar, HiCheckCircle, HiReceiptTax } from "react-icons/hi";
import { GiDress } from "react-icons/gi";
import "./AdminPayments.css";

const STATUSES = ["all", "pending", "completed", "failed", "expired", "refunded"];

const STATUS_COLORS = {
  pending: { bg: "rgba(245,127,23,0.08)", color: "#F57F17", border: "rgba(245,127,23,0.15)" },
  completed: { bg: "rgba(46,125,50,0.08)", color: "#2E7D32", border: "rgba(46,125,50,0.15)" },
  failed: { bg: "rgba(211,47,47,0.08)", color: "#D32F2F", border: "rgba(211,47,47,0.15)" },
  expired: { bg: "rgba(121,85,72,0.08)", color: "#795548", border: "rgba(121,85,72,0.15)" },
  refunded: { bg: "rgba(156,39,176,0.08)", color: "#9C27B0", border: "rgba(156,39,176,0.15)" },
};

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, [status, dateFrom, dateTo, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = {
        status,
        dateFrom,
        dateTo,
        searchQuery: searchText,
        page,
        limit: 15,
      };
      const { data } = await API.get("/payments", { params });
      setPayments(data.payments);
      setAnalytics(data.analytics);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load payments history");
    }
    setLoading(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPayments();
  };

  const handleExportCSV = () => {
    if (payments.length === 0) {
      toast.info("No data to export");
      return;
    }

    const headers = ["Payment ID", "Tracker", "Order ID", "Customer", "Email", "Amount", "Status", "Created At"];
    const rows = payments.map((p) => [
      p._id,
      p.safepayTracker,
      p.order?._id,
      p.order?.user?.name || "—",
      p.order?.user?.email || "—",
      p.amount,
      p.status,
      new Date(p.createdAt).toLocaleString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payments_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProcessRefund = async (e) => {
    e.preventDefault();
    if (!refundReason) {
      toast.error("Refund reason is required");
      return;
    }
    setRefunding(true);
    try {
      await API.post("/payments/refund", {
        orderId: selectedPayment.order?._id,
        amount: refundAmount ? parseFloat(refundAmount) : undefined,
        reason: refundReason,
      });
      toast.success("Refund processed successfully!");
      setShowRefundModal(false);
      setSelectedPayment(null);
      setRefundReason("");
      setRefundAmount("");
      fetchPayments();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to process refund");
    }
    setRefunding(false);
  };

  const getStatusStyle = (st) => {
    const colorStyle = STATUS_COLORS[st] || { bg: "rgba(0,0,0,0.05)", color: "#000", border: "rgba(0,0,0,0.1)" };
    return {
      background: colorStyle.bg,
      color: colorStyle.color,
      border: `1px solid ${colorStyle.border}`,
      padding: "4px 12px",
      borderRadius: "50px",
      fontSize: "0.72rem",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.04em",
    };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="admin-payments-container">
      {/* Page Title */}
      <div className="admin-page-header">
        <h1 className="gradient-text">Payments Dashboard</h1>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={handleExportCSV}>
            <HiDownload /> Export CSV
          </button>
          <button className="btn btn-gold" onClick={fetchPayments}>
            <HiRefresh /> Sync Transactions
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="analytics-grid">
          <div className="analytics-card">
            <div className="card-icon revenue">
              <HiCurrencyDollar />
            </div>
            <div className="card-info">
              <h3>Total Revenue</h3>
              <p className="value">Rs. {analytics.totalRevenue?.toLocaleString()}</p>
              <p className="subtitle">From completed transactions</p>
            </div>
          </div>
          <div className="analytics-card">
            <div className="card-icon success-rate">
              <HiCheckCircle />
            </div>
            <div className="card-info">
              <h3>Success Rate</h3>
              <p className="value">{analytics.successRate}%</p>
              <p className="subtitle">Payment confirmation index</p>
            </div>
          </div>
          <div className="analytics-card">
            <div className="card-icon transaction-count">
              <HiReceiptTax />
            </div>
            <div className="card-info">
              <h3>Transaction Counts</h3>
              <div className="mini-stats">
                <span className="badge-stat completed">C: {analytics.completedCount}</span>
                <span className="badge-stat pending">P: {analytics.pendingCount}</span>
                <span className="badge-stat refunded">R: {analytics.refundedCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar / Filters */}
      <div className="admin-toolbar">
        <form className="search-box" onSubmit={handleSearchSubmit}>
          <HiSearch className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search by Tracker, Customer, Order ID..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </form>

        <div className="filter-group">
          <div className="date-inputs">
            <div className="date-input-wrap">
              <HiCalendar />
              <input type="date" className="form-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <span className="date-divider">to</span>
            <div className="date-input-wrap">
              <HiCalendar />
              <input type="date" className="form-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          <select className="form-select status-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((st) => (
              <option key={st} value={st}>
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="spinner-container">
          <div className="spinner" />
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Payment Reference</th>
                <th>Order Reference</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-records-cell">
                    No transactions found matching your criteria.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p._id} className="payment-row">
                    <td>
                      <div className="tracker-text">#{p.safepayTracker?.slice(-8).toUpperCase() || "—"}</div>
                      <div className="id-subtext">{p._id}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {p.order?.product?.images?.[0] ? (
                          <img src={p.order.product.images[0].url} alt="" className="admin-table-image" />
                        ) : (
                          <GiDress className="placeholder-dress-icon" />
                        )}
                        <div>
                          <div className="product-name-cell">{p.order?.product?.name || "Product Deleted"}</div>
                          <div className="id-subtext">Order: #{p.order?._id?.slice(-6).toUpperCase()}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="customer-name">{p.order?.user?.name || "Anonymous"}</div>
                      <div className="id-subtext">{p.order?.user?.email || "No Email"}</div>
                    </td>
                    <td className="amount-cell">Rs. {p.amount?.toLocaleString()}</td>
                    <td className="date-cell">{formatDate(p.createdAt)}</td>
                    <td>
                      <span style={getStatusStyle(p.status)}>{p.status}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline detail-btn"
                        onClick={() => setSelectedPayment(p)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button className="btn btn-sm btn-outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span className="pagination-text">
            Page <strong>{page}</strong> of {totalPages}
          </span>
          <button className="btn btn-sm btn-outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}

      {/* Details Modal */}
      {selectedPayment && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Transaction Details</h2>
              <button className="close-btn" onClick={() => setSelectedPayment(null)}>
                <HiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="details-summary-grid">
                <div className="info-block">
                  <span className="label">Payment ID:</span>
                  <span className="value mono">{selectedPayment._id}</span>
                </div>
                <div className="info-block">
                  <span className="label">SafePay Tracker:</span>
                  <span className="value mono">{selectedPayment.safepayTracker}</span>
                </div>
                <div className="info-block">
                  <span className="label">Transaction ID:</span>
                  <span className="value mono">{selectedPayment.transactionId || "N/A"}</span>
                </div>
                <div className="info-block">
                  <span className="label">Payment Status:</span>
                  <span className="value">
                    <span style={getStatusStyle(selectedPayment.status)}>{selectedPayment.status}</span>
                  </span>
                </div>
              </div>

              {selectedPayment.status === "completed" && (
                <div className="refund-trigger-box">
                  <p>Would you like to initiate a refund for this transaction?</p>
                  <button className="btn btn-gold btn-refund" onClick={() => setShowRefundModal(true)}>
                    Process Refund
                  </button>
                </div>
              )}

              {selectedPayment.status === "refunded" && selectedPayment.refund && (
                <div className="refund-info-box">
                  <h3>Refund Information</h3>
                  <div className="info-block">
                    <span className="label">Refund ID:</span>
                    <span className="value mono">{selectedPayment.refund.refundId}</span>
                  </div>
                  <div className="info-block">
                    <span className="label">Amount Refunded:</span>
                    <span className="value">Rs. {selectedPayment.refund.amount?.toLocaleString()}</span>
                  </div>
                  <div className="info-block">
                    <span className="label">Reason:</span>
                    <span className="value">{selectedPayment.refund.reason}</span>
                  </div>
                  <div className="info-block">
                    <span className="label">Date Refunded:</span>
                    <span className="value">{formatDate(selectedPayment.refund.refundedAt)}</span>
                  </div>
                </div>
              )}

              <div className="webhook-events-section">
                <h3>Webhook Activity Stream</h3>
                {selectedPayment.webhookEvents?.length === 0 ? (
                  <p className="no-events-text">No webhook logs captured yet.</p>
                ) : (
                  <div className="events-list">
                    {selectedPayment.webhookEvents?.map((evt, idx) => (
                      <div key={idx} className="event-item">
                        <div className="event-header">
                          <span className="event-type">{evt.eventType}</span>
                          <span className="event-date">{formatDate(evt.receivedAt)}</span>
                        </div>
                        <pre className="event-payload">{JSON.stringify(evt.payload, null, 2)}</pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="modal-overlay nested">
          <div className="modal-card small">
            <div className="modal-header">
              <h2>Initiate SafePay Refund</h2>
              <button className="close-btn" onClick={() => setShowRefundModal(false)}>
                <HiX />
              </button>
            </div>
            <form onSubmit={handleProcessRefund}>
              <div className="modal-body">
                <p className="refund-caution-text">
                  ⚠️ This action will request a refund from SafePay sandbox and cancel the associated order.
                </p>
                <div className="form-group">
                  <label className="form-label">Refund Amount (Optional)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder={`Full amount: Rs. ${selectedPayment?.amount?.toLocaleString()}`}
                    max={selectedPayment?.amount}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                  />
                  <span className="form-help-text">Leave blank to issue a full refund.</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Reason for Refund</label>
                  <textarea
                    className="form-textarea"
                    required
                    rows="3"
                    placeholder="Enter reason (e.g., Customer cancellation, fabric out of stock)"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowRefundModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold" disabled={refunding}>
                  {refunding ? "Processing..." : "Confirm Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
