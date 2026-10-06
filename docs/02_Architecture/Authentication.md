# Authentication Architecture

## Overview

Bonzer Logistics ERP uses Supabase Authentication integrated with Next.js App Router to provide secure, scalable, and session-based authentication.

The authentication system is responsible for:

- User authentication
- Session management
- Employee onboarding
- Password setup
- Protected routes
- Session renewal
- Secure logout

Authentication only verifies identity. Authorization is handled separately through the RBAC system.

---

# Authentication Flow

```
User

↓

Login

↓

Supabase Auth

↓

JWT Session

↓

Middleware Validation

↓

Protected Route

↓

Server Actions
```

---

# Authentication Components

The authentication system consists of:

- Supabase Auth
- Authentication Middleware
- Session Management
- Authentication Helpers
- Protected Routes
- Server Actions

Each component performs a specific responsibility while remaining independent.

---

# User Lifecycle

The lifecycle of an employee account follows a controlled onboarding process.

```
Admin

↓

Invite Employee

↓

Supabase Invitation

↓

Employee Receives Email

↓

Set Password

↓

Profile Activated

↓

Login

↓

Access ERP
```

Employees cannot create accounts directly.

Only administrators can invite new users.

---

# Login Flow

```
Email

+

Password

↓

Supabase Authentication

↓

Credentials Verified

↓

JWT Generated

↓

Session Stored

↓

Redirect to Dashboard
```

If authentication fails, access is denied and an appropriate error message is returned.

---

# Session Management

After successful authentication, Supabase creates a secure session.

The session contains:

- User ID
- Access Token
- Refresh Token
- Expiration Time

The session is stored using secure cookies.

---

# Session Validation

Every protected request passes through middleware.

The middleware verifies:

- Session exists
- Access token is valid
- User is authenticated

If validation fails:

```
Redirect → Login
```

---

# Session Renewal

Expired access tokens are automatically refreshed using the refresh token.

This allows users to continue working without repeated logins while maintaining security.

---

# Password Setup

Employees invited by an administrator must create a password before accessing the application.

Flow:

```
Invitation

↓

Email Link

↓

Set Password

↓

Password Validation

↓

Account Activated
```

Password creation occurs only once during onboarding.

---

# Logout Flow

```
Logout

↓

Invalidate Session

↓

Clear Cookies

↓

Redirect to Login
```

After logout, all protected routes become inaccessible until the user signs in again.

---

# Protected Routes

Only authenticated users may access application routes.

Examples include:

- Dashboard
- Customers
- Employees
- CRM
- Settings

Unauthenticated users are redirected to the login page.

---

# Middleware Responsibilities

Authentication middleware performs:

- Session validation
- Cookie refresh
- Route protection
- Redirect handling

The middleware does not perform permission checks.

Authorization occurs later within Server Actions.

---

# Authentication vs Authorization

Authentication answers:

> "Who is the user?"

Authorization answers:

> "What is the user allowed to do?"

Example

```
Authentication

↓

Valid User

↓

RBAC

↓

Permission Check

↓

Business Operation
```

Both steps are required before executing protected business logic.

---

# Security Measures

The authentication system includes:

- Secure cookies
- JWT sessions
- Session expiration
- Automatic token refresh
- Protected middleware
- Password validation
- Invite-only account creation

These measures help ensure that only authenticated users can access the ERP.

---

# Future Enhancements

Future authentication improvements may include:

- Multi-Factor Authentication (MFA)
- Single Sign-On (SSO)
- OAuth Providers
- Device Management
- Login History
- Account Lockout Policies
- Session Management Dashboard

These features can be integrated without significant architectural changes.