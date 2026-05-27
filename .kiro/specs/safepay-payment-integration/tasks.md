# Implementation Plan: SafePay Payment Integration

## Overview

This implementation plan breaks down the SafePay payment gateway integration into discrete, actionable coding tasks following the 7-week roadmap defined in the design document. The integration will enable secure online payment processing for both ready-made and customized lehnga orders, including payment session creation, webhook handling, payment verification, refunds, and comprehensive admin visibility.

**Implementation Language**: JavaScript (Node.js/Express backend, React frontend)

**Key Technologies**:
- Backend: Node.js, Express.js, MongoDB, Mongoose, Socket.io
- Frontend: React, React Router, Axios, react-toastify
- Payment Gateway: SafePay SDK (@sfpy/node-sdk)
- Testing: Jest, Supertest, fast-check (property-based testing)

**Ngrok Webhook URL for Development**: `https://exclusion-sepia-nicotine.ngrok-free.dev/api/payments/webhook`

## Tasks

### Phase 1: Backend Foundation (Week 1)

- [ ] 1. Set up payment infrastructure and data models
  - [x] 1.1 Create Payment model with schema and indexes
    - Create `backend/models/Payment.js` with complete schema including order reference, safepayTracker, amount, currency, status enum, transactionId, paymentMethod, checkoutUrl, expiresAt, completedAt, refund object, attempts array, and webhookEvents array
    - Add indexes for order, safepayTracker (unique), status, expiresAt, and compound indexes for (status, expiresAt) and (status, createdAt)
    - Implement virtual property `isExpired` to check if payment is expired
    - Implement instance methods: `addAttempt(status, errorMessage)` and `addWebhookEvent(eventType, payload)`
    - _Requirements: 6.1, 6.3, 6.7, 19.1, 19.2_
  
  - [ ]* 1.2 Write property test for Payment model data persistence
    - **Property 6: Payment Data Persistence**
    - **Validates: Requirements 6.1, 6.7, 19.1**
    - Test that all required fields (status, transactionId, paymentMethod, amount, timestamp) are stored correctly
    - Use fast-check to generate random payment data and verify persistence
  
  - [x] 1.3 Create PaymentLog model for audit trail
    - Create `backend/models/PaymentLog.js` with schema including payment reference, operation enum (session_created, webhook_received, verification_attempted, verification_succeeded, verification_failed, refund_initiated, refund_completed, status_updated), details object, performedBy user reference, ipAddress, and userAgent
    - Add compound index for (payment, createdAt) for efficient log queries
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_
  
  - [x] 1.4 Enhance Order model with payment fields
    - Add payment field (ObjectId reference to Payment model)
    - Add paymentStatus enum field (pending, completed, failed, expired, refunded) with default 'pending'
    - Add safepayTracker string field with index
    - Add pre-save middleware to prevent status change to 'confirmed' if paymentStatus is not 'completed'
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 1.5 Write property tests for Order model payment validation
    - **Property 8: Order Confirmation Payment Requirement**
    - **Validates: Requirements 7.4**
    - Test that orders cannot transition to 'confirmed' status without completed payment
    - **Property 9: Order Initialization**
    - **Validates: Requirements 7.5**
    - Test that new orders have paymentStatus initialized to 'pending'


- [ ] 2. Implement PaymentService with SafePay SDK integration
  - [~] 2.1 Create PaymentService class with SafePay client initialization
    - Create `backend/services/paymentService.js` as a class
    - Initialize SafePay client in constructor using environment variables (SAFEPAY_ENVIRONMENT, SAFEPAY_API_KEY, SAFEPAY_SECRET_KEY)
    - Add credential validation on initialization
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [~] 2.2 Implement createPaymentSession method
    - Implement `createPaymentSession(orderId, amount, currency = 'PKR')` method
    - Validate input data (amount > 0, valid ObjectId, currency = 'PKR')
    - Call SafePay SDK to create payment session with order details
    - Return object with tracker, checkoutUrl, and expiresAt (30 minutes from now)
    - Handle SafePay API errors with appropriate error types
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 18.1, 18.2, 18.3, 18.4_
  
  - [ ]* 2.3 Write property test for payment session creation
    - **Property 1: Payment Session Creation Completeness**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 17.1**
    - Test that valid order data returns complete session with tracker, URL, PKR currency, correct reference, and 30-minute expiration
    - Use fast-check to generate random valid order data
  
  - [~] 2.4 Implement verifyPaymentStatus method
    - Implement `verifyPaymentStatus(tracker)` method
    - Query SafePay API using tracker ID
    - Return object with status, transactionId, paymentMethod, amount, and timestamp
    - Implement retry logic with exponential backoff (3 attempts, 2-second intervals)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ]* 2.5 Write property test for payment verification
    - **Property 5: Payment Verification Correctness**
    - **Validates: Requirements 5.2, 5.3**
    - Test that verification uses correct tracker ID and updates payment status to match API response
  
  - [~] 2.6 Implement verifyWebhookSignature method
    - Implement `verifyWebhookSignature(signature, timestamp, body)` method
    - Decode base64 webhook secret from environment variable
    - Build signing payload: `timestamp + '.' + rawBody`
    - Compute HMAC-SHA256 signature
    - Use crypto.timingSafeEqual for constant-time comparison
    - Return boolean indicating signature validity
    - _Requirements: 4.2, 4.3, 11.1, 11.2, 11.3_
  
  - [ ]* 2.7 Write property test for webhook signature verification
    - **Property 2: Webhook Signature Verification**
    - **Validates: Requirements 4.2, 11.2**
    - Test that HMAC-SHA256 computation produces correct signature format and verification succeeds only with matching signatures
  
  - [~] 2.8 Implement initiateRefund method
    - Implement `initiateRefund(tracker, amount, reason)` method
    - Validate refund amount and payment status
    - Call SafePay SDK refund API
    - Return object with refundId, status, and timestamp
    - Handle refund errors appropriately
    - _Requirements: 12.1, 12.2_
  
  - [~] 2.9 Implement validatePaymentData method
    - Implement `validatePaymentData(amount, orderId, currency)` method
    - Validate amount > 0
    - Validate orderId is valid MongoDB ObjectId
    - Validate currency is 'PKR'
    - Sanitize inputs to prevent injection attacks
    - Throw descriptive errors for validation failures
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_


- [~] 3. Checkpoint - Verify backend foundation
  - Ensure all models are created with correct schemas and indexes
  - Ensure PaymentService methods are implemented and tested
  - Run unit tests and verify >80% coverage
  - Ask the user if questions arise

### Phase 2: API Endpoints (Week 2)

- [ ] 4. Create PaymentController with core functionality
  - [~] 4.1 Create PaymentController with createPayment function
    - Create `backend/controllers/paymentController.js`
    - Implement `createPayment(req, res, next)` function
    - Extract orderId, amount, currency from request body
    - Call PaymentService.validatePaymentData()
    - Call PaymentService.createPaymentSession()
    - Create Payment record in database
    - Create PaymentLog entry for session_created operation
    - Return response with checkoutUrl, tracker, and expiresAt
    - Handle validation and API errors with appropriate status codes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [~] 4.2 Implement handleWebhook function with signature verification
    - Implement `handleWebhook(req, res, next)` function
    - Extract signature, timestamp, and event type from headers
    - Verify webhook signature using PaymentService
    - Return 401 if signature invalid and log security warning
    - Parse webhook payload and extract tracker, status, transactionId, paymentMethod
    - Find Payment record by tracker
    - Check if payment already processed (idempotency)
    - Update payment status based on webhook event type
    - Add webhook event to payment.webhookEvents array
    - Create PaymentLog entry for webhook_received operation
    - Return 200 OK within 5 seconds
    - _Requirements: 4.1, 4.2, 4.3, 4.7, 4.8, 11.1, 11.2, 11.3, 11.4_
  
  - [ ]* 4.3 Write property test for webhook idempotency
    - **Property 3: Webhook Idempotency**
    - **Validates: Requirements 4.8**
    - Test that processing same webhook multiple times results in same final state with no duplicate side effects
  
  - [ ]* 4.4 Write property test for webhook status propagation
    - **Property 4: Webhook Status Propagation**
    - **Validates: Requirements 4.4, 4.5, 4.6**
    - Test that webhook status updates propagate to payment and order correctly
  
  - [ ]* 4.5 Write property test for webhook security logging
    - **Property 15: Webhook Security Logging**
    - **Validates: Requirements 11.4**
    - Test that failed signature verification creates security log with timestamp, IP, and reason
  
  - [~] 4.6 Implement webhook status update logic
    - In handleWebhook, update payment status based on event type
    - If status changes to 'completed', update order status to 'confirmed'
    - If status changes to 'failed', keep order status as 'pending'
    - Emit Socket.io notification to customer on status change
    - Send email notification on payment completion
    - _Requirements: 4.4, 4.5, 4.6, 13.1, 13.2, 13.4, 13.5_
  
  - [ ]* 4.7 Write property test for payment status change notifications
    - **Property 17: Payment Status Change Notifications**
    - **Validates: Requirements 13.1, 13.2, 13.4, 13.5**
    - Test that status changes to 'completed' or 'failed' trigger Socket.io and email notifications


- [ ] 5. Implement payment verification and refund endpoints
  - [~] 5.1 Implement verifyPayment function
    - Implement `verifyPayment(req, res, next)` function
    - Extract orderId from URL params
    - Find order and populate payment field
    - Call PaymentService.verifyPaymentStatus() with tracker
    - Update payment status based on API response
    - Update order status if payment completed
    - Create PaymentLog entries for verification attempts
    - Return payment and order details
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [~] 5.2 Implement initiateRefund function
    - Implement `initiateRefund(req, res, next)` function (admin only)
    - Extract orderId, amount, reason from request body
    - Validate order exists and payment is completed
    - Validate refund amount <= payment amount
    - Call PaymentService.initiateRefund()
    - Update payment status to 'refunded'
    - Store refund details (refundId, amount, reason, initiatedBy, refundedAt)
    - Update order status to 'cancelled'
    - Create PaymentLog entry for refund_initiated operation
    - Send email notification to customer
    - Return refund details
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_
  
  - [ ]* 5.3 Write property test for refund flow completeness
    - **Property 16: Refund Flow Completeness**
    - **Validates: Requirements 12.2, 12.3, 12.4, 12.5, 12.6**
    - Test that refund calls SafePay API, updates payment and order status, stores refund details, and sends notification
  
  - [~] 5.4 Implement getPaymentByOrder function
    - Implement `getPaymentByOrder(req, res, next)` function
    - Extract orderId from URL params
    - Find payment by order reference
    - Verify user authorization (customer can only view own orders, admins can view all)
    - Return payment details including attempts and webhook events
    - _Requirements: 6.1, 6.2, 6.6, 6.7_
  
  - [~] 5.5 Implement getAllPayments function for admin
    - Implement `getAllPayments(req, res, next)` function (admin only)
    - Extract filters from query params (status, dateFrom, dateTo, searchQuery, page, limit)
    - Build MongoDB query based on filters
    - Populate order, user, and product details
    - Implement pagination
    - Return payments array and pagination metadata
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ]* 5.6 Write property test for admin payment filtering
    - **Property 10: Admin Payment Filtering**
    - **Validates: Requirements 8.2**
    - Test that status filter returns only payments matching the filter value
  
  - [ ]* 5.7 Write property test for date range filtering
    - **Property 20: Date Range Filtering**
    - **Validates: Requirements 14.5**
    - Test that date range filter returns only payments within the inclusive range
  
  - [~] 5.8 Implement retryPayment function
    - Implement `retryPayment(req, res, next)` function
    - Extract orderId from URL params
    - Find order and existing payment
    - Validate payment status is 'failed' or 'expired'
    - Check retry attempt limit (max 5 per order)
    - Invalidate previous payment session (update status to 'expired')
    - Create new payment session via PaymentService
    - Create new Payment record
    - Add attempt to payment.attempts array
    - Create PaymentLog entry
    - Return new checkout URL
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ]* 5.9 Write property test for payment retry session management
    - **Property 13: Payment Retry Session Management**
    - **Validates: Requirements 10.1, 10.2**
    - Test that retry creates new session, invalidates previous sessions, and returns new URL
  
  - [ ]* 5.10 Write property test for payment attempt logging
    - **Property 14: Payment Attempt Logging**
    - **Validates: Requirements 10.4**
    - Test that each retry creates log entry with timestamp and outcome


- [ ] 6. Create payment routes and integrate with Express
  - [~] 6.1 Create payment routes file
    - Create `backend/routes/paymentRoutes.js`
    - Import PaymentController and auth middleware
    - Define POST /webhook route (public, no auth)
    - Define GET /verify/:orderId route (protected, customer/admin)
    - Define POST /refund route (protected, admin only)
    - Define GET /order/:orderId route (protected, customer/admin)
    - Define GET / route (protected, admin only)
    - Define POST /retry/:orderId route (protected, customer/admin)
    - Configure raw body parsing for webhook endpoint
    - Add rate limiting middleware to webhook endpoint (100 req/min per IP)
    - _Requirements: 4.1, 11.5_
  
  - [~] 6.2 Integrate payment routes in server.js
    - Import payment routes in `backend/server.js`
    - Mount routes at `/api/payments`
    - Ensure raw body parsing middleware is configured before JSON parsing for webhook endpoint
    - _Requirements: 4.1_
  
  - [~] 6.3 Enhance OrderController to create payment sessions
    - Modify `createOrder` function in `backend/controllers/orderController.js`
    - After creating order with status 'pending', call PaymentController.createPayment()
    - Update order with payment reference and safepayTracker
    - Return order details with checkoutUrl in response
    - Handle payment session creation errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [~] 6.4 Enhance OrderController to populate payment information
    - Modify `getOrderById` function to populate payment field
    - Include payment status, transaction ID, and checkout URL in response
    - _Requirements: 6.1, 6.2, 6.6_
  
  - [~] 6.5 Enhance OrderController to validate payment before status updates
    - Modify `updateOrderStatus` function
    - Prevent status change to 'confirmed' if paymentStatus is not 'completed'
    - Return appropriate error message if validation fails
    - _Requirements: 7.4_

- [~] 7. Checkpoint - Verify API endpoints
  - Test all payment endpoints with Postman or similar tool
  - Verify webhook signature verification works correctly
  - Verify payment verification endpoint works
  - Verify refund endpoint works (admin only)
  - Run integration tests
  - Ask the user if questions arise

### Phase 3: Frontend Components (Week 3)

- [ ] 8. Create CheckoutPage component
  - [~] 8.1 Create CheckoutPage component structure
    - Create `frontend/src/pages/CheckoutPage.js`
    - Set up component with useState for order, loading, error, redirecting states
    - Use useParams to get orderId from URL
    - Use useNavigate for navigation
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [~] 8.2 Implement fetchOrderDetails function
    - Implement useEffect to fetch order details on mount
    - Call GET /api/orders/:orderId endpoint
    - Populate order state with response
    - Handle loading and error states
    - _Requirements: 3.6_
  
  - [~] 8.3 Implement handlePayment function
    - Implement handlePayment function to redirect to SafePay
    - Set redirecting state to true
    - Use window.location.href to redirect to order.payment.checkoutUrl
    - _Requirements: 3.1, 3.2_
  
  - [~] 8.4 Implement CheckoutPage UI
    - Display order summary (product image, name, size, quantity)
    - Display shipping address
    - Display price breakdown (subtotal, shipping, total)
    - Display payment amount prominently
    - Add "Proceed to Payment" button (calls handlePayment)
    - Add "Cancel" button (navigates back to order details)
    - Show loading spinner when redirecting
    - Show error message if order fetch fails
    - Ensure responsive design for mobile and desktop
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_


- [ ] 9. Create PaymentStatus component
  - [~] 9.1 Create PaymentStatus component structure
    - Create `frontend/src/pages/PaymentStatus.js`
    - Set up component with useState for payment, order, loading, error, verifying states
    - Use useParams to get orderId from URL
    - Use useNavigate for navigation
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [~] 9.2 Implement verifyPayment function
    - Implement useEffect to verify payment on mount
    - Call GET /api/payments/verify/:orderId endpoint
    - Update payment and order states with response
    - Handle loading and error states
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [~] 9.3 Implement handleRetry function
    - Implement handleRetry function to retry failed payment
    - Call POST /api/payments/retry/:orderId endpoint
    - Redirect to new checkout URL on success
    - Show error toast on failure
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [~] 9.4 Implement PaymentStatus UI for success state
    - Display green checkmark icon
    - Display "Payment Successful!" heading
    - Display transaction ID
    - Display order details summary
    - Add "View My Orders" button (navigates to /my-orders)
    - _Requirements: 6.6_
  
  - [~] 9.5 Implement PaymentStatus UI for failed state
    - Display red X icon
    - Display "Payment Failed" heading
    - Display appropriate error message based on failure reason
    - Add "Retry Payment" button (calls handleRetry)
    - Add "Contact Support" link
    - _Requirements: 6.5, 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [~] 9.6 Implement PaymentStatus UI for pending and expired states
    - Pending: Show loading spinner with "Verifying payment..." message
    - Expired: Show orange warning icon with "Payment Session Expired" message and retry button
    - _Requirements: 6.4, 9.4_
  
  - [ ]* 9.7 Write property test for payment failure notification
    - **Property 12: Payment Failure Notification**
    - **Validates: Requirements 9.6**
    - Test that failed payment triggers email notification with retry instructions

- [ ] 10. Enhance OrderDetails component with payment information
  - [~] 10.1 Add payment state to OrderDetails component
    - Modify `frontend/src/pages/OrderDetails.js` (or similar existing component)
    - Add payment and showRefundModal to component state
    - _Requirements: 6.1, 6.2, 6.6_
  
  - [~] 10.2 Implement fetchPaymentDetails function
    - Add function to fetch payment details via GET /api/payments/order/:orderId
    - Call in useEffect when order is loaded
    - Update payment state with response
    - _Requirements: 6.1, 6.2, 6.6_
  
  - [~] 10.3 Implement payment action handlers
    - Implement handleRetryPayment function (calls POST /api/payments/retry/:orderId)
    - Implement handleCompletePayment function (navigates to /checkout/:orderId)
    - Implement handleRefund function for admin (calls POST /api/payments/refund)
    - _Requirements: 6.4, 6.5, 10.1, 10.2, 12.1_
  
  - [~] 10.4 Add payment information UI to OrderDetails
    - Display payment status badge (color-coded: pending=yellow, completed=green, failed=red, expired=gray, refunded=blue)
    - Display transaction ID if payment completed
    - Display payment method if payment completed
    - Display payment timestamp if payment completed
    - Add "Complete Payment" button if status is pending
    - Add "Retry Payment" button if status is failed or expired
    - Add "Refund" button if status is completed and user is admin
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [~] 10.5 Create refund modal component
    - Create modal for refund confirmation (admin only)
    - Include refund amount input
    - Include refund reason textarea
    - Add "Confirm Refund" and "Cancel" buttons
    - _Requirements: 12.1_


- [ ] 11. Add Socket.io listeners for payment notifications
  - [~] 11.1 Add payment notification listeners in frontend
    - In main App.js or appropriate component, add Socket.io listeners for payment events
    - Listen for 'paymentCompleted' event and show success toast
    - Listen for 'paymentFailed' event and show error toast
    - Update order/payment state when notifications received
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [~] 11.2 Emit Socket.io events from backend webhook handler
    - In PaymentController.handleWebhook, emit Socket.io events on status changes
    - Emit 'paymentCompleted' event to customer's room when status changes to 'completed'
    - Emit 'paymentFailed' event to customer's room when status changes to 'failed'
    - Emit 'paymentCompleted' event to admin room for all completed payments
    - _Requirements: 13.1, 13.2, 13.5_

- [~] 12. Checkpoint - Verify frontend components
  - Test CheckoutPage component displays order details correctly
  - Test payment redirect to SafePay works
  - Test PaymentStatus component shows correct states
  - Test OrderDetails shows payment information
  - Test Socket.io notifications appear
  - Ask the user if questions arise

### Phase 4: Admin Dashboard (Week 4)

- [ ] 13. Create AdminPayments component structure
  - [~] 13.1 Create AdminPayments component file
    - Create `frontend/src/pages/admin/AdminPayments.js`
    - Set up component with useState for payments, filters, analytics, loading, selectedPayment states
    - Initialize filters state with status, dateFrom, dateTo, searchQuery
    - Initialize analytics state with totalRevenue, successRate, pendingCount, completedCount, failedCount
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 14.1, 14.2, 14.3, 14.4_
  
  - [~] 13.2 Implement fetchPayments function
    - Implement fetchPayments function to call GET /api/payments with filter query params
    - Update payments state with response
    - Handle pagination
    - Call in useEffect when filters change
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [~] 13.3 Implement fetchAnalytics function
    - Implement fetchAnalytics function to calculate payment analytics
    - Calculate total revenue from completed payments
    - Calculate success rate (completed / total attempts * 100)
    - Count payments by status (pending, completed, failed)
    - Update analytics state
    - _Requirements: 8.5, 14.1, 14.2, 14.4_
  
  - [ ]* 13.4 Write property test for revenue calculation accuracy
    - **Property 11: Revenue Calculation Accuracy**
    - **Validates: Requirements 8.5**
    - Test that total revenue equals sum of completed payment amounts
  
  - [ ]* 13.5 Write property test for payment success rate calculation
    - **Property 18: Payment Success Rate Calculation**
    - **Validates: Requirements 14.2**
    - Test that success rate equals (completed / total) * 100
  
  - [ ]* 13.6 Write property test for payment count accuracy
    - **Property 19: Payment Count Accuracy**
    - **Validates: Requirements 14.4**
    - Test that counts by status match actual payment counts

- [ ] 14. Implement AdminPayments analytics UI
  - [~] 14.1 Create analytics cards section
    - Display Total Revenue card (current month, PKR format)
    - Display Success Rate card (percentage)
    - Display Pending Payments count card
    - Display Completed Payments count card
    - Display Failed Payments count card
    - Style cards with appropriate colors and icons
    - _Requirements: 8.5, 14.1, 14.2, 14.4_
  
  - [~] 14.2 Create revenue chart component
    - Use recharts library to create line chart
    - Display daily revenue for past 30 days
    - X-axis: Date, Y-axis: Revenue (PKR)
    - Fetch daily revenue data from backend or calculate from payments
    - _Requirements: 14.3_


- [ ] 15. Implement AdminPayments filters and table
  - [~] 15.1 Create filters section UI
    - Add status dropdown filter (All, Pending, Completed, Failed, Expired, Refunded)
    - Add date range picker (From - To dates)
    - Add search input (order ID, customer name, transaction ID)
    - Add "Apply Filters" button
    - Add "Export CSV" button
    - Update filters state on input changes
    - _Requirements: 8.2, 14.5_
  
  - [~] 15.2 Implement filter application logic
    - Update fetchPayments to use current filter values
    - Trigger fetchPayments when "Apply Filters" clicked
    - _Requirements: 8.2, 14.5_
  
  - [~] 15.3 Create payments table
    - Display table with columns: Order ID, Customer, Product, Amount, Status, Payment Method, Date, Actions
    - Display payment status badges (color-coded)
    - Add "View Details" button for each payment
    - Add "Refund" button for completed payments (admin only)
    - Implement pagination controls
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [~] 15.4 Implement exportPayments function
    - Implement function to export payments data to CSV
    - Include all payment fields in export
    - Trigger download when "Export CSV" clicked
    - _Requirements: 8.3_

- [ ] 16. Implement payment details modal and refund functionality
  - [~] 16.1 Create payment details modal
    - Create modal component to display full payment information
    - Show payment ID, order ID, customer details, amount, status, transaction ID, payment method
    - Show payment attempts history
    - Show webhook events log
    - Add "Close" button
    - Open modal when "View Details" clicked in table
    - _Requirements: 8.3, 19.5_
  
  - [~] 16.2 Create refund modal
    - Create modal component for refund confirmation
    - Include refund amount input (pre-filled with payment amount)
    - Include refund reason textarea
    - Add "Confirm Refund" button
    - Add "Cancel" button
    - Open modal when "Refund" clicked in table
    - _Requirements: 12.1_
  
  - [~] 16.3 Implement handleRefund function
    - Implement handleRefund function to call POST /api/payments/refund
    - Pass orderId, amount, and reason in request body
    - Show success toast on successful refund
    - Show error toast on failure
    - Refresh payments list after refund
    - Close refund modal
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [~] 17. Checkpoint - Verify admin dashboard
  - Test analytics cards display correct data
  - Test revenue chart displays correctly
  - Test filters work correctly
  - Test payments table displays all payments
  - Test payment details modal shows complete information
  - Test refund functionality works
  - Ask the user if questions arise

### Phase 5: Background Jobs (Week 5)

- [ ] 18. Implement payment recovery scheduled job
  - [~] 18.1 Create payment recovery job
    - Create `backend/jobs/paymentRecoveryJob.js`
    - Use node-cron to schedule job every 15 minutes
    - Query payments with status 'pending' created more than 10 minutes ago
    - Batch process up to 100 payments per run
    - For each payment, call PaymentService.verifyPaymentStatus()
    - Update payment status based on API response
    - Update order status if payment completed
    - Create PaymentLog entry for each recovery operation
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_
  
  - [ ]* 18.2 Write property test for stale payment recovery
    - **Property 26: Stale Payment Recovery**
    - **Validates: Requirements 20.2, 20.3, 20.4**
    - Test that pending payments older than 10 minutes are queried and updated correctly
  
  - [ ]* 18.3 Write property test for recovery operation logging
    - **Property 27: Recovery Operation Logging**
    - **Validates: Requirements 20.5**
    - Test that recovery operations create log entries with timestamp, payment ID, and outcome


- [ ] 19. Implement payment expiration scheduled job
  - [~] 19.1 Create payment expiration job
    - Create `backend/jobs/paymentExpirationJob.js`
    - Use node-cron to schedule job every 10 minutes
    - Query payments with status 'pending' and expiresAt < current time
    - Batch update expired payments to status 'expired'
    - Create PaymentLog entries for status updates
    - Send notification to customers with expired payments
    - _Requirements: 17.1, 17.2, 17.3, 17.4_
  
  - [ ]* 19.2 Write property test for payment session expiration
    - **Property 23: Payment Session Expiration**
    - **Validates: Requirements 17.2**
    - Test that pending payments past expiresAt timestamp are updated to 'expired'
  
  - [ ]* 19.3 Write property test for expired payment notification
    - **Property 24: Expired Payment Notification**
    - **Validates: Requirements 17.4**
    - Test that expired payments trigger customer notification with retry link

- [ ] 20. Implement order cancellation scheduled job
  - [~] 20.1 Create order cancellation job
    - Create `backend/jobs/orderCancellationJob.js`
    - Use node-cron to schedule job every hour
    - Query orders with paymentStatus 'expired' where expiration occurred more than 24 hours ago
    - Filter orders with no retry attempts
    - Batch update order status to 'cancelled'
    - Create PaymentLog entries
    - _Requirements: 17.5_
  
  - [ ]* 20.2 Write property test for expired payment auto-cancellation
    - **Property 25: Expired Payment Auto-Cancellation**
    - **Validates: Requirements 17.5**
    - Test that orders with expired payments older than 24 hours are automatically cancelled

- [ ] 21. Integrate scheduled jobs in server
  - [~] 21.1 Import and start scheduled jobs in server.js
    - Import all three job modules in `backend/server.js`
    - Start jobs when server starts
    - Add logging for job execution
    - Add error handling for job failures
    - _Requirements: 17.3, 20.1_
  
  - [~] 21.2 Add job monitoring and logging
    - Log job start and completion times
    - Log number of payments/orders processed
    - Log any errors encountered
    - Create alerts for job failures (3 consecutive failures)
    - _Requirements: 20.5_

- [~] 22. Checkpoint - Verify background jobs
  - Test payment recovery job runs and updates stale payments
  - Test payment expiration job marks expired payments
  - Test order cancellation job cancels old expired orders
  - Verify job logging works correctly
  - Ask the user if questions arise

### Phase 6: Testing and Refinement (Week 6)

- [ ] 23. Set up testing infrastructure
  - [~] 23.1 Install testing dependencies
    - Install jest, supertest, fast-check, @testing-library/react, @testing-library/user-event
    - Configure jest for backend and frontend
    - Set up test database for integration tests
    - _Requirements: All_
  
  - [~] 23.2 Create test utilities and mocks
    - Create mock SafePay SDK for unit tests
    - Create test data generators using fast-check
    - Create helper functions for test setup and teardown
    - _Requirements: All_

- [ ] 24. Write comprehensive unit tests
  - [ ]* 24.1 Write unit tests for PaymentService
    - Test createPaymentSession with valid and invalid data
    - Test verifyPaymentStatus with various responses
    - Test verifyWebhookSignature with valid and invalid signatures
    - Test initiateRefund with various scenarios
    - Test validatePaymentData with edge cases
    - Mock SafePay SDK responses
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 11.2, 12.2, 18.1, 18.2, 18.3, 18.4, 18.5_
  
  - [ ]* 24.2 Write unit tests for PaymentController
    - Test createPayment endpoint
    - Test handleWebhook with valid and invalid signatures
    - Test verifyPayment endpoint
    - Test initiateRefund endpoint
    - Test getPaymentByOrder endpoint
    - Test getAllPayments endpoint with filters
    - Test retryPayment endpoint
    - Mock PaymentService methods
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 8.1, 8.2, 8.3, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_


  - [ ]* 24.3 Write unit tests for Payment and Order models
    - Test Payment model validation
    - Test Payment model methods (addAttempt, addWebhookEvent)
    - Test Payment model virtual property (isExpired)
    - Test Order model payment validation middleware
    - _Requirements: 6.1, 6.3, 6.7, 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 24.4 Write unit tests for frontend components
    - Test CheckoutPage component rendering and interactions
    - Test PaymentStatus component for all states (success, failed, pending, expired)
    - Test OrderDetails payment information display
    - Test AdminPayments component rendering and filtering
    - Mock API calls with axios
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 25. Write integration tests
  - [ ]* 25.1 Write payment flow integration test
    - Test complete flow: create order → create payment session → verify session created
    - Test webhook flow: simulate webhook → verify payment status updated → verify order status updated
    - Test verification flow: verify payment → confirm status matches webhook
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.1, 5.2, 5.3_
  
  - [ ]* 25.2 Write webhook security integration test
    - Test webhook with valid signature is accepted
    - Test webhook with invalid signature is rejected
    - Test duplicate webhook is processed idempotently
    - _Requirements: 4.2, 4.3, 4.8, 11.1, 11.2, 11.3, 11.4_
  
  - [ ]* 25.3 Write payment recovery integration test
    - Create payment with pending status
    - Wait for recovery job to run (or trigger manually)
    - Verify payment status queried from SafePay
    - Verify status updated correctly
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_
  
  - [ ]* 25.4 Write refund flow integration test
    - Create completed payment
    - Initiate refund
    - Verify refund status updated
    - Verify order status updated
    - Verify customer notification sent
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [ ] 26. Perform end-to-end testing with SafePay sandbox
  - [~] 26.1 Configure SafePay sandbox environment
    - Set up sandbox credentials in .env file
    - Configure ngrok webhook URL: `https://exclusion-sepia-nicotine.ngrok-free.dev/api/payments/webhook`
    - Configure webhook URL in SafePay sandbox dashboard
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1_
  
  - [~] 26.2 Test successful payment flow end-to-end
    - Create order through frontend
    - Redirect to SafePay sandbox
    - Complete payment using test card
    - Verify webhook received and processed
    - Verify customer redirected back
    - Verify payment status displayed correctly
    - Verify order status updated to confirmed
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 6.6_
  
  - [~] 26.3 Test failed payment flow end-to-end
    - Create order through frontend
    - Redirect to SafePay sandbox
    - Use test card that triggers failure
    - Verify webhook received
    - Verify customer sees error message
    - Verify retry button works
    - Verify new payment session created
    - _Requirements: 4.4, 4.5, 6.5, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [~] 26.4 Test payment expiration flow
    - Create order and payment session
    - Wait for 30 minutes (or manually update expiresAt in database)
    - Verify expiration job marks payment as expired
    - Verify customer receives notification
    - Verify retry functionality works
    - _Requirements: 2.7, 17.1, 17.2, 17.3, 17.4_
  
  - [~] 26.5 Test refund flow end-to-end
    - Complete payment for an order
    - Log in as admin
    - Navigate to AdminPayments dashboard
    - Initiate refund for the order
    - Verify refund processed through SafePay
    - Verify payment status updated to refunded
    - Verify order status updated to cancelled
    - Verify customer receives refund notification
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_


- [ ] 27. Performance optimization and security hardening
  - [~] 27.1 Implement database query optimization
    - Verify all indexes are created correctly
    - Test query performance for large datasets
    - Add pagination to all list endpoints
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [~] 27.2 Implement caching for analytics
    - Install node-cache dependency
    - Implement caching for revenue totals (TTL: 5 minutes)
    - Implement caching for success rate (TTL: 5 minutes)
    - Implement caching for daily revenue chart (TTL: 1 hour)
    - Invalidate cache on payment status changes
    - _Requirements: 8.5, 14.1, 14.2, 14.3_
  
  - [~] 27.3 Implement rate limiting for webhook endpoint
    - Add rate limiting middleware to webhook endpoint
    - Limit to 100 requests per minute per IP
    - Log rate limit violations
    - _Requirements: 11.5_
  
  - [~] 27.4 Add input validation and sanitization
    - Validate all user inputs in controllers
    - Sanitize inputs to prevent injection attacks
    - Add request body size limits
    - _Requirements: 18.5_
  
  - [~] 27.5 Implement comprehensive error logging
    - Set up structured logging (JSON format)
    - Log all payment operations with order ID and tracker ID
    - Log all errors with stack traces
    - Create separate log files for payment operations
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ] 28. Bug fixes and refinements
  - [~] 28.1 Fix any bugs discovered during testing
    - Review test results and fix failing tests
    - Address edge cases and error scenarios
    - Improve error messages for better user experience
    - _Requirements: All_
  
  - [~] 28.2 Refine UI/UX based on testing feedback
    - Improve loading states and transitions
    - Enhance error message clarity
    - Ensure responsive design works on all devices
    - Add helpful tooltips and help text
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [~] 28.3 Update documentation
    - Document all API endpoints with examples
    - Document environment variables
    - Document webhook configuration steps
    - Create troubleshooting guide
    - _Requirements: All_

- [~] 29. Checkpoint - Verify testing and refinement complete
  - All unit tests passing with >80% coverage
  - All integration tests passing
  - All E2E tests passing with SafePay sandbox
  - Performance optimizations implemented
  - Security hardening complete
  - Documentation updated
  - Ask the user if questions arise

### Phase 7: Production Deployment (Week 7)

- [ ] 30. Configure production environment
  - [~] 30.1 Set up production SafePay credentials
    - Obtain production API key and secret key from SafePay
    - Add production credentials to secure environment variable storage (e.g., AWS Secrets Manager, Azure Key Vault)
    - Set SAFEPAY_ENVIRONMENT to 'production'
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [~] 30.2 Set up production webhook endpoint
    - Ensure production server has valid HTTPS certificate
    - Configure production webhook URL in environment variables
    - Test webhook endpoint is publicly accessible
    - _Requirements: 4.1_
  
  - [~] 30.3 Configure webhook in SafePay production dashboard
    - Log in to SafePay production merchant dashboard
    - Navigate to Webhooks section
    - Add production webhook URL
    - Select events to subscribe to (payment.created, payment.completed, payment.failed, payment.expired, refund.completed)
    - Save and copy webhook secret
    - Add webhook secret to production environment variables
    - _Requirements: 4.1, 4.2_


- [ ] 31. Database migration for existing orders
  - [~] 31.1 Create database migration script
    - Create migration script to add payment fields to existing orders
    - Set paymentStatus to 'pending' for all existing orders
    - Set payment and safepayTracker to null for existing orders
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  
  - [~] 31.2 Run migration on production database
    - Backup production database before migration
    - Run migration script
    - Verify all orders have payment fields
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [ ] 32. Deploy to production
  - [~] 32.1 Deploy backend to production server
    - Build backend application
    - Deploy to production server
    - Verify all environment variables are set correctly
    - Start server and verify it's running
    - _Requirements: All_
  
  - [~] 32.2 Deploy frontend to production
    - Build frontend application with production API URL
    - Deploy to production hosting (e.g., Vercel, Netlify, S3)
    - Verify frontend can communicate with backend
    - _Requirements: All_
  
  - [~] 32.3 Verify scheduled jobs are running
    - Check that payment recovery job is running every 15 minutes
    - Check that payment expiration job is running every 10 minutes
    - Check that order cancellation job is running every hour
    - Verify job logs are being created
    - _Requirements: 17.3, 20.1_

- [ ] 33. Set up monitoring and alerting
  - [~] 33.1 Configure application monitoring
    - Set up monitoring for payment success rate (alert if < 70%)
    - Set up monitoring for webhook processing time (alert if > 5 seconds)
    - Set up monitoring for payment verification failures (alert if > 5%)
    - Set up monitoring for SafePay API error rate (alert if > 5%)
    - _Requirements: All_
  
  - [~] 33.2 Configure security monitoring
    - Set up alerts for webhook signature verification failures (alert if > 10/hour)
    - Set up alerts for rate limit violations
    - Set up alerts for suspicious payment patterns
    - _Requirements: 11.3, 11.4, 11.5_
  
  - [~] 33.3 Configure job monitoring
    - Set up alerts for payment recovery job failures (alert after 3 consecutive failures)
    - Set up alerts for payment expiration job failures
    - Set up alerts for order cancellation job failures
    - Monitor number of stale pending payments (alert if > 50)
    - _Requirements: 20.1, 20.5_
  
  - [~] 33.4 Set up logging and log retention
    - Configure log aggregation (e.g., CloudWatch, ELK stack)
    - Set up log retention for 12 months minimum
    - Create log search and filter capabilities
    - _Requirements: 19.6_

- [ ] 34. Monitor initial production transactions
  - [~] 34.1 Monitor first production transactions
    - Watch for first payment session creation
    - Verify webhook delivery and processing
    - Verify payment verification works
    - Monitor for any errors or issues
    - _Requirements: All_
  
  - [~] 34.2 Verify email notifications are sent
    - Test payment completion email
    - Test payment failure email
    - Test refund notification email
    - Test expired payment notification email
    - _Requirements: 9.6, 12.6, 13.4, 17.4_
  
  - [~] 34.3 Verify Socket.io notifications work
    - Test real-time payment completion notification
    - Test real-time payment failure notification
    - Verify notifications appear in frontend
    - _Requirements: 13.1, 13.2, 13.3_

- [ ] 35. Create deployment documentation
  - [~] 35.1 Document deployment process
    - Document production environment setup
    - Document SafePay configuration steps
    - Document webhook configuration
    - Document database migration process
    - _Requirements: All_
  
  - [~] 35.2 Create operations runbook
    - Document how to handle payment failures
    - Document how to process refunds
    - Document how to troubleshoot webhook issues
    - Document how to monitor payment health
    - Document emergency procedures
    - _Requirements: All_
  
  - [~] 35.3 Create user guides
    - Create customer guide for payment process
    - Create admin guide for payment management
    - Create admin guide for refund processing
    - _Requirements: All_

- [~] 36. Final checkpoint - Production deployment complete
  - Production environment configured correctly
  - SafePay production credentials working
  - Webhook endpoint configured and receiving events
  - Database migration completed
  - Application deployed and running
  - Monitoring and alerting configured
  - Initial transactions processed successfully
  - Documentation complete
  - Ask the user if questions arise


## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- Property tests validate universal correctness properties defined in the design document
- Unit tests validate specific examples, edge cases, and error conditions
- The 7-week roadmap provides a structured approach to implementation
- Ngrok webhook URL for development: `https://exclusion-sepia-nicotine.ngrok-free.dev/api/payments/webhook` (note: this URL changes when ngrok restarts)
- SafePay SDK (@sfpy/node-sdk) is already installed in the project
- The implementation uses JavaScript throughout (Node.js/Express backend, React frontend)
- All payment credentials must be stored in environment variables, never in code
- Webhook signature verification is critical for security
- Payment recovery job ensures eventual consistency even if webhooks fail
- Comprehensive logging and monitoring are essential for production operations

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "1.4"] },
    { "id": 2, "tasks": ["1.5", "2.1"] },
    { "id": 3, "tasks": ["2.2", "2.4", "2.6", "2.8", "2.9"] },
    { "id": 4, "tasks": ["2.3", "2.5", "2.7"] },
    { "id": 5, "tasks": ["4.1", "4.2"] },
    { "id": 6, "tasks": ["4.3", "4.4", "4.5", "4.6"] },
    { "id": 7, "tasks": ["4.7", "5.1", "5.4"] },
    { "id": 8, "tasks": ["5.2", "5.8"] },
    { "id": 9, "tasks": ["5.3", "5.5", "5.9", "5.10"] },
    { "id": 10, "tasks": ["5.6", "5.7", "6.1"] },
    { "id": 11, "tasks": ["6.2", "6.3"] },
    { "id": 12, "tasks": ["6.4", "6.5"] },
    { "id": 13, "tasks": ["8.1"] },
    { "id": 14, "tasks": ["8.2", "8.3"] },
    { "id": 15, "tasks": ["8.4", "9.1"] },
    { "id": 16, "tasks": ["9.2", "9.3"] },
    { "id": 17, "tasks": ["9.4", "9.5", "9.6"] },
    { "id": 18, "tasks": ["9.7", "10.1"] },
    { "id": 19, "tasks": ["10.2", "10.3"] },
    { "id": 20, "tasks": ["10.4", "10.5", "11.1"] },
    { "id": 21, "tasks": ["11.2"] },
    { "id": 22, "tasks": ["13.1"] },
    { "id": 23, "tasks": ["13.2", "13.3"] },
    { "id": 24, "tasks": ["13.4", "13.5", "13.6", "14.1"] },
    { "id": 25, "tasks": ["14.2", "15.1"] },
    { "id": 26, "tasks": ["15.2", "15.3"] },
    { "id": 27, "tasks": ["15.4", "16.1", "16.2"] },
    { "id": 28, "tasks": ["16.3"] },
    { "id": 29, "tasks": ["18.1"] },
    { "id": 30, "tasks": ["18.2", "18.3", "19.1"] },
    { "id": 31, "tasks": ["19.2", "19.3", "20.1"] },
    { "id": 32, "tasks": ["20.2", "21.1"] },
    { "id": 33, "tasks": ["21.2"] },
    { "id": 34, "tasks": ["23.1", "23.2"] },
    { "id": 35, "tasks": ["24.1", "24.2", "24.3", "24.4"] },
    { "id": 36, "tasks": ["25.1", "25.2", "25.3", "25.4"] },
    { "id": 37, "tasks": ["26.1"] },
    { "id": 38, "tasks": ["26.2", "26.3", "26.4", "26.5"] },
    { "id": 39, "tasks": ["27.1", "27.2", "27.3", "27.4", "27.5"] },
    { "id": 40, "tasks": ["28.1", "28.2", "28.3"] },
    { "id": 41, "tasks": ["30.1", "30.2"] },
    { "id": 42, "tasks": ["30.3", "31.1"] },
    { "id": 43, "tasks": ["31.2", "32.1"] },
    { "id": 44, "tasks": ["32.2", "32.3"] },
    { "id": 45, "tasks": ["33.1", "33.2", "33.3", "33.4"] },
    { "id": 46, "tasks": ["34.1", "34.2", "34.3"] },
    { "id": 47, "tasks": ["35.1", "35.2", "35.3"] }
  ]
}
```
