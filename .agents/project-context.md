# Bonzer ERP Project Context

## Purpose

Bonzer is a modular Logistics ERP.

The system is designed as independent modules that share common infrastructure.

---

## Tech Stack

- Next.js App Router
- TypeScript
- Supabase
- PostgreSQL
- Tailwind CSS
- shadcn/ui

---

## Architecture Philosophy

- Modular
- Reusable
- Scalable
- Event-driven where appropriate
- Shared infrastructure
- Minimal duplication

---

## Folder Philosophy

Business logic should remain inside its module.

Shared logic belongs inside shared libraries.

Reusable UI belongs inside shared components.

Database changes must be isolated through migrations.

---

## Existing Infrastructure

Examples include:

- Authentication
- RBAC
- User Management
- Shared UI
- Shared Utilities

Always reuse existing infrastructure before creating new code.

---

## Business Modules

Examples:

- Team
- Customers
- Customer Interactions
- Enquiries
- Pricing
- Operations
- Accounts
- Jobs
- Reports

Modules should remain independent whenever possible.

---

## Coding Philosophy

Prefer composition over duplication.

Keep files focused.

Avoid large utility files.

Avoid module coupling.

---

## Database Philosophy

Every migration must be:

- Forward-only
- Safe
- Backward compatible

Never edit historical migrations.

---

## UI Philosophy

Reusable components belong in shared component folders.

Business-specific components stay inside their respective modules.

---

## API Philosophy

Business modules should call reusable services instead of duplicating logic.

Avoid tightly coupling services together.

---

## Before Any Feature

Always answer:

1. Can existing code be reused?
2. Where should this file live?
3. Is this consistent with the current architecture?
4. Will this scale to future modules?
5. Will this create duplicate logic?

Only then begin implementation.