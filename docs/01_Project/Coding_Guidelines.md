# Coding Guidelines

This document defines the coding standards followed throughout the Bonzer Logistics ERP project.

All contributors should follow these guidelines to maintain consistency, readability, scalability, and maintainability.

---

# General Principles

- Write clean and readable code.
- Prefer clarity over cleverness.
- Keep components small and reusable.
- Avoid duplicate logic.
- Follow the existing architecture.
- Keep business logic separate from UI.

---

# Project Architecture

The project follows a modular architecture.

Each module should remain independent and self-contained.

Example modules:

- Authentication
- Employee Management
- Customer Management
- CRM
- Pricing
- Operations
- Jobs

Avoid creating dependencies between unrelated modules.

---

# Naming Conventions

## Files

Use kebab-case.

Examples

```
customer-table.tsx

employee-form.tsx

invite-employee-dialog.tsx
```

---

## Components

Use PascalCase.

```
CustomerTable

EmployeeCard

PageHeader

DashboardStats
```

---

## Variables

Use camelCase.

```
customerId

employeeCode

isActive

selectedCustomer
```

---

## Constants

Use UPPER_SNAKE_CASE.

```
MAX_RETRY

DEFAULT_PAGE_SIZE

SESSION_TIMEOUT
```

---

# TypeScript

Always use TypeScript.

Avoid using:

```
any
```

Prefer

```
interface

type

enum

generics
```

---

# React Guidelines

Prefer functional components.

Use hooks instead of class components.

Keep components focused on a single responsibility.

Avoid deeply nested JSX.

Extract reusable UI into shared components.

---

# Component Structure

Preferred order:

1. Imports
2. Types
3. Constants
4. Component
5. Helper functions

Example

```
Imports

Types

Constants

Component

Helpers
```

---

# Folder Organization

Each module should contain only related files.

Example

```
customers/

page.tsx

loading.tsx

error.tsx

components/

actions/

types/
```

---

# Server Actions

Business logic belongs inside Server Actions.

Server Actions should:

- validate input
- check permissions
- perform database operations
- return structured results

Avoid placing business logic inside React components.

---

# Database

All schema changes must go through migrations.

Never modify production tables manually.

Every migration should be:

- idempotent where possible
- reviewed
- documented

---

# Permissions

Never hardcode role checks.

Always use permissions.

Preferred

```
customers.create
```

Avoid

```
if (role === "admin")
```

---

# Validation

Validation should exist at multiple layers.

- Client
- Server
- Database

Never rely only on frontend validation.

---

# UI Development

Use existing shadcn/ui components whenever possible.

Maintain:

- consistent spacing
- typography
- colours
- badges
- forms
- tables
- dialogs

Avoid creating custom UI unless necessary.

---

# Styling

Use Tailwind CSS.

Avoid inline styles.

Use utility classes consistently.

---

# Error Handling

Return meaningful errors.

Never expose internal server details.

Use user-friendly messages.

Log unexpected errors.

---

# Performance

Avoid unnecessary renders.

Memoize expensive calculations where appropriate.

Use pagination instead of loading large datasets.

Optimize database queries.

---

# Accessibility

Ensure:

- keyboard navigation
- visible focus states
- accessible labels
- sufficient colour contrast

---

# Documentation

Major changes should update documentation.

Update:

- Phase documents
- Milestone documents
- Changelog
- Roadmap
- Architecture (if applicable)

Documentation is treated as part of the implementation.

---

# Pull Request Checklist

Before merging:

- Code reviewed
- TypeScript passes
- Lint passes
- Build passes
- No console logs
- Documentation updated
- No unused files
- No commented production code

---

# Development Philosophy

Architecture first.

Workflow second.

Implementation third.

Documentation throughout.