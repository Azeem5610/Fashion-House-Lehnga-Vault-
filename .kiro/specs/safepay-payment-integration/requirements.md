# Requirements Document

## Introduction

This document specifies the requirements for integrating SafePay payment gateway into the Fashion House (Lehnga Vault) e-commerce application. The integration will enable secure online payment processing for both ready-made and customized lehnga orders, replacing the current manual payment workflow. The system will handle payment initiation, verification, webhook callbacks, status tracking, and provide visibility to both customers and administrators.

## Glossary

- **Payment_Gateway**: The SafePay payment processing service that handles secure payment transactions
- **Order_System**: The existing Fashion House order management system that tracks orders from creation to delivery
- **Payment_Session**: A temporary payment context created by SafePay for a specific order transaction
- **Webhook_Handler**: The backend service that receives and processes payment status notifications from SafePay
- **Payment_Tracker**: The component that stores and manages payment status information for orders
- **Checkout_Flow**: The user interface sequence from order creation through payment completion
- **Admin_Dashboard**: The administrative interface where staff view and manage orders and payments
- **Payment_Verifier**: The service that confirms payment authenticity by querying SafePay APIs
- **Environment_Config**: The secure configuration system that stores SafePay API credentials
- **Payment_Status**: The current state of a payment transaction (pending, completed, failed, expired, refunded)
- **Order_Status**: The current state of an order in the production pipeline
- **Customer**: A registered user who places orders for lehngas
- **Administrator**: A staff member with access to order and payment management features

## Requirements

### Requirement 1: Payment Gateway Configuration

**User Story:** As an Administrator, I want SafePay credentials securely configured in the system, so that the application can communicate with the payment gateway without exposing sensitive information.

#### Acceptance Criteria

1. THE Environment_Config SHALL store SafePay API key, secret key, and environment mode (sandbox/production) in environment variables
2. THE Environment_Config SHALL NOT expose SafePay credentials in client-side code or API responses
3. WHEN the backend server starts, THE Payment_Gateway SHALL validate that all required credentials are present
4. IF required credentials are missing, THEN THE Payment_Gateway SHALL log an error and prevent payment operations
5. THE Environment_Config SHALL support both sandbox and production environments through a configuration flag

### Requirement 2: Payment Session Creation

**User Story:** As a Customer, I want a payment session created when I place an order, so that I can securely pay for my purchase.

#### Acceptance Criteria

1. WHEN a Customer submits an order, THE Order_System SHALL create an order record with "pending" status before initiating payment
2. WHEN an order is created, THE Payment_Gateway SHALL generate a Payment_Session with order details (amount, currency, order reference)
3. THE Payment_Gateway SHALL use PKR as the currency for all transactions
4. THE Payment_Session SHALL include a unique order reference that links to the Order_System record
5. THE Payment_Gateway SHALL return a payment URL that redirects the Customer to SafePay's checkout page
6. IF Payment_Session creation fails, THEN THE Order_System SHALL mark the order as "payment-failed" and notify the Customer
7. THE Payment_Session SHALL expire after 30 minutes if payment is not completed

### Requirement 3: Checkout Flow Integration

**User Story:** As a Customer, I want to be redirected to a secure payment page after placing my order, so that I can complete payment without re-entering order details.

#### Acceptance Criteria

1. WHEN a Payment_Session is created successfully, THE Checkout_Flow SHALL redirect the Customer to the SafePay payment URL
2. THE Checkout_Flow SHALL display a loading indicator while the payment page loads
3. THE Checkout_Flow SHALL provide a cancel option that returns the Customer to the order summary page
4. WHEN the Customer completes or cancels payment, THE Payment_Gateway SHALL redirect the Customer back to the application
5. THE Checkout_Flow SHALL support both desktop and mobile responsive layouts
6. THE Checkout_Flow SHALL display the order total, product name, and order reference before redirecting to payment

### Requirement 4: Payment Webhook Handling

**User Story:** As the System, I want to receive real-time payment status updates from SafePay, so that order status reflects payment completion accurately.

#### Acceptance Criteria

1. THE Webhook_Handler SHALL expose a public endpoint that receives POST requests from SafePay
2. WHEN a webhook is received, THE Webhook_Handler SHALL verify the webhook signature using SafePay's secret key
3. IF the webhook signature is invalid, THEN THE Webhook_Handler SHALL reject the request and log a security warning
4. WHEN a valid webhook indicates payment success, THE Payment_Tracker SHALL update the payment status to "completed"
5. WHEN a valid webhook indicates payment failure, THE Payment_Tracker SHALL update the payment status to "failed"
6. WHEN payment status changes to "completed", THE Order_System SHALL update the order status from "pending" to "confirmed"
7. THE Webhook_Handler SHALL respond with HTTP 200 status to acknowledge receipt within 5 seconds
8. THE Webhook_Handler SHALL process webhooks idempotently to handle duplicate notifications

### Requirement 5: Payment Verification

**User Story:** As the System, I want to verify payment status directly with SafePay, so that payment records are accurate even if webhooks fail.

#### Acceptance Criteria

1. WHEN a Customer returns from the payment page, THE Payment_Verifier SHALL query SafePay's API to confirm payment status
2. THE Payment_Verifier SHALL use the Payment_Session tracker ID to retrieve payment details
3. WHEN SafePay confirms payment completion, THE Payment_Tracker SHALL update the payment status to "completed"
4. WHEN SafePay indicates payment is pending, THE Payment_Verifier SHALL retry verification up to 3 times with 2-second intervals
5. IF verification fails after retries, THEN THE Payment_Tracker SHALL mark payment status as "verification-failed" and notify administrators
6. THE Payment_Verifier SHALL reconcile any discrepancies between webhook data and API verification results

### Requirement 6: Payment Status Tracking

**User Story:** As a Customer, I want to see my payment status on the order details page, so that I know whether my payment was successful.

#### Acceptance Criteria

1. THE Payment_Tracker SHALL store payment status, transaction ID, payment method, amount, and timestamp for each order
2. WHEN a Customer views their order, THE Order_System SHALL display the current payment status
3. THE Payment_Tracker SHALL support payment statuses: pending, completed, failed, expired, refunded
4. WHEN payment status is "pending", THE Order_System SHALL display a "Complete Payment" button with the payment URL
5. WHEN payment status is "failed", THE Order_System SHALL display an error message and option to retry payment
6. WHEN payment status is "completed", THE Order_System SHALL display the transaction ID and payment timestamp
7. THE Payment_Tracker SHALL maintain a payment history log for audit purposes

### Requirement 7: Order Model Extension

**User Story:** As a Developer, I want the Order model to include payment information, so that payment and order data are linked correctly.

#### Acceptance Criteria

1. THE Order_System SHALL add a payment field to the Order model that references Payment_Tracker records
2. THE Order_System SHALL add a paymentStatus field to the Order model with enum values: pending, completed, failed, expired, refunded
3. THE Order_System SHALL add a safepayTracker field to store the SafePay session tracker ID
4. THE Order_System SHALL ensure that orders cannot transition from "pending" to "confirmed" status unless paymentStatus is "completed"
5. WHEN an order is created, THE Order_System SHALL initialize paymentStatus to "pending"

### Requirement 8: Admin Payment Visibility

**User Story:** As an Administrator, I want to see payment status for all orders in the admin dashboard, so that I can track revenue and identify payment issues.

#### Acceptance Criteria

1. WHEN an Administrator views the orders list, THE Admin_Dashboard SHALL display payment status for each order
2. THE Admin_Dashboard SHALL provide filters to view orders by payment status (all, pending, completed, failed)
3. WHEN an Administrator views order details, THE Admin_Dashboard SHALL display full payment information including transaction ID, amount, payment method, and timestamp
4. THE Admin_Dashboard SHALL highlight orders with "failed" or "verification-failed" payment status
5. THE Admin_Dashboard SHALL display total revenue from completed payments in the analytics section

### Requirement 9: Payment Error Handling

**User Story:** As a Customer, I want clear error messages when payment fails, so that I understand what went wrong and how to proceed.

#### Acceptance Criteria

1. WHEN payment fails due to insufficient funds, THE Checkout_Flow SHALL display "Payment declined - insufficient funds. Please try a different payment method."
2. WHEN payment fails due to network timeout, THE Checkout_Flow SHALL display "Payment timed out. Please try again."
3. WHEN payment fails due to invalid card details, THE Checkout_Flow SHALL display "Invalid payment details. Please check your information and try again."
4. WHEN payment session expires, THE Checkout_Flow SHALL display "Payment session expired. Please place your order again."
5. THE Checkout_Flow SHALL provide a "Retry Payment" button for failed payments that creates a new Payment_Session
6. THE Order_System SHALL send an email notification to the Customer when payment fails with instructions to retry

### Requirement 10: Payment Retry Mechanism

**User Story:** As a Customer, I want to retry payment for a failed transaction, so that I don't have to re-enter my order details.

#### Acceptance Criteria

1. WHEN a Customer clicks "Retry Payment" for a failed payment, THE Payment_Gateway SHALL create a new Payment_Session for the existing order
2. THE Payment_Gateway SHALL invalidate any previous Payment_Session for the same order
3. THE Checkout_Flow SHALL redirect the Customer to the new payment URL
4. THE Payment_Tracker SHALL log each payment attempt with timestamp and outcome
5. THE Order_System SHALL limit payment retry attempts to 5 per order to prevent abuse

### Requirement 11: Webhook Security

**User Story:** As a Developer, I want webhook requests authenticated, so that only legitimate SafePay notifications are processed.

#### Acceptance Criteria

1. WHEN a webhook request is received, THE Webhook_Handler SHALL extract the signature from the request headers
2. THE Webhook_Handler SHALL compute the expected signature using the request body and SafePay secret key
3. IF the computed signature does not match the received signature, THEN THE Webhook_Handler SHALL reject the request with HTTP 401 status
4. THE Webhook_Handler SHALL log all rejected webhook attempts with timestamp and source IP
5. THE Webhook_Handler SHALL rate-limit webhook requests to 100 per minute per IP address to prevent abuse

### Requirement 12: Payment Refund Support

**User Story:** As an Administrator, I want to initiate refunds through SafePay, so that I can process returns and cancellations.

#### Acceptance Criteria

1. WHEN an Administrator cancels an order with completed payment, THE Admin_Dashboard SHALL display a "Refund Payment" option
2. WHEN an Administrator initiates a refund, THE Payment_Gateway SHALL call SafePay's refund API with the transaction ID
3. WHEN SafePay confirms the refund, THE Payment_Tracker SHALL update payment status to "refunded"
4. WHEN payment status changes to "refunded", THE Order_System SHALL update order status to "cancelled"
5. THE Payment_Tracker SHALL store refund details including refund amount, timestamp, and administrator who initiated the refund
6. THE Order_System SHALL send an email notification to the Customer when a refund is processed

### Requirement 13: Payment Notification System

**User Story:** As a Customer, I want real-time notifications about my payment status, so that I'm immediately informed of payment success or failure.

#### Acceptance Criteria

1. WHEN payment status changes to "completed", THE Order_System SHALL emit a Socket.io notification to the Customer
2. WHEN payment status changes to "failed", THE Order_System SHALL emit a Socket.io notification to the Customer
3. THE Order_System SHALL display payment notifications using react-toastify in the frontend
4. WHEN payment is completed, THE Order_System SHALL send an email confirmation to the Customer with order and payment details
5. THE Order_System SHALL send a notification to Administrators when a payment is completed

### Requirement 14: Payment Analytics

**User Story:** As an Administrator, I want payment analytics in the dashboard, so that I can track revenue trends and payment success rates.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display total revenue from completed payments for the current month
2. THE Admin_Dashboard SHALL display payment success rate (completed payments / total payment attempts) as a percentage
3. THE Admin_Dashboard SHALL display a chart showing daily revenue for the past 30 days
4. THE Admin_Dashboard SHALL display the count of pending, completed, and failed payments
5. THE Admin_Dashboard SHALL provide a date range filter for payment analytics

### Requirement 15: Customized Product Payment Flow

**User Story:** As a Customer ordering a customized lehnga, I want to complete payment before production starts, so that the business has payment confirmation before investing in materials.

#### Acceptance Criteria

1. WHEN a Customer places an order for a customized product, THE Order_System SHALL require payment completion before order confirmation
2. WHEN payment is completed for a customized order, THE Order_System SHALL display a success message with WhatsApp contact option for customization details
3. THE Order_System SHALL NOT transition customized orders to "in-production" status until payment status is "completed"
4. WHEN a customized order payment fails, THE Order_System SHALL keep the order in "pending" status and allow payment retry

### Requirement 16: Ready-Made Product Payment Flow

**User Story:** As a Customer ordering a ready-made lehnga, I want to complete payment immediately after selecting size and shipping details, so that my order is confirmed quickly.

#### Acceptance Criteria

1. WHEN a Customer places an order for a ready-made product, THE Order_System SHALL require payment completion before order confirmation
2. WHEN payment is completed for a ready-made order, THE Checkout_Flow SHALL redirect the Customer to the "My Orders" page
3. THE Order_System SHALL display the selected size in the payment summary before redirecting to SafePay
4. WHEN a ready-made order payment is completed, THE Order_System SHALL automatically update order status to "confirmed"

### Requirement 17: Payment Timeout Handling

**User Story:** As the System, I want to handle payment session timeouts gracefully, so that expired sessions don't block order processing.

#### Acceptance Criteria

1. WHEN a Payment_Session is created, THE Payment_Gateway SHALL set an expiration time of 30 minutes
2. WHEN a Payment_Session expires without payment completion, THE Payment_Tracker SHALL update payment status to "expired"
3. THE Order_System SHALL run a scheduled job every 10 minutes to check for expired payment sessions
4. WHEN an expired payment is detected, THE Order_System SHALL send a notification to the Customer with a link to retry payment
5. THE Order_System SHALL automatically cancel orders with expired payments after 24 hours if no retry is attempted

### Requirement 18: Payment Data Validation

**User Story:** As a Developer, I want payment data validated before processing, so that invalid data doesn't cause payment failures.

#### Acceptance Criteria

1. WHEN creating a Payment_Session, THE Payment_Gateway SHALL validate that order amount is greater than zero
2. WHEN creating a Payment_Session, THE Payment_Gateway SHALL validate that order reference is a valid MongoDB ObjectId
3. WHEN creating a Payment_Session, THE Payment_Gateway SHALL validate that currency is "PKR"
4. IF validation fails, THEN THE Payment_Gateway SHALL return a descriptive error message and prevent payment session creation
5. THE Payment_Gateway SHALL sanitize all input data to prevent injection attacks

### Requirement 19: Payment Logging and Audit Trail

**User Story:** As an Administrator, I want detailed logs of all payment operations, so that I can troubleshoot issues and maintain compliance.

#### Acceptance Criteria

1. THE Payment_Tracker SHALL log all payment session creation attempts with timestamp, order ID, and amount
2. THE Payment_Tracker SHALL log all webhook receipts with timestamp, payload, and verification result
3. THE Payment_Tracker SHALL log all payment verification attempts with timestamp and API response
4. THE Payment_Tracker SHALL log all refund operations with timestamp, amount, and administrator ID
5. THE Admin_Dashboard SHALL provide a payment logs viewer with search and filter capabilities
6. THE Payment_Tracker SHALL retain payment logs for at least 12 months for audit purposes

### Requirement 20: Payment Recovery Mechanism

**User Story:** As the System, I want to recover from webhook delivery failures, so that payment status is eventually consistent even if webhooks are missed.

#### Acceptance Criteria

1. THE Order_System SHALL run a scheduled job every 15 minutes to check for orders with "pending" payment status older than 10 minutes
2. WHEN a stale pending payment is detected, THE Payment_Verifier SHALL query SafePay's API to retrieve current payment status
3. WHEN the API indicates payment is completed, THE Payment_Tracker SHALL update payment status to "completed" and update order status to "confirmed"
4. WHEN the API indicates payment has failed, THE Payment_Tracker SHALL update payment status to "failed"
5. THE Payment_Verifier SHALL log all recovery operations with timestamp and outcome for monitoring

