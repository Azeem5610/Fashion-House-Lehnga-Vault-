import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import {
  HiShoppingCart, HiCurrencyDollar, HiCube, HiUserGroup,
  HiCalendar, HiTrendingUp, HiExclamation, HiChartBar,
  HiClipboardCheck, HiStar, HiCollection, HiClock, HiPhotograph,
} from "react-icons/hi";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import "./AdminDashboard.css";

const CHART_COLORS = ["#D4A843", "#8B5CF6", "#10B981", "#F59E0B", "#60A5FA", "#EC4899", "#F87171"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1A1A24", border: "1px solid rgba(212,168,67,0.2)",
      borderRadius: 8, padding: "10px 14px", boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
    }}>
      <p style={{ color: "#A8A3B3", fontSize: "0.75rem", marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 700, fontSize: "0.9rem" }}>
          {p.name}: {typeof p.value === "number" && p.name.toLowerCase().includes("revenue")
            ? `Rs ${p.value.toLocaleString()}`
            : p.value}
        </p>
      ))}
    </div>
  );
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [productionData, setProductionData] = useState([]);
  const [topFabrics, setTopFabrics] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [erpOverview, setErpOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [statsRes, revenueRes, productionRes, fabricsRes, ordersRes, erpRes] = await Promise.allSettled([
          API.get("/analytics/dashboard"),
          API.get("/analytics/monthly-revenue"),
          API.get("/analytics/production"),
          API.get("/analytics/top-fabrics"),
          API.get("/analytics/recent-orders"),
          API.get("/analytics/erp-overview"),
        ]);
        if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
        if (revenueRes.status === "fulfilled") setMonthlyRevenue(revenueRes.value.data);
        if (productionRes.status === "fulfilled") setProductionData(productionRes.value.data);
        if (fabricsRes.status === "fulfilled") setTopFabrics(fabricsRes.value.data);
        if (ordersRes.status === "fulfilled") setRecentOrders(ordersRes.value.data);
        if (erpRes.status === "fulfilled") setErpOverview(erpRes.value.data);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
      setLoading(false);
    };
    fetchDashboard();
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  if (loading) return <div className="spinner" />;

  return (
    <div>
      {/* Welcome Banner */}
      <div className="dash-welcome">
        <div className="dash-welcome-content">
          <h1>Welcome back, <span>{user?.name?.split(" ")[0] || "Admin"}</span></h1>
          <p>Here's what's happening with your bridal business today.</p>
          <div className="dash-welcome-date">
            <HiCalendar /> {today}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-stats">
        <div className="dash-stat-card">
          <div className="dash-stat-header">
            <div className="dash-stat-icon gold"><HiShoppingCart /></div>
          </div>
          <div className="dash-stat-value">{stats?.totalOrders || 0}</div>
          <div className="dash-stat-label">Total Orders</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-header">
            <div className="dash-stat-icon purple"><HiCurrencyDollar /></div>
          </div>
          <div className="dash-stat-value">Rs {(stats?.totalRevenue || 0).toLocaleString()}</div>
          <div className="dash-stat-label">Total Revenue</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-header">
            <div className="dash-stat-icon green"><HiCube /></div>
          </div>
          <div className="dash-stat-value">{stats?.totalProducts || 0}</div>
          <div className="dash-stat-label">Products</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-header">
            <div className="dash-stat-icon orange"><HiUserGroup /></div>
          </div>
          <div className="dash-stat-value">{stats?.totalCustomers || 0}</div>
          <div className="dash-stat-label">Customers</div>
        </div>
      </div>

      {/* ERP Activity Panel */}
      {erpOverview && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: 14, color: "var(--text-primary)" }}>ERP Activity</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
            {[
              { label: "In Production", value: erpOverview.inProgressTracking, icon: <HiClock />, color: "#C2185B", link: "/admin/order-tracking" },
              { label: "Overdue Orders", value: erpOverview.overdueTracking, icon: <HiExclamation />, color: "#EF4444", link: "/admin/order-tracking" },
              { label: "Design Requests", value: erpOverview.pendingDesignRequests, icon: <HiPhotograph />, color: "#9C27B0", link: "/admin/design-requests" },
              { label: "Appointments", value: erpOverview.pendingAppointments, icon: <HiCalendar />, color: "#3B82F6", link: "/admin/appointments" },
              { label: "Low Stock Items", value: erpOverview.lowStockCount, icon: <HiCollection />, color: "#F59E0B", link: "/admin/inventory" },
              { label: "Pending Reviews", value: erpOverview.pendingReviews, icon: <HiStar />, color: "#FF8F00", link: "/admin/reviews" },
              { label: "Active Tasks", value: erpOverview.activeEmployeeTasks, icon: <HiClipboardCheck />, color: "#00897B", link: "/admin/employees" },
              { label: "Avg Rating", value: `${erpOverview.averageRating} ★`, icon: <HiStar />, color: "#D4A843", link: "/admin/reviews" },
            ].map((item, i) => (
              <Link key={i} to={item.link} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10,
                textDecoration: "none", transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                  background: `${item.color}15`, color: item.color, fontSize: "1.1rem",
                }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>{item.value}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", letterSpacing: "0.02em" }}>{item.label}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="dashboard-grid">
        {/* Revenue Chart */}
        <div className="dash-chart-card">
          <div className="dash-chart-header">
            <div>
              <div className="dash-chart-title">Monthly Revenue</div>
              <div className="dash-chart-subtitle">Revenue trend for {new Date().getFullYear()}</div>
            </div>
            <HiTrendingUp style={{ color: "var(--gold)", fontSize: "1.2rem" }} />
          </div>
          {monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#6B6680" fontSize={12} tickLine={false} />
                <YAxis stroke="#6B6680" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#D4A843"
                  strokeWidth={2.5} dot={{ fill: "#D4A843", r: 4 }}
                  activeDot={{ r: 6, fill: "#D4A843", stroke: "#1A1A24", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="dash-chart-empty"><HiChartBar /> No revenue data yet</div>
          )}
        </div>

        {/* Order Status Pie */}
        <div className="dash-chart-card">
          <div className="dash-chart-header">
            <div>
              <div className="dash-chart-title">Order Status</div>
              <div className="dash-chart-subtitle">Distribution by current status</div>
            </div>
          </div>
          {productionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={productionData} dataKey="count" nameKey="status" cx="50%" cy="50%"
                  outerRadius={100} innerRadius={55} paddingAngle={3} strokeWidth={0}
                  label={({ status, count }) => `${status} (${count})`}
                >
                  {productionData.map((entry, i) => (
                    <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="dash-chart-empty"><HiChartBar /> No order data yet</div>
          )}
        </div>
      </div>

      {/* Top Fabrics + Recent Orders */}
      <div className="dashboard-grid">
        {/* Top Fabrics */}
        <div className="dash-chart-card">
          <div className="dash-chart-header">
            <div>
              <div className="dash-chart-title">Top Fabrics</div>
              <div className="dash-chart-subtitle">Most used fabric types</div>
            </div>
          </div>
          {topFabrics.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topFabrics} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#6B6680" fontSize={12} tickLine={false} />
                <YAxis type="category" dataKey="fabric" stroke="#6B6680" fontSize={11}
                  width={100} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Products" radius={[0, 6, 6, 0]} barSize={20}>
                  {topFabrics.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="dash-chart-empty"><HiChartBar /> No fabric data yet</div>
          )}
        </div>

        {/* Pending / Alerts */}
        <div className="dash-chart-card">
          <div className="dash-chart-header">
            <div>
              <div className="dash-chart-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Quick Stats <HiExclamation style={{ color: "var(--warning)" }} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.12)", borderRadius: 10, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 4 }}>Pending Orders</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#FBBF24", fontFamily: "var(--font-heading)" }}>{stats?.pendingOrders || 0}</div>
              </div>
              <HiShoppingCart style={{ fontSize: "2rem", color: "rgba(251,191,36,0.3)" }} />
            </div>
            <div style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.12)", borderRadius: 10, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 4 }}>Orders This Week</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#60A5FA", fontFamily: "var(--font-heading)" }}>{stats?.recentOrders || 0}</div>
              </div>
              <HiTrendingUp style={{ fontSize: "2rem", color: "rgba(96,165,250,0.3)" }} />
            </div>
            <div style={{ background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.12)", borderRadius: 10, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 4 }}>Total Vendors</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--gold)", fontFamily: "var(--font-heading)" }}>{stats?.totalVendors || 0}</div>
              </div>
              <HiUserGroup style={{ fontSize: "2rem", color: "rgba(212,168,67,0.3)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="dash-orders-card" style={{ marginTop: 0 }}>
        <div className="dash-orders-header">
          <h3>Recent Orders</h3>
          <Link to="/admin/orders">View All</Link>
        </div>
        {recentOrders.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table className="dash-orders-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.slice(0, 6).map((order) => (
                  <tr key={order._id}>
                    <td>
                      <div className="dash-order-customer">
                        <div className="dash-order-avatar">
                          {order.user?.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="dash-order-name">{order.user?.name || "Unknown"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="dash-order-product">
                        {order.product?.images?.[0] && (
                          <img className="dash-order-product-img" src={order.product.images[0].url} alt="" />
                        )}
                        <span>{order.product?.name || "—"}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      Rs {order.totalPrice?.toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge badge-${order.status}`}>
                        <span className={`status-dot ${order.status}`} />
                        {order.status}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dash-chart-empty" style={{ padding: 40 }}>No orders yet</div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
