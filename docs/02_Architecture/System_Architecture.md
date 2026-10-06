# System Architecture

## Overview

Bonzer Logistics ERP follows a modular, server-first architecture built on Next.js App Router and Supabase. The system is designed around business workflows rather than individual pages, ensuring scalability, maintainability, and clear separation of responsibilities.

The architecture emphasizes:

- Modular development
- Multi-role access control
- Centralized business data
- Server-side business logic
- Reusable UI components
- Database-driven workflows

---

# High-Level Architecture

```
                    Users
                      │
                      ▼
          ┌─────────────────────┐
          │     Next.js App     │
          │   (App Router UI)   │
          └─────────────────────┘
                      │
                      ▼
          ┌─────────────────────┐
          │    Middleware        │
          │ Authentication       │
          │ Session Validation   │
          └─────────────────────┘
                      │
                      ▼
          ┌─────────────────────┐
          │   Server Actions     │
          │ Business Logic       │
          │ Permission Checks    │
          └─────────────────────┘
                      │
                      ▼
          ┌─────────────────────┐
          │    Supabase          │
          │ PostgreSQL Database  │
          │ Authentication       │
          │ Row Level Security   │
          └─────────────────────┘
```

---

# Architectural Layers

## 1. Presentation Layer

Responsible for:

- User Interface
- Forms
- Tables
- Dashboards
- Dialogs
- Navigation

Technology

- Next.js App Router
- React
- Tailwind CSS
- shadcn/ui

Responsibilities

- Display data
- Collect user input
- Trigger server actions

Business logic should never exist in this layer.

---

## 2. Application Layer

Responsible for:

- Business rules
- Validation
- Permission checks
- Workflow execution
- Data transformation

Implemented using:

- Server Actions
- Shared utilities
- Permission helpers

---

## 3. Security Layer

Handles:

- Authentication
- Session validation
- Authorization
- Permission evaluation
- Row Level Security

Security exists at multiple layers:

- Middleware
- Server Actions
- PostgreSQL RLS

---

## 4. Data Layer

Responsible for:

- Persistent storage
- Relationships
- Constraints
- Transactions
- Indexes

Implemented using:

- PostgreSQL
- Supabase

---

# Major Modules

The ERP is divided into independent business modules.

Current modules include:

- Authentication
- Employee Management
- Customer Management
- CRM
- Customer Interactions
- Follow-ups

Future modules:

- Sales
- Enquiries
- Pricing
- Quotations
- Operations
- Jobs
- Reports

Each module owns its own business logic while sharing common infrastructure.

---

# Business Workflow

The ERP follows the logistics sales lifecycle.

```
Customer
      │
      ▼
Customer Interaction
      │
      ▼
Multiple Follow-ups
      │
      ▼
Enquiry
      │
      ▼
Customer Service
      │
      ▼
Pricing
      │
      ▼
Quotation
      │
      ▼
Customer Approval
      │
      ▼
Job
```

Each stage represents a distinct business process and is implemented as a separate module.

---

# Request Lifecycle

Every request follows the same execution path.

```
User

↓

Route

↓

Middleware

↓

Authentication

↓

Permission Check

↓

Server Action

↓

Validation

↓

Database

↓

Response

↓

UI Update
```

This keeps application behaviour predictable and secure.

---

# Design Principles

The architecture follows several core principles.

## Modularity

Every module is independently maintainable.

## Separation of Concerns

UI, business logic, and database logic remain separate.

## Reusability

Common functionality should be implemented once and reused.

## Scalability

New modules should integrate without changing existing modules.

## Security

Security is enforced throughout the application rather than only at login.

---

# Single Source of Truth

Customer Master serves as the central source of customer information.

Every business module references the Customer Master instead of maintaining duplicate customer records.

This guarantees consistency across the ERP.

---

# Server-First Architecture

Business operations execute on the server.

The client is responsible only for:

- Rendering
- User interaction
- Displaying results

This improves:

- Security
- Performance
- Maintainability

---

# Documentation Philosophy

Architecture documentation is treated as part of the implementation.

Whenever architecture changes:

- Architecture documents must be updated.
- Workflow documents must be reviewed.
- Database documentation must reflect schema changes.

The documentation should always represent the current architecture of the system.