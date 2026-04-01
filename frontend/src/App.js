import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Components
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";

// Pages
import LoginPage from "./pages/LoginPage";
import WelcomePage from "./pages/WelcomePage";
import FabricSelectPage from "./pages/FabricSelectPage";
import ProductListPage from "./pages/ProductListPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import DesignFromPicPage from "./pages/DesignFromPicPage";
import MyOrdersPage from "./pages/MyOrdersPage";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminDesignRequests from "./pages/admin/AdminDesignRequests";
import AdminVendors from "./pages/admin/AdminVendors";
import AdminPurchaseOrders from "./pages/admin/AdminPurchaseOrders";

// Root redirect based on role
const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  return <WelcomePage />;
};

function AppContent() {
  const { user } = useAuth();

  return (
    <>
      {user && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Customer Routes */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/category/:categoryType/fabrics" element={
          <ProtectedRoute><FabricSelectPage /></ProtectedRoute>
        } />
        <Route path="/category/:categoryType/fabric/:fabricType" element={
          <ProtectedRoute><ProductListPage /></ProtectedRoute>
        } />
        <Route path="/product/:id" element={
          <ProtectedRoute><ProductDetailPage /></ProtectedRoute>
        } />
        <Route path="/design-from-picture" element={
          <ProtectedRoute><DesignFromPicPage /></ProtectedRoute>
        } />
        <Route path="/my-orders" element={
          <ProtectedRoute><MyOrdersPage /></ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="design-requests" element={<AdminDesignRequests />} />
          <Route path="vendors" element={<AdminVendors />} />
          <Route path="purchase-orders" element={<AdminPurchaseOrders />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </AuthProvider>
    </Router>
  );
}

export default App;
