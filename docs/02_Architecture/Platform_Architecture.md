# Platform Architecture

## Overview

Bonzer Logistics ERP is built using a modern full-stack architecture centered around Next.js App Router and Supabase. The platform follows a server-first approach, where business logic executes on the server while the client is responsible only for rendering the user interface and handling user interactions.

The architecture is designed to provide:

- Scalability
- Security
- Type safety
- Modular development
- High maintainability

---

# Technology Stack

## Frontend

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide Icons

---

## Backend

- Next.js Server Actions
- Route Handlers (where required)

---

## Authentication

- Supabase Authentication
- JWT Sessions
- Cookie-based Authentication
- Middleware Session Validation

---

## Database

- PostgreSQL
- Supabase Database
- Row Level Security (RLS)

---

## Development

- Git
- GitHub
- VS Code

---

# High-Level Platform Architecture

```
                    Browser
                       │
                       ▼
              Next.js Application
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
 React Components              Server Actions
        │                             │
        └──────────────┬──────────────┘
                       ▼
             Supabase Client
                       │
                       ▼
        Authentication + PostgreSQL
```

---

# Frontend Architecture

The frontend is built using the Next.js App Router.

Responsibilities include:

- Rendering pages
- Forms
- Navigation
- Tables
- Dialogs
- Dashboard components

Business logic is intentionally excluded from the frontend.

---

# Backend Architecture

Business logic is implemented using Server Actions.

Each Server Action is responsible for:

- Input validation
- Authentication
- Permission checks
- Business rules
- Database operations
- Returning structured responses

This keeps the client lightweight and improves security.

---

# Authentication Architecture

Authentication is handled entirely by Supabase Auth.

Features include:

- Email/password authentication
- Employee invitation flow
- Password setup
- Session persistence
- Automatic session refresh
- Secure cookies

Middleware validates every protected request before allowing access.

---

# Database Architecture

Supabase PostgreSQL serves as the primary database.

Key characteristics:

- Relational schema
- Foreign key constraints
- Indexed lookups
- Transactions
- Row Level Security
- Migration-driven schema management

No manual schema changes should be performed outside migrations.

---

# State Management

The application primarily relies on:

- Server-rendered data
- React state
- URL state
- Form state

Avoid unnecessary global state unless multiple modules require shared data.

---

# API Strategy

The project minimizes traditional REST APIs.

Preferred communication flow:

```
UI

↓

Server Action

↓

Database
```

Route Handlers are used only when external integrations or specialised endpoints are required.

---

# Security Model

Security is enforced at multiple levels.

## Client

- Form validation
- Input constraints

## Middleware

- Session validation
- Route protection

## Server

- Permission verification
- Business validation

## Database

- Row Level Security
- Constraints
- Foreign Keys

---

# Deployment Architecture

The application is designed for cloud deployment.

Primary services:

- Next.js Application
- Supabase Authentication
- PostgreSQL Database
- Object Storage (future)

The architecture supports independent scaling of the application and database layers.

---

# Scalability

The platform is designed to support future expansion without major architectural changes.

Future modules include:

- Sales Pipeline
- Pricing Engine
- Quotation Management
- Operations
- Job Management
- Reporting
- Notifications
- Audit Logging

Each module integrates with the existing architecture while remaining independently maintainable.

---

# Platform Design Principles

- Server-first development
- Modular architecture
- Strong type safety
- Shared UI components
- Database-first consistency
- Secure by default
- Documentation-driven development

These principles ensure that the platform remains maintainable and scalable as new business workflows are introduced.