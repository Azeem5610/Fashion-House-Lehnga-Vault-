# Fix All 28 Payment Module Bugs

Resolve every bug identified in the payment audit report across backend, frontend, security, logic, and background jobs.

## Open Questions

> [!IMPORTANT]
> **COD Flow (Bug #12):** Should COD orders skip the checkout page entirely and be placed directly from the product detail page with a COD radio option? Or should the checkout page show both SafePay and COD as options? I'll implement COD as a selectable option on CheckoutPage.

> [!IMPORTANT]  
> **Duplicate Payment Endpoint (Bug #25):** I'll remove auto-creation of SafePay session from `createOrder` and keep `POST /payments/create` as the sole payment initiation path. The checkout page will handle triggering payment. This cleanly separates order placement from payment.

## Proposed Changes

### Phase 1 — Critical Security Fixes (Bugs #1, #18, #19, #22)

#### [MODIFY] [server.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/server.js)
- Add `verify` callback to `express.json()` to stash `req.rawBody` for webhook signature verification
- Mount webhook route **before** global `express.json()` using `express.raw()` middleware

#### [MODIFY] [paymentService.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/services/paymentService.js)
- Warn critically if `SAFEPAY_WEBHOOK_SECRET` is missing (Bug #19)
- Use `process.env.SAFEPAY_ENVIRONMENT || "sandbox"` instead of hardcoded `"sandbox"` (Bug #22)
- Implement real `verifyPaymentStatus()` with actual SafePay API call (Bug #4)
- Implement real `initiateRefund()` with actual SafePay API call or proper stub with warning (Bug #5)

---

### Phase 2 — Backend Models (Bugs #7, #12, #23)

#### [MODIFY] [Order.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/models/Order.js)
- Add `paymentMethod` field: `enum: ["safepay", "cod"], default: "safepay"` (Bug #12)
- Add `"verification-failed"` to `paymentStatus` enum (Bug #23)
- Fix pre-save hook to also allow `paymentMethod === "cod"` orders to be confirmed (Bug #6)

#### [MODIFY] [PaymentLog.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/models/PaymentLog.js)
- Make `payment` field optional (`required: false`) so webhook failure logs can be saved (Bug #7)

---

### Phase 3 — Backend Controllers (Bugs #2, #3, #6, #8, #9, #10, #20, #24, #25)

#### [MODIFY] [analyticsController.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/controllers/analyticsController.js)
- Add `paymentStatus: "completed"` to revenue aggregation in `getDashboardStats` (Bug #2)
- Add `paymentStatus: "completed"` to `getMonthlyRevenue` aggregation (Bug #3)

#### [MODIFY] [orderController.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/controllers/orderController.js)
- Remove auto-creation of SafePay session from `createOrder` (Bug #25)
- Accept `paymentMethod` in `createOrder` body; for COD, set `paymentStatus: "cod_pending"` (Bug #12)
- In `cancelMyOrder`, also expire associated Payment and update `order.paymentStatus` (Bug #8)

#### [MODIFY] [paymentController.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/controllers/paymentController.js)
- In `handleWebhook`: use `Order.updateOne()` consistently to avoid pre-save hook conflicts (Bug #6)
- In `handleWebhook`: use `Payment.findOneAndUpdate({ status: "pending" })` for atomic transition (Bug #24)
- In `verifyPayment`: use `Payment.findOneAndUpdate({ status: "pending" })` for atomic transition (Bug #24)
- In `verifyPayment`: add ownership check (Bug #20)
- In `getAllPayments`: replace `Payment.find({})` with `Payment.aggregate()` for analytics (Bug #9)
- In `getAllPayments`: move search into MongoDB query before pagination (Bug #10)

#### [MODIFY] [authMiddleware.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/middleware/authMiddleware.js)
- Add `financeOnly` middleware allowing only `superadmin` and `inventoryManager` (Bug #21)

#### [MODIFY] [paymentRoutes.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/routes/paymentRoutes.js)
- Use `financeOnly` instead of `adminOnly` for refund and list-all routes (Bug #21)

---

### Phase 4 — Background Jobs (Bugs #26, #27, #28)

#### [MODIFY] [paymentRecoveryJob.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/jobs/paymentRecoveryJob.js)
- Skip expired payments (let expiration job handle them) (Bug #27)
- Actually update Payment and Order status when SafePay confirms completed (Bug #26)

#### [MODIFY] [paymentExpirationJob.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/jobs/paymentExpirationJob.js)
- No major change needed, just ensure no overlap with recovery job

#### [MODIFY] [orderCancellationJob.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/jobs/orderCancellationJob.js)
- Replace `Order.updateOne()` with `Order.findByIdAndUpdate()` with `{ timestamps: true }` (Bug #28)

---

### Phase 5 — Frontend Pages (Bugs #11, #13, #14, #15, #16)

#### [MODIFY] [api.js](file:///d:/Fashion%20House(Lehnga%20Vault)/frontend/src/utils/api.js)
- Use `process.env.REACT_APP_API_URL || "http://localhost:5000/api"` (Bug #16)

#### [MODIFY] [PaymentStatus.js](file:///d:/Fashion%20House(Lehnga%20Vault)/frontend/src/pages/PaymentStatus.js)
- Add `case "refunded"` with refund-specific UI (Bug #13)
- Add `case "verification-failed"` with error UI + retry (Bug #14)

#### [MODIFY] [MyOrdersPage.js](file:///d:/Fashion%20House(Lehnga%20Vault)/frontend/src/pages/MyOrdersPage.js)
- Add `visibilitychange` listener to re-fetch orders when user returns to tab (Bug #11)
- Also add COD badge display support for the new payment method field

#### [MODIFY] [CheckoutPage.js](file:///d:/Fashion%20House(Lehnga%20Vault)/frontend/src/pages/CheckoutPage.js)
- Fix `handlePayNow` to check existing session first before calling retry (Bug #15)
- Add COD as a payment method option with radio buttons (Bug #12)
- For COD, submit directly without SafePay redirect

---

### Phase 6 — Frontend Admin (Bug #17)

#### [MODIFY] [AdminOrders.js](file:///d:/Fashion%20House(Lehnga%20Vault)/frontend/src/pages/admin/AdminOrders.js)
- Add `Payment Status` column with color badges (Bug #17)
- Add status-change dropdown for order status updates

---

## Verification Plan

### Automated Tests
- Start backend with `npm run dev` and verify server starts without errors
- Start frontend with `npm start` and verify no compilation errors
- Check that all routes resolve correctly

### Manual Verification  
- Verify webhook raw body preservation by checking `req.rawBody` exists in webhook handler
- Verify revenue analytics only count `paymentStatus: "completed"` orders
- Verify COD flow creates order without SafePay session
- Verify PaymentStatus page renders all status cases
- Verify MyOrdersPage re-fetches on tab focus
- Verify AdminOrders shows payment status column
