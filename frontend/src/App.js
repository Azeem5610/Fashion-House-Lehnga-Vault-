import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Components
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import CookieConsent from "./components/CookieConsent";

// Pages — eager load critical pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import WelcomePage from "./pages/WelcomePage";

// Pages — lazy load for code splitting
const FabricSelectPage = lazy(() => import("./pages/FabricSelectPage"));
const ProductListPage = lazy(() => import("./pages/ProductListPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const DesignFromPicPage = lazy(() => import("./pages/DesignFromPicPage"));
const MyOrdersPage = lazy(() => import("./pages/MyOrdersPage"));

// ── Admin module — always loaded, routes protected by ProtectedRoute ──
const AdminLayout = lazy(() => import("./components/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminDesignRequests = lazy(() => import("./pages/admin/AdminDesignRequests"));
const AdminVendors = lazy(() => import("./pages/admin/AdminVendors"));
const AdminPurchaseOrders = lazy(() => import("./pages/admin/AdminPurchaseOrders"));
const AdminInventory = lazy(() => import("./pages/admin/AdminInventory"));
const AdminEmployees = lazy(() => import("./pages/admin/AdminEmployees"));
const AdminMachinery = lazy(() => import("./pages/admin/AdminMachinery"));
const AdminAppointments = lazy(() => import("./pages/admin/AdminAppointments"));
const AdminOrderTracking = lazy(() => import("./pages/admin/AdminOrderTracking"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminCostEstimation = lazy(() => import("./pages/admin/AdminCostEstimation"));
const AdminRentals = lazy(() => import("./pages/admin/AdminRentals"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminRiders = lazy(() => import("./pages/admin/AdminRiders"));

// Customer Pages — lazy load
const AppointmentPage = lazy(() => import("./pages/AppointmentPage"));
const WishlistPage = lazy(() => import("./pages/WishlistPage"));
const OrderTrackingPage = lazy(() => import("./pages/OrderTrackingPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const StyleFinderPage = lazy(() => import("./pages/VirtualTryOnPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const PaymentStatus = lazy(() => import("./pages/PaymentStatus"));

// Forgot / Reset Password Pages — lazy load
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));

// Admin role list
const ADMIN_ROLES = ["superadmin", "inventoryManager", "productionManager", "tailor"];

// Loading fallback
const PageLoader = () => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "center",
    minHeight: "60vh",
  }}>
    <div className="spinner" />
  </div>
);

// Root redirect based on role
const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (ADMIN_ROLES.includes(user.role)) {
    return <Navigate to="/admin" replace />;
  }
  return <WelcomePage />;
};

function AppContent() {
  const { user } = useAuth();
  const showNavbar = user && !ADMIN_ROLES.includes(user.role);

  return (
    <>
      {showNavbar && <Navbar />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<Navigate to="/forgot-password" replace />} />
          <Route path="/reset-password/:token" element={<Navigate to="/forgot-password" replace />} />

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
          <Route path="/appointments" element={
            <ProtectedRoute><AppointmentPage /></ProtectedRoute>
          } />
          <Route path="/wishlist" element={
            <ProtectedRoute><WishlistPage /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="/style-finder" element={
            <ProtectedRoute><StyleFinderPage /></ProtectedRoute>
          } />

          {/* Customer — Order Tracking */}
          <Route path="/track-order/:orderId" element={
            <ProtectedRoute><OrderTrackingPage /></ProtectedRoute>
          } />

          {/* Customer — Payments */}
          <Route path="/checkout/:orderId" element={
            <ProtectedRoute><CheckoutPage /></ProtectedRoute>
          } />
          <Route path="/payment-status/:orderId" element={
            <ProtectedRoute><PaymentStatus /></ProtectedRoute>
          } />

          {/* Admin Routes — protected by ProtectedRoute (redirects to /login if unauthenticated) */}
          <Route path="/admin" element={
            <ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="design-requests" element={<AdminDesignRequests />} />
            <Route path="vendors" element={<AdminVendors />} />
            <Route path="purchase-orders" element={<AdminPurchaseOrders />} />

            {/* Operations modules */}
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="employees" element={<AdminEmployees />} />
            <Route path="machinery" element={<AdminMachinery />} />

            {/* Customer management modules */}
            <Route path="appointments" element={<AdminAppointments />} />

            {/* Phase 3 — Order Tracking & Reviews */}
            <Route path="order-tracking" element={<AdminOrderTracking />} />
            <Route path="reviews" element={<AdminReviews />} />

            {/* Finance & Operations */}
            <Route path="cost-estimation" element={<AdminCostEstimation />} />
            <Route path="rentals" element={<AdminRentals />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="riders" element={<AdminRiders />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
          <CookieConsent />
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
            theme="light"
          />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
