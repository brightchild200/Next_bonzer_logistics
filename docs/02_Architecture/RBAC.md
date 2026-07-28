# Role-Based Access Control (RBAC)

## Overview

Bonzer Logistics ERP implements a permission-driven, multi-role Role-Based Access Control (RBAC) system.

The authorization system is designed to provide fine-grained access control while remaining scalable as new business modules and workflows are introduced.

Unlike traditional role-only systems, permissions are assigned to roles, and users may possess multiple roles simultaneously.

---

# Objectives

The RBAC system is designed to:

- Secure business operations
- Support multiple business roles
- Eliminate hardcoded role checks
- Enable granular permissions
- Scale with future modules
- Simplify permission management

---

# Authorization Flow

Authentication verifies identity.

RBAC determines access.

```
User Login

↓

Authentication

↓

Profile Loaded

↓

Assigned Roles Retrieved

↓

Permissions Aggregated

↓

Business Operation

↓

Access Granted / Denied
```

Authorization occurs before every protected business operation.

---

# RBAC Components

The authorization system consists of the following entities:

```
Profiles

↓

User Roles

↓

Roles

↓

Role Permissions

↓

Permissions
```

Each component has a single responsibility.

---

# Profiles

Each authenticated employee has one profile.

The profile stores:

- Employee Code
- Employee Information
- Status
- User Reference

Profiles identify users but do not determine access.

---

# Roles

Roles represent business responsibilities.

Current roles include:

- Admin
- Sales Manager
- Salesperson
- Customer Service
- Pricing
- Operations
- Accounts

Additional roles can be introduced without changing the underlying architecture.

---

# Permissions

Permissions define individual actions that may be performed within the system.

Examples include:

```
customers.view

customers.create

customers.update

customers.delete

employees.invite

employees.manage

interactions.create

followups.update
```

Permissions are independent of roles.

---

# User Roles

Users may possess one or more roles simultaneously.

Example

```
Employee

↓

Salesperson

+

Customer Service
```

The user's effective permissions are the union of all permissions granted by their assigned roles.

This enables flexible business responsibilities without creating duplicate roles.

---

# Role Permissions

Roles do not contain business logic.

Instead, each role is mapped to a collection of permissions.

```
Role

↓

Role Permissions

↓

Permissions
```

Changing a role's permissions immediately updates access for every assigned user.

---

# Permission Evaluation

When a protected operation is requested:

```
User

↓

Retrieve Assigned Roles

↓

Collect Permissions

↓

Permission Exists?

↓

Yes → Continue

No → Access Denied
```

This evaluation occurs before any business logic executes.

---

# Permission-Based Development

Application code should always check permissions rather than roles.

Preferred

```
customers.create
```

Avoid

```
role === "admin"
```

Business operations should remain permission-driven to support future role changes without modifying application logic.

---

# Multi-Role Support

Employees may perform responsibilities across multiple departments.

Example

```
Salesperson

+

Customer Service

↓

Combined Permissions
```

The authorization system automatically combines permissions from all assigned roles.

No role takes precedence over another.

---

# Separation of Authentication and Authorization

Authentication determines:

> Who is the user?

Authorization determines:

> What may the user do?

Keeping these responsibilities separate improves maintainability and security.

---

# Business Security

Protected operations include:

- Creating customers
- Editing customer information
- Inviting employees
- Managing users
- Creating interactions
- Updating follow-ups
- Future enquiry management
- Future pricing operations
- Future quotation approvals

Every protected operation requires explicit permission.

---

# Future Expansion

The RBAC architecture is designed to support future modules without redesign.

Future permissions may include:

- enquiries.*
- pricing.*
- quotations.*
- jobs.*
- reports.*
- audit.*

New modules simply introduce additional permissions and assign them to existing or new roles.

---

# Security Principles

The RBAC system follows these principles:

- Least privilege
- Permission-first authorization
- Multi-role support
- Centralized permission management
- No hardcoded access checks
- Server-side authorization
- Database-backed role assignments

These principles ensure consistent and secure access control across the ERP.

---

# Summary

The RBAC system provides a flexible and scalable authorization model that separates authentication from authorization, supports multiple business roles per employee, and enforces access through granular permissions rather than hardcoded role checks.

This architecture enables secure growth as new business modules and workflows are introduced.