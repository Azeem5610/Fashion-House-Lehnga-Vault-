# Bridal ERP + Customization Ecosystem — Implementation Plan

Transform the existing Fashion House (Lehnga Vault) simple e-commerce site into a **complete enterprise Bridal ERP** with 11 modules, premium UI, and scalable architecture.

## Current State Summary

| Layer | Current | Target |
|-------|---------|--------|
| **Auth** | 2 roles (admin/customer), basic JWT | 5 roles, refresh tokens, profile mgmt |
| **Models** | 6 (User, Product, Order, Vendor, PurchaseOrder, DesignRequest) | 18+ models |
| **Frontend** | React 19 + CRA, basic admin panel | Premium bridal-themed ERP dashboard |
| **Backend** | Express 5, Mongoose 9, Cloudinary | + Socket.io, role middleware, analytics APIs |
| **Styling** | Cozastore light theme (indigo accent) | Luxurious bridal dark/gold theme with animations |

---

## User Review Required

> [!IMPORTANT]
> **Theme Direction**: The current UI is a light-themed Cozastore-inspired design (indigo accent). The requirement says "luxurious and bridal themed." I will transform it to a **rich dark theme with gold/rose-gold accents** fitting a bridal luxury brand. The customer-facing storefront will keep an elegant light option, while admin/ERP panels will use a dark premium dashboard. **Please confirm this direction.**

> [!WARNING]
> **Breaking Changes**: The User model role enum will expand from `["admin", "customer"]` to `["superadmin", "inventoryManager", "productionManager", "tailor", "customer"]`. Existing `admin` users will be migrated to `superadmin`. The existing hardcoded `ADMIN_EMAIL` check will be replaced with a proper seed script.

> [!IMPORTANT]
> **New Dependencies**: The following packages will be added:
> - **Backend**: `socket.io`, `cookie-parser`, `uuid` (for refresh tokens)
> - **Frontend**: `recharts`, `socket.io-client`, `framer-motion`, `react-datepicker`

---

## Open Questions

> [!IMPORTANT]
> 1. **Admin Seed**: Should the Super Admin account be created via a seed script or keep the current "auto-assign by email" approach?
> 2. **Socket.io**: Should real-time notifications work across all roles or only for admin/manager roles?
> 3. **Image uploads for Reviews**: Should we reuse the existing Cloudinary config, or use a different folder/preset?

---

## Proposed Changes — Phased Execution

We will execute in **4 phases**, each producing a runnable, testable increment.

---

## Phase 1 — Foundation (Auth, Roles, Design System, Dashboard)

### Modules: 1 (Auth & RBAC) + 2 (Admin Dashboard) + UI Foundation

---

### Backend — Auth & Role System

#### [MODIFY] [User.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/models/User.js)
- Expand `role` enum: `["superadmin", "inventoryManager", "productionManager", "tailor", "customer"]`
- Add fields: `phone`, `avatar`, `refreshToken`, `isActive`, `lastLogin`
- Add pre-save hook for password hashing (move from controller)

#### [MODIFY] [authController.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/controllers/authController.js)
- Add `register` (replaces signup) with role assignment
- Add `getProfile`, `updateProfile` endpoints
- Add refresh token generation + validation
- Add `logout` endpoint that clears refresh token
- Remove hardcoded `ADMIN_EMAIL` check — use seed script instead

#### [MODIFY] [authRoutes.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/routes/authRoutes.js)
- Add routes: `POST /register`, `POST /refresh-token`, `POST /logout`, `GET /profile`, `PUT /profile`

#### [MODIFY] [authMiddleware.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/middleware/authMiddleware.js)
- Add `roleAuth(...roles)` middleware factory for flexible role checking
- Keep `protect` middleware, enhance with better error handling
- Remove `adminOnly` — replaced by `roleAuth("superadmin")`

#### [NEW] [seedAdmin.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/scripts/seedAdmin.js)
- Seed script to create Super Admin on first run

#### [MODIFY] [server.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/server.js)
- Add `cookie-parser` middleware
- Register all new API route groups
- Add Socket.io initialization (for Phase 4)
- Add error handling middleware

---

### Backend — Dashboard Analytics API

#### [NEW] [analyticsController.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/controllers/analyticsController.js)
- `getDashboardStats`: total orders, revenue, inventory alerts, pending appointments
- `getMonthlyRevenue`: aggregation pipeline for monthly chart data
- `getProductionProgress`: orders by status stage
- `getTopFabrics`: most used fabrics aggregation

#### [NEW] [analyticsRoutes.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/routes/analyticsRoutes.js)
- `GET /api/analytics/dashboard` — stats cards
- `GET /api/analytics/monthly-revenue` — chart data
- `GET /api/analytics/production` — production progress
- `GET /api/analytics/top-fabrics` — fabric usage

---

### Frontend — Design System Overhaul

#### [MODIFY] [index.css](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/index.css)
- Complete theme overhaul: dark luxury palette with gold/rose-gold accents
- New CSS variables for bridal theme
- Enhanced component styles (glassmorphism cards, gradient borders)
- New admin dashboard grid, chart container, and stats card styles
- New sidebar navigation styles for the expanded admin panel
- Animated utility classes

#### [NEW] [AdminLayout.css](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/components/AdminLayout.css) (rewrite)
- Premium dark sidebar with role-based menu sections
- Collapsible navigation groups
- Active state with gold accent bar
- User info panel at bottom of sidebar

---

### Frontend — Auth Pages

#### [MODIFY] [LoginPage.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/pages/LoginPage.js) + [LoginPage.css](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/pages/LoginPage.css)
- Complete redesign: split-panel layout with bridal imagery left, form right
- Animated input fields, loading states
- Role-aware redirect after login

#### [NEW] [RegisterPage.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/pages/RegisterPage.js) + [RegisterPage.css](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/pages/RegisterPage.css)
- Registration form with name, email, phone, password
- Matching split-panel premium design

#### [MODIFY] [AuthContext.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/context/AuthContext.js)
- Add `register`, `updateProfile`, `refreshToken` methods
- Handle refresh token rotation
- Role-aware state management

#### [MODIFY] [ProtectedRoute.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/components/ProtectedRoute.js)
- Replace `adminOnly` with `allowedRoles` array prop
- Add role-based redirect logic

#### [MODIFY] [AdminLayout.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/components/AdminLayout.js)
- Dynamic sidebar links based on user role
- Collapsible menu sections
- User profile section
- Notification bell (placeholder for Phase 4)

---

### Frontend — Enterprise Dashboard

#### [MODIFY] [AdminDashboard.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/pages/admin/AdminDashboard.js)
- Complete rewrite with:
  - Stats cards row (orders, revenue, inventory alerts, pending appointments)
  - Monthly revenue line chart (Recharts)
  - Order status distribution pie chart
  - Top fabrics bar chart
  - Recent orders table
  - Production progress cards
  - Low stock alerts list

#### [NEW] [AdminDashboard.css](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/pages/admin/AdminDashboard.css)
- Dashboard grid layout
- Chart container styles
- Stats card animations

---

### Frontend — App Router Update

#### [MODIFY] [App.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/App.js)
- Add register route
- Add all new admin sub-routes for modules 3-11
- Role-based route guards throughout
- Lazy loading with Suspense for code splitting

---

## Phase 2 — Operations (Inventory, Vendors, Employees, Machinery)

### Modules: 3 (Inventory) + 4 (Vendors) + 5 (Employees) + 6 (Machinery)

---

### Backend — Inventory System

#### [NEW] [Inventory.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/models/Inventory.js)
- Fields: `name`, `category` (fabric/accessory/other), `subcategory`, `quantity`, `unit`, `costPerUnit`, `reorderLevel`, `supplier` (ref Vendor), `location`, `usageHistory[]`
- Fabric subcategories: Net (China), Pure China Krinkle, Tussle Silk, Organza, Barosha, Velvet, Shafon Krinkle
- Accessory subcategories: Moti, Stones, Pearls, Lace, Sitara, Threads, Beads, Tassels
- Other: Dyeing chemicals, Packaging materials, Embroidery materials
- Virtual for `isLowStock` based on reorderLevel

#### [NEW] [inventoryController.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/controllers/inventoryController.js)
- CRUD operations
- `getLowStock` — items below reorder level
- `recordUsage` — deduct from stock and log usage
- `getInventoryAnalytics` — category breakdown, cost analysis
- Search/filter by category, subcategory, stock status

#### [NEW] [inventoryRoutes.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/routes/inventoryRoutes.js)
- Full CRUD + analytics endpoints, protected by `roleAuth("superadmin", "inventoryManager")`

---

### Backend — Enhanced Vendor System

#### [MODIFY] [Vendor.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/models/Vendor.js)
- Add fields: `whatsapp`, `specialties[]`, `deliveryTime`, `rating`, `totalOrders`, `performance`
- Add methods for WhatsApp link generation

#### [MODIFY] [PurchaseOrder.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/models/PurchaseOrder.js)
- Add fields: `items[]` (array of inventory items), `totalCost`, `expectedDelivery`, `actualDelivery`, `notes`
- Expand status: `["draft", "pending", "ordered", "shipped", "received", "cancelled"]`

#### [MODIFY] [vendorController.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/controllers/vendorController.js)
- Add `getVendorAnalytics`, `generateWhatsAppOrder`
- Add vendor performance tracking

#### [MODIFY] [purchaseOrderController.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/controllers/purchaseOrderController.js)
- Enhanced with multi-item orders, cost tracking, delivery tracking

---

### Backend — Employee & Tailor System

#### [NEW] [Employee.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/models/Employee.js)
- Fields: `user` (ref User), `type` (tailor/embroideryWorker/productionManager/dyeingStaff), `specialization`, `salary`, `attendance[]`, `joinDate`, `isActive`, `pendingTasks`

#### [NEW] [Task.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/models/Task.js)
- Fields: `assignedTo` (ref Employee), `order` (ref Order), `type` (embroidery/stitching/dyeing/finishing), `description`, `status`, `startDate`, `dueDate`, `completedDate`, `priority`

#### [NEW] [employeeController.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/controllers/employeeController.js)
- CRUD, task assignment, productivity reports, attendance tracking

#### [NEW] [employeeRoutes.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/routes/employeeRoutes.js)

---

### Backend — Machinery System

#### [NEW] [Machinery.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/models/Machinery.js)
- Fields: `name`, `type` (embroidery/stitch/cutting/press), `serialNumber`, `purchaseDate`, `purchaseCost`, `condition`, `lastMaintenance`, `nextMaintenance`, `isOperational`

#### [NEW] [MaintenanceLog.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/models/MaintenanceLog.js)
- Fields: `machine` (ref Machinery), `type` (routine/repair/emergency), `description`, `cost`, `performedBy`, `date`, `nextScheduled`

#### [NEW] [machineryController.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/controllers/machineryController.js)
- CRUD, maintenance logging, utilization analytics

#### [NEW] [machineryRoutes.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/routes/machineryRoutes.js)

---

### Frontend — Module 3: Inventory Management

#### [NEW] [AdminInventory.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/pages/admin/AdminInventory.js) + CSS
- Tabbed view: Fabrics | Accessories | Other Materials
- Data table with sort, search, filter
- Add/Edit inventory modal
- Low stock indicators (red badges, pulsing alerts)
- Usage history chart per item
- Inventory analytics: total value, category breakdown chart

---

### Frontend — Module 4: Enhanced Vendor Management

#### [MODIFY] [AdminVendors.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/pages/admin/AdminVendors.js)
- Complete rewrite with: vendor cards with rating stars, WhatsApp quick-order button, performance metrics, specialty tags
- Vendor detail modal with order history

#### [MODIFY] [AdminPurchaseOrders.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/pages/admin/AdminPurchaseOrders.js)
- Multi-item order creation, delivery tracking, cost summaries

---

### Frontend — Module 5: Employee Management

#### [NEW] [AdminEmployees.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/pages/admin/AdminEmployees.js) + CSS
- Employee cards with photo, specialization, status
- Task assignment drag-and-drop interface
- Productivity charts (tasks completed over time)
- Attendance calendar view
- Salary records table

---

### Frontend — Module 6: Machinery Management

#### [NEW] [AdminMachinery.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/pages/admin/AdminMachinery.js) + CSS
- Machine cards with condition indicator (green/yellow/red)
- Maintenance history timeline
- Add maintenance log form
- Utilization analytics chart
- Next maintenance due alerts

---

## Phase 3 — Customer Experience (Appointments, Wishlist, Tracking, Reviews)

### Modules: 7 (Appointments) + 8 (Wishlist) + 10 (Order Tracking) + 11 (Reviews)

---

### Backend — Appointment System

#### [NEW] [Appointment.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/models/Appointment.js)
- Fields: `customer` (ref User), `date`, `time`, `type` (online/physical), `purpose`, `notes`, `status` (pending/approved/rejected/completed), `adminNotes`

#### [NEW] [appointmentController.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/controllers/appointmentController.js)
- Customer: book, view own, cancel
- Admin: approve/reject, view all, add notes

#### [NEW] [appointmentRoutes.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/routes/appointmentRoutes.js)

---

### Backend — Wishlist & Moodboard

#### [NEW] [Wishlist.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/models/Wishlist.js)
- Fields: `user` (ref User), `products[]` (ref Product), `collections[]` (name + products)

#### [NEW] [Moodboard.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/models/Moodboard.js)
- Fields: `user` (ref User), `name`, `images[]`, `products[]`, `notes`, `isPublic`

#### [NEW] [wishlistController.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/controllers/wishlistController.js) + routes

#### [NEW] [moodboardController.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/controllers/moodboardController.js) + routes

---

### Backend — Order Tracking

#### [NEW] [OrderTracking.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/models/OrderTracking.js)
- Fields: `order` (ref Order), `stages[]` with: `name`, `status`, `startDate`, `completedDate`, `assignedTo`, `notes`
- Stages: Order Placed → Fabric Purchased → Dyeing → Embroidery → Stitching → Finishing → Quality Check → Delivered
- `estimatedCompletion`, `currentStage`

#### [MODIFY] [Order.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/models/Order.js)
- Add `tracking` ref to OrderTracking
- Expand status enum to match new workflow

#### [NEW] [orderTrackingController.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/controllers/orderTrackingController.js) + routes

---

### Backend — Reviews & Ratings

#### [NEW] [Review.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/models/Review.js)
- Fields: `user` (ref User), `product` (ref Product), `rating` (1-5), `text`, `images[]`, `isApproved`, `adminResponse`

#### [NEW] [reviewController.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/controllers/reviewController.js) + routes

---

### Frontend — Module 7: Appointment Booking

#### [NEW] [AppointmentPage.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/pages/AppointmentPage.js) + CSS
- Date/time picker with calendar widget
- Meeting type selection (online/physical)
- Purpose/notes textarea
- Appointment history with status badges

#### [NEW] [AdminAppointments.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/pages/admin/AdminAppointments.js) + CSS
- Calendar view of all appointments
- Approve/reject with notes
- Today's appointments highlight

---

### Frontend — Module 8: Wishlist & Moodboard

#### [NEW] [WishlistPage.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/pages/WishlistPage.js) + CSS
- Grid of saved products with quick-remove
- Create/manage collections
- Compare feature (side-by-side)

#### [NEW] [MoodboardPage.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/pages/MoodboardPage.js) + CSS
- Pinterest-style masonry grid
- Drag-and-arrange images
- Add notes per board

---

### Frontend — Module 10: Order Tracking

#### [NEW] [OrderTrackingPage.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/pages/OrderTrackingPage.js) + CSS
- Visual timeline (vertical stepper)
- Stage icons and descriptions
- Estimated completion date
- Current stage highlight with progress bar

#### [NEW] [AdminOrderTracking.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/pages/admin/AdminOrderTracking.js) + CSS
- Update stages, assign workers, add notes per stage

---

### Frontend — Module 11: Reviews

#### [NEW] [ReviewForm.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/components/ReviewForm.js) + CSS
- Star rating input, text review, image upload
- Integrate into ProductDetailPage

#### [NEW] [AdminReviews.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/pages/admin/AdminReviews.js) + CSS
- Review moderation panel: approve/reject, respond

---

## Phase 4 — Real-Time & Polish (Notifications, Final UI)

### Module: 9 (Real-Time Notifications)

---

### Backend — Socket.io & Notifications

#### [NEW] [Notification.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/models/Notification.js)
- Fields: `user` (ref User), `type` (order/stock/appointment/production), `title`, `message`, `isRead`, `link`, `data`

#### [NEW] [socket.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/config/socket.js)
- Socket.io server setup
- Room-based channels per user role
- Event emitters for: order updates, low stock, appointment changes, production updates

#### [NEW] [notificationController.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/backend/controllers/notificationController.js) + routes
- Get user notifications, mark as read, mark all read, delete

---

### Frontend — Notifications

#### [NEW] [NotificationContext.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/context/NotificationContext.js)
- Socket.io client connection
- Real-time notification state
- Unread count tracking

#### [NEW] [NotificationDropdown.js](file:///d:/Fashion%20House%28Lehnga%20Vault%29/frontend/src/components/NotificationDropdown.js) + CSS
- Bell icon with unread badge
- Dropdown with notification list
- Mark as read on click
- Toast notification on new event

---

### Frontend — Final Polish

- Add `framer-motion` page transition animations
- Add skeleton loaders for all data tables
- Responsive testing on all breakpoints
- Final admin sidebar with all 11 module links

---

## Verification Plan

### Automated Tests
```bash
# Backend — start server and verify all routes
cd backend && npm run dev

# Frontend — start dev server
cd frontend && npm start
```

### Manual Verification (via browser tool)
1. **Auth flow**: Register → Login → Role-based redirect → Profile update → Logout
2. **Dashboard**: All stats cards loading, charts rendering, responsive layout
3. **Inventory**: Add fabric → Low stock alert → Usage tracking
4. **Vendors**: Add vendor → Create purchase order → WhatsApp link generation
5. **Employees**: Add employee → Assign task → View productivity
6. **Machinery**: Add machine → Log maintenance → View analytics
7. **Appointments**: Book → Admin approve → View history
8. **Wishlist**: Save product → Create collection → Compare
9. **Order Tracking**: Create order → Update stages → Customer timeline view
10. **Reviews**: Submit review → Admin moderate → Display on product
11. **Notifications**: Trigger events → Verify real-time delivery → Toast display

### Build Verification
```bash
cd frontend && npm run build
```
