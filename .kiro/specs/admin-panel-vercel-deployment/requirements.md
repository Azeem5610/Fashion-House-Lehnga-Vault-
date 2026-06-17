# Requirements Document

## Introduction

This feature enables secure deployment of the Fashion House admin panel to Vercel with proper session isolation and access control. Currently, only the customer-facing application is deployed to Vercel, while the admin panel requires local development environment access. This creates operational challenges and prevents admin staff from managing the system remotely.

The system currently uses JWT-based authentication with dual localStorage keys (`fashionHouseUser_admin` and `fashionHouseUser_customer`) to isolate sessions. However, session confusion still occurs when both panels are open simultaneously, causing incorrect user attribution in database operations (e.g., customer appointments being recorded as created by superadmin).

This feature will:
1. Enable admin panel deployment to Vercel as a separate application instance
2. Strengthen session isolation to prevent cross-contamination
3. Implement security controls to restrict admin panel access
4. Maintain backward compatibility with existing authentication system

## Glossary

- **Admin_Panel**: The React-based administrative interface for managing products, orders, inventory, employees, and other business operations
- **Customer_Panel**: The React-based customer-facing interface for browsing products, booking appointments, and placing orders
- **Auth_System**: The JWT-based authentication system using access tokens and refresh tokens stored in httpOnly cookies
- **Session_Context**: The combination of localStorage key, JWT token, and user role that identifies a user's active session
- **Admin_Roles**: User roles with administrative privileges: superadmin, inventoryManager, productionManager, tailor
- **Storage_Key**: The localStorage key used to persist user session data, scoped by user role (admin vs customer)
- **JWT_Access_Token**: Short-lived bearer token (1 day expiry) sent in Authorization header for API requests
- **JWT_Refresh_Token**: Long-lived token (30 days expiry) stored as httpOnly cookie for obtaining new access tokens
- **Token_Blacklist**: Database collection storing revoked JWT tokens to prevent reuse after logout
- **Session_Isolation**: Architectural pattern ensuring admin and customer sessions cannot interfere with each other
- **Environment_Flag**: The REACT_APP_ENABLE_ADMIN environment variable that controls admin panel code inclusion
- **Vercel_Instance**: A separate Vercel deployment with its own environment variables and build configuration
- **Auth_Middleware**: Backend middleware that validates JWT tokens and attaches user context to requests
- **Role_Authorization**: Backend middleware that restricts API endpoints based on user roles

## Requirements

### Requirement 1: Deploy Admin Panel to Vercel

**User Story:** As a business owner, I want the admin panel deployed to Vercel, so that admin staff can access the system remotely without running localhost.

#### Acceptance Criteria

1. THE Admin_Panel SHALL be deployable as a separate Vercel_Instance with distinct environment variables
2. THE Admin_Panel Vercel_Instance SHALL set REACT_APP_ENABLE_ADMIN=true to include admin routes and components
3. THE Customer_Panel Vercel_Instance SHALL set REACT_APP_ENABLE_ADMIN=false to exclude admin code
4. THE Admin_Panel Vercel_Instance SHALL connect to the same backend API as the Customer_Panel
5. WHEN the Admin_Panel is built with REACT_APP_ENABLE_ADMIN=false, THE build output SHALL NOT contain admin panel code (code splitting optimization)

### Requirement 2: Eliminate Session Cross-Contamination

**User Story:** As an admin, I want my admin actions to be attributed correctly, so that database records show the actual user who performed each operation.

#### Acceptance Criteria

1. WHEN a user authenticates, THE Auth_System SHALL store the JWT_Access_Token in the Storage_Key corresponding to the user's role
2. WHEN an API request is made, THE Auth_Middleware SHALL extract the user ID and role from the JWT_Access_Token, not from client-side storage
3. THE Backend SHALL determine the authenticated user exclusively from the JWT_Access_Token in the Authorization header
4. WHEN both Admin_Panel and Customer_Panel are open in the same browser, THE Auth_System SHALL send only the token corresponding to the active panel's Storage_Key
5. THE Auth_System SHALL NOT read or send tokens from the inactive context's Storage_Key
6. WHEN a user logs out from one panel, THE Auth_System SHALL invalidate only that panel's JWT_Access_Token and Storage_Key
7. THE Token_Blacklist SHALL prevent logged-out tokens from being reused across panels

### Requirement 3: Secure Admin Panel Access

**User Story:** As a security administrator, I want the admin panel secured against unauthorized access, so that only authenticated admin staff can use it.

#### Acceptance Criteria

1. WHEN a non-admin user attempts to access an admin route, THE ProtectedRoute component SHALL redirect them to the customer home page
2. WHEN a user with Admin_Roles attempts to access the Customer_Panel, THE Auth_System SHALL allow the login and maintain session isolation
3. THE Backend SHALL enforce Role_Authorization on all admin-only API endpoints regardless of frontend access controls
4. WHEN an admin user's JWT_Access_Token expires, THE Auth_System SHALL attempt automatic refresh using the JWT_Refresh_Token
5. IF JWT_Refresh_Token refresh fails, THE Auth_System SHALL clear the session and redirect to login
6. THE Admin_Panel Vercel_Instance URL SHALL be kept confidential and not linked from public pages
7. WHERE environment is production, THE Admin_Panel SHALL block admin logins if REACT_APP_ENABLE_ADMIN is not explicitly set to true

### Requirement 4: Maintain Authentication Backward Compatibility

**User Story:** As a developer, I want existing authentication flows preserved, so that current users are not impacted by the deployment changes.

#### Acceptance Criteria

1. THE Auth_System SHALL continue using JWT_Access_Token with 1-day expiry and JWT_Refresh_Token with 30-day expiry
2. THE Auth_System SHALL continue storing JWT_Refresh_Token as httpOnly cookie with sameSite and secure flags
3. THE Auth_System SHALL continue supporting automatic token refresh on TOKEN_EXPIRED responses
4. THE Auth_System SHALL continue blacklisting tokens on logout to prevent reuse
5. THE Backend SHALL continue using the existing User model with role, refreshToken, and isActive fields
6. THE Auth_Middleware SHALL continue the existing protect() and roleAuth() middleware patterns
7. THE AuthContext SHALL continue providing login, register, logout, and updateProfile methods with identical signatures

### Requirement 5: Validate Session Isolation

**User Story:** As a QA tester, I want to verify session isolation works correctly, so that we can confirm the session confusion bug is resolved.

#### Acceptance Criteria

1. WHEN an admin creates an appointment while logged in as superadmin, THE Appointment document SHALL record createdBy as the superadmin's user ID
2. WHEN a customer creates an appointment while logged in as customer, THE Appointment document SHALL record createdBy as the customer's user ID
3. WHEN both panels are open simultaneously with different users logged in, THE backend SHALL attribute each action to the correct user based on the JWT_Access_Token sent with each request
4. WHEN a user switches between panels, THE Auth_System SHALL send the correct token for the active panel's context
5. THE Auth_System SHALL NOT send the admin token when the customer is making requests, and vice versa

### Requirement 6: Configure Vercel Deployment Settings

**User Story:** As a DevOps engineer, I want clear deployment configuration, so that I can set up both Vercel instances correctly.

#### Acceptance Criteria

1. THE Admin_Panel Vercel_Instance SHALL set environment variable REACT_APP_ENABLE_ADMIN=true
2. THE Admin_Panel Vercel_Instance SHALL set environment variable REACT_APP_API_URL to the backend API URL
3. THE Customer_Panel Vercel_Instance SHALL set environment variable REACT_APP_ENABLE_ADMIN=false
4. THE Customer_Panel Vercel_Instance SHALL set environment variable REACT_APP_API_URL to the backend API URL
5. WHEN REACT_APP_ENABLE_ADMIN is not set, THE Auth_System SHALL default to false (customer mode)
6. THE Backend CORS configuration SHALL allow requests from both Vercel_Instance domains
7. THE Backend environment variable CLIENT_URL SHALL accept comma-separated list of allowed origins

### Requirement 7: Handle Admin Login Restrictions

**User Story:** As a system administrator, I want admin logins controlled by environment configuration, so that I can disable admin access on specific deployments if needed.

#### Acceptance Criteria

1. WHEN an admin user attempts login on a deployment where REACT_APP_ENABLE_ADMIN=false, THE Auth_System SHALL reject the login with error message "Admin login is disabled on this environment"
2. WHEN an admin user attempts login on a deployment where REACT_APP_ENABLE_ADMIN=true, THE Auth_System SHALL proceed with normal authentication
3. THE error message SHALL instruct admin users to access the correct Admin_Panel Vercel_Instance
4. WHEN a customer user attempts login, THE Auth_System SHALL allow login regardless of REACT_APP_ENABLE_ADMIN setting
5. THE Backend SHALL NOT enforce any admin login restrictions (role-based access is frontend-only for deployment separation)
