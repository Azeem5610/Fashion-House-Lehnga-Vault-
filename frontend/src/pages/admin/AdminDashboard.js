import React, { useEffect, useState } from "react";
import API from "../../utils/api";
import { HiCube, HiShoppingCart, HiPhotograph, HiUserGroup } from "react-icons/hi";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ products: 0, orders: 0, designs: 0, vendors: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [products, orders, designs, vendors] = await Promise.all([
          API.get("/products"),
          API.get("/orders"),
          API.get("/design-requests"),
          API.get("/vendors"),
        ]);
        setStats({
          products: products.data.length,
          orders: orders.data.length,
          designs: designs.data.length,
          vendors: vendors.data.length,
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="gradient-text">Dashboard</h1>
      </div>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-icon purple"><HiCube /></div>
          <div className="admin-stat-value">{stats.products}</div>
          <div className="admin-stat-label">Total Products</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon gold"><HiShoppingCart /></div>
          <div className="admin-stat-value">{stats.orders}</div>
          <div className="admin-stat-label">Total Orders</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue"><HiPhotograph /></div>
          <div className="admin-stat-value">{stats.designs}</div>
          <div className="admin-stat-label">Design Requests</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green"><HiUserGroup /></div>
          <div className="admin-stat-value">{stats.vendors}</div>
          <div className="admin-stat-label">Vendors</div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
