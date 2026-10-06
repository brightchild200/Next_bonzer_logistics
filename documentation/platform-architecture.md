Yes. I actually think this document is more important than the code itself.

This becomes your **North Star Architecture**. Every time you or another AI adds a feature, the first question should be:

> **"Does this follow the Bonzer Platform Architecture?"**

I would save it as:

```text
documentation/platform-architecture.md
```

or

```text
documentation/bonzer-platform-vision.md
```

---

# Bonzer Platform Architecture

## Purpose

Bonzer is **not** a collection of pages.

Bonzer is a **platform** that provides reusable infrastructure for independent business modules.

Every new module should leverage the existing platform instead of creating its own implementations of authentication, authorization, notifications, activity logging, search, navigation, layouts, or shared UI.

The long-term objective is to ensure that adding a new business module requires writing only business-specific logic while the platform provides everything else.

---

# High Level Architecture

```text
                           BONZER ERP PLATFORM
                                    │
        ┌───────────────────────────┼────────────────────────────┐
        │                           │                            │
        │                           │                            │
 Authentication                 Shared UI                 Shared Services
        │                           │                            │
        │                           │                            │
 RBAC                      Components                 Notifications
 Permissions               Layouts                    Activity Logs
 Auth Context              Forms                      Search
 Sessions                  Tables                     File Storage
 Middleware                Dialogs                    Audit
                            Charts                    Dashboard
                            Command Palette           Realtime
        │                           │                            │
        └───────────────────────────┼────────────────────────────┘
                                    │
                              Business Modules
                                    │
 ┌──────────┬──────────┬──────────┬──────────┬──────────┬─────────┐
 │          │          │          │          │          │         │
Customers Interactions Enquiries Pricing Jobs Operations Accounts Reports
```

---

# Design Philosophy

Bonzer follows one simple principle.

> **Business modules should contain business logic only.**

Everything else belongs to the platform.

For example,

Customers should not implement:

* Authentication
* Permissions
* Notifications
* Activity logs
* Search
* Shared layouts
* Generic tables
* Dialog components

Instead, these are consumed from the platform.

---

# Platform Layers

## Layer 1 — Authentication

Responsible for:

* Login
* Signup
* Password setup
* Session refresh
* Middleware
* Current user
* Profile loading

Single source of truth:

```
Supabase Auth
```

---

## Layer 2 — Authorization (RBAC)

Responsible for:

* Roles
* Permissions
* Permission checks
* Route protection
* Component visibility
* Server authorization

Example

```
customer:create

customer:update

pricing:read

job:create
```

The UI never decides authorization.

The backend is always the final authority.

---

## Layer 3 — Shared UI

Reusable components.

Examples

```
Buttons

Dialogs

Tables

Forms

Cards

Charts

Sidebar

Topbar

Loading

Skeletons

Badges
```

Business modules should never duplicate these.

---

## Layer 4 — Shared Services

Platform capabilities.

Examples

```
Notifications

Activity Logs

Search

Realtime

File Upload

Document Viewer

Printing

Export

Import
```

These services are module-independent.

---

## Layer 5 — Navigation

Navigation is generated from metadata.

Each module registers:

```
Title

Route

Permission

Icon

Category
```

Sidebar, breadcrumbs, search, and command palette all consume the same metadata.

---

# Feature Registry

Every business capability is registered once.

Example

```
Customers

Route

Permission

Navigation

Dashboard card

Search

Icon
```

No duplicate definitions.

---

# Notification System

Notifications are platform infrastructure.

Business modules should never insert directly into notification tables.

Instead they call

```
createNotification(...)
```

The notification service decides:

* Recipient
* Priority
* Delivery
* Storage
* Realtime updates

---

# Activity Logging

Every important action generates an activity log.

Examples

```
Customer Created

Customer Updated

Enquiry Assigned

Pricing Approved

Job Completed
```

Business modules only call

```
logActivity(...)
```

Storage and rendering are platform responsibilities.

---

# Search

Search is platform infrastructure.

Business modules only register searchable entities.

Example

```
Customers

Enquiries

Jobs

Invoices
```

The search engine indexes and retrieves results.

---

# File Management

Every uploaded document should use the same infrastructure.

Examples

```
Invoices

KYC

Contracts

Rate Sheets

Images

PDFs
```

No module-specific upload systems.

---

# Dashboard

Dashboard widgets should be reusable.

Examples

```
Recent Activity

Unread Notifications

Pending Tasks

Today's Follow-ups

KPIs

Charts
```

Widgets are shared.

---

# Business Modules

Business modules should remain thin.

Customers

Responsible only for:

* Customer rules
* Customer validation
* Customer workflow

Everything else comes from the platform.

The same philosophy applies to:

* Interactions
* Enquiries
* Pricing
* Jobs
* Reports
* Analytics

---

# Development Rule

Before implementing any feature, ask:

**Is this business logic?**

If yes,

place it inside the module.

If no,

place it in the platform.

---

# Golden Rule

Never ask

> Which page needs this?

Always ask

> Which future modules will also need this?

If the answer is more than one,

build it as platform infrastructure.

---

# Folder Philosophy

```
app/
```

Contains pages only.

```
components/
```

Contains reusable UI.

```
lib/
```

Contains shared infrastructure.

```
lib/actions/
```

Contains business actions.

```
hooks/
```

Contains reusable React hooks.

```
documentation/
```

Contains architecture.

---

# Long-Term Vision

As Bonzer grows, adding a new module should require only:

1. Database tables
2. Business rules
3. UI screens
4. Module registration

Everything else should already exist in the platform.

The objective is that future modules—such as Fleet, Warehouse, Customs, HR, Procurement, Finance, or CRM—inherit authentication, authorization, notifications, activity logging, navigation, search, and shared UI automatically.

---

# Architecture Checklist

Before merging any feature, verify:

* [ ] Is business logic isolated to its module?
* [ ] Is reusable logic placed in the platform?
* [ ] Are permissions enforced in both UI and backend?
* [ ] Is the feature registered in the Feature Registry?
* [ ] Are notifications created through the Notification Service?
* [ ] Are activities logged through the Activity Service?
* [ ] Does navigation use centralized metadata?
* [ ] Are shared UI components reused?
* [ ] Does the implementation avoid duplication?
* [ ] Would another future module be able to reuse this?

---

## ⭐ One more document I strongly recommend

Alongside this, create another file:

```text
documentation/architecture-principles.md
```

This shouldn't describe **what** the architecture is—it should describe **how decisions are made**. It would include principles like "Prefer composition over duplication", "Platform first", "Business modules stay thin", "Never duplicate permissions", "Never bypass shared services", and similar rules.

Together, these two documents become the architectural contract for the entire project. Any developer—or any AI assistant—can read them first and make implementation decisions that stay consistent as Bonzer grows.
