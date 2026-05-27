# 🔍 Lehnga Vault — Payment Module Audit Report

**Date:** 2026-05-26  
**Scope:** Full payment flow — SafePay integration, orders, analytics, background jobs, frontend pages  
**Files Reviewed:** 22  

---

## BACKEND BUGS

### Bug #1 — Webhook route behind `express.json()` breaks signature verification

- **Files:** [server.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/server.js#L20), [paymentRoutes.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/routes/paymentRoutes.js#L26)
- **Root cause:** `express.json()` is registered globally at line 20 of `server.js` *before* the payment routes are mounted at line 56. SafePay's `client.verify.webhook(req)` needs the **raw request body** to compute the HMAC signature. By the time the webhook handler runs, `req.body` is already parsed JSON and the raw bytes are gone, so signature verification will always fail or behave unpredictably.
- **Suggested fix:** Mount the webhook route *before* `express.json()` using `express.raw()` middleware, or add a `verify` callback to `express.json()` that stashes `req.rawBody` for the webhook path only.

---

### Bug #2 — Order created with `paymentStatus: "pending"` and counted as revenue immediately

- **Files:** [orderController.js → createOrder](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/controllers/orderController.js#L31-L39), [analyticsController.js → getDashboardStats](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/controllers/analyticsController.js#L26-L30)
- **Root cause:** `Order.create()` at line 31 defaults `status` to `"pending"` (not cancelled), and the revenue aggregation at line 27 of `analyticsController.js` only excludes `status: "cancelled"`. This means every new order — even those that were never paid — is counted toward `totalRevenue` the moment it is placed.
- **Suggested fix:** Change the revenue aggregation to also require `paymentStatus: "paid"` (or `"completed"`). Alternatively, only count orders whose `status` is `"confirmed"` or later.

---

### Bug #3 — Monthly revenue aggregation also ignores `paymentStatus`

- **Files:** [analyticsController.js → getMonthlyRevenue](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/controllers/analyticsController.js#L64-L82)
- **Root cause:** The `$match` stage at line 67 only filters `status: { $ne: "cancelled" }`. Unpaid and expired orders still inflate monthly revenue charts.
- **Suggested fix:** Add `paymentStatus: "completed"` to the `$match` filter so only confirmed-paid orders contribute to the revenue chart.

---

### Bug #4 — `verifyPaymentStatus()` is a no-op — always returns `verified: true`

- **Files:** [paymentService.js → verifyPaymentStatus](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/services/paymentService.js#L103-L132)
- **Root cause:** The method at line 115 immediately returns `{ tracker, verified: true, attempt }` without actually calling any SafePay API. The retry/backoff logic is dead code since the try-block never throws. This means the payment recovery job can never actually detect completed payments from SafePay's side.
- **Suggested fix:** Implement a real call to SafePay's payment status API (e.g., `this.client.payments.retrieve(tracker)`) and return the actual payment state.

---

### Bug #5 — `initiateRefund()` is a fake stub — no real SafePay API call

- **Files:** [paymentService.js → initiateRefund](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/services/paymentService.js#L171-L195)
- **Root cause:** The method generates a random `refundId` locally and returns `status: "completed"` at line 182 without ever hitting SafePay's refund endpoint. The `catch` block at line 189 is dead code. Real money is never refunded.
- **Suggested fix:** Integrate the actual SafePay refund API. If SDK doesn't support refunds, use a direct HTTP call to their refund endpoint and only mark `status: "completed"` after confirmation.

---

### Bug #6 — Pre-save middleware on Order conflicts with webhook handler

- **Files:** [Order.js → pre-save hook](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/models/Order.js#L73-L81), [paymentController.js → handleWebhook](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/controllers/paymentController.js#L164-L182)
- **Root cause:** The Order pre-save hook throws if `status` is set to `"confirmed"` when `paymentStatus !== "completed"`. In the webhook handler (line 167-170), `order.paymentStatus` is set to `newStatus` and then `order.status` is set to `"confirmed"` in the same save. But the pre-save hook reads `this.paymentStatus` from the in-memory document — this *should* work if both fields are set before save. However, the `.catch()` fallback at line 173 uses `Order.updateOne()` which bypasses the hook, creating an inconsistency where the guard can be silently circumvented.
- **Suggested fix:** Always use `Order.updateOne()` in the webhook handler (bypassing the hook is acceptable since the webhook *is* the payment confirmation), or remove the hook and enforce the rule only in `updateOrderStatus`.

---

### Bug #7 — PaymentLog requires `payment` field but webhook writes `null` on failed verification

- **Files:** [PaymentLog.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/models/PaymentLog.js#L18-L20), [paymentController.js → handleWebhook](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/controllers/paymentController.js#L99-L109)
- **Root cause:** `PaymentLog` schema has `payment: { required: true }` (line 19). At line 100, the webhook handler creates a log with `payment: null` when signature verification fails. This will throw a Mongoose validation error. The `.catch(() => {})` silently swallows it, so the failed-verification audit trail is permanently lost.
- **Suggested fix:** Either make `payment` optional in PaymentLog (set `required: false`), or use a sentinel/placeholder ObjectId for system-level entries.

---

### Bug #8 — `cancelMyOrder` does not cancel associated Payment or update `paymentStatus`

- **Files:** [orderController.js → cancelMyOrder](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/controllers/orderController.js#L247-L272)
- **Root cause:** When a customer cancels their order (line 264), only `order.status` is set to `"cancelled"`. The associated `Payment` document is left in `"pending"` status, and `order.paymentStatus` is not updated. This means background jobs may still try to process or recover this payment, and the admin dashboard will show a stale payment state.
- **Suggested fix:** Also set `order.paymentStatus = "expired"` (or a new `"cancelled"` value) and update the Payment record's status to `"expired"` when an order is cancelled.

---

### Bug #9 — `getAllPayments` fetches ALL payments into memory for analytics

- **Files:** [paymentController.js → getAllPayments](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/controllers/paymentController.js#L531-L554)
- **Root cause:** Line 531 does `await Payment.find({})` which loads every single Payment document into memory just to compute counts and sums. This is an O(n) memory operation that will degrade badly as the collection grows.
- **Suggested fix:** Replace with a single `Payment.aggregate()` pipeline that computes `totalRevenue`, counts by status, and success rate in the database.

---

### Bug #10 — Search filter applied after pagination, returns fewer results than expected

- **Files:** [paymentController.js → getAllPayments](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/controllers/paymentController.js#L514-L526)
- **Root cause:** The search filter (line 514) is applied on the already-paginated array. If you fetch 15 records per page and then filter by `searchQuery`, you may return 3 results even though more matching records exist on other pages. The `total` count at line 528 also doesn't account for the search filter.
- **Suggested fix:** Apply search as a MongoDB query filter (using `$regex` or text search on the relevant fields) before pagination, so `skip` and `limit` work on the filtered set.

---

## FRONTEND BUGS

### Bug #11 — "Pay Now" button still shows after successful payment

- **Files:** [MyOrdersPage.js](file:///d:/Fashion%20House(Lehnga%20Vault)/frontend/src/pages/MyOrdersPage.js#L129-L137)
- **Root cause:** Line 129 checks `!order.paymentStatus || order.paymentStatus === "pending" || ... "failed" || ... "expired"`. If the webhook fires and updates the DB but the frontend fetched order data *before* the webhook arrived (stale cache), `paymentStatus` will still show `"pending"`. Additionally, the page never polls or re-fetches after returning from SafePay. The condition itself is correct, but the data is stale because the user arrives at `/my-orders` before the async webhook has propagated.
- **Suggested fix:** After redirect from SafePay, always navigate to `/payment-status/:orderId` first (which calls `verifyPayment`). On `MyOrdersPage`, add a brief re-fetch on focus/visibility change, or verify payment inline before showing the button.

---

### Bug #12 — No Cash on Delivery option exists

- **Files:** [CheckoutPage.js](file:///d:/Fashion%20House(Lehnga%20Vault)/frontend/src/pages/CheckoutPage.js#L140-L151), [orderController.js → createOrder](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/controllers/orderController.js#L21-L104)
- **Root cause:** The CheckoutPage hardcodes only SafePay as the payment method (line 143-151). The order controller at line 43-82 automatically creates a SafePay session for every order. There is no COD pathway — no `paymentMethod` field on the Order model, no conditional logic, and no UI radio button for COD.
- **Suggested fix:** Add a `paymentMethod` field to Order (`"safepay"` | `"cod"`). In CheckoutPage, show a payment method selector. In `createOrder`, skip SafePay session creation when `paymentMethod === "cod"` and set the order to a COD-specific flow.

---

### Bug #13 — `PaymentStatus.js` does not handle `"refunded"` status

- **Files:** [PaymentStatus.js → renderStatusContent](file:///d:/Fashion%20House(Lehnga%20Vault)/frontend/src/pages/PaymentStatus.js#L70-L168)
- **Root cause:** The `switch` statement handles `"verifying"`, `"completed"`, `"failed"`, `"expired"`, and `default` (pending). If a user navigates to this page for a refunded order, they'll see the "Payment Awaiting Processing" pending state, which is misleading.
- **Suggested fix:** Add a `case "refunded"` block that shows a refund-specific UI (e.g., "Your payment has been refunded").

---

### Bug #14 — `PaymentStatus.js` does not handle `"verification-failed"` status

- **Files:** [PaymentStatus.js](file:///d:/Fashion%20House(Lehnga%20Vault)/frontend/src/pages/PaymentStatus.js#L70-L168), [Payment.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/models/Payment.js#L41)
- **Root cause:** The Payment model defines `"verification-failed"` as a valid status enum value (line 41), but the frontend `switch` statement has no case for it. Users with a verification-failed payment will see the misleading "pending" fallback.
- **Suggested fix:** Add a dedicated case for `"verification-failed"` showing an error state with a retry option.

---

### Bug #15 — `CheckoutPage` uses retry endpoint for first-time payment

- **Files:** [CheckoutPage.js → handlePayNow](file:///d:/Fashion%20House(Lehnga%20Vault)/frontend/src/pages/CheckoutPage.js#L36-L55)
- **Root cause:** `handlePayNow` always calls `POST /payments/retry/:orderId` (line 40). If the original payment session created during `createOrder` is still valid, this will *either* return the existing session or create a duplicate. The retry endpoint is designed for failed/expired sessions, not first-time checkout. If the session is still pending, it returns the existing URL — so it works by accident, but the semantics are wrong and it increments the retry counter unnecessarily.
- **Suggested fix:** First check the order's existing payment status. If a valid session exists, redirect to its `checkoutUrl` directly. Only hit the retry endpoint when the payment is failed/expired.

---

### Bug #16 — Hardcoded API base URL in `api.js`

- **Files:** [api.js](file:///d:/Fashion%20House(Lehnga%20Vault)/frontend/src/utils/api.js#L4)
- **Root cause:** Line 4 hardcodes `baseURL: "http://localhost:5000/api"`. This will break in any non-local deployment (staging, production).
- **Suggested fix:** Use an environment variable (`process.env.REACT_APP_API_URL`) with `"http://localhost:5000/api"` as a fallback for development.

---

### Bug #17 — AdminOrders page has no `paymentStatus` column or update capability

- **Files:** [AdminOrders.js](file:///d:/Fashion%20House(Lehnga%20Vault)/frontend/src/pages/admin/AdminOrders.js#L100-L147)
- **Root cause:** The orders table shows product, customer, size, price, city, date, and order status — but never displays `paymentStatus`. Admins cannot see whether an order is paid, pending, or failed from this view, and there is no status-change dropdown to update order status either.
- **Suggested fix:** Add a `Payment` column showing `order.paymentStatus` with appropriate color badges, and add a status-change dropdown or action button.

---

## SECURITY ISSUES

### Bug #18 — Webhook signature always fails due to parsed body (critical)

- **Files:** [server.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/server.js#L20), [paymentService.js → verifyWebhookSignature](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/services/paymentService.js#L137-L148)
- **Root cause:** This is the security-critical version of Bug #1. Since `express.json()` parses the body before the webhook route, `req.body` is a JS object, not the raw buffer. `client.verify.webhook(req)` needs the raw bytes to compute the HMAC. Result: **all real webhook signatures will fail**, meaning the system relies entirely on the redirect-based verification (which is less secure and user-initiated). An attacker could also replay or forge webhook payloads since the verification is broken.
- **Suggested fix:** Preserve `req.rawBody` using the `verify` option of `express.json()`, or mount the webhook route with `express.raw({ type: 'application/json' })` before the global JSON parser.

---

### Bug #19 — `SAFEPAY_WEBHOOK_SECRET` defaults to empty string

- **Files:** [paymentService.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/services/paymentService.js#L18)
- **Root cause:** Line 18 uses `process.env.SAFEPAY_WEBHOOK_SECRET || ""`. If the env var is not set, the SDK is initialized with an empty webhook secret, which means signature verification is effectively disabled or trivially bypassable.
- **Suggested fix:** Require `SAFEPAY_WEBHOOK_SECRET` to be set (throw on startup if missing), or at minimum log a critical warning and refuse to process webhooks without it.

---

### Bug #20 — `verifyPayment` route exposes checkout URL and payment details without ownership check

- **Files:** [paymentController.js → verifyPayment](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/controllers/paymentController.js#L245-L333)
- **Root cause:** The `verifyPayment` handler (line 245) finds the order and payment but never checks if `req.user.id` matches `order.user`. Any authenticated user can call `GET /payments/verify/:orderId` with any `orderId` and see another user's payment details, checkout URL, and even trigger status updates via the `sig`/`tracker` query params.
- **Suggested fix:** Add an ownership check (or admin role check) before proceeding, similar to what `createPayment` does.

---

### Bug #21 — Tailor role has admin-level access to payments and refunds

- **Files:** [authMiddleware.js → adminOnly](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/middleware/authMiddleware.js#L57-L63)
- **Root cause:** The `adminOnly` middleware at line 58 includes `"tailor"` in the admin roles list. This means tailors can access `GET /payments` (all payment records) and `POST /payments/refund` (issue refunds). Tailors should not have financial access.
- **Suggested fix:** Create a separate `financeOnly` middleware that only allows `"superadmin"` (and possibly `"inventoryManager"`), and apply it to the payment and refund routes.

---

### Bug #22 — SafePay environment hardcoded to `"sandbox"`

- **Files:** [paymentService.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/services/paymentService.js#L15)
- **Root cause:** Line 15 hardcodes `environment: "sandbox"`. When deploying to production, this will route all payments through the sandbox, meaning no real money is ever charged.
- **Suggested fix:** Use `process.env.SAFEPAY_ENVIRONMENT || "sandbox"` so the environment can be switched via config.

---

## LOGIC & DATA BUGS

### Bug #23 — Order and Payment `paymentStatus` use different values — enum mismatch

- **Files:** [Order.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/models/Order.js#L59), [Payment.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/models/Payment.js#L35-L42)
- **Root cause:** Order's `paymentStatus` enum is `["pending", "completed", "failed", "expired", "refunded"]` (line 59). Payment's `status` enum adds `"verification-failed"` (line 41). When the webhook handler syncs `order.paymentStatus = newStatus` (line 167 of paymentController), if Payment status were ever set to `"verification-failed"`, saving the order would throw a Mongoose validation error because that value isn't in Order's enum.
- **Suggested fix:** Add `"verification-failed"` to Order's `paymentStatus` enum, or ensure the webhook handler maps non-matching statuses before assigning to the order.

---

### Bug #24 — Race condition: redirect verification and webhook can both update payment simultaneously

- **Files:** [paymentController.js → verifyPayment](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/controllers/paymentController.js#L265-L293), [paymentController.js → handleWebhook](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/controllers/paymentController.js#L87-L238)
- **Root cause:** When a user completes payment, SafePay fires a webhook *and* redirects the user. Both `handleWebhook` and `verifyPayment` (redirect) can execute concurrently, both finding the payment as `"pending"` and both attempting to set it to `"completed"`. This creates a race condition that can result in duplicate PaymentLog entries, duplicate socket notifications, and potential MongoDB version conflicts.
- **Suggested fix:** Use `findOneAndUpdate` with `{ status: "pending" }` as a filter condition (optimistic locking) so only one of the two concurrent operations actually transitions the status. The loser gets `null` back and skips processing.

---

### Bug #25 — Double payment session: `createOrder` and `createPayment` both create sessions

- **Files:** [orderController.js → createOrder](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/controllers/orderController.js#L43-L82), [paymentController.js → createPayment](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/controllers/paymentController.js#L11-L81)
- **Root cause:** `createOrder` auto-creates a Payment + SafePay session at lines 46-79. If a client then also calls `POST /payments/create` for the same order (which is a separate exposed endpoint), a second Payment record and SafePay session are created. The order's `payment` reference gets overwritten, orphaning the first Payment record.
- **Suggested fix:** Either remove `POST /payments/create` entirely (since `createOrder` already handles it), or remove the auto-creation from `createOrder` and always require a separate payment creation call. Pick one flow.

---

## BACKGROUND JOBS BUGS

### Bug #26 — Payment recovery job never actually recovers payments

- **Files:** [paymentRecoveryJob.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/jobs/paymentRecoveryJob.js#L36-L68), [paymentService.js → verifyPaymentStatus](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/services/paymentService.js#L103-L132)
- **Root cause:** The recovery job calls `paymentService.verifyPaymentStatus()` (line 54), which is a stub that always returns `{ verified: true }` (see Bug #4). Even when it does "succeed", the job only logs it — it never updates `payment.status` or `order.paymentStatus` to `"completed"`. The `recovered` counter increments but nothing is actually recovered.
- **Suggested fix:** Fix `verifyPaymentStatus()` to call the real SafePay API. Then in the recovery job, if the API returns a completed status, actually update both the Payment and Order documents.

---

### Bug #27 — Expiration job and recovery job overlap, causing double-processing

- **Files:** [paymentExpirationJob.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/jobs/paymentExpirationJob.js#L12), [paymentRecoveryJob.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/jobs/paymentRecoveryJob.js#L15)
- **Root cause:** The expiration job (every 10 min) and recovery job (every 15 min) both query for `status: "pending"` payments and both can expire the same payment. The recovery job at line 39 also marks expired payments. When both jobs run close together, they may process the same payment, creating duplicate PaymentLog entries and potentially conflicting Order updates.
- **Suggested fix:** Have the recovery job *skip* payments past `expiresAt` (let the expiration job handle those). Or consolidate both jobs into a single job that first expires, then recovers.

---

### Bug #28 — Order cancellation job uses `Order.updateOne()` bypassing pre-save hooks and timestamps

- **Files:** [orderCancellationJob.js](file:///d:/Fashion%20House(Lehnga%20Vault)/backend/jobs/orderCancellationJob.js#L45-L48)
- **Root cause:** Line 45 uses `Order.updateOne()` which bypasses Mongoose middleware (pre-save hooks). While this is actually *fine* for cancellation (since the pre-save hook only guards `"confirmed"`), it also skips the `timestamps` plugin so `updatedAt` won't auto-update. This makes audit trails unreliable.
- **Suggested fix:** Use `Order.findByIdAndUpdate()` with `{ timestamps: true }` option, or fetch the document and call `.save()` to ensure timestamps are properly maintained.

---

## Summary

| Category | Count |
|---|---|
| Backend Bugs | 10 |
| Frontend Bugs | 7 |
| Security Issues | 5 |
| Logic & Data Bugs | 3 |
| Background Jobs Bugs | 3 |
| **Total** | **28** |

> [!CAUTION]
> **Critical bugs (fix first):** #1/#18 (webhook body parsing), #2/#3 (inflated revenue), #4/#26 (recovery is a no-op), #19 (empty webhook secret), #24 (race condition).

> [!IMPORTANT]
> **High priority:** #5 (fake refunds), #11 (stale Pay Now button), #12 (no COD), #20 (missing ownership check), #22 (sandbox hardcoded).
